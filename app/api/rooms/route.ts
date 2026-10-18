import {withRoomAudio} from '@/lib/room-audio';
import {resolvePlayerName} from '@/lib/player-name';
import { z } from 'zod';
import { playerName } from '@/lib/content';
import { body, hashToken, randomToken, respond, safe } from '@/lib/http';
import { createGame, GameError, viewGame } from '@/lib/game';
import { insertRoom, rateLimit } from '@/db/repository';
import { playableModeIds } from '@/lib/modes';
export const POST = (request: Request) => safe(async () => {
  const {name:givenName,locale,mode,meaningCategory,pronunciationCategory,attributionCategory}=await body(request,z.object({name:z.string().trim().max(24).optional(),locale:z.enum(['de','en']).default('de'),mode:z.enum(playableModeIds).default('meaning-quiz'),meaningCategory:z.enum(['all','expression','gaming','youth','academic']).optional(),pronunciationCategory:z.enum(['both','twister','sound']).optional(),attributionCategory:z.enum(['both','person','song']).optional()}));
  const name=await resolvePlayerName(givenName);
  const ip=request.headers.get('cf-connecting-ip')??'local'; await rateLimit(`room:${await hashToken(ip)}`,30);
  const token=randomToken(); const player={id:crypto.randomUUID(),name,tokenHash:await hashToken(token),score:0};
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let i=0;i<5;i++) {
    const code=Array.from(crypto.getRandomValues(new Uint8Array(6)), n=>alphabet[n%alphabet.length]).join('');
    const game=createGame(code,player,locale,mode);if(mode==='meaning-quiz')game.meaningCategory=meaningCategory??'all';if(mode==='tongue-twisters')game.pronunciationCategory=pronunciationCategory??'both';if(mode==='who-said-it')game.attributionCategory=attributionCategory??'both';
    try { await insertRoom(game); return withRoomAudio(respond({token,room:viewGame(game,player.id)},201),request,code,player.tokenHash); }
    catch(error) { if((error as {code?:string}).code!=='23505') throw error; }
  }
  throw new GameError('Es konnte gerade kein Raum erstellt werden.',503);
});
