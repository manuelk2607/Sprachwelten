'use client';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Check, Compass, Earth, ExternalLink, Lightbulb, MessageCircle, Plus, Search, Sparkles, Users } from 'lucide-react';
import { useAuthSession } from '@/lib/auth/provider';
import { site } from '@/lib/site';
import { kindLabels, languages, type Entry, type Explanation } from '@/lib/content';
import { localizeEntry } from '@/lib/entry-localization';
import { ModeCards } from './mode-cards';
import { RoomForm } from './room-form';
import type { PlayableGameMode } from '@/lib/modes';
import { Header } from './header';
import { Dialog } from './dialog';
import { AuthDialog } from './auth-dialog';
import { ContributeDialog } from './contribute-dialog';
import { EntryDialog } from './entry-dialog';
import { TranslationNotice } from './translation-notice';
import { translationStatus } from '@/lib/content-translations';

export function Home() {
  const { t, locale } = useI18n();
  const session=useAuthSession();
  const [auth,setAuth]=useState(false);const [contribute,setContribute]=useState(false);const [play,setPlay]=useState(false);const [how,setHow]=useState(false);
  const [entries,setEntries]=useState<Entry[]>([]);const [kind,setKind]=useState('');const [language,setLanguage]=useState('');const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [offset,setOffset]=useState(0);const [more,setMore]=useState(false);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [toast,setToast]=useState('');const [refresh,setRefresh]=useState(0);const [selected,setSelected]=useState<Entry|null>(null);
  const [resetToken,setResetToken]=useState('');
  const [playMode,setPlayMode]=useState<PlayableGameMode>('idiom-bluff');
  const openMode=(mode:PlayableGameMode)=>{setPlayMode(mode);setPlay(true);};
  useEffect(()=>{const url=new URL(window.location.href);if(url.searchParams.get('reset')&&url.searchParams.get('token')){setResetToken(url.searchParams.get('token')!);setAuth(true);window.history.replaceState(null,'','/');}},[]);
  useEffect(()=>{const timer=setTimeout(()=>setSearch(query),300);return()=>clearTimeout(timer);},[query]);
  useEffect(()=>{setOffset(0);setEntries([]);},[kind,language,search,refresh]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const qs=new URLSearchParams({kind,language,q:search,offset:String(offset)});
    fetch('/api/entries?'+qs,{signal:controller.signal}).then(async res=>{const data=await res.json() as { entries: Entry[]; error: string };if(!res.ok)throw new Error(data.error);return data;}).then(data=>{setEntries(prev=>offset?[...prev,...data.entries]:data.entries);setMore(data.entries.length===60);}).catch(err=>{if(err.name!=='AbortError')setError(t(err.message));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[kind,language,search,offset,refresh]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);
  const shownEntries=entries.map(entry=>localizeEntry(entry,locale));
  const discover=()=>document.getElementById('entdecken')?.scrollIntoView({behavior:'smooth'});
  const openContribute=()=>{if(session?.user)setContribute(true);else setAuth(true);};
  return <><Header onDiscover={discover} onPlay={()=>openMode('idiom-bluff')} onContribute={openContribute} onLogin={()=>setAuth(true)}/>
    <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="tiny-star">✳</span> {t("SPRACHE IST MEHR ALS VOKABELN")}</div>
      <h1>{t("Andere Worte.")}<br/><span>{t("Neue Welten.")}</span></h1><p>{t("Entdecke, wie Menschen anderswo sprechen.")}<br className="desktop-break"/> {t("Und wie viel Spaß es macht, sie falsch zu verstehen.")}</p>
      <div className="hero-buttons"><button className="button primary" onClick={()=>openMode('idiom-bluff')}><Users size={19}/>{t("Mit Freunden spielen")}<ArrowRight size={18}/></button><button className="button outline" onClick={discover}>{t("Auf Entdeckungsreise")}<ArrowDown size={18}/></button></div>
      <div className="hero-note"><span className="avatar-stack"><i>A</i><i>M</i><i>L</i></span><span>{t("Neugier genügt. Sprachkenntnisse optional.")}</span></div>
    </div><div className="hero-art" aria-label={t("Beispiele aus anderen Sprachwelten")}><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="art-star star-one">✳</span><span className="art-star star-two">✧</span>
      <div className="float-label"><Earth size={15}/> {t("So viel steckt zwischen den Worten.")}</div>
      <div className="word-card back-card"><span className="mini-label">{t("FRANZÖSISCH")}</span><p>{t("Dem Kater seine")}<br/>{t("Zunge geben?")}</p><span>🐈</span></div>
      <div className="word-card front-card"><div className="card-top"><span className="mini-label">{t("SCHWEDISCH")}</span><span className="card-number">01 / 20</span></div><div className="cow-illustration" aria-hidden="true">🐄<span>✦</span></div><h2>{t("Keine Kuh")}<br/>{t("auf dem Eis.")}</h2><p>{t("Keine Ahnung?")}<br/>{t("Perfekt. Genau darum geht’s.")}</p><div className="card-bottom"><span>Ingen ko på isen</span><ArrowRight size={18}/></div></div>
      <div className="floating-bubble"><MessageCircle size={18}/><span>{t("Was soll das heißen?!")}</span></div>
    </div></section>
    <div className="ticker" aria-hidden="true"><span>{t("REDEN IST SILBER")}</span><Sparkles size={18}/><span>{t("RATEN IST GOLD")}</span><Sparkles size={18}/><span>{t("ANDERE LÄNDER, ANDERE WORTE")}</span><Sparkles size={18}/><span>{t("NEUGIER VERBINDET")}</span><Sparkles size={18}/></div>
    <section className="play-feature"><div><div className="eyebrow">{t("DER ERSTE SPIELMODUS")}</div><h2>{t("Was soll das heißen?")}</h2><p>{t("Eine echte Redewendung. Eure erfundenen Erklärungen.")}<br/>{t("Wer erkennt die Wahrheit – und wer blufft am besten?")}</p><button className="text-link" onClick={()=>setHow(true)}>{t("So funktioniert’s")} <ArrowRight size={17}/></button></div><div className="steps-preview"><div><span>01</span><strong>{t("Erfinden")}</strong><small>{t("Eine plausible Bedeutung ausdenken.")}</small></div><div><span>02</span><strong>{t("Erraten")}</strong><small>{t("Zwischen Wahrheit und Bluff wählen.")}</small></div><div><span>03</span><strong>{t("Entdecken")}</strong><small>{t("Die echte Bedeutung kennenlernen.")}</small></div></div><button className="button dark" onClick={()=>openMode('idiom-bluff')}>{t("Raum erstellen")}<ArrowRight size={17}/></button></section>
    <ModeCards play={openMode}/><section id="entdecken" className="discovery"><div className="section-top"><div><div className="eyebrow">{t("KLEINE AUSDRÜCKE, GROSSE GESCHICHTEN")}</div><h2>{t("Die Welt spricht. Hör hin.")}</h2><p className="muted">{t("Stöbere durch Redewendungen und teile, was du kennst.")}</p></div><button className="button outline" onClick={openContribute}><Plus size={18}/>{t("Eigenen Ausdruck teilen")}</button></div>
      <div className="filters"><div className="kind-tabs" aria-label={t("Beitragsart")}>{[['',t("Alles")],['idiom',t("Redewendungen")],['dialect',t("Dialekte")],['situation',t("Alltag")],['word',t('Wörter')],['tongue_twister',t('Zungenbrecher')]].map(([id,label])=><button key={id} aria-pressed={kind===id} className={kind===id?'selected':''} onClick={()=>setKind(id)}>{t(label)}</button>)}</div><div className="filter-controls"><label className="search"><Search size={17}/><input aria-label={t("Ausdrücke suchen")} placeholder={t("Ein Wort, eine Bedeutung …")} value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label={t("Sprache filtern")} value={language} onChange={e=>setLanguage(e.target.value)}><option value="">{t("Alle Sprachen")}</option>{Object.entries(languages).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</select></div></div>
      {error?<div className="empty-state"><p role="alert">{t(error)}</p><button className="button outline" onClick={()=>setRefresh(r=>r+1)}>{t("Erneut versuchen")}</button></div>:loading&&!entries.length?<div className="entry-grid" aria-label={t("Beiträge werden geladen")}>{[1,2,3].map(i=><div key={i} className="entry-card skeleton"/>)}</div>:!entries.length?<div className="empty-state"><Compass size={36}/><h3>{t("Hier gibt es noch etwas zu entdecken.")}</h3><p>{t("Für diese Auswahl ist noch kein Beitrag vorhanden. Du kannst den Anfang machen.")}</p><button className="button primary" onClick={openContribute}>{t("Ausdruck beitragen")}</button></div>:<div className="entry-grid">{shownEntries.map((entry,i)=><button className={`entry-card tone-${i%4}`} key={entry.id} onClick={()=>setSelected(entries.find(original=>original.id===entry.id)??entry)}><div className="entry-meta"><span>{t(languages[entry.language]??entry.language)}{entry.region&&' · '+t(entry.region)}</span><span className="kind-pill">{t(kindLabels[entry.kind])}</span></div><h3>{entry.phrase}</h3><p>{entry.literal||entry.meaning}</p>{entry.status==='community'&&<TranslationNotice status={translationStatus(entry,locale)} sourceLocale={entry.sourceLocale??'de'}/>}<div className="entry-bottom"><span>{entry.status==='community'?t("Community-Beitrag"):t("Startsammlung")}</span><span>{t("Bedeutung entdecken")} <ArrowRight size={16}/></span></div></button>)}</div>}
      {more&&<button className="button outline load-more" disabled={loading} onClick={()=>setOffset(entries.length)}>{loading?t("Wird geladen …"):t("Weitere Beiträge laden")}</button>}
    </section>
    <section className="community-band"><span className="community-mark">✳</span><div><h2>{t("Deine Sprache gehört dazu.")}</h2><p>{t("Die schönsten Ausdrücke stehen manchmal in keinem Lehrbuch.")}<br/>{t("Teile Redewendungen, Dialektwörter und kleine kulturelle Besonderheiten.")}</p></div><button className="button dark" onClick={openContribute}>{t("Etwas beitragen")}<Plus size={18}/></button></section>
    </main><footer><a className="brand" href="/"><Earth size={21}/>{site.name}<span className="brand-dot">.</span></a><p>{t("Mit Neugier gemacht. Für alle, die Sprache verbindet.")}</p><a href={site.repository} target="_blank" rel="noreferrer">{t("Öffentlicher Code")} <ExternalLink size={14}/></a></footer>
    {toast&&<div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {auth&&<AuthDialog close={()=>{setAuth(false);setResetToken('');}} initial={resetToken?'reset':'signin'} resetToken={resetToken}/>}
    {contribute&&<ContributeDialog close={()=>setContribute(false)} saved={()=>{setRefresh(r=>r+1);setToast(t("Dein Beitrag ist jetzt Teil der Sammlung."));}}/>}
    {play&&<RoomForm initialMode={playMode} close={()=>setPlay(false)}/>}
    {how&&<Dialog title={t("Ein bisschen Wahrheit. Viel Fantasie.")} close={()=>setHow(false)}><div className="rules"><p><strong>{t("3–10 Personen · 5 Runden · ohne Konto")}</strong></p><p>{t("Ihr bekommt eine Redewendung und schreibt jeweils eine erfundene Erklärung. Danach erscheinen alle Erklärungen zusammen mit der echten Bedeutung in zufälliger Reihenfolge.")}</p><p>{t("Wählt die Erklärung, die ihr für richtig haltet. Die eigene Erklärung ist dabei gesperrt.")}</p><p><strong>{t("2 Punkte")}</strong> {t("für die echte Bedeutung.")} <strong>{t("1 Punkt")}</strong> {t("für jede Person, die auf euren Bluff hereinfällt. Alle spielen in jeder Runde mit.")}</p><p>{t("Bleibt nebenbei im selben Raum oder in eurem Sprachchat. Der Gastgeber startet nach der Auflösung die nächste Runde.")}</p></div><button className="button primary full" onClick={()=>{setHow(false);openMode('idiom-bluff');}}>{t("Los geht’s")}<ArrowRight size={17}/></button></Dialog>}
    {selected&&<EntryDialog entry={selected} close={()=>setSelected(null)} login={()=>{setSelected(null);setAuth(true);}} signedIn={!!session?.user}/>}
  </>;
}
