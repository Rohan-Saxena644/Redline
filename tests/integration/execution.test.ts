import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sql } from 'kysely';
import { migrate } from '../../scripts/migrate';
import { seed } from '../../scripts/seed';
import { db,closeDb } from '../../apps/web/lib/db';
import { createMission,recordProposal,ownedMission,missionView } from '../../apps/web/lib/domain';
import { approveBasket,executePurchase,capturePurchase,reconcileOperation,simulateBuyerApproval,applyEvidence,cancelPurchase,ownedOperation } from '../../apps/web/lib/payments';
import { SimulatedProvider } from '../../apps/web/lib/simulator';
import { receipt,replay } from '../../apps/web/lib/receipts';
import { runLab } from '../../apps/web/lib/lab';
import { processWebhook } from '../../apps/web/lib/webhooks';
import { runAgent,CompatibleModel,ModelError } from '../../apps/web/lib/agent';
import { hash, type Quote,type Policy } from '@redline/policy';
import { ProviderError,type PaymentProvider } from '@redline/paypal';
beforeAll(async()=>{await migrate();await seed();});
afterAll(closeDb);
beforeEach(async()=>{await sql`TRUNCATE TABLE missions, simulated_orders, sessions, rate_limits CASCADE`.execute(db());await db().deleteFrom('products').where('lab_owner_id','is not',null).execute();});
async function prepared(options:{maxTotal?:number;maxPurchases?:number}={}) {
  const owner=randomUUID();const mission=await createMission(owner,{mission:'Buy one microphone and headphones for streaming.',maxTotal:options.maxTotal??15000,maxPurchases:options.maxPurchases??1,maxQuantity:1,requiredCategories:['microphone','headphones'],expiresAt:new Date(Date.now()+3600_000).toISOString()});
  const mic=`lab-${randomUUID()}`,hp=`lab-${randomUUID()}`;
  for(const [sku,category,price] of [[mic,'microphone',5900],[hp,'headphones',4900]] as const)await db().insertInto('products').values({sku,category,price,name:category,description:'isolated test product',billing_type:'one_time',stock:10,tone:'sage',lab_owner_id:owner}).execute();
  const proposal={items:[{sku:mic,quantity:1},{sku:hp,quantity:1}]};const record=await recordProposal(owner,mission.id,proposal,'scripted');
  const approval=await approveBasket(owner,record.quote.id);return {owner,mission,proposal,record,...approval};
}
describe('real PostgreSQL transactions and payment orchestration (simulated provider)',()=>{
  it('creates, separately approves buyer action, captures and settles exactly once locally',async()=>{
    const p=await prepared();const created=await executePurchase(p.owner,p.operationId);expect(created.state).toBe('AWAITING_BUYER');
    await expect(capturePurchase(p.owner,p.operationId)).rejects.toThrow('BUYER_APPROVAL_REQUIRED');
    expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(p.record.quote.total);
    await simulateBuyerApproval(p.owner,p.operationId);expect((await capturePurchase(p.owner,p.operationId)).state).toBe('COMPLETED');
    await capturePurchase(p.owner,p.operationId);const mission=await ownedMission(p.owner,p.mission.id);expect(mission.spent).toBe(12363);expect(mission.reserved).toBe(0);expect(mission.purchases).toBe(1);expect(mission.pending).toBe(0);
  });
  it('concurrent execution and repeated approval cannot create independent orders',async()=>{
    const p=await prepared();const approvals=await Promise.all(Array.from({length:4},()=>approveBasket(p.owner,p.record.quote.id)));expect(new Set(approvals.map(a=>a.operationId)).size).toBe(1);
    await Promise.all(Array.from({length:8},()=>executePurchase(p.owner,p.operationId)));
    const orders=await db().selectFrom('simulated_orders').selectAll().execute();expect(orders).toHaveLength(1);expect((await ownedMission(p.owner,p.mission.id)).pending).toBe(1);
    await simulateBuyerApproval(p.owner,p.operationId);await Promise.all(Array.from({length:6},()=>capturePurchase(p.owner,p.operationId)));
    expect((await ownedMission(p.owner,p.mission.id)).purchases).toBe(1);expect((await db().selectFrom('simulated_orders').selectAll().executeTakeFirstOrThrow()).capture_count).toBe(1);
  });
  it('atomically arbitrates concurrent budget reservations across distinct approvals',async()=>{
    const p=await prepared({maxPurchases:2});const second=await recordProposal(p.owner,p.mission.id,p.proposal,'scripted');const a2=await approveBasket(p.owner,second.quote.id);
    const results=await Promise.allSettled([executePurchase(p.owner,p.operationId),executePurchase(p.owner,a2.operationId)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(12363);
  });
  it('allows multiple reservations when both cumulative budget and purchase capacity fit',async()=>{
    const p=await prepared({maxTotal:30000,maxPurchases:2});const r2=await recordProposal(p.owner,p.mission.id,p.proposal,'scripted');const a2=await approveBasket(p.owner,r2.quote.id);
    await Promise.all([executePurchase(p.owner,p.operationId),executePurchase(p.owner,a2.operationId)]);expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(24726);
  });
  it('does not reset spent capacity through proposals or approval replay',async()=>{
    const p=await prepared();await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);await capturePurchase(p.owner,p.operationId);
    const next=await recordProposal(p.owner,p.mission.id,p.proposal,'scripted');expect(next.decision.reasons).toEqual(expect.arrayContaining(['BUDGET_EXCEEDED','PURCHASE_LIMIT_REACHED']));await expect(approveBasket(p.owner,next.quote.id)).rejects.toThrow();expect((await approveBasket(p.owner,p.record.quote.id)).operationId).toBe(p.operationId);
  });
  it('rejects cross-user missions, quotes, approvals, operations and receipts',async()=>{
    const p=await prepared();const other=randomUUID();for(const call of [()=>ownedMission(other,p.mission.id),()=>missionView(other,p.mission.id),()=>approveBasket(other,p.record.quote.id),()=>executePurchase(other,p.operationId),()=>capturePurchase(other,p.operationId),()=>receipt(other,p.record.quote.id),()=>replay(other,p.record.quote.id)])await expect(call()).rejects.toThrow('NOT_FOUND');
  });
  it.each(['price','billing_type','category','version','stock','name'] as const)('rejects product %s changes after exact approval',async field=>{
    const p=await prepared();const changes={price:6000,billing_type:'recurring',category:'accessory',version:2,stock:0,name:'changed'} as const;
    await db().updateTable('products').set({[field]:changes[field]}).where('sku','=',p.proposal.items[0].sku).execute();await expect(executePurchase(p.owner,p.operationId)).rejects.toThrow('APPROVAL_STALE');expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(0);
  });
  it.each(['total','shipping','tax','discount','merchantId','payeeId','currency','lines'] as const)('rejects quote %s mutation after approval',async field=>{
    const p=await prepared();const q=structuredClone(p.record.quote);const changes={total:q.total+1,shipping:q.shipping+1,tax:q.tax+1,discount:1,merchantId:'OTHER',payeeId:'OTHER',currency:'EUR',lines:q.lines.map((l,i)=>i===0?{...l,quantity:2}:l)};
    const tampered={...q,[field]:changes[field]} as Quote;await db().updateTable('quotes').set({snapshot:tampered}).where('id','=',q.id).execute();await expect(executePurchase(p.owner,p.operationId)).rejects.toThrow('APPROVAL_STALE');
  });
  it('rejects confirmed policy mutation and preserves recorded decision snapshot',async()=>{
    const p=await prepared();const changed={...p.mission.policy,maxTotal:20000,version:2} as Policy;await db().updateTable('missions').set({policy:changed}).where('id','=',p.mission.id).execute();await expect(executePurchase(p.owner,p.operationId)).rejects.toThrow('APPROVAL_STALE');expect((await replay(p.owner,p.record.quote.id)).matches).toBe(true);
  });
  it('revalidates product changes and expiry before capture, retaining reservation',async()=>{
    const p=await prepared();await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);await db().updateTable('products').set({price:1}).where('sku','=',p.proposal.items[0].sku).execute();await expect(capturePurchase(p.owner,p.operationId)).rejects.toThrow('APPROVAL_STALE');expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(12363);
  });
  it('deduplicates events transactionally and does not downgrade completion on delayed events',async()=>{
    const p=await prepared();const op=await executePurchase(p.owner,p.operationId);const payment=new SimulatedProvider();const stale=await payment.get(op.provider_order_id!);await simulateBuyerApproval(p.owner,p.operationId);await capturePurchase(p.owner,p.operationId);const complete=await payment.get(op.provider_order_id!);
    await Promise.all([applyEvidence(p.owner,p.operationId,complete,{id:'event1',type:'PAYMENT.CAPTURE.COMPLETED'}),applyEvidence(p.owner,p.operationId,complete,{id:'event1',type:'PAYMENT.CAPTURE.COMPLETED'})]);
    await applyEvidence(p.owner,p.operationId,stale,{id:'event2',type:'CHECKOUT.ORDER.APPROVED'});expect((await ownedOperation(p.owner,p.operationId)).state).toBe('COMPLETED');expect(await db().selectFrom('webhook_events').selectAll().execute()).toHaveLength(2);expect((await ownedMission(p.owner,p.mission.id)).purchases).toBe(1);
  });
  it('does not mark a mismatched webhook event processed',async()=>{
    const p=await prepared();const op=await executePurchase(p.owner,p.operationId);const evidence=await new SimulatedProvider().get(op.provider_order_id!);evidence.purchase_units[0].payee.merchant_id='ATTACKER';await expect(applyEvidence(p.owner,p.operationId,evidence,{id:'invalid',type:'PAYMENT.CAPTURE.COMPLETED'})).rejects.toThrow();expect(await db().selectFrom('webhook_events').selectAll().execute()).toHaveLength(0);
  });
  it('retains reservation on remote capture response loss and settles after DB connection restart',async()=>{
    const p=await prepared();const op=await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);const lost=await capturePurchase(p.owner,p.operationId,new SimulatedProvider('capture_response_loss'));expect(lost.state).toBe('UNKNOWN');expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(12363);
    await closeDb();const reconciled=await reconcileOperation(p.owner,p.operationId);expect(reconciled.state).toBe('COMPLETED');expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(0);expect((await db().selectFrom('simulated_orders').selectAll().where('id','=',op.provider_order_id!).executeTakeFirstOrThrow()).capture_count).toBe(1);
  });
  it('recovers a response-loss reservation in a separate Node process using only durable state',async()=>{
    const p=await prepared();const op=await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);await capturePurchase(p.owner,p.operationId,new SimulatedProvider('capture_response_loss'));
    const {stdout}=await promisify(execFile)(process.execPath,['--import','tsx','tests/helpers/reconcile-child.ts',p.owner,p.operationId],{env:process.env,timeout:15000});
    const result=JSON.parse(stdout.trim());expect(result.pid).not.toBe(process.pid);expect(result.state).toBe('COMPLETED');expect(result.orderId).toBe(op.provider_order_id);expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(0);expect((await db().selectFrom('simulated_orders').selectAll().where('id','=',op.provider_order_id!).executeTakeFirstOrThrow()).capture_count).toBe(1);
  });
  it('recovers a crash after remote capture but before local success recording without another mutation',async()=>{
    const p=await prepared();const op=await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);
    await db().updateTable('operations').set({state:'CAPTURING',phase:'capture',lease_until:new Date(Date.now()-1000).toISOString()}).where('id','=',p.operationId).execute();await new SimulatedProvider().capture(op.provider_order_id!,op.capture_key);await closeDb();expect((await reconcileOperation(p.owner,p.operationId)).state).toBe('COMPLETED');
  });
  it('retains unknown create intent and never creates a fresh order to resolve ambiguity',async()=>{
    const p=await prepared();const simulation=new SimulatedProvider();const fault:PaymentProvider={mode:'simulated',get:id=>simulation.get(id),capture:(id,key)=>simulation.capture(id,key),async create(payload,key){await simulation.create(payload,key);throw new ProviderError('OUTCOME_UNKNOWN');}};
    expect((await executePurchase(p.owner,p.operationId,fault)).state).toBe('UNKNOWN');await executePurchase(p.owner,p.operationId);expect((await reconcileOperation(p.owner,p.operationId)).last_error).toBe('CREATE_UNKNOWN_MANUAL_REVIEW');expect(await db().selectFrom('simulated_orders').selectAll().execute()).toHaveLength(1);expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(12363);
  });
  it('safely cancels only before capture, releases capacity, and revokes replay',async()=>{
    const p=await prepared();await executePurchase(p.owner,p.operationId);await cancelPurchase(p.owner,p.operationId);await executePurchase(p.owner,p.operationId);expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(0);expect((await ownedOperation(p.owner,p.operationId)).state).toBe('CANCELLED');
  });
  it('exports redacted replayable receipts with accurate fixture/scripted/payment provenance',async()=>{
    const p=await prepared();const r=await receipt(p.owner,p.record.quote.id);const serialized=JSON.stringify(r);for(const field of ['clientSecret','access_token','payer_id','email_address','address_line','capture_key','create_key','redline_session'])expect(serialized).not.toContain(field);expect(r.provenance).toMatchObject({ai:'scripted',payment:'simulated'});expect(r.integrity.snapshotHash).toBe(hash(r.snapshot));expect(await replay(p.owner,p.record.quote.id)).toMatchObject({matches:true,paymentActions:0});
  });
  it('rejects webhook simulator shortcuts',async()=>{await expect(processWebhook(new Headers(),{id:'fake',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'FAKE'}})).rejects.toThrow('SANDBOX_WEBHOOK_DISABLED');});
  it('expires the original quote/approval before any new capture while retaining pending capacity',async()=>{
    const p=await prepared();await executePurchase(p.owner,p.operationId);await simulateBuyerApproval(p.owner,p.operationId);
    vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(Date.now()+16*60_000));
    try{await expect(capturePurchase(p.owner,p.operationId)).rejects.toThrow('APPROVAL_STALE');expect((await ownedMission(p.owner,p.mission.id)).reserved).toBe(12363);}finally{vi.useRealTimers();}
  });
  it('rejects a changed payload before any provider mutation',async()=>{
    const p=await prepared();await db().updateTable('operations').set({payload_hash:'changed'}).where('id','=',p.operationId).execute();await expect(executePurchase(p.owner,p.operationId)).rejects.toThrow('PAYLOAD_CHANGED');expect(await db().selectFrom('simulated_orders').selectAll().execute()).toHaveLength(0);
  });
  it('recovers when create returned an order ID but subsequent retrieval failed',async()=>{
    const p=await prepared();const simulation=new SimulatedProvider();const fault:PaymentProvider={mode:'simulated',get:id=>simulation.get(id),capture:(id,key)=>simulation.capture(id,key),async create(payload,key){const order=await simulation.create(payload,key);throw new ProviderError('ORDER_RETRIEVAL_NEEDED',undefined,undefined,order.id);}};
    const unknown=await executePurchase(p.owner,p.operationId,fault);expect(unknown.provider_order_id).toBeTruthy();expect(unknown.state).toBe('UNKNOWN');expect((await reconcileOperation(p.owner,p.operationId)).state).toBe('AWAITING_BUYER');
  });
  it('rejects real webhook verification failure before processing or settling',async()=>{
    process.env.PAYMENT_MODE='sandbox';process.env.PAYPAL_CLIENT_ID='test';process.env.PAYPAL_CLIENT_SECRET='test';process.env.PAYPAL_MERCHANT_ID='TEST';process.env.PAYPAL_WEBHOOK_ID='TEST';
    const transport=vi.fn().mockResolvedValueOnce(Response.json({access_token:'fixture-token',expires_in:300})).mockResolvedValueOnce(Response.json({verification_status:'FAILURE'}));vi.stubGlobal('fetch',transport);
    const headers=new Headers({'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/TEST','paypal-transmission-id':'id','paypal-transmission-sig':'sig','paypal-transmission-time':new Date().toISOString()});
    try{await expect(processWebhook(headers,{id:'unverified',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'TEST'}})).rejects.toThrow('WEBHOOK_SIGNATURE_REJECTED');expect(await db().selectFrom('webhook_events').selectAll().execute()).toHaveLength(0);}finally{process.env.PAYMENT_MODE='simulated';vi.unstubAllGlobals();}
  });
  it('replans using actual deterministic feedback through an injected model test double',async()=>{
    const p=await prepared();process.env.AI_MODE='real';const model=new CompatibleModel();
    const invoke=vi.spyOn(model,'action').mockResolvedValueOnce({action:{action:'proposeBasket',query:null,category:null,sku:null,items:[...p.proposal.items,{sku:'stream-club',quantity:1}],explanation:'Scripted injected-instruction behavior for orchestration test'},usage:{total_tokens:10}}).mockResolvedValueOnce({action:{action:'proposeBasket',query:null,category:null,sku:null,items:p.proposal.items,explanation:'Compliant alternative'},usage:{total_tokens:12}});
    try{const result=await runAgent(p.owner,p.mission.id,false,true,model);expect(result.status).toBe('allowed');expect(invoke).toHaveBeenCalledTimes(2);const feedback=JSON.stringify(invoke.mock.calls[1][0]);expect(feedback).toContain('BILLING_TYPE_NOT_ALLOWED');const events=await db().selectFrom('events').selectAll().where('kind','=','model_request').execute();expect(events).toHaveLength(2);expect(events[1].data.usage).toMatchObject({total_tokens:12});}finally{process.env.AI_MODE='fixture';}
  });
  it('bounds malformed-output repairs without replacing failure with a fixture basket',async()=>{
    const p=await prepared();process.env.AI_MODE='real';const model=new CompatibleModel();const invoke=vi.spyOn(model,'action').mockRejectedValue(new ModelError('MODEL_ACTION_INVALID'));
    try{await expect(runAgent(p.owner,p.mission.id,false,false,model)).rejects.toThrow('MODEL_ACTION_INVALID');expect(invoke).toHaveBeenCalledTimes(2);expect(await db().selectFrom('quotes').selectAll().where('mission_id','=',p.mission.id).execute()).toHaveLength(1);}finally{process.env.AI_MODE='fixture';}
  });
  it.each(['shipping','recurring','injection','price_change','concurrency','response_loss'] as const)('runs the %s lab against actual enforcement',async scenario=>{
    const result=await runLab(randomUUID(),scenario);expect(result).toHaveProperty('missionId');expect(result.provenance).toContain('Scripted');if(scenario==='response_loss')expect(result.result).toMatchObject({afterResponseLoss:'UNKNOWN',afterReconciliation:'COMPLETED',captures:1});if(scenario==='concurrency')expect(result.result).toMatchObject({providerOrders:1,requests:2});if(scenario==='price_change')expect(result.result).toBe('APPROVAL_STALE');
  });
});
