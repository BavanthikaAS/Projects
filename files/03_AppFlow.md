# Auction Hub — Application Flow

## 1. Overall Application Flow

```mermaid
graph TD
    A[Landing Page] --> B[Register / Login]
    B --> C[Home / Marketplace]
    C --> D[Browse / Search]
    D --> E[Product Details]
    E --> F{Listing Type}
    F -->|Buy Now| G[Buy Now Flow]
    F -->|Auction| H[Auction Flow]
```

## 2. Buyer Flow

```mermaid
graph TD
    A[Login] --> B[Search / Browse]
    B --> C{Search Method}
    C -->|Manual Filters| D[Filtered Results]
    C -->|AI Natural Language| E[AI Search Flow]
    D --> F[Product Details]
    E --> F
    F --> G{Action}
    G -->|Buy| H[Buy Now Flow]
    G -->|Bid| I[Auction Flow]
    H --> J[Order Created]
    I --> K[Bid Placed]
    J --> L[Review]
```

## 3. Seller Flow

```mermaid
graph TD
    A[Login] --> B[Seller Dashboard]
    B --> C[Create Listing]
    C --> D{Input Method}
    D -->|Manual| E[Fill Form]
    D -->|AI Assist| F[AI Listing Flow]
    E --> G[Review / Edit]
    F --> G
    G --> H[Choose Buy Now / Auction]
    H --> I[Publish]
    I --> J[Manage Listing]
    J --> K[Pause / Archive / Track Sales]
```

## 4. Admin Flow

```mermaid
graph TD
    A[Admin Login] --> B[Admin Dashboard]
    B --> C[Users]
    B --> D[Products / Listings]
    B --> E[Auctions]
    B --> F[Reports Queue]
    B --> G[AI Review Queue]
    F --> H[Review & Act]
    G --> H
    H --> I[Warn / Restrict / Remove Listing]
    I --> J[Action Logged]
```

## 5. Buy Now Flow

```mermaid
graph TD
    A[Product Page] --> B[Add to Cart / Buy Now]
    B --> C[Checkout]
    C --> D[Mock Payment]
    D -->|Success| E[Order Created]
    D -->|Failure| F[Payment Failed - Retry]
    E --> G[Seller Notified]
    G --> H[Order Processing]
    H --> I[Delivery / Completion]
    I --> J[Buyer Leaves Review]
```

## 6. Auction Flow

```mermaid
graph TD
    A[Seller Creates Auction] --> B[Backend Validation]
    B -->|Valid| C[Auction Scheduled]
    B -->|Invalid| Z[Rejected - Show Errors]
    C --> D[Auction Start Time Reached]
    D --> E[Auction Active]
    E --> F[Bidding Flow]
    F --> G[Auction End Time Reached]
    G --> H[Scheduled Job Closes Auction]
    H --> I{Reserve Met?}
    I -->|Yes| J[Highest Valid Bidder = Provisional Winner]
    I -->|No| K[Item Unsold]
    J --> L[Winner + Payment Flow]
```

## 7. Bidding Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant API as FastAPI
    participant DB as PostgreSQL

    U->>API: POST /api/auctions/{id}/bids {amount}
    API->>API: Verify auth, auction status, timing
    API->>DB: BEGIN; SELECT auction FOR UPDATE
    DB-->>API: Current highest bid
    API->>API: Validate amount >= highest + min_increment
    alt Valid
        API->>DB: INSERT bid, UPDATE auction.current_bid
        API->>DB: COMMIT
        API-->>U: 201 Bid Accepted
        API->>API: Notify previous highest bidder (outbid)
    else Invalid
        API->>DB: ROLLBACK
        API-->>U: 400 Error (BID_TOO_LOW / AUCTION_ENDED / etc.)
    end
```

## 8. Auction Completion Flow

```mermaid
graph TD
    A[Scheduled Job: Auction End Time Reached] --> B[Lock Auction Row]
    B --> C[Determine Highest Valid Bid]
    C --> D{Meets Reserve?}
    D -->|No| E[Mark Unsold, Notify Seller]
    D -->|Yes| F[Mark Provisional Winner]
    F --> G[Create Payment Window Record]
    G --> H[Notify Winner]
    H --> I[Auction Status = Awaiting Payment]
```

## 9. Non-Payment Flow

```mermaid
graph TD
    A[Winner Notified, Payment Window Open] --> B{Paid Within Window?}
    B -->|Yes| C[Order Created, Auction Closed]
    B -->|No| D[Mark Payment Expired]
    D --> E[Log Event: auction_winner_history + seller_reputation_events]
    E --> F{Next Eligible Bidder Exists?}
    F -->|Yes| G[Offer to Next Bidder, New Payment Window]
    G --> B
    F -->|No| H[Item Marked Unsold, Returned to Seller]
