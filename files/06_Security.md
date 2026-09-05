# Auction Hub — Security Documentation

## 1. Authentication Security

- Passwords hashed with bcrypt (or argon2), never stored plaintext, never logged.
- JWT access tokens are short-lived (e.g., 15–30 min); refresh tokens (longer-lived, stored httpOnly) used to re-issue access tokens without repeated password entry.
- Failed login attempts are rate-limited per account/IP to slow brute force.

## 2. Authorization

- Every mutating endpoint verifies **ownership** server-side (e.g., a seller can only edit/pause/archive their own listing — checked against `products.seller_id`, never trusted from the request body).
- Admin-only endpoints protected by a `require_admin` FastAPI dependency that checks `users.role`, not a client-supplied flag.
- A user cannot bid on their own auction — enforced in `bid_service`, not just hidden in the UI.

## 3. Password Security

- Minimum password strength rules enforced server-side at registration (length, not just client-side JS validation which can be bypassed).
- Password reset via time-limited, single-use tokens sent to verified email, never via a directly-settable "new password" field without verification.

## 4. JWT / Session Security

- JWT signed with a strong secret stored only in backend environment variables.
- Tokens include minimal claims (user id, role, expiry) — no sensitive data embedded in the token itself.
- Refresh tokens stored as httpOnly, secure, SameSite cookies where the deployment supports it, reducing XSS token theft risk.

## 5. API Security

- All endpoints served over HTTPS only.
- Input validated via Pydantic schemas on every request — rejecting malformed/unexpected fields rather than silently ignoring them.
- Consistent, non-leaky error messages (e.g., login failure returns "invalid credentials" for both wrong email and wrong password, not "user not found" vs "wrong password," which would leak account existence).

## 6. Database Security

- All queries via parameterized queries / ORM — no raw string-concatenated SQL, eliminating SQL injection risk by construction.
- Database credentials only in backend environment variables, never in frontend code or committed source.
- Least-privilege DB role for the application connection (no superuser access from the app).

## 7. File Upload Security

- Uploads restricted to allow-listed image MIME types and a max file size, validated server-side before issuing a Supabase Storage signed upload URL (not just checked client-side).
- Uploaded filenames are never trusted directly — stored under a generated path (e.g., `product_id/uuid.ext`), preventing path traversal or overwrite attacks.
- Images are not executed or interpreted server-side; they're stored and served as static assets only.

## 8. Auction Security / Race-Condition Protection

- Bid placement wraps `SELECT auctions ... FOR UPDATE` and the resulting `INSERT INTO bids` / `UPDATE auctions` in a single database transaction, serializing concurrent bids on the same auction so two simultaneous bids can never both be accepted as "highest."
- Auction start/end enforcement happens server-side against `now()` at request time — the frontend countdown is purely cosmetic and never trusted for whether a bid is accepted.
- The auto-close job is idempotent (safe to re-run without double-processing an already-closed auction) to avoid duplicate winner notifications or duplicate payment-window records if the job retries.

## 9. Payment Security

- Prototype uses a mock payment service behind the same interface a real gateway would use — no real card data is ever collected or stored by the application.
- Documented as: **production deployment requires a PCI-compliant gateway (e.g., Razorpay/Stripe) — Auction Hub's backend never handles raw card numbers even in production**, only gateway tokens/webhooks.
- All payment state transitions logged to `payment_transactions` for auditability.

## 10. AI Security

### 10.1 Prompt Injection Protection
- User input (search query, listing description, review text) is always inserted into a fixed prompt template as **data**, never concatenated as instructions the model should "obey."
- The AI service explicitly instructs the model (system-level, not user-controllable) to treat all user-supplied text as content to interpret, not as commands — and prompts are designed to constrain output to a defined JSON schema, sharply limiting what an injected instruction could actually change.
- AI is never given tool/function access to execute code, SQL, or platform actions — it can only return text/JSON that the backend then independently validates.

### 10.2 AI Output Validation
- Every AI response is parsed and validated against a strict Pydantic schema before use. Responses that don't validate are discarded and the fallback path is used — the raw AI output is never passed to the database or rendered unsanitized.
- Structured outputs (e.g., search filters, listing drafts) still go through the same input validation as if a human had submitted them (e.g., a suggested category must exist in `categories`, a suggested price must be numeric and positive).

### 10.3 AI Data Privacy / Leakage
- Only the minimum necessary fields are sent to the external AI API per feature (e.g., price guidance sends product attributes and comparable price data — not the buyer's or seller's personal contact details).
- No passwords, tokens, payment data, or raw contact information are ever included in an AI prompt.
- `ai_interactions.input_summary` stores what was sent for audit purposes, itself protected by the same DB access controls as other user data.

### 10.4 AI Authority Limits
- AI cannot place bids, complete purchases, publish listings without seller approval, ban/restrict users, or directly modify database records — enforced architecturally (the AI service has no write access to those tables; only the relevant business-logic service does, and only after a human-approval step where required).

## 11. API Key Protection

- AI provider key, Supabase service key, and JWT secret are stored only as backend environment variables (never in frontend JS, never committed to git — `.env` files gitignored, `.env.example` committed instead).
- Frontend interacts with Supabase Storage only via short-lived signed URLs issued by the backend, never the storage service key directly.

## 12. Rate Limiting

- Per-IP/per-user rate limits on: login attempts, bid placement, AI endpoint calls, report submissions — preventing both brute force and AI-cost abuse.

## 13. CORS

- CORS restricted to the deployed frontend origin(s) only — not a wildcard `*`, since the API handles authenticated, state-changing requests.

## 14. XSS Prevention

- All user-generated text (listing descriptions, reviews, AI-generated suggestions once inserted into forms) rendered via safe DOM APIs (`textContent`, or an escaping helper) rather than raw `innerHTML`, preventing stored/reflected XSS from listing or review content.

## 15. SQL Injection

- Fully mitigated via parameterized queries/ORM usage as noted in Section 6; no endpoint constructs SQL from unsanitized string concatenation.

## 16. Logging

- Structured logs exclude sensitive fields (passwords, tokens, full payment details) by default via a logging filter.
- Security-relevant events (login failures, admin actions, AI trust flags, payment failures) logged to a separate audit trail retained longer than general request logs.

## 17. Monitoring

- Basic anomaly visibility: spikes in failed logins, bid-rejection rate, or AI failure rate are logged in a way that's queryable, even without a dedicated SIEM at this project's scale.

## 18. Incident Handling

- Defined process: suspected compromised account → admin can immediately set `account_status = 'suspended'`, invalidating future logins; existing tokens expire naturally within their short TTL.
- Any confirmed data exposure (e.g., leaked AI API key) requires immediate key rotation via environment variable update and redeploy — no key is ever hardcoded, which keeps rotation a config change, not a code change.
