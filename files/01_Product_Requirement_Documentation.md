# Auction Hub — Product Requirement Documentation

## 1. Product Overview

Auction Hub is an AI-integrated second-hand marketplace and auction platform. It combines a direct "Buy Now" commerce flow (in the spirit of OLX/Meesho-style second-hand trading) with a real-time bidding/auction system, and layers AI assistance on top to solve specific, named friction points for buyers, sellers, and admins — not as a generic add-on.

A single account can act as both buyer and seller. The product is scoped as a serious, portfolio-grade student project: complete enough to demonstrate real marketplace mechanics (inventory, bidding, payments, moderation) without the operational overhead of an actual production company.

## 2. Problem Statement

Second-hand marketplaces today force a trade-off:
- **Fixed-price platforms** (OLX-style) are simple but give sellers no way to discover true market demand for a used item, and buyers no way to compete for scarce/desirable items.
- **Auction platforms** are good at price discovery but are unfamiliar and intimidating to casual sellers, and provide no help figuring out a fair starting price or evaluating whether a listing is trustworthy.
- Both types leave buyers manually parsing dozens of listings and filters, and leave sellers writing listings from a blank form with no guidance.

## 3. Proposed Solution

A single marketplace that supports **both** Buy Now and Auction listing types per product, with an AI assistance layer that:
- helps buyers describe what they want in plain language instead of manually building filter queries,
- helps sellers turn a rough product description into a structured, complete listing,
- gives both sides context (price guidance, auction health signals) instead of raw numbers with no interpretation,
- helps admins prioritize moderation review instead of manually scanning every listing.

## 4. Objectives

1. Provide a working, correct Buy Now purchase flow (cart → checkout → order → delivery → review).
2. Provide a correct, race-condition-safe auction/bidding system with a defined non-payment/winner-cascade policy.
3. Integrate AI only where it removes genuine friction, with every feature backed by an explicit "why AI, not rules" justification.
4. Ship a UI that reads as a real commercial marketplace, not a CRUD demo.
5. Keep AI advisory-only — it never executes a business-critical action directly.

## 5. Target Users

- **Buyers** — students/individuals looking for second-hand goods, at fixed price or by auction.
- **Sellers** — individuals listing used items, from casual one-off sellers to repeat sellers.
- **Admins/Moderators** — responsible for trust & safety, dispute handling, and catalog integrity.

Most users are both buyer and seller on the same account (dual-role by default, not a separate seller account type).

## 6. User Roles

| Role | Description |
|---|---|
| Guest | Can browse, search, view products/auctions. Cannot bid, buy, wishlist, or list. |
| Registered User (Buyer+Seller) | Default role for any signed-up user. Full buyer + seller capability on one account. |
| Admin | Platform staff. Moderation, category management, dispute resolution, statistics. |

There is intentionally **no separate "seller account" tier** — requiring a distinct seller signup adds friction with no real benefit at this scale, and every real marketplace referenced (OLX, Meesho) treats sellers as regular users with a seller dashboard unlocked by listing an item.

## 7. Buyer Features

**MVP:**
- Browse/search/filter/sort products and auctions
- Product detail view with gallery, condition, specs, seller info, reviews
- Wishlist
- Cart + Buy Now checkout
- Bid placement, bid history, outbid notification
- Order history and order status tracking
- Post-purchase reviews
- AI natural-language search
- AI Auction Assistant (on auction detail page)

**Phase 2:** saved searches, AI product comparison, recently-viewed-based surfacing.

## 8. Seller Features

**MVP:**
- Create/edit/publish/pause/archive listings
- Choose Buy Now or Auction per listing
- Upload product images
- Seller dashboard: listings, orders, auctions, sales
- AI Seller Listing Assistant (description → structured listing)
- AI Price Guidance

**Phase 2:** AI Seller Insights (data-backed dashboard explanations), AI Image Listing Assistant.

## 9. Admin Features

**MVP:**
- User management (view, restrict, warn)
- Product/listing moderation (approve, remove, flag)
- Auction oversight
- Report queue (user reports on products/users)
- Category management
- AI review queue (AI-flagged items surfaced for human decision — admin decides, AI never acts)
- Basic marketplace statistics

**Phase 2:** AI Marketplace FAQ bot (can be admin-authored content initially, AI-wrapped later).

