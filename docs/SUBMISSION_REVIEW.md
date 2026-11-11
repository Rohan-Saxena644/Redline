# Submission review — November 11, 2026

> **Final recorded run, November 11:** The authenticated REDLINE browser journey passed with real Groq repair, exact human approval, manual sandbox buyer approval and server capture. Independent provider GET confirmed **$145.23 USD, COMPLETED, final capture**. The caption-only 2:40/1080p video passed full decode; sampled frames were reviewed, including the corrected 2:01 caption. See [current live evidence](LIVE_VERIFICATION.md). Older access and rehearsal statements below are historical.

**The real backend journey passed.** Actual Groq catalogue/proposal calls, server quote/evaluation, explicit exact-basket human approval, PayPal sandbox create, manual buyer approval, server capture and independent provider GET confirmed $123.63 USD, COMPLETED and final capture. A subsequent full browser take completed at $145.23 USD and was independently verified; live webhook delivery is unverified. Publication, recording, upload and submission remain with the owner.

## Recording handoff follow-up

Starting from the four local commits `1ff2f40`, `d57319b`, `42d264d`, `913b768`, the comparison now puts policy budget and both final totals immediately above the side-by-side items. Added/removed SKU labels and configured payment/input provenance remain in the same frame. Desktop/mobile screenshots were inspected and refreshed; automated checks confirm budget/totals/items fit together at both tested viewport sizes.

Denied proposals and structured stale-approval failures now display **Checkout blocked before payment**. A sandbox-mode integration test injects the actual PayPal adapter's transport and verifies **zero HTTP requests** for denied approval/checkout bypass and stale execution; no create/capture mutation can be issued by those rejected attempts. The stale message refers to the rejected attempt, not cancellation of any earlier dispatched operation.

`verify:live` now also reports `configuration.realServiceSettingsComplete`, separating valid app defaults from completed real-service setup. It still checks only a single structured model response and PayPal OAuth, never checkout. The new `npm run verify:capture -- <quote UUID>` independently retrieves an already completed real-model/sandbox order, checks the immutable decision snapshots and existing provider binding, and compares exact amount/currency, final COMPLETED capture and capture ID with the settled operation. Its tested fixture path is not live PayPal evidence. It never creates or captures; reports stay in ignored `.local/`.

The [private recording handoff](RECORDING_HANDOFF.md) lists exact fields, commands and buyer actions. Supplied credentials remain private in ignored `.env`. Current results: **configuration, real Groq mission, PayPal OAuth/create and buyer-approved capture all passed**. The verified account combination is an IN sandbox Business seller and a separate US Personal test buyer. The seller receiving preference was also changed. The first quote expired and was not extended: a new mission preserved the same purchasing constraints, kept its new policy fixed, obtained a real repair and fresh exact approval, and completed capture. The successful repair links directly to the scripted $156.03 opening with the same policy hash. Both replays match with zero payment actions.

The previous same-price-swap prompt was never sent and no such feature is implemented. It is deferred to preserve recording reliability to keep the verified recording stable. Regression export stays deferred. The SDK evidence continues to use the existing decision inspector, replay and `npm run verify:package`.

