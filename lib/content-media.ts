export const presentations=['text','audio','both'] as const;
export type Presentation=typeof presentations[number];
type Media={presentation?:Presentation;audioId?:string};
// Existing saved rounds and starter cards predate the explicit selection.
export const presentationOf=(entry:Media):Presentation=>entry.presentation??(entry.audioId?'both':'text');
export const hasText=(entry:Media)=>presentationOf(entry)!=='audio';
export const hasAudio=(entry:Media)=>presentationOf(entry)!=='text';
