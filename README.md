# Sprachwelten

Andere Worte. Neue Welten. Ein eigenständiges Sprachprojekt mit öffentlichem Quellcode: Bedeutungen entdecken, regionale Wörter und Gesprächskontexte erraten, Aussprache üben und Wörter verbinden.

## Spielmodi und Funktionen

- **Was soll das heißen?**: Bedeutungsquiz für 1–10 Personen. Es vereint die bisherigen Spiele „Was soll das heißen?“ und „Sag’s verständlich“: Redewendungen/Dialekte, „Ping! Verstanden?“, Generationenchat und Hochschulsprache sind Kategorien. Alle sehen denselben Ausdruck und wählen unmittelbar seine Bedeutung aus vier gemischten Antworten. Jede richtige Antwort zählt einen Punkt. Vorhandene Bluff- und Teamräume behalten ihre ursprünglichen Abläufe.
- **Spurensuche**: Gemeinsame Familie für Wortdetektiv, regionale Herkunft, Gesprächskontext und **Lehnwortreise**. Beim Lehnwortquiz wird die belegte unmittelbare Gebersprache gesucht; die Auflösung erklärt auch ältere Stationen mit einer Quelle.
- **Wortverbindungen**: Neue Familie mit **Wortverwandtschaft** (unter vier Wörtern den Außenseiter zu einer ausdrücklich angegebenen Regel finden) und **Wortketten** (reihum eine geprüfte Wortkarte mit passendem Anfangsbuchstaben anhängen). Wortketten verwenden einen deutschen beziehungsweise englischen Kartenvorrat und lassen jedes Wort pro Runde nur einmal zu. Jede Person hat pro Runde einen Zug; eine gültige Verbindung zählt einen Punkt. Die Serverprüfung schützt Reihenfolge, fremde und veraltete Züge.
- Die Oberfläche zeigt weiterhin **acht Hauptkacheln**, zunächst die Hälfte mit aufgerundeter Anzahl. Vier frühere Modus-IDs bleiben für gespeicherte Räume kompatibel, stehen im neuen Startmenü aber nicht mehr separat zur Auswahl.
- Beiträge mit vier Antworten besitzen ein Feld **Richtige Antwort** und drei Felder **Falsche Antwort**. Ältere Karten mit einer anderen gespeicherten Lösungsposition werden korrekt umgeordnet angezeigt; die Spiele mischen die Antwortreihenfolge unabhängig davon für jede Runde neu.
- **Wortdetektiv**: Ein Wort, vier Antwortsprachen und genau eine gesuchte Sprache. 1–10 Personen, wählbare Rundenzahl, ein Punkt je richtiger Antwort, gemeinsame Auflösung und Einladungslinks. Solo oder mit Freunden.
- **Zungenbrecher**: 2–10 Personen, wählbare Textanzahl. Jede Person liest jeden Text im gemeinsamen Raum oder Sprachchat vor. Anschließend bewerten alle anderen Verständlichkeit, Genauigkeit und Rhythmus von 1 bis 5. Der Durchschnitt ergibt bis zu fünf Rundenpunkte; Die Oberfläche zeigt Durchschnittswerte pro Person und Kriterium. Bei zwei Personen entspricht der Durchschnitt der Bewertung durch die jeweils andere Person.
- **So sagt man das bei uns**: Dialektquiz mit vier Regionen, Auflösung, Bedeutung und regionalen Hinweisen. 1–10 Personen und wählbare Rundenzahl. Gesucht ist die beim Beitrag hinterlegte Region; regionale Wörter sind nicht exklusiv auf eine Gegend begrenzt.
- **Kann man das so sagen?**: Formulierungen einem von vier Gesprächskontexten zuordnen und Ton, Höflichkeit und Verwendung kennenlernen. 1–10 Personen und wählbare Rundenzahl.
- **Entdecken**: 126 Startkarten über alle Spielvarianten, zunächst sechs Karten und „Mehr anzeigen“, Suche, Sprachfilter, Bedeutungen, Beispielsätze, kulturelle Hinweise und Quellenlinks.
- **Mitmachen**: Spielen, Lesen und neue Text-/Audiobeiträge einreichen sind ohne Konto möglich. Ein optionales E-Mail-Konto über Managed Better Auth auf Neon erlaubt die geräteübergreifende Suche, Bearbeitung und Löschung eigener Beiträge, zusätzliche Erklärungen, geprüfte Verbesserungsvorschläge samt Rückmeldung und automatische Übersetzungsvorschläge. Gastbeiträge werden nicht automatisch einem späteren Konto zugeordnet.
- **Deutsch und Englisch**: Umschalter DE/EN mit gespeicherter Präferenz. Die Startsammlung enthält Erklärungen in beiden Sprachen. Der Gastgeber wählt die Sprache der Spielkarten. Eigene Erklärungen, Beispiele und kulturelle Hinweise können mit getrennten DE/EN-Fassungen veröffentlicht werden. Originalausdrücke bleiben unverändert; fehlende Übersetzungen werden mit Originalsprache gekennzeichnet.
- **Gemeinsame Inhalte**: Alle fünf Eintragstypen können beigetragen werden. Dialekte benötigen eine Region, Alltagssituationen einen Gesprächskontext aus festen zweisprachigen Kategorien. Die drei falschen Quizantworten werden aus anderen Kategorien ergänzt. Wörter, Dialekte, Situationen und Zungenbrecher können direkt in ihrem passenden Spielmodus erscheinen.


