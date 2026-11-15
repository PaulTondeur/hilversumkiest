// De lijst van stembureaus met zoeken, en de koppeling met de kaart erboven.

const zoek = document.getElementById('zoek');
const plaats = document.getElementById('plaats');
const items = [...document.querySelectorAll('#bureaus li')];
const vak = document.getElementById('kaartvak');
const kaartje = document.getElementById('kaartkaartje');
const melding = document.getElementById('kaartmelding');
let kaart = null;

function filter() {
  const q = zoek.value.trim().toLowerCase();
  const pl = plaats.value;
  const zichtbaar = new Set();
  for (const li of items) {
    li.hidden = !((!q || li.dataset.zoek.includes(q)) && (!pl || li.dataset.plaats === pl));
    if (!li.hidden) zichtbaar.add(+li.dataset.nr);
  }
  kaart?.filter(zichtbaar);
}
zoek.addEventListener('input', filter);
plaats.addEventListener('change', filter);

let wisTimer = 0;
function meld(tekst) {
  melding.textContent = tekst;
  melding.hidden = false;
  clearTimeout(wisTimer);
  wisTimer = setTimeout(() => { melding.hidden = true; }, 6000);
}

// Het kaartje bij een gekozen potlood: dezelfde regels als in de partij.
function toonKaartje(nrs) {
  for (const li of items) li.classList.toggle('gekozen', !!nrs && nrs.includes(+li.dataset.nr));
  kaartje.hidden = !nrs;
  if (!nrs) return;
  window.meet?.('Stembureau bekeken', { stembureau: items.find((x) => +x.dataset.nr === nrs[0])?.querySelector('b').textContent || '' });
  kaartje.replaceChildren();
  for (const nr of nrs) {
    const li = items.find((x) => +x.dataset.nr === nr);
    const deel = document.createElement('div');
    for (const kind of li.children) if (kind.tagName !== 'BUTTON') deel.append(kind.cloneNode(true));
    if (li.dataset.lat) {
      const a = document.createElement('a');
      a.href = `https://www.openstreetmap.org/?mlat=${li.dataset.lat}&mlon=${li.dataset.lon}#map=18/${li.dataset.lat}/${li.dataset.lon}`;
      a.rel = 'noopener';
      a.textContent = 'Open in OpenStreetMap';
      deel.append(a);
    }
    kaartje.append(deel);
  }
  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.className = 'sluit';
  sluit.setAttribute('aria-label', 'Sluit');
  sluit.textContent = '×';
  sluit.onclick = () => kaart.sluit();
  kaartje.append(sluit);
}

// Breedte en lengte naar het rijksdriehoeksnet (benadering, op een meter nauwkeurig: genoeg voor een stip).
function naarRd(lat, lon) {
  const p = 0.36 * (lat - 52.1551744), l = 0.36 * (lon - 5.38720621);
  const x = 155000 + 190094.945 * l - 11832.228 * p * l - 114.221 * p * p * l - 32.391 * l ** 3 - 0.705 * p - 2.34 * p ** 3 * l - 0.608 * p * l ** 3;
  const y = 463000 + 309056.544 * p + 3638.893 * l * l + 73.077 * p * p - 157.984 * p * l * l + 59.788 * p ** 3 + 0.433 * l - 6.439 * p * p * l * l;
  return [x, y];
}

try {
  const { maakKaart } = await import('./kaart3d.js');
  kaart = await maakKaart(vak, { opKies: toonKaartje });
  kaart.namen(items.map((li) => li.querySelector('b').textContent));
  const wissel = [...vak.querySelectorAll('[data-weergave]')];
  for (const knop of wissel) {
    knop.addEventListener('click', () => {
      const plat = knop.dataset.weergave === 'plat';
      kaart.weergave(plat);
      window.meet?.('Kaart: weergave', { weergave: plat ? 'plat' : '3D' });
      vak.classList.toggle('kaartvak--plat', plat);
      for (const k of wissel) k.setAttribute('aria-pressed', String(k === knop));
    });
  }
  for (const knop of vak.querySelectorAll('[data-kaart]')) {
    knop.addEventListener('click', () => {
      if (knop.dataset.kaart !== 'hier') return kaart.acties[knop.dataset.kaart]();
      window.meet?.('Kaart: waar ben ik');
      if (!navigator.geolocation) return meld('Deze browser kan je plek niet bepalen.');
      navigator.geolocation.getCurrentPosition(
        (p) => { if (!kaart.hier(...naarRd(p.coords.latitude, p.coords.longitude))) meld('Je bent nu buiten de gemeente.'); },
        () => meld('Je plek is niet beschikbaar. Je kunt ook zoeken op straat of plaats.'),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }
  for (const li of items) {
    li.querySelector('.opkaart')?.addEventListener('click', () => {
      if (kaart.toon(+li.dataset.nr)) vak.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }
  filter();
  if (location.search.includes('kaartmeet')) window.kaart = kaart;
} catch (fout) {
  console.warn(fout);
  vak.classList.add('kaartvak--fout');
  melding.textContent = 'De kaart werkt niet in deze browser. De lijst hieronder bevat alle stembureaus.';
  melding.hidden = false;
  for (const knop of document.querySelectorAll('.opkaart')) knop.hidden = true;
}
