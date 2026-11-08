import {test,expect,type Page} from '@playwright/test';
import {entryInput} from '../../lib/content';
const user={id:'10000000-0000-4000-8000-000000000001',name:'Existing Worlds author'};
const entry={...entryInput.parse({kind:'word',phrase:'Unchanged original contribution',language:'de',literal:'Unchanged counterpart'}),
 id:'10000000-0000-4000-8000-000000000002',status:'community',authorName:'',createdAt:'2026-01-01T00:00:00Z',revision:0};
async function fixture(page:Page){
 const state:{active:boolean;outage:boolean;nativePosts:number;logout:boolean}={active:true,outage:false,nativePosts:0,logout:false};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.startsWith('/api/auth/')){
   if(route.request().method()!=='GET')state.nativePosts++;
   return route.fulfill({json:null});
  }
  if(path==='/api/me/entries')return route.fulfill({json:{entries:state.active?[entry]:[],more:false}});
  if(path==='/api/admin/access')return route.fulfill({json:{isAdmin:state.active,unreadCount:1}});
  if(path==='/api/admin/entries')return route.fulfill({json:{entries:[{...entry,authorId:user.id}],more:false}});
  if(path==='/api/admin/reports')return route.fulfill({json:{reports:[]}});
  if(path==='/api/admin/bulk')return route.fulfill({json:{batches:[]}});
  if(path==='/api/admin/suggestions')return route.fulfill({json:{suggestions:[]}});
  if(path==='/api/admin/inbox')return route.fulfill({json:{events:[],unreadCount:0,more:false}});
  if(path==='/api/audio')return route.fulfill({json:{available:false}});
  if(path==='/api/translations')return route.fulfill({json:{available:true}});
  return route.fulfill({json:{entries:[],regions:[],languages:[],more:false}});
 });
 await page.route('**/auth/status',route=>route.fulfill(state.outage?{status:503,json:{error:'Fixture outage'}}:{json:{user:state.active?user:null,csrf:state.active?'synthetic-csrf-only-at-least-32-characters':undefined}}));
 await page.route('**/auth/logout?*',route=>{
  expect(route.request().method()).toBe('POST');
  expect(new URLSearchParams(route.request().postData()??'').get('csrf')).toBe('synthetic-csrf-only-at-least-32-characters');
  state.logout=true;state.active=false;
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><h1>Local session ended</h1></html>'});
 });
 return state;
}

test('mapped Worlds identity unlocks its own contribution UI and project role UI, delegates profile settings and uses project logout',async({page},info)=>{
 const state=await fixture(page);
 await page.goto('/me');
 await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
 await expect(page.locator('.header .admin-link')).toBeVisible();
 await expect(page.locator('.account-verification')).toHaveCount(0);
 await expect(page.locator('.header form[action^="/auth/logout"]')).toBeVisible();
 await expect(page.locator('a.login-button')).toHaveCount(0);
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
 await page.locator('.profile-link').click();
 const settings=page.getByRole('link',{name:'Manage account in Worlds Hub',exact:true});
 await expect(settings).toHaveAttribute('href','https://worlds-hub.maki26.workers.dev/en/account');
 await expect(page.getByText(user.name,{exact:true})).toBeVisible();
 await expect(page.locator('main input')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:info.outputPath('worlds-profile.png'),fullPage:true});
 await page.locator('.theme-toggle').click();
 await page.getByRole('button',{name:'DE',exact:true}).click();
 await expect(page.getByRole('link',{name:'Konto im Worlds Hub verwalten',exact:true})).toHaveAttribute('href','https://worlds-hub.maki26.workers.dev/konto');
 await page.locator('.header .admin-link').click();
 await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Registrierte Konten',exact:true})).toBeVisible();
 await page.locator('.header form[action^="/auth/logout"] button').click();
 await expect(page.getByRole('heading',{name:'Local session ended'})).toBeVisible();
 expect(state.logout).toBeTruthy();expect(state.nativePosts).toBe(0);
});

test('provider interruption preserves UI state while a confirmed expired session clears private contribution UI',async({page})=>{
 await page.clock.install();
 const state=await fixture(page);
 await page.goto('/me');await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
 state.outage=true;
 await page.clock.fastForward(60_001);
 await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
 state.outage=false;state.active=false;
 await page.clock.fastForward(60_001);
 await expect(page.getByText(entry.phrase,{exact:true})).toHaveCount(0);
 await expect(page.locator('a.login-button')).toHaveAttribute('href',/\/auth\/start\?/);
 expect(new URL((await page.locator('a.login-button').getAttribute('href'))!,'https://fixture.test').searchParams.get('next')).toBe('/me');
 await expect(page.locator('.header .admin-link')).toHaveCount(0);
 expect(state.nativePosts).toBe(0);
});
