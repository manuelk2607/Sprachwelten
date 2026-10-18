import type {PlayableGameMode} from './modes';
export const gameFamilies:{id:PlayableGameMode;title:string;description?:string;modes:PlayableGameMode[]}[]=[
 {id:'meaning-quiz',title:'Was soll das heißen?',modes:['meaning-quiz']},
 {id:'language-quiz',title:'Spurensuche',description:'Wörter, Regionen, Alltagssituationen und Lehnwörter: Ordnet Sprache und Herkunft zu.',modes:['language-quiz','dialect-detective','everyday-language','loanword-quiz']},
 {id:'tongue-twisters',title:'Zungenbrecher',modes:['tongue-twisters']},
 {id:'word-outsider',title:'Wortverbindungen',description:'Sprachliche Außenseiter finden und gemeinsam Wortketten bauen.',modes:['word-outsider','word-chain']},
 {id:'who-said-it',title:'Wer hat das gesagt?',modes:['who-said-it']},
 {id:'false-friends',title:'False Friends?',modes:['false-friends']},
 {id:'word-builder',title:'Satzbaukasten',modes:['word-builder']},
 {id:'joke-quiz',title:'Pointe, bitte!',modes:['joke-quiz']},
];
export const familyFor=(mode:PlayableGameMode)=>gameFamilies.find(f=>f.modes.includes(mode))??gameFamilies[0];
