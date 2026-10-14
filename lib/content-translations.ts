import { z } from 'zod';
import type { Locale } from './translations';

export const translationFields=z.object({
  literal:z.string().trim().max(300).default(''),
  meaning:z.string().trim().max(1500).default(''),
  example:z.string().trim().max(600).default(''),
  culturalNote:z.string().trim().max(1000).default(''),
  body:z.string().trim().max(1500).default(''),
});
export type TranslationTexts=z.infer<typeof translationFields>;
export type SavedTranslation=Partial<TranslationTexts>&{origin:'contributor';};
export type ContentTranslations=Partial<Record<Locale,SavedTranslation>>;
export const translationKeys=['literal','meaning','example','culturalNote','body'] as const;
export const otherLocale=(locale:Locale):Locale=>locale==='de'?'en':'de';
export function textsOf(input:Partial<TranslationTexts>):TranslationTexts {
  return translationFields.parse(Object.fromEntries(translationKeys.map(key=>[key,input[key]??''])));
}
export function storedTranslation(source:Partial<TranslationTexts>,translation?:Partial<TranslationTexts>):SavedTranslation|undefined {
  if(!translation)return;
  const fields=Object.fromEntries(translationKeys.filter(key=>source[key]?.trim()&&translation[key]?.trim()).map(key=>[key,translation[key]!.trim()]));
  return Object.keys(fields).length?{...fields,origin:'contributor'}:undefined;
}
export function localizedTexts<T extends Partial<TranslationTexts>&{sourceLocale?:Locale;translations?:ContentTranslations}>(input:T,locale:Locale):T {
  if((input.sourceLocale??'de')===locale)return input;
  const translation=input.translations?.[locale];
  if(!translation)return input;
  return {...input,...Object.fromEntries(translationKeys.filter(key=>input[key]?.trim()&&translation[key]?.trim()).map(key=>[key,translation[key]]))};
}
export function translationStatus(input:Partial<TranslationTexts>&{sourceLocale?:Locale;translations?:ContentTranslations},locale:Locale):'original'|'translated'|'partial'|'missing' {
  if((input.sourceLocale??'de')===locale)return 'original';
  const keys=translationKeys.filter(key=>input[key]?.trim());
  if(!keys.length)return 'original';
  const count=keys.filter(key=>input.translations?.[locale]?.[key]?.trim()).length;
  return count===keys.length?'translated':count?'partial':'missing';
}
