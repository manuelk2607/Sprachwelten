# Sprachwelten – Fortsetzungsstand, 8. November 2026

## Abschluss: Musikmigration geprüft und Korrekturen live

Auftrag aus `goal-objective.md` abgeschlossen. Vollständige technische Übernahme
des vorhandenen Liedspiels bestätigt: Zielkern identisch, Ziel-Engine/UI/API an
Music-Worlds angepasst; Antworten/Einzelpunkte/Mehrspieler/Fristen/Wiederverbindung
und Rematch-Historie durch Zieltests und echte isolierte Integration geprüft.
Alle acht Quellkarten samt Zuordnung erhalten; vier rechtegeprüft freigegeben,
vier ausdrücklich privat quarantänisiert. Keine Audio-Dateien übernommen.
Nach Source-Deployment erneut lesend gegen private Archivprüfsumme und Ziel-
Mappings abgeglichen: acht unverändert, acht eindeutig, keine neuen Dubletten.

Geprüfter Anwendungscode `80df997`, dokumentarischer Stand `95dacbd` frisch
gebaut und am 8. November auf dem bestehenden Worker veröffentlicht:
**Version `b21920f5-ee96-4dab-b7ce-be6b05e7ee24`**. Bestehende Bindings,
Secrets, Cron und Datenbank erhalten; keine Migration nötig. Cloudflare-Zugang
wieder aktiv. Vollständige CI/isolierte QA siehe unten, beide für `80df997` grün.

Live nach Veröffentlichung: `/spiele/personenzitate` und
`/en/games/person-quotes` 200/passender Canonical; alte Musik-Guide-URLs 308 auf
jeweilige neue Sprachfassung, Sitemap bereinigt. Anonymes Anlegen neuer Songräume
410, private Konto-/Admin-APIs 401/no-store. Echter Browser DE/EN bei 1280px und
390px: Personenzitat-Formular, keine Song-/Albumeingabe, sichtbarer gültiger
Music-Worlds-Link, kein horizontaler Überlauf. Keine Testbeiträge veröffentlicht.
Der frühere Cutover hält vorhandene Songdaten und gespeicherte Engine kompatibel;
neue Partien, Beiträge und öffentliche Sammlung verwenden nur Personenzitate.

Music-Worlds blieb unverändert (Review-HEAD `67403f9`, produktiver Code
`1c9ac77`); kein erneutes Zieldeployment erforderlich. Produktions-Smoke,
DE/EN-Desktop-/Mobilansichten und Gesundheitsprüfung des Ziels bestanden.

Externe Folgepunkte, keine Migrationsblocker: vier französische Fragen erst bei
datierter Rechte-Evidenz freigeben; privates Audio erst nach Speicher-/Rechte-
Freigabe aktivieren; zentrale Worlds-SSO-Verknüpfung weiter im isolierten Pilot
abnehmen. OTP-Mailzustellung wurde ohne autorisiertes Testpostfach nicht getestet.
Kein weiterer Schritt für diese Migrationsabnahme erforderlich.

## Unabhängige Music-Worlds-Abnahme – 7. November

Produktionsabgleich über `scripts/verify-music-migration.mts` (ausschließlich
lesend): private Archivprüfsumme stimmt; alle acht kompletten Quellrows weiterhin
exakt unverändert; acht eindeutige Ziel-IDs/Legacy-Mappings mit Quellrevision,
Autorbezug, Sprache, Titel, Interpret, Album und Text geprüft. Vier freigegeben,
vier privat/ungeklärt. Keine Audio-Bytes kopiert. Zielkern `ported-quiz.ts`
ist identisch mit dem vorbereiteten Kern und wird in der Zielengine verwendet.
Echte Music-Worlds-QA: 73 PostgreSQL-Assertions bestanden; 22 Unit-Tests,
Typprüfung, Lint, Audit und Build bestanden. Produktiver Smoke bestätigt alle
DE/EN-Seiten, Health/DB, Katalog, private 401/no-store und CSRF 403; Desktop und
390px-Mobilansicht in DE/EN ohne horizontalen Überlauf geprüft.

Nachgewiesene Cutover-Lücken korrigiert: öffentliche Anleitung erwähnte weiterhin
Liedstellen, Beitragsart hieß weiterhin Zitat oder Liedstelle. Jetzt reine
Personenzitate, Musik-Link im Beitragseditor, neue kanonische DE/EN-Anleitungs-
URLs mit 308 von alten Lesezeichen. Neuer Browser-Regressionsfall prüft beide
Sprachen/Weiterleitungen. Veralteter Browserfall für neue Songbeiträge prüft jetzt
Personenzitate, fehlende Songauswahl und Music-Worlds-Link; vorhandene Legacy-
Songraumtests bleiben unverändert.

Echte produktive Neon-Anmeldung, Sitzungswiederherstellung, Logout/Replay und
Origin-/Eingabegrenzen bestanden. Testkonto ist Admin, daher normale Mitglied-
Adminverweigerung hier nicht behaupten; keine KI-Kosten/Modellaufrufe.
SSO-Pilot `2ef8b15` anhand Code und grüner CI geprüft: isolierte Origin/DB,
standardmäßig deaktiviert; kein produktiver Hub-Login behauptet. Echte zentrale
Identitätsverknüpfung bleibt externe Pilotabnahme außerhalb der Spielmigration.

