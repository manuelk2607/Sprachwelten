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
const jokeDistractors=[
 [bi('Das Wörterbuch lehnt neue Wörter ab, weil es schon voll ist.','The dictionary refuses new words because it is full.'),bi('Das Wörterbuch lädt nur Wörter ein, die sich reimen.','The dictionary only invites words that rhyme.'),bi('Das Wörterbuch kann sprechen, hat aber seinen Satz vergessen.','The dictionary can speak but has forgotten its sentence.')],
 [bi('Der Kalender verwechselt einen Sprachkurs mit einem Feiertag.','The calendar mistakes a language course for a public holiday.'),bi('Der Kalender kennt nur die Namen der Wochentage.','The calendar only knows the names of the weekdays.'),bi('Der Kalender möchte die Tage in eine andere Sprache umbenennen.','The calendar wants to rename the days in another language.')],
 [bi('Die Tastatur möchte leiser tippen, um sich besser zu entspannen.','The keyboard wants to type more quietly to relax.'),bi('Die Eingabetaste muss lernen, wie man tief einatmet.','The Enter key needs to learn to breathe deeply.'),bi('Die Tastatur ersetzt sämtliche Buchstaben durch Yogaübungen.','The keyboard replaces every letter with a yoga exercise.')],
 [bi('Die Satzzeichen suchen einen neuen gemeinsamen Arbeitsplatz.','The punctuation marks are looking for a new shared workplace.'),bi('Die Satzzeichen streiten darüber, wer am Satzende stehen darf.','The punctuation marks argue about who may stand at the end of a sentence.'),bi('Die beiden wechseln nur ihre Position innerhalb eines Satzes.','The two are merely changing positions within a sentence.')],
 [bi('Das Wörterbuch muss im Urlaub neue Vokabeln auswendig lernen.','The dictionary has to memorise new vocabulary on holiday.'),bi('Das Wörterbuch verliert unterwegs versehentlich alle Seiten.','The dictionary accidentally loses all its pages on the trip.'),bi('Das Wörterbuch reist in ein Land ohne geschriebene Sprache.','The dictionary travels to a country without a written language.')],
 [bi('Das Fragezeichen hat seine Einladung nicht richtig gelesen.','The question mark did not read its invitation correctly.'),bi('Das Fragezeichen muss noch auf die Antwort eines anderen Zeichens warten.','The question mark must wait for another mark to answer.'),bi('Das Fragezeichen wurde mit einem Ausrufezeichen verwechselt.','The question mark was mistaken for an exclamation mark.')],
];
const gamingDistractors=[
 [bi('Die Gruppe soll ihre Ausrüstung verbessern.','The group should upgrade its equipment.'),bi('Das Team soll sich auf getrennte Wege aufteilen.','The team should split up and take separate routes.'),bi('Alle sollen sofort den nächsten Angriff beginnen.','Everyone should immediately start the next attack.')],
 [bi('Die Position dauerhaft verlassen und weiterziehen.','Leave the position permanently and move on.'),bi('Die eigene Position im Team markieren.','Mark your position for the team.'),bi('Ungesehen auf einen Gegner zulaufen.','Run towards an opponent without being seen.')],
 [bi('Die Gruppe soll zuerst ihre Munition auffüllen.','The group should replenish its ammunition first.'),bi('Das Team benötigt mehr Schaden gegen den Gegner.','The team needs to deal more damage to the opponent.'),bi('Alle sollen ihre Fähigkeiten für später aufsparen.','Everyone should save their abilities for later.')],
 [bi('Die Blickrichtung ändern, ohne den Standort zu verlassen.','Turn to face another direction without moving.'),bi('Die Spieler sollen ihre Rollen tauschen.','The players should swap roles.'),bi('Am bisherigen Ort auf Verstärkung warten.','Wait for reinforcements at the current location.')],
 [bi('Alle sollen unabhängig voneinander sofort angreifen.','Everyone should attack independently at once.'),bi('Das Team soll sich vollständig aus der Runde zurückziehen.','The team should withdraw from the round completely.'),bi('Nur eine Person soll den nächsten Angriff starten.','Only one person should start the next attack.')],
 [bi('Die eigene Spielfigur ist stark verletzt.','Your character is badly injured.'),bi('Die Fähigkeiten sind noch in der Abklingzeit.','Your abilities are still on cooldown.'),bi('Die Spielfigur bewegt sich wegen ihrer Ausrüstung langsam.','Your character is moving slowly because of its equipment.')],
];
export const communityGameEntries:Entry[]=[...jokes.map(([phrase,de,en],i)=>{
 const choices=[bi(de,en),...jokeDistractors[i]];
 const input=entryInput.parse({kind:'joke',phrase,language:'de',literal:de,meaning:de,sourceLocale:'de',challenge:{type:'joke',choices,correctIndex:0}});
 return {...input,id:`70000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,authorName:'Redaktion',status:'curated' as const,createdAt:'2026-10-16T18:00:00Z',translations:{en:{literal:en,meaning:en,example:'',culturalNote:'',origin:'contributor' as const}}};
}),...gaming.map(([phrase,term,de,en],i)=>{
 const choices=[bi(de,en),...gamingDistractors[i]];
 const input=entryInput.parse({kind:'gaming_mission',phrase,language:'de',literal:de,meaning:de,sourceLocale:'de',challenge:{type:'relay',term,choices,correctIndex:0}});
 return {...input,id:`70000000-0000-4000-8000-${String(i+101).padStart(12,'0')}`,authorName:'Redaktion',status:'curated' as const,createdAt:'2026-10-16T18:00:00Z',translations:{en:{literal:en,meaning:en,example:'',culturalNote:'',origin:'contributor' as const}}};
})];
