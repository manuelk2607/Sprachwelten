import type { Locale } from './translations';

export const regions = {
  'de-north': {de:'Norddeutschland',en:'Northern Germany'},
  'ch': {de:'Deutschschweiz',en:'German-speaking Switzerland'},
  'de-saxony': {de:'Sachsen',en:'Saxony'},
  'de-berlin': {de:'Berlin',en:'Berlin'},
  'de-swabia': {de:'Schwaben',en:'Swabia'},
  'at': {de:'Österreich',en:'Austria'},
  'de-rhineland': {de:'Rheinland',en:'Rhineland'},
  'de-bavaria': {de:'Bayern',en:'Bavaria'},
  'ca-quebec': {de:'Québec',en:'Quebec'},
  'se-stockholm': {de:'Stockholm',en:'Stockholm'},
} as const;
export const contexts = {
  'formal-request': {de:'Formelle Bitte',en:'Formal request'},
  'casual-greeting': {de:'Informelle Begrüßung',en:'Informal greeting'},
  'polite-refusal': {de:'Höfliche Absage',en:'Polite refusal'},
  'apology': {de:'Entschuldigung',en:'Apology'},
  'direct-request': {de:'Direkte Aufforderung',en:'Direct instruction'},
  'thanks': {de:'Dank',en:'Thanks'},
  'agreement': {de:'Zustimmung',en:'Agreement'},
  'formal-greeting': {de:'Förmliche Begrüßung',en:'Formal greeting'},
} as const;
export type RegionId = keyof typeof regions;
export type ContextId = keyof typeof contexts;
export const regionIds = Object.keys(regions) as RegionId[];
export const contextIds = Object.keys(contexts) as ContextId[];
export type CategoryKind = 'region'|'context';
export function categoryId(kind:CategoryKind,value:string):string|undefined {
  const normalized=value.trim().toLocaleLowerCase();
  const categories=kind==='region'?regions:contexts;
  return Object.entries(categories).find(([id,labels])=>[id,labels.de,labels.en].some(label=>label.toLocaleLowerCase()===normalized))?.[0];
}
export function categoryLabel(kind:CategoryKind,id:string,locale:Locale):string {
  const categories:Record<string,{de:string;en:string}>=kind==='region'?regions:contexts;
  return categories[id]?.[locale]??id;
}
