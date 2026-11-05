'use client';
import { Check,AlertTriangle,ArrowRight,Download } from 'lucide-react';
import { decimal,type Policy,type Quote,type Decision } from '@redline/policy';
import { compareQuotes,type TermsReview } from '../lib/comparison';
import type { ScenarioEvidence } from '../lib/evidence';
const money=(value:number)=>`$${decimal(value)}`;
const title=(value:string)=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const chargeNames={subtotal:'Item subtotal',discount:'Discount',shipping:'Shipping',tax:'Sample tax',total:'Final total'};
export function RepairComparison({before,after,policy,previousDecision,decision,previousMode,mode}:{before:Quote;after:Quote;policy:Policy;previousDecision:Decision;decision:Decision;previousMode:string;mode:string}){
  const comparison=compareQuotes(before,after,policy,previousDecision,decision);
  return <section className="panel repair-comparison" aria-label="Proposal repair comparison">
    <div className="comparison-heading"><div><span className="section-kicker">THE REPAIR, WITHOUT RELAXING YOUR RULES</span><h2>{decision.allowed?'A different basket. The same boundaries.':'Replacement still needs work.'}</h2></div><span className="badge">Policy v{policy.version} {comparison.samePolicy?'unchanged':'differs'}</span></div>
    <div className="comparison-baskets">{[{label:'Rejected proposal',quote:before,mode:previousMode},{label:decision.allowed?'Allowed replacement':'Replacement proposal',quote:after,mode}].map(card=><div key={card.label}><h3>{card.label}</h3><small>Input: {card.mode}</small><ul>{card.quote.lines.map(line=><li key={line.sku}><span>{line.name}<small>Qty {line.quantity} · {line.billingType==='one_time'?'One-time':'Recurring'}</small></span><strong>{money(line.unitPrice*line.quantity)}</strong></li>)}</ul></div>)}</div>
    <table className="comparison-table"><caption>Authoritative quote charges, USD</caption><thead><tr><th scope="col">Charge</th><th scope="col">Rejected</th><th scope="col">Replacement</th></tr></thead><tbody>{comparison.charges.map(row=><tr key={row.field}><th scope="row">{chargeNames[row.field]}</th><td>{money(row.before)}</td><td>{money(row.after)}</td></tr>)}</tbody></table>
    <ul className="structured-changes">{comparison.items.map(item=><li key={item.sku}><ArrowRight size={13}/><span>{title(item.kind)}: <strong>{item.name}</strong>{item.kind==='changed'&&item.before&&item.after&&<small>{item.fields.includes('quantity')&&`Quantity ${item.before.quantity} → ${item.after.quantity}. `}{item.fields.includes('unitPrice')&&`Unit price ${money(item.before.unitPrice)} → ${money(item.after.unitPrice)}. `}{item.fields.filter(f=>f!=='quantity'&&f!=='unitPrice').join(', ')}</small>}</span></li>)}</ul>
    <div className="category-coverage">{comparison.categories.map(c=><span key={c.category}>{c.after?<Check size={14}/>:<AlertTriangle size={14}/>}Required {c.category}: {c.after?'satisfied':'missing'}</span>)}</div>
    <p className="repair-conclusion">{comparison.resolvedReasons.length?`Resolved: ${comparison.resolvedReasons.join(', ')}.`:'No prior violation has been resolved under the same policy yet.'} {decision.allowed&&comparison.samePolicy?'The server evaluated the replacement against the same confirmed policy and a fresh quote.':''}</p>
    {after.subtotal<before.subtotal&&<p className="tradeoff">Authoritative trade-off: item subtotal is {money(before.subtotal-after.subtotal)} lower. The catalogue supplies no comparative performance score; no sound-quality equivalence is claimed.</p>}
  </section>;
}
export function ApprovalChange({review,onDismiss}:{review:TermsReview;onDismiss?:()=>void}){
  return <section className="panel approval-change" role="region" aria-label="Approved terms changed"><div className="comparison-heading"><div><span className="section-kicker">REVIEW REQUIRED</span><h2>Previous approval is no longer valid.</h2></div>{onDismiss&&<button onClick={onDismiss} className="text-button">Dismiss</button>}</div>
    <p>You reviewed <strong>{money(review.reviewed.total)}</strong>. The current authoritative total is <strong>{money(review.current.total)}</strong>.</p>
    <ul className="structured-changes">{review.comparison.items.map(item=><li key={item.sku}><AlertTriangle size={14}/><span>{item.name}: {item.before&&item.after&&item.fields.includes('unitPrice')?`unit price changed from ${money(item.before.unitPrice)} to ${money(item.after.unitPrice)}.`:`${item.kind}; changed facts: ${item.fields.join(', ')}.`}</span></li>)}{review.comparison.charges.filter(c=>c.before!==c.after&&c.field!=='total').map(c=><li key={c.field}>{chargeNames[c.field]} changed from {money(c.before)} to {money(c.after)}.</li>)}{review.comparison.terms.map(c=><li key={c.field}>{c.field}: {c.before} → {c.after}</li>)}</ul>
    {review.policyChanged&&<p>Policy changed from version {review.reviewedPolicyVersion} to {review.currentPolicyVersion}.</p>}{review.expired&&<p>The quote or policy has expired.</p>}
    <p>Request a fresh proposal and review it before creating a new approval. An already dispatched payment stays recorded and must be reconciled.</p><small>Checked {review.checkedAt}</small>
  </section>;
}
export function ScenarioEvidenceList({records}:{records:ScenarioEvidence[]}){
  return <section className="panel evidence-history"><div className="comparison-heading"><div><span className="section-kicker">EXECUTED SCENARIOS ONLY</span><h2>Evidence records</h2></div><span className="badge">{records.length} recorded</span></div>
    {!records.length?<p>No scenarios have been executed for this owner yet.</p>:records.map(record=><details key={record.id}><summary>{title(record.scenarioId)}<span>{record.matchedExpectation===null?'Observed':record.matchedExpectation?'Expected result verified':'Unexpected result'}</span></summary><dl><dt>Scenario / run</dt><dd>{record.scenarioId} / {record.id}</dd><dt>Input</dt><dd>{record.inputMode==='real'?'Real model':'Scripted proposal'}</dd><dt>Payments</dt><dd>{record.paymentMode} configured · provider {record.providerUse==='not_called'?'not called':record.providerUse}</dd><dt>Expected constraint</dt><dd>{record.expectedConstraint}</dd><dt>Observed result</dt><dd><pre>{JSON.stringify(record.observed,null,2)}</pre></dd><dt>Verified / application</dt><dd>{record.verifiedAt} · v{record.applicationVersion}</dd></dl><a className="text-button" href={`/api/evidence/${record.id}`}><Download size={14}/>Download evidence record</a></details>)}
    <p className="evidence-note">These are individual observations, not an injection-blocking rate. REDLINE validates supported actions independently of whether a model follows or ignores malicious text.</p>
  </section>;
}
export function HostContractExample(){return <section className="panel host-example"><span className="section-kicker">COMPLETE HOST CONTRACT · EXISTING SERVER SERVICES</span><h2>Evaluation is one boundary. Execution supplies the rest.</h2><pre><code>{`// examples/host-integration.ts — never expose this to the model
const proposal = await proposeForReview(owner, missionId, items);
// Merchant adapter resolves prices; pure SDK evaluates the quote.

// Only after the authenticated user reviews this exact snapshot:
const order = await approveReviewedPurchase(owner, {
  quoteId: proposal.quote.id,
  policyHash: proposal.decision.policyHash,
  quoteHash: proposal.decision.quoteHash
});
// PostgreSQL reserves capacity; protected service creates the order.

// After separate PayPal buyer approval:
await finishApprovedCheckout(owner, order.id);
// Or retrieve the same order when the outcome is uncertain:
await recoverPurchase(owner, order.id);`}</code></pre><p>The merchant adapter supplies product facts. The SDK supplies deterministic checks. The authenticated approval route supplies user intent. PostgreSQL and the protected payment service supply concurrency and durable execution. PayPal supplies payment evidence.</p></section>;}
