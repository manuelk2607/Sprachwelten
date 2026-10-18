import test from 'node:test';
import assert from 'node:assert/strict';
import { act,createGame,joinGame,leaveGame,viewGame } from '../lib/game';
import { seedEntries } from '../lib/seeds';
import { extraSeeds } from '../lib/extra-seeds';
import { wordSeeds } from '../lib/word-seeds';
import type { PlayableGameMode } from '../lib/modes';
const player=(id:string)=>({id,name:id,tokenHash:'secret-'+id,score:0});
function lobby(mode:PlayableGameMode='idiom-bluff',count=3){const game=createGame('ABC234',player('host'),'de',mode);for(let i=1;i<count;i++)joinGame(game,player('guest'+i));return game;}
test('round limits follow joined players and only the host can configure them',()=>{
 const game=lobby();assert.equal(game.totalRounds,2);act(game,'host',{action:'configure',rounds:6});assert.equal(game.totalRounds,6);assert.throws(()=>act(game,'host',{action:'configure',rounds:7}));assert.throws(()=>act(game,'guest1',{action:'configure',rounds:2}));leaveGame(game,'guest2');assert.equal(game.totalRounds,4);
 const solo=lobby('language-quiz',1);solo.totalRounds=3;assert.throws(()=>act(solo,'host',{action:'start'},wordSeeds));
});
test('the earliest remaining player becomes host and a pending bluff can progress',()=>{
 const game=lobby();act(game,'host',{action:'start'},seedEntries);act(game,'guest1',{action:'answer',text:'First bluff'});act(game,'guest2',{action:'answer',text:'Second bluff'});leaveGame(game,'host');assert.equal(game.hostId,'guest1');assert.equal(game.phase,'voting');assert.equal(game.players.length,2);assert.throws(()=>act(game,'host',{action:'vote',optionId:game.round!.options[0].id}));
});
test('leaving during voting clears votes for the departed bluff and never scores twice',()=>{
 const game=lobby('idiom-bluff',4);act(game,'host',{action:'start'},seedEntries);for(const p of game.players)act(game,p.id,{action:'answer',text:'Bluff '+p.id});const removed=game.round!.options.find(option=>option.authorId==='host')!;act(game,'guest1',{action:'vote',optionId:removed.id});leaveGame(game,'host');assert.equal(game.round!.votes.guest1,undefined);const real=game.round!.options.find(option=>option.authorId===null)!;for(const p of game.players)act(game,p.id,{action:'vote',optionId:real.id});assert.equal(game.phase,'reveal');assert.deepEqual(game.players.map(p=>p.score),[1,1,1]);leaveGame(game,'guest1');assert.deepEqual(game.players.map(p=>p.score),[1,1]);assert.doesNotThrow(()=>viewGame(game,'guest2'));
});
test('a missing rater and a departing active speaker do not leave pronunciation stuck',()=>{
 const game=lobby('tongue-twisters',4);act(game,'host',{action:'start'},extraSeeds);const target={speakerId:'host',roundNumber:1,matchId:game.matchId!};act(game,'host',{action:'performed',...target});for(const id of ['guest1','guest2'])act(game,id,{action:'rate',...target,clarity:4,accuracy:4,rhythm:4});leaveGame(game,'guest3');assert.equal(game.phase,'speaking');assert.equal(viewGame(game,'guest1').pronunciation!.speaker.id,'guest1');leaveGame(game,'guest1');assert.equal(game.phase,'speaking');assert.equal(viewGame(game,'guest2').pronunciation!.speaker.id,'guest2');
});
test('too few speakers return to the lobby; empty rooms end cleanly',()=>{
 const game=lobby('tongue-twisters',2);act(game,'host',{action:'start'},extraSeeds);leaveGame(game,'host');assert.equal(game.phase,'lobby');assert.equal(game.hostId,'guest1');assert.equal(game.round,null);leaveGame(game,'guest1');assert.equal(game.phase,'finished');assert.equal(game.players.length,0);
});
test('rematches preserve room and player identities while clearing scores and changing match ID',()=>{
 const game=lobby('language-quiz',1);act(game,'host',{action:'configure',rounds:1});act(game,'host',{action:'start'},wordSeeds);const match=game.matchId;const right=game.round!.options.find(option=>option.language===game.round!.entry.language)!;act(game,'host',{action:'vote',optionId:right.id});act(game,'host',{action:'next'});assert.equal(game.phase,'finished');assert.equal(game.players[0].score,1);act(game,'host',{action:'restart',rounds:2},wordSeeds);assert.equal(game.phase,'voting');assert.equal(game.players[0].score,0);assert.equal(game.code,'ABC234');assert.equal(game.players[0].tokenHash,'secret-host');assert.notEqual(game.matchId,match);assert.equal(game.totalRounds,2);
});
test('heartbeats transfer a stale host after the disconnect grace period',()=>{
 const game=lobby('language-quiz',3);game.players[0].lastSeenAt=Date.now()-121000;act(game,'guest1',{action:'heartbeat'});assert.equal(game.hostId,'guest1');assert.equal(game.players.length,2);assert.equal(viewGame(game,'guest1').players.some(p=>p.id==='host'),false);
});
