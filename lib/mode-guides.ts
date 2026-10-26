import type { PlayableGameMode } from './modes';

export type ModeGuide={category:string;steps:readonly {title:string;text:string}[];scoring:string;tip:string};
export const modeGuides:Record<PlayableGameMode,ModeGuide>={
  taboo:{category:'WÖRTER ERKLÄREN',steps:[{title:'Sprachen auswählen',text:'Wählt nur Sprachen, die ihr gemeinsam beherrscht. Zwei Teams werden abwechselnd nach Beitritt gebildet.'},{title:'In 60 Sekunden erklären',text:'Nur die erklärende und die kontrollierende Person sehen Suchwort und fünf Tabuwörter. Das eigene Team rät frei.'},{title:'Teams wechseln',text:'Richtige Wörter zählen für das aktive Team. Überspringen und Regelverstöße zählen für die anderen.'}],scoring:'1 Punkt pro Wort. Beide Teams spielen einmal pro Runde.',tip:'Keine Wortteile, Abwandlungen, Abkürzungen, Gesten, Geräusche, Reime oder Buchstabenhinweise. Bei kleinen Kartensammlungen gilt für beide Teams dasselbe Kartenlimit pro Zug.'},
  'meaning-quiz':{category:'BEDEUTUNGEN & ENTDECKEN',steps:[{title:'Kategorie wählen',text:'Wählt Redewendungen, Gaming, Jugendwörter, Hochschulsprache oder alle Kategorien.'},{title:'Bedeutung erraten',text:'Alle sehen denselben Ausdruck und wählen direkt eine von vier Bedeutungen.'},{title:'Gemeinsam auflösen',text:'Nach allen Antworten erscheinen die richtige Bedeutung und weitere Hinweise.'}],scoring:'1 Punkt pro richtiger Bedeutung.',tip:'Die Antworten werden jede Runde gemischt. Allein oder mit Freunden spielbar.'},
  'word-outsider':{category:'WÖRTER VERBINDEN',steps:[{title:'Regel lesen',text:'Drei der vier Wörter erfüllen dieselbe sprachliche Regel.'},{title:'Außenseiter finden',text:'Wählt das Wort, das nicht zur angegebenen Regel passt.'},{title:'Zusammenhang verstehen',text:'Die Auflösung zeigt, warum dieses Wort anders ist.'}],scoring:'1 Punkt pro richtig erkanntem Außenseiter.',tip:'Die Regel ist ausdrücklich angegeben, damit es eine eindeutige Lösung gibt.'},
  'word-chain':{category:'WÖRTER VERBINDEN',steps:[{title:'Satzsprache wählen',text:'Beginnt mit einem Startwort auf Deutsch oder Englisch.'},{title:'Reihum ergänzen',text:'Schreibt ein Wort mit dem Endbuchstaben des vorherigen als Anfang. Die anderen entscheiden mit strikter Mehrheit, ob der Satz sinnvoll weitergeht.'},{title:'Satz abschließen',text:'Ein vollständiger Satz kann beendet werden. Drei Fehlversuche oder ausgelassene Züge in Folge beenden die Runde ebenfalls.'}],scoring:'Jedes akzeptierte Wort bringt 1 Punkt. Für Fehler gibt es 0 Punkte, bei Gleichstand mehrere Gewinner.',tip:'45 Sekunden zum Eingeben, 30 Sekunden zum Abstimmen, höchstens 40 Wörter pro Satz. Bei Stimmengleichstand wird der Vorschlag abgelehnt. Allein entscheidest du selbst über den Sinn. Keine KI-Aufrufe.'},
  'loanword-quiz':{category:'WÖRTER AUF REISEN',steps:[{title:'Vertrautes Wort entdecken',text:'Ihr seht ein Wort, das aus einer anderen Sprache übernommen wurde.'},{title:'Gebersprache wählen',text:'Wählt aus vier Sprachen die unmittelbare Gebersprache.'},{title:'Wortreise erfahren',text:'Die Auflösung erklärt den Entlehnungsweg und nennt die Quelle.'}],scoring:'1 Punkt pro richtig erkannter Gebersprache.',tip:'Bei mehreren Stationen zählt die im Beitrag belegte unmittelbare Gebersprache.'},
  'joke-quiz':{category:'HUMOR & WORTSPIELE',steps:[{title:'Witz entdecken',text:'Lest oder hört einen Witz aus einer anderen Sprachwelt.'},{title:'Pointe deuten',text:'Wählt aus vier Erklärungen die richtige Deutung.'},{title:'Gemeinsam lachen',text:'Die Auflösung erklärt Doppeldeutigkeiten und kulturelle Hintergründe.'}],scoring:'1 Punkt pro verstandener Pointe.',tip:'Beim Einreichen gibst du eine richtige Erklärung und drei falsche Deutungen an.'},
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
      {title:'Ein Wort entdecken',text:'Ihr lest oder hört ein Wort in seiner Originalsprache.'},
      {title:'Eine Sprache wählen',text:'Vier Sprachen stehen zur Auswahl. Jede Person stimmt für eine davon.'},
      {title:'Herkunft erfahren',text:'Sobald alle gewählt haben, erscheinen die richtige Sprache und die Erklärung.'},
    ],
    scoring:'1 Punkt pro richtiger Sprache. Die Rundenzahl legt ihr selbst fest.',
    tip:'Du kannst allein starten oder mit bis zu neun Freunden spielen.',
  },
  'tongue-twisters':{
    category:'VORLESEN & LACHEN',
    steps:[
      {title:'Glücksrad drehen',text:'Das Rad zeigt alle aktiven Personen und wählt eine davon für den nächsten Text. Die letzte Person setzt nach Möglichkeit einmal aus.'},
      {title:'Fair bewerten',text:'Alle anderen vergeben je 1 bis 5 für Verständlichkeit, Genauigkeit und Rhythmus.'},
      {title:'Fortschritte sehen',text:'Nach dem ausgewählten Vortrag seht ihr den Durchschnitt. Beim nächsten Text entscheidet wieder das Rad.'},
    ],
    scoring:'Der Durchschnitt zählt: bis zu 5 Punkte pro Text.',
    tip:'Wählt Zungenknoten oder Klangfallen. Bedeutungen helfen beim Üben; ihr bewertet einander.',
  },
  'dialect-detective':{
    category:'DIALEKTE & REGIONEN',
    steps:[
      {title:'Regionalen Ausdruck entdecken',text:'Ihr lest oder hört einen Ausdruck aus einer bestimmten Region.'},
      {title:'Region zuordnen',text:'Wählt aus vier Regionen die Herkunft, die ihr für richtig haltet.'},
      {title:'Besonderheiten entdecken',text:'Die Auflösung zeigt die hinterlegte Region, die Bedeutung und regionale Hinweise.'},
    ],
    scoring:'1 Punkt pro richtiger Region. Die Rundenzahl legt ihr selbst fest.',
    tip:'Ähnliche Ausdrücke können auch anderswo vorkommen. Gesucht ist die beim Beitrag hinterlegte Region.',
  },
  'everyday-language':{
    category:'ALLTAG & KULTUR',
    steps:[
      {title:'Eine Formulierung entdecken',text:'Ihr lest oder hört einen Satz aus dem Alltag und erfahrt seine Originalsprache.'},
      {title:'Die Absicht erkennen',text:'Welcher der vier Gesprächskontexte passt: etwa eine Bitte, eine Absage oder ein Dank?'},
      {title:'Den Ton verstehen',text:'Die Auflösung erklärt die Hauptabsicht und die kulturellen Feinheiten.'},
    ],
    scoring:'1 Punkt pro passendem Kontext. Die Rundenzahl legt ihr selbst fest.',
    tip:'Achtet auf die Hauptabsicht, den Ton und die Situation.',
  },
