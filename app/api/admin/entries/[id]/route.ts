import {z} from 'zod';
import {requireAdministrator} from '@/lib/admin';
import {body,respond,safe} from '@/lib/http';
import {entryInput} from '@/lib/content';
import {editAdminEntry,moderateEntry} from '@/db/admin-repository';
type Context={params:Promise<{id:string}>};
const editInput=z.object({revision:z.number().int().min(0)}).passthrough().transform((data)=>({revision:data.revision,input:entryInput.parse(data)}));
export const PATCH=(request:Request,ctx:Context)=>safe(async()=>{const admin=await requireAdministrator();const id=z.uuid().parse((await ctx.params).id),data=await body(request,editInput);await editAdminEntry(id,data.input,data.revision,admin);return respond({ok:true});});
export const DELETE=(request:Request,ctx:Context)=>safe(async()=>{const admin=await requireAdministrator();const id=z.uuid().parse((await ctx.params).id),data=await body(request,z.object({revision:z.number().int().min(0),restore:z.boolean().optional()}));await moderateEntry(id,data.revision,!data.restore,admin);return respond({ok:true});});
