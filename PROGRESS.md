# Sprachwelten – Fortsetzungsstand, 12. November 2026

## Feste Übergangssitzungen und Stilllegung neuer lokaler Anmeldungen

Im isolierten Worlds-Modus prüft der Server bisherige Sitzungen ohne Cache
und Refresh. Schema 029 erfasst den bisherigen Kontobestand und nimmt beim
ersten bestätigten Verknüpfen atomar alle aktiven Geräte mit gehashter
Sitzungs-ID und unveränderter Ablaufzeit auf. Kein Passwort-/Token-Import und
keine SQL-Änderung an nativen Auth-Tabellen. Neue native Sitzungen nach der
Zuordnung sowie nachträglich angelegte native Konten erhalten keinen Zugriff.
Der normale Browser lädt dort keinen zweiten nativen Sitzungsbeobachter mehr.

Native SDK-Endpunkte erlauben nur den einmaligen Nachweis mit noch unverknüpfter
zentraler Sitzung sowie eigene Abmeldung/ungecachten Sitzungsabruf. Neuregistrierung
und native Profilverwaltung sind gesperrt. Auch ein noch unverknüpftes anderes
zentrales Konto kann keinen bereits verknüpften nativen Zielnutzer erneut öffnen:
Der Server beendet die neu ausgestellte Sitzung vor der Ablehnung und hält
ihre Antwort samt Cookies zurück.

Trennen und verifizierter zentraler Widerruf entfernen den nativen Rückfall.
Die Stilllegungsmarke verhindert neue Nachweise bei Wiederverknüpfung. Der
Widerruf gilt nur für den betroffenen Nutzer und Aussteller. Begrenzte Wartung
entfernt abgelaufene Nachweise und unterstützt
weiterhin Schemas ohne diese Tabellen. Der Migrationsrunner unterstützt jetzt
Funktionskörper und Literal-/Kommentar-Semikolons innerhalb atomarer Migrationen.

Lokal bestanden 227 Unit-Tests, Typen, Lint, DE/EN-Abdeckung, Dependency-Audit,
Build und 36 Chromium-/WebKit-Browserfälle bei 320/1280 px. Die echte Native-QA
prüft anschließend den gepushten Stand.
`docs/worlds-transition-sessions.md` beschreibt den Abgleich des erfassten
Kontobestands und die Voraussetzungen für eine produktive Umstellung.

## Einmalige Bestätigung abgelaufener Bestandsanmeldungen – 09.11.2026

Der isolierte Worlds-Modus bietet nicht verknüpften Nutzern jetzt zuerst
„Ich habe bereits ein Sprachwelten-Konto“. Die private Seite `/worlds-migration`
verwendet den vorhandenen Auth-Dialog und das vorhandene Managed-Auth-SDK für
die einmalige bisherige Anmeldung oder Passwortwiederherstellung. Keine weitere
Registrierung und keine neue Auth-Bibliothek. Der reguläre Login bleibt ein
Worlds-Link. Für noch gültige bisherige Sitzungen bleibt die direkte Übernahme
ohne neue Passworteingabe erhalten. Alte Adminsitzungen erhalten einen konkreten
Weg zur verlangten frischen Bestätigung.

Ein eigener read-only Endpunkt prüft die gültige zentrale Projektsitzung und
verweigert das Formular bei bereits bestehender oder gesperrter Zuordnung.
Die Seite allein authentifiziert keine Kontoinhaber und schreibt keine Zuordnung.
Nach erfolgreicher bisheriger Anmeldung geht es zur vorhandenen ausdrücklichen
Verbindungsbestätigung: Beide Nachweise werden erneut geprüft, bestehende IDs,
Sperren, Rollen und Daten bleiben maßgeblich. Rücksprünge sind auf bestehende
Projektpfade begrenzt. Keine Zusammenführung anhand von Namen oder E-Mail.

DE/EN ist im Dialog per Tastatur und mit 44-px-Zielen erreichbar; Umschalten
erhält Eingaben und übersetzt auch bereits angezeigte Meldungen. Reset-Tokens
werden sofort aus der Adresse entfernt und nur im Komponentenspeicher gehalten.
Bei fehlender zentraler Sitzung muss erst die Worlds-Anmeldung erneuert und
gegebenenfalls ein neuer Wiederherstellungslink angefordert werden; kein Token
wird dafür in Browser-Speicher oder über eine Anmeldeweiterleitung übernommen.
Private Metadaten, unveränderte Gestaltung und gespeicherte Sprache/Design gelten
auch hier. `3f5a40d` ergänzt die gewählte Sprache und den übersetzten Titel schon
in der ersten HTML-Antwort; acht betroffene Browserfälle und vier zusätzliche
Prüfungen der unveränderten Serverantwort bestanden. Kein Slop-Passwortflow und
keine Produktionsänderung.

Lokal bestanden **217 Unit-Tests**, Typen, Lint, DE/EN-Abdeckung, vollständiger
Dependency-Audit, Offline-Build und **36 Worlds-Browserfälle** in Chromium und
WebKit bei 320/1280 px. Die Browserfälle kombinieren die echte React-Oberfläche
mit tatsächlichen Übernahme-Controllern/SQL und synthetischer Authentifizierung:
abgelaufene Anmeldung, falsches Passwort, Sprachwechsel, Reset, ausbleibende
Registrierung, gleiche historische Daten nach Verknüpfung und beide lokalen
Abmeldungen. Fehlende/verknüpfte Sitzung, Ausfall und sichere Rücksprünge geprüft;
Screenshots auf Mobil/Desktop gesichtet. Code `9b54f19`: vollständige CI
**42683427322** und echte isolierte Native-QA **42683460761** erfolgreich.
Die echte QA prüfte auch Berechtigung vor/nach der Übernahme; beide Identitäten
werden im Controller nochmals geprüft. Historische IDs, Heft-/Beitragseigentum,
Rollen und ursprüngliche native Sitzungsmetadaten bleiben erhalten; beide
lokalen Abmeldungen bestanden. Zentraler BFF dort weiterhin synthetisch.
Vollständige CI **42684100840** für `3f5a40d` ebenfalls erfolgreich: 217 Tests,
Typen, Lint, Übersetzungen, vollständiger Audit, Build sowie 154 bisherige und
36 Worlds-Browserfälle. Produktion bleibt unverändert.

