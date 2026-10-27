# Sprachwelten: Qualitätsrunde 2026-10-24

## Abschluss: Vokabelhefte und Sprachrichtungen – 27. Oktober 2026

Ausgangspunkt `931ee63`, sauberer Branch `feature/learning-notebooks-20261026`.
Plan: (1) bestätigte Sprachpaare mit optionaler Rückrichtung und getrennte Spiel-/
Lernbeiträge, (2) persönliche Hefte, Verwaltung und gezielte Übungen mit gemeinsamem
persönlichem Fortschritt pro Wort/Lernrichtung, (3) mobile Oberfläche, Regressionen,
Migration in isolierter QA und Veröffentlichung bei bestandenen Prüfungen.
Keine automatische Ableitung einer Übersetzungssprache aus der UI-/Erklärungssprache.
Alte Materialien/Fortschritte bleiben erhalten; nur unveränderte bekannte Startkarten
werden explizit zugeordnet, umgekehrte Kopien referenzieren dieselbe Vokabel.
Schema und Eindeutigkeitsindizes vor Änderung per Neon-MCP geprüft. Implementiert:
explizite, richtungsgebundene Sprachpaare mit geprüfter Rückrichtung; getrennte
Beitragsformulare/POST-Routen, Spielesammlung und eigene Beitragsübersichten.
Private Hefte mit Revisionen, Mitgliedschaften, atomarem Verschieben, Auswahlübungen,
Schreibabfragen und aufdeckbaren Karteikarten; Fortschritt je Konto/Wort/Richtung.
Neue PostgreSQL-Integration bestand
in isolierter QA: Mandantentrennung, CRUD, Verschieben, Sprachrichtung, doppelte
Abgaben, Kartenaufdeckung, Lernstände, Entzug der Heftzuordnung, umgekehrte Dubletten.
025 zunächst ausschließlich in QA angewendet. Dort zuerst 22 historische Startkarten und
zwei synthetische Lernstände angelegt; Revision startet tatsächlich bei 0 (nicht 1).
Die Zuordnung wurde entsprechend korrigiert und separat erneut getestet. Zehn
kanonische Paare, zehn erhaltene Verweise und kopierte Richtungs-Lernstände geprüft;
originale Einträge/Lernstände erhalten. Eigentliche Integrationstestdaten bereinigt;
markierte Migrationsfixtures bleiben bis zur abschließenden QA-Prüfung erhalten.
Fortgesetzt am 27. Oktober: alte QA ist planmäßig abgelaufen. Neue reine Schema-
QA `br-odd-king-b90o8w3l` / Host `ep-withered-sky-b936cqzb.c-7.eu-central-1.aws.neon.tech`
läuft bis 27. Oktober 20:00 UTC. Vollständige Migration 025 auf frischem 024-Schema
mit eigenen historischen Fixtures erfolgreich; Notebook- und bestehende Lern-
Integration erneut bestanden. Keine produktiven Datensätze kopiert. Zusätzlich
native Beispiele je Richtung und sichere mobile Dialogbedienung korrigiert.
180 Unit-Tests, Typprüfung, Lint, Übersetzungsprüfung, Abhängigkeitsaudit und
Produktions-Build bestanden. 134/134 Desktop-/Mobilfälle im Gesamtlauf bestanden;
die zehn neuen Lernfälle nach letzten Korrekturen zusätzlich erfolgreich geprüft.
Aktuelles Sprachpaar wird auch im Menü-Beitragsformular übernommen. Quellen,
Credits und Zugriff auf die vorhandene Bearbeitungs-/Vorschlagsfunktion bleiben
bei Vokabelkarten sichtbar. Entfernte/geänderte Wörter können aus eigenen Heften
bereinigt werden, ohne Lernstände zu löschen.

Code-Commit `cf9d731c5ffb47084709a2b70440d9c07558a42e` ist auf GitHub `main`.
Die vollständige CI bestand, einschließlich aller 134 Desktop-/Mobilfälle:
https://github.com/manuelk2607/Sprachwelten/actions/runs/40426667585
Migration `025_vocabulary_notebooks.sql` produktiv transaktional angewendet und
im Migrationsregister bestätigt. Alle 20 bisherigen Vokabeleinträge und beide
Grammatikmodule erhalten; zehn kanonische Paare und zehn bestehende Gegenkarten
mit Verweisen bestätigt. Bestehender Cloudflare-Worker erfolgreich veröffentlicht,
Version `943d40d2-ed2c-43bc-b5aa-d6661640d2cd`.
Secrets, Auth-Ziel, R2, AI, Rate-Limits, Google-Tag und Wartungszeitplan erhalten.

