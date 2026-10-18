// Guest credentials authorize only this browser's temporary audio, never account APIs.
const cookieName='sprachwelten_contributor';
export function guestCredential(request:Request){
  const value=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  return value&&/^[a-f0-9]{64}$/.test(value)?value:undefined;
}
export function withGuestCredential(response:Response,request:Request,token?:string){
  if(token&&guestCredential(request)!==token)response.headers.append('Set-Cookie',`${cookieName}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=2592000${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return response;
}
