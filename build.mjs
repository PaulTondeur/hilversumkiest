// Bouwt de statische site in dist/. Geen afhankelijkheden: `node build.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { partijAfstand, positie, onderscheid } from './src/engine.mjs';
import { themaSprite, themaBeeld } from './src/themabeelden.mjs';
import { maakUitslag } from './src/uitslag.mjs';
import { controleer } from './src/uitslagcontrole.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const lees = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const bestaat = (p) => fs.existsSync(path.join(ROOT, p));
// Versie van de stylesheet in het adres, zodat een browser na een wijziging niet de oude opmaak uit zijn cache toont.
const CSS_VERSIE = createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'src/assets/css/site.css'))).digest('hex').slice(0, 8);
const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json');
const stellingen = lees('data/stellingen.json');
const info = lees('bronnen/_verkiezing/info.json');
const bureaus = lees('bronnen/_verkiezing/stembureaus.json');
const toets = bestaat('data/toets.json') ? lees('data/toets.json') : null;
const P = Object.fromEntries(partijen.map((p) => [p.slug, p]));
const T = Object.fromEntries(themas.map((t) => [t.id, t]));
const slugs = partijen.map((p) => p.slug);
// De uitslag (data/uitslag.json, gevuld door tools/uitslag/haal.mjs). Leeg ({}) betekent: nog niets, de site blijft
// zoals ze is. Klopt het bestand niet, dan stopt de bouw en blijft de vorige versie van de site online staan.
const kandidatenAlle = bestaat('data/kandidaten.json') ? lees('data/kandidaten.json') : {};
const uitslagData = bestaat('data/uitslag.json') ? lees('data/uitslag.json') : {};
const ZETELS = +(process.env.UITSLAG_ZETELS || 39); // anders dan 39 alleen in de oefening met een oude verkiezing
{
  const fouten = controleer(uitslagData, partijen, kandidatenAlle, { zetels: ZETELS });
  if (fouten.length) throw new Error(`data/uitslag.json klopt niet:\n- ${fouten.join('\n- ')}`);
  // Verzonnen cijfers voor de simulatie komen nooit op de echte site: die bouwen alleen met SIMULATIE=1.
  if (uitslagData.simulatie && process.env.SIMULATIE !== '1') throw new Error('data/uitslag.json is een simulatie; bouw die alleen met SIMULATIE=1');
}
// Uitslag van 2022 in beide gemeenten, voor het verschil per partij. Niet in de oefening met een oude verkiezing.
const raden2022 = bestaat('data/raden-2022.json') && !process.env.UITSLAG_ZETELS ? lees('data/raden-2022.json') : null;
const UK = maakUitslag({ u: uitslagData, partijen, kandidaten: kandidatenAlle, e, zetels: ZETELS, vorige: raden2022 });

const POS = { 2: 'Eens', 1: 'Eerder eens', 0: 'Midden', '-1': 'Eerder oneens', '-2': 'Oneens', null: 'Geen standpunt gevonden' };
const SOORT = { programma: 'Verkiezingsprogramma', mijnstem: 'Antwoord van de partij in MijnStem', stemgids: 'Antwoord van de partij in Stemgids Hilversum', hilversumsnieuws: 'Reactie van de partij in Hilversums Nieuws', stemgedrag: 'Stemgedrag in de raad', afgeleid: 'Afgeleid uit wat de partij over een verwant punt zegt' };

const BASIS = (process.env.BASIS || '/').replace(/\/?$/, '/'); // bv. BASIS=/hilversumkiest/ voor gebruiker.github.io/hilversumkiest/
const DIST = path.join(ROOT, 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/engine.mjs'), path.join(DIST, 'assets/js/engine.mjs'));

function schrijf(rel, html) {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (BASIS !== '/' && rel.endsWith('.html')) html = html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASIS}`);
  // Links naar andere sites openen in een nieuw venster; de eigen site blijft in hetzelfde venster.
  // Een schermlezer hoort dat erbij: een onzichtbare toevoeging, of in de aria-label als de link die heeft.
  if (rel.endsWith('.html')) {
    html = html.replace(/(<a\b[^>]*\bhref="https?:\/\/[^"]*"[^>]*>)([\s\S]*?)<\/a>/g, (geheel, a, tekst) => {
      if (/\btarget=/.test(a) || /href="https?:\/\/(www\.)?hilversumkiest\.nl/.test(a)) return geheel;
      const metRel = /\brel="/.test(a) ? a.replace(/\brel="([^"]*)"/, (m, r) => `rel="${/noopener/.test(r) ? r : `${r} noopener`.trim()}"`) : a.replace(/>$/, ' rel="noopener">');
      const open = metRel.replace(/>$/, ' target="_blank">');
      if (/\baria-label="/.test(open)) return `${open.replace(/\baria-label="([^"]*)"/, 'aria-label="$1, opent in een nieuw venster"')}${tekst}</a>`;
      return `${open}${tekst}<span class="sr"> (opent in een nieuw venster)</span></a>`;
    });
  }
  fs.writeFileSync(p, html);
}

// Adres van de openbare repository: uit de omgeving (de GitHub-workflow vult dit zelf in) of uit data/site.json.
const REPO = (process.env.REPO || (bestaat('data/site.json') ? lees('data/site.json').repo : '') || '').replace(/\/$/, '');
const NAV = [
  ...(UK ? [['/uitslag/', 'Uitslag']] : []),
  ['/stemwijzer/', 'Stemwijzer'],
  ['/partijen/', 'Partijen'],
  ['/vergelijken/', 'Vergelijken'],
  // Zodra er een uitslag is (vanaf de tussenstand), maakt Stemmen in het menu plaats voor Uitslag. De pagina blijft bestaan.
  ...(UK && UK.stadium !== 'wacht' ? [] : [['/stemmen/', 'Stemmen']]),
  ['/andere-stemhulpen/', 'Andere stemhulpen'],
];
const VINDER = '/stembureauvinder/';
// Na de verkiezing (er staat een voorlopige of officiële uitslag) gaat de site over de uitslag: de voorpagina opent
// ermee, en de verwijzingen naar de verkiezingsdag en de stembureaus verdwijnen uit de kop.
const NA = !!UK && ['voorlopig', 'officieel'].includes(UK.stadium);

// Bezoeken tellen met Plausible op een eigen server (data/site.json, "plausible"): zonder cookies. Het script meet
// niets uit zichzelf; wij sturen het paginabezoek en een paar handelingen, steeds met alleen het pad van de pagina.
// Wat achter # of ? staat (een gedeelde uitslag, gekozen partijen) gaat nooit mee, en antwoorden ook niet. Bij een uitslag
// sturen we wel welke drie partijen bovenaan staan (stemwijzer.js, meld), zodat te zien is waar mensen uitkomen.
// Het script stuurt ook de vorige pagina mee (document.referrer); daarom geeft elke pagina die alleen als domein door
// (meta referrer hieronder), anders ging bij doorklikken een adres als /vergelijken/?a=d66&b=vvd toch mee.
const PLAUSIBLE = (bestaat('data/site.json') ? lees('data/site.json').plausible : null) || null;
const meetKop = PLAUSIBLE ? `<script defer data-domain="${e(PLAUSIBLE.domein)}" src="${e(PLAUSIBLE.server)}/js/script.manual.js"></script>
<script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};(function(){var p=new URLSearchParams(location.search),q=new URLSearchParams();['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref','source'].forEach(function(k){if(p.has(k))q.set(k,p.get(k))});var s=q.toString(),u=location.origin+location.pathname+(s?'?'+s:'');window.meet=function(naam,props){var o={u:u};if(props)o.props=props;window.plausible(naam,o)};window.meet('pageview');document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a[href]');if(a&&a.host&&a.host!==location.host&&/^https?:$/.test(a.protocol))window.meet('Outbound Link: Click',{url:a.origin+a.pathname})},true)})();</script>` : `<script>window.meet=function(){}</script>`;

