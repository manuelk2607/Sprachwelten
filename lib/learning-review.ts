import {z} from 'zod';
import type {GameView} from './game';
import {isQuizMode} from './modes';
import {languageLabel} from './language-label';
import {categoryLabel} from './quiz-categories';
import {translate,type Locale} from './translations';

const optionSchema=z.object({text:z.string().max(1000),language:z.string().max(30).optional(),categoryId:z.string().max(40).optional(),categoryKind:z.enum(['region','context']).optional()});
const cardSchema=z.object({round:z.number().int().min(1).max(10),phrase:z.string().min(1).max(1500),answer:optionSchema,chosen:optionSchema,correct:z.boolean(),explanation:z.string().max(1500)});
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
 if(!['reveal','finished'].includes(room.phase)||!room.revelation||!room.prompt?.phrase||!isQuizMode(room.mode))return cards;
 if(cards.some(card=>card.round===room.roundNumber))return cards;
 const answer=room.options.find(option=>option.correct),chosen=room.options.find(option=>option.id===room.selectedOptionId);
 if(!answer||!chosen)return cards;
 const result=cardSchema.safeParse({round:room.roundNumber,phrase:room.prompt.phrase,answer,chosen,correct:answer.id===chosen.id,explanation:room.revelation.meaning??''});
 return result.success?[...cards,result.data].slice(-10):cards;
}
