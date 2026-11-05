import { sql } from 'kysely';
import { db } from '../../../lib/db';
export const runtime='nodejs';
export async function GET() {
  try{await sql`select policy_snapshot,replaces_quote_id from quotes limit 0`.execute(db());await sql`select lab_owner_id from products limit 0`.execute(db());await sql`select evidence from scenario_runs limit 0`.execute(db());return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({status:'not_ready'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
