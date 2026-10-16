import {entryInput,type Entry} from './content';
const bi=(de:string,en:string)=>({de,en});
const jokes=[
 ['Warum ist mein Wörterbuch so gesellig? Es kennt unzählige Wörter, aber sagt nie Nein zu einem neuen Satz.','Das Wörterbuch wird wie eine gesellige Person beschrieben, die gerne neue Sätze kennenlernt.','The dictionary is personified as a sociable person who likes meeting new sentences.'],
 ['Mein Kalender wollte eine Fremdsprache lernen. Er fand aber keinen freien Tag.','Ein Kalender enthält Tage und kann zugleich so wirken, als hätte er keine freie Zeit.','A calendar contains days, while the joke treats it as someone with no time off.'],
 ['Meine Tastatur macht jetzt Yoga. Vor allem die Leertaste braucht mehr Raum.','Die Leertaste erzeugt Abstand; der Witz behandelt sie wie eine Person, die Platz zum Üben braucht.','The space bar creates space and is treated as a person needing room to exercise.'],
 ['Die beiden Satzzeichen gingen getrennte Wege. Sie brauchten erst einmal einen Punkt für sich.','Der Punkt ist zugleich ein Satzzeichen und wird als persönlicher Ruhepunkt dargestellt.','The full stop is both punctuation and an imagined personal stopping point.'],
 ['Mein Wörterbuch macht Urlaub. Es hat endlich einmal keine Worte.','Ein Wörterbuch besteht aus Wörtern; wortlos zu sein wird hier als erholsame Pause dargestellt.','A dictionary consists of words; being speechless is presented as a relaxing break.'],
 ['Das Fragezeichen kam zu spät. Es war sich noch nicht sicher, ob es überhaupt kommen sollte.','Ein Fragezeichen steht für eine Frage; der Witz gibt ihm selbst Zweifel und Unentschlossenheit.','A question mark represents a question and is given doubts and indecision of its own.'],
] as const;
const gaming=[
 ['Wir sollten vor dem nächsten Versuch erst regroupen.','regroupen','Die Gruppe soll sich erst wieder zusammenfinden.','The group should gather together again.'],
 ['Bitte kurz peeken, bevor ihr weitergeht.','peeken','Kurz nachsehen, ob der Weg sicher ist.','Take a quick look to check whether the way is safe.'],
 ['Wir brauchen mehr Heal, bevor wir weitermachen.','Heal','Die Gruppe braucht zuerst Heilung.','The group needs healing first.'],
 ['Lasst uns zur anderen Seite rotieren.','rotieren','Gemeinsam den Standort wechseln.','Move to another location together.'],
 ['Bitte nicht allein pushen, wartet auf das Team.','pushen','Nicht allein vorrücken, sondern zusammenbleiben.','Do not advance alone; stay with the team.'],
 ['Ich habe gerade einen starken Lag.','Lag','Die Verbindung reagiert mit Verzögerung.','The connection is responding with a delay.'],
] as const;
export const communityGameEntries:Entry[]=[...jokes.map(([phrase,de,en],i)=>{
 const choices=[bi(de,en),bi('Der Text gibt eine sachliche Anleitung zum Sprachenlernen.','The text gives factual instructions for language learning.'),bi('Alle Wörter werden hier in ihrer rein wörtlichen Bedeutung benutzt.','Every word is used in a purely literal sense.'),bi('Es geht ausschließlich um eine tatsächliche Sportveranstaltung.','It is solely about an actual sporting event.')];
 const input=entryInput.parse({kind:'joke',phrase,language:'de',literal:de,meaning:de,sourceLocale:'de',challenge:{type:'joke',choices,correctIndex:0}});
 return {...input,id:`70000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,authorName:'Redaktion',status:'curated' as const,createdAt:'2026-10-16T18:00:00Z',translations:{en:{literal:en,meaning:en,example:'',culturalNote:'',origin:'contributor' as const}}};
}),...gaming.map(([phrase,term,de,en],i)=>{
 const choices=[bi(de,en),bi('Die Gruppe soll das Spiel sofort beenden.','The group should stop playing immediately.'),bi('Alle sollen ohne Absprache alleine weitermachen.','Everyone should continue alone without coordinating.'),bi('Die Aussage ist nur eine Begrüßung ohne Handlung.','The statement is only a greeting with no requested action.')];
 const input=entryInput.parse({kind:'gaming_mission',phrase,language:'de',literal:de,meaning:de,sourceLocale:'de',challenge:{type:'relay',term,choices,correctIndex:0}});
 return {...input,id:`70000000-0000-4000-8000-${String(i+101).padStart(12,'0')}`,authorName:'Redaktion',status:'curated' as const,createdAt:'2026-10-16T18:00:00Z',translations:{en:{literal:en,meaning:en,example:'',culturalNote:'',origin:'contributor' as const}}};
})];
