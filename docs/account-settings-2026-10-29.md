# Kontoeinstellungen – Passwort und E-Mail

Profilbild-Eingabe und externe Vorschau wurden auf Benutzerwunsch entfernt.
Vorhandene Auth-Metadaten werden nicht gelöscht. `/api/auth/update-user` akzeptiert
nur noch den Namen, keine Mailadresse, Benutzer-ID, Rolle oder Bildadresse.

## Passwort

Native Neon-Methode `changePassword`: aktuelles Passwort, neues Passwort (8–128
Zeichen) und Wiederholung im Formular. Keine automatische Trim-/Unicode-Normalisierung
von Passwörtern. Server erzwingt `revokeOtherSessions=true`. Andere Sitzungen werden
widerrufen; aktuelle Sitzung bleibt gültig. Passwortfelder werden nach erfolgreicher
Änderung oder Abbruch gelöscht, niemals in Entwürfe oder Browserstorage geschrieben.
Für reine Google-Anmeldung ist der vorhandene Passwort-Reset aus dem Profil erreichbar.

Echte isolierte QA bestätigt Passwortwechsel, Ablehnung eines falschen bisherigen
Passworts, Ungültigkeit des alten Passworts, Login mit neuem Passwort und Widerruf einer
zweiten Sitzung bei gleichbleibender Konto-ID. Keine Produktionspasswörter geändert.

## E-Mail

Die Oberfläche verwendet die bereits typisierten nativen Neon-SDK-Endpunkte
`emailOtp.requestEmailChange` und `emailOtp.changeEmail`. Eine angeforderte Zieladresse
bleibt während der Codeeingabe gesperrt; Abbruch löscht Adresse/Code. Erst die
Bestätigung darf den Anbieter zur Änderung veranlassen. Danach werden andere Sitzungen
widerrufen und die aktuelle Sitzung abgemeldet; Fehler bei der Abmeldung werden separat
von der bereits erfolgreichen Mailänderung gemeldet. Die Konto-ID bleibt maßgeblich
für Rechte, Beiträge und Lernen. Keine direkte SQL-Mutation oder ungeprüfte Mailänderung.

**Aktueller externer Blocker:** im echten isolierten Neon-Auth-Dienst ergibt die
Anforderung HTTP 400 `Change email with OTP is disabled`. Die öffentlich dokumentierte
Neon-Konfiguration (OpenAPI, CLI und Connector) enthält keinen Schalter
`emailOTP.changeEmail.enabled`. Dass ein Endpunkt im Provider-Schema vorhanden ist,
bedeutet nicht, dass er freigeschaltet ist. Die QA-Projekteinstellungen `settings/auth`
wurden nach Benutzerlogin ebenfalls vollständig gelesen: kein Schalter für Mailwechsel;
keine Auth-Konfiguration verändert. Bestätigte Codezustellung/Emailänderung wurde
nicht real geprüft und darf nicht als bestanden gelten.

Mögliche Betreiber-/Supportfrage: Wie lässt sich im bestehenden Managed Better Auth
`emailOTP.changeEmail.enabled=true` für den Produktionsbranch und das leere QA-Template
aktivieren, ohne den Auth-Dienst zu ersetzen oder andere Loginregeln zu ändern?
Produktion: `calm-tooth-60944868` / `br-delicate-field-b96d9qc4`.
QA: `polished-wind-59150518` / `br-damp-glitter-baqvjq5l`.
Es wurde keine Supportnachricht versendet und kein neuer Versanddienst eingerichtet.

## Tests und Daten

193 Unit-Tests, 10 gezielte Desktop-/Mobilfälle, Typprüfung, Lint, Übersetzungen,
Audit und Build bestanden. Browserfälle für Codebindung, Fehlversuche, Sperre,
Abbruch und Passwortbestätigung verwenden kontrollierte Antworten. Reale QA prüft
Passwort-/Sitzungsabläufe; die Codezustellung und erfolgreiche Mailänderung bleiben
ungetestet/blockiert. Die neuen Auth-Pfade verwenden den vorhandenen Proxy mit
Sitzung, gleicher Origin, begrenztem JSON und strikten erlaubten Feldern.
QA-Aktivzeit auf ausdrücklich autorisierte 7200 Sekunden erhöht; Compute 1800 Sekunden,
0,25 CU und Storage unverändert. Kein neues Schema, keine produktiven Konten verändert.