Codecommit `80df997` ist gepusht und beide exakten GitHub-Läufe bestanden:
Checks `42409743925` mit 202 Unit-Tests und 156 Desktop-/Mobil-Browserfällen,
Audit/Lint/Übersetzungen/Typen/Build; isolierte Integration `42409745221` mit
Migrationen, Lernen, Heften/SRS, parallelen Spiel-/Voting-Aktionen, Redaktion und
echtem Managed-Auth-Profil-/Passwort-/Sitzungsablauf. QA-Fixtures bereinigt.
Lokale Gesamtläufe hatten einzelne zeitabhängige Desktop-Ausfälle; unveränderte
gezielte Wiederholungen und die vollständige CI bestanden. Keine Tests oder
Qualitätsgrenzen abgeschwächt. OTP-Mailzustellung mangels Testpostfach nicht
getestet; optionale historische Heft-Migrationsfixtures im leeren QA-Template
nicht vorhanden. Vollständiger gespeicherter QA-Archivsnapshot nochmals mit dem
gesamten privaten Archiv verglichen: identisch.

Aktuelle Produktion zusätzlich lesend geprüft: elf Haupt-/Privat-/SEO-Pfade
200, Songraumerstellung und archivierter Songdetailzugriff anonym 410, Sammlung
ohne archivierte Songs. Music-Worlds-Health/SEO/Assets/Privatsphäre gesund.
Keine Produktionsdaten oder Konten verändert, keine Migration nötig.

Historischer, inzwischen behobener Deploymentblocker: für `80df997` am 7. November
vor Upload gescheitert: kein aktiver Wrangler-OAuth-Zugang und kein lokaler
`CLOUDFLARE_API_TOKEN`. Keine Ersatzressource anlegen. Geprüfter aktueller Build
liegt unter dist. Nach Gerätefreigabe denselben Deploymentweg erneut ausführen,
Version protokollieren und neue DE/EN-Guide-URLs sowie alte 308-Weiterleitungen,
Music-Worlds-Link/Personenformular und bestehende Sperren live bestätigen.
Zielrepository unverändert, daher kein Zieldeployment erforderlich. Dieser
Zwischenstand ist durch den erfolgreichen Abschluss vom 8. November oben ersetzt.

## Migrationsprüfung erneut aufgenommen – 7. November 2026

Zielauftrag vollständig aus der lokalen goal-objective.md gelesen. Music-Worlds
ist jetzt erreichbar; separater unveränderter Review-Checkout unter
`../music-worlds-review`, HEAD `67403f9`. Dessen Berichte nennen acht archivierte
und importierte Ursprungsfragen (vier öffentlich geprüft, vier privat), keine
Audio-Dateien und erfolgreiche isolierte Wiederherstellung. Diese Datenaussagen
noch unabhängig anhand privatem Archiv/Produktionsmapping verifizieren.

`origin/main` enthält den tatsächlich veröffentlichten Cutover `a31f117` und
Bericht `edee8a0`. In den hiesigen Arbeitsbranch mit Merge `eacd9f7` integriert;
Konflikte in Dokumentation und minimatch aufgelöst, neuere 11.0.4 erhalten.
Alle nicht versionierten Fremddateien unverändert. Aktuelle lokale Nachprüfung:
Sprachwelten 202 Unit-Tests, Typprüfung und Übersetzungsprüfung bestanden;
Music-Worlds frische Installation/Audit ohne Befund, 22 Tests, Typprüfung und
Lint bestanden. Ziel-Health live gesund, Commit `1c9ac77`, Hub/Uploads aus.
Letzte Actions beider Projekte grün; Source-Pilot `2ef8b15` separat auf
`origin/feature/worlds-hub-sso`, noch nicht in diesem Branch integriert.

Nächster konkreter Schritt: aktuelle Cutover-UI mit Browser-Suite verifizieren,
private Archiv-/Importbelege auffinden und lesend abgleichen; Source-Pilotbranch
auf SSO-Vertrag/Tests prüfen. Danach verbleibende Integrations-/Build-/Livechecks
und gezielte Fehlerkorrekturen. Vollständige Abnahme noch NICHT behauptet.

## Historischer Vorbereitungsstand – durch Cutover und Abnahme oben ersetzt

Bestandsaufnahme und Integrationsplan in `docs/music-worlds-transfer.md`.
Liedstellen sind eine Kategorie von `who-said-it`, kein eigener Modus oder
API-Dienst. Gemeinsame Attribution-/Raumengine muss für Personenzitate bleiben.
`transfer/music-worlds/quiz.ts` enthält einen unabhängigen TypeScript-Kern für
Audio-/Textaufgaben mit Rechtebeleg, vier Titeln, opaken Antwort-IDs, +1-Wertung
und Tipp-vor-Album. Keine Musikdateien oder Liedtexte übernommen.
`scripts/package-music-transfer.mts` archiviert die eingecheckte Referenz-
Implementierung samt relevanter UI/API/Engine/Tests und Prüfsumme unter dem
gitignorierten `outputs/music-worlds`; keine Seeds oder Produktionsdaten.

