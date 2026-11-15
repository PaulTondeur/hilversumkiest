import { DIEPTES, kiesStellingen, bereken, onderscheid, procent } from './engine.mjs';
import { e, ANTWOORD, SCHAAL, laadStaat, bewaarStaat, laadData, standpuntHtml, spectrumHtml, pos } from './deel.js';

const app = document.getElementById('app');
let data;
let verouderd = false;
let staat = Object.assign({ lijsten: [], themas: [], diepte: 'normaal', antwoorden: {}, zwaar: [], set: null, i: 0, stap: 'lijsten' }, laadStaat());

const STAPPEN = [['lijsten', 'Lijsten'], ['themas', "Thema's"], ['stellingen', 'Stellingen'], ['uitslag', 'Uitslag']];
const bewaar = () => bewaarStaat(staat);
const P = () => Object.fromEntries(data.partijen.map((p) => [p.slug, p]));
const gekozenPartijen = () => data.partijen.filter((p) => staat.lijsten.includes(p.slug));
const S = () => Object.fromEntries(data.stellingen.map((s) => [s.id, s]));
const setStellingen = () => (staat.set || []).map((id) => S()[id]).filter(Boolean);

// --- delen via de link ---
// Compacte code: n<aantal stellingen in de bank>.<lijstnummers>.<per stelling: index (2 tekens, base36) + antwoord>.<dubbel tellende indexen>
const i36 = (i) => i.toString(36).padStart(2, '0');
function codeer() {
  const index = new Map(data.stellingen.map((s, i) => [s.id, i]));
  const nr = P();
  const lijsten = staat.lijsten.map((s) => nr[s].nr).join('-');
  const set = (staat.set || []).map((id) => i36(index.get(id)) + (id in staat.antwoorden ? staat.antwoorden[id] + 2 : 9)).join('');
  const zwaar = staat.zwaar.filter((id) => index.has(id)).map((id) => i36(index.get(id))).join('');
  return `n${data.stellingen.length}.${lijsten}.${set}.${zwaar}`;
}
function decodeer(h) {
  try {
    const [n, lijsten, set, zwaar = ''] = h.split('.');
    if (n !== `n${data.stellingen.length}`) return { verouderd: true };
    const opNr = Object.fromEntries(data.partijen.map((p) => [p.nr, p.slug]));
    const ids = [];
    const antwoorden = {};
    for (let i = 0; i + 3 <= set.length; i += 3) {
      const st = data.stellingen[parseInt(set.slice(i, i + 2), 36)];
      if (!st) return null;
      ids.push(st.id);
      const c = +set[i + 2];
      if (c !== 9) antwoorden[st.id] = c - 2;
    }
    const dubbel = [];
    for (let i = 0; i + 2 <= zwaar.length; i += 2) { const st = data.stellingen[parseInt(zwaar.slice(i, i + 2), 36)]; if (st) dubbel.push(st.id); }
    const themas = [...new Set(ids.map((id) => S()[id].thema))];
    return { lijsten: lijsten.split('-').map((x) => opNr[x]).filter(Boolean), themas, set: ids, antwoorden, zwaar: dubbel, i: 0, stap: 'uitslag' };
  } catch { return null; }
}

function maakSet() {
  const perThema = DIEPTES[staat.diepte].perThema;
  const volgorde = data.themas.map((t) => t.id).filter((t) => staat.themas.includes(t));
  const set = kiesStellingen(data.stellingen, staat.lijsten, volgorde, perThema).map((s) => s.id);
  if (JSON.stringify(set) !== JSON.stringify(staat.set)) {
    staat.set = set;
    staat.i = 0;
    // antwoorden op stellingen die er nog in zitten blijven staan
  }
}

// Voor de bezoektelling: aantallen, en bij de uitslag welke drie partijen bovenaan staan. Nooit de antwoorden zelf.
function meld(stap) {
  const aantal = (x) => (Array.isArray(x) ? x.length : Object.keys(x || {}).length);
  const props = { lijsten: aantal(staat.lijsten) };
  if (stap !== 'themas') { props.themas = aantal(staat.themas); props.stellingen = aantal(staat.set); }
  if (stap === 'uitslag') {
    props.beantwoord = Object.values(staat.antwoorden || {}).filter((v) => v !== null && v !== undefined).length;
    if (props.beantwoord) {
      const pm = P();
      bereken(setStellingen(), staat.lijsten, staat.antwoorden, staat.zwaar).filter((u) => u.score !== null).slice(0, 3)
        .forEach((u, i) => { props[['nummer1', 'nummer2', 'nummer3'][i]] = pm[u.slug].kort; });
    }
  }
  window.meet?.({ themas: 'Stemwijzer: lijsten gekozen', stellingen: 'Stemwijzer: gestart', uitslag: 'Stemwijzer: uitslag' }[stap] || 'Stemwijzer: terug naar lijsten', props);
}