Live: `/lernen` und `/en/learn` HTTP 200. Beide Sprachrichtungen liefern genau
zehn eindeutige Karten mit denselben kanonischen IDs; Beispiele passen zur
jeweiligen Zielsprache. Keine internen Autoren-/Kontofelder, Cache-Control
`no-store`. Anonyme Hefte/Admin-Nutzerliste 401, identisches Sprachpaar 422,
fremde Origin bei Heftmutation 403. Keine produktiven Testkonten, Lernabgaben,
Hefte oder KI-Aufrufe erzeugt. Echte Schreib-/Parallelitätsprüfungen ausschließlich
in isolierter PostgreSQL-QA; Browserabläufe mit kontrollierten HTTP-Antworten.

Abschließende Nachkorrektur: explizit wiederhergestellte Entwürfe bestimmen den
Spiel-/Lernbereich anhand ihrer Beitragsart, damit Formular und Einreichungsroute
zusammenpassen. Zwei neue Desktop-/Mobilfälle prüfen beide Wechselrichtungen.
Verifiziert: 22 bestehende relevante Desktop-/Mobilfälle sowie alle vier neuen
Fälle bestanden; Typprüfung, Lint und erneuter Produktions-Build erfolgreich.
Der erste neue Testlauf klickte vor Abschluss der Hydration; die Fixtures warten
jetzt ausdrücklich auf die Sitzungserkennung. Kein Anwendungsfehler in diesen
vier anfänglichen Timeouts. Veröffentlichung der Nachkorrektur folgt.
Details: docs/vocabulary-notebooks-2026-10-27.md.
Vorherige CI für `c913785` ist inzwischen vollständig erfolgreich.

Verbleibend: redaktionell geprüfte weitere Sprachpaare/Themen/Niveaus und explizite
Bestätigung unbekannter älterer Vokabelpaare. Die Kernfunktionen nicht erneut
implementieren. Ältere externe OTP-/QA- und redaktionelle Backlogpunkte bleiben
unverändert offen. QA-Migrationsfixtures sind ausschließlich synthetisch und
laufen mit der oben genannten temporären Datenbank ab.

## Neuer Auftrag: Spielen und Lernen – 26. Oktober 2026

Ausgangspunkt `b8d016c`, sauberer Feature-Branch. Neue Hauptnavigation Spielen/Lernen;
bestehende URLs und Sammlung bleiben erhalten. Arbeitspakete: (1) strukturierte
Lernmaterialien im bestehenden Beitragssystem, Lernübungen und kontogebundener
Fortschritt mit Wiederholungen, (2) serverseitige Mehrsprachenauswahl samt Mengen
und zentralen Raumeinstellungen, (3) Regressionen und Migrationsprüfung in QA.
Lernen verwendet genau eine Zielsprache, Spiele explizite Sprachmengen. Wortketten
bleiben wegen des gemeinsamen Satzes einsprachig; Sprachrätsel benötigen mindestens
vier Sprachen; False Friends dürfen nur Paare aus der gesamten Auswahl verwenden.
Keine neuen Abhängigkeiten, keine KI-Aufrufe im Lern- oder Spielablauf.
Implementiert: getrennte DE/EN-Lernseiten und Sammlung, Lernbeiträge im vorhandenen
Editor samt Übersetzungen/Moderation, Lernkarten, Abfragen und Wiederholungsmodell.
Serverseitige Übungsversuche mit Eigentümerbindung, Ablauf, Revisionsschutz und
atomarer Auswertung; Gäste üben ohne gespeicherten Fortschritt. 22 neue A1-
Startmaterialien (DE/EN) mit Quellen vorbereitet. Mehrsprachenauswahl in Erstellung
und Lobby samt Mengen; SQL-Filter vor Stichprobe und erneuter Engine-Filter,
Satzbausprache und beide False-Friends-Sprachen berücksichtigt. Zwölf Lernkarten
pro Seite, serverseitige Filter und Statistik, automatische Zielsprache neuer
Lernbeiträge. Globale Menüauswahl folgt dem Hauptbereich statt Scrollposition.