Ziel-Repository `manuelk2607/Music-Worlds` per GitHub abgefragt: nicht erreichbar.
Deshalb keine produktive Entfernung oder Datenlöschung; bestehende Liedkarten,
Räume und Besitzerrechte bleiben erhalten. Das Quellpaket ist vorbereitet,
die vollständige Migration inklusive Daten und Zielintegration ist noch offen.
Nächster Schritt: Zielrepository klären; zugriffsgeschütztes, checksummiertes
Archiv der Liedkarten und abhängigen Daten erstellen und isoliert rückspielen;
danach neue Sprachwelten-Partien/Pool/Selektoren auf Personen beschränken,
DE/EN-Beschreibungen bereinigen und Ziel-Multiplayerparität prüfen.

Verifikation: Typprüfung, Lint, 199 Unit-Tests einschließlich fünf gezielter
Kern-/Song-Regressionsfälle und Build bestanden. Kein Deployment für
diesen vorbereitenden Stand, da die Produktion unverändert bleibt.

## GitHub Actions – Abhängigkeitsaudit repariert

Die Runs `41467830033` und `41517577257` scheiterten ausschließlich im
vollständigen Abhängigkeitsaudit an der neu veröffentlichten
`minimatch`-Schwachstelle `GHSA-g3hv-75wg-m249` (DoS durch Glob-Verstärkung,
betroffen `<11.0.1`). Die ESLint-Werkzeugkette zog sowohl 10.2.6 als auch eine
alte 3.x-Ausgabe ein. Ein zentraler npm-Override auf die kompatible gepatchte
Version 11.0.4 vereinheitlicht alle ESLint-Pfade; keine Ausnahme und keine
Abschwächung des Audits. Zusätzlich erhielt die neue kontogebundene
Sitzungsfehlermeldung ihre fehlende englische Übersetzung.

Frische `npm ci`-Installation erfolgreich. Vollständiger Audit ohne Befund,
Lint, Typprüfung, Übersetzungsprüfung, Unit-Suite und Build bestanden. Alle 154
Desktop-/Mobil-Browserprüfungen bestanden; ein erster lokaler Browserlauf war
ausschließlich durch macOS' eingeschränkte Chromium-Prozessschnittstelle
blockiert und bestand unverändert außerhalb dieser Beschränkung.

## Beitragswarteschlange – vollständig veröffentlicht

Drei authentifizierte Läufe haben die Warteschlange innerhalb der regulären
Kontingente vollständig verarbeitet. Ergebnis: **43 neu erstellt, 1 vorhandener
Eintrag idempotent erkannt, 0 ausstehend, 0 fehlgeschlagen**. Veröffentlicht wurden
20 `gaming_mission`-, 20 `academic`- und 3 neue `youth_chat`-Beiträge; `Swag`
wurde als bereits vorhanden quittiert, ohne Dublette oder Quotenverbrauch.
Alle 44 verarbeiteten IDs wurden über die Anwendung erneut eingelesen und direkt
in Produktion geprüft: 44/44 vorhanden und eindeutig, 44/44 aktiv, 44/44 der
unveränderlichen Konto-ID `365f639e-7f9f-4c42-8260-a3398cceb219` zugeordnet,
44/44 mit sichtbarer Angabe `Manuel`. Keine Gast- oder Testkontobeiträge und keine
Überschreibungen.

Der Abschlusslauf am 3. November verarbeitete die drei restlichen Jugendbeiträge
fehlerfrei. Kein weiterer Veröffentlichungslauf erforderlich.

## Produktionslauf der Beitragswarteschlange – Vorprüfung 2. November

Queue-Integrität erneut erfolgreich geprüft: 44 valide Einträge, Status lokal
jetzt 0 `pending`, 44 `published`, 0 `failed`. Lesender Produktionsabgleich
zeigt eine zwischenzeitliche Veröffentlichung: `Swag` ist bereits als
`youth_chat` vorhanden, mit Autor-ID `365f639e-7f9f-4c42-8260-a3398cceb219`
und sichtbarer Angabe `Manuel`. Die übrigen 43 Queue-Inhalte sind nicht vorhanden.
Der Runner soll `Swag` beim nächsten authentifizierten Lauf idempotent als
`existing` quittieren; keine zweite Veröffentlichung.

Cloudflare-Deployment am 2. November abgeschlossen: Nach einem ersten Lauf mit
veraltetem Build wurde der aktuelle Stand neu gebaut und als Worker-Version
`d338d61d-c429-4358-982a-5d4108d4af7b` auf `sprachwelten` veröffentlicht. Der
Quoten-Endpunkt antwortet live anonym korrekt mit HTTP 401 und `no-store` statt
404. Bestehende Worker-Secrets, Bindings und Cron-Trigger wurden erhalten.

Die persönlichen Zugangsdaten liegen ausschließlich in der gitignorierten Datei
`.env.auth-test.local` mit Modus 0600. Sie wurden weder ausgegeben noch versioniert.

## Veröffentlichungswarteschlange vorbereitet

