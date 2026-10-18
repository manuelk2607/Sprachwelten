import {body,respond,safe} from '@/lib/http';
import {contributor,limitContribution,withContributor} from '@/lib/contributor';
import {addRegion,listRegions,regionInput} from '@/db/regions';
export const GET=()=>safe(async()=>respond({regions:await listRegions()}));
export const POST=(request:Request)=>safe(async()=>{const input=await body(request,regionInput),user=await contributor(request);await limitContribution(request,user,'region');return withContributor(respond({id:await addRegion(input,user.id),regions:await listRegions()},201),request,user);});
