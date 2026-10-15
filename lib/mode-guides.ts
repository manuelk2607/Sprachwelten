import type { PlayableGameMode } from './modes';

export type ModeGuide={category:string;steps:readonly {title:string;text:string}[];scoring:string;tip:string};
export const modeGuides:Record<PlayableGameMode,ModeGuide>={
  'idiom-bluff':{
    category:'BLUFFEN & ENTDECKEN',
    steps:[
      {title:'Bedeutung erfinden',text:'Alle schreiben eine überzeugende Erklärung zu einer echten Redewendung.'},
      {title:'Wahrheit suchen',text:'Wählt zwischen euren Bluffs und der echten Bedeutung. Die eigene Antwort ist gesperrt.'},
      {title:'Gemeinsam auflösen',text:'Entdeckt die Bedeutung und seht, wer auf welchen Bluff hereingefallen ist.'},
    ],
    scoring:'1 Punkt für die Wahrheit. 1 Punkt für jede Person, die deinen Bluff wählt.',
    tip:'Alle spielen in jeder Runde mit. Die Rundenzahl legt ihr in der Lobby fest.',
  },
  'language-quiz':{
    category:'WÖRTER & SPRACHGEFÜHL',
    steps:[
      {title:'Ein Wort entdecken',text:'Ihr seht ein Wort in seiner Originalschreibweise.'},
      {title:'Eine Sprache wählen',text:'Vier Sprachen stehen zur Auswahl. Jede Person stimmt für eine davon.'},
      {title:'Herkunft erfahren',text:'Sobald alle gewählt haben, erscheinen die richtige Sprache und die Erklärung.'},
    ],
    scoring:'1 Punkt pro richtiger Sprache. Die Rundenzahl legt ihr selbst fest.',
    tip:'Du kannst allein starten oder mit bis zu neun Freunden spielen.',
  },
  'tongue-twisters':{
    category:'VORLESEN & LACHEN',
    steps:[
      {title:'Reihum vorlesen',text:'Jede Person liest denselben vorgegebenen Satz im Raum oder in eurem Sprachchat vor.'},
      {title:'Fair bewerten',text:'Alle anderen vergeben je 1 bis 5 für Verständlichkeit, Genauigkeit und Rhythmus.'},
      {title:'Fortschritte sehen',text:'Nach allen Vorträgen seht ihr die Durchschnittswerte. Danach folgt der nächste Text.'},
    ],
    scoring:'Der Durchschnitt zählt: bis zu 5 Punkte pro Text.',
    tip:'Wählt Zungenknoten oder Klangfallen. Bedeutungen helfen beim Üben; ihr bewertet einander.',
  },
  'dialect-detective':{
    category:'DIALEKTE & REGIONEN',
    steps:[
      {title:'Regionalen Ausdruck lesen',text:'Ihr bekommt ein Wort oder einen Ausdruck aus einer bestimmten Region.'},
      {title:'Region zuordnen',text:'Wählt aus vier Regionen die Herkunft, die ihr für richtig haltet.'},
      {title:'Besonderheiten entdecken',text:'Die Auflösung zeigt die hinterlegte Region, die Bedeutung und regionale Hinweise.'},
    ],
    scoring:'1 Punkt pro richtiger Region. Die Rundenzahl legt ihr selbst fest.',
    tip:'Ähnliche Ausdrücke können auch anderswo vorkommen. Gesucht ist die beim Beitrag hinterlegte Region.',
  },
  'everyday-language':{
    category:'ALLTAG & KULTUR',
    steps:[
      {title:'Eine Formulierung lesen',text:'Ihr seht einen Satz aus dem Alltag und seine Originalsprache.'},
      {title:'Die Absicht erkennen',text:'Welcher der vier Gesprächskontexte passt: etwa eine Bitte, eine Absage oder ein Dank?'},
      {title:'Den Ton verstehen',text:'Die Auflösung erklärt die Hauptabsicht und die kulturellen Feinheiten.'},
    ],
    scoring:'1 Punkt pro passendem Kontext. Die Rundenzahl legt ihr selbst fest.',
    tip:'Achtet auf die Hauptabsicht, den Ton und die Situation.',
  },
"gaming-call":{"category": "GAMING-MISSION", "steps": [{"title": "Geheime Route lesen", "text": "Eine Person erklärt die geheime Route. Das Team setzt die Ansage auf einer Karte um."}, {"title": "Ansage übersetzen", "text": "Die ansagende Person erklärt den Plan. Alle anderen klicken ihre Route auf der Karte."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Die Ansage darf übersetzt und erklärt werden. Erreichen alle die drei Ziele in der richtigen Reihenfolge, erhält jede Person 1 Punkt.", "tip": "Nur die ansagende Person kennt die drei Ziele."},
"generation-chat":{"category": "JUGENDCHAT", "steps": [{"title": "Aufgabe entdecken", "text": "Eine Person erklärt die Nachricht ohne das Jugendwort. Die anderen wählen eine passende Reaktion."}, {"title": "In eigene Worte fassen", "text": "Die erklärende Person darf das Jugendwort nicht wiederholen. Die anderen wählen eine von vier Reaktionen."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Erklärt die Nachricht in eigenen Worten. Wählen alle anderen die passende Reaktion, erhält jede Person 1 Punkt.", "tip": "Fragt nach, wenn die Erklärung noch unklar ist."},
"plain-talk":{"category": "AKADEMISCH & ALLTÄGLICH", "steps": [{"title": "Aufgabe entdecken", "text": "Eine Person erklärt den Gedanken mit höchstens 25 Wörtern. Drei Tabuwörter bleiben draußen."}, {"title": "Mit 25 Wörtern erklären", "text": "Vermeidet die drei Tabuwörter. Eine Rückfrage pro Person ist erlaubt; Antworten zählen zum Wortbudget."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Erklärt alltagstauglich oder präzise. Alle Rückantworten zählen zum Wortbudget. Wählt das gesamte Team richtig, erhält jede Person 1 Punkt.", "tip": "Die Richtung wechselt zwischen Alltagssprache und präziser Erklärung."},
"who-said-it":{"category": "ZITAT ODER LIEDSTELLE", "steps": [{"title": "Aufgabe entdecken", "text": "Bei Personenzitaten sucht ihr die Person, bei Liedstellen den Liedtitel. Die Kategorie steht immer dabei."}, {"title": "Antwort abgeben", "text": "Wer steckt dahinter? Die gesuchte Kategorie steht über der Frage."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Wählt die Person oder den Liedtitel. Drei falsche Antworten kommen aus derselben Kategorie. Jede richtige Antwort bringt 1 Punkt.", "tip": "Die gesuchte Kategorie steht über der Frage."},
"false-friends":{"category": "ZWEI SPRACHEN", "steps": [{"title": "Aufgabe entdecken", "text": "Ihr seht zwei Wörter aus unterschiedlichen Sprachen und ihren Verwendungskontext."}, {"title": "Antwort abgeben", "text": "Gleiche Bedeutung oder False Friend? Bezieht euch auf den angegebenen Kontext. Wörter können mehrere Bedeutungen haben."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Entscheidet, ob die angegebenen Bedeutungen im gezeigten Kontext übereinstimmen. Eine richtige Antwort bringt 1 Punkt.", "tip": "Bezieht euch auf den angegebenen Kontext. Wörter können mehrere Bedeutungen haben."},
"word-builder":{"category": "SATZBAU & ÜBERSETZEN", "steps": [{"title": "Aufgabe entdecken", "text": "Lest den Satz in eurer Oberflächensprache und ordnet die Bausteine zur Übersetzung."}, {"title": "Antwort abgeben", "text": "Wie lautet die Übersetzung? Nur ausdrücklich hinterlegte Lösungen werden gewertet."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Verwendet jeden Baustein genau einmal. Hinterlegte alternative Wortfolgen zählen ebenfalls. Jede richtige Übersetzung bringt 1 Punkt.", "tip": "Nur ausdrücklich hinterlegte Lösungen werden gewertet."}
};
