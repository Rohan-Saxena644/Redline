import { z } from 'zod';
import { handler,authenticated } from '../../../../lib/http';
import { ownedEvidence } from '../../../../lib/evidence';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return handler(async req=>{const owner=await authenticated(req),id=z.uuid().parse((await context.params).id);return Response.json(await ownedEvidence(owner,id),{headers:{'Content-Disposition':`attachment; filename="redline-scenario-${id}.json"`}});})(request);}
