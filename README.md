# Hilversum kiest

De code en de gegevens achter **[hilversumkiest.nl](https://hilversumkiest.nl)**: een onafhankelijke stemwijzer en informatiesite voor de gemeenteraadsverkiezing van woensdag 18 november 2026 in de nieuwe gemeente Hilversum (Hilversum en Wijdemeren samen).

Wat er op de site staat:

- **Stemwijzer.** Je kiest zelf welke partijen en thema's meedoen en krijgt alleen stellingen waarop juist die partijen verschillen. Bij elk standpunt staan de nuance en de bron.
- **Partijen.** Alle twintig, met logo, speerpunten, standpunten en alle 347 kandidaten.
- **Vergelijken.** Een kaart van welke partijen inhoudelijk dicht bij elkaar staan; tik er twee tot zes aan en leg ze naast elkaar.
- **Stembureauvinder.** Een 3D-kaart van de hele gemeente met alle zestig stembureaus.
- **Verantwoording.** Hoe alles gemaakt is, en de uitkomst van de eerlijkheidstoets.

Het is een statische site zonder server. Bouwen kan met alleen Node; voor de kaart en de kandidaten zijn er Python-scripts (met `uv`).

## Bouwen en bekijken

```bash
node build.mjs
```

```bash
python3 -m http.server 4173 --directory dist
```

Een push naar `main` bouwt en publiceert de site via `.github/workflows/pages.yml`. Voor een eigen domein zet je de repository-variabele `DOMEIN`; zonder domein komt de site op het adres van de repository te staan.

## Zelf maken voor een andere verkiezing

De volledige opdracht om dit met een AI-assistent na te bouwen staat in [`data/prompt.md`](data/prompt.md) en op de pagina Zelf maken van de site. Ze verwijst naar deze repository als voorbeeld. De code, de opdrachten aan de hulpagenten en de werkwijze kun je hergebruiken; de stellingen, standpunten en gegevens over kandidaten gelden alleen voor deze verkiezing.

## Adressen, metadata en deelafbeeldingen

De pagina's: `/`, `/stemwijzer/`, `/partijen/` en `/partijen/<slug>/`, `/vergelijken/`, `/stemmen/`, `/stembureauvinder/`, `/verantwoording/` en `/zelf-maken/`. De oude adressen `/lijsten/…` en `/vergelijk/` sturen door naar de nieuwe, met wat achter `?` en `#` staat; ze staan niet in de sitemap en worden niet geïndexeerd. Verander je een adres, laat dan net zo een doorverwijzing staan (`doorverwijzing()` in `build.mjs`).

Elke pagina krijgt in `pagina()` een canoniek adres op https://hilversumkiest.nl, Open Graph, een Twitter-kaart en een eigen deelafbeelding van 1200 bij 630 (`src/assets/deel/`). Die afbeeldingen en het `apple-touch-icon` maakt `node tools/deelbeelden.mjs` met Playwright, lokaal; de teksten erop staan in `data/deelbeelden.json`. Draai het opnieuw als een partij, logo of lijsttrekker verandert, en zet de afbeeldingen in de repository: de bouwstap op GitHub heeft geen browser. `node build.mjs` schrijft ook `sitemap.xml` en `robots.txt`.

## Hoe de standpunten tot stand komen

| Stap | Waar | Wat |
|---|---|---|
| Bronnen | `bronnen/<partij>/` | Het programma, eigen antwoorden in andere stemhulpen en een overzicht met citaten |
| Stemgedrag | `bronnen/_stemgedrag/` | 120 nagelopen raadsstemmingen uit 2022 tot 2026 |
| Verkiezing | `bronnen/_verkiezing/` | Praktische informatie, de stembureaus en de officiële kandidatenlijsten |
| Stellingen | `werk/themas/` → `tools/maak_basis.mjs` → `data/stellingen-basis.json` | Mogelijke stellingen per thema en de eindselectie |
| Ronde 1 | `werk/codering/A/` | Per partij het hele programma gelezen, een positie op elke stelling |
| Ronde 2 | `werk/codering/B/` | Per thema alle partijen naast elkaar |
| Ronde 3 | `werk/codering/C/` | Verschillen tussen ronde 1 en 2 beslecht, terug naar de bron |
| Ronde 4 | `werk/audit/` | Per stelling nagegaan of gelijke standpunten gelijk scoren |
| Feitencheck | `werk/feitencheck/` | De uitleg bij elke stelling gecontroleerd tegen officiële en lokale bronnen |
| Eindredactie | `data/redactie.json` | Geschrapte en herschreven stellingen, met reden |
| Samenvoegen | `node tools/voeg_samen.mjs` → `data/stellingen.json` | Alle rondes tot één bestand |
| Toets | `node tools/toets.mjs` → `data/toets.json` | De eerlijkheidstoets |

De letterlijke opdrachten aan de hulpagenten staan in `werk/briefs/`. De rekenkern (`src/engine.mjs`) wordt door de browser en door de toets gebruikt. Na een wijziging in standpunten of stellingen:

```bash
node tools/voeg_samen.mjs && node tools/toets.mjs --stil && node build.mjs
```

## Kandidaten en logo's

| Stap | Waar | Wat |
|---|---|---|
| Officiële lijsten | `bronnen/_verkiezing/kandidaten.json` | Alle kandidaten uit Gemeenteblad 2026, nr. 499712 |
| Ronde A | `werk/briefs/kandidaten.md` | Per partij foto, beschrijving en LinkedIn zoeken, elk met bewijs |
| Ronde B | `werk/briefs/kandidaten-controle.md` | Onafhankelijke controle op de bron; alleen wat hier bevestigd is, komt op de site |
| Eindredactie | `data/kandidaten-redactie.json` | Besluiten over twijfelgevallen, met reden |
| Samenvoegen | `python3 -I tools/maak_kandidaten.py` → `data/kandidaten.json` | Voegt samen, verkleint de foto's en weigert dezelfde foto of hetzelfde profiel bij twee mensen |
| Logo's | `data/logos.json`, `src/assets/logos/` | Van de site van de partij, of van Wikimedia Commons |

Een foto, beschrijving of LinkedIn-link staat er alleen bij als die zeker bij de persoon hoort. Is er geen foto, dan toont de site een getekend figuurtje.

## De stembureauvinder

De kaart wordt in de browser getekend (`src/assets/js/kaart3d.js`, met three.js) en staat op de site zelf: er worden geen kaartbeelden bij anderen opgehaald. De opzet is afgekeken van [isometric-helenaveen](https://github.com/jankeesvw/isometric-helenaveen) van @jankeesvw, met dezelfde open gegevens, maar hier niet vooraf tot plaatjes gemaakt, zodat je kunt draaien en naar een platte kaart kunt wisselen.

| Stap | Opdracht | Wat |
|---|---|---|
| Ophalen | `uv run tools/kaart/haal.py` | Gebouwen uit 3D BAG en de ondergrond uit OpenStreetMap, naar `bronnen/_kaart/raw/` |
| Bouwen | `uv run tools/kaart/bouw.py` | De kaartlagen in `src/assets/kaart/`, en elk stembureau gekoppeld aan zijn gebouw |
| Modellen | `uv run tools/kaart/modellen.py` | De 3D-modellen van trein, zeilboot, hert en eend omgezet naar het kaartformaat |

De kaart laadt in lagen, afhankelijk van hoe ver je bent ingezoomd, en alleen wat in beeld is:

- `basis.bin.gz` (ongeveer 600 kB, altijd): de hele gemeente vereenvoudigd, met hoofdwegen, plaatsnamen en de stembureaus als rood gebouw.
- `m/` (blokken van 1 km, samen 5 MB): grond en wegen in detail, straatnamen, bomen en elk gebouw als blok.
- `h/` (blokken van 500 m, samen 18 MB): elk gebouw met zijn dakvorm.

Verder: schaduwen, ramen, treinen die over doorgaande routes rijden en op de stations stoppen, zeilboten op de plassen, herten op de hei en eenden in de vijvers. Met `/stembureauvinder/?kaartmeet` is de kaart vanuit de console te sturen en na te meten.

## Wat wel en niet in de repository staat

De gedownloade programma's en volledige teksten van partijen (`bronnen/*/origineel/`, `programma.txt`, `extra-*.txt`) staan er niet in: het zijn stukken van de partijen zelf. De site gebruikt alleen korte citaten met bron. Ook de ruwe kaartgegevens (`bronnen/_kaart/raw/`) en de aantekeningen over personen uit het zoekwerk naar kandidaten (`werk/kandidaten/A` en `B`) ontbreken. De gebouwde kaartlagen staan er wel in, want de site wordt daaruit gebouwd.

## Bronnen en licenties van de gegevens

- Gebouwen: 3D BAG, TU Delft en 3DGI, CC BY 4.0.
- Ondergrond: © OpenStreetMap-bijdragers, ODbL.
- Grenzen en adressen: PDOK (Kadaster).
- 3D-modellen: Quaternius (CC0) en Poly by Google (CC BY 3.0); zie `bronnen/_kaart/modellen/LICENTIES.md`.
- Logo's en portretten zijn van de partijen en de kandidaten zelf. Ze staan hier om kiezers te informeren.

## Maker

Gemaakt door [Paul Tondeur](https://www.linkedin.com/in/paultondeur/), inwoner van Hilversum. Zie je iets wat niet klopt, meld het dan via de [issues](https://github.com/PaulTondeur/hilversumkiest/issues).
