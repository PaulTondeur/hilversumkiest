# Advies bij de feedback van 16 november

Drie mensen deden de stemwijzer en gaven feedback. Per punt: wat ik deed, wat niet, en waarom. Daarnaast vroeg Paul de winnaar in de uitslag groen te maken in plaats van rood; dat is gedaan.

## 1 en 3. "Laat ook partijen zien buiten mijn keuze die beter passen"

**Goed idee, gebouwd, met een strenge drempel.** Wie de "usual suspects" kleurt, mist anders een partij die beter past. Maar er zitten twee valkuilen in.

- **Scheve steekproef.** Je krijgt de stellingen waarop jouw partijen verschillen. Voor een andere partij zijn dat toevallige stellingen, waarop ze ook vaak geen standpunt heeft. Daarom geen percentage en geen rangorde, maar één zin ("staat ook dicht bij je: duidelijk dichter dan de partijen die je koos"), plus de eerlijke kanttekening en hoeveel stellingen het draagt.
- **Neutraliteit.** De regel moet voor elke partij gelijk zijn en mag niet stilletjes partijen met weinig standpunten benadelen. Dat deed de eerste versie wel, zie hieronder.

**De regel** (`buitenKeuze` in `src/engine.mjs`, voor elke partij hetzelfde, geen handwerk):

1. Voor elke partij, gekozen of niet: hoe dicht staat ze bij je op de beantwoorde stellingen waarover zij een standpunt heeft. Geen standpunt telt niet mee.
2. Een partij buiten je keuze moet een standpunt hebben op minstens 8 van je stellingen en op minstens de helft.
3. Ze moet minstens 10 procentpunt dichter bij je staan dan je beste eigen partij.
4. Hooguit twee, in stembiljetvolgorde. Haalt niemand de drempel, dan staat er niets.

**De doorklik.** Eén knop: "Doe de stemwijzer met [partij] erbij". Je partijen, thema's, diepte en antwoorden blijven staan; je krijgt alleen de nieuwe stellingen waarop die partij van de jouwe verschilt ("Nieuwe stelling, nog 3 na deze") en gaat dan terug naar de uitslag. Dat is de eerlijke controle. Daarnaast een gewone link naar de vergelijkpagina ("Leg D66 naast PRO").

**Wat gemeten is** (`werk/feedback/meet-suggestie.mjs`, 12.000 gesimuleerde bezoekers per soort, kiezersmodel uit de eindcontrole):

| | Regel gekozen | Eerste versie (2/3 dekking, 5 pp) | Met de uitslagregel van nu |
|---|---:|---:|---:|
| Bezoeker die al goed koos: krijgt toch een blok | 3% | 6% | 2% |
| Bezoeker die willekeurig invult: krijgt een blok | 23% | 39% | 17% |
| Bezoeker die de eigen partij miste: die partij genoemd | 36% (27–44% per partij) | 41% (24–50%) | 29% (14–43%) |
| Per partij genoemd bij willekeur | 1,3–2,9% | 2,6–5,1% | 0,9–2,5% (r = 0,83 met aantal standpunten) |
| Maskeerproef: 30% standpunten weg bij Volt | 46 → 27% | 48 → 6% | 32 → 9% |
| idem bij Hart voor Hilversum | 38 → 29% | 44 → 12% | 25 → 8% |

- De eerste versie en de variant met de uitslagregel van nu straften partijen met minder standpunten hard: haal er 30% weg en ze worden bijna nooit meer genoemd. Bij de gekozen regel zakt dat veel minder.
- Wat overblijft is dat een partij met minder standpunten vaker onder de 8 stellingen blijft. Dat is geen straf maar gebrek aan gegevens: dan valt er niets te zeggen. Het staat in de verantwoording.
- De marge van 10 procentpunt halveert de "loze" blokken (bij goed kiezen en bij willekeurig invullen) en kost een paar procent herkenning. Dat vind ik de juiste ruil: het blok mag de eigen uitslag niet overschaduwen.

**Wat ik niet deed.** Geen percentage of lijst van alle twintig onder je uitslag: dat maakt van een keuze-stemwijzer alsnog een alles-stemwijzer, met cijfers op een scheve steekproef. Geen "Wist u dat?": de site zegt "je".

## 2a. "Bij sommige vragen vond AI maar enkele partijen met een antwoord; wat betekent dat voor de score?"

