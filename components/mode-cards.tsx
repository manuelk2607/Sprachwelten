'use client';
import {useState} from 'react';
import { Compass, Globe2, MessageCircle, Mic2, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {gameFamilies} from '@/lib/game-families';
import { gameModes } from '@/lib/modes';
import { modeGuides } from '@/lib/mode-guides';
const icons=[MessageCircle,Globe2,Mic2,Compass,MessageCircle];
export function ModeCards() {
  const {t}=useI18n();const [expanded,setExpanded]=useState(false);
  const initialCount=Math.ceil(gameFamilies.length/2);
  return <section id="spiele" className="mode-section" aria-labelledby="game-modes-heading">
    <div className="section-top"><div><div className="eyebrow">{t('SPIELERISCH DURCH DIE SPRACHWELTEN')}</div><h2 id="game-modes-heading">{t('Welches Spiel passt zu euch?')}</h2><p className="muted">{t('Hier findet ihr den Ablauf und die Regeln. Startet eure Runde oben im Spielmenü.')}</p></div><span className="mode-section-note">{t('Ohne Konto spielen · Gemeinsam entdecken')}</span></div>
    <div className="mode-grid">{gameFamilies.slice(0,expanded?gameFamilies.length:initialCount).map((family,index)=>{
      const mode=gameModes.find(m=>m.id===family.id)!;
      const Icon=icons[index%icons.length];const guide=family.id==='plain-talk'?{category:'GEMEINSAM VERSTEHEN',steps:[{title:'Kategorie wählen',text:'Wählt Gaming, Jugendwörter oder Hochschulsprache im Spielmenü.'},{title:'Mit eigenen Worten erklären',text:'Eine Person kennt die Aufgabe und erklärt sie unter den Regeln der Kategorie.'},{title:'Als Team entscheiden',text:'Die anderen wählen eine passende Handlung oder Reaktion. Alle zusammen sammeln Punkte.'}],scoring:'1 Punkt für alle, wenn das gesamte Team richtig antwortet.',tip:'Die erklärende Person wechselt jede Runde.'}:family.id==='language-quiz'?{category:'SPRACHE, HERKUNFT & ALLTAG',steps:[{title:'Kategorie wählen',text:'Sucht eine Sprache, eine Region oder einen Gesprächskontext.'},{title:'Eine von vier Antworten',text:'Alle wählen unabhängig die passende Antwort zur Text- oder Audiovorgabe.'},{title:'Gemeinsam auflösen',text:'Nach allen Antworten erscheinen Lösung und Erklärung.'}],scoring:'1 Punkt pro richtiger Antwort.',tip:'Allein oder mit Freunden spielbar.'}:modeGuides[mode.id];
      return <article className={`mode-card mode-tone-${index%5}`} key={mode.id} aria-labelledby={`mode-${mode.id}`}>
        <div className="mode-top"><span className="mode-icon"><Icon size={24}/></span><span className="mode-number">{String(index+1).padStart(2,'0')}</span></div>
        <div className="eyebrow mode-category">{t(guide.category)}</div><h3 id={`mode-${mode.id}`}>{t(family.title)}</h3><p className="mode-description">{t(family.description??mode.description)}</p>{family.modes.length>1&&<p className="mode-details">{t('Kategorien')}: {family.modes.map(id=>t(gameModes.find(m=>m.id===id)!.title)).join(' · ')}</p>}
        <p className="mode-details">{t(family.id==='plain-talk'?'2–10 Personen · Drei Kategorien · Gemeinsam spielen':mode.details)}</p>
        <h4 className="mode-flow-title">{t('So läuft eine Runde ab')}</h4>
        <ol className="mode-steps">{guide.steps.map((step,stepIndex)=><li key={step.title}><span className="mode-step-number" aria-hidden="true">{stepIndex+1}</span><div><h4>{t(step.title)}</h4><p>{t(step.text)}</p></div></li>)}</ol>
        <div className="mode-scoring"><span><Trophy size={16}/>{t('So gibt’s Punkte')}</span><p>{t(guide.scoring)}</p></div>
        <p className="mode-tip">{t(guide.tip)}</p>

      </article>;
    })}</div>{!expanded&&gameFamilies.length>initialCount&&<button className="button outline show-more-modes" onClick={()=>setExpanded(true)}>{t('Mehr anzeigen')} · {gameFamilies.length-initialCount}{' '}{t('weitere Spiele')}</button>}
  </section>;
}
