# Sprachwelten: Qualitätsrunde 2026-10-24

## Fortsetzung 25. Oktober 2026

Ausgangspunkt `31c9065`, sauberer Feature-Branch. Gezielte Pakete statt Gesamtaudit:
1. Echte Auth-/Berechtigungsprüfungen und begrenzter, ausdrücklich freigegebener AI-Test;
   keine Testkontenrechte oder Schemaänderungen. Ein separates normales Testkonto wurde
   nach Rückfrage vom Nutzer gewünscht und ohne Adminrechte über die reguläre Anmeldung angelegt.
2. Persönlichen Rückblick um Audioquizze und Satzbau ergänzen, verdeckte Lösungen schützen.
3. Regionale Quellenprüfung und redaktionelle Voraussetzungen für Schwierigkeitsstufen.
4. Relevante Regressionen, Gesamtchecks, Commit und Veröffentlichung bei bestandenen Prüfungen.

Startkontingent laut kontoweiter Anzeige: 40 % des Fünf-Stunden-Fensters verbraucht.
AI-Freigabe: höchstens vier Anfragen, insgesamt maximal 500 Quellzeichen.

Pakete abgeschlossen: Audioquiz-/Satzbau-Rückblick, begrenzte AI-Wartezeit,
echter HTTPS-Auth-/AI-Testlauf vorbereitet, sechs regionale Quellenkontexte,
redaktionelle Voraussetzungen für Schwierigkeitsstufen. Keine Datenbankänderungen.
Echte Produktionsprüfungen bestanden: Passwortanmeldung, Sitzung im zweiten Client,
eigene Beiträge, Admin-Sperre für normales Mitglied, Herkunft/Validierung, Abmeldung
und Zurückweisung alter Cookies. Echte AI DE→EN/EN→DE und Cache-Wiederverwendung
bestanden: vier HTTP-Anfragen, höchstens vier Modellaufrufe, 190 Quellzeichen insgesamt.
Keine Vorschläge veröffentlicht; nur die regulären AI-Cache-/Verbrauchseinträge erstellt.

Geprüft: 155 Unit-Tests, Typprüfung, Lint, Übersetzungen, Audit, Produktions-Build.
Browser: 117/118 im Gesamtlauf; ein zeitüberschrittener bestehender Desktopfall
bestand gezielt wiederholt auf Desktop und Mobil (2/2). Neue Rückblickfälle bestanden.
Bei 79 % kontoweiter Nutzung keine weiteren Entwicklungspakete begonnen.

Code-Commit `f9ffe5c6206b0c7c5c9e724ccf55be1f655de8c5` auf GitHub `main` gepusht.
Bestehender Worker erfolgreich veröffentlicht: Version
`1939f9fb-efe9-4043-b0e2-fd2c729f370c`, bestehende Secrets/Bindings erhalten.
Live: DE-/EN-Startseite, Spielübersicht, Sitemap und robots.txt jeweils HTTP 200;
anonyme Auth-/Berechtigungsprüfung nach Veröffentlichung erneut bestanden.
Keine Migrationen, keine produktiven Beitragsänderungen oder Rechtevergaben.
GitHub-CI: https://github.com/manuelk2607/Sprachwelten/actions/runs/40179261017
vollständig erfolgreich, einschließlich aller 118 Desktop-/Mobilfälle.

Noch offen: Entfernen ausschließlich des temporären Testkontos
`d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7` (Anzeigename „QA Sprachwelten – temporärer Integrationstest“).
Alle Testsitzungen wurden abgemeldet; das Konto hat keine Beiträge und keine Adminrechte.
Selbstlöschung über die App ist nicht vorhanden (404). Neon-Connector und lokales
Neon-CLI melden bei der Kontolöschung „branch not found“, obwohl Projekt, Zweig und
Auth-Konfiguration über dieselben Zugänge erfolgreich gelesen werden können.
Die Webkonsole verlangt eine erneute Anmeldung; keine fremden Konten/Projekte geändert.
Eine manuelle Löschung in Neon Auth ist nötig, solange dieser Verwaltungsfehler besteht.
Die generierte lokale Zugangsdaten-Datei wurde entfernt;
eine vom Nutzer angelegte `.env.auth-test.local` bleibt unverändert.

## Bereinigter Aufgabenbestand – Analyse 25. Oktober 2026

Diese Liste ist der aktuelle Arbeitsvorrat. Ältere Abschnitte in dieser Datei und
historische Formulierungen in Audits dokumentieren abgeschlossene Meilensteine,
nicht neue Arbeit.

### P0 – kritisch

- **Keine bestätigte P0-Störung.** Die veröffentlichten Spiel-, Anmelde-,
  Berechtigungs- und Übersetzungswege haben in den zuletzt dokumentierten
  Prüfungen funktioniert.

### P1 – wichtig

- **Temporäres QA-Konto bereinigen** *(bestätigt, Betrieb/Neon, niedrig nach
  Zugriffsklärung)*: Das oben genannte, normale Testkonto muss in Neon Auth
  gelöscht werden. App-Endpunkt und CLI/Connector konnten es wegen eines
  Verwaltungsfehlers nicht entfernen; vorher keine weiteren Testkonten anlegen.
