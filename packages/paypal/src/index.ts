import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { decimal, canonical, type Quote } from '@redline/policy';
if (typeof window !== 'undefined') throw new Error('PayPal integration is server-only');
const amount = z.object({ currency_code: z.string(), value: z.string() });
const capture = z.object({ id: z.string().min(1), status: z.string(), amount, final_capture: z.boolean().optional() });
const unit = z.object({
  reference_id: z.string(), custom_id: z.string().optional(), payee: z.object({merchant_id:z.string()}),
  amount: amount.extend({breakdown:z.object({item_total:amount,shipping:amount.optional(),tax_total:amount.optional(),discount:amount.optional()}).optional()}),
  items:z.array(z.object({sku:z.string(),name:z.string(),quantity:z.string(),unit_amount:amount})).optional(),
  payments:z.object({captures:z.array(capture).optional()}).optional()
});
export const orderSchema = z.object({
  id:z.string().regex(/^[A-Z0-9]{1,36}$/), status:z.enum(['CREATED','SAVED','APPROVED','VOIDED','COMPLETED','PAYER_ACTION_REQUIRED']),
  intent:z.literal('CAPTURE').optional(), purchase_units:z.array(unit).length(1),
  links:z.array(z.object({href:z.string().url(),rel:z.string(),method:z.string().optional()})).optional()
});
export type OrderEvidence = z.infer<typeof orderSchema>;
export function createPayload(quote:Quote, operationId:string, origin:string) {
  const money = (v:number) => ({currency_code:'USD',value:decimal(v)});
  return {
    intent:'CAPTURE', purchase_units:[{
      reference_id:operationId,custom_id:operationId,payee:{merchant_id:quote.payeeId},
      amount:{...money(quote.total),breakdown:{item_total:money(quote.subtotal),shipping:money(quote.shipping),tax_total:money(quote.tax),discount:money(quote.discount)}},
      items:quote.lines.map(l=>({name:l.name,sku:l.sku,quantity:String(l.quantity),unit_amount:money(l.unitPrice),category:'PHYSICAL_GOODS'}))
    }],
    payment_source:{paypal:{experience_context:{shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:`${origin}/?operation=${operationId}&buyer=returned`,cancel_url:`${origin}/?operation=${operationId}&buyer=cancelled`}}}
  };
}
export type CreatePayload = ReturnType<typeof createPayload>;
export class ProviderError extends Error {
  constructor(public readonly code:string, public readonly httpStatus?:number, public readonly debugId?:string, public readonly knownOrderId?:string) { super(code); this.name='ProviderError'; }
}
export interface PaymentProvider {
  readonly mode:'sandbox'|'simulated';
  create(payload:CreatePayload, requestId:string):Promise<OrderEvidence>;
  get(orderId:string):Promise<OrderEvidence>;
  capture(orderId:string, requestId:string):Promise<void>;
}
export function assertOrder(order:OrderEvidence, quote:Quote, operationId:string, expectedOrderId?:string):void {
  const u = order.purchase_units[0]; const money=(v:number)=>({currency_code:'USD',value:decimal(v)});
  if (expectedOrderId && order.id!==expectedOrderId) throw new ProviderError('ORDER_ID_MISMATCH');
  if (u.reference_id!==operationId || u.custom_id!==operationId || u.payee.merchant_id!==quote.payeeId || u.amount.currency_code!=='USD' || u.amount.value!==decimal(quote.total)) throw new ProviderError('PROVIDER_BINDING_MISMATCH');
  const expectedBreakdown={item_total:money(quote.subtotal),shipping:money(quote.shipping),tax_total:money(quote.tax),discount:money(quote.discount)};
  if (!u.amount.breakdown || Object.entries(expectedBreakdown).some(([k,v])=>{ const actual=u.amount.breakdown?.[k as keyof typeof expectedBreakdown]; return actual ? canonical(actual)!==canonical(v) : v.value!=='0.00'; })) throw new ProviderError('PROVIDER_BREAKDOWN_MISMATCH');
  const expectedItems=quote.lines.map(l=>({sku:l.sku,name:l.name,quantity:String(l.quantity),unit_amount:money(l.unitPrice)})).sort((a,b)=>a.sku.localeCompare(b.sku));
  if (!u.items || canonical([...u.items].sort((a,b)=>a.sku.localeCompare(b.sku)))!==canonical(expectedItems)) throw new ProviderError('PROVIDER_ITEMS_MISMATCH');
  const captures=u.payments?.captures??[];
  if (captures.length>1 || captures.some(c=>canonical(c.amount)!==canonical(money(quote.total)))) throw new ProviderError('PROVIDER_CAPTURE_MISMATCH');
  if (order.status==='COMPLETED' && (captures.length!==1 || captures[0].status!=='COMPLETED' || captures[0].final_capture!==true)) throw new ProviderError('CAPTURE_COMPLETION_UNPROVEN');
}
export function approvalUrl(order:OrderEvidence):string|null {
  const link=order.links?.find(l=>l.rel==='payer-action'||l.rel==='approve');
  if (!link) return null;
  const url=new URL(link.href);
  if (url.protocol!=='https:' || url.hostname!=='www.sandbox.paypal.com' || url.username || url.password || url.port) throw new ProviderError('UNSAFE_APPROVAL_URL');
  return url.toString();
}
export class PayPalSandbox implements PaymentProvider {
  readonly mode='sandbox' as const;
  private token:{value:string;expires:number}|undefined;
  constructor(private config:{baseUrl:string;clientId:string;clientSecret:string;webhookId?:string}, private transport:typeof fetch=fetch) {
    if (config.baseUrl!=='https://api-m.sandbox.paypal.com') throw new Error('Only the PayPal sandbox API is supported');
    if (!config.clientId||!config.clientSecret) throw new Error('Sandbox credentials are required');
  }
  async authenticate():Promise<void> { await this.accessToken(); }
  private async accessToken():Promise<string> {
    if (this.token && this.token.expires>Date.now()) return this.token.value;
    let response:Response;
    try { response=await this.transport(`${this.config.baseUrl}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000),redirect:'error'}); }
    catch { throw new ProviderError('AUTH_UNAVAILABLE'); }
    if (!response.ok) throw new ProviderError('AUTH_REJECTED',response.status);
    const result=z.object({access_token:z.string().min(1),expires_in:z.number().positive()}).safeParse(await response.json());
    if (!result.success) throw new ProviderError('INVALID_AUTH_RESPONSE');
    this.token={value:result.data.access_token,expires:Date.now()+Math.max(0,result.data.expires_in-60)*1000}; return this.token.value;
  }
  private async request(path:string, method:'GET'|'POST', body?:unknown, requestId?:string):Promise<unknown> {
    const token=await this.accessToken(); let response:Response;
    try { response=await this.transport(`${this.config.baseUrl}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation',...(requestId?{'PayPal-Request-Id':requestId}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000),redirect:'error'}); }
    catch { throw new ProviderError('OUTCOME_UNKNOWN'); }
    if (!response.ok) throw new ProviderError('PROVIDER_HTTP_ERROR',response.status,response.headers.get('paypal-debug-id')??undefined);
    try { return await response.json(); } catch { throw new ProviderError('INVALID_PROVIDER_RESPONSE'); }
  }
  async create(payload:CreatePayload, requestId:string):Promise<OrderEvidence> {
    // A create response can be minimal. Always retrieve the authoritative representation.
    const created=z.object({id:z.string().regex(/^[A-Z0-9]{1,36}$/)}).safeParse(await this.request('/v2/checkout/orders','POST',payload,requestId));
    if (!created.success) throw new ProviderError('INVALID_CREATE_RESPONSE');
    try { return await this.get(created.data.id); }
    catch { throw new ProviderError('ORDER_RETRIEVAL_NEEDED',undefined,undefined,created.data.id); }
  }
  async get(orderId:string):Promise<OrderEvidence> {
    if (!/^[A-Z0-9]{1,36}$/.test(orderId)) throw new ProviderError('INVALID_ORDER_ID');
    const result=orderSchema.safeParse(await this.request(`/v2/checkout/orders/${orderId}`,'GET'));
    if (!result.success) throw new ProviderError('INVALID_ORDER_RESPONSE'); return result.data;
  }
  async capture(orderId:string, requestId:string):Promise<void> {
    if (!/^[A-Z0-9]{1,36}$/.test(orderId)) throw new ProviderError('INVALID_ORDER_ID');
    await this.request(`/v2/checkout/orders/${orderId}/capture`,'POST',{},requestId);
  }
  async verifyWebhook(headers:Headers, event:unknown):Promise<boolean> {
    if (!this.config.webhookId) throw new ProviderError('WEBHOOK_NOT_CONFIGURED');
    const fields=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
    if (fields.some(k=>!headers.get(k)||headers.get(k)!.length>4096)) return false;
    let cert:URL;try{cert=new URL(headers.get('paypal-cert-url')!);}catch{return false;}
    if (cert.protocol!=='https:' || cert.hostname!=='api.sandbox.paypal.com' && cert.hostname!=='api-m.sandbox.paypal.com') return false;
    const result=z.object({verification_status:z.enum(['SUCCESS','FAILURE'])}).safeParse(await this.request('/v1/notifications/verify-webhook-signature','POST',{
      auth_algo:headers.get(fields[0]),cert_url:headers.get(fields[1]),transmission_id:headers.get(fields[2]),transmission_sig:headers.get(fields[3]),transmission_time:headers.get(fields[4]),webhook_id:this.config.webhookId,webhook_event:event
    }));
    return result.success && result.data.verification_status==='SUCCESS';
  }
}
