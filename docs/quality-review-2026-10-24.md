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

## Fortsetzung am 25. Oktober 2026

Ausgangsstand `31c9065`; die bereits abgeschlossenen Pakete wurden beibehalten.

- **P0:** Ein separater echter HTTPS-Integrationstest prüft Login, Sitzungswiederherstellung,
  geschützte Zugriffe, Herkunftsprüfung und Abmeldung samt Cookie-Replay. Zugangsdaten
  und Cookies bleiben lokal bzw. ausschließlich im Arbeitsspeicher. Der optionale KI-Teil
  ist auf zwei neue DE↔EN-Anfragen und zwei Cache-Wiederholungen begrenzt, höchstens
  vier Modellaufrufe und insgesamt unter 500 Quellzeichen. Keine neuen Konten, Rechte
  oder Beiträge. Anleitung: [live-auth-ai-tests.md](live-auth-ai-tests.md).
- **Echte Produktionsprüfung bisher:** anonyme Sitzung, eigene Beiträge/Admin-Nutzerliste
  ohne Sitzung gesperrt, gefälschte Sitzungscookies zurückgewiesen, KI-Zugriff ohne
  Anmeldung gesperrt. **Passwort-Login, Wiederherstellung/Abmeldung, normale Mitgliedsrechte
  und echte Workers-AI-Ausgaben weiterhin nicht ausgeführt:** Die gewählte lokale Datei
  `.env.auth-test.local` mit Testzugangsdaten liegt noch nicht vor. Die Kostenfreigabe
  allein ersetzt keine authentifizierte Testsitzung. Es wurden keine Modellaufrufe verbraucht.
- **KI-Fehlerfälle:** Eine nachweislich hängende Providerantwort wird nun nach einem
  gemeinsamen 15-Sekunden-Zeitbudget mit einer verständlichen, wiederholbaren Fehlermeldung
  beendet. Weitere Textteile werden nicht angefordert; Teilübersetzungen werden nicht
  als vollständiger Vorschlag übernommen. Bereits gesendete Provideraufrufe können dort
  weiterlaufen und werden nicht automatisch wiederholt oder als kostenlos zurückgebucht.
- **P1 Lernrückblick:** Audioquizze und Satzbauaufgaben werden nach ihrer Auflösung
  aufgenommen. Audio wird nur mit bereits freigegebener Aufnahme-ID und ohne erfundenen
  Transkripttext eingebunden; kein Vorladen. Satzbau zeigt die eigene Abgabe und eine
  gültige Übersetzung; eine akzeptierte alternative Wortfolge bleibt korrekt.
  Zehn Aufgaben/24 Stunden, derselbe Spieler-/Partieschlüssel und reine Tab-Speicherung
  bleiben erhalten. Unbeantwortete/verdeckte Aufgaben werden nicht erfasst.
- **P1 Inhalte:** Sechs regionale Startkarten mit Wörterbuch-/Fachquellen eingeordnet,
  Herkunft von Nutzungsgebiet getrennt, regionale Varianten erläutert und als noch
  fachlich zu prüfen markiert. Direkte Quellenlinks werden bei unveränderten Startkarten
  ergänzt. Spätere Bearbeitungen und gespeicherte Daten bleiben erhalten. Zu „Bemme“
  drei sachlich näherliegende falsche Bedeutungen aus demselben Brot-Wortfeld erstellt.
  Quellen, Einschränkungen und offene Fachprüfung: [regional-content-review.md](regional-content-review.md).
- **P2 vorbereitet:** Getestete redaktionelle Freigabeprüfung für Schwierigkeitsstufen;
  mindestens 20 unterschiedliche geprüfte Karten pro Stufe/Kategorie/Originalsprache,
  jeweils Quellen, Datum und Begründung. Noch keine solchen Einstufungen vorhanden,
  daher kein sichtbarer Filter und keine automatische Klassifikation. Spielpool und
  Speicherung werden erst nach tatsächlicher redaktioneller Freigabe erweitert.

Verifikation: **155 Unit-Tests**, Typprüfung, Lint, Übersetzungsabdeckung,
Abhängigkeitsaudit und Produktions-Build bestanden. Im vollständigen Desktop-/Mobil-Lauf
bestanden **117/118** Fälle. Ein bestehender Desktopfall zur Bearbeitung alter Antworten
hatte eine Zeitüberschreitung; die gezielte Wiederholung desselben Falls bestand auf
Desktop und Mobil (**2/2**). Alle vier neuen Rückblickfälle bestanden im Gesamtlauf.
Die UI- und Providerfehler-Tests sind weiterhin kontrollierte Fixtures; echte Tests
werden oben gesondert ausgewiesen. Keine Datenbank-/Auth-Implementierung geändert,
keine Produktionsmigration oder SQL-Integration gegen die Produktionsdatenbank.

Offen bleiben: Testzugangsdaten und damit echte positive Auth-/KI-Prüfungen, regionale
Fachbegutachtung weiterer Community-Inhalte und belastbar eingestufte Aufgabensammlungen.
Peer-bewertete Aussprache und kooperative Spiele erhalten weiterhin keine vorgetäuschte
Richtig/Falsch-Lernstatistik. Veröffentlichungsstand siehe `PROGRESS.md`.
