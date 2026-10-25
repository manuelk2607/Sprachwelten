# Regionale Startinhalte: Quellenprüfung vom 25. Oktober 2026

Geprüft wurden die sechs ursprünglichen Dialektkarten, nicht sämtliche späteren
Community-Beiträge. Dies ist eine Quellenprüfung, keine sprachwissenschaftliche
Zertifizierung. Alle sechs Karten bleiben als fachlich nachzuprüfen gekennzeichnet.

| Ausdruck | Quelle | Einordnung / Grenzen der Quizantwort |
| --- | --- | --- |
| Moin | [Duden](https://www.duden.de/rechtschreibung/moin__moin_) | Norddeutsch, mittlerweile überregional. Gruß zu verschiedenen Tageszeiten; keine Gleichsetzung mit „Morgen“. |
| Bemme | [Duden](https://www.duden.de/rechtschreibung/Bemme) | Ostmitteldeutsch; belegte bzw. bestrichene Brotscheibe. Sachsen ist ein bekanntes Nutzungsgebiet, kein exklusiver Ursprung. Herkunft ungeklärt. |
| Schrippe | [Duden](https://www.duden.de/rechtschreibung/Schrippe) | Besonders berlinisch; Brötchen. Die Anzeige verwendet den direkten Wörterbucheintrag. |
| Jause | [Duden](https://www.duden.de/rechtschreibung/Jause) | Österreichischer Gebrauch. Neben Zwischenmahlzeit auch kalte Abendmahlzeit und Jausenbrot; slowenische Wortherkunft getrennt vom heutigen Nutzungsgebiet behandeln. |
| Grüezi | [Christoph Landolt, Schweizerisches Idiotikon](https://www.idiotikon.ch/Texte/Landolt/DieZeit_50_2025.pdf) | Östliche Deutschschweiz; andere Gebiete verwenden etwa Grüessech oder Guete Tag. Die Anzeige verlinkt die konkrete fachliche Erläuterung. |
| schnacken | [Duden](https://www.duden.de/rechtschreibung/schnacken) | Norddeutsch; reden/plaudern. Niederdeutsche Herkunft bedeutet nicht, dass jedes bezeichnete Gespräch im Dialekt stattfindet. |

Die Einordnungen stehen in `lib/regional-review.ts` mit Datum und Prüfstatus.
Sie ergänzen ausschließlich passende ursprüngliche Startkarten in der Anzeige.
Gespeicherte Inhalte werden nicht überschrieben. Abweichende Bedeutungen,
Community-Karten, neue Quelllinks und eigene Notizen/Übersetzungen bleiben erhalten.
Spiele übernehmen die Einordnung erst bei der regulären Auflösung, nicht als Lösungshinweis.

Die drei falschen Bedeutungen zu **Bemme** gehören nun ebenfalls zum Thema Brot:
ganzer Laib, einzelnes Brötchen, Zwieback. Keine dieser Alternativen ist die belegte
Brotscheibe. Die übrigen bestehenden Alternativen wurden auf direkte Überschneidung
mit den oben belegten Bedeutungen gesichtet. Beispielsweise bleibt eine kalte Mahlzeit
bei Jause ausdrücklich **keine** falsche Antwort. Ein Quellenbeleg zur Bedeutung ist
jedoch kein Nachweis, dass eine falsche Antwort didaktisch gleich schwer oder in jeder
Mundart eindeutig falsch ist. Dafür stehen regionale Fachprüfung und Spieltests aus.

## Voraussetzungen für Schwierigkeitsstufen

`lib/editorial-difficulty.ts` bereitet eine geschlossene Freigabeprüfung vor.
Eine Kategorie/Originalsprache benötigt je Stufe mindestens **20 verschiedene**
ausdrücklich redaktionell geprüfte Karten: genug für zwei volle Zehn-Runden-Partien.
Jede Einstufung braucht Datum, Quellen und eine begründete Bewertung der Aufgabe,
etwa Vertrautheit der konkreten Bedeutung und erforderliches Kontextwissen.
Textlänge ist kein Einstufungskriterium. Ein pauschales `curated` genügt nicht.

Aktuell fehlen solche Einstufungen; deshalb gibt es weder einen sichtbaren Filter
noch automatisch vergebene Stufen. Die Freigabeprüfung ist vorbereitet und getestet,
noch nicht an Spielpool, Speicherung oder Raumkonfiguration angeschlossen.
Vor dieser nächsten Ausbaustufe: fachliche Prüfung, genügend eingestufte Karten,
separate Migration/Verwaltung, dann durchgängige Pool-/Rematch-/UI-Tests.
