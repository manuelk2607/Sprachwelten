import {audioBucket} from './audio-storage';
import {GameError} from './game';
export async function audioResponse(request:Request,clip:{storage_key:string;byte_size:number},isPublic=false){
 const bucket=await audioBucket();if(!bucket)throw new GameError('Audio ist momentan nicht verfügbar.',503);
 const size=Number(clip.byte_size),requested=request.headers.get('range');let range:{offset:number;length:number}|undefined;
 if(requested){const match=/^bytes=(\d*)-(\d*)$/.exec(requested);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});range={offset:start,length:end-start+1};}
 const object=await bucket.get(clip.storage_key,range?{range}:undefined);if(!object)throw new GameError('Die Aufnahme wurde nicht gefunden.',404);
 const headers=new Headers({'Content-Type':'audio/wav','Cache-Control':isPublic?'public, max-age=86400':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':'inline; filename="pronunciation.wav"'});
 if(range){headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${size}`);headers.set('Content-Length',String(range.length));return new Response(object.body as ReadableStream,{status:206,headers});}
 headers.set('Content-Length',String(object.size));return new Response(object.body as ReadableStream,{headers});
}
