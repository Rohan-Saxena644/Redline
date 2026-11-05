import { z } from 'zod';
import { handler, authenticated, sameOrigin, jsonBody, limit } from '../../../lib/http';
import { policyInput, createMission, recordProposal,reviseMission } from '../../../lib/domain';
import { proposalSchema } from '../../../lib/catalog';
import { runAgent } from '../../../lib/agent';
import { approveBasket, executePurchase, capturePurchase, reconcileOperation, simulateBuyerApproval, cancelPurchase } from '../../../lib/payments';
import { replay } from '../../../lib/receipts';
import { runLab, scenarios } from '../../../lib/lab';
const id=z.uuid();
const action=z.discriminatedUnion('action',[
  z.strictObject({action:z.literal('mission.create'),input:policyInput}),
  z.strictObject({action:z.literal('mission.revise'),missionId:id,expectedPolicyHash:z.string().regex(/^[a-f0-9]{64}$/),input:policyInput}),
  z.strictObject({action:z.literal('agent.run'),missionId:id,replan:z.boolean().default(false)}),
  z.strictObject({action:z.literal('quote.propose'),missionId:id,proposal:proposalSchema}),
  z.strictObject({action:z.literal('basket.approve'),quoteId:id,policyHash:z.string().regex(/^[a-f0-9]{64}$/),quoteHash:z.string().regex(/^[a-f0-9]{64}$/)}),
  ...(['payment.execute','payment.capture','payment.reconcile','payment.simulateBuyer','payment.cancel'] as const).map(a=>z.strictObject({action:z.literal(a),operationId:id})),
  z.strictObject({action:z.literal('receipt.replay'),quoteId:id}),
  z.strictObject({action:z.literal('lab.run'),scenario:z.enum(scenarios),realModel:z.boolean().default(false)})
]);
export const runtime='nodejs';
export const maxDuration=180;
export const POST=handler(async request=>{
  sameOrigin(request);const owner=await authenticated(request);await limit(owner);
  const input=action.parse(await jsonBody(request));let result:unknown;
  switch(input.action){
    case 'mission.create':result=await createMission(owner,input.input);break;
    case 'mission.revise':result=await reviseMission(owner,input.missionId,input.expectedPolicyHash,input.input);break;
    case 'agent.run':await limit(`model:${owner}`,5);result=await runAgent(owner,input.missionId,input.replan);break;
    case 'quote.propose':result=await recordProposal(owner,input.missionId,input.proposal,'scripted');break;
    case 'basket.approve':result=await approveBasket(owner,input.quoteId,{policyHash:input.policyHash,quoteHash:input.quoteHash});break;
    case 'payment.execute':result=await executePurchase(owner,input.operationId);break;
    case 'payment.capture':result=await capturePurchase(owner,input.operationId);break;
    case 'payment.reconcile':result=await reconcileOperation(owner,input.operationId);break;
    case 'payment.simulateBuyer':await simulateBuyerApproval(owner,input.operationId);result={simulated:true};break;
    case 'payment.cancel':await cancelPurchase(owner,input.operationId);result={cancelled:true};break;
    case 'receipt.replay':result=await replay(owner,input.quoteId);break;
    case 'lab.run':await limit(`lab:${owner}`,10);result=await runLab(owner,input.scenario,input.realModel);break;
  }
  // Never return operation payloads, idempotency keys, or internal ownership/session data to shoppers.
  if(input.action.startsWith('payment.')&&result&&typeof result==='object'&&'state' in result){const r=result as {id:string;state:string};return Response.json({id:r.id,state:r.state});}
  return Response.json(result??{});
});
