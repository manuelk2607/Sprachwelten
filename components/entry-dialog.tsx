'use client';
import {ChallengeDetails} from './challenge-details';
import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Lightbulb } from 'lucide-react';
import { useI18n, type Locale } from '@/lib/i18n';
import { kindLabels, languages, type Entry, type Explanation } from '@/lib/content';
import { localizeEntry } from '@/lib/entry-localization';
import { localizedTexts, textsOf, translationStatus, type TranslationTexts } from '@/lib/content-translations';
import { languageLabel } from '@/lib/language-label';
import { PronunciationAudio } from './pronunciation-audio';
import { Dialog } from './dialog';
import { TranslationEditor } from './translation-editor';
import { TranslationNotice } from './translation-notice';
export function EntryDialog({entry:original,close,login,signedIn}:{entry:Entry;close:()=>void;login:()=>void;signedIn:boolean}) {
  const {t,locale}=useI18n();const entry=localizeEntry(original,locale);
  const [explanations,setExplanations]=useState<Explanation[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [refresh,setRefresh]=useState(0);
  const [creditName,setCreditName]=useState('');
  const [sourceLocale,setSourceLocale]=useState<Locale>(locale);const [text,setText]=useState('');const [translation,setTranslation]=useState<Partial<TranslationTexts>>({});const [reviewed,setReviewed]=useState(false);const [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/entries/${entry.id}`,{signal:controller.signal}).then(async response=>{const result=await response.json() as {explanations:Explanation[];error:string};if(!response.ok)throw new Error(result.error);return result;}).then(result=>{setExplanations(result.explanations);setError('');}).catch(error=>{if(error.name!=='AbortError')setError(t(error.message));});return()=>controller.abort();},[entry.id,refresh]);
  async function add(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    try {const response=await fetch(`/api/entries/${entry.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text,creditName,sourceLocale,translation,translationReviewed:reviewed})});const result=await response.json() as {error:string};if(!response.ok)throw new Error(result.error);setText('');setCreditName('');setTranslation({});setReviewed(false);setRefresh(value=>value+1);}
    catch(error){setError(t((error as Error).message));}finally{setBusy(false);}
  }
  return <Dialog title={entry.phrase} close={close} wide>
    <div className="detail-meta"><span className="kind-pill">{t(kindLabels[entry.kind])}</span><span>{languageLabel(entry.language,locale,entry.languageNames)}{entry.region&&' · '+t(entry.region)}</span></div>
    <PronunciationAudio id={entry.audioId}/>{entry.status==='community'&&<TranslationNotice status={translationStatus(original,locale)} sourceLocale={original.sourceLocale??'de'}/>}
    {entry.literal&&<p className="literal">{t('Wörtlich: „')}{entry.literal}{locale==='en'?'”':'“'}</p>}
    {entry.meaning&&<div className="meaning-block"><Lightbulb size={24}/><div><span className="eyebrow">{t('DAS STECKT DAHINTER')}</span><p>{entry.meaning}</p></div></div>}
    <ChallengeDetails challenge={entry.challenge}/>
    {entry.example&&<blockquote>{entry.example}</blockquote>}{entry.culturalNote&&<p className="cultural-note"><BookOpen size={19}/>{entry.culturalNote}</p>}{entry.context&&<p>{t('Gesprächskontext:')} {entry.context}</p>}
    <div className="detail-source"><span>{t('Von')} {entry.status==='curated'?t('Redaktion'):entry.creditName||entry.authorName} · {t(entry.status==='curated'?'Startsammlung':'Community-Beitrag')}</span>{entry.sourceUrl&&<a href={entry.sourceUrl} target="_blank" rel="noreferrer">{t('Quelle ansehen')} <ExternalLink size={13}/></a>}</div>
    <section className="explanations"><h3>{t('Weitere Erklärungen & Perspektiven')}</h3>
      {explanations.length?explanations.map(explanation=><div className="explanation" key={explanation.id}><p>{localizedTexts(explanation,locale).body}</p><TranslationNotice status={translationStatus(explanation,locale)} sourceLocale={explanation.sourceLocale??'de'}/><span>{explanation.creditName||explanation.authorName}</span></div>):<p className="muted">{t('Kennst du eine andere Verwendung oder eine regionale Besonderheit?')}</p>}
      {signedIn?<form className="form-stack" onSubmit={add}>
        <label>{t('Deine Ergänzung')} · {t(sourceLocale==='de'?'Deutsch':'Englisch')}<textarea value={text} onChange={event=>{setText(event.target.value);setTranslation({});setReviewed(false);setRevision(value=>value+1);}} required minLength={10} maxLength={1500} rows={3}/></label>
        <TranslationEditor sourceLocale={sourceLocale} setSourceLocale={value=>{setSourceLocale(value);setRevision(version=>version+1);}} fields={[{key:'body',label:'Deine Ergänzung',max:1500}]} getSource={()=>textsOf({body:text})} translation={translation} onChange={setTranslation} revision={revision} reviewed={reviewed} setReviewed={setReviewed}/>
        <label>{t('Beitragende Person')} · {t('(optional)')}<input maxLength={80} value={creditName} onChange={event=>setCreditName(event.target.value)}/></label>
        <button className="button dark" disabled={busy}>{busy?t('Wird gespeichert …'):t('Erklärung hinzufügen')}</button>
      </form>:<button className="button outline" onClick={login}>{t('Anmelden und Erklärung ergänzen')}</button>}
      {error&&<p className="error" role="alert">{error}</p>}
    </section>
  </Dialog>;
}
