import { languages, ratingScores, type Entry, type RatingScores, type RoomAction } from './content';
import type { Locale } from './translations';
import { localizeEntry } from './entry-localization';
import { contextPool, isQuizMode, modeInfo, prepareChoices, prepareLanguageQuiz, regionPool, type PlayableGameMode } from './modes';
import { shuffled } from './random';

export type Phase='lobby'|'writing'|'voting'|'speaking'|'rating'|'reveal'|'finished';
export type Player={id:string;name:string;tokenHash:string;score:number};
export type Option={id:string;text:string;authorId:string|null;language?:string};
export type PronunciationRound={speakerIndex:number;ratings:Record<string,Record<string,RatingScores>>};
export type Round={entry:Entry;answers:Record<string,string>;votes:Record<string,string>;options:Option[];pronunciation?:PronunciationRound};
export type Game={code:string;locale:Locale;mode?:PlayableGameMode;hostId:string;phase:Phase;players:Player[];prompts:Entry[];roundIndex:number;round:Round|null;totalRounds:number};
export class GameError extends Error {constructor(message:string,public status=409){super(message);}}
export function createGame(code:string,player:Player,locale:Locale='de',mode:PlayableGameMode='idiom-bluff'):Game {
  return {code,locale,mode,hostId:player.id,phase:'lobby',players:[player],prompts:[],roundIndex:0,round:null,totalRounds:5};
}
export function joinGame(game:Game,player:Player) {
  if(game.phase!=='lobby')throw new GameError('Diese Runde hat bereits begonnen.');
  if(game.players.length>=10)throw new GameError('Der Raum ist voll (maximal 10 Personen).');
  if(game.players.some(p=>p.name.toLowerCase()===player.name.toLowerCase()))throw new GameError('Dieser Name ist im Raum schon vergeben.');
  game.players.push(player);
}
function newRound(game:Game) {
  const entry=game.prompts[game.roundIndex];
  game.round={entry,answers:{},votes:{},options:[]};
  game.phase='writing';
  if(game.mode==='tongue-twisters') {
    game.round.pronunciation={speakerIndex:0,ratings:{}};game.phase='speaking';
  } else if(isQuizMode(game.mode)) {
    const choices=game.mode==='language-quiz'
      ?prepareLanguageQuiz(entry.phrase,entry.language,Object.keys(languages)).options
      :prepareChoices(game.mode==='dialect-detective'?entry.region:entry.context,game.mode==='dialect-detective'?regionPool:contextPool);
    game.round.options=choices.map(value=>({id:crypto.randomUUID(),text:game.mode==='language-quiz'?(languages[value]??value):value,authorId:null,...(game.mode==='language-quiz'?{language:value}:{})}));
    game.phase='voting';
  }
}
const correctOption=(game:Omit<Game,'prompts'>,option:Option)=>game.mode==='language-quiz'?option.language===game.round?.entry.language:game.mode==='dialect-detective'?option.text===game.round?.entry.region:game.mode==='everyday-language'?option.text===game.round?.entry.context:option.authorId===null;
const rounded=(value:number)=>Math.round(value*10)/10;
function pronunciationResults(game:Omit<Game,'prompts'>) {
  return game.players.map(player=>{
    const ratings=Object.values(game.round?.pronunciation?.ratings[player.id]??{});
    const average=(key:keyof RatingScores)=>ratings.length?ratings.reduce((sum,rating)=>sum+rating[key],0)/ratings.length:0;
    return {playerId:player.id,name:player.name,ratingCount:ratings.length,clarity:rounded(average('clarity')),accuracy:rounded(average('accuracy')),rhythm:rounded(average('rhythm')),score:rounded((average('clarity')+average('accuracy')+average('rhythm'))/3)};
  });
}
export function act(game:Game,playerId:string,action:RoomAction,prompts:Entry[]=[]) {
  const player=game.players.find(p=>p.id===playerId);
  if(!player)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  if(action.action==='start') {
    if(playerId!==game.hostId)throw new GameError('Nur die Gastgeberin oder der Gastgeber kann starten.',403);
    if(game.phase!=='lobby')throw new GameError('Das Spiel läuft bereits.');
    const info=modeInfo(game.mode);
    if(game.players.length<info.minPlayers)throw new GameError(info.minPlayers===2?'Zum Start braucht ihr mindestens 2 Personen.':'Zum Start braucht ihr mindestens 3 Personen.');
    const eligible=prompts.filter(entry=>entry.kind===info.kind&&(game.mode!=='dialect-detective'||entry.region.trim())&&(game.mode!=='everyday-language'||entry.context.trim()));
    const unique=[...new Map(eligible.map(entry=>[entry.phrase.trim().toLocaleLowerCase(),entry])).values()];
    if(unique.length<game.totalRounds)throw new GameError('Es sind noch nicht genügend Spielkarten vorhanden.');
    game.prompts=shuffled(unique).slice(0,game.totalRounds).map(entry=>localizeEntry(entry,game.locale??'de'));
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
    ratings[playerId]=scores.data;
    if(Object.keys(ratings).length===game.players.length-1) {
      if(performance.speakerIndex+1<game.players.length){performance.speakerIndex++;game.phase='speaking';}
      else {
        for(const result of pronunciationResults(game))game.players.find(p=>p.id===result.playerId)!.score=rounded(game.players.find(p=>p.id===result.playerId)!.score+result.score);
        game.phase='reveal';
      }
    }
    return;
  }
  if(action.action==='answer') {
    if(game.phase!=='writing')throw new GameError('Die Schreibphase ist vorbei.');
    if(round.answers[playerId])throw new GameError('Deine Erklärung ist bereits abgegeben.');
    round.answers[playerId]=action.text;
    if(Object.keys(round.answers).length===game.players.length) {
      round.options=shuffled([{id:crypto.randomUUID(),text:round.entry.meaning,authorId:null},...game.players.map(p=>({id:crypto.randomUUID(),text:round.answers[p.id],authorId:p.id}))]);
      game.phase='voting';
    }
  } else if(action.action==='vote') {
    if(game.phase!=='voting')throw new GameError('Es wird gerade nicht abgestimmt.');
    if(round.votes[playerId])throw new GameError('Deine Stimme ist bereits abgegeben.');
    const option=round.options.find(o=>o.id===action.optionId);
    if(!option||option.authorId===playerId)throw new GameError('Bitte eine fremde Erklärung wählen.',422);
    round.votes[playerId]=option.id;
    if(Object.keys(round.votes).length===game.players.length) {
      for(const [voter,optionId] of Object.entries(round.votes)) {
        const choice=round.options.find(o=>o.id===optionId)!;
        if(isQuizMode(game.mode)) {if(correctOption(game,choice))game.players.find(p=>p.id===voter)!.score+=2;}
        else game.players.find(p=>p.id===(choice.authorId??voter))!.score+=choice.authorId===null?2:1;
      }
      game.phase='reveal';
    }
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
    code:game.code,locale:game.locale??'de',mode:game.mode??'idiom-bluff',hostId:game.hostId,phase:game.phase,playerId,
    roundNumber:Math.min(game.roundIndex+1,game.totalRounds),totalRounds:game.totalRounds,
    players:game.players.map(p=>({id:p.id,name:p.name,score:p.score,answered:!!round?.answers[p.id],voted:!!round?.votes[p.id],rated:!!activeRatings[p.id]})),
    prompt:round?{phrase:round.entry.phrase,...(!quiz||game.mode==='everyday-language'?{language:round.entry.language,literal:round.entry.literal}:{})}:null,
    options:round&&game.phase!=='writing'?round.options.map(option=>({id:option.id,text:option.text,isOwn:option.authorId===playerId,...(option.language?{language:option.language}:{}),...(revealed?{correct:correctOption(game,option),authorName:quiz?'':game.players.find(p=>p.id===option.authorId)?.name??'Die echte Bedeutung',voters:Object.entries(round.votes).filter(([,id])=>id===option.id).map(([id])=>game.players.find(p=>p.id===id)!.name)}:{})})):[],
    selectedOptionId:round?.votes[playerId]??null,
    pronunciation:performance&&speaker?{
      speaker:{id:speaker.id,name:speaker.name},speakerNumber:performance.speakerIndex+1,totalSpeakers:game.players.length,
      ratingCount:Object.keys(activeRatings).length,requiredRatings:game.players.length-1,hasRated:!!activeRatings[playerId],
      results:revealed?pronunciationResults(game):[],
    }:null,
    revelation:revealed&&round?{language:round.entry.language,region:round.entry.region,context:round.entry.context,meaning:round.entry.meaning,example:round.entry.example,culturalNote:round.entry.culturalNote,sourceUrl:round.entry.sourceUrl,status:round.entry.status,authorName:round.entry.authorName}:null,
  };
}
export type GameView=ReturnType<typeof viewGame>;
