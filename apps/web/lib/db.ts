import { Kysely, PostgresDialect, type Generated, type JSONColumnType } from 'kysely';
import pg from 'pg';
import type { Policy, Proposal, Quote, Decision, ExecutionContext, ApprovalBinding } from '@redline/policy';
import type { CreatePayload, OrderEvidence } from '@redline/paypal';
import { config } from './config';
type Json<T extends object|null> = JSONColumnType<T,T,T>;
export type State='APPROVED'|'CREATING'|'AWAITING_BUYER'|'CAPTURING'|'COMPLETED'|'FAILED'|'CANCELLED'|'UNKNOWN';
export interface Database {
  sessions:{id:string;owner_id:string;expires_at:string};
  missions:{id:string;owner_id:string;mission:string;policy:Json<Policy>;spent:Generated<number>;reserved:Generated<number>;purchases:Generated<number>;pending:Generated<number>;created_at:Generated<Date>};
  products:{sku:string;name:string;description:string;category:'microphone'|'headphones'|'accessory';price:number;billing_type:'one_time'|'recurring';stock:number;reserved:Generated<number>;version:Generated<number>;tone:string;lab_owner_id:Generated<string|null>};
  quotes:{id:string;mission_id:string;owner_id:string;policy_snapshot:Json<Policy>;snapshot:Json<Quote>;proposal:Json<Proposal>;decision:Json<Decision>;context:Json<ExecutionContext>;ai_mode:'real'|'fixture'|'scripted';payment_mode:'sandbox'|'simulated';created_at:Generated<Date>;replaces_quote_id:Generated<string|null>};
  approvals:{id:string;owner_id:string;mission_id:string;quote_id:string;operation_id:string;binding:Json<ApprovalBinding>;status:'active'|'consumed'|'revoked';created_at:Generated<Date>};
  operations:{id:string;owner_id:string;mission_id:string;quote_id:string;approval_id:string;state:State;payment_mode:'sandbox'|'simulated';reserved:Generated<boolean>;create_key:string;capture_key:string;payload:Json<CreatePayload>;payload_hash:string;provider_order_id:string|null;provider_capture_id:string|null;provider_status:string|null;approval_url:string|null;phase:'create'|'capture'|null;attempted_at:string|null;lease_until:string|null;last_error:string|null;created_at:Generated<Date>;updated_at:string;reconcile_after:string|null;reconcile_attempts:Generated<number>};
  events:{id:Generated<number>;mission_id:string;operation_id:string|null;kind:string;message:string;data:Json<Record<string,unknown>>;created_at:Generated<Date>};
  webhook_events:{id:string;operation_id:string|null;event_type:string;processed_at:Generated<Date>};
  rate_limits:{id:string;count:number;expires_at:string};
  simulated_orders:{id:string;request_id:string;payload:Json<CreatePayload>;evidence:Json<OrderEvidence>;capture_key:string|null;capture_count:Generated<number>};
  scenario_runs:{id:string;owner_id:string;mission_id:string|null;evidence:Json<import('./evidence').ScenarioEvidence>;created_at:Generated<Date>};
}
const globalDb=globalThis as unknown as {redlineDb?:Kysely<Database>};
export function db():Kysely<Database> {
  if (!globalDb.redlineDb) globalDb.redlineDb=new Kysely<Database>({dialect:new PostgresDialect({pool:new pg.Pool({connectionString:config().DATABASE_URL,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:10000})})});
  return globalDb.redlineDb;
}
export type Tx=import('kysely').Transaction<Database>;
export type Connection=Kysely<Database>|Tx;
export async function closeDb(){if(globalDb.redlineDb){await globalDb.redlineDb.destroy();delete globalDb.redlineDb;}}
