import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
loadEnv({path:fileURLToPath(new URL('../../.env',import.meta.url)),quiet:true});
const config: NextConfig = {
  transpilePackages: ['@redline/policy', '@redline/paypal'], serverExternalPackages: ['pg'],
  poweredByHeader: false,devIndicators:false,
  async headers() { return [{source: '/:path*', headers: [
    {key: 'X-Content-Type-Options', value: 'nosniff'}, {key: 'Referrer-Policy', value: 'no-referrer'},
    {key: 'X-Frame-Options', value: 'DENY'},
    {key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.sandbox.paypal.com"}
  ]}]; }
};
export default config;