`publication-queue.json`: **0 pending, 44 published, 0 failed** nach dem
Abschlusslauf; 43 davon neu erstellt und einer als bereits vorhanden erkannt.
Enthalten: vier restliche Jugendwörter sowie die ausdrücklich zur Vorbereitung
freigegebenen 20 Gaming- und 20 Hochschulbegriffe. Die zuvor gespeicherten 18
Beiträge bleiben separat abgeschlossen. Produktionsbestand lesend abgeglichen;
mehrdeutige Begriffe durch Kontext präzisiert, Ablenkungsantworten verbessert und
alle vier Antworten in DE/EN ergänzt. Keine erfundenen redaktionellen Freigaben.

Manueller, wiederaufnehmbarer Lauf: `node --import tsx scripts/publish-queue.mts`
prüft lokal; `--publish` meldet sich mit lokal bereitgestellten autorisierten
Kontodaten an und arbeitet bis zur Restquote. Keine Zugangsdaten werden gespeichert.
Vor jedem POST Dubletten- und Quotenprüfung; Status vor Versand atomar sichern,
anschließend erneut lesen und Inhalt/Bearbeitungsrecht prüfen. Unklare Ausgänge
bleiben `failed`; ausdrücklich mit `--retry-failed` nach Fehlerprüfung fortsetzen.
Kontoprüfung im Server verhindert Gastbeiträge bei zwischenzeitlichem Sitzungsablauf.
Details/Startanleitung: `docs/publication-queue.md`.

Die anfängliche Sperre bis 16:28:48 UTC ist abgelaufen. Vor jedem weiteren POST
liest der neue Endpunkt `/api/me/contribution-limit` die tatsächliche Kontoquote.
Der bestehende Cron hat keine Benutzersitzung; keine automatische Veröffentlichung
ohne gestarteten Prozess oder dauerhafte Kontozugangsdaten eingerichtet.

Prüfungen: vollständige bestehende Unit-Suite bestanden; zusätzlich fünf gezielte
Tests zu Queue-Integrität, Wiederaufnahme, Kontoschutz und exakter Limitgrenze.
Typprüfung, Lint und Build bestanden (bestehende Framework-/Sourcemap-Warnungen).
Zwei echte Login-/Quoten-/POST-Läufe und deren Datenbankzuordnung bestätigt;
Netzfehler-/Parallelprozessintegration nicht behaupten. Keine Datenbankmigration
erforderlich.

Commits `4b751c6` bis `a212c9e` sichern Paket und Produktionsvorprüfung. Der
aktuelle Build und die fünf gezielten Queue-Tests bestehen. Kein temporäres Konto
oder Ersatz-Worker angelegt.

Nächster Schritt: keiner; Warteschlange vollständig und produktiv verifiziert.

## Inhalte – schwedische Redewendungen und Jugendwörter

Über das bestehende, angemeldete Manuel-Konto wurden in Produktion **18 neue
Community-Beiträge** angelegt: alle **10** noch fehlenden Redewendungen aus der
geprüften View-Stockholm-Liste sowie **8** noch fehlende historische deutsche
Jugendwörter aus der Langenscheidt-Jahresübersicht. Jeder Eintrag hat vier
inhaltlich unterschiedliche DE-/EN-Antworten, `Manuel` als sichtbare
Beitragsangabe, die jeweilige Quelle und die echte Konto-ID; keine redaktionelle
Freigabe oder Schwierigkeitsstufe wurde erfunden. Drei bereits vorhandene
schwedische Ausdrücke und sechs bereits vorhandene Jugendwörter wurden als
Dubletten übersprungen.

Produktionsprüfung: 18/18 Beiträge dem richtigen Konto zugeordnet, Status
`community`, vier Antwortmöglichkeiten, DE und EN vollständig und je Sprache
eindeutig. Die vorbereitete Gesamtmenge von 22 neuen Beiträgen besteht die
vorhandene `entryInput`-Validierung; alle Antwortsets bestehen die
Eindeutigkeitsprüfung. 14 gezielte Unit-Tests zu Antwortvalidierung,
Sprachfassungen, verdeckten Lösungen, Mischung und Spielauswertung bestanden.
Bestehende Daten wurden ausschließlich gelesen; neue
Beiträge liefen über das öffentliche, authentifizierte Formular samt
Rate-Limit und serverseitiger Validierung.

Die damals wegen des Stundenlimits offenen Begriffe `Swag`, `Niveaulimbo`,
`hartzen` und `Gammelfleischparty` sind inzwischen verarbeitet: `Swag` wurde als
bereits vorhandener, korrekt zugeordneter Beitrag erkannt; die übrigen drei
wurden regulär über das persönliche Konto veröffentlicht und verifiziert.

## Veröffentlicht – Passwort statt Profilbild; Mail-Freigabe extern offen

Branch `feature/account-email-password`, Basis `c795bce`. Profilbild-Eingabe/
Vorschau entfernt; bestehende Auth-Bildmetadaten werden nicht gelöscht. Profil-
Namensänderung akzeptiert ausschließlich den Namen. Passwortänderung mit aktuellem
Passwort, Wiederholung, 8–128 Zeichen, zwingender Abmeldung anderer Sitzungen;
Passwörter nur im Arbeitsspeicher und nach Erfolg/Abbruch gelöscht.
Eigener Mailwechsel über native Neon-OTP-Endpunkte mit gebundener Zieladresse,
Bestätigungscode, Wiederholen/Abbruch und ausdrücklicher Fehleranzeige. Direkte
E-Mail-/Rollen-/Zielkontoänderung über `update-user` bleibt verboten. Alle neuen
Mutationen haben Sitzungs-, Origin-, Größen- und Schemaprüfung inklusive Pfadaliassen.

