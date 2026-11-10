import 'dotenv/config';
import { mkdir,writeFile } from 'node:fs/promises';
import { config } from '../apps/web/lib/config';
import { CompatibleModel } from '../apps/web/lib/agent';
import { PayPalSandbox } from '@redline/paypal';
import { livePrerequisites } from './live-prerequisites';
const missing=livePrerequisites(process.env);
const report:{timestamp:string;preflightPassed:boolean;journey:string;configuration:Record<string,unknown>;ai:Record<string,unknown>;paypal:Record<string,unknown>}={timestamp:new Date().toISOString(),preflightPassed:false,journey:'not_verified',configuration:{status:'valid',realServiceSettingsComplete:!missing.ai.length&&!missing.paypal.length},ai:{status:'not_verified',missing:missing.ai},paypal:{status:'not_verified',missing:missing.paypal,buyerApproval:'not_verified',capture:'not_verified',webhookDelivery:'not_verified'}};
let c:ReturnType<typeof config>|undefined;
try{c=config();}catch{report.configuration={status:'invalid',note:'Check .env.example and the missing configuration names. No service requests were made.'};}
if(c&&!missing.ai.length){
  try{const result=await new CompatibleModel().action([{role:'system',content:'Return a JSON searchCatalog action with query empty string, category microphone, sku null, items null, explanation null. No other action.'}]);report.ai={status:'structured_action_verified',usage:result.usage,action:result.action.action,compatibility:'Configured endpoint/model only; no universal compatibility claim.'};}catch{report.ai={status:'failed',note:'No fixture fallback. Check private provider diagnostics without sharing credentials.'};process.exitCode=1;}
}
if(c&&!missing.paypal.length){
  try{const provider=new PayPalSandbox({baseUrl:c.PAYPAL_BASE_URL,clientId:c.PAYPAL_CLIENT_ID,clientSecret:c.PAYPAL_CLIENT_SECRET});await provider.authenticate();report.paypal={...report.paypal,status:'authentication_verified',next:'Use the authenticated app for create → buyer approval → capture. Authentication alone does not verify checkout.'};}catch{report.paypal={...report.paypal,status:'failed'};process.exitCode=1;}
}
report.preflightPassed=report.ai.status==='structured_action_verified'&&report.paypal.status==='authentication_verified';
if(!report.preflightPassed)process.exitCode=1;
await mkdir('.local',{recursive:true});await writeFile('.local/verification-latest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
