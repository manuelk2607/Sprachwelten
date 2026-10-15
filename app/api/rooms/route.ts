import { z } from 'zod';
import { playerName } from '@/lib/content';
import { body, hashToken, randomToken, respond, safe } from '@/lib/http';
import { createGame, GameError, viewGame } from '@/lib/game';
import { insertRoom, rateLimit } from '@/db/repository';
import { playableModeIds } from '@/lib/modes';
export const POST = (request: Request) => safe(async () => {
  const {name,locale,mode,pronunciationCategory,attributionCategory}=await body(request,z.object({name:playerName,locale:z.enum(['de','en']).default('de'),mode:z.enum(playableModeIds).default('idiom-bluff'),pronunciationCategory:z.enum(['both','twister','sound']).optional(),attributionCategory:z.enum(['both','person','song']).optional()}));
  const ip=request.headers.get('cf-connecting-ip')??'local'; await rateLimit(`room:${await hashToken(ip)}`,30);
  const token=randomToken(); const player={id:crypto.randomUUID(),name,tokenHash:await hashToken(token),score:0};
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let i=0;i<5;i++) {
    const code=Array.from(crypto.getRandomValues(new Uint8Array(6)), n=>alphabet[n%alphabet.length]).join('');
    const game=createGame(code,player,locale,mode);if(mode==='tongue-twisters')game.pronunciationCategory=pronunciationCategory??'both';if(mode==='who-said-it')game.attributionCategory=attributionCategory??'both';
    try { await insertRoom(game); return respond({token,room:viewGame(game,player.id)},201); }
    catch(error) { if((error as {code?:string}).code!=='23505') throw error; }
  }
  throw new GameError('Es konnte gerade kein Raum erstellt werden.',503);
});