// Het vaste adres van de site, voor canonieke adressen, deelafbeeldingen en de sitemap.
const SITE = (process.env.DOMEIN ? `https://${process.env.DOMEIN}` : (bestaat('data/site.json') && lees('data/site.json').url) || 'https://hilversumkiest.nl').replace(/\/$/, '');
const volledig = (pad) => SITE + BASIS.replace(/\/$/, '') + pad;
// Deelafbeeldingen (1200 x 630) maakt tools/deelbeelden.mjs; de teksten erop staan in data/deelbeelden.json.
const DEEL = bestaat('data/deelbeelden.json') ? lees('data/deelbeelden.json') : {};
const OP_BEELD = 'Hilversum kiest, gemeenteraadsverkiezing woensdag 18 november 2026';
const deelBeeld = (naam) => (bestaat(`src/assets/deel/${naam}.png`) ? naam : bestaat('src/assets/deel/voorpagina.png') ? 'voorpagina' : null);
const deelAlt = (naam) => (DEEL[naam] ? `${DEEL[naam].kop}${/[.?!]$/.test(DEEL[naam].kop) ? '' : '.'} ${DEEL[naam].tekst}. ${OP_BEELD}.` : `${OP_BEELD}.`);
const ldJson = (x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`;
const sitemap = [];

// Lange leespagina's krijgen op een breed scherm rechts een inhoudsopgave die meeloopt (uit de h2's met een id).
const metWijzer = (html) => {
  const koppen = [...html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  if (koppen.length < 3) return html;
  return `<div class="lees"><div class="lees__tekst">${html}</div><nav class="leeswijzer" aria-label="Op deze pagina"><b>Op deze pagina</b><ol>${koppen.map(([, id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav></div>`;
};
function pagina({ titel, beschrijving, pad, url = pad, inhoud, scripts = '', kop = '', beeld = 'voorpagina', beeldAlt = null, index = true, ld = [], wijzer = false }) {
  const b = deelBeeld(beeld);
  if (index) sitemap.push(url);
  const huidig = (h) => (url === h ? ' aria-current="page"' : pad === h ? ' aria-current="true"' : '');
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin">
<title>${e(titel)}</title>
<meta name="description" content="${e(beschrijving)}">
${index ? `<link rel="canonical" href="${e(volledig(url))}">` : '<meta name="robots" content="noindex">'}
<meta property="og:site_name" content="Hilversum kiest">
<meta property="og:locale" content="nl_NL">
<meta property="og:type" content="website">
<meta property="og:title" content="${e(titel.replace(/ – Hilversum kiest$/, ''))}">
<meta property="og:description" content="${e(beschrijving)}">
${index ? `<meta property="og:url" content="${e(volledig(url))}">` : ''}
${b ? `<meta property="og:image" content="${e(volledig(`/assets/deel/${b}.png`))}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${e(beeldAlt || deelAlt(b))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image:alt" content="${e(beeldAlt || deelAlt(b))}">` : '<meta name="twitter:card" content="summary">'}
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/jost.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${CSS_VERSIE}">
${ld.map(ldJson).join('\n')}
${kop}
${meetKop}
</head>
<body>
<a class="sr sr--focus" href="#inhoud">Naar de inhoud</a>${UK?.simulatie ? '<div class="uk-simbalk" role="note">Simulatie: alle uitslagcijfers op deze site zijn verzonnen. Dit is geen echte uitslag.</div>' : ''}
<header class="kop"><div class="binnen">
  <a class="merk" href="/"><span class="vakje vakje--vol" aria-hidden="true"></span><span class="merk__tekst"><span class="merk__naam">Hilversum kiest<span class="beta" title="Proefversie: er kunnen nog fouten in zitten">bèta</span></span><span class="merk__wanneer">${NA ? 'verkiezing van 18 november 2026' : 'op woensdag 18 november, 7.30 tot 21.00 uur'}</span></span></a>
  <nav aria-label="Hoofdmenu">${NAV.map(([h, t]) => `<a href="${h}"${huidig(h)}>${t}</a>`).join('')}${NA ? '' : `<a class="navknop" href="${VINDER}"${huidig(VINDER)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18s6-5.6 6-10A6 6 0 0 0 4 8c0 4.4 6 10 6 10z"/><circle cx="10" cy="8" r="2.2"/></svg>Stembureauvinder</a>`}</nav>
</div></header>
<main id="inhoud" tabindex="-1"><div class="binnen">
${(wijzer ? metWijzer(inhoud) : inhoud).replace(/<div class="tabel-wrap">/g, '<div class="tabel-wrap" tabindex="0" role="region" aria-label="Tabel">')}
</div></main>
<footer class="voet"><div class="binnen">
  <div class="voet__raster">
    <div>
      <h2>Kies op inhoud. En ga stemmen.</h2>
      <p>Ik heb dit gemaakt omdat ik geloof dat een gemeente beter wordt als veel mensen meedoen en weten waar ze voor kiezen. Met goede informatie kan iedereen zelf een keuze maken: op inhoud, en op de mensen die het gaan doen. Kijk rond, vergelijk, en kom op woensdag 18 november naar de stembus.</p>
      <p class="voet__maker"><a href="https://www.linkedin.com/in/paultondeur/" rel="noopener">Paul Tondeur</a>, inwoner van Hilversum<br><span class="klein">Ook van Paul: <a href="https://www.paultondeur.com/" rel="noopener">paultondeur.com</a> en <a href="https://wbso.ai/" rel="noopener">WBSO.ai</a></span></p>
    </div>
    <div>
      <h3><span class="voet__code" aria-hidden="true">&lt;/&gt;</span>Open tot en met de code</h3>
      <p>Hilversum kiest hoort bij geen partij en niet bij de gemeente. De standpunten komen uit de verkiezingsprogramma's en uit wat partijen zelf elders antwoordden; de partijen hebben ze niet nagekeken. Juist daarom ligt alles open: <a href="/verantwoording/"${pad === '/verantwoording/' ? ' aria-current="page"' : ''}>lees hoe het gemaakt is</a>${REPO ? `, of <a href="${e(REPO)}" rel="noopener">kijk mee in de code op GitHub</a>. Zie je iets wat niet klopt? <a href="${e(REPO)}/issues" rel="noopener">Meld het daar</a>, dan kijk ik ernaar` : ''}.</p>
      <p>Zin om er zelf een te maken voor jouw gemeente? <a href="/zelf-maken/"${pad === '/zelf-maken/' ? ' aria-current="page"' : ''}>De hele opdracht staat voor je klaar</a>.</p>
      <p>Er zijn meer stemhulpen voor deze verkiezing, elk met een eigen aanpak: <a href="/andere-stemhulpen/"${pad === '/andere-stemhulpen/' ? ' aria-current="page"' : ''}>bekijk ze op een rij</a>.</p>
    </div>
  </div>
</div></footer>
${scripts}
</body>
</html>`;
}

const stip = (p) => `<i style="background:${p.kleur}"></i>`;
const lijstLink = (p) => `<a href="/partijen/${p.slug}/">${e(p.kort)}</a>`;

function biljet({ voet = '' } = {}) {
  return `<div class="biljet" data-biljet>
  <div class="biljet__kop"><span>Partijen op het stembiljet</span><span><button type="button" data-alles>Kleur alles</button> <button type="button" data-wis>Wis</button></span></div>
  <ul class="biljet__lijst">
  ${partijen.map((p) => `<li><label><input type="checkbox" name="lijst" value="${p.slug}"><span class="vakje" aria-hidden="true"></span><span class="biljet__nr">${p.nr}</span><span class="biljet__naam">${e(p.kort)}</span></label></li>`).join('\n  ')}
  </ul>
  ${voet}
</div>`;
}

// De video op de voorpagina: zet het adres van het bestand in data/site.json ("video") zodra hij er is.
const VIDEO = (bestaat('data/site.json') ? lees('data/site.json').video : '') || '';
// Een YouTube-adres wordt de gewone speler van YouTube (youtube-nocookie: geen cookies tot je afspeelt).
const PARTIJVIDEOS = bestaat('data/partijvideos.json') ? lees('data/partijvideos.json') : { videos: {} };
const YOUTUBE = (VIDEO.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1] || '';
const logos = bestaat('data/logos.json') ? lees('data/logos.json') : {};
// Het logo van een partij, of haar naam als er geen logo is (de blanco lijst).
const logoHtml = (p, { versiering = false } = {}) => {
  const l = logos[p.slug];
  return l?.bestand
    ? `<span class="logo${l.achtergrond === 'donker' ? ' logo--donker' : ''}"><img src="/assets/logos/${e(l.bestand)}" alt="${versiering ? '' : `Logo ${e(p.kort)}`}" loading="lazy"></span>`
    : `<span class="logo logo--naam"${versiering ? ' aria-hidden="true"' : ''}>${e(p.kort.replace(/\s*\(.*$/, ''))}</span>`;
};

// ---------- Voorpagina ----------
const raad = info.nieuwe_raad || {};
const ytId = (adres) => ((adres || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1] || '';
const ytSpeler = (id, titel) => `<iframe class="video__beeld" src="https://www.youtube-nocookie.com/embed/${e(id)}?rel=0" title="${e(titel)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
// De uitslagvideo naast de uitslag: data/site.json, "uitslagVideo": { "url": "<YouTube-adres>", "tekst": "<regel eronder>" }.
const UITSLAGVIDEO = (bestaat('data/site.json') ? lees('data/site.json').uitslagVideo : null) || {};
const UITSLAGVIDEO_ID = ytId(UITSLAGVIDEO.url);
const waaromBlok = `<section class="video" id="waarom">
  ${YOUTUBE ? ytSpeler(YOUTUBE, 'Video: waarom ik Hilversum kiest heb gemaakt, en hoe je het gebruikt') : VIDEO ? `<video class="video__beeld" controls preload="metadata" src="${e(VIDEO)}"></video>` : `<div class="video__beeld video__beeld--leeg"><span>Hier komt de video</span></div>`}
  <div>
    <h2>${NA ? 'Wie dit maakt, en hoe het werkt' : 'Waarom dit er is, en hoe je het gebruikt'}</h2>
    <p>${NA ? 'Ik ben Paul Tondeur. Ik heb Hilversum kiest gemaakt, los van alle partijen. In deze video leg ik uit waarom, en hoe de stemwijzer in elkaar zit.' : VIDEO ? 'In deze video leg ik uit waarom ik Hilversum kiest heb gemaakt en hoe je er het meeste uit haalt.' : 'Binnenkort leg ik hier in een korte video uit waarom ik Hilversum kiest heb gemaakt en hoe je er het meeste uit haalt.'}</p>
    <p><a href="/verantwoording/">Lees hoe dit gemaakt is</a></p>
  </div>
</section>`;
const metZetel = NA ? UK.inRaad : 0;
// Na de verkiezing: eerst de uitslag (met de video ernaast), dan kort de stemwijzer, dan wie dit maakt en hoe het werkt.
const voorpaginaBoven = NA ? `<div class="thuisband">
<h1 class="thuis__kop">De nieuwe raad is gekozen</h1>
<p class="thuis__intro">Op woensdag 18 november 2026 kozen Hilversum en de dorpen van Wijdemeren samen één raad van ${ZETELS} zetels.</p>
<div class="thuis${UITSLAGVIDEO_ID ? ' thuis--video' : ''}">
${UK.thuis()}
<div class="thuis__naast">
${UITSLAGVIDEO_ID ? `<figure class="thuis__video">
  ${ytSpeler(UITSLAGVIDEO_ID, 'Video: de uitslag van de gemeenteraadsverkiezing, partij voor partij')}
  <figcaption><b>De uitslag in beeld</b> ${e(UITSLAGVIDEO.tekst || '')}</figcaption>
</figure>` : ''}
<section class="thuis__meer" aria-labelledby="meer-kop">
  <h2 id="meer-kop">Wie komt samen aan ${Math.floor(ZETELS / 2) + 1} zetels?</h2>
  <div class="uk-mm__balk" aria-hidden="true"><div class="uk-mm__vakken">${Array.from({ length: ZETELS }, () => '<i></i>').join('')}</div><span class="uk-mm__grens" style="left:${((Math.floor(ZETELS / 2) + 1) / ZETELS) * 100}%"><span>${Math.floor(ZETELS / 2) + 1}</span></span></div>
  <p>Voor een meerderheid in de raad zijn ${Math.floor(ZETELS / 2) + 1} van de ${ZETELS} zetels nodig. Tik partijen aan en tel mee.</p>
  <p><a class="knop knop--licht" href="/uitslag/#meerderheid">Maak zelf een meerderheid</a></p>
</section>
<section class="roep" aria-labelledby="roep-kop">
  <h2 id="roep-kop">Welke partij staat het dichtst bij jou?</h2>
  <p>De stemwijzer blijft open. Kies zelf welke partijen en thema's meedoen en leg je antwoorden naast hun standpunten.</p>
  <p class="roep__knoppen"><a class="knop" href="/stemwijzer/">Start de stemwijzer</a> <a class="knop knop--licht" href="/partijen/">Bekijk de partijen</a></p>
</section>
</div>
</div>
</div>

<dl class="feiten">
  <div><dt>Nieuwe raad</dt><dd>${ZETELS} zetels</dd></div>
  <div><dt>Meerderheid</dt><dd>${Math.floor(ZETELS / 2) + 1} zetels</dd></div>
  <div><dt>In de raad</dt><dd>${metZetel} van de ${partijen.length} partijen</dd></div>
  <div><dt>Nieuwe gemeente</dt><dd>Vanaf 1 januari 2027</dd></div>
</dl>

${waaromBlok}
` : `${UK ? UK.voorpagina() : ''}
<section class="opening">
  <div class="opening__tekst">
    <h1>Twintig partijen. Tussen welke twijfel jij?</h1>
    <p>Kleur de partijen die je overweegt. De stemwijzer vraagt daarna alleen door op de punten waar juist die partijen van elkaar verschillen.</p>
    <p class="klein">Woensdag 18 november 2026 kiezen Hilversum, Loosdrecht, Kortenhoef, 's-Graveland, Ankeveen, Nederhorst den Berg en Breukeleveen samen één nieuwe gemeenteraad.</p>
  </div>
  ${biljet({ voet: `<div class="biljet__voet"><span data-telling class="grijs" role="status">Nog geen partij gekleurd</span><a class="knop" href="/stemwijzer/" data-start>Start de stemwijzer</a></div>` })}
</section>

<dl class="feiten">
  <div><dt>Verkiezingsdag</dt><dd>Woensdag 18 november</dd></div>
  <div><dt>Stembureaus open</dt><dd>7.30 tot 21.00 uur</dd></div>
  <div><dt>Te verdelen</dt><dd>39 raadszetels</dd></div>
  <div><dt>Op het biljet</dt><dd>${partijen.length} partijen</dd></div>
  <div><dt>In de stemwijzer</dt><dd>${stellingen.length} stellingen, ${themas.length} thema's</dd></div>
</dl>

${waaromBlok}
`;
schrijf('index.html', pagina({
  titel: NA ? 'Hilversum kiest – uitslag gemeenteraadsverkiezing 18 november 2026' : 'Hilversum kiest – stemwijzer gemeenteraadsverkiezing 18 november 2026',
  beschrijving: NA ? 'De uitslag van de gemeenteraadsverkiezing van 18 november 2026 in Hilversum en de dorpen van Wijdemeren: zetels per partij, het verschil met 2022 en zelf een meerderheid maken. Met de onafhankelijke stemwijzer erbij.' : 'Onafhankelijke stemwijzer voor de gemeenteraadsverkiezing in Hilversum en de dorpen van Wijdemeren. Kies zelf welke partijen en thema\'s meedoen.',
  pad: '/',
  ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Hilversum kiest', url: volledig('/'), inLanguage: 'nl-NL', description: 'Onafhankelijke stemwijzer en informatiesite voor de gemeenteraadsverkiezing van 18 november 2026 in de nieuwe gemeente Hilversum (Hilversum en Wijdemeren).', author: { '@type': 'Person', name: 'Paul Tondeur', url: 'https://www.paultondeur.com/' } }],
  inhoud: `${voorpaginaBoven}
<h2>${NA ? 'Zo werkt de stemwijzer' : 'Anders dan je gewend bent'}</h2>
<div class="tweekolom">
  <div class="blok"><h3>Jij kiest wie meedoet</h3><p>Weet je al dat een partij nooit jouw stem krijgt? Laat die weg. Het resultaat vergelijkt je alleen met de partijen die je zelf hebt gekleurd, ook als dat er maar twee zijn.</p></div>
  <div class="blok"><h3>Verdieping op jouw thema's</h3><p>Kies de onderwerpen die voor jou tellen. Per thema krijg je meerdere stellingen, zodat ook partijen die op hoofdlijnen hetzelfde willen uit elkaar gaan.</p></div>
  <div class="blok"><h3>Nuance in plaats van ja of nee</h3><p>Een partij die een voorstel afwijst omdat ze een eigen plan heeft, staat anders dan een partij die het doel verwerpt. Bij elk standpunt lees je de toelichting en het citaat uit het programma.</p></div>
</div>

<h2>Waarover gaat het</h2>
<ul class="themas" style="pointer-events:none">
  ${themas.map((t) => `<li><label style="grid-template-columns:1fr;cursor:default"><b>${e(t.naam)}</b><span class="oms">${e(t.omschrijving)}</span><span class="aantal grijs">${stellingen.filter((s) => s.thema === t.id).length} stellingen</span></label></li>`).join('\n  ')}
</ul>

<h2>Eén nieuwe gemeente</h2>
<div class="tweekolom">
  <div>
    <p>Op 1 januari 2027 gaat de gemeente Wijdemeren op in Hilversum. De nieuwe gemeente telt ongeveer 119.000 inwoners en heet Hilversum. ${NA ? 'Daarom was er op 18 november een aparte verkiezing: de gewone raadsverkiezingen van maart 2026 zijn in beide gemeenten overgeslagen.' : 'Daarom is er nu een aparte verkiezing: de gewone raadsverkiezingen van maart 2026 zijn in beide gemeenten overgeslagen.'}</p>
    <p>${NA ? 'De raad die nu gekozen is' : 'De raad die je nu kiest'}, zit tot de volgende gewone gemeenteraadsverkiezingen in maart 2030.</p>
    <p>${NA ? '<a href="/uitslag/">Bekijk de hele uitslag</a>' : '<a href="/stemmen/">Alles over stemmen, volmacht en stembureaus</a>'}</p>
  </div>
  <div>
    <p>Wil je eerst rondkijken? Elke partij heeft een eigen pagina met haar speerpunten, haar standpunt op elke stelling en de partijen die er inhoudelijk het dichtst bij zitten.</p>
    <p><a href="/partijen/">Bekijk de twintig partijen</a><br><a href="/vergelijken/">Leg twee partijen naast elkaar</a></p>
    <p>Er zijn ook andere stemhulpen voor deze verkiezing, elk met een eigen aanpak. <a href="/andere-stemhulpen/">Bekijk ze op een rij</a></p>
  </div>
</div>`,
  scripts: NA ? '' : `<script type="module" src="/assets/js/biljet.js"></script>`,
}));

// ---------- Stemwijzer ----------
schrijf('stemwijzer/index.html', pagina({
  titel: 'Stemwijzer Hilversum en Wijdemeren 2026 – Hilversum kiest',
  beschrijving: 'Kies de partijen die je overweegt en de thema\'s die je belangrijk vindt. De stemwijzer stelt de vragen waarop die partijen verschillen.',
  pad: '/stemwijzer/',
  beeld: 'stemwijzer',
  inhoud: `<div id="app"><noscript><p>De stemwijzer heeft JavaScript nodig. Zonder JavaScript kun je wel <a href="/partijen/">alle standpunten per partij</a> lezen.</p></noscript><p class="grijs">De stemwijzer wordt geladen.</p></div>`,
  scripts: `<script type="module" src="/assets/js/stemwijzer.js"></script>`,
}));

// ---------- Lijsten ----------
// Kandidaten: namen en volgorde van de officiële lijst; foto, beschrijving en LinkedIn alleen waar twee rondes ze
// los van elkaar bij deze persoon vonden (tools/maak_kandidaten.py).
const kandidaten = bestaat('data/kandidaten.json') ? lees('data/kandidaten.json') : {};
function kandidaatHtml(k, p) {
  const van = `<span class="sr"> van ${e(k.naam)}</span>`;
  const links = [k.linkedin ? `<a href="${e(k.linkedin)}" rel="noopener">LinkedIn${van}</a>` : '', k.bron ? `<a href="${e(k.bron)}" rel="noopener">bron${van}</a>` : ''].filter(Boolean).join('');
  return `<li class="kandidaat" id="kandidaat-${k.nr}"><span class="portret${k.foto ? '' : ` portret--${k.geslacht || 'x'}`}">${k.foto ? `<img src="/assets/kandidaten/${e(k.foto)}" alt="" width="132" height="132" loading="lazy">` : ''}</span><div><b><span class="knr">${k.nr}</span> ${e(k.naam)}</b><span class="grijs">${e(k.woonplaats)}</span>${UK && p ? UK.kandidaat(p, k.nr) : ''}${k.bio ? `<p>${e(k.bio)}</p>` : ''}${links ? `<span class="klinks">${links}</span>` : ''}</div></li>`;
}
function kandidatenHtml(p) {
  const rij = kandidaten[p.slug] || [];
  if (!rij.length) return '';
  return `
<h2 id="kandidaten">Kandidaten</h2>
<p>${rij.length === 1 ? 'Eén kandidaat' : `${rij.length} kandidaten`}, in de volgorde van het stembiljet.</p>
<ol class="kandidaten">${rij.map((k) => kandidaatHtml(k, p)).join('')}</ol>
<p class="klein">Namen, volgorde en woonplaats komen uit de bekendmaking van het centraal stembureau (<a href="https://zoek.officielebekendmakingen.nl/gmb-2026-499712.html" rel="noopener">Gemeenteblad 2026, nr. 499712</a>). Foto's en beschrijvingen komen van de partij zelf of van de gemeente; een LinkedIn-profiel staat er alleen bij als twee controles los van elkaar bij dezelfde persoon uitkwamen. Staat er niets bij een naam, dan is er niets gevonden dat zeker genoeg was. <a href="/verantwoording/#kandidaten">Hoe dit is nagelopen</a>.</p>`;
}


// Overeenkomst-matrix en kaart (klassieke MDS)
const D = slugs.map((a) => slugs.map((b) => (a === b ? 0 : partijAfstand(stellingen, a, b).afstand ?? 0.5)));
function mds(D) {
  const n = D.length;
  const sq = D.map((r) => r.map((v) => v * v));
  const rij = sq.map((r) => r.reduce((a, b) => a + b, 0) / n);
  const tot = rij.reduce((a, b) => a + b, 0) / n;
  let Bm = sq.map((r, i) => r.map((v, j) => -0.5 * (v - rij[i] - rij[j] + tot)));
  const assen = [];
  for (let k = 0; k < 2; k++) {
    let v = Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + k * 78.233) + 0.01 * i);
    let lam = 0;
    for (let it = 0; it < 500; it++) {
      const w = Bm.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
      lam = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      v = w.map((x) => x / lam);
    }
    assen.push(v.map((x) => x * Math.sqrt(lam)));
    Bm = Bm.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]));
  }
  return assen;
}
function kaartSvg() {
  if (stellingen.length < 5) return '';
  const [xs, ys] = mds(D);
  const W = 900, H = 520, m = 70;
  const sx = (v) => m + ((v - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1)) * (W - 2 * m);
  const sy = (v) => m / 2 + ((v - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) || 1)) * (H - m);
  // labels: schuif omhoog of omlaag als ze over elkaar vallen
  const geplaatst = [];
  const pt = partijen.map((p, i) => ({ p, x: sx(xs[i]), y: sy(ys[i]) })).sort((a, b) => a.y - b.y);
  // Een naam mag niet over een andere naam vallen en ook niet onder de stip van een andere lijst: eerst rechts of
  // links van de eigen stip, pas daarna een regel hoger of lager.
  for (const o of pt) {
    const breed = o.p.kort.length * 6.2 + 14;
    const vrij = (yy, x1, x2) => !geplaatst.some((g) => Math.abs(g.ly - yy) < 13 && x1 < g.x2 && x2 > g.x1)
      && !pt.some((q) => q !== o && q.x + 9 > x1 && q.x - 9 < x2 && q.y + 9 > yy - 10 && q.y - 9 < yy + 3);
    let plek = null;
    for (let stap = 0; stap <= 6 && !plek; stap++) {
      const ly = o.y + 4 + (stap % 2 ? 1 : -1) * Math.ceil(stap / 2) * 13;
      for (const links of [false, true]) {
        const x1 = links ? o.x - 12 - breed : o.x + 12, x2 = x1 + breed;
        if (!plek && vrij(ly, x1, x2)) plek = { ly, links, x1, x2 };
      }
    }
    plek ??= { ly: o.y + 4, links: false, x1: o.x + 12, x2: o.x + 12 + breed };
    Object.assign(o, { ly: plek.ly, links: plek.links });
    geplaatst.push({ ly: plek.ly, x1: plek.x1, x2: plek.x2 });
  }
  return `<div class="landschap"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Kaart van de twintig partijen: partijen die dicht bij elkaar staan, hebben vergelijkbare standpunten">
  ${pt.map((o) => `<a href="/partijen/${o.p.slug}/" data-slug="${o.p.slug}"><circle class="tikvlak" cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="17"/><circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="8" fill="${o.p.kleur}" stroke="#0e1b2c" stroke-width="1.5"/><text x="${(o.links ? o.x - 12 : o.x + 12).toFixed(1)}" y="${o.ly.toFixed(1)}"${o.links ? ' text-anchor="end"' : ''}>${e(o.p.kort)}</text></a>`).join('\n  ')}
  </svg></div>
<p class="klein alleen-smal">Schuif de kaart opzij om alle partijen te zien.</p>`;
}
const pct = (afst) => (afst === null ? '–' : Math.round((1 - afst) * 100));
const lum = (rgb) => { const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
function heat(v) {
  if (v === null) return '';
  const t = Math.max(0, Math.min(1, (v - 35) / 55));
  // Een tussenkleur waarop wit noch inkt goed leesbaar is, schuift door naar de eerste tint waarop wit dat wel is.
  let a = t * 0.85;
  const vlak = (x) => [29, 79, 145].map((c) => Math.round(255 * (1 - x) + c * x));
  const inkt = [14, 27, 44], wit = [255, 255, 255];
  while (a < 0.85 && contrast(vlak(a), inkt) < 4.5 && contrast(vlak(a), wit) < 4.5) a += 0.01;
  return `background:rgb(${vlak(a).join(',')});color:${contrast(vlak(a), wit) >= 4.5 ? '#fff' : '#0e1b2c'}`;
}

schrijf('partijen/index.html', pagina({
  titel: 'De twintig partijen en hun kandidaten – Hilversum kiest',
  beschrijving: 'De twintig partijen voor de gemeenteraadsverkiezing van 18 november in Hilversum, met lijsttrekker, alle kandidaten, speerpunten en standpunten.',
  pad: '/partijen/',
  beeld: 'partijen',
  inhoud: `
<h1>De twintig partijen</h1>
<p>In de volgorde van het stembiljet. Elke partij heeft een eigen pagina met speerpunten, standpunten per thema en de partijen die er het dichtst bij staan.</p>
<ul class="lijstkaarten">
${partijen.map((p) => {
    const rij = kandidaten[p.slug] || [];
    return `<li><a class="lijstkaart__kop" href="/partijen/${p.slug}/">${logoHtml(p, { versiering: true })}<span class="lijstkaart__naam"><span class="grijs">Lijst ${p.nr}</span><b>${e(p.naam)}</b><span class="grijs">Lijsttrekker ${e(p.lijsttrekker)}</span></span></a>
  <ul class="gezichten" aria-label="Kandidaten van ${e(p.kort)}">${rij.map((k) => `<li><a href="/partijen/${p.slug}/#kandidaat-${k.nr}" title="${k.nr}. ${e(k.naam)}" aria-label="${k.nr}. ${e(k.naam)}"${k.foto ? '' : ` class="leeg portret--${k.geslacht || 'x'}"`}>${k.foto ? `<img src="/assets/kandidaten/${e(k.foto.replace('.jpg', '-k.jpg'))}" alt="" width="40" height="40" loading="lazy">` : ''}</a></li>`).join('')}</ul></li>`;
  }).join('\n')}
</ul>
<p class="klein">Elk rondje is een kandidaat, in de volgorde van het stembiljet; een getekend figuurtje betekent dat er geen foto is gevonden die zeker bij die persoon hoort. Tik op een rondje voor de kandidaat.</p>
<p><a class="knop knop--licht" href="/vergelijken/">Vergelijk partijen met elkaar</a></p>`,
}));

function landschapHtml() {
  return `<h2 id="landschap">Wie staat dicht bij wie</h2>
<p>Deze kaart is berekend uit de standpunten op alle ${stellingen.length} stellingen. Partijen die dicht bij elkaar staan, kiezen vaak hetzelfde. De assen hebben geen vaste betekenis zoals links en rechts: de kaart laat alleen afstanden zien, en plat op een scherm klopt dat nooit helemaal.</p>
<p><strong>Tik op twee tot zes partijen in de kaart</strong> om ze hieronder naast elkaar te leggen. Daarna kun je met precies die partijen de stemwijzer doen.</p>
${kaartSvg()}
<details class="uitleg"><summary>Overeenkomst tussen alle partijen in procenten</summary>
<p class="klein">100 betekent: op elke stelling waar beide partijen een standpunt hebben precies dezelfde positie. Partijen met weinig bekende standpunten zijn minder betrouwbaar te vergelijken.</p>
<div class="tabel-wrap" tabindex="0" role="region" aria-label="Overeenkomst tussen alle partijen"><table>
<thead><tr><td></td>${partijen.map((p) => `<th class="num" scope="col" title="${e(p.kort)}">${p.nr}<span class="sr"> ${e(p.kort)}</span></th>`).join('')}</tr></thead>
<tbody>
${partijen.map((p, i) => `<tr><th scope="row"><a href="/partijen/${p.slug}/">${p.nr}. ${e(p.kort)}</a></th>${partijen.map((q, j) => (i === j ? '<td class="heat">·</td>' : `<td class="heat" style="${heat(pct(D[i][j]))}">${pct(D[i][j])}</td>`)).join('')}</tr>`).join('\n')}
</tbody></table></div></details>`;
}

function standpuntHtml(st, slug, { metNaam = false } = {}) {
  const pos = st.posities[slug] || { s: null };
  const p = P[slug];
  const bron = pos.bron ? `<cite>${e(SOORT[pos.soort] || '')}${pos.soort && pos.bron ? ': ' : ''}${e(pos.bron)}</cite>` : pos.soort ? `<cite>${e(SOORT[pos.soort])}</cite>` : '';
  return `<div class="standpunt" style="border-left-color:${p.kleur}">
  <h4 class="standpunt__kop">${metNaam ? e(p.kort) + ' ' : ''}<span class="pos" data-s="${pos.s ?? 'null'}">${POS[pos.s ?? null]}</span>${pos.kern ? ` <span>${e(pos.kern)}</span>` : ''}</h4>
  ${pos.toelichting ? `<p>${e(pos.toelichting)}</p>` : pos.s === null || pos.s === undefined ? '<p class="grijs">In het programma en de andere bronnen is hierover geen duidelijk standpunt gevonden.</p>' : ''}
  ${pos.citaat ? `<blockquote>“${e(pos.citaat)}”</blockquote>` : ''}
  ${bron}
</div>`;
}

for (const p of partijen) {
  const buren = slugs.filter((s) => s !== p.slug).map((s) => ({ s, ...partijAfstand(stellingen, p.slug, s) })).filter((b) => b.afstand !== null && b.n >= 8).sort((a, b) => a.afstand - b.afstand);
  const dicht = buren.slice(0, 4);
  const ver = buren.slice(-3).reverse();
  const bekend = stellingen.filter((s) => positie(s, p.slug) !== null).length;
  const verschil = (ander) => stellingen
    .map((st) => ({ st, a: positie(st, p.slug), b: positie(st, ander) }))
    .filter((x) => x.a !== null && x.b !== null && Math.abs(x.a - x.b) >= 2)
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b)).slice(0, 4);
  schrijf(`partijen/${p.slug}/index.html`, pagina({
    titel: `${p.naam} – lijst ${p.nr} – Hilversum kiest`,
    beschrijving: `${p.naam}, lijst ${p.nr}, lijsttrekker ${p.lijsttrekker}: speerpunten, standpunten${(kandidaten[p.slug] || []).length > 1 ? ` en alle ${(kandidaten[p.slug] || []).length} kandidaten` : ''}. Gemeenteraadsverkiezing Hilversum, 18 november.`,
    pad: '/partijen/',
    url: `/partijen/${p.slug}/`,
    beeld: `partij-${p.slug}`,
    beeldAlt: `${logos[p.slug]?.bestand ? `Logo van ${p.naam}. ` : ''}${p.naam}, lijst ${p.nr}, lijsttrekker ${p.lijsttrekker}. ${OP_BEELD}.`,
    ld: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Partijen', item: volledig('/partijen/') },
      { '@type': 'ListItem', position: 2, name: p.naam, item: volledig(`/partijen/${p.slug}/`) },
    ] }],
    inhoud: `
<div class="partijkop partijkop--video">
  <div class="partijkop__tekst">
  ${logos[p.slug]?.bestand ? logoHtml(p) : ''}
  <span class="lijstnr">${stip(p)} Lijst ${p.nr}</span>
  <h1>${e(p.naam)}</h1>
  <span class="grijs">Lijsttrekker ${e(p.lijsttrekker)}${p.website ? ` · <a href="${e(p.website)}" rel="noopener">website</a>` : ''}${p.programma.url ? ` · <a href="${e(p.programma.url)}" rel="noopener">verkiezingsprogramma${p.programma.paginas ? ` (${p.programma.paginas} pagina's)` : ''}</a>` : ''}</span>
  </div>
  ${p.kernboodschap ? `<p class="partijkop__kern">${e(p.kernboodschap)}</p>` : ''}
  <figure class="partijkop__video" id="video">
  ${PARTIJVIDEOS.videos[p.slug] ? `<iframe class="video__beeld" src="https://www.youtube-nocookie.com/embed/${e(PARTIJVIDEOS.videos[p.slug])}?rel=0" title="Video over ${e(p.naam)}, lijst ${p.nr}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : `<div class="video__beeld video__beeld--leeg"><span>De video van deze ${p.slug === 'blanco-van-oostveen' ? 'lijst' : 'partij'} volgt binnenkort</span></div>`}
  </figure>
</div>${UK ? `\n${UK.partij(p)}` : ''}
<nav class="inpagina-balk" aria-label="Op deze pagina"><ul class="inpagina">${(kandidaten[p.slug] || []).length ? '<li><a href="#kandidaten">Kandidaten</a></li>' : ''}<li><a href="#buren">Dicht bij en ver van</a></li>${themas.map((t) => `<li><a href="#${t.id}">${e(t.kort)}</a></li>`).join('')}</ul></nav>
<div class="smal">
${p.speerpunten.length ? `<h2>Wat de partij zelf vooropzet</h2><ul>${p.speerpunten.map((s) => `<li>${e(s)}</li>`).join('')}</ul>` : ''}
${p.basis ? `<div class="melding"><p>${e(p.basis)}</p></div>` : ''}
</div>
${kandidatenHtml(p)}

<h2 id="buren">Dicht bij en ver van</h2>
<p>Berekend uit de standpunten op de stellingen waar beide partijen een positie hebben. Van ${e(p.kort)} zijn ${bekend} van de ${stellingen.length} standpunten bekend.</p>
<div class="buren">
  <div><h3>Het dichtst bij</h3><ol>${dicht.map((b) => `<li><span>${lijstLink(P[b.s])}</span><b>${pct(b.afstand)}%</b><span class="balk"><i style="width:${pct(b.afstand)}%"></i></span></li>`).join('')}</ol></div>
  <div><h3>Het verst van</h3><ol>${ver.map((b) => `<li><span>${lijstLink(P[b.s])}</span><b>${pct(b.afstand)}%</b><span class="balk"><i style="width:${pct(b.afstand)}%"></i></span></li>`).join('')}</ol></div>
</div>
${dicht.slice(0, 3).map((b) => {
    const v = verschil(b.s);
    if (!v.length) return '';
    return `<h3>Waar ${e(p.kort)} en ${e(P[b.s].kort)} toch uit elkaar gaan</h3><ul class="punten">${v.map((x) => `<li><details><summary><span class="st">${e(x.st.stelling)}</span><span class="sub">${e(p.kort)}: ${POS[x.a].toLowerCase()} · ${e(P[b.s].kort)}: ${POS[x.b].toLowerCase()}</span></summary><div class="inhoud">${standpuntHtml(x.st, p.slug, { metNaam: true })}${standpuntHtml(x.st, b.s, { metNaam: true })}</div></details></li>`).join('')}</ul><p class="klein"><a href="/vergelijken/?a=${p.slug}&amp;b=${b.s}">Volledige vergelijking van deze twee partijen</a></p>`;
  }).join('')}

<h2>Standpunten per thema</h2>
${themaSprite(themas.map((t) => t.id))}
<ul class="themawijzer">${themas.filter((t) => stellingen.some((s) => s.thema === t.id)).map((t) => `<li><a href="#${t.id}">${themaBeeld(t.id)}<span>${e(t.kort)}</span></a></li>`).join('')}</ul>
${themas.map((t) => {
    const ss = stellingen.filter((s) => s.thema === t.id);
    if (!ss.length) return '';
    return `<section class="thema" id="${t.id}" aria-labelledby="${t.id}-kop"><div class="thema__kop"><span class="thema__beeld">${themaBeeld(t.id)}</span><div class="thema__tekst"><h3 id="${t.id}-kop">${e(t.naam)}</h3><p>${e(t.omschrijving)}</p></div></div><ul class="punten">${ss.map((st) => {
      const pos = st.posities[p.slug] || { s: null };
      return `<li><details><summary><span class="st">${e(st.stelling)}</span><span class="sub"><span class="pos" data-s="${pos.s ?? 'null'}">${POS[pos.s ?? null]}</span>${pos.kern ? ' ' + e(pos.kern) : ''}</span></summary><div class="inhoud">${st.uitleg ? `<p class="grijs">${e(st.uitleg)}</p>` : ''}${standpuntHtml(st, p.slug)}</div></details></li>`;
    }).join('')}</ul></section>`;
  }).join('')}
<p style="margin-top:2.5rem"><a class="knop" href="/stemwijzer/">Doe de stemwijzer</a></p>`,
    scripts: `<script>(function(){function toon(){var el=/^#kandidaat-\\d+$/.test(location.hash)&&document.querySelector(location.hash);if(!el)return;el.scrollIntoView({block:'center'});}addEventListener('hashchange',toon);toon();})();</script>`,
  }));
}

