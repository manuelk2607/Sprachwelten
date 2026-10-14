import { z } from 'zod';
import { database } from '@/db/repository';
import { GameError } from './game';
import { otherLocale, textsOf, translationFields, translationKeys, type TranslationTexts } from './content-translations';
import type { Locale } from './translations';

export const translationRequest=z.object({sourceLocale:z.enum(['de','en']),texts:translationFields}).refine(input=>translationKeys.some(key=>input.texts[key]),{message:'Bitte zuerst einen Text für die Übersetzung eingeben.'});
export const translationModel='@cf/meta/m2m100-1.2b';
export type TranslationAI={run:(model:typeof translationModel,input:{text:string;source_lang:string;target_lang:string})=>Promise<unknown>};
export const translationDailyCharacterLimit=50_000;
const maxChunkCharacters=400;
export function translationAvailable(ai?:TranslationAI){return !!ai;}
export function splitTranslationText(text:string):string[] {
  const chunks:string[]=[];let remainder=text;
  while(remainder.length>maxChunkCharacters){
    const candidate=remainder.slice(0,maxChunkCharacters);
    const sentence=[...candidate.matchAll(/[.!?](?:[”"»])?\s+/g)].at(-1);
    let split=sentence?sentence.index!+sentence[0].length:candidate.lastIndexOf(' ');
    if(split<maxChunkCharacters/2)split=maxChunkCharacters;
    // Never split a surrogate pair.
    if(/[\uD800-\uDBFF]/.test(remainder[split-1]))split--;
    chunks.push(remainder.slice(0,split));remainder=remainder.slice(split);
  }
  if(remainder)chunks.push(remainder);
  return chunks;
}
export async function requestCloudflareTranslation(texts:TranslationTexts,sourceLocale:Locale,ai:TranslationAI):Promise<TranslationTexts> {
  const translated:Partial<TranslationTexts>={};
  for(const key of translationKeys.filter(field=>texts[field])) {
    const parts:string[]=[];
    for(const chunk of splitTranslationText(texts[key])) {
      const response=await ai.run(translationModel,{text:chunk.trim(),source_lang:sourceLocale,target_lang:otherLocale(sourceLocale)});
      const parsed=z.object({translated_text:z.string().trim().min(1)}).safeParse(response);
      if(!parsed.success)throw new GameError('Die Übersetzung ist unvollständig. Bitte erneut versuchen.',503);
      parts.push(parsed.data.translated_text);
    }
    translated[key]=parts.join(' ');
  }
  const result=translationFields.safeParse(translated);
  if(!result.success)throw new GameError('Die Übersetzung ist zu lang. Bitte die Texte kürzen oder manuell übersetzen.',422);
  return result.data;
}
export async function translationCacheKey(texts:TranslationTexts,sourceLocale:Locale) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({version:2,provider:'cloudflare',model:translationModel,sourceLocale,texts})));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function suggestTranslation(source:TranslationTexts,sourceLocale:Locale,ai?:TranslationAI) {
  const texts=textsOf(source);const targetLocale=otherLocale(sourceLocale);const key=await translationCacheKey(texts,sourceLocale);
  const sql=database();
  const cached=await sql`SELECT result FROM translation_suggestions WHERE cache_key=${key}`;
  if(cached[0])return {translation:translationFields.parse(cached[0].result),targetLocale,cached:true};
  if(!ai)throw new GameError('Automatische Übersetzung ist momentan nicht verfügbar. Du kannst die Übersetzung selbst ergänzen.',503);
  const characters=translationKeys.reduce((count,field)=>count+[...texts[field]].length,0);
  const day=`cloudflare:${new Date().toISOString().slice(0,10)}`;
  // An app-local daily throttle, independent of Cloudflare's account-wide Neuron allowance.
  const reserved=await sql`INSERT INTO translation_usage(month,characters) VALUES (${day},${characters}) ON CONFLICT(month) DO UPDATE SET characters=translation_usage.characters+EXCLUDED.characters WHERE translation_usage.characters+EXCLUDED.characters<=${translationDailyCharacterLimit} RETURNING characters`;
  if(!reserved.length)throw new GameError('Das tägliche Übersetzungslimit ist erreicht. Du kannst die Übersetzung selbst ergänzen oder morgen erneut versuchen.',429);
  let result:TranslationTexts;
  try{result=await requestCloudflareTranslation(texts,sourceLocale,ai);}catch(error){if(error instanceof GameError)throw error;throw new GameError('Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.',503);}
  await sql`INSERT INTO translation_suggestions(cache_key,result) VALUES (${key},${JSON.stringify(result)}::jsonb) ON CONFLICT(cache_key) DO NOTHING`;
  return {translation:result,targetLocale,cached:false};
}
