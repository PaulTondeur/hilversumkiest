// Wat verandert er in de uitslag als 'geen standpunt' niet meer meetelt (voorstel uit de eindcontrole, bevinding 1)?
//   node werk/feedback/meet-rekenregel.mjs [--snel]
// Vergelijkt per proefuitslag de rekenregel van nu (bereken) met het voorstel (scoreOpBekend: alleen stellingen
// met een standpunt tellen, in teller én noemer). Bezoekers zoals in de eindcontrole: 2 tot 20 partijen, 1 tot 11
// thema's, een diepte, en een mengkiezer uit twee van de gekozen partijen. Vaste willekeur. Verandert niets.
import fs from 'node:fs';
import { kiesStellingen, bereken, positie, DIEPTES, scoreOpBekend } from '../../src/engine.mjs';

const W = new URL('../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json');
const bank = lees('data/stellingen.json');
const slugs = partijen.map((p) => p.slug);
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const N = (n) => (process.argv.includes('--snel') ? Math.ceil(n / 10) : n);
const SCHAAL = [-2, -1, 0, 1, 2];

let zaad = 18112026;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const kies = (a) => a[Math.floor(rnd() * a.length)];
const schud = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normaal = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const gem = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const r1 = (x) => Math.round(x * 10) / 10;
const stGem = new Map(bank.map((st) => { const k = slugs.map((s) => positie(st, s)).filter((v) => v !== null); return [st.id, k.length ? gem(k) : 0]; }));
function meng(set, a, b, w) {
  const uit = {};
  for (const st of set) {
    if (rnd() < 0.15) continue;
    const pa = positie(st, a), pb = positie(st, b), g = stGem.get(st.id);
    const va = pa ?? pb ?? g, vb = pb ?? pa ?? g;
    uit[st.id] = Math.max(-2, Math.min(2, Math.round(w * va + (1 - w) * vb + 0.8 * normaal())));
  }
  return uit;
}
// Het voorstel, zoals bereken het na de patch doet: zelfde volgorde bij gelijke stand (meer bekend, dan slug).
function nieuw(set, mee, a) {
  return mee.map((s) => scoreOpBekend(set, s, a)).sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || y.bekend - x.bekend || x.slug.localeCompare(y.slug));
}

const per = Object.fromEntries(slugs.map((s) => [s, { mee: 0, eersteNu: 0, eersteNieuw: 0, verschil: [], dekking: [] }]));
let n = 0, andereEerste = 0, nullScore = 0;
const verschuiving = [];
for (let i = 0; i < N(20000); i++) {
  const nP = kies([2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 20]);
  const mee = schud(slugs).slice(0, nP);
  const th = schud(themas.map((t) => t.id)).slice(0, kies([1, 2, 3, 4, 6, 11]));
  const set = kiesStellingen(bank, mee, th, DIEPTES[kies(['kort', 'normaal', 'normaal', 'diep'])].perThema);
  if (!set.length) continue;
  const [x, y] = schud(mee);
  const a = meng(set, x, y ?? x, 0.5 + 0.5 * rnd());
  if (!Object.keys(a).length) continue;
  n++;
  const nu = bereken(set, mee, a), na = nieuw(set, mee, a);
  if (nu[0].slug !== na[0].slug) andereEerste++;
  for (const u of nu) {
    const v = na.find((w) => w.slug === u.slug);
    per[u.slug].mee++;
    if (v.score === null) { nullScore++; continue; }
    per[u.slug].verschil.push((v.score - u.score) * 100);
    per[u.slug].dekking.push(u.beantwoord ? u.bekend / u.beantwoord : 1);
    verschuiving.push((v.score - u.score) * 100);
  }
  per[nu[0].slug].eersteNu++;
  per[na[0].slug].eersteNieuw++;
}