function ga(stap) {
  if (stap !== staat.stap) meld(stap);
  staat.stap = stap;
  bewaar();
  history.replaceState(null, '', stap === 'lijsten' ? location.pathname : '#' + stap);
  teken();
  app.scrollIntoView({ block: 'start' });
}

function stappenbalk() {
  const nu = STAPPEN.findIndex(([id]) => id === staat.stap);
  return `<ol class="stappen">${STAPPEN.map(([id, naam], i) => `<li ${i === nu ? 'aria-current="step"' : ''} class="${i < nu ? 'klaar' : ''}">${i < nu ? `<button type="button" data-ga="${id}">${i + 1}. ${naam}</button>` : `${i + 1}. ${naam}`}</li>`).join('')}</ol>`;
}

// --- stap 1: partijen ---
function tekenLijsten() {
  app.innerHTML = `${stappenbalk()}
<h1>Welke partijen overweeg je?</h1>
<p>Kleur de partijen waar je tussen twijfelt. Je wordt alleen met deze partijen vergeleken, en je krijgt de stellingen waarop juist zij verschillen. Twee partijen is genoeg.</p>
<div class="biljet">
  <div class="biljet__kop"><span>Partijen op het stembiljet</span><span><button type="button" data-alles>Kleur alles</button> <button type="button" data-wis>Wis</button></span></div>
  <ul class="biljet__lijst">${data.partijen.map((p) => `<li><label><input type="checkbox" value="${p.slug}" ${staat.lijsten.includes(p.slug) ? 'checked' : ''}><span class="vakje" aria-hidden="true"></span><span class="biljet__nr">${p.nr}</span><span class="biljet__naam">${e(p.kort)}</span></label></li>`).join('')}</ul>
  <div class="biljet__voet"><span class="grijs" data-telling></span><button class="knop" type="button" data-verder>Verder naar thema's</button></div>
</div>
<p class="klein" style="margin-top:1rem">Wil je eerst weten wat een partij wil? <a href="/lijsten/">Bekijk alle partijen</a>.</p>`;
  const vakjes = [...app.querySelectorAll('input[type=checkbox]')];
  const werkBij = () => {
    staat.lijsten = vakjes.filter((v) => v.checked).map((v) => v.value);
    bewaar();
    const n = staat.lijsten.length;
    app.querySelector('[data-telling]').textContent = n === 0 ? 'Nog geen partij gekleurd' : n === 1 ? '1 partij gekleurd: kies er minstens twee' : `${n} partijen gekleurd`;
    app.querySelector('[data-verder]').disabled = n < 2;
  };
  app.querySelector('.biljet').addEventListener('change', werkBij);
  app.querySelector('[data-alles]').onclick = () => { vakjes.forEach((v) => (v.checked = true)); werkBij(); };
  app.querySelector('[data-wis]').onclick = () => { vakjes.forEach((v) => (v.checked = false)); werkBij(); };
  app.querySelector('[data-verder]').onclick = () => ga('themas');
  werkBij();
}

