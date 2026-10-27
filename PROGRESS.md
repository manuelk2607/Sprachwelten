# Sprachwelten – aktueller Stand, 27. Oktober 2026

## Auftrag und Ausgangspunkt

Gezielte Restaufgaben und zusätzliche Qualitätsverbesserungen, Ausgangspunkt
`7a46f24`, Feature-Branch `feature/quality-followup-20261027`. Bestehende Nutzer,
Beiträge, Rechte und Spielstände erhalten. Veröffentlichung ausschließlich auf
https://sprachwelten.maki26.workers.dev/ über `npm run deploy:cloudflare`.
Historische Meilensteine/Tests stehen unverändert im
[Archiv](docs/progress-archive-2026-10-27.md); alte Zwischenstände sind keine offenen Aufträge.

## Abgeschlossen

- Persönliche Vokabelhefte, explizite Sprachpaare mit kontrollierter Rückrichtung,
  Schreibübungen, Karteikarten und dauerhafter richtungs-/kontogetrennter SRS sind
  bereits veröffentlicht. Spiel-/Lernbeiträge, eigene Verwaltung und Moderation
  sind getrennt; keine erneute Implementierung beginnen.
- Mehrsprachige Spielauswahl, Zungenbrecher-Glücksrad, freie Wortketten mit
  serverseitiger Buchstaben-/Peer-Sinnprüfung, faire Punkte, Hostwechsel,
  Multiplayer-Replay-/Versionsschutz und Rematches bereits veröffentlicht.
- „Zur Spielesammlung“ führt jetzt zu `/#spiele` bzw. `/en#spiele`, statt zur
  Antwortsammlung im Lernbereich. DE/EN-Regression auf Desktop und Mobil.
- Grammatikfilter zeigen ausschließlich passende Grammatikthemen. Automatische
  Antwortsprache folgt der tatsächlichen Lernsprache, nicht der UI (z. B. I/İ im
  Türkischen). Eingabefelder erhalten passende Sprachangaben; ältere Lückentext-
  Übersetzungen ohne Lücke verwenden die gültige, gespeicherte Aufgabenfassung.
- Zwei zusätzliche quellengeprüfte A1-Grammatikmodule mit acht selbst formulierten
  Aufgaben: englisches be und deutsches sein/haben. Gültige Kurzformen sind
  ausdrücklich hinterlegt. Seed ergänzt nur neue Inhalte; nichts wird überschrieben.
- QA-Orchestrierung mit Produktions-/Host-/Auth-Guards und drei realen Repository-
  Suiten. Optionaler Workflow für ein separates QA-Projekt mit leerem Auth-Template,
  Ablauf nach einer Stunde, keine fremden PRs/Produktionszugänge. Einrichtung und
  Einschränkungen: [isolated-integration.md](docs/isolated-integration.md).
- Historische Migrationsfixtures sind bei normalen Repositorytests optional;
  fehlende Fixtures werden ausdrücklich als nicht geprüft statt bestanden gemeldet.
- Sicherheitsprüfung ohne Ausnahmen: GitHub hat GHSA-vfj7-8cjw-p6xm am 23. Oktober
  zurückgezogen; aktueller vollständiger Audit ohne Befund. Neue/wiederkehrende
  Tooling- und Runtime-Befunde blockieren gleichermaßen. Siehe [security.md](docs/security.md).
- Redaktionelle Bereitschaftsprüfung verwirft ungültige Kalenderdaten, widersprüchliche
  gleichzeitige Einstufungen und neuere zurückgezogene Freigaben. Keine willkürlichen
  Spiel-Schwierigkeitsstufen aktiviert.
- README, historische Spielideen-/Performance-Notizen und SEO-Seitenzahl aktualisiert;
  öffentliche Sitemap enthält 32 Seiten. Historie ausgelagert, aktueller Arbeitsvorrat kompakt.

## Verifikation

183/183 Unit-Tests, 140/140 vollständige Desktop-/Mobilfälle sowie 16/16 gezielte
Lernfälle bestanden. Typprüfung, Lint, Übersetzungsabdeckung, vollständiges Audit
und Produktions-Build erfolgreich. Ein alter lokaler Kaltstart überschritt die
Serverfrist; expliziter Offline-Server und Sitzungsbereitschaft beseitigten die
Test-Startprobleme, ohne Anwendungsfehler zu verdecken.

