import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {encodeAudioWave} from '../lib/audio-format';
const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
assert.ok(process.env.TEST_DATABASE_HOST&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===process.env.TEST_DATABASE_HOST,'Use the isolated QA database.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),entries:string[]=[],audio:string[]=[],regions:string[]=[],stamp=Date.now();
const cookies=new Map<string,string>();
const testIp=`198.18.${crypto.getRandomValues(new Uint8Array(1))[0]}.${1+crypto.getRandomValues(new Uint8Array(1))[0]%254}`;
type Payload={entry:{id:string;authorName:string;creditName:string};id:string;audio:{id:string};removed:boolean};
async function request(path:string,data?:unknown,method=data?'POST':'GET',jar=cookies){
  const wave=data instanceof ArrayBuffer;
  const response=await fetch(base+path,{method,headers:{Origin:base,'cf-connecting-ip':testIp,...(data?{'Content-Type':wave?'audio/wav':'application/json'}:{}),Cookie:[...jar].map(([key,value])=>key+'='+value).join('; ')},...(data?{body:wave?data:JSON.stringify(data)}:{})});
  for(const cookie of response.headers.getSetCookie()){const [pair]=cookie.split(';'),split=pair.indexOf('=');jar.set(pair.slice(0,split),pair.slice(split+1));}
  return {response,status:response.status,data:(response.headers.get('content-type')?.startsWith('application/json')?await response.json():await response.arrayBuffer()) as Payload};
}
try{
  const input={kind:'word',phrase:`QA Guest ${stamp}`,language:'de',literal:'A test word',creditName:'',authorId:'forged-account'};
  const created=await request('/api/entries',input);assert.equal(created.status,201,JSON.stringify(created.data));entries.push(created.data.entry.id);assert.equal(created.data.entry.authorName,'');assert.equal(created.data.entry.creditName,'');
  assert.ok(created.response.headers.get('set-cookie')?.includes('HttpOnly'));assert.ok(cookies.has('sprachwelten_contributor'));
  const [stored]=await sql`SELECT author_id,author_name FROM content_entries WHERE id=${entries[0]}`;assert.match(stored.author_id as string,/^guest:[a-f0-9]{64}$/);assert.equal(stored.author_name,'Gast');
  assert.equal((await request('/api/entries',input)).status,409);
  for(const path of ['/api/me/entries','/api/me/suggestions','/api/admin/entries','/api/admin/users'])assert.equal((await request(path)).status,401,path);
  for(const method of ['PATCH','DELETE'])assert.equal((await request('/api/me/entries/'+entries[0],{revision:0},method)).status,401);
  assert.equal((await request('/api/translations',{sourceLocale:'de',texts:{meaning:'Ein Test'}})).status,401);
  const forged=await fetch(base+'/api/entries',{method:'POST',headers:{Origin:'https://foreign.invalid','Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(forged.status,403);
  const region=await request('/api/regions',{de:`QA Gastregion ${stamp}`,en:`QA Guest region ${stamp}`});assert.equal(region.status,201,JSON.stringify(region.data));regions.push(region.data.id);
  const sample=Float32Array.from({length:1600},(_,index)=>Math.sin(index/10)*0.2),uploaded=await request('/api/audio',encodeAudioWave(sample));assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));audio.push(uploaded.data.audio.id);
  assert.equal((await request('/api/audio/'+audio[0])).status,200);
  assert.equal((await request('/api/audio/'+audio[0],undefined,'GET',new Map())).status,404);
  const foreign=await request('/api/entries',{...input,phrase:`QA foreign ${stamp}`,audioId:audio[0],presentation:'both'},'POST',new Map());assert.equal(foreign.status,422);
  assert.equal((await request('/api/audio/'+audio[0],undefined,'DELETE',new Map())).data.removed,false);
  const attached=await request('/api/entries',{kind:'dialect',phrase:`QA Audio ${stamp}`,language:'de',literal:'Test audio',regionId:regions[0],audioId:audio[0],presentation:'both',creditName:'Manuel'});assert.equal(attached.status,201,JSON.stringify(attached.data));entries.push(attached.data.entry.id);
  assert.equal((await request('/api/audio/'+audio[0],undefined,'GET',new Map())).status,200);
  assert.equal((await request('/api/audio/'+audio[0],undefined,'DELETE')).data.removed,false);
  const [owned]=await sql`SELECT owner_id FROM pronunciation_audio WHERE id=${audio[0]}`;assert.equal(owned.owner_id,stored.author_id);
  // Exhaust only this synthetic identity, then check the enforced guest limit.
  await sql`UPDATE request_limits SET hits=10 WHERE key=${'entry:'+stored.author_id}`;
  assert.equal((await request('/api/entries',{...input,phrase:`QA limited ${stamp}`})).status,429);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(testIp)),ipKey=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  await sql`UPDATE request_limits SET hits=20 WHERE key=${'guest-entry-ip:'+ipKey}`;
  assert.equal((await request('/api/entries',{...input,phrase:`QA new cookie ${stamp}`},'POST',new Map())).status,429);
  console.log('PASS: guest text/audio submissions and regions, opaque identity, explicit credit, duplicates, quotas, origin checks, private audio isolation, attached audio and protected account/admin APIs.');
}finally{
  for(const id of entries)await sql`DELETE FROM content_entries WHERE id=${id}`;
  for(const id of audio)await request('/api/audio/'+id,undefined,'DELETE');
  for(const id of regions)await sql`DELETE FROM content_regions WHERE id=${id}`;
}
