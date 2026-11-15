# Eindcontrole neutraliteit van Hilversum kiest

Stand 15 november 2026, drie dagen voor de verkiezing. Onafhankelijke controle: de eerdere toetsen telden niet als bewijs. Er is niets aan stellingen, standpunten of scores veranderd.

## Oordeel

**De stellingen en de standpunten kiezen geen kant. De rekenwijze doet dat wel, zonder dat iemand het zo bedoeld heeft.** Ze benadeelt partijen waarvan minder standpunten bekend zijn. Die partijen zijn vooral lokaal en klein: Stop Betaald Parkeren-VIP, SCB, Lijst Van Oostveen, Hart voor Hilversum, Volt en Dorp voor Dorp.

Hoe sterk het effect is, blijkt uit drie metingen:

- **Eigen aanhang.** Een kiezer die het dichtst bij zo'n partij staat, krijgt haar maar in 55 tot 81% van de gevallen bovenaan. Bij de partijen met de meeste standpunten is dat 95 tot 99%.
- **Maskeerproef.** Haal bij een partij 30% van haar standpunten weg en ze komt nog maar half zo vaak bovenaan. De partij wordt dus niet alleen minder zeker, ze wordt gestraft.
- **Verantwoording.** Die belooft het tegendeel: geen standpunt "helpt haar niet en schaadt haar niet".

Dat dit telt, komt door een tweede zwakte. 'Geen standpunt' wordt niet overal even streng toegekend. In een gespreide steekproef bleek 12% van de 'geen standpunt' bij nalezing toch een standpunt te hebben, dat dezelfde regel bij een andere partij wel opleverde. Zulke fouten werken door de rekenwijze dubbel door.

**Herstel.** Laat een stelling zonder standpunt voor die partij niet meetellen, in plaats van haar als een slechte treffer te tellen. Dat kost één regel code, en in de simulaties verdwijnt het nadeel dan bijna helemaal (tabel B en C).

**Overig.** De andere bevindingen zijn klein tot middel:

- Een gelijke stand wordt op alfabet gebroken.
- Op twee parkeerstellingen en de dorpsraad-stelling zijn de scores ongelijk tussen partijen.
- Bij één partij staat een kritische kanttekening die vergelijkbare partijen niet krijgen.
- Er zijn een paar geladen formuleringen.

**Wat in orde is.** De keuze en de richting van de stellingen, de citaten, de bekende standpunten (98% klopt in een representatieve steekproef), de volgorde en de vormgeving.

## Wat Paul moet beslissen, op volgorde van ernst

| # | Ernst | Bevinding | Aangetoond of vermoed | Voorstel |
|---|---|---|---|---|
| 1 | **Ernstig** | 'Geen standpunt' kost een partij punten. Partijen met minder bekende standpunten komen daardoor structureel minder vaak bovenaan. | Aangetoond (simulatie, maskeerproef) | In `bereken` een stelling zonder standpunt voor die partij overslaan, in teller én noemer. De verantwoording en de toets aanpassen. |
| 2 | **Middel** | 'Geen standpunt' is niet overal even streng toegekend: 12% van een gespreide steekproef had toch een standpunt. Het meest bij SBP, VVD, HvH, CDA, Lokaal Eén, PvdD, FVD en BBB. | Aangetoond voor de genoemde gevallen; het percentage is een schatting | De 42 gevonden gevallen nalopen, en elke stemhulpvraag die bij één partij is gebruikt ook bij de andere partijen toepassen. |
| 3 | **Middel** | Scores op dezelfde soort uitspraak lopen uiteen: `verkeer-terugdraaien` (HvH, Gewoon, Lokaal Eén −1 tegen BVNL, LFD, SBP, SCB +1), `bestuur-dorpsraad-op-verzoek` (zelfde MijnStem-vraag: −1, null of +2), `natuur-groennorm`, `natuur-landbouw-natuur`, `klimaat-kleine-windmolen`, en Kerkbrink-stemgedrag alleen bij PRO. | Aangetoond (drie leesrondes los van elkaar) | Deze zes stellingen voor alle partijen opnieuw scoren, met één vaste vertaling per bron. |
| 4 | **Middel** | Bij gelijke stand wint de partij met het vroegste slug in het alfabet. BBB staat bij een gelijke stand in 89% als eerste, VVD in 6%. | Aangetoond | Gelijke stand op volgorde van het stembiljet tonen, of in willekeurige volgorde, en niet op `bekend` en slug. |
| 5 | **Middel** | Partijtekst: alleen bij Hart voor Hilversum staat dat raadsleden overstapten. Bij Lokaal Eén staat alleen het gunstigste zetelgetal. Alleen bij SCB staat "dun programma", niet bij het even dunne BVNL. | Aangetoond | Overal dezelfde soort feiten, of de kanttekening schrappen. |
| 6 | **Middel** | De verantwoording beschrijft de behandeling van 'geen standpunt' op twee manieren, en allebei onjuist: "half overeenkomend" (`build.mjs:584`) en "helpt niet en schaadt niet" (`data/verantwoording.html:49`). | Aangetoond | Na herstel 1 klopt de tweede zin wel; de eerste schrappen. |
| 7 | **Klein** | Zes formuleringen kleuren: `cultuur-budget-niveau`, `economie-bruisend-hart-uitstel`, `cultuur-monumentale-scholen`, `financien-tekort-lasten`, de kop van `natuur-stikstof-boeren` en het tegen-argument van `wonen-lokale-binding-helft`. Coalitiepartijen worden vaker in de uitleg genoemd. | Aangetoond | Herformuleren (voorstellen in laag 1). |
| 8 | **Klein** | De toon van enkele toelichtingen: bij BBB "categorisch" en "felste", bij Lijst Van Oostveen 13 keer "Van Oostveen vindt" waar andere partijen "de partij" krijgen, bij PvdD "slechts". | Aangetoond | Woorden vervangen. |
| 9 | **Klein** | In de video zijn vier lijstnummers als 'gekozen' leesbaar (VVD, SP, Dorp voor Dorp, LFD), en het beeld van BBB staat langer in beeld. | Aangetoond | Nummers onleesbaar maken zoals in de scène 'biljet'; alle partijpagina's even lang tonen. |
| 10 | **Klein** | De eigen toets (`tools/toets.mjs`) mist punt 1 doordat de proef-aanhanger stellingen overslaat waar zijn partij geen standpunt heeft. | Aangetoond | Mengkiezers en maskeerproef aan de toets toevoegen (scripts hier). |

Punt 1 is een keuze over de rekenwijze vlak voor de verkiezing. Hij verandert uitslagen die mensen al gedeeld hebben niet, maar wel nieuwe uitslagen. Punt 2 en 3 vragen handwerk in de standpunten; dat valt buiten deze controle, die niets heeft veranderd.

## Hoe er gemeten is, en hoe je het nadraait

Alle scripts staan in `werk/audit/eindcontrole/`. Ze gebruiken een vaste willekeur, dus elke run geeft dezelfde cijfers.

```bash
node werk/audit/eindcontrole/meet.mjs          # stellingen, rekenwijze, kaart, kandidaten → metingen.json
node werk/audit/eindcontrole/varianten.mjs     # vier rekenwijzen met dezelfde kiezers → varianten.json
node werk/audit/eindcontrole/steekproef.mjs    # de steekproef voor de leesronde → steekproef/
node werk/audit/eindcontrole/tel_lezing.mjs    # telt de leesronde → lezing/_telling.json
bash werk/audit/eindcontrole/citaten.sh        # elk citaat terug in de bron (heeft bronnen/ nodig)
node werk/audit/eindcontrole/tabellen.mjs      # de tabellen onderaan dit rapport
```

- **Kiezers in de simulaties.**
  - *Willekeurig:* elk antwoord even waarschijnlijk, 10% overgeslagen.
  - *Mengkiezer:* kiest een hoofdpartij en een tweede partij, met gewicht 0,5 tot 1 voor de hoofdpartij. Per stelling antwoordt hij het gewogen gemiddelde van hun posities, plus ruis (sd 0,8), afgerond. 15% slaat hij over. Heeft de hoofdpartij geen standpunt, dan volgt hij de tweede partij of het gemiddelde van de stelling. Zo'n kiezer heeft een echte mening ook op stellingen waar zijn partij zwijgt, net als een echte kiezer.
  - *Herkend:* hoe vaak de hoofdpartij bovenaan komt.
