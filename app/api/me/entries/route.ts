import {account,respond,safe} from '@/lib/http';
import {ownEntries} from '@/db/community-repository';
import {publicEntry} from '@/lib/content-public';
export const GET=(request:Request)=>safe(async()=>{const user=await account(),params=new URL(request.url).searchParams,offset=Math.max(0,Math.floor(Number(params.get('offset'))||0)),query=(params.get('q')??'').trim().slice(0,200);const data=await ownEntries(user.id,offset,query,params.get('area')==='learn'?'learn':'play');return respond({...data,entries:data.entries.map(publicEntry)});});
