# Isolierte Integrationsprüfungen

`npm run qa:integration` führt die vorhandenen echten PostgreSQL-Tests für Lernen,
Hefte, Rechte-/Kontentrennung, Beiträge und Multiplayer-Persistenz nacheinander aus.
Die Anwendung erhält keinen Test-Login und keine Umgehung ihrer Rechteprüfung.
Produktionshost, Produktionsbranch, Pooler, abweichende Verbindungen und fremde
Auth-Endpunkte werden vor einem Zugriff abgelehnt. `.env.local` wird nie geladen.

Erforderliche lokale Umgebungswerte: `QA_DATABASE_APPROVED=1`, `TEST_DATABASE_HOST`,
`TEST_NEON_BRANCH` und eine direkte `DATABASE_URL`/`DATABASE_URL_UNPOOLED` zum
ausdrücklich freigegebenen QA-Ziel. Keine Geheimnisse in Logs oder Commits speichern.
Die Tests verwenden synthetische IDs und bereinigen ihre eigenen Beiträge, Räume,
Hefte, Versuche und Fortschritte. Historische Migrationsfixtures sind optional und
werden nur bei tatsächlichem Vorhandensein als geprüft gemeldet.

`--migrate-empty` wendet sämtliche versionierten Migrationen mit dem vorhandenen
Runner an. Es verweigert jede Initialisierung, sobald öffentliche Tabellen vorhanden
sind: kein Schema-Reset und keine automatische Übernahme eines unklaren Altstands.
`--auth` prüft zusätzlich den echten verwalteten QA-Login einschließlich Registrierung,
falschem Passwort, Sitzung und Abmeldung/Replays. `NEON_AUTH_BASE_URL` muss nachweislich
zum gleichen QA-Endpunkt gehören. Eine zufällige, nicht zustellbare Testidentität bleibt
bis zum Ablauf des kurzlebigen QA-Branches erhalten; sie hat keine Produktionsrechte.
Dieser direkte Provider-Test ersetzt keine produktive UI-/OTP-Zustellungsprüfung.

## GitHub-CI: einmalige externe Einrichtung

Der Workflow `Isolated integration` ist eingecheckt und verwendet die offizielle
[Neon Branch Action](https://github.com/neondatabase/create-branch-action) mit
festem Commit. Vor Aktivierung ist ein **separates QA-Projekt** erforderlich:

1. Leeres QA-Projekt mit Datenbank `sprachspiel`, Rolle `neondb_owner` und aktiviertem
   Managed Auth als Template anlegen. Öffentliche Anwendungstabellen müssen leer sein;
   keine Produktionsdaten, Benutzer oder Secrets importieren.
2. In GitHub die Umgebung `qa` und das ausschließlich für dieses Projekt gültige
   Secret `NEON_QA_API_KEY` einrichten. Keine bestehende Produktionsberechtigung kopieren.
3. Variablen `NEON_QA_PROJECT_ID`, `NEON_QA_TEMPLATE_BRANCH` und erst anschließend
   `NEON_QA_ENABLED=true` setzen. Produktionsprojekt wird ausdrücklich abgelehnt.
4. Workflow manuell starten. Danach läuft er auch bei Pushes nach main, niemals
   für fremde Pull Requests. Jeder Lauf erzeugt einen eindeutigen Branch aus dem leeren QA-Template
   mit einer Stunde Ablaufzeit; parallele Läufe werden nacheinander ausgeführt.

Ohne diese Einrichtung ist der Workflow **übersprungen**, nicht bestanden. Der
vorhandene normale CI-Workflow prüft weiterhin Unit-/Browsertests und Build.
Ein normaler Branch des ausdrücklich leeren QA-Templates übernimmt die isolierte
Managed-Auth-Konfiguration. Der Runner lehnt vorhandene Auth-Benutzer und öffentliche
Tabellen vor Initialisierung ab. Produktionsprojekte sind im Workflow gesperrt.
Die bestehenden reinen PostgreSQL-Prüfungen verwenden weiterhin Schema-only-QA.
Diese lässt sich nicht nachträglich automatisch für Auth provisionieren, wenn das
kopierte `neon_auth`-Schema schon vorhanden ist (am 27. Oktober real mit 409 bestätigt).
Deshalb verwendet der neue Auth-CI-Weg das separate, leere QA-Template und normales
[Auth-Branching](https://neon.com/blog/handling-auth-in-a-staging-environment).
Die Ablaufzeit räumt auch nach einem Jobabbruch auf; Repositorytests bereinigen
ihre selbst erzeugten Daten zusätzlich. Keine produktiven Auth-/KI-Kosten entstehen.
QA-Ressourcen können ein kleines Neon-Kontingent verbrauchen; Aktivierung erst mit
dem dafür vorgesehenen Projekt. Der Sprachraum bleibt außerhalb des Umfangs.

## Verbleibende echte Mailprüfung

OTP-Oberfläche und simulierte Fehlerfälle sind vorhanden. Eine belastbare Prüfung
von Zustellung, Codebestätigung, Ablauf und falschen Codes benötigt ein vom Besitzer
autorisiertes erreichbares Postfach; die nicht zustellbaren QA-Adressen ersetzen
das nicht. Keine echten Nachrichten oder neuen Postfachanbieter werden automatisch
beauftragt. Der bekannte alte Testbenutzer ist separat in `PROGRESS.md` dokumentiert.

## Einrichtung abgeschlossen am 28. Oktober 2026

Dediziertes QA-Projekt `polished-wind-59150518`, leeres Auth-Template
`br-damp-glitter-baqvjq5l`. Projektspezifischer Schlüssel im GitHub-Environment
`qa`; Zugriff auf das Produktionsprojekt wurde ausdrücklich abgelehnt.
Maximal 0,25 CU, Quoten 1.800 Compute-/3.600 Aktivsekunden und 200 MiB.
Template bleibt ohne Anwendungstabellen und Benutzer. Kein Produktionsexport.

Erster echter CI-Lauf erfolgreich: https://github.com/manuelk2607/Sprachwelten/actions/runs/40728056912
Migrationen, PostgreSQL-Persistenz und echtes Managed Auth bestanden. Der aktuelle
Runner enthält zusätzlich die synthetische redaktionelle Integrationssuite.
OTP-Zustellung ist weiterhin nicht geprüft. Lokale QA-Schlüssel sind ignoriert
und gehören niemals in Logs oder Git. Abgelaufene Testbranches nicht wiederverwenden.
