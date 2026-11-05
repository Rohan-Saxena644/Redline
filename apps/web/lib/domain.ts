import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { evaluate, hash, type Policy, type ExecutionContext, type Proposal } from '@redline/policy';
import { db, type Connection } from './db';
import { merchantId, config } from './config';
import { makeQuote } from './catalog';
export class AppError extends Error { constructor(public code:string,public status=409,public details?:Record<string,unknown>){super(code);this.name='AppError';} }
export const policyInput=z.strictObject({
  mission:z.string().trim().min(10).max(2000), maxTotal:z.number().int().min(1).max(100_000_000), maxPurchases:z.number().int().min(1).max(10).default(1),
  maxQuantity:z.number().int().min(1).max(10).default(1), requiredCategories:z.array(z.enum(['microphone','headphones','accessory'])).min(1).max(3),
  allowedProductIds:z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(30).nullable().default(null),
  expiresAt:z.string().datetime().refine(v=>Date.parse(v)>Date.now()&&Date.parse(v)<=Date.now()+24*60*60_000,'Expiry must be within 24 hours')
});
export async function createMission(ownerId:string,input:unknown) {
  const data=policyInput.parse(input);const id=randomUUID();
  const policy:Policy={id:randomUUID(),version:1,ownerId,currency:'USD',maxTotal:data.maxTotal,maxPurchases:data.maxPurchases,requiredCategories:[...new Set(data.requiredCategories)],merchantId,maxQuantity:data.maxQuantity,allowedProductIds:data.allowedProductIds,billingType:'one_time',expiresAt:data.expiresAt};
  await db().insertInto('missions').values({id,owner_id:ownerId,mission:data.mission,policy}).execute();
  await event(db(),id,null,'policy_confirmed','You confirmed the spending rules.',{policyHash:hash(policy),aiMode:config().AI_MODE,paymentMode:config().PAYMENT_MODE});
  return ownedMission(ownerId,id);
}
export async function ownedMission(ownerId:string,id:string,connection:Connection=db()) {
  const mission=await connection.selectFrom('missions').selectAll().where('id','=',id).where('owner_id','=',ownerId).executeTakeFirst();
  if(!mission) throw new AppError('NOT_FOUND',404);return mission;
}
/** Explicit user reconfirmation only. Ledger counters survive every version. */
export async function reviseMission(ownerId:string,id:string,expectedPolicyHash:string,input:unknown){
  const data=policyInput.parse(input);
  return db().transaction().execute(async tx=>{
    const mission=await tx.selectFrom('missions').selectAll().where('id','=',id).where('owner_id','=',ownerId).forUpdate().executeTakeFirst();
    if(!mission)throw new AppError('NOT_FOUND',404);
    if(hash(mission.policy)!==expectedPolicyHash)throw new AppError('POLICY_VERSION_CHANGED');
    if(mission.pending||mission.reserved)throw new AppError('POLICY_REVISION_REQUIRES_RESOLUTION');
    if(mission.policy.version>=100)throw new AppError('POLICY_VERSION_LIMIT');
    const policy:Policy={...mission.policy,version:mission.policy.version+1,maxTotal:data.maxTotal,maxPurchases:data.maxPurchases,maxQuantity:data.maxQuantity,requiredCategories:[...new Set(data.requiredCategories)],allowedProductIds:data.allowedProductIds,expiresAt:data.expiresAt};
    await tx.updateTable('approvals').set({status:'revoked'}).where('mission_id','=',id).where('status','=','active').execute();
    await tx.updateTable('operations').set({state:'CANCELLED',updated_at:new Date().toISOString(),last_error:'POLICY_VERSION_CHANGED'}).where('mission_id','=',id).where('state','=','APPROVED').execute();
    await tx.updateTable('missions').set({policy,mission:data.mission}).where('id','=',id).execute();
    await event(tx,id,null,'policy_revised','You confirmed a new policy version. Prior active approvals are revoked; spent capacity is preserved.',{previousPolicyHash:expectedPolicyHash,policyHash:hash(policy),policyVersion:policy.version});
    return {id,policy};
  });
}
export function executionContext(mission:{owner_id:string;spent:number;reserved:number;purchases:number;pending:number},now=new Date().toISOString()):ExecutionContext {
  return {now,ownerId:mission.owner_id,spent:mission.spent,reserved:mission.reserved,purchases:mission.purchases,pendingPurchases:mission.pending};
}
export async function event(connection:Connection,missionId:string,operationId:string|null,kind:string,message:string,data:Record<string,unknown>={}) {
  await connection.insertInto('events').values({mission_id:missionId,operation_id:operationId,kind,message,data}).execute();
}
export async function recordProposal(ownerId:string,missionId:string,proposal:Proposal,aiMode:'fixture'|'real'|'scripted',options:{expectedPolicyHash?:string;replacesQuoteId?:string|null}={}) {
  return db().transaction().execute(async tx=>{
    const mission=await tx.selectFrom('missions').selectAll().where('id','=',missionId).where('owner_id','=',ownerId).forUpdate().executeTakeFirst();
    if(!mission)throw new AppError('NOT_FOUND',404);
    if(options.expectedPolicyHash&&hash(mission.policy)!==options.expectedPolicyHash)throw new AppError('POLICY_VERSION_CHANGED');
    if(options.replacesQuoteId){const previous=await tx.selectFrom('quotes').selectAll().where('id','=',options.replacesQuoteId).where('owner_id','=',ownerId).where('mission_id','=',missionId).executeTakeFirst();if(!previous||previous.decision.policyHash!==hash(mission.policy))throw new AppError('REPAIR_POLICY_CHANGED');}
    const quote=await makeQuote(proposal,tx,{ownerId}),context=executionContext(mission),decision=evaluate(mission.policy,quote,context);
    await tx.insertInto('quotes').values({id:quote.id,mission_id:missionId,owner_id:ownerId,policy_snapshot:mission.policy,snapshot:quote,proposal,decision,context,ai_mode:aiMode,payment_mode:config().PAYMENT_MODE,replaces_quote_id:options.replacesQuoteId??null}).execute();
    await event(tx,missionId,null,decision.allowed?'proposal_allowed':'proposal_blocked',decision.allowed?'The basket meets your confirmed rules.':`Proposal blocked: ${decision.reasons.join(', ')}.`,{quoteId:quote.id,reasons:decision.reasons,aiMode,replacesQuoteId:options.replacesQuoteId??null,policyHash:hash(mission.policy)});
    return {quote,decision,proposal};
  });
}
export async function missionView(ownerId:string,id:string) {
  const mission=await ownedMission(ownerId,id);
  const [quotes,operations,events]=await Promise.all([
    db().selectFrom('quotes').selectAll().where('mission_id','=',id).where('owner_id','=',ownerId).orderBy('created_at').execute(),
    db().selectFrom('operations').select(['id','quote_id','approval_id','state','payment_mode','provider_order_id','provider_capture_id','provider_status','approval_url','last_error','updated_at','reserved']).where('mission_id','=',id).where('owner_id','=',ownerId).orderBy('created_at').execute(),
    db().selectFrom('events').selectAll().where('mission_id','=',id).orderBy('id').execute()
  ]);
  return {mission,quotes,operations,events};
}
