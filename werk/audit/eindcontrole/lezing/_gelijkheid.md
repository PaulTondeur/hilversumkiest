# Gelijke behandeling: 15 stellingen en de woordkeus in de hele bank

Gecontroleerd op 15-11-2026 tegen `data/stellingen.json`, de bronteksten in `bronnen/<slug>/` en `bronnen/_stemgedrag/`. `werk/codering/` en `werk/audit/audit*.json` zijn niet geraadpleegd. De details, met letterlijke citaten (alle gecontroleerd tegen de bronnen), staan in `_gelijkheid.json`.

## Kort

De codering is grotendeels consequent. Stemgids-'voor', -'tegen' en -'neutraal' worden bij cultuur, Kerkbrink en kantoren op dezelfde manier vertaald, en de schuifbalkregel (0-15 / 16-40 / 41-59) is meestal gevolgd. Waar het misgaat, gaat het om drie patronen:

1. **Dezelfde voorwaardelijke uitspraak krijgt een andere richting.** Bij betaald parkeren terugdraaien wil zes keer een partij gericht terugdraaien waar het niet nodig is. Vier krijgen +1, GH en LE -1 (G01). Bij stikstof krijgen SP en BBB een vrijwel gelijk citaat ('rekening niet eenzijdig bij de boer'): SP 0, BBB +1 (G05).
2. **Een afleiding of een 'midden' wordt bij de ene partij wel en bij de andere niet gemaakt.**
   - Een algemeen 'nee tegen windturbines' wordt -1 bij FVD, BBB en VVD, maar null bij Dorp voor Dorp en Volt (G02).
   - Een MijnStem-antwoord 'balans tussen landbouw en natuur' rond 50 is 0 bij SP, VVD en CDA, maar null bij HvH, CU en SBP (G03).
   - 'Opvang in overleg met de buurt' is -1 bij SP, maar null bij LE en SCB (G04).
   - LFD heeft een eigen Media Park-antwoord (50, 'kiest niet') en staat op null (G09).
3. **De schuifbalk of het stemgedrag wordt niet overal even zwaar gewogen.**
   - Coffeeshops op 50 is -1 bij VVD en DvD, maar 0 bij GH, SBP en LE (G10).
   - Landbouw: schuifbalk 2 geeft -1 bij Blanco, schuifbalk 0 en 11 geven -2 bij BVNL en FVD (G06).
   - Het Kerkbrink-stemgedrag telt bij PRO mee, maar niet bij VVD en CDA (G11).

Van de 76 null-controles leverden er 11 toch een bruikbaar standpunt op: SBP (bouwtempo, buurt beslist), BVNL (buurt beslist), DvD en Volt (kleine windmolen), HvH, CU en SBP (landbouw naar natuur), LFD (Media Park), DvD en Volt (centrum sober). Vier stellingen hebben geen enkele null (kantoren, terugdraaien, coffeeshops, cultuur). Bij landbouw naar natuur, asiel, Media Park en centrum sober zijn er minder dan vijf, en daar zijn alle nullen gecontroleerd.

## Ongelijkheden op volgorde van ernst

