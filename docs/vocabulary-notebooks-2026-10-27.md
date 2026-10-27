# Vokabelhefte und Sprachrichtungen

## Modell und bestehende Daten

Vokabeln bleiben öffentliche Lernbeiträge in `content_entries`. Unter
`challenge.vocabulary` wird die Sprache von `literal` ausdrücklich gespeichert;
`entry.language` bezeichnet die Sprache von `phrase`. Beide Sprachen sind
unabhängig von der DE/EN-Oberfläche und der Erklärungssprache. Weitere richtige
Formen beider Seiten, Kontext und ein Beispiel in der Übersetzungssprache werden
separat gespeichert. Rückwärtsübungen erfordern `reversible=true`; diese Freigabe
ist eine redaktionelle Aussage zur konkreten Bedeutung, keine automatische
Annahme über ein Wörterbuchwort. Schreibweisen werden nach der Antwortsprache
normalisiert; Akzente und unterschiedliche Schriftsysteme bleiben erhalten.

Ein Vokabelheft gehört genau einer serverseitig angemeldeten Person. Es enthält
Referenzen auf Vokabeln, keine Inhaltskopien. Dieselbe Vokabel darf in mehreren
Heften liegen. Sprachpaare eines befüllten Hefts sind fest, Name/Beschreibung
bleiben bearbeitbar. Verschieben ist atomar und schützt beide Hefte mit
Revisionen. Fremde Hefte sind weder lesbar noch beschreibbar. Löschen eines Hefts
entfernt seine Zuordnungen und temporären Übungen, nicht Vokabeln oder Lernstände.
Entfernte oder nicht mehr passende Beiträge werden als nicht verfügbar erkannt;
ihre Heftzuordnungen lassen sich ausdrücklich bereinigen. Öffentliche Quellen,
explizite Credits und die vorhandenen Bearbeitungs-/Vorschlagsrechte sind über
die Wortkarte erreichbar; interne Autorennamen bleiben privat.
Grenzen: 50 Hefte pro Konto, 1.000 Zuordnungen pro Heft, 100 Wörter pro Sammelaktion,
30 sichtbare Wörter pro Seite. Die normale Bestandsverwaltung bleibt getrennt.

Migration 025 erhält vorhandene IDs und Inhalte. Nur die bekannten, unveränderten
Startkarten mit Revision 0 werden ausdrücklich bestätigt. Die bisherigen deutschen
Gegenkarten erhalten einen Verweis auf das kanonische Paar; ihre Inhalte bleiben
gespeichert. Bereits vorhandene gültige Lernstände werden zusätzlich in die
passende Richtung übernommen, ohne die ursprünglichen Zeilen zu entfernen.
Bearbeitete oder unbekannte Altkarten werden nicht anhand der UI-Sprache geraten.
Sie bleiben in eigener Verwaltung/Administration bearbeitbar und benötigen eine
ausdrückliche Sprachbestätigung. Ein Datenbankindex verhindert neue umgekehrte
Duplikate derselben bestätigten Bedeutung, auch bei parallelen Einreichungen.

Neue Installationen verwenden `canonicalLearningSeeds`: zehn bestätigte Paare und
die zwei ursprünglichen Grammatikmodule. `seed-learning.mts` ergänzt außerdem zwei
weitere quellengeprüfte Module aus `additionalGrammarSeeds` (be sowie sein/haben,
je vier Aufgaben); der historische Export bleibt als Migrationsfixture erhalten.
Der Seed-Befehl überschreibt weiterhin keine existierenden Beiträge.

## Oberfläche und Beiträge

Der Lernbereich bietet Ausgangs-/Zielsprache, einen Richtungswechsel sowie getrennte
Bereiche für Vokabeln/Hefte und Grammatik. Hefte können angelegt, umbenannt und
bestätigt gelöscht werden. Wörter lassen sich suchen, nach Thema, Niveau und
Lernstatus filtern, sortieren, auswählen, übernehmen, entfernen oder verschieben.
Grammatik wird nach der Zielsprache ausgewählt. Gespeicherte Sprachpräferenzen
enthalten keine Kontodaten; private Daten und Auswahlzustände sind kontogebunden.

