# @redline/policy

**Experimental v0.1.0 API · MIT · no runtime dependencies.** Pure deterministic basket policy evaluation. ESM, CommonJS, and TypeScript declarations are built by `npm run build -w @redline/policy`.

```ts
import { evaluate, type Policy, type Quote } from '@redline/policy';

const decision = evaluate(confirmedPolicy, authoritativeQuote, {
  ownerId: confirmedPolicy.ownerId,
  now: new Date().toISOString(),
  spent: 0, reserved: 0, purchases: 0, pendingPurchases: 0
});
if (!decision.allowed) console.log(decision.reasons, decision.checks);
```

The full runnable offline example is in `examples/consumer/index.mjs`. Run `npm run verify:package` at the repository root to build, pack, install that archive into an isolated consumer, and verify public ESM/CJS exports and TypeScript declarations. Nothing is published.

## Contract

`evaluate(policy, authoritativeQuote, context) → Decision` has no side effects, network, clock reads, random values, model, payment or database dependencies. The host supplies time and cumulative ledger counters. Invalid inputs fail closed with `INVALID_INPUT`. Safe integers only: money 0–100,000,000 cents, quantities 1–100, 1–30 unique quote lines. Reference UI limits are narrower. USD and one-time authorization only. Dates must be parseable timestamps; use canonical ISO UTC strings as the reference host does.

Checks cover complete cumulative total, purchase capacity, merchant, owner, currency, quantity, category coverage, explicit SKU allowlist, availability, known products, billing type, and policy/quote expiry. Every check includes expected and observed values. Stable reason codes are exported through `ReasonCode`. Decisions carry policy/quote hashes and versions plus evaluator version `redline/0.1.0`.

`decimal(cents)` serializes exact decimals; `fromDecimal('123.45')` requires an exact two-decimal string. `canonical`, `hash` (portable SHA-256), `basketFingerprint`, and `approvalValid` support snapshot binding. Hashes are not signatures and do not prove the truth of the input data. `basketFingerprint` excludes quote ID/version/expiry; these must be checked separately through the full quote hash and lifecycle.

Public contracts: `Policy`, `Proposal`, `Quote`, `QuoteLine`, `ExecutionContext`, `Decision`, `Check`, `ReasonCode`, `Category`, `ApprovalBinding`. Public values/functions: `MAX_MINOR`, `EVALUATOR_VERSION`, `evaluate`, `isMinor`, `decimal`, `fromDecimal`, `canonical`, `hash`, `sha256`, `basketFingerprint`, `approvalValid`.

## Host responsibilities

Pure evaluation is only the basket check. The host must obtain authenticated confirmed policy, resolve authoritative quotes, reserve cumulative budget/purchase capacity and inventory atomically, validate exact approval and ownership, revalidate before new mutations, persist immutable operation intent, and reconcile provider evidence. A caller-supplied `allowed: true` is never authority. A bypass around the validated payment path defeats enforcement. Do not treat a snapshot check as a transaction lock or payment authorization.

Replay must use the recorded context (including original time), snapshots and matching evaluator version. This release only replays its own version. Keep earlier evaluator versions available when upgrading. Replay never executes a purchase.

## Runtime policy

The supported repository runtime is Node 22.16–24.x with npm 10+. The SDK itself uses standard ES2022, `TextEncoder` and `BigInt`, so it can be bundled for modern browsers; this release's archive consumer is verified on Node. Breaking experimental API changes may occur before 1.0; pin versions. No production certification or universal payment guarantees are claimed.