193 Unit-Tests, 10 gezielte Desktop-/Mobilfälle, Typprüfung, Lint, DE/EN-Abdeckung,
Audit ohne Befund und Build bestanden. Echte isolierte Auth-Prüfung in
`br-long-sky-batt1ulp`: falsches aktuelles Passwort, tatsächlicher Passwortwechsel,
altes Passwort ungültig, neues Passwort gültig, andere Sitzung widerrufen, eigene
Identität/Sitzung/Logout erhalten. Synthetische `.invalid`-Konten nur in ablaufender QA.
Keine produktiven Konten geändert. QA-Zweig läuft automatisch nach einer Stunde ab.

**Externe Einschränkung Mailwechsel:** QA-Dienst antwortet tatsächlich mit HTTP 400
„Change email with OTP is disabled“. Es gibt in Neons dokumentiertem OpenAPI-/CLI-
Konfigurationsmodell kein Feld für `emailOTP.changeEmail.enabled`. Nicht durch SQL,
eigene OTPs oder einen sofortigen ungeprüften Mailwechsel umgehen. Benutzerlogin im
richtigen Projekt anschließend erfolgt; QA-Konsole unter `settings/auth` vollständig
lesend geprüft: kein Mailwechsel-Schalter vorhanden. Keine Auth-Einstellung verändert.
Produktive Freischaltung und echte OTP-Zustellung/Bestätigung nicht als geprüft ausweisen.

Benutzer hat QA-Aktivzeit **7200 Sekunden** ausdrücklich freigegeben; per Neon
angewendet. Compute-Limit weiterhin 1800 Sekunden, maximal 0,25 CU, 200 MiB.
Keine Produktionsquoten geändert. Frühere Aktivgrenze 3600 führte zu „quota exceeded“.

Code `760d2bc4d156513e2aac3c0526364690377dfc20` auf GitHub main.
Beide CI-Läufe erfolgreich: **193 Unit-Tests, 154 vollständige Desktop-/Mobilfälle**,
Typprüfung, Lint, Übersetzungsabdeckung, Audit und Build; echte isolierte Integration
inklusive Passwort-/Sitzungsabläufen:
- Checks: https://github.com/manuelk2607/Sprachwelten/actions/runs/40969002564
- Integration: https://github.com/manuelk2607/Sprachwelten/actions/runs/40969002439

Bestehender Cloudflare-Worker veröffentlicht, Version
**e34f209b-b017-4cc2-b51d-b96ac84726f5**. Datenbank-/Auth-Produktionsziel vor Veröffentlichung
bestätigt; keine Migration (026 bleibt), keine Änderung produktiver Konten oder
Passwörter. Bestehende Bindings, Secrets und Cron erhalten.
Live bestätigt: Profil 200/noindex; Passwort-/Mailanforderung-/Mailbestätigungs-
Endpunkte und kodierter Pfadalias anonym 401/no-store; anonyme Managed-Auth-Sitzung
200/null. Keine Mail angefordert und keine Credentials produktiv geändert.
Protokoll `/private/tmp/sprachwelten-account-live.log`.

**Nächster konkreter Schritt extern:** Neon zur Freischaltung von
`emailOTP.changeEmail.enabled` im vorhandenen Managed-Auth-Projekt befragen; siehe
`docs/account-settings-2026-10-29.md`. Konsole/API bieten aktuell keinen Schalter.
QA meldet HTTP 400 „Change email with OTP is disabled“; produktive Freischaltung
sowie echte Codezustellung/-bestätigung nicht nachgewiesen. Keine SQL-Umgehung,
keine selbst erfundenen OTPs, keine neue Organisation oder Auth-Migration beginnen.
Passwort- und Bildentfernungs-Paket ist abgeschlossen; keine Wiederholung nötig.

## Abgeschlossen – Profil, Prüfstatus und SEO (29. Oktober)

Branch `feature/profile-review-seo-20261029`, Basis `5d8481c`. Profilseite mit
Anzeigename/optionalem HTTPS-Bild, Speichern/Abbrechen/Fehlerfeedback; vorhandenen
Managed-Auth-Updateweg serverseitig auf eigenes Konto und erlaubte Felder begrenzt.
Keine Schemaänderung und keine Änderungen an Beiträgen/Fortschritten. Bestehende
UI-/Lernsprachpräferenzen bleiben getrennt; keine neue redundante Spracheinstellung.
Prüfstatus unbewertet/Entwurf/geprüft/veraltet präzisiert, Spielstufen beschriftet
mit Einstieg/Mittel/Fortgeschritten und redaktionellen Kriterien. Normale Beiträge
und Spiele bleiben ohne Pflichtmoderation offen. Bestehende 20-Karten-Grenze bleibt.

