import type {Entry} from './content';
import {normalizedAnswer} from './challenges';
import {shuffled} from './random';
export function prepareAttributionEntries(entries:Entry[]):Entry[]{
 return entries.flatMap(entry=>{
  const c=entry.challenge;if(c?.type!=='attribution')return [];
  const own=[c.answer,...c.aliases].map(normalizedAnswer);
  const candidates=[...c.alternatives,...shuffled(entries.filter(e=>e.challenge?.type==='attribution'&&e.challenge.category===c.category).flatMap(e=>{const other=e.challenge;if(other?.type!=='attribution'||own.includes(normalizedAnswer(other.answer))||other.aliases.some(a=>own.includes(normalizedAnswer(a))))return [];return [other.answer+(other.category==='song'&&other.artist?' — '+other.artist:'')];}))];
  const values=[...new Map(candidates.filter(s=>!own.some(k=>normalizedAnswer(s)===k||normalizedAnswer(s).startsWith(k+' '))).map(s=>[normalizedAnswer(s),s])).values()].slice(0,3);
  return values.length===3?[{...entry,challenge:{...c,alternatives:values}}]:[];
 });
}
