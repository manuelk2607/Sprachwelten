# Sprachwelten

Andere Worte. Neue Welten. Ein eigenständiges Sprachprojekt mit öffentlichem Quellcode: Redewendungen entdecken, regionale Wörter und Gesprächskontexte erraten, Aussprache üben und mit Freunden bluffen.

## Spielmodi und Funktionen

- **Was soll das heißen?**: Online-Bluffspiel für 3–10 Personen, fünf Runden, Einladungslink und gemeinsame Punktwertung. Alle erfinden eine plausible Bedeutung; anschließend wird die echte Erklärung zwischen den Bluffs gesucht.
- **Wortdetektiv**: Ein Wort, vier Antwortsprachen und genau eine gesuchte Sprache. 1–10 Personen, fünf Runden, zwei Punkte je richtiger Antwort, gemeinsame Auflösung und Einladungslinks. Solo oder mit Freunden.
- **Zungenbrecher**: 2–10 Personen, fünf Texte. Jede Person liest jeden Text im gemeinsamen Raum oder Sprachchat vor. Anschließend bewerten alle anderen Verständlichkeit, Genauigkeit und Rhythmus von 1 bis 5. Der Durchschnitt ergibt bis zu fünf Rundenpunkte; Die Oberfläche zeigt Durchschnittswerte pro Person und Kriterium. Bei zwei Personen entspricht der Durchschnitt der Bewertung durch die jeweils andere Person.
- **So sagt man das bei uns**: Dialektquiz mit vier Regionen, Auflösung, Bedeutung und regionalen Hinweisen. 1–10 Personen und fünf Runden. Gesucht ist die beim Beitrag hinterlegte Region; regionale Wörter sind nicht exklusiv auf eine Gegend begrenzt.
- **Kann man das so sagen?**: Formulierungen einem von vier Gesprächskontexten zuordnen und Ton, Höflichkeit und Verwendung kennenlernen. 1–10 Personen und fünf Runden.
- **Entdecken**: 50 Startkarten (20 Redewendungen, zehn Wörter, sechs regionale Ausdrücke, acht Alltagssituationen und sechs Zungenbrecher), Suche, Sprachfilter, Bedeutungen, Beispielsätze, kulturelle Hinweise und Quellenlinks.
- **Mitmachen**: Registrierung und Anmeldung mit E-Mail und Passwort über Managed Better Auth auf Neon. Angemeldete Mitglieder können eigene Einträge und zusätzliche Erklärungen veröffentlichen. Spielen und Lesen sind in der App ohne Konto möglich.
- **Deutsch und Englisch**: Umschalter DE/EN mit gespeicherter Präferenz. Die Startsammlung enthält Erklärungen in beiden Sprachen. Der Gastgeber wählt die Sprache der Spielkarten. Eigene Erklärungen, Beispiele und kulturelle Hinweise können mit getrennten DE/EN-Fassungen veröffentlicht werden. Originalausdrücke bleiben unverändert; fehlende Übersetzungen werden mit Originalsprache gekennzeichnet.
- **Gemeinsame Inhalte**: Alle fünf Eintragstypen können beigetragen werden. Dialekte benötigen eine Region, Alltagssituationen einen Gesprächskontext aus festen zweisprachigen Kategorien. Die drei falschen Quizantworten werden aus anderen Kategorien ergänzt. Wörter, Dialekte, Situationen und Zungenbrecher können direkt in ihrem passenden Spielmodus erscheinen.


Community-Beiträge sind sichtbar gekennzeichnet. Das Bluffspiel nutzt die separat gepflegte Startsammlung. Die übrigen Modi nutzen Startkarten und passende Community-Beiträge. Quizfragen verwenden die angegebene Sprache, Region oder Situation als Lösung. Schreibweisen, die beim selben Inhaltstyp mehreren Lösungen zugeordnet sind, werden ausgelassen, ebenso doppelte Ausdrücke innerhalb einer Partie. Die Erläuterungen wurden für dieses Projekt formuliert; Quellen dienen der Nachprüfung. Sprachkenntnisse sind zum Bluffen nicht erforderlich.

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
- `lib/modes.ts`: alle fünf Modi, Spielerzahlen, Regeln und Quizvorbereitung.
- `components/pronunciation-round.tsx`: Vorlesephase, geschützte Bewertung und Durchschnittswerte je Person.
- `lib/extra-seeds.ts`: regionale Ausdrücke, Alltagssituationen und eigene Übungssätze mit deutschen und englischen Erläuterungen.
- `lib/content.ts`: gemeinsame Inhaltstypen und Eingabeprüfung mit Zod.
- `db/repository.ts`: parametrisierte Queries und atomare Änderungen an Räumen mit Versionsprüfung.
- `db/migrations/`: Schema als versionierte Migrationen mit angewandtem Migrationsstand.
- `app/api/`: öffentliche Leseendpunkte, geschützte Beiträge und Spielraum-API.
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

