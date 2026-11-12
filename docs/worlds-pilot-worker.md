# Separater Sprachwelten-Testworker

Der Testworker heißt `sprachwelten-worlds-pilot` und verwendet
`https://sprachwelten-worlds-pilot.maki26.workers.dev`. Er dient der Prüfung
des echten Worlds-Logins und des Rückwegs zum Projekt mit Testdaten.

## Paket lokal prüfen

```sh
SPRACHWELTEN_OFFLINE_PREVIEW=1 npm run build
npm run deploy:worlds-pilot -- --dry-run
node scripts/test-worlds-pilot-worker.mts
```

Der Probelauf benötigt weder Zugangsdaten noch Cloudressourcen. Die CI prüft
das fertige Paket mit synthetischen Bindings, beide Seitensprachen, die
Anmelde-Routen, statische Dateien, Indexierungsschutz und die Sperre bei
fehlender gültiger Konfiguration.

## Testadresse veröffentlichen

In Cloudflare den Testworker einmalig anlegen. Danach lässt sich der
Deployment-Zugang mit `Individual Workers Editor` auf diesen Worker begrenzen.
[Cloudflare Workers-Berechtigungen](https://developers.cloudflare.com/workers/authorization/workers/)

1. Einen befristeten Branch aus dem leeren Sprachwelten-QA-Template verwenden.
   Die Migrationen einschließlich 029 bis 031 mit dem vorhandenen Migrationsrunner
   ausführen. Die öffentliche Testadresse nur auf diesem Zweig als vertrauenswürdige
   Adresse für die bisherige Konto-Bestätigung hinzufügen.
2. In der zentralen Worlds-Testinstanz einen öffentlichen PKCE-Client mit
   Einwilligung und genau einem Callback registrieren.
   - Callback `https://sprachwelten-worlds-pilot.maki26.workers.dev/auth/callback`
   - Ressource `https://sprachwelten-worlds-pilot.maki26.workers.dev/api`
   - Den Client mit diesen Werten auch in der Worlds-Hub-Clientliste hinterlegen.
3. Die Variablen für das isolierte Ziel bereitstellen.
   - `QA_DATABASE_APPROVED=1`, `TEST_NEON_BRANCH`, `TEST_DATABASE_HOST`
   - `DATABASE_URL` und `NEON_AUTH_BASE_URL` des QA-Branches und ein eigener
     `NEON_AUTH_COOKIE_SECRET` mit mindestens 32 Zeichen
   - `WORLDS_PILOT_CLIENT_ID`, `CLOUDFLARE_ACCOUNT_ID` und
     `WORLDS_PILOT_CLOUDFLARE_TOKEN` aus einem gesonderten Secret
   - Für signierte Hub-Abmeldungen optional `WORLDS_HUB_SESSION_EVENT_JWK`
     mit dem öffentlichen Ed25519-Schlüssel (`kid`, `kty`, `crv`, `x`)
4. Das geprüfte Paket mit `npm run deploy:worlds-pilot -- --deploy` veröffentlichen.
   Der Befehl prüft das Datenbankziel, die zugehörige Auth-Adresse und Migration
   029 bis 031 vor dem Upload. Er übergibt Datenbank und Auth als Worker-Secrets über
   eine temporäre Datei mit eingeschränktem Zugriff und räumt sie danach auf.

Alternativ in GitHub `Isolated integration` manuell mit
`publish_worlds_pilot=true` starten. In der vorhandenen Umgebung `qa` werden
`WORLDS_PILOT_CLIENT_ID` und `WORLDS_PILOT_CLOUDFLARE_ACCOUNT_ID` als Variablen
und `WORLDS_PILOT_CLOUDFLARE_TOKEN` als Secret benötigt. Jeder ausdrücklich
gestartete Pilot-Release erstellt eine neue QA-Datenbank für 24 Stunden, prüft
sie mit der vorhandenen Integration, erlaubt die Testadresse im neuen
Auth-Zweig, veröffentlicht und prüft die Testadresse.
Normale Läufe behalten den einstündigen QA-Branch und veröffentlichen nichts.
Die optionale öffentliche Variable `WORLDS_HUB_SESSION_EVENT_JWK` aktiviert
`POST /auth/events/session-revoked` erst mit gültiger Konfiguration.

Der Worker verwendet ausschließlich die gebauten Dateien und die Testbindungen.
Vorschau-URLs, Cron, Produktionsspeicher und KI-Bindings sind deaktiviert.
Alle Antworten tragen `noindex, nofollow` und `private, no-store`. Die
robots.txt sperrt alle Pfade und die Sitemap liefert 404. Ungültige Bindings
führen zu 503. Die öffentliche Produktionskonfiguration wird separat gebaut.

## Abnahme und Rücknahme

- Erst DE/EN-Lernseiten, statische Assets, `/robots.txt`, Sitemap, anonymen
  `/auth/status` und private Routen mit der Testdatenbank prüfen.
- In demselben Browser mit bestehender zentraler Anmeldung den Projekt-Login
  aufrufen. Nach der Einwilligung den Callback, Rückweg, die ausgewählte
  Projektidentität und eine eigene private Seite prüfen. Für Bestandsübernahme
  und Abmeldung nur ausdrücklich dafür angelegte Testdaten verwenden.
- Nach jeder Veröffentlichung die Worker-Version festhalten. Beim ersten
  Fehlschlag die workers.dev-Route **des Testworkers** deaktivieren. Bei
  späteren Änderungen mit der vorherigen geprüften Version dieses Workers
  zurückrollen und dieselben Prüfungen ausführen. Die produktive Sprachwelten-
  Adresse ist kein Rücknahmeziel. Nach Ablauf des QA-Branches die Testadresse
  deaktivieren.
