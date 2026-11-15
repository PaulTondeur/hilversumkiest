// Eindredactie: kiest uit de kandidaten per thema de definitieve stellingenbank (zonder posities).
import fs from 'node:fs';
const lees = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
// [doelthema, bronthema, id, {overschrijvingen}]
const KEUZE = [
  // wonen
  ['wonen', 'wonen', 'wonen-bouwtempo'],
  ['wonen', 'wonen', 'wonen-eigen-behoefte'],
  ['wonen', 'wonen', 'wonen-dorpsrand'],
  ['wonen', 'wonen', 'wonen-nederhorst-noord-open'],
  ['wonen', 'wonen', 'wonen-hoogbouw'],
  ['wonen', 'wonen', 'wonen-hoogbouw-alleen-station'],
  ['wonen', 'wonen', 'wonen-kantoren-naar-wonen'],
  ['wonen', 'wonen', 'wonen-sociale-huur-per-project', { stelling: 'De gemeente spreekt per nieuwbouwproject af hoeveel sociale huur er komt, in plaats van één vast minimumpercentage voor elk project.' }],
  ['wonen', 'wonen', 'wonen-lokale-binding-helft'],
  ['wonen', 'wonen', 'wonen-voorrang-beroepen-weg'],
  ['wonen', 'wonen', 'wonen-starterswoning-boven-lening'],
  ['wonen', 'wonen', 'wonen-grondbeleid'],
  ['wonen', 'wonen', 'wonen-parkeernorm'],
  // verkeer
  ['verkeer', 'verkeer', 'verkeer-terugdraaien'],
  ['verkeer', 'verkeer', 'verkeer-buurt-beslist'],
  ['verkeer', 'verkeer', 'verkeer-bezoek'],
  ['verkeer', 'verkeer', 'verkeer-eerste-uur'],
  ['verkeer', 'verkeer', 'verkeer-vergunning'],
  ['verkeer', 'verkeer', 'verkeer-opbrengst'],
  ['verkeer', 'verkeer', 'verkeer-fietspad'],
  ['verkeer', 'verkeer', 'verkeer-autoluw'],
  ['verkeer', 'verkeer', 'verkeer-zero-emissie'],
  ['verkeer', 'verkeer', 'verkeer-30-hoofdwegen'],
  ['verkeer', 'verkeer', 'verkeer-30-dorpswegen'],
  // klimaat
  ['klimaat', 'klimaat', 'klimaat-alleen-rijk'],
  ['klimaat', 'klimaat', 'klimaat-2040'],
  ['klimaat', 'klimaat', 'klimaat-gas-tijdpad'],
  ['klimaat', 'klimaat', 'klimaat-isolatie-eerst'],
  ['klimaat', 'klimaat', 'klimaat-warmtenet-markt'],
  ['klimaat', 'klimaat', 'klimaat-wind-draagvlak'],
  ['klimaat', 'klimaat', 'klimaat-kleine-windmolen'],
  ['klimaat', 'klimaat', 'klimaat-zon-boerenland'],
  ['klimaat', 'klimaat', 'klimaat-kern-verkenning', { stelling: 'De gemeente laat onderzoeken of er in de regio een kleine kerncentrale kan komen.' }],
  ['klimaat', 'klimaat', 'klimaat-kern-locatie'],
  ['klimaat', 'klimaat', 'klimaat-houtstook'],
  // natuur
  ['natuur', 'natuur', 'natuur-afsluiten'],
  ['natuur', 'natuur', 'natuur-snelvaren'],
  ['natuur', 'natuur', 'natuur-recreant-betaalt'],
  ['natuur', 'natuur', 'natuur-snippergroen'],
  ['natuur', 'natuur', 'natuur-groennorm'],
  ['natuur', 'natuur', 'natuur-bomen'],
  ['natuur', 'natuur', 'natuur-maaien'],
  ['natuur', 'natuur', 'natuur-landbouw-natuur'],
  ['natuur', 'natuur', 'natuur-stikstof-boeren'],
  ['natuur', 'natuur', 'natuur-gifzone'],
  ['natuur', 'natuur', 'natuur-vliegveld'],
  // zorg
  ['zorg', 'zorg', 'zorg-minima-grens'],
  ['zorg', 'zorg', 'zorg-jeugd-besparing'],
  ['zorg', 'zorg', 'zorg-wmo-kwijtschelding'],
  ['zorg', 'zorg', 'zorg-wmo-zonderindicatie'],
  ['zorg', 'zorg', 'zorg-aanbieders-een'],
  ['zorg', 'zorg', 'zorg-bijstand-tegenprestatie'],
  ['zorg', 'zorg', 'zorg-buurthuis-elkewijk'],
  ['zorg', 'zorg', 'zorg-buurthuis-jaarsubsidie'],
  ['zorg', 'zorg', 'zorg-preventie-ongezond'],
  // veiligheid
  ['veiligheid', 'veiligheid', 'veiligheid-boa-of-jongerenwerk'],
  ['veiligheid', 'veiligheid', 'veiligheid-boa-taken'],
  ['veiligheid', 'veiligheid', 'veiligheid-camera-uitbreiden'],
  ['veiligheid', 'veiligheid', 'veiligheid-coffeeshops-aantal', { stelling: 'Hilversum verlaagt het maximum aantal coffeeshops.' }],
  ['veiligheid', 'veiligheid', 'veiligheid-coffeeshops-scholen'],
  ['veiligheid', 'veiligheid', 'veiligheid-bibob'],
  ['veiligheid', 'veiligheid', 'veiligheid-verlichting-fietspaden'],
  // asiel
  ['asiel', 'asiel', 'asiel-zonder-spreidingswet'],
  ['asiel', 'asiel', 'asiel-instroom-voorwaarde'],
  ['asiel', 'asiel', 'asiel-spreidingswet-afschaffen'],
  ['asiel', 'asiel', 'asiel-blijvende-opvang'],
  ['asiel', 'asiel', 'asiel-omwonenden-beslissen'],
  ['asiel', 'asiel', 'asiel-kader-dorpen'],
  ['asiel', 'asiel', 'asiel-voorrang-statushouders'],
  ['asiel', 'asiel', 'asiel-taal-tijdens-procedure'],
  ['asiel', 'asiel', 'asiel-welkomstprogramma'],
  ['asiel', 'asiel', 'asiel-regenbooggeld'],
  // economie
  ['economie', 'economie', 'economie-mediapark-woningen'],
  ['economie', 'economie', 'economie-bruisend-hart-uitstel'],
  ['economie', 'economie', 'economie-centrum-compacter'],
  ['economie', 'economie', 'economie-zondag-beperken'],
  ['economie', 'economie', 'economie-citymarketing'],
  ['economie', 'economie', 'economie-stadsfonds-afschaffen'],
  ['economie', 'natuur', 'natuur-plassen-uitbreiden', { id: 'economie-plassen-uitbreiden' }],
  // cultuur
  ['cultuur', 'cultuur', 'cultuur-budget-niveau'],
  ['cultuur', 'cultuur', 'cultuur-projectsubsidie-eindig'],
  ['cultuur', 'cultuur', 'cultuur-subsidie-bezoekers'],
  ['cultuur', 'cultuur', 'cultuur-dorpsgarantie'],
  ['cultuur', 'cultuur', 'cultuur-sportevenementen'],
  ['cultuur', 'cultuur', 'cultuur-monumentenregels'],
  ['cultuur', 'cultuur', 'cultuur-monumentale-scholen'],
  // bestuur
  ['bestuur', 'bestuur', 'bestuur-dorpsraad-op-verzoek'],
  ['bestuur', 'bestuur', 'bestuur-dorpsraad-beslist'],
  ['bestuur', 'bestuur', 'bestuur-loket-elk-dorp'],
  ['bestuur', 'bestuur', 'bestuur-dorpen-voorrang'],
  ['bestuur', 'bestuur', 'bestuur-gelijke-regels'],
  ['bestuur', 'bestuur', 'bestuur-leges-dorpsevenementen'],
  ['bestuur', 'bestuur', 'bestuur-referendum-advies'],
  ['bestuur', 'bestuur', 'bestuur-regio-minder'],
  // financien
  ['financien', 'financien', 'financien-tekort-lasten'],
  ['financien', 'financien', 'financien-ozb-meestijgen'],
  ['financien', 'financien', 'financien-subsidies-korten'],
  ['financien', 'financien', 'financien-heffing-draagkracht'],
  ['financien', 'financien', 'financien-afval-vast-bedrag'],
  ['financien', 'financien', 'financien-toerist-forens-laag'],
  ['financien', 'financien', 'financien-inhuur-vaste-banen'],
  ['financien', 'financien', 'financien-investeringen-spreiden'],
  ['financien', 'financien', 'financien-centrum-sober'],
];
const cache = {};
const basis = [];
const B = {};
for (const [thema, bron, id, extra = {}] of KEUZE) {
  cache[bron] ||= lees(`werk/themas/${bron}/kandidaten.json`);
  const k = cache[bron].find((x) => x.id === id);
  if (!k) throw new Error('niet gevonden: ' + id);
  const nid = extra.id || id;
  basis.push({ id: nid, thema, onderwerp: k.onderwerp, kop: k.kop, stelling: extra.stelling || k.stelling, uitleg: k.uitleg, voor: k.voor, tegen: k.tegen });
  B[nid] = k.posities;
}
fs.writeFileSync(new URL('../data/stellingen-basis.json', import.meta.url), JSON.stringify(basis, null, 1));
fs.mkdirSync(new URL('../werk/codering/B/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../werk/codering/B/per-stelling.json', import.meta.url), JSON.stringify(B, null, 1));
const tel = {};
for (const b of basis) tel[b.thema] = (tel[b.thema] || 0) + 1;
console.log(basis.length, 'stellingen', tel);
const lang = basis.filter((b) => b.stelling.split(/\s+/).length > 24).map((b) => b.id);
console.log('langer dan 24 woorden:', lang);
