import {SESSION_COOKIE,type AuthConfig} from '@worlds-hub/auth';
import type {PgQuery} from '@worlds-hub/auth/postgres-links';
import {hasManagedSessionCookie,worldsIdentity,type LearningUser} from './worlds';
import {GameError} from '../game';

export interface ProjectIdentity {
  user?:LearningUser|null;
  error:unknown;
  source:'legacy'|'worlds'|'anonymous';
  authenticated:boolean;
  csrf?:string;
}
type LegacyIdentity=()=>Promise<{user?:LearningUser|null;error:unknown}>;
// Preserve an actually valid legacy identity; never switch an active person's account.
// An expired legacy cookie is not proof of an active session and must not mask Worlds.
export async function resolveProjectIdentity(request:Request,config:AuthConfig|undefined,query:PgQuery,legacy:LegacyIdentity):Promise<ProjectIdentity>{
  const central=config&&(request.headers.get('cookie')??'').split(';').some(value=>value.trim().startsWith(SESSION_COOKIE+'='));
  if(central&&new URL(request.url).origin!==config.origin)throw new GameError('Diese Anfrage ist nicht erlaubt.',403);
  if(!central||hasManagedSessionCookie(request)){
    const local=await legacy();
    if(local.error||local.user)return {...local,source:'legacy',authenticated:!!local.user};
  }
  if(central){
    const identity=await worldsIdentity(request,config,query);
    return {...identity,error:null,source:'worlds'};
  }
  return {error:null,source:'anonymous',authenticated:false};
}
export function requireProjectUser(identity:ProjectIdentity){
  if(identity.error)throw new GameError('Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.',503);
  if(!identity.user)throw new GameError('Bitte melde dich an, um diese Funktion zu nutzen.',401);
  return identity.user;
}