// --- stap 2: thema's ---
function tekenThemas() {
  const aantal = Object.fromEntries(data.themas.map((t) => [t.id, data.stellingen.filter((s) => s.thema === t.id && onderscheid(s, staat.lijsten) > 0).length]));
  staat.themas = staat.themas.filter((t) => aantal[t] > 0);
  const namen = gekozenPartijen().map((p) => p.kort);
  app.innerHTML = `${stappenbalk()}
<h1>Wat vind jij belangrijk?</h1>
<p>Kies de thema's waarop je wilt doorvragen. Bij elk thema staat op hoeveel stellingen ${namen.length <= 3 ? e(namen.join(namen.length === 2 ? ' en ' : ', ')) : `jouw ${namen.length} partijen`} van elkaar verschillen.</p>
<p><button class="knop knop--tekst" type="button" data-alles>Kies alle thema's</button></p>
<ul class="themas">${data.themas.map((t) => `<li><label class="${aantal[t.id] ? '' : 'leeg'}"><input type="checkbox" value="${t.id}" ${staat.themas.includes(t.id) ? 'checked' : ''} ${aantal[t.id] ? '' : 'disabled'}><span class="vakje" aria-hidden="true"></span><b>${e(t.naam)}</b><span class="oms">${e(t.omschrijving)}</span><span class="aantal">${aantal[t.id] ? `${aantal[t.id]} ${aantal[t.id] === 1 ? 'stelling' : 'stellingen'} met verschil` : 'Hierop verschillen deze partijen niet'}</span></label></li>`).join('')}</ul>
<fieldset class="diepte"><legend>Hoe diep wil je gaan?</legend>
${Object.entries(DIEPTES).map(([id, d]) => `<label><input type="radio" name="diepte" value="${id}" ${staat.diepte === id ? 'checked' : ''}><b>${d.label}</b><span class="grijs" data-tel="${id}"></span></label>`).join('')}
</fieldset>
<p class="melding" data-veel hidden>Dat zijn veel stellingen. Je kunt tussendoor stoppen en later verdergaan: je antwoorden blijven in deze browser staan. Minder thema's of “Kort” kiezen kan ook.</p>
<div class="rij rij--tussen"><button class="knop knop--licht" type="button" data-ga="lijsten">Terug naar partijen</button><button class="knop" type="button" data-verder>Begin met de stellingen</button></div>`;
  const vakjes = [...app.querySelectorAll('.themas input')];
  const werkBij = () => {
    staat.themas = vakjes.filter((v) => v.checked).map((v) => v.value);
    staat.diepte = app.querySelector('input[name=diepte]:checked').value;
    bewaar();
    for (const [id, d] of Object.entries(DIEPTES)) {
      const tot = staat.themas.reduce((s, t) => s + Math.min(d.perThema, aantal[t]), 0);
      app.querySelector(`[data-tel="${id}"]`).textContent = staat.themas.length ? `${tot} ${tot === 1 ? 'stelling' : 'stellingen'}, ongeveer ${Math.max(1, Math.round(tot * 0.4))} min` : `tot ${d.perThema} per thema`;
    }
    const knop = app.querySelector('[data-verder]');
    knop.disabled = staat.themas.length === 0;
    const nu = staat.themas.reduce((t, th) => t + Math.min(DIEPTES[staat.diepte].perThema, aantal[th]), 0);
    app.querySelector('[data-veel]').hidden = nu <= 45;
  };
  app.querySelector('.themas').addEventListener('change', werkBij);
  app.querySelector('.diepte').addEventListener('change', werkBij);
  app.querySelector('[data-alles]').onclick = () => { vakjes.forEach((v) => { if (!v.disabled) v.checked = true; }); werkBij(); };
  app.querySelector('[data-verder]').onclick = () => { maakSet(); ga('stellingen'); };
  werkBij();
}

