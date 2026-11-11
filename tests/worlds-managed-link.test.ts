import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig,worldsRoute,worldsIdentity} from '../lib/auth/worlds';
import {managedLinkRoute} from '../lib/auth/worlds-managed-link';
import {projectLogout} from '../lib/auth/worlds-logout';
import {resolveProjectIdentity} from '../lib/auth/project-identity';

async function fixture(){
 const db=new PGlite(),id=crypto.randomUUID(),other=crypto.randomUUID(),raw=token(),csrf=token(),sub=token();
 await db.exec('CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,banned boolean,"banExpires" timestamptz);CREATE TABLE neon_auth.session(id text,"userId" uuid,"expiresAt" timestamptz);CREATE TABLE app_admins(user_id uuid PRIMARY KEY);CREATE TABLE content_entries(id uuid PRIMARY KEY,author_id text);');
 const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
 await query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2),($3,$4)',[id,'Historical <owner>',other,'Other owner']);
 await query('INSERT INTO content_entries VALUES($1,$2)',[crypto.randomUUID(),id]);
 for(const file of ['027_worlds_identity.sql','028_worlds_project_accounts.sql','029_worlds_legacy_sessions.sql'])await db.exec(await readFile(new URL('../db/migrations/'+file,import.meta.url),'utf8'));
 const origin='https://sprach-pilot.test',issuer='https://central.test/auth';
 const config=createWorldsConfig({WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'},query)!;
 const identity={issuer,sub,csrf,name:'Central <reader>',email:'private@fixture.invalid',authenticatedAt:Date.now(),expires:Date.now()+120_000};
 await config.store.putSession(await hash(raw),identity);
 const state={sessionId:'native-session',active:true,privileged:false,createdAt:Date.now()-86_400_000,reads:0};
 const owner=async()=>{state.reads++;if(!state.active)throw new Error('Native provider unavailable');return {name:'Historical <owner>',proof:{kind:'managed-auth-session' as const,issuer:'https://native.test/auth',accountId:id,sessionId:state.sessionId,createdAt:state.createdAt,expiresAt:Date.now()+86_400_000,validatedAt:Date.now(),privileged:state.privileged}};};
 const request=(action='link',body=new URLSearchParams({csrf}),locale='en',extra:Record<string,string>={})=>new Request(origin+(action==='logout'?'/auth/logout':'/auth/worlds/'+action)+'?'+new URLSearchParams({locale,next:'/me'}),{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+raw+'; __Secure-neon-auth.session_token=native-fixture',...extra},body});
 const stage=async()=>{const response=await managedLinkRoute(request(),config,query,owner);assert.equal(response.status,200);const html=await response.text(),proof=/name="proof" value="([A-Za-z0-9_-]+)"/.exec(html)?.[1];assert.ok(proof);return {proof,html,response};};
 return {db,id,other,raw,csrf,sub,origin,issuer,config,identity,query,state,owner,request,stage};
}
test('a valid native credential outside the frozen legacy roster cannot create a link',async()=>{
 const f=await fixture();try{
  await f.query('UPDATE worlds_project_accounts SET legacy_login_eligible=false WHERE id=$1',[f.id]);
  const response=await managedLinkRoute(f.request(),f.config,f.query,f.owner);assert.equal(response.status,403);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_identity_links',[]))[0].n,0);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_link_proofs',[]))[0].n,0);
 }finally{await f.db.close();}
});