Weiter offen: reale zentrale Browserabnahme im eigenen Sprachwelten-Piloten,
kontrollierte Stilllegung neuer lokaler Anmeldungen für verknüpfte Konten,
unveränderte ursprüngliche Laufzeit bestehender Übergangssitzungen sowie die
projektübergreifende globale Abmeldung. Der oben dokumentierte Übergangsschutz
setzt die ursprünglichen Sitzungsgrenzen im Testzweig durch.

## HTTP-Übernahme und gemeinsamer lokaler Logout – geprüfter Testzweig

Der isolierte Worlds-Modus ergänzt CSRF-geschützte Schritte zum Vorbereiten und
Bestätigen einer vorhandenen Kontoverbindung. Beide Sitzungen werden erneut
geprüft; nur CSRF und ein einmaliger Proof stehen im Formular. IDs bleiben
serverseitig. Bestehende Zuordnungen werden nicht überschrieben. Nach Erfolg
bleiben historische UUID, Beiträge und Lernstände erhalten, auch wenn später
das bisherige Sitzungscookie fehlt. Eine bereits passende Verbindung kann
direkt fortgesetzt werden. Alte Verwaltungsanmeldungen bleiben bis zum frischen
Nachweis gesperrt; der einmalige Bestätigungsdialog ist oben dokumentiert.

Eine fehlende verschachtelte Framework-Route wurde ergänzt: Profilstart und
Übernahmeschritte werden nun über den eigentlichen Router angebunden. Neue
Dokumentansichten verwenden zentrale DE/EN-Texte, passende Sprachkennzeichnung,
mobilen Sprachschalter, bestehende Farben/Schriften und gespeichertes Design.
Accountnamen werden escaped und nicht übersetzt. Sprache/Design bleiben beim
Wechsel und nach der Rückkehr erhalten; strikte CSP mit einmaligem Nonce.

Projektlogout beendet beide lokalen Anmeldearten und deren Browsercookies.
Die getrennte zentrale Hub-Anmeldung bleibt erhalten. Native Ausfälle werden
angezeigt; kein irreführender Erfolg mit weiterhin aktivem lokalen BFF.

Lokal bestanden **215 Unit-Tests**, Typprüfung, Lint, Übersetzungsabdeckung,
vollständiger Audit, Offline-Build und **24 Worlds-Browserfälle** in Chromium/
WebKit bei 320/1280 px. Die tatsächliche verschachtelte Framework-Anbindung
ist über HTTP geprüft; die Kontoflüsse nutzen tatsächliche Controller/SQL mit
synthetischen Sitzungen. DE/EN, Umschalten während der Bestätigung, gespeichertes
Design, Rückkehr, fehlendes altes Cookie und beide lokalen Abmeldungen bestanden.
Mobil- und Desktopansichten wurden anhand der Screenshots geprüft. Eine zunächst
fehlende Formular-Origin durch `no-referrer` wurde mit `strict-origin` behoben;
Callback-Parameter werden nicht weitergegeben, Herkunftsprüfung bleibt streng.
Anonyme Aufrufe ohne Anmeldedaten fragen den alten Anbieter nicht unnötig ab.
Code **38afa15** auf `feature/worlds-hub-sso`: vollständige CI **42649568470**
erfolgreich mit 215 Unit-Tests, Typen, Lint, DE/EN-Abdeckung, vollständigem Audit,
Build und 154 bisherigen + 24 Worlds-Browserfällen. Getrennte echte QA-Integration
**42650094132** ebenfalls erfolgreich: tatsächliche HTTP-Controller, offizieller
Native-Eigentümernachweis vor beiden Schritten, eine parallele Bestätigung,
unveränderte native Sitzungsmetadaten, historische Datenzuordnung und Beenden
von Native-Sitzung und lokalem Worlds-BFF. Vollständiger nativer HTTP-Test bestand.
Die QA prüft jetzt die tatsächlichen HTTP-Controller mit echtem Native-SDK-
Eigentümernachweis und gemeinsamem lokalem Logout; zentrale BFF bleibt dort
synthetisch. Produktion unverändert. Nächste Schritte: einmalige frische
Bestätigung alter Adminsitzungen, kontrollierte Stilllegung neuer lokaler
Anmeldungen bei bereits verknüpften Konten und echte zentrale SSO-Abnahme.
Vor produktivem Wechsel bleiben außerdem der ursprüngliche Ablauf bestehender
nativer Übergangssitzungen und die globale Abmeldung vollständig zu prüfen.

## Bestehende verwaltete Sitzung als Eigentumsnachweis – 09.11.2026

Gemeinsames Paket **0.1.4**, fest auf eigenständigen Paket-Commit
`2343fdaf8892fb028495064d0377f5533d67272c` samt Integritätswert gebunden.
Es ergänzt den einmaligen, an beide Sitzungen gebundenen Übernahmenachweis für
normale gültige Managed-Auth-Konten. Alte Anmeldedaten werden nicht als frisch
ausgegeben; lokale Verwaltungsrechte benötigen weiterhin frische Quellanmeldung.

Der neue serverinterne SDK-Adapter prüft den aktuellen Eigentümer direkt beim
konfigurierten bisherigen Managed-Auth-Dienst. Er akzeptiert genau ein eigenes
Native-Sitzungscookie, übergibt weder Worlds- noch Cache-Cookies und verwendet
`disableCookieCache`/`disableRefresh`. Keine Cookieänderung im Browser, keine
zweite Anmeldung. IDs und Zeitangaben werden geprüft, lokale Sperren bleiben
wirksam und nur `app_admins` bestimmt die Privilegien. Ausfälle und Zeitüberschreitung
liefern keinen Nachweis. Kein Passwort, E-Mail-Wert oder Provider-Rollenfeld
gelangt in den Nachweis. Noch keine neue HTTP-Übernahmeroute veröffentlicht.

