# Auction Hub — Backend Schema (FastAPI)

## 1. Folder Structure

```
backend/
    app/
        main.py                  # FastAPI app instance, router registration, CORS, startup jobs
        core/
            config.py             # env var loading (DB URL, JWT secret, AI key, storage keys)
            security.py           # password hashing, JWT encode/decode
            scheduler.py          # background job trigger for auction close / payment expiry
        models/
            user.py
            product.py
            auction.py
            bid.py
            order.py
            review.py
            notification.py
            report.py
            ai.py
        schemas/                  # Pydantic request/response models, one file per domain
            user_schemas.py
            product_schemas.py
            auction_schemas.py
            order_schemas.py
            ai_schemas.py
        routes/
            auth_routes.py
            product_routes.py
            auction_routes.py
            order_routes.py
            review_routes.py
            wishlist_routes.py
            notification_routes.py
            report_routes.py
            admin_routes.py
            ai_routes.py
        services/
            auth_service.py
            product_service.py
            auction_service.py
            bid_service.py
            order_service.py
            review_service.py
            notification_service.py
            moderation_service.py
            ai_service.py
        repositories/             # thin DB-access layer, one per aggregate
            user_repo.py
            product_repo.py
            auction_repo.py
            bid_repo.py
            order_repo.py
        middleware/
            auth_middleware.py     # JWT extraction/verification dependency
            error_handler.py       # standardized error response formatting
        utils/
            validators.py
            pagination.py
```

## 2. Layering Principle

`routes` → `services` → `repositories` → `database`. Routes handle HTTP concerns only (parsing, auth dependency, response shaping). Services own all business rules and are the only layer allowed to compose multi-step transactions. Repositories are thin, testable data-access functions with no business logic. This separation is what allows `ai_service.py` to be swapped or extended (e.g., future ML model) without touching routes.

## 3. Models (ORM layer, mirrors `05_Schema.md`)

One SQLAlchemy (or equivalent) model class per table: `User`, `SellerProfile`, `Category`, `Product`, `ProductImage`, `ProductAttribute`, `Auction`, `Bid`, `AuctionWinnerHistory`, `Order`, `OrderItem`, `PaymentTransaction`, `Wishlist`, `Review`, `Notification`, `Report`, `SellerReputationEvent`, `AIInteraction`, `AIReviewSummary`, `AIFlag`.

## 4. Pydantic Schemas (Examples)

```python
# schemas/auction_schemas.py
class AuctionCreate(BaseModel):
    product_id: UUID
    starting_bid: Decimal
    min_increment: Decimal
    reserve_price: Decimal | None = None
    start_time: datetime
    end_time: datetime

class BidCreate(BaseModel):
    amount: Decimal

class AuctionOut(BaseModel):
    id: UUID
    current_bid: Decimal | None
    min_next_bid: Decimal
    bid_count: int
    end_time: datetime
    auction_status: str
```

```python
# schemas/ai_schemas.py
class NaturalSearchRequest(BaseModel):
    query: str

class NaturalSearchFilters(BaseModel):
    category: str | None = None
    budget_max: Decimal | None = None
    attributes: dict[str, str] = {}
    condition: str | None = None
```

## 5. Routes

Routes remain thin — validate via Pydantic (automatic), call the relevant service, return the service's result.

```python
# routes/auction_routes.py
@router.post("/api/auctions/{auction_id}/bids", status_code=201)
def place_bid(auction_id: UUID, payload: BidCreate, user=Depends(get_current_user)):
    return bid_service.place_bid(auction_id, user.id, payload.amount)
```

## 6. Services

### 6.1 `auth_service`
`register_user()`, `authenticate_user()`, `issue_tokens()`, `refresh_token()`.

### 6.2 `product_service`
`create_listing()`, `update_listing()`, `publish_listing()`, `pause_listing()`, `archive_listing()`, `search_products()` (accepts either manual filters or AI-derived filters — same underlying function, satisfying the requirement that AI never queries the DB directly).

