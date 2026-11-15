# Stemgedrag gemeenteraden Hilversum en Wijdemeren 2022–2026

## Wat er is en hoe het tot stand kwam

- Primaire bron Hilversum: iBabs (hilversum.bestuurlijkeinformatie.nl). Alle 56 raadsvergaderingen van 30-3-2022 t/m 11-11-2026 zijn opgehaald; die bevatten 904 stemmingen met hoofdelijke registratie (wie voor, wie tegen), waarvan 505 niet unaniem. Vijf vergaderingen hebben geen stemregistratie (o.a. 1-2-2023 en 27-3-2025); daarvoor is de besluitenlijst gelezen waar dat nodig was.
- Primaire bron Wijdemeren: Notubiz (wijdemeren.raadsinformatie.nl). 57 raadsvergaderingen, 486 stemmingen, 134 niet unaniem. Een aantal stemmingen staat alleen als tekst in het verslag of in de besluitenlijst (o.a. 15-2-2024).
- `stemmingen.json` bevat 120 geselecteerde stemmingen (92 Hilversum, 28 Wijdemeren). Bij alle 120 is de uitslag per fractie in de primaire bron gezien (`geverifieerd: true`). Twee komen uit een besluitenlijst zonder hoofdelijke registratie. Van de 50 Stemgids-items uit deze periode die ook in de primaire data staan, kwamen er 49 meteen overeen met de primaire data. Het vijftigste verschil kwam door mijn eigen koppelscript; de onderliggende data klopt.
- `alle_stemmingen_2022-2026.json` bevat alle 1390 geregistreerde stemmingen (ook de unanieme), met link, als basis voor verdere selectie.
- "Voor" betekent steeds: voor het voorstel, amendement of de motie zoals ingediend. Kijk bij amendementen en moties dus goed wat het voorstel deed. Bij "Weigering vvgb Nederhorst den Berg Noord" betekent voor bijvoorbeeld: tegen de woningbouwlocatie.

## Leeswijzer: welke huidige lijst hoort bij welke fractie

Zie `fracties.json`. Kort:
- **PRO** = GroenLinks + PvdA (Hilversum) + PvdA-GroenLinks (Wijdemeren). GL en PvdA stemden in Hilversum lang niet altijd gelijk. GL zat in de coalitie, de PvdA tot mei 2024 niet. PRO erft dus twee profielen.
- **Lokaal Eén** = Democraten Hilversum + De Lokale Partij + DorpsBelangen. Ook hier stemden de voorgangers vaak verschillend (zie hieronder).
- **Gewoon, Hilversum**: Redmeijer stemde tot juli 2026 mee met HvH, Van de Linde tot september 2025 met de VVD en daarna apart. Colin Majoor was alleen commissielid en heeft geen stemgedrag.
- **LFD** = Durlacher: tot december 2024 als BVNL, daarna als Fractie Durlacher. Het BVNL-stemgedrag 2022–2024 is dus het hare. Of het geldt voor de BVNL-lijst van 2026 (met een andere lijsttrekker) is onzeker.
- **Opstand.nu** = Lahaise: vanaf mei 2025 eigen stemgedrag, daarvoor PvdA.
- **SCB** = al Ibrahim: alleen vanaf 28-1-2026 (ongeveer 10 maanden).
- Geen stemgedrag 2022–2026: Dorp voor Dorp, Stop Betaald Parkeren-VIP, PvdD, Volt, FVD, BBB, Blanco (Van Oostveen), en sinds december 2024 BVNL.
- Fractie Zaabat (ex-D66) en Groep Goetheer (ex-DLP) hebben geen lijst in 2026.

Afkortingen hieronder: HvH = Hart voor Hilversum, DH = Democraten Hilversum, GL = GroenLinks, CU = ChristenUnie, FD = Fractie Durlacher, VdL = Fractie Van de Linde, DLP = De Lokale Partij, DB = DorpsBelangen, PvdA-GL = PvdA-GroenLinks (Wijdemeren). "~" = fractie stemde verdeeld.

## Per thema: de scherpste scheidslijnen

