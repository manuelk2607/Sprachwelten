# Worlds-Anmeldung für Sprachwelten

Sprachwelten installiert `@worlds-hub/auth` über das versionierte Paket im
Repository Worlds-Hub. Die URL verweist auf den Commit des Pakets und die
Lockdatei sichert die Prüfsumme. `auth-v0.1.3` bezeichnet
`b0e6eac7bc6fdd46317dc933a83936c16ecde816`. Das Paket enthält den
OIDC-Codeflow mit PKCE sowie widerrufbare Sessions in PostgreSQL.
Eine höchstens fünf Minuten alte Anmeldung wird mit `max_age=300`
angefordert und über den signierten `auth_time` geprüft.

Die Routen unter `/auth/` und der Menülink sind standardmäßig deaktiviert.
Für den Pilot werden Migrationen 027 und 028, eine separate HTTPS-Origin, eine
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


## Anwendungsprofile und neue zentrale Nutzer

Migration 028 übernimmt die bisherigen UUIDs als anwendungseigene Profile und
belässt Rollen, Beiträge und native Auth-Zeilen unverändert. Neue zentrale
Identitäten erhalten ausschließlich ein neues Anwendungsprofil, keine weitere
Registrierung und kein natives Passwortkonto. Die zentrale Sitzung liefert den
Anzeigenamen; Namen und E-Mails werden niemals für eine Zuordnung verwendet.
Der ausdrückliche Profilstart informiert, dass bisherige Kontodaten dadurch
nicht übernommen werden. Bei aktiver bisheriger Sitzung wird die Neuanlage
abgewiesen. Die sichere Bestätigung und Übernahme weiterer alter Konten ist
ein eigener noch offener Schritt.

Die Zuordnung und ihr Audit werden mit dem Profil in einer SQL-Anweisung
angelegt. Ein Konflikt rollt die gesamte Anlage zurück und verwendet höchstens
die bestehende identische Aussteller-/Subject-Zuordnung. Eine Sperre oder eine
entfernte native Quelle wird nicht durch eine neue Anlage umgangen. Neue
Profile sind ohne lokale Freigabe keine Administratoren. Auth-Secrets und
native Sessions werden nicht kopiert. Profilstart ist POST/CSRF-/Origin- und
größenbeschränkt und akzeptiert keine eingesendeten Namen, IDs oder Subjects.
Rücksprünge stammen ausschließlich aus der bestehenden engen Routenliste.

206 lokale Tests und die neuen Browserabläufe bestanden mit synthetischen
Sitzungen; echte neue OIDC-Anmeldung und PostgreSQL-Abnahme bleiben separat
nachzuweisen. Die native QA-Integration ist dafür erweitert, aber noch nicht
erfolgreich ausgeführt. Migration 028 wird ausschließlich im getrennten
Testzweig geprüft. Für Rücknahmen Datenprofile und Verknüpfungen erhalten;
kein destruktiver Rückbau auf den nativen Fremdschlüssel, sobald neue zentrale
Nutzer vorhanden sind. Eine künftig gewählte Rücknahmeversion muss dieselbe
Datenprofilstruktur unterstützen.