Public repository check, November 10 at 16:15 UTC: [GitHub](https://github.com/Rohan-Saxena644/Redline) is accessible without authentication, but public main is still `c6b78b839905eec74bb11c1223107fc0750391bb`. README and MIT license return HTTP 200; root/SDK license and setup files exist, with no forbidden private/build artifact paths in its 79-file tree. Its README differs from this checkout and it lacks `verify:capture`. The original four starting commits and this follow-up are local: **the owner must review and push them** before judges receive this build. No push, publication or remote change was performed. The candidate manifest's null public location means the candidate has not been bound/published there; it is not evidence that the existing repository is absent.

## Original missing-access blocker — November 10 history

The real workflow stops before its first model request because approved access is absent. A reproducible readiness defect also hid that blocker from automation: `npm run verify:live` printed missing settings but exited 0. It now exits 1 for missing, invalid or failed configuration, lists configuration names without values, and writes `.local/verification-latest.json` even when sandbox configuration is incomplete. Remote models require a server-only key; keyless loopback models require explicit local access approval. A successful preflight verifies only one structured model action and PayPal OAuth, never checkout.

## Baseline fixture mission and verified behavior — November 10

The table below records the prior fixture checks. November 11 adds actual Groq repair and verified PayPal sandbox capture for the same observed amounts; see [current live evidence](LIVE_VERIFICATION.md).

Confirmed rules: microphone **and** headphones, USD $150 inclusive total, one-time purchases, one merchant, quantity/purchase limits. Replanning preserves the original policy hash/version.

| Basket | Microphone | Headphones | Items | Shipping | Tax | Total | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rejected seeded proposal | Arc Pro, $79 | Halo Reference, $59 | $138 | $6.99 | $11.04 | **$156.03** | BUDGET_EXCEEDED |
| Valid seeded substitute | Loom USB, $59 | Field monitor, $49 | $108 | $6.99 | $8.64 | **$123.63** | Allowed; still needs exact approval |

The existing UI shows the rejected/revised baskets side by side, all charges, item changes and category coverage. These are sample merchant quotes, not scraped retailer prices or claims of equivalent audio quality. Real model choices may differ; report their actual outcome.

| Step | Exercised integration / evidence | Limit |
| --- | --- | --- |
| Model proposal and feedback repair | Actual CompatibleModel HTTP parsing and agent loop, injected JSON responses; real PostgreSQL | HTTP fixtures; no model inference |
| Denied basket cannot checkout | Approval service rejects BUDGET_EXCEEDED; zero approval/operation rows. Browser sends exact-hash approval directly: 409; attempts checkout with quote ID: 404; zero operations/reservations | Real server/DB enforcement, fixture proposal |
| Fixed policy and repair comparison | Rejected $156.03 and accepted $123.63 snapshots share the same policy hash; comparison and category coverage checked in browser/receipt | Fixture inputs |
| Changed terms need fresh approval | Scripted isolated price change: old $123.63 approval rejected; current $124.71 quote cannot use old review hash; new approval completes at $124.71 | Real server/DB, simulated payment |
| PayPal create → buyer gate → capture → retrieval | Actual PayPalSandbox adapter with injected OAuth/create/order/capture HTTP responses; minimal create retrieved; no capture before APPROVED; final COMPLETED amount/capture verified, one mutation each | HTTP fixtures; buyer status advanced by test; no real PayPal account used |
| Browser completion | Desktop/mobile REDLINE → separate simulated buyer approval → simulated capture → receipt/reload | Durable local simulator, not PayPal sandbox |
| Replay and offline consumer | Same decision snapshots replay with zero payment actions; packed public SDK consumer reproduces BUDGET_EXCEEDED | Seeded SDK fixture; no exported receipt regression |

Current checks: **42 unit and 59 PostgreSQL integration tests passed**; all **12 browser cases** passed across the full run's ten unaffected cases and the corrected desktop/mobile journey rerun, including automated accessibility checks. Typecheck, lint, final production build and packed offline consumer passed. See [verification](VERIFICATION.md) for setup/build details and historical checks.

README rehearsal used fresh source archive `1ff2f40`, no copied dependencies/build output/private environment, an offline npm cache and an empty dedicated PostgreSQL database. Install, migrations, seed, typecheck, production build and optimized-server fixture checkout/replay passed. The exact `npm run dev` command also served readiness and REDLINE HTML with HTTP 200 on localhost:3000. It reused the same Windows/Node/Docker installation; a fresh operating system and uncached registry access were not tested. That rehearsal predates the comparison/capture-verifier polish; the dependency graph is unchanged and current-source build/tests passed separately. Temporary servers were stopped after verification; local source/database evidence remains private and ignored by Git.

## Setup and fresh browser rehearsal

The backend live journey is now verified. Keep the existing configured private `.env`; do not overwrite it or create another seller. For the verified Groq GPT-OSS profile use `AI_OUTPUT_MODE=tool_calling`. Use the US Personal sandbox buyer, and start the recording mission through its own local browser session. Repeat the steps below for a fresh take; do not reuse the already captured operation.

1. At the repository root, copy `.env.example` to private `.env` (PowerShell: `Copy-Item .env.example .env`; preserve any existing private file). Fill in an already authorized compatible model endpoint and explicit model: `AI_BASE_URL`, `AI_MODEL`, remote `AI_API_KEY`, `AI_MODE=real`, `AI_ACCESS_APPROVED=true`. An existing local server instead needs its actual URL/model and `AI_ALLOW_LOCAL=true`. No model, account, credits or paid plan was selected or provisioned.
2. In the [PayPal developer dashboard](https://developer.paypal.com/dashboard/), select your authorized **sandbox** REST app. Privately copy its client ID/secret and the associated sandbox business account's merchant ID into `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`; set `PAYMENT_MODE=sandbox`. Have a separate authorized sandbox personal buyer login ready. Keep the sandbox base URL from the example. Do not paste secrets into chat or commit them.
3. Run `npm run verify:live`. Resolve its missing/failed checks; even a pass is not payment evidence. Restart `npm run dev`, open `http://localhost:3000`, and start a **new** mission. Confirm the rules, run the actual model and repair under the same policy. If its first basket is valid, acknowledge that and use the labeled shipping scenario for the illustrative rejection; do not fabricate model failure.
4. Review the actual accepted basket, approve its exact hash/total, create the sandbox order, follow **Approve at PayPal sandbox**, sign in with the sandbox personal buyer, return and click **Verify approval & capture**. Completion requires authoritative GET evidence for the exact order/payee/items/charges and one final completed capture. Download that actual redacted receipt privately and replay it. If UNKNOWN, reconcile the same operation; do not create another payment for the recording.
5. Only after this succeeds, record the [2:40 plan](DEMO_SCRIPT.md). A webhook is optional for this local explicit-reconciliation journey; claiming live delivery additionally needs an authorized HTTPS listener, sandbox webhook registration and `PAYPAL_WEBHOOK_ID`.

## Offline rejection and optional export

After installing the pinned dependencies, run this from the repository root without model access, PayPal or PostgreSQL:

```sh
npm run verify:package
```

It builds/packs the existing SDK, installs that local archive offline and runs `examples/consumer/index.mjs`: total `156.03`, `allowed: false`, reason `BUDGET_EXCEEDED`, evaluator `redline/0.1.0`. The fixed evaluation time makes expiry deterministic. This command reproduces the seeded rejection; it is **not** a receipt-derived export.

**“Export regression case” is deferred.** The required real journey has not succeeded, so its conditional half-day budget has not started. Existing receipts already preserve policy, quote, evaluation context/time and evaluator version for local replay. No export button or new fixture format was added at the expense of recording/submission.

## Judge access through December 21

Model availability, schema/token-field compatibility, key expiry, credit/quota and zero-spend continuity are unverified. Sandbox merchant/app/buyer account access is also unverified. These can stop the real workflow even if fixtures pass. The owner must establish and privately record actual expiry/quotas and keep access working through the actual announcement, including delays. The [official rules](https://paypalaihackathon.devpost.com/rules), rechecked November 10, list an announcement on or around December 21 at 2 PM Pacific (December 22, 3:30 AM IST).

Judges need the pinned Node/npm dependencies, local Docker/PostgreSQL, ports 3000/54329, an approved compatible model and sandbox accounts; owner-specific credentials are not in the source. Linux browser tests additionally need Playwright Chromium. A shared hosted demo would need HTTPS, a trusted identity gateway, database availability and private credential delivery; none is provisioned. See [access continuity](ACCESS_CONTINUITY.md). Fixtures remain clearly labeled and cannot substitute for missing real integrations.

Review the draft text, recording plan and local manifest before publishing. No external URLs, uploaded video, deployment, submission or access guarantee has been invented.
