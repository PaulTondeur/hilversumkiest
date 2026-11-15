# Hilversum kiest

Onafhankelijke stemwijzer en informatiesite voor de gemeenteraadsverkiezing van 18 november 2026 in de nieuwe gemeente Hilversum (Hilversum + Wijdemeren). Statische site, geen backend, geen afhankelijkheden behalve Node.

## Bouwen en bekijken

```bash
node build.mjs
```

```bash
python3 -m http.server 4173 --directory dist
```

Voor een adres met een submap (bijvoorbeeld `gebruiker.github.io/hilversumkiest/`): `BASIS=/hilversumkiest/ node build.mjs`. Met een eigen domein: `DOMEIN=hilversumkiest.nl node build.mjs` (schrijft ook `CNAME`). De workflow in `.github/workflows/pages.yml` doet dit vanzelf bij een push naar `main`.

## Hoe de inhoud tot stand komt

| Stap | Waar | Wat |
|---|---|---|
| Bronnen | `bronnen/<lijst>/` | Programma (origineel en tekst), eigen antwoorden in andere stemhulpen, digest met citaten |
| Stemgedrag | `bronnen/_stemgedrag/` | 120 geverifieerde raadsstemmingen 2022–2026, fractiegeschiedenis |
| Verkiezing | `bronnen/_verkiezing/` | Praktische informatie en 60 stembureaus met coördinaten |
| Stellingen | `werk/themas/<thema>/kandidaten.json` → `tools/maak_basis.mjs` → `data/stellingen-basis.json` | Kandidaten per thema, eindselectie |
| Ronde 1 | `werk/codering/A/<lijst>.json` | Per lijst: heel programma gelezen, positie op elke stelling |
| Ronde 2 | `werk/codering/B/per-stelling.json` | Per thema: alle lijsten naast elkaar |
| Ronde 3 | `werk/codering/C/<lijst>.json` | Beslechting van verschillen, terug naar de bron |
| Ronde 4 | `werk/audit/*.json` | Consistentie per stelling over alle lijsten |
| Feitencheck | `werk/feitencheck/*.json` | Uitlegteksten gecontroleerd tegen officiële en lokale bronnen |
| Eindredactie | `data/redactie.json` | Geschrapte en geherformuleerde stellingen, met reden |
| Samenvoegen | `node tools/voeg_samen.mjs` → `data/stellingen.json` | Alle rondes tot één bestand |
| Toets | `node tools/toets.mjs` → `data/toets.json` | Eerlijkheidstoets; uitkomst staat op de verantwoordingspagina |

## De stembureaukaart

