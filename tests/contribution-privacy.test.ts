import test from 'node:test';
import assert from 'node:assert/strict';
import {entryInput,storedEntryInput,type Entry} from '../lib/content';
import {publicEntry,publicExplanation,entryPreview} from '../lib/content-public';
import {seedEntries} from '../lib/seeds';
import {localizeEntry} from '../lib/entry-localization';
import {act,createGame,joinGame,viewGame} from '../lib/game';
test('a short translation is sufficient for a dialect contribution and an explanation is optional',()=>{
 const entry=entryInput.parse({kind:'dialect',phrase:'Grind',language:'de',regionId:'ch',literal:'Kopf'});assert.equal(entry.meaning,'');assert.equal(entry.literal,'Kopf');
 assert.equal(entryInput.safeParse({...entry,literal:'  '}).success,false);
 assert.equal(entryInput.parse({...entry,meaning:'Kopf.'}).meaning,'Kopf.');
 assert.ok(storedEntryInput.safeParse({...seedEntries[0],literal:''}).success,'Existing cards remain compatible.');
});
test('specialized game cards use their structured solution without a duplicate literal translation',()=>{
 const twister=entryInput.parse({kind:'tongue_twister',phrase:'Fischers Fritz fischt frische Fische.',language:'de'});assert.equal(twister.literal,'');
 const choices=['Eine passende Lösung','Eine falsche Antwort','Noch eine falsche Antwort','Die letzte falsche Antwort'].map(de=>({de,en:de}));
 for(const [kind,challenge] of [
  ['gaming_mission',{type:'relay',term:'pushen',choices,correctIndex:0}],
  ['youth_chat',{type:'relay',term:'sus',choices,correctIndex:0}],
  ['academic',{type:'academic',direction:'plain',taboo:['Eins','Zwei','Drei'].map(de=>({de,en:de})),choices,correctIndex:0}],
  ['joke',{type:'joke',choices,correctIndex:0}],
 ] as const)assert.ok(entryInput.safeParse({kind,phrase:'Eine ausreichend lange Aufgabe',language:'de',challenge}).success,kind);
 assert.ok(!entryInput.safeParse({kind:'word',phrase:'Wort',language:'de'}).success,'Ordinary language entries still need a literal translation.');
});
test('public credits are opt-in and the discovery preview never contains answers or account identity',()=>{
 const entry={...seedEntries[0],authorName:'Private account',creditName:''};const published=publicEntry(entry);assert.equal(published.authorName,'');assert.equal(published.creditName,'');assert.equal(publicEntry({...entry,creditName:'Oma'}).creditName,'Oma');
 const explanation=publicExplanation({id:crypto.randomUUID(),body:'An explanation.',authorName:'Private account',createdAt:new Date().toISOString(),creditName:''});assert.equal(explanation.authorName,'');
 const teaser=entryPreview(entry);assert.deepEqual(Object.keys(teaser).sort(),['createdAt','id','kind','phrase','presentation','status']);for(const field of ['literal','meaning','region','language','challenge','audioId','authorName','translations'])assert.ok(!(field in teaser),field);
});
test('bluffs use the translation when no explanation exists and withhold it until voting',()=>{
 const p={id:'a',name:'Ada',score:0,tokenHash:'private'},g=createGame('ABC234',p);joinGame(g,{...p,id:'b',name:'Ben'});joinGame(g,{...p,id:'c',name:'Cam'});
 const cards=seedEntries.slice(0,2).map(e=>({...e,status:'community' as const,meaning:'',literal:'Short real answer',authorName:'Private account',creditName:''}));act(g,'a',{action:'start'},cards);
 assert.equal(viewGame(g,'a').prompt?.literal,'');assert.equal(viewGame(g,'a').revelation,null);
 for(const id of ['a','b','c'])act(g,id,{action:'answer',text:'An invented answer '+id});assert.ok(g.round!.options.some(o=>o.authorId===null&&o.text==='Short real answer'));
 const right=g.round!.options.find(o=>o.authorId===null)!.id;for(const id of ['a','b','c'])act(g,id,{action:'vote',optionId:right});const revealed=viewGame(g,'a');assert.equal(revealed.revelation?.meaning,'Short real answer');assert.equal(revealed.revelation?.authorName,'');assert.deepEqual(g.players.map(p=>p.score),[1,1,1]);
});
test('administrator edits supersede bundled starter translations',()=>{
 const edited:Entry={...seedEntries[0],updatedAt:new Date().toISOString(),literal:'Neu',meaning:'Neue Erklärung',translations:{en:{origin:'contributor',literal:'New',meaning:'New explanation'}}};assert.equal(localizeEntry(edited,'en').meaning,'New explanation');assert.equal(localizeEntry(edited,'en').literal,'New');
});
