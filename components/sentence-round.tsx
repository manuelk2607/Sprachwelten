'use client';
import {useEffect,useState} from 'react';
import type {GameView} from '@/lib/game';
import type {RoomAction} from '@/lib/content';
import {useI18n} from '@/lib/i18n';
import {sentenceWordLimit} from '@/lib/sentence-chain';
import {languageLabel} from '@/lib/language-label';

export function SentenceRound({room,busy,action}:{room:GameView;busy:boolean;action:(action:RoomAction)=>Promise<void>}){
  const {t,locale}=useI18n(),sentence=room.sentence;
  const [word,setWord]=useState(''),[remaining,setRemaining]=useState(45);
  useEffect(()=>{
    if(!sentence)return;
    const localStart=Date.now(),serverStart=sentence.serverNow;
    const timer=setInterval(()=>setRemaining(Math.max(0,Math.ceil(((sentence.voteEndsAt??sentence.deadline)-serverStart-(Date.now()-localStart))/1000))),250);
    return()=>clearInterval(timer);
  },[sentence?.deadline,sentence?.serverNow,sentence]);
  useEffect(()=>{
    if(!sentence||room.phase!=='linking'||busy||remaining>0)return;
    const timer=setTimeout(()=>void action({action:'sentence-timeout',turn:sentence.turn,matchId:room.matchId,roundNumber:room.roundNumber}),500);
    return()=>clearTimeout(timer);
  },[remaining,busy,room.phase,room.matchId,room.roundNumber,sentence,action]);
  if(!sentence)return null;
  const me=sentence.activePlayerId===room.playerId,playing=room.phase==='linking',checking=busy||!!sentence.proposal;
  const target={matchId:room.matchId,roundNumber:room.roundNumber,turn:sentence.turn};
  const active=room.players.find(player=>player.id===sentence.activePlayerId);
  return <section className="sentence-board" aria-label={t('Gemeinsamer Satz')}>
    <p className="mini-label">{languageLabel(sentence.language,locale)} · {sentence.words.length} / {sentenceWordLimit} {t('Wörter')}</p>
    <p className="shared-sentence" aria-live="polite" aria-atomic="true">{sentence.words.map((part,index)=><span key={index} className={index===sentence.words.length-1?'latest-word':''}>{index>0?' ':''}{part.text}</span>)}</p>
    <ol className="sentence-queue" aria-label={t('Spielerreihenfolge')}>{sentence.queue.map(id=><li key={id} aria-current={playing&&id===sentence.activePlayerId?'step':undefined}>{room.players.find(player=>player.id===id)?.name}</li>)}</ol>
    {sentence.feedback&&<p className={`sentence-feedback ${sentence.feedback.kind==='invalid'?'error':'notice'}`} role="status">{sentence.feedback.reason[locale]}</p>}
    {playing?<>
      <h2>{me?t('Du ergänzt das nächste Wort.'):active?.name+' '+t('ist dran.')}</h2>
      <p className="form-note">{t('Der letzte Buchstabe wird zum nächsten Anfang. Ob der Satz sinnvoll weitergeht, entscheidet ihr gemeinsam.')}</p>
      <p className="required-letter">{t('Nächster Anfangsbuchstabe')}: <strong>{sentence.requiredLetter.toLocaleUpperCase(locale)}</strong></p>
      <p role="timer" aria-label={t('Verbleibende Sekunden')}>{remaining} s · {sentence.failures} / 3 {t('Fehlversuche in Folge')}</p>
      {sentence.proposal&&<div className="sentence-proposal" aria-live="polite">
        <h3>{sentence.proposal.word?`${t('Vorschlag')}: ${sentence.proposal.word}`:t('Satz abschließen?')}</h3>
        <p>{t(sentence.proposal.finish?'Ist der Satz so vollständig und sinnvoll?':'Passt das Wort zum Satz, oder lässt sich der Satz sinnvoll fortsetzen?')}</p>
        {sentence.proposal.playerId===room.playerId?<p role="status">{t('Die anderen stimmen über deinen Vorschlag ab.')}</p>:sentence.proposal.hasVoted?<p role="status">{t('Deine Stimme ist abgegeben.')}</p>:<div className="button-row">
          <button className="button primary" disabled={busy} onClick={()=>void action({action:'sentence-vote',proposalId:sentence.proposal!.id,approve:true,...target})}>{t('Passt')}</button>
          <button className="button outline" disabled={busy} onClick={()=>void action({action:'sentence-vote',proposalId:sentence.proposal!.id,approve:false,...target})}>{t('Passt nicht')}</button>
        </div>}
        <p className="form-note">{sentence.proposal.voteCount} {t('Stimmen abgegeben')} · {sentence.proposal.requiredVotes} {t('Zustimmungen nötig')}</p>
      </div>}
      {me&&!sentence.proposal&&<form className="form-stack" onSubmit={event=>{event.preventDefault();void action({action:'sentence-word',word,...target});}}>
        <label>{t('Dein nächstes Wort')}<input value={word} onChange={event=>setWord(event.target.value)} maxLength={40} required autoComplete="off" disabled={checking} aria-describedby="sentence-input-help"/></label>
        <small id="sentence-input-help">{t('Ein Satzzeichen am Wortende schließt den Satz ab, wenn er vollständig ist.')}</small>
        <button className="button primary" disabled={checking||!word.trim()}>{t('Wort ergänzen')}</button>
        <div className="button-row">
          <button type="button" className="button outline" disabled={checking||sentence.words.length<3} onClick={()=>void action({action:'sentence-finish',...target})}>{t('Satz abschließen')}</button>
          <button type="button" className="text-button" disabled={checking} onClick={()=>void action({action:'sentence-pass',...target})}>{t('Weitergeben')}</button>
        </div>
      </form>}
    </>:<p className="notice">{t(sentence.endReason==='complete'?'Euer Satz ist vollständig.':sentence.endReason==='limit'?'Das Wortlimit ist erreicht.':'Drei Fehlversuche oder ausgelassene Züge in Folge beenden diesen Satz.')}</p>}
    <p className="form-note">{t('Jedes angenommene Wort bringt 1 Punkt. Die anderen entscheiden mit strikter Mehrheit; Gleichstand bedeutet abgelehnt. Ihr habt 45 Sekunden zum Eingeben und 30 Sekunden zum Abstimmen. Nach drei abgelehnten oder ausgelassenen Zügen in Folge oder 40 Wörtern endet die Runde.')}</p>
    {room.players.length===1&&<p className="form-note">{t('Allein beurteilst du Sinn und Satzende selbst. Der Anfangsbuchstabe wird immer geprüft.')}</p>}
  </section>;
}
