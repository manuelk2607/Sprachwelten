import { z } from 'zod';
import { shuffled } from './random';
import { ratingScores } from './content';

export const playableModeIds = ['idiom-bluff','language-quiz','tongue-twisters','dialect-detective','everyday-language'] as const;
export type PlayableGameMode = typeof playableModeIds[number];
export type GameModeId = PlayableGameMode;
export const gameModes = [
  {id:'idiom-bluff',kind:'idiom',title:'Was soll das heißen?',description:'Eine echte Redewendung. Eure erfundenen Erklärungen.',status:'playable',mechanic:'bluff',minPlayers:3,
    headline:'Die besten Bluffs brauchen Gesellschaft.',intro:'Teile den Raumlink mit deinen Freunden. Sobald ihr mindestens drei seid, geht’s los.',details:'3–10 Personen · Runden wählbar · Alle spielen mit',rule:'Eine echte Bedeutung, eure erfundenen Erklärungen. Ein Punkt für die Wahrheit, ein Punkt für jeden erfolgreichen Bluff.',promptLabel:'',question:'Welche Erklärung stimmt?',hint:'Eine davon ist echt. Die anderen? Gute Geschichten.',revealTitle:'DIE ECHTE BEDEUTUNG',scoreLabel:'Echte Bedeutung erkannt'},
  {id:'language-quiz',kind:'word',title:'Wortdetektiv',description:'Ein Wort, vier Sprachen. Welche ist die richtige?',status:'playable',mechanic:'four-choice-quiz',minPlayers:1,
    headline:'Ein Wort. Vier Sprachen.',intro:'Starte allein oder lade Freunde ein. Alle sehen dasselbe Wort und wählen aus vier Sprachen.',details:'1–10 Personen · Runden wählbar · 4 Antworten',rule:'Wählt die Sprache, zu der das Wort gehört. Jede richtige Antwort bringt 1 Punkt. Die Lösung erscheint, sobald alle gewählt haben.',promptLabel:'Ein Wort. Vier Sprachen.',question:'Zu welcher Sprache gehört dieses Wort?',hint:'Vier Sprachen, eine gesuchte Antwort. Vertraue deinem Sprachgefühl.',revealTitle:'DIE GESUCHTE SPRACHE',scoreLabel:'Richtige Sprache erkannt'},
  {id:'tongue-twisters',kind:'tongue_twister',title:'Zungenbrecher',description:'Wer kann diesen Satz sauber nachsprechen? Eure Runde bewertet die Aussprache.',status:'playable',mechanic:'peer-pronunciation',minPlayers:2,
    headline:'Worte, die die Zunge verknoten.',intro:'Lest reihum im selben Raum oder in eurem Sprachchat vor. Die anderen bewerten Verständlichkeit, Genauigkeit und Rhythmus.',details:'2–10 Personen · Texte wählbar · Alle sprechen',rule:'Pro Text ist jede Person einmal dran. Danach bewerten alle anderen drei Kriterien von 1 bis 5. Der Durchschnitt ergibt die Rundenpunkte.',promptLabel:'',question:'',hint:'',revealTitle:'EURE AUSSPRACHERUNDE',scoreLabel:'Durchschnitt der Bewertungen'},
  {id:'dialect-detective',kind:'dialect',title:'So sagt man das bei uns',description:'Regionale Wörter entdecken und ihre Herkunft erraten.',status:'playable',mechanic:'region-guess',minPlayers:1,
    headline:'Ein Ausdruck. Vier Regionen.',intro:'Wo ist dieser Ausdruck zu Hause? Wählt aus vier Regionen und entdeckt danach Bedeutung und regionale Besonderheiten.',details:'1–10 Personen · Runden wählbar · 4 Antworten',rule:'Gesucht ist die beim Beitrag angegebene Region. Eine richtige Antwort bringt 1 Punkt. Ähnliche Ausdrücke können auch anderswo vorkommen.',promptLabel:'Ein Ausdruck. Vier Regionen.',question:'Welche Region suchen wir?',hint:'Wählt die Region, die für diesen Ausdruck hinterlegt ist.',revealTitle:'DIE GESUCHTE REGION',scoreLabel:'Richtige Region erkannt'},
  {id:'everyday-language',kind:'situation',title:'Kann man das so sagen?',description:'Höflichkeit, Umgangssprache und kulturelle Feinheiten spielerisch entdecken.',status:'playable',mechanic:'context-choice',minPlayers:1,
    headline:'Gleiche Worte. Anderer Ton.',intro:'Ordnet Formulierungen dem passenden Gesprächskontext zu. Die Auflösung erklärt Ton, Höflichkeit und Verwendung.',details:'1–10 Personen · Runden wählbar · 4 Antworten',rule:'Wählt den beim Beitrag erklärten Gesprächskontext. Jede richtige Antwort bringt 1 Punkt. Hinweise zur Verwendung folgen nach der Abstimmung.',promptLabel:'Sprache im Alltag',question:'Welcher Gesprächskontext passt hier?',hint:'Denkt an die Hauptabsicht, den Ton und die Situation.',revealTitle:'DER PASSENDE GESPRÄCHSKONTEXT',scoreLabel:'Passenden Kontext erkannt'},
] as const;
export const modeInfo=(mode:PlayableGameMode='idiom-bluff')=>gameModes.find(item=>item.id===mode)??gameModes[0];
export const isQuizMode=(mode?:PlayableGameMode)=>mode==='language-quiz'||mode==='dialect-detective'||mode==='everyday-language';
export const regionPool=['Norddeutschland','Deutschschweiz','Sachsen','Berlin','Schwaben','Österreich','Rheinland','Bayern'];
export const contextPool=['Formelle Bitte','Informelle Begrüßung','Höfliche Absage','Entschuldigung','Direkte Aufforderung','Dank','Zustimmung','Förmliche Begrüßung'];

export function prepareChoices(answer:string,pool:string[]):[string,string,string,string] {
  const normalized=answer.trim();
  const others=[...new Map(pool.map(value=>[value.trim().toLocaleLowerCase(),value.trim()])).values()].filter(value=>value&&value.toLocaleLowerCase()!==normalized.toLocaleLowerCase());
  if(!normalized||others.length<3)throw new Error('A quiz needs one answer and three distinct alternatives.');
  return shuffled([normalized,...shuffled(others).slice(0,3)]) as [string,string,string,string];
}
export type LanguageQuiz={word:string;options:[string,string,string,string];correctLanguage:string};
export function prepareLanguageQuiz(word:string,language:string,pool:string[]):LanguageQuiz {
  if(!word.trim())throw new Error('A quiz needs a word.');
  return {word:word.trim(),correctLanguage:language,options:prepareChoices(language,pool)};
}
export const pronunciationRating=ratingScores.extend({speakerId:z.string().uuid(),raterId:z.string().uuid()}).refine(r=>r.speakerId!==r.raterId,{message:'Self-ratings are not allowed.'});
export type PronunciationRating=z.infer<typeof pronunciationRating>;
export type TongueTwisterChallenge={entryId:string;text:string;language:string;ratingMethod:'peer';ratings:PronunciationRating[]};