Lokal bestanden **210 Unit-Tests**, Typprüfung, Lint, DE/EN-Abdeckung und
Offline-Build. SDK-Tests prüfen fremde/veraltete Cookies, beide Sitzungskontexte,
Widerruf, Metadaten, lokale Sperren, Rollen und begrenzte Antwortzeit.
Code **946abb4** auf `feature/worlds-hub-sso`: getrennte echte QA-Integration
**42640109664** erfolgreich. Das neu angelegte native Testkonto wurde vor beiden
Schritten über das offizielle SDK anhand seiner vorhandenen Sitzung geprüft;
parallele Bestätigung erzeugte genau eine Zuordnung und ein Audit. Native
Sitzungs-ID, Erstellungs- und Ablaufzeiten blieben unverändert, ebenso die
historische UUID und das Heft-/Beitragseigentum. Vollständiger nativer HTTP-Test
ebenfalls bestanden. Zentraler Nachweis dort weiterhin synthetisch; der reale
Alters-/Erneuerungsfall einer bereits länger bestehenden Anbietersitzung und die
zentrale Browserübernahme sind damit noch nicht bewiesen. Vollständige CI
**42640042187** ebenfalls erfolgreich: 210 Unit-Tests, Typen, Lint,
Übersetzungsabdeckung, vollständiger Audit, Build und 154 bisherige + 16 Worlds-
Browserfälle. Nächste Schritte: CSRF-geschützter Übernahmeablauf und echte
zentrale Browserabnahme.
Keine produktiven Konten oder Zuordnungen geändert.

## Einheitliche Kontoauswahl bei der Übernahme – 09.11.2026

Ziel bleibt die sichere Übernahme vorhandener Konten ohne weitere regelmäßige
Projektanmeldung. Im isolierten Worlds-Modus übernimmt die Oberfläche jetzt
ausschließlich die vom Server ausgewählte Anwendungsidentität. Ein veralteter
nativer SDK-Cache kann weder ein anderes Konto anzeigen noch nach bestätigtem
Sitzungsende private Ansichten offenhalten. Tatsächlich gültige bisherige
Sitzungen behalten ihren Vorrang, auch wenn das Browser-SDK noch keine Sitzung
meldet. Abmeldeaktion und Kontolink folgen derselben serverseitigen Auswahl.

Der private Status liefert nur lokale ID, Anzeigename, Herkunft und gegebenenfalls
den eigenen Worlds-CSRF-Wert; keine nativen E-Mails, Rollen oder Sitzungstokens.
SDK-Sitzungsänderungen veranlassen eine neue Serverprüfung. Vorübergehende Fehler
oder unvollständige Statusantworten überschreiben die bisherige Anzeige nicht.

Lokal bestanden: **206 Unit-Tests**, Typprüfung, Lint, DE/EN-Abdeckung,
Offline-Build und **16 Worlds-Browserfälle** in Chromium/WebKit bei 320/1280 px.
Die Prüfungen decken widersprüchliche Browser-/Serveridentitäten, DE/EN,
Provider-Ausfall, Ablauf, lokale Abmeldeauswahl und unveränderte Beiträge ab.
Nur synthetische Testantworten beziehungsweise PGlite; keine Produktionsmigration.
Code **76b97e8** auf `feature/worlds-hub-sso`: getrennte echte QA-Integration
**42606461691** erfolgreich, einschließlich aller Migrationen, tatsächlicher
PostgreSQL-/Autorisierungsprüfungen und vollständigem nativem HTTP-Test gegen
Managed Auth. Vollständige GitHub-CI **42606394576** erfolgreich: 206 Unit-Tests,
Typen, Lint, Übersetzungsabdeckung, vollständiger Dependency-Audit, Build und
154 bisherige + 16 Worlds-Browserfälle. Nächste Schritte: Eigentumsnachweise
vorhandener Konten und echte zentrale SSO-Abnahme.
Globale Abmeldung und der Fall zweier gleichzeitig gültiger lokaler Anmeldearten
bleiben vor dem produktiven Wechsel gesondert abzuschließen.


## Neue Worlds-Konten ohne zweite Registrierung

Migration **028** ergänzt ausschließlich anwendungseigene Datenprofile. Vorhandene
native UUIDs, Rollen, Zuordnungen und Beitragseigentum bleiben unverändert.
Native Auth-Zeilen werden weder erzeugt noch geändert. Verknüpfungen referenzieren
jetzt das Datenprofil; entfernte oder gesperrte native Quellen bleiben für den
Zugriff gesperrt. Bestehende native Anmeldewege bleiben bei ausgeschaltetem
Worlds-Modus unverändert und benötigen die neue Tabelle nicht.

Neue zentral angemeldete Nutzer können ein Datenprofil ohne neuen Namen,
Projektpasswort oder E-Mail-Bestätigung bei Sprachwelten beginnen. Der Name
kommt aus der bereits validierten zentralen Sitzung. Gleiche Namen oder E-Mails
führen zu keiner Kontenübernahme. Profil, Zuordnung und Audit entstehen atomar;
parallele/redundante Aufrufe erzeugen genau einen Datensatz. Lokale Sperren
bleiben wirksam, aktive bisherige Sitzungen blockieren eine versehentliche
Neuanlage. Es werden keine Adminrechte aus Identitätsdaten übernommen.

CSRF, Origin, Methode, kleine Formulargröße und erlaubte Rücksprünge werden
serverseitig geprüft. Profilstart kehrt zur vorher gewählten privaten Seite
zurück. Bereits zentral angemeldete Nutzer gelangen über den Kontolink direkt
zum Profilstart. Die Administration unterscheidet zentral verwaltete Profile
von nativen Konten, ohne die zentrale E-Mail lokal zu duplizieren.