// ---------- Vergelijken ----------
schrijf('vergelijken/index.html', pagina({
  titel: 'Partijen vergelijken – Hilversum kiest',
  beschrijving: 'Leg twee tot zes partijen naast elkaar, zie op welke stellingen ze verschillen en doe met die partijen de stemwijzer.',
  pad: '/vergelijken/',
  beeld: 'vergelijken',
  inhoud: `<h1>Partijen vergelijken</h1>
<p>Kies twee tot zes partijen, in de kaart of in de keuzelijsten eronder. Je ziet eerst de stellingen waarop ze het verst uit elkaar staan, en je kunt met die partijen meteen de stemwijzer doen.</p>
${landschapHtml()}
<h2 id="naast-elkaar">Naast elkaar</h2>
<div id="vergelijk"><noscript><p>Vergelijken heeft JavaScript nodig.</p></noscript></div>`,
  scripts: `<script type="module" src="/assets/js/vergelijk.js"></script>`,
}));

// ---------- Stemmen ----------
const tekst = (x) => (typeof x === 'string' ? x : x?.tekst ?? Object.values(x || {}).find((v) => typeof v === 'string') ?? '');
const lijst = (arr) => `<ul>${(arr || []).map((x) => `<li>${e(tekst(x))}</li>`).join('')}</ul>`;
const plaatsen = [...new Set(bureaus.map((b) => b.plaats))];
const uur = (t) => t.replace(/^0/, '').replace(':', '.');
schrijf('stemmen/index.html', pagina({
  titel: 'Stemmen op 18 november – Hilversum kiest',
  beschrijving: 'Wie mag stemmen, wat neem je mee, hoe werkt een volmacht en waar zijn de stembureaus in Hilversum en de dorpen.',
  pad: '/stemmen/',
  beeld: 'stemmen',
  // De verkiezingsdag als gebeurtenis: de gemeente Hilversum organiseert de verkiezing (bronnen/_verkiezing/info.json).
  ld: [{ '@context': 'https://schema.org', '@type': 'Event', name: 'Gemeenteraadsverkiezing Hilversum 2026',
    description: 'Verkiezing van de gemeenteraad van de nieuwe gemeente Hilversum, waarin Wijdemeren op 1 januari 2027 opgaat. De meeste stembureaus zijn open van 7.30 tot 21.00 uur.',
    startDate: '2026-11-18T07:30:00+01:00', endDate: '2026-11-18T21:00:00+01:00',
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', isAccessibleForFree: true,
    location: { '@type': 'Place', name: `${bureaus.length} stembureaus in de gemeenten Hilversum en Wijdemeren`, address: { '@type': 'PostalAddress', addressRegion: 'Noord-Holland', addressCountry: 'NL' } },
    organizer: { '@type': 'GovernmentOrganization', name: 'Gemeente Hilversum', url: 'https://hilversum.nl/gemeenteraadsverkiezing-2026' },
    image: volledig('/assets/deel/stemmen.png'), url: volledig('/stemmen/') }],
  inhoud: `
<h1>Stemmen op woensdag 18 november</h1>
<p style="font-size:1.2rem;max-width:44ch">Neem je stempas en een identiteitsbewijs mee. Je mag stemmen in elk stembureau van Hilversum en Wijdemeren, tussen 7.30 en 21.00 uur.</p>
<nav class="inpagina-balk" aria-label="Op deze pagina"><ul class="inpagina"><li><a href="#mag-ik">Mag ik stemmen</a></li><li><a href="#meenemen">Wat neem ik mee</a></li><li><a href="#volmacht">Volmacht</a></li><li><a href="#stempas-kwijt">Stempas kwijt</a></li><li><a href="#stembureaus">Stembureaus</a></li><li><a href="#hulp">Hulp en toegankelijkheid</a></li><li><a href="#data">Data</a></li><li><a href="#fusie">De fusie</a></li></ul></nav>

<div class="tweekolom">
<section class="blok" id="mag-ik"><h2 class="blok__kop">Mag ik stemmen</h2>${lijst((info.wie_mag_stemmen || []).slice(0, 4))}</section>
<section class="blok" id="meenemen"><h2 class="blok__kop">Wat neem ik mee</h2>${lijst(info.wat_neem_je_mee)}</section>
<section class="blok" id="volmacht"><h2 class="blok__kop">Iemand anders laten stemmen</h2>${lijst(info.volmacht)}</section>
<section class="blok" id="stempas-kwijt"><h2 class="blok__kop">Stempas kwijt of niet gekregen</h2>${lijst(info.vervangende_stempas)}</section>
</div>

<h2 id="stembureaus">Stembureaus</h2>
<p>${bureaus.length} locaties. Je bent niet gebonden aan het stembureau op je stempas: je mag stemmen in elk stembureau van de gemeente.</p>
<p><a class="knop" href="${VINDER}">Open de Stembureauvinder</a></p>


<h2 id="hulp">Hulp en toegankelijkheid</h2>
<div class="smal">${lijst(info.toegankelijkheid_en_hulp)}</div>

<h2 id="data">Belangrijke data</h2>
<ol class="tijdlijn">
${[
    ['2026-11-17', 'Dinsdag 17 november', 'Tot 12.00 uur kun je op afspraak aan de balie nog een vervangende stempas of schriftelijke volmacht regelen.'],
    ['2026-11-18', 'Woensdag 18 november', 'Verkiezingsdag. Stembureaus open van 7.30 tot 21.00 uur. Daarna worden de stemmen per lijst geteld.'],
    ['2026-11-19', 'Donderdag 19 november', 'De stemmen worden per kandidaat geteld in Sporthal De Fuik in Kortenhoef.'],
    ['2026-11-26', 'Donderdag 26 november', 'Het centraal stembureau stelt om 10.00 uur in het Raadhuis de definitieve uitslag vast.'],
    ['2026-12-16', 'Woensdag 16 december', 'Toelating van de nieuwe raadsleden en afscheid van de oude raad.'],
    ['2027-01-01', 'Vrijdag 1 januari 2027', 'Wijdemeren gaat op in de gemeente Hilversum.'],
    ['2027-01-04', 'Maandag 4 januari 2027', 'Beëdiging van de raadsleden; de nieuwe raad begint.'],
  ].map(([d, l, t]) => `<li><time datetime="${d}">${l}</time><span>${t}</span></li>`).join('\n')}
</ol>

<h2 id="fusie">Waarom nu een verkiezing</h2>
<div class="smal">
${lijst(info.achtergrond_fusie)}
<h3>De nieuwe raad</h3>
<ul>${['zetels', 'zittingsduur', 'inwonertal', 'kernen'].map((k) => (raad[k] ? `<li>${e(tekst(raad[k]))}</li>` : '')).join('')}</ul>
<h3>Hoe de raden er nu uitzien</h3>
<ul>
<li>Hilversum (37 zetels), uitslag 2022: ${e(tekst(info.huidige_raden?.hilversum_2022?.uitslag_maart_2022).replace(/ \(totaal.*$/, ''))}. Sindsdien zijn enkele raadsleden als eigen fractie verdergegaan.</li>
<li>Wijdemeren (19 zetels), uitslag 2022: ${e(tekst(info.huidige_raden?.wijdemeren_2022?.uitslag_maart_2022).replace(/ \(totaal.*$/, ''))}.</li>
</ul>
<p class="klein">Bronnen: hilversum.nl, wijdemeren.nl, Gemeenteblad, Rijksoverheid en NH Nieuws. Peildatum 15 november 2026.</p>
</div>`,
}));

