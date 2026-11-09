import { backchannelLogout, callback, logout, sameOrigin, session, startLogin, startLoginLink, type AuthConfig } from "@worlds-hub/auth";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { PostgresAuthStore } from "@worlds-hub/auth/postgres-store";

import {worldsReturnPaths,worldsProjectReturn} from './worlds-link';
import {GameError} from '../game';
import {createWorldsProjectAccount,mappedProjectAccount} from './project-accounts';
import {translate,type Locale} from '../translations';

export type LearningUser = { id: string; name: string };
export const worldsPaths = ["/auth/login", "/auth/start", "/auth/callback", "/auth/logout", "/auth/backchannel-logout",
  "/auth/status", "/auth/worlds", "/auth/worlds-en", "/auth/worlds/profile"];
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
      clientId: env.WORLDS_CLIENT_ID, algorithm: "EdDSA", store: new PostgresAuthStore(query),
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
  const t=(text:string)=>translate(text,locale),account=locale==='en'?'/auth/worlds-en':'/auth/worlds';
  return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${t('Worlds-Anmeldung')} | Sprachwelten</title><main><h1>${t('Worlds-Anmeldung')}</h1><p role="alert">${t(message)}</p><a href="${account}">${t('Zurück zur Anmeldung')}</a></main></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
async function createProfile(request:Request,config:AuthConfig,query:PgQuery,legacyActive:boolean){
 const locale:Locale=new URL(request.url).searchParams.get('locale')==='en'?'en':'de';
 if(request.method!=='POST')return new Response(null,{status:405});
 if(!sameOrigin(request,config.origin))return profileResult(locale,'Diese Anfrage ist nicht erlaubt.',403);
 const identity=await session(request,config);
 if(!identity||typeof identity.email!=='string'||!identity.email)return profileResult(locale,'Bitte melde dich erneut über Worlds Hub an.',401);
 if(legacyActive)return profileResult(locale,'Dein bisheriges Sprachwelten-Konto ist noch aktiv. Seine Beiträge werden keinem neuen Profil zugeordnet.',409);
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return profileResult(locale,'Diese Anfrage ist nicht erlaubt.',415);
 const reader=request.body?.getReader();if(!reader)return profileResult(locale,'Bitte die Eingaben prüfen.',400);
 const chunks:Uint8Array[]=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2048){await reader.cancel();return profileResult(locale,'Diese Eingabe ist zu lang.',413);}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=new URLSearchParams(new TextDecoder().decode(bytes));
 if(form.size!==1||form.getAll('csrf').length!==1||form.get('csrf')!==identity.csrf)return profileResult(locale,'Diese Anfrage ist nicht erlaubt.',403);
 try{await createWorldsProjectAccount(identity,query);}catch(error){if(error instanceof GameError)return profileResult(locale,error.message,error.status);throw error;}
 return new Response(null,{status:303,headers:{location:worldsProjectReturn(locale,new URL(request.url).searchParams.get('next')),'cache-control':'no-store'}});
}

export async function worldsRoute(request: Request, config: AuthConfig, query: PgQuery, legacyActive=hasManagedSessionCookie(request)) {
  const {pathname} = new URL(request.url);
  if (new URL(request.url).origin !== config.origin) return new Response(null, {status: 404});
  if (pathname === "/auth/worlds/profile") return createProfile(request,config,query,legacyActive);
  if (pathname === "/auth/start") return startLoginLink(request, config);
  if (pathname === "/auth/login") return startLogin(request, config);
  if (pathname === "/auth/callback") return callback(request, config);
  if (pathname === "/auth/logout") return logout(request, config);
  if (pathname === "/auth/backchannel-logout") return backchannelLogout(request, config);
  if (!["/auth/status", "/auth/worlds", "/auth/worlds-en"].includes(pathname)) return new Response(null, {status: 404});
  if (request.method !== "GET") return new Response(null, {status: 405});
  const identity = await session(request, config);
  const mapped=identity?await mappedProjectAccount(identity,query):undefined;
  const user=mapped?.active?{id:mapped.id,name:mapped.name}:undefined;
  if (pathname === "/auth/status") return Response.json({user: legacyActive ? null : user ?? null});
  const en = pathname === "/auth/worlds-en";
  const title = en ? "Worlds sign-in" : "Worlds-Anmeldung";
  const continueLabel = translate("Weiter zu Sprachwelten",en?"en":"de");
  const loginLabel = en ? "Sign in with Worlds" : "Mit Worlds anmelden";
  const logoutLabel = en ? "Sign out of Worlds in Sprachwelten" : "In Sprachwelten von Worlds abmelden";
  const learning = worldsProjectReturn(en?"en":"de",new URL(request.url).searchParams.get("next"));
  const locale = en ? "en" : "de";
  const t=(text:string)=>translate(text,locale);
  const status = mapped&&!mapped.active ? `<p>${t('Dieses Sprachwelten-Profil ist nicht verfügbar. Bitte wende dich an die Administration.')}</p>` : user && legacyActive
    ? `<p>${en ? "Sign out of your current Sprachwelten account before switching to Worlds." : "Melde dich vor dem Wechsel zu Worlds von deinem aktuellen Sprachwelten-Konto ab."}</p><p><a href="${learning}">${en ? "Return to learning" : "Zurück zum Lernen"}</a></p>`
    : user ? `<p><a href="${learning}">${continueLabel}</a></p>` : identity
    ? `<p>${en ? "This Worlds identity has no linked Sprachwelten account." : "Diese Worlds-Identität ist noch keinem Sprachwelten-Konto zugeordnet."}</p>`
    : `<a href="/auth/start?next=${pathname}&amp;ui_locales=${locale}">${loginLabel}</a>`;
  const create = identity&&!mapped&&!legacyActive&&/^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<p>${t('Du kannst Sprachwelten mit deinem Worlds-Konto verwenden. Bestehende Beiträge anderer oder bisheriger Konten werden dabei nicht übernommen.')}</p><form method="post" action="/auth/worlds/profile?locale=${locale}&amp;next=${encodeURIComponent(learning)}"><input type="hidden" name="csrf" value="${identity.csrf}"><button>${t('Sprachwelten mit Worlds verwenden')}</button></form>` : '';
  const signOut = identity && /^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<form method="post" action="/auth/logout?locale=${locale}"><input type="hidden" name="csrf" value="${identity.csrf}"><button>${logoutLabel}</button></form>`
    : "";
  return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} | Sprachwelten</title><main><h1>${title}</h1>${status}${create}${signOut}</main></html>`,
    {headers: {"content-type": "text/html; charset=utf-8"}});
}
