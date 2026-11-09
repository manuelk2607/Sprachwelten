import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {prepareManagedSessionLink,confirmManagedSessionLink} from '@worlds-hub/auth/linking';
import {PostgresLinkStore} from '@worlds-hub/auth/postgres-links';
import {loadManagedOwner} from '../lib/auth/managed-owner';

const settings={origin:'https://sprach-pilot.test',issuer:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',cookieSecret:'synthetic-test-secret-at-least-32-characters'};
const now=Date.now(),id='10000000-0000-4000-8000-000000000001';
const request=(cookie='__Secure-neon-auth.session_token=opaque-fixture',origin=settings.origin,method='POST')=>new Request(settings.origin+'/auth/worlds/link',{method,headers:{origin,cookie}});
async function fixture(){
 const db=new PGlite();
 await db.exec('CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text,banned boolean,"banExpires" timestamptz);CREATE TABLE app_admins(user_id uuid PRIMARY KEY);');
 await db.query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)',[id,'Historical owner']);
 for(const file of ['027_worlds_identity.sql','028_worlds_project_accounts.sql'])await db.exec(await readFile(new URL('../db/migrations/'+file,import.meta.url),'utf8'));
 const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
 return {db,query};
}
const session=()=>({session:{id:'original-native-session',userId:id,token:'PRIVATE_FIXTURE_TOKEN',createdAt:new Date(now-86_400_000).toISOString(),expiresAt:new Date(now+86_400_000).toISOString()},
 user:{id,name:'Historical owner',email:'PRIVATE_FIXTURE_EMAIL@fixture.invalid',emailVerified:false,role:'admin',createdAt:new Date(now-86_400_000).toISOString(),updatedAt:new Date(now).toISOString()}});

test('official SDK revalidates the native owner without browser cache, foreign cookies, extra login or provider role inheritance',async t=>{
 const {db,query}=await fixture(),state={active:true,id:'original-native-session'},requests:string[]=[];
 try{
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   assert.equal(url.origin+url.pathname,settings.issuer+'/get-session');
   assert.equal(url.searchParams.get('disableCookieCache'),'true');assert.equal(url.searchParams.get('disableRefresh'),'true');
   assert.equal(init?.method,'GET');assert.equal(new Headers(init?.headers).get('cookie'),'__Secure-neon-auth.session_token=opaque-fixture');
   assert.equal(new Headers(init?.headers).has('authorization'),false);
   requests.push(url.pathname);const data=session();data.session.id=state.id;
   return Response.json(state.active?data:null);
  });
  const incoming=request('__Secure-neon-auth.session_token=opaque-fixture; __Host-worlds-session=CENTRAL_COOKIE; __Secure-neon-auth.local.session_data=STALE_BROWSER_CACHE');
  const owner=await loadManagedOwner(incoming,settings,query,()=>now);
  assert.equal(owner.proof.accountId,id);assert.equal(owner.proof.createdAt,now-86_400_000);assert.equal(owner.proof.privileged,false);
  assert.equal(JSON.stringify(owner).includes('PRIVATE_FIXTURE'),false);
  const store=new PostgresLinkStore(query),central={issuer:'https://central.test/auth',subject:'central-owner',sessionId:'central-validated-browser',authenticatedAt:now};
  const proof=await prepareManagedSessionLink(central,owner.proof,store,now);
  state.active=false;await assert.rejects(loadManagedOwner(incoming,settings,query,()=>now),error=>(error as {status?:number}).status===401);
  assert.equal((await query('SELECT count(*)::int AS n FROM worlds_identity_links',[]))[0].n,0);
  state.active=true;state.id='another-native-session';
  await assert.rejects(confirmManagedSessionLink(proof,central,(await loadManagedOwner(incoming,settings,query,()=>now)).proof,store,now));
  state.id='original-native-session';await confirmManagedSessionLink(proof,central,(await loadManagedOwner(incoming,settings,query,()=>now)).proof,store,now);
  assert.equal(await store.lookup(central.issuer,central.subject),id);assert.equal(requests.length,4);
  // This role exists only in the new in-memory fixture, never in an external account.
  await query('INSERT INTO app_admins(user_id) VALUES($1)',[id]);
  const admin=await loadManagedOwner(incoming,settings,query,()=>now);assert.equal(admin.proof.privileged,true);
  await assert.rejects(prepareManagedSessionLink({...central,subject:'another-central'},admin.proof,store,now),/LEGACY_REAUTHENTICATION_REQUIRED/);
  assert.deepEqual(await query('SELECT id,name,banned FROM neon_auth."user"',[]),[{id,name:'Historical owner',banned:null}]);
 }finally{await db.close();}
});

test('missing, duplicate or foreign-origin native proof is rejected before contacting the provider',async t=>{
 let reads=0;t.mock.method(globalThis,'fetch',async()=>{reads++;throw Error('Must not contact provider');});
 const query=async()=>{throw Error('Must not query application');};
 for(const incoming of [request(''),request('__Secure-neon-auth.session_token='),request('__Secure-neon-auth.session_token=one; __Secure-neon-auth.session_token=two')])await assert.rejects(loadManagedOwner(incoming,settings,query));
 await assert.rejects(loadManagedOwner(request(undefined,'https://foreign.test'),settings,query));
 await assert.rejects(loadManagedOwner(request(undefined,undefined,'GET'),settings,query));
 await assert.rejects(loadManagedOwner(request(),{...settings,issuer:'https://foreign.test/auth'},query));
 assert.equal(reads,0);
});

test('provider failures, invalid metadata and current local bans never become a transferable ownership proof',async t=>{
 const {db,query}=await fixture();let response:unknown=null,status=200;
 try{
  t.mock.method(globalThis,'fetch',async()=>Response.json(response,{status}));
  for(const code of [401,403,503]){status=code;response={message:'PRIVATE_PROVIDER_DETAIL'};await assert.rejects(loadManagedOwner(request(),settings,query,()=>now),error=>(error as Error).message.includes('PRIVATE_PROVIDER_DETAIL')===false);}
  status=200;
  for(const change of [{userId:'different-account'},{id:''},{createdAt:'not a date'},{createdAt:new Date(now+1).toISOString()},{expiresAt:new Date(now).toISOString()}]){
   const data=session();Object.assign(data.session,change);response=data;await assert.rejects(loadManagedOwner(request(),settings,query,()=>now));
  }
  response=session();let ticks=0;await assert.rejects(loadManagedOwner(request(),settings,query,()=>now+(ticks++?15_000:0)));
  await query('UPDATE neon_auth."user" SET banned=true WHERE id=$1',[id]);
  await assert.rejects(loadManagedOwner(request(),settings,query,()=>now),error=>(error as {status?:number}).status===403);
  assert.equal((await query('SELECT count(*)::int AS n FROM worlds_identity_links',[]))[0].n,0);
  assert.equal((await query('SELECT count(*)::int AS n FROM worlds_link_proofs',[]))[0].n,0);
 }finally{await db.close();}
});

test('a provider that never responds cannot leave an ownership check pending indefinitely',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(globalThis,'fetch',()=>new Promise<Response>(()=>{}));
 let writes=0;
 const checked=assert.rejects(loadManagedOwner(request(),settings,async()=>{writes++;return [];},()=>now),error=>(error as {status?:number}).status===503);
 t.mock.timers.tick(15_000);await checked;assert.equal(writes,0);
});