// ---------- Stembureauvinder ----------
schrijf('stembureauvinder/index.html', pagina({
  titel: 'Stembureauvinder – Hilversum kiest',
  beschrijving: 'Alle stembureaus van Hilversum en de dorpen op een 3D-kaart, met adres en openingstijd. Woensdag 18 november van 7.30 tot 21.00 uur.',
  pad: VINDER,
  beeld: 'stembureauvinder',
  inhoud: `
<h1>Stembureauvinder</h1>
<p style="font-size:1.2rem;max-width:52ch">Woensdag 18 november, van 7.30 tot 21.00 uur. Neem je stempas en een identiteitsbewijs mee.</p>
<p>${bureaus.length} locaties. Je bent niet gebonden aan het stembureau op je stempas. Elk rood gebouw op de kaart is een stembureau: tik erop voor het adres en de openingstijd. Onder de kaart staan dezelfde stembureaus als lijst, met een zoekveld.</p>
<p><a class="sr sr--focus" href="#alle-stembureaus">Sla de kaart over, naar de lijst met alle stembureaus</a></p>
<div class="kaartvak kaartvak--groot" id="kaartvak">
  <canvas class="kaart3d" tabindex="0" role="img" aria-label="3D-kaart van de gemeente met alle stembureaus. Schuif met de pijltjestoetsen, zoom met plus en min. De lijst onder de kaart bevat dezelfde stembureaus, met adres en openingstijd."></canvas>
  <canvas class="kaartlabels" aria-hidden="true"></canvas>
  <div class="wissel" role="group" aria-label="Weergave van de kaart">
    <button type="button" data-weergave="3d" aria-pressed="true">3D</button><button type="button" data-weergave="plat" aria-pressed="false">Plat</button>
  </div>
  <div class="kaartknoppen">
    <button type="button" data-kaart="in" aria-label="Inzoomen"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>
    <button type="button" data-kaart="uit" aria-label="Uitzoomen"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12"/></svg></button>
    <button type="button" data-kaart="draai" aria-label="Draai de kaart een kwartslag"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 10a5.5 5.5 0 1 1-1.7-4"/><path d="M14.5 2.5v4h-4"/></svg></button>
    <button type="button" data-kaart="thuis" aria-label="Toon de hele gemeente"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5"/></svg></button>
    <button type="button" data-kaart="hier" aria-label="Toon waar ik ben"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="4.5"/><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3"/></svg></button>
  </div>
  <div class="kaartkaartje" id="kaartkaartje" role="region" aria-label="Gekozen stembureau" aria-live="polite" tabindex="-1" hidden></div>
  <p class="kaartmelding" id="kaartmelding" role="status" hidden></p>
  <p class="kaartlaadt" hidden>Kaart laden</p>
</div>
<p class="klein">Gebouwen: <a href="https://3dbag.nl" rel="noopener">3D BAG</a> (TU Delft en 3DGI, CC BY 4.0). Ondergrond: © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a>-bijdragers. Trein, zeilboot en hert: <a href="https://quaternius.com" rel="noopener">Quaternius</a> (CC0); eend: Poly by Google (CC BY 3.0). De kaart staat op deze site zelf: er wordt niets bij anderen opgehaald.</p>
<h2 id="alle-stembureaus" tabindex="-1">Alle stembureaus</h2>
<div class="zoek">
  <input type="search" id="zoek" placeholder="Zoek op naam, straat of plaats" aria-label="Zoek een stembureau op naam, straat of plaats">
  <select id="plaats" aria-label="Plaats"><option value="">Alle plaatsen</option>${plaatsen.map((p) => `<option>${e(p)}</option>`).join('')}</select>
</div>
<p class="sr" id="aantal" role="status"></p>
<ul class="bureaus" id="bureaus">
${bureaus.map((b, nr) => `<li data-nr="${nr}" data-plaats="${e(b.plaats)}" data-zoek="${e((b.naam + ' ' + b.adres + ' ' + b.plaats).toLowerCase())}"${b.lat ? ` data-lat="${b.lat}" data-lon="${b.lon}"` : ''}><b>${e(b.naam)}</b><span>${e(b.adres)}, ${e(b.plaats)}</span><span${b.afwijkend ? ' class="afw"' : ''}>${uur(b.open)} tot ${uur(b.dicht)} uur${b.afwijkend ? ' (afwijkend)' : ''}</span>${b.bijzonder ? `<span>${e(b.bijzonder[0].toUpperCase() + b.bijzonder.slice(1))}</span>` : ''}${b.lat ? `<button class="opkaart" type="button">Toon op de kaart<span class="sr">: ${e(b.naam)}</span></button>` : ''}</li>`).join('\n')}
</ul>

<p class="klein">Bron: Gemeenteblad 2026, nr. 514668 (4 november 2026). Kijk bij twijfel op <a href="https://hilversum.nl/gemeenteraadsverkiezing-2026" rel="noopener">hilversum.nl</a>.</p>
<p><a href="/stemmen/">Wie mag stemmen, volmacht en stempas kwijt</a></p>`,
  scripts: `<script type="module" src="/assets/js/stembureaus.js"></script>`,
}));

