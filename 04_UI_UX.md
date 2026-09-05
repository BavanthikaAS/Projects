# Auction Hub — UI/UX Documentation

## 1. Design Principles

- **Trustworthy over flashy.** This is a marketplace involving money and used goods — clarity, honesty about condition/price, and visible seller accountability matter more than decoration.
- **Original identity.** Inspired by the usability patterns of Amazon/Flipkart/OLX/Meesho, but with an entirely original name, palette, typography, and layout — no copied logos, screenshots, or exact layouts.
- **No unexplained elements.** Every UI element must be immediately legible without a tooltip explaining what it is (badges, statuses, icons all use plain labels, not just icons).
- **Two clear item types, one UI language.** Buy Now and Auction items share the same product card grammar, differentiated only by a badge and price/bid area — so the marketplace feels unified, not like two bolted-together apps.

## 2. Branding Direction

- **Name/Wordmark:** "Auction Hub" — set in a confident, geometric sans-serif; no literal gavel/hammer clip-art (overused auction cliché).
- **Tone:** professional-casual — closer to a modern resale app than a formal enterprise dashboard.

## 3. Color & Style Recommendations

- Primary: deep indigo/navy (`#1F2A44`) — conveys trust, used for header/nav and primary CTAs.
- Accent: warm amber/gold (`#E0A93C`) — used specifically for auction-related elements (bid buttons, countdown, "Ending Soon" badges) so auctions are visually distinct from Buy Now at a glance.
- Neutral base: off-white background (`#F7F7F5`), charcoal text (`#232323`) — avoids stark pure white/black for a less clinical feel.
- Status colors: success green, warning amber, error red — used consistently for order/auction/report statuses only, never decoratively.
- Geometric, minimal iconography (line icons) — no photographic stock imagery of unrelated "shopping" scenes.

## 4. Homepage

- **Header:** logo, search bar (with AI natural-language toggle), category dropdown, wishlist icon, cart icon, notifications bell, profile menu.
- **Hero:** short value statement + prominent search bar. No large unrelated banner carousel — a static, purposeful hero performs better and looks more deliberate than an auto-rotating carousel.
- **Sections below hero, in order:** Categories grid → Ending-Soon Auctions (amber-accented cards with live countdown) → Featured/Recommended Products → How Auction Hub Works (3-step strip) → Trust & Safety note (brief, links to policy) → Seller CTA ("Start Selling") → Footer.

## 5. Navbar

Sticky on scroll. Search bar always visible. Cart/wishlist show item-count badges. Notification bell shows unread-count badge and opens a dropdown, not a full page navigation, for quick glance.

## 6. Search

- Standard search bar with a small "Ask AI" toggle/icon inline — switching input mode, not a separate page, so users discover natural-language search without friction.
- Filter panel: category, price range, condition, location — collapsible on mobile into a "Filters" sheet.
- Sort dropdown: relevance, price (low/high), newest, ending soon (for auctions).

## 7. Product Cards

Consistent card grammar for both types:
- Image (fixed aspect ratio, consistent crop)
- Title, brand
- Condition badge (e.g., "Good", "Like New")
- **Buy Now card:** price, seller rating (stars + count)
- **Auction card:** amber "Auction" badge, current bid, bid count, countdown timer, "highest bidder" indicator if applicable
- Wishlist heart icon, top-right corner, always tappable without entering the card

## 8. Product Page

- Image gallery (thumbnail strip + main image, swipeable on mobile)
- Title, brand, condition, price/current bid
- Specs table (structured, not paragraph text)
- Seller card: name, rating, member since, "View seller's other listings"
- Description
- Reviews section (with AI summary above raw reviews once volume threshold is met — Phase 2)
- Report listing link (understated, not prominent, but present)
- Primary CTA: "Buy Now" / "Place Bid" depending on type
- AI Assistant panel: contextual — "Ask AI about this auction" on auction pages

## 9. Auction Page

