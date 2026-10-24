# Qualitätsrunde 24. Oktober 2026

Ausgangsstand: `8f41238`. Die bestehende CI war erfolgreich. Priorisiert wurden
nachgewiesener Datenverlust, unnötige Browserlast und Bedienungsfehler vor neuen
Spielvarianten oder zusätzlichen Einstellungen.

## Umgesetzt

- Wiederhergestellte Beitragsentwürfe behalten ihre Erklärungssprache und die
  Zuordnung beider Sprachfassungen. Legacy-Beiträge ohne Sprachkennzeichnung
  werden beim Bearbeiten weiterhin als deutsche Quellen behandelt.
- Die Formularsprache wird beim Öffnen aus der UI-Präferenz übernommen und während
  der Bearbeitung nicht stillschweigend verändert. Nach einer veröffentlichten
  Ergänzung wird die aktuelle Präferenz für den nächsten Text übernommen.
- Alle Erklärungsvorschläge nutzen eine bearbeitbare Vorschau und ausdrückliche
  Übernahme. Nur die angeforderten Felder werden ersetzt. Eine getrennte
  Tippübersetzung bleibt erhalten; eine Änderung eines Ausgangsfeldes verwirft
  nur dessen Übersetzung. Späte Antworten nach Änderungen des Zieltextes, der
  Quelle, des Bearbeitungskontexts oder des Kontos werden nicht übernommen.
- Die Übersetzungsantwort wird vor der Vorschau validiert. Fehlende bzw.
  überlange Ergebnisse können keine bestehenden Fassungen überschreiben.
  Die allgemeine Sprachprüfung wird durch die Vorschlagsannahme nicht vorweggenommen.
- Auswahllisten fokussieren die Liste oder das Suchfeld und verknüpfen die aktive
  Option für Screenreader. Tab/Shift+Tab verlassen das Menü; Escape kehrt zum
  Auslöser zurück. Der aktive Eintrag bleibt per Tastatur erreichbar.
- DE/EN und Dark Mode funktionieren auch bei gesperrtem Browser-Speicher.
  CSS-Animationen und Übergänge berücksichtigen reduzierte Bewegung.
- Quizpartien haben einen persönlichen Lernrückblick mit Fehlerfilter,
  korrekten Antworten und Erklärungen. Erfasst werden nur selbst beantwortete,
  bereits aufgelöste Textaufgaben. Die Speicherung erfolgt pro Partie und
  Spieler im aktuellen Browser-Tab, maximal zehn Aufgaben und 24 Stunden.
  Sie verändert keine Punkte, gibt keine zukünftigen Lösungen preis und bleibt
  nach dem Neuladen erhalten. Eine neue Partie erhält einen eigenen Rückblick.
- Die gemeinsame Fehlerklasse importiert nicht länger die gesamte Spielengine.
  Im gleichen Produktions-Build schrumpfte der gemeinsame Meldebaustein von
  638.839 auf 390 Byte ungepackt. Das ist die Größe dieses Bausteins, keine
  pauschale Zusage über die Gesamtladezeit jeder Verbindung.
- Quizantworten werden für Dublettenprüfungen Unicode-/Leerraum-normalisiert.
  Inhaltlich relevante Zeichen wie in `C#` und `C++` bleiben verschieden.
  Fehler nennen die konkrete Antwort und Sprachfassung, damit das Formular
  direkt zum passenden Eingabefeld springen kann.
- Die vorhandene `.clinerules` aus dem Original-Checkout wird versioniert.
- Das aktuelle Audit erkannte zusätzliche Lücken in Zod, Undici und fast-uri.
  Sie wurden mit kompatiblen Sicherheitsupdates behoben (4.6.6, 7.30.1, 3.1.9),
  einschließlich der bisher festgepinnten transitiven Kopien. Die vorhandene
  Audit-Ausnahme wurde nicht erweitert.

## Verifikation

Pro Paket wurden Typprüfung, Lint, Übersetzungsabdeckung sowie gezielte Tests
ausgeführt. Die Schlussprüfung umfasst Unit-Tests, vollständige Desktop-/Mobil-
Regressionen, Abhängigkeitsaudit, Produktions-Build und öffentliche Live-Prüfungen.
Ergebnis: 149 Unit-Tests, 114 Desktop-/Mobil-Browserprüfungen und alle übrigen
Checks bestanden; GitHub-CI ebenfalls erfolgreich. Die Live-Prüfung umfasst 30
öffentliche Seiten, SEO-Endpunkte, private Zugriffsschranken und den Beitragsdialog
auf Desktop/Mobil. Veröffentlichungskennung und Kontingentstatus stehen in `PROGRESS.md`.

Keine Datenbankmigration, Produktionsdatenänderung oder neue Berechtigung war
für diese Pakete erforderlich. Die bestehende exakt begrenzte `braces`-
Audit-Ausnahme bleibt dokumentiert; siehe [security.md](security.md).

## Nächste sinnvolle Aufgaben

1. Regionale Inhalte mit Quellen manuell kuratieren: Nutzungsgebiet,
   Bedeutungsvarianten und plausible falsche Antworten gemeinsam prüfen.
   Automatische Strukturvalidierung ersetzt keine sprachwissenschaftliche Prüfung.
2. Schwierigkeitsgrade erst mit redaktionell belegten Einstufungen und genügend
   Karten je Kategorie anbieten. Eine aus Textlänge abgeleitete Stufe wäre irreführend.
3. Den Lernrückblick bei Bedarf um Audio- und Satzbauaufgaben erweitern. Er erhält
   absichtlich keine geschriebenen Lösungen zu nicht veröffentlichten Audiovorgaben.
4. Echte Anmeldung und Workers-AI-Ausgaben separat kontrollieren. Die automatischen
   Browserprüfungen verwenden isolierte Fixtures und simulierte Übersetzungsantworten.
