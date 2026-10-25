# Sprachwelten: Qualitätsrunde 2026-10-24

## Fortsetzung 25. Oktober 2026

Ausgangspunkt `31c9065`, sauberer Feature-Branch. Gezielte Pakete statt Gesamtaudit:
1. Echte Auth-/Berechtigungsprüfungen und begrenzter, ausdrücklich freigegebener AI-Test;
   keine Testkontenrechte oder Datenbankänderungen. Lokale Testzugangsdaten stehen noch aus.
2. Persönlichen Rückblick um Audioquizze und Satzbau ergänzen, verdeckte Lösungen schützen.
3. Regionale Quellenprüfung und redaktionelle Voraussetzungen für Schwierigkeitsstufen.
4. Relevante Regressionen, Gesamtchecks, Commit und Veröffentlichung bei bestandenen Prüfungen.

Startkontingent laut kontoweiter Anzeige: 40 % des Fünf-Stunden-Fensters verbraucht.
AI-Freigabe: höchstens vier Anfragen, insgesamt maximal 500 Quellzeichen.

Pakete abgeschlossen: Audioquiz-/Satzbau-Rückblick, begrenzte AI-Wartezeit,
echter HTTPS-Auth-/AI-Testlauf vorbereitet, sechs regionale Quellenkontexte,
redaktionelle Voraussetzungen für Schwierigkeitsstufen. Keine Datenbankänderungen.
Echte anonyme Produktions-Gates bestanden; positive Anmeldung/AI bleibt ohne lokale
Testzugangsdaten offen. Keine KI-Kosten verursacht. Details im aktualisierten Bericht.

Geprüft: 155 Unit-Tests, Typprüfung, Lint, Übersetzungen, Audit, Produktions-Build.
Browser: 117/118 im Gesamtlauf; ein zeitüberschrittener bestehender Desktopfall
bestand gezielt wiederholt auf Desktop und Mobil (2/2). Neue Rückblickfälle bestanden.
Bei 79 % kontoweiter Nutzung keine weiteren Pakete begonnen; Abschluss/Veröffentlichung folgt.

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