// ---------- Verantwoording ----------
const dekking = partijen.map((p) => ({ p, n: stellingen.filter((s) => positie(s, p.slug) !== null).length }));
const soortTel = {};
for (const st of stellingen) for (const s of slugs) { const x = st.posities[s]; if (x && x.s !== null && x.s !== undefined) soortTel[x.soort || 'onbekend'] = (soortTel[x.soort || 'onbekend'] || 0) + 1; }
const cs = bestaat('werk/codering/statistiek.json') ? lees('werk/codering/statistiek.json') : null;
const redactie = bestaat('data/redactie.json') ? lees('data/redactie.json') : {};
const basisAlle = bestaat('data/stellingen-basis.json') ? lees('data/stellingen-basis.json') : [];
const geschrapt = basisAlle.filter((b) => redactie[b.id]?.schrap);
const proc = (n, t) => Math.round((n / t) * 100);
const bekendTotaal = Object.values(soortTel).reduce((a, b) => a + b, 0);
const citaten = stellingen.reduce((n, st) => n + slugs.filter((s) => st.posities[s]?.citaat).length, 0);
const coderingZin = cs ? `Van de ${cs.totaal.toLocaleString('nl-NL')} posities (${basisAlle.length} stellingen maal ${partijen.length} partijen) kwamen de twee rondes in ${proc(cs.gelijk + cs.beideNull, cs.totaal)}% precies overeen en lagen ze in ${proc(cs.eenStap, cs.totaal)}% één stap uit elkaar. In ${proc(cs.conflict, cs.totaal)}% stonden ze tegenover elkaar, en in ${proc(cs.alleenA + cs.alleenB, cs.totaal)}% zag maar één van de twee een standpunt. Die laatste twee groepen, samen ${cs.beslecht} posities, zijn in de derde ronde opnieuw aan de bron getoetst; in ruim een derde van die gevallen was de uitkomst “geen standpunt”. Daarna is per stelling over alle partijen heen gecontroleerd of dezelfde maat is aangelegd en of de richting klopt bij omgekeerd geformuleerde stellingen. Dat leidde tot ${cs.audit.score} aangepaste scores, ${cs.audit.vervallen} posities die vervielen omdat het bewijs te dun was, en ${cs.audit.tekst} herschreven toelichtingen.` : '';
const verantwoordingExtra = (bestaat('data/verantwoording.html') ? fs.readFileSync(path.join(ROOT, 'data/verantwoording.html'), 'utf8') : '')
  .replace('STELLINGEN_AANTAL', stellingen.length)
  .replace('CODERING_CIJFERS', coderingZin)
  .replace('BRON_CIJFERS', `<p>Van de ${bekendTotaal.toLocaleString('nl-NL')} bekende standpunten komen er ${soortTel.programma || 0} rechtstreeks uit een verkiezingsprogramma, ${(soortTel.mijnstem || 0) + (soortTel.stemgids || 0) + (soortTel.hilversumsnieuws || 0)} uit een eigen antwoord van de partij in een andere stemhulp of in Hilversums Nieuws, ${soortTel.stemgedrag || 0} uit stemgedrag in de raad en ${soortTel.afgeleid || 0} zijn afgeleid. Bij ${citaten.toLocaleString('nl-NL')} standpunten staat een letterlijk citaat; elk citaat is door een script teruggezocht in de brontekst. Paginanummers verwijzen naar de pagina van het pdf-bestand, die soms één of twee afwijkt van het gedrukte nummer.</p>`)
  .replace('GESCHRAPT_LIJST', geschrapt.length ? `<p>De bank begon met ${basisAlle.length} stellingen. ${geschrapt.length} zijn na het bepalen van de posities geschrapt:</p><ul>${geschrapt.map((g) => `<li>“${e(g.stelling)}” ${e(redactie[g.id].reden ? '(' + redactie[g.id].reden + ')' : '')}</li>`).join('')}</ul>` : '');
