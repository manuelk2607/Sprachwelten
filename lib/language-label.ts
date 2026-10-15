import type { Locale } from './translations';
export type LanguageNames={de:string;en:string};
const displayNames:Partial<Record<Locale,Intl.DisplayNames>>={};
export function languageLabel(code:string,locale:Locale,names?:LanguageNames|string){
  try{const label=(displayNames[locale]??=new Intl.DisplayNames([locale],{type:'language',fallback:'none'})).of(code);if(label)return label;}catch{}
  return typeof names==='string'?names:names?.[locale]??code;
}
