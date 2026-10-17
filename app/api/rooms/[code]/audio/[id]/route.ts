import {z} from 'zod';
import {roomCode} from '@/lib/content';
import {readRoom,database} from '@/db/repository';
import {GameError,viewGame} from '@/lib/game';
import {safe} from '@/lib/http';
import {roomAudioCredential} from '@/lib/room-audio';
import {audioResponse} from '@/lib/audio-response';
export const GET=(request:Request,ctx:{params:Promise<{code:string;id:string}>})=>safe(async()=>{
 const params=await ctx.params,code=roomCode.parse(params.code),id=z.uuid().parse(params.id),credential=roomAudioCredential(request,code);
 if(!credential)throw new GameError('Bitte tritt dem Raum erneut bei.',401);
 const state=await readRoom(code),player=state.players.find(p=>p.tokenHash===credential);
 if(!player||viewGame(state,player.id).prompt?.audioId!==id)throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
 const [clip]=await database()`SELECT storage_key,byte_size FROM pronunciation_audio WHERE id=${id}`;
 if(!clip)throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
 return audioResponse(request,clip as {storage_key:string;byte_size:number});
});
