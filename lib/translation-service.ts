import { z } from 'zod';
import { database } from '@/db/repository';
import { GameError } from './game';
import { otherLocale, textsOf, translationFields, translationKeys, type TranslationTexts } from './content-translations';
import type { Locale } from './translations';

export const translationRequest=z.object({sourceLocale:z.enum(['de','en']),texts:translationFields}).refine(input=>translationKeys.some(key=>input.texts[key]),{message:'Bitte zuerst einen Text für die Übersetzung eingeben.'});
export function translationAvailable(){return !!process.env.DEEPL_API_KEY?.trim();}
export async function requestDeepL(texts:TranslationTexts,sourceLocale:Locale,apiKey:string,fetcher:typeof fetch=fetch):Promise<TranslationTexts> {
  const keys=translationKeys.filter(key=>texts[key]);
  const response=await fetcher('https://api-free.deepl.com/v2/translate',{
    method:'POST',headers:{Authorization:`DeepL-Auth-Key ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({text:keys.map(key=>texts[key]),source_lang:sourceLocale.toUpperCase(),target_lang:otherLocale(sourceLocale).toUpperCase(),preserve_formatting:true}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new GameError(response.status===456?'Das Übersetzungskontingent ist aufgebraucht. Du kannst die Übersetzung selbst ergänzen.':'Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.',503);
  const payload=z.object({translations:z.array(z.object({text:z.string().trim().min(1)}))}).parse(await response.json());
  if(payload.translations.length!==keys.length)throw new GameError('Die Übersetzung ist unvollständig. Bitte erneut versuchen.',503);
  const result=translationFields.safeParse(Object.fromEntries(keys.map((key,index)=>[key,payload.translations[index].text])));
  if(!result.success)throw new GameError('Die Übersetzung ist zu lang. Bitte die Texte kürzen oder manuell übersetzen.',422);
  return result.data;
}
export async function translationCacheKey(texts:TranslationTexts,sourceLocale:Locale) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({version:1,sourceLocale,texts})));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function suggestTranslation(source:TranslationTexts,sourceLocale:Locale) {
  const texts=textsOf(source);const targetLocale=otherLocale(sourceLocale);const key=await translationCacheKey(texts,sourceLocale);
  const sql=database();
  const cached=await sql`SELECT result FROM translation_suggestions WHERE cache_key=${key}`;
  if(cached[0])return {translation:translationFields.parse(cached[0].result),targetLocale,cached:true};
  const apiKey=process.env.DEEPL_API_KEY?.trim();
  if(!apiKey)throw new GameError('Die automatische Übersetzung ist noch nicht eingerichtet. Du kannst die Übersetzung selbst ergänzen.',503);
  const characters=translationKeys.reduce((count,field)=>count+[...texts[field]].length,0);
  const month=new Date().toISOString().slice(0,7);
  // Conservative local cap below the API Free allowance. Failed attempts retain their reservation.
  const reserved=await sql`INSERT INTO translation_usage(month,characters) VALUES (${month},${characters}) ON CONFLICT(month) DO UPDATE SET characters=translation_usage.characters+EXCLUDED.characters WHERE translation_usage.characters+EXCLUDED.characters<=450000 RETURNING characters`;
  if(!reserved.length)throw new GameError('Das Übersetzungskontingent ist aufgebraucht. Du kannst die Übersetzung selbst ergänzen.',429);
  let result:TranslationTexts;
  try{result=await requestDeepL(texts,sourceLocale,apiKey);}catch(error){if(error instanceof GameError)throw error;throw new GameError('Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.',503);}
  await sql`INSERT INTO translation_suggestions(cache_key,result) VALUES (${key},${JSON.stringify(result)}::jsonb) ON CONFLICT(cache_key) DO NOTHING`;
  return {translation:result,targetLocale,cached:false};
}
