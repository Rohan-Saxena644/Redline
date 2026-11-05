import { sql, type Kysely } from 'kysely';
export async function up(db:Kysely<unknown>):Promise<void> { await sql`ALTER TABLE products ADD COLUMN lab_owner_id text;`.execute(db); }
