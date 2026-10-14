'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthClient, type AuthClient } from './client';

type AuthSession = ReturnType<AuthClient['useSession']>;
const SessionContext = createContext<AuthSession['data']>(null);

function SessionObserver({ client, update }: { client: AuthClient; update: (session: AuthSession['data']) => void }) {
  const { data } = client.useSession();
  useEffect(() => { update(data); }, [data, update]);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [session, setSession] = useState<AuthSession['data']>(null);
  useEffect(() => {
    let active = true;
    getAuthClient().then(client => { if (active) setClient(() => client); }).catch(() => {
      // Guest browsing remains usable; login retries and reports any load error.
    });
    return () => { active = false; };
  }, []);
  return <SessionContext.Provider value={session}>
    {client && <SessionObserver client={client} update={setSession}/>}
    {children}
  </SessionContext.Provider>;
}

export const useAuthSession = () => useContext(SessionContext);
