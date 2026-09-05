# Auction Hub — Implementation Plan

Each phase lists: what to build, why, main modules, dependencies, DB/API/frontend changes, testing, and expected result. Build core marketplace first; AI is integrated only after the core is functionally solid (Phases 1–13), per the decision to avoid AI-first development risk.

## Phase 1 — Project Setup
- **Build:** repo structure (frontend/, backend/), FastAPI skeleton, environment config loading, Supabase project creation.
- **Why:** establishes a working baseline before any feature work.
- **Modules:** `core/config.py`, `main.py`.
- **DB:** none yet.
- **Testing:** app boots, `/health` returns 200.
- **Result:** empty but running full-stack skeleton.

## Phase 2 — Frontend Foundation
- **Build:** shared layout (header/nav/footer), base CSS design tokens (colors, typography from `04_UI_UX.md`), `api.js` fetch wrapper.
- **Why:** every later page reuses this shell; building it once avoids rework.
- **Testing:** static pages render correctly across breakpoints.

## Phase 3 — Supabase Setup
- **Build:** Postgres database provisioning, Storage bucket for product images, connection string wiring into backend config.
- **DB:** none yet (schema next phase).

## Phase 4 — Database
- **Build:** all tables from `05_Schema.md` via migrations, including indexes and constraints.
- **Dependencies:** Phase 3.
- **Testing:** migrations apply cleanly; constraint violations rejected as expected (e.g., invalid `condition` value).
- **Result:** full schema live in Supabase.

## Phase 5 — Authentication
- **Build:** register/login/JWT issuance/refresh, `get_current_user` dependency, frontend login/register pages.
- **Modules:** `auth_service.py`, `auth_routes.py`, `security.py`.
- **API:** `/api/auth/*`.
- **Testing:** register → login → access `/api/auth/me` succeeds; invalid credentials rejected; expired token rejected.
- **Result:** users can create accounts and authenticate.

## Phase 6 — Product Marketplace (Buy Now listings, browse/search)
- **Build:** listing CRUD (manual form only at this stage), category browsing, search/filter/sort, product cards, product detail page.
- **Modules:** `product_service.py`, `product_routes.py`, `product_repo.py`.
- **API:** `/api/products*`.
- **Frontend:** homepage, search results page, product detail page.
- **Testing:** create/edit/publish a listing; search returns correct filtered/paginated results.

## Phase 7 — Product Image Storage
- **Build:** signed upload URL issuance, image upload flow, gallery display.
- **Dependencies:** Phase 3 (Storage), Phase 6.
- **Testing:** upload rejects oversized/invalid file types; images display in correct order.

## Phase 8 — Buy Now (Cart & Checkout)
- **Build:** cart (client-side or lightweight backend cart), checkout flow, mock payment integration, order creation.
- **Modules:** `order_service.py`, `payment` mock client.
- **DB:** `orders`, `order_items`, `payment_transactions` in active use.
- **Testing:** full Buy Now flow end-to-end; failed mock payment doesn't create an order.

## Phase 9 — Cart and Orders (Buyer/Seller Views)
- **Build:** buyer order history, seller incoming orders view, order status updates.
- **Testing:** status transitions reflect correctly on both buyer and seller sides.

## Phase 10 — Auction Engine
- **Build:** auction creation (seller side), auction detail page (buyer side, static data first), scheduled job skeleton for status transitions.
- **Modules:** `auction_service.py`, `auction_routes.py`, `scheduler.py`.
- **DB:** `auctions` in active use.
- **Testing:** auction created with valid start/end validated; invalid time ranges rejected.

## Phase 11 — Bidding
- **Build:** `bid_service.place_bid` with row-locking transaction, bid history endpoint, live countdown + polling on frontend.
- **DB:** `bids` in active use.
- **Testing:** concurrency test — fire simultaneous bid requests at the same auction and confirm only one is accepted per validation step, final `current_bid` is correct, no lost updates.

## Phase 12 — Auction Completion
- **Build:** scheduled job to close expired auctions, determine winner vs. unsold (reserve check), create `auction_winner_history` entry, notify winner.
- **Testing:** auction past end_time is closed by the job (not by a user action); reserve-not-met case correctly marks unsold.

## Phase 13 — Non-Payment Handling
- **Build:** payment window enforcement, expiry job, cascade to next eligible bidder, `seller_reputation_events` logging, escalation policy (warning/restriction) in `moderation_service`.
- **Testing:** simulate non-payment — confirm cascade correctly offers to next-highest bidder with a new deadline; confirm repeated non-payment triggers the defined escalation.
- **Result:** the full auction lifecycle (create → bid → close → pay/cascade) is production-correct.

## Phase 14 — Reviews
- **Build:** review submission (tied to completed orders only), display on product page, seller avg_rating recalculation.
- **Testing:** cannot review an order twice; cannot review before order is completed.

## Phase 15 — Wishlist
- **Build:** add/remove wishlist, buyer dashboard wishlist tab.
- **Testing:** duplicate wishlist add is a no-op, not an error.

## Phase 16 — Notifications
- **Build:** notification creation on outbid/order-status-change/payment-window events, notification bell + dropdown + full page.
- **Testing:** outbid event reliably creates a notification for the previously-highest bidder.

## Phase 17 — Seller Dashboard
- **Build:** listings/auctions/orders/sales tabs, pause/archive controls.
- **Testing:** dashboard reflects real-time-accurate counts and statuses.

## Phase 18 — Admin Dashboard
- **Build:** users/products/auctions/reports views, action logging.
- **Modules:** `admin_routes.py`, `moderation_service.py`.
- **Testing:** admin action (warn/restrict/remove) correctly updates target state and is logged.

