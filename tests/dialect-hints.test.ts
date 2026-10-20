import test from 'node:test';
import assert from 'node:assert/strict';
import {entryInput,type Entry} from '../lib/content';
import {localizeEntry} from '../lib/entry-localization';
import {storedTranslation,translationStatus,textsOf} from '../lib/content-translations';
import {act,createGame,viewGame} from '../lib/game';
import {extraSeeds} from '../lib/extra-seeds';
import {seedEntries} from '../lib/seeds';

const entries:Entry[]=extraSeeds.filter(entry=>entry.kind==='dialect').map((entry,index)=>({...entry,hint:`Deutscher Tipp ${index}`,sourceLocale:'de',translations:{en:{hint:`English hint ${index}`,origin:'contributor'}}}));
const player=()=>({id:crypto.randomUUID(),name:'QA',tokenHash:crypto.randomUUID(),score:0});

test('idiom hints are optional, reviewed, localized and limited to the current voting round',()=>{
  const base={kind:'idiom',phrase:'Da liegt der Hund begraben.',language:'de',literal:'Here lies the dog buried.'};
  assert.equal(entryInput.parse(base).hint,'');
  assert.equal(entryInput.safeParse({...base,hint:'a'.repeat(301)}).success,false);
  assert.equal(entryInput.safeParse({...base,hint:'Ein Tier.',translation:{hint:'An animal.'}}).success,false);
  assert.equal(entryInput.parse({...base,hint:'Ein Tier.',translation:{hint:'An animal.'},translationReviewed:true}).translation?.hint,'An animal.');
  const sources=seedEntries.map((entry,index)=>({...entry,hint:`Redewendungs-Tipp ${index}`,sourceLocale:'de' as const,translations:{en:{hint:`Idiom hint ${index}`,origin:'contributor' as const}}}));
  for(const locale of ['de','en'] as const){
    const game=createGame('IDIOMX',player(),locale,'meaning-quiz');game.totalRounds=2;
    act(game,game.hostId,{action:'start'},sources);
    const view=viewGame(game,game.hostId),first=game.round!.entry.hint!;
    assert.equal(view.hint?.text,first);assert.match(first,locale==='de'?/^Redewendungs-Tipp/:/^Idiom hint/);
    assert.equal(view.revelation,null);assert.ok(!JSON.stringify(view).includes(JSON.stringify(game.prompts[1].hint!)));
    const right=game.round!.options.find(option=>option.solution)!;
    act(game,game.hostId,{action:'vote',optionId:right.id});assert.equal(game.players[0].score,1);assert.equal(viewGame(game,game.hostId).hint,null);
    act(game,game.hostId,{action:'next'});assert.notEqual(viewGame(game,game.hostId).hint?.text,first);
  }
});

test('dialect hints are optional, bounded and translated only after contributor review',()=>{
  const input={kind:'dialect',phrase:'Grind',language:'de',regionId:'ch',literal:'Kopf'};
  assert.equal(entryInput.parse(input).hint,'');assert.equal(entryInput.parse({...input,hint:'  Ein Körperteil.  '}).hint,'Ein Körperteil.');
  for(const hint of ['a'.repeat(301),42,null])assert.equal(entryInput.safeParse({...input,hint}).success,false);
  assert.equal(entryInput.safeParse({...input,hint:'Ein Körperteil.',translation:{hint:'A body part.'}}).success,false);
  assert.equal(entryInput.parse({...input,hint:'Ein Körperteil.',translation:{hint:'A body part.'},translationReviewed:true}).translation?.hint,'A body part.');
  assert.deepEqual(storedTranslation({hint:'Ein Körperteil.'},{hint:'A body part.'}),{hint:'A body part.',origin:'contributor'});
  assert.equal(textsOf({hint:'Ein Körperteil.'}).hint,'Ein Körperteil.');
  assert.equal(localizeEntry(entries[0],'en').hint,'English hint 0');
  const missing={...entries[0],translations:{}};assert.equal(localizeEntry(missing,'en').hint,missing.hint);assert.equal(translationStatus({hint:missing.hint,sourceLocale:'de'},'en'),'missing');
});

test('both dialect games expose only the current optional hint, never solution metadata or future hints',()=>{
  for(const mode of ['meaning-quiz','dialect-detective'] as const)for(const locale of ['de','en'] as const){
    const game=createGame('TIPPSX',player(),locale,mode);game.totalRounds=2;
    assert.equal(viewGame(game,game.hostId).hint,null);act(game,game.hostId,{action:'start'},entries);
    const view=viewGame(game,game.hostId),hint=game.round!.entry.hint!;
    assert.equal(view.hint?.text,hint);assert.match(hint,locale==='de'?/^Deutscher Tipp/:/^English hint/);
    assert.equal(view.hint?.status,locale==='de'?'original':'translated');assert.equal(view.revelation,null);
    assert.ok(!('hint' in view.prompt!));assert.ok(!('literal' in view.prompt!));assert.ok(view.options.every(option=>!('correct' in option)));
    assert.ok(!JSON.stringify(view).includes(game.prompts[1].hint!));
    const right=game.round!.options.find(option=>option.solution??(option.categoryId===game.round!.entry.regionId))!;
    act(game,game.hostId,{action:'vote',optionId:right.id});assert.equal(game.players[0].score,1);assert.equal(viewGame(game,game.hostId).hint,null);
    act(game,game.hostId,{action:'next'});assert.notEqual(viewGame(game,game.hostId).hint?.text,hint);
  }
});

test('legacy dialect cards without hints remain playable and unrelated cards never show dialect hints',()=>{
  for(const source of [entries.map(entry=>({...entry,hint:''})),entries.map(entry=>({...entry,kind:'word' as const}))]){
    const game=createGame('TIPPSX',player(),'de',source[0].kind==='word'?'language-quiz':'dialect-detective');
    act(game,game.hostId,{action:'start'},source);assert.equal(viewGame(game,game.hostId).hint,null);
  }
});
