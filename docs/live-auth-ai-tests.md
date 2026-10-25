# Echte Auth-/KI-Prüfung

`npm run test:live-auth` nutzt echte HTTPS-Endpunkte und den bestehenden verwalteten
Login. Keine API-Antwort wird abgefangen oder simuliert. Lokale UI-Regressionen
verwenden weiterhin isolierte Fixtures; sie ersetzen diese Prüfung nicht.

Ein normales, bereits vorhandenes Testkonto in der ignorierten `.env.auth-test.local`:

```dotenv
AUTH_TEST_EMAIL=TESTKONTO
AUTH_TEST_PASSWORD=TESTPASSWORT
```

Keine Zugangsdaten im Chat, in Commits, Screenshots oder Testberichten ablegen.
Sitzungscookies existieren nur im Arbeitsspeicher des Testprozesses. Getestet werden
anonyme Zugriffe, manipulierte Cookies, Passwortanmeldung, erneute Sitzungserkennung
in einem zweiten Client, eigene Beiträge, fehlende Adminrechte bei normalen Konten,
fremde Herkunft, fehlerhafte Übersetzungsanfragen und Abmeldung samt Cookie-Replay
nach Ablauf des einsekündigen lokalen Sitzungscaches.

Verwendet das Testkonto selbst Adminrechte, wird der normale Mitgliedstest ausdrücklich
als nicht geprüft ausgewiesen. Es werden keine Rechte vergeben und keine Nutzerlisten
mit einem Administratorkonto abgerufen. Der Test legt weder Konten noch Beiträge an.
Anmeldung/Abmeldung erzeugen bzw. beenden ausschließlich die eigene Testsitzung.
Eine kontenübergreifende Prüfung fremder Beitragsänderungen gehört weiterhin in die
isolierte Datenbank-Integration, nicht in diesen Produktions-Smoke-Test.

Nur mit separater Kostenfreigabe:

```sh
npm run test:live-auth -- --allow-ai
```

Das erlaubt zwei frische Übersetzungsanfragen (DE→EN, EN→DE) und zwei Cache-Wiederholungen.
Je frischer Anfrage werden zwei kurze Felder übersetzt: höchstens vier Modellaufrufe,
unter 500 Quellzeichen über alle HTTP-Anfragen zusammen. Keine automatischen Retries,
keine Veröffentlichung von Vorschlägen. Cache und tägliche Verbrauchszählung werden
über die reguläre App geführt. Bei Fehlern wird die Testsitzung soweit erreichbar abgemeldet.
Die Ausgaben einfacher Beispielsätze werden anhand ihres Bedeutungsankers geprüft;
das ist keine umfassende Bewertung von Dialekten oder Übersetzungsqualität.

Fehlende Zugangsdaten werden als **NOT RUN** protokolliert. Ein erfolgreicher anonymer
Teiltest darf nicht als bestandene Passwort-/KI-Prüfung berichtet werden.
Der erlaubte Zielhost ist fest begrenzt; es gibt keinen Zugriff auf Datenbankzugänge.

Fehlerfalltests mit kontrollierten Bindings prüfen zusätzlich ungültige, leere,
überlange, abbrechende und hängende Providerantworten. Diese sind simuliert.
Ein gemeinsames 15-Sekunden-Zeitbudget stoppt weitere Textteile bei einem Hänger.
Ein bereits an Cloudflare gesendeter Aufruf kann dort noch fertiglaufen; er wird
weder automatisch wiederholt noch fälschlich als kostenlos zurückgebucht.
