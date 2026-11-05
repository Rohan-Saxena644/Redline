import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from 'kysely';
import { z } from 'zod';
import { hash } from '@redline/policy';
import { db } from './db';
import { config } from './config';
import { AppError } from './domain';
import { ModelError } from './agent';
import { ProviderError } from '@redline/paypal';
export const cookieName='redline_session';
export function tokenFrom(request:Request) {
  const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  return token&&/^[a-f0-9]{64}$/.test(token)?token:null;
}
export function sameOrigin(request:Request) {
  const c=config();
  if(request.headers.get('origin')!==c.APP_ORIGIN || request.headers.get('host')!==new URL(c.APP_ORIGIN).host) throw new AppError('ORIGIN_REJECTED',403);
  if(request.headers.get('sec-fetch-site')==='cross-site') throw new AppError('ORIGIN_REJECTED',403);
}
export async function authenticated(request:Request) {
  const token=tokenFrom(request);if(!token) throw new AppError('LOGIN_REQUIRED',401);
  const session=await db().selectFrom('sessions').selectAll().where('id','=',hash(token)).where('expires_at','>',new Date().toISOString()).executeTakeFirst();
  if(!session) throw new AppError('LOGIN_REQUIRED',401);return session.owner_id;
}
export async function login(request:Request) {
  sameOrigin(request);await limit('login',20);
  const c=config();let owner:string;
  if(c.DEV_LOGIN==='true') owner=randomUUID();
  else {
    const supplied=request.headers.get('x-redline-auth')??'';const identity=request.headers.get('x-redline-user')??'';
    if(!c.AUTH_PROXY_SECRET || Buffer.byteLength(supplied)!==Buffer.byteLength(c.AUTH_PROXY_SECRET) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(c.AUTH_PROXY_SECRET)) || !/^[a-zA-Z0-9@._:+-]{1,200}$/.test(identity)) throw new AppError('IDENTITY_GATEWAY_REQUIRED',401);
    owner=hash(identity);
  }
  const existing=await authenticated(request).catch(()=>null);if(existing)return Response.json({authenticated:true});
  const token=randomBytes(32).toString('hex');const expires=new Date(Date.now()+8*60*60_000).toISOString();
  await db().insertInto('sessions').values({id:hash(token),owner_id:owner,expires_at:expires}).execute();
  await db().deleteFrom('sessions').where('expires_at','<',new Date().toISOString()).execute();
  return Response.json({authenticated:true,development:c.DEV_LOGIN==='true'},{headers:{'Set-Cookie':`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${new URL(c.APP_ORIGIN).protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'}});
}
export async function logout(request:Request) {
  sameOrigin(request);const token=tokenFrom(request);if(token)await db().deleteFrom('sessions').where('id','=',hash(token)).execute();
  return Response.json({authenticated:false},{headers:{'Set-Cookie':`${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`}});
}
export async function limit(key:string,max=60) {
  const bucket=Math.floor(Date.now()/60_000);const id=hash(`${key}:${bucket}`);
  const result=await db().insertInto('rate_limits').values({id,count:1,expires_at:new Date((bucket+2)*60_000).toISOString()}).onConflict(oc=>oc.column('id').doUpdateSet({count:sql`rate_limits.count+1`})).returning('count').executeTakeFirstOrThrow();
  if(result.count>max) throw new AppError('RATE_LIMITED',429);
  await db().deleteFrom('rate_limits').where('expires_at','<',new Date().toISOString()).execute();
}
export async function jsonBody(request:Request,max=32768):Promise<unknown> {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError('JSON_REQUIRED',415);
  if(Number(request.headers.get('content-length')??0)>max) throw new AppError('BODY_TOO_LARGE',413);
  const reader=request.body?.getReader();if(!reader)throw new AppError('BODY_REQUIRED',400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new AppError('BODY_TOO_LARGE',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('INVALID_JSON',400);}
}
export function handler(fn:(request:Request)=>Promise<Response>) {
  return async (request:Request)=>{
    const correlationId=randomUUID();const started=Date.now();
    try {
      const response=await fn(request);response.headers.set('X-Correlation-ID',correlationId);response.headers.set('Cache-Control','no-store');
      console.info(JSON.stringify({correlationId,method:request.method,path:new URL(request.url).pathname,status:response.status,durationMs:Date.now()-started,...modeLabels()}));return response;
    }catch(error){
      const code=error instanceof AppError||error instanceof ModelError||error instanceof ProviderError?error.code:error instanceof z.ZodError?'INVALID_REQUEST':'INTERNAL_ERROR';
      const status=error instanceof AppError?error.status:error instanceof z.ZodError?400:error instanceof ModelError||error instanceof ProviderError?502:500;
      console.error(JSON.stringify({correlationId,code,status,durationMs:Date.now()-started,...modeLabels()}));
      return Response.json({error:code,correlationId,...(error instanceof AppError&&error.details?{details:error.details}:{})},{status,headers:{'X-Correlation-ID':correlationId,'Cache-Control':'no-store'}});
    }
  };
}
function modeLabels(){
  const ai=process.env.AI_MODE??'fixture',payment=process.env.PAYMENT_MODE??'simulated';
  return {aiMode:['fixture','real'].includes(ai)?ai:'invalid',paymentMode:['simulated','sandbox'].includes(payment)?payment:'invalid'};
}
