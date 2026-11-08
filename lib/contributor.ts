import {projectIdentity} from './auth/learning-session';
import {GameError} from './game';
import {hashToken,randomToken} from './http';
import {guestCredential,withGuestCredential} from './guest-contributor';
import {rateLimit} from '@/db/repository';

export type Contributor={id:string;name:string;guest:boolean;token?:string};
export async function contributor(request:Request):Promise<Contributor>{
  const {user,error,source}=await projectIdentity(request);
  if(error)throw new GameError('Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.',503);
  if(user)return {id:user.id,name:user.name?.trim().slice(0,60)||'Mitglied',guest:false};
  if(source==='worlds')throw new GameError('Bitte melde dich an, um diese Funktion zu nutzen.',401);
  const token=guestCredential(request)??randomToken();
  return {id:'guest:'+await hashToken(token),name:'Gast',guest:true,token};
}
export const withContributor=(response:Response,request:Request,user:Contributor)=>withGuestCredential(response,request,user.token);
export async function limitContribution(request:Request,user:Contributor,scope:'entry'|'audio'|'region'){
  const max=scope==='region'?10:20,seconds=scope==='audio'?86400:3600;
  // A second, hashed IP quota prevents resetting a guest cookie to bypass limits.
  if(user.guest)await rateLimit(`guest-${scope}-ip:${await hashToken(request.headers.get('cf-connecting-ip')??'local')}`,max,seconds);
  await rateLimit(`${scope}:${user.id}`,user.guest?Math.floor(max/2):max,seconds);
}
