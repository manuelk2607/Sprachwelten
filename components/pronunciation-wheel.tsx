'use client';
import {useEffect,useRef} from 'react';
import type {GameView} from '@/lib/game';
import type {RoomAction} from '@/lib/content';
import {wheelRotation} from '@/lib/pronunciation-wheel';
import {useI18n} from '@/lib/i18n';

export function PronunciationWheel({room,busy,action}:{room:GameView;busy:boolean;action:(action:RoomAction)=>Promise<void>}){
  const {t}=useI18n(),disc=useRef<SVGSVGElement>(null),selection=room.pronunciation?.selection;
  const clock=useRef<{id:string;offset:number}>({id:'',offset:0});
  useEffect(()=>{
    if(!selection||!disc.current)return;
    clock.current={id:selection.id,offset:selection.serverNow-Date.now()};
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const animation=disc.current.animate([{transform:'rotate(0deg)'},{transform:`rotate(${wheelRotation(selection)}deg)`}],
      {duration:selection.endsAt-selection.startedAt,easing:'cubic-bezier(.12,.7,.15,1)',fill:'both'});
    animation.currentTime=Math.max(0,selection.serverNow-selection.startedAt);
    return()=>animation.cancel();
  // A poll must not restart the animation. New selections always have a new ID.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selection?.id]);
  useEffect(()=>{
    if(!selection||busy||room.phase!=='spinning')return;
    const remaining=selection.endsAt-Date.now()-(clock.current.id===selection.id?clock.current.offset:selection.serverNow-Date.now());
    const timer=setTimeout(()=>void action({action:'wheel-ready',selectionId:selection.id,matchId:room.matchId,roundNumber:room.roundNumber}),Math.max(250,remaining+150));
    return()=>clearTimeout(timer);
  },[selection,busy,room.phase,room.matchId,room.roundNumber,action]);
  if(!selection)return null;
  const count=selection.players.length,angle=360/count,selected=selection.players.find(player=>player.id===selection.selectedId);
  const point=(degrees:number,radius:number)=>[150+radius*Math.cos((degrees-90)*Math.PI/180),150+radius*Math.sin((degrees-90)*Math.PI/180)];
  return <section className="wheel-panel" aria-label={t('Glücksrad')}>
    <h2>{t('Wer ist diesmal dran?')}</h2>
    <p>{t('Das Glücksrad wählt eine Person. Danach bewerten die anderen den Vortrag.')}</p>
    <div className="wheel-wrap"><span className="wheel-pointer" aria-hidden="true">▼</span>
      <svg ref={disc} viewBox="0 0 300 300" className="speaker-wheel" role="img" aria-label={t('Alle Personen am Glücksrad')} style={{transform:`rotate(${wheelRotation(selection)}deg)`}}>
        {selection.players.map((player,index)=>{const start=point(index*angle,145),end=point((index+1)*angle,145),label=point((index+.5)*angle,90);return <g key={player.id}>
          {count===1?<circle cx="150" cy="150" r="145" fill="var(--coral)"/>:<path d={`M150,150 L${start.join(',')} A145,145 0 ${angle>180?1:0},1 ${end.join(',')} Z`} fill={`hsl(${index*360/count} 45% 75%)`} stroke="var(--white)" strokeWidth="2"/>}
          <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" fill="#17211b" fontSize="13" fontWeight="700" transform={`rotate(${(index+.5)*angle},${label.join(',')})`}>{player.name.length>14?player.name.slice(0,13)+'…':player.name}</text>
        </g>;})}
      </svg>
    </div>
    <p role="status">{t('Das Rad dreht sich …')}</p>
    <ul className="wheel-players">{selection.players.map(player=><li key={player.id}>{player.name}</li>)}</ul>
    <p className="form-note">{t('Alle berechtigten Personen haben dieselbe Chance. Die letzte Person setzt nach Möglichkeit einmal aus.')}</p>
    <p className="wheel-reduced-result">{t('Ausgewählt')}: {selected?.name}</p>
  </section>;
}