Migration 024_learning.sql ausschließlich in Schema-only-QA br-quiet-snow-b9ua8at5
per transaktionalem, versioniertem Migrationsinhalt angewendet. Keine Produktion
verändert. Unterbrochene lokale Arbeit zusätzlich in ../local-backups/learning-20261026
gesichert. Echte isolierte PostgreSQL-Prüfungen bestanden: persistenter Lernstand,
Kontentrennung, Gastschutz, parallele Abgaben, Ablauf/Revisionsschutz, Fälligkeit,
SQL-Filter vor Kartenauswahl. Erzeugte Testdaten vollständig bereinigt.
175/175 Unit-Tests und 134/134 Desktop-/Mobilprüfungen im vollständigen
abschließenden Lauf bestanden.
Typprüfung, Lint, Übersetzungsprüfung, Abhängigkeitsaudit und Produktions-Build
bestanden; keine neuen Abhängigkeiten oder KI-Kosten. Quellbasierte
Grammatik-/Vokabelkarten sind ein A1-Einstieg, keine vollständige Sammlung aller
Sprachen/Niveaus. Umsetzung und Betrieb: docs/learning-2026-10-26.md.
Abgeschlossen: Code-Commit `c9137856cdf124370c7ebc78bd92298f1087bb7f` auf GitHub
`main`. Migration 024 am 26. Oktober 2026 produktiv erfolgreich angewendet;
22 neue Startmaterialien idempotent ergänzt (keine bestehenden Einträge geändert).
Bestehender Worker erfolgreich veröffentlicht: Version
`84edc7a0-a075-45dc-a945-06cb5c29f209` unter
https://sprachwelten.maki26.workers.dev/lernen. Secrets, R2, AI, Rate-Limits,
Google-Tag und Wartungszeitplan erhalten.

Live: `/`, `/en`, `/lernen`, `/en/learn`, Sitemap, Lernkatalog und Spielsprachen
HTTP 200. Pro Zielsprache elf Materialien; deutscher Grammatikfilter liefert
genau ein Modul; Folgeseite leer statt Duplikaten; ungültige Sprache 422.
Keine internen Autorennamen oder fremden Fortschritte im anonymen Lernkatalog.
Eigene Beiträge/Admin-Nutzerliste anonym 401, fremde Origin bei Lernabgabe 403.
Neue Lernseiten enthalten Canonical sowie DE/EN-Sprachalternativen.
Keine produktiven Testkonten, Lernabgaben, Spielpartien oder KI-Aufrufe erzeugt;
echte Schreib-/Parallelitätsprüfung ausschließlich in QA, Browserabläufe mit
kontrollierten Antworten. GitHub-CI für Code-Commit:
https://github.com/manuelk2607/Sprachwelten/actions/runs/40341277913
Beim Abschluss liefen dort noch Browserinstallation/-tests; Audit, Lint,
Übersetzungen, Typprüfung, Unit-Tests und Build waren bereits erfolgreich.

Nächste sinnvolle Arbeit: weitere redaktionell geprüfte Lernsprachen, Themen und
Niveaus ergänzen; keine erneute Implementierung dieser Kernfunktionen. Alte
externe QA-/OTP- und redaktionelle Backlogaufgaben bleiben unverändert offen.

## Abschlussprüfung 26. Oktober 2026

Glücksrad und neue Wortketten sind vollständig implementiert; die letzte
Nutzerkorrektur gilt: Buchstabenprüfung auf dem Server, Sinnprüfung durch die
Mitspieler, keine KI-Aufrufe. Bestehende Sprach-/Audiofilter, Punkte, Rematches,
Gastgeberwechsel und gespeicherte alte Spielrunden bleiben kompatibel. Aufgelöste
Glücksradbewertungen bleiben auch nach einem anschließenden Austritt erhalten.
Satzmeldungen enthalten den tatsächlich aufgebauten Satz statt nur des Startworts.

Verifiziert: 167 Unit-Tests, Typprüfung, Lint, Übersetzungsprüfung, vollständiges
Abhängigkeitsaudit (null aktuelle Befunde) und Produktions-Build. Echte isolierte
PostgreSQL-Parallelitäts-/Persistenztests bestanden; ihre Räume sind bereinigt.
Gezielte neue Desktop-/Mobiltests: 18/18 bestanden. Vollständiger erster Browserlauf:
120/124; zwei Erwartungen enthielten noch die alte Wortketten-Beschreibung und zwei
bestehende mobile Formularfälle scheiterten während laufender Hot-Reloads. Die
Beschreibung wurde korrigiert; alle 26 betroffenen Desktop-/Mobilfälle bestanden
anschließend im ruhigen Lauf. Die frische GitHub-CI für Code-Commit
`211c0763dc4179e20fbec5c2481e36e3c2620057` bestand vollständig, einschließlich
aller 124 Desktop-/Mobilfälle:
https://github.com/manuelk2607/Sprachwelten/actions/runs/40261732054

Zwei unversionierte nummerierte Dateien waren Kopien des verworfenen KI-Prototyps.
Sie wurden unverändert außerhalb des Repositorys in
`../local-backups/retired-ai-prototype-20261026/` gesichert; keine Arbeit gelöscht.
Keine Datenbankmigration nötig. Code-Commit `211c076` ist auf GitHub `main`.
Deployment-Probelauf erfolgreich, Produktionsdatenbank und Auth-Ziel geprüft.
Der erste Deploymentversuch scheiterte an abgelaufener Cloudflare-Anmeldung.
Nach Nutzerbestätigung über die Geräteanmeldung wurde `npm run deploy:cloudflare`
erfolgreich abgeschlossen. Produktive Worker-Version:
`d923f030-29e4-456d-80be-01906fabe3af` unter
https://sprachwelten.maki26.workers.dev/ (26. Oktober 2026).
Bestehende Datenbank-/Auth-Secrets, R2, AI, Rate-Limit-Bindings, Google-Tag und
Wartungszeitplan erhalten. Keine Migration und keine produktiven Testbeiträge.

