import { z } from 'zod';
import { handler, authenticated } from '../../../lib/http';
import { config } from '../../../lib/config';
import { db } from '../../../lib/db';
import { missionView } from '../../../lib/domain';
export const runtime='nodejs';
export const GET=handler(async request=>{
  const owner=await authenticated(request);const c=config();const id=new URL(request.url).searchParams.get('mission');
  const [missions,catalogue]=await Promise.all([
    db().selectFrom('missions').select(['id','mission','created_at']).where('owner_id','=',owner).orderBy('created_at','desc').limit(30).execute(),
    db().selectFrom('products').select(['sku','name','description','category','price','billing_type','stock','reserved','tone']).where('lab_owner_id','is',null).orderBy('category').orderBy('price').execute()
  ]);
  let selected=id??missions[0]?.id;
  const operation=new URL(request.url).searchParams.get('operation');
  if(operation){const op=await db().selectFrom('operations').select('mission_id').where('id','=',z.uuid().parse(operation)).where('owner_id','=',owner).executeTakeFirst();if(op)selected=op.mission_id;}
  return Response.json({modes:{ai:c.AI_MODE,payment:c.PAYMENT_MODE,lab:c.LOCAL_LAB==='true',developmentLogin:c.DEV_LOGIN==='true'},missions,catalogue,view:selected?await missionView(owner,z.uuid().parse(selected)):null});
});
