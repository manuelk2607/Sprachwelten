import type {Entry} from './content';
import type {Bilingual} from './challenges';
import {normalizedAnswer} from './challenges';
import {seedEntries} from './seeds';
import {extraSeeds} from './extra-seeds';
import {localizeEntry} from './entry-localization';

// Alternatives are written for the specific expression, rather than borrowed
// from unrelated cards. Never apply them after an editor changes its meaning.
const idioms:[string,string][][]=[
 [['Das Problem hat sich von selbst erledigt.','The problem has resolved itself.'],['Eine ungünstige Entwicklung lässt sich nicht mehr verhindern.','An unfortunate development can no longer be prevented.'],['Eine frühere Entscheidung darf nicht mehr hinterfragt werden.','An earlier decision must no longer be questioned.']],
 [['Ich warte noch auf die entscheidende Information.','I am still waiting for the crucial information.'],['Ich erkenne erst jetzt, worauf jemand hinauswill.','I am only now realising what someone is getting at.'],['Ich möchte dieses Gespräch möglichst schnell beenden.','I want to end this conversation as quickly as possible.']],
 [['Eine unangenehme Wahrheit vor anderen verbergen.','To conceal an uncomfortable truth from others.'],['Jemandem etwas als besser darstellen, als es ist.','To present something as better than it is.'],['Sich von unwichtigen Einzelheiten ablenken lassen.','To let unimportant details distract you.']],
 [['An einer überholten Gewohnheit unbedingt festhalten.','To insist on keeping an outdated habit.'],['Eine Entscheidung ausschließlich den Betroffenen überlassen.','To leave a decision entirely to those affected.'],['Einen Konflikt vor Außenstehenden geheim halten.','To keep a conflict secret from outsiders.']],
 [['Jemandem eine schwierige Verantwortung übertragen.','To burden someone with a difficult responsibility.'],['Jemanden durch übertriebenes Lob beruhigen wollen.','To try to reassure someone with exaggerated praise.'],['Jemanden vor einer unangenehmen Nachricht schützen.','To shield someone from unpleasant news.']],
 [['Das entspricht nicht meinem persönlichen Geschmack.','That does not suit my personal taste.'],['Das habe ich bereits auf eigene Kosten erledigt.','I have already taken care of that at my own expense.'],['Das möchte ich lieber mit jemandem teilen.','I would rather share that with someone.']],
 [['Bei einer Erklärung wichtige Einzelheiten auslassen.','To leave important details out of an explanation.'],['Jemanden mit unnötigen Informationen überfordern.','To overwhelm someone with unnecessary information.'],['Die Schuld für einen Fehler jemand anderem geben.','To blame someone else for a mistake.']],
 [['Eine Auseinandersetzung mit einem klaren Machtwort beenden.','To end an argument with a firm statement.'],['Ein unangenehmes Thema zum ersten Mal direkt ansprechen.','To directly raise an uncomfortable subject for the first time.'],['Nach einem Streit den Kontakt bewusst abbrechen.','To deliberately cut off contact after an argument.']],
 [['Von einer unangenehmen Nachricht überrascht sein.','To be surprised by unpleasant news.'],['Wegen einer unsicheren Lage unentschlossen bleiben.','To remain undecided because a situation is uncertain.'],['Unter großem Zeitdruck arbeiten müssen.','To have to work under severe time pressure.']],
 [['Du musst dich jetzt an eine frühere Zusage halten.','You must now honour an earlier promise.'],['Dein Vorschlag wurde von allen Beteiligten angenommen.','Your proposal has been accepted by everyone involved.'],['Du trägst die Verantwortung für einen vergangenen Fehler.','You bear responsibility for a past mistake.']],
 [['Auf eine Beleidigung mit ebenso harten Worten reagieren.','To respond to an insult with equally harsh words.'],['Eine riskante Entscheidung ohne Vorbereitung treffen.','To make a risky decision without preparing.'],['Aus Stolz eine dringend benötigte Hilfe ablehnen.','To refuse much-needed help out of pride.']],
 [['Eine vertrauliche Information versehentlich ausplaudern.','To accidentally give away confidential information.'],['Eine Antwort absichtlich unverständlich formulieren.','To deliberately phrase an answer incomprehensibly.'],['Beim Erzählen plötzlich den Gedankengang verlieren.','To suddenly lose your train of thought while talking.']],
 [['Eine Einladung ohne klare Zusage offenlassen.','To leave an invitation unanswered without committing.'],['Zu einer Verabredung eine weitere Person mitbringen.','To bring another person along to an appointment.'],['Nach einem Treffen den vereinbarten Betrag nicht bezahlen.','To fail to pay an agreed amount after a meeting.']],
 [['Sich wegen einer Aufgabe nervös und gehetzt fühlen.','To feel nervous and rushed because of a task.'],['Sich über eine andere Person heimlich ärgern.','To feel secretly annoyed with another person.'],['Sich nach langer Arbeit völlig erschöpft fühlen.','To feel completely exhausted after working for a long time.']],
 [['Sich selbst für besser als die anderen halten.','To consider yourself better than everyone else.'],['Sich in einer schwierigen Lage falsche Hoffnungen machen.','To give yourself false hopes in a difficult situation.'],['Eine klare Entscheidung möglichst lange hinauszögern.','To postpone a clear decision for as long as possible.']],
 [['Sich in eine fremde Angelegenheit ungefragt einmischen.','To interfere in someone else’s affairs without being asked.'],['Eine überfällige Entscheidung endlich durchsetzen.','To finally push through an overdue decision.'],['Für einen fremden Fehler die Verantwortung übernehmen.','To accept responsibility for someone else’s mistake.']],
 [['Jemanden vor einer bevorstehenden Gefahr warnen.','To warn someone about an approaching danger.'],['Jemanden auffordern, ein Geheimnis für sich zu behalten.','To ask someone to keep a secret.'],['Jemandem zu einem bereits erreichten Erfolg gratulieren.','To congratulate someone on an achievement already completed.']],
 [['Für eine Entscheidung fehlen noch wichtige Informationen.','Important information is still missing for a decision.'],['Eine Schwierigkeit wurde nur auf einen späteren Zeitpunkt verschoben.','A difficulty has merely been postponed until later.'],['Eine gute Gelegenheit ist unbemerkt vorübergegangen.','A good opportunity has passed unnoticed.']],
 [['Sich vor einem schwierigen Gespräch unnötig fürchten.','To worry unnecessarily about a difficult conversation.'],['Einen lange vermissten Gegenstand zufällig wiederfinden.','To find a long-missing object by chance.'],['Ein Gerücht ohne weitere Prüfung weitererzählen.','To repeat a rumour without checking it.']],
 [['Mit einer unangemessenen Forderung zu weit gehen.','To go too far with an unreasonable demand.'],['Sich gegen eine gut gemeinte Einladung wehren.','To resist a well-meant invitation.'],['Unangekündigt bei einer anderen Person übernachten.','To stay overnight at someone’s home without warning.']],
];
const dialects:[string,string][][]=[
 [['Eine kurze Zustimmung zu einem Vorschlag.','A brief expression of agreement with a suggestion.'],['Eine knappe Entschuldigung nach einem Missgeschick.','A brief apology after a mishap.'],['Ein Zuruf, der jemanden zur Eile antreiben soll.','A call urging someone to hurry.']],
 [['Ein kleines süßes Gebäck mit einer Füllung.','A small sweet pastry with a filling.'],['Eine Portion gebratener Kartoffeln.','A portion of fried potatoes.'],['Ein Behälter für das mitgebrachte Mittagessen.','A container for a packed lunch.']],
 [['Ein ganzer, meist länglicher Brotlaib.','A whole, usually elongated loaf of bread.'],['Ein dünner, in der Pfanne gebackener Teigfladen.','A thin piece of dough cooked in a pan.'],['Ein süßes Blätterteiggebäck mit Füllung.','A sweet filled puff pastry.']],
 [['Ein gemeinsames, mehrgängiges Festessen.','A shared celebratory meal with several courses.'],['Eine warme Nachspeise nach dem Mittagessen.','A hot dessert after lunch.'],['Eine kleine Portion Essen zum Probieren vor dem Kauf.','A small portion offered for tasting before a purchase.']],
 [['Ein höflicher Dank für eine erhaltene Hilfe.','A polite thank-you for receiving help.'],['Ein guter Wunsch, wenn jemand niesen muss.','A good wish said when someone sneezes.'],['Eine Entschuldigung, um an jemandem vorbeizugehen.','An apology used when passing someone.']],
 [['Etwas ohne lange Vorbereitung schnell erledigen.','To finish something quickly without much preparation.'],['Eine andere Person scherzhaft erschrecken.','To startle someone as a joke.'],['Ein Versprechen ohne Ausrede einhalten.','To keep a promise without making excuses.']],
];
const originals=[...seedEntries,...extraSeeds.filter(entry=>entry.kind==='dialect')];
const alternatives=new Map(originals.map((entry,index)=>[entry.id,{entry,choices:(index<seedEntries.length?idioms[index]:dialects[index-seedEntries.length]).map(([de,en])=>({de,en}))}]));
export function starterDistractors(entry:Entry,right:Bilingual):Bilingual[]|undefined{
 const source=alternatives.get(entry.id);
 if(!source||entry.status!=='curated'||normalizedAnswer(entry.phrase)!==normalizedAnswer(source.entry.phrase))return;
 for(const locale of ['de','en'] as const){const original=localizeEntry(source.entry,locale);if(normalizedAnswer(right[locale])!==normalizedAnswer(original.meaning||original.literal))return;}
 return source.choices;
}
