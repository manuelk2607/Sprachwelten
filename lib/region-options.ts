import {regions as defaults} from './quiz-categories';
export type RegionOptions=Record<string,{de:string;en:string}>;
export function regionOptions(payload:unknown):RegionOptions {
  const values=(payload as {regions?:unknown}|null)?.regions;
  if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Die Regionen konnten nicht geladen werden.');
  const result:RegionOptions={...defaults};
  for(const [id,label] of Object.entries(values)){
    if(!label||typeof label!=='object'||!('de' in label)||!('en' in label)||typeof label.de!=='string'||typeof label.en!=='string'||!label.de.trim()||!label.en.trim())throw new Error('Die Regionen konnten nicht geladen werden.');
    result[id]={de:label.de,en:label.en};
  }
  return result;
}