**Terecht, en het raakt de open bevinding 1 uit de eindcontrole.** Nu kost "geen standpunt" een partij punten. Partijen met minder gevonden standpunten (SCB, SBP, Lijst Van Oostveen, Hart voor Hilversum, Volt, Dorp voor Dorp) komen daardoor structureel lager uit.

- **Al zichtbaar.** De uitslag zegt bij elke partij op hoeveel van je stellingen een standpunt bekend is ("Van 9 van jouw 14 stellingen is een standpunt bekend"), met de waarschuwing "Deze score zegt daardoor weinig" onder de helft. Daar hoefde niets bij.
- **Herstel live gezet op 16 november, op verzoek van Paul** (eerst klaargelegd als patch). Wat er verandert:
  - `bereken` slaat een stelling zonder standpunt voor die partij over;
  - de uitslag toont "–" voor een partij zonder enig standpunt op je stellingen;
  - de noot wordt "Deze score rust op 9 van je 14 stellingen";
  - de verantwoording zegt het eerlijk, en de onjuiste zin over "half overeenkomend" gaat weg;
  - de toets is opnieuw gedraaid.
- **Gevolgen gemeten** in `werk/feedback/meet-rekenregel.mjs` (20.000 proefuitslagen zoals bezoekers ze maken, uitvoer in `meet-rekenregel-uitvoer.txt`):
  - In 7,7% van de uitslagen staat een andere partij bovenaan.
  - Percentages stijgen gemiddeld 2,2 procentpunt; partijen met veel 'geen standpunt' het meest (SCB +3,7, SBP +3,6, HvH +3,5, Lijst Van Oostveen +3,4), PRO het minst (+0,8).
  - Kans om bovenaan te staan als je gekozen bent: nu 15,2–22,2% per partij, na herstel 17,2–20,9%. Erop vooruit: Lijst Van Oostveen (+2,4), Volt (+2,2), SCB en SBP (+2,1), HvH (+1,9), Dorp voor Dorp (+1,6). Erop achteruit: PRO (−2,3), VVD (−1,9), CDA (−1,7), Lokaal Eén (−1,5).
  - Keerzijde in de eigen toets (`data/toets.json` in de patch): bij willekeurig invullen wint SCB nu het vaakst (7,0%, was 3,3%); de reeks wordt 3,3–7,0% (was 3,0–7,8%). De proef-aanhanger van de toets herkent zijn partij gemiddeld in 97% (was 100%), laagste HvH 90%. Die proef-aanhanger slaat over waar zijn partij zwijgt; de eindcontrole liet zien dat die maat het probleem juist mist. Met de realistischer mengkiezer uit de eindcontrole stijgt de herkenning van de zwakste partij van 55% naar 78%.

Met het herstel kloppen de verantwoording en de uitslag weer: daar staat nu dat een stelling zonder standpunt voor die partij niet meetelt.

## 2b. "AI vond antwoorden waarvan ik denk dat de lijsttrekker het tegendeel zou zeggen"

Wat een lijsttrekker zou zeggen, kunnen we niet weten. Gissen maakt het erger. Wel gedaan:

- **Sterker vermeld.** Op de uitslagpagina staat nu bij de uitleg dat de standpunten met hulp van AI zijn afgeleid en dat de partijen ze niet hebben nagekeken. Dat stond alleen in de verantwoording en in de voettekst.
- **Fout melden.** Boven "Stelling voor stelling" staat: "Klopt een standpunt volgens jou niet? Meld het op GitHub, met de stelling en de partij erbij". Bij elk standpunt staan al het citaat en de bron, dus de lezer kan zelf nakijken.

Niet gedaan:

- **Geen meldlink bij elk standpunt.** Dat zijn er tot twintig per stelling; dat wordt rommelig.
- **Geen mailadres.** Er staat geen mailadres op de site, en dat publiceer ik niet zonder Paul. GitHub vraagt een account, wat een drempel is. Wil Paul een mailadres erbij, dan is het één regel.

De eindcontrole vond ook concrete gevallen waar de score twijfelachtig is (bevinding 2 en 3, zoals `verkeer-terugdraaien` en `bestuur-dorpsraad-op-verzoek`). Twee dagen voor de verkiezing is dat het meest zinnige herstel voor deze klacht. Dat is handwerk in de standpunten en valt buiten deze ronde.