- Large current-bid display with amber accent
- Minimum next bid shown directly below (removes ambiguity about what to type)
- Countdown timer, prominent, updates live (polling-driven)
- Bid history table: bidder (masked), amount, time — most recent first
- Bid input + "Place Bid" button, disabled with clear messaging if auction ended/user is seller/user already highest bidder
- AI Auction Assistant panel: Summary, Positive Factors, Things to Check — visually distinct from raw data (e.g., a bordered card, not blended into the stats)

## 10. Buyer Dashboard

Tabs: Orders, Bids (active/won/lost), Wishlist, Notifications, Recently Viewed. Each list uses the same card/row grammar as the marketplace for consistency, with status badges (e.g., "Outbid", "Winning", "Delivered").

## 11. Seller Dashboard

Tabs: Listings (active/paused/archived), Auctions (active/ended), Orders (to fulfill), Sales, AI Assistance (listing assistant + price guidance entry points), Insights (Phase 2). Listing creation entry point offers a clear choice: "Write manually" vs "Describe it, let AI draft it" — both visually equal weight, no dark-pattern nudging toward AI.

## 12. Admin Dashboard

Sections: Users, Products/Listings, Auctions, Reports Queue, AI Review Queue (visually distinct from the plain Reports Queue — flagged reason and confidence-style label shown, but never phrased as a verdict), Categories, Statistics overview (simple counts/charts, not a full BI tool).

## 13. AI UI Patterns

- AI-generated content is always visually contained in a distinct panel/card with a small "AI" label — never blended in as if it were platform-authored fact.
- AI suggestions in forms are shown as **pre-filled, editable fields**, not read-only text — reinforcing that the human has final control.
- AI price guidance is shown with the explicit caption "AI-assisted guidance, not a guaranteed value" directly beneath the number, not in fine print elsewhere.

## 14. Notifications

- Bell-icon dropdown for quick glance (outbid, order status change, auction ending soon, payment window opened).
- Full notifications page for history.
- Critical notifications (outbid, payment window expiring) also visually emphasized with a colored left-border on the notification row.

## 15. Forms

- Inline validation (on blur, not just on submit).
- Required fields marked simply with an asterisk; no red borders until a field is actually touched and invalid.
- Image upload shows immediate thumbnail preview and upload progress, not just a filename.

## 16. Responsive Design

- Mobile-first breakpoints; filter panel becomes a bottom sheet; product grid drops from 4 → 2 → 1 columns.
- Sticky "Place Bid" / "Buy Now" action bar pinned to the bottom of the screen on mobile product/auction pages, so the primary action is always reachable without scrolling back up.

## 17. Accessibility

- Sufficient color contrast (WCAG AA minimum) for all text, including on the amber accent (use it for backgrounds/borders more than as small body text).
- All interactive icons have accessible labels (aria-label), not icon-only with no text alternative.
- Countdown timers also expose a plain-text equivalent (e.g., "2h 14m left") for screen readers, not just a visual clock.

## 18. Loading / Empty / Error / Success States

- **Loading:** skeleton placeholders for cards/lists, not blank screens or spinners-only for content areas.
- **Empty:** every empty state (empty cart, no search results, no bids yet) has a specific message and a next-action button — never a bare "No data."
- **Error:** form/submission errors show specific, human-readable messages tied to the field or action, using the backend's structured error codes.
- **Success:** confirmations for meaningful actions (bid placed, order placed, listing published) use a brief toast/banner, not a blocking modal that interrupts flow.

## 19. Mobile Experience

- Full feature parity with desktop — no "mobile-lite" version, since second-hand marketplace browsing is heavily mobile in practice.
- Auction countdown and bid button remain visible without scrolling on mobile auction pages (sticky bottom bar, as above).

## 20. Professional Marketplace Details

- Seller reputation shown consistently everywhere a seller appears (card, product page, dashboard), not just on a profile page.
- Order status uses a clear linear tracker (Placed → Processing → Shipped/Ready → Completed), matching the Buy Now flow exactly — no invented steps not reflected in the backend.
- Auction "Ending Soon" (e.g., <2 hours left) uses a distinct visual treatment (pulsing or bold amber) on cards to create appropriate urgency without being manipulative (no fake scarcity — this only applies to genuinely ending auctions).
