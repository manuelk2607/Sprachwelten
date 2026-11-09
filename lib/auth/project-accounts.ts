import type {PgQuery} from '@worlds-hub/auth/postgres-links';
import {GameError} from '../game';
import type {Identity} from '@worlds-hub/auth/store';

/** The caller must already have authenticated the native owner. This helper is
 * never an endpoint accepting a browser-selected account ID. No native Auth row
 * is created or changed; only the application's ownership profile is prepared. */
export async function prepareLegacyProjectAccount(id:string,query:PgQuery){
 await query(`INSERT INTO worlds_project_accounts(id,kind,legacy_user_id,display_name)
  SELECT id,'legacy',id,left(coalesce(nullif(btrim(name),''),'Worlds'),120)
  FROM neon_auth."user" WHERE id=$1::uuid AND (banned IS DISTINCT FROM true OR "banExpires"<=now())
  ON CONFLICT(id) DO NOTHING`,[id]);
 const [row]=await query(`SELECT a.id FROM worlds_project_accounts a JOIN neon_auth."user" u ON u.id=a.legacy_user_id
  WHERE a.id=$1::uuid AND a.kind='legacy' AND a.disabled=false
  AND (u.banned IS DISTINCT FROM true OR u."banExpires"<=now())`,[id]);
 if(typeof row?.id!=='string')throw new Error('Authenticated legacy profile could not be prepared');
 return row.id;
}
export async function mappedProjectAccount(identity:Identity,query:PgQuery){
 const [row]=await query(`SELECT a.id,a.kind,CASE WHEN a.kind='legacy' THEN u.name ELSE a.display_name END AS name,
   (NOT a.disabled AND (a.kind='worlds' OR (u.id IS NOT NULL AND (u.banned IS DISTINCT FROM true OR u."banExpires"<=now())))) AS active
  FROM worlds_identity_links l JOIN worlds_project_accounts a ON a.id=l.local_user_id
  LEFT JOIN neon_auth."user" u ON u.id=a.legacy_user_id
  WHERE l.issuer=$1 AND l.subject=$2`,[identity.issuer,identity.sub]);
 if(!row)return;
 // A removed native account remains identifiable for audit but cannot sign in.
 return {id:String(row.id),name:typeof row.name==='string'?row.name:'Worlds',active:row.active===true,kind:row.kind};
}
export async function createWorldsProjectAccount(identity:Identity,query:PgQuery){
 const lookup=()=>mappedProjectAccount(identity,query);
 const current=await lookup();
 if(current){if(!current.active)throw new GameError('Dieses Sprachwelten-Profil ist nicht verfügbar. Bitte wende dich an die Administration.',403);return current.id;}
 const name=typeof identity.name==='string'?Array.from(identity.name.trim()).slice(0,120).join(''):'';
 try{
  const [row]=await query(`WITH created AS (
    INSERT INTO worlds_project_accounts(kind,display_name) VALUES('worlds',$3) RETURNING id
   ), linked AS (
    INSERT INTO worlds_identity_links(issuer,subject,local_user_id)
    SELECT $1,$2,id FROM created RETURNING local_user_id
   ), audited AS (
    INSERT INTO worlds_link_audit(issuer,subject,local_user_id,event)
    SELECT $1,$2,local_user_id,'linked' FROM linked RETURNING local_user_id
   ) SELECT local_user_id AS id FROM audited`,[identity.issuer,identity.sub,name||'Worlds']);
  if(typeof row?.id!=='string')throw new Error('Project profile creation was not confirmed');
  return row.id;
 }catch(error){
  // Concurrent creation must roll back the entire statement, including its new
  // profile. Only the winner's exact issuer/subject mapping may be reused.
  if(error&&typeof error==='object'&&'code' in error&&error.code==='23505'){
   const winner=await lookup();if(winner){if(!winner.active)throw new GameError('Dieses Sprachwelten-Profil ist nicht verfügbar. Bitte wende dich an die Administration.',403);return winner.id;}
  }
  throw error;
 }
}
