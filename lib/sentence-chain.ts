import type {Game} from './game';
import type {Entry} from './content';
import {GameError} from './game-error';
import {edgeLetter} from './word-chain';

export const sentenceTurnMs=45_000;
export const sentenceVoteMs=30_000;
export const sentenceWordLimit=40;
export type SentenceReason={de:string;en:string};
export type SentenceRound={
  version:1;language:'de'|'en';queue:string[];activeIndex:number;turn:number;deadline:number;
  words:{text:string;playerId?:string}[];failures:number;
  pending?:{id:string;playerId:string;word?:string;finish:boolean;expiresAt:number;votes:Record<string,boolean>};
  feedback?:{playerId:string;turn:number;kind:'valid'|'invalid'|'pass'|'timeout';reason:SentenceReason};
  endReason?:'complete'|'limit'|'failures';
};
export type SentenceTarget={matchId:string;roundNumber:number;turn:number};
const starters={de:['Heute','Morgen','Wir','Ich','Der','Die','Ein','Eine','Manchmal','Plötzlich','Draußen','Gestern','Unsere','Mein','Vielleicht','Im','Nach','Vor','Unter','Über'],en:['Today','Tomorrow','We','I','The','A','Sometimes','Suddenly','Outside','Yesterday','Our','My','Perhaps','In','After','Before','Under','Above','Someone','Everyone']} as const;
export function sentencePrompts():Entry[]{
  return (['de','en'] as const).flatMap(language=>starters[language].map((phrase,index)=>({id:`91000000-0000-4000-8000-${String((language==='de'?100:200)+index).padStart(12,'0')}`,
    kind:'word',phrase,language,presentation:'text',literal:'',meaning:'',example:'',region:'',context:'',sourceUrl:'',culturalNote:'',status:'curated',authorName:'',createdAt:'2026-10-25T00:00:00Z'})));
}
export function initializeSentence(game:Game){
  if(!game.round)return;
  game.round.sentence={version:1,language:game.sentenceLanguage??game.locale,queue:game.players.map((_,index)=>game.players[(game.roundIndex+index)%game.players.length].id),activeIndex:0,turn:0,
    deadline:Date.now()+sentenceTurnMs,words:[{text:game.round.entry.phrase}],failures:0};
  game.phase='linking';
}
export const activeSentencePlayer=(sentence:SentenceRound)=>sentence.queue[sentence.activeIndex];
export const sentenceText=(sentence:SentenceRound)=>sentence.words.map(word=>word.text).join(' ');
export const requiredSentenceLetter=(sentence:SentenceRound)=>edgeLetter(sentence.words.at(-1)!.text,'last');
export function validateSentenceWord(raw:string){
  const word=raw.normalize('NFC').trim();
  if(word.length>40||! /^[\p{L}][\p{L}\p{M}]*(?:['’\-][\p{L}][\p{L}\p{M}]*)*[.!?]?$/u.test(word))
    throw new GameError('Bitte genau ein Wort mit höchstens 40 Zeichen eingeben.',422);
  return word;
}
export function assertSentenceTarget(game:Game,target:SentenceTarget){
  const sentence=game.round?.sentence;
  if(game.mode!=='word-chain'||game.phase!=='linking'||!sentence)throw new GameError('Hier wird gerade kein gemeinsamer Satz gebaut.',409);
  if(target.matchId!==game.matchId||target.roundNumber!==game.roundIndex+1||target.turn!==sentence.turn)throw new GameError('Diese Eingabe gehört nicht zur aktuellen Runde.',409);
  return sentence;
}
function nextTurn(sentence:SentenceRound){sentence.turn++;sentence.activeIndex=(sentence.activeIndex+1)%sentence.queue.length;sentence.deadline=Date.now()+sentenceTurnMs;delete sentence.pending;}
function stopAfterFailures(game:Game,sentence:SentenceRound){if(sentence.failures>=3){sentence.endReason='failures';game.phase='reveal';}}
function applyDecision(game:Game,accepted:boolean,timedOut=false){
  const sentence=game.round!.sentence!,pending=sentence.pending!;
  sentence.feedback={playerId:pending.playerId,turn:sentence.turn,kind:timedOut?'timeout':accepted?'valid':'invalid',reason:timedOut?
    {de:'Die Abstimmung ist abgelaufen. Kein Punkt; die nächste Person ist dran.',en:'Voting timed out. No point; it is the next player’s turn.'}:accepted?
    {de:pending.finish?'Ihr habt den Satz abgeschlossen.':'Das Wort ist angenommen. +1 Punkt.',en:pending.finish?'You have finished the sentence.':'Word accepted. +1 point.'}:
    {de:'Keine Mehrheit für diesen Vorschlag. Der Satz bleibt unverändert; die nächste Person ist dran.',en:'No majority for this proposal. The sentence stays unchanged; it is the next player’s turn.'}};
  if(accepted){
    if(pending.word){sentence.words.push({text:pending.word,playerId:pending.playerId});const player=game.players.find(player=>player.id===pending.playerId);if(player)player.score++;}
    sentence.failures=0;
    if(pending.finish||pending.word&&/[.!?]$/.test(pending.word)){sentence.endReason='complete';game.phase='reveal';}
    else if(sentence.words.length>=sentenceWordLimit){sentence.endReason='limit';game.phase='reveal';}
  }else sentence.failures++;
  nextTurn(sentence);stopAfterFailures(game,sentence);
}
function settleSentenceVotes(game:Game,timedOut=false){
  const sentence=game.round?.sentence,pending=sentence?.pending;
  if(game.phase!=='linking'||!sentence||!pending)return;
  const voters=game.players.filter(player=>player.id!==pending.playerId),needed=Math.floor(voters.length/2)+1;
  const yes=voters.filter(player=>pending.votes[player.id]===true).length,no=voters.filter(player=>pending.votes[player.id]===false).length;
  if(!voters.length||yes>=needed)applyDecision(game,true);
  else if(no>voters.length-needed||timedOut)applyDecision(game,false,timedOut);
}
export function proposeSentence(game:Game,playerId:string,target:SentenceTarget,word?:string){
  const sentence=assertSentenceTarget(game,target);
  if(activeSentencePlayer(sentence)!==playerId)throw new GameError('Eine andere Person ist gerade dran.',403);
  if(sentence.pending)throw new GameError('Die Abstimmung läuft noch.',409);
  if(Date.now()>=sentence.deadline)throw new GameError('Die Zeit ist abgelaufen. Bitte aktualisiere die Runde.',409);
  const normalized=word===undefined?undefined:validateSentenceWord(word);
  if(normalized!==undefined&&edgeLetter(normalized,'first')!==requiredSentenceLetter(sentence))throw new GameError('Das Wort muss mit dem angezeigten Buchstaben beginnen.',422);
  if(normalized===undefined&&sentence.words.length<3)throw new GameError('Ergänzt zuerst mindestens drei Wörter zu einem Satz.',422);
  sentence.pending={id:crypto.randomUUID(),playerId,word:normalized,finish:word===undefined||!!normalized&&/[.!?]$/.test(normalized),expiresAt:Date.now()+sentenceVoteMs,votes:{}};
  settleSentenceVotes(game);
}
export function voteSentence(game:Game,playerId:string,target:SentenceTarget,proposalId:string,approve:boolean){
  const sentence=assertSentenceTarget(game,target),pending=sentence.pending;
  if(!pending||pending.id!==proposalId||Date.now()>=pending.expiresAt)throw new GameError('Dieser Vorschlag ist nicht mehr aktuell.',409);
  if(!game.players.some(player=>player.id===playerId))throw new GameError('Du bist nicht Teil dieses Raums.',403);
  if(pending.playerId===playerId)throw new GameError('Du kannst deinen eigenen Vorschlag nicht bewerten.',403);
  if(pending.votes[playerId]!==undefined)throw new GameError('Deine Stimme ist bereits abgegeben.',409);
  pending.votes[playerId]=approve;settleSentenceVotes(game);
}
export function passSentence(game:Game,playerId:string,target:SentenceTarget,timeout=false){
  const sentence=assertSentenceTarget(game,target);
  if(sentence.pending){
    if(!timeout)throw new GameError('Die Abstimmung läuft noch.',409);
    if(Date.now()<sentence.pending.expiresAt)throw new GameError('Die Zeit ist noch nicht abgelaufen.',409);
    settleSentenceVotes(game,true);return;
  }
  if(timeout){if(Date.now()<sentence.deadline)throw new GameError('Die Zeit ist noch nicht abgelaufen.',409);}
  else if(activeSentencePlayer(sentence)!==playerId)throw new GameError('Eine andere Person ist gerade dran.',403);
  sentence.feedback={playerId:activeSentencePlayer(sentence),turn:sentence.turn,kind:timeout?'timeout':'pass',reason:timeout?{de:'Die Zeit ist abgelaufen. Die nächste Person ist dran.',en:'Time is up. It is the next player’s turn.'}:{de:'Weitergegeben. Die nächste Person ist dran.',en:'Passed. It is the next player’s turn.'}};
  sentence.failures++;nextTurn(sentence);stopAfterFailures(game,sentence);
}
export function advanceSentenceClock(game:Game){
  const sentence=game.round?.sentence;if(game.phase!=='linking'||!sentence)return;
  if(Date.now()>=(sentence.pending?.expiresAt??sentence.deadline))passSentence(game,activeSentencePlayer(sentence),{matchId:game.matchId!,roundNumber:game.roundIndex+1,turn:sentence.turn},true);
}
export function sentencePlayerLeft(game:Game,playerId:string){
  const sentence=game.round?.sentence;if(!sentence)return;
  const oldActive=activeSentencePlayer(sentence),index=sentence.queue.indexOf(playerId);
  if(index<0)return;
  sentence.queue.splice(index,1);if(!sentence.queue.length)return;
  if(index<sentence.activeIndex)sentence.activeIndex--;
  sentence.activeIndex%=sentence.queue.length;
  if(oldActive===playerId){sentence.turn++;delete sentence.pending;sentence.deadline=Date.now()+sentenceTurnMs;}
  else if(sentence.pending){delete sentence.pending.votes[playerId];settleSentenceVotes(game);}
}
