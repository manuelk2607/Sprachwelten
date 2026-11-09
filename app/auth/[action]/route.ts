import { rateLimit } from "@/db/repository";
import { GameError } from "@/lib/game";
import { hashToken } from "@/lib/http";
import { projectIdentity, projectManagedOwner, worldsConfig, worldsQuery } from "@/lib/auth/learning-session";
import { worldsPaths, worldsRoute } from "@/lib/auth/worlds";
import {projectStatus} from '@/lib/auth/project-identity';
import {managedLinkRoute} from '@/lib/auth/worlds-managed-link';
import {worldsManagedLinkPaths,worldsProjectReturn} from '@/lib/auth/worlds-link';
import {authError} from '@/lib/auth/worlds-document';
import {projectLogout} from '@/lib/auth/worlds-logout';
import {getAuth} from '@/lib/auth/server';
import {session as worldsSession} from '@worlds-hub/auth';

async function handle(request: Request) {
  const config = worldsConfig();
  const url = new URL(request.url);
  let response: Response;
  if (!config || url.origin !== config.origin || !worldsPaths.includes(url.pathname)) response = new Response(null, {status: 404});
  else if((url.pathname==='/auth/worlds/profile'||worldsManagedLinkPaths.includes(url.pathname))&&request.method!=='POST')response=new Response(null,{status:405});
  else if(['/auth/status','/auth/worlds','/auth/worlds-en'].includes(url.pathname)&&request.method!=='GET')response=new Response(null,{status:405});
  else {
    try {
      const ip = await hashToken(request.headers.get("cf-connecting-ip") ?? "local");
      await rateLimit("worlds:" + url.pathname + ":" + ip, ["/auth/login","/auth/start"].includes(url.pathname) ? 12 : url.pathname==='/auth/worlds/profile'||worldsManagedLinkPaths.includes(url.pathname)?5:60, 60);
      if(worldsManagedLinkPaths.includes(url.pathname)){
        response=await managedLinkRoute(request,config,worldsQuery,()=>projectManagedOwner(request,config));
      }else if(url.pathname==='/auth/logout'){
        response=await projectLogout(request,config,()=>{
          const headers=new Headers(request.headers);headers.set('content-type','application/json');headers.delete('content-length');
          return getAuth().handler().POST(new Request(new URL('/api/auth/sign-out',request.url),{method:'POST',headers,body:'{}'}),{params:Promise.resolve({path:['sign-out']})});
        });
      }else if(url.pathname==='/auth/status'){
        const status=projectStatus(await projectIdentity(request));
        if(status.source==='legacy')status.csrf=(await worldsSession(request,config))?.csrf;
        response=Response.json(status);
      }else if(['/auth/worlds','/auth/worlds-en','/auth/worlds/profile'].includes(url.pathname)){
        const identity=await projectIdentity(request);if(identity.error)throw identity.error;
        response=await worldsRoute(request,config,worldsQuery,identity.source==='legacy'?identity.user??false:false);
      }else response = await worldsRoute(request, config, worldsQuery);
    } catch (error) {
      const locale=url.pathname==='/auth/worlds-en'||url.searchParams.get('locale')==='en'||url.searchParams.get('ui_locales')==='en'?'en':'de';
      response = authError(locale,error instanceof GameError?error.message:'Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.',error instanceof GameError?error.status:503,worldsProjectReturn(locale,url.searchParams.get('next')));
    }
  }
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  // Origin-only referrers keep form Origin headers usable for CSRF checks and
  // never forward callback codes or other private query parameters.
  headers.set("referrer-policy", "strict-origin");
  headers.set("x-content-type-options", "nosniff");
  if(!headers.has('content-security-policy'))headers.set("content-security-policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https:");
  return new Response(response.body, {status: response.status, headers});
}
export const GET = handle;
export const POST = handle;
