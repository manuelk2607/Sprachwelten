import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { gamePrompts } from '../db/repository';
import { textsOf } from '../lib/content-translations';
import { translationCacheKey } from '../lib/translation-service';
const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(process.env.TEST_DATABASE_HOST,'TEST_DATABASE_HOST must identify an isolated test database.');
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname,process.env.TEST_DATABASE_HOST);
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Integration mutations are restricted to the local test server.');
type Payload={error?:string;room?:any;token?:string;entry?:any;entries?:any[];user?:{id:string};translation?:any;cached?:boolean;available?:boolean;duplicate?:{id:string;phrase:string};explanations?:any[];};
const cookieJar=new Map<string,string>();
async function request(path:string,data?:unknown,token?:string,cookies=false){
  const res=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,...(cookies?{Cookie:[...cookieJar].map(([k,v])=>`${k}=${v}`).join('; ')}:{})},...(data?{body:JSON.stringify(data)}:{})});
  if(cookies)for(const raw of res.headers.getSetCookie()){const [part]=raw.split(';');const split=part.indexOf('=');cookieJar.set(part.slice(0,split),part.slice(split+1));}
  const payload=await res.json() as Payload;return {status:res.status,data:payload};
}
const createdIds:string[]=[];const roomCodes:string[]=[];const cacheKeys:string[]=[];let accountId:string|undefined;let code:string|undefined;
const stamp=Date.now();const email=`qa-${stamp}@sprachwelten.invalid`;const password=crypto.randomUUID()+'!Aa1';
try{
  const entries=await request('/api/entries');assert.equal(entries.status,200);assert.ok(entries.data.entries!.length===6);
  assert.equal((await request('/api/entries',{literal:'Test translation',phrase:'Unauthorized test',language:'de',meaning:'No anonymous contributions.'})).status,401);
  const signup=await request('/api/auth/sign-up/email',{email,password,name:'QA Sprachwelten'},undefined,true);assert.equal(signup.status,200,JSON.stringify(signup.data));accountId=signup.data.user?.id;
  const session=await request('/api/auth/get-session',undefined,undefined,true);assert.equal(session.status,200);assert.ok(session.data.user?.id);accountId=session.data.user!.id;
  const entry=await request('/api/entries',{literal:'Test translation',kind:'dialect',phrase:`QA-${stamp}`,language:'de',meaning:'Nur ein kurzlebiger Integrationstest.',regionId:'at',sourceLocale:'de',translation:{meaning:'Only a temporary integration test.'},translationReviewed:true},undefined,true);assert.equal(entry.status,201,JSON.stringify(entry.data));createdIds.push(entry.data.entry.id);assert.equal(entry.data.entry.status,'community');assert.equal(entry.data.entry.regionId,'at');assert.equal(entry.data.entry.translations.en.meaning,'Only a temporary integration test.');assert.equal(entry.data.entry.meaning,'Nur ein kurzlebiger Integrationstest.');
  assert.equal((await request('/api/me/entries?q='+stamp)).status,401);
  for(const query of [`qa-${stamp}`,'temporary integration']){const own=await request('/api/me/entries?q='+encodeURIComponent(query),undefined,undefined,true);assert.equal(own.status,200);assert.deepEqual(own.data.entries!.map(e=>e.id),[entry.data.entry.id]);}
  for(const query of ['saudade','_%'])assert.equal((await request('/api/me/entries?q='+encodeURIComponent(query),undefined,undefined,true)).data.entries!.length,0);
  const duplicate=await request('/api/entries',{literal:'Test translation',kind:'dialect',phrase:`  qa-${stamp}!  `,language:'de',meaning:'Eine andere Erklärung macht keinen neuen Ausdruck.',regionId:'at'},undefined,true);assert.equal(duplicate.status,409);assert.equal(duplicate.data.duplicate?.id,entry.data.entry.id);
  const lookup=await request('/api/entries/duplicates?'+new URLSearchParams({literal:'Test translation',kind:'dialect',phrase:`QA-${stamp}?`,language:'de',regionId:'at'}));assert.equal(lookup.status,200);assert.equal(lookup.data.duplicate?.id,entry.data.entry.id);
  const curatedDuplicate=await request('/api/entries',{literal:'Test translation',kind:'word',phrase:'  SAUDADE!!! ',language:'pt'},undefined,true);assert.equal(curatedDuplicate.status,409);assert.ok(curatedDuplicate.data.duplicate?.id);
  const racing=await Promise.all([request('/api/entries',{literal:'Test translation',kind:'word',phrase:`QA-race-${stamp}`,language:'en'},undefined,true),request('/api/entries',{literal:'Test translation',kind:'word',phrase:`qa-race-${stamp}!`,language:'en'},undefined,true)]);
  for(const result of racing)if(result.status===201)createdIds.push(result.data.entry.id);
  assert.deepEqual(racing.map(result=>result.status).sort(),[201,409]);
  for(const kind of ['word','tongue_twister']){const added=await request('/api/entries',{literal:'Test translation',kind,phrase:kind==='word'?`QA-word-${stamp}`:'She sells seashells by the seashore.',language:'en'},undefined,true);assert.equal(added.status,201);createdIds.push(added.data.entry.id);assert.equal(added.data.entry.meaning,'');if(kind==='word')assert.ok((await gamePrompts('language-quiz')).some(prompt=>prompt.id===added.data.entry.id));}
  const explanation=await request(`/api/entries/${entry.data.entry.id}`,{body:'Eine zusätzliche Erklärung für den Integrationstest.',sourceLocale:'de',translation:{body:'An additional explanation for the integration test.'},translationReviewed:true},undefined,true);assert.equal(explanation.status,201);
  const detail=await request(`/api/entries/${entry.data.entry.id}`);assert.equal(detail.data.explanations![0].translations.en.body,'An additional explanation for the integration test.');
  assert.equal((await request('/api/translations',{sourceLocale:'de',texts:{meaning:'Ein Text für die Übersetzung.'}})).status,401);
  const source=textsOf({meaning:`Ein Cachetest ${stamp}.`});const cacheKey=await translationCacheKey(source,'de');cacheKeys.push(cacheKey);
  const testSql=neon(process.env.DATABASE_URL_UNPOOLED!);await testSql`INSERT INTO translation_suggestions(cache_key,result) VALUES (${cacheKey},${JSON.stringify(textsOf({meaning:'A cached translation.'}))}::jsonb)`;
  for(let attempt=0;attempt<2;attempt++){const suggestion=await request('/api/translations',{sourceLocale:'de',texts:source},undefined,true);assert.equal(suggestion.status,200);assert.equal(suggestion.data.cached,true);assert.equal(suggestion.data.translation.meaning,'A cached translation.');}
  const availability=await request('/api/translations');assert.equal(availability.status,200);
  if(!availability.data.available)assert.equal((await request('/api/translations',{sourceLocale:'de',texts:{meaning:`Ein nicht übersetzter Text ${stamp}.`}},undefined,true)).status,503);
  else for(const [sourceLocale,meaning] of [['de','Man verwendet diesen Ausdruck, wenn man jemandem Glück wünschen möchte.'],['en','People use this phrase to politely refuse an invitation.']] as const){
    const texts=textsOf({meaning,example:`QA ${stamp}`});cacheKeys.push(await translationCacheKey(texts,sourceLocale));
    const fresh=await request('/api/translations',{sourceLocale,texts},undefined,true);assert.equal(fresh.status,200,JSON.stringify(fresh.data));assert.equal(fresh.data.cached,false);assert.ok(fresh.data.translation.meaning);assert.notEqual(fresh.data.translation.meaning,meaning);
    const repeated=await request('/api/translations',{sourceLocale,texts},undefined,true);assert.equal(repeated.status,200);assert.equal(repeated.data.cached,true);assert.deepEqual(repeated.data.translation,fresh.data.translation);
    console.log(`Workers AI ${sourceLocale}: ${fresh.data.translation.meaning}`);
  }
  await request('/api/auth/sign-out',{},undefined,true);assert.equal((await request('/api/entries',{literal:'Test translation',phrase:'Signed out test',language:'de',meaning:'Session must be invalid after logout.'},undefined,true)).status,401);
  const badLogin=await request('/api/auth/sign-in/email',{email,password:'wrong-password'},undefined,true);assert.equal(badLogin.status,401);
  const login=await request('/api/auth/sign-in/email',{email,password},undefined,true);assert.equal(login.status,200);assert.ok((await request('/api/auth/get-session',undefined,undefined,true)).data.user?.id);
  const host=await request('/api/rooms',{name:'QA Ada',locale:'en',mode:'idiom-bluff'});assert.equal(host.status,201,JSON.stringify(host.data));code=host.data.room.code;roomCodes.push(code!);const tokens=[host.data.token!];
  assert.equal((await request(`/api/rooms/${code}`)).status,401);
  for(const name of ['QA Bo','QA Cam']){const join=await request(`/api/rooms/${code}/join`,{name});assert.equal(join.status,201);tokens.push(join.data.token!);}
  assert.equal((await request(`/api/rooms/${code}`,{action:'start'},tokens[1])).status,403);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:11},tokens[0])).status,422);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:5},tokens[1])).status,403);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:5},tokens[0])).status,200);
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
  assert.equal((await request('/api/rooms',{name:'QA Mode',mode:'unknown-mode'})).status,422);
  const quiz=await request('/api/rooms',{name:'QA Quiz',locale:'en',mode:'language-quiz'});assert.equal(quiz.status,201);code=quiz.data.room.code;roomCodes.push(code!);
  const quizTokens=[quiz.data.token!];
  const guest=await request(`/api/rooms/${code}/join`,{name:'QA Other'});assert.equal(guest.status,201);quizTokens.push(guest.data.token!);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:4},quizTokens[0])).status,200);
  current=await request(`/api/rooms/${code}`,{action:'start'},quizTokens[0]);assert.equal(current.status,200);assert.equal(current.data.room.phase,'voting');
  const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
  for(let round=0;round<4;round++){
    const projected=current.data.room;assert.equal(projected.mode,'language-quiz');assert.equal(projected.options.length,4);assert.equal(new Set(projected.options.map((o:any)=>o.language)).size,4);assert.ok(!('language' in projected.prompt));assert.equal(projected.revelation,null);assert.ok(projected.options.every((o:any)=>!('correct' in o)));assert.ok(!('prompts' in projected));
    const rows=await sql`SELECT state->'round'->'entry'->>'language' AS language FROM game_rooms WHERE code=${code}`;
    const right=projected.options.find((o:any)=>o.language===rows[0].language).id;
    const wrong=projected.options.find((o:any)=>o.id!==right).id;
    const votes=await Promise.all(quizTokens.map((token,index)=>request(`/api/rooms/${code}`,{action:'vote',optionId:index?wrong:right},token)));assert.ok(votes.every(v=>v.status===200));
    const reveal=await request(`/api/rooms/${code}`,undefined,quizTokens[0]);assert.equal(reveal.data.room.phase,'reveal');assert.equal(reveal.data.room.options.filter((o:any)=>o.correct).length,1);assert.equal(reveal.data.room.revelation.language,rows[0].language);
    current=await request(`/api/rooms/${code}`,{action:'next'},quizTokens[0]);assert.equal(current.status,200);
  }
  assert.equal(current.data.room.phase,'finished');assert.deepEqual(current.data.room.players.map((p:any)=>p.score),[4,0]);
  const solo=await request('/api/rooms',{name:'QA Solo',mode:'language-quiz'});assert.equal(solo.status,201);roomCodes.push(solo.data.room.code);assert.equal((await request(`/api/rooms/${solo.data.room.code}`,{action:'start'},solo.data.token!)).data.room.phase,'voting');
  for(const mode of ['dialect-detective','everyday-language']) {
    const added=await request('/api/entries',{literal:'Test translation',kind:mode==='dialect-detective'?'dialect':'situation',phrase:`QA-${mode}-${stamp}`,language:'de',meaning:'An original explanation for this test.',regionId:'at',contextId:'thanks'},undefined,true);
    assert.equal(added.status,201);createdIds.push(added.data.entry.id);const pool=await gamePrompts(mode as 'dialect-detective'|'everyday-language');assert.ok(pool.length>=2);assert.ok(pool.every(prompt=>prompt.kind===(mode==='dialect-detective'?'dialect':'situation')));
    const host=await request('/api/rooms',{name:`QA ${mode.slice(0,8)}`,mode,locale:'en'});assert.equal(host.status,201);code=host.data.room.code;roomCodes.push(code!);
    current=await request(`/api/rooms/${code}`,{action:'start'},host.data.token!);assert.equal(current.status,200);
    for(let round=0;round<2;round++) {
      const projected=current.data.room;assert.equal(projected.phase,'voting');assert.equal(projected.options.length,4);assert.equal(projected.revelation,null);assert.ok(!('region' in projected.prompt)&&!('context' in projected.prompt));
      const rows=await sql`SELECT state->'round'->'entry' AS entry FROM game_rooms WHERE code=${code}`;
      const entry=rows[0].entry as {regionId:string;contextId:string};const target=mode==='dialect-detective'?entry.regionId:entry.contextId;
      const correct=projected.options.find((option:any)=>option.categoryId===target);assert.ok(correct);
      const reveal=await request(`/api/rooms/${code}`,{action:'vote',optionId:correct.id},host.data.token!);assert.equal(reveal.data.room.phase,'reveal');assert.equal(reveal.data.room.options.filter((option:any)=>option.correct).length,1);
      current=await request(`/api/rooms/${code}`,{action:'next'},host.data.token!);assert.equal(current.status,200);
    }
    assert.equal(current.data.room.phase,'finished');assert.equal(current.data.room.players[0].score,2);
  }
  const tongue=await request('/api/rooms',{name:'QA Speaker',mode:'tongue-twisters',locale:'en'});assert.equal(tongue.status,201);code=tongue.data.room.code;roomCodes.push(code!);
  const speechTokens=[tongue.data.token!];
  assert.equal((await request(`/api/rooms/${code}`,{action:'start'},speechTokens[0])).status,409);
  for(const name of ['QA Listener 1','QA Listener 2']){const guest=await request(`/api/rooms/${code}/join`,{name});assert.equal(guest.status,201);speechTokens.push(guest.data.token!);}
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:5},speechTokens[0])).status,200);
  current=await request(`/api/rooms/${code}`,{action:'start'},speechTokens[0]);assert.equal(current.status,200);
  for(let round=0;round<5;round++) {
    for(let speaker=0;speaker<3;speaker++) {
      const turn=current.data.room.pronunciation;assert.equal(current.data.room.phase,'speaking');assert.equal(turn.speakerNumber,speaker+1);assert.equal(turn.results.length,0);
      const target={speakerId:turn.speaker.id,roundNumber:round+1,matchId:current.data.room.matchId};
      const wrongSpeaker=await request(`/api/rooms/${code}`,{action:'performed',...target},speechTokens[(speaker+1)%3]);assert.equal(wrongSpeaker.status,403);
      current=await request(`/api/rooms/${code}`,{action:'performed',...target},speechTokens[speaker]);assert.equal(current.data.room.phase,'rating');
      assert.equal((await request(`/api/rooms/${code}`,{action:'rate',...target,clarity:5,accuracy:5,rhythm:5},speechTokens[speaker])).status,403);
      const rated=await Promise.all(speechTokens.filter((_,index)=>index!==speaker).map(token=>request(`/api/rooms/${code}`,{action:'rate',...target,clarity:4,accuracy:4,rhythm:4},token)));assert.ok(rated.every(result=>result.status===200));
      current=await request(`/api/rooms/${code}`,undefined,speechTokens[0]);
    }
    assert.equal(current.data.room.phase,'reveal');assert.equal(current.data.room.pronunciation.results.length,3);assert.ok(current.data.room.pronunciation.results.every((result:any)=>result.score===4&&result.ratingCount===2&&!('ratings' in result)));
    current=await request(`/api/rooms/${code}`,{action:'next'},speechTokens[0]);assert.equal(current.status,200);
  }
  assert.equal(current.data.room.phase,'finished');assert.deepEqual(current.data.room.players.map((player:any)=>player.score),[20,20,20]);
  console.log('PASS: auth, bilingual community contributions, fixed quiz IDs, duplicate rejection and simultaneous submissions, cached translations and binding availability, configured rounds in all five modes, concurrent votes and ratings, solo quizzes and hidden answers.');
}finally{
  const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
  for(const key of cacheKeys)await sql`DELETE FROM translation_suggestions WHERE cache_key=${key}`;
  for(const id of createdIds)await sql`DELETE FROM content_entries WHERE id=${id}`;
  for(const roomCode of roomCodes)await sql`DELETE FROM game_rooms WHERE code=${roomCode}`;
  if(accountId) { await request('/api/auth/sign-out',{},undefined,true); /* Disposable auth identity is retained; no provider-side destructive operation. */ }
}
