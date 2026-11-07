# Worlds-Anmeldung für Sprachwelten

Sprachwelten installiert `@worlds-hub/auth` über das versionierte Paket im
Repository Worlds-Hub. Die URL verweist auf den Commit des Pakets und die
Lockdatei sichert die Prüfsumme. `auth-v0.1.1` bezeichnet
`386bd19de441b8ecf9453ba5d592a3b5b40843dc`. Das Paket enthält den
OIDC-Codeflow mit PKCE sowie widerrufbare Sessions in PostgreSQL.
Eine höchstens fünf Minuten alte Anmeldung wird mit `max_age=300`
angefordert und über den signierten `auth_time` geprüft.

Die Routen unter `/auth/` und der Menülink sind standardmäßig deaktiviert.
Für den Pilot werden Migration 027, eine separate HTTPS-Origin, eine
isolierte Datenbank mit zugehörigem Neon-Auth-Endpunkt und ein exakt
registrierter OIDC-Client benötigt. Die Konfiguration erwartet
`WORLDS_PILOT_ENABLED`, `WORLDS_PILOT_ORIGIN`,
`WORLDS_PILOT_DATABASE_HOST`, `WORLDS_ISSUER`,
`WORLDS_CLIENT_ID` und `WORLDS_RESOURCE`. Die produktive Origin und der
produktive Neon-Endpunkt werden abgewiesen.

Die abgeschlossene Zuordnung liefert für Lernkatalog, Übungen und Vokabelhefte
die vorhandene lokale UUID. Eine aktive bisherige Anmeldung hat Vorrang.
Bei Sperre oder Abmeldung verliert die Worlds-Sitzung ihren Zugriff. Die
Profilverwaltung, eigene Beiträge, KI und Administration prüfen weiterhin
die bestehende Neon-Auth-Sitzung.

Migration 027 wurde früher im getrennten Neon-QA-Ziel geprüft. Die aktuellen
lokalen Tests führen diese Migration in PGlite aus. Sie prüfen bestehende
Heftzuordnung, Ausstellergrenzen, Sperren, parallele Browseranmeldungen und
CSRF-geschützte Abmeldung. Die Verknüpfung realer Konten erfordert als
nächsten Schritt den bestätigten Nachweis beider Identitäten und die
Abnahme des Piloten mit dem echten Anbieter.
