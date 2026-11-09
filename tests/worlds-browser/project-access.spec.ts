import {createServer} from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig,worldsIdentity,worldsRoute} from '../../lib/auth/worlds';
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


test('a new central account starts without another registration and returns to its private screen in DE and EN',async({page},info)=>{
 for(const locale of ['de','en'] as const){
  const db=new PGlite();let nativePosts=0;let relay:ReturnType<typeof createServer>|undefined;
  try{
   await db.exec('CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,banned boolean,"banExpires" timestamptz);');
   for(const file of ['027_worlds_identity.sql','028_worlds_project_accounts.sql'])await db.exec(await readFile(new URL('../../db/migrations/'+file,import.meta.url),'utf8'));
   const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
   const origin='https://sprach-pilot.test',issuer='https://issuer.test/auth';
   const config=createWorldsConfig({WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'},query)!;
   const raw=token(),csrf=token(),subject=token();
   await config.store.putSession(await hash(raw),{issuer,sub:subject,name:'New central reader',email:'synthetic@example.invalid',csrf,expires:Date.now()+120_000});
   await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.startsWith('/api/auth/')){if(route.request().method()!=='GET')nativePosts++;return route.fulfill({json:null})}
    if(path==='/api/admin/access')return route.fulfill({json:{isAdmin:false,unreadCount:0}});
    return route.fulfill({json:{entries:[],suggestions:[],regions:[],languages:[],available:false,more:false}});
   });
   // WebKit cannot fulfill a mocked redirect. Send the real POST through a
   // loopback HTTP relay so both engines process the handler's actual 303.
   relay=createServer(async(req,res)=>{
    try{
     expect(req.method).toBe('POST');expect(req.headers.origin).toBe('http://localhost:5186');
     const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
     const response=await worldsRoute(new Request(origin+req.url,{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+raw,'content-type':req.headers['content-type']??''},body:Buffer.concat(chunks)}),config,query,false);
     const headers=Object.fromEntries(response.headers);if(headers.location)headers.location='http://localhost:5186'+headers.location;
     res.writeHead(response.status,headers);res.end(await response.text());
    }catch{res.writeHead(500);res.end('Local test relay failed');}
   });
   await new Promise<void>(resolve=>relay!.listen(0,'127.0.0.1',resolve));
   const address=relay.address();if(!address||typeof address==='string')throw new Error('Local relay missing');
   const relayOrigin='http://127.0.0.1:'+address.port;
   await page.route('http://localhost:5186/auth/**',async route=>{
    const incoming=new URL(route.request().url());
    if(incoming.pathname==='/auth/worlds/profile'&&route.request().method()==='POST'){await route.continue({url:relayOrigin+incoming.pathname+incoming.search});return;}
    const request=new Request(origin+incoming.pathname+incoming.search,{method:route.request().method(),headers:{cookie:SESSION_COOKIE+'='+raw,origin,...(route.request().method()==='POST'?{'content-type':route.request().headers()['content-type']}:{} )},...(route.request().method()==='POST'?{body:route.request().postData()??''}:{})});
    const identity=incoming.pathname==='/auth/status'?await worldsIdentity(request,config,query):undefined;
    const response=identity?Response.json({user:identity.user??null,csrf:identity.csrf}):await worldsRoute(request,config,query,false);
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   });
   await page.goto('/me');
   await expect(page.locator('a.login-button')).toHaveAttribute('href',/\/auth\/worlds(-en)?\?next=%2Fme/);
   await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
   await expect(page.getByRole('button',{name:locale.toUpperCase(),exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('a.login-button')).toHaveAttribute('href',new RegExp('/auth/worlds'+(locale==='en'?'-en':'')+'\\?next=%2Fme'));
   await page.locator('a.login-button').click();
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   await expect(page.locator('input[type="password"],input[type="email"],input[name="name"]')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await page.getByRole('button',{name:locale==='en'?'Use Sprachwelten with Worlds':'Sprachwelten mit Worlds verwenden',exact:true}).click();
   await expect(page).toHaveURL(/\/me$/);await expect(page.locator('.profile-link')).toBeVisible();
   await expect(page.locator('a.login-button')).toHaveCount(0);
   await page.locator('.profile-link').click();await expect(page.getByText('New central reader',{exact:true})).toBeVisible();
   await expect(page.getByRole('link',{name:locale==='en'?'Manage account in Worlds Hub':'Konto im Worlds Hub verwalten',exact:true})).toHaveAttribute('href','https://worlds-hub.maki26.workers.dev'+(locale==='en'?'/en/account':'/konto'));
   await page.screenshot({path:info.outputPath('worlds-new-profile-'+locale+'.png'),fullPage:true});
   {
    const count=await query('SELECT (SELECT count(*) FROM neon_auth."user")::int AS native,(SELECT count(*) FROM worlds_project_accounts)::int AS profiles,(SELECT count(*) FROM worlds_link_audit)::int AS audit',[]);
    expect(count).toEqual([{native:0,profiles:1,audit:1}]);expect(nativePosts).toBe(0);
   }
  }finally{if(!page.isClosed())await page.unrouteAll({behavior:'wait'});if(relay)await new Promise<void>(resolve=>relay!.close(()=>resolve()));await db.close();}
 }
});
