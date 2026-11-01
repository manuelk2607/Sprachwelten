import {learningEntryInput} from '@/lib/content';
import {body,respond,safe} from '@/lib/http';
import {contributor,limitContribution,withContributor} from '@/lib/contributor';
import {addEntry} from '@/db/repository';
import {publicEntry} from '@/lib/content-public';
export const POST=(request:Request)=>safe(async()=>{const input=await body(request,learningEntryInput),user=await contributor(request);await limitContribution(request,user,'entry');const entry=await addEntry(input,user.id,user.name);return withContributor(respond({entry:publicEntry(entry)},201),request,user);});