| nr | ernst | stelling | partijen | kern |
|---|---|---|---|---|
| G01 | hoog | verkeer-terugdraaien | GH, LE (-1) tegenover LFD, BVNL, SBP, SCB (+1) | zelfde MijnStem-'terugdringen' en Stemgids-'voor', tegengestelde score |
| G02 | hoog | klimaat-kleine-windmolen | DvD, Volt (null) tegenover FVD, BBB, VVD (-1) | 'geen nieuwe windturbines' wordt niet overal afgeleid |
| G03 | hoog | natuur-landbouw-natuur | HvH, CU, SBP (null) tegenover SP, VVD, CDA (0) | 'balans' rond 50 |
| G04 | hoog | asiel-omwonenden-beslissen | SP (-1) tegenover LE, SCB, HvH (null) | -1 op grond van stilte |
| G05 | hoog | natuur-stikstof-boeren | SP (0) tegenover BBB (+1) | vrijwel hetzelfde citaat |
| G06 | middel | natuur-landbouw-natuur | Blanco (-1) tegenover BVNL, FVD (-2); D66 +2 | schuifbalk 2 tegenover 0/11; MijnStem-vraag is breder |
| G07 | middel | wonen-bouwtempo | SBP (null) tegenover BVNL (+1) | 'sneller bouwen' via procedures |
| G08 | middel | verkeer-buurt-beslist | SBP, BVNL (null) tegenover LE, CU, HvH (+1) | inwoners raadplegen / draagvlak |
| G09 | middel | economie-mediapark-woningen | LFD (null) tegenover LE, Volt (0) | eigen MijnStem-antwoord 50 genegeerd |
| G10 | middel | veiligheid-coffeeshops-aantal | VVD, DvD (-1) tegenover GH, SBP, LE (0) | allemaal schuifbalk rond 50 |
| G11 | middel | financien-centrum-sober | GH, Opstand (0) tegenover DvD, Volt (null); PRO tegenover VVD, CDA | 'neutraal' en stemgedrag ongelijk gewogen |
| G12 | middel | zorg-wmo-zonderindicatie | BVNL (-1) tegenover GH (null) | 'minder bureaucratie', geen uitspraak over indicatie |
| G13 | middel | klimaat-houtstook | D66 | stemde twee keer tegen houtstookregels; staat niet in de toelichting (regel 5) |
| G14 | laag | asiel-omwonenden-beslissen | VVD (-1) tegenover CU (-2) | even duidelijke afwijzing van een veto |
| G15 | laag | wonen-kantoren-naar-wonen | BVNL (+2) tegenover CU, SCB (+1) | voorbehoud bij BVNL toch +2 |
| G16 | laag | verkeer-terugdraaien | FVD (+2) tegenover SCB (+1); Opstand -2 op schuifbalk 83 | voorbehoud of gematigde schuifbalk |
| G17 | laag | natuur-stikstof-boeren | Volt (-2) | soort mijnstem op een andere vraag, schuifbalk 65 |
| G18 | laag | economie-mediapark-woningen | D66, CDA | schuifbalk neigt naar woningen; staat niet in de toelichting |
| G19 | laag | wonen-bouwtempo | Opstand (-1), DvD (0), SP (null) | 'bouwen alleen lost het niet op' |
| G20 | laag | bestuur-referendum-advies | PRO tegenover CDA, VVD, D66 | etiket 'stemgids' tegenover 'afgeleid' |
| G21 | laag | kantoren / centrum-sober | Opstand | citaat is de kop van de Stemgids-stelling, geen tekst van de partij |

## Toon

- **BBB** (kleine windmolen, stikstof) wordt in sterkere woorden beschreven dan vergelijkbare partijen: 'categorisch', 'de felste kritiek', 'verzet zich fel'. Bij stikstof staat er een zin die de stelling tegenspreekt ('Dat de natuur daardoor trager herstelt, zegt BBB niet'). SP krijgt daar het welwillender 'erkent' (T01, T02).
- **Volt**: de kern 'geen eigen lijn' bij verkeer-terugdraaien klinkt afwijzend (T03).
- **Blanco (van Oostveen)**: de kern 'Sceptisch over steeds meer bouwen' is een typering. Over de hele bank staat 13 keer 'Van Oostveen vindt/wil/zegt' waar andere lijsten 'De partij' krijgen (T04, T05).
- **CU**: 'koos bewust neutraal' is een interpretatie, want er was geen toelichting (T05).
- **LE** bij coffeeshops: 'De partij zegt dat ...' zet afstand en noemt het standpunt zelf niet (T06).
- **Hele bank**: 'zelfs' bij PvdD, Blanco en HvH, en 'slechts schijnveiligheid' bij PvdD ('slechts' staat niet in de bron) (T07). De VVD heet 72 van de 74 keer 'De VVD', de rest 'De partij' (T08).
- De andere zwaar klinkende woorden ('melkkoe', 'fel', 'absoluut', 'pertinent', 'realistisch', 'ambitieus', 'terecht', 'dogmatisch') komen uit de bronnen van de partij zelf. Lengte en opbouw van de toelichtingen verschillen weinig: gemiddeld 167 (Volt) tot 225 (DvD) tekens.

## Woordentelling per partij (alle 90 stellingen, `kern` + `toelichting`, alleen posities met een score)

Gevraagde oordeelwoorden: populistisch, radicaal, extreem, vaag, onduidelijk, tegenstrijdig, slechts, helaas, terecht, ambitieus, realistisch. 'Populistisch', 'radicaal', 'extreem', 'vaag', 'tegenstrijdig' en 'helaas' komen nergens voor. 'Meent' is niet meegeteld, omdat het in de bank vrijwel altijd de wijk de Meent is. De laatste kolom telt zinnen van het type 'noemt/zegt ... niet' per 10 posities.

