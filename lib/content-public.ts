import type {Entry,Explanation} from './content';
/** Account names are moderation metadata, never a fallback for public attribution. */
export const publicEntry=(entry:Entry):Entry=>({...entry,authorName:''});
export const publicExplanation=(entry:Explanation):Explanation=>({...entry,authorName:''});
export type EntryPreview=Pick<Entry,'id'|'kind'|'phrase'|'phraseMarkup'|'presentation'|'status'|'createdAt'>;
export function entryPreview(entry:Entry):EntryPreview {
 const {id,kind,phrase,presentation,status,createdAt}=entry;return {id,kind,phrase,presentation,status,createdAt,...(entry.phraseMarkup?{phraseMarkup:entry.phraseMarkup}:{})};
}
