// Meting voor de suggestie 'buiten je keuze' (16 november 2026).
//   node werk/feedback/meet-suggestie.mjs [--snel]
// Simuleert bezoekers zoals ze de stemwijzer doen (2 tot 8 partijen, 1 tot 11 thema's, een diepte), met het
// kiezersmodel uit de eindcontrole (werk/audit/eindcontrole/meet.mjs), en telt per partij hoe vaak ze als
// suggestie verschijnt. Vaste willekeur: elke run geeft dezelfde cijfers. Verandert niets.
import fs from 'node:fs';
import { kiesStellingen, bereken, positie, DIEPTES, BUITEN, buitenKeuze, scoreOpBekend } from '../../src/engine.mjs';

const W = new URL('../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json');
const echteBank = lees('data/stellingen.json');
const slugs = partijen.map((p) => p.slug);
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const SNEL = process.argv.includes('--snel');
const N = (n) => (SNEL ? Math.ceil(n / 10) : n);
const SCHAAL = [-2, -1, 0, 1, 2];

let zaad = 16112026;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const kies = (a) => a[Math.floor(rnd() * a.length)];
const schud = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normaal = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const gem = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (x) => Math.round(x * 1000) / 10;
const corr = (a, b) => { const ma = gem(a), mb = gem(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };

function maakKiezers(bank) {
  const stGem = new Map(bank.map((st) => { const k = slugs.map((s) => positie(st, s)).filter((v) => v !== null); return [st.id, k.length ? gem(k) : 0]; }));
  // Mengkiezer uit de eindcontrole: mengeling van twee partijen, ruis sd 0,8, 15% overgeslagen.
  const meng = (set, a, b, w) => {
    const uit = {};
    for (const st of set) {
      if (rnd() < 0.15) continue;
      const pa = positie(st, a), pb = positie(st, b), g = stGem.get(st.id);
      const va = pa ?? pb ?? g, vb = pb ?? pa ?? g;
      uit[st.id] = Math.max(-2, Math.min(2, Math.round(w * va + (1 - w) * vb + 0.8 * normaal())));
    }
    return uit;
  };
  const willekeurig = (set) => { const a = {}; for (const st of set) if (rnd() >= 0.1) a[st.id] = kies(SCHAAL); return a; };
  return { meng, willekeurig };
}

// De regel als functie, zodat varianten met dezelfde bezoekers te vergelijken zijn.
function regelBekend(r) { return (set, mee, a) => buitenKeuze(set, mee, slugs, a, [], r).map((u) => u.slug); }
// Variant met een marge die meeschaalt met het aantal stellingen waarop de partij gemeten is (k / wortel n).
function regelWortel({ k, minBekend = 8, minDekking = 0, max = 2 }) {
  return (set, mee, a) => {
    const n = set.filter((st) => a[st.id] !== undefined).length;
    if (n < minBekend) return [];
    const eigen = mee.map((s) => scoreOpBekend(set, s, a).score).filter((v) => v !== null);
    if (!eigen.length) return [];
    const top = Math.max(...eigen);
    return slugs.filter((s) => !mee.includes(s)).map((s) => scoreOpBekend(set, s, a))
      .filter((u) => u.bekend >= minBekend && u.bekend >= minDekking * n && u.score >= top + k / Math.sqrt(u.bekend) - 1e-9)
      .sort((x, y) => y.score - x.score).slice(0, max).map((u) => u.slug);
  };
}
function regelLive(r) {
  // Variant: dezelfde score als in de uitslag nu (geen standpunt telt als 0), met dezelfde drempels.
  return (set, mee, a) => {
    const n = set.filter((st) => a[st.id] !== undefined).length;
    if (n < r.minBekend) return [];
    const eigen = bereken(set, mee, a);
    const lat = eigen[0].score + r.marge;
    const k = slugs.filter((s) => !mee.includes(s)).map((s) => ({ s, u: bereken(set, [s], a)[0] }))
      .filter(({ u }) => u.bekend >= r.minBekend && u.bekend >= r.minDekking * n && u.score >= lat - 1e-9)
      .sort((x, y) => y.u.score - x.u.score).slice(0, r.max);
    return k.map((x) => x.s);
  };
}

function proef(bank, regels, nProeven, scenario) {
  const { meng, willekeurig } = maakKiezers(bank);
  const res = Object.fromEntries(Object.keys(regels).map((k) => [k, { metSuggestie: 0, aantal: 0, per: Object.fromEntries(slugs.map((s) => [s, { buiten: 0, genoemd: 0, anker: 0, ankerGenoemd: 0, dekkingOk: 0 }])) }]));
  let n = 0;
  for (let i = 0; i < nProeven; i++) {
    const nP = kies([2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8]);
    const mee = schud(slugs).slice(0, nP);
    const th = schud(themas.map((t) => t.id)).slice(0, kies([1, 2, 3, 4, 6, 11]));
    const set = kiesStellingen(bank, mee, th, DIEPTES[kies(['kort', 'normaal', 'normaal', 'diep'])].perThema);
    if (!set.length) continue;
    let a, anker = null;
    if (scenario === 'willekeurig') a = willekeurig(set);
    else if (scenario === 'buiten') { // hoofdpartij buiten de keuze, tweede partij erbinnen
      anker = kies(slugs.filter((s) => !mee.includes(s)));
      a = meng(set, anker, kies(mee), 0.5 + 0.5 * rnd());
    } else { // binnen: beide ankers in de keuze
      const [x, y] = schud(mee);
      a = meng(set, x, y ?? x, 0.5 + 0.5 * rnd());
    }
    n++;
    const nBeantw = set.filter((st) => a[st.id] !== undefined).length;
    for (const [naam, f] of Object.entries(regels)) {
      const r = res[naam];
      const s = f(set, mee, a);
      if (s.length) r.metSuggestie++;
      r.aantal += s.length;
      for (const x of slugs) {
        if (mee.includes(x)) continue;
        r.per[x].buiten++;
        if (s.includes(x)) r.per[x].genoemd++;
        const bek = scoreOpBekend(set, x, a).bekend;
        if (bek >= BUITEN.minBekend && bek >= BUITEN.minDekking * nBeantw) r.per[x].dekkingOk++;
      }
      if (anker) { r.per[anker].anker++; if (s.includes(anker)) r.per[anker].ankerGenoemd++; }
    }
  }
  return { n, res };
}

const bekendInBank = Object.fromEntries(slugs.map((s) => [s, echteBank.filter((st) => positie(st, s) !== null).length]));
const R = {
  'gekozen: 10 pp, helft, min 8': regelBekend(BUITEN),
  '5 pp, helft, min 8': regelBekend({ ...BUITEN, marge: 0.05 }),
  '5 pp, twee derde, min 8': regelBekend({ ...BUITEN, marge: 0.05, minDekking: 2 / 3 }),
  '10 pp, geen dekkingseis, min 8': regelBekend({ ...BUITEN, minDekking: 0 }),
  'marge 0,4/wortel(n), helft': regelWortel({ k: 0.4, minDekking: 0.5 }),
  'live (geen standpunt = 0), 10 pp': regelLive(BUITEN),
  'live (geen standpunt = 0), 5 pp': regelLive({ ...BUITEN, marge: 0.05 }),
}

const uit = { regel: BUITEN, scenario: {} };
const NP = N(12000);
for (const sc of ['willekeurig', 'buiten', 'binnen']) {
  const { n, res } = proef(echteBank, R, NP, sc);
  uit.scenario[sc] = { n, regels: {} };
  console.log(`\n=== Bezoekers: ${sc} (${n} uitslagen) ===`);
  for (const [naam, r] of Object.entries(res)) {
    const rate = slugs.map((s) => r.per[s].genoemd / r.per[s].buiten);
    const recall = slugs.map((s) => (r.per[s].anker ? r.per[s].ankerGenoemd / r.per[s].anker : NaN));
    const b = slugs.map((s) => bekendInBank[s]);
    const samen = {
      metSuggestie: pct(r.metSuggestie / n),
      gemAantal: Math.round((r.aantal / n) * 100) / 100,
      genoemdMinMax: [pct(Math.min(...rate)), pct(Math.max(...rate))],
      samenhangGenoemdBekend: Math.round(corr(rate, b) * 100) / 100,
      perPartij: Object.fromEntries(slugs.map((s, i) => [s, { genoemdAlsBuiten: pct(rate[i]), herkendAlsAnker: sc === 'buiten' ? pct(recall[i]) : null, dekkingOk: pct(r.per[s].dekkingOk / r.per[s].buiten) }])),
    };
    if (sc === 'buiten') { samen.herkendMinMax = [pct(Math.min(...recall)), pct(Math.max(...recall))]; samen.samenhangHerkendBekend = Math.round(corr(recall, b) * 100) / 100; samen.herkendGem = pct(gem(recall)); }
    uit.scenario[sc].regels[naam] = samen;
    console.log(`${naam.padEnd(34)} met suggestie ${samen.metSuggestie}%  gem ${samen.gemAantal}  per partij ${samen.genoemdMinMax.join('–')}% (r=${samen.samenhangGenoemdBekend})${sc === 'buiten' ? `  hoofdpartij herkend ${samen.herkendGem}% (${samen.herkendMinMax.join('–')}%, r=${samen.samenhangHerkendBekend})` : ''}`);
  }
}

// Per partij voor de gekozen regel
console.log('\nPer partij (gekozen regel): genoemd bij willekeur | herkend als hoofdpartij buiten de keuze | dekking gehaald | bekend in bank');
for (const s of slugs) {
  const w = uit.scenario.willekeurig.regels['gekozen: 10 pp, helft, min 8'].perPartij[s];
  const b = uit.scenario.buiten.regels['gekozen: 10 pp, helft, min 8'].perPartij[s];
  const l = uit.scenario.buiten.regels['live (geen standpunt = 0), 10 pp'].perPartij[s];
  console.log(`${kort[s].padEnd(28)} ${String(w.genoemdAlsBuiten).padStart(5)}%  ${String(b.herkendAlsAnker).padStart(5)}% (live ${String(l.herkendAlsAnker).padStart(5)}%)  ${String(b.dekkingOk).padStart(5)}%  ${bekendInBank[s]}`);
}

// Maskeerproef: haal bij één partij 30% van haar standpunten weg. Een eerlijke regel laat haar herkenning
// als hoofdpartij niet instorten door het rekenen; wel kan ze vaker onder de dekkingsdrempel vallen.
console.log('\nMaskeerproef (30% van de standpunten weg, bezoekers met hoofdpartij buiten de keuze):');
uit.maskeer = {};
const MASKEER = { gekozen: R['gekozen: 10 pp, helft, min 8'], '5 pp, 2/3': R['5 pp, twee derde, min 8'], 'live 10 pp': R['live (geen standpunt = 0), 10 pp'] };
for (const doel of ['pro', 'vvd', 'cda', 'hart-voor-hilversum', 'scb', 'stop-betaald-parkeren-vip', 'volt', 'blanco-van-oostveen']) {
  const bank = echteBank.map((st) => {
    if (positie(st, doel) === null || rnd() >= 0.3) return st;
    return { ...st, posities: { ...st.posities, [doel]: { s: null } } };
  });
  const regels = MASKEER;
  // Alleen bezoekers met dit doel als hoofdpartij buiten de keuze: zelfde zaad voor voor en na.
  const meet = (b) => {
    const z = zaad; zaad = 777;
    const { meng } = maakKiezers(echteBank);
    const t = Object.fromEntries([...Object.keys(regels), 'n'].map((k) => [k, 0]));
    for (let i = 0; i < N(3000); i++) {
      const nP = kies([2, 2, 3, 3, 4, 6]);
      const mee = schud(slugs.filter((s) => s !== doel)).slice(0, nP);
      const th = schud(themas.map((x) => x.id)).slice(0, kies([2, 3, 4, 6, 11]));
      const set = kiesStellingen(b, mee, th, DIEPTES[kies(['normaal', 'diep'])].perThema);
      if (!set.length) continue;
      const echteSet = set.map((st) => echteBank.find((x) => x.id === st.id));
      const a = meng(echteSet, doel, kies(mee), 0.5 + 0.5 * rnd()); // de kiezer zelf verandert niet
      t.n++;
      for (const k of Object.keys(regels)) if (regels[k](set, mee, a).includes(doel)) t[k]++;
    }
    zaad = z;
    return Object.fromEntries(Object.keys(regels).map((k) => [k, pct(t[k] / t.n)]));
  };
  const voor = meet(echteBank), na = meet(bank);
  uit.maskeer[doel] = { voor, na };
  console.log(`${kort[doel].padEnd(28)} ${Object.keys(regels).map((k) => `${k}: ${voor[k]} → ${na[k]}%`).join('   ')}`);
}

fs.writeFileSync(new URL('werk/feedback/meet-suggestie.json', W), JSON.stringify(uit, null, 1));
