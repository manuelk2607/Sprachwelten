'use client';
import {ChallengeEditor,initialChallenge} from './challenge-editor';
import type {Challenge} from '@/lib/challenges';
import {Select} from './select';
import { useI18n, type Locale } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from './dialog';
import { languages, kindLabels, type ContentKind } from '@/lib/content';
import { contexts, regions } from '@/lib/quiz-categories';
import { textsOf, type TranslationTexts } from '@/lib/content-translations';
import { TranslationEditor, type TranslationField } from './translation-editor';
import { AudioInput } from './audio-input';
import { LanguagePicker } from './language-picker';
import { duplicateEntryMessage, type ExistingEntry } from '@/lib/entry-duplicates';
export function ContributeDialog({close,saved,openExisting}:{close:()=>void;saved:()=>void;openExisting:(id:string)=>Promise<void>}) {
  const {t,locale}=useI18n();const formRef=useRef<HTMLFormElement>(null);
  const [challenge,setChallenge]=useState<Challenge|undefined>();
  const [kind,setKind]=useState<ContentKind>('idiom');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [phrase,setPhrase]=useState('');const [language,setLanguage]=useState('de');const [regionId,setRegionId]=useState('');const [contextId,setContextId]=useState('');
  const [duplicate,setDuplicate]=useState<ExistingEntry|null>(null);const [opening,setOpening]=useState(false);const [audio,setAudio]=useState<{id:string;durationMs:number}|null>(null);const [audioBusy,setAudioBusy]=useState(false);
  useEffect(()=>{
    setDuplicate(null);
    if(!phrase.trim()||(kind==='dialect'&&!regionId)||(kind==='situation'&&!contextId))return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      const query=new URLSearchParams({kind,phrase:phrase.trim(),language,...(kind==='dialect'?{regionId}:{}),...(kind==='situation'?{contextId}:{}),...(challenge?.type==='attribution'?{attributionCategory:challenge.category}:{}),...(challenge?.type==='friends'?{otherLanguage:challenge.otherLanguage,otherWord:challenge.otherWord}:{}),...(challenge?.type==='order'?{targetLanguage:challenge.targetLanguage}:{})});
      fetch('/api/entries/duplicates?'+query,{signal:controller.signal}).then(async response=>{
        if(!response.ok)return;
        const data=await response.json() as {duplicate:ExistingEntry|null};if(!controller.signal.aborted)setDuplicate(data.duplicate);
      }).catch(()=>{/* The database still enforces uniqueness if the preview is unavailable. */});
    },350);
    return()=>{clearTimeout(timer);controller.abort();};
  },[kind,phrase,language,regionId,contextId,challenge]);
  const showExisting=async()=>{
    if(!duplicate)return;setOpening(true);setError('');
    try{await openExisting(duplicate.id);}catch{setError(t('Der vorhandene Beitrag konnte gerade nicht geladen werden. Bitte versuche es erneut.'));}finally{setOpening(false);}
  };
  const [sourceLocale,setSourceLocale]=useState<Locale>(locale);const [translation,setTranslation]=useState<Partial<TranslationTexts>>({});const [revision,setRevision]=useState(0);const [reviewed,setReviewed]=useState(false);
  const fields:TranslationField[]=[{key:'literal',label:'Wörtliche Übersetzung',max:300},{key:'meaning',label:'Bedeutung oder Erklärung',max:1500},{key:'example',label:'Beispielsatz',max:600},{key:'culturalNote',label:'Kultureller Hinweis',max:1000}];
  const sourceChanged=()=>{setRevision(value=>value+1);setTranslation({});setReviewed(false);};
  const getSource=()=>textsOf(Object.fromEntries(new FormData(formRef.current!).entries()));
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError('');const data={...Object.fromEntries(new FormData(e.currentTarget)),sourceLocale,translation,translationReviewed:reviewed,audioId:audio?.id,challenge};
    try {const response=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const json=await response.json() as {error:string;duplicate?:ExistingEntry};if(!response.ok){if(json.duplicate)setDuplicate(json.duplicate);throw new Error(json.error);}saved();close();}
    catch(error){setError(error instanceof Error?t(error.message):t('Dein Beitrag konnte nicht gespeichert werden.'));}finally{setBusy(false);}
  }
  return <Dialog title={t('Ein Stück Sprache teilen.')} close={close} wide><p className="muted">{t('Eine Redewendung von deiner Oma? Ein Wort aus deiner Heimat? Gib ihm hier einen Platz.')}</p>
    <form ref={formRef} className="form-stack" onSubmit={submit}>
      <div className="form-row"><label>{t('Art des Beitrags')}<Select name="kind" disabled={busy} value={kind} onValueChange={value=>{setKind(value as ContentKind);setChallenge(initialChallenge(value as ContentKind));sourceChanged();}}>{Object.entries(kindLabels).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</Select></label><LanguagePicker label="Sprache des Originalausdrucks" name="language" value={language} onChange={setLanguage} disabled={busy}/></div>
      <label>{t(kind==='word'||kind==='false_friend'?'Wort oder kurzer Ausdruck':kind==='tongue_twister'||kind==='sound_pair'?'Satz zum Nachsprechen':kind==='situation'?'Situation oder Formulierung':'Originalausdruck')}<input name="phrase" disabled={busy} value={phrase} onChange={e=>setPhrase(e.target.value)} required minLength={kind==='word'||kind==='false_friend'?1:3} maxLength={180}/></label>
      {kind==='dialect'?<label>{t('Richtige Region')}<Select name="regionId" disabled={busy} required value={regionId} onValueChange={value=>setRegionId(value)}><option value="" disabled>{t('Bitte auswählen')}</option>{Object.entries(regions).map(([id,labels])=><option key={id} value={id}>{labels[locale]}</option>)}</Select></label>:<label>{t('Region')} <span>{t('(optional)')}</span><input name="region" maxLength={100} placeholder={t('z. B. Bayern, Québec, Stockholm')}/></label>}
      {kind==='situation'&&<label>{t('Richtiger Gesprächskontext')}<Select name="contextId" disabled={busy} required value={contextId} onValueChange={value=>setContextId(value)}><option value="" disabled>{t('Bitte auswählen')}</option>{Object.entries(contexts).map(([id,labels])=><option key={id} value={id}>{labels[locale]}</option>)}</Select></label>}
      {challenge&&<ChallengeEditor value={challenge} onChange={setChallenge}/>}
      {duplicate&&<div className="duplicate-notice" role="status"><p>{t(duplicateEntryMessage)}</p><button type="button" className="button outline" disabled={opening} onClick={()=>void showExisting()}>{opening?t('Wird geladen …'):t('Vorhandenen Beitrag öffnen')}</button></div>}
      {['word','dialect','situation'].includes(kind)&&<p className="form-note">{t('Du wählst die richtige Antwort. Drei andere Möglichkeiten ergänzt die App automatisch und zeigt sie in der jeweiligen Oberflächensprache an.')}</p>}
      <fieldset className="source-fields" onChange={sourceChanged}>
        <legend>{t('Deine Erklärung')} · {t(sourceLocale==='de'?'Deutsch':'Englisch')}</legend>
        <label>{t('Wörtliche Übersetzung')} <span>{t('(optional)')}</span><input name="literal" maxLength={300}/></label>
        <label>{t(['word','tongue_twister','sound_pair','attribution','false_friend','word_order'].includes(kind)?'Erklärung (optional)':'Bedeutung oder Erklärung')}<textarea name="meaning" required={!['word','tongue_twister','sound_pair','attribution','false_friend','word_order'].includes(kind)} minLength={10} maxLength={1500} rows={3}/></label>
        <label>{t('Beispielsatz')} <span>{t('(optional)')}</span><input name="example" maxLength={600}/></label>
        <label>{t('Kultureller Hinweis')} <span>{t('(optional)')}</span><textarea name="culturalNote" maxLength={1000} rows={2}/></label>
      </fieldset>
      <TranslationEditor sourceLocale={sourceLocale} setSourceLocale={value=>{setSourceLocale(value);sourceChanged();}} fields={fields} getSource={getSource} translation={translation} onChange={setTranslation} revision={revision} reviewed={reviewed} setReviewed={setReviewed}/>
      <AudioInput onChange={setAudio} onBusy={setAudioBusy} disabled={busy}/>
      <label>{t('Beitragende Person')} <span>{t('(optional)')}</span><input name="creditName" maxLength={80} placeholder={t('z. B. deine Oma oder dein Anzeigename')}/></label><p className="form-note">{t('Nenne die Person, von der der Ausdruck stammt. Ohne Angabe erscheint dein Anzeigename.')}</p>
      <label>{t('Quelle')} <span>{t('(optional)')}</span><input name="sourceUrl" type="url" maxLength={500} placeholder="https://…"/></label>
      <p className="form-note">{t('Dein Beitrag und dein Anzeigename werden öffentlich sichtbar und können in den passenden Spielmodus gelangen. Bei Quizfragen wird die angegebene Sprache, Region oder Situation als Lösung verwendet.')}</p>
      {error&&<p className="error" role="alert">{error}</p>}<button disabled={busy||opening||audioBusy||!!duplicate||!language} className="button primary">{busy?t('Wird gespeichert …'):t('Beitrag veröffentlichen')}</button>
    </form>
  </Dialog>;
}
