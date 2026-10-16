import {account,body,respond,safe} from '@/lib/http';
import {addRegion,listRegions,regionInput} from '@/db/regions';
import {rateLimit} from '@/db/repository';
export const GET=()=>safe(async()=>respond({regions:await listRegions()}));
export const POST=(request:Request)=>safe(async()=>{const user=await account(),input=await body(request,regionInput);await rateLimit('region:'+user.id,10);return respond({id:await addRegion(input,user.id),regions:await listRegions()},201);});
