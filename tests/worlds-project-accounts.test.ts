import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig,worldsRoute,worldsIdentity} from '../lib/auth/worlds';
import {createWorldsProjectAccount,prepareLegacyProjectAccount} from '../lib/auth/project-accounts';
import {resolveProjectIdentity,requireProjectUser} from '../lib/auth/project-identity';
const origin='https://sprach-pilot.test',issuer='https://issuer.test/auth';
const env={WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',
 DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',
 WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'};
async function fixture(){
 const db=new PGlite(),legacy=crypto.randomUUID(),entry=crypto.randomUUID();
 await db.exec(`CREATE SCHEMA neon_auth;
  CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,email text DEFAULT 'synthetic@example.invalid',banned boolean,"banExpires" timestamptz);
  CREATE TABLE app_admins(user_id uuid PRIMARY KEY);
  CREATE TABLE content_entries(id uuid PRIMARY KEY,author_id text);
 `);
 const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
 await query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)',[legacy,'Historical name']);
 await query('INSERT INTO content_entries VALUES($1,$2)',[entry,legacy]);
 // This fixture grant is confined to this newly created in-memory database.
 await query('INSERT INTO app_admins VALUES($1)',[legacy]);
 await db.exec(await readFile(new URL('../db/migrations/027_worlds_identity.sql',import.meta.url),'utf8'));
 await query('INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)',[issuer,'historical-subject',legacy]);
 const before=await query('SELECT * FROM neon_auth."user"',[]),contents=await query('SELECT * FROM content_entries',[]),grants=await query('SELECT * FROM app_admins',[]);
 await db.exec(await readFile(new URL('../db/migrations/028_worlds_project_accounts.sql',import.meta.url),'utf8'));
 const config=createWorldsConfig(env,query)!,raw=token(),csrf=token(),sub=token(),key=await hash(raw);
 await config.store.putSession(key,{issuer,sub,csrf,expires:Date.now()+120_000,name:'Historical name',email:'synthetic@example.invalid'});
 const request=(path='/auth/worlds/profile?locale=en',form:URLSearchParams=new URLSearchParams({csrf}),headers:Record<string,string>={})=>new Request(origin+path,{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+raw,...headers},body:form});
 return {db,query,legacy,entry,before,contents,grants,config,raw,csrf,sub,key,request};
}
test('migration eligibility requires its own active central session, refuses existing mappings and never changes account data',async()=>{
 const f=await fixture();try{
  const request=(cookie=SESSION_COOKIE+'='+f.raw)=>new Request(origin+'/auth/worlds/recovery',{headers:{cookie}});
  let response=await worldsRoute(request(),f.config,f.query,false);assert.equal(response.status,200);assert.deepEqual(await response.json(),{eligible:true});assert.equal(response.headers.get('cache-control'),'no-store');
  response=await worldsRoute(request(''),f.config,f.query,false);assert.equal(response.status,401);assert.deepEqual(await response.json(),{eligible:false});
  assert.equal((await worldsRoute(new Request(origin+'/auth/worlds/recovery',{method:'POST'}),f.config,f.query,false)).status,405);
  assert.equal((await worldsRoute(new Request('https://foreign.test/auth/worlds/recovery',{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query,false)).status,404);
  await f.query('UPDATE worlds_identity_links SET subject=$1 WHERE local_user_id=$2',[f.sub,f.legacy]);
  response=await worldsRoute(request(),f.config,f.query,false);assert.equal(response.status,409);assert.deepEqual(await response.json(),{eligible:false});
  await f.query('UPDATE worlds_project_accounts SET disabled=true WHERE id=$1',[f.legacy]);
  assert.equal((await worldsRoute(request(),f.config,f.query,false)).status,409);
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user"',[]),f.before);assert.deepEqual(await f.query('SELECT * FROM content_entries',[]),f.contents);assert.deepEqual(await f.query('SELECT * FROM app_admins',[]),f.grants);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_link_audit',[]))[0].n,0);
 }finally{await f.db.close();}
});
test('migration retains native UUID, existing mapping, content ownership and roles without changing native Auth',async()=>{
 const f=await fixture();try{
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user"',[]),f.before);
  assert.deepEqual(await f.query('SELECT * FROM content_entries',[]),f.contents);
  assert.deepEqual(await f.query('SELECT * FROM app_admins',[]),f.grants);
  assert.deepEqual(await f.query('SELECT local_user_id FROM worlds_identity_links WHERE subject=$1',['historical-subject']),[{local_user_id:f.legacy}]);
  assert.equal(await prepareLegacyProjectAccount(f.legacy,f.query),f.legacy);
  const id=await createWorldsProjectAccount({issuer,sub:'historical-subject',name:'Another name',email:'another@example.invalid'},f.query);
  assert.equal(id,f.legacy);assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_project_accounts',[]))[0].n,1);
  await f.query('UPDATE neon_auth."user" SET banned=true WHERE id=$1',[f.legacy]);
  await assert.rejects(prepareLegacyProjectAccount(f.legacy,f.query));
  await assert.rejects(createWorldsProjectAccount({issuer,sub:'historical-subject'},f.query),error=>(error as {status?:number}).status===403);
 }finally{await f.db.close();}
});
test('a new central identity creates one application profile, no native user or password, with no name/email merge or role grant',async()=>{
 const f=await fixture();try{
  const requests=await Promise.all([worldsRoute(f.request(),f.config,f.query,false),worldsRoute(f.request(),f.config,f.query,false)]);
  assert.deepEqual(requests.map(r=>r.status),[303,303]);assert.ok(requests.every(r=>r.headers.get('location')==='/en/learn'));
  assert.equal((await worldsRoute(f.request('/auth/worlds/profile?locale=en&next=%2Fme'),f.config,f.query,false)).headers.get('location'),'/me');
  assert.equal((await worldsRoute(f.request('/auth/worlds/profile?locale=en&next=https%3A%2F%2Fforeign.test'),f.config,f.query,false)).headers.get('location'),'/en/learn');
  const [mapped]=await f.query('SELECT local_user_id FROM worlds_identity_links WHERE issuer=$1 AND subject=$2',[issuer,f.sub]);
  assert.equal(typeof mapped.local_user_id,'string');assert.notEqual(mapped.local_user_id,f.legacy);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_project_accounts',[]))[0].n,2);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_link_audit WHERE subject=$1',[f.sub]))[0].n,1);
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user"',[]),f.before);
  assert.deepEqual(await f.query('SELECT * FROM content_entries',[]),f.contents);assert.deepEqual(await f.query('SELECT * FROM app_admins',[]),f.grants);
  const request=new Request(origin+'/api/me/entries',{headers:{cookie:SESSION_COOKIE+'='+f.raw}});
  const identity=await resolveProjectIdentity(request,f.config,f.query,async()=>{throw new Error('New central users must not call native sign-in')});
  assert.deepEqual(requireProjectUser(identity),{id:mapped.local_user_id,name:'Historical name'});
  await f.query('UPDATE worlds_project_accounts SET disabled=true WHERE id=$1',[mapped.local_user_id]);
  assert.equal((await worldsIdentity(request,f.config,f.query)).user,undefined);
  assert.equal((await worldsRoute(f.request(),f.config,f.query,false)).status,403);
  const blocked=await worldsRoute(new Request(origin+'/auth/worlds-en',{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query,false);
  const html=await blocked.text();assert.match(html,/profile is unavailable/);assert.doesNotMatch(html,/action="\/auth\/worlds\/profile/);
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_project_accounts',[]))[0].n,2);
 }finally{await f.db.close();}
});
test('profile start enforces method, origin, exact CSRF, bounded form, central session and active-legacy separation in both languages',async()=>{
 const f=await fixture();try{
  const form=new URLSearchParams({csrf:f.csrf});
  assert.equal((await worldsRoute(new Request(origin+'/auth/worlds/profile'),f.config,f.query,false)).status,405);
  assert.equal((await worldsRoute(f.request(undefined,form,{origin:'https://foreign.test'}),f.config,f.query,false)).status,403);
  assert.equal((await worldsRoute(f.request(undefined,form,{'sec-fetch-site':'cross-site'}),f.config,f.query,false)).status,403);
  for(const bad of [new URLSearchParams({csrf:'wrong'}),new URLSearchParams([['csrf',f.csrf],['csrf',f.csrf]]),new URLSearchParams({csrf:f.csrf,local_user_id:f.legacy})])assert.equal((await worldsRoute(f.request(undefined,bad),f.config,f.query,false)).status,403);
  assert.equal((await worldsRoute(f.request(undefined,new URLSearchParams({csrf:'a'.repeat(3000)})),f.config,f.query,false)).status,413);
  const empty=await worldsRoute(new Request(origin+'/auth/worlds/profile?locale=en',{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+f.raw,'content-type':'application/x-www-form-urlencoded'}}),f.config,f.query,false);
  assert.equal(empty.status,400);assert.match(await empty.text(),/Please check your input/);
  const conflict=await worldsRoute(f.request(),f.config,f.query,true);assert.equal(conflict.status,409);assert.match(await conflict.text(),/previous Sprachwelten account is still active/);
  for(const [path,label]of [['/auth/worlds','Sprachwelten mit Worlds verwenden'],['/auth/worlds-en','Use Sprachwelten with Worlds']]){
   const page=await worldsRoute(new Request(origin+path,{headers:{cookie:SESSION_COOKIE+'='+f.raw}}),f.config,f.query,false);
   const html=await page.text();assert.ok(html.includes(label));assert.doesNotMatch(html,/type="password"|type="email"|name="name"/);
  }
  assert.equal((await f.query('SELECT count(*)::int AS n FROM worlds_project_accounts',[]))[0].n,1);
  await f.config.store.deleteSession(f.key);
  assert.equal((await worldsRoute(f.request(),f.config,f.query,false)).status,401);
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user"',[]),f.before);
 }finally{await f.db.close();}
});
test('removing the native source leaves historical ownership intact but does not restore access through a new profile',async()=>{
 const f=await fixture();try{
  const raw=token();await f.config.store.putSession(await hash(raw),{issuer,sub:'historical-subject',csrf:token(),expires:Date.now()+60_000,email:'synthetic@example.invalid'});
  await f.query('DELETE FROM neon_auth."user" WHERE id=$1',[f.legacy]);
  const request=new Request(origin+'/api/me/entries',{headers:{cookie:SESSION_COOKIE+'='+raw}});
  assert.equal((await worldsIdentity(request,f.config,f.query)).user,undefined);
  await assert.rejects(createWorldsProjectAccount({issuer,sub:'historical-subject'},f.query),error=>(error as {status?:number}).status===403);
  assert.deepEqual(await f.query('SELECT * FROM content_entries',[]),f.contents);
  assert.equal((await f.query('SELECT local_user_id FROM worlds_identity_links WHERE subject=$1',['historical-subject']))[0].local_user_id,f.legacy);
 }finally{await f.db.close();}
});

test('an audit failure rolls back the new profile and mapping together',async()=>{
 const f=await fixture();try{
  await f.db.exec('ALTER TABLE worlds_link_audit ADD CONSTRAINT qa_audit_failure CHECK(false)');
  await assert.rejects(createWorldsProjectAccount({issuer,sub:f.sub,name:'New central profile'},f.query),error=>(error as {code?:string}).code==='23514');
  const [counts]=await f.query('SELECT (SELECT count(*) FROM worlds_project_accounts)::int AS profiles,(SELECT count(*) FROM worlds_identity_links)::int AS links,(SELECT count(*) FROM worlds_link_audit)::int AS audit',[]);
  assert.deepEqual(counts,{profiles:1,links:1,audit:0});
  assert.deepEqual(await f.query('SELECT * FROM neon_auth."user"',[]),f.before);
 }finally{await f.db.close();}
});
