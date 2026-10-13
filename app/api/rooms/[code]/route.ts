import { roomAction, roomCode } from '@/lib/content';
import { body, playerToken, respond, safe } from '@/lib/http';
import { act, GameError, viewGame } from '@/lib/game';
import { gamePrompts, readRoom, mutateRoom } from '@/db/repository';
type Context = {params:Promise<{code:string}>};
export const GET = (request:Request,ctx:Context) => safe(async()=>{
  const code=roomCode.parse((await ctx.params).code);const token=await playerToken(request); const state=await readRoom(code);
  const player=state.players.find(p=>p.tokenHash===token); if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  return respond({room:viewGame(state,player.id)});
});
export const POST = (request:Request,ctx:Context) => safe(async()=>{
  const code=roomCode.parse((await ctx.params).code); const token=await playerToken(request); const action=await body(request,roomAction);
  const prompts=action.action==='start'?await gamePrompts():[];let id='';
  const state=await mutateRoom(code,game=>{const player=game.players.find(p=>p.tokenHash===token);if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);id=player.id;act(game,id,action,prompts);});
  return respond({room:viewGame(state,id)});
});
