'use client';
import {useEffect,useState} from 'react';
import {useI18n} from '@/lib/i18n';
import {worldsAccountHref,worldsProjectReturn} from '@/lib/auth/worlds-link';
import {useWorldsPilot} from '@/lib/auth/provider';
import {AuthDialog} from './auth-dialog';
import {Header} from './header';

export function WorldsRecovery(){
 const {t,locale}=useI18n(),enabled=useWorldsPilot();
 const [state,setState]=useState<{eligible:boolean;next:string;resetToken:string}|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!enabled)return;
  const url=new URL(location.href),controller=new AbortController();
  const next=worldsProjectReturn(url.searchParams.get('lang')==='en'?'en':'de',url.searchParams.get('next'));
  const resetToken=url.searchParams.get('token')??'';
  // Recovery credentials remain in component memory, never history or storage.
  if(url.searchParams.has('token')){url.searchParams.delete('token');history.replaceState(null,'',url.pathname+url.search);}
  void fetch('/auth/worlds/recovery',{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{
   if(!response.ok&&response.status!==401&&response.status!==409)throw Error();
   const data=await response.json() as {eligible?:unknown};
   if(!controller.signal.aborted)setState({eligible:response.ok&&data.eligible===true,next,resetToken:resetToken.length<=2048?resetToken:''});
  }).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return()=>controller.abort();
 },[enabled]);
 const back=worldsAccountHref(locale,state?.next);
 return <><Header/><main style={{maxWidth:760,margin:'2rem auto',padding:'0 1rem'}}>
  <h1>{t('Bisheriges Konto übernehmen')}</h1>
  <p>{t('Deine Beiträge, Vokabelhefte und Lernstände bleiben deinem bisherigen Konto zugeordnet. Die Anmeldung erfolgt künftig über Worlds Hub.')}</p>
  {failed?<p role="alert">{t('Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.')}</p>:state===null?<p role="status">{t('Einen Moment …')}</p>:!state.eligible?<p role="status">{t('Öffne dein Worlds-Konto, um die Kontoübernahme fortzusetzen oder deine bestehende Verbindung zu verwenden.')}</p>:null}
  <a className="button outline" href={back}>{t('Zurück zur Anmeldung')}</a>
 </main>{state?.eligible&&<AuthDialog migration initial={state.resetToken?'reset':'signin'} resetToken={state.resetToken} returnTo={state.next}
  close={()=>location.assign(worldsAccountHref(locale,state.next))} onAuthenticated={()=>location.assign(worldsAccountHref(locale,state.next))}/>}</>;
}
