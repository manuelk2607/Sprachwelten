import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,joinGame,viewGame} from '../lib/game';
import {playablePrompts,updateAvailability} from '../lib/game-pool';
import {prepareMeaningEntries} from '../lib/meaning-quiz';
import {extraSeeds} from '../lib/extra-seeds';
import {communityGameEntries} from '../lib/community-game-seeds';
import {seedEntries} from '../lib/seeds';
import {roomAction,type Entry} from '../lib/content';
import {securityHeaders} from '../lib/security-headers';
import {roomVersion} from '../lib/room-etag';

const player=()=>({id:crypto.randomUUID(),name:crypto.randomUUID().slice(0,8),tokenHash:crypto.randomUUID(),score:0});
test('room cache validators accept Cloudflare weak ETags and reject invalid versions',()=>{
  assert.equal(roomVersion('"room-v12"'),12);
  assert.equal(roomVersion('W/"room-v12"'),12);
  for(const value of [null,'*','room-v12','"room-v-1"','"room-v9999999999999999999999999999"'])assert.equal(roomVersion(value),-1);
});
test('security headers protect HTML without losing response bodies, cookies or status',async()=>{
  const original=new Response('Hello',{status:201,headers:{'Content-Type':'text/html','Set-Cookie':'test=1; HttpOnly'}});
  const response=securityHeaders(original);
  assert.equal(response.status,201);assert.equal(await response.text(),'Hello');
  assert.equal(response.headers.get('Set-Cookie'),'test=1; HttpOnly');
  assert.ok(response.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));
  assert.equal(securityHeaders(new Response(null,{status:204})).status,204);
});
test('pronunciation actions cannot be replayed across same-room rematches',()=>{
  const host=player(),guest=player(),game=createGame('REVIEW',host,'de','tongue-twisters');joinGame(game,guest);
  game.pronunciationLanguage='';
  act(game,host.id,{action:'configure',rounds:1});act(game,host.id,{action:'start'},extraSeeds);
  const old={speakerId:host.id,roundNumber:1,matchId:game.matchId!};
  for(const speaker of [host,guest]){
    const target={...old,speakerId:speaker.id};
    act(game,speaker.id,{action:'performed',...target});
    act(game,speaker===host?guest.id:host.id,{action:'rate',...target,clarity:5,accuracy:5,rhythm:5});
  }
  act(game,host.id,{action:'next'});act(game,host.id,{action:'restart',rounds:1},extraSeeds);
  act(game,host.id,{action:'start'},extraSeeds);
  assert.throws(()=>act(game,host.id,{action:'performed',...old}),/aktuellen Vortrag/);
  act(game,host.id,{action:'performed',...old,matchId:game.matchId!});
  assert.throws(()=>act(game,guest.id,{action:'rate',...old,clarity:5,accuracy:5,rhythm:5}),/aktuellen Vortrag/);
  assert.equal(game.phase,'rating');assert.deepEqual(game.round!.pronunciation!.ratings,{});
});

test('legacy stored pronunciation rooms use their public fallback match identifier',()=>{
  const host=player(),game=createGame('REVIEW',host,'de','tongue-twisters');joinGame(game,player());
  delete game.pronunciationLanguage;
  act(game,host.id,{action:'start'},extraSeeds);delete game.matchId;
  const action=roomAction.parse({action:'performed',speakerId:host.id,roundNumber:1,matchId:viewGame(game,host.id).matchId});
  act(game,host.id,action);assert.equal(game.phase,'rating');
});

test('available rounds constrain both the lobby choices and configuration',()=>{
  const host=player(),game=createGame('REVIEW',host,'de','loanword-quiz');
  for(let index=0;index<9;index++)joinGame(game,player());
  const cards=communityGameEntries.filter(entry=>entry.kind==='loanword');updateAvailability(game,cards);
  assert.equal(cards.length,8);assert.equal(viewGame(game,host.id).maxRounds,8);
  assert.throws(()=>act(game,host.id,{action:'configure',rounds:9}),/genügend/);
  act(game,host.id,{action:'configure',rounds:8});act(game,host.id,{action:'start'},cards);
  assert.equal(game.totalRounds,8);
  const empty=createGame('EMPTYX',player(),'de','loanword-quiz');updateAvailability(empty,[]);
  assert.equal(viewGame(empty,empty.hostId).maxRounds,0);
});

test('different senses, languages and dialect regions remain separate playable cards',()=>{
  const original=communityGameEntries.find(entry=>entry.kind==='youth_chat')!;
  const cards:Entry[]=[{...original,id:crypto.randomUUID(),phrase:'Bank',sense:'Geldinstitut'},
    {...original,id:crypto.randomUUID(),phrase:'Bank',sense:'Sitzgelegenheit'}];
  const game=createGame('REVIEW',player(),'de','meaning-quiz');
  assert.equal(playablePrompts(game,cards).length,2);
  act(game,game.hostId,{action:'start'},cards);assert.equal(game.prompts.length,2);
  const dialects:Entry[]=['at','de'].map(regionId=>({...seedEntries[0],id:crypto.randomUUID(),kind:'dialect',phrase:'Gleichlaut',regionId}));
  assert.equal(playablePrompts(game,[...dialects,...seedEntries]).filter(entry=>entry.phrase==='Gleichlaut').length,2);
});

test('automatic distractors exclude every other meaning of the same expression',()=>{
  const source=seedEntries[0];
  const entries=['Geldinstitut','Sitzgelegenheit','Ein Baum','Ein Tier','Ein Werkzeug'].map((meaning,index)=>({...source,id:crypto.randomUUID(),phrase:index<2?'Bank':'Anders '+index,sense:meaning,meaning,translations:undefined}));
  for(const locale of ['de','en'] as const){
    const cards=prepareMeaningEntries(entries,locale);
    for(const card of cards.filter(entry=>entry.phrase==='Bank')){
      assert.equal(card.challenge?.type,'meaning');if(card.challenge?.type!=='meaning')continue;
      const challenge=card.challenge;
      const wrong=challenge.choices.filter((_,index)=>index!==challenge.correctIndex);
      assert.ok(wrong.every(answer=>!['Geldinstitut','Sitzgelegenheit'].includes(answer[locale])));
    }
  }
});
