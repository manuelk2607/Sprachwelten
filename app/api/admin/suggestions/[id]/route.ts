import {z} from 'zod';
import {requireAdministrator} from '@/lib/admin';
import {body,respond,safe} from '@/lib/http';
import {entryInput} from '@/lib/content';
import {reviewSuggestion} from '@/db/community-repository';
export const PATCH=(request:Request,ctx:{params:Promise<{id:string}>})=>safe(async()=>{const admin=await requireAdministrator(),id=z.uuid().parse((await ctx.params).id),data=await body(request,z.object({revision:z.number().int().min(0),action:z.enum(['accept','reject']),input:entryInput.optional(),note:z.string().trim().max(1000).default(''),feedback:z.string().trim().max(1000).default('')}));await reviewSuggestion(id,data.revision,data.action,admin,data.input,data.note,data.feedback);return respond({ok:true});});
