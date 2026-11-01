# Profil, redaktioneller Status und SEO – 29. Oktober 2026

## Profil

`/profile` ist eine private, mit noindex versehene Kontoseite. Der bestehende
Anzeigename (weiterhin bis 60 Zeichen) und die optionale HTTPS-Bildadresse werden
über Neons vorhandenes `updateUser` gespeichert. Es gibt keinen neuen Kontotyp,
keine neue Benutzertabelle und keine Übernahme fremder Beiträge. Bilddateien werden
nicht serverseitig heruntergeladen. Die eigene Vorschau unterdrückt Referrer;
externe Bildanbieter erhalten dennoch die IP-Adresse des Betrachters.

Der bestehende Auth-Proxy validiert Profiländerungen serverseitig: eigene verwaltete
Sitzung, gleiche Origin, begrenztes JSON, strikt nur Name/Bild, keine Ziel-Benutzer-ID,
E-Mail, Rolle oder Rechtefelder. Cookies des SDK werden durchgereicht; die UI nutzt
dessen Sitzungserneuerung. Abbrechen stellt den zuletzt gespeicherten Zustand wieder
her; fehlgeschlagene Speicherung behält die Eingabe. E-Mail ist privat und schreibgeschützt.
Beitrags-Credits werden nicht automatisch durch den neuen Namen ersetzt.

Vorhandene Sprach-/Darstellungspräferenzen bleiben in der Menüleiste; Lernsprachpaare
im Lernbereich. Keine zweite Erklärungssprache und kein redundantes Einstellungsmodell.

## Redaktionelle Einstufung

Migration 026, revisionsgebundene Speicherung, Admin-Rechte, Widerruf und SQL-/Engine-
Filter waren bereits veröffentlicht. Ergänzt wurden ausdrückliche Statusanzeigen
(unbewertet, Entwurf, geprüft, erneute Prüfung) und Stufenbeschreibungen:
Einstieg, Mittel, Fortgeschritten. Gespeicherte IDs ändern sich nicht.
Die Kriterien beschreiben Vertrautheit/Kontext/regionale Feinheiten, keine Textlänge.

Ungeprüfte Beiträge bleiben in normalen Spielen verwendbar. Auch Gäste können
weiter beitragen; die Fachprüfung ist keine verpflichtende Vorabmoderation.
Die bestehende Grenze von 20 echten aktuellen Freigaben je Kategorie/Sprache/Stufe
bleibt wirksam. Es wurden keine Inhalte oder Fachfreigaben künstlich erzeugt.

## SEO / Google

Der reproduzierbare Live-Check `node --import tsx scripts/check-live-seo.mts` prüft
32 öffentliche URLs: 200, Canonical, DE/EN-hreflang, Titel/Beschreibung, keine
noindex-Regeln sowie Sitemap/robots. Private Profil-, Verwaltungs-, Beitrags- und
Raumseiten bleiben noindex und außerhalb der Sitemap. Vor Veröffentlichung der
Profilroute kann `--before-deploy` deren noch nicht vorhandene URL überspringen.

Das öffentliche SEO benötigt nach aktuellem Befund keine Konfigurationsänderung.
Root-URLs mit/ohne abschließendem Slash werden für den Vergleich normalisiert;
dies ist kein nachgewiesener Canonical-Fehler. robots erlaubt das Lesen privater
Seiten, damit Google deren noindex erkennen kann; `/api/` bleibt ausgeschlossen.

Der Nutzer meldet 30 nicht indexierte Seiten und hat eine Überprüfung beantragt.
Die Detailgründe wurden nicht aus Search Console abgerufen: bewusst ausgeschlossene
private URLs, noch nicht aufgenommene öffentliche URLs und echte Fehler sind getrennt
zu beurteilen. Kein neuer Indexierungsantrag und keine Behauptung, alle 30 seien Fehler.

## QA-Konto

Kein erneuter Löschversuch. Die bekannte UUID ist trotz gemeldeter manueller Löschung
noch im verwalteten Auth-Schema sichtbar; Nutzer bestätigt „branch not found“ auch
in der Konsole. Daher bleibt die Löschung unabhängig unbestätigt. Keine SQL-Umgehung.
Das separate QA-Projekt bleibt nach ausdrücklicher Nutzerentscheidung erhalten.

## Abschluss

Code `c651aacea0d627ec5cdc66b2809a34a4e1f29456`, veröffentlicht auf dem bestehenden
Worker, Version `60a6599a-04c8-420d-bfdb-e45ff97e3971`. Keine neue Migration (026 bleibt).
190 Unit-Tests, 148 vollständige Desktop-/Mobilfälle, Typprüfung, Lint,
Übersetzungsabdeckung, Audit ohne Befund und Build erfolgreich. Echte isolierte
Neon-Integration einschließlich Profilupdate, Identitätserhalt, Sitzungen/Logout
und bisheriger Daten-/Spielpersistenz erfolgreich. UI-Browserfälle verwenden
kontrollierte Antworten; keine produktive Profiländerung oder OTP-Zustellung getestet.

CI: https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391881
Integration: https://github.com/manuelk2607/Sprachwelten/actions/runs/40850391814

Abschließender reproduzierbarer Live-SEO-Test einschließlich Profil-noindex bestanden.
Anonyme Profilmutationen sowie kodierte Aliasse 401/no-store; keine künstlichen
Freigaben oder Produktivkonten angelegt. Bestehende Bindings/Secrets unverändert.
