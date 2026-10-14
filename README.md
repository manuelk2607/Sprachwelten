# Sprachwelten

Andere Worte. Neue Welten. Ein eigenständiges Sprachprojekt mit öffentlichem Quellcode: Redewendungen entdecken, Erklärungen teilen und mit Freunden bluffen.

## Spielmodi und Funktionen

- **Was soll das heißen?**: Online-Bluffspiel für 3–10 Personen, fünf Runden, Einladungslink und gemeinsame Punktwertung. Alle erfinden eine plausible Bedeutung; anschließend wird die echte Erklärung zwischen den Bluffs gesucht.
- **Wortdetektiv**: Ein Wort, vier Antwortsprachen und genau eine gesuchte Sprache. 1–10 Personen, fünf Runden, zwei Punkte je richtiger Antwort, gemeinsame Auflösung und Einladungslinks. Solo oder mit Freunden.
- **Entdecken**: 20 Redewendungen und zehn Wörter, Suche, Sprachfilter, Bedeutungen, Beispielsätze, kulturelle Hinweise und Quellenlinks.
- **Mitmachen**: Registrierung und Anmeldung mit E-Mail und Passwort über Managed Better Auth auf Neon. Angemeldete Mitglieder können eigene Einträge und zusätzliche Erklärungen veröffentlichen. Spielen und Lesen sind in der App ohne Konto möglich.
- **Deutsch und Englisch**: Umschalter DE/EN mit gespeicherter Präferenz. Die Startsammlung enthält Erklärungen in beiden Sprachen. Der Gastgeber wählt die Sprache der Spielkarten; Beiträge aus der Community bleiben in ihrer Originalsprache.
- **Weitere Modi**: Zungenbrecher (Nachsprechen und Bewertung durch Mitspieler), Dialekte und Alltagssituationen sind als „Bald verfügbar“ sichtbar. Wörter und Zungenbrecher können schon beigetragen werden. `lib/modes.ts` bereitet eindeutige Quizantworten und Bewertungskriterien vor. Noch kein Mikrofonzugriff und keine automatische Aussprachebewertung.
- **Erweiterbares Fundament**: Die Eintragstypen `idiom`, `dialect`, `situation`, `word` und `tongue_twister` teilen eine Datenstruktur. Region, Sprachcode, Gesprächskontext, wörtliche Übersetzung und kulturelle Hinweise werden bereits gespeichert. Dialekte und Alltagseinträge können schon zur Sammlung beigetragen werden; eigene Spielmodi dafür folgen später.

Community-Beiträge sind sichtbar gekennzeichnet. Das Bluffspiel nutzt die separat gepflegte Startsammlung. Wortdetektiv nutzt Startwörter und Community-Wörter; die angegebene Sprache wird als Lösung verwendet. Schreibweisen, die in der Sammlung mehreren Sprachen zugeordnet sind, werden ausgelassen, ebenso doppelte Wörter innerhalb einer Partie. Die Erläuterungen wurden für dieses Projekt formuliert; Quellen dienen der Nachprüfung. Sprachkenntnisse sind zum Bluffen nicht erforderlich.

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

TypeScript (`.ts`, `.tsx`, `.mts`) für Anwendung, Konfiguration und eigene Laufzeitskripte; React / Next.js App Router über Vinext und Vite; serverseitige HTTP-Abfragen mit `@neondatabase/serverless`; PostgreSQL auf Neon. Die öffentliche Anwendung läuft über Sites auf Cloudflare Workers. Der Code kann unabhängig davon mit eigener Infrastruktur betrieben werden.

- `lib/game.ts`: Spielregeln, Phasen, Wertung und explizite öffentliche Projektion.
- `lib/i18n.tsx` / `lib/translations.ts`: zweisprachige Oberfläche; `lib/entry-localization.ts`: englische Startsammlung.
- `lib/modes.ts`: typisierte Modi, Quizvorbereitung und Aussprachebewertungen.
- `lib/content.ts`: gemeinsame Inhaltstypen und Eingabeprüfung mit Zod.
- `db/repository.ts`: parametrisierte Queries und atomare Änderungen an Räumen mit Versionsprüfung.
- `db/migrations/`: Schema als versionierte Migrationen mit angewandtem Migrationsstand.
- `app/api/`: öffentliche Leseendpunkte, geschützte Beiträge und Spielraum-API.
- `components/`: responsive Oberfläche mit nativen modalen Dialogen.
- `lib/site.ts`: zentraler Appname und Repository-Link.

