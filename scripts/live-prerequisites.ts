/** Configuration names only. Never include environment values in a readiness report. */
export function livePrerequisites(env:Record<string,string|undefined>) {
  const ai:string[]=[],paypal:string[]=[];
  if(env.AI_MODE!=='real')ai.push('AI_MODE=real');
  if(env.AI_ACCESS_APPROVED!=='true')ai.push('AI_ACCESS_APPROVED=true');
  if(!env.AI_BASE_URL)ai.push('AI_BASE_URL');
  if(!env.AI_MODEL)ai.push('AI_MODEL');
  if(env.AI_BASE_URL){
    try{
      const local=['localhost','127.0.0.1','[::1]'].includes(new URL(env.AI_BASE_URL).hostname);
      if(local&&env.AI_ALLOW_LOCAL!=='true')ai.push('AI_ALLOW_LOCAL=true');
      if(!local&&!env.AI_API_KEY)ai.push('AI_API_KEY');
    }catch{ai.push('AI_BASE_URL (valid URL required)');}
  }
  if(env.PAYMENT_MODE!=='sandbox')paypal.push('PAYMENT_MODE=sandbox');
  for(const key of ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_MERCHANT_ID'])if(!env[key])paypal.push(key);
  return {ai,paypal};
}
