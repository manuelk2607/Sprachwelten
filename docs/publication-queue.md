# Veröffentlichungswarteschlange, 1. November 2026

`publication-queue.json` enthält die 44 noch offenen, vom Benutzer zur Vorbereitung
freigegebenen Community-Karten: vier Jugendwörter, 20 Gaming-Begriffe und 20
akademische Begriffe. Die zehn schwedischen Redewendungen und acht Jugendwörter
sind bereits über das Eigentümerkonto veröffentlicht und gehören nicht erneut in
die Warteschlange. Produktionsabgleich am 1. November: keine der 44 Karten bereits
vorhanden. Varianten/Quellen und frühere Dubletten siehe PROGRESS.md.

Die Karten in `scripts/publication-cards.ts` präzisieren mehrdeutige Begriffe durch
Kontext (Aggro bei NPCs, Smurf als Konto, Wipe im Gruppenkampf, begriffliches
Differenzieren). Alle Karten verwenden das aktuelle `meaning`-Format mit einer
richtigen und drei unterschiedlichen falschen DE-/EN-Antworten. Community-Inhalte
erhalten keine erfundene fachliche Freigabe oder Schwierigkeitsstufe. Bedeutungen
und Ablenkungsantworten sind selbst formuliert. Quellen: Langenscheidt-Jahresliste,
British Esports / Esports Wales und Duden-Wörterbucheinträge. Die gespeicherten
Quellenlinks sind Nachschlagehinweise, keine redaktionellen Freigaben.

## Sicherer Start

1. Änderungen einschließlich `/api/me/contribution-limit` und der zusätzlichen
   Kontoprüfung im Beitrags-POST nach bestandenen Prüfungen veröffentlichen.
2. `node --import tsx scripts/publish-queue.mts` prüft/zeigt die Warteschlange lokal,
   ohne Anmeldung und ohne Veröffentlichungen.
3. Autorisierte Zugangsdaten des bestehenden Manuel-Kontos lokal als
   `AUTH_TEST_EMAIL` und `AUTH_TEST_PASSWORD` bereitstellen. Keine Cookies oder
   Passwörter in die Warteschlange, Git oder Protokolle schreiben. Das Programm
   erzeugt eine eigene flüchtige Sitzung, prüft die unveränderliche Konto-ID und
   meldet nur diese Sitzung anschließend ab.
4. Nach Ablauf der Sperre:
   `node --env-file=.env.auth-test.local --import tsx scripts/publish-queue.mts --publish`
5. Nach einem Fehler zuerst dessen Ursache prüfen, dann mit zusätzlichem
   `--retry-failed` wiederaufnehmen. Auch dabei wird vor jedem POST erneut nach
   vorhandenen Beiträgen gesucht; ein unklar ausgegangener POST wird niemals
   einfach blind wiederholt. Ein bestehender Beitrag wird gelesen und als
   `published` mit `disposition: existing` registriert, ohne ihn zu verändern.

Die unveränderte Serverlogik erlaubt 20 Konto-Beiträge in einem festen Fenster
von 3600 Sekunden ab der ersten Einreichung. Das ursprüngliche Fenster endet
am 1. November 2026 um 16:28:46.687 UTC (17:28:46 Ortszeit). Die Warteschlange
wartet vorsichtshalber bis 16:28:48 UTC. Der neue ausschließlich lesende Endpunkt
liefert danach vor jeder Veröffentlichung die aktuelle Restquote und Rücksetzzeit
aus der Datenbank; parallele normale Einreichungen zählen weiterhin mit. Ein
gleichzeitiger letzter Platz wird vom bestehenden serverseitigen Limit geschützt.
Bei HTTP 429 stoppt der Lauf konservativ für mindestens eine Stunde.

Status/Versuche werden vor dem POST atomar gespeichert. Netzfehler oder Abbruch
lassen den betroffenen Beitrag als `failed` mit unklarem Ergebnis stehen. Erfolg
wird erst nach erneutem Lesen des gespeicherten Beitrags, Prüfung von Kategorie,
Sprache und bei neu erstellten Karten auch Inhalt/Bearbeitungsrecht bestätigt.
Ein Prozess-Lock verhindert zwei gleichzeitige lokale Läufe. Bei einem harten
Prozessabbruch kann die Lockdatei bleiben: erst sicherstellen, dass kein Lauf
mehr aktiv ist, danach gezielt `publication-queue.json.lock` entfernen.

## Automatisierungsgrenze

Der bestehende Cloudflare-Cron dient begrenzter Datenpflege. Er verfügt über keine
Benutzersitzung für das Eigentümerkonto. Eine Veröffentlichung unter diesem Konto
darf weder aus einer frei angegebenen Benutzer-ID noch durch direkte SQL-Inserts
erzeugt werden. Es wurden deshalb keine dauerhaften Kontopasswörter, Sitzungscookies,
neuen Cron-Trigger oder zusätzlichen Hintergrunddienste eingerichtet.

Der vorbereitete Lauf ist manuell startbar und verarbeitet danach bis zur
Restquote selbstständig. Für weitere Fenster ist ein erneuter Start erforderlich.
Ohne laufenden Prozess und ohne bereitgestellte autorisierte Zugangsdaten erfolgt
keine automatische Veröffentlichung. `published`/`pending`/`failed` bleiben auch
nach Beenden von Codex auf der Festplatte erhalten. Queue-Datei nicht löschen oder
aus einer älteren Git-Version zurücksetzen; sie ist das lokale Ausführungsjournal.
