'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthClient, type AuthClient } from './client';
import type { ProjectStatus } from './project-identity';

type AuthSession = ReturnType<AuthClient['useSession']>;
const SessionContext = createContext<AuthSession['data']>(null);
const WorldsContext = createContext<ProjectStatus&{enabled:boolean}>({enabled:false,user:null,source:'anonymous'});

function SessionObserver({ client, update }: { client: AuthClient; update: (session: AuthSession['data']) => void }) {
  const { data } = client.useSession();
  useEffect(() => { update(data); }, [data, update]);
  return null;
}

export function AuthProvider({ children, worldsEnabled = false }: { children: ReactNode; worldsEnabled?: boolean }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [session, setSession] = useState<AuthSession['data']>(null);
  const [worldsIdentity,setWorldsIdentity]=useState<ProjectStatus>({user:null,source:'anonymous'});
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
        const data=await response.json() as ProjectStatus;
        if(!data||!['legacy','worlds','anonymous'].includes(data.source)||
          (data.user!==null&&(!data.user||typeof data.user.id!=='string'||typeof data.user.name!=='string'))||
          (data.source==='anonymous'&&data.user!==null))return;
        if(!controller.signal.aborted)setWorldsIdentity({user:data.user,source:data.source,
          csrf:typeof data.csrf==='string'?data.csrf:undefined});
      }catch{/* Preserve current state during a temporary provider/network outage. */}
      finally{pending=false;}
    };
    const visibleRefresh=()=>{if(document.visibilityState==='visible')void refresh();};
    void refresh();
    window.addEventListener('focus',visibleRefresh);
    document.addEventListener('visibilitychange',visibleRefresh);
    const interval=window.setInterval(visibleRefresh,60_000);
    return()=>{controller.abort();window.clearInterval(interval);window.removeEventListener('focus',visibleRefresh);document.removeEventListener('visibilitychange',visibleRefresh);};
  }, [worldsEnabled,session]);
  return <SessionContext.Provider value={session}>
    {client && <SessionObserver client={client} update={setSession}/>}
    <WorldsContext.Provider value={{enabled:worldsEnabled,...worldsIdentity}}>{children}</WorldsContext.Provider>
  </SessionContext.Provider>;
}

export const useAuthSession = () => useContext(SessionContext);
export const useWorldsUser = () => {const identity=useContext(WorldsContext);return identity.source==='worlds'?identity.user:null;};
export const useWorldsPilot = () => useContext(WorldsContext).enabled;
export const useWorldsCsrf=()=>useContext(WorldsContext).csrf;
export function useApplicationUser() {
  const session = useAuthSession();
  const worlds = useContext(WorldsContext);
  return worlds.enabled?worlds.user:session?.user??null;
}
export function useApplicationSource():ProjectStatus['source']{
  const session=useAuthSession(),worlds=useContext(WorldsContext);
  return worlds.enabled?worlds.source:session?.user?'legacy':'anonymous';
}

export const useLearningUser=useApplicationUser;
