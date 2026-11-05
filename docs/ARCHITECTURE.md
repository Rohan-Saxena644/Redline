# Architecture and trust boundaries

REDLINE is an experimental local reference application, not an arbitrary-retailer payment agent. One configured merchant (Redline Studio), USD, CAPTURE orders, and one-time authorization form its supported boundary.

```text
Authenticated owner → confirmed structured policy → bounded shopping agent
                                                    ↓ SKU / quantity only
Server merchant adapter → expiring authoritative quote → pure policy evaluator
                                                    ↓ allowed snapshot
Owner → exact basket approval → PostgreSQL reservation + immutable operation intent
                                                    ↓ commit, then network
PayPal sandbox create → buyer redirect approval → revalidation → server capture
                                                    ↓
Verified GET evidence / verified webhook + GET → durable settlement → receipt / replay
```

## Modules

`packages/policy` contains contracts, safe money conversion, canonical SHA-256 hashes and `evaluate`. It does not import the database, model, provider or browser. Time and ledger counters are supplied by the caller. Decisions enumerate exact expected/observed checks and stable reason codes. A hash binds a snapshot; it does not attest merchant truth.

`packages/paypal` validates responses with Zod, permits only `https://api-m.sandbox.paypal.com`, obtains OAuth tokens server-side and implements Orders v2 create/show/capture plus remote webhook signature verification. It uses current REST redirect checkout, not a browser SDK. This keeps payment credentials and mutation authority off the client. PayPal's `payer-action`/`approve` link is checked against the sandbox checkout host. There is no live endpoint setting.

`apps/web/lib` supplies the merchant adapter, model action loop, authenticated ownership checks, database orchestration, receipts and lab. Kysely queries use PostgreSQL parameterization. Migrations are ordered, committed modules run through Kysely's migration lock. Persistent JSON snapshots are separate from counters and operation state.

## Authority

The free-form mission is guidance. The user explicitly confirms editable fields: maximum cumulative total, successful purchase capacity, quantities, required categories, optional explicit SKUs and expiry. Merchant, currency and billing type are fixed enforced fields. Each confirmed policy version is immutable in historical quote snapshots. **Edit confirmed policy** requires explicit reconfirmation, increments the same mission's policy version and revokes prior active approvals. Spent/purchase counters are preserved. Pending/reserved payments must be resolved before revision; cancelled pre-capture operations remain recorded. A compare-and-swap policy hash rejects a stale editor. The model has no policy-edit action.

The model receives no payment tool, approval tool, arbitrary URL tool, credentials or mutable policy reference. Structured JSON selects `searchCatalog`, `inspectProduct` or `proposeBasket`. Server-side tools validate parameters and resolve the controlled catalogue. Proposals contain only SKU/quantity and an optional short explanation. Prices, merchant, URLs and unsupported fields are rejected. Catalogue descriptions are untrusted text; React escapes them. The SDK's independent metadata check remains authoritative even if a model follows an injected instruction.

## Quotes and approval

A quote records ordered unique line items, name, SKU, quantity, product version, known/available flags, category, billing type, unit price, merchant/payee, currency, subtotal, discount, shipping, tax, total, rules version and 15-minute expiry. Prices use integer cents. Sample rules: $6.99 shipping, $5 discount for item subtotal at least $200, 8% tax on discounted subtotal rounded half up with integer arithmetic. These are demonstration rules, not tax advice or a jurisdictional tax engine. This sandbox shop does not ship goods or collect a fulfillment address.

The opaque approval row binds owner, mission, operation, policy hash/version, complete quote hash/version, basket fingerprint and expiry. The complete quote snapshot carries itemization, payee, currency and total. Approval state is server-owned. Repeated approval of the same quote returns its original operation; it cannot mint a replacement approval after consumption/cancellation. Creating an order and initiating a new capture both check ownership, policy, fresh catalogue facts, expiry and immutable payload. Browser `allowed`, policy JSON and redirect parameters cannot authorize execution.

## Durable concurrency

Each claim transaction locks the mission, then the operation, then catalogue rows in sorted SKU order. It reevaluates cumulative capacity, reserves money/purchase count/stock and records stable create/capture request IDs and a hashed create payload before commit. External calls happen after commit. Distinct approval operations compete through the mission row; duplicate requests for one approval compete through the operation claim. Unique constraints cover approval-to-quote, approval-to-operation, provider order/capture IDs and request IDs. Completion decrements reservations, increments spent/purchase count and settles stock inside one transaction. Duplicate evidence cannot settle twice.

The internal `applyEvidence` function is trusted server code. It is not an API endpoint. Public webhook routing always verifies the original notification through PayPal, fetches current order evidence, checks financial/payee/operation bindings, and inserts event ID plus state update in one transaction. Unknown creates can be mapped by a verified notification's order ID and the retrieved order's `custom_id`; all other binding checks still run. Unknown operations without such evidence need manual handling.

## Receipts and replay

Receipts select redacted fields explicitly: original policy/quote/context, proposal, checks, approval lifecycle/hash, provider references/status and timestamped events. They omit OAuth tokens, credentials, payer details, addresses, raw provider responses, session tokens and unnecessary mission prose. IDs are opaque pseudonymous references. Events may contain supplied token usage; no monetary inference costs are invented. Receipts are unsigned, ordinary application records. They are not tamper-proof audit storage.

Replay checks the recorded evaluator version and reruns `evaluate` with original time/counters. It never reserves funds, invokes a model or calls PayPal. Changing today's clock or ledger does not change historical replay. Only `redline/0.1.0` is available in this release; version mismatch fails explicitly.

## Repair and approval differences

Rejected/replacement quotes have a durable `replaces_quote_id` link. Repairs are recorded under the same expected confirmed-policy hash; revision during an in-flight model call rejects the old result instead of evaluating it under silently changed instructions. Each replacement resolves a fresh merchant quote. The comparison derives item additions/removals, quantity/price/attribute changes, all charge amounts, resolved reason codes and category coverage from recorded structured snapshots. Resolved violations are claimed only for identical policy hashes. Qualitative product-performance equivalence is not invented.

Browser approval submits the policy/quote hashes actually displayed. Server checks those references along with fresh authoritative terms, so an outdated tab cannot approve an earlier version. A stale execution returns structured approved/current quote differences and policy-version/expiry facts; the UI renders those facts directly. Reconciliation of an already dispatched payment continues using its original operation and approval snapshot, even if today's quote differs.

Executed lab scenarios persist owner-scoped evidence records: run/scenario IDs, actual input and provider provenance (including **provider not called** for policy-only checks), expected constraint, observed result, timestamp and application version. Empty scenario cards are descriptions, not preclaimed results. Evidence can be downloaded independently and is included in a linked decision receipt. No injection-blocking rate is derived from these examples.

`examples/host-integration.ts` demonstrates the complete existing host contract in separate propose/review, authenticated approval, buyer-approved capture and reconciliation stages. It wraps current services rather than creating another execution system. The pure package consumer remains separate and offline.

## Modes

AI and payment modes are independent. `fixture` produces labeled deterministic proposals; `real` requires an explicitly configured endpoint and approved access. `simulated` uses durable local test-double orders; `sandbox` uses PayPal APIs. No error changes modes. The lab's scripted adversarial proposals use a third receipt provenance `scripted`. Lab product mutations use isolated owner-scoped inventory and cannot alter ordinary catalogue prices.