- **Maskeerproef.** Bij één partij worden 30% van de bekende standpunten op 'geen standpunt' gezet, vier keer anders getrokken. De kiezers blijven gelijk. Een neutrale behandeling van 'geen standpunt' zou de kans op winst ongeveer gelijk laten.
- **Deelverzamelingen.** 20.000 proeven zoals bezoekers het doen: 2 tot 20 partijen, 1 tot 11 thema's, diepte kort, gewoon of verdiepend, en de stellingen via `kiesStellingen`.
- **Leesronde.** Vijf subagenten lazen elk vier partijen. Per partij zagen ze eerst alleen de stellingen en codeerden die blind uit `bronnen/<partij>/`, met de regels uit `werk/briefs/codeer.md`. Pas daarna zagen ze wat er op de site staat.
  - *De steekproef* (536 posities) bestaat uit vier lagen. Ten eerste alle gevallen waar ronde A en B van richting verschilden (115). Ten tweede alle gevallen die nu 'geen standpunt' zijn terwijl een ronde er wel een zag (121). Ten derde een gespreide trekking van 12 per partij over de thema's (240). Ten vierde 3 willekeurige 'geen standpunt' per partij (60).
  - *Andere verschillen:* de overige 620 verschillen tussen A en B gingen alleen over de sterkte (±1 tegen ±2) of over null tegen een standpunt dat later null werd. Die zijn alleen in de laag 'nu geen standpunt' meegenomen.
  - *Extra lezers:* een zesde agent las de 90 stellingen op formulering, een zevende vijftien stellingen dwars door alle partijen op gelijke behandeling, en een achtste de partijteksten, de beschrijvingen van kandidaten en de video. De agenten kregen de bronnen en teksten, niet mijn vermoedens.
  - *Uitvoer:* die staat in `werk/audit/eindcontrole/lezing/`, per partij en in `_stellingen`, `_gelijkheid` en `_toon`.
- **Groepen.** De indeling staat onder tabel G.
  - *Links en rechts:* bepaald met de eerste hoofdas van de standpunten zelf (34% van de spreiding), met PRO aan de linkerkant. Lokaal Eén en SCB vallen daardoor links en HvH rechts. Dat is een maat voor deze stellingen, geen politiek etiket.
  - *Groot:* minstens 7 zetels in 2022 in beide raden samen.
  - *Coalitie:* het Hilversumse college sinds mei 2024.
  - *Wijdemeers:* partijen met wortels in Wijdemeerse lokale partijen.

## Laag 1: de stellingen

**Gemeten**
- **Aantal per thema:** 5 (veiligheid) tot 12 (wonen).
- **Richting van 'eens':**
  - *Hoofdas:* per stelling is de samenhang berekend tussen de posities van partijen en hun plek op de hoofdas. 35 stellingen wijzen met 'eens' naar links, 35 naar rechts en 20 zijn gemengd.
  - *Per thema:* geen enkel thema is scheef. Het grootste verschil zit bij asiel (4 links, 2 rechts) en natuur (5 tegen 3).
  - *Agent:* de lezende agent kwam los daarvan op 39 links, 40 rechts en 11 zonder kant.
- **Voor en tegen:** gemiddeld 18,3 en 18,0 woorden. Bij 3 stellingen is het voor-argument meer dan anderhalf keer zo lang, bij 1 het tegen-argument.
- **Wijdemeren:** 22 van de 90 stellingen noemen een dorp of Wijdemeren (24%). Wijdemeren is ongeveer een vijfde van de nieuwe gemeente.
- **Partijen in de uitleg:** zes uitleggen noemen een partij. VVD 3 keer, PRO 2 keer, D66, CDA, Volt en Gewoon Hilversum elk één keer. Coalitiepartijen gemiddeld 1,5 keer, andere partijen 0,1 tot 0,3 keer. Bij `cultuur-budget-niveau` is PRO de bron van de aanname ("volgens onder meer PRO minder uit aan cultuur"), bij `natuur-recreant-betaalt` de VVD.
- **Speerpunten:**
  - *Gedekt:* volgens de lezende agent dekt de bank de speerpunten van rechtse partijen strikt voor 81%, van het midden voor 77% en van linkse partijen voor 66%. Met gedeeltelijk gedekte speerpunten erbij is het overal 89 tot 91%. Het verschil komt vooral doordat linkse speerpunten vaker abstract of niet-gemeentelijk zijn.
  - *Laagst gedekt:* OpStand.nu (38%), SCB (43%) en SBP (57%).
  - *Ontbreekt:* een eigen stelling over inspraak vooraf (de rode draad van HvH, Gewoon, SBP en BBB), dierenwelzijn (PvdD) en de omvang van de asielopvang.

**In orde**
- Er is geen kant die met 'eens' vaker wint.
- De argumenten zijn even lang.
- Wijdemeren is evenredig vertegenwoordigd.
- In de 90 stellingen staan geen woorden als 'populistisch', 'radicaal' of 'extreem'.

**Bevindingen (klein tot middel, aangetoond)**

- **`cultuur-budget-niveau`.** De aanname komt van PRO, en het voor-argument neemt haar over als feit ("Hilversum loopt nu achter"). Voorstel: een onafhankelijk cijfer gebruiken (CBS/Iv3, uitgaven per inwoner), of de stelling herformuleren tot "De gemeente geeft meer geld uit aan kunst en cultuur."
- **`economie-bruisend-hart-uitstel`.** "tot de gemeente het financieel weer aankan" veronderstelt dat ze het nu niet aankan. Voorstel: "… wordt uitgesteld om geld te besparen, ook als nieuwe woningen daardoor later komen."
- **`cultuur-monumentale-scholen`.** "als dat goedkoper en beter is" reikt het antwoord aan. Voorstel: "… ook als nieuwbouw goedkoper is" of "… ook als de school daardoor minder goed past bij het onderwijs van nu".
- **`financien-tekort-lasten`.**
  - De stelling noemt alleen geliefde voorzieningen.
  - Het voor-argument voegt "als de sterkste schouders meer betalen" toe en maakt de kosten klein ("een paar tientjes").
  - Voorstel: de voorzieningen in de stelling algemeen houden ("om bezuinigingen te voorkomen"), en de voorwaarde en het bagatelliseren uit het voor-argument halen.
- **`natuur-stikstof-boeren`.** De kop "Boeren beschermen tegen stikstofregels" kleurt. Voorstel: "Verzet tegen strengere stikstofregels".
- **`wonen-lokale-binding-helft`.** Het tegen-argument zegt "voorrang op herkomst", terwijl de stelling over wonen of werken gaat. Voorstel: "voorrang op woonplaats".
- **Partijnamen in de uitleg.** Voorstel: alle partijnamen uit de uitleg halen, zoals in de meeste uitleggen al het geval is. Dat raakt `wonen-bouwtempo`, `cultuur-projectsubsidie-eindig`, `cultuur-budget-niveau` en `natuur-recreant-betaalt`.
- **Kleinere punten** (zie `lezing/_stellingen.md`):
  - Vijf stellingen zijn naar de huidige situatie gedraaid, waardoor 'oneens' twee tegengestelde dingen kan betekenen: `verkeer-bezoek`, `verkeer-zero-emissie`, `verkeer-opbrengst`, `bestuur-referendum-advies` en `financien-ozb-meestijgen`.
  - Bij `wonen-nederhorst-noord-open` zegt het tegen-argument "honderden woningen", de uitleg 150 tot 180.
  - `data/themas.json` belooft vuurwerk, arbeidsmigranten en zwembaden, maar daar staat geen stelling over.

## Laag 2: de standpunten per partij

**Gemeten.** Zie tabel A (standpunten per partij) en tabel E (leesronde).

- **Bekend per partij:** van 49 (SCB) tot 79 (PRO), gemiddeld 64.
- **Per groep:**
  - landelijk 67,7 tegen lokaal 58,6;
  - coalitie 73,5 tegen oppositie 62,3 en nieuw 60;
  - Hilversumse lokale partijen 57,3.
