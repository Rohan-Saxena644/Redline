# Private setup and recording handoff

> **Final recorded run, November 11:** The authenticated REDLINE browser journey passed with real Groq repair, exact human approval, manual sandbox buyer approval and server capture. Independent provider GET confirmed **$145.23 USD, COMPLETED, final capture**. The caption-only 2:40/1080p video passed full decode; sampled frames were reviewed, including the corrected 2:01 caption. See [current live evidence](LIVE_VERIFICATION.md). Older access and rehearsal statements below are historical.

The real model/backend capture gate **passed**. The final browser take completed at $145.23 USD; use a fresh mission only if recording another take. The four starting commits are `1ff2f40`, `d57319b`, `42d264d`, `913b768`. A same-price swap was never implemented; it remains optional after live capture. Regression export stays deferred.

## What verify:live actually proves

| Stage | Command/action | Evidence needed | Current result |
| --- | --- | --- | --- |
| Configuration | `npm run verify:live` parses app config and checks required fields/modes | Valid syntax plus no missing setting names | Valid real/sandbox configuration; preflight passed |
| Real model response | Same command sends one structured `searchCatalog` request through CompatibleModel | Validated provider response/action, optional actual token usage | Real inference and recorded browser journey verified |
| PayPal API access | Same command exchanges sandbox client ID/secret for an OAuth token | Successful authenticated token response | Actual sandbox OAuth/create/retrieve passed; final capture independently verified |
| Real mission | Existing backend agent/catalogue/evaluation services | Actual Groq proposal, quote charges and deterministic decision | Passed through the authenticated browser session in the final take |
| Buyer-approved sandbox capture | Exact human basket approval → sandbox order → manual buyer approval → server capture → independent GET | Exact USD amount, payee/items/charges and one final COMPLETED capture from PayPal | Passed: initial backend $123.63 USD and recorded browser $145.23 USD, COMPLETED/final; private receipts saved |

`preflightPassed: true` means the model structured-action and PayPal OAuth smoke checks passed. `journey: not_verified` in that report is deliberate: this command never creates an order, opens buyer checkout or captures. Missing/invalid/failed checks exit 1; nothing silently falls back to fixtures. It writes a redacted `.local/verification-latest.json`.

## Enter credentials privately

Open the ignored root `.env` in your local editor. A copy of `.env.example` was created only if no private file existed. Do not replace a private file with the example. No credential belongs in the recording, chat, Git or a browser-public variable.

