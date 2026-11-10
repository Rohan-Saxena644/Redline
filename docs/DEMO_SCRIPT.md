# Recording plan — 2:40

**Status, November 10:** local behavior verified; no footage or upload created. Live model inference and PayPal sandbox checkout remain **not verified** because approved access is absent. The live segments below are gates for recording, not completed demonstrations. Keep mode indicators and input provenance visible.

Use one mission throughout: **microphone AND headphones, USD $150 including shipping and tax, one-time purchases, fixed policy v1**. Audience: developers building AI-assisted purchases.

| Time | Screen / action | Narration and evidence |
| --- | --- | --- |
| 0:00–0:18 | Open directly on rejected $156.03 basket: $138 items + $11.04 tax + $6.99 shipping | “A microphone and headphones, under $150 including every charge. This basket crosses the limit. REDLINE blocks it before checkout.” Show BUDGET_EXCEEDED and no approval/checkout. Use an observed real-model rejection or label **SCRIPTED SHIPPING BOUNDARY TEST**. Never call a fixture a model failure. |
| 0:18–0:58 | Real agent repair; rejected/revised baskets side by side | “The policy stays fixed. Only the basket changes. Both required categories still pass.” Show unchanged policy version/hash, item substitutions and both charge columns. The verified seeded substitute is $123.63 ($108 + $8.64 + $6.99); narrate the real model's actual total if different. If its first proposal succeeds, say so; the labeled scripted rejection can seed this same mission before real repair. |
| 0:58–1:20 | Review current items, payee, all charges; exact approval | “An allowed proposal still cannot pay. I approve this exact basket and total. Changed terms require a fresh quote and fresh approval.” Show the actual approval click. The stale-approval statement is backed by local price-change tests, not invented live price movement. |
| 1:20–2:15 | Create sandbox order; separate sandbox buyer approval; Verify approval & capture | “PayPal buyer approval is separate. The server retrieves the order, checks its binding and verifies a completed capture.” Show actual **Sandbox payment completed**, redacted order/capture references and sandbox mode. Edit waiting time transparently. OAuth success or a return redirect is insufficient. **Record this only after real capture succeeds.** |
| 2:15–2:40 | Same mission's decision receipt and Replay decision; optional short SDK terminal insert | “The receipt preserves policy, quote, evaluation time and evaluator version. Replay repeats the decision with zero payment actions.” Show replay matched. If using `npm run verify:package`, label it **OFFLINE SEEDED SDK FIXTURE**, not an exported receipt regression. End: “Give agents a mission. Keep control of the money.” |

## Preparation and acceptance gates

1. Follow [integration setup](INTEGRATIONS.md) and [access continuity](ACCESS_CONTINUITY.md). Run `npm run verify:live` with approved access, then a full actual model/sandbox browser journey. Preflight checks only model structured output and PayPal OAuth; it cannot certify checkout. Save the redacted live receipt privately and record its source commit.
2. Start a fresh owner/mission in real AI/sandbox modes. Never execute an old simulated approval in sandbox mode. Keep the microphone/headphones requirement, $150 inclusive total and original policy fixed during replanning. Do not force model SKUs or weaken policy to obtain success.
3. If a predictable rejection is needed, run only the scripted shipping scenario, open its mission and use the real agent for replacement. Keep “scripted” and “real” input labels visible. No tour of all six labs.
4. Pre-authenticate the authorized sandbox personal buyer privately. Never record passwords, keys, personal payer data or real payment details. Recheck unexpired authoritative terms immediately before approval. If terms change, review a new quote and approve it again; do not reuse the old approval.
5. Keep the 160-second cut on this mission. Leave response-loss experiments out of the main recording; their separately labeled simulated evidence can remain in review materials.
6. Use readable zoom/captions and original UI/narration. Review cuts for accurate chronology, modes and statuses. Do not fabricate a payment result or a model failure. Record the actual capture/replay before claiming a completed demo.
7. The owner handles final recording, publication, uploads and submission. None were performed here.

## Optional export feature

**Deferred.** The prerequisite real model → verified PayPal sandbox capture has not succeeded, so the conditional half-day export work has not started. Reserve remaining time for access, recording and submission. Existing receipt replay and the packed SDK fixture work offline; no “Export regression case” UI or receipt-derived fixture is claimed.
