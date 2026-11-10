# Live integration record — November 11, 2026 IST

This record supersedes older missing-credentials statements in the historical review. Recording is still gated on a buyer-approved, independently verified capture. Credentials are private and ignored by Git.

| Stage | Actual result |
| --- | --- |
| Configuration | Real inference approved; Groq endpoint configured; PayPal sandbox credentials present. |
| Model smoke | `npm run verify:live` passed with an actual Groq response, not a fixture. |
| Model mission | Actual Groq `openai/gpt-oss-20b`, explicit `AI_OUTPUT_MODE=tool_calling`, catalogue calls and persisted proposal. Server quote: Loom USB microphone $59 + Field monitor headphones $49 + $6.99 shipping + $8.64 tax = **$123.63 USD**. Both required categories, fixed original $150 policy, one-time items; allowed. Receipt replay matched without payment. |
| Rejection provenance | Opening $156.03 premium basket was scripted. Earlier real model attempts also produced invalid output and unknown SKUs; server rejected these. The successful accepted proposal was not substituted with a fixture. Its comparison links to the latest real rejected proposal, rather than directly to the initial scripted basket. |
| PayPal API access | Actual sandbox OAuth passed. Exact basket approved explicitly by the user; actual order created and retrieved with matching financial/binding checks; `PAYER_ACTION_REQUIRED`. |
| Buyer approval / capture | Pending manual sandbox personal-buyer approval. No capture verified yet. |
| Browser | Browser-control helper failed to initialize on this host. This live run used the existing backend services and explicit chat approval, followed by a manual PayPal link. It does not establish a live REDLINE browser journey or recordable UI session. Prior browser evidence used fixtures/simulator. |
| Webhooks | Live delivery not exercised; local flow uses explicit GET/reconciliation. |

## Compatibility fix

Groq sometimes emitted native tool calls when only a JSON-action response was registered, and its free token-per-minute quota caused HTTP 429 responses. The adapter now supports explicitly selected native tool calling for the existing `searchCatalog`, `inspectProduct`, and `proposeBasket` actions. Function arguments are strictly validated; payment/approval tools and arbitrary fields remain unavailable. Tool-call IDs bind the actual catalogue feedback. JSON modes remain available without silent fallback.

GPT-OSS on Groq uses low reasoning effort, reasoning excluded from returned content, and a 2,048-token completion cap. Unsupported `store` is omitted for Groq. At most one invalid-output repair and two bounded waits using a valid provider retry header are permitted within the existing eight-attempt/120-second scheduling budget. No model download or paid-tier upgrade occurred. Raw provider failures, hidden reasoning, tokens and buyer details are not exported.

## Remaining manual step

Validation for this change: 42 unit tests, 59 PostgreSQL integration tests, typecheck, lint, production build and the packed offline SDK consumer passed. New native-tool coverage uses HTTP fixtures; the mission and sandbox order described above used real services. Earlier browser checks remain fixture/simulator evidence; they were not rerun for this server-only adapter change. The existing clean README rehearsal reused this host and cached dependencies; no new fresh-OS claim is made.

Approve the current checkout as a separate PayPal sandbox personal buyer, then request server capture. The server checks provider `APPROVED`, checks the exact unexpired approval again, captures once, and retrieves the order. Independently run `npm run verify:capture -- <actual quote UUID>` and require matching USD amount, final capture, `COMPLETED` and matching capture ID. A return page alone is insufficient. If approval expires, re-quote and obtain fresh exact approval; do not extend the old quote.

The public recording still needs a fresh UI mission and a recorded sandbox capture. Keep the existing labeled rejection/repair scene; same-price swap and regression export remain deferred. Quota and continued Groq/model/PayPal access through December 21 are not guaranteed. Check the owner's Groq limits and sandbox buyer/merchant logins before recording and again before submission. Publishing and submission remain with the owner.
