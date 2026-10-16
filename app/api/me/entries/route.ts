import {account,respond,safe} from '@/lib/http';
import {ownEntries} from '@/db/community-repository';
import {publicEntry} from '@/lib/content-public';
export const GET=(request:Request)=>safe(async()=>{const user=await account(),offset=Math.max(0,Math.floor(Number(new URL(request.url).searchParams.get('offset'))||0));const data=await ownEntries(user.id,offset);return respond({...data,entries:data.entries.map(publicEntry)});});
