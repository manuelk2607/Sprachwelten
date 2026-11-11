# Übergang zur zentralen Anmeldung: feste bisherige Sitzungen

Der isolierte Testzweig erhält bei der Übernahme bestehende IDs. Bereits
aktive Geräte behalten ihre ursprüngliche Laufzeit. Nach dem Verknüpfen
führt eine neue Projektanmeldung über Worlds Hub.

## Implementierung

1. Schema 029 erfasst die beim Verknüpfen bereits aktiven nativen Sitzungen in einer eigenen
   Anwendungstabelle festhalten: historische Konto-ID, SHA-256 der nativen
   Sitzungs-ID und unveränderte aktuelle Ablaufzeit. Keine Tokens oder Cookies.
   Die Verknüpfung und die Aufnahme aller aktiven Geräte erfolgen in derselben
   Transaktion. Der bisherige Anmeldedienst liefert die Sitzungsmetadaten.
2. Im isolierten Worlds-Modus erfolgen native Eigentumsabfragen ohne Cache und
   Refresh. Der redundante Browser-SDK-Sitzungsabruf ist dort abgeschaltet.
   Die reguläre Oberfläche bezieht ihre Identität bereits aus `/auth/status`.
3. Verknüpfte Konten werden über native Sitzungen nur noch akzeptiert, wenn der
   Anbieter sie tatsächlich bestätigt, der ursprüngliche Übergangsnachweis
   existiert und dessen feste Ablaufzeit nicht überschritten ist. Keine neuen
   Nachweise beim Login oder Lesen erzeugen. Neue Sitzungen mit alten
   Zugangsdaten erhalten dadurch keinen Projektzugriff. Eine widerrufene oder
   abgelaufene Sitzung darf zur gültigen Worlds-Sitzung übergehen; ein
   Anbieterausfall darf keinen Zugriff bestätigen.
4. Lokale Neuregistrierung ist im Worlds-Modus gesperrt. Einmaliger bisheriger
   Eigentumsnachweis benötigt eine gültige, noch unverknüpfte zentrale Sitzung
   und einen im Bestand erfassten lokalen Nutzer. Das Backend prüft nach der
   nativen Anmeldung zusätzlich das Zielkonto. Bei einem bereits verknüpften
   Ziel hält es die Antwort zurück und beendet die neu ausgestellte Sitzung.
   Die allgemeine Profilverwaltung führt zum Hub.
5. Trennen einer Zuordnung entfernt ihre Übergangsnachweise. Die dauerhafte
   Stilllegungsmarke verhindert eine neue Aufnahme beim Wiederverbinden.
   Der bestehende Auth-Store widerruft bei verifizierter zentraler Abmeldung
   atomar auch den nativen Rückfall. Ein zentraler Widerruf beendet dabei die
   alten Anmeldungen des betroffenen Projektbenutzers. Der lokale Projektlogout
   wirkt auf die aktuelle Sitzung des Browsers.
   Wartung entfernt höchstens 500 abgelaufene Nachweise je Lauf, ohne die
   Stilllegungsmarke oder aktive Geräte zu entfernen. Alte Schemas bleiben
   mit der Wartung kompatibel.
6. Die isolierte Integration **43116714438** bestätigte zwei aktive Geräte mit
   ihren ursprünglichen Ablaufzeiten, die Ablehnung eines späteren Logins, die
   Bereinigung der dabei ausgestellten Sitzung und die lokale Abmeldung. Die
   Tests prüfen lokale Sperren, Ausfälle, den Rückfall auf eine gültige zentrale
   Sitzung und den Erhalt historischer IDs, Daten und Rollen. Der Migrationsrunner
   behandelt Funktionskörper, Literale und Kommentare beim Trennen der
   Anweisungen. Schema 029 läuft in einer Transaktion.

## Grenze vor produktiver Aktivierung

Schema 029 friert den bisherigen Kontobestand ein. Die vorgesehene produktive
Umschaltung schließt die alte Registrierung am Anbieter vor dieser Erfassung
und gleicht die Bestandsliste vor der Freigabe ab. Neue Nutzer registrieren sich
über Worlds Hub. Der Ablauf setzt eine verifizierte Sicherung, einen
erfolgreichen Pilotversuch und eine geprüfte Rücknahme voraus. Bereits früher
verknüpfte Konten verwenden ihre bestehende Zuordnung zum zentralen Login.

Der produktive Abgleich vom 12.11.2026 zeigt drei Konten mit einem lokalen
Zugangsdaten-Datensatz. Das Anbieterprofil enthält außerdem Google. Im
Kontoverzeichnis gibt es aktuell keinen damit verknüpften Datensatz.
Vor der Bestandsaufnahme prüft die Umschaltung beide Registrierungspfade
und hält die bisherige Konfiguration für den Rückweg fest.

Die reale Zustellung globaler Widerrufe an alle Projekte steht noch aus.