schrijf('verantwoording/index.html', pagina({
  titel: 'Verantwoording – Hilversum kiest',
  beschrijving: 'Hoe de stellingen en standpunten van Hilversum kiest tot stand zijn gekomen, hoe de uitslag wordt berekend en hoe de eerlijkheid is getoetst.',
  pad: '/verantwoording/',
  wijzer: true,
  beeld: 'verantwoording',
  inhoud: `
<h1>Verantwoording</h1>
<div class="smal">
${verantwoordingExtra}
<h2 id="dekking">Hoeveel standpunten per partij bekend zijn</h2>
<p>Niet elk programma zegt iets over elke stelling. Waar geen standpunt te vinden was, staat “geen standpunt gevonden” en telt de stelling voor die partij niet mee in de uitslag.</p>
</div>
<div class="tabel-wrap" tabindex="0" role="region" aria-label="Standpunten bekend per partij"><table><thead><tr><th>Partij</th><th class="num">Standpunten bekend</th><th class="num">Van</th><th>Programma</th></tr></thead><tbody>
${dekking.map(({ p, n }) => `<tr><td><a href="/partijen/${p.slug}/">${p.nr}. ${e(p.naam)}</a></td><td class="num">${n}</td><td class="num">${stellingen.length}</td><td>${p.programma.url ? `<a href="${e(p.programma.url)}" rel="noopener">${e(p.programma.titel || 'programma')}</a>${p.programma.woorden ? `, ${Math.round(p.programma.woorden / 100) * 100} woorden` : ''}` : 'Geen programma gevonden'}</td></tr>`).join('\n')}
</tbody></table></div>
${toets ? toets.html : ''}`,
}));

