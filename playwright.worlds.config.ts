import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/worlds-browser',fullyParallel:true,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,
 workers:process.env.CI?2:undefined,reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://localhost:5186',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:(['chromium','webkit'] as const).flatMap(browserName=>[320,1280].map(width=>({name:browserName+'-'+width,use:{browserName,viewport:{width,height:900}}}))),
 webServer:{command:'node scripts/run-worlds-ui-server.mts',url:'http://localhost:5186',reuseExistingServer:!process.env.CI,timeout:120000},
});
