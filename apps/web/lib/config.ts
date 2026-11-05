import { z } from 'zod';
const schema=z.object({
  DATABASE_URL:z.string().default('postgresql://redline:redline_local_only@localhost:54329/redline'),
  APP_ORIGIN:z.string().url().default('http://localhost:3000'), DEV_LOGIN:z.enum(['true','false']).default('true'),
  PAYMENT_MODE:z.enum(['simulated','sandbox']).default('simulated'), AI_MODE:z.enum(['fixture','real']).default('fixture'),
  LOCAL_LAB:z.enum(['true','false']).default('true'), PAYPAL_BASE_URL:z.literal('https://api-m.sandbox.paypal.com').default('https://api-m.sandbox.paypal.com'),
  PAYPAL_CLIENT_ID:z.string().default(''),PAYPAL_CLIENT_SECRET:z.string().default(''),PAYPAL_MERCHANT_ID:z.string().default(''),PAYPAL_WEBHOOK_ID:z.string().default(''),
  AI_BASE_URL:z.string().default(''),AI_MODEL:z.string().default(''),AI_API_KEY:z.string().default(''), AI_ALLOW_LOCAL:z.enum(['true','false']).default('false'),
  AI_ACCESS_APPROVED:z.enum(['true','false']).default('false'), AI_OUTPUT_MODE:z.enum(['json_schema','json_object']).default('json_schema'),AUTH_PROXY_SECRET:z.string().default('')
});
export function config() {
  const result=schema.safeParse(process.env);
  if (!result.success) throw new Error('Invalid REDLINE configuration (check .env.example)');
  const c=result.data; const origin=new URL(c.APP_ORIGIN);
  if (origin.origin!==c.APP_ORIGIN || origin.username || origin.password) throw new Error('APP_ORIGIN must be an origin');
  const loopback=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
  if ((c.DEV_LOGIN==='true'||c.LOCAL_LAB==='true')&&!loopback) throw new Error('Development login and lab require a loopback APP_ORIGIN');
  if (!loopback && (!c.AUTH_PROXY_SECRET || origin.protocol!=='https:')) throw new Error('Deployment requires HTTPS and an authenticated proxy');
  if (c.PAYMENT_MODE==='sandbox' && (!c.PAYPAL_CLIENT_ID||!c.PAYPAL_CLIENT_SECRET||!c.PAYPAL_MERCHANT_ID)) throw new Error('Sandbox credentials and merchant ID are required');
  return c;
}
export const merchantId='redline-studio';
export function payeeId() { const c=config(); return c.PAYMENT_MODE==='sandbox'?c.PAYPAL_MERCHANT_ID:'SIMULATED_MERCHANT'; }
