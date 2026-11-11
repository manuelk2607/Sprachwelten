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
6. Isolierte Abnahme: zwei zuvor aktive Geräte bleiben bis zu ihren jeweils
   ursprünglichen Ablaufzeiten nutzbar; ein späterer nativer Login wird
   abgewiesen; weder SDK noch API verlängern den Übergang; Native-Widerruf,
   lokale Sperren, Ausfall, gültiger zentraler Rückfall und Projektlogout.
   Historische IDs, Daten und Rollen müssen unverändert bleiben. Native-QA,
   Browserprüfungen und Rollback vor produktiver Aktivierung. Der Migrationsrunner
   trennt SQL-Anweisungen unter Beachtung von Funktionskörpern, Literalen und
   Kommentaren; Schema 029 wird damit weiterhin in einer Transaktion ausgeführt.

## Grenze vor produktiver Aktivierung

Schema 029 friert den bisherigen Kontobestand ein. Die vorgesehene produktive
Umschaltung schließt die alte Registrierung am Anbieter vor dieser Erfassung
und gleicht die Bestandsliste vor der Freigabe ab. Neue Nutzer registrieren sich
über Worlds Hub. Der Ablauf setzt eine verifizierte Sicherung, einen
erfolgreichen Pilotversuch und eine geprüfte Rücknahme voraus. Bereits früher
verknüpfte Konten verwenden ihre bestehende Zuordnung zum zentralen Login.

Die reale Zustellung globaler Widerrufe an alle Projekte steht noch aus.
