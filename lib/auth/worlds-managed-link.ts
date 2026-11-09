import {sameOrigin,session,type AuthConfig} from '@worlds-hub/auth';
import {centralProof,prepareManagedSessionLink,confirmManagedSessionLink} from '@worlds-hub/auth/linking';
import {PostgresLinkStore,type PgQuery} from '@worlds-hub/auth/postgres-links';
import type {loadManagedOwner} from './managed-owner';
import {mappedProjectAccount} from './project-accounts';
import {authDocument,authError,escapeHtml,readWorldsForm} from './worlds-document';
import {worldsProjectReturn,worldsManagedLinkPaths,worldsRecoveryHref} from './worlds-link';
import {translate,type Locale} from '../translations';
import {GameError} from '../game';

export type ManagedOwnerLoader=()=>ReturnType<typeof loadManagedOwner>;
/** Only the framework supplies loadOwner, backed by the official server SDK.
 * The browser supplies CSRF and an opaque one-time proof, never an identity. */
export async function managedLinkRoute(request:Request,config:AuthConfig,query:PgQuery,loadOwner:ManagedOwnerLoader){
 const url=new URL(request.url),locale:Locale=url.searchParams.get('locale')==='en'?'en':'de';
 const next=worldsProjectReturn(locale,url.searchParams.get('next')),confirm=url.pathname==='/auth/worlds/confirm';
 const t=(text:string)=>escapeHtml(translate(text,locale));
 if(url.origin!==config.origin||!worldsManagedLinkPaths.includes(url.pathname))return new Response(null,{status:404});
 if(request.method!=='POST')return authError(locale,'Diese Anfrage ist nicht erlaubt.',405,next);
 if(!sameOrigin(request,config.origin))return authError(locale,'Diese Anfrage ist nicht erlaubt.',403,next);
 try{
  const current=await session(request,config);
  if(!current||!current.email)return authError(locale,'Bitte melde dich erneut über Worlds Hub an.',401,next);
  const form=await readWorldsForm(request,confirm?['csrf','proof']:['csrf']);
  if(form.get('csrf')!==current.csrf)return authError(locale,'Diese Anfrage ist nicht erlaubt.',403,next);
  if(confirm&&!/^[A-Za-z0-9_-]{32,128}$/.test(form.get('proof')??''))return authError(locale,'Die Bestätigung ist abgelaufen oder passt nicht mehr zu deinen Konten. Bitte starte die Übernahme erneut.',409,next);
  const central=await centralProof(request,config),owner=await loadOwner(),store=new PostgresLinkStore(query);
  const mapped=await mappedProjectAccount(current,query);
  if(mapped&&(!mapped.active||mapped.id!==owner.proof.accountId))return authError(locale,'Dieses Worlds-Konto ist bereits einem anderen oder gesperrten Sprachwelten-Profil zugeordnet. Es werden keine Konten zusammengeführt.',409,next);
  if(confirm){
   await confirmManagedSessionLink(form.get('proof')!,central,owner.proof,store);
  }else if(!mapped){
   const proof=await prepareManagedSessionLink(central,owner.proof,store);
   return authDocument(locale,translate('Bisheriges Konto übernehmen',locale),
    `<p>${t('Du verbindest dein bisheriges Sprachwelten-Konto mit deinem bestätigten Worlds-Konto.')}</p><dl><dt>${t('Bisheriges Sprachwelten-Konto')}</dt><dd>${escapeHtml(owner.name)}</dd><dt>${t('Dein Worlds-Konto')}</dt><dd>${escapeHtml(current.name||translate('Dein Worlds-Konto',locale))}</dd></dl><p>${t('Deine Beiträge, Vokabelhefte und Lernstände bleiben deinem bisherigen Konto zugeordnet. Die Anmeldung erfolgt künftig über Worlds Hub.')}</p><form method="post" action="/auth/worlds/confirm?${escapeHtml(new URLSearchParams({locale,next}).toString())}"><input type="hidden" name="csrf" value="${escapeHtml(current.csrf)}"><input type="hidden" name="proof" value="${proof}"><button class="primary">${t('Verbindung bestätigen')}</button></form><a href="${escapeHtml(next)}">${t('Abbrechen')}</a>`,{next,stageCsrf:current.csrf});
  }
  return new Response(null,{status:303,headers:{location:next,'cache-control':'no-store'}});
 }catch(error){
  if(error instanceof Error&&error.message==='CENTRAL_REAUTHENTICATION_REQUIRED'){
   const href='/auth/start?'+new URLSearchParams({reauth:'1',next,ui_locales:locale});
   return authDocument(locale,translate('Worlds-Anmeldung bestätigen',locale),`<p role="alert">${t('Bitte bestätige deine Anmeldung im Worlds Hub erneut, bevor du dein bisheriges Konto übernimmst.')}</p><a class="button primary" href="${escapeHtml(href)}">${t('Worlds-Anmeldung bestätigen')}</a>`,{status:401,next});
  }
  if(error instanceof Error&&error.message==='LEGACY_REAUTHENTICATION_REQUIRED')return authDocument(locale,translate('Bisheriges Konto bestätigen',locale),`<p role="alert">${t('Für dieses Verwaltungskonto ist vor der Übernahme eine frische Bestätigung der bisherigen Anmeldung erforderlich.')}</p><a class="button primary" href="${escapeHtml(worldsRecoveryHref(locale,next))}">${t('Bisheriges Konto bestätigen')}</a>`,{status:401,next});
  if(error instanceof Error&&['Expired, replayed or conflicting link','Invalid proof','MANAGED_SESSION_PROOF_REQUIRED'].includes(error.message))return authError(locale,'Die Bestätigung ist abgelaufen oder passt nicht mehr zu deinen Konten. Bitte starte die Übernahme erneut.',409,next);
  return authError(locale,error instanceof GameError?error.message:'Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.',error instanceof GameError?error.status:503,next);
 }
}
