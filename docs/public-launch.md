# Sprachwelten öffentlich auffindbar machen

Die aktuelle Hauptadresse ist https://sprachwelten.maki26.workers.dev/. `lib/site.ts` ist die zentrale Quelle für Canonical-URLs, Sitemap und Linkvorschauen.

## Technische Basis

- `/` und `/en` sind die deutschen/englischen Startseiten.
- `/spiele` und `/en/games` verlinken alle 13 aktuellen Spielvarianten. Jede Anleitung hat eine eigene URL, serverseitig sichtbare Regeln, einen eigenen Titel, eine Beschreibung und gegenseitige `hreflang`-Links. Es werden keine Datenbankbeiträge oder Quizlösungen geladen.
- `/sitemap.xml` enthält ausschließlich die 32 öffentlichen Seiten einschließlich `/lernen` und `/en/learn`. `/robots.txt` nennt die Sitemap; API-Endpunkte werden nicht zum Crawlen angeboten.
- Konto-, Admin- und Raumseiten liefern `noindex`. Das ergänzt die bestehenden Zugriffskontrollen und ersetzt sie nicht.
- Open Graph und Twitter Cards verwenden eigene DE/EN-PNG-Vorschaubilder mit 1200 × 630 Pixeln. `node --import tsx scripts/generate-social-preview.mts` erzeugt sie aus dem vorhandenen Design neu.

## Google Search Console

1. Öffne https://search.google.com/search-console/ mit deinem gewünschten Google-Konto.
2. Lege die **URL-Präfix-Property** `https://sprachwelten.maki26.workers.dev/` an. Für die fremde Hauptdomain `workers.dev` kann keine eigene DNS-Bestätigung eingerichtet werden.
3. Wähle **HTML-Tag**. Übernimm ausschließlich den öffentlichen `content`-Wert des `google-site-verification`-Tags als `GOOGLE_SITE_VERIFICATION` in der lokalen, ignorierten `.env.local`. Keine Google-Zugangsdaten speichern.
4. Build und `npm run deploy:cloudflare` ausführen. Der Runner überträgt den optionalen Code als Worker-Variable und erhält bestehende Einstellungen. Prüfe anschließend, dass der Tag im HTML-Quelltext der Startseite enthalten ist. Der Tag muss für spätere Google-Prüfungen erhalten bleiben.
5. Klicke in Search Console auf **Bestätigen**. Reiche unter **Sitemaps** die Adresse `https://sprachwelten.maki26.workers.dev/sitemap.xml` ein. Über **URL-Prüfung** kann die Indexierung der Startseite beantragt werden.

Der vom Kontoinhaber gelieferte Bestätigungstag ist bereits veröffentlicht. Sitemap
und öffentliche Seiten wurden live erfolgreich abgerufen. Der verbleibende manuelle
Schritt ist die Kontrolle des Indexierungsstatus in Search Console, gegebenenfalls
nach Ablauf des Google-Kontingents. Keine erneute Website-Verifizierung oder
automatischen Indexierungsanfragen ohne Bedarf. Eine Sitemap garantiert keine
Aufnahme oder Position. [Google-Anleitung zur Bestätigung](https://support.google.com/webmasters/answer/9008080?hl=en-GB), [Indexierung beantragen](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Danach

- Echte, hilfreiche Beschreibungen und passende Community-Beiträge ergänzen. Spiele dürfen gern über persönliche Kontakte, passende Gruppen und eigene öffentliche Profile geteilt werden; keine automatischen Werbeposts.
- In Search Console beobachten, welche Seiten indexiert werden und über welche Suchbegriffe Besucher kommen.
- Eine eigene Domain ist optional. Cloudflare empfiehlt für Produktionsprojekte eine eigene Domain beziehungsweise Route. Vor einem Wechsel Domain auswählen/registrieren, Neon-Auth-Origin freigeben, `site.url` und Worker-Routing gemeinsam umstellen und die alte Adresse gezielt weiterleiten. Vorhandene Räume und Beiträge behalten. [Cloudflare-Hinweise](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