### 6.3 `auction_service`
`create_auction()` (validates start/end time, increment, links to a product), `close_expired_auctions()` (called by the scheduler; determines winner or unsold, creates `auction_winner_history` entry, opens payment window), `handle_payment_expiry()` (cascades to next eligible bidder or marks unsold).

### 6.4 `bid_service`
`place_bid()` — the core concurrency-sensitive function:

```python
def place_bid(auction_id: UUID, bidder_id: UUID, amount: Decimal):
    with db.begin():  # transaction
        auction = db.execute(
            select(Auction).where(Auction.id == auction_id).with_for_update()
        ).scalar_one()

        if auction.auction_status != "active":
            raise BidError("AUCTION_NOT_ACTIVE")
        if now() < auction.start_time or now() > auction.end_time:
            raise BidError("AUCTION_TIMING_INVALID")
        if bidder_id == auction.product.seller_id:
            raise BidError("SELLER_CANNOT_BID")

        min_next = (auction.current_bid or auction.starting_bid) + (
            auction.min_increment if auction.current_bid else 0
        )
        if amount < min_next:
            raise BidError("BID_TOO_LOW")

        bid = Bid(auction_id=auction_id, bidder_id=bidder_id, amount=amount)
        db.add(bid)
        auction.current_bid = amount
        auction.current_highest_bidder_id = bidder_id
        auction.bid_count += 1
        db.add(auction)

    notification_service.notify_outbid(auction, previous_highest_bidder_id)
    return bid
```

### 6.5 `order_service`
`create_order_from_cart()`, `create_order_from_auction_win()`, `update_order_status()`.

### 6.6 `review_service`
`submit_review()` (validates order is completed and belongs to reviewer), `get_reviews_for_product()`.

### 6.7 `notification_service`
`notify_outbid()`, `notify_auction_won()`, `notify_payment_window()`, `notify_order_status_change()`.

### 6.8 `moderation_service`
`file_report()`, `get_review_queue()` (merges `reports` and `ai_flags` for admin view), `apply_admin_action()` (warn/restrict/remove — always human-triggered).

### 6.9 `ai_service`
One function per AI feature; each wraps: sanitize input → build prompt from template → call external AI API with timeout → validate JSON response against schema → return validated result or raise `AIServiceError` (caught by the route/service to trigger fallback).

```python
def get_search_filters(query: str) -> NaturalSearchFilters | None:
    try:
        raw = ai_client.complete(SEARCH_PROMPT_TEMPLATE.format(query=sanitize(query)), timeout=8)
        return NaturalSearchFilters.model_validate_json(raw)
    except (AIProviderError, ValidationError):
        log_ai_interaction(feature="search", status="failed", input_summary={"query": query})
        return None  # caller falls back to keyword search
```

## 7. Middleware

- `auth_middleware`: extracts and verifies JWT, attaches `current_user` to request context; a separate `require_admin` dependency layers on top for admin routes.
- `error_handler`: catches domain exceptions (`BidError`, `AIServiceError`, etc.) and maps them to the standardized `{ "error": { "code", "message" } }` response shape with the correct HTTP status.

## 8. Authentication Dependencies

```python
def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token)  # raises 401 if invalid/expired
    return user_repo.get_by_id(payload["sub"])

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user
```

## 9. API Endpoints (Full List)

### Authentication
| Endpoint | Auth | Purpose |
|---|---|---|
| POST /api/auth/register | None | Create account |
| POST /api/auth/login | None | Issue JWT tokens |
| POST /api/auth/refresh | Refresh token | Issue new access token |
| GET /api/auth/me | Required | Current user profile |

### Products
| Endpoint | Auth | Purpose |
|---|---|---|
| GET /api/products | None | Browse/search/filter (paginated) |
| GET /api/products/{id} | None | Product detail |
| POST /api/products | Required | Create listing (draft) |
| PUT /api/products/{id} | Required, owner | Update listing |
| POST /api/products/{id}/publish | Required, owner | Publish draft |
| POST /api/products/{id}/pause | Required, owner | Pause active listing |
| POST /api/products/{id}/archive | Required, owner | Archive listing |
| DELETE /api/products/{id} | Required, owner | Delete draft only |

