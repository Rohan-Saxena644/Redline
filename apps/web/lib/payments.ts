import { randomUUID } from 'node:crypto';
import { sql, type Selectable } from 'kysely';
import { hash, basketFingerprint, evaluate, approvalValid, type ApprovalBinding } from '@redline/policy';
import { createPayload, assertOrder, approvalUrl, PayPalSandbox, ProviderError, type PaymentProvider, type OrderEvidence } from '@redline/paypal';
import { db, type Database, type Tx, type Connection } from './db';
import { config } from './config';
import { SimulatedProvider } from './simulator';
import { makeQuote } from './catalog';
import { AppError, executionContext, event } from './domain';
type Operation=Selectable<Database['operations']>;
type QuoteRow=Selectable<Database['quotes']>;
const stamp=()=>new Date().toISOString();
export function provider():PaymentProvider {
  const c=config();return c.PAYMENT_MODE==='simulated'?new SimulatedProvider():new PayPalSandbox({baseUrl:c.PAYPAL_BASE_URL,clientId:c.PAYPAL_CLIENT_ID,clientSecret:c.PAYPAL_CLIENT_SECRET,webhookId:c.PAYPAL_WEBHOOK_ID});
}
export async function ownedOperation(ownerId:string,id:string,connection:Connection=db()):Promise<Operation> {
  const op=await connection.selectFrom('operations').selectAll().where('id','=',id).where('owner_id','=',ownerId).executeTakeFirst();
  if(!op) throw new AppError('NOT_FOUND',404);return op;
}
async function lockOperation(tx:Tx,ownerId:string,id:string) {
  const known=await ownedOperation(ownerId,id,tx);
  const mission=await tx.selectFrom('missions').selectAll().where('id','=',known.mission_id).where('owner_id','=',ownerId).forUpdate().executeTakeFirstOrThrow();
  const op=await tx.selectFrom('operations').selectAll().where('id','=',id).forUpdate().executeTakeFirstOrThrow();
  return {mission,op};
}
async function lockProducts(tx:Tx,quote:QuoteRow) { await tx.selectFrom('products').select('sku').where('sku','in',quote.snapshot.lines.map(l=>l.sku)).orderBy('sku').forUpdate().execute(); }
function bindingFor(op:Pick<Operation,'owner_id'|'mission_id'|'id'>,quote:QuoteRow,policyHash:string):ApprovalBinding {
  return {ownerId:op.owner_id,missionId:op.mission_id,operationId:op.id,policyHash,quoteHash:hash(quote.snapshot),basketHash:basketFingerprint(quote.snapshot),expiresAt:quote.snapshot.expiresAt};
}
async function fresh(tx:Tx,mission:Selectable<Database['missions']>,op:Operation,quote:QuoteRow,own:boolean) {
  const approval=await tx.selectFrom('approvals').selectAll().where('id','=',op.approval_id).where('owner_id','=',op.owner_id).executeTakeFirstOrThrow();
  const expected=bindingFor(op,quote,hash(mission.policy));
  if(approval.status!=='active' || !approvalValid(approval.binding,expected,stamp())) throw new AppError('APPROVAL_STALE');
  if(op.payment_mode!==config().PAYMENT_MODE || quote.payment_mode!==op.payment_mode) throw new AppError('PAYMENT_MODE_CHANGED');
  if(hash(op.payload)!==op.payload_hash || hash(createPayload(quote.snapshot,op.id,config().APP_ORIGIN))!==op.payload_hash) throw new AppError('PAYLOAD_CHANGED');
  const current=await makeQuote(quote.proposal,tx,{ownReservation:own,original:quote.snapshot,ownerId:op.owner_id});
  if(basketFingerprint(current)!==basketFingerprint(quote.snapshot)) throw new AppError('APPROVAL_STALE');
  const context=executionContext(mission);
  if(own){context.reserved-=quote.snapshot.total;context.pendingPurchases--;}
  const decision=evaluate(mission.policy,current,context);
  if(!decision.allowed) throw new AppError(decision.reasons[0]);
}
export async function approveBasket(ownerId:string,quoteId:string) {
  return db().transaction().execute(async tx=>{
    const quote=await tx.selectFrom('quotes').selectAll().where('id','=',quoteId).where('owner_id','=',ownerId).executeTakeFirst();
    if(!quote) throw new AppError('NOT_FOUND',404);
    const mission=await tx.selectFrom('missions').selectAll().where('id','=',quote.mission_id).where('owner_id','=',ownerId).forUpdate().executeTakeFirstOrThrow();
    const existing=await tx.selectFrom('approvals').selectAll().where('quote_id','=',quoteId).executeTakeFirst();
    if(existing) return {approvalId:existing.id,operationId:existing.operation_id};
    await lockProducts(tx,quote);
    const current=await makeQuote(quote.proposal,tx,{original:quote.snapshot,ownerId});
    if(basketFingerprint(current)!==basketFingerprint(quote.snapshot) || hash(mission.policy)!==quote.decision.policyHash) throw new AppError('APPROVAL_STALE');
    const decision=evaluate(mission.policy,current,executionContext(mission));
    if(!decision.allowed) throw new AppError(decision.reasons[0]);
    const operationId=randomUUID(),approvalId=randomUUID();
    const binding=bindingFor({owner_id:ownerId,mission_id:mission.id,id:operationId},quote,hash(mission.policy));
    const payload=createPayload(quote.snapshot,operationId,config().APP_ORIGIN);
    await tx.insertInto('approvals').values({id:approvalId,owner_id:ownerId,mission_id:mission.id,quote_id:quoteId,operation_id:operationId,binding,status:'active'}).execute();
    await tx.insertInto('operations').values({id:operationId,owner_id:ownerId,mission_id:mission.id,quote_id:quoteId,approval_id:approvalId,state:'APPROVED',payment_mode:quote.payment_mode,create_key:randomUUID(),capture_key:randomUUID(),payload,payload_hash:hash(payload),provider_order_id:null,provider_capture_id:null,provider_status:null,approval_url:null,phase:null,attempted_at:null,lease_until:null,last_error:null,updated_at:stamp(),reconcile_after:null}).execute();
    await event(tx,mission.id,operationId,'basket_approved','You approved this exact basket. PayPal buyer approval is a separate step.',{approvalHash:hash(binding),quoteId});
    return {approvalId,operationId};
  });
}
async function unknown(ownerId:string,id:string,error:unknown) {
  const code=error instanceof ProviderError?error.code:error instanceof AppError?error.code:'RECONCILIATION_REQUIRED';
  await db().transaction().execute(async tx=>{
    const {op}=await lockOperation(tx,ownerId,id);
    if(['COMPLETED','FAILED','CANCELLED'].includes(op.state)) return;
    await tx.updateTable('operations').set({state:'UNKNOWN',last_error:code,lease_until:null,updated_at:stamp(),reconcile_after:new Date(Date.now()+30_000).toISOString(),...(error instanceof ProviderError&&error.knownOrderId?{provider_order_id:error.knownOrderId}:{})}).where('id','=',id).execute();
    await event(tx,op.mission_id,id,'outcome_unknown','Payment outcome needs reconciliation. Your reservation is retained.',{code,paymentMode:op.payment_mode});
  });
}
export async function executePurchase(ownerId:string,id:string,payment:PaymentProvider=provider()) {
  const claimed=await db().transaction().execute(async tx=>{
    const {mission,op}=await lockOperation(tx,ownerId,id);
    if(op.state!=='APPROVED') return null;
    if(payment.mode!==op.payment_mode) throw new AppError('PAYMENT_MODE_CHANGED');
    const quote=await tx.selectFrom('quotes').selectAll().where('id','=',op.quote_id).executeTakeFirstOrThrow();
    await lockProducts(tx,quote);await fresh(tx,mission,op,quote,false);
    await tx.updateTable('missions').set({reserved:mission.reserved+quote.snapshot.total,pending:mission.pending+1}).where('id','=',mission.id).execute();
    for(const line of quote.snapshot.lines) await tx.updateTable('products').set({reserved:sql`reserved + ${line.quantity}`}).where('sku','=',line.sku).execute();
    await tx.updateTable('operations').set({state:'CREATING',reserved:true,phase:'create',attempted_at:stamp(),lease_until:new Date(Date.now()+60_000).toISOString(),updated_at:stamp(),reconcile_after:new Date(Date.now()+90_000).toISOString()}).where('id','=',id).execute();
    await event(tx,mission.id,id,'payment_intent','Purchase capacity reserved; creating the payment order.',{paymentMode:op.payment_mode,requestId:op.create_key,payloadHash:op.payload_hash});
    return {op,quote};
  });
  if(claimed) {
    try {
      const evidence=await payment.create(claimed.op.payload,claimed.op.create_key);
      assertOrder(evidence,claimed.quote.snapshot,id);
      await applyEvidence(ownerId,id,evidence);
    } catch(error) {await unknown(ownerId,id,error);}
  }
  return ownedOperation(ownerId,id);
}
/** No network calls inside this transaction. Terminal completion never downgrades. */
export async function applyEvidence(ownerId:string,id:string,evidence:OrderEvidence,webhook?:{id:string;type:string}) {
  return db().transaction().execute(async tx=>{
    const {mission,op}=await lockOperation(tx,ownerId,id);
    const quote=await tx.selectFrom('quotes').selectAll().where('id','=',op.quote_id).executeTakeFirstOrThrow();
    assertOrder(evidence,quote.snapshot,id,op.provider_order_id??undefined);
    if(webhook) {
      const inserted=await tx.insertInto('webhook_events').values({id:webhook.id,operation_id:id,event_type:webhook.type}).onConflict(oc=>oc.column('id').doNothing()).returning('id').executeTakeFirst();
      if(!inserted) return;
    }
    if(op.state==='COMPLETED') return;
    if(['CANCELLED','FAILED'].includes(op.state)) {
      if(evidence.status==='COMPLETED') throw new AppError('TERMINAL_STATE_CONFLICT');
      return;
    }
    const completed=evidence.status==='COMPLETED'; const voided=evidence.status==='VOIDED' && !(evidence.purchase_units[0].payments?.captures?.length);
    if((completed||voided)&&op.reserved) {
      await lockProducts(tx,quote);
      await tx.updateTable('missions').set({reserved:mission.reserved-quote.snapshot.total,pending:mission.pending-1,spent:mission.spent+(completed?quote.snapshot.total:0),purchases:mission.purchases+(completed?1:0)}).where('id','=',mission.id).execute();
      for(const line of quote.snapshot.lines) await tx.updateTable('products').set({reserved:sql`reserved - ${line.quantity}`,...(completed?{stock:sql<number>`stock - ${line.quantity}`}:{})}).where('sku','=',line.sku).execute();
      await tx.updateTable('approvals').set({status:completed?'consumed':'revoked'}).where('id','=',op.approval_id).execute();
    }
    // A capture attempt can remain ambiguous even when GET still shows APPROVED.
    const stillAmbiguous=op.phase==='capture'&&!completed&&!voided;
    await tx.updateTable('operations').set({
      state:completed?'COMPLETED':voided?'FAILED':stillAmbiguous?'UNKNOWN':'AWAITING_BUYER',
      reserved:(completed||voided)?false:op.reserved,provider_order_id:evidence.id,provider_status:evidence.status,
      provider_capture_id:completed?evidence.purchase_units[0].payments!.captures![0].id:op.provider_capture_id,
      approval_url:op.payment_mode==='sandbox'?approvalUrl(evidence):null,last_error:stillAmbiguous?'CAPTURE_REQUIRES_MANUAL_REVIEW':null,
      lease_until:null,updated_at:stamp(),reconcile_after:(completed||voided)?null:new Date(Date.now()+60_000).toISOString()
    }).where('id','=',id).execute();
    await event(tx,mission.id,id,completed?'payment_completed':'provider_checked',completed?(op.payment_mode==='sandbox'?'PayPal verified a completed sandbox capture.':'The payment simulator verified completion.'):`Provider status: ${evidence.status}.`,{providerOrderId:evidence.id,providerStatus:evidence.status,paymentMode:op.payment_mode,...(webhook?{webhookId:webhook.id}:{})});
  });
}
export async function capturePurchase(ownerId:string,id:string,payment:PaymentProvider=provider()) {
  const initial=await ownedOperation(ownerId,id);
  if(initial.state==='COMPLETED') return initial;
  if(payment.mode!==initial.payment_mode) throw new AppError('PAYMENT_MODE_CHANGED');
  if(!initial.provider_order_id) throw new AppError('RECONCILE_FIRST');
  // A prior capture, including a crashed process, may only be reconciled automatically.
  if(initial.phase==='capture') return reconcileOperation(ownerId,id,payment);
  const evidence=await payment.get(initial.provider_order_id);
  const quote=await db().selectFrom('quotes').selectAll().where('id','=',initial.quote_id).executeTakeFirstOrThrow();
  assertOrder(evidence,quote.snapshot,id,initial.provider_order_id);
  if(evidence.status==='COMPLETED'){await applyEvidence(ownerId,id,evidence);return ownedOperation(ownerId,id);}
  if(evidence.status!=='APPROVED') throw new AppError('BUYER_APPROVAL_REQUIRED');
  const claimed=await db().transaction().execute(async tx=>{
    const {mission,op}=await lockOperation(tx,ownerId,id);
    if(op.state==='COMPLETED'||op.phase==='capture') return null;
    if(!op.reserved || op.state!=='AWAITING_BUYER') throw new AppError('RECONCILE_FIRST');
    await lockProducts(tx,quote);await fresh(tx,mission,op,quote,true);
    await tx.updateTable('operations').set({state:'CAPTURING',phase:'capture',attempted_at:stamp(),lease_until:new Date(Date.now()+60_000).toISOString(),updated_at:stamp(),reconcile_after:new Date(Date.now()+90_000).toISOString()}).where('id','=',id).execute();
    await event(tx,mission.id,id,'capture_intent','Buyer approval verified; requesting capture.',{requestId:op.capture_key,paymentMode:op.payment_mode});
    return op;
  });
  if(claimed) {
    try {await payment.capture(claimed.provider_order_id!,claimed.capture_key);const result=await payment.get(claimed.provider_order_id!);await applyEvidence(ownerId,id,result);}
    catch(error){await unknown(ownerId,id,error);}
  }
  return ownedOperation(ownerId,id);
}
export async function reconcileOperation(ownerId:string,id:string,payment:PaymentProvider=provider()) {
  const op=await ownedOperation(ownerId,id);
  if(op.payment_mode!==payment.mode) throw new AppError('PAYMENT_MODE_CHANGED');
  if(['COMPLETED','FAILED','CANCELLED','APPROVED'].includes(op.state)) return op;
  if(op.lease_until && Date.parse(op.lease_until)>Date.now()) return op;
  if(!op.provider_order_id) {await unknown(ownerId,id,new ProviderError('CREATE_UNKNOWN_MANUAL_REVIEW'));return ownedOperation(ownerId,id);}
  try {const result=await payment.get(op.provider_order_id);await applyEvidence(ownerId,id,result);}
  catch(error){await unknown(ownerId,id,error);}
  return ownedOperation(ownerId,id);
}
/** Safe local cancellation only before any capture intent. Buyer redirect is not cancellation evidence. */
export async function cancelPurchase(ownerId:string,id:string) {
  return db().transaction().execute(async tx=>{
    const {mission,op}=await lockOperation(tx,ownerId,id);
    if(op.state==='CANCELLED') return;
    if(op.phase==='capture'||!['APPROVED','AWAITING_BUYER'].includes(op.state)) throw new AppError('CANNOT_CANCEL_AMBIGUOUS_PAYMENT');
    const quote=await tx.selectFrom('quotes').selectAll().where('id','=',op.quote_id).executeTakeFirstOrThrow();
    if(op.reserved){
      await lockProducts(tx,quote);
      await tx.updateTable('missions').set({reserved:mission.reserved-quote.snapshot.total,pending:mission.pending-1}).where('id','=',mission.id).execute();
      for(const l of quote.snapshot.lines) await tx.updateTable('products').set({reserved:sql`reserved - ${l.quantity}`}).where('sku','=',l.sku).execute();
    }
    await tx.updateTable('operations').set({state:'CANCELLED',reserved:false,reconcile_after:null,updated_at:stamp()}).where('id','=',id).execute();
    await tx.updateTable('approvals').set({status:'revoked'}).where('id','=',op.approval_id).execute();
    await event(tx,mission.id,id,'purchase_cancelled','You cancelled execution before capture. This app will not capture the order.');
  });
}
export async function simulateBuyerApproval(ownerId:string,id:string) {
  const op=await ownedOperation(ownerId,id);
  if(op.payment_mode!=='simulated'||config().PAYMENT_MODE!=='simulated') throw new AppError('SIMULATOR_DISABLED',403);
  if(op.state!=='AWAITING_BUYER'||!op.provider_order_id) throw new AppError('BUYER_ACTION_UNAVAILABLE');
  const simulation=new SimulatedProvider();await simulation.approve(op.provider_order_id);
  await applyEvidence(ownerId,id,await simulation.get(op.provider_order_id));
  await event(db(),op.mission_id,id,'simulated_buyer_approval','Buyer approval simulated locally.',{paymentMode:'simulated'});
}
