import {account,respond,safe} from '@/lib/http';
import {ownSuggestions} from '@/db/community-repository';
export const GET=(request:Request)=>safe(async()=>{
 const user=await account(),offset=Math.max(0,Math.floor(Number(new URL(request.url).searchParams.get('offset'))||0));
 return respond(await ownSuggestions(user.id,offset));
});
