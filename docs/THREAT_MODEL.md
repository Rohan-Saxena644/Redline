# Threat model and readiness gaps

## Protected assets and assumed trust

The protected assets are confirmed spending capacity, exact approval intent, ownership of missions/quotes/operations/receipts, payment credentials and truthful payment status. PostgreSQL, the deployed server, its configured merchant adapter, PayPal sandbox and the authenticating gateway are trusted components. Model output, natural-language missions, catalogue descriptions, browser parameters and webhook transport are untrusted. Database administrators and compromised servers can rewrite application records; the audit trail is not immutable.

| Threat | Implemented boundary | Remaining assumptions/gaps |
| --- | --- | --- |
| Model overreach/injection | No payment/approval/network tool; strict SKU/quantity proposal; deterministic server checks | Model compliance itself is not guaranteed; catalogue metadata must remain authoritative |
| Forged prices/merchant/currency | Strict proposal schema; server quote; payee/amount/itemization verification | Merchant configuration and sample tax rules are trusted |
| Basket changes after approval | Full hashes, fresh catalogue evaluation, expiry and operation binding before mutation | A change after the capture claim but before the provider call cannot retract an already dispatched approved immutable payload; external systems require their own transactional quote guarantees |
| Concurrent execution/overspend | Mission/operation/product locks and unique provider identities; durable reservations | All payment writers must use this path; DB durability and constraint integrity are required |
| Ambiguous remote outcome | Keep reservation, original IDs, bounded reconciliation; never fresh-payment recovery | Manual review may be indefinite; provider idempotency retention is not asserted |
| Duplicate/stale/forged webhook | PayPal signature verification, authoritative GET, transactional event dedupe, terminal monotonicity | Live delivery not tested; refunded/reversed/disputed payments require separate business handling |
| Cross-user access | Server lookup filters on owner for every user-owned resource; opaque session/approval IDs | Development login is not a public identity product |
| CSRF/session theft | Origin + Host enforcement for mutation, HttpOnly SameSite=Lax cookie, HTTPS Secure cookies, hashed session tokens, expiry | Trusted gateway must remove incoming spoofed identity headers and isolate origin |
| Request abuse/log exposure | Bounded bodies and model output/tools, DB minute buckets, correlation IDs, explicit redacted logs/receipts | Proxy-level rate/concurrency limits, WAF and monitoring needed at public scale |
| Untrusted HTML | Text rendering through React; no description HTML execution | CSP currently allows inline scripts/styles and dev eval; nonce-based production CSP is future hardening |

## Local authentication

The local login creates a random server-side owner and opaque 8-hour session. There is no password, account picker or claim to real-world identity. Logging out/expiry loses access to that random local owner's missions through the UI; this is intentional development behavior. Proxy-authenticated deployment owners are stable hashes of the gateway's user subject. A public origin with development login/lab enabled is rejected by configuration. The local dev server binds loopback. Never expose a loopback-configured development service through an untrusted tunnel.

## Explicit production-readiness work

Before any deployment beyond a controlled sandbox pilot: verify the actual model/provider integration, complete real sandbox checkout/webhook evidence, independently review the financial/security design, replace or thoroughly validate gateway integration, add account recovery and authorization administration, enforce TLS/private origin and network egress, tighten CSP with nonces, add distributed admission/concurrency quotas, lifecycle alerts, observability and reconciliation escalation.

Before live commerce: implement a separately reviewed live integration, provider/account-specific idempotency handling, fulfillment, real shipping/tax/address consent, inventory contract, refund/reversal/dispute accounting, privacy retention/deletion, accessibility review including assistive technologies, independent penetration testing and recovery drills. This version intentionally rejects live PayPal hosts and does not implement these features.

No production certification, universal security, tamper-proof logging or universal exactly-once payments are claimed. Local unit/integration/browser and automated accessibility checks provide bounded evidence, not a security audit.
