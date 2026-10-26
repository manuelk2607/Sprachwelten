import {act,type Game} from '../lib/game';
import {chainChoices} from '../lib/word-chain';

export function finishWheelAnimation(game:Game){
  const selection=game.round!.pronunciation!.selection!;
  selection.endsAt=Date.now()-1;
  act(game,game.hostId,{action:'wheel-ready',selectionId:selection.id,matchId:game.matchId!,roundNumber:game.roundIndex+1});
  return {speakerId:selection.selectedId,selectionId:selection.id,roundNumber:game.roundIndex+1,matchId:game.matchId!};
}
// Explicit snapshots of the pre-redesign storage format exercise compatibility.
export function legacyPronunciation(game:Game){
  game.round!.pronunciation={speakerIndex:0,ratings:{}};game.phase='speaking';
}
export function legacyChain(game:Game){
  delete game.round!.sentence;
  game.round!.chain={queue:game.players.map(player=>player.id),turn:0,words:[{text:game.round!.entry.phrase}],choices:[],results:[]};
  chainChoices(game.round!.chain,game.locale);
}
