# Sprachwelten – Fortsetzungsstand, 28. Oktober 2026

## Aktueller Auftrag

Restaufgaben gezielt abschließen, funktionierende Features und Produktionsdaten
bewahren. Feature-Branch `feature/editorial-qa-20261028`, Ausgangspunkt `28ad357`.
Nur `manuelk2607/Sprachwelten`; veröffentlichen ausschließlich mit
`npm run deploy:cloudflare` auf https://sprachwelten.maki26.workers.dev/.
Historie: [Archiv](docs/progress-archive-2026-10-27.md).

## Neu implementiert – abschließende Freigabeprüfung läuft

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
  und Offline-Build erfolgreich; Browserfälle erfolgreich nach gezielten Wiederholungen.
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
  Gesamt Desktop/Mobil 143/144; ein Mobilfall durch gleichzeitige Build-/HMR-
  Neuladungen unterbrochen, danach separat 1/1 erfolgreich. Künftige vollständige
  CI führt Build und Browser sequenziell aus; deren Ergebnis noch abwarten.

## Veröffentlichung noch offen

Produktion bestätigt: `calm-tooth-60944868` / `br-delicate-field-b96d9qc4`,
Datenbank `sprachspiel`, Migration **025**, **24 Lernbeiträge**. Tabellen 026 fehlen.
Aktiver vorheriger Code `67d07216736cfa9d71521153d652cc3d80bb6719`,
Worker `5168180b-d783-42c5-ac04-21873604cae2`. Noch keine produktive Migration 026.

**Nächster konkreter Schritt:** lokale Prüfungen abgeschlossen, Commit und CI,
dann versionierte Migration 026
auf bestätigtem Produktionsziel, bestehender Deploymentweg und Live-Prüfung.
Bestehende Secrets, Auth, R2, AI, Rate-Limits, Google-Tag und Cron erhalten.

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
| P1 | Altes temporäres Produktions-QA-Konto `d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7`, „QA Sprachwelten – temporärer Integrationstest“: am 28. Oktober erneut eindeutig bestätigt, null Beiträge/Adminrechte. Reguläres Neon-Löschen weiterhin HTTP 404 „branch not found“. | In Neon Auth ausschließlich diese UUID manuell löschen. Keine SQL-Umgehung oder neuen Produktions-Testkonten. |
| P1 | Echte OTP-Zustellung, Bestätigung und Ablauf ungetestet. Isoliertes Managed Auth funktioniert jetzt; frühere QA-Provisionierungsblockade ist erledigt. | Autorisiertes erreichbares Testpostfach bereitstellen; synthetische `.invalid`-Adressen ersetzen keinen Zustellungstest. Keine neuen Mailanbieter automatisch beauftragen. |
| P2 | Sechs Dialektkarten quellengeprüft, weiterhin `needsSpecialistReview`; noch keine ausreichenden fachlichen Spielstufensammlungen. | Sprachwissenschaftliche Freigabe und begründete Einstufungen beschaffen. Technische Verwaltung ist implementiert, keine Freigaben erfinden. |
| P3 | Search Console eingerichtet; Indexierungsstatus extern. | Im eigenen Google-Konto prüfen, keine wiederholten Indexierungsanfragen automatisieren. |

Keine bestätigte P0-Anwendungsstörung. Neue Auditbefunde vor Veröffentlichung beheben.
Weitere Skalierungsumbauten nur bei gemessenem Engpass. Sprachraum bleibt außerhalb.
