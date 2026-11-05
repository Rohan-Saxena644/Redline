import 'dotenv/config';
import { db, closeDb } from '../apps/web/lib/db';
import { reconcileOperation } from '../apps/web/lib/payments';
export async function reconcileBatch() {
  const rows=await db().selectFrom('operations').select(['id','owner_id','reconcile_attempts']).where('reserved','=',true).where('reconcile_after','<=',new Date().toISOString()).where('reconcile_attempts','<',20).orderBy('reconcile_after').limit(20).execute();
  for(const row of rows) {
    await db().updateTable('operations').set({reconcile_attempts:row.reconcile_attempts+1,reconcile_after:new Date(Date.now()+Math.min(3600,30*2**row.reconcile_attempts)*1000).toISOString()}).where('id','=',row.id).execute();
    try {const result=await reconcileOperation(row.owner_id,row.id);console.log(JSON.stringify({operationId:row.id,state:result.state}));} catch {console.error(JSON.stringify({operationId:row.id,error:'RECONCILIATION_FAILED'}));}
  }
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/reconcile.ts')) {try{await reconcileBatch();}finally{await closeDb();}}
