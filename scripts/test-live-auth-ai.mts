import assert from 'node:assert/strict';
import {request,type APIRequestContext,type APIResponse} from '@playwright/test';
import {translationFields,textsOf} from '../lib/content-translations';

// No SQL, synthetic accounts, grants, contribution writes or disk-stored sessions.
// Passwords, cookies and identity details must never appear in diagnostics.
const origin=process.env.AUTH_TEST_BASE_URL??'https://sprachwelten.maki26.workers.dev';
assert.ok(['https://sprachwelten.maki26.workers.dev','http://localhost:5176'].includes(origin),'Unapproved integration target');
const email=process.env.AUTH_TEST_EMAIL,password=process.env.AUTH_TEST_PASSWORD;
const allowAI=process.argv.includes('--allow-ai');
const checks:string[]=[];
async function status(client:APIRequestContext,path:string,expected:number){
 const response=await client.get(path);assert.equal(response.status(),expected,`${path}: expected ${expected}, got ${response.status()}`);
 assert.match(response.headers()['cache-control']??'',/no-store/);return response;
}
const anonymous=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin}});
let signed:APIRequestContext|undefined,replayed:APIRequestContext|undefined,loggedIn=false;
try{
 const session=await anonymous.get('/api/auth/get-session');assert.equal(session.status(),200);assert.equal((await session.json())?.user??null,null);
 await status(anonymous,'/api/me/entries',401);await status(anonymous,'/api/admin/users',401);
 const denied=await anonymous.post('/api/translations',{data:{sourceLocale:'de',texts:{meaning:'Kein Modellaufruf.'}}});assert.equal(denied.status(),401);
 const forged=await anonymous.get('/api/me/entries',{headers:{Cookie:'__Secure-neon-auth.session_token=forged; neon-auth.session_token=forged; neon-auth.session_data=forged'}});assert.equal(forged.status(),401);
 checks.push('Real anonymous session, forged cookies and protected endpoints: PASS (no AI calls)');
 if(!email||!password){
  checks.push('NOT RUN: password login, session restoration/revocation, member permissions and real AI; set AUTH_TEST_EMAIL / AUTH_TEST_PASSWORD locally.');
 }else{
  signed=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin}});
  const login=await signed.post('/api/auth/sign-in/email',{data:{email,password}});
  assert.equal(login.status(),200,`Password login failed (${login.status()}); response body intentionally withheld.`);loggedIn=true;
  const identity=await (await signed.get('/api/auth/get-session')).json() as {user?:{id?:string}};assert.ok(identity.user?.id);
  await status(signed,'/api/me/entries',200);
  const state=await signed.storageState();assert.ok(state.cookies.length);
  if(origin.startsWith('https:'))assert.ok(state.cookies.filter(cookie=>cookie.value&&cookie.expires!==0).some(cookie=>cookie.httpOnly&&cookie.secure));
  replayed=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin},storageState:state});
  const restored=await (await replayed.get('/api/auth/get-session')).json() as typeof identity;assert.equal(restored.user?.id,identity.user.id);
  await status(replayed,'/api/me/entries',200);
  const access=await (await signed.get('/api/admin/access')).json() as {isAdmin:boolean};
  if(!access.isAdmin)await status(signed,'/api/admin/users',403);
  checks.push(`Real login and restored session: PASS; normal-member admin gate: ${access.isAdmin?'NOT RUN (test account is an administrator)':'PASS'}`);
  const crossSite=await signed.post('/api/translations',{headers:{Origin:'https://untrusted.example'},data:{sourceLocale:'de',texts:{meaning:'Kein Modellaufruf.'}}});assert.equal(crossSite.status(),403);
  const malformed=await signed.post('/api/translations',{data:{sourceLocale:'xx',texts:{meaning:'Kein Modellaufruf.'}}});assert.equal(malformed.status(),422);
  checks.push('Real signed-in origin and input validation: PASS (no AI calls)');
  if(allowAI){
   // Two fresh requests (two nonempty fields each = at most four model calls),
   // two exact cache replays. All four HTTP request payloads together <500 chars.
   const stamp=Date.now();let sentCharacters=0;
   for(const [sourceLocale,meaning,expected] of [['de','Die Katze schläft auf dem Sofa.',/cat/i],['en','The dog waits outside the house.',/Hund/i]] as const){
    const texts=textsOf({meaning,example:`QA ${stamp}`});
    const chars=Object.values(texts).reduce((sum,text)=>sum+[...text].length,0);sentCharacters+=2*chars;assert.ok(sentCharacters<=500);
    const fresh:APIResponse=await signed.post('/api/translations',{data:{sourceLocale,texts},timeout:90000});assert.equal(fresh.status(),200,`AI request failed (${fresh.status()}); no automatic retry.`);
    const first=await fresh.json() as {translation:unknown;cached:boolean;targetLocale:string};assert.equal(first.cached,false);
    const output=translationFields.parse(first.translation);assert.match(output.meaning,expected);assert.notEqual(output.meaning,meaning);
    assert.equal(first.targetLocale,sourceLocale==='de'?'en':'de');
    const cached:APIResponse=await signed.post('/api/translations',{data:{sourceLocale,texts}});assert.equal(cached.status(),200);
    const second=await cached.json() as typeof first;assert.equal(second.cached,true);assert.deepEqual(second.translation,first.translation);
    checks.push(`Real Workers AI ${sourceLocale}: PASS; meaning: ${output.meaning}; cache reuse: PASS`);
   }
   checks.push(`AI ceiling observed: 4 HTTP requests, at most 4 model calls, ${sentCharacters} submitted source characters. No contributions published.`);
  }else checks.push('NOT RUN: real Workers AI (requires explicit --allow-ai consent).');
  const logout=await signed.post('/api/auth/sign-out',{data:{}});assert.equal(logout.status(),200);loggedIn=false;
  await status(signed,'/api/me/entries',401);
  // The managed SDK has a one-second signed session-data cache. Test the server
  // revocation after that documented cache window, including replay of old cookies.
  await new Promise(resolve=>setTimeout(resolve,1500));
  await status(replayed,'/api/me/entries',401);
  checks.push('Real logout, protected access after logout and replayed-cookie revocation: PASS');
 }
}finally{
 if(loggedIn&&signed)await signed.post('/api/auth/sign-out',{data:{}}).catch(()=>{});
 await Promise.all([anonymous.dispose(),signed?.dispose(),replayed?.dispose()]);
 for(const check of checks)console.log(check);
}
