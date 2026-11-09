import {logout,sameOrigin,session,type AuthConfig} from '@worlds-hub/auth';
import {NEON_AUTH_COOKIE_PREFIX,NEON_AUTH_SESSION_COOKIE_NAME,NEON_AUTH_SESSION_DATA_COOKIE_NAME,NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME,serializeSetCookie} from '@neondatabase/auth/server';
import {authError,readWorldsForm} from './worlds-document';
import {GameError} from '../game';

/** Ends both local credentials during migration. The Hub's independent native
 * cookie is on another host and is never forwarded, changed or revoked here. */
export async function projectLogout(request:Request,config:AuthConfig,nativeSignOut:()=>Promise<Response>){
 const locale=new URL(request.url).searchParams.get('locale')==='en'?'en':'de';
 if(request.method!=='POST')return authError(locale,'Diese Anfrage ist nicht erlaubt.',405);
 if(new URL(request.url).origin!==config.origin||!sameOrigin(request,config.origin))return authError(locale,'Diese Anfrage ist nicht erlaubt.',403);
 try{
  const current=await session(request,config);if(!current)return authError(locale,'Bitte melde dich erneut über Worlds Hub an.',401);
  const form=await readWorldsForm(request,['csrf']);if(form.get('csrf')!==current.csrf)return authError(locale,'Diese Anfrage ist nicht erlaubt.',403);
  const cookies=(request.headers.get('cookie')??'').split(';').map(value=>value.trim());
  if(cookies.filter(value=>value.startsWith(NEON_AUTH_SESSION_COOKIE_NAME+'=')).length>1)return authError(locale,'Diese Anfrage ist nicht erlaubt.',403);
  let native:Response|undefined;
  if(cookies.some(value=>value.startsWith(NEON_AUTH_COOKIE_PREFIX+'.'))){
   native=await nativeSignOut();
   if(!native.ok&&native.status!==401)return authError(locale,'Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',503);
  }
  const headers=new Headers(request.headers);headers.delete('content-length');
  const response=await logout(new Request(request.url,{method:'POST',headers,body:new URLSearchParams({csrf:current.csrf})}),config);
  if(response.status!==303)return authError(locale,'Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',response.status);
  const result=new Headers(response.headers);
  for(const cookie of native?.headers.getSetCookie()??[])result.append('set-cookie',cookie);
  for(const name of [NEON_AUTH_SESSION_COOKIE_NAME,NEON_AUTH_SESSION_DATA_COOKIE_NAME,NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME]){
   result.append('set-cookie',serializeSetCookie({name,value:'',path:'/',httpOnly:true,secure:true,sameSite:'lax',maxAge:0,expires:new Date(0)}));
  }
  return new Response(null,{status:303,headers:result});
 }catch(error){return authError(locale,error instanceof GameError?error.message:'Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',error instanceof GameError?error.status:503);}
}
