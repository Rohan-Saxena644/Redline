import 'dotenv/config';
import { Migrator } from 'kysely/migration';
import { db, closeDb } from '../apps/web/lib/db';
import * as initial from '../migrations/001_initial';
import * as snapshots from '../migrations/002_policy_snapshot';
import * as lab from '../migrations/003_lab_isolation';
export async function migrate() {
  const migrator=new Migrator({db:db(),provider:{async getMigrations(){return {'001_initial':initial,'002_policy_snapshot':snapshots,'003_lab_isolation':lab};}}});
  const {error,results}=await migrator.migrateToLatest();
  for(const result of results??[]) console.log(`${result.migrationName}: ${result.status}`);
  if(error) throw new Error('Migration failed',{cause:error});
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/migrate.ts')) { try{await migrate();}finally{await closeDb();} }
