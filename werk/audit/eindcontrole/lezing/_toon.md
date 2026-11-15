# Toonlezing: worden partijen gelijk behandeld?

Gelezen op 15 november 2026 door een kritische lezer die wil weten of de site een partij voortrekt of benadeelt. Er is niets aan site of data veranderd en `node build.mjs` is niet gedraaid. Kandidaten worden hieronder aangewezen met partij en lijstnummer. Een naam staat er alleen als hij al op de site staat en nodig is om de bevinding aan te wijzen.

**Wat op de site komt.** `build.mjs` (r. 398-401) toont per partij alleen `kernboodschap`, `achtergrond`, `basis` en `speerpunten`. De velden `opvallend` en `dun` worden nergens gebouwd: er staat niets over in `build.mjs` of `src/assets/js/`. Ze staan wel in de openbare repository. Bevindingen over die twee velden wegen daarom lichter, en zijn gemarkeerd als *niet gepubliceerd*.

**Let op bij herstel.** De partijpagina's staan als schermbeeld in de video (`video/film/assets/opname/lijst-01.png` t/m `lijst-20.png`, scène `lijsten`). Een tekstwijziging in `achtergrond` of `kernboodschap` komt pas in de film na een nieuwe opname (`video/opname/neem-op.mjs`) en een nieuwe render. `data/partijen.json` wordt gemaakt uit `data/partij-redactie.json` door `tools/maak_partijen.mjs`: pas beide aan, of alleen de redactie en draai dan het script opnieuw.

Ernst: **ernstig** = een lezer ziet op de site een partij duidelijk anders behandeld; **middel** = zichtbaar ongelijk, maar uit te leggen of beperkt; **klein** = stijl of consistentie; **geen** = gecontroleerd en in orde.

---

## 1. Partijteksten (`data/partijen.json`, `data/partij-redactie.json`)

### 1.1 ERNSTIG: alleen bij Hart voor Hilversum staat dat raadsleden overstapten

- **Vindplaats:** `data/partij-redactie.json` en `data/partijen.json`, `hart-voor-hilversum`, `achtergrond`. Op de partijpagina staat de zin direct onder de kernboodschap. Hij is ook te lezen op het videobeeld `lijst-01.png`.
- **Citaat:** "Drie raadsleden stapten in die jaren over naar andere fracties."
- **Wat klopt:** de feiten. Volgens `bronnen/_stemgedrag/fracties.json` ging HvH van 8 naar 5: twee raadsleden gingen naar Democraten Hilversum, één naar Gewoon, Hilversum.
- **Wat niet klopt:** de vergelijking met andere partijen. Andere partijen verloren in dezelfde periode ook raadsleden, maar dat staat niet in hun eigen `achtergrond` (bron: `bronnen/_verkiezing/info.json`, `latere_afsplitsingen`):
  - **D66:** één raadslid ging in augustus 2025 zelfstandig verder. Diegene staat nu op de lijst van Lokaal Eén.
  - **VVD:** de fractie splitste in augustus 2025. Dat staat alleen indirect bij Gewoon, Hilversum.
  - **PvdA (nu PRO):** het raadslid dat in april 2025 vertrok, was de helft van de fractie. Dat staat alleen bij Opstand.nu.
  - **GroenLinks (nu PRO):** door het vertrek van raadsleden kwam de zetel bij iemand die de partij al had verlaten (Hilversums Nieuws, `bronnen/scb/extra-hilversumsnieuws-twintig-partijen.txt`). Dat staat alleen bij SCB.
  - **De Lokale Partij (nu Lokaal Eén):** verloor in 2024 twee van de acht Wijdemeerse raadsleden.
  - **Democraten Hilversum (Lokaal Eén):** won de twee raadsleden die HvH verloor. Ook dat staat er niet.
- **Bij BVNL** staat het vertrek wel, maar dat is nodig: de hele fractie ging weg, dus anders klopt "geen raadsleden" niet.
- **Gevolg:** de grootste partij van 2022 is de enige die met interne onrust wordt geïntroduceerd.
- **Voorstel, kies één van twee:**
  - (a) Schrap de zin bij HvH. Gebruik voor iedereen de algemene formulering van de stemmenpagina (`build.mjs` r. 503): "Sindsdien zijn enkele raadsleden als eigen fractie verdergegaan."
  - (b) Geef elke partij die raadsleden verloor of won één vaste, zakelijke zin, bijvoorbeeld "Sinds 2022 verlieten N raadsleden de fractie", en bij Lokaal Eén ook de twee die erbij kwamen.

  Neem daarna de video opnieuw op.

### 1.2 MIDDEL: Lokaal Eén wordt anders geïntroduceerd dan de andere partijen met zetels

