import data from './data/languages.json';
import type { LanguageNames } from './language-label';
import type { Locale } from './translations';
const entries=data.entries as [string,string,string,string,string][];
const byCode=new Map(entries.map(entry=>[entry[0],entry]));
export const registeredLanguageNames=(code:string):LanguageNames=>{const entry=byCode.get(code);return {de:entry?.[2]??code,en:entry?.[3]??code};};
const normalized=(text:string)=>text.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();
export function searchLanguages(query:string,locale:Locale){
  const needle=normalized(query.trim());if(needle.length<2)return [];
  const exact=byCode.get(needle);const found=exact?[exact]:[];
  for(const entry of entries){if(found.length>=20)break;if(entry!==exact&&entry[4].includes(needle))found.push(entry);}
  return found.map(entry=>({code:entry[0],label:entry[locale==='de'?2:3],englishName:entry[1]}));
}
export const languageRegistryDate=data.date;
