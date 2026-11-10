# Verification record

> **November 11 update:** Real Groq inference and PayPal sandbox OAuth/order creation passed. Buyer-approved capture remains pending. The live run used backend services; the browser-control helper failed. See [current live evidence](LIVE_VERIFICATION.md) for provenance and remaining steps. Older missing-credential statements below describe earlier verification.

Latest submission verification: **2026-11-10 (Asia/Kolkata)**; earlier refinement verification November 6 and original implementation November 5. No secrets were printed or committed. This is a bounded local engineering verification record, not certification. The current journey/provenance and exact manual access steps are in [SUBMISSION_REVIEW.md](SUBMISSION_REVIEW.md).

| Check | Actual evidence |
| --- | --- |
| Runtime and dependencies | Windows, Node 22.16.0, npm 11.12.1; exact versions and lockfile committed as source artifacts |
| PostgreSQL | Real PostgreSQL 17 container via Docker Compose; app `redline` and isolated `redline_test` databases; all committed migrations and 24-product seed executed |
| Type check | `npm run typecheck` passed |
| Lint | `npm run lint` passed |
| Unit suite | `npm test`: **38 passed** across portable policy/money, provider/model boundary, structured comparison and missing-access checks |
| Integration suite | `npm run test:integration`: **57 passed** against real PostgreSQL; payment/model HTTP fixtures/test doubles explicitly injected; includes zero provider requests for denied/stale attempts, independent capture verification, fresh approval after price change, policy revision/races, repair/evidence and complete host integration |
| Browser suite | **12 cases passed** using installed Microsoft Edge, desktop and iPhone-sized Chromium emulation: ten cases in the full run plus two corrected journey reruns. Initial new title lookup and smooth-scroll measurement failures were corrected; final affected journeys pass. Fixture proposals and simulated payments; includes stale-tab policy revision, exact approval-change evidence and comparison budget/totals/items together in the viewport |
| Accessibility | Axe WCAG 2 A/AA and 2.1 AA checks on welcome, policy editor, allowed purchase workspace, lab and developer views at desktop/mobile sizes; automated checks passed. This is not a complete manual accessibility audit |
| Visual QA | Desktop/mobile screenshots inspected; responsive overflow checked in browser tests; original code-native vector product illustrations |
| Package archive | `npm run verify:package`: built SDK, locally packed archive, offline isolated consumer install, public ESM/CJS exports, TypeScript declarations and deterministic blocked replay passed; zero SDK runtime dependencies |
| Production build | Latest polished source: `npm run build` passed for SDK, PayPal adapter and Next.js application using explicit fixture/simulated build modes; live requests are not a build step. Earlier clean-archive build at `1ff2f40` also passed |
| Clean setup rehearsal | Fresh committed-source archive with no `.env`, `node_modules`, SDK dist or Next build output; `npm ci --offline` installed 229 packages from the existing local cache; copied `.env.example` with only local port/database adjustments; all four migrations and 24-product seed succeeded against empty `redline_clean_20261110_test`; fresh typecheck/build passed. README's exact `npm run dev` also returned health/page HTTP 200 with REDLINE HTML on localhost:3000. Same Windows/Node/Docker host, not a fresh OS or an uncached registry install |
| Optimized-server smoke | Fresh optimized server on localhost:3002: readiness/page HTTP 200, then actual HTTP session → fixture rejection → same-policy repair → exact approval → simulated buyer approval/capture → redacted receipt → matched replay with zero payment actions. Private result `.local/clean-setup-result.json`; no live AI/PayPal request |
| Dependency advisories | Historical November 5/6 npm audit reported **0 vulnerabilities** after patched minimatch/esbuild overrides; not rerun November 10; advisory data is a point-in-time check |
| Docker application image | Dockerfile provided; image build/deployed container not verified |
| Remote deployment | Not performed or authorized |

## Financial and authority tests

Tests cover exact budget boundaries including shipping/tax, malformed/negative/unsafe money and quantities, recurring/unknown/unauthorized/out-of-stock products, merchant/currency/category/owner restrictions, policy/quote expiry, immutable approval payload and all relevant financial/catalogue mutation fields. Real PostgreSQL tests cover repeated approval, concurrent execute/capture, competing distinct approval reservations, multiple fitting reservations, cumulative spent capacity, cross-user resources, duplicate/delayed events, event rollback on binding mismatch, reservation release before capture and retention after ambiguity.

