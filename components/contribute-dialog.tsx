'use client';
import { useI18n, type Locale } from '@/lib/i18n';
import { useRef, useState } from 'react';
import { Dialog } from './dialog';
import { languages, kindLabels, type ContentKind } from '@/lib/content';
import { contexts, regions } from '@/lib/quiz-categories';
import { textsOf, type TranslationTexts } from '@/lib/content-translations';
import { TranslationEditor, type TranslationField } from './translation-editor';
export function ContributeDialog({close,saved}:{close:()=>void;saved:()=>void}) {
  const {t,locale}=useI18n();const formRef=useRef<HTMLFormElement>(null);
  const [kind,setKind]=useState<ContentKind>('idiom');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [sourceLocale,setSourceLocale]=useState<Locale>(locale);const [translation,setTranslation]=useState<Partial<TranslationTexts>>({});const [revision,setRevision]=useState(0);const [reviewed,setReviewed]=useState(false);
  const fields:TranslationField[]=[{key:'literal',label:'Wörtliche Übersetzung',max:300},{key:'meaning',label:'Bedeutung oder Erklärung',max:1500},{key:'example',label:'Beispielsatz',max:600},{key:'culturalNote',label:'Kultureller Hinweis',max:1000}];
  const sourceChanged=()=>{setRevision(value=>value+1);setTranslation({});setReviewed(false);};
  const getSource=()=>textsOf(Object.fromEntries(new FormData(formRef.current!).entries()));
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError('');const data={...Object.fromEntries(new FormData(e.currentTarget)),sourceLocale,translation,translationReviewed:reviewed};
    try {const response=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const json=await response.json() as {error:string};if(!response.ok)throw new Error(json.error);saved();close();}
    catch(error){setError(error instanceof Error?t(error.message):t('Dein Beitrag konnte nicht gespeichert werden.'));}finally{setBusy(false);}
  }
  return <Dialog title={t('Ein Stück Sprache teilen.')} close={close} wide><p className="muted">{t('Eine Redewendung von deiner Oma? Ein Wort aus deiner Heimat? Gib ihm hier einen Platz.')}</p>
    <form ref={formRef} className="form-stack" onSubmit={submit}>
      <div className="form-row"><label>{t('Art des Beitrags')}<select name="kind" value={kind} onChange={e=>{setKind(e.target.value as ContentKind);sourceChanged();}}>{Object.entries(kindLabels).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label><label>{t('Sprache des Originalausdrucks')}<select name="language">{Object.entries(languages).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label></div>
      <label>{t(kind==='word'?'Wort oder kurzer Ausdruck':kind==='tongue_twister'?'Text des Zungenbrechers':kind==='situation'?'Situation oder Formulierung':'Originalausdruck')}<input name="phrase" required minLength={kind==='word'?1:3} maxLength={180}/></label>
      {kind==='dialect'?<label>{t('Richtige Region')}<select name="regionId" required defaultValue=""><option value="" disabled>{t('Bitte auswählen')}</option>{Object.entries(regions).map(([id,labels])=><option key={id} value={id}>{labels[locale]}</option>)}</select></label>:<label>{t('Region')} <span>{t('(optional)')}</span><input name="region" maxLength={100} placeholder={t('z. B. Bayern, Québec, Stockholm')}/></label>}
      {kind==='situation'&&<label>{t('Richtiger Gesprächskontext')}<select name="contextId" required defaultValue=""><option value="" disabled>{t('Bitte auswählen')}</option>{Object.entries(contexts).map(([id,labels])=><option key={id} value={id}>{labels[locale]}</option>)}</select></label>}
      {['word','dialect','situation'].includes(kind)&&<p className="form-note">{t('Du wählst die richtige Antwort. Drei andere Möglichkeiten ergänzt die App automatisch und zeigt sie in der jeweiligen Oberflächensprache an.')}</p>}
      <fieldset className="source-fields" onChange={sourceChanged}>
        <legend>{t('Deine Erklärung')} · {t(sourceLocale==='de'?'Deutsch':'Englisch')}</legend>
        <label>{t('Wörtliche Übersetzung')} <span>{t('(optional)')}</span><input name="literal" maxLength={300}/></label>
        <label>{t(['word','tongue_twister'].includes(kind)?'Erklärung (optional)':'Bedeutung oder Erklärung')}<textarea name="meaning" required={!['word','tongue_twister'].includes(kind)} minLength={10} maxLength={1500} rows={3}/></label>
        <label>{t('Beispielsatz')} <span>{t('(optional)')}</span><input name="example" maxLength={600}/></label>
        <label>{t('Kultureller Hinweis')} <span>{t('(optional)')}</span><textarea name="culturalNote" maxLength={1000} rows={2}/></label>
      </fieldset>
      <TranslationEditor sourceLocale={sourceLocale} setSourceLocale={value=>{setSourceLocale(value);sourceChanged();}} fields={fields} getSource={getSource} translation={translation} onChange={setTranslation} revision={revision} reviewed={reviewed} setReviewed={setReviewed}/>
      <label>{t('Quelle')} <span>{t('(optional)')}</span><input name="sourceUrl" type="url" maxLength={500} placeholder="https://…"/></label>
      <p className="form-note">{t(kind==='idiom'?'Dein Beitrag und dein Anzeigename werden öffentlich sichtbar. Er erscheint als Community-Beitrag in der Sammlung. Die Spielkarten werden separat ausgewählt.':'Dein Beitrag und dein Anzeigename werden öffentlich sichtbar und können in den passenden Spielmodus gelangen. Bei Quizfragen wird die angegebene Sprache, Region oder Situation als Lösung verwendet.')}</p>
      {error&&<p className="error" role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy?t('Wird gespeichert …'):t('Beitrag veröffentlichen')}</button>
    </form>
  </Dialog>;
}
