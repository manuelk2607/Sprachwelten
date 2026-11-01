import test from 'node:test';
import assert from 'node:assert/strict';
import {entryInput,contentKinds} from '../lib/content';
import {hasAudio,hasText,presentationOf} from '../lib/content-media';
import {createGame,joinGame,act,viewGame} from '../lib/game';
import {gameModes} from '../lib/modes';
import {communityGameEntries} from '../lib/community-game-seeds';
import {newGameEntries} from '../lib/new-game-seeds';
import {seedEntries} from '../lib/seeds';
import {extraSeeds} from '../lib/extra-seeds';
import {wordSeeds} from '../lib/word-seeds';
import {tabooSeeds} from '../lib/taboo-seeds';
import {prepareAttributionEntries} from '../lib/attribution';
const clip=crypto.randomUUID();
const player=(n:number)=>({id:crypto.randomUUID(),name:'Media '+n,tokenHash:'hash-'+n,score:0});
const samples=[...tabooSeeds,...seedEntries,...extraSeeds,...wordSeeds,...newGameEntries,...communityGameEntries];
test('text, audio and combined input validate independently; legacy submissions keep their behavior',()=>{
 assert.equal(entryInput.parse({literal:'Test translation',kind:'word',phrase:'word',language:'en'}).presentation,'text');
 assert.equal(entryInput.parse({literal:'Test translation',kind:'word',phrase:'word',language:'en',audioId:clip}).presentation,'both');
 assert.equal(entryInput.parse({literal:'Test translation',kind:'word',language:'en',presentation:'audio',audioId:clip}).phrase,'');
 assert.equal(entryInput.parse({literal:'Test translation',kind:'word',phrase:'discarded hidden text',language:'en',presentation:'audio',audioId:clip}).phrase,'');
 for(const input of [{literal:'Test translation',kind:'word',language:'en',presentation:'text'},{literal:'Test translation',kind:'word',phrase:'word',language:'en',presentation:'both'},{literal:'Test translation',kind:'word',language:'en',presentation:'audio'},{literal:'Test translation',kind:'word',phrase:'word',language:'en',presentation:'text',audioId:clip},{literal:'Test translation',kind:'word',phrase:'word',language:'en',presentation:'unknown'}])assert.equal(entryInput.safeParse(input).success,false,JSON.stringify(input));
});
test('each contribution kind accepts audio without an original text while retaining its required solution metadata',()=>{
 for(const kind of contentKinds.filter(kind=>kind!=='vocabulary'&&kind!=='grammar')){const sample=samples.find(e=>e.kind===kind);assert.ok(sample,kind);const input=entryInput.parse({...sample,literal:sample.literal||'Test translation',presentation:'audio',phrase:'',audioId:clip});assert.equal(input.phrase,'');assert.equal(input.presentation,'audio');if(sample.challenge)assert.deepEqual(input.challenge,sample.challenge);}
 assert.equal(entryInput.safeParse({kind:'idiom',language:'de',presentation:'audio',audioId:clip}).success,false,'A contribution still needs a literal translation.');
});
test('saved legacy rounds infer their original presentation without losing recordings',()=>{
 assert.equal(presentationOf({}),'text');assert.equal(presentationOf({audioId:clip}),'both');assert.equal(hasText({presentation:'audio',audioId:clip}),false);assert.equal(hasAudio({presentation:'text',audioId:clip}),false);
});
test('audio-only prompts remain distinct and hide source text in every game projection',()=>{
 for(const mode of gameModes.filter(mode=>mode.id!=='word-chain'&&mode.id!=='taboo')){
  let prompts=samples.filter(e=>e.kind===mode.kind).slice(0,4).map(e=>({...e,presentation:'audio' as const,phrase:'',literal:'Hidden transcript',audioId:crypto.randomUUID()}));
  if(mode.id==='who-said-it')prompts=prepareAttributionEntries(samples.filter(e=>e.kind==='attribution')).map(e=>({...e,presentation:'audio' as const,phrase:'',literal:'Hidden transcript',audioId:crypto.randomUUID()}));
  assert.ok(prompts.length>=2,mode.id);const p=player(1),g=createGame('ABC234',p,'en',mode.id);if(mode.id==='tongue-twisters')g.pronunciationLanguage='';for(let i=2;i<=mode.minPlayers;i++)joinGame(g,player(i));act(g,p.id,{action:'start'},prompts);
  assert.equal(g.prompts.length,2,mode.id);assert.notEqual(g.prompts[0].audioId,g.prompts[1].audioId);
  if(g.round?.pronunciation?.selection){g.round.pronunciation.selection.endsAt=Date.now()-1;act(g,p.id,{action:'heartbeat'});}
  const view=viewGame(g,p.id);assert.equal(view.prompt?.phrase,'');assert.equal(view.prompt?.audioId,g.round!.entry.audioId);assert.ok(!view.prompt?.literal);assert.equal(view.prompt?.presentation,'audio');assert.equal(view.revelation,null);
  if(view.friends)assert.equal(view.friends.otherWord,'');if(view.wordOrder)assert.equal(view.wordOrder.source,'');if(view.team){assert.equal(view.team.briefing?.phrase,'');const receiver=viewGame(g,g.players[1].id);assert.equal(receiver.prompt?.audioId,undefined);assert.equal(receiver.team?.briefing,null);}
 }
});
test('text-only and combined rounds expose only the selected media',()=>{
 for(const presentation of ['text','both'] as const){const p=player(1),g=createGame('ABC234',p,'en','language-quiz');const entries=samples.filter(e=>e.kind==='word').map(e=>({...e,presentation,audioId:clip}));act(g,p.id,{action:'start'},entries);const view=viewGame(g,p.id);assert.equal(view.prompt?.phrase,g.round!.entry.phrase);assert.equal(view.prompt?.audioId,presentation==='both'?clip:undefined);}
});
test('audio pronunciation does not disclose written sound-pair helpers before the reveal',()=>{
 const p=player(1),g=createGame('ABC234',p,'de','tongue-twisters');joinGame(g,player(2));g.pronunciationCategory='sound';act(g,p.id,{action:'start'},newGameEntries.filter(e=>e.kind==='sound_pair').map(e=>({...e,presentation:'audio',phrase:'',audioId:crypto.randomUUID()})));assert.equal(viewGame(g,p.id).soundWords,null);assert.equal(viewGame(g,p.id).pronunciationType,'sound');g.phase='reveal';assert.ok(viewGame(g,p.id).soundWords?.length);
});