### Betaald parkeren (alleen Hilversum)
1. **Parkeerbeleid 2023** (19-7-2023, aangenomen 21-15). Voor: HvH, VVD, GL, CDA, PvdA. Tegen: D66, DH, SP, CU, BVNL. Dit is de basisbeslissing over de uitbreiding.
2. **Motie "Parkeerbeleid terug naar de tekentafel"** (31-1-2024, verworpen 7-30). Voor: DH, SP, BVNL.
3. **Amendement "Parkeerbeleid heroverwegen moet ook kunnen"** (10-6-2026, verworpen 8-26). Voor: HvH, SP, VdL. Tegen: alle andere fracties, ook DH (toen coalitie) en OpStand.
4. **Bezoekersregeling gratis** (12-11-2025, verworpen 9-27). Voor: HvH, SP, OpStand. Tegen: de rest, ook FD en VdL.
5. **Tien procent minder parkeerplaatsen binnen de buitenring** (19-7-2023, verworpen 12-24). Voor: D66, PvdA, SP, CU. Dit is de groene kant van het parkeerdebat.

Onderscheidt: SP (steeds tegen betaald parkeren), HvH (stemde de uitbreiding in 2023 als coalitiepartij nog voor, stemde vanaf 2025 voor terugdraaien en gratis bezoek), DH/Lokaal Eén (in 2023–2024 tegen, als coalitiepartij vanaf mei 2024 niet meer voor terugdraaien) en D66 (tegen dit parkeerbeleid, maar vóór minder parkeerplaatsen en hogere tarieven). Stop Betaald Parkeren-VIP heeft geen stemgedrag. GL en PvdA (PRO) stemden voor het beleid.

### Fusie Hilversum–Wijdemeren
1. **Principebesluit** (Hilversum 10-7-2024, 31-6) en **herindelingsadvies** (27-3-2025): alleen HvH tegen. In Wijdemeren was het principebesluit 16-1 (alleen D66 tegen) en het advies unaniem (17-0).
2. **Referendum**: in Hilversum werd het amendement "Referendum mogelijkheid" (31-1-2024) aangenomen met 19-18. Voor: HvH, D66, PvdA, SP, BVNL. Tegen: VVD, GL, CDA, DH, CU. In Wijdemeren werd de referendumverordening (15-2-2024) verworpen met 4-14. Voor: DB, D66, Goetheer. Tegen: DLP, CDA, PvdA-GL, VVD, CU.
3. **Startnotitie herindeling** (Hilversum 31-1-2024): alleen DH tegen. DH wilde ook strengere financiële eisen ("geen financieel fusie-nadeel", alleen DH en SP voor).
4. **Start verkenning bestuurlijke fusie** (Wijdemeren 5-10-2023, 14-2): D66 en Goetheer tegen.

Onderscheidt: HvH (de enige fractie die de fusie zelf afwees), D66 Wijdemeren (tegen, D66 Hilversum voor) en de referendumvraag (verdeelt PRO: PvdA voor, GL tegen; en Lokaal Eén: DB voor, DH en DLP tegen).

### Asiel en opvang
1. **Motie noodopvang "solidair met Ter Apel"** (Hilversum 20-12-2023, stemmen staakten 17-17). Voor: D66, DH, PvdA, SP, CU. Tegen: HvH, VVD, CDA, BVNL. GL verdeeld (3-1). De opvolger M24-26 heeft geen vastgelegde stemuitslag.
2. **Motie "Asielopvang: beleidskaders in relatie tot de voorgestelde locaties"** (Hilversum 1-7-2026, verworpen 7-28). Voor: HvH, FD, VdL.
3. **Motie "Geen vrijwillige medewerking Spreidingswet"** (1-7-2026, verworpen 3-32). Voor: alleen FD; HvH verdeeld (2-3).
4. **Noodopvang in het gemeentehuis Rading 1, Loosdrecht** (Wijdemeren 1-7-2026, aangenomen 14-4). Tegen: VVD (locatie ongeschikt) en DB (communicatie). Voor: DLP, CDA, PRO, D66, CU, Goetheer.
5. **Opvang Oekraïners, Emmastraat 15** (Hilversum 10-12-2025, aangenomen 29-7). Tegen: HvH, FD.

Onderscheidt: LFD (consequent tegen opvang), HvH en Gewoon (Van de Linde) aan de terughoudende kant, D66/SP/CU/PvdA aan de ruime kant. In Wijdemeren stemde de VVD anders dan de VVD in Hilversum, die de asielkaders steunde. De Lokale Partij stemde als enige tegen de oproep aan het Rijk om een structurele oplossing te vinden (M-13-1).