Testkonto: Benutzer meldet manuelle Löschung bzw. erneut „branch not found“ in Neon.
Lesender SQL-Abgleich am 29. Oktober findet die bekannte UUID **noch einmal**.
Keine Löschung versucht. Daher nicht als nachweislich entfernt markieren.
Separates QA-Projekt erklärt; Benutzer hat ausdrücklich **Behalten** bestätigt.

190 Unit-Tests, Typprüfung, Lint, DE/EN-Abdeckung, Audit ohne Befund und Build
erfolgreich. Gezielte Desktop-/Mobilregression 22/22 einschließlich Profil,
Adminstatus und Sprach-/Stufenfiltern; zusätzliche Profil-noindex-Prüfung 4/4.
Doppelte Live-Region der statischen Statusanzeige korrigiert.
SEO-Liveprüfung umfasst 32 öffentliche Seiten und private noindex-Routen.
Wurzel-URL mit/ohne abschließenden Slash ist gleichwertig; Testnormalisierung korrigiert,
keine unbegründete Canonical-Änderung. Keine erneuten Google-Indexierungsanträge.
Google: 30 nicht indexierte Seiten gemeldet, Überprüfung bereits beantragt;
Detailgründe und Ergebnis nur in Search Console sichtbar, keine 30 technischen Fehler behaupten.

Code `c651aacea0d627ec5cdc66b2809a34a4e1f29456` auf GitHub main.
Beide CI-Läufe erfolgreich, einschließlich 190 Unit-/148 Desktop-/Mobilfällen
und echtem isoliertem Managed-Auth-Profilupdate:
- https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391881
- https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391814

Veröffentlicht auf bestehendem Worker:
**60a6599a-04c8-420d-bfdb-e45ff97e3971**.
Keine neue Datenbankmigration, Schema bleibt 026. Bestehende Secrets, Auth-Ziel,
Inhalte, Lernstände, Rechte, R2/AI, Rate-Limits, Google-Tag und Cron erhalten.

Live-Prüfung bestanden: alle 32 öffentlichen Seiten mit 200, konsistenten Canonicals,
passenden DE/EN-hreflang-Zielen, Titel/Beschreibung und ohne noindex; Sitemap und
robots korrekt. Profil, eigene Beiträge, Admin und Raumseite noindex und nicht in
Sitemap. Anonyme Profiländerung (auch kodierter Pfadalias) 401/no-store, anonyme
Managed-Auth-Sitzung 200/null; keine ungeprüften Spielstufen freigegeben.
Echte Profiländerung ausschließlich in isolierter QA geprüft (Identität erhalten),
Browserprüfungen mit kontrollierten HTTP-Antworten; keine produktiven Konten verändert.
Keine KI-Aufrufe und keine Google-Indexierungsanträge.

**Nächste Schritte ausschließlich extern:** Neon-Verwaltungsfehler beim eindeutig
identifizierten alten Testkonto klären (keine erneute Löschung versuchen), laufende
Search-Console-Überprüfung abwarten; autorisiertes QA-Postfach für echte OTP-Zustellung
bereitstellen und belegte redaktionelle Einstufungen erfassen. Keine erneute
Implementierung des Profils/Prüfsystems oder pauschale SEO-Änderungen beginnen.
Der folgende Abschnitt dokumentiert den vorherigen Release vom 28. Oktober.

## Auftrag – technisch umsetzbares Paket abgeschlossen

Restaufgaben gezielt abschließen, funktionierende Features und Produktionsdaten
bewahren. Feature-Branch `feature/editorial-qa-20261028`, Ausgangspunkt `28ad357`.
Nur `manuelk2607/Sprachwelten`; veröffentlichen ausschließlich mit
`npm run deploy:cloudflare` auf https://sprachwelten.maki26.workers.dev/.
Historie: [Archiv](docs/progress-archive-2026-10-27.md).

## Neu abgeschlossen

- Separates, leeres QA-Projekt `polished-wind-59150518`, Auth-Template
  `br-damp-glitter-baqvjq5l`. Projektspezifischer Schlüssel im GitHub-Environment
  `qa`, Produktionszugriff damit ausdrücklich verweigert. CI-Variablen aktiv.
  Maximal 0,25 CU, Quoten 1.800 Compute-/3.600 Aktivsekunden, 200 MiB.
  Keine Produktionsdaten/Benutzer exportiert; Template leer lassen.
- Erster **echter isolierter CI-Lauf erfolgreich**:
  https://github.com/manuelk2607/Sprachwelten/actions/runs/40728056912
  Migrationen, Lern-/Heft-/Spielpersistenz und Managed Auth einschließlich
  Registrierung, Passwortfehler, Sitzung, Abmeldung und Replay bestanden.
- Migration **026_editorial_difficulty.sql**: separate revisionsgebundene
  Einstufungen und Historie; Admin-Verwaltung mit Quellen, Datum, Begründung und
  ausdrücklicher fachlicher Freigabe. Parallele/veraltete Änderungen geschützt;
  Inhaltsänderung oder Widerruf invalidiert die Freigabe.
- Durchgängige optionale Spielstufen in Pool, Raum, Lobby und Startformular.
  Nur bei mindestens 20 aktuellen Fachfreigaben je Sprache/Kategorie/Stufe;
  SQL-Filter vor Stichprobe und Engine-Filter. Kategorie/Sprachwechsel löscht,
  reine Rundenzahländerung und direkte Folgepartie erhalten die Auswahl.
  CEFR separat; freie Wortketten/False Friends ohne irreführende Stufen.
  **Keine produktiven Fachfreigaben erzeugt.** Siehe
  [editorial-difficulty.md](docs/editorial-difficulty.md).
