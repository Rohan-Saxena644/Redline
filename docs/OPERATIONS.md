# Deployment and operations

No environment has been provisioned or deployed. These instructions describe an authorized future sandbox deployment. The reference retains ordinary application records; it is not payment infrastructure certification.

## One supported deployment shape

Use a single Linux container from `Dockerfile`, PostgreSQL 17 with encrypted persistent storage/backups, and an HTTPS reverse proxy that authenticates users. The app origin must be reachable **only** from this proxy. A cloud VM running Docker is sufficient; Kubernetes/Redis/paid managed services are unnecessary. Do not provision resources or publish without separate authorization.

Build locally with `docker build -t redline:0.1.0 .` (the Docker image build has not been executed in this implementation environment). The image runs as the unprivileged `node` user. It retains Node tooling for ordered migrations and bounded reconciliation batches. Containerized PostgreSQL credentials in Compose are local-only placeholders; use distinct strong secrets for a deployed database.

Before remote startup configure `APP_ORIGIN=https://your-authorized-host`, `DEV_LOGIN=false`, `LOCAL_LAB=false`, `AUTH_PROXY_SECRET` (random server secret), `DATABASE_URL` and the independent AI/payment modes. Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`; live hosts are rejected. Configure a secret store or an untracked runtime env file with restricted access. Never bake secrets into an image or pass them in a URL.

The trusted proxy must authenticate users with an established identity system, strip incoming `X-Redline-User`/`X-Redline-Auth`, set `X-Redline-User` to its verified stable ASCII subject, inject `X-Redline-Auth` from its shared secret, preserve the external Host, and reject external direct-origin access. POST `/api/session` from the allowed origin then creates an 8-hour HttpOnly Secure session for that verified identity. Do not trust client-supplied identity headers. Gateway integration itself remains a deployment verification task. Configure upstream request/concurrency limits, a 128KB body limit and HTTPS-only access. The app also enforces JSON body, origin, host, session and minute rate limits.

Apply migrations once before shifting traffic: `docker run --rm --env-file <private-runtime-file> --network <private-db-network> redline:0.1.0 npm run db:migrate`. Seed the controlled sample catalogue with the equivalent `npm run db:seed`. Existing product data is preserved by the seed. Start the application container on an internal-only interface and expose it through the proxy. Schedule `npm run reconcile` once per minute on the same private network and environment. Its job source is the database; no in-memory queue is required. Readiness `/api/health` verifies the required schema columns without exposing credentials or identities. Configure public webhook delivery only after separate publication authorization.

Validate HTTPS cookies, spoofed-header rejection, ownership, CSRF, a complete real sandbox checkout, verified webhook redelivery and receipt replay before sharing with judges. Do not represent a Docker build or fixture flow as deployed/live integration evidence.

## Backup and restore

Back up PostgreSQL with `pg_dump -Fc` using a protected connection mechanism such as a private service file or `PGPASSFILE`; do not paste credentials into command lines/logs. Keep dumps encrypted with restricted access and retention appropriate to your pilot. Include missions, snapshots, approvals, operations, ledger counters, webhook event IDs, events and Kysely migration tables. Sessions may be invalidated after restore. Never back up only successful transactions: pending/unknown reservations are essential.

Restore into an isolated database with `pg_restore`, start with model/payment execution disabled at the gateway, run schema compatibility/readiness checks, then reconcile every reserved operation against the original provider IDs. A database restore can roll local state back before a remote capture: do not create replacement payments or clear reservations. Test restore regularly before a public pilot. Current automated recovery evidence reconnects to the same durable database and simulates a crash window; it is not a full backup/restore drill.

## Migrations and rollouts

Use `npm run db:migrate`; Kysely applies committed ordered migrations under a database lock. Take a backup first, stop admission for financial-path changes, and avoid editing an already applied migration. There are no destructive automatic down migrations. Add forward-compatible columns, deploy compatible code, backfill, then constrain in a later release. Roll back application code only when its schema contract still matches. Preserve historical evaluator implementations if the evaluator version changes.

## Reconciliation runbook

1. Locate the operation using a server correlation ID or its receipt's operation reference. Do not expose session/payment secrets while collecting evidence.
2. Inspect phase, state, reservation, payload hash, original request IDs, provider references and last error. Give active 60-second leases time to finish.
3. Use **Check payment status** or `npm run reconcile`. Both retrieve a known order and validate payee/amount/itemization before settlement.
4. For an unknown create without an order ID, inspect authorized PayPal sandbox records and webhook delivery for the original binding. The verified webhook path can recover a matching order. There is no operator HTTP endpoint for force-complete/release/replace.
5. If the outcome is still ambiguous, retain reservation, stop new spending for that mission and escalate. Do not issue a fresh request ID, manufacture a capture ID or mark failure just to free capacity. Automatic mutation retries remain disabled until retention semantics are confirmed.
6. If evidence proves completion, use the existing evidence path. If PayPal proves VOIDED with no captures, it releases once. Document every operator action separately. External refunds/disputes are not modeled as mission budget resets.

## Rotation and incidents

For a suspected key/session incident, block new payment/model requests at the gateway, preserve the database and pending identities, and rotate the affected sandbox app/model credentials in the provider's console. Update server secrets and restart instances to drop cached OAuth tokens. Rotate webhook registration/ID and verify delivery before retiring old registration. For gateway compromise rotate `AUTH_PROXY_SECRET`, ensure the proxy removes spoofed headers, and invalidate sessions with an audited maintenance query. Session invalidation is a deliberate incident action, not part of ordinary seed/migration.

Reconcile remote outcomes before reopening execution. Correlation logs contain paths, timings, codes and server-generated IDs; raw request bodies, authorization headers, provider responses and personal payer data are never application log fields. Validate upstream/proxy logs separately. Monitor due reservations, oldest UNKNOWN operation, reconcile-attempt exhaustion, verification failures, payee/amount mismatch, database constraints/readiness and request rates. This release does not send notifications to operators automatically.

## Retention and data handling

Persistent volumes retain missions, confirmed policy/quote snapshots, approvals, ordinary orchestration events, provider order/capture references, hashes and pseudonymous owner IDs until an operator deletes them. There is no automatic financial-history retention/deletion policy in this release. Sessions expire after 8 hours and expired rows are cleaned on login; rate buckets are cleaned while limiting requests. Local lab inventory/history also persists. Define and implement a deployment-specific retention schedule, deletion/export procedure and access policy before collecting real personal data. The app omits payment addresses/identities but user-entered missions may still contain personal information; avoid putting such data into the reference app. Models receive mission/catalogue/policy context in real mode; consult the configured provider's terms and retention policy before use. `store=false` is a request field, not a universal privacy guarantee.