Gleiche Beiträge werden bereits im Formular erkannt und beim Speichern durch einen eindeutigen Datenbankindex (mit begrenztem Hash für lange Texte) abgewiesen, auch bei gleichzeitigen Anfragen. Verglichen werden Inhaltstyp, Originalsprache und normalisierter Ausdruck: Großschreibung, Unicode-Schreibvarianten, überzählige Leerzeichen und abschließende Satzzeichen (`.!?…` sowie entsprechende japanische Zeichen) unterscheiden keine neuen Beiträge. Akzente und bedeutungsrelevante Zeichen wie `+` bleiben erhalten. Bei Dialekten zählt zusätzlich die Region, bei Alltagssituationen der Gesprächskontext. Autor, Erklärungssprache und eine andere Beschreibung umgehen die Sperre nicht. Das Formular verlinkt den vorhandenen Eintrag, um dort eine zusätzliche Erklärung beizutragen. Inhaltlich ähnliche Umschreibungen werden nicht automatisch als identisch bewertet.

Richtige Antworten zählen in allen Quizzen und im Bluffspiel einen Punkt. Im Bluffspiel gibt es zusätzlich einen Punkt pro Person, die den eigenen Bluff wählt. Die drei Quizmodi ergeben höchstens einen Punkt pro gewählter Runde; die Bewertung der Zungenbrecher bleibt bei 1 bis 5 je Kriterium.

Community-Beiträge sind sichtbar gekennzeichnet. Alle Modi nutzen Startkarten und passende Community-Beiträge. Quizfragen verwenden die angegebene Sprache, Region oder Situation als Lösung. Schreibweisen, die beim selben Inhaltstyp mehreren Lösungen zugeordnet sind, werden ausgelassen, ebenso doppelte Ausdrücke innerhalb einer Partie. Die Erläuterungen wurden für dieses Projekt formuliert; Quellen dienen der Nachprüfung. Sprachkenntnisse sind zum Bluffen nicht erforderlich.

## Räume, Darstellung und Beiträge

Der Gastgeber wählt 1 bis 10 Runden, unabhängig von der Spielerzahl. Die Voreinstellung ist zwei Runden. Sind weniger ungespielte Aufgaben in der Kategorie verfügbar, wird die Auswahl darauf begrenzt. Nach dem Ergebnis führt „Nächste Partie vorbereiten“ zurück in die Lobby: Dort können das gesamte Spiel, Kategorie und Rundenzahl geändert werden. Kategorie und Rundenzahl stehen nebeneinander. Personen und Raum bleiben erhalten, die Punkte werden zurückgesetzt. Eine private Historie speichert bereits gezeigte Aufgaben über alle Partien, Spiel- und Kategorieänderungen desselben Raums. Ausgeschöpfte Kategorien werden gekennzeichnet und nicht automatisch wiederholt; für einen bewussten Neustart mit bekannten Aufgaben wird ein neuer Raum erstellt.

„Direkt weiterspielen“ startet nach dem Ergebnis im selben Raum sofort eine neue Partie mit unverändertem Spiel, Kategorie, Sprache und Rundenzahl. Dabei werden neue Aufgaben verwendet und die Punkte zurückgesetzt. Reichen ungespielte Aufgaben oder Mitspieler nicht aus, bleibt das Ergebnis erhalten; über „Nächste Partie vorbereiten“ können Einstellungen in der Lobby angepasst werden. Auf dem Desktop steht der Direktstart links, die größere Vorbereitung mittig und das Verlassen rechts.

Eigene Beiträge können nach Ausdruck, Übersetzung und Erklärung durchsucht werden, auch in der zweiten Sprachfassung. Die Suche ist serverseitig auf das angemeldete Konto beschränkt und wird vor der Seiteneinteilung angewendet.

Dialektbeiträge können einen freiwilligen Tipp von bis zu 300 Zeichen enthalten, einschließlich geprüfter zweiter Sprachfassung. Beim Bedeutungs- und Dialektquiz erscheint für die aktuelle Aufgabe „Tipp anzeigen“; jede Person entscheidet selbst, ob sie ihn öffnet. Die nächste Aufgabe beginnt wieder ohne eingeblendeten Tipp. Es gibt keinen Punkteabzug. Fehlende Übersetzungen werden als Originaltext gekennzeichnet. Tipps sind auch nachträglich über die vorhandene Beitragsbearbeitung ergänzbar und in der Suche eigener Beiträge enthalten. Migration 018 ergänzt die Speicherung, ohne bestehende Beiträge zu verändern.

