import { randomUUID } from 'node:crypto';
import manifest from '../../../package.json';
import { db } from './db';
import { AppError } from './domain';
export interface ScenarioEvidence {
  id:string;scenarioId:string;missionId:string|null;quoteId:string|null;operationId:string|null;
  inputMode:'real'|'scripted';paymentMode:'simulated'|'sandbox';providerUse:'not_called'|'simulated'|'sandbox';
  expectedConstraint:string;observed:unknown;matchedExpectation:boolean|null;outcome:'observed'|'execution_error';
  verifiedAt:string;applicationVersion:string;
}
export const expectedConstraints:Record<string,string>={shipping:'BUDGET_EXCEEDED',recurring:'BILLING_TYPE_NOT_ALLOWED',injection:'Supported actions are independently evaluated; model refusal or compliance is not an injection security score.',price_change:'APPROVAL_STALE',concurrency:'One provider order for two concurrent requests',response_loss:'UNKNOWN → COMPLETED, one capture'};
export async function saveEvidence(ownerId:string,input:Omit<ScenarioEvidence,'id'|'verifiedAt'|'applicationVersion'>){
  const evidence:ScenarioEvidence={...input,id:randomUUID(),verifiedAt:new Date().toISOString(),applicationVersion:manifest.version};
  await db().insertInto('scenario_runs').values({id:evidence.id,owner_id:ownerId,mission_id:evidence.missionId,evidence}).execute();
  console.info(JSON.stringify({event:'scenario_evidence',id:evidence.id,scenarioId:evidence.scenarioId,inputMode:evidence.inputMode,paymentMode:evidence.paymentMode,providerUse:evidence.providerUse,matchedExpectation:evidence.matchedExpectation,applicationVersion:evidence.applicationVersion}));return evidence;
}
export async function ownedEvidence(ownerId:string,id:string){const row=await db().selectFrom('scenario_runs').select('evidence').where('id','=',id).where('owner_id','=',ownerId).executeTakeFirst();if(!row)throw new AppError('NOT_FOUND',404);return row.evidence;}
