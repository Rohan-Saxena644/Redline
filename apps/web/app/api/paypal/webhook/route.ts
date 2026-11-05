import { handler, jsonBody } from '../../../../lib/http';
import { processWebhook } from '../../../../lib/webhooks';
export const runtime='nodejs';
export const POST=handler(async request=>Response.json(await processWebhook(request.headers,await jsonBody(request,131072))));
