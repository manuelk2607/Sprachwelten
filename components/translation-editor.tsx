'use client';
import { useEffect, useRef, useState } from 'react';
import { useI18n, type Locale } from '@/lib/i18n';
import { otherLocale, textsOf, type TranslationTexts } from '@/lib/content-translations';
export type TranslationField={key:keyof TranslationTexts;label:string;max:number};
export function TranslationEditor({sourceLocale,setSourceLocale,fields,getSource,translation,onChange,revision,reviewed,setReviewed}:{
  sourceLocale:Locale;setSourceLocale:(locale:Locale)=>void;fields:TranslationField[];getSource:()=>TranslationTexts;
  translation:Partial<TranslationTexts>;onChange:(value:Partial<TranslationTexts>)=>void;revision:number;reviewed:boolean;setReviewed:(value:boolean)=>void;
}) {
  const {t}=useI18n();const [available,setAvailable]=useState<boolean|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [machine,setMachine]=useState(false);
  const version=useRef(revision);version.current=revision;
  const target=otherLocale(sourceLocale);const hasTranslation=fields.some(field=>translation[field.key]?.trim());
  useEffect(()=>{const controller=new AbortController();fetch('/api/translations',{signal:controller.signal}).then(r=>r.json() as Promise<{available:boolean}>).then(data=>setAvailable(data.available===true)).catch(()=>setAvailable(false));return()=>controller.abort();},[]);
  async function suggest() {
    const current=version.current;setBusy(true);setError('');
    try {
      const response=await fetch('/api/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceLocale,texts:getSource()})});
      const result=await response.json() as {translation:TranslationTexts;error?:string};
      if(!response.ok)throw new Error(result.error);
      if(version.current!==current)throw new Error('Dein Ausgangstext hat sich geändert. Bitte die Übersetzung erneut erstellen.');
      onChange(result.translation);setReviewed(false);setMachine(true);
    }catch(error){setError(error instanceof Error?error.message:'Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.');}finally{setBusy(false);}
  }
  return <section className="translation-editor" aria-label={t('Übersetzung ergänzen')}>
    <label>{t('Sprache deiner Erklärung')}<select value={sourceLocale} onChange={e=>{setSourceLocale(e.target.value as Locale);onChange({});setReviewed(false);setMachine(false);setError('');}}><option value="de">{t('Deutsch')}</option><option value="en">{t('Englisch')}</option></select></label>
    <p className="form-note">{t('Originalausdrücke bleiben unverändert. Die Sprache hier gilt für deine Erklärungen, Beispiele und Hinweise.')}</p>
    <h3>{t('Übersetzung ins')} {t(target==='de'?'Deutsche':'Englische')}</h3>
    <p className="muted">{t('Du kannst die zweite Sprachfassung selbst schreiben oder einen Vorschlag bearbeiten. Fehlende Felder erscheinen später als gekennzeichneter Originaltext.')}</p>
    <button type="button" className="button outline" disabled={busy||available!==true} onClick={()=>void suggest()}>{busy?t('Wird übersetzt …'):t('Übersetzung vorschlagen')}</button>
    {available===true&&<p className="form-note">{t('Für Vorschläge werden deine Erklärungstexte an DeepL gesendet.')}</p>}
    {available===false&&<p className="form-note">{t('Automatische Übersetzung ist momentan nicht verfügbar. Du kannst die Übersetzung selbst ergänzen.')}</p>}
    {machine&&hasTranslation&&<p role="status" className="form-note">{t('Automatischer DeepL-Vorschlag: Bitte Bedeutung und kulturelle Feinheiten prüfen und bei Bedarf korrigieren.')}</p>}
    {fields.map(field=><label key={field.key}>{t(field.label)} · {t(target==='de'?'Deutsch':'Englisch')}<textarea value={translation[field.key]??''} maxLength={field.max} rows={field.key==='meaning'||field.key==='body'?3:2} onChange={e=>{onChange({...translation,[field.key]:e.target.value});setReviewed(false);}}/></label>)}
    {hasTranslation&&<label className="translation-review"><input type="checkbox" checked={reviewed} required onChange={e=>setReviewed(e.target.checked)}/><span>{t('Ich habe die zweite Sprachfassung geprüft.')}</span></label>}
    {error&&<p role="alert" className="error">{t(error)}</p>}
  </section>;
}
export {textsOf};
