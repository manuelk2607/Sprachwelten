export const musicWorldsURL='https://music-worlds.maki26.workers.dev/';
export const musicMovedMessage='Musikspiele und neue Songbeiträge findet ihr jetzt in Music-Worlds.';
export const isSongContribution=(entry:{challenge?:{type?:string;category?:string}|null})=>entry.challenge?.type==='attribution'&&entry.challenge.category==='song';
/** Applies to newly loaded pools only; stored game decks and legacy editing stay compatible. */
export const liveAttributionCategory=(mode:string)=>mode==='who-said-it'?'person':'';
