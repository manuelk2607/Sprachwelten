import { z } from 'zod';

export const contentKinds = ['idiom', 'dialect', 'situation'] as const;
export type ContentKind = typeof contentKinds[number];
export const kindLabels: Record<ContentKind, string> = { idiom: 'Redewendung', dialect: 'Dialekt', situation: 'Alltagssituation' };
export const languages: Record<string, string> = { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', sv: 'Schwedisch', nl: 'Niederländisch', pt: 'Portugiesisch', ja: 'Japanisch' };
const text = (max: number) => z.string().trim().max(max).default('');
export const entryInput = z.object({
  kind: z.enum(contentKinds).default('idiom'),
  phrase: z.string().trim().min(3, 'Der Ausdruck ist zu kurz.').max(180),
  language: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'Bitte einen gültigen Sprachcode angeben.').max(30),
  literal: text(300),
  meaning: z.string().trim().min(10, 'Bitte die Bedeutung etwas ausführlicher erklären.').max(1500),
  example: text(600), region: text(100), culturalNote: text(1000), context: text(200),
  sourceUrl: z.union([z.literal(''), z.string().url().max(500).refine(s => /^https?:\/\//.test(s))]).default(''),
});
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = EntryInput & { id: string; status: 'curated' | 'community'; authorName: string; createdAt: string };
export const explanationInput = z.object({ body: z.string().trim().min(10).max(1500) });
export type Explanation = { id: string; body: string; authorName: string; createdAt: string };
export const playerName = z.string().trim().min(2, 'Bitte mindestens zwei Zeichen verwenden.').max(24);
export const roomCode = z.string().regex(/^[A-Z0-9]{6}$/);
export const roomAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('answer'), text: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal('vote'), optionId: z.string().uuid() }),
  z.object({ action: z.literal('next') }),
]);
export type RoomAction = z.infer<typeof roomAction>;
