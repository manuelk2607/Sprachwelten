'use client';
import {Select} from './select';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Compass, Earth, ExternalLink, MessageCircle, Plus, Search, Sparkles, Users } from 'lucide-react';
import { useAuthSession } from '@/lib/auth/provider';
import { site } from '@/lib/site';
import { kindLabels, languages, type Entry } from '@/lib/content';
import { localizeEntry } from '@/lib/entry-localization';
import { ModeCards } from './mode-cards';
import { RoomForm } from './room-form';
import type { PlayableGameMode } from '@/lib/modes';
import { Header } from './header';
import { AuthDialog } from './auth-dialog';
import { ContributeDialog } from './contribute-dialog';
import { EntryDialog } from './entry-dialog';
import { LanguagePicker } from './language-picker';
import { languageLabel } from '@/lib/language-label';
import { TranslationNotice } from './translation-notice';
import { translationStatus } from '@/lib/content-translations';

export function Home() {
  const { t, locale } = useI18n();
  const session=useAuthSession();
  const [auth,setAuth]=useState(false);const [contribute,setContribute]=useState(false);const [play,setPlay]=useState(false);
  const [entries,setEntries]=useState<Entry[]>([]);const [kind,setKind]=useState('');const [language,setLanguage]=useState('');const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [offset,setOffset]=useState(0);const [more,setMore]=useState(false);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [toast,setToast]=useState('');const [refresh,setRefresh]=useState(0);const [selected,setSelected]=useState<Entry|null>(null);
  const [resetToken,setResetToken]=useState('');
  const [playMode,setPlayMode]=useState<PlayableGameMode>('idiom-bluff');const [joinCode,setJoinCode]=useState('');const [joinOnly,setJoinOnly]=useState(false);
  const openMode=(mode:PlayableGameMode)=>{setJoinOnly(false);setJoinCode('');setPlayMode(mode);setPlay(true);};
  useEffect(()=>{const url=new URL(window.location.href);if(url.searchParams.get('reset')&&url.searchParams.get('token')){setResetToken(url.searchParams.get('token')!);setAuth(true);window.history.replaceState(null,'','/');}},[]);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(query),300);return()=>clearTimeout(timer);},[query]);
  useEffect(()=>{setOffset(0);setEntries([]);},[kind,language,search,refresh]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const qs=new URLSearchParams({kind,language,q:search,offset:String(offset)});
    fetch('/api/entries?'+qs,{signal:controller.signal}).then(async res=>{const data=await res.json() as { entries: Entry[]; error: string };if(!res.ok)throw new Error(data.error);return data;}).then(data=>{setEntries(prev=>offset?[...prev,...data.entries]:data.entries);setMore(data.entries.length===6);}).catch(err=>{if(err.name!=='AbortError')setError(t(err.message));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[kind,language,search,offset,refresh]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);
  const shownEntries=entries.map(entry=>localizeEntry(entry,locale));
  const chooseGame=()=>document.getElementById('spiele')?.scrollIntoView({behavior:'smooth'});
  const discover=()=>document.getElementById('entdecken')?.scrollIntoView({behavior:'smooth'});
  const openExisting=async(id:string)=>{
    const response=await fetch('/api/entries/'+encodeURIComponent(id));const data=await response.json() as {entry:Entry};
    if(!response.ok||!data.entry)throw new Error('Entry unavailable');
    setContribute(false);setSelected(data.entry);
  };
  const openContribute=()=>{if(session?.user)setContribute(true);else setAuth(true);};
  return <><Header onDiscover={discover} onPlay={chooseGame} onContribute={openContribute} onLogin={()=>setAuth(true)}/>
    <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="tiny-star">✳</span> {t("SPRACHE IST MEHR ALS VOKABELN")}</div>
      <h1>{t("Andere Worte.")}<br/><span>{t("Neue Welten.")}</span></h1><p>{t("Entdecke, wie Menschen anderswo sprechen.")}<br className="desktop-break"/> {t("Und wie viel Spaß es macht, sie falsch zu verstehen.")}</p>
      <div className="hero-buttons"><button className="button primary" onClick={chooseGame}><Users size={19}/>{t("Spiel auswählen")}<ArrowRight size={18}/></button><button className="button outline" onClick={discover}>{t("Auf Entdeckungsreise")}<ArrowDown size={18}/></button></div>
      <div className="hero-note"><span className="avatar-stack"><i>A</i><i>M</i><i>L</i></span><span>{t("Neugier genügt. Sprachkenntnisse optional.")}</span></div>
    </div><div className="hero-art" aria-label={t("Beispiele aus anderen Sprachwelten")}><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="art-star star-one">✳</span><span className="art-star star-two">✧</span>
      <div className="float-label"><Earth size={15}/> {t("So viel steckt zwischen den Worten.")}</div>
      <div className="word-card back-card"><span className="mini-label">{t("FRANZÖSISCH")}</span><p>{t("Dem Kater seine")}<br/>{t("Zunge geben?")}</p><span>🐈</span></div>
      <div className="word-card front-card"><div className="card-top"><span className="mini-label">{t("SCHWEDISCH")}</span><span className="card-number">01 / 20</span></div><div className="cow-illustration" aria-hidden="true">🐄<span>✦</span></div><h2>{t("Keine Kuh")}<br/>{t("auf dem Eis.")}</h2><p>{t("Keine Ahnung?")}<br/>{t("Perfekt. Genau darum geht’s.")}</p><div className="card-bottom"><span>Ingen ko på isen</span><ArrowRight size={18}/></div></div>
      <div className="floating-bubble"><MessageCircle size={18}/><span>{t("Was soll das heißen?!")}</span></div>
    </div></section>
    <div className="ticker" aria-hidden="true"><span>{t("REDEN IST SILBER")}</span><Sparkles size={18}/><span>{t("RATEN IST GOLD")}</span><Sparkles size={18}/><span>{t("ANDERE LÄNDER, ANDERE WORTE")}</span><Sparkles size={18}/><span>{t("NEUGIER VERBINDET")}</span><Sparkles size={18}/></div>
    <section className="quick-join" aria-label={t('Direkt mit Raumcode beitreten')}><div><h2>{t('Deine Freunde warten schon?')}</h2><p className="muted">{t('Gib den Raumcode ein und tritt direkt bei.')}</p></div><form onSubmit={event=>{event.preventDefault();setJoinOnly(true);setPlay(true);}}><label className="sr-only" htmlFor="home-room-code">{t('Raumcode')}</label><input id="home-room-code" className="code-input" value={joinCode} onChange={event=>setJoinCode(event.target.value.toUpperCase())} placeholder="ABC123" required pattern="[A-Z0-9]{6}" maxLength={6}/><button className="button dark">{t('Raum beitreten')}<ArrowRight size={16}/></button></form></section><ModeCards play={openMode}/><section id="entdecken" className="discovery"><div className="section-top"><div><div className="eyebrow">{t("KLEINE AUSDRÜCKE, GROSSE GESCHICHTEN")}</div><h2>{t("Die Welt spricht. Hör hin.")}</h2><p className="muted">{t("Stöbere durch Redewendungen und teile, was du kennst.")}</p></div><button className="button outline" onClick={openContribute}><Plus size={18}/>{t("Eigenen Ausdruck teilen")}</button></div>
      <div className="filters"><label className="kind-filter">{t('Beitragsart')}<Select aria-label={t('Beitragsart')} value={kind} onValueChange={setKind}><option value="">{t('Alles')}</option>{Object.entries(kindLabels).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</Select></label><div className="filter-controls"><label className="search"><Search size={17}/><input aria-label={t("Ausdrücke suchen")} placeholder={t("Ein Wort, eine Bedeutung …")} value={query} onChange={e=>setQuery(e.target.value)}/></label><LanguagePicker label="Sprache filtern" value={language} onChange={setLanguage} allowAll/></div></div>
      {error?<div className="empty-state"><p role="alert">{t(error)}</p><button className="button outline" onClick={()=>setRefresh(r=>r+1)}>{t("Erneut versuchen")}</button></div>:loading&&!entries.length?<div className="entry-grid" aria-label={t("Beiträge werden geladen")}>{[1,2,3].map(i=><div key={i} className="entry-card skeleton"/>)}</div>:!entries.length?<div className="empty-state"><Compass size={36}/><h3>{t("Hier gibt es noch etwas zu entdecken.")}</h3><p>{t("Für diese Auswahl ist noch kein Beitrag vorhanden. Du kannst den Anfang machen.")}</p><button className="button primary" onClick={openContribute}>{t("Ausdruck beitragen")}</button></div>:<div className="entry-grid">{shownEntries.map((entry,i)=><button className={`entry-card tone-${i%4}`} key={entry.id} onClick={()=>setSelected(entries.find(original=>original.id===entry.id)??entry)}><div className="entry-meta"><span>{languageLabel(entry.language,locale,entry.languageNames)}{entry.region&&' · '+t(entry.region)}</span><span className="kind-pill">{t(kindLabels[entry.kind])}</span></div><h3>{entry.phrase}</h3><p>{entry.literal||entry.meaning}</p>{entry.status==='community'&&<TranslationNotice status={translationStatus(entry,locale)} sourceLocale={entry.sourceLocale??'de'}/>}<div className="entry-bottom"><span>{entry.status==='community'?t("Community-Beitrag"):t("Startsammlung")}</span><span>{t("Bedeutung entdecken")} <ArrowRight size={16}/></span></div></button>)}</div>}
      {more&&<button className="button outline load-more" disabled={loading} onClick={()=>setOffset(entries.length)}>{loading?t("Wird geladen …"):t('Mehr anzeigen')}</button>}
    </section>
    <section className="community-band"><span className="community-mark">✳</span><div><h2>{t("Deine Sprache gehört dazu.")}</h2><p>{t("Die schönsten Ausdrücke stehen manchmal in keinem Lehrbuch.")}<br/>{t("Teile Redewendungen, Dialektwörter und kleine kulturelle Besonderheiten.")}</p></div><button className="button dark" onClick={openContribute}>{t("Etwas beitragen")}<Plus size={18}/></button></section>
    </main><footer><a className="brand" href="/"><Earth size={21}/>{site.name}<span className="brand-dot">.</span></a><p>{t("Mit Neugier gemacht. Für alle, die Sprache verbindet.")}</p><a href={site.repository} target="_blank" rel="noreferrer">{t("Öffentlicher Code")} <ExternalLink size={14}/></a></footer>
    {toast&&<div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {auth&&<AuthDialog close={()=>{setAuth(false);setResetToken('');}} initial={resetToken?'reset':'signin'} resetToken={resetToken}/>}
    {contribute&&<ContributeDialog openExisting={openExisting} close={()=>setContribute(false)} saved={()=>{setRefresh(r=>r+1);setToast(t("Dein Beitrag ist jetzt Teil der Sammlung."));}}/>}
    {play&&<RoomForm joinOnly={joinOnly} code={joinCode} initialMode={playMode} close={()=>setPlay(false)}/>}
    {selected&&<EntryDialog entry={selected} close={()=>setSelected(null)} login={()=>{setSelected(null);setAuth(true);}} signedIn={!!session?.user}/>}
  </>;
}
