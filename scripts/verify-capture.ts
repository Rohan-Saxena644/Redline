import 'dotenv/config';
import {mkdir,writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {ProviderError} from '@redline/paypal';
import {AppError} from '../apps/web/lib/domain';
import {closeDb} from '../apps/web/lib/db';
import {verifyCapturedQuote} from '../apps/web/lib/capture-verification';

try{
  const quoteId=z.uuid().parse(process.argv[2]);
  const report=await verifyCapturedQuote(quoteId);
  await mkdir('.local',{recursive:true});
  await writeFile(`.local/capture-verification-${quoteId}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}catch(error){
  const code=error instanceof AppError||error instanceof ProviderError?error.code:error instanceof z.ZodError?'QUOTE_ID_REQUIRED':'CAPTURE_VERIFICATION_FAILED';
  console.error(JSON.stringify({status:'not_verified',code,note:'Usage: npm run verify:capture -- <quote UUID>. This check never creates or captures a payment.'}));process.exitCode=1;
}finally{await closeDb();}
