// De uitslag op de site: de pagina /uitslag/, het blok op de voorpagina en de cijfers op de partijpagina's.
// Alle cijfers komen uit data/uitslag.json; is dat bestand leeg ({}), dan verandert er niets aan de site.
// Volgorde altijd op uitslag (meeste stemmen eerst, bij gelijke stemmen op lijstnummer). De site zet er geen
// woorden bij als winnaar of verliezer: alleen de getallen, de bron en het tijdstip. Het verschil met 2022 is een
// getal (+2, −1), gerekend tegen de uitslag van 2022 in beide gemeenten samen, omgerekend naar de nieuwe raad.
import { vulAan } from './uitslagcontrole.mjs';
import { verdeelZetels } from './zetels.mjs';

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

export function maakUitslag({ u: ruw, partijen, kandidaten, e, zetels: Z = 39, vorige = null }) {
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

  // ---------- Verschil met 2022 ----------
  // Hilversum (37 zetels) en Wijdemeren (19) kozen in 2022 elk een eigen raad; de nieuwe raad heeft er 39. Zetels één op
  // één vergelijken zet daardoor bijna elke partij op min. Daarom: de stemmen van 2022 in beide gemeenten bij elkaar,
  // verdeeld over de zetels van nu met dezelfde regels. Partijen die samengingen tellen op; wie niet meedeed begint op 0.
  const V = (() => {
    if (!vorige?.raden?.length || !metZetels) return null;
    const stemmen = {}, oud = {};
    for (const r of vorige.raden) {
      const som = r.partijen.reduce((n, x) => n + x.stemmen, 0);
      if (som !== r.geldig) throw new Error(`data/raden-2022.json: stemmen in ${r.gemeente} tellen op tot ${som}, niet ${r.geldig}`);
      if (r.partijen.reduce((n, x) => n + x.zetels, 0) !== r.zetels) throw new Error(`data/raden-2022.json: zetels in ${r.gemeente} tellen niet op tot ${r.zetels}`);
      for (const x of r.partijen) {
        if (x.nu && !partijen.some((p) => p.slug === x.nu)) throw new Error(`data/raden-2022.json: onbekende partij ${x.nu}`);
        const k = x.nu || `-${r.gemeente}-${x.naam}`;
        stemmen[k] = (stemmen[k] || 0) + x.stemmen;
        if (x.nu) ((oud[x.nu] ||= {})[r.gemeente] ||= []).push(x);
      }
    }
    const v = verdeelZetels(stemmen, Z);
    if (!v.zetels) return null; // loting of fout in de rekensom: dan geen vergelijking
    const per = Object.fromEntries(partijen.map((p) => [p.slug, { was: oud[p.slug] ? v.zetels[p.slug] : 0, nieuw: !oud[p.slug], oud: oud[p.slug] || null, verschil: P[p.slug].zetels - (oud[p.slug] ? v.zetels[p.slug] : 0) }]));
    return { per, raden: vorige.raden, zonderOpvolger: vorige.raden.flatMap((r) => r.partijen.filter((x) => !x.nu).map((x) => x.naam)) };
  })();
  const teken = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
  const verschilWoord = (n) => (n > 0 ? `${n} ${n === 1 ? 'zetel' : 'zetels'} meer dan in 2022` : n < 0 ? `${-n} ${n === -1 ? 'zetel' : 'zetels'} minder dan in 2022` : 'evenveel zetels als in 2022');
  const verschilPil = (p) => {
    if (!V) return '';
    const n = V.per[p.slug].verschil;
    return `<span class="uk-ver" data-r="${n > 0 ? 'plus' : n < 0 ? 'min' : 'gelijk'}"><span aria-hidden="true">${n > 0 ? '▲ ' : n < 0 ? '▼ ' : ''}${teken(n)}</span><span class="sr">${verschilWoord(n)}, omgerekend</span></span>`;
  };

  const simLabel = sim ? '<span class="uk-sim">Simulatie: verzonnen cijfers</span>' : '';
  const stadiumLabel = `<span class="uk-stadium" data-stadium="${st}">${NAAM[st]}</span>${simLabel}`;
  const bron = u.bron ? `Bron: <a href="${e(u.bron.url)}" rel="noopener">${e(u.bron.naam)}</a>` : '';
  const meta = [u.bijgewerkt && st !== 'wacht' ? `Bijgewerkt ${tijdstip(u.bijgewerkt)}` : '', bron].filter(Boolean).join('. ');
  const geteld = u.bureaus ? `${getal(u.bureaus.geteld)} van de ${getal(u.bureaus.totaal)} stembureaus geteld` : '';

  // Eén balk met alle stemmen of alle 39 zetels, in de kleuren van de partijen.
  const stemBalk = () => `<div class="uk-balk" aria-hidden="true">${rij.map((p) => `<i style="background:${p.kleur};flex-grow:${P[p.slug].stemmen}"></i>`).join('')}</div>`;
  const zetelBalk = () => `<ol class="uk-zetels" aria-label="De ${Z} zetels">${rij.filter((p) => P[p.slug].zetels).map((p) => Array.from({ length: P[p.slug].zetels }, (_, i) => `<li style="background:${p.kleur}" title="${e(p.kort)}"${i ? ' aria-hidden="true"' : ` aria-label="${e(p.kort)}: ${P[p.slug].zetels} ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}"`}></li>`).join('')).join('')}</ol>`;

  const wachtTekst = `<p class="uk-wacht" data-wacht>De stembureaus zijn dicht en de stemmen worden geteld. De eerste uitslagen verschijnen hier vanzelf, met de bron erbij.</p>`;
  // Het wachtblok komt pas na 21.00 uur op de site (tools/uitslag/haal.mjs); het script verbergt wat alleen vóór 21.00 uur klopt.
  const wachtScript = `<script>(function(){var t=document.querySelectorAll('[data-wacht]');if(Date.now()>=Date.parse('2026-11-18T21:00:00+01:00'))t.forEach(function(x){x.textContent='De stembureaus zijn dicht en de stemmen worden geteld. De eerste uitslagen verschijnen hier vanzelf, met de bron erbij.'});document.querySelectorAll('[data-voor21]').forEach(function(x){x.hidden=true})})();</script>`;
  // Pagina's met een uitslag kijken elke twee minuten of er een nieuwere stand is en laden zich dan opnieuw.
  const ververs = st === 'officieel' && !kandVoorlopig ? '' : `<script>(function(){var nu=${JSON.stringify(u.bijgewerkt || '')};function kijk(){if(document.hidden)return;fetch('/data/uitslag-stand.json?'+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.bijgewerkt&&j.bijgewerkt!==nu)location.reload()}).catch(function(){})}setInterval(kijk,120000);document.addEventListener('visibilitychange',kijk)})();</script>`;

  const partijRij = (p) => {
    const x = P[p.slug];
    if (alleenZetels) return `<li><span class="uk-naam"><a href="/partijen/${p.slug}/">${e(p.kort)}</a></span><span class="uk-zet"><b>${x.zetels}</b><span class="sr"> ${x.zetels === 1 ? 'zetel' : 'zetels'}</span></span>${verschilPil(p)}</li>`;
    return `<li><span class="uk-naam"><a href="/partijen/${p.slug}/">${e(p.kort)}</a></span><span class="uk-pct">${procent(x.stemmen, geldig)}%</span>${metZetels ? `<span class="uk-zet"><b>${x.zetels}</b><span class="sr"> ${x.zetels === 1 ? 'zetel' : 'zetels'}</span></span>${verschilPil(p)}` : ''}<span class="uk-rijbalk"><i style="width:${(x.stemmen / (P[rij[0].slug].stemmen || 1)) * 100}%;background:${p.kleur}"></i></span><span class="uk-stemmen">${getal(x.stemmen)} stemmen</span></li>`;
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
  <p><a class="knop" href="/uitslag/">Bekijk de hele uitslag</a>${metZetels ? ' <a class="knop knop--licht" href="/uitslag/#meerderheid">Maak zelf een meerderheid</a>' : ''}</p>
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
      : voorlopig ? `<div class="melding"><p><strong>Voorlopig.</strong> ${alleenZetels ? 'De gemeente heeft de voorlopige zetelverdeling bekendgemaakt' : 'Alle stembureaus zijn geteld'}, maar de uitslag is pas officieel als het centraal stembureau haar vaststelt, op ${VASTSTELLING}. Tot dan kunnen er kleine correcties komen.</p></div>` : '';
    const kandHtml = u.kandidaten ? `<h2 id="voorkeurstemmen">Stemmen per kandidaat</h2>
<p>Per partij in de volgorde van het stembiljet. ${u.gekozen ? `<span class="uk-gekozen">${kandVoorlopig ? 'Gekozen (voorlopig)' : 'Gekozen'}</span> staat bij wie volgens ${u.gekozenBron === 'berekend' ? 'de regels van de Kieswet' : 'het centraal stembureau'} een zetel krijgt.` : ''}</p>
${rij.map((p) => {
      const lijst = kandidaten[p.slug] || [];
      const g = u.gekozen?.[p.slug] || [];
      return `<details class="uk-kand"><summary><b>${e(p.kort)}</b> <span class="grijs">${metZetels ? `${P[p.slug].zetels} ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}, ` : ''}${lijst.length} ${lijst.length === 1 ? 'kandidaat' : 'kandidaten'}</span></summary>
<div class="tabel-wrap"><table><thead><tr><th class="num">Nr</th><th>Kandidaat</th><th class="num">Stemmen</th></tr></thead><tbody>
${lijst.map((k) => `<tr><td class="num">${k.nr}</td><td><a href="/partijen/${p.slug}/#kandidaat-${k.nr}">${e(k.naam)}</a> <span class="grijs">${e(k.woonplaats || '')}</span>${g.includes(k.nr) ? ` <span class="uk-gekozen">${kandVoorlopig ? 'Gekozen (voorlopig)' : 'Gekozen'}</span>` : ''}</td><td class="num">${getal(u.kandidaten[p.slug][k.nr])}</td></tr>`).join('\n')}
</tbody></table></div></details>`;
    }).join('\n')}` : '';
    // Verschil met 2022: per partij vakjes links (minder) of rechts (meer) van de streep, en de rekensom erbij.
    const verschilHtml = () => {
      if (!V) return '';
      const op = [...rij].sort((a, b) => V.per[b.slug].verschil - V.per[a.slug].verschil || P[b.slug].zetels - P[a.slug].zetels || a.nr - b.nr);
      const maxMin = Math.max(1, ...op.map((p) => -V.per[p.slug].verschil));
      const maxPlus = Math.max(1, ...op.map((p) => V.per[p.slug].verschil));
      const vakjes = (n, kleur, soort) => Array.from({ length: n }, () => `<i class="uk-vv uk-vv--${soort}" style="--k:${kleur}"></i>`).join('');
      const metVerleden = partijen.filter((p) => V.per[p.slug].oud);
      const nieuw = rij.filter((p) => V.per[p.slug].nieuw);
      const namen22 = (p, g) => (V.per[p.slug].oud[g] || []).map((x) => x.naam);
      const zetels22 = (p, g) => (V.per[p.slug].oud[g] ? V.per[p.slug].oud[g].reduce((n, x) => n + x.zetels, 0) : null);
      const [r1, r2] = V.raden;
      return `<h2 id="verschil">Verschil met 2022</h2>
<p class="klein">Zetels nu, vergeleken met de uitslag van 2022 in Hilversum en Wijdemeren samen, omgerekend naar ${Z} zetels. Gevuld vakje: een zetel erbij. Gearceerd vakje: een zetel minder.</p>
<ol class="uk-verlijst" style="--min:${maxMin};--plus:${maxPlus}">
${op.map((p) => { const n = V.per[p.slug].verschil; return `<li><span class="uk-vnaam"><a href="/partijen/${p.slug}/">${e(p.kort)}</a>${V.per[p.slug].nieuw ? ' <span class="uk-vnieuw">deed in 2022 niet mee</span>' : ''}</span><span class="uk-vmin" aria-hidden="true">${n < 0 ? vakjes(-n, p.kleur, 'min') : ''}</span><span class="uk-vplus" aria-hidden="true">${n > 0 ? vakjes(n, p.kleur, 'plus') : ''}</span><span class="uk-vgetal" data-r="${n > 0 ? 'plus' : n < 0 ? 'min' : 'gelijk'}"><span aria-hidden="true">${teken(n)}</span><span class="sr">${verschilWoord(n)}</span></span></li>`; }).join('\n')}
</ol>
<div class="smal">
<p>In 2022 kozen Hilversum en Wijdemeren elk een eigen raad: ${r1.zetels} en ${r2.zetels} zetels, samen ${r1.zetels + r2.zetels}. De nieuwe raad heeft ${Z} zetels. Wie de zetels gewoon naast elkaar legt, ziet daardoor bijna elke partij dalen.</p>
<p>Daarom vergelijken we met een omgerekende uitslag: de stemmen van 2022 in beide gemeenten bij elkaar, verdeeld over ${Z} zetels met de regels van de Kieswet. Partijen die zijn samengegaan tellen we bij elkaar op. Een partij die in 2022 niet meedeed begint op nul: al haar zetels zijn erbij gekomen.</p>
<p>Het is een rekensom, geen uitslag: in 2022 bestond deze gemeente nog niet.</p>
</div>
<details class="uk-kand uk-som"><summary><b>De rekensom per partij</b> <span class="grijs">zetels in 2022, omgerekend en nu</span></summary>
<div class="tabel-wrap"><table><thead><tr><th>Partij</th><th class="num">${e(r1.gemeente)} 2022<br><span class="grijs">van ${r1.zetels}</span></th><th class="num">${e(r2.gemeente)} 2022<br><span class="grijs">van ${r2.zetels}</span></th><th class="num">Omgerekend<br><span class="grijs">van ${Z}</span></th><th class="num">Nu<br><span class="grijs">van ${Z}</span></th><th class="num">Verschil</th></tr></thead><tbody>
${metVerleden.map((p) => { const a = zetels22(p, r1.gemeente), b = zetels22(p, r2.gemeente); const anders = [...namen22(p, r1.gemeente), ...namen22(p, r2.gemeente)].filter((n, i, l) => l.indexOf(n) === i); const toon = anders.length > 1 || (anders[0] && anders[0] !== p.kort); return `<tr><td>${e(p.kort)}${toon ? `<br><span class="grijs klein">in 2022: ${e(anders.join(', '))}</span>` : ''}</td><td class="num">${a === null ? '–' : a}</td><td class="num">${b === null ? '–' : b}</td><td class="num">${V.per[p.slug].was}</td><td class="num">${P[p.slug].zetels}</td><td class="num"><b>${teken(V.per[p.slug].verschil)}</b></td></tr>`; }).join('\n')}
</tbody></table></div>
<p class="klein">Een streepje betekent: deed in die gemeente niet mee. ${nieuw.length ? `Niet in de tabel, omdat ze in 2022 in geen van beide gemeenten meededen: ${e(nieuw.map((p) => p.kort).join(', '))}. ` : ''}${V.zonderOpvolger.length ? `In de rekensom tellen ook de stemmen mee op ${e(V.zonderOpvolger.join(' en '))}, die in 2022 geen zetel haalden en nu niet meedoen. ` : ''}Bron voor 2022: Kiesraad, ${V.raden.map((r) => `<a href="${e(r.bron)}" rel="noopener">${e(r.gemeente)}</a>`).join(' en ')}.</p>
</details>`;
    };
    // Meerderheid maken: partijen aantikken en zien of ze samen aan de helft plus één komen.
    const meerderheidHtml = () => {
      if (!metZetels) return '';
      const nodig = Math.floor(Z / 2) + 1;
      const mee = rij.filter((p) => P[p.slug].zetels > 0);
      return `<h2 id="meerderheid">Welke partijen hebben samen een meerderheid?</h2>
<p>Voor een meerderheid in de raad zijn ${nodig} van de ${Z} zetels nodig. Kies partijen en kijk waar je op uitkomt.</p>
<div class="uk-mm" data-mm data-nodig="${nodig}" hidden>
  <p class="uk-mm__stand" aria-live="polite"><span class="uk-mm__som"><b data-mm-som>0</b> van ${Z} zetels</span> <span data-mm-tekst>Nog ${nodig} zetels nodig voor een meerderheid.</span></p>
  <div class="uk-mm__balk" aria-hidden="true"><div class="uk-mm__vakken">${Array.from({ length: Z }, () => '<i></i>').join('')}</div><span class="uk-mm__grens" style="left:${(nodig / Z) * 100}%"><span>${nodig}</span></span></div>
  <ul class="uk-mm__partijen">${mee.map((p) => `<li><button type="button" aria-pressed="false" data-slug="${p.slug}" data-zetels="${P[p.slug].zetels}" data-kleur="${e(p.kleur)}"><i style="background:${p.kleur}"></i><span>${e(p.kort)}</span><b>${P[p.slug].zetels}<span class="sr"> ${P[p.slug].zetels === 1 ? 'zetel' : 'zetels'}</span></b></button></li>`).join('')}</ul>
  <p><button type="button" class="knop knop--licht" data-mm-wis>Begin opnieuw</button></p>
</div>
<noscript><p class="klein">Voor deze rekenhulp is JavaScript nodig.</p></noscript>
<p class="klein">Dit is een rekenhulp. Het zegt niets over welke partijen met elkaar willen of gaan besturen.${voorlopig ? ' De zetels zijn voorlopig.' : ''}</p>
<script>(function(){var w=document.querySelector('[data-mm]');if(!w)return;w.hidden=false;var nodig=+w.dataset.nodig,vak=w.querySelectorAll('.uk-mm__vakken i'),kn=[].slice.call(w.querySelectorAll('button[data-slug]')),som=w.querySelector('[data-mm-som]'),tekst=w.querySelector('[data-mm-tekst]'),keuze=[];try{keuze=JSON.parse(sessionStorage.getItem('uk-mm')||'[]')}catch(e){}var z=function(n){return n+' '+(n===1?'zetel':'zetels')};function knop(s){return kn.filter(function(b){return b.dataset.slug===s})[0]}function teken(){keuze=keuze.filter(knop);var n=0,i=0;vak.forEach(function(v){v.style.background=''});keuze.forEach(function(s){var b=knop(s);for(var k=0;k<+b.dataset.zetels;k++){if(vak[i])vak[i].style.background=b.dataset.kleur;i++}n+=+b.dataset.zetels});kn.forEach(function(b){b.setAttribute('aria-pressed',keuze.indexOf(b.dataset.slug)>-1?'true':'false')});som.textContent=n;w.dataset.stand=n>=nodig?'ja':'nee';tekst.textContent=n>=nodig?(n>nodig?'Dat is een meerderheid, met '+z(n-nodig)+' over.':'Dat is een meerderheid, precies genoeg.'):'Nog '+z(nodig-n)+' nodig voor een meerderheid.';try{sessionStorage.setItem('uk-mm',JSON.stringify(keuze))}catch(e){}}kn.forEach(function(b){b.addEventListener('click',function(){var s=b.dataset.slug,j=keuze.indexOf(s);if(j>-1)keuze.splice(j,1);else keuze.push(s);teken()})});w.querySelector('[data-mm-wis]').addEventListener('click',function(){keuze=[];teken()});teken()})();</script>`;
    };
    return `${kop}
${melding}
<dl class="feiten uk-feiten">${feiten.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>
${metZetels ? `<h2 id="zetels">Zetels in de nieuwe raad</h2>${zetelBalk()}` : ''}
${alleenZetels ? `<h2 id="stemmen">Zetels per partij</h2>
<p class="klein">Op volgorde van het aantal zetels. De bron geeft nog alleen de zetelverdeling; de stemmen per partij volgen.${V ? ' Het getal erachter is het <a href="#verschil">verschil met 2022</a>.' : ''}</p>
<ol class="uk-lijst uk-lijst--alleenzetels${V ? ' uk-lijst--ver' : ''}">` : `<h2 id="stemmen">Stemmen per partij</h2>
<p class="klein">Op volgorde van het aantal stemmen. Het percentage is van alle geldige stemmen op een partij${st === 'tussenstand' ? ' in de stembureaus die al geteld zijn' : ''}.${V ? ' Het getal achter de zetels is het <a href="#verschil">verschil met 2022</a>.' : ''}</p>
<ol class="uk-lijst${metZetels ? ' uk-lijst--zetels' : ''}${V ? ' uk-lijst--ver' : ''}">`}${rij.map(partijRij).join('\n')}</ol>
${verschilHtml()}
${meerderheidHtml()}
${kandHtml}
<h2 id="over">Over deze cijfers</h2>
<div class="smal">
<p>De cijfers komen van ${u.bron ? `<a href="${e(u.bron.url)}" rel="noopener">${e(u.bron.naam)}</a>` : 'de gemeente'} en worden automatisch overgenomen, na een controle: alle twintig partijen moeten erin staan, de getallen moeten optellen en mogen niet teruglopen. Klopt er iets niet, dan blijft de vorige stand staan.</p>
${metZetels ? `<p>${u.zetelsBron === 'berekend' ? 'De zetels zijn berekend uit de stemmen per partij, met de regels van de Kieswet: eerst volle zetels per kiesdeler, daarna restzetels volgens de grootste gemiddelden.' : alleenZetels ? 'De zetelverdeling komt van de gemeente. Zodra de stemmen per partij bekend zijn, worden de zetels daarmee nagerekend.' : u.zetelsGelijk ? 'De zetels komen van de gemeente; nagerekend met de regels van de Kieswet komt dezelfde verdeling uit.' : 'De zetels komen van de gemeente.'}</p>` : ''}
${u.kandidaten ? '<p>Een kandidaat met ten minste een kwart van de kiesdeler aan voorkeurstemmen krijgt voorrang op de volgorde van de lijst. Wie een zetel aanneemt, blijkt pas na de vaststelling.</p>' : ''}
${V ? '<p>Het verschil met 2022 is een eigen rekensom en komt niet van de gemeente: <a href="#verschil">zo is het berekend</a>.</p>' : '<p>Een vergelijking met de vorige verkiezing staat er niet bij: de gemeente is nieuw en in 2022 deden niet dezelfde partijen in Hilversum en Wijdemeren mee.</p>'}
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
  <dl class="uk-partij__cijfers">${alleenZetels ? '' : `<div><dt>Stemmen</dt><dd>${getal(x.stemmen)}</dd></div><div><dt>Van alle stemmen</dt><dd>${procent(x.stemmen, geldig)}%</dd></div>`}${metZetels ? `<div><dt>Zetels</dt><dd>${x.zetels} van ${Z}</dd></div>` : ''}${V ? `<div><dt>Verschil met 2022</dt><dd>${teken(V.per[p.slug].verschil)}<span class="sr"> (${verschilWoord(V.per[p.slug].verschil)})</span></dd></div>` : ''}</dl>
  <p class="klein">${st === 'tussenstand' ? `${geteld}. ` : ''}${meta}. <a href="/uitslag/">Hele uitslag</a>${V ? ` · <a href="/uitslag/#verschil">${V.per[p.slug].nieuw ? 'deed in 2022 niet mee' : 'verschil omgerekend'}</a>` : ''}${u.kandidaten ? ' · <a href="#kandidaten">stemmen per kandidaat</a>' : ''}</p>
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
