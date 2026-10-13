'use client';
import { Globe2, LogOut, Plus, UserRound } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { site } from '@/lib/site';
export function Header({active='discover',onDiscover,onPlay,onContribute,onLogin}:{active?:string;onDiscover?:()=>void;onPlay?:()=>void;onContribute?:()=>void;onLogin?:()=>void}) {
  const {data:session}=authClient.useSession();
  return <header className="header"><a className="brand" href="/"><span className="brand-mark"><Globe2 size={24}/></span>{site.name}<span className="brand-dot">.</span></a>
    <nav aria-label="Hauptnavigation"><a className={active==='discover'?'active':''} href="/#entdecken" onClick={e=>{if(onDiscover){e.preventDefault();onDiscover();}}}>Entdecken</a><a className={active==='play'?'active':''} href="/" onClick={e=>{if(onPlay){e.preventDefault();onPlay();}}}>Mit Freunden spielen</a></nav>
    <div className="header-actions">{onContribute&&<button className="button small outline contribute-nav" onClick={onContribute}><Plus size={16}/>Beitragen</button>}
    {session?.user?<><span className="account-name"><UserRound size={16}/>{session.user.name}</span><button className="icon-button" aria-label="Abmelden" onClick={async()=>{await authClient.signOut();}}><LogOut size={18}/></button></>:<button className="button small dark" onClick={onLogin}><UserRound size={16}/>Anmelden</button>}</div>
  </header>;
}
