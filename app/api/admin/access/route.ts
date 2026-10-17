import {inboxCount} from '@/db/community-repository';
import {getAuth} from '@/lib/auth/server';
import {isAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
export const GET=()=>safe(async()=>{const {data}=await getAuth().getSession();const isAdmin=!!data?.user&&await isAdministrator(data.user.id);const unreadCount=isAdmin?await inboxCount(data!.user.id):0;return respond({isAdmin,unreadCount});});
