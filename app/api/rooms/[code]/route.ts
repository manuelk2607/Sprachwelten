import {withRoomAudio} from '@/lib/room-audio';
import { roomAction, roomCode } from '@/lib/content';
import { body, playerToken, respond, safe } from '@/lib/http';
import { act, GameError, viewGame } from '@/lib/game';
import { gamePrompts, getRoom, readRoomConditional, mutateRoom } from '@/db/repository';
type Context = {params:Promise<{code:string}>};
export const GET = (request:Request,ctx:Context) => safe(async()=>{
  const code=roomCode.parse((await ctx.params).code),token=await playerToken(request);
  const match=/^"room-v(\d+)"$/.exec(request.headers.get('if-none-match')??''),known=match?Number(match[1]):-1;
  const {state,version}=await readRoomConditional(code,token,Number.isSafeInteger(known)?known:-1);
  const player=state?.players.find(p=>p.tokenHash===token);
  const response=state&&player?respond({room:viewGame(state,player.id)}):new Response(null,{status:304,headers:{'Cache-Control':'private, no-store'}});
  response.headers.set('ETag',`"room-v${version}"`);response.headers.set('Vary','Authorization');
  return withRoomAudio(response,request,code,token);
});
export const POST = (request:Request,ctx:Context) => safe(async()=>{
  const code=roomCode.parse((await ctx.params).code); const token=await playerToken(request); const action=await body(request,roomAction);
  let prompts: Awaited<ReturnType<typeof gamePrompts>> = [];
  if ((action.action === 'start'||action.action==='restart')) {
    const { state } = await getRoom(code,false);
    const player = state.players.find(p => p.tokenHash === token);
    if (!player || player.id !== state.hostId) throw new GameError('Nur die Gastgeberin oder der Gastgeber kann starten.',403);
    prompts = await gamePrompts(state.mode);
  }
  let id='';
  const state=await mutateRoom(code,game=>{const player=game.players.find(p=>p.tokenHash===token);if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);id=player.id;act(game,id,action,prompts);},['start','restart','next'].includes(action.action));
  return withRoomAudio(action.action==='leave'?respond({left:true}):respond({room:viewGame(state,id)}),request,code,action.action==='leave'?undefined:token);
});