Lokal bestanden: **206 Unit-Tests**, Typprüfung, Lint, DE/EN-Abdeckung,
vollständiger Dependency-Audit und Offline-Build. Acht bisherige Worlds-
Browserfälle bestanden; vier neue Fälle prüfen jeweils DE/EN in Chromium/WebKit
bei 320/1280 px mit tatsächlicher Profil- und Formularlogik in PGlite und echter
lokaler HTTP-303-Rückkehr. Kein zusätzlicher nativer Auth-Aufruf und null neu
angelegte native Konten. Synthetische Sitzungen, kein realer OIDC-Nachweis.

Code **3c1da8b** auf `feature/worlds-hub-sso`: vollständige GitHub-CI
**42600250409** erfolgreich (206 Unit-Tests, 154 bisherige + 12 Worlds-
Browserfälle). Echte getrennte QA-Integration **42600259412** erfolgreich,
einschließlich Migration 028, gleichzeitigem tatsächlichem Profilstart,
unveränderten nativen Metadaten, Administration, eigenen Beiträgen und Widerruf
in PostgreSQL. Der vollständige native HTTP-Test gegen einen laufenden
Loopback-Server bestand ebenfalls. Keine zusätzlichen nativen Auth-Konten oder
Rollen aus dem Profilstart; keine Namens-/E-Mail-Zusammenführung. Vor einer
Veröffentlichung sind außerdem echte SSO-/Migrationsabnahme und die Gestaltung
der eigenständigen Kontozwischenseite abzuschließen. Produktion und ihre
Zuordnungen bleiben unverändert. Migration 028 ist noch nicht produktiv
angewendet. Eine Schema-Rücknahme darf neue Profile oder Zuordnungen nicht
entfernen beziehungsweise wieder auf den alten nativen Fremdschlüssel zwingen;
Rücknahmeversionen müssen die Datenprofile verstehen.

## Bestehende Identität für die gesamte Anwendung – 08.11.2026

Der isolierte Worlds-Modus verwendet die zugeordnete historische Neon-UUID jetzt
auch für eigene Beiträge, Vorschläge, Administration, Spielnamen, Audio und
Übersetzungsvorschläge. Lokale Rollen bleiben ausschließlich in `app_admins`.
Aktive bisherige Sitzungen haben Vorrang; abgelaufene Cookies blockieren die
zugeordnete Worlds-Sitzung nicht. Providerfehler, gesperrte oder nicht zugeordnete
Konten führen nicht zu einem stillen Wechsel auf einen Gastautor.

Die Oberfläche nutzt dieselbe Identität, hält Entwürfe und private Ergebnisse
kontogetrennt und delegiert allgemeine Profileinstellungen DE/EN an Worlds Hub.
Abmeldung erfolgt per CSRF-geschütztem Projektformular. Rücksprünge zu eigenen
Beiträgen, Profil und Administration sind explizit erlaubt; beliebige externe
Ziele bleiben ausgeschlossen. Native Kontomutationen mit reiner Worlds-Sitzung
werden abgewiesen. Vorübergehende Netzfehler erhalten die sichtbare Sitzung;
ein bestätigtes Sitzungsende entfernt die privaten Ansichten.

Lokal bestanden: **200/200 Unit-Tests**, Typprüfung, Lint, DE/EN-Abdeckung,
vollständiger Dependency-Audit und Offline-Build. **8/8 Browserfälle** mit
synthetischen Antworten in Chromium/WebKit bei 320/1280 px prüfen Beiträge,
Adminansicht, zentrale Profileinstellungen, DE/EN, Theme, Abmeldung und Ablauf.
In-Memory-Postgres prüft zusätzlich tatsächliche Server-Autorisierung und
Rollenwiderruf; dabei werden keine externen Adminrechte vergeben.

Die separate, befristete QA-Integration prüft zusätzlich tatsächliche
Beitragsrouten mit einem synthetischen nativen Konto und einer Worlds-Zuordnung:
Erstellen, Lesen, Bearbeiten, Entfernen und Sitzungswiderruf unter derselben UUID.
Ein gesonderter Loopback-Server führt außerdem `npm run test:integration` gegen
Managed Auth und die echte QA-Datenbank aus. Beide Prüfungen sind jetzt erfolgreich: Code `13fb704` auf
`feature/worlds-hub-sso`, vollständige CI `42519675450` mit **200 Unit- und
154 bisherigen + 8 neuen Browserfällen**; echte separate QA-Integration
`42519682396`. Tatsächliche Route-/PostgreSQL-Prüfung bestätigt unveränderte
UUID, Beitragseigentum, Bearbeiten/Entfernen, Heftzuordnung und Widerruf ohne
Gast-Fallback. Der laufende Loopback-Server bestand zusätzlich den kompletten
HTTP-Test mit echtem Managed Auth und den bisherigen Spiel-/Beitragsabläufen.
Es wurden ausschließlich synthetische Fixtures im befristeten QA-Zweig verwendet.

Keine Produktionskonfiguration, Migration oder Kontozuordnung geändert. Noch
offen: echte zentrale Browseranmeldung in Sprachwelten, kontrollierte Übernahme
bestehender Eigentümer, neue lokale Profile ohne historisches Neon-Konto,
gestaltete Providerfehler, globaler Logout und validierter Deployment-Rollback.

## Zentrale Anmeldelinks – 08.11.2026

Der Worlds-Modus bietet in Navigation und Auth-Dialog ausschließlich einen
zentralen Anmeldelink. Registrierung und Kontoverwaltung werden dort erklärt;
bestehende Reset-/Verifikationsrücksprünge bleiben während des Übergangs gültig.
`/auth/start` verwendet den gemeinsamen Client 0.1.3 aus dem geprüften Subtree
`b0e6eac7bc6fdd46317dc933a83936c16ecde816`: PKCE, sichere Rücksprünge und
hostgebundene Transaktion bleiben erhalten. Nur Dokumentnavigationen sind erlaubt.
Der bestehende isolierte Konfigurationsschutz bleibt aktiv; kein Produktiv-Cutover.