### Wonen en bouwen
1. **Starterslening** (Hilversum 12-11-2025, aangenomen 28-8). Voor: CDA, CU, D66, DH, HvH, SP, VVD, VdL. Tegen: GL, PvdA, OpStand, FD, Zaabat. Dit is een duidelijk punt waarop PRO zich van de rest onderscheidt.
2. **Lagere huurverhoging sociale huur** (29-1-2025, aangenomen 26-9). Alleen VVD en CDA tegen.
3. **Voorrang voor cruciale beroepen** (8-3-2023): D66, DH, PvdA, CU wilden het streven schrappen. HvH, VVD, GL, CDA, SP, BVNL hielden het vast.
4. **Woningbouw Nederhorst den Berg Noord, 150 woningen in het buitengebied** (Wijdemeren 27-10-2022). Vóór weigeren: CDA, CU, DLP, PvdA-GL. Tegen weigeren (dus voor bouwen): VVD en DB.
5. **Hoogbouw en schaal**: amendement "Meent niet de hoogte in" (5-3-2025, alleen HvH voor). Stedenbouwkundig plan Arenapark (19-7-2023): D66, DH, BVNL tegen. Bestemmingsplan Stationsgebied (7-12-2022): DH, SP, BVNL tegen.

Daarnaast: opkoopbescherming (april 2025) werd breed gesteund, behalve door FD en het grootste deel van D66. Het amendement om het sociaal segment in Wijdemeren op 33% te houden (30-10-2025) werd alleen door de VVD afgewezen.

### Verkeer
1. **Zero-emissiezone centrum per 2027** (Hilversum 2-4-2025, verworpen 4-30). Alleen een deel van D66 stemde voor. De motie om de ambitie niet op te geven kreeg steun van CU, D66, GL en SP; PvdA stemde tegen.
2. **Fietsroutes door het centrum** (19-7-2023, verworpen 15-21). Voor: D66, DH, CU, SP, BVNL.
3. **30 km/u Zuidereinde** (Wijdemeren 13-2-2025, verworpen 6-12). Voor: CU, D66, DB, Goetheer. Tegen: CDA, DLP, PvdA-GL, VVD.
4. **Mobiliteitsplan Wijdemeren** (22-9-2022, aangenomen 13-5). Tegen: CDA en DB.

### Klimaat en energie
1. **Windmolens bij Nederhorst den Berg** (Wijdemeren juni 2025 en februari 2026, aangenomen 14-4 en 15-4; Hilversum 29-1-2025, aangenomen 21-14). Tegen windmolens: CDA, VVD, DLP, DB, D66 (Wijdemeren), HvH, DH, SP, FD. Voor windmolens (tegen de moties): CU en PvdA-GL/GL/PvdA, en in Hilversum ook D66.
2. **Verkenning kleine kerncentrale (SMR)** (12-11-2025, aangenomen 26-10). Voor: CDA, D66, DH, HvH, VVD, FD, VdL. Tegen: GL, PvdA, SP, CU, OpStand, Zaabat.
3. **Routekaart aardgasvrij 2050** (4-3-2026, aangenomen 25-9). Tegen: CDA, VVD, FD, VdL.
4. **Houtstook** (9-7-2025, verworpen 14-21). Voor: CU, DH, GL, PvdA, SP, OpStand. Tegen: CDA, D66, HvH, VVD.
5. **Fossiele reclame weren** (11-6-2025, verworpen 15-20). Voor: D66, GL, PvdA, SP, Lahaise. Tegen: CDA, CU, DH, HvH, VVD.

Onderscheidt: dit thema scheidt links (PRO, SP) van rechts (VVD, CDA, LFD) het scherpst. D66 en DH wisselen per onderwerp (D66 voor de SMR en tegen een houtstookverbod; DH tegen windmolens en voor een houtstookverbod).

### Lasten en begroting
1. **Woonlasten maximaal inflatie +0,2%** (Hilversum 12-6-2024, verworpen 8-28). Voor: HvH, SP, BVNL.
2. **Afvalstoffenheffing niet laten stijgen** (12-11-2025, verworpen 10-26). Voor: HvH, SP, OpStand, FD.
3. **OZB-verlaging Wijdemeren 2024** (7-12-2023, aangenomen 11-7). Voor: VVD, CU, DLP, Goetheer. Tegen: CDA, DB, PvdA-GL. Volgens de stemverklaringen vond een deel van de tegenstemmers de verlaging niet ver genoeg gaan.
4. **Begrotingen 2025 en 2026 Hilversum** (20-15 en 26-10). Dit zijn coalitie/oppositie-stemmingen. Tegen: HvH, SP, BVNL/FD en in 2025 ook D66; in 2026 HvH, SP, FD, OpStand.
5. **Forensenbelasting invoeren** (12-11-2025, alleen SP en OpStand voor).

