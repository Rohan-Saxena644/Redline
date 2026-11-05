import 'dotenv/config';
import { mkdir,writeFile } from 'node:fs/promises';
import { config } from '../apps/web/lib/config';
import { CompatibleModel } from '../apps/web/lib/agent';
import { PayPalSandbox } from '@redline/paypal';
const c=config();
const report:{timestamp:string;ai:Record<string,unknown>;paypal:Record<string,unknown>}={timestamp:new Date().toISOString(),ai:{status:'not_verified'},paypal:{status:'not_verified',buyerApproval:'not_verified',capture:'not_verified',webhookDelivery:'not_verified'}};
if(c.AI_MODE==='real'&&c.AI_ACCESS_APPROVED==='true'&&c.AI_BASE_URL&&c.AI_MODEL){
  try{const result=await new CompatibleModel().action([{role:'system',content:'Return a JSON searchCatalog action with query empty string, category microphone, sku null, items null, explanation null. No other action.'}]);report.ai={status:'structured_action_verified',usage:result.usage,action:result.action.action,compatibility:'Configured endpoint/model only; no universal compatibility claim.'};}catch{report.ai={status:'failed',note:'No fixture fallback. Check private provider diagnostics without sharing credentials.'};process.exitCode=1;}
}else report.ai={status:'not_verified',missing:['AI_MODE=real','AI_ACCESS_APPROVED=true','AI_BASE_URL','AI_MODEL'].filter(k=>{const [key,value]=k.split('=');return value?process.env[key]!==value:!process.env[key];})};
if(c.PAYPAL_CLIENT_ID&&c.PAYPAL_CLIENT_SECRET&&c.PAYPAL_MERCHANT_ID){
  try{const provider=new PayPalSandbox({baseUrl:c.PAYPAL_BASE_URL,clientId:c.PAYPAL_CLIENT_ID,clientSecret:c.PAYPAL_CLIENT_SECRET});await provider.authenticate();report.paypal={...report.paypal,status:'authentication_verified',next:'Use the authenticated app for create → buyer approval → capture. Authentication alone does not verify checkout.'};}catch{report.paypal={...report.paypal,status:'failed'};process.exitCode=1;}
}else report.paypal={...report.paypal,missing:['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID'].filter(k=>!process.env[k])};
await mkdir('.local',{recursive:true});await writeFile('.local/verification-latest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
