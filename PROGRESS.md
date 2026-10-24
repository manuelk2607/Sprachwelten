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

Nächster Schritt: GitHub und Veröffentlichung mit Live-Prüfung. `.clinerules` ist
inhaltlich mit der Datei aus dem Original-Checkout abgeglichen und liegt zum Commit bereit.

Verifikation: 149 Unit-Tests, Typprüfung, Lint, Übersetzungsabdeckung, Audit und
Produktions-Build bestanden. Auch mit den finalen Sicherheitsupdates sind alle
114 vollständigen Desktop-/Mobil-Browserprüfungen bestanden.
Kontingent-Zwischenstand: 46 % genutzt (Start 2 %); keine weiteren Pakete,
nur Veröffentlichung und Abschlussprüfung.
Blocker: keine.
