import {z} from 'zod';
import {isRegisteredLanguage} from './language-codes';
export const bilingual=z.object({de:z.string().trim().max(300),en:z.string().trim().max(300)}).refine(v=>!!(v.de||v.en),'Bitte mindestens eine Sprachfassung angeben.');
export type Bilingual=z.infer<typeof bilingual>;
export const challengeText=(v:Bilingual,locale:'de'|'en')=>v[locale]||v[locale==='de'?'en':'de'];
export const normalizedAnswer=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/gu,' ').trim();
const language=z.string().refine(isRegisteredLanguage,'Bitte eine Sprache aus dem geprüften Register wählen.');
const cell=z.number().int().min(0).max(8);
const choices=z.array(bilingual).length(4);
const meaning=z.object({type:z.literal('meaning'),choices,correctIndex:z.number().int().min(0).max(3)});
const outsider=z.object({type:z.literal('outsider'),rule:bilingual,choices,correctIndex:z.number().int().min(0).max(3),explanation:bilingual});
const loan=z.object({type:z.literal('loan'),originLanguage:language});
const mission=z.object({type:z.literal('mission'),start:cell,blocked:z.array(cell).max(3),checkpoints:z.array(cell).length(3)}).superRefine((v,c)=>{
 const all=[v.start,...v.blocked,...v.checkpoints];if(new Set(all).size!==all.length)c.addIssue({code:'custom',message:'Start, Ziele und Hindernisse müssen verschieden sein.'});
 const seen=new Set([v.start]),queue=[v.start];for(const n of queue)for(const next of neighbors(n))if(!v.blocked.includes(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
 if(v.checkpoints.some(n=>!seen.has(n)))c.addIssue({code:'custom',message:'Alle Ziele müssen erreichbar sein.'});
 for(let stage=0;stage<v.checkpoints.length;stage++){const start=stage?v.checkpoints[stage-1]:v.start,target=v.checkpoints[stage],reached=new Set([start]),paths=[start];for(const n of paths)for(const next of neighbors(n))if(!v.blocked.includes(next)&&!v.checkpoints.slice(stage+1).includes(next)&&!reached.has(next)){reached.add(next);paths.push(next);}if(!reached.has(target))c.addIssue({code:'custom',message:'Alle Ziele müssen in der angegebenen Reihenfolge erreichbar sein.'});}
});
const relay=z.object({type:z.literal('relay'),term:z.string().trim().min(2).max(60),choices,correctIndex:z.number().int().min(0).max(3)});
const academic=z.object({type:z.literal('academic'),direction:z.enum(['plain','precise']),taboo:z.array(bilingual).length(3),choices,correctIndex:z.number().int().min(0).max(3)});
const sound=z.object({type:z.literal('sound'),words:z.array(z.object({word:z.string().trim().min(1).max(60),meaning:bilingual,pronunciation:z.string().trim().max(80)})).length(2)});
const attribution=z.object({type:z.literal('attribution'),category:z.enum(['person','song']),answer:z.string().trim().min(2).max(100),artist:z.string().trim().max(80).default(''),aliases:z.array(z.string().trim().min(1).max(100)).max(5).default([]),alternatives:z.array(z.string().trim().min(2).max(160)).max(3).default([])}).superRefine((v,c)=>{
 if(v.alternatives.length!==0&&v.alternatives.length!==3)c.addIssue({code:'custom',message:'Bitte drei falsche Antworten oder keine angeben.'});
 const keys=[v.answer,...v.aliases].map(normalizedAnswer),other=v.alternatives.map(normalizedAnswer);
 if(new Set(other).size!==other.length||other.some(k=>keys.includes(k)))c.addIssue({code:'custom',message:'Antworten müssen verschieden sein.'});
});
const joke=z.object({type:z.literal('joke'),choices,correctIndex:z.number().int().min(0).max(3)});
const friends=z.object({type:z.literal('friends'),otherWord:z.string().trim().min(1).max(100),otherLanguage:language,sameMeaning:z.boolean(),firstMeaning:bilingual,secondMeaning:bilingual,context:bilingual});
const wordOrder=z.object({type:z.literal('order'),targetLanguage:language,source:z.object({de:z.string().trim().min(1).max(180),en:z.string().trim().min(1).max(180)}),tiles:z.array(z.object({id:z.string().regex(/^[a-z0-9-]{1,30}$/),text:z.string().trim().min(1).max(50)})).min(2).max(16),accepted:z.array(z.array(z.string()).min(2).max(16)).min(1).max(5)}).superRefine((v,c)=>{
 const ids=v.tiles.map(t=>t.id);if(new Set(ids).size!==ids.length)c.addIssue({code:'custom',message:'Jeder Baustein braucht eine eigene ID.'});
 for(const order of v.accepted)if(order.length!==ids.length||new Set(order).size!==ids.length||order.some(id=>!ids.includes(id)))c.addIssue({code:'custom',message:'Jede gültige Wortfolge muss alle Bausteine genau einmal verwenden.'});
});
export const challengeSchema=z.discriminatedUnion('type',[mission,relay,academic,sound,attribution,friends,wordOrder,joke,meaning,outsider,loan]);
export type Challenge=z.infer<typeof challengeSchema>;
export const challengeTypes={gaming_mission:'mission',youth_chat:'relay',academic:'academic',sound_pair:'sound',attribution:'attribution',false_friend:'friends',word_order:'order',joke:'joke',word_group:'outsider',loanword:'loan'} as const;
export type PronunciationCategory='both'|'twister'|'sound';
export type AttributionCategory='both'|'person'|'song';
export const missionTiles:Bilingual[]=[{de:'Beutekiste',en:'Loot crate'},{de:'Brücke',en:'Bridge'},{de:'Turm',en:'Tower'},{de:'Deckung',en:'Cover'},{de:'Basis',en:'Base'},{de:'Heilpunkt',en:'Healing point'},{de:'Lager',en:'Camp'},{de:'Sammelpunkt',en:'Rally point'},{de:'Ausgang',en:'Exit'}];
export function neighbors(n:number){return [n-3,n+3,...(n%3>0?[n-1]:[]),...(n%3<2?[n+1]:[])].filter(i=>i>=0&&i<9);}
export const wordTokens=(s:string):string[]=>s.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu)??[];
export function explanationViolation(challenge:Challenge,text:string,locale:'de'|'en'){
 const words=wordTokens(text).map(normalizedAnswer);
 if(challenge.type==='academic')return words.length>25||challenge.taboo.some(v=>{const term=normalizedAnswer(challengeText(v,locale));return normalizedAnswer(text).includes(term);});
 return challenge.type==='relay'&&normalizedAnswer(text).includes(normalizedAnswer(challenge.term));
}
export const challengeHasFallback=(value:unknown,locale:'de'|'en'):boolean=>{
 if(!value||typeof value!=='object')return false;
 if('de' in value&&'en' in value)return !(value as Bilingual)[locale];
 return Object.values(value).some(v=>challengeHasFallback(v,locale));
};