| partij | posities | gem. lengte toelichting | gevraagde oordeelwoorden | intensiteitswoorden | erkent/zegt/vindt/toch/wel | "noemt/zegt ... niet" per 10 |
|---|---|---|---|---|---|---|
| hart-voor-hilversum | 58 | 206 | – | kritisch 2, zelfs 1 | vindt 5, wel 3, zegt 2 | 1.6 |
| pro | 79 | 186 | – | kritisch 1 | vindt 17, wel 6, zegt 5 | 1.9 |
| d66 | 66 | 198 | onduidelijk 2 | bewust 1, uitgesproken 1 | wel 10, vindt 9, zegt 7 | 2.7 |
| vvd | 74 | 191 | – | kritisch 4 | vindt 10, zegt 8, wel 6 | 1.8 |
| cda | 71 | 205 | realistisch 2 | kritisch 1 | wel 19, vindt 10, zegt 5, erkent 1 | 1.5 |
| lokaal-een | 70 | 183 | – | kritisch 2 | wel 19, zegt 12, vindt 6 | 3.0 |
| sp | 68 | 196 | terecht 2 | – | vindt 17, wel 7, zegt 6, erkent 1 | 2.2 |
| christenunie | 64 | 220 | – | bewust 1, kritisch 1 | vindt 13, wel 12, zegt 6 | 2.3 |
| bvnl | 67 | 174 | – | kritisch 2, dogmatisch 1 | wel 6, zegt 6, vindt 5 | 1.6 |
| scb | 49 | 206 | – | – | vindt 11, zegt 7, wel 5 | 1.8 |
| gewoon-hilversum | 64 | 197 | realistisch 2, ambitieus 2 | absoluut 2, dogmatisch 1 | vindt 18, wel 9, zegt 5 | 2.3 |
| dorp-voor-dorp | 56 | 225 | realistisch 4 | pertinent 1 | vindt 12, wel 11, zegt 7 | 2.7 |
| stop-betaald-parkeren-vip | 50 | 206 | – | kritisch 6, uitgesproken 1 | vindt 7, zegt 7, wel 4, toch 1 | 2.6 |
| opstand-nu | 61 | 189 | realistisch 1 | kritisch 6 | vindt 14, wel 12, zegt 8, toch 1 | 2.3 |
| pvdd | 69 | 198 | ambitieus 2, slechts 1 | uitgesproken 4, kritisch 3, zelfs 1 | vindt 8, wel 7, zegt 4, erkent 1 | 2.3 |
| blanco-van-oostveen | 51 | 204 | – | sceptisch 1, zelfs 1 | vindt 13, wel 8, zegt 6 | 2.2 |
| lfd | 68 | 208 | – | bewust 2, absoluut 2, kritisch 2 | vindt 15, wel 11, zegt 7 | 2.4 |
| volt | 58 | 167 | – | geen eigen lijn 1 | wel 6, zegt 5, vindt 3 | 3.4 |
| fvd | 69 | 172 | – | uitgesproken 1, fel 1 | wel 7, vindt 7, zegt 7 | 2.8 |
| bbb | 60 | 184 | realistisch 1 | fel 4, kritisch 4, absoluut 2, felste 1, categorisch 1 | vindt 11, zegt 9, wel 5 | 2.8 |

Herkomst van de opvallende tellingen:
- **BBB**: 'fel' en 'absoluut' komen uit de eigen bronnen. 'Categorisch' en 'felste' zijn van de codeur.
- **GH**: 'realistisch' en 'ambitieus' zijn eigen woorden ('2050 al ambitieus'). 'Absoluut' staat in 'niet absoluut'.
- **DvD**: 'realistisch' en 'pertinent' zijn eigen woorden.
- **SBP en Opstand**: 'kritisch' komt van 'kritisch kijken naar uitgaven'.
- **D66**: 'onduidelijk' is 'volgens haar nog onduidelijk' (leges).
- **SP**: 'terecht' is het eigen woord van SP.

'Zegt ... niet'-zinnen komen het vaakst voor bij Volt (3,4 per 10), LE (3,0) en BBB, FVD en D66 (2,7-2,8), en het minst bij CDA (1,5) en HvH en BVNL (1,6). Dat zijn meestal informatieve kanttekeningen ('een bedrag noemt ze niet'). Ze laten een partij wel vager lijken, dus het loont om ze op dezelfde manier te gebruiken.