- Neue synthetische Integrationssuite in CI: 20-Karten-Grenze, Sprach-/Kategorie-
  trennung, echter Pool, Punkte/Folgepartie, konkurrierende Revisionen, Widerruf,
  Inhaltsänderung/Löschung und Historie. Eigene Fixtures werden bereinigt.
- Neue Auditbefunde: Better Auth auf zusammengehörige 1.7.14-Pakete, better-call
  1.4.4/better-fetch 1.3.3 und Mail-Renderer 2.2.0 aktualisiert; letzterer entfernt
  indirektes deepmerge. Keine Audit-Ausnahme. Installation, Typprüfung, Lint, 186 Unit-Tests, Übersetzungen, vollständiger Audit
  und Offline-Build erfolgreich; Browserfälle erfolgreich; vollständige CI 144/144.
  Nicht behaupten, dass damit Neons unabhängig verwalteter Auth-Dienst aktualisiert wurde.
- Veraltete regionale/QA-Notizen abgeglichen. Zwei Mehrspieler-Browsertests erhalten
  realistische Zeitgrenzen für vorhandene Wheel-/Polling-/Abstimmungsphasen.

## Verifikation dieses Pakets

- Isolierte QA `br-wandering-breeze-baxn3n3e` (automatischer Ablauf 28. Oktober,
  22:37 UTC): **alle 26 Migrationen**, echte Lern-/Heft-/Multiplayer-Suiten sowie
  redaktionelle Integrationssuite und echtes Managed Auth bestanden.
  Eigene Anwendungsfixtures bereinigt; synthetische Auth-Identität verbleibt nur
  bis Branchablauf. Keine regulären Konten, Adminrechte oder Produktionsdaten verändert.
- Vor abschließendem Abhängigkeitsupdate: 185 Unit-Tests bestanden; danach ein
  zusätzlicher Zielsprachen-/SQL-Test ergänzt. Typprüfung, Lint, DE/EN-Abdeckung
  und Offline-Build bestanden.
- Gesamtbrowserlauf: 142/144 bestanden; beide fehlgeschlagenen Mehrspielerfälle
  gezielt erneut erfolgreich (3/3), einschließlich Glücksrad, Wortkette und
  reduzierter Bewegung. Admin-Einstufung und Stufenauswahl DE/EN auf Desktop/Mobil
  bestanden. Kontrollierte HTTP-Antworten, keine echten KI-Aufrufe.
- Nach installiertem Abhängigkeitsupdate: Typprüfung, Lint, **186/186 Unit-Tests**,
  Übersetzungsabdeckung, vollständiger Audit ohne Befund und Offline-Build bestanden.
  Lokal Desktop/Mobil 143/144; ein Mobilfall durch parallele Build-/HMR-Neuladungen
  unterbrochen, anschließend separat 1/1 erfolgreich. Abschließende sequenzielle
  GitHub-CI vollständig erfolgreich: **144/144 Desktop-/Mobilfälle**.

## Veröffentlichung abgeschlossen

Code `13b4705b721c23f9217d7d4fd086bd43ea5f68bc` auf GitHub main.
Beide CI-Läufe erfolgreich:
- Checks: https://github.com/manuelk2607/Sprachwelten/actions/runs/40775570137
- Echte isolierte Integration: https://github.com/manuelk2607/Sprachwelten/actions/runs/40775570160

Produktionsziel `calm-tooth-60944868` / `br-delicate-field-b96d9qc4`,
`sprachspiel`. Migration **026** transaktional angewendet und protokolliert.
Vorher/nachher unverändert: **452 Beiträge, ein Administratorgrant, vier Auth-Konten,
24 Lernbeiträge**. Neue Einstufungs-/Historientabellen leer: keine Freigaben erzeugt.
Worker erfolgreich veröffentlicht: **a4fb5a83-7ebd-49b9-9965-b9437a9c2737**.
Bestehende Secrets, Auth-Ziel, R2, AI, Rate-Limits, Google-Tag und Cron erhalten.

Live bestätigt: DE/EN-Spiel-/Lernseiten 200; Sprachverfügbarkeit und versteckte
Stufen ohne Freigaben; echte anonyme Managed-Auth-Sitzung; Admin-/eigene Beiträge/
Hefte anonym 401; neue redaktionelle GET-/PUT-Route anonym 401. Erzwungene
unfreigegebene Stufe scheitert mit 422 vor Raumerstellung. Beide Vokabelrichtungen
weiterhin zehn Karten, `no-store`; Sitemap 32 öffentliche Seiten, robots 200.
Keine produktiven Testkonten, Beiträge, Hefte, Partien, Antwortabgaben oder KI-Aufrufe.
Echter Passwort-Login nur in QA geprüft, produktiver Passwort-Login/OTP nicht
als geprüft ausweisen. Vollständiges Live-Protokoll lokal:
`/private/tmp/sprachwelten-live-20261028.log`.

