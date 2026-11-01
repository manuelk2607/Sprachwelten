import {z} from 'zod';
import type {GameView} from './game';
import {isQuizMode} from './modes';
import {languageLabel} from './language-label';
import {categoryLabel} from './quiz-categories';
import {translate,type Locale} from './translations';

const optionSchema=z.object({text:z.string().max(1000),language:z.string().max(30).optional(),categoryId:z.string().max(40).optional(),categoryKind:z.enum(['region','context']).optional()});
const cardSchema=z.object({round:z.number().int().min(1).max(10),phrase:z.string().max(1500),audioId:z.uuid().optional(),kind:z.enum(['quiz','order']).optional(),answer:optionSchema,chosen:optionSchema,correct:z.boolean(),explanation:z.string().max(1500)}).refine(card=>!!card.phrase||!!card.audioId);
export type LearningCard=z.infer<typeof cardSchema>;
const historySchema=z.object({version:z.literal(1),updatedAt:z.number(),cards:z.array(cardSchema).max(10)});
export const learningKey=(room:Pick<GameView,'code'|'matchId'|'playerId'>)=>`sprachwelten-review:${room.code}:${room.matchId}:${room.playerId}`;
export function readLearningCards(raw:string|null,now=Date.now()):LearningCard[]{
 if(!raw||raw.length>50000)return [];
 try{const data=historySchema.safeParse(JSON.parse(raw));return data.success&&data.data.updatedAt<=now+60000&&now-data.data.updatedAt<86400000?data.data.cards:[];}catch{return [];}
}
export function learningOptionText(option:z.infer<typeof optionSchema>,locale:Locale){
 return option.language?languageLabel(option.language,locale,option.text):option.categoryId&&option.categoryKind&&!option.categoryId.startsWith('custom-')?categoryLabel(option.categoryKind,option.categoryId,locale):translate(option.text,locale);
}
export function rememberLearningRound(cards:LearningCard[],room:GameView):LearningCard[]{
 if(!['reveal','finished'].includes(room.phase)||!room.revelation||!room.prompt)return cards;
 if(cards.some(card=>card.round===room.roundNumber))return cards;
 // Only use this player's already revealed projection. Never infer a transcript
 // from the explanation or fetch hidden cards to populate a review.
 const media={phrase:room.prompt.phrase,...(room.prompt.audioId?{audioId:room.prompt.audioId}:{})};
 if(room.mode==='word-builder'){
  const order=room.wordOrder;
  if(!order?.submitted||!order.ownOrder||typeof order.correct!=='boolean'||!order.solution)return cards;
  const words=order.ownOrder.map(id=>order.tiles.find(tile=>tile.id===id)?.text);
  if(words.some(word=>word===undefined))return cards;
  const chosen=words.join(' ');
  const parsed=cardSchema.safeParse({round:room.roundNumber,...media,kind:'order',answer:{text:order.correct?chosen:order.solution},chosen:{text:chosen},correct:order.correct,explanation:room.revelation.meaning??''});
  return parsed.success?[...cards,parsed.data].slice(-10):cards;
 }
 if(!isQuizMode(room.mode))return cards;
 const answer=room.options.find(option=>option.correct),chosen=room.options.find(option=>option.id===room.selectedOptionId);
 if(!answer||!chosen)return cards;
 const result=cardSchema.safeParse({round:room.roundNumber,...media,answer,chosen,correct:answer.id===chosen.id,explanation:room.revelation.meaning??''});
 return result.success?[...cards,result.data].slice(-10):cards;
}
