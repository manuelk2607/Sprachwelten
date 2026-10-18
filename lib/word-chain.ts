import type {Entry} from './content';
import {shuffled} from './random';
import {normalizedAnswer} from './challenges';

const banks={
 de:['Apfel','Lampe','Esel','Leben','Nacht','Tisch','Haus','Sonne','Erde','Ente','Ecke','Eiche','Eule','Eisen','Nase','Elefant','Tiger','Regen','Nebel','Lied','Dach','Hut','Tür','Rad','Dorf','Fisch','Hand','Dose','Eimer','Rose','Eis','Salz','Zelt','Tee','Ernte','Engel','Licht','Tal','Land','Dame','Elch','Hose','Erfolg','Gans','Seil','Laub','Buch','Haar','Reise'],
 en:['apple','eagle','earth','house','elephant','tiger','rain','night','tree','east','table','egg','garden','nest','train','nose','ear','river','road','dog','game','engine','eye','edge','elbow','water','rose','energy','year','ring','glass','sun','name','emerald','door','rabbit','tower','room','moon','net','team','milk','kite','evening','gate','event','tea','ant','tent','tail','leaf','farm','map','pen'],
} as const;
export const edgeLetter=(word:string,edge:'first'|'last')=>{const letters=normalizedAnswer(word).replace(/[^\p{L}]/gu,'');return edge==='first'?Array.from(letters)[0]??'':Array.from(letters).at(-1)??'';};
export type ChainRound={queue:string[];turn:number;words:{text:string;playerId?:string}[];choices:{id:string;text:string}[];results:{playerId:string;correct:boolean}[]};
function canContinue(last:string,used:Set<string>,needed:number,bank:readonly string[]):boolean{
 if(!needed)return true;
 return bank.some(word=>!used.has(word)&&edgeLetter(word,'first')===edgeLetter(last,'last')&&canContinue(word,new Set([...used,word]),needed-1,bank));
}
export function chainChoices(chain:ChainRound,locale:'de'|'en'){
 const bank=banks[locale],used=new Set(chain.words.map(word=>word.text)),last=chain.words.at(-1)!.text;
 const matching=bank.filter(word=>!used.has(word)&&edgeLetter(word,'first')===edgeLetter(last,'last')&&canContinue(word,new Set([...used,word]),Math.max(0,chain.queue.length-1),bank));
 const wrong=shuffled(bank.filter(word=>!used.has(word)&&edgeLetter(word,'first')!==edgeLetter(last,'last'))).slice(0,3);
 chain.choices=shuffled([...shuffled(matching).slice(0,1),...wrong].map(text=>({id:crypto.randomUUID(),text})));
 if(!matching.length)throw new Error('The word-chain deck has no valid continuation.');
}
export function chainPrompts():Entry[]{
 return (['de','en'] as const).flatMap(locale=>banks[locale].filter(word=>canContinue(word,new Set([word]),10,banks[locale])).map((word,index)=>({id:`90000000-0000-4000-8000-${String((locale==='de'?100:200)+index).padStart(12,'0')}`,kind:'word' as const,phrase:word,language:locale,presentation:'text' as const,literal:'',meaning:'',example:'',region:'',context:'',sourceUrl:'',culturalNote:'',status:'curated' as const,authorName:'Redaktion',createdAt:'2026-10-17T20:00:00Z'})));
}
