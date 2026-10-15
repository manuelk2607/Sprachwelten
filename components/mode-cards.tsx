'use client';
import {useState} from 'react';
import { ArrowRight, Compass, Globe2, MessageCircle, Mic2, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { gameModes, type PlayableGameMode } from '@/lib/modes';
import { modeGuides } from '@/lib/mode-guides';
const icons=[MessageCircle,Globe2,Mic2,Compass,MessageCircle];
const buttons:Partial<Record<PlayableGameMode,string>>={'idiom-bluff':'Mit Freunden spielen','language-quiz':'Wörterquiz starten','tongue-twisters':'Vorlesen starten','dialect-detective':'Dialektquiz starten','everyday-language':'Alltagsquiz starten'};
export function ModeCards({play}:{play:(mode:PlayableGameMode)=>void}) {
  const {t}=useI18n();const [expanded,setExpanded]=useState(false);
  return <section id="spiele" className="mode-section" aria-labelledby="game-modes-heading">
    <div className="section-top"><div><div className="eyebrow">{t('SPIELERISCH DURCH DIE SPRACHWELTEN')}</div><h2 id="game-modes-heading">{t('Welches Spiel passt zu euch?')}</h2><p className="muted">{t('Hier findet ihr den Ablauf und die Regeln für jeden Modus. Wählt ein Spiel und legt direkt los.')}</p></div><span className="mode-section-note">{t('Ohne Konto spielen · Gemeinsam entdecken')}</span></div>
    <div className="mode-grid">{gameModes.slice(0,expanded?gameModes.length:6).map((mode,index)=>{
      const Icon=icons[index%icons.length];const guide=modeGuides[mode.id];
      return <article className={`mode-card mode-tone-${index%5}`} key={mode.id} aria-labelledby={`mode-${mode.id}`}>
        <div className="mode-top"><span className="mode-icon"><Icon size={24}/></span><span className="mode-number">{String(index+1).padStart(2,'0')}</span></div>
        <div className="eyebrow mode-category">{t(guide.category)}</div><h3 id={`mode-${mode.id}`}>{t(mode.title)}</h3><p className="mode-description">{t(mode.description)}</p>
        <p className="mode-details">{t(mode.details)}</p>
        <h4 className="mode-flow-title">{t('So läuft eine Runde ab')}</h4>
        <ol className="mode-steps">{guide.steps.map((step,stepIndex)=><li key={step.title}><span className="mode-step-number" aria-hidden="true">{stepIndex+1}</span><div><h4>{t(step.title)}</h4><p>{t(step.text)}</p></div></li>)}</ol>
        <div className="mode-scoring"><span><Trophy size={16}/>{t('So gibt’s Punkte')}</span><p>{t(guide.scoring)}</p></div>
        <p className="mode-tip">{t(guide.tip)}</p>
        <button className="button dark" onClick={()=>play(mode.id)}>{t(buttons[mode.id]??'Spiel starten')}<ArrowRight size={16}/></button>
      </article>;
    })}</div>{!expanded&&gameModes.length>6&&<button className="button outline show-more-modes" onClick={()=>setExpanded(true)}>{t('Mehr anzeigen')} · {gameModes.length-6}{' '}{t('weitere Spiele')}</button>}
  </section>;
}