// ---------- Zelf maken ----------
const repoBlok = REPO ? `Er bestaat een uitgewerkt voorbeeld voor Hilversum, met alle code open: ${REPO}
Haal die repository eerst op en lees haar, en bouw daarop voort in plaats van opnieuw te beginnen:
- README.md: hoe alles in elkaar zit en in welke volgorde het gebouwd wordt;
- werk/briefs/: de letterlijke opdrachten aan de hulpagenten (programma uitlezen, stellingen, de vier rondes, feitencheck, kandidaten en de controle daarop);
- src/engine.mjs en tools/toets.mjs: de rekenkern en de eerlijkheidstoets;
- tools/voeg_samen.mjs, tools/maak_kandidaten.py: het samenvoegen van de rondes en de controles op kandidaten;
- tools/kaart/ en src/assets/js/kaart3d.js: de gegevens en de 3D-kaart van de stembureauvinder;
- build.mjs en src/: de site zelf;
Hergebruik de code, de opdrachten en de werkwijze. Neem geen stellingen, posities, kandidaatgegevens of teksten over: die gelden alleen voor die ene verkiezing en moeten voor mijn verkiezing opnieuw uit de bronnen komen.

` : '';
const promptTekst = (bestaat('data/prompt.md') ? fs.readFileSync(path.join(ROOT, 'data/prompt.md'), 'utf8') : '').replace('REPO_BLOK\n', repoBlok);
schrijf('zelf-maken/index.html', pagina({
  titel: 'Zelf zo\'n stemwijzer maken – Hilversum kiest',
  beschrijving: 'De opdracht waarmee je met een AI-assistent zelf een stemwijzer als deze maakt, voor je eigen gemeente of verkiezing.',
  pad: '/zelf-maken/',
  beeld: 'zelf-maken',
  inhoud: `
<h1>Maak je eigen versie</h1>
<div class="smal">
<p style="font-size:1.2rem;line-height:1.5">Deze stemwijzer is in één dag gebouwd door één inwoner met een AI-assistent. Dat kan voor elke gemeente en elke verkiezing. Hieronder staat de opdracht die de hele werkwijze beschrijft.</p>
<p>Plak de tekst in een AI-assistent die zelfstandig kan zoeken, bestanden kan schrijven en programma's kan draaien, zoals Claude Code. Vul bovenaan je eigen verkiezing in. Reken op enkele uren rekentijd en lees het resultaat kritisch na: de assistent maakt fouten, en jij bent verantwoordelijk voor wat je publiceert.</p>
${REPO ? `<p>Alles wat hiervoor gemaakt is, staat openbaar op GitHub: de code van de site, de opdrachten die de AI-agents kregen, de rekenkern en de eerlijkheidstoets. De opdracht hieronder verwijst ernaar, zodat je assistent het als voorbeeld kan gebruiken. <a href="${e(REPO)}" rel="noopener">Bekijk de repository</a>.</p>` : ''}
<p><button class="knop" type="button" id="kopieer">Kopieer de opdracht</button></p>
</div>
<pre class="prompt" id="prompt" tabindex="0">${e(promptTekst)}</pre>
<div class="smal">
<h2>Drie adviezen uit de praktijk</h2>
<ul>
<li>Laat elk citaat door een script controleren tegen de brontekst. Het is de goedkoopste manier om verzinsels te vangen.</li>
<li>Bekijk de uitkomsten van de eerlijkheidstoets zelf. Als één partij opvallend vaak wint bij willekeurige antwoorden, klopt er iets niet in de stellingen of de rekenwijze.</li>
<li>Zet op de site hoe het gemaakt is en wat het niet kan. <a href="/verantwoording/">Zo hebben wij dat gedaan</a>.</li>
</ul>
</div>`,
  scripts: `<script>document.getElementById('kopieer').onclick=async(ev)=>{const t=document.getElementById('prompt').textContent;try{await navigator.clipboard.writeText(t);ev.target.textContent='Gekopieerd';window.meet('Opdracht gekopieerd');}catch{const r=document.createRange();r.selectNodeContents(document.getElementById('prompt'));const s=getSelection();s.removeAllRanges();s.addRange(r);ev.target.textContent='Geselecteerd: kopieer met Ctrl+C';}};</script>`,
}));

