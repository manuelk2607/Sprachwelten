import {inbox} from '@/db/community-repository';
import {getAuth} from '@/lib/auth/server';
import {isAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
export const GET=()=>safe(async()=>{const {data}=await getAuth().getSession();const isAdmin=!!data?.user&&await isAdministrator(data.user.id);const feed=isAdmin?await inbox(data!.user.id):null;return respond({isAdmin,unreadCount:feed?(feed.unreadCount+feed.pendingSuggestions):0});});
