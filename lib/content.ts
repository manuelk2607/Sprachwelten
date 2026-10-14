import { z } from 'zod';
import { categoryId, categoryLabel } from './quiz-categories';
import { translationFields, type ContentTranslations } from './content-translations';

export const contentKinds = ['idiom', 'dialect', 'situation', 'word', 'tongue_twister'] as const;
export type ContentKind = typeof contentKinds[number];
export const kindLabels: Record<ContentKind, string> = { idiom: 'Redewendung', dialect: 'Dialekt', situation: 'Alltagssituation', word: 'Wort', tongue_twister: 'Zungenbrecher' };
export const languages: Record<string, string> = { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', sv: 'Schwedisch', nl: 'Niederländisch', pt: 'Portugiesisch', ja: 'Japanisch' };
const text = (max: number) => z.string().trim().max(max).default('');
export const entryInput = z.object({
  kind: z.enum(contentKinds).default('idiom'),
  phrase: z.string().trim().min(1, 'Der Ausdruck ist zu kurz.').max(180),
  language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'Bitte einen gültigen Sprachcode angeben.').max(30),
  literal: text(300),
  meaning: z.string().trim().max(1500).default(''),
  example: text(600), region: text(100), culturalNote: text(1000), context: text(200),
  sourceUrl: z.union([z.literal(''), z.string().url().max(500).refine(s => /^https?:\/\//.test(s))]).default(''),
  sourceLocale:z.enum(['de','en']).optional(),
  regionId:z.string().max(40).optional(),contextId:z.string().max(40).optional(),
  translation:translationFields.optional(),
  translationReviewed:z.boolean().optional(),
}).superRefine((input, ctx) => {
  if(input.translation&&Object.values(input.translation).some(value=>value.trim())&&!input.translationReviewed)ctx.addIssue({code:'custom',path:['translationReviewed'],message:'Bitte die zweite Sprachfassung vor dem Veröffentlichen prüfen.'});
  if (!['word','tongue_twister'].includes(input.kind) && input.meaning.length < 10) ctx.addIssue({code:'custom', path:['meaning'], message:'Bitte die Bedeutung etwas ausführlicher erklären.'});
  if (input.kind !== 'word' && input.phrase.length < 3) ctx.addIssue({code:'custom', path:['phrase'], message:'Der Ausdruck ist zu kurz.'});
  if(input.kind==='word'&&!languages[input.language])ctx.addIssue({code:'custom',path:['language'],message:'Bitte eine der verfügbaren Quizsprachen wählen.'});
  if (input.kind === 'dialect' && !categoryId('region',input.regionId??input.region)) ctx.addIssue({code:'custom',path:['regionId'],message:'Bitte eine Region aus der Liste wählen.'});
  if (input.kind === 'situation' && !categoryId('context',input.contextId??input.context)) ctx.addIssue({code:'custom',path:['contextId'],message:'Bitte einen Gesprächskontext aus der Liste wählen.'});
}).transform(input=>{
  const regionId=categoryId('region',input.regionId??input.region);
  const contextId=categoryId('context',input.contextId??input.context);
  return {...input,regionId,contextId,...(input.kind==='dialect'&&regionId?{region:categoryLabel('region',regionId,'de')} :{}),...(input.kind==='situation'&&contextId?{context:categoryLabel('context',contextId,'de')}:{})};
});
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = Omit<EntryInput,'translation'|'translationReviewed'|'regionId'|'contextId'> & {regionId?:string;contextId?:string;translations?:ContentTranslations; id: string; status: 'curated' | 'community'; authorName: string; createdAt: string };
export const explanationInput = z.object({ body: z.string().trim().min(10).max(1500),sourceLocale:z.enum(['de','en']).optional(),translation:translationFields.optional(),translationReviewed:z.boolean().optional() }).refine(input=>!input.translation?.body||input.translationReviewed,{message:'Bitte die zweite Sprachfassung vor dem Veröffentlichen prüfen.'});
export type Explanation = { id: string; body: string; sourceLocale?:'de'|'en';translations?:ContentTranslations; authorName: string; createdAt: string };
export const playerName = z.string().trim().min(2, 'Bitte mindestens zwei Zeichen verwenden.').max(24);
export const roomCode = z.string().regex(/^[A-Z0-9]{6}$/);
export const ratingScores=z.object({clarity:z.number().int().min(1).max(5),accuracy:z.number().int().min(1).max(5),rhythm:z.number().int().min(1).max(5)});
export type RatingScores=z.infer<typeof ratingScores>;
export const roomAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('answer'), text: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal('vote'), optionId: z.string().uuid() }),
  z.object({ action: z.literal('next') }),
  z.object({ action:z.literal('performed'),speakerId:z.string().uuid(),roundNumber:z.number().int().min(1).max(5) }),
  ratingScores.extend({ action:z.literal('rate'),speakerId:z.string().uuid(),roundNumber:z.number().int().min(1).max(5) }),
]);
export type RoomAction = z.infer<typeof roomAction>;