Aufnahmen und Audiodateien lassen sich vor dem Hochladen im Formular zuschneiden. Dateien dürfen bis zu 20 MB und 5 Minuten groß sein; nur der gewählte Ausschnitt von höchstens 20 Sekunden wird als geprüftes WAV gespeichert. Anfang und Ende können über Sekundenfelder oder Schieberegler gesetzt und vorgehört werden. Auch bestehende Aufnahmen können beim Bearbeiten erneut zugeschnitten werden. Abbrechen behält die bisherige Aufnahme.

Antwortpositionen werden mit Fisher–Yates und unverzerrter kryptografischer Zufallsauswahl gemischt. Die 20 ursprünglichen Redewendungen und sechs Dialektausdrücke haben gezielt formulierte bilinguale Falschantworten. Manuell erstellte Antwortmöglichkeiten werden beibehalten. Bei älteren Beiträgen ohne Antwortset bevorzugt die automatische Auswahl denselben Inhaltstyp sowie ähnliche Wortwahl und Länge; sie kann eine redaktionelle Qualitätsprüfung nicht ersetzen.

Auf der Startseite kann man direkt mit dem Raumcode beitreten. In der Lobby gibt es getrennte Schaltflächen für eine Einladung mit Link und Code sowie für den Code allein. Verlassen wird bestätigt, auch bei interner Navigation. Bei einem bestätigten Austritt übernimmt die zuerst beigetretene verbleibende Person. Offene Bluffs, Stimmen und Aussprachebewertungen werden entsprechend angepasst. Sind zu wenige Personen übrig, geht es zurück in die Lobby. Für geschlossene oder länger getrennte Tabs gibt es eine Frist von zwei Minuten; die nächste Aktivmeldung eines anderen Spielers entfernt die ausgefallene Person. Browser können Hintergrundtabs pausieren, deshalb ist das keine sekundengenaue Anwesenheitsanzeige.

