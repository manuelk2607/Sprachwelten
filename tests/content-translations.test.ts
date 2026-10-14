import test from 'node:test';
import assert from 'node:assert/strict';
import { entryInput, explanationInput } from '../lib/content';
import { localizeEntry } from '../lib/entry-localization';
import { localizedTexts, storedTranslation, textsOf, translationStatus } from '../lib/content-translations';
import { categoryId, categoryLabel, regionIds, contextIds } from '../lib/quiz-categories';
import { extraSeeds } from '../lib/extra-seeds';
import { act, createGame, viewGame } from '../lib/game';
import { requestCloudflareTranslation, splitTranslationText, translationAvailable, translationCacheKey, translationModel, type TranslationAI } from '../lib/translation-service';
import { modeGuides } from '../lib/mode-guides';
import { translate } from '../lib/translations';

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
    act(game,'host',{action:'vote',optionId:view.options.find(option=>option.categoryId===target)!.id});assert.equal(game.players[0].score,1);
  }
});
test('Workers AI translates only explanation fields with explicit source and target languages',async()=>{
  const calls:string[]=[];
  const ai:TranslationAI={run:async(model,input)=>{
    assert.equal(model,translationModel);assert.equal(input.source_lang,'de');assert.equal(input.target_lang,'en');
    assert.deepEqual(Object.keys(input).sort(),['source_lang','target_lang','text']);calls.push(input.text);
    return {translated_text:input.text==='Eine Bedeutung.'?'A meaning.':'An example.'};
  }};
  const result=await requestCloudflareTranslation(textsOf({meaning:'Eine Bedeutung.',example:'Ein Beispiel.'}),'de',ai);
  assert.deepEqual(calls,['Eine Bedeutung.','Ein Beispiel.']);assert.equal(result.meaning,'A meaning.');assert.equal(result.example,'An example.');assert.equal(result.body,'');
});
test('long explanations are split without losing characters or breaking Unicode',async()=>{
  const source=('Ein Satz mit einem Emoji 🌍. ').repeat(30);
  const chunks=splitTranslationText(source);assert.equal(chunks.join(''),source);assert.ok(chunks.length>1);
  assert.ok(chunks.every(chunk=>chunk.length<=400&&!/[\uD800-\uDBFF]$/.test(chunk)&&!/^([\uDC00-\uDFFF])/.test(chunk)));
  const unbroken='🌍'.repeat(350);assert.equal(splitTranslationText(unbroken).join(''),unbroken);assert.ok(splitTranslationText(unbroken).every(chunk=>chunk.length<=400));
  const ai:TranslationAI={run:async(_model,input)=>{assert.ok(input.text.length<=400);assert.equal(input.source_lang,'en');assert.equal(input.target_lang,'de');return {translated_text:input.text};}};
  const translated=await requestCloudflareTranslation(textsOf({meaning:source}),'en',ai);assert.equal(translated.meaning,source.trim());
});
test('empty, malformed and oversized model results fail without publishing a suggestion',async()=>{
  const source=textsOf({meaning:'A meaning.'});
  for(const response of [{},{translated_text:''},{translated_text:42}])await assert.rejects(requestCloudflareTranslation(source,'en',{run:async()=>response}),/unvollständig/);
  await assert.rejects(requestCloudflareTranslation(source,'en',{run:async()=>({translated_text:'x'.repeat(1501)})}),/zu lang/);
  await assert.rejects(requestCloudflareTranslation(source,'en',{run:async()=>{throw new Error('Unavailable');}}),/Unavailable/);
  assert.equal(translationAvailable(),false);assert.equal(translationAvailable({run:async()=>({})}),true);
});
test('translation cache separates language direction and content',async()=>{
  const source=textsOf({meaning:'A meaning.'});const key=await translationCacheKey(source,'en');
  assert.match(key,/^[a-f0-9]{64}$/);assert.equal(key,await translationCacheKey(source,'en'));
  assert.notEqual(key,await translationCacheKey(source,'de'));assert.notEqual(key,await translationCacheKey(textsOf({meaning:'A different meaning.'}),'en'));
});
test('every mode has a complete, bilingual guide',()=>{
  assert.equal(Object.keys(modeGuides).length,5);
  for(const guide of Object.values(modeGuides)){
    assert.equal(guide.steps.length,3);
    for(const text of [guide.category,guide.scoring,guide.tip,...guide.steps.flatMap(step=>[step.title,step.text])])assert.notEqual(translate(text,'en'),text,`Missing English: ${text}`);
  }
});
