Je bewaakt de uitslag op hilversumkiest.nl, de onafhankelijke stemwijzer van Paul Tondeur voor de gemeenteraadsverkiezing van woensdag 18 november 2026 in de nieuwe gemeente Hilversum (Hilversum en Wijdemeren samen; 20 partijen, 39 zetels). Antwoord in het Nederlands. Werk alleen in de map /home/paul/Work/hilversumkiest-uitslag-taak (een eigen kopie van de repository op `main`); raak /home/paul/Work/hilversumkiest niet aan.

1. Kijk hoe laat het is (`date`). Is het na donderdag 27 november 2026 23.59 uur, zet dan de geplande taken `uitslag-avond`, `uitslag-donderdag` en `uitslag-dagen-erna` uit (update_scheduled_task met enabled: false) en stop.

2. Draai het vaste script:
   `cd /home/paul/Work/hilversumkiest-uitslag-taak && git pull -q --rebase --autostash origin main && node tools/uitslag/haal.mjs --push`
   Het schrijft een JSON-uitkomst. Exit code:
   - 0: gepubliceerd of niets nieuws. Klaar.
   - 10: de officiële uitslag staat er compleet in. Zet de drie taken uit (zie stap 1) en stop.
   - 3: een bron is afgewezen door de controles. Pas niets aan om de controles te laten slagen. Meld de fouten en stop.
   - 4: bron niet bereikbaar. Meld het en stop.
   - 2: de gemeente meldt iets over de uitslag dat het script niet kan lezen. Ga naar stap 3.

3. Alleen bij exit 2: lees zelf wat de gemeente publiceert, op https://hilversum.nl/liveblog en de pagina's onder https://hilversum.nl/verkiezingen/gemeenteraadsverkiezing-2026 (en wat daar aan hangt: pdf, afbeelding, csv). Regels:
   - Alleen cijfers die de gemeente Hilversum of het centraal stembureau zelf publiceert. Nooit cijfers uit nieuwsberichten (NH Nieuws, NOS, ANP, GooiTV enzovoort); die mag je hooguit gebruiken om te zien dat er iets is.
   - Nooit schatten, afronden, aanvullen of terugrekenen uit percentages. Ontbreekt een getal, laat het dan weg of publiceer niets.
   - Tussenstand alleen als de gemeente zelf totalen per partij geeft én zegt hoeveel van de stembureaus geteld zijn. Voorlopige uitslag als de gemeente de uitslag van alle stembureaus geeft. Geeft de gemeente alleen de zetelverdeling, dan mag een voorlopige uitslag met alleen zetels (stemmen: null bij alle partijen).
   - Schrijf de stand naar een bestand buiten de repository, bijvoorbeeld /tmp/uitslag-handmatig.json, in deze vorm:
     ```
     { "stadium": "tussenstand" | "voorlopig",
       "bijgewerkt": "<tijdstip van de publicatie door de gemeente, ISO met +01:00>",
       "bron": { "naam": "Gemeente Hilversum, liveblog", "url": "<https-adres waar je het las>" },
       "bureaus": { "geteld": <n>, "totaal": <n> },           // bij een tussenstand verplicht
       "partijen": { "<slug>": { "stemmen": <n of null>, "zetels": <n> } },  // zetels alleen bij voorlopig; alle 20 partijen
       "geldig": <n>, "blanco": <n>, "ongeldig": <n>, "uitgebracht": <n>, "kiesgerechtigden": <n> }  // alleen als de gemeente ze noemt
     ```
     Geeft de gemeente zelf de zetelverdeling, neem die over bij `zetels`. Wie er gekozen is, neem je niet met de hand over: dat komt met de voorkeurstemmen uit het telbestand van de gemeente, via het script.
     Slugs op lijstnummer: 1 hart-voor-hilversum, 2 pro, 3 d66, 4 vvd, 5 cda, 6 lokaal-een, 7 sp, 8 christenunie, 9 bvnl, 10 scb, 11 gewoon-hilversum, 12 dorp-voor-dorp, 13 stop-betaald-parkeren-vip, 14 opstand-nu, 15 pvdd, 16 blanco-van-oostveen, 17 lfd, 18 volt, 19 fvd, 20 bbb.
   - Controleer elk getal twee keer tegen de bron voordat je publiceert.
   - Staan er op de site al voorkeurstemmen (`kandidaten` in data/uitslag.json), publiceer dan niets met de hand: dan is het telbestand er al.
   - Publiceer: `cd /home/paul/Work/hilversumkiest-uitslag-taak && node tools/uitslag/publiceer.mjs /tmp/uitslag-handmatig.json --push`. Dat controleert alles (20 partijen, optellen, zetels samen 39, niet teruglopen; wijkt de zetelverdeling van de gemeente af van de eigen berekening, dan publiceert het toch de gemeente en meldt het een waarschuwing) en publiceert alleen als alles klopt.
   - Wijst het de stand af, lees de bron dan opnieuw. Was het jouw overschrijffout, verbeter die en probeer nog één keer. Klopt de bron zelf niet, publiceer dan niets.
   - Voorkeurstemmen per kandidaat neem je niet met de hand over: die komen uit het telbestand en daar is het script voor.

Staat er in een uitkomst een lijst `waarschuwingen` (de zetels of gekozenen van de gemeente wijken af van wat de site zelf met de Kieswet berekent), begin je slotbericht dan met "LET OP, Paul:" en de verschillen. De cijfers van de gemeente zijn leidend en staan dan al op de site; pas niets aan.

4. Sluit af met twee of drie zinnen: wat je zag, wat er gepubliceerd is (commit) of waarom niet.
