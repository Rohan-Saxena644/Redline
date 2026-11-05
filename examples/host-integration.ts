/** A thin usage example of the existing reference host, not another execution framework.
 * The caller must obtain owner from its authenticated session; never trust a body field.
 * Keep each stage in its own corresponding authenticated route/user interaction.
 */
import type { Proposal } from '@redline/policy';
import { recordProposal } from '../apps/web/lib/domain';
import { approveBasket,executePurchase,capturePurchase,reconcileOperation } from '../apps/web/lib/payments';

export async function proposeForReview(owner:string,missionId:string,items:Proposal['items']){
  // recordProposal resolves current authoritative merchant data and calls the pure evaluator.
  // "scripted" labels this host/user-supplied example; a real model uses the bounded agent.
  return recordProposal(owner,missionId,{items},'scripted');
}
export async function approveReviewedPurchase(owner:string,review:{quoteId:string;policyHash:string;quoteHash:string}){
  // Call only after explicit user review/approval, under the host's origin/session protections.
  // The persisted opaque approval binds the quote/policy and one operation.
  const approval=await approveBasket(owner,review.quoteId,review);
  return executePurchase(owner,approval.operationId);
}
export async function finishApprovedCheckout(owner:string,operationId:string){
  // A browser redirect alone cannot authorize capture. This service retrieves PayPal evidence,
  // checks ownership, payee/amount/items, revalidates policy/approval, then captures durably.
  return capturePurchase(owner,operationId);
}
export async function recoverPurchase(owner:string,operationId:string){
  // Read/reconcile the existing operation; never create a replacement payment on a timeout.
  return reconcileOperation(owner,operationId);
}
