import { sql, type Kysely } from 'kysely';
export async function up(db:Kysely<unknown>):Promise<void> {
  await sql`ALTER TABLE quotes ADD COLUMN policy_snapshot jsonb; UPDATE quotes q SET policy_snapshot=m.policy FROM missions m WHERE q.mission_id=m.id; ALTER TABLE quotes ALTER COLUMN policy_snapshot SET NOT NULL;`.execute(db);
}