Spielbeiträge und Lernbeiträge verwenden gemeinsame sichere Feldkomponenten,
aber getrennte Formulare, Einreichungsrouten und eigene Übersichten. Der Lerneditor
bietet keine Spielarten; die Spielesammlung zeigt keine Vokabel-/Grammatikbeiträge.
Die Administration und bestehende Bearbeitungs-/Vorschlagsrechte bleiben erhalten.
Die Wortpaarübersetzung und native Beispielsätze werden nicht als bloße
Oberflächentexte automatisch umübersetzt.
Ein ausdrücklich wiederhergestellter Entwurf öffnet den zu seiner Beitragsart
gehörenden Formularbereich und verwendet dessen Einreichungsroute, auch wenn
der Entwurf im jeweils anderen Hauptbereich wiederhergestellt wurde.

## Üben und Fortschritt

Geübt werden vollständige Hefte bzw. Bestandsfilter oder ausdrücklich ausgewählte
Wörter, vorwärts, rückwärts oder gemischt. Die Auswahl bleibt beim nächsten Wort
erhalten. Rückwärtsrichtung verwendet nur freigegebene Paare. Karteikarten müssen
vor einer Selbsteinschätzung serverseitig aufgedeckt werden; Schreibübungen erlauben
keine solche Selbsteinschätzung. Fehler zeigen gültige Antworten und vorhandene
Kontexte/Beispiele. Die Aufgabe und die Auswertung verwenden dieselbe gespeicherte
Inhaltsrevision. Gelöschte oder inzwischen entfernte Heftzuordnungen sperren alte
Versuche. Pro Versuch kann höchstens eine Bewertung gespeichert werden.

Fortschritt liegt in `learning_progress`, getrennt nach Konto, kanonischer Vokabel
und Zielrichtung (`vocab-<Sprachcode>`). Hefte teilen diesen persönlichen Lernstand;
Vorwärts- und Rückwärtsrichtung teilen ihn nicht. Erfolgsserie, Fehlerzahl,
Versuche und Fälligkeit bleiben dauerhaft gespeichert. Nach Erfolgen gelten die
vorhandenen Intervalle 1/3/7/14/30/60/120/180 Tage; Fehler führen nach zehn Minuten
zur Wiederholung. Schwierige Wörter sind solche mit Fehlern und einer Erfolgsserie
unter drei. Heftstatistiken nennen ihre Hauptrichtung ausdrücklich. Gäste können
den öffentlichen Bestand üben, erhalten aber keine privaten Hefte oder dauerhaften
Lernstände. Antworten werden nicht als Freitext gespeichert.

## Verifikation und Betrieb

`npm run test:notebooks-integration` verlangt eine explizit isolierte direkte
Datenbank und verweigert den Produktionshost/-branch. Es prüft echte PostgreSQL-
Persistenz, Migration alter Lernstände, Kontentrennung, CRUD/Verschieben,
Sprachrichtung, umgekehrte Eindeutigkeit, parallele Bewertungen, Kartenaufdeckung,
Entzug einer Heftzuordnung und den Erhalt von Lernständen beim Heftlöschen.
Temporäre Testhefte und Vokabeln werden bereinigt. Historische Migrationsfixtures
werden gesondert benannt und am Ende entfernt bzw. laufen mit der QA-Datenbank ab.

Browserfälle verwenden kontrollierte HTTP-Antworten auf Desktop und Mobil;
echte Schreibtests erfolgen ausschließlich in QA. Kein neuer Auth-Anbieter,
keine KI-Bewertung und keine zusätzlichen Abhängigkeiten. Ergebnisse, Commit und
Veröffentlichungsstand werden in `PROGRESS.md` festgehalten.

Weitere fachliche Inhalte und die Prüfung unbekannter älterer Sprachpaare bleiben
redaktionelle Aufgaben. Es gibt keine automatische, möglicherweise falsche
Freigabe mehrdeutiger oder nicht bestätigter Rückübersetzungen.

Veröffentlicht am 27. Oktober 2026: Code `cf9d731`, Migration 025 erfolgreich in
Produktion; 20 historische Vokabelkarten (davon zehn Gegenkarten-Verweise) und zwei
Grammatikmodule erhalten. 180 Unit-Tests, vollständige CI und 134 Desktop-/Mobilfälle
bestanden. Echte isolierte PostgreSQL-Tests bestätigen Daten-/Kontentrennung,
Parallelität und Migration; Live-Prüfungen bestätigen beide Richtungen und die
anonymen Zugriffssperren. Keine produktiven Testhefte/-abgaben oder KI-Aufrufe.
Die Entwurfsnachkorrektur besteht zusätzlich in vier neuen Desktop-/Mobilfällen;
22 weitere betroffene Browserfälle, Typprüfung, Lint und Build ebenfalls erfolgreich.
Endgültige Worker-Version und Nachkorrektur-Commit stehen in `PROGRESS.md`.
