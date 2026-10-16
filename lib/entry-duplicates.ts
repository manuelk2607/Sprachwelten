import { z } from 'zod';
import { isRegisteredLanguage } from './language-codes';
import { contentKinds, type EntryInput } from './content';
import { categoryId } from './quiz-categories';

export type ExistingEntry={id:string;phrase:string};
export type EntryIdentity=Pick<EntryInput,'kind'|'phrase'|'language'>&Partial<Pick<EntryInput,'regionId'|'contextId'>>&{audioHash?:string;attributionCategory?:'person'|'song';targetLanguage?:string;otherLanguage?:string;otherWord?:string};
export const duplicateLookupInput=z.object({
  kind:z.enum(contentKinds),
  phrase:z.string().trim().min(1).max(180),
  language:z.string().max(30).refine(isRegisteredLanguage),
  regionId:z.string().max(40).optional(),
  contextId:z.string().max(40).optional(),
  attributionCategory:z.enum(['person','song']).optional(),targetLanguage:z.string().refine(isRegisteredLanguage).optional(),otherLanguage:z.string().refine(isRegisteredLanguage).optional(),otherWord:z.string().trim().min(1).max(100).optional(),
}).superRefine((input,ctx)=>{
  if(input.kind==='attribution'&&!input.attributionCategory||input.kind==='word_order'&&!input.targetLanguage||input.kind==='false_friend'&&(!input.otherLanguage||!input.otherWord))ctx.addIssue({code:'custom',message:'Bitte die Spielaufgabe vollständig ausfüllen.'});
  if(input.kind==='dialect'&&!categoryId('region',input.regionId??''))ctx.addIssue({code:'custom',path:['regionId'],message:'Bitte eine Region aus der Liste wählen.'});
  if(input.kind==='situation'&&!categoryId('context',input.contextId??''))ctx.addIssue({code:'custom',path:['contextId'],message:'Bitte einen Gesprächskontext aus der Liste wählen.'});
}).transform(input=>({...input,regionId:categoryId('region',input.regionId??''),contextId:categoryId('context',input.contextId??'')}));
export const duplicateEntryMessage='Diesen Beitrag gibt es bereits. Du kannst den vorhandenen Beitrag öffnen und eine weitere Erklärung ergänzen.';
export class DuplicateEntryError extends Error {
  constructor(public readonly duplicate?:ExistingEntry){super(duplicateEntryMessage);this.name='DuplicateEntryError';}
}
