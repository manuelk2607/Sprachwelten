import type {GameView} from '../lib/game';
import type {RoomAction} from '../lib/content';
export async function awaitWheel(room:GameView,submit:(action:RoomAction)=>Promise<GameView>){
  const selection=room.pronunciation?.selection;
  if(room.phase!=='spinning'||!selection)return room;
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,Math.min(4500,selection.endsAt-selection.serverNow+100))));
  return submit({action:'wheel-ready',selectionId:selection.id,matchId:room.matchId,roundNumber:room.roundNumber});
}
