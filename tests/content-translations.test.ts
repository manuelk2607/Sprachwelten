import test from 'node:test';
import assert from 'node:assert/strict';
import { entryInput, explanationInput } from '../lib/content';
import { localizeEntry } from '../lib/entry-localization';
import { localizedTexts, storedTranslation, textsOf, translationStatus } from '../lib/content-translations';
import { categoryId, categoryLabel, regionIds, contextIds } from '../lib/quiz-categories';
import { extraSeeds } from '../lib/extra-seeds';
import { act, createGame, viewGame } from '../lib/game';
import { requestDeepL } from '../lib/translation-service';

test('category IDs normalize legacy labels and cannot be replaced by arbitrary answers',()=>{
  assert.equal(categoryId('region',' Austria '),'at');assert.equal(categoryId('context','Höfliche Absage'),'polite-refusal');
  for(const kind of ['region','context'] as const)for(const id of kind==='region'?regionIds:contextIds)for(const locale of ['de','en'] as const)assert.equal(categoryId(kind,categoryLabel(kind,id,locale)),id);
  const input=entryInput.parse({kind:'dialect',phrase:'A regional word',language:'de',meaning:'A useful explanation.',region:'forged region',regionId:'at'});
  assert.equal(input.region,'Österreich');assert.equal(input.regionId,'at');
  assert.ok(!entryInput.safeParse({...input,regionId:'unknown-region'}).success);
  assert.ok(!entryInput.safeParse({kind:'situation',phrase:'A phrase',language:'en',meaning:'A useful explanation.',context:'Anything free-form'}).success);
});
test('community translations preserve original expressions and use per-field fallbacks',()=>{
  const original={...extraSeeds[0],status:'community' as const,sourceLocale:'de' as const,meaning:'Ein kurzer Gruß.',culturalNote:'Ein regionaler Hinweis.',translations:{en:{meaning:'A short greeting.',origin:'contributor' as const}}};
  const localized=localizeEntry(original,'en');assert.equal(localized.phrase,original.phrase);assert.equal(localized.language,original.language);
  assert.equal(localized.meaning,'A short greeting.');assert.equal(localized.culturalNote,original.culturalNote);assert.equal(original.meaning,'Ein kurzer Gruß.');assert.equal(translationStatus(original,'en'),'partial');assert.equal(translationStatus(original,'de'),'original');
  assert.equal(translationStatus({...original,translations:{}},'en'),'missing');
  const complete={...original,translations:{en:{meaning:'A short greeting.',culturalNote:'A regional note.',origin:'contributor' as const}}};assert.equal(translationStatus(complete,'en'),'translated');
  const english={body:'An English explanation.',sourceLocale:'en' as const,translations:{de:{body:'Eine deutsche Erklärung.',origin:'contributor' as const}}};assert.equal(localizedTexts(english,'de').body,'Eine deutsche Erklärung.');assert.equal(localizedTexts(english,'en'),english);
});
test('translations require contributor review and cannot inject provenance or orphan fields',()=>{
  const base={kind:'word',phrase:'saudade',language:'pt',meaning:'Eine bestimmte Form der Sehnsucht.',translation:{meaning:'A kind of longing.',origin:'curated'}};
  assert.ok(!entryInput.safeParse(base).success);
  const parsed=entryInput.parse({...base,translationReviewed:true});assert.ok(!('origin' in parsed.translation!));
  const stored=storedTranslation({meaning:'Meaning.'},{meaning:'Bedeutung.',example:'Orphan example.'});assert.deepEqual(stored,{meaning:'Bedeutung.',origin:'contributor'});
  assert.ok(!explanationInput.safeParse({body:'An English explanation.',translation:{body:'Eine Erklärung.'}}).success);
});
test('quiz answers remain stable IDs across German and English rooms and UI labels',()=>{
  for(const locale of ['de','en'] as const)for(const mode of ['dialect-detective','everyday-language'] as const){
    const game=createGame('ABC234',{id:'host',name:'QA',tokenHash:'secret',score:0},locale,mode);act(game,'host',{action:'start'},extraSeeds);
    const view=viewGame(game,'host');const target=mode==='dialect-detective'?game.round!.entry.regionId:game.round!.entry.contextId;
    assert.equal(view.options.filter(option=>option.categoryId===target).length,1);assert.ok(!('translations' in view.prompt!));assert.ok(!('regionId' in view.prompt!));assert.ok(!('contextId' in view.prompt!));
    for(const option of view.options)assert.equal(option.text,categoryLabel(option.categoryKind!,option.categoryId!,locale));
    act(game,'host',{action:'vote',optionId:view.options.find(option=>option.categoryId===target)!.id});assert.equal(game.players[0].score,2);
  }
});
test('DeepL sends only explanation fields to the API Free endpoint with explicit languages',async()=>{
  let calls=0;
  const fetcher:typeof fetch=async(input,init)=>{
    calls++;assert.equal(input,'https://api-free.deepl.com/v2/translate');assert.equal(new Headers(init?.headers).get('Authorization'),'DeepL-Auth-Key fixture-key');
    const payload=JSON.parse(init?.body as string);assert.deepEqual(payload.text,['Eine Bedeutung.','Ein Beispiel.']);assert.equal(payload.source_lang,'DE');assert.equal(payload.target_lang,'EN');assert.ok(!('phrase' in payload));
    return Response.json({translations:[{text:'A meaning.'},{text:'An example.'}]});
  };
  const result=await requestDeepL(textsOf({meaning:'Eine Bedeutung.',example:'Ein Beispiel.'}),'de','fixture-key',fetcher);assert.equal(result.meaning,'A meaning.');assert.equal(result.example,'An example.');assert.equal(calls,1);
});
test('DeepL quota failures, incomplete results and oversized translations fail safely',async()=>{
  const source=textsOf({meaning:'A meaning.'});
  await assert.rejects(requestDeepL(source,'en','fixture',async()=>new Response('',{status:456})),/Kontingent|kontingent/);
  await assert.rejects(requestDeepL(source,'en','fixture',async()=>Response.json({translations:[]})),/unvollständig/);
  await assert.rejects(requestDeepL(source,'en','fixture',async()=>Response.json({translations:[{text:'x'.repeat(1501)}]})),/zu lang/);
});