197 Tests, Typprüfung, Lint, Übersetzungsabdeckung, vollständiger Dependency-Audit
und Offline-Build bestanden. Chromium/WebKit prüften die tatsächlichen Header-/
Dialogkomponenten mit Testantworten in DE/EN bei 320 und 1280 px: direkte Links,
Sprach-/Designwechsel, Dialog ohne Zugangsdatenfelder und bestehendes Formular bei
deaktiviertem Worlds-Modus. Dies ist kein produktiver Provider-/Migrationsnachweis.

Aktuelle read-only Produktion: 3 Auth-Konten, davon eines verifiziert und eines
mit aktiver Sitzung; 515 Beiträge, ein Admin-Grant, keine Heft-/Fortschrittszeilen.
Keine Konten oder Anmeldedaten kopiert, keine produktiven Zuordnungen geschrieben.
Offen: tatsächliche zentrale Übernahme aller Eigentümer, Beiträge-/Admin-Autorisierung,
Providerfehler als vollständige Dokumentansicht und projektübergreifender Logout.
Vor produktiver Aktivierung sind eigene Sicherung, echte SSO-/Daten-/Rollenabnahme
und validierte Rücknahme erforderlich. Vollständige GitHub-CI `42514779942` und echte separate QA-Integration
`42514846060` für Anwendungscommit `9d46f15` erfolgreich. Migrationen, Persistenz,
Rechtetrennung und vorhandenes Managed Auth sind im isolierten Ziel geprüft;
dies ersetzt die noch offene zentrale Produktionsmigration nicht.

## Worlds-SSO: Datenbankbasis im Testzweig (5. November)

Nachprüfung 07.11.2026. Das versionierte gemeinsame Auth-Paket ist auf
`auth-v0.1.1` mit Quellrevision
`386bd19de441b8ecf9453ba5d592a3b5b40843dc` aktualisiert. Der Client
fordert den frischen Login über `max_age=300` an und validiert den
signierten Anmeldezeitpunkt. Der reale Hub-QA-Anbieter bestätigte aktuelle
und ältere Sitzungen mit positivem Zeitfenster. 195 Tests, Typprüfung,
Lint, Übersetzungsabdeckung, Build und vollständiger Dependency-Audit
bestanden. Die reale Browserabnahme in Sprachwelten bleibt offen.

Migration `027_worlds_identity.sql` auf `feature/worlds-hub-sso` ergänzt private
OIDC-Sitzungen, einmalige Nachweise und die eindeutige Zuordnung von OIDC-Aussteller
und Subject zur vorhandenen Neon-Auth-UUID. Die Zuordnung verwendet einen
Fremdschlüssel auf das verwaltete Konto. Das Audit speichert die lokale UUID auch
nach einer Kontolöschung. Rollen bleiben in `app_admins`.

Im befristeten Neon-QA-Branch `br-falling-recipe-bawlzpit` liefen alle 27
Migrationen. Ein echtes synthetisches Managed-Auth-Konto behielt seine UUID und
den Zugriff auf sein privates Testheft. Tests bestätigten Ausstellertrennung,
fehlende Adminrechte, die Ablehnung unbekannter UUIDs und Rollback bei Konflikten.
Die isolierten Lern-, Heft-, Spielraum-, Redaktions- und Managed-Auth-Tests sowie
193 Unit-Tests, Typprüfung, Lint, Übersetzungsabdeckung und Build bestanden.
Die unveränderten Worlds-Postgres-Adapter bestanden auf demselben Schema
konkurrierenden Proof- und State-Verbrauch, einen einzelnen Audit-Eintrag,
Replay-Schutz und auf den Aussteller begrenzten Sitzungswiderruf. Die
OIDC-Nachweise in dieser Adapterprüfung waren synthetisch.

Die Branch-CI meldete `GHSA-g3hv-75wg-m249` im Entwicklungswerkzeug `minimatch`.
Die betroffene 10er-Version ist gezielt auf 11.0.1 angehoben. Vollständiger Audit,
Lint, Typprüfung, 193 Unit-Tests und Build liefen mit dem neuen Lockfile durch.

Offen sind die OIDC-Routen, die Anbindung des gemeinsamen Auth-Moduls und die
echte Bestätigung beider Konten. Die Migration lief ausschließlich im QA-Projekt.

## Veröffentlicht – Passwort statt Profilbild; Mail-Freigabe extern offen

Branch `feature/account-email-password`, Basis `c795bce`. Profilbild-Eingabe/
Vorschau entfernt; bestehende Auth-Bildmetadaten werden nicht gelöscht. Profil-
Namensänderung akzeptiert ausschließlich den Namen. Passwortänderung mit aktuellem
Passwort, Wiederholung, 8–128 Zeichen, zwingender Abmeldung anderer Sitzungen;
Passwörter nur im Arbeitsspeicher und nach Erfolg/Abbruch gelöscht.
Eigener Mailwechsel über native Neon-OTP-Endpunkte mit gebundener Zieladresse,
Bestätigungscode, Wiederholen/Abbruch und ausdrücklicher Fehleranzeige. Direkte
E-Mail-/Rollen-/Zielkontoänderung über `update-user` bleibt verboten. Alle neuen
Mutationen haben Sitzungs-, Origin-, Größen- und Schemaprüfung inklusive Pfadaliassen.

193 Unit-Tests, 10 gezielte Desktop-/Mobilfälle, Typprüfung, Lint, DE/EN-Abdeckung,
Audit ohne Befund und Build bestanden. Echte isolierte Auth-Prüfung in
`br-long-sky-batt1ulp`: falsches aktuelles Passwort, tatsächlicher Passwortwechsel,
altes Passwort ungültig, neues Passwort gültig, andere Sitzung widerrufen, eigene
Identität/Sitzung/Logout erhalten. Synthetische `.invalid`-Konten nur in ablaufender QA.
Keine produktiven Konten geändert. QA-Zweig läuft automatisch nach einer Stunde ab.

