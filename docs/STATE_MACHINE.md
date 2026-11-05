# Payment states and recovery

| State | Meaning | Safe next actions |
| --- | --- | --- |
| APPROVED | REDLINE user approval exists; no provider mutation intent yet | Revalidate and reserve/create, or cancel |
| CREATING | Create intent and reservation committed; call may be in flight | Wait for lease, reconcile, operator review if no order ID |
| AWAITING_BUYER | Known validated order; no capture intent yet | Buyer approval, status retrieval, revalidate and capture, local cancellation |
| CAPTURING | Capture intent committed; capture may be in flight | Retrieve/reconcile; never create a replacement payment |
| UNKNOWN | Ambiguous create/capture/provider validation or network result | Retain capacity, reconcile known order; operator review if unresolved |
| COMPLETED | Order plus one exact, final, completed capture verified | Receipt/replay; no downgrade or second settlement |
| FAILED | Provider order is VOIDED with no capture evidence | Release once; new proposal/approval if wanted |
| CANCELLED | Owner cancelled before any capture intent | Approval revoked, reservations released; this path cannot capture it |

The operation's `phase` records whether a capture has ever been initiated. Even if a later GET still shows APPROVED, an operation with capture intent remains UNKNOWN instead of initiating another capture. A process restart cannot erase phase/request IDs/reservation. A stale worker or webhook cannot downgrade COMPLETED. Terminal contradictory evidence fails closed and needs incident review.

## Reservation lifecycle

Policy evaluation alone does not reserve. Create claim atomically checks and increments mission reserved cents and pending purchase count, plus product holds. Pending/unknown operations keep all holds. A verified exact completion atomically transfers reserved to spent, increments successful count and settles inventory. A proven VOIDED/no-captures order releases holds. Local cancellation is accepted only in APPROVED or AWAITING_BUYER and only before capture phase; it disables this app's future capture. It does not cancel an order at PayPal or prove no administrator can act externally.

Approval/policy/quote expiry prevents initiating new captures. Expiry never discards an unresolved operation or proves payment failed. Evidence of an already completed payment must still settle after expiry. Financial/catalogue changes invalidate new execution. A pending pre-capture operation can be locally cancelled, then a fresh quote explicitly approved; an ambiguous capture cannot be cancelled to recover budget.

## Request IDs and retention

Create and capture each persist a distinct UUID before mutation. The create UUID is bound to the stored payload hash; capture is bound to the immutable order and empty capture request. Never repurpose these keys. Concurrent local requests cannot dispatch a second independent mutation for the same phase.

The current [create endpoint](https://developer.paypal.com/api/orders/v2/orders-create) and [capture endpoint](https://developer.paypal.com/api/orders/v2/orders-capture) document `PayPal-Request-Id`. Neither retrieved current endpoint page/spec gives a request-ID retention duration. The [general idempotency reference](https://developer.paypal.com/api/rest/reference/idempotency/) explicitly makes retries conditional on provider storage time. An order's redirect/approval lifetime is not a request-ID retention guarantee.

Consequently **this version never automatically retries a payment mutation**. It preserves IDs for diagnosis and potential operator-supervised retries only after endpoint/account-specific semantics and retention are independently established. It retrieves known orders instead. A create response loss without a known order ID cannot be solved by creating a fresh order. A correctly verified webhook can recover its mapping through the fetched order binding; otherwise operator review is required. No universal exactly-once payment guarantee is claimed.

## Reconciliation

`npm run reconcile` runs one database-backed batch: at most 20 due reservations, at most 20 scheduled attempts per operation. Run it from a scheduler every minute if needed; no Redis is required. A 60-second mutation lease prevents normal reconciliation from racing an in-flight request; original IDs/phase remain durable if the process exits. The shopper's explicit **Check payment status** action also retrieves the same known order. The worker uses delayed retry scheduling, although successful nonterminal retrieval currently resets the next check to about a minute; it still enforces the attempt cap. After the cap, retain reservation and alert an operator. Manual UI checks remain available.

Before any operator retry: inspect operation state/phase, payload hash, provider order/capture references, known provider evidence and original request IDs. Reconcile first. Never release holds or mark complete from a timeout, buyer redirect, screenshot, local success flag or unverified event.
