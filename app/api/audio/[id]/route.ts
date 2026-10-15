import { z } from 'zod';
import { account, respond, safe } from '@/lib/http';
import { database } from '@/db/repository';
import { GameError } from '@/lib/game';
import { audioBucket } from '@/lib/audio-storage';
type Context={params:Promise<{id:string}>};
export const GET=(request:Request,ctx:Context)=>safe(async()=>{
  const id=z.uuid().parse((await ctx.params).id);const rows=await database()`SELECT storage_key,byte_size FROM pronunciation_audio a WHERE id=${id} AND EXISTS(SELECT 1 FROM content_entries e WHERE e.audio_id=a.id)`;
  if(!rows[0])throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
  const bucket=await audioBucket();if(!bucket)throw new GameError('Audio ist momentan nicht verfügbar.',503);
  const size=Number(rows[0].byte_size);const requested=request.headers.get('range');let range:{offset:number;length:number}|undefined;
  if(requested){const match=/^bytes=(\d*)-(\d*)$/.exec(requested);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});range={offset:start,length:end-start+1};}
  const object=await bucket.get(rows[0].storage_key,range?{range}:undefined);if(!object)throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
  const headers=new Headers({'Content-Type':'audio/wav','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline; filename="pronunciation.wav"'});
  if(range){headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${object.size}`);headers.set('Content-Length',String(range.length));return new Response(object.body as ReadableStream,{status:206,headers});}
  headers.set('Content-Length',String(object.size));return new Response(object.body as ReadableStream,{headers});
});
export const DELETE=(request:Request,ctx:Context)=>safe(async()=>{
  const user=await account();if(request.headers.get('origin')!==new URL(request.url).origin)throw new GameError('Diese Anfrage ist nicht erlaubt.',403);
  const id=z.uuid().parse((await ctx.params).id);const sql=database();const rows=await sql`WITH removed AS (DELETE FROM pronunciation_audio a WHERE id=${id} AND owner_id=${user.id} AND NOT EXISTS(SELECT 1 FROM content_entries e WHERE e.audio_id=a.id) RETURNING storage_key), budget AS (UPDATE audio_upload_budget SET clips=greatest(0,clips-(SELECT count(*)::integer FROM removed)) WHERE key='global') SELECT storage_key FROM removed`;
  if(rows[0])await (await audioBucket())?.delete(rows[0].storage_key);return respond({removed:!!rows.length});
});