**Nächster konkreter Schritt:** autorisiertes erreichbares QA-Postfach für OTP
bereitstellen; die Abweichung beim alten Testkonto durch Neon klären. Danach fachliche Inhalte prüfen und ausreichend echte
Einstufungen erfassen. Keine erneute Grundlagenanalyse oder Kern-Neuimplementierung.

## Bereits vollständig vorhanden – nicht erneut implementieren

- Persönliche Vokabelhefte mit Verwaltung, Suche, Übungen, expliziten Sprachpaaren,
  kontrollierter Rückrichtung, konten-/richtungsgetrennter dauerhafter SRS und Statistik.
- Getrennte Lern-/Spielbeiträge, Grammatikmodule/Themenfilter, sprachspezifische
  Bewertung (auch Türkisch), gespeicherte akzeptierte Varianten, private Antworten.
- Mehrsprachenauswahl, Zungenbrecher-Glücksrad/Peer-Punkte, freie Wortketten mit
  Buchstabenprüfung und menschlicher Sinnbewertung; kein KI-Aufruf.
- Multiplayer-Replay-/Versionsschutz, Heartbeats, Hostwechsel und gleiche Räume
  für neue Spiele/Kategorien, keine Wiederverwendung bereits gespielter Karten.
- „Zur Spielesammlung“ führt DE/EN zur Spieleübersicht. Frühere Lern-/Layout-
  Verbesserungen und zwei zusätzliche A1-Grammatikmodule bereits veröffentlicht.
- SEO 32 öffentliche Beschreibungsseiten, private Bereiche noindex und nicht in
  Sitemap. Frühere vollständige CI: 183 Unit-/140 Browserfälle erfolgreich.

## Verbleibende externe Aufgaben / Grenzen

| Prio | Aufgabe | Nächster Schritt |
| --- | --- | --- |
| P1 | Altes QA-Konto `d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7`: Benutzer meldet manuelle Löschung, Konsole meldet weiterhin „branch not found“. Lesender Abgleich 29. Oktober findet noch einen Auth-Datensatz. Keine erneute Löschung versucht. | Abweichung durch Neon prüfen lassen; Löschung noch nicht unabhängig bestätigt. |
| P1 | Echte OTP-Zustellung, Bestätigung und Ablauf ungetestet. Isoliertes Managed Auth funktioniert jetzt; frühere QA-Provisionierungsblockade ist erledigt. | Autorisiertes erreichbares Testpostfach bereitstellen; synthetische `.invalid`-Adressen ersetzen keinen Zustellungstest. Keine neuen Mailanbieter automatisch beauftragen. |
| P2 | Sechs Dialektkarten quellengeprüft, weiterhin `needsSpecialistReview`; noch keine ausreichenden fachlichen Spielstufensammlungen. | Sprachwissenschaftliche Freigabe und begründete Einstufungen beschaffen. Technische Verwaltung ist implementiert, keine Freigaben erfinden. |
| P3 | Search Console eingerichtet; Indexierungsstatus extern. | Im eigenen Google-Konto prüfen, keine wiederholten Indexierungsanfragen automatisieren. |

Keine bestätigte P0-Anwendungsstörung. Neue Auditbefunde sind behoben, vollständiger Audit ohne Ausnahme bestanden.
Weitere Skalierungsumbauten nur bei gemessenem Engpass. Sprachraum bleibt außerhalb.

## Music-Worlds cutover — 04.11.2026
Music-Worlds als getrennte Plattform produktiv eingerichtet und echt geprüft. Alle acht Source-Songrows read-only archiviert, SHA-256/QA-Restore sowie erneuter unveränderter Rowvergleich bestätigt. Ziel erhält alle Original-IDs: vier historische englische Textfragen mit individueller Gemeinfreiheitsprüfung, vier französische privat in Rechteprüfung; keine Audioübernahme. Neue Source-Auswahl/Beiträge/Pools/Sammlung wechseln zu Personenzitaten, gespeicherte Schema-/Engine- und Altbearbeitungskompatibilität bleibt erhalten. Keine Source-Rows gelöscht. Minimatch 11.0.1 beseitigt eine bestehende Auditmeldung. Nach korrigierter abschließender Diffprüfung: 196 Unit-Tests, Typprüfung, Lint, Übersetzungen, vollständiger Audit und Produktions-Build erfolgreich. Cutover-Commit a31f1177b19e98fef3763feff062bc2979c19edd wurde auf main gepusht und unter https://sprachwelten.maki26.workers.dev/ bereitgestellt (Cloudflare-Version 9e742f1a-b875-455e-9852-de77f1a0320a). Live geprüft: Homepage, alte öffentliche Songfrage 410, neue Songräume und Songbeiträge 410, Liedtextsuche leer, bisherige Mischanfrage startet Personenrunde, Zungenbrecher-Mischauswahl weiter funktionsfähig. Alle acht Source-Songrows nach Veröffentlichung nochmals exakt mit dem Archiv verglichen: unverändert. Music-Worlds ist unter der verbindlichen eigenen Adresse produktiv; der separate Test-/Deployworkflow wurde erfolgreich ausgeführt. Details docs/music-worlds-transfer.md. Keine weiteren Source-Laufzeitänderungen erforderlich.
