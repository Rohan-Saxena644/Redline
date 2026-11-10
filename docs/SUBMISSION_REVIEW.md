# Submission review — November 10, 2026

**Live journey remains blocked on access.** No approved model endpoint/model/key or PayPal sandbox app/merchant credentials are configured. No live inference, PayPal OAuth, order creation, buyer approval, capture or webhook delivery was exercised. Publication, recording, upload and submission remain with the owner.

## First blocker and local fix

The real workflow stops before its first model request because approved access is absent. A reproducible readiness defect also hid that blocker from automation: `npm run verify:live` printed missing settings but exited 0. It now exits 1 for missing, invalid or failed configuration, lists configuration names without values, and writes `.local/verification-latest.json` even when sandbox configuration is incomplete. Remote models require a server-only key; keyless loopback models require explicit local access approval. A successful preflight verifies only one structured model action and PayPal OAuth, never checkout.

## One mission and verified behavior

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

Current checks: **38 unit, 56 PostgreSQL integration and 12 browser tests passed**, including automated accessibility checks; typecheck, lint and packed offline consumer passed. See [verification](VERIFICATION.md) for setup/build details and historical checks.

README rehearsal used fresh source archive `1ff2f40`, no copied dependencies/build output/private environment, an offline npm cache and an empty dedicated PostgreSQL database. Install, migrations, seed, typecheck, production build and optimized-server fixture checkout/replay passed. The exact `npm run dev` command also served readiness and REDLINE HTML with HTTP 200 on localhost:3000. It reused the same Windows/Node/Docker installation; a fresh operating system and uncached registry access were not tested. Later code changes contain tests and review documents only. Temporary servers were stopped after verification; local source/database evidence remains private and ignored by Git.

## Exact manual action to unblock the real journey

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
