# De uitslag op hilversumkiest.nl

Vanaf woensdag 18 november 2026 komt de uitslag vanzelf op de site, zonder dat iemand iets hoeft te doen.

## Bron

**Leidend:** de gemeente Hilversum, die de verkiezing organiseert.

- Woensdagavond verschijnt de uitslag alleen op het liveblog: https://hilversum.nl/liveblog. Daar komen de stemmen per partij. De voorkeurstemmen niet, want Hilversum telt centraal. De gemeente verwacht de eerste voorlopige uitslagen rond 22.00 uur; de uitslagenavond duurt tot 01.00 uur.
- Donderdag 19 november worden vanaf 09.00 uur de stemmen per kandidaat geteld, in sporthal De Fuik in Kortenhoef. Daarna horen de processen-verbaal en het telbestand op hilversum.nl te komen. Bij de Tweede Kamerverkiezing van 2025 was dat een csv (osv4-3) en pdf's per stembureau. Bij de raadsverkiezing van 2022 waren het EML-bestanden van de Kiesraad.
- Donderdag 26 november om 10.00 uur stelt het centraal stembureau de officiële uitslag vast, in het Raadhuis.

**Alleen ter controle:** nieuwsmedia zoals NH Nieuws en ANP. Hun cijfers worden nooit overgenomen.

Er is geen openbare, machineleesbare live-bron (geen JSON of API). De Kiesraad zet de bestanden van herindelingsverkiezingen pas weken of jaren later op data.overheid.nl.

## Wat er vanzelf gebeurt

Twee lagen, die elkaar aanvullen:

1. **GitHub Actions** (`.github/workflows/uitslag.yml`). Draait ook als Pauls computer uit staat.
   - Het vaste script `tools/uitslag/haal.mjs` kijkt op de pagina's van de gemeente. Het leest telbestanden (EML of osv4-3-csv) of een duidelijke tabel op het liveblog.
   - Klopt alles, dan schrijft het `data/uitslag.json`, pusht naar `main` en publiceert de site opnieuw.
   - Wanneer:
     - woensdag van 21.00 uur tot en met middernacht elk kwartier;
     - donderdag elk uur;
     - van 20 tot en met 28 november elke twee uur;
     - op 26 november extra rondes na de zitting.
   - GitHub loopt soms een paar minuten achter.
2. **Claude-taak op Pauls computer** (`tools/uitslag/claude-taak.md`, drie geplande taken in de Claude-app). Draait op dezelfde momenten hetzelfde script.
   - Herkent het script de bron niet (exit 2), bijvoorbeeld omdat het liveblog lopende tekst of een plaatje is, dan leest Claude zelf wat de gemeente publiceert. Daarna haalt Claude het door dezelfde controles (`tools/uitslag/publiceer.mjs`).
   - Werkt alleen als de computer aanstaat, de Claude-app open is en de computer niet slaapt.

De Claude-taken draaien in een eigen kopie, `/home/paul/Work/hilversumkiest-uitslag-taak`, en niet in de gedeelde map. Ze heten:

| Taak | Wanneer |
|---|---|
| `uitslag-avond` | woensdag 21.00–23.45 uur, elk kwartier |
| `uitslag-donderdag` | donderdag 00.00–23.00 uur, elk uur |
| `uitslag-dagen-erna` | 20–27 november om 9, 12, 15, 18 en 21 uur |

Ze kunnen alleen zonder vragen werken als hun toestemmingsmodus in de app op Auto of Bypass staat, of als je ze één keer met "Run now" hebt laten draaien en de gevraagde tools (git, node, het ophalen van hilversum.nl) hebt goedgekeurd.

Controles vóór elke publicatie (`src/uitslagcontrole.mjs`):

- precies de 20 partijen van de site;
- partijnaam en lijstnummer horen bij elkaar;
- de getallen tellen op;
- de zetels zijn samen 39 en niet meer dan het aantal kandidaten van een partij;
- niets loopt terug ten opzichte van de vorige stand, behalve een kleine correctie bij het tellen per kandidaat;
- de kandidaten komen overeen met `data/kandidaten.json`;
- de site moet met de nieuwe cijfers kunnen bouwen.

Klopt iets niet, dan wordt er niets gepubliceerd en blijft de vorige stand staan.