- **Deels terecht.** Het verschil volgt ten dele uit wat er te lezen is: Lijst Van Oostveen heeft geen programma, SCB en BVNL een van ongeveer 1.900 woorden.
- **Stemgedrag als bron:** dat bestaat alleen voor partijen met raadsleden. De VVD heeft er 12 standpunten aan, het CDA 7, de nieuwe partijen geen. Dat is een legitieme bron, maar het vergroot het verschil in dekking. Door bevinding 1 telt dat in de uitslag mee.
- **Leesronde op de bekende standpunten.** In de gespreide trekking (240 posities) was 4 keer de score onjuist (1,7%) en 1 keer van richting.
- **Citaten.** 1.226 citaten zijn teruggezocht in de bron. Er is 1 niet letterlijk: SP bij `natuur-snippergroen`, waar de site "woningen te bouwen" heeft toegevoegd aan een afgebroken citaat uit Hilversums Nieuws.
- **Toon.** De toelichtingen zijn bij elke partij even zakelijk. De lengte loopt van gemiddeld 167 tekens (Volt) tot 225 (Dorp voor Dorp).
- **Sterke scores (±2).** Het aandeel loopt van 14% (Lokaal Eén) tot 45% (FVD, PvdD, Dorp voor Dorp). De lezers vonden geen ±2 die de bron niet draagt.

**Bevinding 2 (middel, aangetoond voor de gevallen): 'geen standpunt' is niet gelijk toegekend.**

- **Hoe vaak.**
  - Van de 60 willekeurig gekozen 'geen standpunt' had er bij nalezing 7 toch een standpunt (12%).
  - Van de 121 gevallen waar een eerdere ronde een standpunt zag, was dat bij 32 terecht (26%).
  - De agent voor gelijke behandeling kwam los daarvan op 11 van 76 (14%).
  - Bij 528 keer 'geen standpunt' op de site gaat het naar schatting om 50 tot 70 ontbrekende standpunten.
  - Bijna altijd is de oorzaak dezelfde: een MijnStem-, Stemgids- of Hilversums Nieuws-antwoord, of een stemming, die bij de ene partij wel en bij de andere niet tot een score leidde.
- **Per partij (ten onrechte geen standpunt):**
  - SBP 7 van 33 gelezen;
  - VVD 4;
  - 3 elk: HvH, CDA, Lokaal Eén, PvdD, FVD en BBB;
  - 2 elk: D66, SP, BVNL en LFD;
  - 1 elk: CU, SCB, Gewoon, Dorp voor Dorp en OpStand.nu;
  - 0: PRO, Volt en Lijst Van Oostveen.
- **Voorbeelden (bron in de leesbestanden):**
  - `bestuur-dorpsraad-op-verzoek`, op de MijnStem-vraag 'Dorps- en wijkraden laten kiezen door bewoners':
    - SBP (100), OpStand.nu (100), BBB (100), PvdD (99) en SCB (86) staan op null;
    - CU (58), D66 (24) en Gewoon (75) ook;
    - HvH (92), PRO (66) en VVD (73) krijgen −1;
    - SP en Dorp voor Dorp krijgen +2.
    - De stelling is herschreven ("op verzoek" is eruit, zie `data/redactie.json`), maar de posities zijn niet opnieuw bekeken. In de toelichting van Dorp voor Dorp staat het verzoek nog.
  - `asiel-blijvende-opvang`, FVD null. Programma H3: "Wij willen in Hilversum en de Wijdemeerse kernen geen nieuwe opvanglocaties, AZC's of noodopvang". Dorp voor Dorp kreeg −2 op alleen een MijnStem-antwoord.
  - `financien-centrum-sober`: PRO krijgt −1 op het Kerkbrink-stemgedrag van 6-12-2023. VVD en CDA stemden hetzelfde en staan op null.
  - `natuur-afsluiten`, SBP null. Stemgids 'voor': "Wandelaars, sporters en hondenbezitters moeten volop de ruimte krijgen". Dorp voor Dorp, FVD en Lijst Van Oostveen kregen op hetzelfde antwoord −1.
  - `klimaat-kleine-windmolen`: Dorp voor Dorp ("Dorp voor Dorp wil geen nieuwe windturbines", p. 71) en Volt ("We hebben geen ruimte voor windturbines", p. 16) staan op null. FVD, BBB en VVD krijgen voor een even algemeen 'nee' −1.
- **Voorstel.** De 42 gevallen in `lezing/_telling.json` (`fouten`) nalopen. Daarnaast per stelling met een script controleren of een stemhulpvraag die bij één partij als bron dient, ook bij de andere partijen met een antwoord is toegepast (`bronnen/_stemhulpen/antwoorden.json`). Dan wordt dezelfde schuifregel overal gelijk gebruikt (41–59 midden). In de leesronde week die af: 50 werd −1 bij Dorp voor Dorp en VVD, en 0 bij SBP, Gewoon en Lokaal Eén.

**Bevinding 3 (middel, aangetoond): ongelijke scores op dezelfde soort uitspraak.**

- **`verkeer-terugdraaien`.** HvH, Gewoon en Lokaal Eén staan op −1. BVNL, LFD, SBP en SCB staan op +1.
  - *Gelijke antwoorden:* alle zes kozen in MijnStem voor terugdringen (Gewoon 7, Lokaal Eén 26, LFD 24, SCB 17, BVNL en SBP 0). Ze zeiden ook 'voor' op de Stemgids-stelling "… opnieuw worden bekeken en zo nodig worden teruggedraaid".
  - *Citaten:* Lokaal Eén: "Terugdringen daar waar inwoners geen behoefte aan betaald parkeren hebben". LFD: "Waar de noodzaak ontbreekt, draaien we betaald parkeren terug".
  - *Toelichting:* bij Gewoon laat die het 'voor' weg.
  - *Belang:* dit is een van de meest beslissende stellingen voor de lokale partijen. Drie lezers kwamen er los van elkaar op uit.
  - *Voorstel:* één vaste vertaling. Bijvoorbeeld 'voor herzien' plus MijnStem onder 40 is +1, tenzij het programma uitdrukkelijk 'niet afschaffen' zegt; dan 0.
- **`natuur-groennorm`.** PRO ("stap voor stap toewerken") en CU ("met balans") krijgen +1. D66 krijgt +1 terwijl zijn eigen uitspraak naar woningen neigt ("De woningnood is echter enorm"). BBB ("zoveel als mogelijk de groennorm 3-30-300 bereiken", p. 16) krijgt −1.
- **`natuur-landbouw-natuur`.** HvH (MijnStem 49: "Wij kiezen voor een balans tussen natuur en landbouw"), CU (55) en SBP (50) staan op null. SP, VVD en CDA krijgen 0 voor hetzelfde balans-antwoord.
- **`natuur-stikstof-boeren`.** SP krijgt 0 voor "De rekening mag niet eenzijdig bij de boer worden neergelegd". BBB krijgt +1 voor bijna dezelfde zin. CDA staat op null bij "kan wel naast boeren staan" (p. 53).
- **Van richting** (één per partij):
  - D66 `natuur-groennorm`;
  - Lokaal Eén `verkeer-terugdraaien` en `natuur-bomen` (de site trekt de conclusie "gewone bomen kunnen dus met herplant wijken", die niet in de bron staat);
  - CU `klimaat-wind-draagvlak` (+1, terwijl MijnStem zegt "Grote windturbines vinden we daarom niet haalbaar" en de CU in Wijdemeren tegen de motie 'Stop de windmolens' stemde);
  - Gewoon `verkeer-terugdraaien`;
  - BBB `natuur-groennorm`.
- **Een groep die vaker verliest?**
  - *Lokaal Eén:* de lezer voor die partij merkte op dat Lokaal Eén het kritischst gelezen is: twee keer van richting, beide in haar nadeel, en de enige −2 die de schaal niet draagt (`bestuur-dorpsraad-op-verzoek`, MijnStem 41).
  - *Gewoon:* bij Gewoon valt het op de parkeerstellingen steeds uit naar 'minder kritisch op betaald parkeren'.
  - *Verder:* voor de andere groepen vonden de lezers geen richting. De fouten verdelen zich over links en rechts, groot en klein.
