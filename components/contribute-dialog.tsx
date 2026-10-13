'use client';
import { useState } from 'react';
import { Dialog } from './dialog';
import { languages, kindLabels, type ContentKind } from '@/lib/content';
export function ContributeDialog({close,saved}:{close:()=>void;saved:()=>void}) {
  const [kind,setKind]=useState<ContentKind>('idiom');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError(''); const data=Object.fromEntries(new FormData(e.currentTarget));
    try {const res=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const json=await res.json() as { error: string };if(!res.ok)throw new Error(json.error);saved();close();}
    catch(err){setError(err instanceof Error?err.message:'Dein Beitrag konnte nicht gespeichert werden.');}finally{setBusy(false);}
  }
  return <Dialog title="Ein Stück Sprache teilen." close={close} wide><p className="muted">Eine Redewendung von deiner Oma? Ein Wort aus deiner Heimat? Gib ihm hier einen Platz.</p>
    <form className="form-stack" onSubmit={submit}><div className="form-row"><label>Art des Beitrags<select name="kind" value={kind} onChange={e=>setKind(e.target.value as ContentKind)}>{Object.entries(kindLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Sprache<select name="language">{Object.entries(languages).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
    <label>{kind==='situation'?'Situation oder Formulierung':'Originalausdruck'}<input name="phrase" required minLength={3} maxLength={180} placeholder={kind==='idiom'?'z. B. Da liegt der Hund begraben.':kind==='dialect'?'z. B. ein Ausdruck aus deinem Dialekt':'z. B. Wie bitte ich höflich um Hilfe?'}/></label>
    <div className="form-row"><label>Wörtliche Übersetzung <span>(optional)</span><input name="literal" maxLength={300} placeholder="Falls der Ausdruck nicht Deutsch ist"/></label><label>Region <span>(optional)</span><input name="region" maxLength={100} placeholder="z. B. Bayern, Québec, Stockholm"/></label></div>
    <label>Bedeutung oder Erklärung<textarea name="meaning" required minLength={10} maxLength={1500} rows={3} placeholder="Was bedeutet der Ausdruck wirklich?"/></label>
    <label>Beispielsatz <span>(optional)</span><input name="example" maxLength={600} placeholder="So wird der Ausdruck in einem Gespräch verwendet."/></label>
    {kind==='situation'&&<label>Gesprächskontext<input name="context" maxLength={200} placeholder="z. B. unter Freunden, auf der Arbeit, bei Fremden"/></label>}
    <label>Kultureller Hinweis <span>(optional)</span><textarea name="culturalNote" rows={2} maxLength={1000} placeholder="Wann passt das? Wann eher nicht?"/></label>
    <label>Quelle <span>(optional)</span><input name="sourceUrl" type="url" maxLength={500} placeholder="https://…"/></label>
    <p className="form-note">Dein Beitrag und dein Anzeigename werden öffentlich sichtbar. Er erscheint als Community-Beitrag in der Sammlung. Die Spielkarten werden separat ausgewählt.</p>
    {error&&<p className="error" role="alert">{error}</p>}<button disabled={busy} className="button primary">{busy?'Wird gespeichert …':'Beitrag veröffentlichen'}</button></form>
  </Dialog>;
}