- **Vindplaats:** `lokaal-een`, `achtergrond`.
- **Citaat:** "De Lokale Partij werd in 2022 met 8 van de 19 zetels de grootste in Wijdemeren. Democraten Hilversum zit sinds mei 2024 in het Hilversumse college."
- **Probleem:** alleen de gunstigste uitslag krijgt een getal. Het ontbreekt bij:
  - Democraten Hilversum: 3 zetels in 2022, nu 5 na twee overstappers van HvH;
  - DorpsBelangen: 2 zetels in Wijdemeren;
  - het verlies van twee raadsleden van De Lokale Partij (zie 1.1).

  Bij de andere partijen met zetels staan de zetels in beide raden. Een lezer kan hier niet zien hoe groot Lokaal Eén nu in Hilversum is.
- **Voorstel:** "Nieuwe lokale partij van Democraten Hilversum (2022: 3 zetels in Hilversum), De Lokale Partij (8 van 19 in Wijdemeren) en DorpsBelangen (2 in Wijdemeren). Democraten Hilversum zit sinds mei 2024 in het Hilversumse college." Plus de keuze uit 1.1 over wie overstapte.

### 1.3 MIDDEL: alleen bij SCB staat in de kernboodschap dat het programma dun is

- **Vindplaats:** `scb`, `kernboodschap`.
- **Citaat:** "SCB … presenteert een kort programma … Het programma is vooral gericht op Hilversum en bevat weinig cijfers of namen van locaties."
- **Probleem:** BVNL heeft een programma van dezelfde omvang (1.879 tegen 1.825 woorden) en krijgt zo'n zin niet. Ook Opstand.nu (4.581), HvH (4.077), FVD (5.532) en BBB (5.966) krijgen hem niet. Dorp voor Dorp en Stop Betaald Parkeren-VIP krijgen hem alleen in het niet-gepubliceerde `opvallend`. De kernboodschap is de grootste tekst op de partijpagina. Hoe groot elk programma is, staat al voor alle partijen gelijk in de verantwoording (tabel "Hoeveel standpunten per partij bekend zijn", met woorden).
- **Voorstel:** schrap de laatste zin en "kort" uit de kernboodschap van SCB. Wil je het wel melden, doe het dan voor alle partijen op dezelfde plek en op dezelfde manier: bijvoorbeeld één vaste regel onder de kop, "Programma: N woorden", zoals in de verantwoording.

### 1.4 KLEIN: partijen worden niet op dezelfde punten geïntroduceerd

