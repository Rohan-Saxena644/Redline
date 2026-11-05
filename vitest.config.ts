import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@redline/policy': fileURLToPath(new URL('./packages/policy/src/index.ts', import.meta.url)), '@redline/paypal': fileURLToPath(new URL('./packages/paypal/src/index.ts', import.meta.url)) } },
  test: { include: ['tests/**/*.test.ts'], setupFiles:['./tests/setup.ts'], fileParallelism: false, testTimeout: 30000 }
});
