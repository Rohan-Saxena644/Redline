import type { Policy, Quote, ExecutionContext } from '@redline/policy';
export function snapshot() {
  const policy:Policy={id:'policy',version:1,ownerId:'owner',currency:'USD',maxTotal:15000,maxPurchases:1,maxQuantity:1,requiredCategories:['microphone','headphones'],merchantId:'merchant',allowedProductIds:null,billingType:'one_time',expiresAt:'2027-01-01T00:00:00.000Z'};
  const quote:Quote={id:'quote',version:1,merchantId:'merchant',payeeId:'payee',currency:'USD',lines:[{sku:'mic',name:'Microphone',quantity:1,unitPrice:5900,category:'microphone',billingType:'one_time',available:true,known:true,productVersion:1},{sku:'hp',name:'Headphones',quantity:1,unitPrice:4900,category:'headphones',billingType:'one_time',available:true,known:true,productVersion:1}],subtotal:10800,discount:0,shipping:699,tax:864,total:12363,rulesVersion:'sample/1',expiresAt:'2026-12-01T00:00:00.000Z'};
  const context:ExecutionContext={ownerId:'owner',now:'2026-11-05T00:00:00.000Z',spent:0,reserved:0,purchases:0,pendingPurchases:0};
  return {policy,quote,context};
}
