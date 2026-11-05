import { randomUUID } from 'node:crypto';
import { canonical } from '@redline/policy';
import { ProviderError, type CreatePayload, type OrderEvidence, type PaymentProvider } from '@redline/paypal';
import { db } from './db';
import { config } from './config';
/** Durable local test double. Never used as a fallback for PayPal. */
export class SimulatedProvider implements PaymentProvider {
  readonly mode='simulated' as const;
  constructor(private fault:'none'|'capture_response_loss'='none') {
    if(config().PAYMENT_MODE!=='simulated') throw new Error('Simulator disabled in sandbox mode');
    if(fault!=='none'&&config().LOCAL_LAB!=='true') throw new Error('Fault injection requires the local lab');
  }
  async create(payload:CreatePayload,requestId:string):Promise<OrderEvidence> {
    const id=`SIM${randomUUID().replaceAll('-','').slice(0,24).toUpperCase()}`;
    const evidence:OrderEvidence={id,status:'CREATED',intent:'CAPTURE',purchase_units:payload.purchase_units.map(u=>({reference_id:u.reference_id,custom_id:u.custom_id,payee:u.payee,amount:u.amount,items:u.items.map(({category:_category,...i})=>i)}))};
    await db().insertInto('simulated_orders').values({id,request_id:requestId,payload,evidence,capture_key:null}).onConflict(oc=>oc.column('request_id').doNothing()).execute();
    const saved=await db().selectFrom('simulated_orders').selectAll().where('request_id','=',requestId).executeTakeFirstOrThrow();
    if(canonical(saved.payload)!==canonical(payload)) throw new ProviderError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    return saved.evidence;
  }
  async get(id:string):Promise<OrderEvidence> {
    const order=await db().selectFrom('simulated_orders').select('evidence').where('id','=',id).executeTakeFirst();
    if(!order) throw new ProviderError('ORDER_NOT_FOUND',404);return order.evidence;
  }
  async approve(id:string):Promise<void> {
    await db().transaction().execute(async tx=>{
      const order=await tx.selectFrom('simulated_orders').selectAll().where('id','=',id).forUpdate().executeTakeFirstOrThrow();
      if(order.evidence.status==='CREATED') await tx.updateTable('simulated_orders').set({evidence:{...order.evidence,status:'APPROVED'}}).where('id','=',id).execute();
    });
  }
  async capture(id:string,requestId:string):Promise<void> {
    await db().transaction().execute(async tx=>{
      const order=await tx.selectFrom('simulated_orders').selectAll().where('id','=',id).forUpdate().executeTakeFirstOrThrow();
      if(order.capture_key && order.capture_key!==requestId) throw new ProviderError('CAPTURE_KEY_MISMATCH');
      if(order.evidence.status==='COMPLETED') return;
      if(order.evidence.status!=='APPROVED') throw new ProviderError('BUYER_APPROVAL_REQUIRED');
      const evidence:OrderEvidence={...order.evidence,status:'COMPLETED',purchase_units:order.evidence.purchase_units.map(u=>({...u,payments:{captures:[{id:`SC${randomUUID().replaceAll('-','').slice(0,24).toUpperCase()}`,status:'COMPLETED',amount:{currency_code:u.amount.currency_code,value:u.amount.value},final_capture:true}]}}))};
      await tx.updateTable('simulated_orders').set({evidence,capture_key:requestId,capture_count:1}).where('id','=',id).execute();
    });
    if(this.fault==='capture_response_loss') throw new ProviderError('SIMULATED_RESPONSE_LOSS');
  }
}
