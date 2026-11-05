import { z } from 'zod';
import { PayPalSandbox } from '@redline/paypal';
import { db } from './db';
import { config } from './config';
import { AppError } from './domain';
import { applyEvidence } from './payments';
const eventSchema=z.object({id:z.string().min(1).max(100),event_type:z.string().max(100),resource:z.object({
  id:z.string().max(100),supplementary_data:z.object({related_ids:z.object({order_id:z.string().regex(/^[A-Z0-9]{1,36}$/).optional()})}).optional()
})});
export async function processWebhook(headers:Headers,raw:unknown) {
  const c=config();if(c.PAYMENT_MODE!=='sandbox') throw new AppError('SANDBOX_WEBHOOK_DISABLED',403);
  const paypal=new PayPalSandbox({baseUrl:c.PAYPAL_BASE_URL,clientId:c.PAYPAL_CLIENT_ID,clientSecret:c.PAYPAL_CLIENT_SECRET,webhookId:c.PAYPAL_WEBHOOK_ID});
  // Raw signed event is submitted to PayPal; only normalized evidence is stored.
  if(!await paypal.verifyWebhook(headers,raw)) throw new AppError('WEBHOOK_SIGNATURE_REJECTED',403);
  const e=eventSchema.parse(raw);
  if(await db().selectFrom('webhook_events').select('id').where('id','=',e.id).executeTakeFirst()) return {duplicate:true};
  const orderId=e.event_type.startsWith('CHECKOUT.ORDER.')?e.resource.id:e.resource.supplementary_data?.related_ids.order_id;
  if(!orderId) return {ignored:true};
  const evidence=await paypal.get(orderId);
  let op=await db().selectFrom('operations').selectAll().where('provider_order_id','=',orderId).where('payment_mode','=','sandbox').executeTakeFirst();
  // Recover a create response lost before the provider ID was persisted, using only the fetched order's binding.
  if(!op){const candidate=evidence.purchase_units[0].custom_id;if(candidate)op=await db().selectFrom('operations').selectAll().where('id','=',candidate).where('payment_mode','=','sandbox').where('reserved','=',true).where('phase','=','create').executeTakeFirst();}
  if(!op) throw new AppError('WEBHOOK_OPERATION_NOT_MAPPED',503);
  await applyEvidence(op.owner_id,op.id,evidence,{id:e.id,type:e.event_type});
  return {processed:true};
}
