import {hasText} from './content-media';
import type {Game,Round} from './game';
import {GameError} from './game';
import type {RoomAction} from './content';
import {challengeText,explanationViolation,neighbors,wordTokens} from './challenges';
import {shuffled} from './random';
export type TeamRound={callerId:string;call:string;paths:Record<string,number[]>;questions:Record<string,{text:string;reply?:string}>};
export function initializeTeam(game:Game,round:Round){
 round.team={callerId:game.players[game.roundIndex%game.players.length].id,call:'',paths:{},questions:{}};game.phase='briefing';
 const c=round.entry.challenge;if(c?.type==='relay'||c?.type==='academic')round.options=shuffled(c.choices.map((text,index)=>({id:crypto.randomUUID(),text:challengeText(text,game.locale),authorId:null,solution:index===c.correctIndex})));
}
export function routeSucceeds(path:number[],targets:number[]){let next=0;for(const cell of path){if(cell===targets[next])next++;else if(targets.slice(next+1).includes(cell))return false;}return next===targets.length&&path.at(-1)===targets.at(-1);}
export function settleTeam(game:Game){
 const round=game.round,team=round?.team;if(!round||!team||!['mission','voting'].includes(game.phase))return;
 const receivers=game.players.filter(p=>p.id!==team.callerId);if(!receivers.length)return;
 const c=round.entry.challenge;
 if(!receivers.every(p=>c?.type==='mission'?!!team.paths[p.id]:!!round.votes[p.id]))return;
 const success=receivers.every(p=>c?.type==='mission'?routeSucceeds(team.paths[p.id],c.checkpoints):!!round.options.find(o=>o.id===round.votes[p.id])?.solution);
 if(success)for(const p of game.players)p.score++;
 game.phase='reveal';
}
export function teamMemberLeft(game:Game,id:string){const t=game.round?.team;if(!t)return;delete t.paths[id];delete t.questions[id];if(t.callerId===id){t.callerId=game.players[0].id;delete t.paths[t.callerId];if(game.round)delete game.round.votes[t.callerId];}settleTeam(game);}
export function actTeam(game:Game,id:string,action:RoomAction):boolean{
 const r=game.round,t=r?.team;if(!r||!t)return false;
 if(!['call','question','reply','mission'].includes(action.action))return false;
 if(!('matchId' in action)||action.matchId!==game.matchId||action.roundNumber!==game.roundIndex+1)throw new GameError('Diese Eingabe gehört nicht zur aktuellen Runde.');
 const c=r.entry.challenge;if(!c)throw new GameError('Die Spielaufgabe fehlt.');
 if(action.action==='call'){
  if(game.phase!=='briefing'||id!==t.callerId)throw new GameError('Nur die ansagende Person kann jetzt erklären.',403);
  if(explanationViolation(c,action.text,game.locale))throw new GameError('Bitte Wortbudget und verbotene Wörter beachten.',422);
  t.call=action.text;game.phase=c.type==='mission'?'mission':'voting';return true;
 }
 if(!['mission','voting'].includes(game.phase))throw new GameError('Diese Phase ist bereits vorbei.');
 if(action.action==='question'){
  if(id===t.callerId||t.questions[id]||r.votes[id]||t.paths[id])throw new GameError('Eine Rückfrage ist nur vor deiner Antwort möglich.');
  t.questions[id]={text:action.text};return true;
 }
 if(action.action==='reply'){
  const q=t.questions[action.forPlayerId];if(id!==t.callerId||!q||q.reply)throw new GameError('Diese Rückfrage kann gerade nicht beantwortet werden.');
  const combined=[t.call,...Object.values(t.questions).flatMap(q=>q.reply?[q.reply]:[]),action.text].join(' ');
  if(explanationViolation(c,combined,game.locale))throw new GameError('Bitte Wortbudget und verbotene Wörter beachten.',422);
  q.reply=action.text;return true;
 }
 if(action.action==='mission'){
  if(c.type!=='mission'||game.phase!=='mission'||id===t.callerId||t.paths[id])throw new GameError('Deine Route kann gerade nicht abgegeben werden.');
  if(action.path[0]!==c.start||action.path.some((n,i)=>c.blocked.includes(n)||(i>0&&!neighbors(action.path[i-1]).includes(n))))throw new GameError('Bitte eine zusammenhängende Route ohne Hindernisse wählen.',422);
  t.paths[id]=action.path;settleTeam(game);return true;
 }
 return false;
}
export function viewTeam(game:Omit<Game,'prompts'>,id:string){
 const r=game.round,t=r?.team;if(!r||!t)return null;const c=r.entry.challenge,revealed=game.phase==='reveal'||game.phase==='finished',caller=id===t.callerId;
 return {callerId:t.callerId,call:t.call,questions:t.questions,briefing:caller||revealed?{phrase:hasText(r.entry)?r.entry.phrase:'',meaning:r.entry.meaning,term:c?.type==='relay'?c.term:'',direction:c?.type==='academic'?c.direction:null,taboo:c?.type==='academic'?c.taboo.map(v=>challengeText(v,game.locale)):[]}:null,mission:c?.type==='mission'?{start:c.start,blocked:c.blocked,checkpoints:caller||revealed?c.checkpoints:[],ownPath:t.paths[id]??null}:null,results:revealed?game.players.filter(p=>p.id!==t.callerId).map(p=>({name:p.name,correct:c?.type==='mission'?routeSucceeds(t.paths[p.id]??[],c.checkpoints):!!r.options.find(o=>o.id===r.votes[p.id])?.solution})):[],wordsUsed:wordTokens([t.call,...Object.values(t.questions).map(q=>q.reply??'')].join(' ')).length};
}
