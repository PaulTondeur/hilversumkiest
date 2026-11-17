// De uitslag op de site: de pagina /uitslag/, het blok op de voorpagina en de cijfers op de partijpagina's.
// Alle cijfers komen uit data/uitslag.json; is dat bestand leeg ({}), dan verandert er niets aan de site.
// Volgorde altijd op uitslag (meeste stemmen eerst, bij gelijke stemmen op lijstnummer). De site zet er geen
// woorden bij als winst of verlies: alleen de getallen, de bron en het tijdstip.
import { vulAan } from './uitslagcontrole.mjs';

const NAAM = { wacht: 'Nog geen uitslag', tussenstand: 'Tussenstand', voorlopig: 'Voorlopige uitslag', officieel: 'Officiële uitslag' };
const getal = (n) => Number(n).toLocaleString('nl-NL');
const procent = (n, tot) => (tot ? ((n / tot) * 100).toFixed(1).replace('.', ',') : '0,0');
const tijdstip = (iso) => {
  const d = new Date(iso);
  const dag = d.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' });
  const uur = d.toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  return `${dag}, ${uur} uur`;
};
const VASTSTELLING = 'donderdag 26 november om 10.00 uur';

export function maakUitslag({ u: ruw, partijen, kandidaten, e, zetels: Z = 39 }) {
  if (!ruw?.stadium) return null;
  const u = vulAan(ruw, partijen, kandidaten, Z);
  const st = u.stadium;
  const sim = !!u.simulatie;
  const P = u.partijen || {};
  const geldig = partijen.reduce((n, p) => n + (P[p.slug]?.stemmen || 0), 0);
  // Geeft de bron alleen de zetelverdeling (nog geen stemmen per partij), dan sorteren en tonen we op zetels.
  const alleenZetels = partijen.every((p) => P[p.slug] && P[p.slug].stemmen == null);
  const rij = partijen.filter((p) => P[p.slug]).sort((a, b) => (alleenZetels ? P[b.slug].zetels - P[a.slug].zetels : P[b.slug].stemmen - P[a.slug].stemmen) || a.nr - b.nr);
  const metZetels = (st === 'voorlopig' || st === 'officieel') && partijen.every((p) => Number.isInteger(P[p.slug]?.zetels));
  const voorlopig = st !== 'officieel';
  const kandVoorlopig = st !== 'officieel' || u.kandidatenStadium === 'voorlopig';

  const simLabel = sim ? '<span class="uk-sim">Simulatie: verzonnen cijfers</span>' : '';
  const stadiumLabel = `<span class="uk-stadium" data-stadium="${st}">${NAAM[st]}</span>${simLabel}`;
  const bron = u.bron ? `Bron: <a href="${e(u.bron.url)}" rel="noopener">${e(u.bron.naam)}</a>` : '';
  const meta = [u.bijgewerkt && st !== 'wacht' ? `Bijgewerkt ${tijdstip(u.bijgewerkt)}` : '', bron].filter(Boolean).join('. ');
  const geteld = u.bureaus ? `${getal(u.bureaus.geteld)} van de ${getal(u.bureaus.totaal)} stembureaus geteld` : '';

  // Eén balk met alle stemmen of alle 39 zetels, in de kleuren van de partijen.
  const stemBalk = () => `<div class="uk-balk" aria-hidden="true">${rij.map((p) => `<i style="background:${p.kleur};flex-grow:${P[p.slug].stemmen}"></i>`).join('')}</div>`;
  const zetelBalk = () => `<ol class="uk-zetels" aria-label="De ${Z} zetels">${rij.filter((p) => P[p.slug].zetels).map((p) => Array.from({ length: P[p.slug].zetels }, (_, i) => `<li style="background:${p.kleur}" title="${e(p.kort)}"${i ? ' aria-hidden="true"' : ` aria-label="${e(p.kort)}: ${P[p.slug].zetels} ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}"`}></li>`).join('')).join('')}</ol>`;

  const wachtTekst = `<p class="uk-wacht" data-wacht>De stembureaus zijn open tot 21.00 uur. Daarna worden de stemmen geteld; de eerste uitslagen verschijnen hier vanzelf, met de bron erbij.</p>`;
  // Na 21.00 uur (klok van de lezer) wisselt de zin; zonder JavaScript blijft de eerste staan, en die klopt dan ook.
  const wachtScript = `<script>(function(){var t=document.querySelectorAll('[data-wacht]');if(Date.now()>=Date.parse('2026-11-18T21:00:00+01:00'))t.forEach(function(x){x.textContent='De stembureaus zijn dicht en de stemmen worden geteld. De eerste uitslagen verschijnen hier vanzelf, met de bron erbij.'});document.querySelectorAll('[data-voor21]').forEach(function(x){x.hidden=true})})();</script>`;
  // Pagina's met een uitslag kijken elke twee minuten of er een nieuwere stand is en laden zich dan opnieuw.
  const ververs = st === 'officieel' && !kandVoorlopig ? '' : `<script>(function(){var nu=${JSON.stringify(u.bijgewerkt || '')};function kijk(){if(document.hidden)return;fetch('/data/uitslag-stand.json?'+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.bijgewerkt&&j.bijgewerkt!==nu)location.reload()}).catch(function(){})}setInterval(kijk,120000);document.addEventListener('visibilitychange',kijk)})();</script>`;

  const partijRij = (p) => {
    const x = P[p.slug];
    if (alleenZetels) return `<li><span class="uk-nr">${p.nr}</span><span class="uk-naam"><a href="/partijen/${p.slug}/">${e(p.kort)}</a></span><span class="uk-zet"><b>${x.zetels}</b><span class="sr"> ${x.zetels === 1 ? 'zetel' : 'zetels'}</span></span></li>`;
    return `<li><span class="uk-nr">${p.nr}</span><span class="uk-naam"><a href="/partijen/${p.slug}/">${e(p.kort)}</a></span><span class="uk-pct">${procent(x.stemmen, geldig)}%</span>${metZetels ? `<span class="uk-zet"><b>${x.zetels}</b><span class="sr"> ${x.zetels === 1 ? 'zetel' : 'zetels'}</span></span>` : ''}<span class="uk-rijbalk"><i style="width:${(x.stemmen / (P[rij[0].slug].stemmen || 1)) * 100}%;background:${p.kleur}"></i></span><span class="uk-stemmen">${getal(x.stemmen)} stemmen</span></li>`;
  };

  // ---------- Voorpagina ----------
  function voorpagina() {
    if (st === 'wacht') {
      return `<section class="uk-blok${sim ? ' uk-blok--sim' : ''}" aria-labelledby="uk-kop">
  <div class="uk-blok__kop">${stadiumLabel}</div>
  <h2 id="uk-kop">Vandaag kiest Hilversum een nieuwe gemeenteraad</h2>
  ${wachtTekst}
  <p><a class="knop" href="/stembureauvinder/" data-voor21>Vind een stembureau</a> <a class="knop knop--licht" href="/uitslag/">Naar de uitslagpagina</a></p>
</section>${wachtScript}`;
    }
    return `<section class="uk-blok${sim ? ' uk-blok--sim' : ''}" aria-labelledby="uk-kop">
  <div class="uk-blok__kop">${stadiumLabel}<span class="klein">${[geteld && st === 'tussenstand' ? geteld : '', u.bijgewerkt ? `bijgewerkt ${tijdstip(u.bijgewerkt)}` : ''].filter(Boolean).join(' · ')}</span></div>
  <h2 id="uk-kop">${st === 'tussenstand' ? 'De stemmen worden geteld' : 'Uitslag gemeenteraadsverkiezing'}</h2>
  ${metZetels ? zetelBalk() : stemBalk()}
  <ul class="uk-legenda">${rij.map((p) => `<li><i style="background:${p.kleur}"></i><a href="/partijen/${p.slug}/">${e(p.kort)}</a> <span>${metZetels ? `${P[p.slug].zetels} ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}` : `${procent(P[p.slug].stemmen, geldig)}%`}</span></li>`).join('')}</ul>
  <p class="klein">${st === 'tussenstand' ? 'Tussenstand: nog niet alle stembureaus zijn geteld. Zetels staan er pas bij als alles geteld is.' : voorlopig ? `Voorlopig: het centraal stembureau stelt de officiële uitslag vast op ${VASTSTELLING}.` : 'Vastgesteld door het centraal stembureau.'} ${bron}.</p>
  <p><a class="knop" href="/uitslag/">Bekijk de hele uitslag</a></p>
</section>`;
  }

  // ---------- Uitslagpagina ----------
  function pagina() {
    const kop = `<div class="uk-paginakop${sim ? ' uk-blok--sim' : ''}">
  <div class="uk-blok__kop">${stadiumLabel}</div>
  <h1>Uitslag gemeenteraadsverkiezing 2026</h1>
  <p class="uk-meta">${meta || 'Gemeente Hilversum, woensdag 18 november 2026.'}</p>
</div>`;
    const tijden = `<h2>Wanneer welke cijfers</h2>
<ol class="tijdlijn">
<li><time datetime="2026-11-18T21:00">Woensdag 18 november, 21.00 uur</time><span>De stembureaus sluiten. Elk stembureau telt de stemmen per partij.</span></li>
<li><time datetime="2026-11-18">Woensdagavond en -nacht</time><span>De gemeente maakt de tussenstanden en de voorlopige uitslag per partij bekend. De site neemt ze over zodra ze verschijnen.</span></li>
<li><time datetime="2026-11-19">Donderdag 19 november</time><span>De stemmen worden per kandidaat geteld. Daarna staan hier ook de voorkeurstemmen.</span></li>
<li><time datetime="2026-11-26T10:00">Donderdag 26 november, 10.00 uur</time><span>Het centraal stembureau stelt de officiële uitslag vast en maakt bekend wie er gekozen zijn.</span></li>
</ol>`;
    if (st === 'wacht') {
      return `${kop}
${wachtTekst}
<p><a class="knop" href="/stembureauvinder/" data-voor21>Vind een stembureau</a></p>
${tijden}
<p class="klein">De cijfers komen van de gemeente Hilversum, die de verkiezing organiseert. Deze pagina laadt zichzelf opnieuw zodra er iets nieuws is.</p>${wachtScript}${ververs}`;
    }
    const feiten = [
      st === 'tussenstand' && u.bureaus ? ['Geteld', `${getal(u.bureaus.geteld)} van ${getal(u.bureaus.totaal)} stembureaus`] : null,
      alleenZetels ? null : ['Geldige stemmen', getal(geldig)],
      st !== 'tussenstand' && u.kiesgerechtigden && u.uitgebracht ? ['Opkomst', `${procent(u.uitgebracht, u.kiesgerechtigden)}%`] : null,
      metZetels ? ['Te verdelen', `${Z} zetels`] : null,
      st !== 'tussenstand' && Number.isInteger(u.blanco) ? ['Blanco', getal(u.blanco)] : null,
    ].filter(Boolean);
    const melding = st === 'tussenstand'
      ? `<div class="melding"><p><strong>Tussenstand.</strong> Nog niet alle stembureaus zijn geteld, dus de verhoudingen kunnen nog flink verschuiven. Zetels staan er pas bij als alle stembureaus geteld zijn.</p></div>`
      : voorlopig ? `<div class="melding"><p><strong>Voorlopig.</strong> Alle stembureaus zijn geteld, maar de uitslag is pas officieel als het centraal stembureau haar vaststelt, op ${VASTSTELLING}. Tot dan kunnen er kleine correcties komen.</p></div>` : '';
    const kandHtml = u.kandidaten ? `<h2 id="voorkeurstemmen">Stemmen per kandidaat</h2>
<p>Per partij in de volgorde van het stembiljet. ${u.gekozen ? `<span class="uk-gekozen">${kandVoorlopig ? 'Gekozen (voorlopig)' : 'Gekozen'}</span> staat bij wie volgens ${u.gekozenBron === 'berekend' ? 'de regels van de Kieswet' : 'het centraal stembureau'} een zetel krijgt.` : ''}</p>
${rij.map((p) => {
      const lijst = kandidaten[p.slug] || [];
      const g = u.gekozen?.[p.slug] || [];
      return `<details class="uk-kand"><summary><span class="uk-nr">${p.nr}</span> <b>${e(p.kort)}</b> <span class="grijs">${metZetels ? `${P[p.slug].zetels} ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}, ` : ''}${lijst.length} ${lijst.length === 1 ? 'kandidaat' : 'kandidaten'}</span></summary>
<div class="tabel-wrap"><table><thead><tr><th class="num">Nr</th><th>Kandidaat</th><th class="num">Stemmen</th></tr></thead><tbody>
${lijst.map((k) => `<tr><td class="num">${k.nr}</td><td><a href="/partijen/${p.slug}/#kandidaat-${k.nr}">${e(k.naam)}</a> <span class="grijs">${e(k.woonplaats || '')}</span>${g.includes(k.nr) ? ` <span class="uk-gekozen">${kandVoorlopig ? 'Gekozen (voorlopig)' : 'Gekozen'}</span>` : ''}</td><td class="num">${getal(u.kandidaten[p.slug][k.nr])}</td></tr>`).join('\n')}
</tbody></table></div></details>`;
    }).join('\n')}` : '';
    return `${kop}
${melding}
<dl class="feiten uk-feiten">${feiten.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>
${metZetels ? `<h2 id="zetels">Zetels in de nieuwe raad</h2>${zetelBalk()}` : ''}
${alleenZetels ? `<h2 id="stemmen">Zetels per partij</h2>
<p class="klein">Op volgorde van het aantal zetels. De bron geeft nog alleen de zetelverdeling; de stemmen per partij volgen.</p>
<ol class="uk-lijst uk-lijst--alleenzetels">` : `<h2 id="stemmen">Stemmen per partij</h2>
<p class="klein">Op volgorde van het aantal stemmen. Het percentage is van alle geldige stemmen op een partij${st === 'tussenstand' ? ' in de stembureaus die al geteld zijn' : ''}.</p>
<ol class="uk-lijst${metZetels ? ' uk-lijst--zetels' : ''}">`}${rij.map(partijRij).join('\n')}</ol>
${kandHtml}
<h2 id="over">Over deze cijfers</h2>
<div class="smal">
<p>De cijfers komen van ${u.bron ? `<a href="${e(u.bron.url)}" rel="noopener">${e(u.bron.naam)}</a>` : 'de gemeente'} en worden automatisch overgenomen, na een controle: alle twintig partijen moeten erin staan, de getallen moeten optellen en mogen niet teruglopen. Klopt er iets niet, dan blijft de vorige stand staan.</p>
${metZetels ? `<p>${u.zetelsBron === 'berekend' ? 'De zetels zijn berekend uit de stemmen per partij, met de regels van de Kieswet: eerst volle zetels per kiesdeler, daarna restzetels volgens de grootste gemiddelden, alleen voor partijen die de kiesdeler haalden.' : alleenZetels ? 'De zetelverdeling komt van de gemeente. Zodra de stemmen per partij bekend zijn, worden de zetels daarmee nagerekend.' : u.zetelsGelijk ? 'De zetels komen van de gemeente; nagerekend met de regels van de Kieswet komt dezelfde verdeling uit.' : 'De zetels komen van de gemeente.'}</p>` : ''}
${u.kandidaten ? '<p>Een kandidaat met ten minste een kwart van de kiesdeler aan voorkeurstemmen krijgt voorrang op de volgorde van de lijst. Wie een zetel aanneemt, blijkt pas na de vaststelling.</p>' : ''}
<p>Een vergelijking met de vorige verkiezing staat er niet bij: de gemeente is nieuw en in 2022 deden niet dezelfde partijen in Hilversum en Wijdemeren mee.</p>
</div>
${tijden}${ververs}`;
  }

  // ---------- Partijpagina ----------
  function partij(p) {
    if (st === 'wacht' || !P[p.slug]) return '';
    const x = P[p.slug];
    return `<section class="uk-partij${sim ? ' uk-blok--sim' : ''}" aria-labelledby="uk-partij-kop">
  <div class="uk-blok__kop">${stadiumLabel}</div>
  <h2 id="uk-partij-kop" class="sr">Uitslag van ${e(p.kort)}</h2>
  <dl class="uk-partij__cijfers">${alleenZetels ? '' : `<div><dt>Stemmen</dt><dd>${getal(x.stemmen)}</dd></div><div><dt>Van alle stemmen</dt><dd>${procent(x.stemmen, geldig)}%</dd></div>`}${metZetels ? `<div><dt>Zetels</dt><dd>${x.zetels} van ${Z}</dd></div>` : ''}</dl>
  <p class="klein">${st === 'tussenstand' ? `${geteld}. ` : ''}${meta}. <a href="/uitslag/">Hele uitslag</a>${u.kandidaten ? ' · <a href="#kandidaten">stemmen per kandidaat</a>' : ''}</p>
</section>${ververs}`;
  }
  // Wat er bij een kandidaat op de partijpagina komt te staan.
  function kandidaat(p, nr) {
    if (!u.kandidaten?.[p.slug]) return '';
    const g = u.gekozen?.[p.slug]?.includes(nr);
    return `<span class="uk-kstem">${getal(u.kandidaten[p.slug][nr])} stemmen${g ? ` <span class="uk-gekozen">${kandVoorlopig ? 'Gekozen (voorlopig)' : 'Gekozen'}</span>` : ''}</span>`;
  }

  return { stadium: st, simulatie: sim, bijgewerkt: u.bijgewerkt || '', voorpagina, pagina, partij, kandidaat };
}