De kaart op de pagina Stemmen is een 3D-kaart van de hele gemeente, getekend in de browser (`src/assets/js/kaart3d.js`, met three.js in `src/assets/vendor/`). Ze staat op de site zelf: er worden geen kaartbeelden bij anderen opgehaald. De opzet is afgekeken van [isometric-helenaveen](https://github.com/jankeesvw/isometric-helenaveen) van @jankeesvw: dezelfde open gegevens, maar hier niet vooraf tot plaatjes gerenderd, zodat je kunt draaien en naar een platte kaart kunt wisselen.

| Stap | Waar | Wat |
|---|---|---|
| Ophalen | `uv run tools/kaart/haal.py` → `bronnen/_kaart/raw/` | Gebouwen uit 3D BAG per vierkant van 500 m, de ondergrond uit het OpenStreetMap-uittreksel van Noord-Holland (Geofabrik). Gemeentegrenzen van PDOK staan in `bronnen/_kaart/g_*.json` |
| Bouwen | `uv run tools/kaart/bouw.py` → `src/assets/kaart/` | Drie detailniveaus (zie hieronder) en de koppeling van elk stembureau aan zijn gebouw via het BAG-adres (`bronnen/_kaart/adressen.json`) |

De kaart laadt naar behoefte, afhankelijk van hoe ver je bent ingezoomd:

- `basis.bin.gz` (ongeveer 600 kB, altijd): de hele gemeente sterk vereenvoudigd, de hoofdwegen, de plaatsnamen, de grootste gebouwen als blok en de stembureaus met hun echte dakvorm. Helemaal uitgezoomd staan alleen de stembureaus in 3D, groter dan ze zijn, met een rood potlood erop.
- `m/` (191 blokken van 1 km, samen 4 MB): grond en wegen in detail, straatnamen en elk gebouw als blok. De browser trekt de muren zelf op uit het grondvlak en de hoogte.
- `h/` (373 blokken van 500 m, samen 18 MB): elk gebouw met zijn dakvorm (3D BAG LoD2.2).

Alleen blokken die in beeld zijn worden opgehaald; wat lang uit beeld is, wordt weggegooid. De drempels staan bovenaan `kaart3d.js`. Met `/stemmen/?kaartmeet` is de kaart in de console te sturen en na te meten (`await kaart.meet({ mpp: 1 })`).

Gebouwen: 3D BAG, TU Delft en 3DGI, CC BY 4.0. Ondergrond: © OpenStreetMap-bijdragers, ODbL. Grenzen en adressen: PDOK (Kadaster), CC0 en CC BY 4.0.

De kaart heeft schaduwen (een dieptebeeld vanuit de zon), ramen en dakkleuren in de tekenwijze van de gebouwen, bomen (het bos gevuld op een rooster, plus de losse bomen uit OpenStreetMap) en wat beweegt: treinen over het spoor, zeilboten op de plassen, herten op de hei en eenden in de vijvers. De trein, de zeilboot, het hert en de eend zijn vrije 3D-modellen (Quaternius, CC0; de eend van Poly by Google, CC BY 3.0); herkomst en licenties staan in `bronnen/_kaart/modellen/LICENTIES.md`. `uv run tools/kaart/modellen.py` zet ze om naar `src/assets/kaart/modellen.bin.gz`; de trein krijgt daarbij de kleuren van een NS-intercity en een NS-sprinter.

## Kandidaten en logo's

| Stap | Waar | Wat |
|---|---|---|
| Officiële lijsten | `bronnen/_verkiezing/kandidaten.json` | Alle 347 kandidaten uit Gemeenteblad 2026, 499712 |
| Ronde A | opdracht `werk/briefs/kandidaten.md` | Per lijst foto, beschrijving en LinkedIn zoeken, elk met bewijs |
| Ronde B | opdracht `werk/briefs/kandidaten-controle.md` | Onafhankelijke controle op de bron; alleen wat B zelf zag, komt op de site |
| Eindredactie | `data/kandidaten-redactie.json` | Besluiten over twijfelgevallen, elk met reden |
| Samenvoegen | `python3 -I tools/maak_kandidaten.py` → `data/kandidaten.json`, `src/assets/kandidaten/` | Voegt samen, haalt foto's op en verkleint ze, en weigert dezelfde foto of hetzelfde profiel bij twee mensen |
| Logo's | `data/logos.json`, `src/assets/logos/` | Van de site van de lijst, of van Wikimedia Commons |

De werkbestanden van beide rondes (`werk/kandidaten/A` en `B`) staan niet in de repository: het zijn aantekeningen over personen.

De opdrachten die de agents kregen staan in `werk/briefs/`. De rekenkern (`src/engine.mjs`) wordt zowel door de browser als door de toets gebruikt.

Na een wijziging in posities of stellingen:

```bash
node tools/voeg_samen.mjs && node tools/toets.mjs --stil && node build.mjs
```

Citaten controleren: `python3 -I werk/tools/check_citaten.py <lijst> <bestand.json>`.

## Wat niet in de repository hoort

De gedownloade programma's en volledige teksten (`bronnen/*/origineel/`, `programma.txt`, `extra-*.txt`) staan in `.gitignore`: het zijn stukken van de partijen zelf. Ook de ruwe kaartgegevens (`bronnen/_kaart/raw/`, ruim 400 MB) staan erin; `tools/kaart/haal.py` haalt ze opnieuw op. De gebouwde kaartlagen in `src/assets/kaart/` (23 MB) horen wel in de repository, want de site wordt daaruit gebouwd. Zonder die bestanden werkt `node build.mjs` nog wel, maar `tools/voeg_samen.mjs` en de citaatcontrole niet volledig.

## Voor publicatie nalopen

- Foto's van kandidaten en logo's zijn van de lijsten zelf. Ze staan hier om kiezers te informeren; haal een foto weg als een lijst of kandidaat daarom vraagt.
- LinkedIn-profielen staan er bijna alleen bij lijsten die er zelf naar linken (56 van de 347 kandidaten). Voor de rest is niet uitputtend gezocht.
- De video op de voorpagina is nog een lege plek: zet het adres van het bestand in `data/site.json` onder `video`.

- De posities zijn niet door de lijsten bevestigd. Lees een steekproef na, vooral bij de lijsten die je zelf overweegt.
- Er staat geen naam of contactadres op de site. Beslis of je dat wilt, en waar lijsten correcties kunnen melden.
- De partijkleuren zijn benaderingen, geen officiële huisstijlkleuren.
- De kaart van de stembureaus staat op de site zelf. De knop "waar ben ik" vraagt de browser om je plek en stuurt die nergens heen.
- Stembureaus zijn via hun adres aan een gebouw gekoppeld. Bij vier adressen die de BAG niet kent (Pinetum Blijdenstein, Campus Zonnestraal, de stationshal en zwembad De Lieberg) is het dichtstbijzijnde gebouw bij het eerder gevonden punt genomen. Loop die vier na op de kaart.
