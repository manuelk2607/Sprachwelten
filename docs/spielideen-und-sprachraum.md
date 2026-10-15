# Vorschläge für Sprachwelten

Stand: 15. Oktober 2026. Diese drei Spielideen und der Live-Sprachraum sind noch nicht implementiert.

## 1. Gaming: „Ping! Verstanden?“

Ein kooperatives Kommunikationsspiel: Eine Person sieht eine kleine Spielkarte mit Ziel und Hindernissen, die anderen steuern Figuren auf einem eigenen Ausschnitt. Über kurze Calls müssen alle dasselbe Ziel erreichen. Ein Call wie „erst looten, dann am Marker sammeln“ muss in eine richtige Reihenfolge von Aktionen umgesetzt werden. Wer den Begriff nicht kennt, kann eine begrenzte Rückfrage stellen; nach der Mission erklärt die Auflösung die verwendeten Begriffe.

Die Begriffe kommen aus einem zum Spiel passenden Glossar; Abkürzungen und Bedeutungen unterscheiden sich zwischen Communities und Genres. Runden erhalten ein Thema wie Teamspiel, MMO oder Streaming, damit unterschiedliche Verwendungen nicht als falsch gelten. Gewertet werden gemeinsam erreichte Ziele und verständliche Kommunikation. Kleine Missionen dauern zwei bis drei Minuten. Ein textbasierter erster Prototyp funktioniert ohne Sprachchat; echte hektische Calls könnten später den Sprachraum nutzen. Anders als in den bisherigen Quizzen werden Anweisungen praktisch ausgeführt.

## 2. Jugendwörter: „Generationenchat“

Ein fiktiver Chat enthält einen aktuellen Ausdruck. Ältere Mitspielende wählen keine Wörterbuchdefinition, sondern formulieren eine passende Reaktion oder schreiben den Satz in vertrauten Worten um. Eine zweite Person sieht die Umschreibung und ordnet sie einer konkreten Handlung oder Stimmung zu. Passt die Handlung zur ursprünglichen Situation, bekommt das Team einen Punkt. Anschließend werden Bedeutung, Ton und mögliche Missverständnisse gezeigt.

Beispiel einer selbst formulierten Aufgabenkarte: Jemand schreibt über seine missglückte Präsentation „Das war so cringe“. Eine gelungene Antwort erkennt Verlegenheit und reagiert unterstützend. Das Spiel bewertet Verständnis im Kontext, keine Imitation einer jüngeren Generation. Jeder Beitrag braucht einen Beispielsatz, eine verständliche Erklärung, Region/Community und einen Zeitbezug. Bedeutungen können sich ändern; Community-Prüfung ist sinnvoll. Kurze vorbereitete Szenarien halten das Bewerten nachvollziehbar. Niemand soll wegen seines Alters vorgeführt werden.

## 3. Akademisch und alltäglich: „Sag’s ohne Seminar“

Eine Person erhält einen Fachsatz und muss ihn mit höchstens 25 Wörtern erklären. Drei typische Fachwörter sind gesperrt. Die anderen sehen eine kleine Alltagssituation und müssen anhand der Erklärung die passende Entscheidung treffen oder den Sachverhalt skizzieren. Danach erscheinen eine mögliche verständliche Erklärung und eine kurze Definition. In der nächsten Runde wird die Richtung umgedreht: Eine Alltagserfahrung soll präzise mit einem Fachbegriff benannt werden.

Beispiel: „Korrelation impliziert keine Kausalität“ erklären, ohne „Korrelation“, „Kausalität“ und „Zusammenhang“ zu verwenden. Der Empfänger muss erkennen, warum gemeinsam steigende Eisverkäufe und Sonnenbrände allein keine Ursache beweisen. Die Aufgaben stammen zunächst aus allgemein zugänglichen Bereichen wie Statistik und wissenschaftlichem Arbeiten. Das Team punktet für die inhaltlich passende Entscheidung; die Wortgrenze fördert Klarheit. Eine Peer-Rückmeldung bewertet zusätzlich Verständlichkeit, nicht Bildungsstatus.

