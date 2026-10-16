'use client';
import {Select} from './select';
import type { GameView } from '@/lib/game';
import type { RoomAction } from '@/lib/content';
import { useI18n } from '@/lib/i18n';
import { ArrowRight, CheckCircle2, Mic2 } from 'lucide-react';

export function PronunciationRound({room,busy,action}:{room:GameView;busy:boolean;action:(action:RoomAction)=>Promise<void>}) {
  const {t}=useI18n();
  const turn=room.pronunciation;
  if(!turn)return null;
  const speaking=room.phase==='speaking';
  const me=room.playerId===turn.speaker.id;
  const target={speakerId:turn.speaker.id,roundNumber:room.roundNumber};
  return <section className="pronunciation-turn" aria-live="polite">
    <div className="eyebrow"><Mic2 size={17}/>{t('VORTRAG')} {turn.speakerNumber} / {turn.totalSpeakers}</div>
    <h2>{me?t('Du bist dran.'):turn.speaker.name+' '+t('ist dran.')}</h2>
    <p className="muted">{t(room.prompt?.presentation==='audio'?'Hört euch die Aufnahme an und sprecht sie im selben Raum oder in eurem Sprachchat nach.':'Lest den Text im selben Raum oder in eurem Sprachchat vor. Sprecht so klar und flüssig, wie ihr könnt.')}</p>
    {speaking?(me?<button className="button primary full" disabled={busy} onClick={()=>action({action:'performed',...target})}>{t('Vortrag beendet – bewerten')}<ArrowRight size={17}/></button>:<p className="waiting">{t('Hört zu. Danach könnt ihr die Aussprache bewerten.')}</p>):me?<div className="waiting"><CheckCircle2 size={26}/><h3>{t('Die anderen bewerten deinen Vortrag.')}</h3><p>{turn.ratingCount} / {turn.requiredRatings} {t(turn.requiredRatings===1?'Bewertung abgegeben':'Bewertungen abgegeben')}</p></div>:turn.hasRated?<div className="waiting"><CheckCircle2 size={26}/><h3>{t('Danke für deine Bewertung.')}</h3><p>{turn.ratingCount} / {turn.requiredRatings} {t(turn.requiredRatings===1?'Bewertung abgegeben':'Bewertungen abgegeben')}</p></div>:<form key={`${room.roundNumber}:${turn.speaker.id}`} className="form-stack rating-form" onSubmit={event=>{
      event.preventDefault();const values=new FormData(event.currentTarget);
      void action({action:'rate',...target,clarity:Number(values.get('clarity')),accuracy:Number(values.get('accuracy')),rhythm:Number(values.get('rhythm'))});
    }}>
      <h3>{t('Wie hat sich der Vortrag angehört?')}</h3>
      <p className="form-note">{t('1 = noch schwierig · 5 = sehr sicher. Bewertet jeden Vortrag fair. Die App zeigt nur Durchschnittswerte.')}</p>
      {([['clarity','Verständlichkeit','Waren die Wörter gut zu verstehen?'],['accuracy','Genauigkeit','Wurde der Text vollständig und sorgfältig gesprochen?'],['rhythm','Rhythmus','War der Vortrag flüssig und gut betont?']] as const).map(([id,label,hint])=><label key={id}>{t(label)}<small>{t(hint)}</small><Select name={id} defaultValue="" required><option value="" disabled>{t('Bitte wählen')}</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value}</option>)}</Select></label>)}
      <button className="button primary full" disabled={busy}>{t('Bewertung abgeben')}<ArrowRight size={17}/></button>
    </form>}
  </section>;
}

export function PronunciationResults({room}:{room:GameView}) {
  const {t,locale}=useI18n();
  const format=(value:number)=>value.toLocaleString(locale,{maximumFractionDigits:1});
  return <div className="pronunciation-results">
    <h3>{t('Eure Bewertungen für diesen Text')}</h3>
    {room.pronunciation?.results.map(result=><article className="pronunciation-result" key={result.playerId}>
      <div><strong>{result.name}</strong><span>{result.ratingCount} {t(result.ratingCount===1?'Bewertung':'Bewertungen')}</span></div>
      <b>+{format(result.score)} {t('Punkte')}</b>
      <dl>{([['clarity','Verständlichkeit'],['accuracy','Genauigkeit'],['rhythm','Rhythmus']] as const).map(([key,label])=><div key={key}><dt>{t(label)}</dt><dd>{format(result[key])} / 5</dd></div>)}</dl>
    </article>)}
  </div>;
}
