'use client';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';
import { Dialog } from './dialog';
import { languages, kindLabels, type ContentKind } from '@/lib/content';
export function ContributeDialog({close,saved}:{close:()=>void;saved:()=>void}) {
  const { t, locale } = useI18n();
  const [kind,setKind]=useState<ContentKind>('idiom');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError(''); const data=Object.fromEntries(new FormData(e.currentTarget));
    try {const res=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const json=await res.json() as { error: string };if(!res.ok)throw new Error(json.error);saved();close();}
    catch(err){setError(err instanceof Error?t(err.message):t("Dein Beitrag konnte nicht gespeichert werden."));}finally{setBusy(false);}
  }
  return <Dialog title={t("Ein Stück Sprache teilen.")} close={close} wide><p className="muted">{t("Eine Redewendung von deiner Oma? Ein Wort aus deiner Heimat? Gib ihm hier einen Platz.")}</p>
    <form className="form-stack" onSubmit={submit}><div className="form-row"><label>{t("Art des Beitrags")}<select name="kind" value={kind} onChange={e=>setKind(e.target.value as ContentKind)}>{Object.entries(kindLabels).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label><label>{t("Sprache")}<select name="language">{Object.entries(languages).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></label></div>
    <label>{kind==='word'?t('Wort oder kurzer Ausdruck'):kind==='tongue_twister'?t('Text des Zungenbrechers'):kind==='situation'?t("Situation oder Formulierung"):t("Originalausdruck")}<input name="phrase" required minLength={kind==='word'?1:3} maxLength={180} placeholder={kind==='word'?t('z. B. saudade'):kind==='tongue_twister'?t('z. B. Fischers Fritz fischt frische Fische.'):kind==='idiom'?t("z. B. Da liegt der Hund begraben."):kind==='dialect'?t("z. B. ein Ausdruck aus deinem Dialekt"):t("z. B. Wie bitte ich höflich um Hilfe?")}/></label>
    <div className="form-row"><label>{t("Wörtliche Übersetzung")} <span>{t("(optional)")}</span><input name="literal" maxLength={300} placeholder={t("Falls der Ausdruck nicht Deutsch ist")}/></label><label>{t("Region")} <span>{t("(optional)")}</span><input name="region" maxLength={100} placeholder={t("z. B. Bayern, Québec, Stockholm")}/></label></div>
    <label>{t(['word','tongue_twister'].includes(kind)?'Erklärung (optional)':'Bedeutung oder Erklärung')}<textarea name="meaning" required={!['word','tongue_twister'].includes(kind)} minLength={10} maxLength={1500} rows={3} placeholder={t("Was bedeutet der Ausdruck wirklich?")}/></label>
    <label>{t("Beispielsatz")} <span>{t("(optional)")}</span><input name="example" maxLength={600} placeholder={t("So wird der Ausdruck in einem Gespräch verwendet.")}/></label>
    {kind==='situation'&&<label>{t("Gesprächskontext")}<input name="context" maxLength={200} placeholder={t("z. B. unter Freunden, auf der Arbeit, bei Fremden")}/></label>}
    <label>{t("Kultureller Hinweis")} <span>{t("(optional)")}</span><textarea name="culturalNote" rows={2} maxLength={1000} placeholder={t("Wann passt das? Wann eher nicht?")}/></label>
    <label>{t("Quelle")} <span>{t("(optional)")}</span><input name="sourceUrl" type="url" maxLength={500} placeholder="https://…"/></label>
    <p className="form-note">{t("Dein Beitrag und dein Anzeigename werden öffentlich sichtbar. Er erscheint als Community-Beitrag in der Sammlung. Die Spielkarten werden separat ausgewählt.")}</p>
    {error&&<p className="error" role="alert">{t(error)}</p>}<button disabled={busy} className="button primary">{busy?t("Wird gespeichert …"):t("Beitrag veröffentlichen")}</button></form>
  </Dialog>;
}
