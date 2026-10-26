import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,joinGame,viewGame,type Game} from '../lib/game';
import {roomAction,type Entry} from '../lib/content';
import {poolKey,playablePrompts,unseenPrompts,updateAvailability} from '../lib/game-pool';
import {extraSeeds} from '../lib/extra-seeds';
import {newGameEntries} from '../lib/new-game-seeds';
import {finishWheelAnimation} from './game-fixtures';
const player=()=>({id:crypto.randomUUID(),name:crypto.randomUUID(),tokenHash:crypto.randomUUID(),score:0});
const template=extraSeeds.find(entry=>entry.kind==='tongue_twister')!,sound=newGameEntries.find(entry=>entry.kind==='sound_pair')!;
const entries:Entry[]=['de','en','fr'].flatMap(language=>[0,1,2].map(index=>({...(index===2?sound:template),id:crypto.randomUUID(),language,phrase:`${language} example ${index}`})));
function lobby(){const game=createGame('SPRACH',player(),'de','tongue-twisters');joinGame(game,player());updateAvailability(game,entries);return game;}
function finish(game:Game){
 const target=finishWheelAnimation(game);act(game,target.speakerId,{action:'performed',...target});for(const voter of game.players.filter(p=>p.id!==target.speakerId))act(game,voter.id,{action:'rate',...target,clarity:5,accuracy:5,rhythm:5});
 act(game,game.hostId,{action:'next'});
}
test('new games default to their game language while legacy rooms retain their existing all-language setting',()=>{
 const game=lobby();assert.equal(viewGame(game,game.hostId).pronunciationLanguage,'de');assert.equal(game.availableRounds,3);
 assert.equal(createGame('SPRACH',player(),'en','tongue-twisters').pronunciationLanguage,'en');
 delete game.pronunciationLanguage;assert.equal(playablePrompts(game,entries).length,9);assert.equal(viewGame(game,game.hostId).pronunciationLanguage,'');
});
test('the language filter combines with both categories and never falls back to foreign prompts when empty',()=>{
 const game=lobby(),germanKey=poolKey(game);act(game,game.hostId,{action:'configure',pronunciationLanguage:'fr',rounds:1},entries);assert.notEqual(poolKey(game),germanKey);
 assert.equal(game.availableRounds,3);assert.ok(playablePrompts(game,entries).every(entry=>entry.language==='fr'));
 const allKey=poolKey(game);act(game,game.hostId,{action:'configure',pronunciationCategory:'sound'},entries);assert.equal(game.availableRounds,1);assert.equal(playablePrompts(game,entries)[0].kind,'sound_pair');assert.notEqual(poolKey(game),allKey);
 act(game,game.hostId,{action:'configure',pronunciationLanguage:'ko'},entries);assert.equal(game.availableRounds,0);assert.equal(viewGame(game,game.hostId).maxRounds,0);assert.throws(()=>act(game,game.hostId,{action:'start'},entries),/ungespielte/);
 act(game,game.hostId,{action:'configure',pronunciationLanguage:''},entries);assert.equal(game.availableRounds,3);
});
test('audio-only pronunciation prompts follow the same source-language filter as text',()=>{
 const game=lobby(),audio=entries.map(entry=>({...entry,presentation:'audio' as const,phrase:'',audioId:crypto.randomUUID()}));
 assert.equal(playablePrompts(game,audio).length,3);assert.ok(playablePrompts(game,audio).every(entry=>entry.language==='de'));
 act(game,game.hostId,{action:'configure',pronunciationLanguage:'fr',rounds:1},audio);act(game,game.hostId,{action:'start'},audio);assert.equal(game.round!.entry.language,'fr');finishWheelAnimation(game);assert.ok(viewGame(game,game.hostId).prompt?.audioId);assert.equal(viewGame(game,game.hostId).prompt?.phrase,'');
});
test('language changes require a host in the lobby and a registered language or explicit all-language choice',()=>{
 const game=lobby();for(const value of ['de','fr','bar',''])assert.ok(roomAction.safeParse({action:'configure',pronunciationLanguage:value}).success);
 for(const value of ['invented-language','ALL','xx-invalid',42])assert.equal(roomAction.safeParse({action:'configure',pronunciationLanguage:value}).success,false);
 assert.throws(()=>act(game,game.players[1].id,{action:'configure',pronunciationLanguage:'fr'},entries),/Gastgeber/);
 game.mode='meaning-quiz';assert.throws(()=>act(game,game.hostId,{action:'configure',pronunciationLanguage:'fr'},entries),/Sprachfilter/);game.mode='tongue-twisters';
 act(game,game.hostId,{action:'configure',rounds:1},entries);act(game,game.hostId,{action:'start'},entries);assert.throws(()=>act(game,game.hostId,{action:'configure',pronunciationLanguage:'fr'},entries),/Lobby/);
});
test('same-language direct rematches and language switches keep the no-repeat history',()=>{
 let game=lobby();act(game,game.hostId,{action:'configure',rounds:1},entries);act(game,game.hostId,{action:'start'},entries);const first=game.round!.entry.id;finish(game);
 act(game,game.hostId,{action:'restart',immediate:true},entries);assert.equal(game.pronunciationLanguage,'de');assert.equal(game.round!.entry.language,'de');assert.notEqual(game.round!.entry.id,first);finish(game);
 act(game,game.hostId,{action:'restart'},entries);act(game,game.hostId,{action:'configure',pronunciationLanguage:'fr'},entries);act(game,game.hostId,{action:'start'},entries);assert.equal(game.round!.entry.language,'fr');finish(game);
 game=JSON.parse(JSON.stringify(game));act(game,game.hostId,{action:'restart'},entries);act(game,game.hostId,{action:'configure',pronunciationLanguage:'de'},entries);assert.ok(unseenPrompts(game,entries).every(entry=>entry.id!==first));assert.equal(game.availableRounds,1);
});
