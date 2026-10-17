// This HttpOnly credential is scoped to audio in one room. Unlike the player's
// bearer token, its stored hash cannot authorize game commands.
const cookieName=(code:string)=>'sprachwelten_room_audio_'+code;
export function roomAudioCredential(request:Request,code:string){
 return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName(code)+'='))?.slice(cookieName(code).length+1);
}
export function withRoomAudio(response:Response,request:Request,code:string,tokenHash?:string){
 if(tokenHash&&roomAudioCredential(request,code)===tokenHash)return response;
 response.headers.append('Set-Cookie',`${cookieName(code)}=${tokenHash??''}; Path=/api/rooms/${code}; HttpOnly; SameSite=Strict; Max-Age=${tokenHash?86400:0}${new URL(request.url).protocol==='https:'?'; Secure':''}`);
 return response;
}
