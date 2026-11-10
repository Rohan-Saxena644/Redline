import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('fixture journey: reject, repair, exact approval, simulated checkout, receipt and payment-free replay',async({page},testInfo)=>{
  testInfo.annotations.push({type:'provenance',description:'Fixture proposals and simulated payments. This test does not verify a live model or PayPal sandbox.'});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.getByText('Payments: Simulated',{exact:true})).toBeVisible();await expect(page.getByText('Fixture proposals',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Enter local workspace'}).click();
  await page.getByRole('button',{name:'Confirm policy & start mission'}).click();
  await page.getByRole('button',{name:'Generate proposal'}).click();
  await expect(page.getByText('This proposal crossed a red line.')).toBeVisible();await expect(page.getByText('BUDGET_EXCEEDED',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve exact basket'})).toHaveCount(0);
  await expect(page.getByText('Checkout blocked before payment',{exact:true})).toBeVisible();
  const deniedState=await (await page.request.get('/api/state')).json();
  const denied=deniedState.view.quotes.at(-1);
  const refused=await page.request.post('/api/actions',{headers:{Origin:'http://localhost:3001'},data:{action:'basket.approve',quoteId:denied.id,policyHash:denied.decision.policyHash,quoteHash:denied.decision.quoteHash}});
  expect(refused.status()).toBe(409);expect((await refused.json()).error).toBe('BUDGET_EXCEEDED');
  const bypass=await page.request.post('/api/actions',{headers:{Origin:'http://localhost:3001'},data:{action:'payment.execute',operationId:denied.id}});
  expect(bypass.status()).toBe(404);
  const afterDenied=await (await page.request.get('/api/state')).json();
  expect(afterDenied.view.operations).toHaveLength(0);expect(afterDenied.view.mission.reserved).toBe(0);
  await page.getByRole('button',{name:'Find an alternative'}).click();
  await expect(page.getByText('Within your red lines.')).toBeVisible();await expect(page.getByText('$123.63',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('region',{name:'Proposal repair comparison'})).toBeVisible();
  const repairSummary=page.locator('[aria-label="Repair price summary"]');
  await expect(repairSummary).toContainText('Policy budget$150.00');
  await expect(repairSummary).toContainText('Rejected total$156.03');
  await expect(repairSummary).toContainText('Replacement total$123.63');
  await expect(page.getByText('A different basket. The same boundaries.')).toBeVisible();
  await expect(page.getByText('Policy v1 unchanged',{exact:true})).toBeVisible();
  await expect(page.getByText('Required microphone: satisfied',{exact:true})).toBeVisible();
  const comparison=page.getByRole('region',{name:'Proposal repair comparison'});
  await comparison.evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
  for(const locator of [repairSummary,comparison.locator('.comparison-baskets')]){
    const box=await locator.boundingBox();expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await page.screenshot({path:`test-results/${testInfo.project.name}-repair-focus.png`});
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`test-results/${testInfo.project.name}-workspace.png`,fullPage:true});
  await page.screenshot({path:`test-results/${testInfo.project.name}-viewport.png`});
  await page.getByRole('button',{name:'Approve exact basket'}).click();await page.getByRole('button',{name:'Create simulated order'}).click();
  await expect(page.getByText('Buyer approval needed',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Simulate buyer approval',exact:true}).click();
  await page.getByRole('button',{name:'Verify approval & capture'}).click();await expect(page.getByText('Simulated payment completed',{exact:true})).toBeVisible();
  const receiptUrl=await page.getByRole('link',{name:'Decision receipt'}).getAttribute('href');
  const response=await page.request.get(receiptUrl!);expect(response.status()).toBe(200);const receipt=await response.json();expect(receipt.provenance).toMatchObject({ai:'fixture',payment:'simulated'});expect(receipt.provider.operationState).toBe('COMPLETED');
  await page.getByRole('button',{name:'Replay decision',exact:true}).click();await expect(page.getByText('Replay matched every check. No payment action was performed.')).toBeVisible();
  await page.reload();await expect(page.getByText('Simulated payment completed',{exact:true})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);expect(overflow).toBe(false);expect(errors).toEqual([]);
});
test('explicit policy revision invalidates old-tab approval without resetting the mission',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Enter local workspace'}).click();await page.getByRole('button',{name:'Confirm policy & start mission'}).click();await page.getByRole('button',{name:'Generate proposal'}).click();await page.getByRole('button',{name:'Find an alternative'}).click();
  const state=await (await page.request.get('/api/state')).json();const old=state.view.quotes.at(-1);
  await page.getByRole('button',{name:'Edit confirmed policy'}).click();await page.getByLabel('Total budget, all charges included').fill('140.00');await page.getByRole('button',{name:'Confirm new policy version'}).click();
  await expect(page.getByText('This basket belongs to an earlier policy version. Generate a fresh proposal before approval.')).toBeVisible();await expect(page.getByRole('button',{name:'Approve exact basket'})).toHaveCount(0);
  const stale=await page.request.post('/api/actions',{headers:{Origin:'http://localhost:3001'},data:{action:'basket.approve',quoteId:old.id,policyHash:old.decision.policyHash,quoteHash:old.decision.quoteHash}});expect(stale.status()).toBe(409);expect((await stale.json()).details.termsReview.policyChanged).toBe(true);
  const current=await (await page.request.get('/api/state')).json();expect(current.view.mission.id).toBe(state.view.mission.id);expect(current.view.mission.policy.version).toBe(2);expect(current.view.mission.spent).toBe(0);
});
test('price-change scenario exposes exact approved/current terms and downloadable evidence',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Enter local workspace'}).click();await page.getByRole('button',{name:'Adversarial lab'}).click();await expect(page.getByText('No scenarios have been executed for this owner yet.')).toBeVisible();
  await page.getByRole('article').filter({hasText:'The moving price tag'}).getByRole('button',{name:'Run test'}).click();
  await expect(page.getByRole('heading',{name:'Previous approval is no longer valid.'})).toBeVisible();await expect(page.getByText(/unit price changed from/)).toBeVisible();
  await expect(page.getByText('Checkout blocked before payment',{exact:true})).toBeVisible();
  const download=page.getByRole('link',{name:'Download evidence record'});await page.locator('.evidence-history summary').click();await expect(download).toBeVisible();
  const evidence=await (await page.request.get((await download.getAttribute('href'))!)).json();expect(evidence).toMatchObject({scenarioId:'price_change',inputMode:'scripted',providerUse:'not_called',matchedExpectation:true});expect(evidence.observed.termsReview.current.total).toBe(12471);expect(evidence.observed.termsReview.reviewed.total).toBe(12363);
  await page.reload();await page.getByRole('button',{name:'Adversarial lab'}).click();await expect(page.getByText('Evidence records',{exact:true})).toBeVisible();await expect(page.getByText('Expected result verified',{exact:true})).toBeVisible();
});
test('fixture lab reports capture response loss honestly',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Enter local workspace'}).click();await page.getByRole('button',{name:'Adversarial lab'}).click();
  await page.getByRole('article').filter({hasText:'Paid, but did we hear it?'}).getByRole('button',{name:'Run test'}).click();
  await expect(page.locator('.lab-results .result-json').getByText('"afterResponseLoss": "UNKNOWN"',{exact:false})).toBeVisible();await expect(page.locator('.lab-results .result-json').getByText('"afterReconciliation": "COMPLETED"',{exact:false})).toBeVisible();await expect(page.getByText('Scripted adversarial proposal; PostgreSQL; simulated payment provider where execution is needed.')).toBeVisible();
});
test('HTTP boundaries reject cross-origin, oversize, unowned resources and fake webhooks',async({request})=>{
  expect((await request.post('/api/session',{headers:{Origin:'https://attacker.test'},data:{}})).status()).toBe(403);
  expect((await request.post('/api/session',{headers:{Origin:'http://localhost:3001'},data:{}})).status()).toBe(200);
  expect((await request.post('/api/actions',{headers:{Origin:'https://attacker.test'},data:{action:'payment.execute',operationId:'11111111-1111-4111-8111-111111111111'}})).status()).toBe(403);
  expect((await request.post('/api/actions',{headers:{Origin:'http://localhost:3001'},data:{padding:'x'.repeat(40000)}})).status()).toBe(413);
  expect((await request.get('/api/receipt/11111111-1111-4111-8111-111111111111')).status()).toBe(404);
  expect((await request.post('/api/paypal/webhook',{data:{id:'fake',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'FAKE'}}})).status()).toBe(403);
});
test('welcome, policy editor, lab and developer views meet automated accessibility checks',async({page})=>{
  const check=async()=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);};
  await page.goto('/');await expect(page.getByRole('button',{name:'Enter local workspace'})).toBeEnabled();await check();
  await page.getByRole('button',{name:'Enter local workspace'}).click();await expect(page.getByRole('button',{name:'Confirm policy & start mission'})).toBeVisible();await check();
  await page.getByRole('button',{name:'Adversarial lab'}).click();await expect(page.getByText('The hidden last mile')).toBeVisible();await check();
  await page.getByRole('button',{name:'Developer kit'}).click();await expect(page.getByText('A decision is a pure function.')).toBeVisible();await check();
});
