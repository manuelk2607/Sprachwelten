import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
const base=process.env.TEST_BASE_URL??'http://localhost:5176';
type Payload={error?:string;room?:any;token?:string;entry?:any;entries?:any[];user?:{id:string};};
const cookieJar=new Map<string,string>();
async function request(path:string,data?:unknown,token?:string,cookies=false){
  const res=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,...(cookies?{Cookie:[...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ')}:{})},...(data?{body:JSON.stringify(data)}:{})});
  if(cookies)for(const raw of res.headers.getSetCookie()){const [part]=raw.split(';');const split=part.indexOf('=');cookieJar.set(part.slice(0,split),part.slice(split+1));}
  const payload=await res.json() as Payload;return {status:res.status,data:payload};
}
const createdIds:string[]=[];let accountId:string|undefined;let code:string|undefined;
const stamp=Date.now();const email=`qa-${stamp}@sprachwelten.invalid`;const password=crypto.randomUUID()+'!Aa1';
try{
  const entries=await request('/api/entries');assert.equal(entries.status,200);assert.ok(entries.data.entries!.length>=20);
  assert.equal((await request('/api/entries',{phrase:'Unauthorized test',language:'de',meaning:'No anonymous contributions.'})).status,401);
  const signup=await request('/api/auth/sign-up/email',{email,password,name:'QA Sprachwelten'},undefined,true);assert.equal(signup.status,200,JSON.stringify(signup.data));accountId=signup.data.user?.id;
  const session=await request('/api/auth/get-session',undefined,undefined,true);assert.equal(session.status,200);assert.ok(session.data.user?.id);accountId=session.data.user!.id;
  const entry=await request('/api/entries',{kind:'dialect',phrase:`QA-${stamp}`,language:'de',meaning:'Nur ein kurzlebiger Integrationstest.',region:'Testregion'},undefined,true);assert.equal(entry.status,201,JSON.stringify(entry.data));createdIds.push(entry.data.entry.id);assert.equal(entry.data.entry.status,'community');
  for(const kind of ['word','tongue_twister']){const added=await request('/api/entries',{kind,phrase:kind==='word'?'a':'She sells seashells by the seashore.',language:'en'},undefined,true);assert.equal(added.status,201);createdIds.push(added.data.entry.id);assert.equal(added.data.entry.meaning,'');}
  const explanation=await request(`/api/entries/${entry.data.entry.id}`,{body:'Eine zusätzliche Erklärung für den Integrationstest.'},undefined,true);assert.equal(explanation.status,201);
  await request('/api/auth/sign-out',{},undefined,true);assert.equal((await request('/api/entries',{phrase:'Signed out test',language:'de',meaning:'Session must be invalid after logout.'},undefined,true)).status,401);
  const badLogin=await request('/api/auth/sign-in/email',{email,password:'wrong-password'},undefined,true);assert.equal(badLogin.status,401);
  const login=await request('/api/auth/sign-in/email',{email,password},undefined,true);assert.equal(login.status,200);assert.ok((await request('/api/auth/get-session',undefined,undefined,true)).data.user?.id);
  const host=await request('/api/rooms',{name:'QA Ada',locale:'en'});assert.equal(host.status,201,JSON.stringify(host.data));code=host.data.room.code;const tokens=[host.data.token!];
  assert.equal((await request(`/api/rooms/${code}`)).status,401);
  for(const name of ['QA Bo','QA Cam']){const join=await request(`/api/rooms/${code}/join`,{name});assert.equal(join.status,201);tokens.push(join.data.token!);}
  assert.equal((await request(`/api/rooms/${code}`,{action:'start'},tokens[1])).status,403);
  let current=await request(`/api/rooms/${code}`,{action:'start'},tokens[0]);assert.equal(current.status,200);assert.equal(current.data.room.phase,'writing');assert.equal(current.data.room.locale,'en');
  for(let round=0;round<5;round++){
    const answers=await Promise.all(tokens.map((token,i)=>request(`/api/rooms/${code}`,{action:'answer',text:`QA bluff ${round} ${i}`},token)));assert.ok(answers.every(a=>a.status===200));
    const states=await Promise.all(tokens.map(t=>request(`/api/rooms/${code}`,undefined,t)));assert.ok(states.every(s=>s.data.room.phase==='voting'));
    assert.ok(states[0].data.room.options.every((o:any)=>!('authorName' in o)&&!('correct' in o)));
    const choices=states.map(s=>s.data.room.options.find((o:any)=>!o.isOwn).id);
    const votes=await Promise.all(tokens.map((t,i)=>request(`/api/rooms/${code}`,{action:'vote',optionId:choices[i]},t)));assert.ok(votes.every(v=>v.status===200));
    const reveal=await request(`/api/rooms/${code}`,undefined,tokens[0]);assert.equal(reveal.data.room.phase,'reveal');assert.ok(reveal.data.room.revelation.meaning);
    current=await request(`/api/rooms/${code}`,{action:'next'},tokens[0]);assert.equal(current.status,200);
  }
  assert.equal(current.data.room.phase,'finished');
  console.log('PASS: signup, session, logout, wrong/correct login, protected contributions, explanations and five rounds with concurrent players.');
}finally{
  const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
  for(const id of createdIds)await sql`DELETE FROM content_entries WHERE id=${id}`;
  if(code)await sql`DELETE FROM game_rooms WHERE code=${code}`;
  if(accountId) { await request('/api/auth/sign-out',{},undefined,true); /* Disposable auth identity is retained; no provider-side destructive operation. */ }
}