- **Voorstel.** De zes genoemde stellingen voor alle partijen opnieuw scoren.

**Bevinding 8 (klein, aangetoond): toon.**

- **BBB:** "categorisch tegen", terwijl de bron 'absoluut' zegt, en "de felste kritiek". Bij stikstof staat een zin die de stelling bestrijdt: "Dat de natuur daardoor trager herstelt, zegt BBB niet".
- **Lijst Van Oostveen:** 13 keer "Van Oostveen vindt/zegt", waar andere partijen "de partij" krijgen. Dat is verklaarbaar, want het is een persoonlijke lijst, maar het klinkt anders.
- **PvdD:** "slechts schijnveiligheid"; 'slechts' staat niet in de bron.
- **Kleinere punten:** Volt "geen eigen lijn", CU "koos bewust 'neutraal'".
- **Voorstel:** deze woorden vervangen door de woorden van de bron.

## Laag 3: de rekenwijze

**Hoe het nu werkt (`src/engine.mjs`)**

- **Afstand.** Per stelling wordt de afstand tussen antwoord en positie gestandaardiseerd: voor elke positie scoort een willekeurige invuller gemiddeld 0. Dat corrigeert terecht het bekende voordeel van middenposities.
- **Geen standpunt.** Een partij zonder standpunt krijgt die 0. Het percentage schaalt vervolgens per antwoord tussen de slechtst en best mogelijke positie.
- **Wat dat oplevert.** Per stelling wordt 'geen standpunt' daardoor:

| Jouw antwoord | Oneens | Eerder oneens | Neutraal | Eerder eens | Eens |
|---|---:|---:|---:|---:|---:|
| Partij midden (0) | 17% | 47% | 100% | 47% | 17% |
| Partij eens (+2) | 5% | 0% | 0% | 68% | 100% |
| Partij eerder oneens (−1) | 66% | 100% | 24% | 6% | 0% |
| **Geen standpunt** | **53%** | **34%** | **0%** | **34%** | **53%** |

Wie "neutraal" antwoordt, geeft een partij zonder standpunt dus 0%, net zo weinig als een partij die het hartgrondig eens of oneens is. Wie "eerder eens" antwoordt, geeft haar 34%, minder dan een partij die het midden kiest (47%).

Dat is het tegendeel van 'neutraal'. Maar het belangrijkste effect zit niet in één stelling. Het zit erin dat een partij zonder standpunt nooit punten kan halen bij kiezers die het met haar eens zijn. Partijen met een standpunt kunnen dat wel. Bij de kiezers die het best bij haar passen, verliest ze daardoor juist terrein.

**Bijvangst: geen nette volgorde.** Bij "eens" scoort "eerder oneens" (0%) lager dan "oneens" (5%). Het effect is klein, maar de verantwoording zegt "de tegenovergestelde [positie telt] het minst".

**Bevinding 1 (ernstig, aangetoond): minder bekende standpunten, minder vaak bovenaan**

Zie tabel B en C.

- **Willekeurige kiezers** (alle 20 partijen, alle 90 stellingen). De kans om bovenaan te komen loopt van 2,9% (HvH) tot 7,9% (PRO). De samenhang met het aantal bekende standpunten is 0,86. Dezelfde partijen staan ook vaker onderaan: veel standpunten geeft meer spreiding. Bij willekeur valt dat dus weg tegen elkaar, maar bij echte kiezers niet.
- **Mengkiezers.**
  - *Per partij:* hun hoofdpartij komt bovenaan bij PRO 99,6%, FVD 97,7% en VVD 96,7%, maar bij SCB 54,6%, SBP 59,2%, Lijst Van Oostveen 65,8%, HvH 72,7%, Volt 80,9% en Dorp voor Dorp 82,3%.
  - *Samenhang:* die met het aantal bekende standpunten is 0,92.
  - *Per groep:* landelijk 92,8% tegen lokaal 77,1%. Coalitie 95,9% tegen oppositie 83,5% en nieuw 82,9%. Hilversumse lokale partijen 73,9%.
  - *Links en rechts:* nauwelijks verschil (86,5% en 85,1%).
- **Maskeerproef.**
  - *Alle partijen:* 30% minder standpunten laat de winkans bij andere kiezers dalen van 5,0 naar 2,8%, en bij de eigen kiezers van 85 naar 52%.
  - *Per partij:* bij HvH gaat de eigen aanhang van 77 naar 23%, bij SBP van 51 naar 12%.
  - *Wat dit bewijst:* het enige dat verandert is het aantal bekende standpunten. Het nadeel zit dus in de rekenwijze, niet in hoe dicht de partij bij andere partijen staat.
- **Andere stijl van invullen.** Bij kiezers die gematigd antwoorden ('eerder eens' of 'eerder oneens' in plaats van 'eens' of 'oneens'), zakt de herkenning van partijen met veel 'geen standpunt' verder: Lijst Van Oostveen naar 53%, Dorp voor Dorp naar 64%, Volt naar 67%. Bij zo'n antwoord levert 'geen standpunt' maar 34% op (tabel hierboven).
- **De bedoeling achter de huidige keuze.** De verantwoording zegt dat zo voorkomen wordt dat "een partij met een dun programma … bovenaan [kan] eindigen op twee toevallige treffers". Gemeten: dat risico is klein, ook zonder deze bescherming. In deelverzamelingen wint een partij met minder dan de helft standpunten op de beantwoorde stellingen nu in 0,3% van de uitslagen, en met het voorstel in 1,7%. De uitslag waarschuwt daar al voor ("Deze score zegt daardoor weinig").

**Voorstel en het effect ervan** (gemeten, tabel C)

In `bereken` een stelling zonder standpunt voor die partij overslaan, in teller én noemer. De gestandaardiseerde maat blijft, dus de correctie voor middenposities blijft ook. In code:

```js
const p = positie(st, slug);
if (p !== null) bekend++;
else { /* telt voor deze partij niet mee */ continue; }   // nieuw; daarna teller/noemer zoals nu
```

(Ook de berekening per thema en de telling `beantwoord` blijven dan kloppen. De noot "Van X van jouw Y stellingen is een standpunt bekend" blijft nodig. Let op één randgeval: heeft een partij op geen enkele beantwoorde stelling een standpunt, dan wordt haar score `null`. `tekenUitslag` moet dat dan als "–" tonen en haar onderaan zetten.)

| | Site nu | Voorstel |
|---|---:|---:|
| Maskeerproef, eigen kiezers | 85 → 52% | 91 → 89% |
| Maskeerproef, andere kiezers | 5,0 → 2,8% | 4,9 → 5,0% |
| Herkend, laagste partij | 55% (SCB) | 78% (SCB) |
| Willekeur, laagste–hoogste | 2,9–7,9% | 3,1–6,8% |
| Spreiding bij overal hetzelfde antwoord | 10–19 procentpunt | 13–24 procentpunt |

- **Wat overblijft.** Het verschil dat na het voorstel overblijft (SCB 78%, SBP 79%, HvH 81% tegen 96% bij PRO) komt door echte nabijheid: HvH, Gewoon en SBP liggen dicht bij elkaar. Dat zou een eerlijke stemhulp ook laten zien.
- **De twee alternatieven.**
  - *Gewone afstand op de bekende standpunten:* haalt het nadeel ook weg, maar brengt het voordeel van middenposities terug. Lokaal Eén zou dan 15,6% van de willekeurige kiezers winnen.
  - *Variant met krimp:* elke partij krijgt er drie 'gemiddelde' stellingen bij. Die maakt dunne winsten zeldzamer, maar geeft een grotere spreiding bij willekeur.
  - *Conclusie:* het eenvoudige voorstel is het evenwichtigst.
- **Na het herstel.** `tools/toets.mjs` en `data/toets.json` opnieuw draaien, en de verantwoording aanpassen (bevinding 6).

**Bevinding 4 (middel, aangetoond): gelijke stand**

