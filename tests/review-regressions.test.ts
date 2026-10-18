import test from 'node:test';
import assert from 'node:assert/strict';
import {regionOptions} from '../lib/region-options';
import {regions} from '../lib/quiz-categories';
import {seedEntries} from '../lib/seeds';
import {extraSeeds} from '../lib/extra-seeds';
import {wordSeeds} from '../lib/word-seeds';
import {localizeEntry} from '../lib/entry-localization';
import {communityGameEntries} from '../lib/community-game-seeds';
import {withRoomAudio,roomAudioCredential} from '../lib/room-audio';
test('invalid registry responses never replace defaults; custom options merge',()=>{
 for(const payload of [null,{error:'Unavailable'},{regions:null},{regions:[]},{regions:{x:{de:3,en:'X'}}}])assert.throws(()=>regionOptions(payload));
 assert.deepEqual(regionOptions({regions:{custom:{de:'Hier',en:'Here'}}}),{...regions,custom:{de:'Hier',en:'Here'}});
});
test('legacy translations survive metadata edits, explicit translations win and changed source stays current',()=>{
 for(const entry of [seedEntries[0],wordSeeds[0],extraSeeds[0],extraSeeds[8]]){
 const english=localizeEntry(entry,'en');assert.notEqual(english.meaning,entry.meaning);
 assert.equal(localizeEntry({...entry,revision:9,region:'New',updatedAt:new Date().toISOString()},'en').meaning,english.meaning);
 const changed=localizeEntry({...entry,meaning:'Neue individuelle Bedeutung',updatedAt:new Date().toISOString()},'en');assert.equal(changed.meaning,'Neue individuelle Bedeutung');
 assert.equal(localizeEntry({...entry,translations:{en:{origin:'contributor',meaning:'Explicit meaning'}}},'en').meaning,'Explicit meaning');
 }
});
test('new quiz choices are unique, bilingual and individually written',()=>{
 const cards=communityGameEntries.filter(entry=>entry.challenge?.type==='relay'||entry.challenge?.type==='joke');const distractors=new Set<string>();for(const entry of cards){const c=entry.challenge;assert.ok(c&&(c.type==='relay'||c.type==='joke'));assert.equal(c.choices.length,4);for(const lang of ['de','en'] as const){assert.equal(new Set(c.choices.map(x=>x[lang])).size,4);assert.ok(c.choices.every(x=>x[lang].length>10));}distractors.add(JSON.stringify(c.choices.slice(1)));}assert.equal(distractors.size,cards.length);
});
test('audio credentials are HttpOnly, room-scoped, secure in production and revoked on leave',()=>{
 const request=new Request('https://example.test/api/rooms/ABC234'),hash='a'.repeat(64);const response=withRoomAudio(new Response(),request,'ABC234',hash);const cookie=response.headers.get('Set-Cookie')!;for(const part of ['HttpOnly','Secure','SameSite=Strict','Path=/api/rooms/ABC234'])assert.ok(cookie.includes(part));
 assert.equal(roomAudioCredential(new Request(request,{headers:{cookie:cookie.split(';')[0]}}),'ABC234'),hash);
 assert.equal(roomAudioCredential(new Request(request,{headers:{cookie:cookie.split(';')[0]}}),'OTHER1'),undefined);
 assert.ok(withRoomAudio(new Response(),request,'ABC234').headers.get('Set-Cookie')!.includes('Max-Age=0'));
});
