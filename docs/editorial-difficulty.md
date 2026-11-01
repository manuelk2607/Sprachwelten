# Redaktionelle Spielstufen

Spielstufen sind unabhängig von den CEFR-Niveaus im Lernbereich. Sie werden nicht
anhand von Textlänge, KI-Ausgaben oder automatisch aus Quellenlinks abgeleitet.

Administratoren öffnen beim Bearbeiten eines bestehenden Spielbeitrags den
Abschnitt „Redaktionelle Einstufung“. Gespeichert werden Stufe, Prüfdatum,
HTTPS-Quellen, Begründung und eine ausdrückliche fachliche Freigabe. Ohne die
Bestätigung bleibt die Einstufung ein Entwurf. Das Formular vergibt selbst keine
fachliche Qualifikation: Die prüfende Person muss die nötige Evidenz besitzen.
Die sechs noch fachlich offenen Dialektkarten bleiben weiterhin offen.

Migration 026 speichert Einstufungen getrennt von Beiträgen und legt eine
Revisionshistorie an. Gleichzeitige Änderungen verwenden erwartete Beitrags- und
Prüfrevisionen; veraltete Bearbeitungen scheitern mit 409. Jede Inhaltsänderung
macht die alte Freigabe unwirksam. Zurückziehen ist ohne Inhaltsänderung möglich.
Lernbeiträge sind ausgeschlossen; Administration und Änderungen sind serverseitig
an die bestehende Administratorberechtigung gebunden.

Eine Stufe erscheint erst bei mindestens 20 aktuellen, ausdrücklich geprüften
Beiträgen **je gewählter Sprache, Kategorie und Stufe**. Bei gemischten Kategorien
müssen alle enthaltenen Kategorien diese Grenze erfüllen. Personen-/Liedzitate
werden getrennt gezählt; beim Satzbau zählt die Zielsprache. Freie Wortketten und
False Friends erhalten keine irreführende Auswahl (dort fehlen vergleichbare,
redaktionell eingestufte Einzelaufgaben bzw. sprachpaarbezogene Einstufungen).

Der Server prüft die Freigaben beim Laden eines Spielpools erneut und filtert vor
der SQL-Stichprobe. Die Engine prüft die Stufe ebenfalls. Legacy-Räume und Spiele
ohne ausgewählte Stufe bleiben unverändert. Änderungen von Spiel, Sprache oder
Kategorie löschen die alte Auswahl; eine reine Rundenänderung erhält sie.
Direkte Folgepartien behalten dieselbe Einstellung und die bisherige Kartenhistorie.
Entfällt die erforderliche Datenbasis, wird keine fremde Stufe stillschweigend
verwendet. Die Lobby bietet ausdrücklich „Alle Aufgaben verwenden“ an.

`npm run test:editorial-integration` läuft ausschließlich mit einem expliziten
isolierten QA-Ziel. Seine 20 Freigaben sind synthetische Testfixtures, keine echten
sprachwissenschaftlichen Prüfungen. Er prüft Schwellenwert, Sprach-/Kategorie-
trennung, Pool, Punkte/Folgepartie, konkurrierende Revisionen, Widerruf,
Invalidierung und Historie; anschließend entfernt er seine eigenen Testdaten.
Der isolierte CI-Workflow führt diesen Test nach sämtlichen Migrationen aus.

Es werden durch diese Veröffentlichung **keine produktiven Beiträge freigegeben**.
