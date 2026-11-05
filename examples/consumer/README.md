# Offline external consumer

This directory is deliberately outside the npm workspaces. It requires only the locally packed policy SDK and Node 22.16+; no database, browser, model, account or network calls at runtime.

From the repository root run `npm run verify:package`. This builds the SDK, packs an archive, copies this example into an isolated directory, installs that archive offline without scripts, checks ESM and CommonJS exports plus declarations, and runs the example. No package is published.

Expected result: a $156.03 basket is denied against a $150.00 policy; replay produces the same decision.