test('the HTTP takeover flow keeps historical ownership, escapes account names, consumes once and returns to the private page',async()=>{
 const f=await fixture();try{
  const before=await f.query('SELECT * FROM neon_auth."user" ORDER BY id',[]),contents=await f.query('SELECT * FROM content_entries',[]);
  const account=await worldsRoute(new Request(f.origin+'/auth/worlds-en?next=%2Fme',{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query,{id:f.id,name:'Historical <owner>'});
  assert.match(await account.text(),/Keep your existing account/);
  const {proof,html,response}=await f.stage();
  assert.match(html,/Historical &lt;owner&gt;/);assert.match(html,/Central &lt;reader&gt;/);assert.doesNotMatch(html,/private@fixture|native-session/);
  assert.match(html,/lang="en"/);assert.match(html,/locale=de/);assert.match(html,/localStorage.setItem\('sprachwelten-language',"en"\)/);
  const nonce=/style nonce="([A-Za-z0-9_-]+)"/.exec(html)![1];assert.ok(response.headers.get('content-security-policy')?.includes("style-src 'nonce-"+nonce+"'"));
  assert.equal(response.headers.get('referrer-policy'),'strict-origin');
  const confirm=()=>managedLinkRoute(f.request('confirm',new URLSearchParams({csrf:f.csrf,proof})),f.config,f.query,f.owner);
  const results=await Promise.all([confirm(),confirm()]);assert.deepEqual(results.map(r=>r.status).sort(),[303,409]);
  assert.equal(results.find(r=>r.status===303)!.headers.get('location'),'/me');
  assert.equal((await f.query('SELECT local_user_id FROM worlds_identity_links WHERE subject=$1',[f.sub]))[0].local_user_id,f.id);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_link_audit',[]))[0].n,1);
  assert.equal((await confirm()).status,409);
  const current=await worldsIdentity(new Request(f.origin+'/me',{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query);assert.equal(current.user?.id,f.id);
  const both=await resolveProjectIdentity(new Request(f.origin+'/me',{headers:{cookie:SESSION_COOKIE+'='+f.raw+'; __Secure-neon-auth.session_token=native-fixture'}}),f.config,f.query,async()=>({user:{id:f.id,name:'Historical <owner>'},error:null}));assert.equal(both.user?.id,f.id);assert.equal(both.source,'legacy');
  const already=await worldsRoute(new Request(f.origin+'/auth/worlds-en',{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query,{id:f.id,name:'Historical <owner>'});assert.match(await already.text(),/already linked to Worlds/);
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user" ORDER BY id',[]),before);assert.deepEqual(await f.query('SELECT * FROM content_entries',[]),contents);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM app_admins',[]))[0].n,0);
 }finally{await f.db.close();}
});

test('HTTP method, origin, exact form fields, size and CSRF are checked before the native owner is queried',async()=>{
 const f=await fixture();try{
  assert.equal((await managedLinkRoute(new Request(f.origin+'/auth/worlds/link'),f.config,f.query,f.owner)).status,405);
  for(const [body,headers,status]of [[new URLSearchParams({csrf:'wrong'}),{},403],[new URLSearchParams({csrf:f.csrf,id:f.id}),{},403],
   [new URLSearchParams([['csrf',f.csrf],['csrf',f.csrf]]),{},403],[new URLSearchParams({csrf:f.csrf}),{origin:'https://foreign.test'},403],
   [new URLSearchParams({csrf:'a'.repeat(2049)}),{},413],[new URLSearchParams({csrf:f.csrf}),{'content-type':'application/json'},415]] as const){
   assert.equal((await managedLinkRoute(f.request('link',body,'en',headers),f.config,f.query,f.owner)).status,status);
  }
  assert.equal(f.state.reads,0);assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_link_proofs',[]))[0].n,0);
 }finally{await f.db.close();}
});

test('both sessions must still match; provider failure, revoked BFF and stale administrator proof never create a mapping',async()=>{
 const f=await fixture();try{
  const {proof}=await f.stage();f.state.sessionId='replacement';
  assert.equal((await managedLinkRoute(f.request('confirm',new URLSearchParams({csrf:f.csrf,proof})),f.config,f.query,f.owner)).status,409);
  f.state.active=false;assert.equal((await managedLinkRoute(f.request('confirm',new URLSearchParams({csrf:f.csrf,proof})),f.config,f.query,f.owner)).status,503);
  f.state.active=true;f.state.sessionId='native-session';f.state.privileged=true;
  const oldAdmin=await managedLinkRoute(f.request(),f.config,f.query,f.owner);assert.equal(oldAdmin.status,401);const html=await oldAdmin.text();assert.match(html,/administrator account/);assert.match(html,/href="\/worlds-migration\?lang=en&amp;next=%2Fme"/);
  f.state.createdAt=Date.now();assert.equal((await managedLinkRoute(f.request(),f.config,f.query,f.owner)).status,200);
  f.state.privileged=false;await f.config.store.deleteSession(await hash(f.raw));
  assert.equal((await managedLinkRoute(f.request('confirm',new URLSearchParams({csrf:f.csrf,proof})),f.config,f.query,f.owner)).status,401);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_identity_links',[]))[0].n,0);
 }finally{await f.db.close();}
});

test('a stale central login requests supported reauthentication and competing mappings are never overwritten',async()=>{
 const f=await fixture();try{
  await f.config.store.deleteSession(await hash(f.raw));await f.config.store.putSession(await hash(f.raw),{...f.identity,authenticatedAt:Date.now()-300_001});
  const reauth=await managedLinkRoute(f.request(),f.config,f.query,f.owner);assert.equal(reauth.status,401);const html=await reauth.text();assert.match(html,/reauth=1/);assert.equal(f.state.reads,0);
  await f.config.store.deleteSession(await hash(f.raw));await f.config.store.putSession(await hash(f.raw),f.identity);
  await f.query('INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)',[f.issuer,f.sub,f.other]);
  const conflict=await managedLinkRoute(f.request(),f.config,f.query,f.owner);assert.equal(conflict.status,409);assert.match(await conflict.text(),/No accounts will be merged/);
  assert.equal((await f.query('SELECT local_user_id FROM worlds_identity_links WHERE subject=$1',[f.sub]))[0].local_user_id,f.other);
 }finally{await f.db.close();}
});

test('local logout ends both local credentials, keeps validation before side effects and preserves the BFF during a native outage',async()=>{
 const f=await fixture();let signs=0;
 try{
  const logout=()=>projectLogout(f.request('logout'),f.config,async()=>{signs++;return Response.json({success:true},{headers:{'set-cookie':'__Secure-neon-auth.session_token=; Secure; HttpOnly; Path=/; Max-Age=0'}});});
  assert.equal((await projectLogout(f.request('logout',new URLSearchParams({csrf:'wrong'})),f.config,async()=>{signs++;return Response.json({success:true});})).status,403);assert.equal(signs,0);
  const failed=await projectLogout(f.request('logout'),f.config,async()=>new Response(null,{status:503}));assert.equal(failed.status,503);assert.ok(await f.config.store.getSession(await hash(f.raw)));
  const result=await logout();assert.equal(result.status,303);assert.equal(signs,1);
  assert.equal(await f.config.store.getSession(await hash(f.raw)),null);
  const cookies=result.headers.getSetCookie().join('\n');assert.match(cookies,/__Host-worlds-session=;.*Max-Age=0/);assert.match(cookies,/__Secure-neon-auth.session_token=;/);assert.match(cookies,/__Secure-neon-auth.local.session_data=;.*Max-Age=0/);assert.doesNotMatch(cookies,/Domain=|undefined/);
 }finally{await f.db.close();}
});
