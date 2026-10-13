import { z } from 'zod';
import { shuffled } from './game';
export type GameModeId = 'idiom-bluff' | 'language-quiz' | 'tongue-twisters' | 'dialect-detective' | 'everyday-language';
export const gameModes = [
  { id:'idiom-bluff', kind:'idiom', title:'Was soll das heißen?', description:'Eine echte Redewendung. Eure erfundenen Erklärungen.', status:'playable', mechanic:'bluff' },
  { id:'language-quiz', kind:'word', title:'Wortdetektiv', description:'Ein Wort, vier Sprachen. Welche ist die richtige?', status:'coming-soon', mechanic:'four-choice-quiz' },
  { id:'tongue-twisters', kind:'tongue_twister', title:'Zungenbrecher', description:'Wer kann diesen Satz sauber nachsprechen? Eure Runde bewertet die Aussprache.', status:'coming-soon', mechanic:'peer-pronunciation' },
  { id:'dialect-detective', kind:'dialect', title:'So sagt man das bei uns', description:'Regionale Wörter entdecken und ihre Herkunft erraten.', status:'coming-soon', mechanic:'region-guess' },
  { id:'everyday-language', kind:'situation', title:'Kann man das so sagen?', description:'Höflichkeit, Umgangssprache und kulturelle Feinheiten spielerisch entdecken.', status:'coming-soon', mechanic:'context-choice' },
] as const;
export type LanguageQuiz = { word:string; options:[string,string,string,string]; correctLanguage:string };
// Future mode: answers are language codes, and truth stays on the server until reveal.
export function prepareLanguageQuiz(word:string, language:string, languagePool:string[]):LanguageQuiz {
  const other=[...new Set(languagePool)].filter(code=>code!==language);
  if(!word.trim()||other.length<3)throw new Error('A quiz needs a word and three distinct alternative languages.');
  const options=shuffled([language,...shuffled(other).slice(0,3)]) as LanguageQuiz['options'];
  return {word:word.trim(),correctLanguage:language,options};
}
export const pronunciationRating=z.object({
  speakerId:z.string().uuid(),raterId:z.string().uuid(),
  clarity:z.number().int().min(1).max(5),accuracy:z.number().int().min(1).max(5),rhythm:z.number().int().min(1).max(5),
}).refine(r=>r.speakerId!==r.raterId,{message:'Self-ratings are not allowed.'});
export type PronunciationRating=z.infer<typeof pronunciationRating>;
export type TongueTwisterChallenge={entryId:string;text:string;language:string;ratingMethod:'peer';ratings:PronunciationRating[]};
