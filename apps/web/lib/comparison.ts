import { hash, type Policy, type Quote, type QuoteLine, type Decision } from '@redline/policy';

export const chargeFields=['subtotal','discount','shipping','tax','total'] as const;
const productFields=['quantity','unitPrice','billingType','category','available','known','productVersion','name'] as const;
/** Comparisons use structured merchant facts, never model-authored explanations. */
export function compareQuotes(before:Quote,after:Quote,policy:Policy,previous?:Decision,next?:Decision) {
  const skus=[...new Set([...before.lines,...after.lines].map(l=>l.sku))].sort();
  const items=skus.flatMap(sku=>{
    const a=before.lines.find(l=>l.sku===sku)??null,b=after.lines.find(l=>l.sku===sku)??null;
    const fields=productFields.filter(f=>a?.[f]!==b?.[f]);
    if(a&&b&&!fields.length)return [];
    return [{sku,name:b?.name??a!.name,kind:!a?'added' as const:!b?'removed' as const:'changed' as const,before:a,after:b,fields}];
  });
  const samePolicy=!!previous&&!!next&&previous.policyHash===next.policyHash;
  return {
    items,charges:chargeFields.map(field=>({field,before:before[field],after:after[field]})),
    terms:(['merchantId','payeeId','currency','rulesVersion'] as const).filter(field=>before[field]!==after[field]).map(field=>({field,before:before[field],after:after[field]})),
    categories:policy.requiredCategories.map(category=>({category,before:before.lines.some(l=>l.known&&l.category===category),after:after.lines.some(l=>l.known&&l.category===category)})),
    samePolicy,resolvedReasons:samePolicy?previous!.reasons.filter(code=>!next!.reasons.includes(code)):[],
    lowerPricedItems:items.filter(i=>i.before&&i.after&&i.after.unitPrice<i.before.unitPrice).map(i=>i.sku)
  };
}
export type QuoteComparison=ReturnType<typeof compareQuotes>;
export function reviewTerms(beforePolicy:Policy,currentPolicy:Policy,before:Quote,current:Quote,now=new Date().toISOString()) {
  const policyChanged=hash(beforePolicy)!==hash(currentPolicy);
  const comparison=compareQuotes(before,current,currentPolicy);
  const expired=Date.parse(now)>=Math.min(Date.parse(before.expiresAt),Date.parse(currentPolicy.expiresAt));
  const changed=policyChanged||comparison.items.length>0||comparison.terms.length>0||comparison.charges.some(c=>c.before!==c.after);
  return {reviewed:before,current,comparison,policyChanged,reviewedPolicyVersion:beforePolicy.version,currentPolicyVersion:currentPolicy.version,expired,valid:!changed&&!expired,checkedAt:now};
}
export type TermsReview=ReturnType<typeof reviewTerms>;
export function describeLine(line:QuoteLine|null){return line?{sku:line.sku,quantity:line.quantity,unitPrice:line.unitPrice,billingType:line.billingType}:null;}