Der Hell-/Dunkel-Umschalter sitzt links neben DE/EN und speichert die Wahl lokal. Ohne gespeicherte Wahl gilt die Systemeinstellung. Der Sprachfilter und das Beitragsformular behalten die bisherigen neun Sprachen bei. „Andere Sprache suchen“ durchsucht zusätzlich das lokal gespeicherte [IANA-Sprachregister](https://www.iana.org/assignments/language-subtags-tags-extensions) nach Namen oder Code. Die API akzeptiert ausschließlich registrierte einzelne Sprachcodes; unbestimmte, private und veraltete Codes werden nicht angeboten. Das prüft die Existenz einer registrierten Sprache, nicht die tatsächliche sprachliche Herkunft eines Beitrags. Nicht jeder lokale Dialekt besitzt einen eigenen Code; dann bleibt die zugehörige Sprache mit einer Regionsangabe. `scripts/update-languages.mts` aktualisiert Register und bilinguale Suchbezeichnungen.

Das freiwillige Feld „Beitragende Person“ erscheint bei Einträgen und zusätzlichen Erklärungen. Ohne Angabe wird kein Name gezeigt. Der serverseitige Autor bleibt beim Einreichen mit Anmeldung an das Konto gebunden; Gastbeiträge erhalten eine getrennte, nicht öffentliche Gastkennung.

## Optionale Ausspracheclips

Alle fünf Einreichkategorien unterstützen eine eigene Aufnahme oder einen Audiodateiupload, jeweils bis 20 Sekunden. Der Browser fragt erst nach dem Klick auf „Aufnehmen“ nach Mikrofonzugriff. Er wandelt decodierbare Audiodateien in Mono-PCM-WAV mit 16 kHz um. Eingangsdateien dürfen höchstens 20 MB groß sein. Der Server prüft Dateiaufbau und aus den Audiodaten berechnete Länge (höchstens 640.044 Bytes), statt einer vom Client behaupteten Dauer zu vertrauen. Das Mikrofon wird nach Ende, Ablauf oder Schließen gestoppt.

Migration 007 speichert Zuordnung und Metadaten in Neon. Die eigentlichen Dateien liegen im privaten Cloudflare-R2-Bucket `sprachwelten-audio`, angebunden als `AUDIO`. Uploads benötigen dieselbe Origin und werden einem Konto oder einer zufälligen Gastkennung im HttpOnly-/SameSite-Cookie zugeordnet; nur eigene Clips können angehängt werden. Unveröffentlichte Clips sind nicht öffentlich lesbar. Gastlimits gelten zusätzlich je gehashter IP, sodass ein neuer Cookie das Limit nicht umgeht. Nach Veröffentlichung stehen die Clips im Beitragsdialog und als Hörbeispiel in der aktuellen Spielrunde zur Verfügung, einschließlich Teilabrufen für Audioplayer. Der Dateiname enthält keine Quizlösung. Verlassen des Formulars entfernt einen bereits hochgeladenen, noch nicht angehängten Clip nach Möglichkeit wieder.

Es gelten 20 Uploadversuche pro Mitglied und Tag und ein anwendungsweiter Speicherdeckel von 500 Clips (höchstens rund 320 MB Audiodaten). Abgebrochene, erfolgreich entfernte Clips geben ihren Speicherplatz wieder frei. Fehlgeschlagene Uploads werden aus dem Speicherzähler zurückgenommen; beim abrupten Abbruch ohne erfolgreiche Bereinigung können private Dateien übrig bleiben. Ein späterer Wartungsjob sollte solche verwaisten Dateien entfernen. Die Grenze begrenzt keine Lesezugriffe; bei größerer Öffentlichkeit sollten R2-Nutzung und Missbrauch beobachtet werden. Die Anwendung aktiviert keinen kostenpflichtigen Tarif automatisch.

Für eine eigene Installation den Bucket zuvor mit `wrangler r2 bucket create sprachwelten-audio` anlegen oder den Namen in `vite.config.ts` und `scripts/deploy-cloudflare.mts` anpassen. Ohne Binding bleiben Beiträge ohne Audio möglich. Die Clips sind Hörbeispiele; ein Live-Sprachraum ist bislang nur [als Vorschlag beschrieben](docs/spielideen-und-sprachraum.md).

## Lokal starten

Node.js 24 oder neuer (CI: Node 24), npm und ein eigenes Neon-Projekt mit aktivierter E-Mail-/Passwort-Anmeldung.

```sh
npm ci
cp .env.example .env.local
# Werte in .env.local eintragen.
npm run db:migrate
npm run db:seed
npm run dev
```

Der lokale Server zeigt seine Adresse im Terminal. Die aktuelle Konfiguration startet auf Port 5176. Diese Adresse muss im Neon-Auth-Projekt als vertrauenswürdige Domain freigegeben sein. Auth wird unter `/api/auth/*` über den offiziellen Neon-Server-SDK vermittelt; ein eigener Browser-Login wird nicht implementiert.

Die `.env.local` enthält den gepoolten `DATABASE_URL`, den direkten `DATABASE_URL_UNPOOLED` für Migrationen, `NEON_AUTH_BASE_URL` und `NEON_AUTH_COOKIE_SECRET`. Letzteren mit `openssl rand -base64 48` erzeugen. Zugangsdaten werden nicht veröffentlicht. Passwörter und Sitzungen liegen beim Auth-Anbieter, nicht im Anwendungscode.

## Architektur

TypeScript (`.ts`, `.tsx`, `.mts`) für Anwendung, Konfiguration und eigene Laufzeitskripte; React / Next.js App Router über Vinext und Vite; serverseitige HTTP-Abfragen mit `@neondatabase/serverless`; PostgreSQL auf Neon. Die Anwendung ist für Cloudflare Workers vorbereitet und kann direkt im eigenen Cloudflare-Konto oder über Sites veröffentlicht werden. Der Code kann unabhängig davon mit eigener Infrastruktur betrieben werden.

- `lib/game.ts`: Spielregeln, Phasen, Wertung und explizite öffentliche Projektion.
- `lib/i18n.tsx` / `lib/translations.ts`: zweisprachige Oberfläche; `lib/entry-localization.ts`: englische Startsammlung.
- `lib/modes.ts`: alle Spielvarianten, Spielerzahlen, Regeln und Quizvorbereitung.
- `components/pronunciation-round.tsx`: Vorlesephase, geschützte Bewertung und Durchschnittswerte je Person.
- `lib/extra-seeds.ts`: regionale Ausdrücke, Alltagssituationen und eigene Übungssätze mit deutschen und englischen Erläuterungen.
- `lib/content.ts`: gemeinsame Inhaltstypen und Eingabeprüfung mit Zod.
- `db/repository.ts`: parametrisierte Queries und atomare Änderungen an Räumen mit Versionsprüfung.
- `db/migrations/`: Schema als versionierte Migrationen mit angewandtem Migrationsstand.
- `app/api/`: öffentliche Lese- und Einreich-Endpunkte, geschützte Kontoverwaltung und Spielraum-API.
- `components/`: responsive Oberfläche mit nativen modalen Dialogen.
- `lib/site.ts`: zentraler Appname und Repository-Link.

Eine Spieleridentität besteht aus einem zufälligen raumbezogenen Token. Der Server speichert dessen SHA-256-Hash und prüft ihn vor jeder Spielaktion; Kontoidentität und Spielidentität sind getrennt. Lösungen, Zuordnung der Bluffs und kommende Karten erscheinen nicht in der Spielantwort vor ihrer vorgesehenen Phase. Aussprachebewertungen sind an Sprecher, Runde und serverseitig geprüfte Mitspieleridentität gebunden. Selbstbewertungen, doppelte Bewertungen und Übertragungen aus einer früheren Runde werden abgewiesen; Rohbewertungen und Raterzuordnungen werden nicht veröffentlicht. Die öffentliche Sammlung enthält ihre Bedeutungen bewusst; absichtliches Nachschlagen ist keine vom Spiel verhinderte Form des Schummelns.

Schreibanfragen sind an dieselbe Origin gebunden und begrenzt. Autoren werden aus der serverseitigen Sitzung übernommen. Beiträge werden als Text dargestellt. Die Queries sind paginiert, liefern benannte Spalten und schließen zukünftige Spielkarten schon in SQL aus Polling-Abfragen aus. Räume werden nach 24 Stunden unzugänglich.

## Zweisprachige Community-Beiträge und Cloudflare Workers AI

`source_locale` bezeichnet die Sprache der Erklärung, unabhängig von der Sprache des Originalausdrucks. Der Originaltext bleibt in den bisherigen Spalten, die zweite Sprachfassung liegt in `translations` als JSON. Beide Fassungen werden getrennt gespeichert. Die Formularvorschau kann vor der Veröffentlichung bearbeitet werden und benötigt eine Bestätigung. Auch zusätzliche Erklärungen unterstützen beide Sprachen. Fehlende Felder zeigen den Originaltext mit Sprachhinweis; für kulturelle Nuancen ist die Prüfung durch den Beitragenden erforderlich. Ändert sich der Ausgangstext im Formular, wird eine vorhandene zweite Fassung zurückgesetzt.

Automatische Vorschläge verwenden das native `AI`-Binding von Cloudflare Workers AI und das Übersetzungsmodell [`@cf/meta/m2m100-1.2b`](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/). Ein eigener Übersetzungs-API-Schlüssel ist nicht erforderlich. Das Binding wird in `vite.config.ts` und bei der direkten Veröffentlichung eingerichtet. Lokale AI-Aufrufe laufen über Cloudflare und benötigen eine Wrangler-Anmeldung.

Die App sendet nur ausgefüllte Erklärungstexte, keine Originalausdrücke, Konto- oder Sitzungsdaten. Längere Felder werden in kurze Abschnitte zerlegt. Vorschläge müssen geprüft und können vor der Veröffentlichung bearbeitet werden. Bei Ausfällen oder ausgeschöpftem Kontingent bleiben manuelle Übersetzungen und Originaltexte verfügbar. Es findet keine Übersetzung während Spielrunden oder Polling statt. `/api/translations` erfordert für Vorschläge eine Anmeldung und begrenzt sie pro Mitglied auf 20 pro Stunde. Ergebnisse werden anhand von Modell, Text und Sprachrichtung dauerhaft wiederverwendet.

Zusätzlich reserviert die App maximal 50.000 Eingabezeichen pro UTC-Tag; fehlgeschlagene Versuche behalten ihre Reservierung. Diese lokale Grenze ist unabhängig von Cloudflares kontoweitem Neuron-Kontingent und garantiert kein bestimmtes Übersetzungsvolumen. Der [kostenlose Workers-AI-Tarif](https://developers.cloudflare.com/workers-ai/platform/pricing/) umfasst aktuell 10.000 Neurons pro Tag; auch andere AI-Nutzung im Konto zählt dazu. Ohne bezahlten Tarif schlagen weitere Aufrufe nach Verbrauch des Kontingents fehl. Die App nimmt keinen automatischen Tarifwechsel vor. Bestehende Datenbankmigrationen und historische Verbrauchszähler bleiben erhalten.

Neue Quizbeiträge speichern Sprachcodes, `region_id` beziehungsweise `context_id`. Anzeigenamen werden separat lokalisiert, die Wertung verwendet die Kennungen. Migration 004 ordnet bekannte Altbezeichnungen zu. Unbekannte alte Regionen/Kontexte bleiben in der Sammlung erhalten und werden im Quiz ausgelassen, bis sie einer Kategorie zugeordnet sind.

## Direkt im eigenen Cloudflare-Konto veröffentlichen

```sh
npm run typecheck
npm test
npm run build
npx wrangler login
npm run deploy:cloudflare
```

Das TypeScript-Skript verwendet den erzeugten Worker-Build, aktiviert `workers.dev` für den Worker `sprachwelten` und übernimmt `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` aus `.env.local` als Cloudflare-Secrets. Der direkte Datenbankzugang für Migrationen wird nicht hochgeladen. Die temporäre Secret-Datei wird nach dem Aufruf entfernt. Bestehende Dashboard-Variablen und Secrets bleiben erhalten. Bei mehreren Konten `CLOUDFLARE_ACCOUNT_ID` setzen. Die neue Origin muss vor einem Anmeldetest in Neon Auth als vertrauenswürdige Domain eingetragen werden. Die Datenbank bleibt dieselbe, es werden keine Inhalte in ein neues Projekt kopiert.

Das `AI`-Binding und das `AUDIO`-Binding für den bestehenden R2-Bucket werden ebenfalls eingerichtet. Es benötigt kein zusätzliches Secret. Schlüssel und Datenbankzugänge nicht in Git oder im Chat speichern.

## Prüfen

```sh
npm run typecheck
npm test
npm run build
# Gegen den laufenden lokalen Server; benötigt die Testdatenbank:
npm run test:integration
```

Die Verhaltenstests prüfen unter anderem versteckte Lösungen, Gastgeberrechte, doppelte Eingaben, Selbstwahl, Wertung, vollständige Spiele, vier Quizantworten, Aussprachebewertungen, englische Spielkarten, feste Kategoriekennungen, unveränderte Originalausdrücke, getrennte Übersetzungen sowie Fehlerantworten des Workers-AI-Anschlusses und die zweisprachigen Regeln aller Spielvarianten. Der Integrationstest führt Registrierung, Sitzungsprüfung, Abmeldung, falsche/richtige Anmeldung, geschützte zweisprachige Beiträge und Ergänzungen, gespeicherte Übersetzungsvorschläge, die Verfügbarkeit des AI-Bindings, Duplikat-Hinweise und konkurrierende Einreichungen, Community-Wörter, vollständige Partien mit unterschiedlichen Rundenzahlen in den fünf bisherigen Modi durch, einschließlich konkurrierender Stimmen und Aussprachebewertungen sowie Solo-Quizstarts. Seine Inhalte und Räume werden danach entfernt. Er legt ein klar benanntes Testkonto unter `.invalid` an; die Auth-Identität bleibt beim Anbieter und kann dort administrativ verwaltet werden. CI führt Typprüfung und Verhaltenstests ohne externe Zugangsdaten aus. Der zusätzliche `scripts/test-translation-budget.mts` prüft Wiederverwendung, manuelle Rückfalloption und die Tagesgrenze gegen eine isolierte Datenbankbranch mit simuliertem AI-Binding. Er benötigt `TRANSLATION_TEST_DATABASE_HOST`, das genau dem direkten Host dieser Testbranch entsprechen muss.

Der zusätzliche `scripts/test-entry-duplicates.mts` prüft Normalisierung, unterschiedliche Autoren und Sprach-/Regions-/Kontextvarianten sowie konkurrierende Inserts direkt gegen den Datenbankindex. `CONTRIBUTION_TEST_DATABASE_HOST` muss dem direkten Host einer isolierten Testbranch entsprechen. Migration 006 erstellt die Normalisierungsfunktion und den Index, ohne bestehende Beiträge zu löschen. Vor dem Einsatz muss die Migration erfolgreich auf einer Testbranch und dann auf der Produktionsdatenbank laufen. Bei bestehenden Duplikaten bricht die Migration ab, damit diese gezielt geprüft werden können.

Der zusätzliche `scripts/test-community-lifecycle.mts` prüft Pagination, das Sprachregister, Namensnennung, Audiozugriff und Dateiprüfung, Gastgeberwechsel, Rundengrenzen, Neustart und erhaltene zukünftige Karten. `COMMUNITY_TEST_DATABASE_HOST` muss dem direkten Host der isolierten Testbranch entsprechen. Er arbeitet gegen einen laufenden lokalen Server mit lokalem R2 und entfernt seine eigenen Testdateien, Inhalte und Räume.

## Betrieb und nächste Schritte

Die Website ist direkt im Cloudflare-Konto des Besitzers unter https://sprachwelten.maki26.workers.dev erreichbar. Die frühere Sites-Veröffentlichung unter https://sprachwelten.divinelynx3.chatgpt.site besteht separat weiter. Lesen und Spielen benötigen kein Konto. Eigene Beiträge und ergänzende Erklärungen benötigen die E-Mail-Anmeldung in der App. Der HTML-Titel lautet Sprachwelten.

Neons kostenloser Tarif genügt als Ausgangspunkt für kleine Freundesrunden. Bei dauerhaft aktivem Betrieb müssen Rechenzeit und Traffic gemessen werden. Die Spielfläche fragt sichtbare Räume etwa 1,2 Sekunden nach der vorigen Antwort erneut ab, pausiert diese Abfragen bei verborgenem Tab und beobachtet auch das Ergebnis, damit alle eine neue Partie im selben Raum sehen. Antworten, Stimmen und Bewertungen erhalten sofort eine lokale Rückmeldung; nur der bestätigte Serverzustand zählt. Zukünftige Karten werden bei gewöhnlichen Spielaktionen und Statusabfragen bereits in SQL ausgelassen. Die tatsächliche Übertragungszeit hängt weiterhin von Verbindung und Datenbank ab. Die Sammlung fragt nur bei Suche, Filtern oder Navigation nach. Aktuelle Ressourcenlimits: https://neon.com/pricing

Noch offen für breiteren öffentlichen Betrieb: Moderation und Meldungen, Inhaltsbearbeitung, regelmäßiges Entfernen abgelaufener Räume, verifizierte Sammlung, Mailversand/Passwort-Wiederherstellung mit eigener SMTP-Konfiguration, Lasttests. Das Passwort-Reset-Formular ist vorbereitet; Zustellung wurde nicht getestet. Aktuell ist E-Mail-Verifizierung im Anbieterprojekt optional.

## Repository

https://github.com/manuelk2607/sprachwelten

Dieses Repository enthält keinen Code oder Daten aus anderen Spielen des Besitzers.

Zungenbrecher sind ein gemeinsames Vorlesespiel. Der Ton kommt aus eurem vorhandenen Sprachchat oder dem gemeinsamen Raum; die App speichert die Bewertungen. Die Spielvorträge werden nicht aufgenommen. Optional veröffentlichte Ausspracheclips dienen als Hörbeispiel.

## Neue Sprachspiele

Zusätzlich spielbar sind **Ping! Verstanden?** (Gaming-Ansagen gemeinsam verstehen), **Generationenchat** (Jugendwort erklären und passend reagieren), **Sag’s ohne Seminar** (25 Wörter, drei Tabus, Alltag oder präzise), **Wer hat das gesagt?** (Personenzitat oder Liedtitel), **False Friends?** und **Satzbaukasten**. Zungenbrecher bündelt **Zungenknoten** und **Klangfallen**: In beiden Kategorien wird der vollständige Satz nachgesprochen und von den Mitspielenden bewertet. Es gibt keinen zusätzlichen Sprachchat-Dienst.

Die Startseite zeigt zunächst sechs Spielkacheln und sechs Sammlungsbeiträge; „Mehr anzeigen“ ergänzt weitere. Alle Auswahllisten verwenden dieselbe Komponente mit Tastaturbedienung und Suche bei längeren Listen. Neue Beiträge speichern ihre Aufgaben als validiertes `challenge`-Objekt. Antworten und Fachbegriffe haben getrennte DE/EN-Felder mit gekennzeichnetem Originaltext als Rückfalloption. Zitat-Antworten werden nur innerhalb derselben Kategorie zusammengestellt; bei weniger als drei Alternativen und ohne manuell ergänzte Optionen wird die Karte noch nicht gespielt. Beim Satzbaukasten werden alle erlaubten Reihenfolgen ausdrücklich hinterlegt. Doppelte Wörter besitzen eigene IDs; öffentliche Baustein-IDs werden pro Runde zufällig vergeben.

Migrationen 008 und 009 ergänzen Beitragsarten, das Aufgabenfeld und passende Eindeutigkeitsschranken. Danach ergänzt `node --env-file=.env.local --import tsx scripts/seed-new-games.mts` 64 neue Karten, ohne vorhandene Inhalte zu überschreiben.

Integrationstests benötigen eine **separate** `.env.test.local` mit Zugang zu einer isolierten Neon-Branch und `TEST_DATABASE_HOST` als deren direktem Host. Die Produktionsdatei `.env.local` bleibt unverändert. Der lokale Server muss ebenfalls diese Testbranch verwenden (bei Cloudflare-Entwicklung per temporärer `.dev.vars`, niemals in Git). `scripts/test-new-games.mts` prüft zusätzlich die neuen Abläufe mit echten gespeicherten Räumen und konkurrierenden Eingaben und ist ausdrücklich auf die aktuelle QA-Branch beschränkt. Vor Produktions-Build und Veröffentlichung die temporäre `.dev.vars` entfernen.

Nach einer Änderung des **kontoweiten** workers.dev-Kürzels muss die neue vollständige App-Origin in der bestehenden Neon-Auth-Branch freigegeben werden. Ein `INVALID_ORIGIN` wird durch diese Konfiguration behoben; Origin- und CSRF-Prüfungen bleiben aktiv.

## Text und Audio wählen

Beim Beitragen wählen zwei unabhängige Häkchen die Darstellung der Vorgabe: **Text**, **Audio** oder **beides**. Mindestens eine Option muss gewählt sein. Eine Audioauswahl erfordert einen erfolgreich hochgeladenen Clip; eine reine Audiovorgabe braucht keinen ausgeschriebenen Ausdruck. Sprache, Lösungen, Erklärungen und modusspezifische Aufgaben bleiben erforderlich. In Spielrunden werden nur die gewählten Medien angezeigt; geheime Teamvorgaben bleiben bis zur Auflösung der ansagenden Person vorbehalten. Bestehende Beiträge ohne Aufnahme bleiben Text, Beiträge mit Aufnahme behalten Text und Audio.

Migration 010 ergänzt `presentation` sowie serverseitige SHA-256-Fingerabdrücke für Aufnahmen. Der Textindex gilt weiterhin für geschriebene Ausdrücke, ein zusätzlicher Audioindex verhindert identische hochgeladene Dateien im jeweiligen Sprach-/Kategorie-Kontext, auch bei konkurrierenden Einreichungen. Unterschiedliche Aufnahmen derselben gesprochenen Worte können dadurch nicht semantisch erkannt werden. Leere Transkripte unterschiedlicher Audioeinträge werden nicht als identische Wörter behandelt. Aufnahme- und Eigentumsprüfung, private Entwürfe, die 20-Sekunden-Grenze und Speicherbudgets bleiben aktiv.

`scripts/test-media-choice.mts` prüft die drei Varianten gegen die isolierte Testdatenbank aus `.env.test.local`, einschließlich Dateifingerabdruck, Duplikat-Rennen, Eigentumsprüfung, getrennten Audiovorgaben und gespeicherten Spielrunden. Es verwendet ausschließlich synthetische Töne und entfernt seine eigenen Testeinträge, Räume und Dateien.

### Administration and contribution privacy

The mobile header keeps a labelled sign-in button on a separate account-actions row. Contribution credits are opt-in: public entry/explanation responses omit account display names as attribution, and game reveals use only the explicit credit field. Original account IDs/names remain internal moderation metadata.

New submissions require a literal translation (a single word is sufficient); an explanation is optional. Bluff games use the explanation when present and otherwise the translation, which is withheld until voting/reveal. Legacy starter cards and saved rooms remain valid via the stored-content schema.

The discovery collection starts closed. Its list API returns only prompt previews, without languages, translations, challenge solutions or account names. A visitor must open an individual entry to see its answer. This prevents accidental spoilers, not deliberate lookup in a public collection.

`/admin` exposes paginated/searchable contributions and registered accounts. Every admin API independently validates the managed session and checks the immutable account ID against `app_admins`; the header link is only a convenience. No email-based self-promotion or public privilege-grant endpoint exists. User listings contain only name, email, email-verification status, registration date, last retained session creation date and admin flag, never credentials/session tokens. This is a registered-account overview, not live presence.

After migration 011, an operator can authorize exactly one **existing** account with `node --env-file=.env.local --import tsx scripts/grant-admin.mts <existing-email>`. Do not publish email addresses or IDs in source. Admin edits retain original ownership, validate all content fields and audio ownership, enforce uniqueness and compare revisions to prevent overwriting concurrent changes. Removing a contribution is reversible; removed entries are excluded from public APIs and future games, and can be restored unless a duplicate has since appeared. Existing room snapshots remain independent. Moderation actions are recorded in `moderation_events`.

For a local preview without Cloudflare login, set `SPRACHWELTEN_OFFLINE_PREVIEW=1`; this omits the remote AI binding only from that local build/run. Production uses the normal AI binding. Admin integration tests in `scripts/test-admin.mts` require the isolated QA environment and explicit user authorization (`TEST_ADMIN_APPROVED=1`) for their temporary test-account grant; they revoke it and clean up their fixtures in `finally`.

### Community review and contribution tools

Signed-in users manage their own entries at `/me`; edits use revision checks and removals are recoverable by administration. Other users submit full improvement drafts from an entry's detail view. `/admin` shows pending drafts, supports editing before acceptance or rejection, and keeps the public version unchanged until acceptance. The inbox lists the latest 50 active entries with persistent per-admin read status. Bulk editing applies classification, region or context changes atomically to up to 30 selected entries; conflicts leave the whole selection unchanged.

Authenticated contributors can add region names to the shared registry. These are community-provided names, not geographically certified data. Custom region IDs are validated against the database before use. `sense` distinguishes explicitly labelled meanings of the same expression; equivalent normalized labels still collide. Additional explanations belong on the existing entry.

The home page starts games centrally and groups the twelve game variants into eight families. New Gaming calls use cooperative explanations with four actions; legacy route rounds stay compatible. `Pointe, bitte!` is a four-choice joke interpretation quiz. Run `scripts/seed-community-games.mts` with the target environment after migrations to add its six jokes and six Gaming calls without overwriting existing entries.

Email verification is optional through the existing Managed Neon Auth email OTP flow in `/me`. Requesting a code uses Neon's shared mail provider; successful verification updates the managed `emailVerified` value. No app mailer or separate paid service is required. Real inbox delivery must be checked by the account holder.

QA coverage for these changes: `TEST_ADMIN_APPROVED=1 node --env-file=.env.admin-qa.local --import tsx scripts/test-contribution-review.mts`. This script refuses production database hosts and requires the user's explicit authorization for temporary QA admin rights; it revokes them and cleans up its own fixtures in `finally`.

### Review status, recording retention and browser checks

`/me` includes the contributor's own pending, accepted and rejected improvement
suggestions. Administrators can supply public review feedback separately from
private internal notes. The server filters this list by the managed account ID.

Migration 015 protects pending audio references with a foreign key and adds a
persistent R2 deletion queue. The direct Cloudflare deployment runs bounded audio
maintenance daily at 03:17 UTC. Unattached recordings have a seven-day grace
period. All entry references (including recoverable removals), pending suggestions
and unexpired room snapshots are retained. Failed object deletions remain queued.
Active room audio uses an HttpOnly, room-scoped credential, so a soft-deleted
contribution does not break a round that already selected it.

Run `npm run test:browser` after `npx playwright install chromium`. GitHub Actions
also runs the production build and desktop/mobile Chromium checks without
production secrets. See [the measured performance changes](docs/performance-2026-10-17.md).

Migration 017 separates private attendance into `room_presence`. Normal heartbeats
return 204 without changing the room version; stale-player reconciliation still
transfers the host and completes unfinished turns. Daily maintenance also removes
expired rooms and rate-limit records older than their expiry plus one day, in
batches of at most 1,000. Presence is deleted with its room.

The lobby round limit accounts for the selected category's playable cards. Distinct
meanings, languages and dialect regions retain separate identities; automatic
distractors exclude other meanings of the same expression. Pronunciation actions
validate the match ID as well as the round and speaker, including same-room rematches.
Run `node --env-file=<isolated-QA-env> --import tsx scripts/test-room-maintenance.mts`
against a running local QA server to verify attendance, ETags and expiry cleanup.
Measured results and remaining work: [follow-up performance checks](docs/performance-2026-10-18.md).