### Auctions
| Endpoint | Auth | Purpose |
|---|---|---|
| POST /api/auctions | Required | Create auction for a product |
| GET /api/auctions | None | List/browse auctions |
| GET /api/auctions/{id} | None | Auction detail incl. current bid/countdown |
| POST /api/auctions/{id}/bids | Required | Place a bid |
| GET /api/auctions/{id}/bids | None | Bid history |

### Orders
| Endpoint | Auth | Purpose |
|---|---|---|
| POST /api/orders | Required | Create order (Buy Now checkout) |
| GET /api/orders | Required | Buyer's order history |
| GET /api/orders/{id} | Required, owner | Order detail |
| GET /api/seller/orders | Required | Seller's incoming orders |

### Wishlist / Reviews / Notifications / Reports
| Endpoint | Auth | Purpose |
|---|---|---|
| POST /api/wishlist/{product_id} | Required | Add to wishlist |
| DELETE /api/wishlist/{product_id} | Required | Remove from wishlist |
| POST /api/reviews | Required | Submit review for a completed order |
| GET /api/products/{id}/reviews | None | List reviews |
| GET /api/notifications | Required | List notifications |
| POST /api/reports | Required | File a report |

### Admin
| Endpoint | Auth | Purpose |
|---|---|---|
| GET /api/admin/review-queue | Admin | Merged reports + AI flags |
| POST /api/admin/actions | Admin | Apply warn/restrict/remove action |
| GET /api/admin/stats | Admin | Marketplace statistics |

### AI
| Endpoint | Auth | Purpose |
|---|---|---|
| POST /api/ai/natural-search | Optional | Query → structured filters |
| POST /api/ai/listing-assist | Required | Description → listing draft |
| POST /api/ai/price-guidance | Required | Product data → suggested range |
| POST /api/ai/auction-assistant | Optional | Auction data → summary |
| POST /api/ai/review-summary | None | Product reviews → summary (Phase 2) |
| POST /api/ai/trust-review | Internal (system-triggered) | Signals → review-queue flag |
| POST /api/ai/image-assist | Required | Images → attribute suggestions (Phase 2) |
| POST /api/ai/product-compare | Optional | Product set → comparison explanation (Phase 2) |
| GET /api/ai/seller-insights | Required | Seller stats → explanation (Phase 2) |

## 10. Request/Response Example

```json
POST /api/ai/natural-search
{ "query": "second-hand laptop for programming under 50000 with at least 16GB RAM" }

200 OK
{
  "filters": {
    "category": "laptop",
    "budget_max": 50000,
    "attributes": { "ram_min": "16GB" },
    "condition": "used"
  },
  "results": [ { "id": "...", "title": "...", "price": 42000 } ]
}
```

## 11. Error Handling

Standard shape across all endpoints:
```json
{ "error": { "code": "BID_TOO_LOW", "message": "Bid must be at least ₹500 above the current highest bid." } }
```
Domain-specific codes: `BID_TOO_LOW`, `AUCTION_NOT_ACTIVE`, `AUCTION_TIMING_INVALID`, `SELLER_CANNOT_BID`, `NOT_LISTING_OWNER`, `AI_UNAVAILABLE` (used only internally to trigger fallback, never surfaced as a hard error to the user for advisory AI features).

## 12. Transactions

- `bid_service.place_bid` — single transaction with row lock (Section 6.4).
- `auction_service.close_expired_auctions` — one transaction per auction being closed, using `with_for_update()` on that auction row, so closing one auction can't interfere with another.
- `order_service.create_order_from_cart` — transaction spanning order + order_items creation + payment_transaction creation, so a partial order is never left in an inconsistent state.

## 13. Background Tasks

- **Auction close job**: runs on a fixed interval (e.g., every 30–60 seconds) via `core/scheduler.py`, querying `auctions WHERE auction_status = 'active' AND end_time <= now()`.
- **Payment expiry job**: runs similarly against `auction_winner_history WHERE outcome = 'pending' AND payment_deadline <= now()`, triggering the cascade.
- Both jobs are idempotent and safe to run concurrently with normal API traffic due to row-level locking.