## 10. Marketplace Features — Essential vs Optional

| Feature | Classification |
|---|---|
| Registration/Login/Profile | Essential |
| Search, Filters, Sorting | Essential |
| Product cards, detail page, image gallery | Essential |
| Condition/specs/seller info on listing | Essential |
| Wishlist | Essential |
| Cart, Buy Now, Checkout | Essential |
| Orders, order history | Essential |
| Notifications (outbid, order status) | Essential |
| Seller/Buyer/Admin dashboards | Essential |
| Reviews | Essential |
| Reporting (product/user) | Essential |
| Seller ratings/reputation | Essential |
| Search suggestions (autocomplete) | Optional — Phase 2 |
| Saved searches | Optional — Phase 2 |
| Recently viewed | Optional — Phase 2, low cost |
| Listing status/pause/archive | Essential (needed for realistic seller control) |

## 11. Auction Features

- Seller-defined: starting bid, minimum increment, start/end time, optional reserve price
- Buyer-visible: current highest bid, minimum next bid, countdown, bid history, bid count, "you are highest bidder" indicator
- Server-authoritative validation of every bid (see Security.md and Backend_Schema.md)
- Race-condition-safe bid placement via row-level locking
- Defined winner + non-payment cascade policy (below)

## 12. Buy Now Features

Product → Cart/Buy Now → Checkout → Mock Payment → Order Created → Seller Notified → Processing → Delivery/Completion → Review.

## 13. AI Features (Summary — full justification in Section 15)

| Feature | Priority | Notes |
|---|---|---|
| Natural Language Buyer Search | Must-Have | Converts free text to structured filters |
| AI Seller Listing Assistant | Must-Have | Converts free text to structured listing draft |
| AI Price Guidance | Must-Have | Suggested range + reasoning, never a guarantee |
| AI Auction Assistant | Must-Have | Summarizes auction health factors, never advises "bid now" |
| AI Trust & Safety Assistant | Must-Have | Admin-facing review-queue signal only |
| AI Review Summary | Strong Enhancement (Phase 2) | Needs review volume to be useful |
| AI Image Listing Assistant | Strong Enhancement (Phase 2) | Capability-gated by chosen AI API |
| AI Product Comparison | Strong Enhancement (Phase 2) | |
| AI Seller Insights | Strong Enhancement (Phase 2) | Backend computes stats; AI only explains them |
| AI Marketplace FAQ | Optional | Lowest risk, added last |

## 14. Functional Requirements

- FR1: Users can register, log in, and manage a profile.
- FR2: Users can create, edit, publish, pause, and archive product listings.
- FR3: Users can browse/search/filter/sort products and auctions.
- FR4: Users can add to cart and complete a Buy Now purchase.
- FR5: Users can place bids on active auctions; the system rejects invalid bids server-side.
- FR6: The system automatically closes auctions at end time and determines the provisional winner.
- FR7: The system enforces a payment window for auction winners and cascades to the next eligible bidder on non-payment.
- FR8: Users can leave reviews on completed orders.
- FR9: Users can report listings/users; admins can review and act on reports.
- FR10: AI features must degrade gracefully — every AI-assisted flow has a manual fallback.
- FR11: AI never writes directly to the database, executes code, or completes a transaction.

## 15. AI Justification (Why AI, Not Just Rules)

**Natural Language Search** — Users don't reliably know the exact category/attribute vocabulary the platform uses. Building an exhaustive rules-based synonym/intent parser for every possible phrasing is brittle and grows unboundedly with each new category. An LLM already generalizes across phrasing; the backend still validates and executes the resulting structured query, so AI only handles interpretation, not data access.

**Seller Listing Assistant** — First-time or casual sellers don't know what fields a "good" listing needs. A wizard with 15 mandatory fields causes drop-off; free text is faster to write but unusable for search/filtering unless structured. AI bridges that gap by extracting structure from natural language, with the seller reviewing and correcting before publish — this is an assistance, not an autonomous action.

**Price Guidance** — Fair used-item pricing depends on condition, age, comparable listings, and market context — a combination that's hard to encode as a static formula and that shifts over time. AI reasons over available comparable data and explains its reasoning; it is explicitly labeled as guidance, never a guarantee.

