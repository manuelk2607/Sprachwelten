# Sprachwelten: Qualitätsrunde 2026-10-24

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

Nächster Schritt: Tastaturbedienung/Barrierefreiheit und ein Lernrückblick auf tatsächlich
aufgelöste Quizfragen. Anschließend Performance-/Validierungskontrolle.

Verifikation: Typprüfung, Lint, Übersetzungsabdeckung und 22 gezielte Desktop-/Mobiltests bestanden.
Kontingent-Zwischenstand: 22 % genutzt (Start 2 %).
Blocker: keine.
