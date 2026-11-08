import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig} from '../lib/auth/worlds';
import {resolveProjectIdentity,requireProjectUser} from '../lib/auth/project-identity';
import {account} from '../lib/http';
import {contributor} from '../lib/contributor';
import {requireAdministrator} from '../lib/admin';
import {ownsEntry} from '../db/community-repository';
import {GET as worldsStatus,POST as worldsStatusPost} from '../app/auth/[action]/route';
import {POST as mutateLegacyProfile} from '../app/api/auth/[...path]/route';

const origin='https://sprach-pilot.test',issuer='https://issuer.test/auth';
const env={WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',
 DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',
 NEON_AUTH_COOKIE_SECRET:'synthetic-configuration-only-32-characters',WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'};

test('the shared project resolver preserves valid legacy identity, rejects provider failure, and distinguishes missing Worlds mapping',async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE SCHEMA neon_auth; CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,banned boolean,"banExpires" timestamptz);');
  await db.exec(await readFile(new URL('../db/migrations/027_worlds_identity.sql',import.meta.url),'utf8'));
  const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
  const config=createWorldsConfig(env,query)!,raw=token(),sub=token(),csrf=token(),localId=crypto.randomUUID();
  await query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)',[localId,'Original owner']);
  await config.store.putSession(await hash(raw),{issuer,sub,csrf,expires:Date.now()+60_000});
  const request=(extra='')=>new Request(origin+'/api/me/entries',{headers:{cookie:SESSION_COOKIE+'='+raw+extra}});
  let legacyReads=0;
  const legacy=async()=>{legacyReads++;return {user:null,error:null}};
  const pending=await resolveProjectIdentity(request(),config,query,legacy);
  assert.equal(pending.source,'worlds');assert.equal(pending.authenticated,true);assert.equal(pending.user,undefined);
  assert.throws(()=>requireProjectUser(pending));assert.equal(legacyReads,0);
  const duplicate=await resolveProjectIdentity(request('; '+SESSION_COOKIE+'='+token()),config,query,legacy);
  assert.equal(duplicate.source,'worlds');assert.equal(duplicate.authenticated,false);assert.equal(legacyReads,0);
  await query('INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)',[issuer,sub,localId]);
  const mapped=await resolveProjectIdentity(request(),config,query,legacy);
  assert.equal(requireProjectUser(mapped).id,localId);assert.equal(mapped.csrf,csrf);
  const other={id:crypto.randomUUID(),name:'Another active local account'};
  const both=request('; __Secure-neon-auth.session_token=fixture');
  const native=await resolveProjectIdentity(both,config,query,async()=>({user:other,error:null}));
  assert.equal(native.source,'legacy');assert.deepEqual(requireProjectUser(native),other);
  const stale=await resolveProjectIdentity(both,config,query,legacy);
  assert.equal(stale.source,'worlds');assert.equal(stale.user?.id,localId,'An expired native cookie must not mask the valid mapped account');
  const outage=await resolveProjectIdentity(both,config,query,async()=>({user:null,error:new Error('fixture outage')}));
  assert.throws(()=>requireProjectUser(outage));assert.equal(outage.source,'legacy');
  assert.deepEqual(requireProjectUser(await resolveProjectIdentity(request(),undefined,query,async()=>({user:other,error:null}))),other);
  await assert.rejects(resolveProjectIdentity(new Request('https://other.test/api/me',{headers:{cookie:SESSION_COOKIE+'='+raw}}),config,query,legacy));
  await config.store.deleteSession(await hash(raw));
  const expired=await resolveProjectIdentity(request(),config,query,legacy);
  assert.equal(expired.source,'worlds');assert.equal(expired.authenticated,false);assert.throws(()=>requireProjectUser(expired));
 }finally{await db.close();}
});

