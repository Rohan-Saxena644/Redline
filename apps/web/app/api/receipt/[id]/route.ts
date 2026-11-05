import { z } from 'zod';
import { authenticated, handler } from '../../../../lib/http';
import { receipt } from '../../../../lib/receipts';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  return handler(async req=>{
    const owner=await authenticated(req);const id=z.uuid().parse((await context.params).id);
    return Response.json(await receipt(owner,id),{headers:{'Content-Disposition':`attachment; filename="redline-${id}.json"`}});
  })(request);
}
