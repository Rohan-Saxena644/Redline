# Live integration record — November 11, 2026 IST

This record supersedes older missing-credentials statements in the historical review. The real backend journey passed, including a buyer-approved, independently verified capture at **01:56 IST on November 11**. A subsequent full browser take also passed at **$145.23 USD**, and the caption-only video is rendered and reviewed. Credentials are private and ignored by Git.

## Final recorded browser run

The final take used the actual authenticated reference-app browser session and the existing HTTP routes. A scripted $156.03 basket was rejected with BUDGET_EXCEEDED; direct approval returned HTTP 409 before payment. Real Groq GPT-OSS 20B then searched the catalogue and proposed an **Orbit Duo microphone ($69)** and **Halo Reference headphones ($59)**. The server calculated **$128 subtotal + $6.99 shipping + $10.24 sample tax = $145.23 USD**, under the unchanged original $150 policy and both required categories.

The user explicitly approved that exact basket. The app created the real sandbox order; the user separately approved it as the US Personal sandbox buyer. The recorded app then performed server capture, displayed Sandbox payment completed and matched receipt replay. A separate read-only verifier retrieved the same order again and confirmed **145.23 USD, order COMPLETED, capture COMPLETED, finalCapture true**, with matching local/provider capture IDs.

The system drive filled and Docker became unavailable during preparation. The final take used a separate native PostgreSQL 17 database stored on the project drive, with the existing migrations/seed and unchanged app dependencies. The original Docker data was not moved. A prior interrupted take's $65.31 proposal is not presented as the captured basket.

The final MP4 is **160 seconds, 1920×1080 H.264, no audio**, with large burned-in captions and optional SRT. Full-file decode passed; ten initial sampled frames and the revised 2:01/2:05 frames were visually inspected. Scripted rejection and seeded offline SDK proof are labeled; buyer login/waiting are omitted. The corrected caption states the verified outcome rather than a future capture requirement. No credentials, browser session files, databases or raw provider responses are included in the public source ZIP. Publication and submission remain controlled by the owner.

## Initial backend verification (historical)

| Stage | Actual result |
| --- | --- |
| Configuration | Real inference approved; Groq endpoint configured; PayPal sandbox credentials present. |
| Model smoke | `npm run verify:live` passed with an actual Groq response, not a fixture. |
| Model mission | Actual Groq `openai/gpt-oss-20b`, explicit `AI_OUTPUT_MODE=tool_calling`, catalogue calls and persisted proposal. Server quote: Loom USB microphone $59 + Field monitor headphones $49 + $6.99 shipping + $8.64 tax = **$123.63 USD**. Both required categories, fixed original $150 policy, one-time items; allowed. Receipt replay matched without payment. |
| Rejection provenance | Opening $156.03 premium basket was scripted. Earlier attempts in the first mission had invalid output/unknown SKUs and were rejected. After the first quote expired, a new mission used the same constraints and a new fixed expiry; the original mission/policy were not extended. Its real repair directly links to the scripted opening, shares the identical policy hash, and replay matches for both decisions. |
| PayPal API access | Actual sandbox OAuth, create and retrieve passed. The user explicitly approved the fresh exact basket before order creation. |
| Buyer approval / capture | User manually approved checkout using a separate US Personal sandbox buyer after the IN/IN test accounts were blocked. The server verified `APPROVED`, checked the still-valid exact local approval, captured and retrieved the order. A separate `npm run verify:capture` invocation retrieved it again: expected/provider **123.63 USD**, order/capture **COMPLETED**, `finalCapture: true`, matching capture ID. |
| Browser | Browser-control helper failed to initialize on this host. This live run used the existing backend services and explicit chat approval, followed by a manual PayPal link. It does not establish a live REDLINE browser journey or recordable UI session. Prior browser evidence used fixtures/simulator. |
| Webhooks | Live delivery not exercised; local flow uses explicit GET/reconciliation. |

## Compatibility fix

Groq sometimes emitted native tool calls when only a JSON-action response was registered, and its free token-per-minute quota caused HTTP 429 responses. The adapter now supports explicitly selected native tool calling for the existing `searchCatalog`, `inspectProduct`, and `proposeBasket` actions. Function arguments are strictly validated; payment/approval tools and arbitrary fields remain unavailable. Tool-call IDs bind the actual catalogue feedback. JSON modes remain available without silent fallback.

GPT-OSS on Groq uses low reasoning effort, reasoning excluded from returned content, and a 2,048-token completion cap. Unsupported `store` is omitted for Groq. At most one invalid-output repair and two bounded waits using a valid provider retry header are permitted within the existing eight-attempt/120-second scheduling budget. No model download or paid-tier upgrade occurred. Raw provider failures, hidden reasoning, tokens and buyer details are not exported.

## Evidence and remaining recording work

Validation for this change: 42 unit tests, 59 PostgreSQL integration tests, typecheck, lint, production build and the packed offline SDK consumer passed. New native-tool coverage uses HTTP fixtures; the mission and sandbox order described above used real services. Earlier browser checks remain fixture/simulator evidence; they were not rerun for this server-only adapter change. The existing clean README rehearsal reused this host and cached dependencies; no new fresh-OS claim is made.

Private ignored evidence: `.local/live-completed-receipt.json`, `.local/live-rejected-receipt.json`, `.local/live-completed-replay.json`, and `.local/capture-verification-<actual quote UUID>.json`. Both decisions replay matched with zero payment actions. The expired first operation's local reservation was cancelled only after an actual provider GET showed `PAYER_ACTION_REQUIRED` and no captures; no provider cancellation or payment mutation was made for that cleanup. Do not reuse either checkout for a new take.

Keep the Indian sandbox Business seller credentials; use the separate US Personal test buyer for this verified configuration. The seller's receiving preference was also changed to accept/convert currencies. These changes together allowed the run; no controlled comparison established which setting alone resolved the error. Use sandbox test identities only. Avoid claiming that the REDLINE return screen verified payment: this run's browser had a different local session and the actual evidence came from server capture and independent provider GET.

The real backend capture and subsequent recorded browser capture gates are complete. Keep the existing labeled rejection/repair scene; same-price swap is deferred to preserve recording reliability, and regression export remains deferred. Quota and continued Groq/model/PayPal access through December 21 are not guaranteed. Check the owner's Groq limits and sandbox buyer/merchant logins before recording and again before submission. Publishing and submission remain with the owner.
