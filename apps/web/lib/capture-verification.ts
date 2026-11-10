import {assertOrder,type PaymentProvider} from '@redline/paypal';
import {hash,decimal} from '@redline/policy';
import {db} from './db';
import {AppError} from './domain';
import {provider} from './payments';

/** Local operator check: authoritative retrieval only, never create or capture. */
export async function verifyCapturedQuote(quoteId:string,payment:PaymentProvider=provider()){
  const quote=await db().selectFrom('quotes').selectAll().where('id','=',quoteId).executeTakeFirst();
  if(!quote)throw new AppError('NOT_FOUND',404);
  if(quote.ai_mode!=='real'||quote.payment_mode!=='sandbox'||payment.mode!=='sandbox')throw new AppError('REAL_MODEL_SANDBOX_QUOTE_REQUIRED');
  if(!quote.decision.allowed||hash(quote.snapshot)!==quote.decision.quoteHash||hash(quote.policy_snapshot)!==quote.decision.policyHash)throw new AppError('QUOTE_SNAPSHOT_MISMATCH');
  const op=await db().selectFrom('operations').selectAll().where('quote_id','=',quoteId).where('owner_id','=',quote.owner_id).executeTakeFirst();
  if(!op?.provider_order_id||!op.provider_capture_id||op.state!=='COMPLETED')throw new AppError('COMPLETED_CAPTURE_REQUIRED');
  const order=await payment.get(op.provider_order_id);
  assertOrder(order,quote.snapshot,op.id,op.provider_order_id);
  const capture=order.purchase_units[0].payments?.captures?.[0];
  if(order.status!=='COMPLETED'||capture?.status!=='COMPLETED'||capture.id!==op.provider_capture_id)throw new AppError('CAPTURE_COMPLETION_UNPROVEN');
  return {format:'redline-capture-verification/1',verifiedAt:new Date().toISOString(),quoteId,operationId:op.id,modelInput:quote.ai_mode,paymentMode:op.payment_mode,source:'authoritative provider GET; no payment mutation',policyHash:hash(quote.policy_snapshot),quoteHash:hash(quote.snapshot),expected:{amount:decimal(quote.snapshot.total),currency:quote.snapshot.currency},provider:{orderId:order.id,orderStatus:order.status,captureId:capture.id,captureStatus:capture.status,finalCapture:capture.final_capture,amount:capture.amount.value,currency:capture.amount.currency_code}};
}
