"use client";
import {useEffect} from 'react';
import type {GameView} from '@/lib/game';
import {useI18n} from '@/lib/i18n';
import {useKeyedState} from '@/lib/use-keyed-state';
import {learningKey,learningOptionText,readLearningCards,rememberLearningRound,type LearningCard} from '@/lib/learning-review';
import {PronunciationAudio} from './pronunciation-audio';
export function LearningReview({room}:{room:GameView}){
 const {t,locale}=useI18n(),key=learningKey(room);
 const [cards,setCards]=useKeyedState<LearningCard[]>(key,[]),[mistakes,setMistakes]=useKeyedState(key,false);
 useEffect(()=>{
  // Synchronize already revealed server responses with this tab's bounded review history.
  setCards(previous=>{let stored:LearningCard[]=[];try{stored=readLearningCards(sessionStorage.getItem(key));}catch{}
   const current=previous.length?previous:stored,next=rememberLearningRound(current,room);
   if(next!==current)try{sessionStorage.setItem(key,JSON.stringify({version:1,updatedAt:Date.now(),cards:next}));}catch{}
   return next.length===previous.length&&next.every((card,i)=>card===previous[i])?previous:next;
  });
 },[room,key,setCards]);
 if(room.phase!=='finished'||!cards.length)return null;
 const correct=cards.filter(card=>card.correct).length,shown=mistakes?cards.filter(card=>!card.correct):cards;
 return <section className="learning-review" aria-label={t('Dein Lernrückblick')}>
  <h2>{t('Dein Lernrückblick')}</h2>
  <p>{correct} / {cards.length} {t('richtig beantwortet')}</p>
  <p className="form-note">{t('Wiederhole die bereits aufgelösten Begriffe. Der Rückblick bleibt nach dem Neuladen in diesem Tab erhalten.')}</p>
  <label className="translation-review"><input type="checkbox" checked={mistakes} onChange={event=>setMistakes(event.target.checked)}/>{t('Nur falsche Antworten')}</label>
  {!shown.length&&<p>{t('Alles richtig beantwortet!')}</p>}
  {shown.map(card=><details key={card.round}><summary>{card.correct?'✓':'↻'} {card.phrase||t('Audiobeitrag')}</summary>
   <PronunciationAudio id={card.audioId}/>
   {!card.correct&&<p>{t('Deine Antwort')}: {learningOptionText(card.chosen,locale)}</p>}
   <p><strong>{t(card.kind==='order'?'Eine gültige Übersetzung':'Richtige Antwort')}: {learningOptionText(card.answer,locale)}</strong></p>
   {card.explanation&&card.explanation!==learningOptionText(card.answer,locale)&&<p>{card.explanation}</p>}
  </details>)}
 </section>;
}
