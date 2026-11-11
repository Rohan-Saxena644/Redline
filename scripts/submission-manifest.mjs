import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw new Error('Commit or review all changes before recording a submission candidate.');
const rootPackage=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const manifests=['package.json','apps/web/package.json','packages/policy/package.json','packages/paypal/package.json'];
const workspaces=manifests.map(path=>{const p=JSON.parse(readFileSync(resolve(root,path),'utf8'));return {path,name:p.name,version:p.version,dependencies:p.dependencies??{},devDependencies:p.devDependencies??{}};});
const externalConfiguration={
  always:['DATABASE_URL','APP_ORIGIN'],
  realAI:['AI_MODE','AI_ACCESS_APPROVED','AI_BASE_URL','AI_MODEL','AI_OUTPUT_MODE'],
  remoteAIKey:['AI_API_KEY'],explicitLocalAI:['AI_ALLOW_LOCAL'],
  paypalSandbox:['PAYMENT_MODE','PAYPAL_BASE_URL','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID'],
  optionalWebhook:['PAYPAL_WEBHOOK_ID'],authorizedRemoteHosting:['DEV_LOGIN','LOCAL_LAB','AUTH_PROXY_SECRET']
};
const result={
  format:'redline-submission-candidate/1',recordedAt:new Date().toISOString(),status:'local_candidate_not_submitted',
  sourceCommit:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),applicationVersion:rootPackage.version,
  lockfile:{path:'package-lock.json',sha256:createHash('sha256').update(readFileSync(resolve(root,'package-lock.json'))).digest('hex')},
  runtime:{supported:rootPackage.engines,recordedNode:process.version},workspaces,externalConfiguration,
  deployment:null,publicRepository:null,publicVideo:null,
  verificationRecord:'docs/VERIFICATION.md',liveVerification:{record:'docs/LIVE_VERIFICATION.md',reviewedOn:'2026-11-11',realModel:'verified',paypalSandboxCheckout:'buyer_approved_capture_verified',browserJourney:'verified_recorded',webhookDelivery:'not_verified'},
  accessContinuity:'docs/ACCESS_CONTINUITY.md',preservationChecklist:'docs/SUBMISSION_FREEZE.md',
  note:'Source commit precedes this metadata-only manifest. Null public locations describe an unbound local candidate, not a check for existing public repositories. No credentials, environment values, provider calls, external publication or freeze are performed.'
};
writeFileSync(resolve(root,'docs/SUBMISSION_MANIFEST.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:'docs/SUBMISSION_MANIFEST.json',sourceCommit:result.sourceCommit,deployment:null,status:result.status}));
