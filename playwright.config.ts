import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:true,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,
 reporter:process.env.CI?'github':'list',use:{baseURL:'http://localhost:5176',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:{command:'npm run dev',url:'http://localhost:5176',reuseExistingServer:!process.env.CI,timeout:120000,env:{SPRACHWELTEN_OFFLINE_PREVIEW:'1'}},
});
