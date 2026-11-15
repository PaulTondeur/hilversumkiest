import { onderscheid, partijAfstand } from './engine.mjs';
import { e, POS, laadData, laadStaat, bewaarStaat, standpuntHtml, spectrumHtml, pos } from './deel.js';

const MAX = 6; // zoveel partijen kun je naast elkaar leggen

const el = document.getElementById('vergelijk');
const data = await laadData();
const P = Object.fromEntries(data.partijen.map((p) => [p.slug, p]));
const q = new URLSearchParams(location.search);
let keuze = [...'abcdef'].map((k) => q.get(k)).filter((s) => P[s]).slice(0, MAX);

function teken() {
  const partijen = keuze.map((s) => P[s]);
  const kiezers = Array.from({ length: Math.min(MAX, Math.max(keuze.length + 1, 3)) }, (_, i) => i).map((i) => `<select class="keuze" data-i="${i}" aria-label="Partij ${i + 1}"><option value="">${i < 2 ? 'Kies een partij' : 'Nog een partij (mag)'}</option>${data.partijen.map((p) => `<option value="${p.slug}" ${keuze[i] === p.slug ? 'selected' : ''} ${keuze.includes(p.slug) && keuze[i] !== p.slug ? 'disabled' : ''}>${p.nr}. ${e(p.kort)}</option>`).join('')}</select>`).join('');
  let uit = `<div class="zoek">${kiezers}</div>`;
  if (partijen.length >= 2) {
    const slugs = keuze;
    const paren = [];
    for (let i = 0; i < slugs.length; i++) for (let j = i + 1; j < slugs.length; j++) paren.push([slugs[i], slugs[j], partijAfstand(data.stellingen, slugs[i], slugs[j])]);
    uit += `<div class="melding">${paren.map(([a, b, d]) => `<p><strong>${e(P[a].kort)} en ${e(P[b].kort)}</strong>: ${d.afstand === null ? 'te weinig standpunten om te vergelijken' : `${Math.round((1 - d.afstand) * 100)}% overeenkomst op de ${d.n} stellingen waar beide een standpunt hebben`}.</p>`).join('')}</div>`;
    const met = data.stellingen.map((st) => ({ st, d: onderscheid(st, slugs) }));
    const verschil = met.filter((x) => x.d > 0).sort((x, y) => y.d - x.d);
    const gelijk = met.filter((x) => x.d === 0 && slugs.filter((s) => pos(x.st, s) !== null).length >= 2);
    const blok = (x) => `<li><details><summary><span class="st">${e(x.st.stelling)}</span><span class="sub">${e(data.themas.find((t) => t.id === x.st.thema).kort)} · ${partijen.map((p) => `${e(p.kort)}: ${POS[pos(x.st, p.slug)].toLowerCase()}`).join(' · ')}</span></summary><div class="inhoud">${x.st.uitleg ? `<p class="grijs">${e(x.st.uitleg)}</p>` : ''}${spectrumHtml(x.st, partijen)}${partijen.map((p) => standpuntHtml(x.st, p)).join('')}</div></details></li>`;
    uit += `<h2>Hier verschillen ze (${verschil.length})</h2><p>Gesorteerd van groot naar klein verschil.</p><ul class="punten">${verschil.map(blok).join('')}</ul>`;
    uit += `<h2>Hier staan ze op dezelfde plek (${gelijk.length})</h2><ul class="punten">${gelijk.map(blok).join('')}</ul>`;
    uit += `<p style="margin-top:2rem"><button class="knop" type="button" data-stemwijzer>Doe de stemwijzer met deze ${slugs.length} partijen</button></p>`;
  } else {
    uit += `<p class="grijs">Kies minstens twee partijen.</p>`;
  }
  el.innerHTML = uit;
  // Met precies deze partijen de stemwijzer in: de keuze gaat mee, je begint bij de thema's.
  const start = el.querySelector('[data-stemwijzer]');
  if (start) start.onclick = () => {
    window.meet?.('Vergelijking: naar stemwijzer', { lijsten: keuze.length });
    bewaarStaat({ ...laadStaat(), lijsten: [...keuze], set: null, i: 0, stap: 'themas' });
    location.href = new URL('../stemwijzer/#themas', location.href).href;
  };
  el.querySelectorAll('select').forEach((s) => (s.onchange = () => {
    const nieuw = [...el.querySelectorAll('select')].map((x) => x.value).filter(Boolean);
    kies([...new Set(nieuw)]);
  }));
  // De stippen in de kaart laten zien wie er gekozen is.
  for (const a of stippen) { const aan = keuze.includes(a.dataset.slug); a.classList.toggle('gekozen', aan); a.setAttribute('aria-pressed', String(aan)); }
  stand.innerHTML = keuze.length
    ? `Gekozen: ${keuze.map((s) => e(P[s].kort)).join(', ')}. ${keuze.length >= 2 ? '<a href="#naast-elkaar">Bekijk de vergelijking</a>' : 'Kies er nog minstens een bij.'}`
    : 'Nog geen partij gekozen.';
}

function kies(nieuw) {
  if (nieuw.length >= 2 && nieuw.join() !== keuze.join()) window.meet?.('Vergelijking', { lijsten: nieuw.length });
  keuze = nieuw;
  const p = new URLSearchParams();
  keuze.forEach((s, i) => p.set('abcdef'[i], s));
  history.replaceState(null, '', keuze.length ? '?' + p.toString() : location.pathname);
  teken();
}

// Kiezen in de kaart: een tik zet een partij erbij of haalt haar weg; bij een vijfde vervalt de oudste.
const stippen = [...document.querySelectorAll('.landschap a[data-slug]')];
const stand = document.createElement('p');
stand.className = 'landschap__stand';
stand.setAttribute('aria-live', 'polite');
document.querySelector('.landschap')?.after(stand);
for (const a of stippen) {
  a.setAttribute('role', 'button');
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    const s = a.dataset.slug;
    kies(keuze.includes(s) ? keuze.filter((x) => x !== s) : [...keuze, s].slice(-MAX));
  });
}
teken();
