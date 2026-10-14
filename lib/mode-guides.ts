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
    scoring:'2 Punkte für die Wahrheit. 1 Punkt für jede Person, die deinen Bluff wählt.',
    tip:'Alle spielen in jeder Runde mit. Nach fünf Runden gewinnt die höchste Punktzahl.',
  },
  'language-quiz':{
    category:'WÖRTER & SPRACHGEFÜHL',
    steps:[
      {title:'Ein Wort entdecken',text:'Ihr seht ein Wort in seiner Originalschreibweise.'},
      {title:'Eine Sprache wählen',text:'Vier Sprachen stehen zur Auswahl. Jede Person stimmt für eine davon.'},
      {title:'Herkunft erfahren',text:'Sobald alle gewählt haben, erscheinen die richtige Sprache und die Erklärung.'},
    ],
    scoring:'2 Punkte pro richtiger Sprache. In fünf Runden sind 10 Punkte möglich.',
    tip:'Du kannst allein starten oder mit bis zu neun Freunden spielen.',
  },
  'tongue-twisters':{
    category:'VORLESEN & LACHEN',
    steps:[
      {title:'Reihum vorlesen',text:'Jede Person liest denselben Zungenbrecher im Raum oder in eurem Sprachchat vor.'},
      {title:'Fair bewerten',text:'Alle anderen vergeben je 1 bis 5 für Verständlichkeit, Genauigkeit und Rhythmus.'},
      {title:'Fortschritte sehen',text:'Nach allen Vorträgen seht ihr die Durchschnittswerte. Danach folgt der nächste Text.'},
    ],
    scoring:'Der Durchschnitt zählt: bis zu 5 Punkte pro Text und 25 Punkte insgesamt.',
    tip:'Ihr bewertet einander. Die App zeichnet keinen Ton auf.',
  },
  'dialect-detective':{
    category:'DIALEKTE & REGIONEN',
    steps:[
      {title:'Regionalen Ausdruck lesen',text:'Ihr bekommt ein Wort oder einen Ausdruck aus einer bestimmten Region.'},
      {title:'Region zuordnen',text:'Wählt aus vier Regionen die Herkunft, die ihr für richtig haltet.'},
      {title:'Besonderheiten entdecken',text:'Die Auflösung zeigt die hinterlegte Region, die Bedeutung und regionale Hinweise.'},
    ],
    scoring:'2 Punkte pro richtiger Region. Fünf Runden, maximal 10 Punkte.',
    tip:'Ähnliche Ausdrücke können auch anderswo vorkommen. Gesucht ist die beim Beitrag hinterlegte Region.',
  },
  'everyday-language':{
    category:'ALLTAG & KULTUR',
    steps:[
      {title:'Eine Formulierung lesen',text:'Ihr seht einen Satz aus dem Alltag und seine Originalsprache.'},
      {title:'Die Absicht erkennen',text:'Welcher der vier Gesprächskontexte passt: etwa eine Bitte, eine Absage oder ein Dank?'},
      {title:'Den Ton verstehen',text:'Die Auflösung erklärt die Hauptabsicht und die kulturellen Feinheiten.'},
    ],
    scoring:'2 Punkte pro passendem Kontext. Fünf Runden, maximal 10 Punkte.',
    tip:'Achtet auf die Hauptabsicht, den Ton und die Situation.',
  },
};
