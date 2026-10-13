import { z } from 'zod';
import { playerName, roomCode } from '@/lib/content';
import { body, hashToken, randomToken, respond, safe } from '@/lib/http';
import { joinGame, viewGame } from '@/lib/game';
import { mutateRoom, rateLimit } from '@/db/repository';
export const POST = (request:Request,ctx:{params:Promise<{code:string}>}) => safe(async()=>{
  const code=roomCode.parse((await ctx.params).code);const {name}=await body(request,z.object({name:playerName}));
  const ip=request.headers.get('cf-connecting-ip')??'local'; await rateLimit(`join:${await hashToken(ip)}`,60);
  const token=randomToken();const player={id:crypto.randomUUID(),name,tokenHash:await hashToken(token),score:0};
  const state=await mutateRoom(code,game=>joinGame(game,player));return respond({token,room:viewGame(state,player.id)},201);
});
