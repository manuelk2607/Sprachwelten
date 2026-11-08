'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthClient, type AuthClient } from './client';
import type { LearningUser } from './worlds';

type AuthSession = ReturnType<AuthClient['useSession']>;
const SessionContext = createContext<AuthSession['data']>(null);
const WorldsContext = createContext<{enabled:boolean;user:LearningUser|null}>({enabled:false,user:null});

function SessionObserver({ client, update }: { client: AuthClient; update: (session: AuthSession['data']) => void }) {
  const { data } = client.useSession();
  useEffect(() => { update(data); }, [data, update]);
  return null;
}

export function AuthProvider({ children, worldsEnabled = false }: { children: ReactNode; worldsEnabled?: boolean }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [session, setSession] = useState<AuthSession['data']>(null);
  const [worldsUser, setWorldsUser] = useState<LearningUser|null>(null);
  useEffect(() => {
    let active = true;
    getAuthClient().then(client => { if (active) setClient(() => client); }).catch(() => {
      // Guest browsing remains usable; login retries and reports any load error.
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!worldsEnabled) return;
    const controller = new AbortController();
    fetch("/auth/status", {signal: controller.signal}).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as {user: LearningUser | null};
      if (!controller.signal.aborted) setWorldsUser(data.user);
    }).catch(() => {});
    return () => controller.abort();
  }, [worldsEnabled]);
  return <SessionContext.Provider value={session}>
    {client && <SessionObserver client={client} update={setSession}/>}
    <WorldsContext.Provider value={{enabled:worldsEnabled,user:worldsUser}}>{children}</WorldsContext.Provider>
  </SessionContext.Provider>;
}

export const useAuthSession = () => useContext(SessionContext);
export const useWorldsUser = () => useContext(WorldsContext).user;
export const useWorldsPilot = () => useContext(WorldsContext).enabled;
export function useLearningUser() {
  const session = useAuthSession();
  const worlds = useContext(WorldsContext);
  return session?.user ?? worlds.user;
}