### Zorg, inkomen en onderwijs
1. **Kwijtschelding eigen bijdrage Wmo tot 130% sociaal minimum** (11-6-2025, verworpen 9-26). Voor: CU, HvH, SP, Lahaise. In november 2024 stemden alleen SP, CU en BVNL voor.
2. **Bezuiniging op jeugdzorg schrappen** (1-7-2026, verworpen 7-28). Voor: SP, OpStand, SCB, FD. In 2023 (A23-158) stemden D66, DH, PvdA en SP voor.
3. **Minimumloon €14 bij de gemeente en verbonden partijen** (9-11-2022, verworpen 15-22). Voor: D66, DH, PvdA, SP, BVNL.
4. **Vrijwillige ouderbijdrage maximeren** (6-3-2024, verworpen 10-25). Voor: D66, PvdA, SP, CU.

### Overig, met weinig stemmingen
- **Koopzondag**: de winkeltijdenverordening 2024 met ruimere zondagopening (aangenomen 17-13). Voor: D66, VVD, DH. Tegen: CDA, CU, PvdA, SP, FD. GL en HvH verdeeld.
- **Cameratoezicht**: verlenging (2023), alleen DH tegen. Meer politie op straat: alleen BVNL en SP voor.
- **Cultuur en media**: €250.000 extra voor cultuur (2022, verworpen). Voor: D66, DH, PvdA, SP, BVNL. Een motie tegen de omroepbezuiniging werd breed gesteund (alleen BVNL tegen).
- **Natuur**: groen handhaven in versteende wijken (aangenomen 22-15). Tegen: CDA, HvH, VVD. Even zwaar laten wegen van natuurbehoud en recreatie bij het Goois Natuurreservaat (aangenomen 23-14). Voor: VVD, CDA, D66, HvH, BVNL. Tegen: GL, PvdA, SP, CU, DH.
- **Dierenwelzijn**: een afwegingskader in de nota (2026), alleen VVD tegen.
- **Vliegveld**: huurcontract maximaal 5 jaar verlengen (2022), alleen PvdA tegen. Dit onderscheidt weinig.
- **Plassen en recreatie (Wijdemeren)**: belasting op motorbootverhuur schrappen (december 2025, verworpen 6-12). Voor: DB, D66, CU, Goetheer.

## Belangrijkste waarschuwingen voor gebruik in de stemhulp

1. **Lokaal Eén is intern niet eenduidig.** DH, DLP en DB stemden op wezenlijke punten verschillend: referendum (DB voor, DLP en DH tegen), Nederhorst Noord (DLP vóór weigeren, DB ertegen), OZB-verlaging 2024 (DLP voor, DB tegen), noodopvang Rading 1 (DLP voor, DB tegen). Stemgedrag van één voorganger representeert de nieuwe partij niet.
2. **PRO** erft GL (coalitie) en PvdA (tot mei 2024 oppositie). Ze verschillen o.a. over zondagparkeren, cultuurgeld, jeugdzorg (A23-158) en de zero-emissiemotie.
3. **Coalitiedwang**: stemgedrag van coalitiepartijen weerspiegelt deels coalitieafspraken. In Hilversum wisselde de coalitie in mei 2024 (HvH eruit, DH en PvdA erin), en stemgedrag van HvH en DH verschuift daar zichtbaar.
4. **Afsplitsers** (LFD, Opstand.nu, Gewoon, SCB) hebben korte en deels persoonlijke historie. Fractie Van de Linde staat in iBabs tot maart 2026 als tweede fractie "VVD". In de data is dat op naam van het lid rechtgezet.
5. **Inhoudsbeschrijving**: bij enkele items komt de inhoud alleen uit de titel of uit een slecht leesbare scan. Dat staat steeds in `opmerking` (o.a. A23-49, A22-45, A23-154, A25-99, A26-89). Het iBabs-veld met indieners is niet altijd betrouwbaar; zie de opmerkingen bij M25-001 en M25-002.
