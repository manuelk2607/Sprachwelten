import {requireAdministrator} from '@/lib/admin';
import {body,respond,safe} from '@/lib/http';
import {inbox} from '@/db/community-repository';
import {database} from '@/db/repository';
import {z} from 'zod';
export const GET=()=>safe(async()=>respond(await inbox(await requireAdministrator())));
export const POST=(request:Request)=>safe(async()=>{const admin=await requireAdministrator();await body(request,z.object({action:z.literal('seen')}));await database()`INSERT INTO admin_inbox_seen(user_id,last_seen_at) VALUES (${admin},now()) ON CONFLICT (user_id) DO UPDATE SET last_seen_at=now()`;return respond({ok:true});});
