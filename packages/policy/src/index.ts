/** Experimental v0.1 API. Pure evaluation does not reserve funds or authorize payment. */
export const EVALUATOR_VERSION = 'redline/0.1.0' as const;
export const MAX_MINOR = 100_000_000;
export type Category = 'microphone' | 'headphones' | 'accessory';
export interface Policy {
  id: string; version: number; ownerId: string; currency: 'USD'; maxTotal: number;
  maxPurchases: number; requiredCategories: Category[]; merchantId: string; maxQuantity: number;
  allowedProductIds: string[] | null; billingType: 'one_time'; expiresAt: string;
}
export interface Proposal { items: { sku: string; quantity: number }[]; explanation?: string }
export interface QuoteLine {
  sku: string; name: string; quantity: number; unitPrice: number; category: Category;
  billingType: 'one_time' | 'recurring'; available: boolean; known: boolean; productVersion: number;
}
export interface Quote {
  id: string; version: number; merchantId: string; payeeId: string; currency: 'USD';
  lines: QuoteLine[]; subtotal: number; discount: number; shipping: number; tax: number; total: number;
  rulesVersion: string; expiresAt: string;
}
export interface ExecutionContext { now: string; ownerId: string; spent: number; reserved: number; purchases: number; pendingPurchases: number }
export type ReasonCode = 'INVALID_INPUT' | 'BUDGET_EXCEEDED' | 'MERCHANT_NOT_ALLOWED' | 'BILLING_TYPE_NOT_ALLOWED' | 'REQUIRED_CATEGORY_MISSING' | 'QUANTITY_LIMIT_EXCEEDED' | 'PRODUCT_UNAVAILABLE' | 'UNKNOWN_PRODUCT' | 'PRODUCT_NOT_ALLOWED' | 'QUOTE_EXPIRED' | 'POLICY_EXPIRED' | 'APPROVAL_STALE' | 'PURCHASE_LIMIT_REACHED' | 'OWNER_MISMATCH' | 'CURRENCY_NOT_ALLOWED';
export interface Check { code: ReasonCode | 'PASS'; constraint: string; expected: unknown; observed: unknown; passed: boolean }
export interface Decision {
  allowed: boolean; reasons: ReasonCode[]; checks: Check[]; evaluatorVersion: typeof EVALUATOR_VERSION;
  policyVersion: number; quoteVersion: number; policyHash: string; quoteHash: string;
}
export function isMinor(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_MINOR; }
export function decimal(minor: number): string {
  if (!isMinor(minor)) throw new RangeError('Invalid minor-unit amount');
  return `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function fromDecimal(value: string): number {
  if (!/^(0|[1-9]\d{0,6})\.\d{2}$/.test(value)) throw new RangeError('Expected exact nonnegative decimal');
  const [whole, fraction] = value.split('.');
  const result = Number(BigInt(whole) * 100n + BigInt(fraction));
  if (!isMinor(result)) throw new RangeError('Amount exceeds supported range');
  return result;
}
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  throw new TypeError('Only JSON with safe integers can be canonicalized');
}
// FIPS 180-4 SHA-256; UTF-8, no platform APIs, deterministic in Node and browsers.
export function hash(value: unknown): string { return sha256(canonical(value)); }
export function sha256(input: string): string {
  const bytes = new TextEncoder().encode(input); const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(length); data.set(bytes); data[bytes.length] = 128;
  const view = new DataView(data.buffer); const bits = BigInt(bytes.length) * 8n;
  view.setUint32(length - 8, Number(bits >> 32n)); view.setUint32(length - 4, Number(bits & 0xffffffffn));
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate = (x:number,n:number) => (x >>> n) | (x << (32 - n)); const w = new Uint32Array(64);
  for (let offset = 0; offset < length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i-15], b = w[i-2]; w[i] = w[i-16] + (rotate(a,7)^rotate(a,18)^(a>>>3)) + w[i-7] + (rotate(b,17)^rotate(b,19)^(b>>>10)); }
    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i++) { const t1 = (h + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + constants[i] + w[i])|0; const t2 = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c)))|0; h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0; }
    [a,b,c,d,e,f,g,h].forEach((v,i) => { state[i] = (state[i]+v)|0; });
  }
  return state.map(v => (v>>>0).toString(16).padStart(8,'0')).join('');
}
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 200;
const quantity = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 1 && Number(v) <= 100;
const categories = ['microphone', 'headphones', 'accessory'];
export function evaluate(policy: Policy, quote: Quote, context: ExecutionContext): Decision {
  const checks: Check[] = [];
  const check = (passed:boolean, code:ReasonCode, constraint:string, expected:unknown, observed:unknown) => checks.push({passed, code:passed?'PASS':code, constraint, expected, observed});
  let valid = false;
  try {
    valid = !!policy && !!quote && !!context && id(policy.id) && id(policy.ownerId) && id(policy.merchantId) && quantity(policy.version) && quantity(policy.maxPurchases) && quantity(policy.maxQuantity) && isMinor(policy.maxTotal) && policy.billingType === 'one_time' && date(policy.expiresAt) && Array.isArray(policy.requiredCategories) && policy.requiredCategories.length <= 3 && policy.requiredCategories.every(c=>categories.includes(c)) && (policy.allowedProductIds === null || (Array.isArray(policy.allowedProductIds) && policy.allowedProductIds.length <= 100 && policy.allowedProductIds.every(id))) && id(quote.id) && quantity(quote.version) && id(quote.merchantId) && id(quote.payeeId) && id(quote.rulesVersion) && date(quote.expiresAt) && Array.isArray(quote.lines) && quote.lines.length > 0 && quote.lines.length <= 30 && quote.lines.every(l=>id(l.sku) && id(l.name) && quantity(l.quantity) && isMinor(l.unitPrice) && categories.includes(l.category) && ['one_time','recurring'].includes(l.billingType) && typeof l.available === 'boolean' && typeof l.known === 'boolean' && quantity(l.productVersion)) && new Set(quote.lines.map(l=>l.sku)).size === quote.lines.length && [quote.subtotal,quote.shipping,quote.tax,quote.discount,quote.total,context.spent,context.reserved].every(isMinor) && [context.purchases,context.pendingPurchases].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=100) && date(context.now) && id(context.ownerId);
    if (valid) {
      const subtotal = quote.lines.reduce((sum,l)=>sum+BigInt(l.unitPrice)*BigInt(l.quantity),0n);
      valid = subtotal === BigInt(quote.subtotal) && BigInt(quote.total) === subtotal + BigInt(quote.shipping) + BigInt(quote.tax) - BigInt(quote.discount) && quote.discount <= quote.subtotal;
    }
  } catch { valid = false; }
  if (!valid) return {allowed:false,reasons:['INVALID_INPUT'],checks:[{passed:false,code:'INVALID_INPUT',constraint:'input',expected:'bounded, internally consistent policy/quote/context',observed:'invalid'}],evaluatorVersion:EVALUATOR_VERSION,policyVersion:0,quoteVersion:0,policyHash:'invalid',quoteHash:'invalid'};
  check(policy.currency === 'USD' && quote.currency === 'USD','CURRENCY_NOT_ALLOWED','currency','USD',quote.currency);
  check(context.ownerId === policy.ownerId,'OWNER_MISMATCH','owner',policy.ownerId,context.ownerId);
  check(Date.parse(context.now) < Date.parse(policy.expiresAt),'POLICY_EXPIRED','policy.expiresAt',`after ${context.now}`,policy.expiresAt);
  check(Date.parse(context.now) < Date.parse(quote.expiresAt),'QUOTE_EXPIRED','quote.expiresAt',`after ${context.now}`,quote.expiresAt);
  check(quote.merchantId === policy.merchantId,'MERCHANT_NOT_ALLOWED','merchant',policy.merchantId,quote.merchantId);
  const total = BigInt(context.spent)+BigInt(context.reserved)+BigInt(quote.total);
  check(total <= BigInt(policy.maxTotal),'BUDGET_EXCEEDED','cumulative total including shipping and tax',policy.maxTotal,total.toString());
  check(context.purchases + context.pendingPurchases < policy.maxPurchases,'PURCHASE_LIMIT_REACHED','successful and reserved purchases',policy.maxPurchases,context.purchases+context.pendingPurchases);
  for (const line of quote.lines) {
    check(line.known,'UNKNOWN_PRODUCT',`${line.sku}.known`,true,line.known);
    check(line.available,'PRODUCT_UNAVAILABLE',`${line.sku}.available`,true,line.available);
    check(line.billingType === policy.billingType,'BILLING_TYPE_NOT_ALLOWED',`${line.sku}.billingType`,policy.billingType,line.billingType);
    check(line.quantity <= policy.maxQuantity,'QUANTITY_LIMIT_EXCEEDED',`${line.sku}.quantity`,policy.maxQuantity,line.quantity);
    check(policy.allowedProductIds === null || policy.allowedProductIds.includes(line.sku),'PRODUCT_NOT_ALLOWED',`${line.sku}.allowlist`,policy.allowedProductIds,line.sku);
  }
  for (const category of policy.requiredCategories) check(quote.lines.some(l=>l.known&&l.category===category),'REQUIRED_CATEGORY_MISSING',`category.${category}`,true,quote.lines.some(l=>l.known&&l.category===category));
  return {allowed:checks.every(c=>c.passed), reasons:[...new Set(checks.filter(c=>!c.passed).map(c=>c.code as ReasonCode))],checks,evaluatorVersion:EVALUATOR_VERSION,policyVersion:policy.version,quoteVersion:quote.version,policyHash:hash(policy),quoteHash:hash(quote)};
}
/** All financial/catalogue facts bound by approval; identifiers/expiry remain separately checked. */
export function basketFingerprint(quote: Quote): string {
  const { id:_id, version:_version, expiresAt:_expiresAt, ...facts } = quote;
  return hash(facts);
}
export interface ApprovalBinding { ownerId:string; missionId:string; operationId:string; policyHash:string; quoteHash:string; basketHash:string; expiresAt:string }
export function approvalValid(binding: ApprovalBinding, expected: ApprovalBinding, now: string): boolean {
  return date(now) && date(binding.expiresAt) && Date.parse(now)<Date.parse(binding.expiresAt) && canonical(binding)===canonical(expected);
}