**Externe Einschränkung Mailwechsel:** QA-Dienst antwortet tatsächlich mit HTTP 400
„Change email with OTP is disabled“. Es gibt in Neons dokumentiertem OpenAPI-/CLI-
Konfigurationsmodell kein Feld für `emailOTP.changeEmail.enabled`. Nicht durch SQL,
eigene OTPs oder einen sofortigen ungeprüften Mailwechsel umgehen. Benutzerlogin im
richtigen Projekt anschließend erfolgt; QA-Konsole unter `settings/auth` vollständig
lesend geprüft: kein Mailwechsel-Schalter vorhanden. Keine Auth-Einstellung verändert.
Produktive Freischaltung und echte OTP-Zustellung/Bestätigung nicht als geprüft ausweisen.

Benutzer hat QA-Aktivzeit **7200 Sekunden** ausdrücklich freigegeben; per Neon
angewendet. Compute-Limit weiterhin 1800 Sekunden, maximal 0,25 CU, 200 MiB.
Keine Produktionsquoten geändert. Frühere Aktivgrenze 3600 führte zu „quota exceeded“.

Code `760d2bc4d156513e2aac3c0526364690377dfc20` auf GitHub main.
Beide CI-Läufe erfolgreich: **193 Unit-Tests, 154 vollständige Desktop-/Mobilfälle**,
Typprüfung, Lint, Übersetzungsabdeckung, Audit und Build; echte isolierte Integration
inklusive Passwort-/Sitzungsabläufen:
- Checks: https://github.com/manuelk2607/Sprachwelten/actions/runs/40969002564
- Integration: https://github.com/manuelk2607/Sprachwelten/actions/runs/40969002439

Bestehender Cloudflare-Worker veröffentlicht, Version
**e34f209b-b017-4cc2-b51d-b96ac84726f5**. Datenbank-/Auth-Produktionsziel vor Veröffentlichung
bestätigt; keine Migration (026 bleibt), keine Änderung produktiver Konten oder
Passwörter. Bestehende Bindings, Secrets und Cron erhalten.
Live bestätigt: Profil 200/noindex; Passwort-/Mailanforderung-/Mailbestätigungs-
Endpunkte und kodierter Pfadalias anonym 401/no-store; anonyme Managed-Auth-Sitzung
200/null. Keine Mail angefordert und keine Credentials produktiv geändert.
Protokoll `/private/tmp/sprachwelten-account-live.log`.

**Nächster konkreter Schritt extern:** Neon zur Freischaltung von
`emailOTP.changeEmail.enabled` im vorhandenen Managed-Auth-Projekt befragen; siehe
`docs/account-settings-2026-10-29.md`. Konsole/API bieten aktuell keinen Schalter.
QA meldet HTTP 400 „Change email with OTP is disabled“; produktive Freischaltung
sowie echte Codezustellung/-bestätigung nicht nachgewiesen. Keine SQL-Umgehung,
keine selbst erfundenen OTPs, keine neue Organisation oder Auth-Migration beginnen.
Passwort- und Bildentfernungs-Paket ist abgeschlossen; keine Wiederholung nötig.

## Abgeschlossen – Profil, Prüfstatus und SEO (29. Oktober)

Branch `feature/profile-review-seo-20261029`, Basis `5d8481c`. Profilseite mit
Anzeigename/optionalem HTTPS-Bild, Speichern/Abbrechen/Fehlerfeedback; vorhandenen
Managed-Auth-Updateweg serverseitig auf eigenes Konto und erlaubte Felder begrenzt.
Keine Schemaänderung und keine Änderungen an Beiträgen/Fortschritten. Bestehende
UI-/Lernsprachpräferenzen bleiben getrennt; keine neue redundante Spracheinstellung.
Prüfstatus unbewertet/Entwurf/geprüft/veraltet präzisiert, Spielstufen beschriftet
mit Einstieg/Mittel/Fortgeschritten und redaktionellen Kriterien. Normale Beiträge
und Spiele bleiben ohne Pflichtmoderation offen. Bestehende 20-Karten-Grenze bleibt.

Testkonto: Benutzer meldet manuelle Löschung bzw. erneut „branch not found“ in Neon.
Lesender SQL-Abgleich am 29. Oktober findet die bekannte UUID **noch einmal**.
Keine Löschung versucht. Daher nicht als nachweislich entfernt markieren.
Separates QA-Projekt erklärt; Benutzer hat ausdrücklich **Behalten** bestätigt.

190 Unit-Tests, Typprüfung, Lint, DE/EN-Abdeckung, Audit ohne Befund und Build
erfolgreich. Gezielte Desktop-/Mobilregression 22/22 einschließlich Profil,
Adminstatus und Sprach-/Stufenfiltern; zusätzliche Profil-noindex-Prüfung 4/4.
Doppelte Live-Region der statischen Statusanzeige korrigiert.
SEO-Liveprüfung umfasst 32 öffentliche Seiten und private noindex-Routen.
Wurzel-URL mit/ohne abschließenden Slash ist gleichwertig; Testnormalisierung korrigiert,
keine unbegründete Canonical-Änderung. Keine erneuten Google-Indexierungsanträge.
Google: 30 nicht indexierte Seiten gemeldet, Überprüfung bereits beantragt;
Detailgründe und Ergebnis nur in Search Console sichtbar, keine 30 technischen Fehler behaupten.

Code `c651aacea0d627ec5cdc66b2809a34a4e1f29456` auf GitHub main.
Beide CI-Läufe erfolgreich, einschließlich 190 Unit-/148 Desktop-/Mobilfällen
und echtem isoliertem Managed-Auth-Profilupdate:
- https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391881
- https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391814

Veröffentlicht auf bestehendem Worker:
**60a6599a-04c8-420d-bfdb-e45ff97e3971**.
Keine neue Datenbankmigration, Schema bleibt 026. Bestehende Secrets, Auth-Ziel,
Inhalte, Lernstände, Rechte, R2/AI, Rate-Limits, Google-Tag und Cron erhalten.

