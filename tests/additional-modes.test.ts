import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, joinGame, viewGame, GameError, type Game } from '../lib/game';
import { entryInput, roomAction } from '../lib/content';
import { extraSeeds } from '../lib/extra-seeds';
import { gameModes, type PlayableGameMode } from '../lib/modes';
import { localizeEntry } from '../lib/entry-localization';
import { translate } from '../lib/translations';
const ids=[0,1,2].map(index=>`40000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`);
const player=(index:number)=>({id:ids[index],name:`Player ${index}`,score:0,tokenHash:`secret-${index}`});
function lobby(mode:PlayableGameMode,count=1) {
  const game=createGame('ABC234',player(0),'en',mode);
  for(let index=1;index<count;index++)joinGame(game,player(index));
  return game;
}
function started(mode:PlayableGameMode,count=1){const game=lobby(mode,count);act(game,ids[0],{action:'start'},extraSeeds);return game;}
function finishTurn(game:Game,scores={clarity:3,accuracy:4,rhythm:5}) {
  const speakerId=game.players[game.round!.pronunciation!.speakerIndex].id;
  const target={speakerId,roundNumber:game.roundIndex+1};
  act(game,speakerId,{action:'performed',...target});
  for(const player of game.players.filter(p=>p.id!==speakerId))act(game,player.id,{action:'rate',...target,...scores});
}
for(const mode of ['dialect-detective','everyday-language'] as const) {
  test(`${mode} has four unique choices, hides the target and completes four configured rounds`,()=>{
    const game=lobby(mode,2);act(game,ids[0],{action:'configure',rounds:4});act(game,ids[0],{action:'start'},extraSeeds);const seen=new Set<string>();
    for(let round=0;round<4;round++) {
      const view=viewGame(game,ids[0]);seen.add(game.round!.entry.id);
      assert.equal(game.phase,'voting');assert.equal(view.options.length,4);assert.equal(new Set(view.options.map(o=>o.text)).size,4);
      assert.equal(view.revelation,null);assert.ok(!('region' in view.prompt!));assert.ok(!('context' in view.prompt!));
      if(mode==='dialect-detective')assert.ok(!('language' in view.prompt!));
      assert.ok(view.options.every(o=>!('correct' in o)));assert.ok(!('prompts' in view));
      const answer=mode==='dialect-detective'?game.round!.entry.region:game.round!.entry.context;
      const correct=game.round!.options.find(o=>o.text===answer)!;
      const wrong=game.round!.options.find(o=>o.id!==correct.id)!;
      assert.equal(game.round!.options.filter(o=>o.text===answer).length,1);
      act(game,ids[0],{action:'vote',optionId:correct.id});assert.equal(game.phase,'voting');
      act(game,ids[1],{action:'vote',optionId:wrong.id});
      const result=viewGame(game,ids[0]);assert.equal(game.phase,'reveal');assert.equal(result.options.filter(o=>o.correct).length,1);
      assert.equal(mode==='dialect-detective'?result.revelation!.region:result.revelation!.context,answer);
      act(game,ids[0],{action:'next'});
    }
    assert.equal(seen.size,4);assert.equal(game.phase,'finished');assert.deepEqual(game.players.map(p=>p.score),[4,0]);
  });
}
test('dialect and context entries need their target; untrusted author and ratings fields are stripped',()=>{
  const base={phrase:'A useful expression',language:'de',meaning:'An explanation of the expression.'};
  assert.ok(!entryInput.safeParse({...base,kind:'dialect'}).success);
  assert.ok(!entryInput.safeParse({...base,kind:'situation'}).success);
  assert.ok(entryInput.safeParse({...base,kind:'dialect',region:'Berlin'}).success);
  assert.ok(entryInput.safeParse({...base,kind:'situation',context:'Dank'}).success);
  const action=roomAction.parse({action:'rate',speakerId:ids[0],roundNumber:1,clarity:5,accuracy:5,rhythm:5,raterId:ids[2]});
  assert.ok(!('raterId' in action));
  assert.ok(!roomAction.safeParse({...action,clarity:0}).success);assert.ok(!roomAction.safeParse({...action,rhythm:1.5}).success);
});
test('tongue twisters require two players and only the active speaker can open rating',()=>{
  const solo=lobby('tongue-twisters');assert.throws(()=>act(solo,ids[0],{action:'start'},extraSeeds),GameError);
  const game=started('tongue-twisters',3);const target={speakerId:ids[0],roundNumber:1};
  assert.equal(game.phase,'speaking');assert.equal(viewGame(game,ids[0]).pronunciation!.speaker.id,ids[0]);
  assert.throws(()=>act(game,ids[1],{action:'performed',...target}),GameError);
  assert.throws(()=>act(game,ids[1],{action:'rate',...target,clarity:5,accuracy:5,rhythm:5}),GameError);
  act(game,ids[0],{action:'performed',...target});assert.equal(game.phase,'rating');
  assert.throws(()=>act(game,ids[0],{action:'performed',...target}),GameError);
  assert.throws(()=>act(game,ids[0],{action:'rate',...target,clarity:5,accuracy:5,rhythm:5}),GameError);
  assert.throws(()=>act(game,ids[1],{action:'rate',...target,clarity:6,accuracy:5,rhythm:5}),GameError);
});
test('ratings are anonymous and cannot be replaced, forged for another turn or scored early',()=>{
  const game=started('tongue-twisters',3);const target={speakerId:ids[0],roundNumber:1};
  act(game,ids[0],{action:'performed',...target});
  act(game,ids[1],{action:'rate',...target,clarity:1,accuracy:2,rhythm:3});
  const view=viewGame(game,ids[2]);assert.equal(view.pronunciation!.ratingCount,1);assert.deepEqual(view.pronunciation!.results,[]);
  assert.equal(view.revelation,null);assert.ok(!('ratings' in view.pronunciation!));assert.ok(!JSON.stringify(view).includes('secret-'));
  assert.throws(()=>act(game,ids[1],{action:'rate',...target,clarity:5,accuracy:5,rhythm:5}),GameError);
  assert.throws(()=>act(game,ids[2],{action:'rate',...target,roundNumber:2,clarity:5,accuracy:5,rhythm:5}),GameError);
  assert.throws(()=>act(game,ids[2],{action:'rate',...target,speakerId:ids[1],clarity:5,accuracy:5,rhythm:5}),GameError);
  act(game,ids[2],{action:'rate',...target,clarity:5,accuracy:4,rhythm:3});
  assert.equal(game.phase,'speaking');assert.equal(viewGame(game,ids[1]).pronunciation!.speaker.id,ids[1]);
  assert.deepEqual(game.players.map(p=>p.score),[0,0,0]);
  finishTurn(game,{clarity:5,accuracy:5,rhythm:5});finishTurn(game,{clarity:2,accuracy:2,rhythm:2});
  assert.equal(game.phase,'reveal');assert.deepEqual(game.players.map(p=>p.score),[3,5,2]);
  const results=viewGame(game,ids[0]).pronunciation!.results;
  assert.equal(results.length,3);assert.ok(results.every(r=>r.ratingCount===2&&!('raterId' in r)&&!('ratings' in r)));
  assert.throws(()=>act(game,ids[1],{action:'next'}),GameError);
});
test('four configured pronunciation rounds score once with predictable rounding and no repeated text',()=>{
  const game=lobby('tongue-twisters',2);act(game,ids[0],{action:'configure',rounds:4});act(game,ids[0],{action:'start'},extraSeeds);const seen=new Set<string>();
  for(let round=0;round<4;round++) {
    seen.add(game.round!.entry.id);finishTurn(game,{clarity:3,accuracy:4,rhythm:4});finishTurn(game,{clarity:5,accuracy:5,rhythm:5});
    assert.equal(game.phase,'reveal');assert.equal(viewGame(game,ids[0]).pronunciation!.results[0].score,3.7);
    assert.throws(()=>act(game,ids[0],{action:'rate',speakerId:ids[1],roundNumber:round+1,clarity:5,accuracy:5,rhythm:5}),GameError);
    act(game,ids[0],{action:'next'});
  }
  assert.equal(game.phase,'finished');assert.equal(seen.size,4);assert.deepEqual(game.players.map(p=>p.score),[14.8,20]);
  assert.throws(()=>act(game,ids[0],{action:'next'}),GameError);
});
test('all mode instructions and new seed explanations have English translations',()=>{
  for(const mode of gameModes)for(const key of ['title','description','headline','intro','details','rule','promptLabel','question','hint','revealTitle','scoreLabel'] as const) {
    if(mode[key])assert.notEqual(translate(mode[key],'en'),mode[key],`${mode.id}: ${key}`);
  }
  for(const entry of extraSeeds){assert.ok(entryInput.safeParse(entry).success);assert.notEqual(localizeEntry(entry,'en').meaning,entry.meaning);}
  const community={...extraSeeds[0],status:'community' as const};assert.equal(localizeEntry(community,'en').meaning,community.meaning);assert.equal(localizeEntry(community,'en').region,'Northern Germany');
});
