import {test} from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,viewGame} from '../lib/game';
import {seedEntries} from '../lib/seeds';
import {learningKey,learningOptionText,readLearningCards,rememberLearningRound} from '../lib/learning-review';
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
