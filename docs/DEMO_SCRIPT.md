# Recording plan — 2:40

> **November 11 update:** Real Groq inference and PayPal sandbox OAuth/order creation passed. Buyer-approved capture remains pending. The live run used backend services; the browser-control helper failed. See [current live evidence](LIVE_VERIFICATION.md) for provenance and remaining steps. Older missing-credential statements below describe earlier verification.

**Current gate:** real Groq proposal and PayPal sandbox order creation passed through backend services. Buyer-approved capture and the live browser journey still need verification. The plan below distinguishes footage available now from live footage still required. Do not label the full submission recording ready until a real run and `verify:capture` pass.

Use one mission: **microphone AND headphones, USD $150 inclusive of shipping/tax, one-time purchases, fixed policy v1**. Same-price swap is optional and **not implemented**; its prompt was never sent. Regression export stays deferred.

## Off-camera preparation

Follow [private setup](RECORDING_HANDOFF.md): save authorized credentials in ignored `.env`, start PostgreSQL, migrate/seed, run `npm.cmd run verify:live`, restart `npm.cmd run dev`. Keep credentials, buyer login and account management off camera. Pre-authenticate only the separate sandbox personal buyer. Never approve an unreviewed basket to simplify filming.

For a reproducible opening after access passes: Enter local workspace → Adversarial lab → **The hidden last mile** → **Run test** → **Inspect mission**. This existing scenario uses scripted SKUs and no PayPal request; its actual total is $156.03. Start footage on this blocked mission. The real model then repairs this same mission through **Find an alternative**. Keep its original policy fixed.

If the real model's first proposal is already valid, show that honest result in the run notes; do not describe the scripted opening as a model failure. If the actual real run contains its own rejection, you may use that observed rejection instead, with its own amount/source. Keep the recording's quote/operation IDs tied to the same run through capture and replay. Do not substitute fixture footage for the real checkout segment.

Before the final take, write down the actual rejected/revised SKU names, subtotal, shipping, tax and final total from that run. $123.63 was also observed in the November 11 real Groq proposal ($59 microphone + $49 headphones + $6.99 shipping + $8.64 tax); it is not a promised outcome for a new take. Replace narration amounts with the recorded run's actual figures. An exhausted or rejected real repair remains a failure; never change policy silently.

| Time | Exact clicks / view | Narration | Required on-screen evidence |
| --- | --- | --- | --- |
| 0:00–0:18 | Start on blocked proposal. Click **Inspect** if needed to expose BUDGET_EXCEEDED; keep basket review visible | “A microphone and headphones, under $150 including all charges. This scripted basket costs $156.03. Checkout stops before payment.” Use “scripted” only for the scripted scenario; use the actual amount/source for a real rejection | $150 policy; $138 items + $6.99 shipping + $11.04 tax = $156.03 for the scripted opening; BUDGET_EXCEEDED; **Checkout blocked before payment**; proposal input and payment mode. No approval button |
| 0:18–0:55 | Click **Find an alternative** with Real model / Sandbox configured. Scroll the repair panel into view | “The model gets the rejection feedback. The policy stays fixed; it changes the basket and keeps both required categories.” Name the actual removed/added items and revised total | Budget and both final totals together; removed/added SKU labels; side-by-side baskets; Input: scripted/real as applicable; unchanged policy v1; category coverage. Edit inference waiting time honestly |
| 0:55–1:18 | Review current basket/all charges; click **Approve exact basket** | “Allowed does not mean approved. I approve these exact items and this exact total. Changed terms need a new quote and approval.” | Actual items, USD final total, approval state. The stale-approval claim is backed by local zero-request integration checks; do not invent a live stock or price change |
| 1:18–2:12 | Click **Create sandbox order** → **Approve at PayPal sandbox** → buyer approves → return → **Verify approval & capture** | “REDLINE approval and PayPal buyer approval are separate. The server retrieves the order, validates its binding, then captures and verifies the result.” | Actual sandbox approval and **Sandbox payment completed**, actual order/capture references. Keep mode visible. No password footage; label any waiting-time edits. Redirect or success text alone is insufficient |
| 2:12–2:26 | Open **Decision receipt**; use its `snapshot.quote.id` in terminal: `npm.cmd run verify:capture -- <actual quote UUID>` | “A separate read-only check fetches this same order from PayPal again: the exact USD amount and a final completed capture.” | Expected amount/currency equals provider amount/currency; order/capture status COMPLETED; matching capture reference; source says provider GET / no mutation. This live segment is pending until actually exercised |
| 2:26–2:40 | Return to receipt/decision inspector; click **Replay decision**. Brief terminal insert of `npm.cmd run verify:package` output | “The SDK reproduces the rejection offline. Receipt replay repeats checks without payment.” End: “Give agents a mission. Keep control of the money.” | Replay matched / zero payment actions. SDK insert labeled **OFFLINE SEEDED SDK FIXTURE**: 156.03, BUDGET_EXCEEDED, redline/0.1.0. It is not a regression export or another provider capture |

## Take acceptance

- First rejection visible before 20 seconds; one mission through repair, exact approval, sandbox capture and replay.
- Budget, totals and actual item changes legible together in the repair frame; input/payment provenance visible. Keep the detailed charge table available while narrating totals.
- Actual live capture independently retrieved and amount/currency/final COMPLETED status checked. Save redacted receipt and `.local/capture-verification-<quote UUID>.json` privately with source commit and model identity.
- No unrecorded price, stock, policy change, same-price swap, model failure or webhook delivery claimed. The local stale-approval scenario is labeled scripted/simulated if shown outside the main cut.
- Keep response-loss labs and optional swap out of the main cut. The swap gets a short implementation pass only after real capture passes and only if recording remains reliable. No regression-export work.
- Owner records, pushes, publishes and submits. Current model quota/expiry and sandbox-access continuity through December 21 remain unresolved; see [access continuity](ACCESS_CONTINUITY.md).
