import { sql,type Kysely } from 'kysely';
export async function up(db:Kysely<unknown>):Promise<void>{
  await sql`
    ALTER TABLE quotes ADD COLUMN replaces_quote_id text REFERENCES quotes(id);
    CREATE TABLE scenario_runs(id text PRIMARY KEY,owner_id text NOT NULL,mission_id text REFERENCES missions(id),evidence jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX scenario_runs_owner ON scenario_runs(owner_id,created_at);
  `.execute(db);
}
