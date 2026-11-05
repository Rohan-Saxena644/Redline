# Offline external consumer

This directory is deliberately outside the npm workspaces. It requires only the locally packed policy SDK and Node 22.16+; no database, browser, model, account or network calls at runtime.

From the repository root run `npm run verify:package`. This builds the SDK, packs an archive, copies this example into an isolated directory, installs that archive offline without scripts, checks ESM and CommonJS exports plus declarations, and runs the example. No package is published.

Expected result: a $156.03 basket is denied against a $150.00 policy; replay produces the same decision.

For the complete reference-host integration, see `../host-integration.ts`: separate stages resolve authoritative data/evaluate, persist authenticated exact approval, create through the protected service, capture after provider buyer approval and reconcile. That example requires the reference server/database and is integration-tested. It does not change this package consumer's offline/no-database contract or create another execution framework.