| Field | Value / where to obtain it |
| --- | --- |
| `AI_MODE` | `real` |
| `AI_ACCESS_APPROVED` | `true` only for your already approved model access |
| `AI_BASE_URL` | The approved provider's documented Chat Completions API base, normally ending `/v1`; **not** the final `/chat/completions` path |
| `AI_MODEL` | Exact compatible model/deployment identifier from that approved provider's console/documentation |
| `AI_API_KEY` | Private key from that provider's existing approved API-key console; required for a remote endpoint |
| `AI_OUTPUT_MODE` | Verified Groq GPT-OSS profile: `tool_calling`; JSON modes remain explicit alternatives for providers that support them |
| `AI_ALLOW_LOCAL` | Keep `false` for remote access; `true` only for an already running, explicitly approved loopback model server |
| `PAYMENT_MODE` | `sandbox` |
| `PAYPAL_BASE_URL` | Keep `https://api-m.sandbox.paypal.com` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → Apps & Credentials → **Sandbox** → your REST app → Client ID / Secret |
| `PAYPAL_MERCHANT_ID` | Identify the **same app's associated sandbox business seller** under Testing Tools → Sandbox Accounts → View/Edit. Sign into that business account at sandbox.paypal.com → Account Settings → Business information → PayPal Merchant ID. This is not the app/client ID, buyer ID or email. [PayPal's sandbox merchant-ID instructions](https://developer.paypal.com/docs/multiparty/seller-onboarding/build-onboarding/) |
| `PAYPAL_WEBHOOK_ID` | Leave empty for this local explicit-retrieval recording; live webhook delivery needs separate HTTPS registration |
| `APP_ORIGIN` | `http://localhost:3000` |
| `DATABASE_URL` | Keep the example's local PostgreSQL URL unless you deliberately use your own local database |
| `DEV_LOGIN`, `LOCAL_LAB` | `true` for this loopback recording only |

For the verified IN seller configuration, use a separate **US Personal sandbox buyer**. In Sandbox Accounts, create Personal → United States if needed. Privately obtain that buyer account's email/password via View/Edit. You will type that into PayPal's sandbox checkout yourself, off camera. Merchant/app credentials remain server-only. See PayPal's [API setup](https://developer.paypal.com/api/rest) and [sandbox account guide](https://developer.paypal.com/sandbox-testing/accounts). Model-provider-specific console links depend on which access you approve; no provider or paid plan is selected for you.

## Commands, in order (PowerShell)

From the repository root, after saving `.env`:

```powershell
# Only if dependencies are not already installed:
npm.cmd ci
docker compose up -d db
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run verify:live
# Continue only when its model and OAuth checks pass:
npm.cmd run dev
```

Open `http://localhost:3000`. Restart the server after changing modes or credentials. Use a fresh owner/mission; never send an existing simulated operation to sandbox. On future recording takes, recheck quote/policy expiry and capacity; do not reuse an already captured mission.

## Manual approval and capture

1. Enter local workspace; confirm streaming policy: microphone AND headphones, $150 including all charges, one-time, quantity 1 and one purchase.
2. Click Generate proposal with Real model / Payments: Sandbox visible. Inspect the actual proposed SKUs, server subtotal/shipping/tax/total and policy decision. A first valid basket is an honest success, not a rejection to hide.
3. For the deterministic rejection scene, use Adversarial lab → The hidden last mile → Run test → Inspect mission, then Find an alternative with the real model. Keep the scripted input label and real replacement label visible. This is the existing over-budget scenario, not a same-price swap. Preserve its original policy.
4. Review the accepted basket and exact total; click Approve exact basket, then Create sandbox order. REDLINE approval and PayPal buyer approval are separate.
5. Click Approve at PayPal sandbox. Privately sign in as the separate sandbox personal buyer, approve the displayed amount, and return. You perform this manual buyer action. The redirect is not capture evidence.
6. Click Verify approval & capture. Inspect the decision receipt and authoritative provider evidence. Required: matching order/custom operation/payee/items/charges, currency USD, total equal to the reviewed quote, and one final COMPLETED capture. If UNKNOWN, reconcile that same operation rather than making a second payment.
7. Save the redacted receipt privately. Read its `snapshot.quote.id` and run `npm.cmd run verify:capture -- <quote UUID>` from the repository root. This separate read-only check retrieves that same order from PayPal again, applies the existing SDK binding/capture checks, compares the capture ID with the settled operation and prints exact expected/provider amount, currency and statuses. It requires a real-model/sandbox quote and an already completed operation; it never creates or captures. A fixture or unfinished operation fails. Its redacted report is saved at `.local/capture-verification-<quote UUID>.json`.
8. Record the actual quote/operation IDs, amount/currency, capture ID/status, model identity and source commit in private run notes. Replay the decision and confirm zero payment actions. A successful screen or preflight alone does not satisfy this gate.

## Access continuity and publication

Before recording/submitting, confirm actual model quota/key expiry, required structured-output/token-field support, sandbox app/seller/buyer access, and availability through December 21 and the actual announcement. These are currently unknown. No provider, plan upgrade, quota extension or hosting resource is selected; use only the owner's approved access. Fixtures remain runnable but do not establish real access.

The MIT license, lockfile, source, migrations, README and honestly labeled fixture screenshots belong in the public repository. Private `.env`, `.local` evidence, caches, builds and credentials stay excluded. The owner handles pushing, publishing and submission. See [submission review](SUBMISSION_REVIEW.md) and [recording plan](DEMO_SCRIPT.md).

The configured [public repository](https://github.com/Rohan-Saxena644/Redline) was checked without authentication: public main was `c6b78b8`, older than the four starting local commits and this follow-up. README/license were readable and no forbidden private/build paths appeared in its tree. After reviewing the final local commits, **you** run `git push origin main`, then recheck README, setup, license and source commit from a logged-out browser. No push or publication was performed here. Confirm the actual live-run evidence before publishing claims that capture worked.