test('actual account, contribution, ownership and admin guards use the mapped historical ID without changing native identity settings',async t=>{
 const db=new PGlite(),previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 try{
  for(const [key,value]of Object.entries(env))process.env[key]=value;
  await db.exec(`CREATE SCHEMA neon_auth;
   CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text NOT NULL,banned boolean,"banExpires" timestamptz);
   CREATE TABLE app_admins(user_id uuid PRIMARY KEY);
   CREATE TABLE request_limits(key text PRIMARY KEY,hits integer,expires_at timestamptz);
   CREATE TABLE content_entries(id uuid PRIMARY KEY,author_id text,deleted_at timestamptz);
  `);
  await db.exec(await readFile(new URL('../db/migrations/027_worlds_identity.sql',import.meta.url),'utf8'));
  const query=async(sql:string,params:unknown[])=>(await db.query<Record<string,unknown>>(sql,params)).rows;
  const config=createWorldsConfig(env,query)!,id=crypto.randomUUID(),other=crypto.randomUUID(),entry=crypto.randomUUID(),raw=token(),sub=token();
  await query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2),($3,$4)',[id,'Historical owner',other,'Other owner']);
  await query('INSERT INTO content_entries(id,author_id) VALUES($1,$2)',[entry,id]);
  await query('INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)',[issuer,sub,id]);
  await config.store.putSession(await hash(raw),{issuer,sub,csrf:token(),expires:Date.now()+60_000});
  const before=await query('SELECT * FROM content_entries',[]);
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{
   const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.hostname,'api.neon.tech','Only the in-memory SQL adapter may be called');
   const body=JSON.parse(String(init?.body)) as {query:string;params:unknown[]};
   const result=await db.query<Record<string,unknown>>(body.query,body.params);
   return Response.json({fields:result.fields,rows:result.rows.map(row=>result.fields.map(field=>{
    const value=row[field.name];if(value===null)return null;
    return typeof value==='object'?JSON.stringify(value):String(value);
   })),rowCount:result.affectedRows??result.rows.length});
  });
  const request=new Request(origin+'/api/me/entries',{headers:{cookie:SESSION_COOKIE+'='+raw}});
  assert.equal((await worldsStatusPost(new Request(origin+'/auth/status',{method:'POST'}))).status,405);
  const status=await worldsStatus(new Request(origin+'/auth/status',{headers:{cookie:SESSION_COOKIE+'='+raw}}));
  assert.equal(status.status,200);assert.equal((await status.json() as {user:{id:string}}).user.id,id);assert.equal(status.headers.get('cache-control'),'no-store');
  assert.deepEqual(await account(request),{id,name:'Historical owner'});
  assert.deepEqual(await contributor(request),{id,name:'Historical owner',guest:false});
  assert.equal(await ownsEntry(entry,(await account(request)).id),true);
  assert.equal(await ownsEntry(entry,other),false);
  await assert.rejects(requireAdministrator(request),error=>(error as {status?:number}).status===403);
  // This grant exists only in the new in-memory database; no external identity or role is changed.
  await query('INSERT INTO app_admins VALUES($1)',[id]);
  assert.equal(await requireAdministrator(request),id);
  await query('DELETE FROM app_admins WHERE user_id=$1',[id]);
  await assert.rejects(requireAdministrator(request));
  const mutation=await mutateLegacyProfile(new Request(origin+'/api/auth/update-user',{method:'POST',headers:{cookie:SESSION_COOKIE+'='+raw,origin,'content-type':'application/json'},body:JSON.stringify({name:'Wrong directory'})}),{params:Promise.resolve({path:['update-user']})});
  assert.equal(mutation.status,403);
  assert.equal((await query('SELECT name FROM neon_auth."user" WHERE id=$1',[id]))[0].name,'Historical owner');
  await query('UPDATE neon_auth."user" SET banned=true WHERE id=$1',[id]);
  await assert.rejects(account(request));await assert.rejects(contributor(request));await assert.rejects(requireAdministrator(request));
  await query('UPDATE neon_auth."user" SET banned=false WHERE id=$1',[id]);
  await config.store.deleteSession(await hash(raw));
  await assert.rejects(contributor(request),'Expired Worlds must not silently create a guest author');
  assert.deepEqual(await query('SELECT * FROM content_entries',[]),before);
 }finally{
  for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
  await db.close();
 }
});