- **Wiederholbare isolierte Integrationsumgebung festlegen** *(bestätigte
  Testlücke, Qualitätssicherung, mittel)*: Repositorytests und Live-Auth-Test
  existieren, laufen aber nicht in der GitHub-CI und benötigen separat verwaltete
  Testzugänge bzw. eine isolierte Neon-Umgebung. Dokumentierten, bereinigbaren
  Ablauf für Auth, Rechte, Beiträge und Spiel-Persistenz einrichten.
- **E-Mail-Verifizierung Ende-zu-Ende prüfen** *(bestätigte Abdeckungslücke,
  Auth, niedrig bis mittel)*: Die OTP-Oberfläche ist implementiert; Zustellung,
  Ablauf und bestätigte E-Mail wurden bisher nicht mit einem echten Testpostfach
  validiert.

### P2 – Erweiterung mit klarer Voraussetzung

- **Regionale Inhalte redaktionell freigeben** *(bestätigt, Inhalte, hoch)*:
  Die sechs geprüften Dialekt-Starterkarten besitzen Quellenkontexte, bleiben
  aber ausdrücklich als `needsSpecialistReview` markiert. Herkunft,
  Bedeutungsvarianten, Nutzungsgebiete und gleich plausible Ablenker müssen für
  diese sowie weitere Starter- und Community-Inhalte fachlich geprüft werden.
- **Echte Schwierigkeitsstufen erst nach Datenbasis aktivieren** *(bestätigt
  unvollständig vorbereitet, Inhalte/Spielengine, hoch)*: Die nachvollziehbare
  Bereitschaftsprüfung existiert, aber weder gespeicherte redaktionelle Stufen
  noch UI/Pool-Auswahl. Voraussetzung sind je Kategorie, Sprache und Stufe
  mindestens 20 eindeutige, redaktionell freigegebene Beiträge mit Begründung,
  Quelle und Prüfdatum; keine Heuristik nach Textlänge verwenden.
- **`braces`-Ausnahme erneut bewerten** *(bestätigte Wartungsaufgabe,
  Abhängigkeiten, niedrig)*: Für GHSA-vfj7-8cjw-p6xm gibt es laut
  `docs/security.md` noch keinen Upstream-Fix. Bei nächstem Toolchain-Update
  oder einer korrigierten Version Audit und Lockfile erneut prüfen.

### P3 – optional bzw. erst bei Bedarf

- **Dokumentation bereinigen** *(bestätigt, Dokumentation, niedrig)*:
  `docs/spielideen-und-sprachraum.md` beschreibt inzwischen implementierte
  Spielideen noch als offen; ältere Performance-Notizen nennen die inzwischen
  verpflichtende, grüne Lint-CI als Restarbeit. README und Roadmap auf aktuelle
  Spielmodi und Beitragsarten abgleichen.
- **Produktionsmetriken vor Skalierungsarbeit erheben** *(vermutete
  Verbesserung, Performance, mittel)*: Push-Ereignisse, weitergehende
  Missbrauchslimits oder Übersetzungs-Koaleszierung erst bei gemessener
  Latenz/Last entscheiden. Die aktuelle Polling- und Cache-Strategie hat keinen
  dokumentierten Produktionsengpass.
- **Search-Console-Indexierung beobachten** *(externe Betriebsaufgabe, SEO,
  niedrig)*: Sitemap, robots.txt und Metadaten sind live; nach Ablauf des
  Google-Kontingents die Start- und Spielübersicht erneut zur Indexierung
  einreichen und den Status beobachten.
- **Sprachraum nur bei neuer Produktentscheidung** *(bewusst zurückgestellt,
  Produkt, hoch)*: Echtzeit-Audio ist nicht implementiert und wegen Kosten,
  Moderation und Datenschutz bewusst kein aktueller Backlog-Punkt. Aktuell sind
  WhatsApp/Discord die gewählte Ergänzung.

### Als offen dokumentiert, aber bereits erledigt

- Audio- und Satzbauaufgaben im persönlichen Lernrückblick sind implementiert
  und getestet; keine neue Aufgabe.
- Reale Passwortanmeldung, Sitzung, Rollenprüfung und begrenzte Workers-AI-
  Antworten wurden in Produktion geprüft; keine neue Fehlerbehebung offen.
- Die globale Lint-Prüfung ist Teil der erfolgreichen GitHub-CI; ältere
  Performance-Notizen hierzu sind historisch.
- Die in der Ideen-Roadmap genannten Spielrichtungen Gaming-Sprache,
  Jugendwörter und akademisch/alltäglich sind als Modi vorhanden; nur die
  Dokumentation ist veraltet.

Ziel: belegte Schwächen priorisiert verbessern, bestehende Inhalte und Rechte erhalten,
testen, veröffentlichen und die vorhandenen `.clinerules` mit versionieren.