// --- stap 3: stellingen ---
function tekenStelling() {
  const set = setStellingen();
  if (!set.length) return ga('themas');
  staat.i = Math.max(0, Math.min(staat.i, set.length - 1));
  const st = set[staat.i];
  const thema = data.themas.find((t) => t.id === st.thema);
  const a = staat.antwoorden[st.id];
  app.innerHTML = `${stappenbalk()}
<article class="stelling" aria-live="polite">
  <div class="stelling__meta"><span>${e(thema.naam)}</span><span>${staat.i + 1} van ${set.length}</span></div>
  <div class="voortgang"><i style="width:${((staat.i) / set.length) * 100}%"></i></div>
  <div class="stelling__lijf">
    <p class="stelling__kop">${e(st.kop || '')}</p>
    <h1 class="stelling__tekst">${e(st.stelling)}</h1>
    <details class="uitleg"><summary>Wat houdt dit in?</summary>
      <p>${e(st.uitleg || '')}</p>
      <div class="voortegen"><div><b>Voorstanders zeggen</b>${e(st.voor || '')}</div><div><b>Tegenstanders zeggen</b>${e(st.tegen || '')}</div></div>
    </details>
    <div class="antwoorden" role="group" aria-label="Jouw antwoord">
      ${SCHAAL.map((v) => `<button type="button" data-antwoord="${v}" aria-pressed="${a === v}"><span class="vakje" aria-hidden="true"></span>${ANTWOORD[v]}</button>`).join('')}
    </div>
    <div class="lijstenblik">
      <button class="knop knop--tekst" type="button" data-blik aria-expanded="false">Wat vinden de partijen?</button>
      <div data-blik-inhoud hidden></div>
    </div>
  </div>
  <div class="stelling__voet">
    <button class="knop knop--tekst" type="button" data-vorige>${staat.i === 0 ? "Terug naar thema's" : 'Vorige stelling'}</button>
    <label class="zwaar"><input type="checkbox" data-zwaar ${staat.zwaar.includes(st.id) ? 'checked' : ''}> Dit vind ik extra belangrijk</label>
    <button class="knop knop--tekst" type="button" data-sla>${a === undefined ? 'Sla over' : 'Volgende'}</button>
  </div>
</article>`;
  // Standpunten van de partijen bij deze stelling: eerst de eigen keuze, op verzoek alle partijen.
  const blikKnop = app.querySelector('[data-blik]');
  blikKnop?.addEventListener('click', () => { if (blikKnop.getAttribute('aria-expanded') !== 'true') window.meet?.('Stemwijzer: wat vinden de lijsten'); });
  const blik = app.querySelector('[data-blik-inhoud]');
  const tekenBlik = (alle) => {
    const lijsten = alle ? data.partijen : gekozenPartijen();
    const metStandpunt = lijsten.filter((p) => pos(st, p.slug) !== null).sort((x, y) => pos(st, y.slug) - pos(st, x.slug) || x.nr - y.nr);
    const kanMeer = gekozenPartijen().length < data.partijen.length;
    blik.innerHTML = `<p class="klein">${alle ? `Alle ${data.partijen.length} partijen.` : `De ${lijsten.length} partijen die je hebt gekozen.`} ${kanMeer ? `<button class="knop knop--tekst" type="button" data-blik-wissel>${alle ? 'Toon alleen mijn partijen' : `Toon alle ${data.partijen.length} partijen`}</button>` : ''}</p>
${spectrumHtml(st, partijen, staat.antwoorden[st.id])}
${metStandpunt.map((p) => standpuntHtml(st, p)).join('')}`;
    const wissel = blik.querySelector('[data-blik-wissel]');
    if (wissel) wissel.onclick = () => tekenBlik(!alle);
  };
  blikKnop.onclick = () => {
    const open = blik.hidden;
    blik.hidden = !open;
    blikKnop.setAttribute('aria-expanded', open);
    blikKnop.textContent = open ? 'Verberg de standpunten' : 'Wat vinden de partijen?';
    if (open) tekenBlik(false);
  };
  const volgende = () => { if (staat.i >= set.length - 1) return ga('uitslag'); staat.i++; bewaar(); tekenStelling(); };
  app.querySelectorAll('[data-antwoord]').forEach((b) => (b.onclick = () => {
    staat.antwoorden[st.id] = +b.dataset.antwoord;
    app.querySelectorAll('[data-antwoord]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    bewaar();
    if (blik.hidden) setTimeout(volgende, 180);
    else { tekenBlik(blik.querySelector('[data-blik-wissel]')?.textContent.startsWith('Toon alleen') || false); app.querySelector('[data-sla]').textContent = 'Volgende'; }
  }));
  app.querySelector('[data-sla]').onclick = volgende;
  app.querySelector('[data-vorige]').onclick = () => { if (staat.i === 0) return ga('themas'); staat.i--; bewaar(); tekenStelling(); };
  app.querySelector('[data-zwaar]').onchange = (ev) => {
    staat.zwaar = ev.target.checked ? [...new Set([...staat.zwaar, st.id])] : staat.zwaar.filter((x) => x !== st.id);
    bewaar();
  };
}

// --- stap 4: uitslag ---
function tekenUitslag() {
  const set = setStellingen();
  const partijen = gekozenPartijen();
  const pm = P();
  const beantwoord = set.filter((s) => s.id in staat.antwoorden);
  if (!set.length) return ga('themas');
  if (!beantwoord.length) {
    app.innerHTML = `${stappenbalk()}<h1>Nog geen uitslag</h1><p>Je hebt alle stellingen overgeslagen. Beantwoord er een paar, dan kunnen we je met de partijen vergelijken.</p><p><button class="knop" type="button" data-ga="stellingen">Terug naar de stellingen</button></p>`;
    return;
  }
  const uit = bereken(set, staat.lijsten, staat.antwoorden, staat.zwaar);
  const top = uit[0].score;
  const gelijk = uit.filter((u) => Math.abs(u.score - top) < 0.005);
  const themaIds = data.themas.map((t) => t.id).filter((t) => set.some((s) => s.thema === t));
  const kop = gelijk.length > 1 ? `${gelijk.map((u) => pm[u.slug].kort).join(' en ')} staan even dicht bij je` : `${pm[uit[0].slug].kort} staat het dichtst bij je`;
  const verschil = uit.length > 1 ? Math.round((uit[0].score - uit[1].score) * 100) : null;
  app.innerHTML = `${stappenbalk()}
<h1>${e(kop)}</h1>
<p>Gebaseerd op ${beantwoord.length} ${beantwoord.length === 1 ? 'stelling' : 'stellingen'} die je hebt beantwoord, vergeleken met de ${partijen.length} partijen die je hebt gekozen.${staat.zwaar.length ? ` ${staat.zwaar.filter((id) => id in staat.antwoorden).length} daarvan tellen dubbel.` : ''}</p>
${verschil !== null && verschil <= 3 && gelijk.length === 1 ? `<div class="melding"><p>Het verschil tussen de eerste twee is klein (${verschil} ${verschil === 1 ? 'procentpunt' : 'procentpunten'}). Kijk hieronder op welke stellingen ze uit elkaar gaan voordat je er iets uit afleidt.</p></div>` : ''}
<ol class="uitslag">${uit.map((u, i) => {
    const p = pm[u.slug];
    const pct = procent(u.score);
    return `<li class="${Math.abs(u.score - top) < 0.005 ? 'top' : ''}"><span class="uitslag__nr">${p.nr}</span><span class="uitslag__naam"><a href="/lijsten/${p.slug}/">${e(p.naam)}</a></span><span class="uitslag__pct">${pct}%</span><span class="uitslag__balk"><i style="width:${pct}%;background:${p.kleur}"></i></span>${u.bekend < u.beantwoord ? `<span class="uitslag__noot">Van ${u.bekend} van jouw ${u.beantwoord} stellingen is een standpunt bekend${u.bekend < u.beantwoord / 2 ? '. Deze score zegt daardoor weinig' : ''}.</span>` : ''}</li>`;
  }).join('')}</ol>
<p class="klein">Het percentage zegt hoe dicht jullie posities bij elkaar liggen: 100% is overal dezelfde positie, 0% overal zo ver mogelijk van je af. Een stelling waarover een partij geen standpunt heeft, telt voor die partij neutraal. <a href="/verantwoording/#rekenen">Zo wordt het berekend</a>. Dit is een hulpmiddel om verschillen te zien, geen stemadvies.</p>
<div class="rij" style="margin:1.2rem 0 0"><button class="knop knop--licht" type="button" data-deel>Kopieer link naar deze uitslag</button><button class="knop knop--licht" type="button" data-ga="lijsten">Andere partijen of thema's</button><button class="knop knop--tekst" type="button" data-opnieuw>Begin opnieuw</button></div>

${themaIds.length > 1 ? `<h2>Per thema</h2>
<div class="tabel-wrap"><table><thead><tr><th>Partij</th>${themaIds.map((t) => `<th class="num">${e(data.themas.find((x) => x.id === t).kort)}</th>`).join('')}</tr></thead><tbody>
${uit.map((u) => `<tr><th>${e(pm[u.slug].kort)}</th>${themaIds.map((t) => { const x = u.themas[t]; return `<td class="num">${x && x.score !== null ? procent(x.score) + '%' : '–'}</td>`; }).join('')}</tr>`).join('')}
</tbody></table></div>` : ''}

<h2>Stelling voor stelling</h2>
<p>Klik een stelling open om te zien waar elke partij staat, met toelichting en bron.</p>
${themaIds.map((t) => `<h3 class="themakop">${e(data.themas.find((x) => x.id === t).naam)}</h3><ul class="punten">${set.filter((s) => s.thema === t).map((st) => {
    const a = staat.antwoorden[st.id];
    const eens = a === undefined ? [] : partijen.filter((p) => { const v = pos(st, p.slug); return v !== null && Math.abs(v - a) <= 1 && (a === 0 || Math.sign(v) === Math.sign(a) || v === 0 && Math.abs(a) === 1); });
    return `<li><details><summary><span class="st">${e(st.stelling)}</span><span class="sub">${a === undefined ? 'Overgeslagen' : `Jij: ${ANTWOORD[a].toLowerCase()}`}${staat.zwaar.includes(st.id) ? ' (telt dubbel)' : ''}${a !== undefined ? ` · Dicht bij jou: ${eens.length ? eens.map((p) => e(p.kort)).join(', ') : 'geen van je partijen'}` : ''}</span></summary><div class="inhoud">${spectrumHtml(st, partijen, a)}${partijen.filter((p) => pos(st, p.slug) !== null).sort((x, y) => pos(st, y.slug) - pos(st, x.slug)).map((p) => standpuntHtml(st, p)).join('')}</div></details></li>`;
  }).join('')}</ul>`).join('')}`;
  app.querySelector('[data-deel]').onclick = async (ev) => {
    window.meet?.('Stemwijzer: link gekopieerd');
    const url = `${location.origin}${location.pathname}#u=${codeer()}`;
    let veld = app.querySelector('[data-deelveld]');
    if (!veld) {
      veld = document.createElement('input');
      veld.readOnly = true;
      veld.dataset.deelveld = '';
      veld.setAttribute('aria-label', 'Link naar deze uitslag');
      veld.style.cssText = 'display:block;width:100%;max-width:44rem;margin:0.8rem 0 0;font:inherit;padding:0.6rem 0.7rem;border:2px solid var(--inkt)';
      ev.target.closest('.rij').after(veld);
    }
    veld.value = url;
    veld.select();
    try { await navigator.clipboard.writeText(url); ev.target.textContent = 'Link gekopieerd'; } catch { ev.target.textContent = 'Kopieer de link hieronder'; }
  };
  app.querySelector('[data-opnieuw]').onclick = () => {
    staat = { lijsten: [], themas: [], diepte: 'normaal', antwoorden: {}, zwaar: [], set: null, i: 0, stap: 'lijsten' };
    ga('lijsten');
  };
}

function teken() {
  if (staat.stap !== 'lijsten' && staat.lijsten.length < 2) staat.stap = 'lijsten';
  if ((staat.stap === 'stellingen' || staat.stap === 'uitslag') && !(staat.set || []).length) staat.stap = staat.lijsten.length >= 2 ? 'themas' : 'lijsten';
  ({ lijsten: tekenLijsten, themas: tekenThemas, stellingen: tekenStelling, uitslag: tekenUitslag })[staat.stap]();
}

window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (STAPPEN.some(([id]) => id === h) && h !== staat.stap) { staat.stap = h; bewaar(); teken(); }
});

