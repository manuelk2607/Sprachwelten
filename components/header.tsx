'use client';
import { useI18n } from '@/lib/i18n';
import { Globe2, LogOut, Moon, Plus, Sun, UserRound } from 'lucide-react';
import { getAuthClient } from '@/lib/auth/client';
import { useAuthSession } from '@/lib/auth/provider';
import { useTheme } from '@/lib/theme';
import { site } from '@/lib/site';
export function Header({active='discover',onDiscover,onPlay,onContribute,onLogin}:{active?:string;onDiscover?:()=>void;onPlay?:()=>void;onContribute?:()=>void;onLogin?:()=>void}) {
  const { t, locale, setLocale } = useI18n();
  const session=useAuthSession();const {theme,toggleTheme}=useTheme();
  return <header className="header"><a className="brand" href="/"><span className="brand-mark"><Globe2 size={24}/></span>{site.name}<span className="brand-dot">.</span></a>
    <nav aria-label={t("Hauptnavigation")}><a className={active==='discover'?'active':''} href="/#entdecken" onClick={e=>{if(onDiscover){e.preventDefault();onDiscover();}}}>{t("Entdecken")}</a><a className={active==='play'?'active':''} href="/#spiele" onClick={e=>{if(onPlay){e.preventDefault();onPlay();}}}>{t("Spiele")}</a></nav>
    <div className="header-actions"><button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-pressed={theme==='dark'} aria-label={t(theme==='dark'?'Hellen Modus aktivieren':'Dunklen Modus aktivieren')} title={t(theme==='dark'?'Hellen Modus aktivieren':'Dunklen Modus aktivieren')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button><div className="language-switch" role="group" aria-label={locale==='de'?'Sprache wählen':'Choose language'}>{(['de','en'] as const).map(value=><button key={value} className={locale===value?'selected':''} aria-pressed={locale===value} onClick={()=>setLocale(value)}>{value.toUpperCase()}</button>)}</div>{onContribute&&<button className="button small outline contribute-nav" onClick={onContribute}><Plus size={16}/>{t("Beitragen")}</button>}
    {session?.user?<><span className="account-name"><UserRound size={16}/>{session.user.name}</span><button className="icon-button" aria-label={t("Abmelden")} onClick={async()=>{await (await getAuthClient()).signOut();}}><LogOut size={18}/></button></>:<button className="button small dark" onClick={onLogin}><UserRound size={16}/>{t("Anmelden")}</button>}</div>
  </header>;
}