Budget: Start 2 % des 5-Stunden-Fensters verbraucht. Ziel etwa 45 Prozentpunkte
zusätzliche Nutzung (Richtwert, kein exakt messbarer Rechenaufwand).

## Plan
1. Formular-/Übersetzungszustand: Sprachwechsel, Entwürfe, verspätete Vorschläge und Datenverlust.
2. Spiel-/Lernabläufe und mobile/barrierefreie Bedienung anhand konkreter Befunde verbessern.
3. Validierung, Performance, Sicherheit und Inhalte gezielt nachprüfen; weitere sinnvolle Pakete abschließen.
4. Gesamttests, GitHub, bestehender Cloudflare-Worker, Live-Prüfung und Abschlussbericht.

## Stand
- Ausgangspunkt: `8f41238`, Arbeitsbaum sauber, letzte CI erfolgreich.
- Original-Checkout hat eigene Änderungen an `vite.config.ts` und eine unversionierte
  `.clinerules`; beides bleibt erhalten.
- Belegt: wiederhergestellte Entwürfe verlieren derzeit ihre gespeicherte Erklärungssprache;
  neue Formulare können Texte bei UI-Sprachwechsel stillschweigend umetikettieren.
- Belegt: allgemeine Übersetzungsvorschläge ersetzen das gesamte Übersetzungsobjekt;
  dadurch können unabhängig bearbeitete Tippübersetzungen verloren gehen.

Paket 1 umgesetzt: Entwurfssprache bleibt erhalten; Übersetzungen werden pro Feld
invalidiert und erst nach Vorschau übernommen. Unabhängige Tipptexte bleiben erhalten;
verspätete Antworten nach Zieltextänderungen werden verworfen. Review bestätigt nur
explizit geprüfte Fassungen. Fehlerfelder haben jetzt stabile Formularnamen.

Paket 2 umgesetzt: Auswahllisten haben korrekt fokussierte Listen bzw. Suchfelder
mit aktiver Option für Screenreader; Tab/Shift+Tab verlassen die Liste, Escape kehrt
zum Auslöser zurück. Sprach-/Theme-Wechsel funktionieren bei blockiertem Browser-Speicher.
Reduzierte Bewegung wird berücksichtigt. 38 Desktop-/Mobilprüfungen bestanden.

Paket 3 umgesetzt: Persönlicher Lernrückblick nach Quizpartien mit Fehlerfilter,
korrekten Antworten und Erklärungen. Nur bereits selbst beantwortete/aufgelöste
Aufgaben werden pro Spieler und Partie gespeichert; maximal zehn, 24 Stunden,
ausschließlich im aktuellen Browser-Tab. Neuladen, Sprachwechsel und Rematch geprüft.
Keine Datenbankänderung und kein Einfluss auf Punkte oder verdeckte Lösungen.

Paket 4: Spiel-Fehlerklasse vom Engine-Modul getrennt. Der Browser-Meldebaustein
schrumpfte von 638.839 auf 390 Byte (ungepackt, gleiches Buildverfahren).
Antwortvalidierung erkennt nun Unicode-/Leerraum-Dubletten und benennt das genaue Feld.

Zusätzlich erledigt: Sicherheitsupdates Zod 4.6.6, Undici 7.30.1 und fast-uri 3.1.9,
einschließlich transitiver Pins. Vollständiges Audit wieder bestanden; keine weitere Ausnahme.

Abgeschlossen: Code `d3703d1`, einschließlich unveränderter `.clinerules`, auf `main`.
GitHub-CI [40123041398](https://github.com/manuelk2607/Sprachwelten/actions/runs/40123041398)
erfolgreich. Worker-Version `b677b53b-6b33-4f88-b983-d8bf0947c1a4` veröffentlicht.
Cloudflare verzögerte den Upload mit Retry-After; der automatische Wiederholungsversuch war erfolgreich.

Verifikation: 149 Unit-Tests, Typprüfung, Lint, Übersetzungsabdeckung, Audit und
Produktions-Build bestanden. Auch mit den finalen Sicherheitsupdates sind alle
114 vollständigen Desktop-/Mobil-Browserprüfungen bestanden.
Live: 30 öffentliche DE/EN-Seiten, Sitemap, Google-Tag, zwei Vorschaubilder,
drei private noindex-Seiten, 404-Seiten, Tabu-Ausschluss und anonyme Auth-/Admin-Gates
geprüft; Desktop/Mobil ohne Laufzeitfehler oder Überlauf. Keine Live-Schreibtests.
Echte Anmeldung mit Passwort und echte AI-Übersetzungen wurden nicht ausgeführt.

Kontingent: Start 2 %, bei 46 % keine weiteren Pakete begonnen. Nach Veröffentlichung
und Schlussprüfung meldet die kontoweite Anzeige 64 %. Der Zielrahmen wurde damit laut
Anzeige überschritten; die geteilte Nutzung kann nicht exakt diesem Chat zugeordnet werden.
Nächste Aufgaben stehen in `docs/quality-review-2026-10-24.md`.
Blocker: keine.
