'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { gameModes, type PlayableGameMode } from '@/lib/modes';
import { Dialog } from './dialog';

export function RoomForm({close,code='',initialMode='idiom-bluff'}:{close:()=>void;code?:string;initialMode?:PlayableGameMode}) {
  const { t, locale } = useI18n();
  const [join,setJoin]=useState(!!code);
  const [mode,setMode]=useState<PlayableGameMode>(initialMode);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const quiz=mode==='language-quiz';
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    const data=new FormData(event.currentTarget);
    const room=String(data.get('code')??'').trim().toUpperCase();
    try {
      const response=await fetch(join?`/api/rooms/${room}/join`:'/api/rooms',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:data.get('name'),locale:data.get('locale')??locale,mode}),
      });
      const json=await response.json() as {token:string;room:{code:string};error:string};
      if(!response.ok)throw new Error(json.error);
      localStorage.setItem(`sprachwelten-room:${json.room.code}`,json.token);
      window.location.assign(`/room/${json.room.code}`);
    } catch(error) {
      setError(error instanceof Error?t(error.message):t('Der Raum ist gerade nicht erreichbar.'));setBusy(false);
    }
  }
  return <Dialog title={join?t('Deine Runde wartet.'):t(quiz?'Wortdetektiv':'Ein Abend. Viele Erklärungen.')} close={close}>
    <p className="muted">{t(join?'Einladungslink oder Raumcode genügen. Ein Konto brauchst du zum Spielen nicht.':quiz?'Ein Wort, vier Sprachen und fünf Runden. Spiele allein oder mit bis zu neun Freunden.':'3–10 Personen, fünf Runden und jede Menge Fantasie. Ein Konto brauchst du zum Spielen nicht.')}</p>
    <div className="segmented">
      <button className={!join?'selected':''} onClick={()=>{setJoin(false);setError('');}}>{t('Raum erstellen')}</button>
      <button className={join?'selected':''} onClick={()=>{setJoin(true);setError('');}}>{t('Raum beitreten')}</button>
    </div>
    <form className="form-stack" onSubmit={submit}>
      {!join&&<label>{t('Spielmodus')}<select value={mode} onChange={e=>setMode(e.target.value as PlayableGameMode)}>{gameModes.filter(m=>m.status==='playable').map(m=><option key={m.id} value={m.id}>{t(m.title)}</option>)}</select></label>}
      <label>{t('Dein Spielname')}<input name="name" required minLength={2} maxLength={24} autoComplete="nickname" placeholder={t('Dein Name in dieser Runde')}/></label>
      {!join&&<label>{t('Spielsprache')}<select name="locale" defaultValue={locale}><option value="de">{t('Deutsch')}</option><option value="en">{t('Englisch')}</option></select></label>}
      {!join&&quiz&&<p className="form-note">{t('Wählt die Sprache, zu der das Wort gehört. Jede richtige Antwort bringt 2 Punkte. Die Lösung erscheint, sobald alle gewählt haben.')}</p>}
      {join&&<label>{t('Raumcode')}<input name="code" className="code-input" required pattern="[A-Za-z0-9]{6}" minLength={6} maxLength={6} defaultValue={code} placeholder="ABC123" autoComplete="off"/></label>}
      {error&&<p className="error" role="alert">{error}</p>}
      <button disabled={busy} className="button primary full">{t(busy?'Einen Moment …':join?'Mitspielen':'Raum erstellen')}<ArrowRight size={18}/></button>
    </form>
  </Dialog>;
}
