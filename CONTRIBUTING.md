# Contributing to REDLINE

Use Node 22.16–24.x and npm 10+. Install with `npm ci`, start PostgreSQL using Compose, migrate and seed. Defaults deliberately separate fixture proposals from simulated payments. Never commit `.env`, session tokens, raw provider responses or personal payment data.

Before proposing a change, run typecheck, lint, unit tests, real PostgreSQL integration tests, fixture browser tests, package verification and production build using the README commands. Tests use a dedicated `_test` database and must not run on real mission data. Core money/transaction changes need boundary and concurrency evidence, including unknown outcomes. Fixes must preserve cumulative spent/reserved amounts, exact approvals, immutable operation payloads and terminal completion monotonicity.

The policy package has no application/provider/database dependencies. Keep its API portable and deterministic: explicit time, bounded integer cents, stable reason codes, canonical snapshot hashes. A behavior-changing evaluator release requires a version change and a strategy for historical replay; do not silently replay old receipts with new semantics. Public exports and archive consumer checks are part of the contract.

Catalogue text and model output remain untrusted. Do not add execution/approval/payment tools to the model or a real-webhook bypass for convenient tests. Fault injection belongs only in explicit local simulator paths. Make all test provenance visible. Do not claim live integrations were verified without actual evidence.

Security reports should be sent privately to the repository maintainer using their published contact once a repository exists. No reporting address has been invented here. For local incidents, stop new execution, preserve reservations and follow `docs/OPERATIONS.md`. Do not post credentials or full payment data in issues.

Contributions use the MIT license. Please explain the user-visible problem, actual final behavior, tests and remaining limitations. No automatic publishing, deployment or package release is part of this repository.
