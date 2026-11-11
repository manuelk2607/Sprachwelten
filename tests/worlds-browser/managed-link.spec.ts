import {test,expect} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {SESSION_COOKIE,token,session} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig,worldsRoute} from '../../lib/auth/worlds';
import {resolveProjectIdentity,projectStatus} from '../../lib/auth/project-identity';
import {managedLinkRoute} from '../../lib/auth/worlds-managed-link';
import {projectLogout} from '../../lib/auth/worlds-logout';
import {transitionUser} from '../../lib/auth/managed-transition';
import {entryInput} from '../../lib/content';

test('nested account actions actually reach the protected framework handler',async({request})=>{
 // The fixture uses HTTPS configuration and fake credentials. HTTP requests
 // must reach the handler's origin refusal without touching a database/provider.
 for(const path of ['/auth/worlds/profile','/auth/worlds/link','/auth/worlds/confirm','/auth/worlds/recovery']){
  const response=await request.post(path,{form:{csrf:'not-an-authentication-proof'}});
  expect(response.status()).toBe(404);expect(await response.text()).toBe('');
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
 }
});

for(const recover of [false,true])test((recover?'an expired owner first confirms existing credentials, then ':'an existing owner ')+ 'confirms the link in DE and EN, keeps the same data without the old cookie, and signs out both local sessions',async({page},info)=>{
 for(const locale of ['de','en'] as const){
  const db=new PGlite();let relay:ReturnType<typeof createServer>|undefined;
  try{
   const id=crypto.randomUUID(),raw=token(),csrf=token(),sub=token(),entryId=crypto.randomUUID(),origin='https://sprach-pilot.test',issuer='https://central.test/auth';
   await db.exec('CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,banned boolean,"banExpires" timestamptz);CREATE TABLE neon_auth.session(id text PRIMARY KEY,"userId" uuid,"createdAt" timestamptz,"expiresAt" timestamptz);CREATE TABLE app_admins(user_id uuid PRIMARY KEY);CREATE TABLE content_entries(id uuid PRIMARY KEY,author_id text);');
   await db.query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)',[id,'Historical author']);
   await db.query('INSERT INTO content_entries VALUES($1,$2)',[entryId,id]);
   for(const file of ['027_worlds_identity.sql','028_worlds_project_accounts.sql','029_worlds_legacy_sessions.sql'])await db.exec(await readFile(new URL('../../db/migrations/'+file,import.meta.url),'utf8'));
   const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
   const config=createWorldsConfig({WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'},query)!;
   await config.store.putSession(await hash(raw),{issuer,sub,csrf,name:'Central reader',email:'synthetic@fixture.invalid',authenticatedAt:Date.now(),expires:Date.now()+120_000});
   const state={nativeCookie:!recover,nativeActive:!recover,nativePosts:0,signOuts:0,nativeSessionId:'native-fixture-session'};let nativeCreatedAt=Date.now()-86_400_000;const nativeExpiresAt=Date.now()+86_400_000;
   if(!recover)await query('INSERT INTO neon_auth.session VALUES($1,$2,$3,$4)',[state.nativeSessionId,id,new Date(nativeCreatedAt).toISOString(),new Date(nativeExpiresAt).toISOString()]);
   const cookie=()=>SESSION_COOKIE+'='+raw+(state.nativeCookie?'; __Secure-neon-auth.session_token=native-fixture':'');
   const modelRequest=(path:string,method='GET',body?:string)=>new Request(origin+path,{method,headers:{origin,cookie:cookie(),...(body!==undefined?{'content-type':'application/x-www-form-urlencoded'}:{})},...(body!==undefined?{body}:{})});
   const identity=(request:Request)=>resolveProjectIdentity(request,config,query,async()=>({user:state.nativeActive&&state.nativeCookie?await transitionUser({id,name:'Historical author',sessionId:state.nativeSessionId,createdAt:nativeCreatedAt,expiresAt:nativeExpiresAt,validatedAt:Date.now()},query):null,error:null}));
   const owner=async()=>{if(!state.nativeCookie||!state.nativeActive)throw new Error('No current native owner');return {name:'Historical author',proof:{kind:'managed-auth-session' as const,issuer:'https://native.test/auth',accountId:id,sessionId:'native-fixture-session',createdAt:nativeCreatedAt,expiresAt:nativeExpiresAt,validatedAt:Date.now(),privileged:false}};};
   const handle=async(request:Request)=>{
    const path=new URL(request.url).pathname;
    if(path==='/auth/status'){
     const status=projectStatus(await identity(request));if(status.source==='legacy')status.csrf=(await session(request,config))?.csrf;
     return Response.json(status);
    }
    if(path==='/auth/worlds/link'||path==='/auth/worlds/confirm')return managedLinkRoute(request,config,query,owner);
    if(path==='/auth/logout')return projectLogout(request,config,async()=>{state.signOuts++;state.nativeActive=false;state.nativeCookie=false;return Response.json({success:true});});
    return worldsRoute(request,config,query,state.nativeCookie&&state.nativeActive?{id,name:'Historical author'}:false);
   };
   const entry={...entryInput.parse({kind:'word',phrase:'Original contribution stays unchanged',language:'de',literal:'Original counterpart'}),id:entryId,status:'community',authorName:'',createdAt:'2026-01-01T00:00:00Z',revision:0};
   await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.startsWith('/api/auth/')){
     if(route.request().method()!=='GET')state.nativePosts++;
     if(path==='/api/auth/sign-in/email'){
      const body=route.request().postDataJSON();expect(body.email).toBe('native@fixture.invalid');
      if(body.password!=='Synthetic browser password!')return route.fulfill({status:401,json:{code:'INVALID_EMAIL_OR_PASSWORD',message:'Invalid email or password'}});
      state.nativeCookie=true;state.nativeActive=true;nativeCreatedAt=Date.now();
      await query('INSERT INTO neon_auth.session VALUES($1,$2,$3,$4)',[state.nativeSessionId,id,new Date(nativeCreatedAt).toISOString(),new Date(nativeExpiresAt).toISOString()]);
      return route.fulfill({json:{token:'synthetic-fixture-only',user:{id,name:'Historical author',email:'native@fixture.invalid',emailVerified:false}}});
     }
     return route.fulfill({json:state.nativeActive&&state.nativeCookie?{session:{id:'native-fixture-session',userId:id,expiresAt:'2099-01-01T00:00:00Z'},user:{id,name:'Historical author',email:'native@fixture.invalid',emailVerified:false}}:null});
    }
    if(path==='/api/me/entries')return route.fulfill({json:{entries:(await identity(modelRequest('/api/me/entries'))).user?.id===id?[entry]:[],more:false}});
    if(path==='/api/admin/access')return route.fulfill({json:{isAdmin:false,unreadCount:0}});
    return route.fulfill({json:{entries:[],suggestions:[],regions:[],languages:[],available:false,more:false}});
   });
   // Only the real redirect responses need a relay: WebKit cannot fulfill 303.
   relay=createServer(async(req,res)=>{
    try{
     expect(req.method).toBe('POST');expect(req.headers.origin).toBe('http://localhost:5186');
     const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
     const result=await handle(modelRequest(req.url!,'POST',Buffer.concat(chunks).toString()));
     const headers=Object.fromEntries(result.headers);if(headers.location)headers.location='http://localhost:5186'+headers.location;
     res.writeHead(result.status,headers);res.end(await result.text());
    }catch{res.writeHead(500);res.end('Local fixture relay failed');}
   });
   await new Promise<void>(resolve=>relay!.listen(0,'127.0.0.1',resolve));
   const address=relay.address();if(!address||typeof address==='string')throw Error('No local relay');
   await page.route('http://localhost:5186/auth/**',async route=>{
    const incoming=new URL(route.request().url());
    if(route.request().method()==='POST'&&['/auth/worlds/confirm','/auth/logout'].includes(incoming.pathname))return route.continue({url:'http://127.0.0.1:'+address.port+incoming.pathname+incoming.search});
    const result=await handle(modelRequest(incoming.pathname+incoming.search,route.request().method(),route.request().method()==='POST'?route.request().postData()??'':undefined));
    return route.fulfill({status:result.status,headers:Object.fromEntries(result.headers),body:await result.text()});
   });
   if(recover){
    await page.goto('/auth/worlds'+(locale==='en'?'-en':'')+'?next=%2Fme');
    await page.getByRole('link',{name:locale==='en'?'I already have a Sprachwelten account':'Ich habe bereits ein Sprachwelten-Konto'}).click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    await dialog.locator('input[name="email"]').fill('native@fixture.invalid');await dialog.locator('input[name="password"]').fill('Wrong synthetic password!');
    await dialog.locator('button[type="submit"],form button').click();await expect(dialog.getByRole('alert')).toHaveText(locale==='en'?'Invalid email or password':'E-Mail oder Passwort ist nicht korrekt.');
    const other=locale==='en'?'de':'en';await dialog.getByRole('button',{name:other.toUpperCase(),exact:true}).click();
    await expect(dialog.locator('input[name="email"]')).toHaveValue('native@fixture.invalid');await expect(dialog.locator('input[name="password"]')).toHaveValue('Wrong synthetic password!');
    await expect(dialog.getByRole('alert')).toHaveText(other==='en'?'Invalid email or password':'E-Mail oder Passwort ist nicht korrekt.');
    await dialog.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
    await expect(dialog.getByRole('button',{name:locale==='en'?'Create an account':'Jetzt registrieren',exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:info.outputPath('managed-recovery-'+locale+'.png'),fullPage:true});
    await dialog.locator('input[name="password"]').fill('Synthetic browser password!');await dialog.locator('form button').click();
    await expect(page).toHaveURL(new RegExp('/auth/worlds'+(locale==='en'?'-en':'')+'\\?next=%2Fme'));
   }else{
    await page.goto('/me');await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
    await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
    const account=page.getByRole('link',{name:locale==='en'?'Worlds account':'Worlds-Konto',exact:true});
    await expect(account).toHaveAttribute('href',new RegExp('/auth/worlds'+(locale==='en'?'-en':'')+'\\?next=%2Fme'));await account.click();
   }
   await page.getByRole('button',{name:locale==='en'?'Keep your existing account':'Bisheriges Konto übernehmen',exact:true}).click();
   await expect(page.getByText('Historical author',{exact:true})).toBeVisible();await expect(page.getByText('Central reader',{exact:true})).toBeVisible();
   await expect(page.locator('input[type="email"],input[type="password"],input[name="id"],input[name="subject"]')).toHaveCount(0);
   const other=locale==='en'?'de':'en';await page.getByRole('button',{name:other.toUpperCase(),exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('lang',other);expect(await page.evaluate(()=>localStorage.getItem('sprachwelten-language'))).toBe(other);await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();
   await expect(page.locator('html')).toHaveAttribute('lang',locale);
   await page.locator('#theme').click();expect(await page.evaluate(()=>localStorage.getItem('sprachwelten-language'))).toBe(locale);
   const chosenTheme=await page.evaluate(()=>localStorage.getItem('sprachwelten-theme'));expect(['light','dark']).toContain(chosenTheme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await page.screenshot({path:info.outputPath('managed-link-'+locale+'.png'),fullPage:true});
   await page.getByRole('button',{name:locale==='en'?'Confirm link':'Verbindung bestätigen',exact:true}).click();
   await expect(page).toHaveURL(/\/me$/);await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('html')).toHaveAttribute('data-theme',chosenTheme!);
   expect((await query('SELECT count(*)::int AS n FROM worlds_legacy_sessions WHERE local_user_id=$1',[id]))[0].n).toBe(1);
   state.nativeSessionId='later-unretained-session';await page.goto('/me');
   await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
   await expect(page.getByRole('link',{name:locale==='en'?'Worlds account':'Worlds-Konto',exact:true})).toHaveCount(0);
   expect((await identity(modelRequest('/api/me/entries'))).source).toBe('worlds');
   state.nativeSessionId='native-fixture-session';
   state.nativeCookie=false;await page.goto('/me');await expect(page.getByText(entry.phrase,{exact:true})).toBeVisible();
   state.nativeCookie=true;await page.goto('/me');await expect(page.locator('.header form[action^="/auth/logout"]')).toBeVisible();
   await page.locator('.header form[action^="/auth/logout"] button').click();
   await expect(page.locator('a.login-button')).toBeVisible();await page.goto('/me');await expect(page.getByText(entry.phrase,{exact:true})).toHaveCount(0);
   expect(state.signOuts).toBe(1);expect(state.nativePosts).toBe(recover?2:0);
   expect(await query('SELECT local_user_id FROM worlds_identity_links WHERE subject=$1',[sub])).toEqual([{local_user_id:id}]);
   expect(await query('SELECT author_id FROM content_entries WHERE id=$1',[entryId])).toEqual([{author_id:id}]);
   expect(await query('SELECT (SELECT count(*) FROM neon_auth."user")::int AS native,(SELECT count(*) FROM worlds_project_accounts)::int AS profiles,(SELECT count(*) FROM worlds_link_audit)::int AS audit',[])).toEqual([{native:1,profiles:1,audit:1}]);
  }finally{if(!page.isClosed()){await page.goto('about:blank');await page.unrouteAll({behavior:'wait'});}if(relay)await new Promise<void>(resolve=>relay!.close(()=>resolve()));await db.close();}
 }
});