`bereken` sorteert bij gelijke score op het aantal bekende standpunten en daarna op de slug, dus op alfabet. Zie tabel D.

- **Hoe vaak.** In 1,0% van de uitslagen is de stand bovenaan exact gelijk. In 4,7% scheelt het minder dan een half procentpunt, en dan zegt de kop "X en Y staan even dicht bij je".
- **Wie als eerste staat:**
  - BBB 58 van 65 keer (89%);
  - Lijst Van Oostveen 45 van 51;
  - BVNL 41 van 51;
  - VVD 2 van 33, Volt 5 van 48, SBP 6 van 48.
- **Waar het zichtbaar is.** Die partij staat als eerste in de kop, bovenaan de lijst, en in de bezoektelling als 'nummer1'.
- **Voorstel.** Bij gelijke score de volgorde van het stembiljet gebruiken, zoals overal op de site. Of willekeurig per bezoek, maar dan herhaalbaar via de gedeelde link. De voorkeur voor 'meer bekend' laten vallen.

**De keuze van stellingen.** `kiesStellingen` geeft de voorkeur aan stellingen waar meer gekozen partijen een standpunt hebben. Dat helpt partijen met weinig standpunten juist: SCB heeft in de gekozen stellingen 31% 'geen standpunt', tegen 46% in dezelfde thema's. Bij PRO is dat 10% tegen 12%. In deelverzamelingen wint elke partij 0,75 tot 1,18 keer zo vaak als bij loting; de lage uitschieters zijn weer SCB, SBP en Lijst Van Oostveen (bevinding 1). Dit onderdeel is in orde.

**Gewicht en eigen keuze.** "Extra belangrijk" verdubbelt alleen het eigen antwoord en werkt voor alle partijen gelijk. De keuze van partijen en thema's is helemaal aan de bezoeker; er is niets standaard aangevinkt.

**Zelfherkenning.** Wie precies antwoordt als partij X, krijgt X bovenaan: 20 van de 20 partijen, ook als hij overal ±2 antwoordt waar de partij ±1 zegt.

**Overal hetzelfde antwoord.** De spreiding tussen hoogste en laagste partij is 10 tot 19 procentpunt.

| Antwoord | Bovenaan | Onderaan |
|---|---|---|
| Overal "neutraal" | Lokaal Eén (30%) | FVD (11%) |
| Overal "eens" | SP (46%) | Lokaal Eén (35%) |
| Overal "oneens" | PvdD (47%) | CDA (35%) |

Dat is te verwachten en treft geen vaste groep.

## Laag 4: de presentatie

**In orde (nagelopen in `build.mjs` en `src/assets/js/`)**

- **Volgorde.** Op elke pagina staan de partijen in de volgorde van het stembiljet: voorpagina, stemwijzer, partijoverzicht, vergelijkpagina, keuzelijsten en matrix. Binnen een kolom van het spectrum en bij "Wat vinden de partijen?" ook.
- **Aangevinkt en kaders.** Er is niets standaard aangevinkt. De logo's staan in vakken van dezelfde maat (`.logo`, 6,5 × 3,9 rem). Kleuren zijn de partijkleuren. Elke partijpagina heeft dezelfde opbouw.
- **De kaart 'wie staat dicht bij wie'.** Een klassieke MDS van de onderlinge afstand.
  - *Hoeveel de kaart toont:* 68% van de spreiding.
  - *Per partij:* de samenhang tussen afstand op de kaart en echte afstand is 0,80 (Lokaal Eén) tot 0,99.
  - *Buren:* bij VVD, SBP en Volt staat maar één van de drie echte naaste buren ook op de kaart naast hen.
  - *Uitleg:* de kaarttekst zegt al dat "plat op een scherm" het "nooit helemaal" klopt, en de vergelijking zelf rekent met de echte afstanden. Geen bevinding, wel een reden om de tekst te laten staan.
- **Deelbeelden.** Voor elke partij wordt hetzelfde sjabloon gebruikt (`tools/deelbeelden.mjs`).
- **Voorpagina en vergelijkpagina.** Ze behandelen alle partijen gelijk; er wordt geen partij uitgelicht.

**Bevinding 5 (middel, aangetoond): partijteksten** (`data/partijen.json`, zie `lezing/_toon.md`)

- **Hart voor Hilversum.** Alleen hier staat in de achtergrond "Drie raadsleden stapten in die jaren over naar andere fracties". Vergelijkbaar vertrek bij D66, VVD, PvdA en GroenLinks (nu PRO) en De Lokale Partij (nu Lokaal Eén) wordt niet genoemd. Voorstel: schrappen, of bij alle partijen op dezelfde manier vermelden.
- **Lokaal Eén.** Alleen "De Lokale Partij werd in 2022 met 8 van de 19 zetels de grootste in Wijdemeren"; de zetels van de andere voorgangers en het vertrek ontbreken. Voorstel: dezelfde soort feiten als bij de andere partijen.
- **SCB.** Alleen hier noemt de kernboodschap het programma kort; BVNL heeft er een van dezelfde omvang (1.879 tegen 1.825 woorden). Voorstel: bij beide, of bij geen van beide.
- **Kleinere punten.**
  - *Introductie:* bij de CU ontbreekt de vermelding 'oppositie', die bij D66, SP en HvH wel staat. Alleen bij het CDA staat dat de lijsttrekker wethouder is.
  - *Kleurende woorden:* bij VVD "minimale lokale eisen", waar het programma "geen extra lokale eisen" zegt. Bij Gewoon "formuleert zij concrete afwijzingen".
  - *Opvallend en dun:* de velden `opvallend` en `dun` komen niet op de site, maar staan wel in de openbare repository. Bij OpStand.nu staat in `opvallend` een samenvatting die niet klopt met de bron.

**Bevinding 6 (middel, aangetoond): de verantwoording klopt niet met de rekenwijze.**

- **Twee tegenstrijdige zinnen.** `build.mjs:584` zegt "telt de stelling voor die partij als half overeenkomend". `data/verantwoording.html:49` zegt "telt die stelling voor die partij neutraal: het helpt haar niet en het schaadt haar niet". De eerste beschrijft de oude rekenwijze, de tweede wordt door de maskeerproef weerlegd.
- **Voorstel.** De eerste zin schrappen. Na herstel 1 de tweede zin vervangen door: "telt die stelling voor die partij niet mee".

## Laag 5: kandidaten en logo's

Zie tabel F.

**Gemeten**
- **Foto's.** Lokale partijen hebben vaker foto's dan landelijke (83% tegen 73%), en de oppositie vaker dan de coalitie (83% tegen 61%). Laag zijn CDA (14 van 50), Lokaal Eén (14 van 32) en BVNL (3 van 7).
- **Beschrijvingen.** PvdD heeft er 1 van 11, PRO 8 van 25, CDA 14 van 50. HvH, Gewoon, SBP en LFD hebben er bij alle kandidaten een.
- **LinkedIn.** VVD 31 van 33, D66 23 van 50, verder vrijwel overal minder dan een derde.
- **Logo's.** Alle partijen hebben een logo, behalve Lijst Van Oostveen; die heeft geen partijnaam en geen logo, en krijgt een naamvak.

**Oordeel.** De verschillen zijn verklaarbaar uit wat partijen zelf publiceren. Een foto of beschrijving staat er alleen als die van de partij of de gemeente komt en in twee rondes bevestigd is (`werk/briefs/kandidaten*.md`). Het voordeel valt niet één kant op: grote partijen hebben juist minder foto's.

**Klein (aangetoond).**
- **LFD.** De beschrijving van de lijsttrekker is wervend: ze noemt een publieksprijs, de enige in 190 beschrijvingen, en "schreef als eenpitter een eigen tegenbegroting".
- **Andere bio's.** Er staan een paar wervende woorden in ("praktische en realistische aanpak", "cultuurtempel"). Een eerdere partij wordt niet overal even consequent vermeld.
- **Voorstel.** De bio's terugbrengen tot functie, werk en onderwerp, zoals bij de meeste kandidaten.

## Laag 6: de uitlegvideo

De gesproken tekst (`video/script.md`) noemt geen enkele partij. Uitslag en voorbeeldstandpunt zijn onleesbaar gemaakt.

