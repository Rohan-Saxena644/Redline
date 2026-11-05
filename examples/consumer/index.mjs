import { evaluate, decimal } from '@redline/policy';
const policy={id:'streaming',version:1,ownerId:'local-user',currency:'USD',maxTotal:15000,maxPurchases:1,requiredCategories:['microphone','headphones'],merchantId:'sample-shop',maxQuantity:1,allowedProductIds:null,billingType:'one_time',expiresAt:'2027-01-01T00:00:00.000Z'};
const quote={id:'quote-1',version:1,merchantId:'sample-shop',payeeId:'sample-payee',currency:'USD',lines:[
  {sku:'mic',name:'Sample microphone',quantity:1,unitPrice:7900,category:'microphone',billingType:'one_time',available:true,known:true,productVersion:1},
  {sku:'hp',name:'Sample headphones',quantity:1,unitPrice:5900,category:'headphones',billingType:'one_time',available:true,known:true,productVersion:1}
],subtotal:13800,discount:0,shipping:699,tax:1104,total:15603,rulesVersion:'sample/1',expiresAt:'2026-11-05T13:00:00.000Z'};
const decision=evaluate(policy,quote,{ownerId:'local-user',now:'2026-11-05T12:00:00.000Z',spent:0,reserved:0,purchases:0,pendingPurchases:0});
if(decision.allowed||!decision.reasons.includes('BUDGET_EXCEEDED'))throw new Error('Expected a reproducible budget rejection');
console.log(JSON.stringify({total:decimal(quote.total),allowed:decision.allowed,reasons:decision.reasons,evaluatorVersion:decision.evaluatorVersion}));
const replay=evaluate(policy,quote,{ownerId:'local-user',now:'2026-11-05T12:00:00.000Z',spent:0,reserved:0,purchases:0,pendingPurchases:0});
if(JSON.stringify(decision)!==JSON.stringify(replay))throw new Error('Replay mismatch');
