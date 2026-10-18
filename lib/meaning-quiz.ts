import {challengeText,normalizedAnswer,type Bilingual} from './challenges';
import type {Entry} from './content';
import {localizeEntry} from './entry-localization';
import {shuffled} from './random';
import type {MeaningCategory} from './meaning-categories';
import {starterDistractors} from './starter-distractors';
export type {MeaningCategory} from './meaning-categories';
const answerTokens=(text:string)=>new Set(normalizedAnswer(text).split(/\s+/).filter(word=>word.length>3));
export function meaningCategory(entry:Entry):MeaningCategory|undefined {
 return entry.kind==='idiom'||entry.kind==='dialect'?'expression':entry.kind==='gaming_mission'?'gaming':entry.kind==='youth_chat'?'youth':entry.kind==='academic'?'academic':undefined;
}
export function prepareMeaningEntries(entries:Entry[],locale:'de'|'en',category:MeaningCategory='all'):Entry[]{
 // Translate and normalize each answer once, then share a shuffled pool per category.
 const cards=entries.flatMap(entry=>{
  const group=meaningCategory(entry);if(!group||category!=='all'&&category!==group||entry.challenge?.type==='mission')return [];
  const c=entry.challenge,de=localizeEntry(entry,'de'),en=localizeEntry(entry,'en');
  const right:Bilingual=c?.type==='meaning'?c.choices[c.correctIndex]:{de:de.meaning||de.literal,en:en.meaning||en.literal};
  const key=normalizedAnswer(challengeText(right,locale));
  return key?[{entry,group,right,key,words:answerTokens(challengeText(right,locale)),phrase:normalizedAnswer(entry.phrase)}]:[];
 });
 const groups=new Map<MeaningCategory,typeof cards>();
 for(const card of cards){const group=groups.get(card.group)??[];group.push(card);groups.set(card.group,group);}
 for(const [key,group] of groups)groups.set(key,shuffled(group));
 return cards.flatMap(card=>{
  const {entry,right}=card,c=entry.challenge;
  if(c?.type==='meaning')return [entry];
  // Existing relay cards may contain actions rather than meanings. Preserve authored
  // meaning choices only when the stored solution actually matches the definition.
  if((c?.type==='relay'||c?.type==='academic')&&(['de','en'] as const).every(lang=>normalizedAnswer(challengeText(c.choices[c.correctIndex],lang))===normalizedAnswer(challengeText(right,lang))))return [{...entry,challenge:{type:'meaning' as const,choices:c.choices,correctIndex:c.correctIndex}}];
  const authored=starterDistractors(entry,right);
  if(authored)return [{...entry,challenge:{type:'meaning' as const,choices:[right,...authored],correctIndex:0}}];
  const ownTokens=card.words,length=card.key.length;
  const similarity=(other:typeof card)=>{
   const overlap=[...ownTokens].filter(word=>other.words.has(word)).length/Math.max(1,ownTokens.size);
   return (other.entry.kind===entry.kind?3:0)+Math.min(length,other.key.length)/Math.max(length,other.key.length)+overlap*2;
  };
  const seen=new Set([card.key]),alternatives:Bilingual[]=[],pool=groups.get(card.group)!.map(other=>({other,score:similarity(other)})).sort((a,b)=>b.score-a.score).map(candidate=>candidate.other);
  for(let index=0;index<pool.length&&alternatives.length<3;index++){
   const other=pool[index];
   // A different valid meaning of the same expression must never be a wrong answer.
   if(other.entry.id===entry.id||card.phrase&&other.phrase===card.phrase||seen.has(other.key))continue;
   seen.add(other.key);alternatives.push(other.right);
  }
  return alternatives.length===3?[{...entry,challenge:{type:'meaning' as const,choices:[right,...alternatives],correctIndex:0}}]:[];
 });
}
