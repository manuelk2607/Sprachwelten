'use client';
import { ArrowRight, Check, Compass, Globe2, MessageCircle, Mic2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { gameModes, type PlayableGameMode } from '@/lib/modes';
const icons=[MessageCircle,Globe2,Mic2,Compass,MessageCircle];
export function ModeCards({play}:{play:(mode:PlayableGameMode)=>void}) {
  const {t}=useI18n();
  return <section className="mode-section"><div className="eyebrow">SPRACHWELTEN</div><h2>{t('Spiele für neugierige Köpfe.')}</h2><div className="mode-grid">{gameModes.map((mode,i)=>{const Icon=icons[i];const active=mode.status==='playable';return <article className={`mode-card ${active?'available':''}`} key={mode.id}><div className="mode-top"><Icon size={23}/><span className="kind-pill">{t(active?'Jetzt spielbar':'Bald verfügbar')}</span></div><h3>{t(mode.title)}</h3><p>{t(mode.description)}</p><button className={`button ${active?'dark':'outline'}`} disabled={!active} onClick={active?()=>play(mode.id as PlayableGameMode):undefined}>{t(active?(mode.id==='language-quiz'?'Wörterquiz starten':mode.id==='tongue-twisters'?'Vorlesen starten':mode.id==='dialect-detective'?'Dialektquiz starten':mode.id==='everyday-language'?'Alltagsquiz starten':'Mit Freunden spielen'):'Bald verfügbar')}{active&&<ArrowRight size={16}/>}</button></article>;})}</div></section>;
}
