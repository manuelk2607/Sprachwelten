import {z} from 'zod';
import {rateLimit} from '@/db/repository';
import {account,body,respond,safe} from '@/lib/http';
import {notebookInput} from '@/lib/vocabulary';
import {deleteNotebook,updateNotebook} from '@/db/notebooks';
type Context={params:Promise<{id:string}>};
export const PATCH=(request:Request,context:Context)=>safe(async()=>{const {id}=await context.params;z.uuid().parse(id);const input=await body(request,notebookInput.safeExtend({revision:z.number().int().positive()})),user=await account();await rateLimit('notebook-write:'+user.id,120);return respond({notebook:await updateNotebook(user.id,id,input,input.revision)});});
export const DELETE=(request:Request,context:Context)=>safe(async()=>{const {id}=await context.params;z.uuid().parse(id);const input=await body(request,z.object({revision:z.number().int().positive()})),user=await account();await rateLimit('notebook-write:'+user.id,120);await deleteNotebook(user.id,id,input.revision);return respond({deleted:true});});
