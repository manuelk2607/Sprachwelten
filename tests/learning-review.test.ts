import {test} from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,viewGame} from '../lib/game';
import {seedEntries} from '../lib/seeds';
import {learningKey,learningOptionText,readLearningCards,rememberLearningRound} from '../lib/learning-review';
import {newGameEntries} from '../lib/new-game-seeds';
import {joinGame} from '../lib/game';
test('learning history records only personally answered revealed quizzes and never duplicates polling',()=>{
 const p={id:crypto.randomUUID(),name:'QA',tokenHash:'qa',score:0},g=createGame('REVIEW',p,'de','meaning-quiz');g.totalRounds=2;act(g,p.id,{action:'start'},seedEntries);
 assert.deepEqual(rememberLearningRound([],viewGame(g,p.id)),[]);
 const wrong=g.round!.options.find(option=>!option.solution)!;act(g,p.id,{action:'vote',optionId:wrong.id});
 const cards=rememberLearningRound([],viewGame(g,p.id));assert.equal(cards.length,1);assert.equal(cards[0].correct,false);assert.equal(cards[0].answer.text,g.round!.options.find(option=>option.solution)!.text);
 assert.equal(rememberLearningRound(cards,viewGame(g,p.id)),cards);
 assert.ok(!JSON.stringify(cards).includes('tokenHash'));assert.ok(!JSON.stringify(cards).includes('voters'));
 const now=Date.now();assert.deepEqual(readLearningCards(JSON.stringify({version:1,updatedAt:now,cards}),now),cards);
 assert.deepEqual(readLearningCards(JSON.stringify({version:1,updatedAt:now-86400001,cards}),now),[]);
 assert.deepEqual(readLearningCards('not json'),[]);
 assert.notEqual(learningKey(viewGame(g,p.id)),learningKey({...viewGame(g,p.id),playerId:'other'}));
 act(g,p.id,{action:'next'});assert.equal(rememberLearningRound(cards,viewGame(g,p.id)),cards);
});
test('review category labels follow the current interface and custom labels stay readable',()=>{
 assert.equal(learningOptionText({text:'Österreich',categoryKind:'region',categoryId:'at'},'en'),'Austria');
 assert.equal(learningOptionText({text:'Test region',categoryKind:'region',categoryId:'custom-test'},'en'),'Test region');
});
test('audio-only quizzes retain only the revealed attachment, never fabricate a transcript and keep players separate',()=>{
 const p={id:crypto.randomUUID(),name:'QA',tokenHash:'qa',score:0},other={...p,id:crypto.randomUUID(),name:'QA 2'},g=createGame('AUDIOQ',p,'de','meaning-quiz');joinGame(g,other);g.totalRounds=1;act(g,p.id,{action:'start'},seedEntries);
 const audioId=crypto.randomUUID();g.round!.entry={...g.round!.entry,presentation:'audio',phrase:'',audioId};
 const right=g.round!.options.find(option=>option.solution)!,wrong=g.round!.options.find(option=>!option.solution)!;
 act(g,p.id,{action:'vote',optionId:right.id});assert.deepEqual(rememberLearningRound([],viewGame(g,p.id)),[]);
 act(g,other.id,{action:'vote',optionId:wrong.id});
 const own=rememberLearningRound([],viewGame(g,p.id)),foreign=rememberLearningRound([],viewGame(g,other.id));
 assert.equal(own[0].audioId,audioId);assert.equal(own[0].phrase,'');assert.equal(own[0].correct,true);assert.equal(foreign[0].correct,false);assert.equal(foreign[0].chosen.text,wrong.text);
 const view=viewGame(g,p.id);assert.deepEqual(rememberLearningRound([],{...view,prompt:{...view.prompt!,audioId:undefined}}),[]);
 assert.deepEqual(rememberLearningRound([],{...view,prompt:{...view.prompt!,audioId:'https://untrusted.invalid/track'}}),[]);
});
test('word-building reviews preserve own accepted alternatives, hide unrevealed solutions and do not record another player’s sentence',()=>{
 const p={id:crypto.randomUUID(),name:'QA',tokenHash:'qa',score:0},other={...p,id:crypto.randomUUID(),name:'QA 2'},g=createGame('ORDERQ',p,'de','word-builder');joinGame(g,other);g.totalRounds=1;act(g,p.id,{action:'start'},newGameEntries);
 const c=g.round!.entry.challenge;assert.ok(c?.type==='order');
 const tiles=c.accepted[0].map(id=>g.round!.tiles!.find(tile=>tile.sourceId===id)!.id),guard={matchId:g.matchId!,roundNumber:1};
 act(g,p.id,{action:'order',tiles,...guard});assert.deepEqual(rememberLearningRound([],viewGame(g,p.id)),[]);
 act(g,other.id,{action:'order',tiles:[...tiles].reverse(),...guard});
 const own=rememberLearningRound([],viewGame(g,p.id)),foreign=rememberLearningRound([],viewGame(g,other.id));
 assert.equal(own[0].kind,'order');assert.equal(own[0].correct,true);assert.equal(own[0].chosen.text,own[0].answer.text);
 assert.equal(foreign[0].correct,false);assert.notEqual(foreign[0].chosen.text,own[0].chosen.text);
 const v=viewGame(g,p.id);assert.deepEqual(rememberLearningRound([],{...v,wordOrder:{...v.wordOrder!,submitted:false,ownOrder:null}}),[]);
 assert.deepEqual(readLearningCards(JSON.stringify({version:1,updatedAt:Date.now(),cards:own})),own);
 const future={...v,matchId:crypto.randomUUID()};assert.notEqual(learningKey(v),learningKey(future));
});
