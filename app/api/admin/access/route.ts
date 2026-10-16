import {getAuth} from '@/lib/auth/server';
import {isAdministrator} from '@/lib/admin';
import {respond,safe} from '@/lib/http';
export const GET=()=>safe(async()=>{const {data}=await getAuth().getSession();return respond({isAdmin:!!data?.user&&await isAdministrator(data.user.id)});});
