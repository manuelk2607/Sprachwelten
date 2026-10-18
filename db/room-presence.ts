import {database,mutateRoom} from './repository';
import {act,GameError,viewGame} from '@/lib/game';

// Attendance is private and must not invalidate the visible game version.
export async function heartbeatRoom(code:string,tokenHash:string){
  const [row]=await database()`WITH authorized AS MATERIALIZED (
    SELECT r.state,p->>'id' AS player_id FROM game_rooms r,
      jsonb_array_elements(r.state->'players') p
    WHERE r.code=${code} AND r.expires_at>now() AND p->>'tokenHash'=${tokenHash}
  ), touched AS (
    INSERT INTO room_presence(room_code,player_id,seen_at)
    SELECT ${code},player_id,now() FROM authorized
    ON CONFLICT(room_code,player_id) DO UPDATE SET seen_at=excluded.seen_at
      WHERE room_presence.seen_at<now()-interval '15 seconds'
    RETURNING player_id
  ) SELECT player_id,EXISTS(
    SELECT 1 FROM authorized a,jsonb_array_elements(a.state->'players') p
    LEFT JOIN room_presence presence ON presence.room_code=${code} AND presence.player_id=p->>'id'
    WHERE p->>'id'<>a.player_id AND
      greatest(coalesce(extract(epoch FROM presence.seen_at)*1000,0),coalesce((p->>'lastSeenAt')::numeric,0))>0 AND
      greatest(coalesce(extract(epoch FROM presence.seen_at)*1000,0),coalesce((p->>'lastSeenAt')::numeric,0))<extract(epoch FROM now()-interval '2 minutes')*1000
  ) AS stale FROM authorized`;
  if(!row)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  if(!row.stale)return null;
  let playerId='';
  const state=await mutateRoom(code,game=>{
    const player=game.players.find(p=>p.tokenHash===tokenHash);
    if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);
    playerId=player.id;act(game,playerId,{action:'heartbeat'});
  },false);
  return viewGame(state,playerId);
}
