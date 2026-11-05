import {it,expect} from 'vitest';
import {evaluate} from '@redline/policy';
import {compareQuotes,reviewTerms} from '../apps/web/lib/comparison';
import {snapshot} from './fixtures';
it('reports structured substitutions, quantities, charges and category preservation',()=>{
  const {policy,quote,context}=snapshot(),before=structuredClone(quote),after=structuredClone(quote);
  before.lines[0].unitPrice+=3000;before.subtotal+=3000;before.total+=3000;
  after.lines[0].sku='alternative-mic';after.lines[0].name='Alternative microphone';
  const result=compareQuotes(before,after,policy,evaluate(policy,before,context),evaluate(policy,after,context));
  expect(result.items.map(i=>i.kind)).toEqual(expect.arrayContaining(['added','removed']));expect(result.resolvedReasons).toContain('BUDGET_EXCEEDED');expect(result.categories.every(c=>c.after)).toBe(true);expect(result.charges.find(c=>c.field==='total')).toMatchObject({before:15363,after:12363});
  after.lines[1].quantity=2;expect(compareQuotes(quote,after,policy).items.find(i=>i.sku==='hp')?.fields).toContain('quantity');
});
it('never describes a violation as repaired by changing policy',()=>{const {policy,quote,context}=snapshot(),d=evaluate(policy,quote,context);expect(compareQuotes(quote,quote,policy,{...d,reasons:['BUDGET_EXCEEDED']},{...d,policyHash:'other'}).resolvedReasons).toEqual([]);expect(reviewTerms(policy,{...policy,version:2},quote,quote,context.now)).toMatchObject({valid:false,policyChanged:true});});
it('compares approved unit prices and total exactly and marks expiry',()=>{const {policy,quote,context}=snapshot(),current=structuredClone(quote);current.lines[0].unitPrice+=100;current.subtotal+=100;current.total+=108;current.tax+=8;const r=reviewTerms(policy,policy,quote,current,context.now);expect(r.valid).toBe(false);expect(r.comparison.items[0].fields).toContain('unitPrice');expect(r.reviewed.total).toBe(12363);expect(r.current.total).toBe(12471);expect(reviewTerms(policy,policy,quote,quote,quote.expiresAt).expired).toBe(true);});