**Klein (aangetoond).**
- **Scène 'anders'.** Hier worden de lijstnummers 4, 7, 12 en 17 rood gekleurd en zijn ze leesbaar: VVD, SP, Dorp voor Dorp en LFD. In de scène 'biljet' zijn de nummers wel onleesbaar.
- **Partijpagina's.** De laatste (BBB) staat ongeveer 1,4 seconde in beeld, de andere 0,26 seconde.
- **Voorstel.** De nummers onleesbaar maken of willekeurig verdelen, en de laatste partijpagina even lang tonen. Een nieuwe render is nodig. De partijpagina's zitten als schermbeeld in de video, dus herstel 5 komt pas na een nieuwe opname in de film.

## De bestaande toets: meet hij het juiste?

`node tools/toets.mjs` gaf bij opnieuw draaien exact dezelfde uitkomst als `data/toets.json`. De toets is herhaalbaar. Hij meet zinvolle dingen (zelfherkenning, willekeur, overal hetzelfde antwoord, richting, onderscheid), maar heeft vier blinde vlekken:

1. **De proef-aanhanger slaat over waar zijn partij zwijgt.** Een stelling waar zijn partij geen standpunt heeft, beantwoordt de proef-aanhanger niet ("wie het programma volgt, heeft hier geen houvast: sla over"). Precies daar zit het nadeel uit bevinding 1. Zo komt de toets op 97 tot 100% herkenning voor elke partij, terwijl een kiezer die ook daar een mening heeft op 55 tot 100% uitkomt.
2. **De willekeur-uitkomst krijgt geen conclusie.** Ze wordt gemeld ("loopt van 3,0% tot 7,8%"), maar niet gekoppeld aan het aantal bekende standpunten (samenhang 0,88).
3. **Gelijke stand wordt niet getoetst.**
4. **De toets kan niet zeggen of het nadeel aan de partij ligt of aan de rekenwijze.** Er is geen proef die alleen het aantal standpunten verandert. Dat doet de maskeerproef wel.

**Voorstel.** Neem de mengkiezer en de maskeerproef uit `werk/audit/eindcontrole/meet.mjs` op in `tools/toets.mjs`, met als eis: de maskeerproef verandert de winkans hooguit een paar tienden. En toets de gelijke stand.

## Aangetoond en vermoed

**Aangetoond** (na te draaien met de scripts, of met citaat uit de bron in `lezing/`):
- bevinding 1, 4 en 6, en de score per stelling uit laag 3;
- de concrete gevallen onder bevinding 2, 3, 5, 7, 8 en 9;
- de cijfers in de tabellen.

**Geschat of vermoed:**
- *Ontbrekende standpunten:* het aantal over de hele bank (50 tot 70) is geschat uit een steekproef.
- *Mengkiezer:* dat model geeft de verhoudingen goed weer, maar is een model. Echte kiezers kunnen anders invullen. De richting van het effect is in elk model gelijk (willekeurig, gemengd, sterk, mild, maskeerproef).
- *Lokaal Eén en Gewoon:* dat zij systematisch kritischer gelezen zijn, is een vermoeden van één lezer, gestaafd door twee tot drie gevallen per partij. Te weinig om van een patroon te spreken.
- *Speerpunten:* de dekking per groep is het oordeel van één lezer.

## Bijlage: tabellen

### Tabel A. Standpunten per partij

| Partij | Bekend (van 90) | +2 | +1 | 0 | −1 | −2 | Aandeel ±2 | Programma | Stemhulp | Stemgedrag | Afgeleid | Programma (woorden) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Hart voor Hilversum | 58 | 7 | 16 | 12 | 17 | 6 | 22,4% | 26 | 24 | 4 | 4 | 4.077 |
| PRO | 79 | 18 | 22 | 4 | 22 | 13 | 39,2% | 40 | 29 | 1 | 9 | 13.951 |
| D66 | 66 | 10 | 18 | 8 | 19 | 11 | 31,8% | 20 | 35 | 1 | 10 | 14.047 |
| VVD | 74 | 13 | 21 | 5 | 25 | 10 | 31,1% | 34 | 18 | 12 | 10 | 9.017 |
| CDA | 71 | 11 | 25 | 6 | 26 | 3 | 19,7% | 36 | 24 | 7 | 4 | 18.231 |
| Lokaal Eén | 70 | 5 | 20 | 16 | 24 | 5 | 14,3% | 29 | 32 | 0 | 9 | 9.967 |
| SP | 68 | 10 | 27 | 6 | 12 | 13 | 33,8% | 27 | 26 | 3 | 12 | 9.764 |
| ChristenUnie | 64 | 8 | 24 | 5 | 15 | 12 | 31,3% | 29 | 25 | 5 | 5 | 17.940 |
| BVNL | 67 | 10 | 21 | 2 | 19 | 15 | 37,3% | 22 | 38 | 0 | 7 | 1.879 |
| SCB | 49 | 4 | 18 | 5 | 18 | 4 | 16,3% | 5 | 37 | 0 | 7 | 1.825 |
| Gewoon, Hilversum | 64 | 9 | 21 | 12 | 17 | 5 | 21,9% | 19 | 38 | 1 | 6 | 16.585 |
| Dorp voor Dorp | 56 | 13 | 10 | 7 | 14 | 12 | 44,6% | 18 | 33 | 0 | 5 | 29.349 |
| Stop Betaald Parkeren-VIP | 50 | 7 | 13 | 8 | 19 | 3 | 20% | 13 | 33 | 0 | 4 | 12.139 |
| Opstand.nu | 61 | 7 | 19 | 4 | 19 | 12 | 31,1% | 13 | 37 | 2 | 9 | 4.581 |
| Partij voor de Dieren | 69 | 10 | 19 | 6 | 13 | 21 | 44,9% | 34 | 28 | 0 | 7 | 28.194 |
| Lijst Van Oostveen | 51 | 6 | 18 | 5 | 13 | 9 | 29,4% | 0 | 43 | 0 | 8 | 0 |
| LFD | 68 | 12 | 20 | 4 | 22 | 10 | 32,4% | 20 | 34 | 1 | 13 | 6.536 |
| Volt | 58 | 11 | 17 | 5 | 15 | 10 | 36,2% | 20 | 29 | 0 | 9 | 11.898 |
| FVD | 69 | 15 | 19 | 1 | 18 | 16 | 44,9% | 22 | 29 | 0 | 18 | 5.532 |
| BBB | 60 | 11 | 15 | 6 | 13 | 15 | 43,3% | 19 | 35 | 0 | 6 | 5.966 |


### Tabel B. Uitslag per partij: huidige rekenwijze en het voorstel

Herkend = aandeel van de kiezers met deze partij als hoofdpartij (mengkiezer, zie methode) dat haar bovenaan krijgt. Willekeur = aandeel bovenaan bij willekeurige antwoorden (eerlijk is 5%). Alle twintig partijen en alle 90 stellingen.

