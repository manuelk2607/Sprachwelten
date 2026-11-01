import {database} from '@/db/repository';
import {account,respond,safe} from '@/lib/http';
import {contributionQuota} from '@/lib/contribution-publication';

// Read-only; identity always comes from the managed session.
export const GET=()=>safe(async()=>{
 const user=await account();
 const rows=await database()`SELECT hits,expires_at,now() AS checked_at FROM request_limits WHERE key=${'entry:'+user.id}`;
 return respond(contributionQuota(rows[0] as {hits:unknown;expires_at:unknown;checked_at:unknown}|undefined));
});
