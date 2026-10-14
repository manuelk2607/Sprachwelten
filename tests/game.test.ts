import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, GameError, joinGame, viewGame, type Player } from '../lib/game';
import { seedEntries } from '../lib/seeds';
import { entryInput } from '../lib/content';
const players:Player[]=['Ada','Bo','Cam'].map((name,i)=>({id:`p${i}`,name,tokenHash:`secret${i}`,score:0}));
function lobby(){const g=createGame('ABC234',structuredClone(players[0]));joinGame(g,structuredClone(players[1]));joinGame(g,structuredClone(players[2]));return g;}
function started(){const g=lobby();act(g,'p0',{action:'start'},seedEntries);return g;}
test('only the host can start and at least three players are required',()=>{
  const g=createGame('ABC234',structuredClone(players[0]));assert.throws(()=>act(g,'p0',{action:'start'},seedEntries),GameError);
  joinGame(g,structuredClone(players[1]));joinGame(g,structuredClone(players[2]));assert.throws(()=>act(g,'p1',{action:'start'},seedEntries),GameError);
  act(g,'p0',{action:'start'},seedEntries);assert.equal(g.phase,'writing');assert.equal(new Set(g.prompts.map(p=>p.id)).size,5);
});
test('writing projection never exposes the truth, other answers, tokens or future prompts',()=>{
  const g=started();act(g,'p0',{action:'answer',text:'This is a secret bluff.'});const view=viewGame(g,'p1');
  const json=JSON.stringify(view);assert.equal(view.options.length,0);assert.equal(view.revelation,null);assert.ok(!json.includes(g.round!.entry.meaning));assert.ok(!json.includes('This is a secret bluff'));assert.ok(!json.includes('secret0'));assert.ok(!('prompts' in view));
});
test('answers cannot be replaced and voting begins after all players submit',()=>{
  const g=started();act(g,'p0',{action:'answer',text:'An invented meaning.'});assert.throws(()=>act(g,'p0',{action:'answer',text:'Replacement.'}),GameError);
  act(g,'p1',{action:'answer',text:'Another invented meaning.'});assert.equal(g.phase,'writing');act(g,'p2',{action:'answer',text:'Third invented meaning.'});assert.equal(g.phase,'voting');assert.equal(g.round!.options.length,4);
  assert.ok(viewGame(g,'p1').options.every(o=>!('correct' in o)&&!('authorName' in o)&&!('voters' in o)));
});
test('own votes and duplicate votes are rejected; correct votes and successful bluffs score',()=>{
  const g=started();for(const p of players)act(g,p.id,{action:'answer',text:`Bluff by ${p.name}`});
  const real=g.round!.options.find(o=>o.authorId===null)!;const bluff=g.round!.options.find(o=>o.authorId==='p1')!;
  assert.throws(()=>act(g,'p1',{action:'vote',optionId:bluff.id}),GameError);
  act(g,'p0',{action:'vote',optionId:bluff.id});assert.throws(()=>act(g,'p0',{action:'vote',optionId:real.id}),GameError);
  act(g,'p1',{action:'vote',optionId:real.id});assert.equal(g.phase,'voting');act(g,'p2',{action:'vote',optionId:real.id});
  assert.equal(g.phase,'reveal');assert.deepEqual(g.players.map(p=>p.score),[0,3,2]);assert.equal(viewGame(g,'p0').revelation?.meaning,g.round!.entry.meaning);
});
test('five rounds finish once, without repeating a prompt or scoring votes twice',()=>{
  const g=started();const ids=new Set<string>();
  for(let i=0;i<5;i++){
    ids.add(g.round!.entry.id);for(const p of players)act(g,p.id,{action:'answer',text:`Round ${i} by ${p.name}`});const real=g.round!.options.find(o=>o.authorId===null)!;
    for(const p of players)act(g,p.id,{action:'vote',optionId:real.id});assert.throws(()=>act(g,'p1',{action:'next'}),GameError);act(g,'p0',{action:'next'});
  }
  assert.equal(g.phase,'finished');assert.equal(ids.size,5);assert.deepEqual(g.players.map(p=>p.score),[10,10,10]);assert.throws(()=>act(g,'p0',{action:'next'}),GameError);
});
test('join blocks duplicate names, full rooms and games already started',()=>{
  const g=lobby();assert.throws(()=>joinGame(g,{...players[0],id:'extra',name:'ADA'}),GameError);
  for(let i=3;i<10;i++)joinGame(g,{id:`p${i}`,name:`Player ${i}`,tokenHash:`secret${i}`,score:0});assert.throws(()=>joinGame(g,{...players[0],id:'full',name:'Extra'}),GameError);
  act(g,'p0',{action:'start'},seedEntries);assert.throws(()=>joinGame(g,{...players[0],id:'late',name:'Late'}),GameError);
});
test('all three content types validate and untrusted inputs cannot choose author or curated status',()=>{
  for(const kind of ['idiom','dialect','situation']){const input=entryInput.parse({kind,phrase:'Ein Ausdruck',language:'de',meaning:'Eine verständliche Erklärung.',region:'Berlin',context:'Informelle Begrüßung',authorId:'forged',status:'curated'});assert.equal(input.kind,kind);assert.ok(!('authorId' in input));assert.ok(!('status' in input));}
  assert.throws(()=>entryInput.parse({phrase:'Valid phrase',language:'not-a-language',meaning:'A valid explanation.'}));assert.throws(()=>entryInput.parse({phrase:'Valid phrase',language:'en',meaning:'A valid explanation.',sourceUrl:'javascript:alert(1)'}));
});