| Partij | Bekend | Herkend nu | Herkend voorstel | Willekeur nu | Willekeur voorstel | Willekeur onderaan nu | Maskeer: eigen kiezers nu | Maskeer: voorstel |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hart voor Hilversum | 58 | 72,7% | 80,8% | 2,9% | 3,6% | 2,9% | 77,3 → 22,7% | 86 → 83,5% |
| PRO | 79 | 99,6% | 96,1% | 7,9% | 4,1% | 7,7% | 99,3 → 83,7% | 98 → 96,2% |
| D66 | 66 | 89,8% | 93,6% | 4,8% | 5% | 5% | 93,3 → 48,8% | 95,3 → 93,2% |
| VVD | 74 | 96,7% | 93,8% | 6,8% | 4,5% | 7% | 94,7 → 80,2% | 94 → 93,5% |
| CDA | 71 | 94,5% | 91,4% | 5,6% | 4,2% | 5,7% | 93,3 → 72,8% | 91,3 → 89,7% |
| Lokaal Eén | 70 | 92,2% | 89% | 5,5% | 4,2% | 4,9% | 93,3 → 60% | 91,3 → 90,2% |
| SP | 68 | 94,2% | 94% | 6,4% | 5,1% | 6,4% | 94 → 71,3% | 92,7 → 91,7% |
| ChristenUnie | 64 | 89,5% | 91,7% | 5,1% | 5,2% | 5,3% | 88 → 48% | 92,7 → 90% |
| BVNL | 67 | 94,9% | 93,7% | 5,7% | 4,7% | 5,3% | 95,3 → 65,7% | 94 → 92,3% |
| SCB | 49 | 54,6% | 78% | 3,4% | 6,8% | 3,3% | 55,3 → 14,5% | 80 → 78,3% |
| Gewoon, Hilversum | 64 | 83,6% | 84,8% | 3,4% | 3,1% | 3,7% | 90,7 → 48,7% | 91,3 → 87,8% |
| Dorp voor Dorp | 56 | 82,3% | 92,1% | 4,2% | 6,2% | 4,1% | 75,3 → 43,3% | 90 → 85,8% |
| Stop Betaald Parkeren-VIP | 50 | 59,2% | 79,2% | 3% | 6,2% | 3,1% | 50,7 → 11,8% | 75,3 → 75,3% |
| Opstand.nu | 61 | 87,4% | 91,3% | 4,6% | 5,4% | 4,7% | 90,7 → 50,7% | 94,7 → 92,2% |
| Partij voor de Dieren | 69 | 95,5% | 96,1% | 5,8% | 5% | 6,4% | 96,7 → 65,7% | 95,3 → 95,8% |
| Lijst Van Oostveen | 51 | 65,8% | 83,6% | 3% | 5,8% | 3% | 62,7 → 28,8% | 80 → 80% |
| LFD | 68 | 95,4% | 95,6% | 7% | 5,6% | 6,5% | 92 → 68,3% | 94,7 → 91,5% |
| Volt | 58 | 80,9% | 91,7% | 3,8% | 5,5% | 3,9% | 76,7 → 38,2% | 86 → 87,3% |
| FVD | 69 | 97,7% | 96,3% | 7,7% | 6,3% | 7,6% | 98,7 → 81,3% | 96 → 96,7% |
| BBB | 60 | 88,8% | 93,3% | 3,2% | 3,6% | 3,3% | 89,3 → 37% | 94,7 → 93,3% |


### Tabel C. Rekenwijzen naast elkaar (zelfde kiezers)

| Rekenwijze | Willekeur min–max | Samenhang willekeur en aantal bekend | Herkend gemiddeld (laagste) | Samenhang herkend en aantal bekend | Maskeerproef: andere kiezers | Maskeerproef: eigen kiezers | Spreiding bij overal hetzelfde antwoord (+2/+1/0/−1/−2) | Dunne winst in deelverzamelingen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Site nu | 2,9–7,9% | 0,9 | 85,8% (54,6%) | 0,9 | 5.01 → 2.84% | 85.37 → 52.07% | 0.12 / 0.11 / 0.19 / 0.11 / 0.1 | 0,3% |
| Voorstel: geen standpunt telt niet mee | 3,1–6,8% | -0,5 | 90,3% (78%) | 0,8 | 4.94 → 5.01% | 90.67 → 89.22% | 0.16 / 0.14 / 0.24 / 0.14 / 0.13 | 1,7% |
| Idem met krimp | 2,7–8,9% | -0,6 | 89,8% (79,2%) | 0,9 | 4.94 → 5% | 90.27 → 87.96% | 0.15 / 0.14 / 0.23 / 0.13 / 0.13 | 1,3% |
| Gewone afstand, alleen bekend | 0,8–15,6% | -0,4 | 91,6% (85,5%) | 0,9 | 4.91 → 5.03% | 91.47 → 90.76% | 0.11 / 0.11 / 0.13 / 0.11 / 0.11 | 1,6% |


### Tabel D. Gelijke stand en de keuze van stellingen (deelverzamelingen zoals bezoekers ze maken)

19.964 proeven met 2 tot 20 partijen en 1 tot 11 thema's, telkens een willekeurige kiezer en een mengkiezer: 39.928 uitslagen. Exact gelijke stand bovenaan: 393 keer (1%); binnen een half procentpunt ('staan even dicht bij je'): 1883 keer (4,7%).

| Partij | Slug (bepaalt nu de volgorde) | Bij gelijke stand bovenaan | Daarvan als eerste genoemd | Winst t.o.v. verwacht (mengkiezer) | Geen standpunt in gekozen stellingen | Geen standpunt in die thema's |
|---|---:|---:|---:|---:|---:|---:|
| Hart voor Hilversum | hart-voor-hilversum | 67 | 19 (28%) | 0,9 | 25,5% | 35,4% |
| PRO | pro | 23 | 10 (43%) | 1,1 | 9,8% | 12,3% |
| D66 | d66 | 27 | 20 (74%) | 1 | 19,5% | 26,7% |
| VVD | vvd | 33 | 2 (6%) | 1,1 | 11,6% | 17,8% |
| CDA | cda | 28 | 17 (61%) | 1 | 13,3% | 21,2% |
| Lokaal Eén | lokaal-een | 18 | 7 (39%) | 1 | 15,3% | 22,1% |
| SP | sp | 30 | 5 (17%) | 1,1 | 17,4% | 24,5% |
| ChristenUnie | christenunie | 37 | 25 (68%) | 1 | 21,5% | 28,9% |
| BVNL | bvnl | 51 | 41 (80%) | 1,2 | 14,8% | 25,4% |
| SCB | scb | 49 | 7 (14%) | 0,7 | 31,2% | 45,6% |
| Gewoon, Hilversum | gewoon-hilversum | 38 | 24 (63%) | 1 | 18,1% | 28,9% |
| Dorp voor Dorp | dorp-voor-dorp | 65 | 36 (55%) | 0,9 | 25,7% | 38% |
| Stop Betaald Parkeren-VIP | stop-betaald-parkeren-vip | 48 | 6 (13%) | 0,8 | 30,4% | 44,5% |
| Opstand.nu | opstand-nu | 48 | 17 (35%) | 0,9 | 21,4% | 32,3% |
| Partij voor de Dieren | pvdd | 38 | 13 (34%) | 1,1 | 15,5% | 23,2% |
| Lijst Van Oostveen | blanco-van-oostveen | 51 | 45 (88%) | 0,9 | 29% | 43,3% |
| LFD | lfd | 45 | 17 (38%) | 1,1 | 16,3% | 24,4% |
| Volt | volt | 48 | 5 (10%) | 0,9 | 26,4% | 35,6% |
| FVD | fvd | 54 | 19 (35%) | 1,1 | 16,3% | 23,3% |
| BBB | bbb | 65 | 58 (89%) | 1 | 22,6% | 33,3% |


### Tabel E. Leesronde: steekproef tegen de bron

| Partij | Gelezen | Klopt | Eén stap (verdedigbaar) | Eén stap te ver | Andere richting | Ten onrechte geen standpunt | Ten onrechte wel | Fout % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hart voor Hilversum | 25 | 20 | 1 | 1 | 0 | 3 | 0 | 16% |
| PRO | 28 | 26 | 2 | 0 | 0 | 0 | 0 | 0% |
| D66 | 33 | 28 | 2 | 0 | 1 | 2 | 0 | 9% |
| VVD | 29 | 21 | 3 | 0 | 0 | 4 | 1 | 17% |
| CDA | 28 | 20 | 5 | 0 | 0 | 3 | 0 | 11% |
| Lokaal Eén | 27 | 18 | 3 | 1 | 2 | 3 | 0 | 22% |
| SP | 23 | 19 | 2 | 0 | 0 | 2 | 0 | 9% |
| ChristenUnie | 28 | 24 | 2 | 0 | 1 | 1 | 0 | 7% |
| BVNL | 29 | 26 | 1 | 0 | 0 | 2 | 0 | 7% |
| SCB | 21 | 17 | 2 | 0 | 0 | 1 | 1 | 10% |
| Gewoon, Hilversum | 27 | 22 | 2 | 1 | 1 | 1 | 0 | 11% |
| Dorp voor Dorp | 27 | 19 | 6 | 1 | 0 | 1 | 0 | 7% |
| Stop Betaald Parkeren-VIP | 33 | 23 | 3 | 0 | 0 | 7 | 0 | 21% |
| Opstand.nu | 24 | 21 | 2 | 0 | 0 | 1 | 0 | 4% |
| Partij voor de Dieren | 25 | 19 | 3 | 0 | 0 | 3 | 0 | 12% |
| Lijst Van Oostveen | 24 | 21 | 3 | 0 | 0 | 0 | 0 | 0% |
| LFD | 27 | 22 | 2 | 1 | 0 | 2 | 0 | 11% |
| Volt | 22 | 20 | 2 | 0 | 0 | 0 | 0 | 0% |
| FVD | 27 | 23 | 1 | 0 | 0 | 3 | 0 | 11% |
| BBB | 29 | 22 | 2 | 1 | 1 | 3 | 0 | 17% |

