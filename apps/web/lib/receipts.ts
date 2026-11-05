import { canonical, evaluate, EVALUATOR_VERSION, hash } from '@redline/policy';
import { db } from './db';
import { AppError, ownedMission } from './domain';
import { compareQuotes } from './comparison';
/** Explicit field selection, not recursive secret-name filtering. No raw provider responses. */
export async function receipt(ownerId:string,quoteId:string) {
  const row=await db().selectFrom('quotes').selectAll().where('id','=',quoteId).where('owner_id','=',ownerId).executeTakeFirst();
  if(!row) throw new AppError('NOT_FOUND',404);
  const mission=await ownedMission(ownerId,row.mission_id);
  const op=await db().selectFrom('operations').selectAll().where('quote_id','=',quoteId).where('owner_id','=',ownerId).executeTakeFirst();
  const approval=op?await db().selectFrom('approvals').selectAll().where('id','=',op.approval_id).executeTakeFirst():null;
  const events=await db().selectFrom('events').select(['kind','message','data','created_at']).where('mission_id','=',mission.id).orderBy('id').execute();
  // Policy snapshot at decision time is stored independently of mutable mission state.
  const policy=row.policy_snapshot;
  if(hash(policy)!==row.decision.policyHash) throw new AppError('POLICY_SNAPSHOT_MISMATCH');
  const snapshot={policy,quote:row.snapshot,context:row.context};
  const previous=row.replaces_quote_id?await db().selectFrom('quotes').selectAll().where('id','=',row.replaces_quote_id).where('owner_id','=',ownerId).executeTakeFirst():null;
  const scenarioEvidence=await db().selectFrom('scenario_runs').select('evidence').where('mission_id','=',mission.id).where('owner_id','=',ownerId).orderBy('created_at').execute();
  return {
    format:'redline-receipt/1',missionId:mission.id,operationId:op?.id??null,createdAt:row.created_at,
    provenance:{ai:row.ai_mode,payment:row.payment_mode,catalogue:'seeded merchant adapter',tax:'sample studio-usd/1'},
    evaluatorVersion:row.decision.evaluatorVersion,confirmedPolicyVersion:policy.version,snapshot,proposal:row.proposal,decision:row.decision,
    repair:previous?{previousQuoteId:previous.id,previousProvenance:previous.ai_mode,comparison:compareQuotes(previous.snapshot,row.snapshot,policy,previous.decision,row.decision)}:null,
    scenarioEvidence:scenarioEvidence.map(r=>r.evidence),
    approval:approval?{reference:approval.id,bindingHash:hash(approval.binding),lifecycle:approval.status,expiresAt:approval.binding.expiresAt,createdAt:approval.created_at}:null,
    provider:op?{mode:op.payment_mode,orderId:op.provider_order_id,captureId:op.provider_capture_id,status:op.provider_status,operationState:op.state,payloadHash:op.payload_hash,lastError:op.last_error}:null,
    events,integrity:{snapshotHash:hash(snapshot),signed:false,note:'A hash detects accidental differences; receipts and application logs are not tamper-proof.'}
  };
}
export async function replay(ownerId:string,quoteId:string) {
  const r=await receipt(ownerId,quoteId);
  if(r.evaluatorVersion!==EVALUATOR_VERSION) throw new AppError('EVALUATOR_VERSION_UNAVAILABLE');
  const decision=evaluate(r.snapshot.policy,r.snapshot.quote,r.snapshot.context);
  return {matches:canonical(decision)===canonical(r.decision),decision,paymentActions:0,evaluatorVersion:EVALUATOR_VERSION};
}
