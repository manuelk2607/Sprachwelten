import {entryInput,type Entry} from './content';
const bi=(de:string,en:string)=>({de,en});
const groups:[string,string,string[],string,string][]=[
 ['de','Wortarten 1',['Tisch','laufen','singen','tanzen'],'Drei Wörter sind Verben in der Grundform.','Three words are verbs in the infinitive.'],
 ['de','Wortarten 2',['schlafen','rot','klein','schnell'],'Drei Wörter sind Adjektive.','Three words are adjectives.'],
 ['de','Mehrzahl 1',['Kind','Kinder','Häuser','Bücher'],'Drei Wörter sind Pluralformen von Nomen.','Three words are plural noun forms.'],
 ['de','Vorsilben 1',['laufen','unfair','unklar','unruhig'],'Drei Wörter bilden mit un- eine Verneinung oder einen Gegensatz.','Three words use the prefix un- to express negation or opposition.'],
 ['de','Endungen 1',['Buch','Freiheit','Schönheit','Krankheit'],'Drei Nomen enden auf -heit.','Three nouns end in -heit.'],
 ['de','Wortfamilien 1',['Leiter','Fahrt','Fahrer','Fahrzeug'],'Drei Wörter gehören zur Wortfamilie von fahren.','Three words belong to the word family of fahren (to travel or drive).'],
 ['de','Steigerung 1',['klein','größer','schneller','kleiner'],'Drei Wörter stehen im Komparativ.','Three words are comparative adjectives.'],
 ['de','Geschlecht 1',['Tisch','Sonne','Blume','Lampe'],'Drei Nomen haben in der Einzahl den bestimmten Artikel die.','Three singular nouns take the definite article die.'],
 ['de','Endungen 2',['Freude','Möglichkeit','Ehrlichkeit','Freundlichkeit'],'Drei Nomen enden auf -keit.','Three nouns end in -keit.'],
 ['de','Vergangenheit 1',['gehen','ging','sang','lief'],'Drei Verben stehen in der dritten Person Singular im Präteritum.','Three verbs are in the third-person singular simple past.'],
 ['en','Word classes 1',['happiness','run','sing','dance'],'Drei Wörter können in ihrer Grundform als Verben verwendet werden.','Three words can be used as base-form verbs.'],
 ['en','Plural forms 1',['child','children','houses','books'],'Drei Wörter sind Pluralformen von Nomen.','Three words are plural noun forms.'],
 ['en','Past tense 1',['walk','went','sang','wrote'],'Drei Wörter sind unregelmäßige Vergangenheitsformen.','Three words are irregular simple-past forms.'],
 ['en','Comparatives 1',['small','bigger','faster','smaller'],'Drei Wörter stehen im Komparativ.','Three words are comparative adjectives.'],
 ['en','Prefixes 1',['happy','unhappy','unfair','unclear'],'Drei Wörter tragen die verneinende Vorsilbe un-.','Three words have the negative prefix un-.'],
 ['en','Endings 1',['quick','slowly','quietly','clearly'],'Drei Wörter sind Adverbien mit der Endung -ly.','Three words are adverbs ending in -ly.'],
 ['en','Word families 1',['book','writer','writing','rewrite'],'Drei Wörter gehören zur Wortfamilie von write.','Three words belong to the word family of write.'],
 ['en','Pronouns 1',['their','he','she','they'],'Drei Wörter sind Personalpronomen in der Subjektform.','Three words are subject personal pronouns.'],
 ['en','Superlatives 1',['big','biggest','fastest','smallest'],'Drei Wörter stehen im Superlativ.','Three words are superlative adjectives.'],
 ['en','Articles 1',['and','a','an','the'],'Drei Wörter sind Artikel.','Three words are articles.'],
];
// Rules explicitly state the sense used, avoiding ambiguous semantic groupings.
export const wordConnectionEntries:Entry[]=groups.map(([language,phrase,words,de,en],index)=>{
 const explanation=bi(`${words[0]} passt nicht zu dieser Regel: ${de}`,`${words[0]} does not follow this rule: ${en}`);
 const input=entryInput.parse({kind:'word_group',language,phrase,sourceLocale:'de',challenge:{type:'outsider',rule:bi(de,en),choices:words.map(word=>bi(word,word)),correctIndex:0,explanation}});
 return {...input,id:`80000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,status:'curated',authorName:'Redaktion',createdAt:'2026-10-17T20:00:00Z'};
});
const loans:[string,string,string,string][]=[
 ['Computer','en','Aus dem Englischen übernommen. Ältere lateinische Wurzeln sind hier nicht die gesuchte Station.','Borrowed from English. Earlier Latin roots are not the stage being asked for.'],
 ['Fitness','en','Die unmittelbare Gebersprache ist Englisch.','The immediate donor language is English.'],
 ['Restaurant','fr','Das deutsche Wort wurde aus dem Französischen übernommen.','The German word was borrowed from French.'],
 ['Pizza','it','Die unmittelbare Gebersprache ist Italienisch; die weiter zurückliegende Herkunft ist ungeklärt.','The immediate donor language is Italian; the more distant origin is uncertain.'],
 ['Kimono','ja','Das deutsche Wort stammt aus dem Japanischen.','The German word comes from Japanese.'],
 ['Karaoke','ja','Der Ausdruck wurde aus dem Japanischen übernommen.','The expression was borrowed from Japanese.'],
 ['Balkon','fr','Ins Deutsche gelangte das Wort aus dem Französischen. Der ältere Weg führt über das Italienische zurück ins Germanische.','The word entered German from French. Its earlier history goes through Italian back to Germanic.'],
 ['Karussell','fr','Die unmittelbare Gebersprache ist Französisch; davor steht italienisch carosello.','The immediate donor language is French, preceded by Italian carosello.'],
];
wordConnectionEntries.push(...loans.map(([phrase,originLanguage,de,en],index)=>{
 const input=entryInput.parse({kind:'loanword',language:'de',phrase,meaning:de,sourceLocale:'de',sourceUrl:`https://www.duden.de/rechtschreibung/${phrase}`,challenge:{type:'loan',originLanguage}});
 return {...input,id:`80000000-0000-4000-8000-${String(index+101).padStart(12,'0')}`,status:'curated' as const,authorName:'Redaktion',createdAt:'2026-10-17T20:00:00Z',translations:{en:{meaning:en,origin:'contributor' as const}}};
}));
