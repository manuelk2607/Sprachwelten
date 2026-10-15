import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {newGameEntries} from '../lib/new-game-seeds';
import {neighbors} from '../lib/challenges';
import {gamePrompts,addEntry,findDuplicateEntry} from '../db/repository';
import type {Game,GameView} from '../lib/game';
const base='http://localhost:5176',url=process.env.DATABASE_URL_UNPOOLED!;
assert.equal(new URL(url).hostname,'ep-gentle-glitter-b9qamivx.c-7.eu-central-1.aws.neon.tech','This test is restricted to the named QA branch.');
const sql=neon(url),rooms:string[]=[],entries:string[]=[];
async function request(path:string,data?:unknown,token?:string){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await response.json() as {room:GameView;token:string;error?:string;entry?:unknown};return {status:response.status,...result};}
async function state(code:string){return (await sql`SELECT state FROM game_rooms WHERE code=${code}`)[0].state as Game;}
function route(g:Game){const c=g.round!.entry.challenge;assert.ok(c?.type==='mission');let path=[c.start];for(let stage=0;stage<3;stage++){const target=c.checkpoints[stage],q=[path.slice(-1)],seen=new Set(q[0]);let found:number[]|undefined;for(const p of q){if(p.at(-1)===target){found=p;break;}for(const n of neighbors(p.at(-1)!))if(!seen.has(n)&&!c.blocked.includes(n)&&!c.checkpoints.slice(stage+1).includes(n)){seen.add(n);q.push([...p,n]);}}assert.ok(found);path.push(...found.slice(1));}return path;}
try{
 // Prove the running server uses this QA database before any API mutations.
 const probe=await addEntry({...newGameEntries[48],phrase:'QA branch probe '+crypto.randomUUID()},'qa-new-games','QA New Games');entries.push(probe.id);assert.equal((await request('/api/entries/'+probe.id)).status,200,'Server must use the QA branch.');
 for(const sample of [newGameEntries[0],newGameEntries[8],newGameEntries[16],newGameEntries[24],newGameEntries[32],newGameEntries[48],newGameEntries[56]]){
  const input={...sample,phrase:'QA '+crypto.randomUUID()};const entry=await addEntry(input,'qa-new-games','QA New Games');entries.push(entry.id);assert.deepEqual(entry.challenge,input.challenge);await assert.rejects(addEntry({...input,phrase:input.phrase.toUpperCase()+'!'},'qa-new-games','QA New Games'));
  assert.ok((await gamePrompts(sample.kind==='gaming_mission'?'gaming-call':sample.kind==='youth_chat'?'generation-chat':sample.kind==='academic'?'plain-talk':sample.kind==='sound_pair'?'tongue-twisters':sample.kind==='attribution'?'who-said-it':sample.kind==='false_friend'?'false-friends':'word-builder')).some(e=>e.id===entry.id));
 }
 // Simultaneous insertions are still protected by the database identity index.
 const sample={...newGameEntries[48],phrase:'QA concurrent '+crypto.randomUUID()};const race=await Promise.allSettled([addEntry(sample,'qa-new-games','QA New Games'),addEntry(sample,'qa-new-games','QA New Games')]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);for(const r of race)if(r.status==='fulfilled')entries.push(r.value.id);
 for(const mode of ['gaming-call','generation-chat','plain-talk','who-said-it','false-friends','word-builder','tongue-twisters'] as const){
  const host=await request('/api/rooms',{name:'QA Host',mode,locale:'en',pronunciationCategory:'sound'});assert.equal(host.status,201);const code=host.room.code;rooms.push(code);const guest=await request(`/api/rooms/${code}/join`,{name:'QA Guest'});assert.equal(guest.status,201);const tokens=[host.token,guest.token];let current=await request(`/api/rooms/${code}`,{action:'configure',rounds:2},host.token);assert.equal(current.status,200);current=await request(`/api/rooms/${code}`,{action:'start'},host.token);assert.equal(current.status,200,current.error);
  for(let number=1;number<=2;number++){
   const g=await state(code),guard={roundNumber:number,matchId:g.matchId};assert.ok(!('prompts' in current.room));
   if(g.round!.team){
    const callerIndex=g.players.findIndex(p=>p.id===g.round!.team!.callerId),caller=tokens[callerIndex],receiver=tokens[1-callerIndex];const privateView=await request(`/api/rooms/${code}`,undefined,receiver);assert.equal(privateView.room.team?.briefing,null);assert.equal(privateView.room.prompt?.phrase,'');assert.equal(privateView.room.options.length,0);
    current=await request(`/api/rooms/${code}`,{action:'call',text:'A clear ordinary explanation.',...guard},caller);assert.equal(current.status,200,current.error);
    assert.equal((await request(`/api/rooms/${code}`,{action:'question',text:'Could you clarify?',...guard},receiver)).status,200);
    assert.equal((await request(`/api/rooms/${code}`,{action:'reply',text:'Of course.',forPlayerId:g.players[1-callerIndex].id,...guard},caller)).status,200);
    if(mode==='gaming-call')current=await request(`/api/rooms/${code}`,{action:'mission',path:route(g),...guard},receiver);
    else current=await request(`/api/rooms/${code}`,{action:'vote',optionId:g.round!.options.find(o=>o.solution)!.id},receiver);
   }else if(mode==='word-builder'){
    const c=g.round!.entry.challenge;assert.ok(c?.type==='order');const ids=c.accepted[0].map(id=>g.round!.tiles!.find(t=>t.sourceId===id)!.id);assert.ok(!JSON.stringify(current.room).includes('accepted'));const results=await Promise.all(tokens.map(token=>request(`/api/rooms/${code}`,{action:'order',tiles:ids,...guard},token)));assert.ok(results.every(r=>r.status===200),JSON.stringify(results.map(r=>({status:r.status,error:r.error}))));current=await request(`/api/rooms/${code}`,undefined,host.token);
   }else if(mode==='tongue-twisters'){
    for(let speaker=0;speaker<2;speaker++){const v=current.room,actor=v.pronunciation!.speaker.id,target={speakerId:actor,roundNumber:number};const index=g.players.findIndex(p=>p.id===actor);assert.equal((await request(`/api/rooms/${code}`,{action:'performed',...target},tokens[index])).status,200);current=await request(`/api/rooms/${code}`,{action:'rate',...target,clarity:4,accuracy:4,rhythm:4},tokens[1-index]);assert.equal(current.status,200);}
   }else{
    assert.ok(current.room.options.every(o=>!('correct' in o)&&!('solution' in o)));const id=g.round!.options.find(o=>o.solution)!.id;const voted=await Promise.all(tokens.map(token=>request(`/api/rooms/${code}`,{action:'vote',optionId:id},token)));assert.ok(voted.every(r=>r.status===200));current=await request(`/api/rooms/${code}`,undefined,host.token);
   }
   assert.equal(current.status,200,current.error);assert.equal(current.room.phase,'reveal',mode);assert.deepEqual(current.room.players.map(p=>p.score),mode==='tongue-twisters'?[number*4,number*4]:[number,number]);current=await request(`/api/rooms/${code}`,{action:'next'},host.token);assert.equal(current.status,200,current.error);
  }
  assert.equal(current.room.phase,'finished');const previous=current.room.matchId;current=await request(`/api/rooms/${code}`,{action:'restart'},host.token);assert.equal(current.status,200);assert.notEqual(current.room.matchId,previous);assert.deepEqual(current.room.players.map(p=>p.score),[0,0]);
  assert.equal((await request(`/api/rooms/${code}`,{action:'leave'},host.token)).status,200);const remaining=await request(`/api/rooms/${code}`,undefined,guest.token);assert.equal(remaining.room.hostId,guest.room.playerId);assert.ok(remaining.room.phase==='lobby'||remaining.room.phase==='voting'||remaining.room.phase==='ordering');
 }
 console.log('PASS: new contributions, duplicate races, seven game variants, hidden solutions, role changes, simultaneous submissions, scoring and rematches through the persisted API.');
}finally{for(const code of rooms)await sql`DELETE FROM game_rooms WHERE code=${code}`;for(const id of entries)await sql`DELETE FROM content_entries WHERE id=${id} AND author_id='qa-new-games'`;}
