'use client';
import {Select} from './select';
import {meaningCategories,type MeaningCategory} from '@/lib/meaning-categories';
import {TeamRound,TeamResults} from './team-round';
import {WordOrderRound} from './word-order-round';
import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, Home, Lightbulb, Trophy, Users } from 'lucide-react';
import type { GameView } from '@/lib/game';
import type { RoomAction } from '@/lib/content';
import { languageLabel } from '@/lib/language-label';
import { PronunciationAudio } from './pronunciation-audio';
import { Dialog } from './dialog';
import { Header } from './header';
import { AuthDialog } from './auth-dialog';
import { RoomForm } from './room-form';
import { isQuizMode, isTeamMode, modeInfo } from '@/lib/modes';
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
  const [copied,setCopied]=useState<'link'|'code'|null>(null);const [leaving,setLeaving]=useState(false);const [leaveDestination,setLeaveDestination]=useState('/');const [restartRounds,setRestartRounds]=useState<number|null>(null);const [pendingMessage,setPendingMessage]=useState('');const busyRef=useRef(false);const leaveConfirmed=useRef(false);
  const previousRound=useRef(0);
  const mutationVersion=useRef(0);
  const roomEtag=useRef<string|null>(null);
  useEffect(()=>{
    const stored=localStorage.getItem(`sprachwelten-room:${code}`);
    setToken(stored);setJoining(!stored);
  },[code]);
  useEffect(()=>{
    if(!token)return;
    let disposed=false,inFlight=false,failures=0,phase:GameView['phase']|undefined;
    roomEtag.current=null;
    let timer:ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    async function poll() {
      if(disposed||inFlight)return;
      if(document.hidden){timer=setTimeout(poll,5000);return;}
      inFlight=true;
      try {
        const version=mutationVersion.current;
        const response=await fetch(`/api/rooms/${code}`,{headers:{Authorization:`Bearer ${token}`,...(roomEtag.current?{'If-None-Match':roomEtag.current}:{})},signal:controller.signal});
        if(response.status!==304){
          const json=await response.json() as {room:GameView;error:string};
          if(!response.ok){
            if(response.status===401||response.status===403){localStorage.removeItem(`sprachwelten-room:${code}`);setJoining(true);setToken(null);}
            throw new Error(json.error);
          }
          if(!disposed&&version===mutationVersion.current&&version%2===0){setRoom(json.room);phase=json.room.phase;roomEtag.current=response.headers.get('ETag');setError('');}
        }else if(!disposed&&version===mutationVersion.current)setError('');
        failures=0;
      } catch(error) {
        failures++;
        if(!disposed&&(error as Error).name!=='AbortError')setError(t((error as Error).message));
      }finally{inFlight=false;}
      if(!disposed)timer=setTimeout(poll,document.hidden?5000:failures?Math.min(15000,1200*2**failures):phase==='finished'?4000:phase==='lobby'||phase==='reveal'?2000:1200);
    }
    const resume=()=>{if(!document.hidden){clearTimeout(timer);void poll();}};
    document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
    void poll();
    return()=>{disposed=true;clearTimeout(timer);controller.abort();document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);};
  },[code,token]);
  useEffect(()=>{
    if(!token)return;
    let disposed=false;
    const heartbeat=async()=>{
      if(busyRef.current)return;const version=mutationVersion.current;
      try{const response=await fetch(`/api/rooms/${code}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'heartbeat'})});const data=await response.json() as {room?:GameView};if(!disposed&&response.ok&&data.room&&version===mutationVersion.current){roomEtag.current=null;setRoom(data.room);}}catch{}
    };
    const timer=setInterval(()=>void heartbeat(),20000);return()=>{disposed=true;clearInterval(timer);};
  },[code,token]);
  useEffect(()=>{
    if(!token||!room)return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(!leaveConfirmed.current){event.preventDefault();event.returnValue='';}};
    const navigate=(event:MouseEvent)=>{const anchor=(event.target as Element).closest?.('a');if(!anchor||anchor.target||event.ctrlKey||event.metaKey)return;const destination=new URL(anchor.href,location.href);if(destination.origin===location.origin&&destination.pathname!==location.pathname){event.preventDefault();setLeaveDestination(destination.pathname+destination.search+destination.hash);setLeaving(true);}};
    const back=()=>{history.pushState({sprachweltenRoom:true},'',location.href);setLeaveDestination('/');setLeaving(true);};
    history.pushState({sprachweltenRoom:true},'',location.href);
    window.addEventListener('beforeunload',beforeUnload);document.addEventListener('click',navigate,true);window.addEventListener('popstate',back);
    return()=>{window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',navigate,true);window.removeEventListener('popstate',back);};
  },[code,!!token,!!room]);
  useEffect(()=>{
    if(room?.roundNumber!==previousRound.current||room?.roundNumber===1){setAnswer('');previousRound.current=room?.roundNumber??0;window.scrollTo({top:0,behavior:'smooth'});}
  },[room?.roundNumber,room?.matchId]);
  async function action(data:RoomAction) {
    if(!token||busyRef.current)return;
    busyRef.current=true;roomEtag.current=null;mutationVersion.current++;setBusy(true);setError('');
    const previous=room;
    setPendingMessage(({answer:'Dein Bluff wird gesendet …',performed:'Vortrag wird bestätigt …',rate:'Bewertung wird gesendet …',vote:'Deine Antwort wird gesendet …'} as Partial<Record<RoomAction['action'],string>>)[data.action]??'Einen Moment …');
    if(room&&(data.action==='answer'||data.action==='vote'||data.action==='rate'||data.action==='performed'))setRoom({...room,...(data.action==='vote'?{selectedOptionId:data.optionId}:{}),...(data.action==='performed'?{phase:'rating' as const}:{}),...(data.action==='rate'&&room.pronunciation?{pronunciation:{...room.pronunciation,hasRated:true}}:{}),players:room.players.map(player=>player.id===room.playerId?{...player,...(data.action==='answer'?{answered:true}:data.action==='vote'?{voted:true}:{})}:player)});

    try {
      const response=await fetch(`/api/rooms/${code}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(data)});
      const json=await response.json() as {room:GameView;error:string};
      if(!response.ok)throw new Error(json.error);
      if(data.action==='leave'){leaveConfirmed.current=true;localStorage.removeItem(`sprachwelten-room:${code}`);setToken(null);window.location.assign(leaveDestination);return;}
      roomEtag.current=null;setRoom(json.room);if(data.action==='restart')setRestartRounds(null);
    } catch(error){setRoom(previous);setError(t((error as Error).message));} finally{mutationVersion.current++;busyRef.current=false;setBusy(false);setPendingMessage('');}

  }
  const me=room?.players.find(p=>p.id===room.playerId);
  const host=!!room&&room.hostId===room.playerId;
  const quiz=isQuizMode(room?.mode)||isTeamMode(room?.mode)||room?.mode==='word-builder'||room?.mode==='word-chain';
  const pronunciation=room?.mode==='tongue-twisters';
  const info=modeInfo(room?.mode);
  const minimum=info.minPlayers;
  const optionText=(option:GameView['options'][number])=>option.language?languageLabel(option.language,locale,option.text):option.categoryId&&option.categoryKind&&!option.categoryId.startsWith('custom-')?categoryLabel(option.categoryKind,option.categoryId,locale):quiz?t(option.text):option.text;
  const ranking=room?[...room.players].sort((a,b)=>b.score-a.score):[];
  const winners=ranking.filter(p=>p.score===ranking[0]?.score);
  async function copyInvite(kind:'link'|'code') {
    const text=kind==='code'?code:`Sprachwelten\n${window.location.origin}/room/${code}\n${t('Raumcode')}: ${code}`;
    try{await navigator.clipboard.writeText(text);setCopied(kind);setTimeout(()=>setCopied(null),3000);}
    catch{setError(t('Kopieren ist hier nicht möglich. Teile den Link aus deiner Adressleiste.'));}
  }
  const requestLeave=()=>{if(!token){window.location.assign('/');return;}setLeaveDestination('/');setLeaving(true);};
  return <>
    <Header active="play" onLogin={()=>setAuth(true)}/>
    <main className="room-layout">
      <div className="room-top"><button className="text-link" onClick={requestLeave}><Home size={17}/>{t("Raum verlassen")}</button><span className="room-code">{t('RAUM')} <strong>{code}</strong></span></div>
      {error&&<p role="alert" className="error">{error}</p>}{room?.notice&&<p className="notice">{t(room.notice)}</p>}{busy&&<p className="action-status" role="status">{t(pendingMessage)}</p>}
      {!room?<div className="empty-state"><Users size={38}/><h1>{t(joining?'Willkommen in der Runde.':'Dein Raum wird geladen …')}</h1></div>:<div className="room-grid">
        <section className="game-main">
          {room.phase==='lobby'?<div className="lobby-card">
            <div className="eyebrow">{t(info.title)}</div>
            <h1>{t(info.headline)}</h1>
            <p>{t(info.intro)}</p>
            <div className="invite-box"><strong>{code}</strong><div className="invite-actions"><button className="button dark" onClick={()=>void copyInvite('link')}>{copied==='link'?<Check size={17}/>:<Copy size={17}/>} {t(copied==='link'?'Kopiert':'Einladung mit Link und Code kopieren')}</button><button className="button outline" onClick={()=>void copyInvite('code')}>{copied==='code'?<Check size={17}/>:<Copy size={17}/>} {t(copied==='code'?'Kopiert':'Nur Raumcode kopieren')}</button></div></div>
            <div className="round-settings"><label>{t('Rundenzahl')}<Select disabled={!host||busy} value={room.totalRounds} onValueChange={value=>void action({action:'configure',rounds:Number(value)})}>{Array.from({length:room.maxRounds},(_,index)=>index+1).map(value=><option key={value} value={value}>{value}</option>)}</Select></label><p className="form-note">{t('Maximal zwei Runden pro Person. Die Grenze wächst, wenn weitere Personen beitreten.')}</p></div>
            {room.mode==='tongue-twisters'&&<label>{t('Kategorie')}<Select disabled={!host||busy} value={room.pronunciationCategory} onValueChange={value=>void action({action:'configure',pronunciationCategory:value as 'both'|'twister'|'sound'})}><option value="both">{t('Beide Kategorien')}</option><option value="twister">{t('Zungenknoten')}</option><option value="sound">{t('Klangfallen')}</option></Select></label>}
            {room.mode==='who-said-it'&&<label>{t('Kategorie')}<Select disabled={!host||busy} value={room.attributionCategory} onValueChange={value=>void action({action:'configure',attributionCategory:value as 'both'|'person'|'song'})}><option value="both">{t('Beide Kategorien')}</option><option value="person">{t('Personenzitat')}</option><option value="song">{t('Liedstelle')}</option></Select></label>}
            <p className="muted">{t(info.details)}</p><p className="form-note">{t(info.rule)}</p>
            {room.mode==='meaning-quiz'&&<label>{t('Kategorie')}<Select disabled={!host||busy} value={room.meaningCategory} onValueChange={meaningCategory=>void action({action:'configure',meaningCategory:meaningCategory as MeaningCategory})}>{Object.entries(meaningCategories).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</Select></label>}
            {host?<button className="button primary full" disabled={busy||room.players.length<minimum} onClick={()=>action({action:'start'})}>{t('Spiel starten')}<ArrowRight size={18}/></button>:<p className="waiting">{t('Die Gastgeberin oder der Gastgeber startet gleich.')}</p>}
            {room.players.length<minimum&&<small>{t('Noch')} {minimum-room.players.length} {t(minimum-room.players.length===1?'Person fehlt':'Personen fehlen')} {t('zum Start.')}</small>}
          </div>:room.phase==='finished'?<div className="finished-card">
            <Trophy size={48}/><div className="eyebrow">{t('PARTIE GESCHAFFT')}</div>
            <h1>{room.players.length===1?t('Dein Sprachgefühl in Punkten'):winners.map(p=>p.name).join(' & ')+' '+t(winners.length>1?'gewinnen!':'gewinnt!')}</h1>
            {room.players.length===1&&<h2>{me?.score} / {room.totalRounds} {t('Punkte')}</h2>}
            <p>{t('Und ihr alle wisst jetzt ein bisschen mehr über die Welt.')}</p>
            {host?<><label className="rematch-rounds">{t('Runden in der nächsten Partie')}<Select value={restartRounds??Math.min(room.totalRounds,room.maxRounds)} onValueChange={value=>setRestartRounds(Number(value))}>{Array.from({length:room.maxRounds},(_,index)=>index+1).map(value=><option key={value} value={value}>{value}</option>)}</Select></label><button className="button primary" disabled={busy||room.players.length<minimum} onClick={()=>void action({action:'restart',rounds:restartRounds??Math.min(room.totalRounds,room.maxRounds)})}>{t('Noch eine Partie im selben Raum')}<ArrowRight size={18}/></button></>:<p className="muted">{t('Der Gastgeber kann die nächste Partie starten.')}</p>}<button className="button outline" onClick={requestLeave}>{t('Spiel verlassen')}</button>
          </div>:<>
            <div className="round-header"><span className="eyebrow">{t(info.title)} · {t('RUNDE')} {room.roundNumber} {t('VON')} {room.totalRounds}</span><span className="phase-label">{t({writing:'✎ Erfinden',voting:'◉ Erraten',speaking:'◉ Vorlesen',rating:'✦ Bewerten',briefing:'◉ Erklären',mission:'◉ Route planen',ordering:'◉ Satz bauen',linking:'◉ Wörter verbinden',reveal:'✦ Entdecken'}[room.phase])}</span></div>
            {!room.chain&&(!room.team||room.phase==='reveal')&&<div className="prompt-card"><span className="mini-label">{room.attributionType?t(room.attributionType==='person'?'Personenzitat':'Liedstelle'):room.mode==='tongue-twisters'?t(room.pronunciationType==='sound'?'Klangfallen':'Zungenknoten')+' · '+languageLabel(room.prompt?.language??'',locale,room.prompt?.languageNames):info.promptLabel?t(info.promptLabel):languageLabel(room.prompt?.language??'',locale,room.prompt?.languageNames)}{room.mode==='everyday-language'&&room.prompt?.language?' · '+languageLabel(room.prompt.language,locale,room.prompt.languageNames):''}</span><h1>{room.prompt?.phrase||t(room.prompt?.audioId?'Hör dir die Aufnahme an.':'Die geheime Aufgabe kennt die ansagende Person.')}</h1>{room.friends&&<>{room.friends.otherWord&&<h2>{room.friends.otherWord}</h2>}<p>{languageLabel(room.prompt?.language??'',locale)} ↔ {languageLabel(room.friends.otherLanguage,locale)}</p><p>{room.friends.context}</p></>}{room.prompt?.literal&&<p>{t('Wörtlich: „')}{room.prompt.literal}{locale==='en'?'”':'“'}</p>}</div>}
            {room.challengeFallback&&<p className="form-note">{t('Ein Teil dieser Aufgabe wird im Original angezeigt, weil die Übersetzung fehlt.')}</p>}
            {room.outsider&&<p className="word-rule"><strong>{t('Gemeinsame sprachliche Regel')}:</strong> {room.outsider.rule}</p>}
            {room.chain&&<section className="word-chain-board"><ol aria-label={t('Eure Wortkette')}>{room.chain.words.map((word,index)=><li key={index}>{index>0&&<span aria-hidden="true">→ </span>}{word.text}</li>)}</ol>{room.phase==='linking'&&<><h2>{room.chain.activePlayerId===room.playerId?t('Du bist dran.'):room.players.find(player=>player.id===room.chain?.activePlayerId)?.name+' · '+t('ist dran.')}</h2><p>{t('Das nächste Wort beginnt mit')}: <strong>{room.chain.requiredLetter.toUpperCase()}</strong></p>{room.chain.activePlayerId===room.playerId?<div className="options">{room.chain.choices.map(word=><button key={word.id} className="option" disabled={busy} onClick={()=>void action({action:'chain',wordId:word.id,turn:room.chain!.turn,matchId:room.matchId,roundNumber:room.roundNumber})}>{word.text}</button>)}</div>:<p className="waiting">{t('Warte, bis du an der Reihe bist.')}</p>}</>}{room.chain.results.length>0&&<p className="form-note">{room.chain.results.map((result,index)=>`${room.players.find(player=>player.id===result.playerId)?.name??t('Ausgeschiedene Person')}: ${t(result.correct?'Richtig angehängt':'Kein passender Anfang')}`).join(' · ')}</p>}</section>}
            {room.soundWords&&<div className="sound-words">{room.soundWords.map(w=><div key={w.word}><strong>{w.word}</strong><span>{w.pronunciation}</span><p>{w.meaning}</p></div>)}</div>}
            {room.team&&room.phase!=='reveal'&&<TeamRound key={room.matchId+':'+room.roundNumber+':'+room.team.callerId} room={room} busy={busy} action={action}/>}
            {room.phase==='ordering'&&room.wordOrder&&<WordOrderRound key={room.matchId+':'+room.roundNumber} room={room} busy={busy} action={action}/>}
            <PronunciationAudio roomCode={code} id={room.prompt?.audioId}/>{room.phase==='writing'&&(me?.answered?<div className="waiting"><CheckCircle2 size={28}/><h3>{t('Dein Bluff ist im Spiel.')}</h3><p>{t('Warte, bis alle ihre Erklärung abgegeben haben.')}</p></div>:<form className="form-stack answer-form" onSubmit={e=>{e.preventDefault();void action({action:'answer',text:answer});}}>
              <h2>{t('Was könnte das bedeuten?')}</h2><p className="muted">{t('Erfinde eine Erklärung, die überzeugend klingt. Je mehr darauf hereinfallen, desto besser.')}</p>
              <label>{t('Deine erfundene Erklärung')}<textarea value={answer} onChange={e=>setAnswer(e.target.value)} required minLength={3} maxLength={300} rows={3} placeholder={t('Dieser Ausdruck bedeutet …')}/></label>
              <div className="answer-footer"><span>{answer.length}/300</span><button disabled={busy} className="button primary">{t('Bluff abgeben')}<ArrowRight size={17}/></button></div>
            </form>)}
            {(room.phase==='speaking'||room.phase==='rating')&&<PronunciationRound room={room} busy={busy} action={action}/>}
            {room.phase==='voting'&&room.team?.callerId!==room.playerId&&<>
              <h2>{t(room.attributionType==='person'?'Wer hat das gesagt?':room.attributionType==='song'?'Aus welchem Lied stammt diese Stelle?':info.question)}</h2>
              <p className="muted">{t(me?.voted?'Deine Stimme zählt. Die Auflösung kommt, sobald alle abgestimmt haben.':info.hint)}</p>
              <div className="options">{room.options.map((option,i)=><button key={option.id} disabled={busy||me?.voted||option.isOwn} aria-pressed={room.selectedOptionId===option.id} className={`option ${option.isOwn?'own':''} ${room.selectedOptionId===option.id?'selected-answer':''}`} onClick={()=>action({action:'vote',optionId:option.id})}>
                <span className="option-letter">{String.fromCharCode(65+i)}</span><span>{optionText(option)}{option.isOwn&&<small>{t('Dein Bluff')}</small>}{room.selectedOptionId===option.id&&<small>{t('Deine Antwort')}</small>}</span>
              </button>)}</div>
            </>}
            {room.phase==='reveal'&&<>
              <div className="revelation"><Lightbulb size={26}/><div>
                <span className="eyebrow">{t(info.revealTitle)}</span>
                {room.wordOrder&&<><h2>{room.wordOrder.solution}</h2><p>{t(room.wordOrder.correct?'Dein Satz ist richtig.':'Diese Wortfolge ist nicht als Lösung hinterlegt.')}</p></>}{room.friends&&<div><p>{room.prompt?.phrase||t('Erstes Wort')}: {room.friends.firstMeaning}</p><p>{room.friends.otherWord}: {room.friends.secondMeaning}</p></div>}
                {!room.wordOrder&&!room.chain&&<h2>{room.mode==='who-said-it'||room.mode==='false-friends'?room.options.find(o=>o.correct)?.text:room.mode==='language-quiz'?languageLabel(room.revelation?.language??'',locale,room.revelation?.languageNames):room.mode==='dialect-detective'?room.revelation?.regionId?categoryLabel('region',room.revelation.regionId,locale):t(room.revelation?.region??''):room.mode==='everyday-language'?room.revelation?.contextId?categoryLabel('context',room.revelation.contextId,locale):t(room.revelation?.context??''):pronunciation?t('Ein Text, eure Fortschritte.'):room.revelation?.meaning}</h2>}
                {((quiz&&!room.team)||pronunciation)&&room.revelation?.meaning&&['language-quiz','dialect-detective','everyday-language','who-said-it','false-friends'].includes(room.mode)&&<p>{room.revelation.meaning}</p>}
                {room.revelation?.example&&<blockquote>{room.revelation.example}</blockquote>}
                <p>{room.revelation?.culturalNote}</p>
                {room.revelation?.status==='community'&&<TranslationNotice status={room.revelation.translationStatus} sourceLocale={room.revelation.sourceLocale}/>}
                {room.revelation?.status==='community'&&<p className="muted">{t('Community-Beitrag')}{room.revelation.authorName?' · '+room.revelation.authorName:''}</p>}
                {room.revelation?.sourceUrl&&<a className="text-link" href={room.revelation.sourceUrl} target="_blank" rel="noreferrer">{t('Quelle ansehen')}<ArrowRight size={14}/></a>}
              </div></div>
              {room.team&&<TeamResults room={room}/>}
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
          {ranking.map(player=><div className="player-row" key={player.id}><span className="player-avatar">{player.name.slice(0,1).toUpperCase()}</span><div><strong>{player.name}{player.id===room.playerId&&<small> {t('(du)')}</small>}</strong><span>{room.team&&player.id===room.team.callerId?t('Gibt die Ansage'):room.phase==='mission'||room.phase==='ordering'?t(player.answered?'Antwort abgegeben':'Antwort wird vorbereitet …'):pronunciation&&room.phase==='speaking'?t(player.id===room.pronunciation?.speaker.id?'Spricht gerade':'Hört zu'):pronunciation&&room.phase==='rating'?t(player.id===room.pronunciation?.speaker.id?'Wird bewertet':player.rated?'Hat bewertet':'Bewertet noch …'):room.phase==='voting'?t(player.voted?'Hat abgestimmt':'Rätselt noch …'):room.phase==='writing'?t(player.answered?'Bluff abgegeben':'Denkt sich etwas aus …'):t(player.id===room.hostId?'Gastgeber':'Mit dabei')}</span></div><b>{player.score.toLocaleString(locale,{maximumFractionDigits:1})}<small> P.</small></b></div>)}
          <div className="scoring"><h3>{t('So sammelt ihr Punkte')}</h3><p><strong>{pronunciation?'Ø 1–5':'+1'}</strong> {t(info.scoreLabel)}</p>{!quiz&&!pronunciation&&<p><strong>+1</strong> {t('Jemand glaubt deinen Bluff')}</p>}</div>
          <p className="room-note">{t('Du kannst die Seite neu laden und mit demselben Browser weiterspielen. Der Raum ist 24 Stunden erreichbar.')}</p>
        </aside>
      </div>}
    </main>
    {joining&&<RoomForm code={code} close={()=>window.location.assign('/')}/>}
    {auth&&<AuthDialog close={()=>setAuth(false)}/>}
    {leaving&&<Dialog title={t('Raum wirklich verlassen?')} close={()=>setLeaving(false)}><p className="muted">{t(host?'Wenn du gehst, übernimmt die zuerst beigetretene verbleibende Person den Raum.':'Du verlässt diese Spielrunde. Die anderen können weiterspielen.')}</p><div className="dialog-actions"><button className="button outline" disabled={busy} onClick={()=>setLeaving(false)}>{t('Im Raum bleiben')}</button><button className="button primary" disabled={busy} onClick={()=>void action({action:'leave'})}>{t('Raum verlassen')}</button></div></Dialog>}
  </>;
}
