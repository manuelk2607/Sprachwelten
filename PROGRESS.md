# Sprachwelten – Fortsetzungsstand, 29. Oktober 2026

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
