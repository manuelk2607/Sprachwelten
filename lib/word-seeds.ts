import type { Entry } from './content';

// Original, concise explanations; dictionary links document the selected usage.
const words = [
  ['pt','saudade','Sehnsucht nach einem Menschen, einer Zeit oder etwas, das fehlt.','Longing for a person, a past time or something that is absent.','https://dicionario.priberam.org/saudade'],
  ['sv','lagom','Genau die passende Menge oder das passende Maß; weder zu viel noch zu wenig.','Just the right amount or degree; neither too much nor too little.','https://svenska.se/?q=lagom'],
  ['es','sobremesa','Die Zeit, die man nach dem Essen noch am Tisch verbringt.','The time spent at the table after a meal.','https://dle.rae.es/sobremesa'],
  ['es','madrugar','Sehr früh oder bei Tagesanbruch aufstehen.','To get up very early or at dawn.','https://dle.rae.es/madrugar'],
  ['fr','dépaysement','Das Gefühl, durch eine ungewohnte Umgebung aus dem vertrauten Alltag herauszukommen.','The feeling of being taken out of familiar surroundings into a different environment.','https://www.larousse.fr/dictionnaires/francais/d%C3%A9paysement/23728'],
  ['fr','flâner','Ohne festes Ziel und zum Vergnügen umherschlendern.','To wander without a fixed destination for the pleasure of it.','https://www.larousse.fr/dictionnaires/francais/fl%C3%A2ner/34028'],
  ['it','sprezzatura','Eine bewusst ungezwungene Art, durch die Anstrengung mühelos erscheint.','A deliberate ease of manner that makes effort appear effortless.','https://www.treccani.it/vocabolario/sprezzatura/'],
  ['nl','gezellig','Angenehm gesellig oder gemütlich, etwa in einer vertrauten Runde.','Pleasantly sociable or cosy, for example among familiar company.','https://anw.ivdnt.org/article/gezellig'],
  ['de','Fernweh','Die Sehnsucht danach, in die Ferne zu reisen oder weit weg zu sein.','A longing to travel or to be somewhere far away.','https://de.pons.com/%C3%BCbersetzung/deutsche-rechtschreibung/Fernweh'],
  ['en','serendipity','Das zufällige Entdecken von etwas Gutem oder Nützlichem, nach dem man nicht gesucht hat.','Finding something good or useful by chance while not looking for it.','https://dictionary.cambridge.org/dictionary/english/serendipity?topic=chance-and-randomness'],
] as const;

export const wordSeeds: Entry[] = words.map(([language,phrase,meaning,,sourceUrl],index)=>({
  id:`20000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,
  kind:'word',language,phrase,meaning,sourceUrl,status:'curated',authorName:'Redaktion',
  literal:'',example:'',region:'',culturalNote:'',context:'',createdAt:'2026-10-14T00:00:00.000Z',
}));
export const englishWordMeanings:Record<string,string> = Object.fromEntries(wordSeeds.map((entry,index)=>[entry.id,words[index][3]]));
