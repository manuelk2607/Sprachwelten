import { languages, ratingScores, type Entry, type RatingScores, type RoomAction } from './content';
import type { Locale } from './translations';
import { localizeEntry } from './entry-localization';
import { isQuizMode, modeInfo, prepareChoices, prepareLanguageQuiz, type PlayableGameMode } from './modes';
import { registeredLanguageNames } from './language-registry';
import { shuffled } from './random';
import { categoryId, categoryLabel, contextIds, regionIds, type CategoryKind } from './quiz-categories';
import { translationStatus } from './content-translations';

export type Phase='lobby'|'writing'|'voting'|'speaking'|'rating'|'reveal'|'finished';
export type Player={id:string;name:string;tokenHash:string;score:number;lastSeenAt?:number};
export type Option={id:string;text:string;authorId:string|null;language?:string;categoryId?:string;categoryKind?:CategoryKind};
export type PronunciationRound={speakerIndex:number;ratings:Record<string,Record<string,RatingScores>>};
export type Round={entry:Entry;answers:Record<string,string>;votes:Record<string,string>;options:Option[];pronunciation?:PronunciationRound};
export type Game={code:string;locale:Locale;mode?:PlayableGameMode;hostId:string;phase:Phase;players:Player[];prompts:Entry[];roundIndex:number;round:Round|null;totalRounds:number;matchId?:string;notice?:string};
export class GameError extends Error {constructor(message:string,public status=409){super(message);}}
export function createGame(code:string,player:Player,locale:Locale='de',mode:PlayableGameMode='idiom-bluff'):Game {
  player.lastSeenAt=Date.now();
  return {code,locale,mode,hostId:player.id,phase:'lobby',players:[player],prompts:[],roundIndex:0,round:null,totalRounds:2,matchId:crypto.randomUUID()};
}
export function joinGame(game:Game,player:Player) {
  if(game.phase!=='lobby')throw new GameError('Diese Runde hat bereits begonnen.');
  if(game.players.length>=10)throw new GameError('Der Raum ist voll (maximal 10 Personen).');
  if(game.players.some(p=>p.name.toLowerCase()===player.name.toLowerCase()))throw new GameError('Dieser Name ist im Raum schon vergeben.');
  player.lastSeenAt=Date.now();game.players.push(player);
}
function newRound(game:Game) {
  const entry=game.prompts[game.roundIndex];
  game.round={entry,answers:{},votes:{},options:[]};
  game.phase='writing';
  if(game.mode==='tongue-twisters') {
    game.round.pronunciation={speakerIndex:0,ratings:{}};game.phase='speaking';
  } else if(isQuizMode(game.mode)) {
    const categoryKind=game.mode==='dialect-detective'?'region':'context';
    const target=categoryKind==='region'?(entry.regionId??categoryId('region',entry.region)):(entry.contextId??categoryId('context',entry.context));
    const choices=game.mode==='language-quiz'
      ?prepareLanguageQuiz(entry.phrase,entry.language,Object.keys(languages)).options
      :prepareChoices(target??'',categoryKind==='region'?regionIds:contextIds);
    game.round.options=choices.map(value=>({id:crypto.randomUUID(),text:game.mode==='language-quiz'?registeredLanguageNames(value)[game.locale]:categoryLabel(categoryKind,value,game.locale),authorId:null,...(game.mode==='language-quiz'?{language:value}:{categoryId:value,categoryKind})}));
    game.phase='voting';
  }
}
const correctOption=(game:Omit<Game,'prompts'>,option:Option)=>game.mode==='language-quiz'?option.language===game.round?.entry.language:game.mode==='dialect-detective'?(option.categoryId?option.categoryId===game.round?.entry.regionId:option.text===game.round?.entry.region):game.mode==='everyday-language'?(option.categoryId?option.categoryId===game.round?.entry.contextId:option.text===game.round?.entry.context):option.authorId===null;
const rounded=(value:number)=>Math.round(value*10)/10;
function pronunciationResults(game:Omit<Game,'prompts'>) {
  return game.players.map(player=>{
    const ratings=Object.values(game.round?.pronunciation?.ratings[player.id]??{});
    const average=(key:keyof RatingScores)=>ratings.length?ratings.reduce((sum,rating)=>sum+rating[key],0)/ratings.length:0;
    return {playerId:player.id,name:player.name,ratingCount:ratings.length,clarity:rounded(average('clarity')),accuracy:rounded(average('accuracy')),rhythm:rounded(average('rhythm')),score:rounded((average('clarity')+average('accuracy')+average('rhythm'))/3)};
  });
}
function settleVotes(game:Game){
  const round=game.round;if(!round)return;
  if(game.phase==='writing'&&game.players.every(player=>!!round.answers[player.id])){
    round.options=shuffled([{id:crypto.randomUUID(),text:round.entry.meaning,authorId:null},...game.players.map(player=>({id:crypto.randomUUID(),text:round.answers[player.id],authorId:player.id}))]);game.phase='voting';
  }
  if(game.phase==='voting'&&game.players.every(player=>!!round.votes[player.id])){
    for(const [voter,optionId] of Object.entries(round.votes)){
      const choice=round.options.find(option=>option.id===optionId);if(!choice)continue;
      const recipient=game.players.find(player=>player.id===(isQuizMode(game.mode)?voter:choice.authorId??voter));
      if(recipient&&(!isQuizMode(game.mode)||correctOption(game,choice)))recipient.score++;
    }
    game.phase='reveal';
  }
}
function finishPronunciation(game:Game){
  for(const result of pronunciationResults(game)){
    const player=game.players.find(player=>player.id===result.playerId)!;player.score=rounded(player.score+result.score);
  }
  game.phase='reveal';
}
function settleRatings(game:Game){
  const performance=game.round?.pronunciation;const speaker=performance?game.players[performance.speakerIndex]:undefined;
  if(game.phase!=='rating'||!performance||!speaker)return;
  if(game.players.filter(player=>player.id!==speaker.id).every(player=>!!performance.ratings[speaker.id]?.[player.id])){
    if(performance.speakerIndex+1<game.players.length){performance.speakerIndex++;game.phase='speaking';}else finishPronunciation(game);
  }
}
export function leaveGame(game:Game,playerId:string){
  const index=game.players.findIndex(player=>player.id===playerId);if(index<0)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  const performance=game.round?.pronunciation;const speakerId=performance?game.players[performance.speakerIndex]?.id:undefined;
  const speakerIndex=performance?.speakerIndex??0;
  game.players.splice(index,1);if(game.hostId===playerId)game.hostId=game.players[0]?.id??'';
  if(!game.players.length){game.phase='finished';game.round=null;game.prompts=[];return;}
  if(game.phase==='lobby'){game.totalRounds=Math.min(game.totalRounds,game.players.length*2);return;}
  if(game.phase==='finished')return;
  const minimum=isQuizMode(game.mode)?1:2;
  if(game.players.length<minimum){game.phase='lobby';game.round=null;game.prompts=[];game.roundIndex=0;game.totalRounds=Math.min(game.totalRounds,game.players.length*2);game.notice='Zu wenige Personen zum Weiterspielen. Ihr könnt in der Lobby wieder starten.';return;}
  const round=game.round;if(!round)return;
  delete round.answers[playerId];delete round.votes[playerId];
  if(game.phase!=='reveal'){
    round.options=round.options.filter(option=>option.authorId!==playerId);
    for(const [voter,optionId] of Object.entries(round.votes))if(!round.options.some(option=>option.id===optionId))delete round.votes[voter];
  }
  if(performance){
    delete performance.ratings[playerId];for(const ratings of Object.values(performance.ratings))delete ratings[playerId];
    if(game.phase==='speaking'||game.phase==='rating'){
      if(speakerId===playerId){performance.speakerIndex=speakerIndex;if(speakerIndex>=game.players.length)finishPronunciation(game);else game.phase='speaking';}
      else {performance.speakerIndex=game.players.findIndex(player=>player.id===speakerId);settleRatings(game);}
    }
  }else settleVotes(game);
}
export function act(game:Game,playerId:string,action:RoomAction,prompts:Entry[]=[]) {
  const player=game.players.find(player=>player.id===playerId);
  if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  const now=Date.now();player.lastSeenAt=now;
  for(const other of [...game.players])if(other.id!==playerId&&other.lastSeenAt&&now-other.lastSeenAt>120000)leaveGame(game,other.id);
  if(action.action==='heartbeat')return;
  if(action.action==='leave'){leaveGame(game,playerId);return;}
  if(action.action==='configure'){
    if(playerId!==game.hostId)throw new GameError('Nur der Gastgeber kann die Rundenzahl ändern.',403);
    if(game.phase!=='lobby')throw new GameError('Die Rundenzahl kann nur in der Lobby geändert werden.');
    if(action.rounds>game.players.length*2)throw new GameError('Die Rundenzahl darf höchstens doppelt so hoch wie die Spielerzahl sein.',422);
    game.totalRounds=action.rounds;return;
  }
  if(action.action==='restart'){
    if(playerId!==game.hostId)throw new GameError('Nur der Gastgeber kann eine neue Partie starten.',403);
    if(game.phase!=='finished')throw new GameError('Die Partie ist noch nicht beendet.');
    game.totalRounds=action.rounds??Math.min(game.totalRounds,game.players.length*2);game.phase='lobby';game.roundIndex=0;game.round=null;game.prompts=[];
    act(game,playerId,{action:'start'},prompts);return;
  }
  if(action.action==='start') {
    if(playerId!==game.hostId)throw new GameError('Nur die Gastgeberin oder der Gastgeber kann starten.',403);
    if(game.phase!=='lobby')throw new GameError('Das Spiel läuft bereits.');
    const info=modeInfo(game.mode);
    if(game.players.length<info.minPlayers)throw new GameError(info.minPlayers===2?'Zum Start braucht ihr mindestens 2 Personen.':'Zum Start braucht ihr mindestens 3 Personen.');
    if(game.totalRounds<1||game.totalRounds>game.players.length*2)throw new GameError('Die Rundenzahl darf höchstens doppelt so hoch wie die Spielerzahl sein.',422);
    const eligible=prompts.filter(entry=>entry.kind===info.kind&&(game.mode!=='dialect-detective'||categoryId('region',entry.regionId??entry.region))&&(game.mode!=='everyday-language'||categoryId('context',entry.contextId??entry.context)));
    const unique=[...new Map(eligible.map(entry=>[entry.phrase.trim().toLocaleLowerCase(),entry])).values()];
    if(unique.length<game.totalRounds)throw new GameError('Für diese Rundenzahl sind noch nicht genügend unterschiedliche Beiträge vorhanden.');
    game.prompts=shuffled(unique).slice(0,game.totalRounds).map(entry=>localizeEntry(entry,game.locale??'de'));
    game.roundIndex=0;game.matchId=crypto.randomUUID();game.notice=undefined;for(const player of game.players)player.score=0;
    newRound(game);return;
  }
  const round=game.round;
  if(!round)throw new GameError('Das Spiel hat noch nicht begonnen.');
  if(action.action==='performed'||action.action==='rate') {
    const performance=round.pronunciation;
    const speaker=performance?game.players[performance.speakerIndex]:undefined;
    if(game.mode!=='tongue-twisters'||!performance||!speaker)throw new GameError('Hier wird gerade nicht vorgelesen.');
    if(action.roundNumber!==game.roundIndex+1||action.speakerId!==speaker.id)throw new GameError('Diese Bewertung gehört nicht zum aktuellen Vortrag.');
    if(action.action==='performed') {
      if(game.phase!=='speaking')throw new GameError('Der Vortrag wurde bereits beendet.');
      if(playerId!==speaker.id)throw new GameError('Nur die Person, die gerade dran ist, kann den Vortrag beenden.',403);
      game.phase='rating';return;
    }
    if(game.phase!=='rating')throw new GameError('Es wird gerade nicht bewertet.');
    if(playerId===speaker.id)throw new GameError('Du kannst deine eigene Aussprache nicht bewerten.',403);
    const scores=ratingScores.safeParse(action);
    if(!scores.success)throw new GameError('Bitte jedes Kriterium mit 1 bis 5 bewerten.',422);
    const ratings=performance.ratings[speaker.id]??={};
    if(ratings[playerId])throw new GameError('Deine Bewertung ist bereits abgegeben.');
    ratings[playerId]=scores.data;settleRatings(game);return;
  }
  if(action.action==='answer') {
    if(game.phase!=='writing')throw new GameError('Die Schreibphase ist vorbei.');
    if(round.answers[playerId])throw new GameError('Deine Erklärung ist bereits abgegeben.');
    round.answers[playerId]=action.text;settleVotes(game);
  } else if(action.action==='vote') {
    if(game.phase!=='voting')throw new GameError('Es wird gerade nicht abgestimmt.');
    if(round.votes[playerId])throw new GameError('Deine Stimme ist bereits abgegeben.');
    const option=round.options.find(o=>o.id===action.optionId);
    if(!option||option.authorId===playerId)throw new GameError('Bitte eine fremde Erklärung wählen.',422);
    round.votes[playerId]=option.id;settleVotes(game);
  } else if(action.action==='next') {
    if(playerId!==game.hostId)throw new GameError('Nur der Gastgeber kann die nächste Runde starten.',403);
    if(game.phase!=='reveal')throw new GameError('Die Runde ist noch nicht abgeschlossen.');
    game.roundIndex++;
    if(game.roundIndex>=game.totalRounds)game.phase='finished';else newRound(game);
  }
}
// Only explicitly listed fields and aggregate ratings leave the server.
export function viewGame(game:Omit<Game,'prompts'>,playerId:string) {
  const round=game.round;
  const revealed=game.phase==='reveal'||game.phase==='finished';
  const quiz=isQuizMode(game.mode);
  const performance=round?.pronunciation;
  const speaker=performance?game.players[performance.speakerIndex]:undefined;
  const activeRatings=speaker?performance?.ratings[speaker.id]??{}:{};
  return {
    matchId:game.matchId??game.code,maxRounds:game.players.length*2,notice:game.notice,code:game.code,locale:game.locale??'de',mode:game.mode??'idiom-bluff',hostId:game.hostId,phase:game.phase,playerId,
    roundNumber:Math.min(game.roundIndex+1,game.totalRounds),totalRounds:game.totalRounds,
    players:game.players.map(p=>({id:p.id,name:p.name,score:p.score,answered:!!round?.answers[p.id],voted:!!round?.votes[p.id],rated:!!activeRatings[p.id]})),
    prompt:round?{phrase:round.entry.phrase,...(round.entry.audioId?{audioId:round.entry.audioId}:{}),...(!quiz||game.mode==='everyday-language'?{language:round.entry.language,languageNames:round.entry.languageNames,literal:round.entry.literal}:{})}:null,
    options:round&&game.phase!=='writing'?round.options.map(option=>({id:option.id,text:option.text,isOwn:option.authorId===playerId,...(option.language?{language:option.language}:{}),...(option.categoryId?{categoryId:option.categoryId,categoryKind:option.categoryKind}:{}),...(revealed?{correct:correctOption(game,option),authorName:quiz?'':game.players.find(p=>p.id===option.authorId)?.name??'Die echte Bedeutung',voters:Object.entries(round.votes).filter(([,id])=>id===option.id).map(([id])=>game.players.find(p=>p.id===id)?.name).filter((name):name is string=>!!name)}:{})})):[],
    selectedOptionId:round?.votes[playerId]??null,
    pronunciation:performance&&speaker?{
      speaker:{id:speaker.id,name:speaker.name},speakerNumber:performance.speakerIndex+1,totalSpeakers:game.players.length,
      ratingCount:Object.keys(activeRatings).length,requiredRatings:game.players.length-1,hasRated:!!activeRatings[playerId],
      results:revealed?pronunciationResults(game):[],
    }:null,
    revelation:revealed&&round?{language:round.entry.language,languageNames:round.entry.languageNames,region:round.entry.region,regionId:round.entry.regionId,context:round.entry.context,contextId:round.entry.contextId,meaning:round.entry.meaning,example:round.entry.example,culturalNote:round.entry.culturalNote,sourceUrl:round.entry.sourceUrl,status:round.entry.status,authorName:round.entry.creditName||round.entry.authorName,sourceLocale:round.entry.sourceLocale??'de',translationStatus:round.entry.status==='curated'?'original' as const:translationStatus(round.entry,game.locale)}:null,
  };
}
export type GameView=ReturnType<typeof viewGame>;
