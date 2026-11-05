import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:90000,
  expect:{timeout:15000},reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://localhost:3001',trace:'retain-on-failure',screenshot:'only-on-failure',channel:process.env.PLAYWRIGHT_CHANNEL??(process.platform==='win32'?'msedge':undefined)},
  projects:[{name:'desktop-fixture',use:{...devices['Desktop Chrome']}},{name:'mobile-fixture',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
  webServer:{command:'npm run dev -w @redline/web -- --port 3001',url:'http://localhost:3001/api/health',reuseExistingServer:false,timeout:120000,
    env:{DATABASE_URL:process.env.TEST_DATABASE_URL??'postgresql://redline:redline_local_only@localhost:54329/redline_test',APP_ORIGIN:'http://localhost:3001',DEV_LOGIN:'true',AI_MODE:'fixture',PAYMENT_MODE:'simulated',LOCAL_LAB:'true',NEXT_TELEMETRY_DISABLED:'1'}}
});