Live geprüft: DE/EN-Startseiten und die vier Anleitungsseiten beider überarbeiteten
Modi jeweils HTTP 200 mit neuen Regeln; Sitemap und robots.txt HTTP 200.
Anonyme eigene Beiträge, Admin-Nutzerliste und Raumzugriff liefern 401;
fremde Origin wird vor einer Raummutation mit 403 abgewiesen. Die Multiplayer-
Schreibtests liefen ausschließlich gegen die isolierte QA-Datenbank bzw. im
Browser mit kontrollierten HTTP-Fixtures, nicht als produktive Spielpartien.
Der Spielauftrag ist abgeschlossen. Weitere offene QA-/Inhalts-/Schwierigkeits-
Aufgaben aus dem älteren Backlog stehen weiter unten; keine erneute Umsetzung
der jetzt abgeschlossenen Spielmechaniken beginnen.

## Aktueller Auftrag: Glücksrad und gemeinsame Sätze – 25. Oktober 2026

Ausgangspunkt `d65815c`, sauberer Feature-Branch. Der eingefügte Folgeauftrag
priorisiert die vollständige Überarbeitung von Zungenbrechern und Wortketten.
Zu Beginn waren keine begonnenen Implementierungen dieser Mechaniken vorhanden.

Plan: (1) serverseitiges Glücksrad mit synchronisiertem Ergebnis und bestehenden
Bewertungen, (2) gemeinsame Sätze mit Buchstabenprüfung, Peer-Abstimmung und Zeit-/Fehlerregeln,
(3) Multiplayer-/Browserregressionen, Gesamtchecks und bestehender Worker.
Bestehende gespeicherte Runden bleiben kompatibel.

Nutzerkorrektur während der Umsetzung: Keine KI für Wortketten. Nur der passende
Anfangsbuchstabe wird serverseitig geprüft (Endbuchstabe des vorherigen Wortes).
Den Sinn beurteilen die Mitspieler. Die vorbereiteten KI-Dateien wurden entfernt.
Aktuell umgesetzt: freie Worteingabe, reihum 45 Sekunden, anonyme Peer-Abstimmung
mit strikter Mehrheit in 30 Sekunden, 1 Punkt pro angenommenem Wort, Satzabschluss,
0 Punkte bei Ablehnung/Weitergeben/Timeout, Ende nach drei Fehlern oder 40 Wörtern.
Solo bleibt mit eigener Beurteilung spielbar. Glücksrad und alte gespeicherte
Runden sind kompatibel. Nächster Schritt: aktualisierte Tests und isolierte
Persistenz-/Parallelitätsprüfung. Erster Browserstart scheiterte an der macOS-
Prozessbeschränkung; der anschließende gezielte Browserlauf mit Freigabe bestand
18/18 Desktop-/Mobilfälle. 11 neue Unit-Tests bestehen. Echte isolierte PostgreSQL-
Integration bestand: konkurrierende Ziehungen/Bewertungen, konkurrierende Vorschläge
und Mehrheitsabstimmungen, Wiederholungsschutz, ETag-Projektion, Gastgeberwechsel
und Heartbeat-SQL. Alle erzeugten QA-Räume wurden entfernt. Keine Konten, Beiträge
oder KI-Aufrufe angelegt. Vollständige Browserregression läuft; Build/Schlusschecks,
Commit und Veröffentlichung folgen danach.

Vorangehendes QA-Paket: Das eindeutig geprüfte temporäre Konto hat weiterhin null
Beiträge und null Adminrechte; die autorisierte Löschung scheiterte erneut mit
„branch not found“. Manuell: Neon-Projekt Sprachwelten → main → Auth → Users →
UUID `d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7` und Anzeigename abgleichen → genau dieses
Konto löschen. Keine SQL-Umgehung. Eine leere Schema-only-QA-Datenbank
`br-quiet-snow-b9ua8at5` (qa-auth-20261025) wurde angelegt; sie läuft automatisch am
26. Oktober 2026 um 20:00 UTC ab. Keine produktiven Datensätze kopiert.
Das vom Nutzer erlaubte Testpostfach wurde noch nicht angelegt. Weitere P1/P2-
Backlogarbeit bleibt zugunsten des neuen Spielauftrags zurückgestellt.
Neu belegt: npm-Audit hat null Befunde; das bisherige braces-Advisory wurde am
23. Oktober zurückgezogen. Die alte Ausnahme kann nach Tests entfernt werden.

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