Live-Prüfung bestanden: alle 32 öffentlichen Seiten mit 200, konsistenten Canonicals,
passenden DE/EN-hreflang-Zielen, Titel/Beschreibung und ohne noindex; Sitemap und
robots korrekt. Profil, eigene Beiträge, Admin und Raumseite noindex und nicht in
Sitemap. Anonyme Profiländerung (auch kodierter Pfadalias) 401/no-store, anonyme
Managed-Auth-Sitzung 200/null; keine ungeprüften Spielstufen freigegeben.
Echte Profiländerung ausschließlich in isolierter QA geprüft (Identität erhalten),
Browserprüfungen mit kontrollierten HTTP-Antworten; keine produktiven Konten verändert.
Keine KI-Aufrufe und keine Google-Indexierungsanträge.

**Nächste Schritte ausschließlich extern:** Neon-Verwaltungsfehler beim eindeutig
identifizierten alten Testkonto klären (keine erneute Löschung versuchen), laufende
Search-Console-Überprüfung abwarten; autorisiertes QA-Postfach für echte OTP-Zustellung
bereitstellen und belegte redaktionelle Einstufungen erfassen. Keine erneute
Implementierung des Profils/Prüfsystems oder pauschale SEO-Änderungen beginnen.
Der folgende Abschnitt dokumentiert den vorherigen Release vom 28. Oktober.

## Auftrag – technisch umsetzbares Paket abgeschlossen

Restaufgaben gezielt abschließen, funktionierende Features und Produktionsdaten
bewahren. Feature-Branch `feature/editorial-qa-20261028`, Ausgangspunkt `28ad357`.
Nur `manuelk2607/Sprachwelten`; veröffentlichen ausschließlich mit
`npm run deploy:cloudflare` auf https://sprachwelten.maki26.workers.dev/.
Historie: [Archiv](docs/progress-archive-2026-10-27.md).

## Neu abgeschlossen

- Separates, leeres QA-Projekt `polished-wind-59150518`, Auth-Template
  `br-damp-glitter-baqvjq5l`. Projektspezifischer Schlüssel im GitHub-Environment
  `qa`, Produktionszugriff damit ausdrücklich verweigert. CI-Variablen aktiv.
  Maximal 0,25 CU, Quoten 1.800 Compute-/3.600 Aktivsekunden, 200 MiB.
  Keine Produktionsdaten/Benutzer exportiert; Template leer lassen.
- Erster **echter isolierter CI-Lauf erfolgreich**:
  https://github.com/manuelk2607/Sprachwelten/actions/runs/40728056912
  Migrationen, Lern-/Heft-/Spielpersistenz und Managed Auth einschließlich
  Registrierung, Passwortfehler, Sitzung, Abmeldung und Replay bestanden.
- Migration **026_editorial_difficulty.sql**: separate revisionsgebundene
  Einstufungen und Historie; Admin-Verwaltung mit Quellen, Datum, Begründung und
  ausdrücklicher fachlicher Freigabe. Parallele/veraltete Änderungen geschützt;
  Inhaltsänderung oder Widerruf invalidiert die Freigabe.
- Durchgängige optionale Spielstufen in Pool, Raum, Lobby und Startformular.
  Nur bei mindestens 20 aktuellen Fachfreigaben je Sprache/Kategorie/Stufe;
  SQL-Filter vor Stichprobe und Engine-Filter. Kategorie/Sprachwechsel löscht,
  reine Rundenzahländerung und direkte Folgepartie erhalten die Auswahl.
  CEFR separat; freie Wortketten/False Friends ohne irreführende Stufen.
  **Keine produktiven Fachfreigaben erzeugt.** Siehe
  [editorial-difficulty.md](docs/editorial-difficulty.md).
- Neue synthetische Integrationssuite in CI: 20-Karten-Grenze, Sprach-/Kategorie-
  trennung, echter Pool, Punkte/Folgepartie, konkurrierende Revisionen, Widerruf,
  Inhaltsänderung/Löschung und Historie. Eigene Fixtures werden bereinigt.
- Neue Auditbefunde: Better Auth auf zusammengehörige 1.7.14-Pakete, better-call
  1.4.4/better-fetch 1.3.3 und Mail-Renderer 2.2.0 aktualisiert; letzterer entfernt
  indirektes deepmerge. Keine Audit-Ausnahme. Installation, Typprüfung, Lint, 186 Unit-Tests, Übersetzungen, vollständiger Audit
  und Offline-Build erfolgreich; Browserfälle erfolgreich; vollständige CI 144/144.
  Nicht behaupten, dass damit Neons unabhängig verwalteter Auth-Dienst aktualisiert wurde.
- Veraltete regionale/QA-Notizen abgeglichen. Zwei Mehrspieler-Browsertests erhalten
  realistische Zeitgrenzen für vorhandene Wheel-/Polling-/Abstimmungsphasen.

## Verifikation dieses Pakets

- Isolierte QA `br-wandering-breeze-baxn3n3e` (automatischer Ablauf 28. Oktober,
  22:37 UTC): **alle 26 Migrationen**, echte Lern-/Heft-/Multiplayer-Suiten sowie
  redaktionelle Integrationssuite und echtes Managed Auth bestanden.
  Eigene Anwendungsfixtures bereinigt; synthetische Auth-Identität verbleibt nur
  bis Branchablauf. Keine regulären Konten, Adminrechte oder Produktionsdaten verändert.
- Vor abschließendem Abhängigkeitsupdate: 185 Unit-Tests bestanden; danach ein
  zusätzlicher Zielsprachen-/SQL-Test ergänzt. Typprüfung, Lint, DE/EN-Abdeckung
  und Offline-Build bestanden.
- Gesamtbrowserlauf: 142/144 bestanden; beide fehlgeschlagenen Mehrspielerfälle
  gezielt erneut erfolgreich (3/3), einschließlich Glücksrad, Wortkette und
  reduzierter Bewegung. Admin-Einstufung und Stufenauswahl DE/EN auf Desktop/Mobil
  bestanden. Kontrollierte HTTP-Antworten, keine echten KI-Aufrufe.