Gaming- und Jugendsprache sowie akademische Ausdrucksweisen sind hier Themen und Sprachregister. Für Beiträge wird weiterhin eine tatsächlich registrierte Originalsprache gespeichert; sie werden nicht als erfundene Sprachcodes in das IANA-Register aufgenommen.

## Ein Sprachraum im Spiel

### Vorschlag

Ein optionaler Audio-Raum mit Cloudflare RealtimeKit passt zur vorhandenen Cloudflare-Veröffentlichung. Der Beitritt wäre direkt an den Spielraum gebunden: Schaltfläche „Sprachraum beitreten“, ausdrückliche Mikrofonfreigabe, stumm starten, Mikrofonwahl, Stummschaltung und Anzeige der Sprechenden. Kamera und Aufzeichnung bleiben aus. Wer keinen Sprachraum möchte, spielt weiterhin ohne ihn. Die freiwilligen Ausspracheclips bleiben davon getrennt.

Der Worker prüft den vorhandenen Raumtoken, bevor er einen Teilnehmer beim Sprachdienst anlegt. Cloudflare-Zugangsdaten bleiben auf dem Server. Austritt und Ende des Raums müssen auch den Sprachzugang beenden. RealtimeKit-Teilnehmertokens gelten laut aktueller [FAQ](https://developers.cloudflare.com/realtime/realtimekit/faq/) lange; ein bloßer Browseraustritt entzieht daher nicht den Zugang. Teilnehmer müssen beim endgültigen Verlassen serverseitig entfernt und leere/abgelaufene Meetings deaktiviert werden. Ein periodischer Abgleich fängt geschlossene Tabs ab. Für Öffentlichkeit kommen Stummschalten durch Gastgeber, Entfernen und Wiederbeitrittsschutz hinzu.

### Aufwandsschätzung

- Ein einfacher funktionsfähiger Audio-Prototyp: ungefähr ein bis zwei Entwicklungstage nach verfügbarer Dienstfreigabe und Zugangsdaten.
- Eine ordentlich getestete Integration für zwei bis zehn Personen: insgesamt ungefähr drei bis fünf Tage, einschließlich Mobilbrowsern, verweigerten Berechtigungen, Kopfhörern, Verbindungsabbrüchen, Gastgeberwechsel und Bereinigung.
- Breiter öffentlicher Betrieb mit Moderation, Verbrauchsgrenzen und weiteren Browser-/Gerätetests: eher eine bis zwei Wochen Gesamtaufwand.

Das sind technische Größenordnungen für den aktuellen Stand, keine feste Zusage. Live-Audio benötigt dauerhafte Medienverbindungen, Zugangskontrolle und Netzwerkvermittlung. Eigenes WebRTC mit STUN/TURN und gegebenenfalls SFU bietet mehr Kontrolle, erhöht aber Entwicklungs- und Betriebsaufwand. Ein verwalteter Dienst nimmt einen großen Teil davon ab. LiveKit wäre eine Alternative, besonders bei später gewünschtem eigenem Medienserver; die konkrete Tarifwahl müsste separat geprüft werden.

### Laufende Kosten

Die [Cloudflare-Preistabelle](https://developers.cloudflare.com/realtime/realtimekit/pricing/) nennt für reine Audio-Teilnehmer 0,0005 US-Dollar pro Teilnehmerminute. Vier Personen mit je 60 Minuten ergeben damit rechnerisch 0,12 US-Dollar, zehn Personen 0,30 US-Dollar – vor möglichen Freikontingenten und Steuern. Die [Abrechnungs-FAQ](https://developers.cloudflare.com/realtime/realtimekit/faq/) zählt tatsächlich verbundene Teilnehmer und separat verbundene Tabs, auch wenn jemand stumm ist. Einladungen ohne Beitritt werden nicht berechnet.

Beta- und Freikontingentangaben auf Produktseiten können vom später geltenden Tarif abweichen. Vor einer Aktivierung müssten Verfügbarkeit, Kontotarif und Ausgabenbegrenzung im eigenen Konto geprüft werden. Es wurde hierfür kein Dienst aktiviert und kein Tarif gebucht.
