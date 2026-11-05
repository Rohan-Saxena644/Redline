# REDLINE — Give agents a mission. Keep control of the money.

Draft only. No repository, demo URL, video or submission has been published. Replace readiness statements with actual live-verification evidence before submitting; do not remove the limitations by implication.

## Inspiration

Purchasing agents can turn ambiguous instructions or untrusted product text into expensive mistakes. A useful boundary needs to exist outside the model: confirmed structured rules, authoritative prices, exact human approval and durable payment status.

## What it does

REDLINE pairs an experimental TypeScript policy SDK with a complete reference purchasing workspace. A user confirms a streaming setup mission and its budget. A bounded agent searches a controlled 24-product shop and proposes SKUs. Deterministic code checks the final total, merchant, billing type, stock, quantities, categories, expiry and cumulative capacity. A user separately approves the exact basket before sandbox checkout.

Every decision can be downloaded as a redacted receipt containing policy/quote snapshots, exact checks, evaluator version, approval lifecycle and provider references. Replay reproduces policy checks without performing a payment. Six labeled adversarial scenarios exercise shipping overrun, recurring products, catalogue injection, price change, concurrent requests and remote capture response loss.

## How we built it

A TypeScript npm workspace: a dependency-free portable evaluator, server-only PayPal sandbox REST adapter, Next.js/React/Tailwind interface, Zod boundaries, PostgreSQL and Kysely migrations. The configured OpenAI-compatible agent has catalogue tools and at most three proposals/eight actions. It receives no payment credentials or execution tool. Separate fixture AI and simulated payment modes make tests reproducible without impersonating real integrations.

Approval binds the exact policy, quote, owner, merchant/payee, total and operation. PostgreSQL locks reserve cumulative funds and stock before network calls. Stable mutation intent survives crashes. Ambiguous outcomes keep reservations and reconcile against the same known order. Verified PayPal webhook delivery triggers authoritative retrieval; duplicate/stale events cannot settle twice or downgrade completion.

## Challenges and lessons

The hard part is preserving authority across time: approval does not remain valid after a price change, a timeout does not prove a failed payment, and a duplicate request must not create another purchase. Ordinary logs and hashes do not create an immutable financial record. The current PayPal endpoint references do not specify request-ID retention duration, so the reference conservatively avoids automatic payment mutation retries and documents manual recovery cases.

## Demonstrated evidence and current limits

The local fixture/simulated application, isolated packed SDK consumer, PostgreSQL concurrency/recovery tests and browser workflows are implemented and tested. Real inference and PayPal sandbox create/approval/capture/webhook delivery still need authorized credentials and live verification. **Do not submit this draft as if those stages already succeeded.** This release permits one merchant, USD and one-time purchases, with sample shipping/tax rules and no real fulfillment. It is not production-certified, universally secure or a universal exactly-once payment system.

## Next steps

Verify approved live integrations; record the actual sandbox checkout; independently review the security/financial design; harden deployment identity/operations; add versioned evaluator retention and fuller business lifecycle handling before considering live commerce.

## Submission fields to fill manually

- Public MIT-licensed repository URL after publication authorization.
- Public YouTube video under three minutes after recording/publication authorization.
- Functional setup instructions (README); hosted URL only if actually authorized and deployed.
- Actual inference model/provider used and how it was used; separate development assistance from the application's purchasing model.
- Team, eligibility, originality/progress and third-party usage disclosures required by the current form/rules.
