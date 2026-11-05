# AI and PayPal setup

No credentials were supplied during implementation. Fixture/test-double success is not live verification. Credentials stay in the server's `.env` or deployment secret store, never browser variables, URLs or receipts. The root `.env` is loaded by `apps/web/next.config.ts`; CLI scripts load it with dotenv. Restart after mode/config changes. Existing operations retain their original payment mode; switching mode requires a fresh mission rather than executing old simulated approvals as sandbox payments.

## Configured inference

Use an already approved OpenAI-compatible Chat Completions endpoint or a deliberately configured user-run local server. Do not create a paid account, provision resources, download a model or assume approval to spend. Set:

```dotenv
AI_MODE=real
AI_ACCESS_APPROVED=true
AI_BASE_URL=https://your-approved-provider.example/v1
AI_MODEL=your-explicit-model-name
AI_API_KEY=server-only-secret
AI_OUTPUT_MODE=json_schema
```

For an existing local endpoint, set its complete base URL, `AI_ALLOW_LOCAL=true`, and the explicit model it already serves. Loopback HTTP is accepted only with this flag; HTTPS is required for nonlocal endpoints. Base URL credentials, query parameters and fragments are rejected; redirects are disabled. The model cannot choose destinations. Remote network egress should additionally be restricted by the deployment administrator.

The adapter uses `/chat/completions`, `response_format.json_schema` (strict action object), `max_completion_tokens=800`, and `store=false`, as specified by the [official Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Providers/models must support these fields. Configuring `AI_OUTPUT_MODE=json_object` explicitly selects JSON mode; it still uses the same server Zod validation. There is no silent format negotiation or fixture fallback. A provider that only supports different token fields needs an explicit adapter change and verification. Compatibility is not implied by a marketing label.

Each run allows at most 8 model requests/actions and 3 basket proposals, a 120-second scheduling deadline with 25-second request timeouts, 800 completion tokens per request, 48KB serialized prompt, 64KB response and at most one invalid-output repair. Search returns at most 12 products (8 in the agent loop). Validated violation feedback is supplied for replanning. Refusal, exhausted budget, truncation, invalid tools and unavailable stock produce an actionable failure; no basket is fabricated. Real event messages show actions and checks, not private model reasoning. Token usage is recorded when returned with accepted actions; no monetary costs are estimated. The local test suite verifies response parsing against test doubles, not a live inference server.

Run `npm run verify:live` after configuring approved access. Then test a full real-agent mission and the optional real-model injection lab. The real model may ignore the injected instruction and propose a valid basket; record that honestly. The separately labeled scripted boundary test guarantees a reproducible invalid basket without pretending the model failed.

## PayPal sandbox

Create/use authorized **sandbox** REST app credentials and separate sandbox merchant and personal buyer accounts in the PayPal developer dashboard. Copy the sandbox merchant's merchant ID (not payer email). Set:

```dotenv
PAYMENT_MODE=sandbox
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=your-sandbox-app-id
PAYPAL_CLIENT_SECRET=your-sandbox-app-secret
PAYPAL_MERCHANT_ID=your-sandbox-merchant-id
```

`npm run verify:live` can verify authentication only; it does not create/capture. In the browser, confirm a new policy, generate/review a basket, approve it in REDLINE, create the sandbox order, follow **Approve at PayPal sandbox**, sign in as the sandbox personal buyer, return, then choose **Verify approval & capture**. The browser carries only local operation IDs and PayPal's sandbox checkout reference. It never receives payment API secrets. Do not enter real card/payment details.

The server uses [Orders v2](https://developer.paypal.com/api/orders/v2): CAPTURE intent, explicit payee merchant ID, exact itemization/breakdown, `payment_source.paypal.experience_context`, redirect buyer approval and server capture. No deprecated browser-authoritative totals or ordinary redirect status can complete a payment. GET evidence must match local order/operation/custom IDs, payee, USD total, line quantities/prices and charges. Completion additionally requires a single final COMPLETED capture for the exact total. The sample shop has no real fulfillment and uses `NO_SHIPPING` to avoid collecting an address; its $6.99 charge is a seeded quote charge only. Production fulfillment/tax/address handling is out of scope.

## Webhooks

PayPal needs a publicly reachable HTTPS listener at `/api/paypal/webhook`. Local-only use can rely on explicit reconciliation. Do not publish/tunnel this app without separate authorization. When an authorized environment exists, register relevant events (CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.PENDING and PAYMENT.CAPTURE.DENIED) and set `PAYPAL_WEBHOOK_ID` to that sandbox application's registration ID.

The adapter submits the received signature metadata and original event to [Verify webhook signature](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post). Only SUCCESS proceeds. It then retrieves the current order and validates known local ownership/binding and financial facts. It does not trust `resource.status` as payment truth. Durable event IDs deduplicate in the same transaction as the state update. A failed update rolls back processing. Delayed events cannot downgrade completion. The simulator has no public webhook verification bypass.

Official references reviewed: [hackathon resources](https://paypalaihackathon.devpost.com/resources), [PayPal AI Toolkit](https://github.com/paypal/AI-Toolkit), [Orders specification](https://developer.paypal.com/api/orders/v2/schema.json), [idempotency](https://developer.paypal.com/api/rest/reference/idempotency/), [webhooks](https://developer.paypal.com/api/webhooks/v1). The Toolkit was reviewed as a reference, not installed or exposed to the shopping agent: its broader payment tool surface is unnecessary for this bounded agent. Request-ID retention caveat and recovery rules are in [STATE_MACHINE.md](STATE_MACHINE.md).