**Auction Assistant** — An auction page has many simultaneous signals (bid velocity, seller rating, time remaining, condition, price history) that are individually simple but tedious to mentally combine. AI synthesizes them into a plain-language summary of factors to consider — it explicitly does not recommend an action or place a bid.

**Trust & Safety Assistant** — No single admin can manually inspect every new listing/account at scale. Rule-based fraud detection (e.g., "flag if price < 50% of median") catches only known patterns and produces high false-positive noise. AI can weigh multiple soft signals (inconsistent details, listing patterns) to prioritize a review queue — but never bans or removes content itself; a human always makes the final call.

## 16. Non-Functional Requirements

- Auction bid placement must be transactionally consistent under concurrent bids.
- All AI calls must have a timeout and fallback path (no request should hang indefinitely on an AI provider).
- Passwords stored hashed (bcrypt/argon2), never plaintext.
- API keys (AI provider, storage, DB) never exposed to the frontend.
- The system must remain usable (browse, buy, bid) if the AI provider is fully down.

## 17. Business Rules

- A listing must belong to exactly one type: Buy Now or Auction (not both simultaneously).
- A user cannot bid on their own auction.
- A bid must exceed current highest bid by at least the minimum increment.
- An auction cannot be edited (price/time) after it has received its first valid bid.

## 18. Auction Rules

- Auctions become "active" only at their defined start time and "closed" at end time — both enforced server-side via scheduled job, not client trust.
- The reserve price, if set, is never shown to buyers; if the highest bid doesn't meet reserve, the item is unsold, not auto-sold to the highest bidder.
- Bid history is publicly visible (bidder identity may be partially masked, e.g., "Bidder ****42").

## 19. Non-Payment Rules

1. On auction close, the highest **valid** bid (meeting reserve, if any) becomes the provisional winner.
2. Winner gets a fixed payment window (e.g., 48 hours) to complete payment.
3. If payment succeeds within the window → order created, seller notified, auction fully closed.
4. If payment fails or window expires:
   - Event recorded in `auction_winner_history` and `seller_reputation_events` (for the defaulting bidder).
   - Offer cascades to the next-highest valid bidder, who receives the same payment window.
   - Process repeats until a bidder pays or no eligible bidders remain, at which point the item is marked unsold and returned to the seller's control.
5. Repeated non-payment (threshold defined by admin policy, e.g., 3 strikes in 90 days) triggers escalating account-level action: warning → temporary bidding restriction → seller/admin-reviewed suspension. No automatic permanent ban is issued without human review.

## 20. Trust and Safety

- Users can report listings and other users, with a reason category and optional description.
- AI-flagged listings and user reports both feed the same admin review queue, ranked but not auto-resolved.
- Admin actions (remove listing, warn user, restrict user) are logged for accountability.

## 21. AI Limitations (Explicit, Documented)

- AI price guidance is an estimate based on available comparable data — not a guaranteed valuation.
- AI cannot certify product condition from images with certainty; it can only flag likely issues for human confirmation.
- AI trust/safety output is a review signal, not a fraud determination — no automated bans.
- AI must never place a bid, complete a purchase, publish a listing without seller approval, or execute code/SQL.
- AI-generated text is always shown as suggested/editable, never auto-committed without a human confirmation step, except for read-only informational features (e.g., FAQ answers, review summaries).

## 22. MVP Scope

Core marketplace (auth, listings, Buy Now, auctions, bidding, orders, reviews, dashboards, reporting) + AI Search, AI Listing Assistant, AI Price Guidance, AI Auction Assistant, AI Trust & Safety signal.

## 23. Future Scope

AI Review Summary, AI Image Assistant, AI Product Comparison, AI Seller Insights, AI FAQ bot, real payment gateway integration, WebSocket-based live bid updates, custom ML price-prediction model (see Implementation_Plan.md, Future ML section).

## 24. Success Criteria

- A user can complete a full Buy Now purchase end-to-end without errors.
- Two concurrent bidders on the same auction never both register as the current highest bidder (verified via concurrency testing).
- The non-payment cascade correctly reassigns the win to the next bidder in a test scenario.
- All AI features function normally and also degrade gracefully (manual fallback works) when the AI API is deliberately disabled in testing.
- The UI is judged, by an outside reviewer, to look like a real marketplace rather than an academic CRUD app.
