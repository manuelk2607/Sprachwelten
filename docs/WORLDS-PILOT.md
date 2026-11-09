# Worlds-Anmeldung für Sprachwelten

Sprachwelten installiert `@worlds-hub/auth` über das versionierte Paket im
Repository Worlds-Hub. Die URL verweist auf den Commit des Pakets und die
Lockdatei sichert die Prüfsumme. `auth-v0.1.3` bezeichnet
`b0e6eac7bc6fdd46317dc933a83936c16ecde816`. Das Paket enthält den
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

Die abgeschlossene Zuordnung liefert für Lernen, Hefte, Beiträge, Audio,
Übersetzungsvorschläge, Spielnamen und Administration dieselbe vorhandene lokale
UUID. Eine tatsächlich aktive bisherige Anmeldung hat Vorrang; ein abgelaufenes
Cookie allein verhindert den Wechsel zur zugeordneten Worlds-Sitzung nicht.
Lokale Sperren und Rollen werden auf dem Server geprüft. Nach Widerruf wird die
Worlds-Sitzung nicht stillschweigend zu einem Gastautor. Allgemeine
Profileinstellungen führen in DE/EN zum Hub; native Kontomutationen erfordern
weiterhin eine tatsächlich native Sitzung. Die Projektabmeldung ist
CSRF-geschützt; der globale Logout ist noch nicht abgenommen.

Migration 027 wurde früher im getrennten Neon-QA-Ziel geprüft. Die aktuellen
lokalen Tests führen diese Migration in PGlite aus. Sie prüfen bestehende
Heftzuordnung, Ausstellergrenzen, Sperren, parallele Browseranmeldungen und
CSRF-geschützte Abmeldung. Die reale QA-Prüfung `42519682396` bestätigt außerdem tatsächliche Beitragsrouten
unter unveränderter UUID und das laufende native HTTP-System; vollständige CI
`42519675450` prüft 200 Unit- und 162 Browserfälle. Die Worlds-Sitzung in der
Datenbankprüfung ist eine synthetische Fixture, keine echte OIDC-Anmeldung.
Die Verknüpfung realer Konten erfordert weiterhin den bestätigten Nachweis beider
Identitäten und die Browserabnahme des Piloten mit dem echten Anbieter.
