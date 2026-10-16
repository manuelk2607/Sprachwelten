import {requireAdministrator} from '@/lib/admin';
import {body,respond,safe} from '@/lib/http';
import {bulkInput} from '@/lib/community-input';
import {bulkEdit} from '@/db/community-repository';
export const POST=(request:Request)=>safe(async()=>{const admin=await requireAdministrator(),data=await body(request,bulkInput);await bulkEdit(data,admin);return respond({ok:true,count:data.entries.length});});
