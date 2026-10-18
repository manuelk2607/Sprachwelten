import test from 'node:test';
import assert from 'node:assert/strict';
import { audioSelection,encodeAudioWave,validateAudioWave,audioSampleRate,maxAudioSeconds } from '../lib/audio-format';
import { isRegisteredLanguage } from '../lib/language-codes';
import { searchLanguages } from '../lib/language-registry';
import { entryInput } from '../lib/content';
import { act,createGame,viewGame } from '../lib/game';
import { wordSeeds } from '../lib/word-seeds';
test('WAV uploads have a verifiable duration and reject forged headers and oversized recordings',()=>{
 const wave=new Uint8Array(encodeAudioWave(new Float32Array(audioSampleRate)));assert.equal(validateAudioWave(wave).durationMs,1000);wave[24]=0;assert.throws(()=>validateAudioWave(wave));assert.throws(()=>encodeAudioWave(new Float32Array(audioSampleRate*maxAudioSeconds+1)));assert.throws(()=>validateAudioWave(new Uint8Array(44)));
});
test('audio clips validate boundaries before rendering and never exceed the upload limit',()=>{
 const clip=audioSelection(90,12.5,15);assert.equal(clip.start,12.5);assert.equal(clip.samples,40000);assert.equal(validateAudioWave(new Uint8Array(encodeAudioWave(new Float32Array(clip.samples)))).durationMs,2500);
 for(const [start,end] of [[-1,2],[5,4],[0,21],[89,91],[NaN,2],[0,0.01]])assert.throws(()=>audioSelection(90,start,end));
 assert.equal(audioSelection(90,30,50).samples,audioSampleRate*20);
});
test('new languages come from the IANA registry, including dialects, while invented and unspecified codes fail',()=>{
 assert.equal(isRegisteredLanguage('ko'),true);assert.equal(isRegisteredLanguage('bar'),true);for(const code of ['zz','xyzfake','und','mul','zxx'])assert.equal(isRegisteredLanguage(code),false);assert.equal(searchLanguages('bar','de')[0].code,'bar');assert.ok(searchLanguages('Koreanisch','de').some(language=>language.code==='ko'));
 const input=entryInput.parse({literal:'Test translation',kind:'word',phrase:'안녕',language:'ko',creditName:'Meine Freundin',authorId:'forged'});assert.equal(input.creditName,'Meine Freundin');assert.ok(!('authorId' in input));assert.ok(!entryInput.safeParse({literal:'Test translation',kind:'word',phrase:'hello',language:'fake'}).success);
});
test('a registered custom language remains one correct quiz choice without leaking the solution',()=>{
 const entry={...wordSeeds[0],language:'ko',phrase:'안녕',audioId:'00000000-0000-4000-8000-000000000111'};const game=createGame('ABC234',{id:'host',name:'Host',tokenHash:'secret',score:0},'en','language-quiz');act(game,'host',{action:'configure',rounds:1});act(game,'host',{action:'start'},[entry]);const view=viewGame(game,'host');assert.equal(view.options.filter(option=>option.language==='ko').length,1);assert.equal(view.prompt?.audioId,entry.audioId);assert.ok(!('language' in view.prompt!));assert.equal(view.revelation,null);
});
