import {z} from 'zod';
import {account,body,respond,safe} from '@/lib/http';
import {entryEditInput} from '@/lib/community-input';
import {suggestEntry} from '@/db/community-repository';
import {rateLimit} from '@/db/repository';
export const POST=(request:Request,ctx:{params:Promise<{id:string}>})=>safe(async()=>{const user=await account(),id=z.uuid().parse((await ctx.params).id),data=await body(request,entryEditInput);await rateLimit('suggestion:'+user.id,20);return respond({id:await suggestEntry(id,data.input,data.revision,data.note,user)},201);});