app.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ga]');
  if (b) ga(b.dataset.ga);
});

try {
  data = await laadData();
  const geldig = new Set(data.partijen.map((p) => p.slug));
  const h = location.hash.slice(1);
  if (h.startsWith('u=')) {
    const gedeeld = decodeer(h.slice(2));
    if (gedeeld && gedeeld.verouderd) verouderd = true;
    else if (gedeeld) staat = Object.assign(staat, gedeeld);
  } else if (STAPPEN.some(([id]) => id === h)) {
    staat.stap = h;
  }
  staat.lijsten = (staat.lijsten || []).filter((s) => geldig.has(s));
  const ids = new Set(data.stellingen.map((s) => s.id));
  if (staat.set) staat.set = staat.set.filter((id) => ids.has(id));
  teken();
  if (verouderd) app.insertAdjacentHTML('afterbegin', '<div class="melding"><p>Deze link hoort bij een eerdere versie van de stellingen en werkt niet meer. Je kunt de stemwijzer opnieuw doen.</p></div>');
} catch (err) {
  app.innerHTML = `<h1>De stemwijzer laadt niet</h1><p>${e(err.message)} Laad de pagina opnieuw. Blijft het misgaan, dan kun je de standpunten ook <a href="/lijsten/">per partij lezen</a>.</p>`;
}
