'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthClient, type AuthClient } from './client';
import type { LearningUser } from './worlds';

type AuthSession = ReturnType<AuthClient['useSession']>;
const SessionContext = createContext<AuthSession['data']>(null);
const WorldsContext = createContext<{enabled:boolean;user:LearningUser|null;csrf?:string}>({enabled:false,user:null});

function SessionObserver({ client, update }: { client: AuthClient; update: (session: AuthSession['data']) => void }) {
  const { data } = client.useSession();
  useEffect(() => { update(data); }, [data, update]);
  return null;
}

export function AuthProvider({ children, worldsEnabled = false }: { children: ReactNode; worldsEnabled?: boolean }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [session, setSession] = useState<AuthSession['data']>(null);
  const [worldsIdentity,setWorldsIdentity]=useState<{user:LearningUser|null;csrf?:string}>({user:null});
  useEffect(() => {
    let active = true;
    getAuthClient().then(client => { if (active) setClient(() => client); }).catch(() => {
      // Guest browsing remains usable; login retries and reports any load error.
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!worldsEnabled) return;
    const controller=new AbortController();
    let pending=false;
    const refresh=async()=>{
      if(pending||controller.signal.aborted)return;
      pending=true;
      try{
        const response=await fetch('/auth/status',{signal:controller.signal,cache:'no-store',credentials:'same-origin'});
        if(!response.ok)return;
        const data=await response.json() as {user:LearningUser|null;csrf?:string};
        if(!controller.signal.aborted)setWorldsIdentity({user:data.user,csrf:data.csrf});
      }catch{/* Preserve current state during a temporary provider/network outage. */}
      finally{pending=false;}
    };
    const visibleRefresh=()=>{if(document.visibilityState==='visible')void refresh();};
    void refresh();
    window.addEventListener('focus',visibleRefresh);
    document.addEventListener('visibilitychange',visibleRefresh);
    const interval=window.setInterval(visibleRefresh,60_000);
    return()=>{controller.abort();window.clearInterval(interval);window.removeEventListener('focus',visibleRefresh);document.removeEventListener('visibilitychange',visibleRefresh);};
  }, [worldsEnabled]);
  return <SessionContext.Provider value={session}>
    {client && <SessionObserver client={client} update={setSession}/>}
    <WorldsContext.Provider value={{enabled:worldsEnabled,...worldsIdentity}}>{children}</WorldsContext.Provider>
  </SessionContext.Provider>;
}

export const useAuthSession = () => useContext(SessionContext);
export const useWorldsUser = () => useContext(WorldsContext).user;
export const useWorldsPilot = () => useContext(WorldsContext).enabled;
export const useWorldsCsrf=()=>useContext(WorldsContext).csrf;
export function useApplicationUser() {
  const session = useAuthSession();
  const worlds = useContext(WorldsContext);
  return session?.user ?? worlds.user;
}

export const useLearningUser=useApplicationUser;