const uit = { proefuitslagen: n, andereEerste: r1((andereEerste / n) * 100), gemVerschuiving: r1(gem(verschuiving)), scoreNull: nullScore, perPartij: {} };
console.log(`${n} proefuitslagen. Andere partij bovenaan: ${uit.andereEerste}%. Gemiddelde verandering van een percentage: ${uit.gemVerschuiving > 0 ? '+' : ''}${uit.gemVerschuiving} procentpunt. Partijen zonder enig standpunt op de beantwoorde stellingen: ${nullScore} keer.`);
console.log('\nPartij                       bekend  dekking  bovenaan nu → voorstel (per keer gekozen)   percentage gemiddeld (min..max)');
const bekendInBank = Object.fromEntries(slugs.map((s) => [s, bank.filter((st) => positie(st, s) !== null).length]));
for (const s of slugs) {
  const p = per[s];
  const v = [...p.verschil].sort((a, b) => a - b);
  const q = (f) => r1(v[Math.floor(f * (v.length - 1))]);
  const rij = { bekend: bekendInBank[s], dekking: r1(gem(p.dekking) * 100), eersteNu: r1((p.eersteNu / p.mee) * 100), eersteNieuw: r1((p.eersteNieuw / p.mee) * 100), gemVerschil: r1(gem(v)), p10: q(0.1), p90: q(0.9) };
  uit.perPartij[s] = rij;
  console.log(`${kort[s].padEnd(28)} ${String(rij.bekend).padStart(4)}  ${String(rij.dekking).padStart(6)}%  ${String(rij.eersteNu).padStart(6)}% → ${String(rij.eersteNieuw).padStart(5)}%  (${rij.eersteNieuw - rij.eersteNu >= 0 ? '+' : ''}${r1(rij.eersteNieuw - rij.eersteNu)})            ${rij.gemVerschil >= 0 ? '+' : ''}${rij.gemVerschil} pp (${rij.p10}..${rij.p90})`);
}

// Vijf vaste proefprofielen (dezelfde als bij de controle in de browser): antwoorden die een partij of mengsel volgen.
console.log('\nVaste proefprofielen (eerste drie, nu → voorstel):');
uit.profielen = {};
function profiel(naam, lijsten, volg, diepte = 'normaal') {
  const set = kiesStellingen(bank, lijsten, themas.map((t) => t.id), DIEPTES[diepte].perThema);
  const a = {};
  for (const st of set) { let v = 0, k = 0; for (const [s, w] of volg) { const p = positie(st, s); if (p !== null) { v += w * p; k += w; } } a[st.id] = k ? Math.round(v / k) : 0; }
  const f = (l) => l.slice(0, 3).map((u) => `${kort[u.slug]} ${Math.round(u.score * 100)}%`).join(', ');
  const nu = bereken(set, lijsten, a), na = nieuw(set, lijsten, a);
  uit.profielen[naam] = { nu: f(nu), voorstel: f(na) };
  console.log(`${naam.padEnd(10)} nu: ${f(nu)}\n${''.padEnd(10)} voorstel: ${f(na)}`);
}
profiel('twee', ['vvd', 'pro'], [['d66', 1]]);
profiel('zes', ['pro', 'vvd', 'cda', 'd66', 'sp', 'lokaal-een'], [['pvdd', 1], ['pro', 0.3]]);
profiel('alle', slugs, [['volt', 1]], 'kort');
profiel('duidelijk', ['vvd', 'cda'], [['sp', 1]]);
profiel('binnen', ['vvd', 'pro', 'd66'], [['vvd', 1], ['d66', 0.5]]);
profiel('lokaal', ['hart-voor-hilversum', 'gewoon-hilversum', 'stop-betaald-parkeren-vip', 'lokaal-een'], [['stop-betaald-parkeren-vip', 1], ['hart-voor-hilversum', 0.5]]);
profiel('dun', ['scb', 'blanco-van-oostveen', 'volt', 'pro'], [['scb', 1]]);

fs.writeFileSync(new URL('werk/feedback/meet-rekenregel.json', W), JSON.stringify(uit, null, 1));