Das `AI`-Binding wird ebenfalls eingerichtet. Es benötigt kein zusätzliches Secret. Schlüssel und Datenbankzugänge nicht in Git oder im Chat speichern.

## Prüfen

```sh
npm run typecheck
npm test
npm run build
# Gegen den laufenden lokalen Server; benötigt die Testdatenbank:
node --env-file=.env.local --import tsx scripts/smoke.mts
```

Die Verhaltenstests prüfen unter anderem versteckte Lösungen, Gastgeberrechte, doppelte Eingaben, Selbstwahl, Wertung, vollständige Spiele, vier Quizantworten, Aussprachebewertungen, englische Spielkarten, feste Kategoriekennungen, unveränderte Originalausdrücke, getrennte Übersetzungen sowie Fehlerantworten des Workers-AI-Anschlusses und die zweisprachigen Regeln aller fünf Kacheln. Der Integrationstest führt Registrierung, Sitzungsprüfung, Abmeldung, falsche/richtige Anmeldung, geschützte zweisprachige Beiträge und Ergänzungen, gespeicherte Übersetzungsvorschläge, die Verfügbarkeit des AI-Bindings, Community-Wörter, je fünf komplette Runden in allen fünf Modi durch, einschließlich konkurrierender Stimmen und Aussprachebewertungen sowie Solo-Quizstarts. Seine Inhalte und Räume werden danach entfernt. Er legt ein klar benanntes Testkonto unter `.invalid` an; die Auth-Identität bleibt beim Anbieter und kann dort administrativ verwaltet werden. CI führt Typprüfung und Verhaltenstests ohne externe Zugangsdaten aus. Der zusätzliche `scripts/test-translation-budget.mts` prüft Wiederverwendung, manuelle Rückfalloption und die Tagesgrenze gegen eine isolierte Datenbankbranch mit simuliertem AI-Binding. Er benötigt `TRANSLATION_TEST_DATABASE_HOST`, das genau dem direkten Host dieser Testbranch entsprechen muss.

## Betrieb und nächste Schritte

Die Website ist direkt im Cloudflare-Konto des Besitzers unter https://sprachwelten.manuelk2607.workers.dev erreichbar. Die frühere Sites-Veröffentlichung unter https://sprachwelten.divinelynx3.chatgpt.site besteht separat weiter. Lesen und Spielen benötigen kein Konto. Eigene Beiträge und ergänzende Erklärungen benötigen die E-Mail-Anmeldung in der App. Der HTML-Titel lautet Sprachwelten.

Neons kostenloser Tarif genügt als Ausgangspunkt für kleine Freundesrunden. Bei dauerhaft aktivem Betrieb müssen Rechenzeit und Traffic gemessen werden. Die Spielfläche aktualisiert ihren Zustand höchstens etwa alle 3,5 Sekunden, pausiert bei verborgenem Tab und beendet Polling nach dem Ergebnis. Die Sammlung fragt nur bei Suche, Filtern oder Navigation nach. Aktuelle Ressourcenlimits: https://neon.com/pricing

Noch offen für breiteren öffentlichen Betrieb: Moderation und Meldungen, Inhaltsbearbeitung, Raumverwaltung für ausgeschiedene Personen, regelmäßiges Entfernen abgelaufener Räume, verifizierte Sammlung, Mailversand/Passwort-Wiederherstellung mit eigener SMTP-Konfiguration, Lasttests und optionale Audiofunktionen. Das Passwort-Reset-Formular ist vorbereitet; Zustellung wurde nicht getestet. Aktuell ist E-Mail-Verifizierung im Anbieterprojekt optional.

## Repository

https://github.com/manuelk2607/sprachwelten

Dieses Repository enthält keinen Code oder Daten aus anderen Spielen des Besitzers.

Zungenbrecher sind ein gemeinsames Vorlesespiel. Der Ton kommt aus eurem vorhandenen Sprachchat oder dem gemeinsamen Raum; die App speichert die Bewertungen. Sie zeichnet keine Audiodaten auf.
