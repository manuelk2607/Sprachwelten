import {createHash} from 'node:crypto';
import {z} from 'zod';
import {entryInput,type EntryInput} from '../lib/content';
export const ownerId='365f639e-7f9f-4c42-8260-a3398cceb219';
export const origin='https://sprachwelten.maki26.workers.dev';
export const digest=(input:EntryInput)=>createHash('sha256').update(JSON.stringify(entryInput.parse(input))).digest('hex');
const item=z.object({id:z.string(),status:z.enum(['pending','published','failed']),input:entryInput,attempts:z.number().int().nonnegative(),entryId:z.string().uuid().optional(),error:z.string().optional(),verifiedAt:z.string().datetime().optional(),disposition:z.enum(['created','existing']).optional()});
export const queueSchema=z.object({version:z.literal(1),ownerId:z.literal(ownerId),origin:z.literal(origin),notBefore:z.string().datetime(),items:z.array(item)}).superRefine((q,ctx)=>{
 const seen=new Set<string>();
 q.items.forEach((v,i)=>{if(v.id!==digest(v.input)||seen.has(v.id)||(v.status==='published'&&(!v.entryId||!v.verifiedAt)))ctx.addIssue({code:'custom',path:['items',i],message:'Invalid queue identity or publication receipt'});seen.add(v.id);});
});
export type PublicationQueue=z.infer<typeof queueSchema>;
export function createQueue(inputs:EntryInput[]):PublicationQueue{
 return queueSchema.parse({version:1,ownerId,origin,notBefore:'2026-11-01T16:28:48.000Z',items:inputs.map(input=>({id:digest(input),status:'pending',input,attempts:0}))});
}
export const summary=(q:PublicationQueue)=>Object.fromEntries(['pending','published','failed'].map(status=>[status,q.items.filter(i=>i.status===status).length]));
