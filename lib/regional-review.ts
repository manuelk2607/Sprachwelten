import type {Entry} from './content';
import type {Locale} from './translations';
import {extraSeeds} from './extra-seeds';

// A source check is not a linguistic certification or a difficulty assessment.
// Preserve database content and subsequent editorial edits; enrich only exact
// original starter cards at display time. Never infer an exclusive origin.
export const regionalReviews=[
 {phrase:'Moin',source:'https://www.duden.de/rechtschreibung/moin__moin_',
  de:'Norddeutscher Gruß, auch außerhalb Norddeutschlands umgangssprachlich. Nicht auf den Morgen beschränkt. Duden führt ihn auf ostfriesisch mōi und mittelniederdeutsch moi(e) zurück.',
  en:'A northern German greeting, also used colloquially elsewhere. It is not restricted to the morning. Duden traces it to East Frisian mōi and Middle Low German moi(e).'},
 {phrase:'Bemme',source:'https://www.duden.de/rechtschreibung/Bemme',
  de:'Ostmitteldeutsch, nicht ausschließlich sächsisch. Gemeint ist eine bestrichene oder belegte Brotscheibe. Die Wortherkunft ist ungeklärt; Sachsen steht im Quiz für ein bekanntes Nutzungsgebiet.',
  en:'East Central German, not exclusively Saxon. It means a slice of bread with a spread or topping. The etymology is uncertain; Saxony represents a known area of use in this quiz.'},
 {phrase:'Schrippe',source:'https://www.duden.de/rechtschreibung/Schrippe',
  de:'Besonders berlinische Bezeichnung für ein Brötchen. Berlin ist ein Schwerpunkt des Gebrauchs, keine ausschließliche Herkunftsangabe.',
  en:'A word for a bread roll particularly associated with Berlin. Berlin is a centre of usage, not an exclusive claim of origin.'},
 {phrase:'Jause',source:'https://www.duden.de/rechtschreibung/Jause',
  de:'Österreichische Bezeichnung für eine Zwischenmahlzeit. Je nach Gebrauch kann auch eine kalte Mahlzeit gemeint sein. Die Entlehnung geht auf slowenisch južina zurück; das Nutzungsgebiet ist von der Wortherkunft zu unterscheiden.',
  en:'An Austrian term for a snack or light meal. Usage may include a cold meal. It was borrowed from Slovenian južina; the area of use is distinct from its etymological origin.'},
 {phrase:'Grüezi',source:'https://www.idiotikon.ch/Texte/Landolt/DieZeit_50_2025.pdf',
  de:'Höflicher Gruß besonders in östlichen Teilen der Deutschschweiz. Nicht überall in der Deutschschweiz üblich: Weiter westlich begegnet etwa Grüessech, andernorts Guete Tag. Die Formen gehen auf einen Gruß mit Gott und euch zurück.',
  en:'A polite greeting particularly in eastern parts of German-speaking Switzerland. It is not universal there: further west, Grüessech occurs, while other areas use Guete Tag. The forms derive from a greeting invoking God and addressing you.'},
 {phrase:'schnacken',source:'https://www.duden.de/rechtschreibung/schnacken',
  de:'Norddeutsch für reden oder plaudern, aus dem Niederdeutschen. Das Wort bezeichnet nicht zwingend ein Gespräch in einem bestimmten Ortsdialekt.',
  en:'Northern German for talking or chatting, from Low German. The word does not necessarily describe a conversation in a particular local dialect.'},
].map(review=>({...review,checkedAt:'2026-10-25',review:'source-checked' as const,needsSpecialistReview:true,
 original:extraSeeds.find(entry=>entry.kind==='dialect'&&entry.phrase===review.phrase)!}));

export function regionalReview(entry:Entry){
 return regionalReviews.find(({original})=>entry.status==='curated'&&entry.id===original.id&&entry.kind===original.kind&&entry.language===original.language&&entry.phrase===original.phrase&&entry.meaning===original.meaning&&entry.region===original.region);
}
export function applyRegionalReview(original:Entry,localized:Entry,locale:Locale):Entry{
 const review=regionalReview(original);if(!review)return localized;
 const canUpdateNote=original.culturalNote===review.original.culturalNote&&!(locale==='en'&&original.translations?.en?.culturalNote);
 const qualifier=locale==='de'?'Quellengeprüfte Einordnung; eine fachliche Dialektprüfung steht noch aus.':'Source-checked context; specialist dialect review is still pending.';
 return {...localized,...(original.sourceUrl===review.original.sourceUrl?{sourceUrl:review.source}:{}),
  ...(canUpdateNote?{culturalNote:`${review[locale]} ${qualifier}`}:{})};
}
