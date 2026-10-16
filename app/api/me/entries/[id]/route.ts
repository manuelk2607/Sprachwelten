import {z} from 'zod';
import {account,body,respond,safe} from '@/lib/http';
import {entryEditInput} from '@/lib/community-input';
import {ownsEntry} from '@/db/community-repository';
import {GameError} from '@/lib/game';
import {editAdminEntry,moderateEntry} from '@/db/admin-repository';
type Context={params:Promise<{id:string}>};
export const PATCH=(request:Request,ctx:Context)=>safe(async()=>{const user=await account(),id=z.uuid().parse((await ctx.params).id),data=await body(request,entryEditInput);await editAdminEntry(id,data.input,data.revision,user.id,{ownerOnly:true});return respond({ok:true});});
export const DELETE=(request:Request,ctx:Context)=>safe(async()=>{const user=await account(),id=z.uuid().parse((await ctx.params).id),data=await body(request,z.object({revision:z.number().int().min(0)}));if(!await ownsEntry(id,user.id))throw new GameError('Du kannst nur eigene Beiträge löschen.',403);await moderateEntry(id,data.revision,true,user.id,true);return respond({ok:true});});