## Phase 19 — AI Service Layer
- **Build:** `ai_service.py` scaffold, provider client abstraction, prompt templates, response schema validation, `ai_interactions` logging.
- **Why now:** core marketplace is stable, so AI features can be layered on without risking core correctness, and there's real data (listings, auctions) for AI features to act on.
- **Testing:** mock AI provider used in tests to verify schema validation and fallback triggering independent of real API cost/latency.

## Phase 20 — AI Natural Language Search
- **Build:** `/api/ai/natural-search`, integrate with existing `product_service.search_products()`.
- **Testing:** ambiguous/garbage input falls back to keyword search without error.

## Phase 21 — AI Seller Listing Assistant
- **Build:** `/api/ai/listing-assist`, pre-fill listing form, seller review/edit/approve step.
- **Testing:** AI output is always editable, never auto-published.

## Phase 22 — AI Price Guidance
- **Build:** `/api/ai/price-guidance`, comparable-listing lookup feeding the prompt, UI display with disclaimer.
- **Testing:** guidance shown only with the "not a guaranteed value" label present.

## Phase 23 — AI Auction Assistant
- **Build:** `/api/ai/auction-assistant`, auction-page panel.
- **Testing:** confirm output never contains a direct "bid now" instruction (prompt-level constraint + response review).

## Phase 24 — AI Review Summary
- **Build:** `/api/ai/review-summary`, threshold-gated regeneration, `ai_review_summaries` caching.
- **Testing:** summary only generated once review count threshold is met.

## Phase 25 — AI Trust/Safety
- **Build:** `/api/ai/trust-review`, `ai_flags` writes, merged admin review queue.
- **Testing:** confirm AI flag never auto-removes content — always lands in queue pending human action.

## Phase 26 — Advanced AI Features
- **Build:** AI Image Assistant (capability-gated), AI Product Comparison, AI Seller Insights, AI FAQ bot.
- **Testing:** each degrades gracefully if unsupported/unavailable.

## Phase 27 — Testing (Full Pass)
- **Build:** comprehensive test suite per `02_Technical_Requirement_Documentation.md` categories: marketplace, auctions (incl. concurrency), AI (incl. failure/prompt-injection cases), security.
- **Result:** documented test coverage across all critical flows before security/UI polish.

## Phase 28 — Security Testing
- **Build:** targeted checks against `06_Security.md`: auth bypass attempts, ownership-check bypass attempts, SQL injection attempts (expected to fail due to parameterized queries), rate-limit verification, AI prompt-injection attempts.
- **Result:** documented security test results.

## Phase 29 — UI Polishing
- **Build:** loading/empty/error/success states, responsive refinement, accessibility pass (contrast, aria-labels, keyboard navigation).
- **Result:** UI matches `04_UI_UX.md` specification in full.

## Phase 30 — Deployment
- **Build:** backend deployed to ASGI host, frontend to static hosting, environment variables configured, Supabase production project connected.
- **Result:** publicly accessible working deployment.

## Phase 31 — Future Custom ML Model

This phase is explicitly **not required for the initial version** — documented here as the defined future upgrade path.

### 31.1 Dataset Collection
Collect from existing tables once sufficient auction volume exists: `products` (category, brand, condition, age, original_price), `auctions` (starting_bid, min_increment, duration), `bids` (bid_count, bid velocity), `auction_winner_history` (final outcome), `seller_profiles` (seller rating).

### 31.2 Data Preprocessing
Clean missing/inconsistent attribute values (from `product_attributes`), normalize categorical fields (condition, category), handle outlier prices.

### 31.3 Feature Engineering
Derived features: bids-per-hour, price-as-fraction-of-original, seller rating bucket, category-average final price, time-of-year/seasonality if volume supports it.

### 31.4 Model Selection
Start with a gradient-boosted tree model (e.g., XGBoost/LightGBM) for tabular price prediction — simpler to train, tune, and explain than a deep model at this data scale.

### 31.5 Training & Evaluation
Standard train/test split (or time-based split, given auctions are time-ordered), evaluate with MAE/RMSE on final price prediction, and precision/recall if a classification variant (e.g., "will this auction meet reserve?") is also built.

### 31.6 Prediction API
Deploy as a small internal FastAPI service or a function within the existing backend (`ml_service.py`), exposing `predict_price(product_features) -> {estimate, range}`.

### 31.7 Integration with Existing System
Because `ai_service.get_price_guidance()` already has a defined function signature and output schema, the future ML model is integrated by adding it as an additional source inside that same function — e.g., blend or A/B the LLM-based guidance with the ML model's numeric estimate — with **zero changes required** to routes, frontend, or the rest of the AI service layer.

### 31.8 Relationship Between AI API, ML Model, Future Custom ML Service, and LLM
- **AI API (current):** a general-purpose external LLM used for language understanding/generation tasks (search parsing, listing drafting, summarization, reasoning over auction factors).
- **LLM:** the specific type of model behind that AI API — good at language and reasoning, not naturally suited to precise numeric regression from structured tabular data.
- **ML model (future):** a purpose-trained, small, tabular model (e.g., gradient boosting) trained specifically on Auction Hub's own historical data for a narrow numeric task (price prediction) — more accurate and cheaper to run for that specific task than prompting an LLM.
- **Future custom ML service:** the deployment wrapper (a small prediction API) that serves that trained ML model's outputs into the existing `ai_service` layer, enabling both approaches to coexist and be compared.
