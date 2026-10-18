import {challengeText,normalizedAnswer,type Bilingual} from './challenges';
import type {Entry} from './content';
import {localizeEntry} from './entry-localization';
import {shuffled} from './random';
import type {MeaningCategory} from './meaning-categories';
export type {MeaningCategory} from './meaning-categories';
export function meaningCategory(entry:Entry):MeaningCategory|undefined {
 return entry.kind==='idiom'||entry.kind==='dialect'?'expression':entry.kind==='gaming_mission'?'gaming':entry.kind==='youth_chat'?'youth':entry.kind==='academic'?'academic':undefined;
}
export function prepareMeaningEntries(entries:Entry[],locale:'de'|'en',category:MeaningCategory='all'):Entry[]{
 const eligible=entries.filter(entry=>meaningCategory(entry)&&(!entry.challenge||entry.challenge.type!=='mission'));
 const answer=(entry:Entry):Bilingual=>{const c=entry.challenge;if(c?.type==='meaning')return c.choices[c.correctIndex];return {de:localizeEntry(entry,'de').meaning||localizeEntry(entry,'de').literal,en:localizeEntry(entry,'en').meaning||localizeEntry(entry,'en').literal};};
 return eligible.filter(entry=>category==='all'||meaningCategory(entry)===category).flatMap(entry=>{
  const c=entry.challenge,right=answer(entry);if(!challengeText(right,locale))return [];
  if(c?.type==='meaning')return [entry];
  // Existing relay cards may contain actions rather than meanings. Preserve authored
  // meaning choices only when the stored solution actually matches the definition.
  if((c?.type==='relay'||c?.type==='academic')&&(['de','en'] as const).every(lang=>normalizedAnswer(challengeText(c.choices[c.correctIndex],lang))===normalizedAnswer(challengeText(right,lang))))return [{...entry,challenge:{type:'meaning' as const,choices:c.choices,correctIndex:c.correctIndex}}];
  const seen=new Set([normalizedAnswer(challengeText(right,locale))]);
  const alternatives=shuffled(eligible.filter(other=>meaningCategory(other)===meaningCategory(entry)&&other.id!==entry.id)).map(answer).filter(value=>{const key=normalizedAnswer(challengeText(value,locale));if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,3);
  return alternatives.length===3?[{...entry,challenge:{type:'meaning' as const,choices:[right,...alternatives],correctIndex:0}}]:[];
 });
}
