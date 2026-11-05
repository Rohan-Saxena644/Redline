import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { MAX_MINOR, type Proposal, type Quote, type QuoteLine } from '@redline/policy';
import { db, type Connection } from './db';
import { merchantId, payeeId } from './config';
export const proposalSchema=z.strictObject({
  items:z.array(z.strictObject({sku:z.string().regex(/^[a-z0-9-]{1,60}$/),quantity:z.number().int().min(1).max(100)})).min(1).max(20),
  explanation:z.string().max(400).optional()
}).refine(p=>new Set(p.items.map(i=>i.sku)).size===p.items.length,'Duplicate SKUs are not allowed');
export const searchSchema=z.strictObject({query:z.string().max(100).default(''),category:z.enum(['microphone','headphones','accessory']).optional(),limit:z.number().int().min(1).max(12).default(8)});
export const inspectSchema=z.strictObject({sku:z.string().regex(/^[a-z0-9-]{1,60}$/)});
export async function searchCatalog(input:unknown, connection:Connection=db()) {
  const data=searchSchema.parse(input);
  let query=connection.selectFrom('products').selectAll().where('lab_owner_id','is',null).orderBy('price').orderBy('sku').limit(data.limit);
  if(data.category) query=query.where('category','=',data.category);
  if(data.query) query=query.where('name','ilike',`%${data.query.replace(/[%_\\]/g,'')}%`);
  return query.execute();
}
export async function inspectProduct(input:unknown,connection:Connection=db()) {
  const {sku}=inspectSchema.parse(input);return connection.selectFrom('products').selectAll().where('sku','=',sku).where('lab_owner_id','is',null).executeTakeFirst();
}
/** Caller locks catalogue rows before invoking when preparing a payment mutation. */
export async function makeQuote(proposal:Proposal,connection:Connection=db(), options:{ownReservation?:boolean;original?:Quote;ownerId?:string}={}):Promise<Quote> {
  proposalSchema.parse(proposal);
  const products=await connection.selectFrom('products').selectAll().where('sku','in',proposal.items.map(i=>i.sku)).where(eb=>eb.or([eb('lab_owner_id','is',null),eb('lab_owner_id','=',options.ownerId??'NO_OWNER')])).execute();
  const lines:QuoteLine[]=proposal.items.slice().sort((a,b)=>a.sku.localeCompare(b.sku)).map(item=>{
    const p=products.find(p=>p.sku===item.sku);
    return {sku:item.sku,name:p?.name??'Unknown product',quantity:item.quantity,unitPrice:p?.price??0,category:p?.category??'accessory',billingType:p?.billing_type??'one_time',known:!!p,available:!!p&&(options.ownReservation?p.stock:p.stock-p.reserved)>=item.quantity,productVersion:p?.version??1};
  });
  const subtotalBig=lines.reduce((s,l)=>s+BigInt(l.unitPrice)*BigInt(l.quantity),0n);
  if(subtotalBig>BigInt(MAX_MINOR)) throw new Error('Basket exceeds supported money range');
  const discount=subtotalBig>=20000n?500:0; const shipping=699;
  const tax=Number(((subtotalBig-BigInt(discount))*8n+50n)/100n);
  const total=Number(subtotalBig)+shipping+tax-discount;
  if(total>MAX_MINOR) throw new Error('Basket exceeds supported money range');
  return {id:options.original?.id??randomUUID(),version:options.original?.version??1,merchantId,payeeId:payeeId(),currency:'USD',lines,subtotal:Number(subtotalBig),discount,shipping,tax,total,rulesVersion:'studio-usd/1',expiresAt:options.original?.expiresAt??new Date(Date.now()+15*60_000).toISOString()};
}
