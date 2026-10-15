'use client';
import {Select} from './select';
import { useEffect, useId, useState } from 'react';
import { languages } from '@/lib/content';
import { useI18n } from '@/lib/i18n';
import { languageLabel } from '@/lib/language-label';
type LanguageOption={code:string;label:string;englishName?:string};
export function LanguagePicker({label,value,onChange,name,allowAll=false,disabled=false}:{label:string;value:string;onChange:(code:string)=>void;name?:string;allowAll?:boolean;disabled?:boolean}){
  const {t,locale}=useI18n();const id=useId();const [other,setOther]=useState(false);const [query,setQuery]=useState('');const [results,setResults]=useState<LanguageOption[]>([]);const [selected,setSelected]=useState<LanguageOption|null>(null);const [loading,setLoading]=useState(false);
  const custom=!!value&&!languages[value];
  useEffect(()=>{
    if(!custom)return;const controller=new AbortController();fetch('/api/languages?'+new URLSearchParams({code:value,locale}),{signal:controller.signal}).then(r=>r.json() as Promise<{languages:LanguageOption[]}>).then(data=>setSelected(data.languages[0]??null)).catch(()=>{});return()=>controller.abort();
  },[custom,value,locale]);
  useEffect(()=>{
    setResults([]);if(!other||query.trim().length<2){setLoading(false);return;}
    const controller=new AbortController();setLoading(true);const timer=setTimeout(()=>fetch('/api/languages?'+new URLSearchParams({q:query.trim(),locale}),{signal:controller.signal}).then(r=>r.json() as Promise<{languages:LanguageOption[]}>).then(data=>{if(!controller.signal.aborted)setResults(data.languages);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLoading(false);}),250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,other,locale]);
  return <div className="language-picker"><label htmlFor={id}>{t(label)}</label>{name&&<input type="hidden" name={name} value={value}/>}
    <Select id={id} disabled={disabled} aria-label={t(label)} value={other?'__other__':value} onValueChange={value=>{if(value==='__other__'){setOther(true);setQuery('');onChange('');}else{setOther(false);onChange(value);}}}>
      {allowAll&&<option value="">{t('Alle Sprachen')}</option>}{!allowAll&&!value&&!other&&<option value="" disabled>{t('Bitte auswählen')}</option>}
      {Object.keys(languages).map(code=><option key={code} value={code}>{languageLabel(code,locale)}</option>)}
      {custom&&!other&&<option value={value}>{selected?.label??languageLabel(value,locale)}</option>}
      <option value="__other__">{t('Andere Sprache suchen …')}</option>
    </Select>
    {other&&<div className="language-search"><label htmlFor={id+'-search'}>{t('Sprache oder Sprachcode suchen')}</label><input id={id+'-search'} value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" placeholder={t('z. B. Bairisch, Koreanisch oder bar')}/><p className="form-note">{t('Wähle eine Sprache aus dem geprüften Register. Freie Fantasienamen werden nicht übernommen.')}</p>{loading?<p role="status">{t('Wird gesucht …')}</p>:results.length?<ul>{results.map(result=><li key={result.code}><button type="button" onClick={()=>{onChange(result.code);setSelected(result);setOther(false);}}>{result.label}<small>{result.englishName&&result.englishName!==result.label?result.englishName+' · ':''}{result.code}</small></button></li>)}</ul>:query.trim().length>=2?<p>{t('Keine passende registrierte Sprache gefunden.')}</p>:null}<button type="button" className="text-button" onClick={()=>{setOther(false);onChange(allowAll?'':'de');}}>{t('Suche schließen')}</button></div>}
  </div>;
}