| Laag van de steekproef | Gelezen | Fout | Ten onrechte geen | Andere richting |
|---|---:|---:|---:|---:|
| gespreide trekking | 240 | 4 (2%) | 0 | 1 |
| A/B andere richting | 115 | 13 (11%) | 3 | 5 |
| gespreide trekking (geen standpunt) | 60 | 7 (12%) | 7 | 0 |
| nu geen standpunt, een ronde zag er wel een | 121 | 32 (26%) | 32 | 0 |


### Tabel F. Presentatie, kandidaten en teksten per partij

| Partij | Kandidaten | Foto | Beschrijving | LinkedIn | Woorden per beschrijving | Logo | Woorden achtergrond | Woorden kernboodschap | Speerpunten | Genoemd in uitleg stellingen | Kaart: juiste buren (van 3) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Hart voor Hilversum | 17 | 17 | 17 | 4 | 28,2 | ja | 49 | 78 | 8 | 0 | 2 |
| PRO | 25 | 20 | 8 | 10 | 23,9 | ja | 42 | 92 | 7 | 2 | 2 |
| D66 | 50 | 30 | 30 | 23 | 25,2 | ja | 26 | 62 | 8 | 1 | 3 |
| VVD | 33 | 31 | 22 | 31 | 16,1 | ja | 23 | 84 | 8 | 3 | 1 |
| CDA | 50 | 14 | 14 | 8 | 26,4 | ja | 30 | 70 | 8 | 1 | 2 |
| Lokaal Eén | 32 | 14 | 13 | 6 | 14,6 | ja | 42 | 61 | 8 | 0 | 2 |
| SP | 25 | 22 | 18 | 1 | 24,8 | ja | 27 | 74 | 8 | 0 | 3 |
| ChristenUnie | 25 | 25 | 12 | 3 | 11,8 | ja | 22 | 56 | 8 | 0 | 2 |
| BVNL | 7 | 3 | 3 | 1 | 13,7 | ja | 42 | 65 | 8 | 0 | 2 |
| SCB | 3 | 2 | 2 | 0 | 11 | ja | 27 | 58 | 7 | 0 | 2 |
| Gewoon, Hilversum | 7 | 7 | 7 | 1 | 20 | ja | 27 | 76 | 8 | 1 | 2 |
| Dorp voor Dorp | 9 | 8 | 8 | 0 | 25,8 | ja | 29 | 82 | 8 | 0 | 2 |
| Stop Betaald Parkeren-VIP | 6 | 6 | 6 | 0 | 12,8 | ja | 20 | 79 | 7 | 0 | 1 |
| Opstand.nu | 10 | 5 | 5 | 2 | 30,6 | ja | 18 | 62 | 8 | 0 | 2 |
| Partij voor de Dieren | 11 | 10 | 1 | 4 | 33 | ja | 21 | 60 | 6 | 0 | 3 |
| Lijst Van Oostveen | 1 | 1 | 0 | 1 | – | nee (naam) | 16 | 0 | 6 | 0 | 3 |
| LFD | 5 | 5 | 5 | 2 | 22,8 | ja | 25 | 64 | 8 | 0 | 2 |
| Volt | 6 | 6 | 5 | 3 | 28,8 | ja | 17 | 71 | 8 | 1 | 1 |
| FVD | 14 | 6 | 5 | 1 | 20,4 | ja | 19 | 69 | 8 | 0 | 3 |
| BBB | 11 | 8 | 8 | 1 | 28,5 | ja | 17 | 61 | 7 | 0 | 2 |


### Tabel G. Per groep (gemiddelde van de partijen in de groep)

| Maat | landelijk (11) | lokaal (9) | groot (6) | klein (14) | coalitie (4) | oppositie (8) | nieuw (8) | wijdemeers (2) | hilversums_lokaal (7) | links (9) | rechts (11) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Standpunten bekend | 67,7 | 58,6 | 69,7 | 61 | 73,5 | 62,3 | 60 | 63 | 57,3 | 64,9 | 62,6 |
| Aandeel ±2 (%) | 36 | 26 | 26 | 33 | 26 | 28 | 38 | 29 | 25 | 31 | 32 |
| Bovenaan bij willekeur (%) | 5,8 | 4 | 5,6 | 4,7 | 6,4 | 4,7 | 4,6 | 4,7 | 3,9 | 5,2 | 4,8 |
| Bovenaan bij mengkiezers (%) | 5,5 | 4,4 | 5,6 | 4,8 | 6 | 4,8 | 4,7 | 5,2 | 4,1 | 5,1 | 4,9 |
| Herkend door eigen kiezers (%) | 92,8 | 77,1 | 91,5 | 83,3 | 95,9 | 83,5 | 82,9 | 88,1 | 73,9 | 86,5 | 85,1 |
| Winst in deelverzamelingen t.o.v. verwacht | 1,1 | 0,9 | 1 | 1 | 1,1 | 1 | 1 | 1 | 0,9 | 1 | 1 |
| Genoemd in uitleg | 0,7 | 0,1 | 1,2 | 0,1 | 1,5 | 0,3 | 0,1 | 0 | 0,1 | 0,4 | 0,5 |
| Kandidaten met foto (%) | 73 | 83 | 68 | 82 | 61 | 83 | 80 | 66 | 88 | 75 | 79 |
| Herkend, voorstel (%) | 93,8 | 86 | 90,8 | 90,1 | 92,6 | 88,7 | 90,7 | 90,5 | 84,7 | 91,3 | 89,5 |

Indeling: **landelijk**: PRO, D66, VVD, CDA, SP, ChristenUnie, BVNL, Partij voor de Dieren, Volt, FVD, BBB; **lokaal**: Hart voor Hilversum, Lokaal Eén, SCB, Gewoon, Hilversum, Dorp voor Dorp, Stop Betaald Parkeren-VIP, Opstand.nu, Lijst Van Oostveen, LFD; **groot**: Hart voor Hilversum, PRO, D66, VVD, CDA, Lokaal Eén; **klein**: SP, ChristenUnie, BVNL, SCB, Gewoon, Hilversum, Dorp voor Dorp, Stop Betaald Parkeren-VIP, Opstand.nu, Partij voor de Dieren, Lijst Van Oostveen, LFD, Volt, FVD, BBB; **coalitie**: PRO, VVD, CDA, Lokaal Eén; **oppositie**: Hart voor Hilversum, D66, SP, ChristenUnie, SCB, Gewoon, Hilversum, Opstand.nu, LFD; **nieuw**: BVNL, Dorp voor Dorp, Stop Betaald Parkeren-VIP, Partij voor de Dieren, Lijst Van Oostveen, Volt, FVD, BBB; **wijdemeers**: Dorp voor Dorp, Lokaal Eén; **hilversums_lokaal**: Hart voor Hilversum, SCB, Gewoon, Hilversum, Stop Betaald Parkeren-VIP, Opstand.nu, Lijst Van Oostveen, LFD; **links**: PRO, D66, Lokaal Eén, SP, ChristenUnie, SCB, Opstand.nu, Partij voor de Dieren, Volt; **rechts**: Hart voor Hilversum, VVD, CDA, BVNL, Gewoon, Hilversum, Dorp voor Dorp, Stop Betaald Parkeren-VIP, Lijst Van Oostveen, LFD, FVD, BBB.
