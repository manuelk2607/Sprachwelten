import { account, respond, safe } from '@/lib/http';
import { database, rateLimit } from '@/db/repository';
import { GameError } from '@/lib/game';
import { audioBucket } from '@/lib/audio-storage';
import { maxAudioBytes, validateAudioWave } from '@/lib/audio-format';
export const GET=async()=>respond({available:!!await audioBucket()});
export const POST=(request:Request)=>safe(async()=>{
  const user=await account();if(request.headers.get('origin')!==new URL(request.url).origin)throw new GameError('Diese Anfrage ist nicht erlaubt.',403);
  const bucket=await audioBucket();if(!bucket)throw new GameError('Audio ist momentan nicht verfügbar.',503);
  await rateLimit(`audio:${user.id}`,20,86400);
  if(request.headers.get('content-type')!=='audio/wav')throw new GameError('Bitte eine gültige Audioaufnahme auswählen.',415);
  const reader=request.body?.getReader();if(!reader)throw new GameError('Die Audiodatei fehlt.',400);
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxAudioBytes){await reader.cancel();throw new GameError('Die Aufnahme darf höchstens 20 Sekunden lang sein.',413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let metadata:ReturnType<typeof validateAudioWave>;try{metadata=validateAudioWave(bytes);}catch(error){throw new GameError((error as Error).message,422);}
  const sql=database();const reserved=await sql`INSERT INTO audio_upload_budget(key,clips) VALUES ('global',1) ON CONFLICT(key) DO UPDATE SET clips=audio_upload_budget.clips+1 WHERE audio_upload_budget.clips<500 RETURNING clips`;
  if(!reserved.length)throw new GameError('Der Audiospeicher ist derzeit voll. Du kannst den Beitrag ohne Aufnahme veröffentlichen.',429);
  const id=crypto.randomUUID();const key=`pronunciation/${id}.wav`;
  try{
    await bucket.put(key,bytes,{httpMetadata:{contentType:'audio/wav',cacheControl:'public, max-age=86400'}});
    await sql`INSERT INTO pronunciation_audio(id,owner_id,storage_key,byte_size,duration_ms) VALUES (${id},${user.id},${key},${metadata.byteSize},${metadata.durationMs})`;
  }catch(error){await bucket.delete(key);await sql`UPDATE audio_upload_budget SET clips=greatest(0,clips-1) WHERE key='global'`;throw error;}
  return respond({audio:{id,durationMs:metadata.durationMs}},201);
});
