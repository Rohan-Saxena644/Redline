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
  await page.getByRole('button',{name:'Find an alternative'}).click();
  await expect(page.getByText('Within your red lines.')).toBeVisible();await expect(page.getByText('$123.63',{exact:true}).first()).toBeVisible();
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
test('fixture lab reports capture response loss honestly',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Enter local workspace'}).click();await page.getByRole('button',{name:'Adversarial lab'}).click();
  await page.getByRole('article').filter({hasText:'Paid, but did we hear it?'}).getByRole('button',{name:'Run test'}).click();
  await expect(page.getByText('"afterResponseLoss": "UNKNOWN"',{exact:false})).toBeVisible();await expect(page.getByText('"afterReconciliation": "COMPLETED"',{exact:false})).toBeVisible();await expect(page.getByText('Scripted adversarial proposal; PostgreSQL; simulated payment provider where execution is needed.')).toBeVisible();
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
