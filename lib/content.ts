import { z } from 'zod';
import {presentations,type Presentation} from './content-media';
import {challengeSchema,challengeTypes,quizChoiceIdentity} from './challenges';
import { isRegisteredLanguage } from './language-codes';
import type { LanguageNames } from './language-label';
import { categoryId, categoryLabel } from './quiz-categories';
import { translationFields, type ContentTranslations } from './content-translations';
import {parsePhraseMarkup} from './phrase-markup';
import {gameLanguagesInput} from './game-languages';
import {difficultyLevels,type DifficultyLevel} from './editorial-difficulty';

export const contentKinds = ['idiom', 'dialect', 'situation', 'word', 'tongue_twister','gaming_mission','youth_chat','academic','sound_pair','attribution','false_friend','word_order','joke','word_group','loanword','taboo','vocabulary','grammar'] as const;
export type ContentKind = typeof contentKinds[number];
export const kindLabels: Record<ContentKind, string> = { idiom: 'Redewendung', dialect: 'Dialekt', situation: 'Alltagssituation', word: 'Wort', tongue_twister: 'Zungenknoten',gaming_mission:'Gaming-Mission',youth_chat:'Jugendchat',academic:'Akademisch & alltäglich',sound_pair:'Klangfallen',attribution:'Zitat oder Liedstelle',false_friend:'False Friends?',word_order:'Satzbaukasten',joke:'Witz & Pointe',word_group:'Wortverwandtschaft',loanword:'Lehnwort',taboo:'Tabu',vocabulary:'Vokabel',grammar:'Grammatik' };
const literalKinds = new Set<ContentKind>(['idiom','dialect','situation','word','vocabulary']);
export const needsLiteralTranslation=(kind:ContentKind)=>literalKinds.has(kind);
export const languages: Record<string, string> = { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', sv: 'Schwedisch', nl: 'Niederländisch', pt: 'Portugiesisch', ja: 'Japanisch' };
export const tabooLanguagesInput=z.array(z.string().trim().max(30).refine(isRegisteredLanguage,'Bitte eine Sprache aus der Liste wählen.')).min(1).max(10).refine(v=>new Set(v).size===v.length,'Bitte jede Sprache nur einmal auswählen.');
const text = (max: number) => z.string().trim().max(max).default('');
const entryFields = z.object({
  challenge:challengeSchema.optional(),
  kind: z.enum(contentKinds).default('idiom'),
  presentation:z.enum(presentations).optional(),
  sense:text(160),
  phrase:z.string().trim().max(1500).default(''),
  phraseMarkup:z.string().trim().max(900).optional(),
  language:z.string().trim().max(30).refine(isRegisteredLanguage,'Bitte eine Sprache aus dem geprüften Register wählen.'),
  literal:text(300),
  hint:text(300),
  meaning: z.string().trim().max(1500).default(''),
  example: text(600), region: text(100), culturalNote: text(1000), context: text(200),
  sourceUrl: z.union([z.literal(''), z.string().url().max(500).refine(s => /^https?:\/\//.test(s))]).default(''),
  creditName:text(80),
  audioId:z.string().uuid().optional(),
  sourceLocale:z.enum(['de','en']).optional(),
  regionId:z.string().max(40).optional(),contextId:z.string().max(40).optional(),
  translation:translationFields.optional(),
  translationReviewed:z.boolean().optional(),
});
function contentSchema(requireLiteral:boolean){return entryFields.superRefine((input, ctx) => {
  if(input.phraseMarkup){
    const parsed=parsePhraseMarkup(input.phraseMarkup);
    if(!parsed.formatted||parsed.plain.trim()!==input.phrase||input.presentation==='audio')ctx.addIssue({code:'custom',path:['phrase'],message:'Die Hervorhebung muss zum Originalausdruck passen.'});
  }
  if(input.kind!=='joke'&&input.phrase.length>180)ctx.addIssue({code:'custom',path:['phrase'],message:'Der Ausdruck darf höchstens 180 Zeichen haben.'});
  if(requireLiteral&&needsLiteralTranslation(input.kind)&&input.challenge?.type!=='meaning'&&!input.literal)ctx.addIssue({code:'custom',path:['literal'],message:'Bitte eine wörtliche Übersetzung ergänzen.'});
  const presentation=input.presentation??(input.audioId?'both':'text');
  const shortExpression=['taboo','word','false_friend','gaming_mission','youth_chat','loanword','vocabulary'].includes(input.kind);
  if(presentation!=='audio'&&input.phrase.length<(shortExpression?1:3))ctx.addIssue({code:'custom',path:['phrase'],message:'Der Ausdruck ist zu kurz.'});
  if(presentation!=='text'&&!input.audioId)ctx.addIssue({code:'custom',path:['audioId'],message:'Bitte eine Aufnahme oder Audiodatei hinzufügen.'});
  if(presentation==='text'&&input.audioId)ctx.addIssue({code:'custom',path:['audioId'],message:'Wähle Audio aus, um eine Aufnahme zu verwenden.'});
  const expected=challengeTypes[input.kind as keyof typeof challengeTypes];
  if(input.challenge?.type==='learning'){
    if(input.challenge.vocabulary){
      if(input.kind!=='vocabulary'||input.challenge.vocabulary.translationLanguage===input.language)ctx.addIssue({code:'custom',path:['challenge','vocabulary','translationLanguage'],message:'Ausgangs- und Zielsprache müssen verschieden sein.'});
    }
    if(input.kind!==input.challenge.domain)ctx.addIssue({code:'custom',path:['challenge'],message:'Lernaufgabe und Beitragsart müssen übereinstimmen.'});
    if(presentation==='audio')ctx.addIssue({code:'custom',path:['presentation'],message:'Lernaufgaben benötigen auch einen Text.'});
    if(input.kind==='grammar'&&!input.meaning)ctx.addIssue({code:'custom',path:['meaning'],message:'Bitte die Grammatikregel erklären.'});
  }
  const meaningAllowed=['idiom','dialect','gaming_mission','youth_chat','academic'].includes(input.kind)&&input.challenge?.type==='meaning';
  if(expected&&!meaningAllowed&&(input.kind==='gaming_mission'?!['mission','relay'].includes(input.challenge?.type??''):input.challenge?.type!==expected))ctx.addIssue({code:'custom',path:['challenge'],message:'Bitte die Spielaufgabe vollständig ausfüllen.'});
  if(!expected&&input.challenge&&!meaningAllowed)ctx.addIssue({code:'custom',path:['challenge'],message:'Diese Beitragsart benötigt keine Zusatzaufgabe.'});
  if(input.challenge?.type==='taboo'){
    const target=presentation==='audio'?input.challenge.target??'':input.phrase;
    if(input.challenge.forbidden.some(word=>word.trim().toLocaleLowerCase()===target.trim().toLocaleLowerCase()))ctx.addIssue({code:'custom',path:['challenge','forbidden'],message:'Das Suchwort darf nicht selbst unter den fünf Tabuwörtern stehen.'});
    if(presentation==='audio'&&!target)ctx.addIssue({code:'custom',path:['challenge','target'],message:'Bitte das geheime Suchwort zur Aufnahme ergänzen.'});
  }
  if(input.challenge?.type==='friends'&&input.challenge.otherLanguage===input.language)ctx.addIssue({code:'custom',path:['challenge'],message:'Bitte zwei verschiedene Sprachen wählen.'});
  if(input.challenge?.type==='relay'||input.challenge?.type==='academic'||input.challenge?.type==='joke'||input.challenge?.type==='meaning'||input.challenge?.type==='outsider')for(const locale of ['de','en'] as const){const seen=new Set<string>();input.challenge.choices.forEach((value,index)=>{const language=value[locale]?locale:locale==='de'?'en':'de',key=quizChoiceIdentity(value[language]);if(seen.has(key))ctx.addIssue({code:'custom',path:['challenge','choices',index,language],message:'Antworten müssen verschieden sein.'});seen.add(key);});}
  if(input.challenge?.type==='loan'&&input.challenge.originLanguage===input.language)ctx.addIssue({code:'custom',path:['challenge','originLanguage'],message:'Gebersprache und heutige Sprache müssen verschieden sein.'});
  if(input.translation&&Object.values(input.translation).some(value=>value.trim())&&!input.translationReviewed)ctx.addIssue({code:'custom',path:['translationReviewed'],message:'Bitte die zweite Sprachfassung vor dem Veröffentlichen prüfen.'});
  if (input.kind === 'dialect' && !categoryId('region',input.regionId??input.region)) ctx.addIssue({code:'custom',path:['regionId'],message:'Bitte eine Region aus der Liste wählen.'});
  if (input.kind === 'situation' && !categoryId('context',input.contextId??input.context)) ctx.addIssue({code:'custom',path:['contextId'],message:'Bitte einen Gesprächskontext aus der Liste wählen.'});
}).transform(input=>{
  const regionId=categoryId('region',input.regionId??input.region);
  const contextId=categoryId('context',input.contextId??input.context);
  const presentation=input.presentation??(input.audioId?'both':'text');
  return {...input,presentation,phrase:presentation==='audio'?'':input.phrase,regionId,contextId,...(input.kind==='dialect'&&regionId?{region:categoryLabel('region',regionId,'de')} :{}),...(input.kind==='situation'&&contextId?{context:categoryLabel('context',contextId,'de')}:{})};
});}
export const entryInput=contentSchema(true);
// Stored starter cards and saved rounds predate the required translation.
export const storedEntryInput=contentSchema(false);
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = Omit<EntryInput,'translation'|'translationReviewed'|'regionId'|'contextId'|'creditName'|'presentation'|'sense'|'hint'> & {editorialDifficulty?:DifficultyLevel;canonicalVocabularyId?:string|null;hint?:string;sense?:string;presentation?:Presentation;creditName?:string;regionId?:string;contextId?:string;translations?:ContentTranslations; id: string; status: 'curated' | 'community'; authorName: string; createdAt: string;updatedAt?:string;revision?:number;languageNames?:LanguageNames;regionNames?:{de:string;en:string} };
export const learningEntryInput=entryInput.superRefine((input,ctx)=>{if(!['vocabulary','grammar'].includes(input.kind))ctx.addIssue({code:'custom',path:['kind'],message:'Bitte einen Lernbeitrag wählen.'});if(input.kind==='vocabulary'&&(input.challenge?.type!=='learning'||!input.challenge.vocabulary))ctx.addIssue({code:'custom',path:['challenge','vocabulary'],message:'Bitte die Übersetzungssprache ausdrücklich angeben.'});});
export const explanationInput = z.object({ creditName:text(80),body: z.string().trim().min(10).max(1500),sourceLocale:z.enum(['de','en']).optional(),translation:translationFields.optional(),translationReviewed:z.boolean().optional() }).refine(input=>!input.translation?.body||input.translationReviewed,{message:'Bitte die zweite Sprachfassung vor dem Veröffentlichen prüfen.'});
export type Explanation = { creditName?:string;id: string; body: string; sourceLocale?:'de'|'en';translations?:ContentTranslations; authorName: string; createdAt: string };
export const playerName = z.string().trim().min(2, 'Bitte mindestens zwei Zeichen verwenden.').max(24);
export const roomCode = z.string().regex(/^[A-Z0-9]{6}$/);
export const pronunciationLanguageInput=z.string().trim().max(30).refine(value=>value===''||isRegisteredLanguage(value),'Bitte eine Sprache aus dem geprüften Register wählen.');
export const ratingScores=z.object({clarity:z.number().int().min(1).max(5),accuracy:z.number().int().min(1).max(5),rhythm:z.number().int().min(1).max(5)});
export type RatingScores=z.infer<typeof ratingScores>;
export const roomAction = z.discriminatedUnion('action', [
  z.object({action:z.literal('taboo'),event:z.enum(['start','clue','guess','correct','skip','buzz','timeout']),text:z.string().trim().max(300).optional(),matchId:z.uuid(),roundNumber:z.number().int().min(1).max(10),cardIndex:z.number().int().min(1)}),
  z.object({ action: z.literal('start') }),
  z.object({ action:z.literal('configure'),difficulty:z.enum(difficultyLevels).nullable().optional(),gameLanguages:gameLanguagesInput.optional(),rounds:z.number().int().min(1).max(10).optional(),mode:z.enum(['meaning-quiz','language-quiz','dialect-detective','everyday-language','loanword-quiz','tongue-twisters','word-outsider','word-chain','taboo','who-said-it','false-friends','word-builder','joke-quiz']).optional(),meaningCategory:z.enum(['all','expression','gaming','youth','academic']).optional(),pronunciationCategory:z.enum(['both','twister','sound']).optional(),pronunciationLanguage:pronunciationLanguageInput.optional(),sentenceLanguage:z.enum(['de','en']).optional(),tabooLanguages:tabooLanguagesInput.optional(),attributionCategory:z.enum(['both','person','song']).optional() }),
  z.object({ action:z.literal('restart'),rounds:z.number().int().min(1).max(10).optional(),immediate:z.boolean().optional() }),
  z.object({ action:z.literal('leave') }),
  z.object({ action:z.literal('heartbeat') }),
  z.object({ action: z.literal('answer'), text: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal('vote'), optionId: z.string().uuid() }),
  z.object({ action: z.literal('next') }),
  z.object({action:z.literal('call'),text:z.string().trim().min(3).max(300),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('question'),text:z.string().trim().min(3).max(120),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('reply'),forPlayerId:z.string().uuid(),text:z.string().trim().min(3).max(180),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('mission'),path:z.array(z.number().int().min(0).max(8)).min(1).max(31),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('order'),tiles:z.array(z.string().uuid()).min(2).max(16),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('chain'),wordId:z.string().uuid(),turn:z.number().int().min(0).max(20),roundNumber:z.number().int().min(1).max(20),matchId:z.string().uuid()}),
  z.object({action:z.literal('sentence-word'),word:z.string().trim().min(1).max(40),turn:z.number().int().min(0).max(200),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({action:z.literal('sentence-finish'),turn:z.number().int().min(0).max(200),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({action:z.literal('sentence-pass'),turn:z.number().int().min(0).max(200),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({action:z.literal('sentence-timeout'),turn:z.number().int().min(0).max(200),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({action:z.literal('sentence-vote'),proposalId:z.uuid(),approve:z.boolean(),turn:z.number().int().min(0).max(200),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({action:z.literal('wheel-ready'),selectionId:z.uuid(),roundNumber:z.number().int().min(1).max(10),matchId:z.uuid()}),
  z.object({ action:z.literal('performed'),selectionId:z.uuid().optional(),speakerId:z.string().uuid(),roundNumber:z.number().int().min(1).max(20),matchId:z.union([z.string().uuid(),roomCode]) }),
  ratingScores.extend({ action:z.literal('rate'),selectionId:z.uuid().optional(),speakerId:z.string().uuid(),roundNumber:z.number().int().min(1).max(20),matchId:z.union([z.string().uuid(),roomCode]) }),
]);
export type RoomAction = z.infer<typeof roomAction>;