Echte isolierte PostgreSQL-Prüfungen bestanden: Lern-/Heft-/Kontentrennung,
Sprachrichtungen, neue Grammatikmaterialien, Themenfilter, türkische Normalisierung,
SRS, parallele Abgaben/Verschiebungen, Kartenaufdeckung, Mitgliedschaftsentzug,
Glücksrad/Peer-Punkte/Wortketten, Versionsschutz, Heartbeats und Hostwechsel.
Eigene erzeugte Daten/Räume bereinigt. Ziel `br-odd-king-b90o8w3l`, Host
`ep-withered-sky-b936cqzb.c-7.eu-central-1.aws.neon.tech`, Ablauf 27. Oktober 20:00 UTC.
Browserprüfungen verwenden kontrollierte HTTP-Antworten; keine echten KI-Aufrufe.
QA-Managed-Auth/OTP ausdrücklich nicht als bestanden ausweisen.

## Veröffentlichung – laufender Abschluss

Alle Codeprüfungen bestanden. Produktionsziel `sprachspiel`/Migration 025 bestätigt;
vor Ergänzung 22 Lernbeiträge, beide neuen IDs noch frei. Keine neue Schema-
Migration nötig. Nächster Schritt: geprüften Code committen, ausschließlich zwei
neue Grammatikmodule idempotent ergänzen, bestehenden Worker veröffentlichen und
öffentliche Lern-/SEO-/Zugriffsschutz-Endpunkte live prüfen. Dann Commit/Worker-Version
hier nachtragen. Vorherige stabile Version: `3dac8c16-bbd4-48a2-96a8-a3f29efb60a2`.

## Verbleibend und extern blockiert

| Prio | Aufgabe / tatsächlicher Stand | Nächster konkreter Schritt |
| --- | --- | --- |
| P1 | Altes temporäres QA-Konto: UUID `d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7`, Name „QA Sprachwelten – temporärer Integrationstest“, null Beiträge/Adminrechte erneut bestätigt. Reguläre Löschung meldet weiterhin `branch not found`. | In Neon Auth ausschließlich diese UUID manuell löschen. Keine SQL-Umgehung oder weiteren Produktions-Testkonten. |
| P1 | Isolierte CI implementiert, aber noch nicht extern ausgeführt/aktiviert. Keine QA-Projektvariablen/Secrets vorhanden. | Separates leeres QA-Projekt/Auth-Template und projektspezifischen Schlüssel gemäß Anleitung einrichten; Workflow danach ausführen. Normale CI bleibt aktiv. |
| P1 | OTP-Zustellung, echte Codebestätigung und Ablauf nicht geprüft. Schema-only-QA enthält zwar Auth-Struktur, aber keinen Dienst; reguläre Provisionierung scheitert mit 409 wegen bestehendem Schema. | Autorisiertes erreichbares Testpostfach und leeres QA-Auth-Template bereitstellen; keine Schemata löschen, keine Postfachanbieter automatisch beauftragen. |
| P2 | Sechs Dialektkarten sind quellengeprüft, weiterhin `needsSpecialistReview`. Keine fachliche Zertifizierung erfinden. | Herkunft/Gebrauch/Bedeutungsvarianten und plausible falsche Antworten fachlich freigeben; siehe regionalen Prüfbericht. |
| P2 | Spiel-Schwierigkeitsgrade: sichere Bereitschaftsprüfung vorhanden, noch keine gespeicherte redaktionelle Verwaltung oder Pool-/Raum-/UI-Auswahl. | Erst belastbare Einstufungen und mindestens 20 geprüfte Karten je Sprache/Kategorie/Stufe beschaffen, dann Speicherung und durchgängige Filter/Rematches umsetzen. CEFR-Lernniveaus bleiben separat. |
| P3 | Search Console ist eingerichtet, technisches SEO funktioniert. Indexierungsstatus ist extern. | Im eigenen Google-Konto prüfen; keine wiederholten automatischen Indexierungsanfragen. |

Keine bestätigte P0-Störung. Weitere Skalierungsumbauten nur bei gemessenem
Produktionsengpass. Sprachraum bleibt ausdrücklich außerhalb des Umfangs.
Nach Abschluss der Veröffentlichung ist der nächste sinnvolle Schritt die QA-
Einrichtung bzw. redaktionelle Freigabe, keine Wiederholung abgeschlossener Kernfeatures.