"gaming-call":{category:'GAMING & VERSTEHEN',steps:[{title:'Gaming-Ansage entdecken',text:'Eine Person erhält eine kurze Gaming-Ansage und ihre Erklärung.'},{title:'Ohne Fachbegriff erklären',text:'Beschreibt die gewünschte Handlung in eigenen Worten. Der markierte Begriff bleibt draußen.'},{title:'Als Team entscheiden',text:'Alle anderen wählen aus vier Handlungen. Danach seht ihr die ursprüngliche Ansage und ihre Bedeutung.'}],scoring:'Wählt das gesamte Team richtig, erhält jede Person 1 Punkt.',tip:'Eine Rückfrage pro Person hilft beim Verstehen.'},
"generation-chat":{"category": "JUGENDCHAT", "steps": [{"title": "Aufgabe entdecken", "text": "Eine Person erklärt die Nachricht ohne das Jugendwort. Die anderen wählen eine passende Reaktion."}, {"title": "In eigene Worte fassen", "text": "Die erklärende Person darf das Jugendwort nicht wiederholen. Die anderen wählen eine von vier Reaktionen."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Erklärt die Nachricht in eigenen Worten. Wählen alle anderen die passende Reaktion, erhält jede Person 1 Punkt.", "tip": "Fragt nach, wenn die Erklärung noch unklar ist."},
"plain-talk":{"category": "AKADEMISCH & ALLTÄGLICH", "steps": [{"title": "Aufgabe entdecken", "text": "Eine Person erklärt den Gedanken mit höchstens 25 Wörtern. Drei Tabuwörter bleiben draußen."}, {"title": "Mit 25 Wörtern erklären", "text": "Vermeidet die drei Tabuwörter. Eine Rückfrage pro Person ist erlaubt; Antworten zählen zum Wortbudget."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Erklärt alltagstauglich oder präzise. Alle Rückantworten zählen zum Wortbudget. Wählt das gesamte Team richtig, erhält jede Person 1 Punkt.", "tip": "Die Richtung wechselt zwischen Alltagssprache und präziser Erklärung."},
"who-said-it":{"category": "ZITAT ODER LIEDSTELLE", "steps": [{"title": "Aufgabe entdecken", "text": "Bei Personenzitaten sucht ihr die Person, bei Liedstellen den Liedtitel. Die Kategorie steht immer dabei."}, {"title": "Antwort abgeben", "text": "Wer steckt dahinter? Die gesuchte Kategorie steht über der Frage."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Wählt die Person oder den Liedtitel. Drei falsche Antworten kommen aus derselben Kategorie. Jede richtige Antwort bringt 1 Punkt.", "tip": "Die gesuchte Kategorie steht über der Frage."},
"false-friends":{"category": "ZWEI SPRACHEN", "steps": [{"title": "Aufgabe entdecken", "text": "Ihr lest oder hört zwei Wörter aus unterschiedlichen Sprachen. Der Verwendungskontext steht dabei."}, {"title": "Antwort abgeben", "text": "Gleiche Bedeutung oder False Friend? Bezieht euch auf den angegebenen Kontext. Wörter können mehrere Bedeutungen haben."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Entscheidet, ob die angegebenen Bedeutungen im gezeigten Kontext übereinstimmen. Eine richtige Antwort bringt 1 Punkt.", "tip": "Bezieht euch auf den angegebenen Kontext. Wörter können mehrere Bedeutungen haben."},
"word-builder":{"category": "SATZBAU & ÜBERSETZEN", "steps": [{"title": "Aufgabe entdecken", "text": "Lest oder hört den Ausgangssatz und ordnet die Bausteine zur Übersetzung."}, {"title": "Antwort abgeben", "text": "Wie lautet die Übersetzung? Nur ausdrücklich hinterlegte Lösungen werden gewertet."}, {"title": "Auflösen & lernen", "text": "Nach allen Antworten seht ihr die Lösung und die Erklärung."}], "scoring": "Verwendet jeden Baustein genau einmal. Hinterlegte alternative Wortfolgen zählen ebenfalls. Jede richtige Übersetzung bringt 1 Punkt.", "tip": "Nur ausdrücklich hinterlegte Lösungen werden gewertet."}
};
