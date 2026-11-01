import {GameError} from './game';
export function checkPublicationOwner(expected:string|null,user:{id:string;guest:boolean}){
 if(expected&&(user.guest||user.id!==expected))throw new GameError('Die erwartete Anmeldung ist nicht mehr aktiv.',401);
}
export function contributionQuota(row?:{hits:unknown;expires_at:unknown;checked_at:unknown}){
 const active=row&&Date.parse(String(row.expires_at))>=Date.parse(String(row.checked_at));
 return {remaining:active?Math.max(0,20-Number(row.hits)):20,resetAt:active?new Date(String(row.expires_at)).toISOString():null};
}
