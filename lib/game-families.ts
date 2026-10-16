import type {PlayableGameMode} from './modes';
export const gameFamilies:{id:PlayableGameMode;title:string;description?:string;modes:PlayableGameMode[]}[]=[
 {id:'idiom-bluff',title:'Was soll das heißen?',modes:['idiom-bluff']},
 {id:'language-quiz',title:'Spurensuche',description:'Wörter, Regionen und Alltagssituationen: Ordnet Sprache und Herkunft zu.',modes:['language-quiz','dialect-detective','everyday-language']},
 {id:'tongue-twisters',title:'Zungenbrecher',modes:['tongue-twisters']},
 {id:'plain-talk',title:'Sag’s verständlich',description:'Gaming, Jugendwörter oder Hochschulsprache: Erklärt euch über Sprachgrenzen hinweg.',modes:['plain-talk','gaming-call','generation-chat']},
 {id:'who-said-it',title:'Wer hat das gesagt?',modes:['who-said-it']},
 {id:'false-friends',title:'False Friends?',modes:['false-friends']},
 {id:'word-builder',title:'Satzbaukasten',modes:['word-builder']},
 {id:'joke-quiz',title:'Pointe, bitte!',modes:['joke-quiz']},
];
export const familyFor=(mode:PlayableGameMode)=>gameFamilies.find(f=>f.modes.includes(mode))??gameFamilies[0];
