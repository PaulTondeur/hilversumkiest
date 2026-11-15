// Eindcontrole neutraliteit: de huidige rekenwijze naast drie alternatieven, met dezelfde kiezers.
//   node werk/audit/eindcontrole/varianten.mjs [--snel]   → werk/audit/eindcontrole/varianten.json
// Vraag: hoe sterk hangt de uitslag af van het aantal standpunten dat van een partij bekend is, en kan dat anders?
import fs from 'node:fs';
import { bereken, positie, overeenkomst, kiesStellingen, DIEPTES } from '../../../src/engine.mjs';

const W = new URL('../../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json').map((t) => t.id);
const bank = lees('data/stellingen.json');
const slugs = partijen.map((p) => p.slug);
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const SNEL = process.argv.includes('--snel');
const N = (n) => (SNEL ? Math.ceil(n / 10) : n);
const SCHAAL = [-2, -1, 0, 1, 2];
let zaad = 151120261;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const kies = (a) => a[Math.floor(rnd() * a.length)];
const schud = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normaal = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const gem = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const corr = (a, b) => { const ma = gem(a), mb = gem(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
const r2 = (x) => Math.round(x * 100) / 100;
const stGem = bank.map((st) => { const k = slugs.map((s) => positie(st, s)).filter((v) => v !== null); return k.length ? gem(k) : 0; });
const idx = new Map(bank.map((st, i) => [st.id, i]));

const LAAG = Object.fromEntries(SCHAAL.map((a) => [a, Math.min(...SCHAAL.map((p) => overeenkomst(a, p)))]));
const HOOG = Object.fromEntries(SCHAAL.map((a) => [a, Math.max(...SCHAAL.map((p) => overeenkomst(a, p)))]));
// Rekenwijzen. Elke geeft [{slug, score}] gesorteerd, hoogste eerst; gelijke stand → volgorde van het stembiljet.
const sorteer = (l) => l.sort((x, y) => y.score - x.score || slugs.indexOf(x.slug) - slugs.indexOf(y.slug));
const WIJZEN = {
  // zoals de site nu rekent (src/engine.mjs)
  site: (set, mee, a) => bereken(set, mee, a),
  // zelfde gestandaardiseerde maat, maar een stelling zonder standpunt telt voor die partij niet mee (teller én noemer)
  zBekend: (set, mee, a) => sorteer(mee.map((s) => {
    let t = 0, n = 0;
    for (const st of set) { const x = a[st.id]; if (x === undefined) continue; const p = positie(st, s); if (p === null) continue; t += overeenkomst(x, p) - LAAG[x]; n += HOOG[x] - LAAG[x]; }
    return { slug: s, score: n ? t / n : 0 };
  })),
  // als zBekend, maar met krimp: elke partij krijgt er 3 'gemiddelde' stellingen bij (score 0,5), zodat weinig standpunten niet tot een uitschieter leiden
  zKrimp: (set, mee, a) => sorteer(mee.map((s) => {
    let t = 0, n = 0;
    for (const st of set) { const x = a[st.id]; if (x === undefined) continue; const p = positie(st, s); if (p === null) continue; t += (overeenkomst(x, p) - LAAG[x]) / (HOOG[x] - LAAG[x]); n++; }
    return { slug: s, score: (t + 3 * 0.5) / (n + 3) };
  })),
  // gewone afstand, alleen bekende standpunten
  afstandBekend: (set, mee, a) => sorteer(mee.map((s) => {
    let t = 0, n = 0;
    for (const st of set) { const x = a[st.id]; if (x === undefined) continue; const p = positie(st, s); if (p === null) continue; t += 1 - Math.abs(x - p) / 4; n++; }
    return { slug: s, score: n ? t / n : 0 };
  })),
};

function mengkiezer(set, a, b, w, ruis = 0.8, overslaan = 0.15) {
  const uit = {};
  for (const st of set) {
    if (rnd() < overslaan) continue;
    const pa = positie(st, a), pb = positie(st, b), g = stGem[idx.get(st.id)];
    const x = w * (pa ?? pb ?? g) + (1 - w) * (pb ?? pa ?? g) + ruis * normaal();
    uit[st.id] = Math.max(-2, Math.min(2, Math.round(x)));
  }
  return uit;
}
const willekeurig = (set) => { const a = {}; for (const st of set) if (rnd() >= 0.1) a[st.id] = kies(SCHAAL); return a; };
const aandeel = (uit, s) => { const t = uit.filter((u) => u.score > uit[0].score - 1e-9); return t.some((u) => u.slug === s) ? 1 / t.length : 0; };
function maskeer(slug, deel) {
  const weg = new Set(schud(bank.filter((st) => positie(st, slug) !== null)).slice(0, Math.round(bank.filter((st) => positie(st, slug) !== null).length * deel)).map((st) => st.id));
  return bank.map((st) => (weg.has(st.id) ? { ...st, posities: { ...st.posities, [slug]: { s: null } } } : st));
}

// dezelfde kiezers voor alle rekenwijzen
const kiezersW = Array.from({ length: N(10000) }, () => willekeurig(bank));
const kiezersM = Array.from({ length: N(10000) }, () => { const [a, b] = schud(slugs).slice(0, 2); return { a, k: mengkiezer(bank, a, b, 0.5 + 0.5 * rnd()) }; });
const maskers = slugs.map((s) => ({ s, sets: Array.from({ length: SNEL ? 1 : 4 }, () => maskeer(s, 0.3)), kiezers: Array.from({ length: N(1500) }, (_, i) => { const eigen = i % 10 === 0; const [a, b] = eigen ? [s, kies(slugs.filter((x) => x !== s))] : schud(slugs).slice(0, 2); return { eigen, k: mengkiezer(bank, a, b, 0.5 + 0.5 * rnd()) }; }) }));
const vast = SCHAAL.map((v) => Object.fromEntries(bank.map((st) => [st.id, v])));
const bekend = slugs.map((s) => bank.filter((st) => positie(st, s) !== null).length);

const uitkomst = {};
for (const [naam, f] of Object.entries(WIJZEN)) {
  const wTop = slugs.map((s) => gem(kiezersW.map((k) => aandeel(f(bank, slugs, k), s))));
  const mTop = slugs.map((s) => gem(kiezersM.map((k) => aandeel(f(bank, slugs, k.k), s))));
  const herk = slugs.map((s) => { const l = kiezersM.filter((k) => k.a === s); return gem(l.map((k) => aandeel(f(bank, slugs, k.k), s))); });
  const msk = maskers.map(({ s, sets, kiezers }) => {
    let av = 0, an = 0, ev = 0, en = 0, na = 0, ne = 0;
    for (const set of sets) for (const { eigen, k } of kiezers) {
      const v = aandeel(f(bank, slugs, k), s), n = aandeel(f(set, slugs, k), s);
      if (eigen) { ev += v; en += n; ne++; } else { av += v; an += n; na++; }
    }
    return { anderVoor: av / na, anderNa: an / na, eigenVoor: ev / ne, eigenNa: en / ne };
  });
  const vastSpreiding = vast.map((a) => { const u = f(bank, slugs, a); return r2(u[0].score - u[u.length - 1].score); });
  uitkomst[naam] = {
    willekeurTop: Object.fromEntries(slugs.map((s, i) => [s, r2(wTop[i] * 100)])),
    mengTop: Object.fromEntries(slugs.map((s, i) => [s, r2(mTop[i] * 100)])),
    herkend: Object.fromEntries(slugs.map((s, i) => [s, r2(herk[i] * 100)])),
    masker: Object.fromEntries(slugs.map((s, i) => [s, Object.fromEntries(Object.entries(msk[i]).map(([k, v]) => [k, r2(v * 100)]))])),
    samenvatting: {
      willekeurMin: r2(Math.min(...wTop) * 100), willekeurMax: r2(Math.max(...wTop) * 100), willekeurCorrBekend: r2(corr(bekend, wTop)),
      mengMin: r2(Math.min(...mTop) * 100), mengMax: r2(Math.max(...mTop) * 100), mengCorrBekend: r2(corr(bekend, mTop)),
      herkendGem: r2(gem(herk) * 100), herkendMin: r2(Math.min(...herk) * 100), herkendCorrBekend: r2(corr(bekend, herk)),
      maskerAnder: `${r2(gem(msk.map((m) => m.anderVoor)) * 100)} → ${r2(gem(msk.map((m) => m.anderNa)) * 100)}`,
      maskerEigen: `${r2(gem(msk.map((m) => m.eigenVoor)) * 100)} → ${r2(gem(msk.map((m) => m.eigenNa)) * 100)}`,
      vastSpreiding: vastSpreiding.join(' / '),
    },
  };
}
// Deelverzamelingen zoals bezoekers ze kiezen: hoe vaak wint een partij waarvan minder dan de helft van de beantwoorde
// stellingen een standpunt heeft ('dunne winst'), en hoe vaak wint de hoofdpartij van de kiezer?
const proeven = Array.from({ length: N(8000) }, () => {
  const mee = schud(slugs).slice(0, kies([2, 2, 3, 3, 4, 5, 6, 8]));
  const set = kiesStellingen(bank, mee, schud(themas).slice(0, kies([1, 1, 2, 3, 4, 11])), DIEPTES[kies(['kort', 'normaal', 'diep'])].perThema);
  const [a, b] = schud(mee);
  return { mee, set, a, k: mengkiezer(set, a, b ?? a, 0.5 + 0.5 * rnd()) };
}).filter((x) => x.set.length && Object.keys(x.k).length);
for (const [naam, f] of Object.entries(WIJZEN)) {
  let dun = 0, hoofd = 0;
  for (const { mee, set, a, k } of proeven) {
    const uit = f(set, mee, k);
    const w = uit[0].slug;
    const beantwoord = set.filter((st) => k[st.id] !== undefined);
    if (beantwoord.filter((st) => positie(st, w) !== null).length < beantwoord.length / 2) dun++;
    hoofd += aandeel(uit, a);
  }
  uitkomst[naam].samenvatting.deelDunneWinst = r2((100 * dun) / proeven.length);
  uitkomst[naam].samenvatting.deelHoofdpartijWint = r2((100 * hoofd) / proeven.length);
}
if (!SNEL) fs.writeFileSync(new URL('werk/audit/eindcontrole/varianten.json', W), JSON.stringify(uitkomst, null, 1));
console.table(Object.fromEntries(Object.entries(uitkomst).map(([k, v]) => [k, v.samenvatting])));
console.table(Object.fromEntries(slugs.map((s, i) => [kort[s], { bekend: bekend[i], ...Object.fromEntries(Object.keys(WIJZEN).flatMap((w) => [[w + ' herk', uitkomst[w].herkend[s]], [w + ' wil', uitkomst[w].willekeurTop[s]]])) }])));
