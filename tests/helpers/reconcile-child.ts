import { reconcileOperation } from '../../apps/web/lib/payments';
import { closeDb } from '../../apps/web/lib/db';
const [ownerId,operationId]=process.argv.slice(2);
try{const op=await reconcileOperation(ownerId,operationId);console.log(JSON.stringify({pid:process.pid,state:op.state,orderId:op.provider_order_id,captureId:op.provider_capture_id}));}finally{await closeDb();}