Zetels en gekozen kandidaten: **wat de gemeente of het centraal stembureau zelf publiceert, is leidend.** De site rekent ze ook zelf na met de regels van de Kieswet.

- Geeft de bron ze niet, dan staat de eigen berekening op de site, met die vermelding.
- Wijkt de eigen berekening af van de bron, dan staat de bron op de site en krijgt Paul een melding: een mislukte run in GitHub, of "LET OP" in het verslag van de Claude-taak.
- Op de pagina staat welke van de twee er staat.

De eigen berekening:

- volle zetels, daarna restzetels via de grootste gemiddelden, ook voor partijen onder de kiesdeler (die grens geldt alleen voor de Tweede Kamer);
- een voorkeurdrempel van 25% van de kiesdeler.

Getest tegen de officiële uitslag van Hilversum 2022: zetels en gekozenen kloppen precies.

Op de site staat:

- tot de vaststelling overal "voorlopig";
- bij elk blok de bron en het tijdstip;
- geen duiding en geen vergelijking met 2022.

## Stadia

| Stadium | Wanneer | Wat de site toont |
|---|---|---|
| leeg `{}` | tot woensdag 21.00 uur, zolang de stembureaus open zijn | de site zoals ze was, zonder iets over de uitslag |
| `wacht` | vanaf woensdag 21.00 uur | blok op de voorpagina en `/uitslag/`: "de stemmen worden geteld" |
| `tussenstand` | als de gemeente totalen en het aantal getelde stembureaus geeft | stemmen en percentages, geen zetels |
| `voorlopig` | alle stembureaus geteld | stemmen, percentages, 39 zetels, opkomst |
| `voorlopig` + kandidaten | na de telling per kandidaat | voorkeurstemmen en "gekozen (voorlopig)", ook op de partijpagina's |
| `officieel` | na 26 november 10.00 uur, met het resultaatbestand van het centraal stembureau | definitief |

Open pagina's kijken elke twee minuten of er een nieuwere stand is en laden dan opnieuw.

## Als de bron tegenvalt

- **De gemeente zet de uitslag als tekst of plaatje op het liveblog.** Het script meldt exit 2 en de Claude-taak leest het. Staat de computer uit, dan wacht de site tot er een telbestand is (donderdag of later).
- **De gemeente geeft alleen de zetelverdeling.** Dan toont de site alleen zetels.
- **Een kapot, onvolledig of tegenstrijdig bestand.** Wordt afgewezen; de vorige stand blijft staan. In GitHub staat dan een waarschuwing bij de run.

## Stopzetten

- **Alles meteen:**
  - in GitHub: Actions > "Uitslag ophalen" > ··· > Disable workflow (of `gh workflow disable uitslag.yml`);
  - in de Claude-app: de taken `uitslag-avond`, `uitslag-donderdag` en `uitslag-dagen-erna` uitzetten.
- **Uitslag van de site halen:** zet `{}` in `data/uitslag.json` en push.
- **Vanzelf:** de workflow zet zichzelf uit zodra de officiële uitslag compleet is, en in elk geval na 30 november. De Claude-taken zetten zichzelf uit na 27 november.

## Testen

```bash
node tools/uitslag/test.mjs
```

```bash
node tools/uitslag/oefening.mjs
```

- `test.mjs` test lezen, rekenen en controleren tegen echte bestanden van 2022 en 2025, en kapotte bronnen.
- `oefening.mjs` is een droge oefening van begin tot eind in een losse kopie met een nep-origin. Er gaat niets naar GitHub.

## Verschil met 2022 en de meerderheidsmaker

Zodra er zetels zijn, toont de uitslagpagina per partij het verschil met 2022 en een rekenhulp om partijen tot een meerderheid (20 van de 39 zetels) op te tellen. Het verschil is een eigen rekensom en komt niet van de gemeente: de stemmen van 2022 in Hilversum en Wijdemeren samen (`data/raden-2022.json`, bron Kiesraad), verdeeld over 39 zetels met `src/zetels.mjs`. Zetels één op één vergelijken zou bijna elke partij op min zetten, omdat de twee oude raden samen 56 zetels hadden. Partijen die samengingen tellen op (`nu` in het gegevensbestand); wie in 2022 niet meedeed begint op nul.