Recovery tests include remote simulated capture success with response loss, reconnection to durable state, a committed capture crash window and reconciliation from an actual separate Node process. These verify local persistence and settlement with a durable provider test double. They do not prove PayPal's behavior under real network outages or constitute a full crash/backup-restore chaos campaign. Checked fixture screenshots are saved in `docs/images/`; they show no real model or PayPal transaction.

Model tests reject fabricated price/URL/merchant/action fields, malformed envelopes/actions and unapproved access. An injected model double exercises actual violation-feedback replanning and bounded invalid-output repair. The real configured inference adapter has not contacted a live model in this session. Signature-verification FAILURE is tested through the actual webhook routing function with a mocked PayPal verification response; it does not prove live webhook delivery.

## Real AI status: NOT VERIFIED

No approved endpoint, model or API key was supplied. `npm run verify:live` reported missing `AI_MODE=real`, `AI_ACCESS_APPROVED=true`, `AI_BASE_URL` and `AI_MODEL`. No automatic downloads, paid provider selection or real inference requests occurred. The adapter requires an explicitly compatible configured Chat Completions endpoint; no live provider compatibility is claimed. Set approved configuration, run the structured action smoke check, then a full real-agent mission before claiming submission readiness.

## Real PayPal sandbox status: NOT VERIFIED

No sandbox client ID, client secret or merchant ID was supplied. OAuth authentication, actual order creation, buyer approval, server capture and real webhook delivery were not verified. The sandbox-only adapters, complete orchestration and provider validation are implemented and tested against controlled doubles. No simulated transaction is described as a sandbox transaction. No real money moved. Configure authorized sandbox credentials and run the authenticated create → buyer approval → capture journey; save its redacted provider receipt. Public webhook delivery additionally requires an authorized reachable HTTPS environment and sandbox webhook registration.

## Integration research

The current hackathon overview/rules/resources, PayPal Orders v2 endpoint docs and JSON specification, general idempotency reference, webhook verification docs, PayPal AI Toolkit, current Kysely migrations and official OpenAI Chat Completions schema were inspected. Links and consequences are recorded in `INTEGRATIONS.md`, `STATE_MACHINE.md` and `SUBMISSION_CHECKLIST.md`. Both payment mutations document request-ID support; the current endpoint references did not establish a retention duration. Automatic mutation retries are therefore disabled rather than assuming an undocumented safe window.

Before submission: independently verify eligibility/current rules, complete actual AI/sandbox evidence, record a <3-minute working demo, authorize/publicize the repository/video if desired, and manually submit. Public deployment is optional under the checked rules. None of these publication/submission steps was performed.

## November 10 submission checks

The first actual service blocker is missing approved model access, before inference. PayPal credentials are also absent. Reproduced `verify:live` exiting 0 with both integrations missing; corrected it to exit 1 and preserve a redacted report. Both empty/default configuration and incomplete `PAYMENT_MODE=sandbox` configuration now return nonzero with missing names and no service requests. No real model or PayPal request occurred.

`tests/integration/adapter-journey.test.ts` exercises the actual CompatibleModel and PayPalSandbox code with injected HTTP fixtures and real PostgreSQL: budget rejection, violation feedback, same-policy substitute, exact hash approval, OAuth parsing, minimal create followed by retrieval, separate buyer gate, capture followed by authoritative GET, exact final capture and payment-free replay. It is **not live inference or PayPal sandbox verification**; mode names in that isolated test select code paths only. Scripted provider data uses visibly fictitious FIXTURE order/capture IDs.

Browser tests now send approval requests directly for a denied proposal (409 BUDGET_EXCEEDED), attempt checkout with its quote ID (404), and confirm zero operations/reserved funds. Price-change tests verify stale approval refusal, reject a new quote paired with the old reviewed hash, and require a new approval before simulated completion at $124.71 under the original policy. Both desktop/mobile browser journeys retain accurate fixture/simulator labels.