- **College of oppositie:** staat bij HvH, PRO, D66, VVD, CDA, Lokaal Eén en SP. Het ontbreekt bij ChristenUnie, die in Hilversum oppositie is (`fracties.json`). Voor Wijdemeren staat het bij geen enkele partij, terwijl CDA en VVD er wethouders hebben (blijkt uit de bio's).
  - **Voorstel:** zet "In Hilversum in de oppositie" bij ChristenUnie. Vermeld Wijdemeren voor alle partijen of voor geen.
- **De lijsttrekker en zijn functie:** staat alleen bij CDA: "lijsttrekker Gerben van Voorden is er wethouder". Bij HvH staat de lijsttrekker ook, maar dat is nodig omdat er twee zijn. Andere lijsttrekkers die fractievoorzitter zijn (D66, VVD, SP, ChristenUnie, LFD, Opstand.nu) worden in de achtergrond niet genoemd. Zo krijgt alleen het CDA een sterke functie in de introductie.
  - **Voorstel:** schrap de bijzin, of noem bij elke partij de lijsttrekker met zijn huidige functie.
- **Dorp voor Dorp:** als enige heeft deze partij een standpunt in de `achtergrond`: "De partij zet in op zeggenschap en eigenheid van de dorpen."
  - **Voorstel:** schrap die zin. Hij staat al in de kernboodschap.
- **Dorp voor Dorp, kernboodschap:** "uit onvrede over de fusie". In de achtergrond staat "kritisch waren over de fusie". "Onvrede" komt uit NH Nieuws, niet van de partij.
  - **Voorstel:** "uit bezwaar tegen de fusie" of "omdat zij tegen de fusie waren".
- **Hart voor Hilversum heeft twee lijsttrekkers**, maar het partijoverzicht, de paginakop en de metabeschrijving noemen alleen `lijsttrekker: "Ron Lancé"` (`build.mjs` r. 335, 380, 394).
  - **Voorstel:** "Ron Lancé en Jan-Jaap de Kloet".

### 1.5 KLEIN: eigen, kleurende woorden in de kernboodschap

- **VVD:** "Op klimaat en natuur kiest de partij voor minimale lokale eisen". Het programma zegt: geen *extra* lokale eisen ("geen extra lokale duurzaamheidseisen", ook in de speerpunten). "Minimale" geeft daar een eigen draai aan.
  - **Voorstel:** "geen extra lokale klimaateisen".
- **Gewoon, Hilversum:** "Op onderwerpen als parkeren, wind- en zonne-energie en asielopvang formuleert zij concrete afwijzingen". Dit is een oordeel over de stijl van de partij, geen inhoud.
  - **Voorstel:** noem wat ze wil: "Zij is tegen uitbreiding van betaald parkeren, nieuwe zonnevelden en een groot azc."
- **De andere kernboodschappen zijn zakelijk.** Termen van de partij zelf staan tussen aanhalingstekens (HvH, PRO, SCB, D66) of worden als zelfbeschrijving toegeschreven ("presenteert zich als", "noemt").
  - **Steekproef in de bron:** HvH "Niet links en niet rechts" ✓; BVNL "enige klassiek liberale partij" ✓; SCB "nuchtere en sociale koers" ✓; Opstand.nu "vrijzinnig sociaaldemocratisch" ✓; LFD "bewijslast bij de gemeente" ✓.

### 1.6 KLEIN: "Wat de partij zelf vooropzet" is niet altijd wat de partij zelf vooropzet

- **Vindplaats:** `build.mjs` r. 401 (kop boven `speerpunten`).
- **Probleem 1, Lijst Van Oostveen:** de speerpunten zijn stemgidsstellingen waarmee zij instemde ("Meer geld voor kunst en cultuur", "Referendum over grote besluiten"). Dat zijn geen prioriteiten die zij zelf koos. De melding in `basis` vangt dat deels op.
- **Probleem 2, Partij voor de Dieren:** de speerpunten zijn de hoofdstuktitels van het programma, letterlijk overgenomen ("Kies voor groen: goed voor dier, mens en planeet"). Ze lezen als slogans. Bij de andere partijen staan zakelijke samenvattingen met concrete maatregelen.
- **Voorstel:** maak van de kop "De belangrijkste punten uit het programma". Gebruik bij Van Oostveen een eigen kop, zoals "Waar zij in stemhulpen voor koos". Maak de speerpunten van PvdD concreet uit het programma, zoals bij de anderen (bijvoorbeeld kapvergunning vanaf 10 cm, betaald parkeren in heel Hilversum, wethouder voor dierenwelzijn).

### 1.7 MIDDEL (niet gepubliceerd): een samenvatting die de bron verkeerd weergeeft bij Opstand.nu

- **Vindplaats:** `opstand-nu`, `opvallend`, item 5.
- **Citaat:** "Noemt expliciet toeristen, forensen en villabewoners aan de plas als groepen om minder te bedienen".
- **Wat de bron zegt** (`bronnen/opstand-nu/programma.txt`):
  - de toeristen- en forensenbelasting zijn "zaken waar kritisch naar gekeken mag worden";
  - de vraag hoe logisch het is dat een villa aan de plas een OZB-verlaging krijgt.

  Dat gaat over belastingen, niet over groepen die de partij "minder wil bedienen". Zo klinkt de partij vijandiger dan ze schrijft.
- **Voorstel:** "Wil kritisch kijken naar de toeristen- en forensenbelasting en vindt de OZB-verlaging voor dure woningen in Wijdemeren onrechtvaardig."

### 1.8 KLEIN (niet gepubliceerd): `opvallend` en `dun` zijn ongelijk van vorm

- **Aantallen verschillen sterk:**
  - `opvallend`: van 3 (Van Oostveen) en 5 (SCB) tot 14 (PRO) en 13 (SP);
  - `dun`: van 6 (D66, CDA, Lokaal Eén, SP, BVNL, LFD, FVD) tot 10 en 11 (Gewoon, Hilversum, Dorp voor Dorp, BBB).

  Wie de data openbaar leest, ziet bij BBB bijna twee keer zoveel "lacunes" als bij D66. Dat komt deels door een andere mate van detail, niet alleen door verschil in inhoud.
- **FVD:** alle `opvallend`-items beginnen met "Het programma wil …". Dat staat bij geen andere partij en klinkt afstandelijk.
- **CDA, `dun`:** "participatie wordt vooral kritisch benaderd". Dat is een oordeel over de houding van de partij, geen lacune.
- **BVNL, `opvallend`:** "Enige partij die zich de 'enige klassiek liberale partij in Hilversum' noemt en andere partijen collectivistisch noemt". Klopt met de bron, maar het eerste deel zegt hetzelfde twee keer.
- **De keuze van items** is bij FVD (COA, regenboogzebrapaden) en PvdD (IHRA, Palestina, kraken) even scherp. Beide kloppen met de bron. Daar zit geen eenzijdigheid in.
- **Voorstel:** houd het aantal ongeveer gelijk (bijvoorbeeld 8 en 6 tot 8). Schrijf alle items in dezelfde vorm. Houd oordelen uit `dun`. Moeten deze velden ooit op de site, lees ze dan eerst opnieuw.

### 1.9 GEEN: steekproef van één of meer beweringen per partij in de bron

| Partij | Bewering (veld) | Bron | Uitkomst |
|---|---|---|---|
| Hart voor Hilversum | 8 zetels, tot mei 2024 college; drie overstappers (achtergrond) | `_verkiezing/info.json`, `_stemgedrag/fracties.json` | klopt (maar zie 1.1) |
| PRO | GL 4 en PvdA 2 zetels; GL sinds 2022 en PvdA sinds mei 2024 in college (achtergrond) | `info.json`, `fracties.json` | klopt |
| PRO | gedwongen afsluiting van het gas, ouderbijdrage boven 50 euro (opvallend) | `pro/programma.txt` | klopt |
| D66 | 400 woningen per jaar, Kafkaloket (kern/speerpunten) | `d66/programma.txt` | klopt |
| VVD | "keiharde handhaving op verkeershufters", ICT "ook ten koste van functionaliteit" (speerpunt/opvallend) | `vvd/programma.txt` | klopt (woorden van de partij) |
| CDA | carbidschieten, 3,0 miljoen voor gratis eerste uur (opvallend) | `cda/programma.txt` | klopt |
| Lokaal Eén | 32% sociale huur, eigen wethouder per wijk (speerpunten) | `lokaal-een/programma.txt` | klopt |
| SP | boete van 50.000 euro, opvang ook in villawijken (speerpunt/opvallend) | `sp/programma.txt` | klopt |
| ChristenUnie | CO2-schaduwprijs van 1.000 euro per ton (opvallend) | `christenunie/programma.txt` | klopt |
| BVNL | "enige klassiek liberale partij", "collectivistisch" (kern/opvallend) | `bvnl/programma.txt` | klopt |
| SCB | "nuchtere en sociale koers", voorrang "binnen de wettelijke mogelijkheden" (kern/speerpunt) | `scb/programma.txt` | klopt |
| Gewoon, Hilversum | max. 100 per locatie, 500 totaal; "geen politiek van coalitie tegen oppositie" (speerpunt/kern) | `gewoon-hilversum/programma.txt`, `extra-partij-site.txt` | klopt |
| Dorp voor Dorp | opgericht uit onvrede over de fusie (kern) | `dorp-voor-dorp/extra-nhnieuws-…txt` | klopt (woord van NH Nieuws, zie 1.4) |
| Stop Betaald Parkeren-VIP | 139 van de 142 polls (opvallend) | `stop-betaald-parkeren-vip/programma.txt` | klopt |
| Opstand.nu | "hardste nee-roepers", OZB-verlaging "onverkoopbaar" (opvallend) | `opstand-nu/programma.txt`, `extra-stemgids-standpunten.txt` | klopt; item 5 niet (zie 1.7) |
| Partij voor de Dieren | IHRA-definitie, Palestina (opvallend) | `pvdd/programma.txt` | klopt |
| Lijst Van Oostveen | eerder commissielid voor Leefbaar Hilversum (achtergrond); spoedzoekers-argument (opvallend) | `blanco-van-oostveen/meta.json`, `extra-stemgids-standpunten.txt` | klopt |
| LFD | bewijslast bij de gemeente (kern) | `lfd/programma.txt` | klopt |
| Volt | 6.000 en 800 woningen, voorbeeld Nijkerk (speerpunten) | `volt/programma.txt` | klopt |
| FVD | subsidies voor "activistische" organisaties, koop rond 180.000 euro (opvallend/speerpunt) | `fvd/programma.txt` | klopt |
| BBB | "absoluut tegen windturbines", "fel" tegen betaald parkeren (opvallend) | `bbb/programma.txt`, `extra-stemhulp-antwoorden.txt` | klopt (woorden van de partij) |

---

## 2. Kandidaten (`data/kandidaten.json`)

Van elke partij zijn alle bio's gelezen: 190 bio's bij 347 kandidaten.

### 2.1 MIDDEL: hoeveel kandidaten een bio hebben, verschilt sterk per partij

- **Wie een bio heeft, met dekking:**
  - alle kandidaten: Hart voor Hilversum (17/17), Gewoon, Hilversum (7/7), Stop Betaald Parkeren-VIP (6/6), LFD (5/5);
  - weinig kandidaten: Partij voor de Dieren (1/11), PRO (8/25, en van de bovenste vijf heeft nr. 4 niets), CDA (14/50), Lokaal Eén (13/32), FVD (5/14), BVNL (3/7).
- **Gemiddelde lengte:** van 11 tot 12 woorden (SCB, ChristenUnie) tot 31 tot 33 (Opstand.nu, PvdD).
- **Gevolg:** een lezer die het partijoverzicht en de kandidatenlijsten vergelijkt, ziet bij HvH een volledig, levendig team en bij PvdD en PRO vooral lege figuurtjes en kale namen.
- **De verantwoording legt het uit:** "Twee partijen (PRO en Partij voor de Dieren) hebben een site die geautomatiseerd lezen weigert". De ongelijkheid zelf blijft.
- **Voorstel:**
  - haal voor PRO en PvdD de kandidatenpagina's met de hand op, zodat de dekking gelijker wordt;
  - houd de bio's op 15 tot 30 woorden (kort lange in, vul korte aan uit dezelfde bron);
  - zet op de partijpagina bij de kandidatenlijst één zin als "Van N van de M kandidaten is een beschrijving gevonden".

### 2.2 MIDDEL: een wervende bio bij de lijsttrekker van LFD

- **Vindplaats:** `lfd`, nr. 1.
- **Citaat:** "Won in 2022 de publieksprijs Politicus van het Jaar Hilversum en schreef als eenpitter een eigen tegenbegroting."
- **Probleem:** het is de enige prijs in alle 190 bio's. Daarbij komt een prestatie die als verdienste is verwoord. Andere lijsttrekkers krijgen alleen functie en werk.
- **Voorstel:** "Is sinds 2022 raadslid in Hilversum en fractievoorzitter van LFD, de lijst die zij oprichtte." Laat prijs en tegenbegroting weg, of neem bij iedereen één opvallende daad op (af te raden).

### 2.3 KLEIN: andere wervende of kleurende stukjes in bio's

Bijna alles is zakelijk: functie, werk en aandachtsgebied. Deze zinnen springen eruit:

- **VVD nr. 2:** "diende een motie in … die de raad unaniem steunde". Een prestatie.
  - **Voorstel:** laat de motie weg of schrijf "is woordvoerder voor de Oostelijke Vechtplassen".
- **VVD nr. 7:** "legde … de nadruk op een praktische en realistische aanpak van verduurzaming". Neemt de waardering van de partij over.
  - **Voorstel:** "sprak namens de VVD over verduurzaming".
- **SP nr. 9:** "kreeg in 2019 met de SP een voorstel voor inclusie aangenomen". Een prestatie.
  - **Voorstel:** "zet zich in voor … mensen met een beperking".
- **SP nr. 10:** "vroeg al op jonge leeftijd om opvangplekken". Een ontroerende anekdote.
  - **Voorstel:** schrappen.
- **LFD nr. 5:** "zette zich als advocaat in voor ondernemers tegenover banken". Een heldenrol.
  - **Voorstel:** "was advocaat voor ondernemers in geschillen met banken".
- **Volt nr. 6:** "cultuurtempel".
  - **Voorstel:** "cultuurcentrum".
- **Lokaal Eén nr. 7:** "Is al ruim veertig jaar bekend in Kortenhoef, 's-Graveland en Ankeveen". Bekendheid als kwaliteit, zonder inhoud.
  - **Voorstel:** "woont al veertig jaar in …" (als de bron dat zegt) of schrappen.
- **SP nr. 19 en 20, FVD nr. 5:** bio's die alleen uit een politieke mening bestaan ("Ziet een scheve verdeling van de welvaart als oorzaak van veel onrecht", "Vindt dat de stem terug moet naar de burgers"). Ze zijn toegeschreven en dus niet onjuist, maar anders van soort dan de rest.
  - **Voorstel:** zet er werk of rol bij als de bron die geeft. Anders: "Richt zich op …".
- **Negatief geladen zinnen** zijn er nauwelijks. De meldingen dat iemand "stopte als wethouder" (VVD nr. 25) of "was begin 2026 commissielid" (VVD nr. 15) zijn zakelijk. Ze laten wel een vraag open; overweeg "was wethouder tot begin 2026".

### 2.4 KLEIN: eerdere partij soms wel, soms niet genoemd

- **Bij sommige kandidaten staat hun vroegere partij erbij:** BBB nr. 7 "eerder zes jaar raadslid voor het CDA", D66 nr. 6 "raadslid voor De Lokale Partij", Opstand.nu nr. 2 "commissielid voor Hilversums Belang".
- **Bij andere kandidaten niet**, ook waar een eerdere politieke functie openbaar is (onder meer bij een lijsttrekker). Welke kandidaten het betreft, staat niet in de repository: het gaat om gegevens over personen die niet op de site staan.
- **Voorstel:** noem eerdere politieke functies bij iedereen of bij niemand. Het verschil komt nu door wat de partijsite toevallig noemt.

### 2.5 KLEIN: vorm en namen

- **Drie schrijfwijzen door elkaar:**
  - met naam en "is" (HvH, VVD, CDA, D66 vanaf nr. 18, Volt);
  - zonder onderwerp, "Is …" (PRO, D66 tot nr. 17, Lokaal Eén, ChristenUnie);
  - zonder werkwoord (SP, Opstand.nu).
  - **Voorstel:** kies één vorm.
- **Naam in de bio wijkt af van het stembiljet:** VVD nr. 14 (biljet "Sophia", bio "Sophie") en VVD nr. 26 (biljet "Terrrence", bio "Terry"). Ook BVNL nr. 6 begint met alleen de achternaam.
  - **Voorstel:** gebruik in de bio de naam van het biljet, of geen naam.

---

## 3. Uitlegvideo (`video/script.md`, `video/script.json`, `video/film/compositions/*.html`)

### 3.1 KLEIN: in de scène "anders" zijn de vier gekozen lijstnummers leesbaar

- **Vindplaats:** `video/film/compositions/anders.html` r. 251-276: `const gekozen = [4, 7, 12, 17]`. De twintig vakjes staan er met leesbare nummers ("alleen nummers, zoals het biljet zonder namen"). Op "kiest" worden 4, 7, 12 en 17 rood en de rest grijs.
- **Probleem:** in de scène "biljet" zijn naam en nummer juist onleesbaar gemaakt (`neem-op.mjs`, `ANONIEM_CSS`). Lijstnummers zijn bekend: 4 VVD, 7 SP, 12 Dorp voor Dorp, 17 LFD. Wie oplet, ziet welke vier partijen de maker als voorbeeld "kleurt".
- **Voorstel:** laat de nummers in dit diagram weg (alleen vakjes), of maak ze in deze scène net zo onleesbaar als in "biljet".

### 3.2 KLEIN: de kritische zin over Hart voor Hilversum staat in beeld

- **Vindplaats:** `video/film/assets/opname/lijst-01.png`, scène `lijsten`.
- **Wat te zien is:** onder de kernboodschap van HvH is de achtergrond te lezen tot en met "Drie raadsleden stapten in die jaren over …". Elke partijpagina staat 0,26 s in beeld (`lijsten.html`: `stap = (M.kandidaten - 1.0 - t0) / 20`). Bij normaal kijken is de zin dus niet te lezen, wel bij stilzetten.
- **Voorstel:** los 1.1 op en neem `lijst-01` t/m `lijst-20` opnieuw op.

### 3.3 KLEIN: het einde van de lijstenscène en de keuze in Vergelijken

- **Laatste partij langer in beeld:** in `lijsten.html` wordt het venster met de laatste partijpagina (lijst 20, BBB) "de laatste tegel" van de wand. Daardoor staat die ene pagina zo'n 1,4 s in beeld en de andere 0,26 s. De volgorde is die van het biljet, dus dit is te verdedigen.
  - **Voorstel:** laat het venster overgaan in een neutrale tegel (bijvoorbeeld het partijoverzicht), of geef de twintigste pagina dezelfde 0,26 s.
- **Vergelijken:** de drie aangetikte stippen zijn grijs en zonder naam. Op het beeld ervoor staat de kaart met leesbare namen, op dezelfde plek. Volgens `neem-op.mjs` r. 265-266 zijn het `opNaam[3], [11], [16]` op alfabetische volgorde van de slug: CDA, Lokaal Eén en SP. Dat is na te gaan door twee beelden te vergelijken. Het effect is gering.
  - **Voorstel:** laat het beeld met leesbare namen weg vlak voor het tikken, of tik pas na het wazig maken.

### 3.4 GEEN

- **Gesproken tekst** (`script.json`, alle 15 scènes): noemt geen partij en geeft geen voorbeeld met een partij. Ook geen woorden als "betrouwbaar", "extreem" of "nieuw" over partijen.
- **Uitslag:** namen en nummers wazig, alle balken in één kleur. Antwoorden komen uit een vaste, willekeurige reeks.
- **Voorbeeld bij "nuance":** het is een standpunt van SCB ("Liever eerst binnen de bebouwde kom bouwen dan erbuiten", stelling `wonen-dorpsrand`). De naam is onleesbaar. Gekozen met een vaste regel: de langste toelichting met citaat waarin de eigen naam niet staat. Zonder de data is het niet te herleiden.
- **Overzichten** waarin alle twintig partijen leesbaar zijn (partijoverzicht, spectrum, kaart) volgen de volgorde van het biljet of de berekening. Elke partijpagina staat even lang in beeld (zie 3.3 voor de laatste).
- **Kleur:** het rood van de site (#d0271d) is het rood van het stemvakje, geen partijkleur. SP (#EC1B23) en HvH (#E8451E) zitten dichtbij, maar in de video staat rood nergens naast een partij.
- **Scènes "begin", "waarom", "oproep" en "slot":** geen partijnamen, logo's of partijkleuren.

---

## 4. Pagina's uit `build.mjs` en `data/verantwoording.html`

### 4.1 KLEIN: koppen en gegevens per partij

- **Speerpunten:** de kop "Wat de partij zelf vooropzet" (r. 401). Zie 1.6.
- **Lijsttrekker:** bij HvH staat er maar één. Zie 1.4.
- **Partijoverzicht** (r. 333-339): partijen met weinig gevonden foto's tonen vooral getekende figuurtjes (CDA 36 van 50, Lokaal Eén 18 van 32, FVD 8 van 14). De uitleg eronder ("een getekend figuurtje betekent dat er geen foto is gevonden") is neutraal. Het beeld blijft ongelijk, zie 2.1.

### 4.2 GEEN

- **Voorpagina** (r. 172-222): geen partij bij naam. Het biljet staat in de volgorde van het stembiljet. "Twintig partijen. Tussen welke twijfel jij?" is neutraal.
- **Partijpagina's:**
  - "Dicht bij en ver van" en "Waar … toch uit elkaar gaan" worden berekend, met dezelfde drempel voor iedereen (`n >= 8`);
  - "Van X zijn N van de M standpunten bekend" staat er voor elke partij;
  - geen bijzondere teksten voor een bepaalde partij.
- **Vergelijkpagina** (r. 432-443 en `src/assets/js/vergelijk.js`): geen partij krijgt iets apart. De kaarttekst zegt uitdrukkelijk dat de assen niet links en rechts betekenen.
- **Stemmenpagina** (r. 501-505): "Sindsdien zijn enkele raadsleden als eigen fractie verdergegaan." Algemeen en voor iedereen gelijk. Dit is het model voor 1.1.
- **Verantwoording:**
  - de regel "één partij met veel middenposities" noemt geen naam;
  - de tabel met dekking en programmaomvang geldt voor alle partijen gelijk;
  - "Twee partijen (PRO en Partij voor de Dieren) hebben een site die geautomatiseerd lezen weigert" is een feitelijke uitleg, met daarbij "Staat er bij een naam niets, dan zegt dat niets over de kandidaat";
  - "De blanco lijst van Jacqueline van Oostveen heeft geen programma gepubliceerd" klopt en is zakelijk.
- **Voettekst:** "hoort bij geen partij en niet bij de gemeente", plus een uitnodiging om fouten te melden.

---

## 5. Tabel per partij

- **Achtergrond, kernboodschap, gem. bio:** lengte in woorden.
- **Bio's:** kandidaten met een bio, van het totaal.
- **Kritisch, gepubliceerd:** kritische kanttekeningen in `achtergrond`, `kernboodschap` of `basis`, die op de site staan.
- **Kritisch, niet gepubliceerd:** evaluatieve kanttekeningen in `opvallend` en `dun`, zonder de gewone opsomming van lacunes in `dun`.

| Partij | Achtergrond | Kernboodschap | Speerpunten | Gem. bio | Bio's | Opvallend | Dun | Kritisch, gepubliceerd | Kritisch, niet gepubliceerd |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1. Hart voor Hilversum | 49 | 78 | 8 | 28 | 17/17 | 8 | 8 | **1**: drie overstappers (1.1) | 0 |
| 2. PRO | 42 | 92 | 7 | 24 | 8/25 | 14 | 8 | 0 | 0 |
| 3. D66 | 26 | 62 | 8 | 25 | 30/50 | 10 | 6 | 0 | 0 |
| 4. VVD | 23 | 84 | 8 | 16 | 22/33 | 10 | 8 | 0 ("minimale lokale eisen" kleurt, 1.5) | 0 |
| 5. CDA | 30 | 70 | 8 | 26 | 14/50 | 8 | 6 | 0 | 1: "participatie … kritisch benaderd" |
| 6. Lokaal Eén | 42 | 61 | 8 | 15 | 13/32 | 8 | 6 | 0 | 0 |
| 7. SP | 27 | 74 | 8 | 25 | 18/25 | 13 | 6 | 0 | 0 |
| 8. ChristenUnie | 22 | 56 | 8 | 12 | 12/25 | 12 | 9 | 0 | 0 |
| 9. BVNL | 42 | 65 | 8 | 14 | 3/7 | 10 | 6 | 1: raadslid vertrokken, geen raadsleden (nodig) | 0 |
| 10. SCB | 27 | 58 | 7 | 11 | 2/3 | 5 | 9 | **1**: "kort programma … weinig cijfers" (1.3) | 0 |
| 11. Gewoon, Hilversum | 27 | 76 | 8 | 20 | 7/7 | 9 | 10 | 0 ("concrete afwijzingen", 1.5) | 0 |
| 12. Dorp voor Dorp | 29 | 82 | 8 | 26 | 8/9 | 11 | 10 | 0 ("onvrede", 1.4) | 1: "noemt bijna nergens aantallen" |
| 13. Stop Betaald Parkeren-VIP | 20 | 79 | 7 | 13 | 6/6 | 7 | 7 | 0 | 1: "noemt vrijwel geen aantallen" |
| 14. Opstand.nu | 18 | 62 | 8 | 31 | 5/10 | 8 | 8 | 0 | 1: verkeerde samenvatting (1.7) |
| 15. Partij voor de Dieren | 21 | 60 | 6 | 33 | 1/11 | 10 | 7 | 0 | 0 |
| 16. Lijst Van Oostveen | 16 | – | 6 | – | 0/1 | 3 | 3 | 1: geen programma, minder te controleren (nodig) | 0 |
| 17. LFD | 25 | 64 | 8 | 23 | 5/5 | 8 | 6 | 0 (wel wervende bio, 2.2) | 0 |
| 18. Volt | 17 | 71 | 8 | 29 | 5/6 | 9 | 9 | 0 | 0 |
| 19. FVD | 19 | 69 | 8 | 20 | 5/14 | 8 | 6 | 0 | 0 (vorm "Het programma wil …", 1.8) |
| 20. BBB | 17 | 61 | 7 | 29 | 8/11 | 11 | 11 | 0 | 0 |

**Wat de tabel laat zien:**

- **Achtergrond:** partijen met een raadsgeschiedenis krijgen 22 tot 49 woorden, nieuwe partijen 16 tot 29. Dat volgt uit de inhoud. HvH (49) is het langst, deels door de kritische zin.
- **Kernboodschap:** 56 tot 92 woorden, redelijk gelijk. PRO (92) en VVD (84) het langst, ChristenUnie (56) en SCB (58) het kortst.
- **Gepubliceerde kritische kanttekeningen:** het zijn er vier. Twee zijn nodig om de lijst te begrijpen (BVNL, Van Oostveen). Twee zijn een keuze die niet bij vergelijkbare partijen terugkomt (HvH en SCB). Die twee zijn de kern van deze lezing.

---

## Bevindingen op volgorde van ernst

1. **Ernstig:** de overstappers staan alleen bij HvH in de achtergrond. Bij D66, VVD, PRO (PvdA en GL) en Lokaal Eén (De Lokale Partij) staan vergelijkbare overstappen niet (1.1). Dit staat ook op het videobeeld (3.2).
2. **Middel:** Lokaal Eén wordt geïntroduceerd zonder de zetels van Democraten Hilversum en DorpsBelangen, met alleen het gunstigste getal (1.2).
3. **Middel:** alleen SCB krijgt in de kernboodschap een kanttekening over een kort, dun programma. BVNL, met een programma van dezelfde omvang, niet (1.3).
4. **Middel:** hoeveel kandidaten een bio hebben, en hoe lang, verschilt sterk per partij: PvdD 1/11 en PRO 8/25 tegen HvH 17/17 (2.1).
5. **Middel:** de bio van de LFD-lijsttrekker is wervend: prijs en tegenbegroting (2.2).
6. **Middel (niet gepubliceerd):** de samenvatting in `opvallend` geeft het programma van Opstand.nu verkeerd weer (1.7).
7. **Klein:** in de video zijn de vier "gekozen" lijstnummers (4, 7, 12, 17) leesbaar (3.1).
8. **Klein:** partijen worden op verschillende punten geïntroduceerd: oppositie bij ChristenUnie ontbreekt, de wethouder-lijsttrekker staat alleen bij CDA, een standpunt staat alleen in de achtergrond van Dorp voor Dorp, HvH heeft één lijsttrekker in het overzicht (1.4).
9. **Klein:** eigen, kleurende woorden in de kernboodschap van VVD en Gewoon, Hilversum (1.5).
10. **Klein:** de kop "Wat de partij zelf vooropzet" past niet bij Van Oostveen en PvdD (1.6, 4.1).
11. **Klein:** losse wervende woorden in bio's, eerdere partijen niet overal genoemd, wisselende vorm en twee namen anders dan op het biljet (2.3-2.5).
12. **Klein:** de laatste tegel en de herleidbare keuze in Vergelijken in de video (3.3); `opvallend` en `dun` ongelijk van vorm en aantal (1.8).
13. **Geen:** gesproken tekst van de video, uitslag en voorbeeld in de video, voorpagina, vergelijkpagina, stemmenpagina, verantwoording. Alle beweringen in de steekproef kloppen met de bron, op 1.7 na.