// ---------- Andere stemhulpen ----------
// De lijst staat in data/stemhulpen.json: de officiële stemhulp van de gemeenten eerst, de rest op alfabet.
const ANDERE = '/andere-stemhulpen/';
const stemhulpData = bestaat('data/stemhulpen.json') ? lees('data/stemhulpen.json') : { stemhulpen: [] };
const stemhulpen = [...stemhulpData.stemhulpen].sort((a, b) => (b.officieel ? 1 : 0) - (a.officieel ? 1 : 0) || a.naam.localeCompare(b.naam, 'nl'));
const domein = (u) => new URL(u).hostname.replace(/^www\./, '');
const stemhulpKaart = (s) => `<li class="stemhulp${s.officieel ? ' stemhulp--officieel' : ''}">
  ${s.beeld && bestaat(`src/assets/stemhulpen/${s.beeld}.jpg`) ? `<a class="venster" href="${e(s.url)}" rel="noopener" tabindex="-1" aria-hidden="true"><span class="venster__balk"><i></i><i></i><i></i><span>${e(domein(s.url))}</span></span><img src="/assets/stemhulpen/${e(s.beeld)}.jpg" alt="" width="880" height="550" loading="lazy"></a>` : ''}
  <div class="stemhulp__tekst">
    <p class="stemhulp__door">${e(s.door || '')}</p>
    <h2>${e(s.naam)}</h2>
    ${s.kenmerken?.length ? `<ul class="kenmerken" aria-label="Kenmerken">${s.kenmerken.map((k) => `<li${k === 'Officieel' ? ' class="kenmerk--officieel"' : /^Invalshoek/.test(k) ? ' class="kenmerk--invalshoek"' : ''}>${e(k)}</li>`).join('')}</ul>` : ''}
    <p>${e(s.werking)}</p>
    ${s.standpunten ? `<p>${e(s.standpunten)}</p>` : ''}
    <p><a class="knop knop--licht" href="${e(s.url)}" rel="noopener">Naar ${e(s.naam)}</a></p>
  </div>
</li>`;
schrijf('andere-stemhulpen/index.html', pagina({
  titel: 'Andere stemhulpen voor 18 november – Hilversum kiest',
  beschrijving: 'Alle stemhulpen en verkiezingsgidsen voor de gemeenteraadsverkiezing in Hilversum en Wijdemeren op een rij: wie ze maakte, hoe ze werken en waar de standpunten vandaan komen.',
  pad: ANDERE,
  inhoud: `
<div class="smal">
<h1>Andere stemhulpen</h1>
<p style="font-size:1.2rem;line-height:1.5">Voor deze verkiezing zijn er meer stemhulpen en gidsen, elk met een eigen aanpak. Kijk gerust verder.</p>
<div class="melding"><p><strong>Het verschil met Hilversum kiest:</strong> daar kies je eerst tussen welke partijen je twijfelt, en krijg je alleen de stellingen waarop die verschillen.</p></div>
</div>
<ul class="stemhulpen">
${stemhulpen.map(stemhulpKaart).join('\n')}
</ul>
<div class="smal">
<p class="klein">Mist er een stemhulp of klopt er iets niet?${REPO ? ` <a href="${e(REPO)}/issues" rel="noopener">Meld het op GitHub</a>, dan kijk ik ernaar.` : ''}</p>
</div>`,
}));

// ---------- Uitslag ----------
if (UK) {
  schrijf('uitslag/index.html', pagina({
    titel: 'Uitslag gemeenteraadsverkiezing 2026 – Hilversum kiest',
    beschrijving: 'De uitslag van de gemeenteraadsverkiezing van 18 november 2026 in Hilversum en Wijdemeren: stemmen en zetels per partij en stemmen per kandidaat, met de bron.',
    pad: '/uitslag/',
    inhoud: UK.pagina(),
  }));
  // Klein bestand waarmee open pagina's zien dat er een nieuwere stand is.
  schrijf('data/uitslag-stand.json', JSON.stringify({ stadium: UK.stadium, bijgewerkt: UK.bijgewerkt }));
}

// ---------- Data voor de browser ----------
const licht = {
  repo: REPO, // voor de link 'meld het' in de uitslag
  partijen: partijen.map(({ slug, nr, naam, kort, kleur }) => ({ slug, nr, naam, kort, kleur })),
  themas,
  stellingen,
};
schrijf('data/stemwijzer.json', JSON.stringify(licht));
schrijf('assets/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><circle cx="16" cy="16" r="11" fill="#d0271d" stroke="#0e1b2c" stroke-width="3"/></svg>`);
// Paden in de scripts aanpassen aan het basispad, en bestanden voor GitHub Pages
if (BASIS !== '/') {
  const jsDir = path.join(DIST, 'assets/js');
  for (const f of fs.readdirSync(jsDir)) {
    const fp = path.join(jsDir, f);
    let t = fs.readFileSync(fp, 'utf8');
    t = t.replace(/(href|src)="\/(?!\/)/g, `$1="${BASIS}`).replace(/(['"`])\/(data|stemwijzer|partijen|vergelijken)\//g, `$1${BASIS}$2/`);
    fs.writeFileSync(fp, t);
  }
}
schrijf('.nojekyll', '');
if (process.env.DOMEIN) schrijf('CNAME', process.env.DOMEIN + '\n');
schrijf('404.html', pagina({ titel: 'Pagina niet gevonden – Hilversum kiest', beschrijving: 'Deze pagina bestaat niet.', pad: '/404', index: false, scripts: `<script>window.meet('404',{pad:location.pathname})</script>`, inhoud: '<h1>Deze pagina bestaat niet</h1><p>Misschien is het adres verkeerd overgenomen. <a href="/">Ga naar de voorpagina</a> of <a href="/stemwijzer/">start de stemwijzer</a>.</p>' }));
// ---------- Oude adressen ----------
// /lijsten/ heet nu /partijen/ en /vergelijk/ heet /vergelijken/. De oude adressen zijn al gedeeld:
// daar blijft een pagina staan die meteen doorstuurt, met wat achter ? en # staat erbij (een gekozen kandidaat of
// vergelijking). Ze tellen niet mee in de bezoektelling en komen niet in zoekmachines.
function doorverwijzing(oud, nieuw) {
  schrijf(`${oud.slice(1)}index.html`, `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<script>location.replace(${JSON.stringify(BASIS + nieuw.slice(1))}+location.search+location.hash)</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verhuisd – Hilversum kiest</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${e(volledig(nieuw))}">
<meta http-equiv="refresh" content="0; url=${e(BASIS + nieuw.slice(1))}">
</head>
<body>
<p>Deze pagina staat nu op <a href="${nieuw}">${e(volledig(nieuw))}</a>.</p>
</body>
</html>`);
}
doorverwijzing('/lijsten/', '/partijen/');
for (const p of partijen) doorverwijzing(`/lijsten/${p.slug}/`, `/partijen/${p.slug}/`);
doorverwijzing('/vergelijk/', '/vergelijken/');

// ---------- Voor zoekmachines ----------
schrijf('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${volledig('/sitemap.xml')}\n`);
const vandaag = new Date().toISOString().slice(0, 10);
schrijf('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `<url><loc>${e(volledig(u))}</loc><lastmod>${vandaag}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`Gebouwd: ${partijen.length} partijen, ${stellingen.length} stellingen, ${bureaus.length} stembureaus -> dist/`);