```

## 10. AI Natural Search Flow

```mermaid
graph TD
    A[User Types Natural Language Query] --> B[POST /api/ai/natural-search]
    B --> C[AI Service: Prompt + Sanitized Input]
    C --> D[External AI API]
    D --> E[Structured JSON: category, budget, attributes]
    E --> F[Schema Validation]
    F -->|Valid| G[Backend Builds PostgreSQL Query]
    F -->|Invalid| H[Fallback: Treat as Plain Keyword Search]
    G --> I[Return Matching Products]
    H --> I
```

## 11. AI Listing Flow

```mermaid
graph TD
    A[Seller Enters Free-Text Description] --> B[POST /api/ai/listing-assist]
    B --> C[AI Service]
    C --> D[External AI API]
    D --> E[Structured Draft: title, category, condition, specs, description]
    E --> F[Schema Validation]
    F -->|Valid| G[Pre-fill Listing Form]
    F -->|Invalid/Fail| H[Fallback: Empty Manual Form]
    G --> I[Seller Reviews / Edits]
    I --> J[Seller Approves]
    J --> K[Publish]
```

## 12. AI Price Guidance Flow

```mermaid
graph TD
    A[Seller Requests Price Guidance] --> B[Backend Gathers: product details, comparable listings]
    B --> C[POST /api/ai/price-guidance]
    C --> D[AI Service + External API]
    D --> E[Suggested Range + Reasoning]
    E --> F[Labeled: AI-assisted guidance, not guaranteed value]
    F --> G[Shown to Seller in Listing Form]
```

## 13. AI Auction Assistant Flow

```mermaid
graph TD
    A[Buyer Asks: Is this auction worth considering?] --> B[Backend Gathers: condition, price, bids, seller rating, time left]
    B --> C[POST /api/ai/auction-assistant]
    C --> D[AI Service + External API]
    D --> E[Summary + Positive Factors + Concerns]
    E --> F[Displayed on Auction Page]
    F --> G[Buyer Makes Own Decision]
```

## 14. AI Review Summary Flow (Phase 2)

```mermaid
graph TD
    A[Product Has N Reviews] --> B{N >= Threshold?}
    B -->|Yes| C[POST /api/ai/review-summary]
    B -->|No| D[Show Raw Reviews Only]
    C --> E[AI Service + External API]
    E --> F[Common Positives / Complaints / Sentiment]
    F --> G[Displayed Above Raw Reviews]
```

## 15. AI Trust Flow

```mermaid
graph TD
    A[New Listing / Report / Behavior Event] --> B[Backend Signal Extraction]
    B --> C[POST /api/ai/trust-review]
    C --> D[AI Service + External API]
    D --> E[Review Signal + Reasoning]
    E --> F[Added to Admin Review Queue - Priority Ranked]
    F --> G[Admin Reviews]
    G --> H[Admin Decision: No Action / Warn / Remove / Restrict]
```

## 16. AI Image Flow (Phase 2)

```mermaid
graph TD
    A[Seller Uploads Images] --> B[POST /api/ai/image-assist]
    B --> C{AI API Supports Vision?}
    C -->|Yes| D[Suggest Category / Attributes / Flag Quality Issues]
    C -->|No/Unavailable| E[Skip - Manual Category Selection Only]
    D --> F[Seller Reviews Suggestions]
    F --> G[Seller Confirms / Edits]
```

## 17. AI Failure / Fallback Flow

```mermaid
graph TD
    A[AI Feature Invoked] --> B[AI Service Calls External API]
    B --> C{Success within Timeout?}
    C -->|Yes| D{Response Passes Schema Validation?}
    C -->|No - Timeout/Error| E[Log Failure to ai_interactions]
    D -->|Yes| F[Use AI Output]
    D -->|No| E
    E --> G[Trigger Feature-Specific Fallback]
    G --> H[Search: Plain Keyword Search]
    G --> I[Listing: Empty Manual Form]
    G --> J[Auction Assistant: Show Raw Auction Data Only]
    G --> K[Price Guidance: Hide Suggestion, No Error Shown to User]
    F --> L[Continue Normal Flow]
    H --> L
    I --> L
    J --> L
    K --> L
```

**Principle:** no core transaction (buy, bid, publish) is ever blocked by an AI failure. AI failures degrade the experience, never break it.
