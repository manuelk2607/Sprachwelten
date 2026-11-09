# Nächster Übergangsschritt: bisherige Sitzungen begrenzen

Entwurf, noch nicht implementiert oder produktiv aktiviert. Die Übernahme in
`9b54f19` erhält bestehende IDs; `resolveProjectIdentity` akzeptiert jedoch noch
jede gültige native Sitzung. Ein neuer Login mit alten Zugangsdaten könnte
damit weiterhin Zugriff erhalten. Das ist vor dem alleinigen Worlds-Login zu
schließen, ohne bereits angemeldete Nutzer vorzeitig auszusperren.

## Umsetzung und Abnahme

1. Die beim Verknüpfen bereits aktiven nativen Sitzungen in einer eigenen
   Anwendungstabelle festhalten: historische Konto-ID, SHA-256 der nativen
   Sitzungs-ID und unveränderte aktuelle Ablaufzeit. Keine Tokens oder Cookies.
   Die Aufnahme muss mit der Verknüpfung atomar sein; nur native Tabellen lesen,
   niemals deren Sessions oder Passwörter per SQL verändern. Alle bestehenden
   Geräte berücksichtigen, nicht nur den Browser der Bestätigung.
2. Im isolierten Worlds-Modus native Eigentumsabfragen ohne Cache und ohne
   Refresh durchführen. Den redundanten Browser-SDK-Sitzungsabruf prüfen: Er
   kann unabhängig vom neuen Eigentumsadapter weiterhin Sitzungen verlängern.
   Die reguläre Oberfläche bezieht ihre Identität bereits aus `/auth/status`.
3. Verknüpfte Konten über native Sitzungen nur noch akzeptieren, wenn der
   Anbieter sie tatsächlich bestätigt, der ursprüngliche Übergangsnachweis
   existiert und dessen feste Ablaufzeit nicht überschritten ist. Keine neuen
   Nachweise beim Login oder Lesen erzeugen. Neue Sitzungen mit alten
   Zugangsdaten erhalten dadurch keinen Projektzugriff. Eine widerrufene oder
   abgelaufene Sitzung darf zur gültigen Worlds-Sitzung übergehen; ein
   Anbieterausfall darf keinen Zugriff bestätigen.
4. Lokale Neuregistrierung im Cutover-Modus beenden. Einmaliger bisheriger
   Eigentumsnachweis bleibt ausdrücklich auf noch unverknüpfte Konten begrenzt.
   Allgemeine Profilverwaltung auch für die verbleibenden Übergangssitzungen
   zum Hub führen, damit der Browser-SDK-Cache keine zweite Autorität bleibt.
5. Isoliert prüfen: zwei zuvor aktive Geräte bleiben bis zu ihren jeweils
   ursprünglichen Ablaufzeiten nutzbar; ein späterer nativer Login wird
   abgewiesen; weder SDK noch API verlängern den Übergang; Native-Widerruf,
   lokale Sperren, Ausfall, gültiger zentraler Rückfall und Projektlogout.
   Historische IDs, Daten und Rollen müssen unverändert bleiben. Native-QA,
   Browserprüfungen und Rollback vor produktiver Aktivierung.

Der Entwurf ersetzt nicht den globalen Widerruf sämtlicher Projekt-BFFs.
Erweiterte Produktionsfreigaben oder Änderungen an Anbieteroptionen sind damit
nicht erteilt. Die produktiven Worlds-Schalter bleiben ausgeschaltet.
