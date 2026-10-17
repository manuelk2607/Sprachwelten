import { z } from 'zod';
import {getAuth} from '@/lib/auth/server';
import {isAdministrator} from '@/lib/admin';
import { account, respond, safe } from '@/lib/http';
import { database } from '@/db/repository';
import { GameError } from '@/lib/game';
import {audioBucket} from '@/lib/audio-storage';
import {audioResponse} from '@/lib/audio-response';
import {queueUnusedAudio,drainAudioQueue} from '@/db/audio-maintenance';
type Context={params:Promise<{id:string}>};
export const GET=(request:Request,ctx:Context)=>safe(async()=>{
  const id=z.uuid().parse((await ctx.params).id);let rows=await database()`SELECT storage_key,byte_size FROM pronunciation_audio a WHERE id=${id} AND EXISTS(SELECT 1 FROM content_entries e WHERE e.audio_id=a.id AND e.deleted_at IS NULL)`;
  const isPublic=!!rows[0];
  if(!isPublic){const {data}=await getAuth().getSession();if(data?.user){const admin=await isAdministrator(data.user.id);rows=await database()`SELECT storage_key,byte_size FROM pronunciation_audio a WHERE id=${id} AND (owner_id=${data.user.id} OR (${admin} AND EXISTS(SELECT 1 FROM entry_suggestions s WHERE s.status='pending' AND s.payload->>'audioId'=a.id::text)))`;}}
  if(!rows[0])throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
  return audioResponse(request,rows[0] as {storage_key:string;byte_size:number},isPublic);
});
export const DELETE=(request:Request,ctx:Context)=>safe(async()=>{
  const user=await account();if(request.headers.get('origin')!==new URL(request.url).origin)throw new GameError('Diese Anfrage ist nicht erlaubt.',403);
  const id=z.uuid().parse((await ctx.params).id);const sql=database();const rows=await queueUnusedAudio(sql,{id:user.id,audioId:id});
  const bucket=await audioBucket();if(bucket)await drainAudioQueue(sql,bucket);return respond({removed:!!rows.length});
});
