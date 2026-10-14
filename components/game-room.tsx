'use client';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, Home, Lightbulb, Trophy, Users } from 'lucide-react';
import type { GameView } from '@/lib/game';
import type { RoomAction } from '@/lib/content';
import { languages } from '@/lib/content';
import { Header } from './header';
import { AuthDialog } from './auth-dialog';
import { RoomForm } from './room-form';
import { isQuizMode, modeInfo } from '@/lib/modes';
import { categoryLabel } from '@/lib/quiz-categories';
import { TranslationNotice } from './translation-notice';
import { PronunciationRound, PronunciationResults } from './pronunciation-round';

export function GameRoom({code}:{code:string}) {
  const { t, locale } = useI18n();
  const [room,setRoom]=useState<GameView|null>(null);
  const [token,setToken]=useState<string|null>(null);
  const [joining,setJoining]=useState(false);
  const [auth,setAuth]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [answer,setAnswer]=useState('');
  const [copied,setCopied]=useState(false);
  const previousRound=useRef(0);
  const mutationVersion=useRef(0);
  useEffect(()=>{
    const stored=localStorage.getItem(`sprachwelten-room:${code}`);
    setToken(stored);setJoining(!stored);
  },[code]);
  useEffect(()=>{
    if(!token)return;
    let disposed=false;
    let timer:ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    async function poll() {
      if(disposed)return;
      if(document.hidden){timer=setTimeout(poll,5000);return;}
      try {
        const version=mutationVersion.current;
        const response=await fetch(`/api/rooms/${code}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});
        const json=await response.json() as {room:GameView;error:string};
        if(!response.ok){
          if(response.status===401||response.status===403){localStorage.removeItem(`sprachwelten-room:${code}`);setJoining(true);setToken(null);}
          throw new Error(json.error);
        }
        if(!disposed&&version===mutationVersion.current&&version%2===0){setRoom(json.room);setError('');if(json.room.phase==='finished')return;}
      } catch(error) {
        if(!disposed&&(error as Error).name!=='AbortError')setError(t((error as Error).message));
      }
      if(!disposed)timer=setTimeout(poll,3500);
    }
    void poll();
    return()=>{disposed=true;clearTimeout(timer);controller.abort();};
  },[code,token]);
  useEffect(()=>{
    if(room?.roundNumber!==previousRound.current){setAnswer('');previousRound.current=room?.roundNumber??0;window.scrollTo({top:0,behavior:'smooth'});}
  },[room?.roundNumber]);
  async function action(data:RoomAction) {
    if(!token)return;
    mutationVersion.current++;setBusy(true);setError('');
    try {
      const response=await fetch(`/api/rooms/${code}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(data)});
      const json=await response.json() as {room:GameView;error:string};
      if(!response.ok)throw new Error(json.error);
      setRoom(json.room);
    } catch(error){setError(t((error as Error).message));} finally{mutationVersion.current++;setBusy(false);}
  }
  const me=room?.players.find(p=>p.id===room.playerId);
  const host=!!room&&room.hostId===room.playerId;
  const quiz=isQuizMode(room?.mode);
  const pronunciation=room?.mode==='tongue-twisters';
  const info=modeInfo(room?.mode);
  const minimum=info.minPlayers;
  const optionText=(option:GameView['options'][number])=>option.language?t(languages[option.language]??option.language):option.categoryId&&option.categoryKind?categoryLabel(option.categoryKind,option.categoryId,locale):quiz?t(option.text):option.text;
  const ranking=room?[...room.players].sort((a,b)=>b.score-a.score):[];
  const winners=ranking.filter(p=>p.score===ranking[0]?.score);
  async function copyInvite() {
    try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),3000);}
    catch{setError(t('Kopieren ist hier nicht möglich. Teile den Link aus deiner Adressleiste.'));}
  }
  return <>
    <Header active="play" onLogin={()=>setAuth(true)}/>
    <main className="room-layout">
      <div className="room-top"><a className="text-link" href="/"><Home size={17}/>Sprachwelten</a><span className="room-code">{t('RAUM')} <strong>{code}</strong></span></div>
      {error&&<p role="alert" className="error">{error}</p>}
      {!room?<div className="empty-state"><Users size={38}/><h1>{t(joining?'Willkommen in der Runde.':'Dein Raum wird geladen …')}</h1></div>:<div className="room-grid">
        <section className="game-main">
          {room.phase==='lobby'?<div className="lobby-card">
            <div className="eyebrow">{t(info.title)}</div>
            <h1>{t(info.headline)}</h1>
            <p>{t(info.intro)}</p>
            <div className="invite-box"><strong>{code}</strong><button className="button dark" onClick={copyInvite}>{copied?<Check size={17}/>:<Copy size={17}/>} {t(copied?'Kopiert':'Einladungslink kopieren')}</button></div>
            <p className="muted">{t(info.details)}</p><p className="form-note">{t(info.rule)}</p>
            {host?<button className="button primary full" disabled={busy||room.players.length<minimum} onClick={()=>action({action:'start'})}>{t('Spiel starten')}<ArrowRight size={18}/></button>:<p className="waiting">{t('Die Gastgeberin oder der Gastgeber startet gleich.')}</p>}
            {room.players.length<minimum&&<small>{t('Noch')} {minimum-room.players.length} {t(minimum-room.players.length===1?'Person fehlt':'Personen fehlen')} {t('zum Start.')}</small>}
          </div>:room.phase==='finished'?<div className="finished-card">
            <Trophy size={48}/><div className="eyebrow">{t('FÜNF RUNDEN, VIELE NEUE WORTE')}</div>
            <h1>{room.players.length===1?t('Dein Sprachgefühl in Punkten'):winners.map(p=>p.name).join(' & ')+' '+t(winners.length>1?'gewinnen!':'gewinnt!')}</h1>
            {room.players.length===1&&<h2>{me?.score} / 10 {t('Punkte')}</h2>}
            <p>{t('Und ihr alle wisst jetzt ein bisschen mehr über die Welt.')}</p>
            <a className="button primary" href="/">{t('Neue Runde vorbereiten')}<ArrowRight size={18}/></a>
          </div>:<>
            <div className="round-header"><span className="eyebrow">{t(info.title)} · {t('RUNDE')} {room.roundNumber} {t('VON')} {room.totalRounds}</span><span className="phase-label">{t({writing:'✎ Erfinden',voting:'◉ Erraten',speaking:'◉ Vorlesen',rating:'✦ Bewerten',reveal:'✦ Entdecken'}[room.phase])}</span></div>
            <div className="prompt-card"><span className="mini-label">{t(info.promptLabel||languages[room.prompt?.language??'']||room.prompt?.language||'')}{room.mode==='everyday-language'&&room.prompt?.language?' · '+t(languages[room.prompt.language]??room.prompt.language):''}</span><h1>{room.prompt?.phrase}</h1>{room.prompt?.literal&&<p>{t('Wörtlich: „')}{room.prompt.literal}{locale==='en'?'”':'“'}</p>}</div>
            {room.phase==='writing'&&(me?.answered?<div className="waiting"><CheckCircle2 size={28}/><h3>{t('Dein Bluff ist im Spiel.')}</h3><p>{t('Warte, bis alle ihre Erklärung abgegeben haben.')}</p></div>:<form className="form-stack answer-form" onSubmit={e=>{e.preventDefault();void action({action:'answer',text:answer});}}>
              <h2>{t('Was könnte das bedeuten?')}</h2><p className="muted">{t('Erfinde eine Erklärung, die überzeugend klingt. Je mehr darauf hereinfallen, desto besser.')}</p>
              <label>{t('Deine erfundene Erklärung')}<textarea value={answer} onChange={e=>setAnswer(e.target.value)} required minLength={3} maxLength={300} rows={3} placeholder={t('Dieser Ausdruck bedeutet …')}/></label>
              <div className="answer-footer"><span>{answer.length}/300</span><button disabled={busy} className="button primary">{t('Bluff abgeben')}<ArrowRight size={17}/></button></div>
            </form>)}
            {(room.phase==='speaking'||room.phase==='rating')&&<PronunciationRound room={room} busy={busy} action={action}/>}
            {room.phase==='voting'&&<>
              <h2>{t(info.question)}</h2>
              <p className="muted">{t(me?.voted?'Deine Stimme zählt. Die Auflösung kommt, sobald alle abgestimmt haben.':info.hint)}</p>
              <div className="options">{room.options.map((option,i)=><button key={option.id} disabled={busy||me?.voted||option.isOwn} aria-pressed={room.selectedOptionId===option.id} className={`option ${option.isOwn?'own':''} ${room.selectedOptionId===option.id?'selected-answer':''}`} onClick={()=>action({action:'vote',optionId:option.id})}>
                <span className="option-letter">{String.fromCharCode(65+i)}</span><span>{optionText(option)}{option.isOwn&&<small>{t('Dein Bluff')}</small>}{room.selectedOptionId===option.id&&<small>{t('Deine Antwort')}</small>}</span>
              </button>)}</div>
            </>}
            {room.phase==='reveal'&&<>
              <div className="revelation"><Lightbulb size={26}/><div>
                <span className="eyebrow">{t(info.revealTitle)}</span>
                <h2>{room.mode==='language-quiz'?t(languages[room.revelation?.language??'']??room.revelation?.language??''):room.mode==='dialect-detective'?room.revelation?.regionId?categoryLabel('region',room.revelation.regionId,locale):t(room.revelation?.region??''):room.mode==='everyday-language'?room.revelation?.contextId?categoryLabel('context',room.revelation.contextId,locale):t(room.revelation?.context??''):pronunciation?t('Ein Text, eure Fortschritte.'):room.revelation?.meaning}</h2>
                {(quiz||pronunciation)&&room.revelation?.meaning&&<p>{room.revelation.meaning}</p>}
                {room.revelation?.example&&<blockquote>{room.revelation.example}</blockquote>}
                <p>{room.revelation?.culturalNote}</p>
                {room.revelation?.status==='community'&&<TranslationNotice status={room.revelation.translationStatus} sourceLocale={room.revelation.sourceLocale}/>}
                {(quiz||pronunciation)&&room.revelation?.status==='community'&&<p className="muted">{t('Community-Beitrag')} · {room.revelation.authorName}</p>}
                {room.revelation?.sourceUrl&&<a className="text-link" href={room.revelation.sourceUrl} target="_blank" rel="noreferrer">{t('Quelle ansehen')}<ArrowRight size={14}/></a>}
              </div></div>
              {pronunciation&&<PronunciationResults room={room}/>}
              <div className="options revealed">{room.options.map(option=><div key={option.id} className={`option ${option.correct?'correct':''} ${room.selectedOptionId===option.id?'selected-answer':''}`}>
                <span className="option-letter">{option.correct?<Check size={19}/>:<span>✦</span>}</span>
                <div><p>{optionText(option)}{room.selectedOptionId===option.id&&<small>{t('Deine Antwort')}</small>}</p><small>{quiz?t(option.correct?'Richtige Antwort':'Andere Antwort'):option.correct?t('Die echte Bedeutung'):option.authorName} · {option.voters?.length?`${t('Gewählt von')} ${option.voters.join(', ')}`:t('Keine Stimmen')}</small></div>
              </div>)}</div>
              {host?<button className="button primary full" disabled={busy} onClick={()=>action({action:'next'})}>{t(room.roundNumber===room.totalRounds?'Zum Ergebnis':'Nächste Runde')}<ArrowRight size={18}/></button>:<p className="waiting">{t('Der Gastgeber startet die nächste Runde.')}</p>}
            </>}
          </>}
        </section>
        <aside className="players-panel">
          <h2><Users size={20}/>{t(quiz&&room.players.length===1?'Dein Spiel':'Eure Runde')}<span>{room.players.length}/10</span></h2>
          {ranking.map(player=><div className="player-row" key={player.id}><span className="player-avatar">{player.name.slice(0,1).toUpperCase()}</span><div><strong>{player.name}{player.id===room.playerId&&<small> {t('(du)')}</small>}</strong><span>{pronunciation&&room.phase==='speaking'?t(player.id===room.pronunciation?.speaker.id?'Spricht gerade':'Hört zu'):pronunciation&&room.phase==='rating'?t(player.id===room.pronunciation?.speaker.id?'Wird bewertet':player.rated?'Hat bewertet':'Bewertet noch …'):room.phase==='voting'?t(player.voted?'Hat abgestimmt':'Rätselt noch …'):room.phase==='writing'?t(player.answered?'Bluff abgegeben':'Denkt sich etwas aus …'):t(player.id===room.hostId?'Gastgeber':'Mit dabei')}</span></div><b>{player.score.toLocaleString(locale,{maximumFractionDigits:1})}<small> P.</small></b></div>)}
          <div className="scoring"><h3>{t('So sammelt ihr Punkte')}</h3><p><strong>{pronunciation?'Ø 1–5':'+2'}</strong> {t(info.scoreLabel)}</p>{!quiz&&!pronunciation&&<p><strong>+1</strong> {t('Jemand glaubt deinen Bluff')}</p>}</div>
          <p className="room-note">{t('Du kannst die Seite neu laden und mit demselben Browser weiterspielen. Der Raum ist 24 Stunden erreichbar.')}</p>
        </aside>
      </div>}
    </main>
    {joining&&<RoomForm code={code} close={()=>window.location.assign('/')}/>}
    {auth&&<AuthDialog close={()=>setAuth(false)}/>}
  </>;
}