Eine Spieleridentität besteht aus einem zufälligen raumbezogenen Token. Der Server speichert dessen SHA-256-Hash und prüft ihn vor jeder Spielaktion; Kontoidentität und Spielidentität sind getrennt. Lösungen, Zuordnung der Bluffs und kommende Karten erscheinen nicht in der Spielantwort vor ihrer vorgesehenen Phase. Die öffentliche Sammlung enthält ihre Bedeutungen bewusst; absichtliches Nachschlagen ist keine vom Spiel verhinderte Form des Schummelns.

Schreibanfragen sind an dieselbe Origin gebunden und begrenzt. Autoren werden aus der serverseitigen Sitzung übernommen. Beiträge werden als Text dargestellt. Die Queries sind paginiert, liefern benannte Spalten und schließen zukünftige Spielkarten schon in SQL aus Polling-Abfragen aus. Räume werden nach 24 Stunden unzugänglich.

## Prüfen

```sh
npm run typecheck
npm test
npm run build
# Gegen den laufenden lokalen Server; benötigt die Testdatenbank:
node --env-file=.env.local --import tsx scripts/smoke.mts
```

Die Verhaltenstests prüfen unter anderem versteckte Lösungen, Gastgeberrechte, doppelte Eingaben, Selbstwahl, Wertung, vollständige Spiele, vier Quizantworten, Aussprachebewertungen und englische Spielkarten. Der Integrationstest führt Registrierung, Sitzungsprüfung, Abmeldung, falsche/richtige Anmeldung, geschützte Beiträge, Community-Wörter, fünf Bluffrunden und fünf Quizrunden mit konkurrierenden Anfragen sowie einen Solo-Quizstart durch. Seine Inhalte und Räume werden danach entfernt. Er legt ein klar benanntes Testkonto unter `.invalid` an; die Auth-Identität bleibt beim Anbieter und kann dort administrativ verwaltet werden. CI führt Typprüfung und Verhaltenstests ohne externe Zugangsdaten aus.

## Betrieb und nächste Schritte

Die Website ist öffentlich unter https://sprachwelten.divinelynx3.chatgpt.site erreichbar und läuft auf Cloudflare Workers über Sites. Lesen und Spielen benötigen kein Konto. Eigene Beiträge und ergänzende Erklärungen benötigen die E-Mail-Anmeldung in der App. Der HTML-Titel lautet Sprachwelten.

Neons kostenloser Tarif genügt als Ausgangspunkt für kleine Freundesrunden. Bei dauerhaft aktivem Betrieb müssen Rechenzeit und Traffic gemessen werden. Die Spielfläche aktualisiert ihren Zustand höchstens etwa alle 3,5 Sekunden, pausiert bei verborgenem Tab und beendet Polling nach dem Ergebnis. Die Sammlung fragt nur bei Suche, Filtern oder Navigation nach. Aktuelle Ressourcenlimits: https://neon.com/pricing

Noch offen für breiteren öffentlichen Betrieb: Moderation und Meldungen, Inhaltsbearbeitung, Raumverwaltung für ausgeschiedene Personen, regelmäßiges Entfernen abgelaufener Räume, verifizierte Sammlung, Mailversand/Passwort-Wiederherstellung mit eigener SMTP-Konfiguration, zusätzliche Spielmodi und Lasttests. Das Passwort-Reset-Formular ist vorbereitet; Zustellung wurde nicht getestet. Aktuell ist E-Mail-Verifizierung im Anbieterprojekt optional.

## Repository

https://github.com/manuelk2607/sprachwelten

Dieses Repository enthält keinen Code oder Daten aus anderen Spielen des Besitzers.
