import { backchannelLogout, callback, logout, sameOrigin, session, startLogin, startLoginLink, type AuthConfig } from "@worlds-hub/auth";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { PostgresAuthStore } from "@worlds-hub/auth/postgres-store";

import {worldsReturnPaths,worldsProjectReturn,worldsManagedLinkPaths,worldsRecoveryHref} from './worlds-link';
import {GameError} from '../game';
import {createWorldsProjectAccount,mappedProjectAccount} from './project-accounts';
import {translate,type Locale} from '../translations';
import {authDocument,authError,escapeHtml,readWorldsForm} from './worlds-document';

export type LearningUser = { id: string; name: string };
export const worldsPaths = ["/auth/login", "/auth/start", "/auth/callback", "/auth/logout", "/auth/backchannel-logout",
  "/auth/status", "/auth/worlds", "/auth/worlds-en", "/auth/worlds/profile", "/auth/worlds/recovery",...worldsManagedLinkPaths];
export const hasManagedSessionCookie = (request: Request) => (request.headers.get("cookie") ?? "").split(";")
  .some(value => value.trim().startsWith("__Secure-neon-auth.session_token="));

export function createWorldsConfig(env: Record<string, string | undefined>, query: PgQuery): AuthConfig | undefined {
  if (env.WORLDS_PILOT_ENABLED !== "true" || !env.WORLDS_CLIENT_ID || !env.WORLDS_ISSUER || !env.WORLDS_RESOURCE) return;
  try {
    const origin = new URL(env.WORLDS_PILOT_ORIGIN ?? "");
    const db = new URL(env.DATABASE_URL ?? "");
    const localAuth = new URL(env.NEON_AUTH_BASE_URL ?? "");
    const issuer = new URL(env.WORLDS_ISSUER);
    const endpoint = db.hostname.split(".")[0].replace(/-pooler$/, "");
    if (origin.protocol !== "https:" || origin.origin !== env.WORLDS_PILOT_ORIGIN ||
        origin.hostname === "sprachwelten.maki26.workers.dev" ||
        !["postgres:", "postgresql:"].includes(db.protocol) ||
        db.hostname !== env.WORLDS_PILOT_DATABASE_HOST ||
        db.hostname.startsWith("ep-ancient-night-b9a3flsm") ||
        localAuth.protocol !== "https:" || !localAuth.hostname.startsWith(endpoint + ".neonauth.") ||
        !localAuth.hostname.endsWith(".neon.tech") || localAuth.pathname !== db.pathname + "/auth" ||
        issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash) return;
    return {
      origin: origin.origin, issuer: issuer.href, resource: env.WORLDS_RESOURCE,
      clientId: env.WORLDS_CLIENT_ID, algorithm: "EdDSA", reauthEnabled:true, store: new PostgresAuthStore(query),
      returnPaths: worldsReturnPaths, signedOutPaths: {de: "/lernen", en: "/en/learn"},
    };
  } catch { return; }
}

export async function worldsIdentity(request: Request, config: AuthConfig, query: PgQuery): Promise<{user?:LearningUser;authenticated:boolean;csrf?:string}> {
  if (new URL(request.url).origin !== config.origin) return {authenticated:false};
  const identity = await session(request, config);
  if (!identity) return {authenticated:false};
  const row=await mappedProjectAccount(identity,query);
  if(row?.active)return {user:{id:row.id,name:row.name},authenticated:true,csrf:identity.csrf};
  return {authenticated:true,csrf:identity.csrf};
}
export async function mappedLearningUser(request:Request,config:AuthConfig,query:PgQuery){
  return (await worldsIdentity(request,config,query)).user;
}

function profileResult(locale:Locale,message:string,status:number){
  return authError(locale,message,status);
}
async function createProfile(request:Request,config:AuthConfig,query:PgQuery,legacyActive:boolean){
 const locale:Locale=new URL(request.url).searchParams.get('locale')==='en'?'en':'de';
 if(request.method!=='POST')return new Response(null,{status:405});
 if(!sameOrigin(request,config.origin))return profileResult(locale,'Diese Anfrage ist nicht erlaubt.',403);
 const identity=await session(request,config);
 if(!identity||typeof identity.email!=='string'||!identity.email)return profileResult(locale,'Bitte melde dich erneut über Worlds Hub an.',401);
 if(legacyActive)return profileResult(locale,'Dein bisheriges Sprachwelten-Konto ist noch aktiv. Seine Beiträge werden keinem neuen Profil zugeordnet.',409);
 let form:URLSearchParams;try{form=await readWorldsForm(request,['csrf']);}catch(error){if(error instanceof GameError)return profileResult(locale,error.message,error.status);throw error;}
 if(form.get('csrf')!==identity.csrf)return profileResult(locale,'Diese Anfrage ist nicht erlaubt.',403);
 try{await createWorldsProjectAccount(identity,query);}catch(error){if(error instanceof GameError)return profileResult(locale,error.message,error.status);throw error;}
 return new Response(null,{status:303,headers:{location:worldsProjectReturn(locale,new URL(request.url).searchParams.get('next')),'cache-control':'no-store'}});
}

