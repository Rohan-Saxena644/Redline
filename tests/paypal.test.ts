import { describe,it,expect,vi } from 'vitest';
import { createPayload,assertOrder,approvalUrl,PayPalSandbox,type OrderEvidence } from '@redline/paypal';
import { snapshot } from './fixtures';
function evidence():OrderEvidence {const {quote}=snapshot();const p=createPayload(quote,'op','http://localhost:3000');return {id:'TEST1',status:'APPROVED',intent:'CAPTURE',purchase_units:p.purchase_units.map(u=>({...u,items:u.items.map(({category:_category,...i})=>i)}))};}
describe('PayPal sandbox adapter',()=>{
  it('rejects every production/arbitrary API host',()=>{for(const baseUrl of ['https://api-m.paypal.com','https://evil.test','http://api-m.sandbox.paypal.com'])expect(()=>new PayPalSandbox({baseUrl,clientId:'test',clientSecret:'test'})).toThrow();});
  it('builds exact itemization and redirects without deprecated application_context',()=>{const p=createPayload(snapshot().quote,'op','http://localhost:3000');expect(p.purchase_units[0].amount.value).toBe('123.63');expect(p.payment_source.paypal.experience_context.return_url).toContain('operation=op');expect(p).not.toHaveProperty('application_context');});
  it('validates amount, currency, payee, order identity, itemization and breakdown',()=>{
    const {quote}=snapshot();expect(()=>assertOrder(evidence(),quote,'op','TEST1')).not.toThrow();
    for(const mutate of [(e:OrderEvidence)=>{e.purchase_units[0].payee.merchant_id='OTHER';},(e:OrderEvidence)=>{e.purchase_units[0].amount.value='0.01';},(e:OrderEvidence)=>{e.purchase_units[0].amount.currency_code='EUR';},(e:OrderEvidence)=>{e.purchase_units[0].items![0].quantity='2';},(e:OrderEvidence)=>{e.purchase_units[0].amount.breakdown!.shipping!.value='0.00';},(e:OrderEvidence)=>{e.purchase_units[0].custom_id='other';},(e:OrderEvidence)=>{e.id='OTHER';}]){const e=evidence();mutate(e);expect(()=>assertOrder(e,quote,'op','TEST1')).toThrow();}
  });
  it('requires completed final capture evidence',()=>{const e=evidence();e.status='COMPLETED';expect(()=>assertOrder(e,snapshot().quote,'op')).toThrow('CAPTURE_COMPLETION_UNPROVEN');});
  it('accepts only sandbox buyer approval destinations',()=>{const e=evidence();e.links=[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=TEST1'}];expect(approvalUrl(e)).toContain('sandbox.paypal.com');e.links[0].href='https://www.paypal.com/checkoutnow';expect(()=>approvalUrl(e)).toThrow();});
  it('does not send webhooks with missing verification headers',async()=>{const transport=vi.fn();const p=new PayPalSandbox({baseUrl:'https://api-m.sandbox.paypal.com',clientId:'test',clientSecret:'test',webhookId:'webhook'},transport);expect(await p.verifyWebhook(new Headers(),{})).toBe(false);expect(transport).not.toHaveBeenCalled();});
  it('rejects FAILURE from signature verification and never trusts payload status',async()=>{
    const transport=vi.fn().mockResolvedValueOnce(Response.json({access_token:'fixture-token',expires_in:300})).mockResolvedValueOnce(Response.json({verification_status:'FAILURE'}));
    const p=new PayPalSandbox({baseUrl:'https://api-m.sandbox.paypal.com',clientId:'test',clientSecret:'test',webhookId:'webhook'},transport);
    const headers=new Headers({'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/TEST','paypal-transmission-id':'id','paypal-transmission-sig':'sig','paypal-transmission-time':'2026-11-05T00:00:00Z'});
    expect(await p.verifyWebhook(headers,{status:'COMPLETED'})).toBe(false);
  });
});
