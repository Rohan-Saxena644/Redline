# Verification record

Implementation verification date: **2026-11-05 (Asia/Kolkata)**. No secrets were printed or committed. This is a bounded local engineering verification record, not certification.

| Check | Actual evidence |
| --- | --- |
| Runtime and dependencies | Windows, Node 22.16.0, npm 11.12.1; exact versions and lockfile committed as source artifacts |
| PostgreSQL | Real PostgreSQL 17 container via Docker Compose; app `redline` and isolated `redline_test` databases; all committed migrations and 24-product seed executed |
| Type check | `npm run typecheck` passed |
| Lint | `npm run lint` passed |
| Unit suite | `npm test`: **33 passed** across portable policy/money, provider validation and model boundary tests |
| Integration suite | `npm run test:integration`: **43 passed** against real PostgreSQL; payment/model test doubles explicitly injected |
| Browser suite | `npm run test:browser`: **8 passed** using installed Microsoft Edge, desktop and iPhone-sized Chromium emulation; fixture proposals and simulated payments |
| Accessibility | Axe WCAG 2 A/AA and 2.1 AA checks on welcome, policy editor, allowed purchase workspace, lab and developer views at desktop/mobile sizes; automated checks passed. This is not a complete manual accessibility audit |
| Visual QA | Desktop/mobile screenshots inspected; responsive overflow checked in browser tests; original code-native vector product illustrations |
| Package archive | `npm run verify:package`: built SDK, locally packed archive, offline isolated consumer install, public ESM/CJS exports, TypeScript declarations and deterministic blocked replay passed; zero SDK runtime dependencies |
| Production build | `npm run build` passed for SDK, PayPal adapter and Next.js application |
| Optimized-server smoke | `npm run start -w @redline/web`: loopback readiness and page both returned HTTP 200; REDLINE HTML rendered; temporary server stopped after verification |
| Dependency advisories | npm audit reported **0 vulnerabilities** after patched minimatch/esbuild overrides; advisory data is a point-in-time check |
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