export async function worldsRoute(request: Request, config: AuthConfig, query: PgQuery, legacy: boolean|LearningUser=hasManagedSessionCookie(request)) {
  const {pathname} = new URL(request.url);
  const legacyActive=!!legacy;
  if (new URL(request.url).origin !== config.origin) return new Response(null, {status: 404});
  if (pathname === "/auth/worlds/profile") return createProfile(request,config,query,legacyActive);
  if (pathname === "/auth/start") return startLoginLink(request, config);
  if (pathname === "/auth/login") return startLogin(request, config);
  if (pathname === "/auth/callback") return callback(request, config);
  if (pathname === "/auth/logout") return logout(request, config);
  if (pathname === "/auth/backchannel-logout") return backchannelLogout(request, config);
  if (!["/auth/status", "/auth/worlds", "/auth/worlds-en", "/auth/worlds/recovery"].includes(pathname)) return new Response(null, {status: 404});
  if (request.method !== "GET") return new Response(null, {status: 405});
  const identity = await session(request, config);
  const mapped=identity?await mappedProjectAccount(identity,query):undefined;
  const user=mapped?.active?{id:mapped.id,name:mapped.name}:undefined;
  // UI eligibility only. This never authenticates a native owner or writes a
  // mapping; both proofs are revalidated by the existing confirmation routes.
  if(pathname==='/auth/worlds/recovery')return Response.json({eligible:!!identity&&!mapped},{status:!identity?401:mapped?409:200,headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  if (pathname === "/auth/status") return Response.json({user: legacyActive ? null : user ?? null});
  const en = pathname === "/auth/worlds-en";
  const title = translate('Worlds-Anmeldung',en?'en':'de');
  const continueLabel = translate("Weiter zu Sprachwelten",en?"en":"de");
  const loginLabel = translate('Mit Worlds anmelden',en?'en':'de');
  const logoutLabel = translate('In Sprachwelten von Worlds abmelden',en?'en':'de');
  const learning = worldsProjectReturn(en?"en":"de",new URL(request.url).searchParams.get("next"));
  const locale = en ? "en" : "de";
  const t=(text:string)=>escapeHtml(translate(text,locale));
  const sameOwner=typeof legacy==='object'&&legacy.id===user?.id;
  const status = mapped&&!mapped.active ? `<p>${t('Dieses Sprachwelten-Profil ist nicht verfügbar. Bitte wende dich an die Administration.')}</p>` : user && legacyActive&&!sameOwner
    ? `<p>${t('Melde dich vor dem Wechsel zu Worlds von deinem aktuellen Sprachwelten-Konto ab.')}</p><p><a href="${learning}">${t('Zurück zum Lernen')}</a></p>`
    : user ? `<p>${sameOwner?t('Dieses Konto ist bereits mit Worlds verbunden.'):''}</p><p><a class="button primary" href="${learning}">${continueLabel}</a></p>` : identity
    ? `<p>${t('Diese Worlds-Identität ist noch keinem Sprachwelten-Konto zugeordnet.')}</p>`
    : `<a href="/auth/start?next=${pathname}&amp;ui_locales=${locale}">${loginLabel}</a>`;
  const create = identity&&!mapped&&!legacyActive&&/^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<p><a class="button primary" href="${escapeHtml(worldsRecoveryHref(locale,learning))}">${t('Ich habe bereits ein Sprachwelten-Konto')}</a></p><p>${t('Bestätige dein bisheriges Konto einmalig, damit deine Beiträge und Lernstände erhalten bleiben.')}</p><p>${t('Du kannst Sprachwelten mit deinem Worlds-Konto verwenden. Bestehende Beiträge anderer oder bisheriger Konten werden dabei nicht übernommen.')}</p><form method="post" action="/auth/worlds/profile?locale=${locale}&amp;next=${encodeURIComponent(learning)}"><input type="hidden" name="csrf" value="${identity.csrf}"><button>${t('Sprachwelten mit Worlds verwenden')}</button></form>` : '';
  const takeover=identity&&!mapped&&legacyActive&&/^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<p>${t('Deine bisherige Sprachwelten-Anmeldung ist aktiv. Du kannst dein bestehendes Konto mit Worlds verbinden.')}</p><form method="post" action="/auth/worlds/link?locale=${locale}&amp;next=${encodeURIComponent(learning)}"><input type="hidden" name="csrf" value="${identity.csrf}"><button class="primary">${t('Bisheriges Konto übernehmen')}</button></form>`:'';
  const signOut = identity && /^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<form method="post" action="/auth/logout?locale=${locale}"><input type="hidden" name="csrf" value="${identity.csrf}"><button>${logoutLabel}</button></form>`
    : "";
  return authDocument(locale,title,status+takeover+create+signOut,{next:learning});
}