- Nach installiertem Abhängigkeitsupdate: Typprüfung, Lint, **186/186 Unit-Tests**,
  Übersetzungsabdeckung, vollständiger Audit ohne Befund und Offline-Build bestanden.
  Lokal Desktop/Mobil 143/144; ein Mobilfall durch parallele Build-/HMR-Neuladungen
  unterbrochen, anschließend separat 1/1 erfolgreich. Abschließende sequenzielle
  GitHub-CI vollständig erfolgreich: **144/144 Desktop-/Mobilfälle**.

## Veröffentlichung abgeschlossen

Code `13b4705b721c23f9217d7d4fd086bd43ea5f68bc` auf GitHub main.
Beide CI-Läufe erfolgreich:
- Checks: https://github.com/manuelk2607/Sprachwelten/actions/runs/40775570137
- Echte isolierte Integration: https://github.com/manuelk2607/Sprachwelten/actions/runs/40775570160

Produktionsziel `calm-tooth-60944868` / `br-delicate-field-b96d9qc4`,
`sprachspiel`. Migration **026** transaktional angewendet und protokolliert.
Vorher/nachher unverändert: **452 Beiträge, ein Administratorgrant, vier Auth-Konten,
24 Lernbeiträge**. Neue Einstufungs-/Historientabellen leer: keine Freigaben erzeugt.
Worker erfolgreich veröffentlicht: **a4fb5a83-7ebd-49b9-9965-b9437a9c2737**.
Bestehende Secrets, Auth-Ziel, R2, AI, Rate-Limits, Google-Tag und Cron erhalten.

Live bestätigt: DE/EN-Spiel-/Lernseiten 200; Sprachverfügbarkeit und versteckte
Stufen ohne Freigaben; echte anonyme Managed-Auth-Sitzung; Admin-/eigene Beiträge/
Hefte anonym 401; neue redaktionelle GET-/PUT-Route anonym 401. Erzwungene
unfreigegebene Stufe scheitert mit 422 vor Raumerstellung. Beide Vokabelrichtungen
weiterhin zehn Karten, `no-store`; Sitemap 32 öffentliche Seiten, robots 200.
Keine produktiven Testkonten, Beiträge, Hefte, Partien, Antwortabgaben oder KI-Aufrufe.
Echter Passwort-Login nur in QA geprüft, produktiver Passwort-Login/OTP nicht
als geprüft ausweisen. Vollständiges Live-Protokoll lokal:
`/private/tmp/sprachwelten-live-20261028.log`.

**Nächster konkreter Schritt:** autorisiertes erreichbares QA-Postfach für OTP
bereitstellen; die Abweichung beim alten Testkonto durch Neon klären. Danach fachliche Inhalte prüfen und ausreichend echte
Einstufungen erfassen. Keine erneute Grundlagenanalyse oder Kern-Neuimplementierung.

## Bereits vollständig vorhanden – nicht erneut implementieren

- Persönliche Vokabelhefte mit Verwaltung, Suche, Übungen, expliziten Sprachpaaren,
  kontrollierter Rückrichtung, konten-/richtungsgetrennter dauerhafter SRS und Statistik.
- Getrennte Lern-/Spielbeiträge, Grammatikmodule/Themenfilter, sprachspezifische
  Bewertung (auch Türkisch), gespeicherte akzeptierte Varianten, private Antworten.
- Mehrsprachenauswahl, Zungenbrecher-Glücksrad/Peer-Punkte, freie Wortketten mit
  Buchstabenprüfung und menschlicher Sinnbewertung; kein KI-Aufruf.
- Multiplayer-Replay-/Versionsschutz, Heartbeats, Hostwechsel und gleiche Räume
  für neue Spiele/Kategorien, keine Wiederverwendung bereits gespielter Karten.
- „Zur Spielesammlung“ führt DE/EN zur Spieleübersicht. Frühere Lern-/Layout-
  Verbesserungen und zwei zusätzliche A1-Grammatikmodule bereits veröffentlicht.
- SEO 32 öffentliche Beschreibungsseiten, private Bereiche noindex und nicht in
  Sitemap. Frühere vollständige CI: 183 Unit-/140 Browserfälle erfolgreich.

## Verbleibende externe Aufgaben / Grenzen

| Prio | Aufgabe | Nächster Schritt |
| --- | --- | --- |
| P1 | Altes QA-Konto `d8fb5e07-e5cd-4d8d-8841-f24d5aa5eaa7`: Benutzer meldet manuelle Löschung, Konsole meldet weiterhin „branch not found“. Lesender Abgleich 29. Oktober findet noch einen Auth-Datensatz. Keine erneute Löschung versucht. | Abweichung durch Neon prüfen lassen; Löschung noch nicht unabhängig bestätigt. |
| P1 | Echte OTP-Zustellung, Bestätigung und Ablauf ungetestet. Isoliertes Managed Auth funktioniert jetzt; frühere QA-Provisionierungsblockade ist erledigt. | Autorisiertes erreichbares Testpostfach bereitstellen; synthetische `.invalid`-Adressen ersetzen keinen Zustellungstest. Keine neuen Mailanbieter automatisch beauftragen. |
| P2 | Sechs Dialektkarten quellengeprüft, weiterhin `needsSpecialistReview`; noch keine ausreichenden fachlichen Spielstufensammlungen. | Sprachwissenschaftliche Freigabe und begründete Einstufungen beschaffen. Technische Verwaltung ist implementiert, keine Freigaben erfinden. |
| P3 | Search Console eingerichtet; Indexierungsstatus extern. | Im eigenen Google-Konto prüfen, keine wiederholten Indexierungsanfragen automatisieren. |

Keine bestätigte P0-Anwendungsstörung. Neue Auditbefunde sind behoben, vollständiger Audit ohne Ausnahme bestanden.
Weitere Skalierungsumbauten nur bei gemessenem Engpass. Sprachraum bleibt außerhalb.
