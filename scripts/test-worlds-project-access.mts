import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {isolatedAuthTarget,isolatedDatabaseTarget} from '../lib/qa-target.ts';
import {createWorldsConfig} from '../lib/auth/worlds.ts';
import {account} from '../lib/http.ts';
import {contributor} from '../lib/contributor.ts';
import {requireAdministrator} from '../lib/admin.ts';
import {POST as createEntry} from '../app/api/entries/route.ts';
import {GET as entryDetail} from '../app/api/entries/[id]/route.ts';
import {PATCH as editOwnEntry,DELETE as removeOwnEntry} from '../app/api/me/entries/[id]/route.ts';

// Called only after the parent native QA test has created and read back this synthetic user.
// No identity-provider configuration or account role is changed here.
export async function verifyWorldsProjectAccess(userId:string,issuer:string,subject:string){
 const connection=isolatedDatabaseTarget(process.env),native=isolatedAuthTarget(process.env),sql=neon(connection.href);
 const origin='https://sprachwelten-project-qa.invalid';
 const overrides={WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:connection.hostname,
  WORLDS_CLIENT_ID:'synthetic-project-access',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api',NEON_AUTH_BASE_URL:native.href.replace(/\/$/,'')};
 const previous=Object.fromEntries(Object.keys(overrides).map(key=>[key,process.env[key]]));
 const raw=token(),sessionKey=await hash(raw),csrf=token(),queries=(text:string,values:unknown[])=>sql.query(text,values);
 let entryId:string|undefined;
 const request=(path:string,method='GET',data?:unknown)=>new Request(origin+path,{method,
  headers:{origin,cookie:SESSION_COOKIE+'='+raw,...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const before=await sql`SELECT (SELECT count(*) FROM content_entries)::int AS entries,(SELECT count(*) FROM app_admins)::int AS grants`;
 try{
  for(const [key,value]of Object.entries(overrides))process.env[key]=value;
  const config=createWorldsConfig(process.env,queries);assert.ok(config);
  await config.store.putSession(sessionKey,{issuer,sub:subject,csrf,expires:Date.now()+120_000});
  const user=await account(request('/api/me/entries'));assert.equal(user.id,userId);
  assert.deepEqual(await contributor(request('/api/entries')),{...user,guest:false});
  await assert.rejects(requireAdministrator(request('/api/admin/entries')),error=>(error as {status?:number}).status===403);
  const input={kind:'word',phrase:'QA Worlds '+crypto.randomUUID(),language:'de',literal:'Isolated QA counterpart'};
  const created=await createEntry(request('/api/entries','POST',input));assert.equal(created.status,201);
  const result=await created.json() as {entry:{id:string;revision:number;authorName:string}};
  entryId=result.entry.id;assert.equal(result.entry.authorName,'');
  const [ownership]=await sql`SELECT author_id FROM content_entries WHERE id=${entryId}::uuid`;assert.equal(ownership.author_id,userId);
  const context={params:Promise.resolve({id:entryId})};
  const detail=await entryDetail(request('/api/entries/'+entryId),context);assert.equal(detail.status,200);
  const view=await detail.json() as {canEdit:boolean;canSuggest:boolean};assert.equal(view.canEdit,true);assert.equal(view.canSuggest,false);
  const edited=await editOwnEntry(request('/api/me/entries/'+entryId,'PATCH',{...input,literal:'Edited isolated counterpart',revision:result.entry.revision}),context);assert.equal(edited.status,200);
  const [updated]=await sql`SELECT author_id,revision,literal FROM content_entries WHERE id=${entryId}::uuid`;
  assert.equal(updated.author_id,userId);assert.equal(updated.literal,'Edited isolated counterpart');
  assert.equal((await removeOwnEntry(request('/api/me/entries/'+entryId,'DELETE',{revision:updated.revision}),context)).status,200);
  const [removed]=await sql`SELECT author_id,deleted_at IS NOT NULL AS removed FROM content_entries WHERE id=${entryId}::uuid`;assert.equal(removed.author_id,userId);assert.equal(removed.removed,true);
  await config.store.deleteSession(sessionKey);
  await assert.rejects(contributor(request('/api/entries')));
  console.log('PASS: actual Worlds account/contribution/detail/edit/delete routes preserve native UUID and ownership; no admin role granted; revoked session cannot become a guest author.');
 }finally{
  for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
  // Only this test's own identifiers; parent cleanup owns the mapping and native user.
  if(entryId)await sql.transaction([
   sql`DELETE FROM moderation_events WHERE entry_id=${entryId}::uuid`,
   sql`DELETE FROM content_entries WHERE id=${entryId}::uuid AND author_id=${userId}`,
  ]);
  await sql.transaction([
   sql`DELETE FROM worlds_auth_sessions WHERE id=${sessionKey}`,
   sql`DELETE FROM request_limits WHERE key=${'entry:'+userId}`,
  ]);
  assert.deepEqual(await sql`SELECT (SELECT count(*) FROM content_entries)::int AS entries,(SELECT count(*) FROM app_admins)::int AS grants`,before);
 }
}
