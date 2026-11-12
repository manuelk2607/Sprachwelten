import {adminUsers} from '../db/admin-repository.ts';
import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {isolatedAuthTarget,isolatedDatabaseTarget} from '../lib/qa-target.ts';
import {POST as startProfile} from '../app/auth/[action]/route.ts';
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
 let entryId:string|undefined,newEntryId:string|undefined,newProfileId:string|undefined;
 const newRaw=token(),newKey=await hash(newRaw),newSub=token(),newCsrf=token(),newIp='qa-worlds-profile-'+newSub;
 const profileRateKey='worlds:/auth/worlds/profile:'+await hash(newIp);
 const request=(path:string,method='GET',data?:unknown)=>new Request(origin+path,{method,
  headers:{origin,cookie:SESSION_COOKIE+'='+raw,...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const snapshot=()=>sql`SELECT (SELECT count(*) FROM content_entries)::int AS entries,(SELECT count(*) FROM app_admins)::int AS grants,(SELECT count(*) FROM neon_auth."user")::int AS native_accounts,(SELECT count(*) FROM worlds_project_accounts)::int AS project_accounts`;
 const before=await snapshot();
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
  // A synthetic central BFF fixture with the same name/email must get its own
  // application profile. This is not a real OIDC or email-delivery claim.
  const [nativeProfile]=await sql`SELECT id,name,email,"emailVerified" FROM neon_auth."user" WHERE id=${userId}::uuid`;
  assert.ok(String(nativeProfile.email).endsWith('@sprachwelten.invalid'));
  await config.store.putSession(newKey,{issuer,sub:newSub,csrf:newCsrf,name:String(nativeProfile.name),email:String(nativeProfile.email),expires:Date.now()+120_000});
  const newRequest=(path:string,method='GET',data?:unknown)=>new Request(origin+path,{method,
   headers:{origin,cookie:SESSION_COOKIE+'='+newRaw,...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  const createProfile=()=>startProfile(new Request(origin+'/auth/worlds/profile?locale=en&next=%2Fme',{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+newRaw,'cf-connecting-ip':newIp},body:new URLSearchParams({csrf:newCsrf})}));
  const started=await Promise.all([createProfile(),createProfile()]);assert.deepEqual(started.map(r=>r.status),[303,303]);assert.ok(started.every(r=>r.headers.get('location')==='/me'));
  const [mapped]=await sql`SELECT local_user_id FROM worlds_identity_links WHERE issuer=${issuer} AND subject=${newSub}`;
  newProfileId=String(mapped.local_user_id);assert.notEqual(newProfileId,userId);
  assert.equal((await createProfile()).status,303);
  const [counts]=await sql`SELECT
    (SELECT count(*) FROM worlds_link_audit WHERE issuer=${issuer} AND subject=${newSub})::int AS audit,
    (SELECT count(*) FROM worlds_link_audit WHERE issuer=${issuer} AND subject=${newSub} AND receipt_eligible)::int AS receipts,
    (SELECT count(*) FROM worlds_project_accounts WHERE id=${newProfileId}::uuid AND kind='worlds' AND legacy_user_id IS NULL)::int AS profiles`;
  assert.deepEqual(counts,{audit:1,receipts:0,profiles:1});assert.equal((await snapshot())[0].native_accounts,before[0].native_accounts);
  assert.equal((await account(newRequest('/api/me/entries'))).id,newProfileId);
  const registry=await adminUsers('',0,true);
  assert.equal(registry.users.filter(row=>row.id===newProfileId&&row.authSource==='worlds'&&row.email===''&&!row.isAdmin).length,1);
  assert.equal(registry.users.filter(row=>row.id===userId&&row.authSource==='legacy').length,1);
  await assert.rejects(requireAdministrator(newRequest('/api/admin/entries')),error=>(error as {status?:number}).status===403);
  const fresh=await createEntry(newRequest('/api/entries','POST',{kind:'word',phrase:'New central profile '+crypto.randomUUID(),language:'de',literal:'Independent project ownership'}));assert.equal(fresh.status,201);
  const freshResult=await fresh.json() as {entry:{id:string;revision:number;authorName:string}};newEntryId=freshResult.entry.id;assert.equal(freshResult.entry.authorName,'');
  const [freshOwner]=await sql`SELECT author_id FROM content_entries WHERE id=${newEntryId}::uuid`;assert.equal(freshOwner.author_id,newProfileId);
  const freshContext={params:Promise.resolve({id:newEntryId})};
  assert.equal((await editOwnEntry(newRequest('/api/me/entries/'+newEntryId,'PATCH',{kind:'word',phrase:'Edited central profile '+crypto.randomUUID(),language:'de',literal:'Independent project ownership',revision:freshResult.entry.revision}),freshContext)).status,200);
  await config.store.deleteSession(newKey);await assert.rejects(account(newRequest('/api/me/entries')));
  assert.deepEqual(await sql`SELECT id,name,email,"emailVerified" FROM neon_auth."user" WHERE id=${userId}::uuid`,[nativeProfile]);
  console.log('PASS: actual concurrent profile route creates one application profile/audit, no native Auth account, no matching-name/email merge, no role grant, own contribution writes and session revocation.');

 }finally{
  for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
  // Only this test's own identifiers; parent cleanup owns the mapping and native user.
  for(const id of [entryId,newEntryId])if(id)await sql.transaction([
   sql`DELETE FROM moderation_events WHERE entry_id=${id}::uuid`,
   sql`DELETE FROM content_entries WHERE id=${id}::uuid AND (author_id=${userId} OR author_id=${newProfileId??''})`,
  ]);
  await sql.transaction([
   sql`DELETE FROM worlds_auth_sessions WHERE id=${sessionKey} OR id=${newKey}`,
   sql`DELETE FROM request_limits WHERE key=${'entry:'+userId} OR key=${'entry:'+(newProfileId??'')} OR key=${profileRateKey}`,
   sql`DELETE FROM worlds_link_audit WHERE issuer=${issuer} AND subject=${newSub}`,
   sql`DELETE FROM worlds_project_accounts WHERE kind='worlds' AND id IN (SELECT local_user_id FROM worlds_identity_links WHERE issuer=${issuer} AND subject=${newSub})`,
  ]);
  assert.deepEqual(await snapshot(),before);
 }
}
