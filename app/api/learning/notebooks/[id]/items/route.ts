import {z} from 'zod';
import {account,body,respond,safe} from '@/lib/http';
import {changeNotebookItems} from '@/db/notebooks';
import {rateLimit} from '@/db/repository';
const input=z.object({action:z.enum(['add','remove','move']),revision:z.number().int().positive(),entryIds:z.array(z.uuid()).min(1).max(100).refine(ids=>new Set(ids).size===ids.length),targetId:z.uuid().optional()}).refine(v=>v.action!=='move'||!!v.targetId,'Bitte ein Zielheft wählen.');
export const POST=(request:Request,context:{params:Promise<{id:string}>})=>safe(async()=>{const {id}=await context.params;z.uuid().parse(id);const value=await body(request,input),user=await account();await rateLimit('notebook-items:'+user.id,120);await changeNotebookItems(user.id,id,value.revision,value.action,value.entryIds,value.targetId);return respond({saved:true});});