The packed SDK consumer again reproduced the $156.03 BUDGET_EXCEEDED rejection at its fixed evaluation time without model, PayPal or PostgreSQL. The optional receipt-derived regression export is deferred because the required real journey has not yet passed. The 2:40 recording plan keeps rejection within 18 seconds and uses one mission through repair, exact approval, actual sandbox capture (pending access) and receipt replay.

## Recording handoff verification

The latest comparison screenshot shows the $150 policy, $156.03 rejected fixture and $123.63 fixture substitute together with both item columns, added/removed SKU labels and simulated-payment provenance. Desktop/mobile frame and automated accessibility checks pass; refreshed public PNGs are explicitly fixture screenshots. The blocked-checkout wording is backed by a sandbox-mode test with zero calls to an injected PayPal HTTP transport, including stale execution before create. This establishes the local dispatch gate, not a live PayPal transaction.

The read-only `verify:capture` command reuses existing `assertOrder`, SDK hashes/decimal money and PostgreSQL records. HTTP-fixture integration verifies incomplete capture is refused and the completed exact USD amount/final capture ID is accepted without increasing create/capture counts. Missing CLI quote ID exits 1 with a redacted usage error. This command has **not** contacted PayPal in this session: the real access/buyer-approved capture gate remains open. `verify:live` reports valid app defaults but `realServiceSettingsComplete: false`, with model/OAuth/capture unverified. Credentials can be entered privately through [RECORDING_HANDOFF.md](RECORDING_HANDOFF.md).

Root and packed SDK MIT licenses, lockfile and tracked public candidate contents were checked. Private `.env` is ignored; no `.local`, cache, dependencies or build output is tracked. An unauthenticated public GitHub API/raw-content check found [the repository](https://github.com/Rohan-Saxena644/Redline) public at main commit `c6b78b839905eec74bb11c1223107fc0750391bb` on November 10, 16:15 UTC. Its full tree had 79 files, expected README/license/SDK license/lockfile/Compose/template files and no forbidden private/build artifact paths. Public README/license returned HTTP 200 and the MIT license matches locally. The public README differs from current local source and the new capture verifier is absent: these local changes still need the owner's push. This was a contents/path check, not a full remote-history security audit. Private result: `.local/public-repository-review.json`. No remote write occurred.

The previous clean-setup rehearsal remains applicable to the unchanged dependency graph; latest source typecheck/lint/build/browser checks cover this polish. No fresh operating-system or uncached-registry claim is made. Same-price swap is not implemented and regression export remains deferred.

## Refinement verification

The scripted $156.03 shipping rejection is linked to a $123.63 replacement under the same confirmed policy hash; side-by-side UI and receipt comparison show item changes, all charges and required categories. Low-budget fixture repair remains blocked without changing policy. No claim is made that this fixture is a live model failure.

Explicit policy reconfirmation increments the same mission version, preserves spent/purchase counters, revokes prior approvals, rejects a stale editor, and prevents an old in-flight proposal from being rebound to changed instructions. A concurrent approval/revision test verifies serialization. The capture race test holds a provider response open and verifies cancellation/policy edits are refused after capture claim.

The price-change scenario uses isolated owner-scoped inventory and reports the actual approved total $123.63 versus current $124.71 with structured unit-price/charge differences; no provider call is made for that scenario. Evidence records persist across page reloads and reject another owner. Scenario input/provider mode, expected and observed result, timestamp and application version are exported, including **provider not called** when applicable.

`examples/host-integration.ts` was executed in a PostgreSQL integration test through authoritative quote resolution, separate exact approval, the existing protected service, simulated buyer approval/capture and reconciliation. The original packed policy consumer was reverified offline; no second execution framework was created.

`npm run verify:live` was run again: model endpoint/model/access approval and PayPal sandbox client ID/secret/merchant ID remain missing. Real inference, sandbox create/buyer approval/capture and webhook delivery remain **not verified**. Stable zero-spend real-model access/expiry/quota is **not established**; see `ACCESS_CONTINUITY.md`. The 2:40 recording script, candidate manifest procedure and preservation checklist are prepared, with no uploaded footage, deployment or external freeze.
