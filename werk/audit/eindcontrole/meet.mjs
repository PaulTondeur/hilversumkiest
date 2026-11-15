// Eindcontrole neutraliteit (15 november 2026): eigen metingen, los van tools/toets.mjs.
//   node werk/audit/eindcontrole/meet.mjs            → werk/audit/eindcontrole/metingen.json + tabellen op het scherm
//   node werk/audit/eindcontrole/meet.mjs --snel     → minder trekkingen (voor een snelle controle)
// Gebruikt alleen data/*.json en src/engine.mjs; verandert niets. Vaste willekeur, dus herhaalbaar.
import fs from 'node:fs';
import { kiesStellingen, bereken, positie, onderscheid, DIEPTES, overeenkomst, zetMaat, partijAfstand } from '../../../src/engine.mjs';

const W = new URL('../../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json');
const bank = lees('data/stellingen.json');
const kandidaten = lees('data/kandidaten.json');
const logos = lees('data/logos.json');
const slugs = partijen.map((p) => p.slug);
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const SNEL = process.argv.includes('--snel');
const N = (n) => (SNEL ? Math.ceil(n / 10) : n);
const SCHAAL = [-2, -1, 0, 1, 2];

let zaad = 18112026;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const kies = (a) => a[Math.floor(rnd() * a.length)];
const schud = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normaal = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const gem = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (x) => Math.round(x * 1000) / 10;
const corr = (a, b) => { const ma = gem(a), mb = gem(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };

// ---------- Groepen (aannames, zie rapport) ----------
const GROEPEN = {
  landelijk: ['pro', 'd66', 'vvd', 'cda', 'sp', 'christenunie', 'bvnl', 'pvdd', 'volt', 'fvd', 'bbb'],
  lokaal: ['hart-voor-hilversum', 'lokaal-een', 'scb', 'gewoon-hilversum', 'dorp-voor-dorp', 'stop-betaald-parkeren-vip', 'opstand-nu', 'blanco-van-oostveen', 'lfd'],
  groot: ['hart-voor-hilversum', 'pro', 'd66', 'vvd', 'cda', 'lokaal-een'], // ≥ 7 zetels in 2022 (beide raden samen, met voorgangers)
  klein: ['sp', 'christenunie', 'bvnl', 'scb', 'gewoon-hilversum', 'dorp-voor-dorp', 'stop-betaald-parkeren-vip', 'opstand-nu', 'pvdd', 'blanco-van-oostveen', 'lfd', 'volt', 'fvd', 'bbb'],
  coalitie: ['pro', 'vvd', 'cda', 'lokaal-een'], // college Hilversum sinds mei 2024
  oppositie: ['hart-voor-hilversum', 'd66', 'sp', 'christenunie', 'scb', 'gewoon-hilversum', 'opstand-nu', 'lfd'],
  nieuw: ['bvnl', 'dorp-voor-dorp', 'stop-betaald-parkeren-vip', 'pvdd', 'blanco-van-oostveen', 'volt', 'fvd', 'bbb'], // geen raadsleden
  wijdemeers: ['dorp-voor-dorp', 'lokaal-een'], // wortels in Wijdemeerse lokale partijen
  hilversums_lokaal: ['hart-voor-hilversum', 'scb', 'gewoon-hilversum', 'stop-betaald-parkeren-vip', 'opstand-nu', 'blanco-van-oostveen', 'lfd'],
};

// ---------- 0. Hoofdas uit de standpunten zelf (voor links/rechts) ----------
const M = bank.map((st) => slugs.map((s) => positie(st, s)));
const stGem = M.map((r) => { const k = r.filter((v) => v !== null); return k.length ? gem(k) : 0; });
const C = M.map((r, i) => r.map((v) => (v === null ? 0 : v - stGem[i]))); // onbekend = gemiddelde van de stelling
function hoofdassen(k) {
  // eigenvectoren van de 20x20 covariantie tussen partijen
  let B = slugs.map((_, a) => slugs.map((_, b) => C.reduce((s, r) => s + r[a] * r[b], 0)));
  const tot = B.reduce((s, r, i) => s + r[i], 0);
  const uit = [];
  for (let n = 0; n < k; n++) {
    let v = slugs.map((_, i) => Math.sin(i + 1 + n));
    let lam = 0;
    for (let it = 0; it < 1000; it++) { const w = B.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); lam = Math.hypot(...w); v = w.map((x) => x / lam); }
    uit.push({ v, aandeel: lam / tot });
    B = B.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]));
  }
  return uit;
}
const assen = hoofdassen(3);
if (assen[0].v[slugs.indexOf('pro')] > 0) assen[0].v = assen[0].v.map((x) => -x); // PRO links
const as1 = Object.fromEntries(slugs.map((s, i) => [s, assen[0].v[i]]));
GROEPEN.links = slugs.filter((s) => as1[s] < 0);
GROEPEN.rechts = slugs.filter((s) => as1[s] >= 0);

// ---------- 1. Stellingen en standpunten ----------
const perPartij = slugs.map((s) => {
  const ps = bank.map((st) => st.posities[s] || {});
  const bekend = ps.filter((p) => typeof p.s === 'number');
  const soort = {};
  for (const p of bekend) soort[p.soort] = (soort[p.soort] || 0) + 1;
  const woorden = (t) => (t ? t.split(/\s+/).length : 0);
  return {
    slug: s, bekend: bekend.length,
    plus2: bekend.filter((p) => p.s === 2).length, plus1: bekend.filter((p) => p.s === 1).length, nul: bekend.filter((p) => p.s === 0).length,
    min1: bekend.filter((p) => p.s === -1).length, min2: bekend.filter((p) => p.s === -2).length,
    sterk: bekend.length ? bekend.filter((p) => Math.abs(p.s) === 2).length / bekend.length : 0,
    gem: gem(bekend.map((p) => p.s)),
    programma: soort.programma || 0, stemhulp: (soort.mijnstem || 0) + (soort.stemgids || 0) + (soort.hilversumsnieuws || 0), afgeleid: soort.afgeleid || 0, stemgedrag: soort.stemgedrag || 0,
    toelichtingWoorden: r2(gem(bekend.map((p) => woorden(p.toelichting)))), kernWoorden: r2(gem(bekend.map((p) => woorden(p.kern)))),
    programmaWoorden: partijen.find((p) => p.slug === s).programma?.woorden || 0,
    as1: r2(as1[s]),
    genoemdInUitleg: 0,
  };
});
// Partijen die in de uitleg bij naam worden genoemd
const namen = Object.fromEntries(partijen.map((p) => [p.slug, [p.kort, p.naam, ...(p.slug === 'gewoon-hilversum' ? ['Gewoon Hilversum'] : []), ...(p.slug === 'stop-betaald-parkeren-vip' ? ['Stop Betaald Parkeren'] : []), ...(p.slug === 'blanco-van-oostveen' ? ['Van Oostveen'] : []), ...(p.slug === 'pvdd' ? ['PvdD'] : []), ...(p.slug === 'christenunie' ? ['CU'] : [])]]));
const genoemd = {};
for (const st of bank) for (const s of slugs) {
  const tekst = [st.uitleg, st.voor, st.tegen, st.stelling].join(' ');
  if (namen[s].some((n) => new RegExp(`(^|[^\\wÀ-ÿ])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\wÀ-ÿ]|$)`).test(tekst))) { (genoemd[s] ||= []).push(st.id); }
}
for (const r of perPartij) r.genoemdInUitleg = (genoemd[r.slug] || []).length;

// Richting per stelling: wijst 'eens' naar de linker- of rechterkant van de hoofdas?
const perStelling = bank.map((st, i) => {
  const k = slugs.filter((s) => positie(st, s) !== null);
  const r = k.length >= 4 ? corr(k.map((s) => positie(st, s)), k.map((s) => as1[s])) : null;
  const w = (t) => (t ? t.split(/\s+/).length : 0);
  return { id: st.id, thema: st.thema, bekend: k.length, eensKant: r === null ? null : r < -0.3 ? 'links' : r > 0.3 ? 'rechts' : 'gemengd', r: r === null ? null : r2(r), voorWoorden: w(st.voor), tegenWoorden: w(st.tegen), stellingWoorden: w(st.stelling), uitlegWoorden: w(st.uitleg) };
});
const richting = {};
for (const t of themas) {
  const x = perStelling.filter((p) => p.thema === t.id);
  richting[t.id] = { n: x.length, links: x.filter((p) => p.eensKant === 'links').length, rechts: x.filter((p) => p.eensKant === 'rechts').length, gemengd: x.filter((p) => p.eensKant === 'gemengd').length };
}
richting.totaal = { n: bank.length, links: perStelling.filter((p) => p.eensKant === 'links').length, rechts: perStelling.filter((p) => p.eensKant === 'rechts').length, gemengd: perStelling.filter((p) => p.eensKant === 'gemengd').length };
const voorTegen = { voor: gem(perStelling.map((p) => p.voorWoorden)), tegen: gem(perStelling.map((p) => p.tegenWoorden)), voorLanger: perStelling.filter((p) => p.voorWoorden > p.tegenWoorden * 1.5).map((p) => p.id), tegenLanger: perStelling.filter((p) => p.tegenWoorden > p.voorWoorden * 1.5).map((p) => p.id) };

// Hoe vaak staat een partij aan de kleine kant (onderscheidend), per partij en per thema
const kleineKant = Object.fromEntries(slugs.map((s) => [s, 0]));
for (const st of bank) {
  const k = slugs.filter((s) => positie(st, s) !== null);
  const plus = k.filter((s) => positie(st, s) > 0), min = k.filter((s) => positie(st, s) < 0);
  const klein = plus.length < min.length ? plus : min.length < plus.length ? min : [];
  for (const s of klein) kleineKant[s]++;
}
for (const r of perPartij) r.kleineKant = kleineKant[r.slug];

// ---------- 2. Rekenwijze ----------
const tabelZ = Object.fromEntries([...SCHAAL, null].map((p) => [String(p), SCHAAL.map((a) => { const st = [{ id: 'x', thema: 't', posities: { q: { s: p } } }]; return r2(bereken(st, ['q'], { x: a })[0].score); })]));

function uitslag(set, mee, a) { return bereken(set, mee, a); }
function topVan(uit) { const t = uit[0].score; return uit.filter((u) => u.score > t - 1e-9); }

// Kiezersmodel: een mengeling van twee partijen (gewicht w), met ruis, die 15% overslaat.
// Waar een ankerpartij geen standpunt heeft, neemt de kiezer de andere ankerpartij, of anders het gemiddelde van de stelling.
function mengkiezer(set, a, b, w, { ruis = 0.8, overslaan = 0.15, stijl = 'gewoon' } = {}) {
  const uit = {};
  for (const st of set) {
    if (rnd() < overslaan) continue;
    const pa = positie(st, a), pb = positie(st, b);
    const g = stGem[bank.indexOf(st)];
    const va = pa ?? pb ?? g, vb = pb ?? pa ?? g;
    let x = w * va + (1 - w) * vb + ruis * normaal();
    if (stijl === 'sterk') x = Math.abs(x) < 0.5 ? 0 : 2 * Math.sign(x);
    else if (stijl === 'mild') x = Math.abs(x) < 0.5 ? 0 : Math.sign(x);
    uit[st.id] = Math.max(-2, Math.min(2, Math.round(x)));
  }
  return uit;
}
function willekeurig(set, overslaan = 0.1) { const a = {}; for (const st of set) if (rnd() >= overslaan) a[st.id] = kies(SCHAAL); return a; }

// 2a. Volledige bank, alle twintig partijen
function tel(nKiezers, maak, opties = {}) {
  const top = Object.fromEntries(slugs.map((s) => [s, 0]));
  const onder = Object.fromEntries(slugs.map((s) => [s, 0]));
  const rang = Object.fromEntries(slugs.map((s) => [s, 0]));
  const anker = Object.fromEntries(slugs.map((s) => [s, { n: 0, top: 0 }]));
  for (let i = 0; i < nKiezers; i++) {
    const { a, ankerSlug } = maak();
    const uit = uitslag(opties.set || bank, slugs, a);
    const t = topVan(uit);
    for (const u of t) top[u.slug] += 1 / t.length;
    const laagste = uit[uit.length - 1].score;
    const o = uit.filter((u) => u.score < laagste + 1e-9);
    for (const u of o) onder[u.slug] += 1 / o.length;
    uit.forEach((u, j) => (rang[u.slug] += (j + 1) / nKiezers));
    if (ankerSlug) { anker[ankerSlug].n++; if (t.some((u) => u.slug === ankerSlug)) anker[ankerSlug].top += 1 / t.length; }
  }
  return Object.fromEntries(slugs.map((s) => [s, { top: top[s] / nKiezers, onder: onder[s] / nKiezers, rang: rang[s], herkend: anker[s].n ? anker[s].top / anker[s].n : null }]));
}
const NK = N(20000);
const sims = {};
sims.willekeurig = tel(NK, () => ({ a: willekeurig(bank) }));
for (const stijl of ['gewoon', 'sterk', 'mild']) {
  sims['meng-' + stijl] = tel(NK, () => {
    const [a, b] = schud(slugs).slice(0, 2);
    const w = 0.5 + 0.5 * rnd(); // a is de hoofdpartij
    return { a: mengkiezer(bank, a, b, w, { stijl }), ankerSlug: a };
  });
}
sims.volger = tel(N(4000), () => { const a = kies(slugs); return { a: mengkiezer(bank, a, a, 1, { ruis: 0.8 }), ankerSlug: a }; });

// 2b. Zelfde kiezers, andere rekenwijze: hoeveel scheelt de behandeling van 'geen standpunt'?
function bekendAlleen(set, mee, a) {
  // alternatief: alleen stellingen waar de partij een standpunt heeft tellen mee (per partij eigen noemer)
  return mee.map((s) => {
    let t = 0, n = 0;
    for (const st of set) { const x = a[st.id]; if (x === undefined) continue; const p = positie(st, s); if (p === null) continue; t += 1 - Math.abs(x - p) / 4; n++; }
    return { slug: s, score: n ? t / n : 0, n };
  }).sort((x, y) => y.score - x.score);
}
function vergelijkMaten(nKiezers) {
  const uitkomst = { z: {}, afstand: {}, bekendAlleen: {} };
  for (const m of Object.keys(uitkomst)) for (const s of slugs) uitkomst[m][s] = 0;
  const z0 = zaad;
  for (const m of Object.keys(uitkomst)) {
    zaad = z0; // dezelfde kiezers voor elke maat
    zetMaat(m === 'afstand' ? 'afstand' : 'z');
    for (let i = 0; i < nKiezers; i++) {
      const [a, b] = schud(slugs).slice(0, 2);
      const kiezer = mengkiezer(bank, a, b, 0.5 + 0.5 * rnd());
      const uit = m === 'bekendAlleen' ? bekendAlleen(bank, slugs, kiezer) : bereken(bank, slugs, kiezer);
      const t = topVan(uit);
      for (const u of t) uitkomst[m][u.slug] += 1 / t.length / nKiezers;
    }
  }
  zetMaat('z');
  return uitkomst;
}
const maten = vergelijkMaten(N(10000));

// 2c. Maskeerproef: haal bij één partij 30% van de bekende standpunten weg. Wint ze daardoor vaker of minder vaak?
function maskeer(slug, deel) {
  const bekend = schud(bank.filter((st) => positie(st, slug) !== null));
  const weg = new Set(bekend.slice(0, Math.round(bekend.length * deel)).map((st) => st.id));
  return bank.map((st) => (weg.has(st.id) ? { ...st, posities: { ...st.posities, [slug]: { s: null } } } : st));
}
function maskeerproef(nKiezers, herhaal) {
  const uit = {};
  for (const s of slugs) {
    let voor = 0, na = 0, voorHerk = 0, naHerk = 0, nHerk = 0, bVoor = 0, bNa = 0, bVoorHerk = 0, bNaHerk = 0;
    for (let h = 0; h < herhaal; h++) {
      const gemaskeerd = maskeer(s, 0.3);
      for (let i = 0; i < nKiezers; i++) {
        // kiezers uit het hele spectrum; een op de tien heeft deze partij als hoofdpartij
        const eigen = i % 10 === 0;
        const [a, b] = eigen ? [s, kies(slugs.filter((x) => x !== s))] : schud(slugs).slice(0, 2);
        const kiezer = mengkiezer(bank, a, b, 0.5 + 0.5 * rnd());
        const t1 = topVan(bereken(bank, slugs, kiezer)), t2 = topVan(bereken(gemaskeerd, slugs, kiezer));
        const b1 = topVan(bekendAlleen(bank, slugs, kiezer)), b2 = topVan(bekendAlleen(gemaskeerd, slugs, kiezer));
        const aan = (t) => (t.some((u) => u.slug === s) ? 1 / t.length : 0);
        const w1 = aan(t1), w2 = aan(t2);
        if (eigen) { voorHerk += w1; naHerk += w2; nHerk++; bVoorHerk += aan(b1); bNaHerk += aan(b2); } else { voor += w1; na += w2; bVoor += aan(b1); bNa += aan(b2); }
      }
    }
    const nAnder = herhaal * nKiezers - herhaal * Math.ceil(nKiezers / 10);
    uit[s] = { anderVoor: voor / nAnder, anderNa: na / nAnder, herkendVoor: voorHerk / nHerk, herkendNa: naHerk / nHerk, bAnderVoor: bVoor / nAnder, bAnderNa: bNa / nAnder, bHerkendVoor: bVoorHerk / nHerk, bHerkendNa: bNaHerk / nHerk };
  }
  return uit;
}
const masker = maskeerproef(N(2000), SNEL ? 1 : 4);

// 2d. De echte werking: deelverzamelingen van partijen en thema's, zoals bezoekers ze kiezen
function deelproef(nProeven) {
  const per = Object.fromEntries(slugs.map((s) => [s, { mee: 0, verwacht: 0, winst: 0, winstMeng: 0, gelijkEerst: 0, gelijkMee: 0, nulInSet: 0, setN: 0, nulInBank: 0, bankN: 0 }]));
  let gelijkTop = 0, bijnaGelijk = 0, n = 0, leeg = 0;
  const grootte = [];
  for (let i = 0; i < nProeven; i++) {
    const nP = kies([2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 20]);
    const mee = schud(slugs).slice(0, nP);
    const th = schud(themas.map((t) => t.id)).slice(0, kies([1, 2, 3, 4, 6, 11]));
    const set = kiesStellingen(bank, mee, th, DIEPTES[kies(['kort', 'normaal', 'normaal', 'diep'])].perThema);
    if (!set.length) { leeg++; continue; }
    n++;
    grootte.push(set.length);
    for (const s of mee) {
      per[s].mee++; per[s].verwacht += 1 / nP;
      per[s].nulInSet += set.filter((st) => positie(st, s) === null).length; per[s].setN += set.length;
      const zelfdeThema = bank.filter((st) => th.includes(st.thema));
      per[s].nulInBank += zelfdeThema.filter((st) => positie(st, s) === null).length; per[s].bankN += zelfdeThema.length;
    }
    // willekeurige kiezer
    const uitW = bereken(set, mee, willekeurig(set, 0));
    const tW = topVan(uitW);
    for (const u of tW) per[u.slug].winst += 1 / tW.length;
    // mengkiezer uit de gekozen partijen
    const [a, b] = schud(mee).slice(0, 2);
    const uitM = bereken(set, mee, mengkiezer(set, a, b ?? a, 0.5 + 0.5 * rnd()));
    const tM = topVan(uitM);
    for (const u of tM) per[u.slug].winstMeng += 1 / tM.length;
    // gelijke stand bovenaan: wie wordt als eerste genoemd?
    for (const uit of [uitW, uitM]) {
      const t = topVan(uit);
      const bijna = uit.filter((u) => Math.abs(u.score - uit[0].score) < 0.005);
      if (bijna.length > 1) bijnaGelijk++;
      if (t.length > 1) {
        gelijkTop++;
        per[t[0].slug].gelijkEerst++;
        for (const u of t) per[u.slug].gelijkMee++;
      }
    }
  }
  return { n, leeg, gelijkTop, bijnaGelijk, uitslagen: 2 * n, mediaanSet: schud(grootte).sort((x, y) => x - y)[Math.floor(grootte.length / 2)], per };
}
const deel = deelproef(N(20000));

// 2e. Vaste antwoorden en partijvolgers
const vast = {};
for (const v of SCHAAL) {
  const uit = bereken(bank, slugs, Object.fromEntries(bank.map((st) => [st.id, v])));
  vast[v] = Object.fromEntries(uit.map((u, i) => [u.slug, { rang: i + 1, score: r2(u.score) }]));
}
const zelf = Object.fromEntries(slugs.map((s) => {
  const a = {};
  for (const st of bank) { const p = positie(st, s); if (p !== null) a[st.id] = p; }
  const uit = bereken(bank, slugs, a);
  return [s, { rang: uit.findIndex((u) => u.slug === s) + 1, score: r2(uit.find((u) => u.slug === s).score), tweede: uit[1].slug === s ? uit[0].slug : uit[1].slug, tweedeScore: r2(uit[1].slug === s ? uit[0].score : uit[1].score) }];
}));
// 'Sterke' volger: neemt het standpunt over maar antwoordt overal ±2 waar de partij ±1 zegt
const zelfSterk = Object.fromEntries(slugs.map((s) => {
  const a = {};
  for (const st of bank) { const p = positie(st, s); if (p !== null) a[st.id] = p === 0 ? 0 : 2 * Math.sign(p); }
  const uit = bereken(bank, slugs, a);
  return [s, { rang: uit.findIndex((u) => u.slug === s) + 1, eerste: uit[0].slug }];
}));

// ---------- 3. Kaart 'wie staat dicht bij wie' (zelfde berekening als build.mjs) ----------
const D = slugs.map((a) => slugs.map((b) => (a === b ? 0 : partijAfstand(bank, a, b).afstand ?? 0.5)));
function mds(D) {
  const n = D.length; const sq = D.map((r) => r.map((v) => v * v));
  const rij = sq.map((r) => r.reduce((a, b) => a + b, 0) / n); const tot = rij.reduce((a, b) => a + b, 0) / n;
  let Bm = sq.map((r, i) => r.map((v, j) => -0.5 * (v - rij[i] - rij[j] + tot)));
  const spoor = Bm.reduce((s, r, i) => s + r[i], 0);
  const assen = [], lams = [];
  for (let k = 0; k < 2; k++) {
    let v = Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + k * 78.233) + 0.01 * i); let lam = 0;
    for (let it = 0; it < 500; it++) { const w = Bm.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); lam = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1; v = w.map((x) => x / lam); }
    assen.push(v.map((x) => x * Math.sqrt(lam))); lams.push(lam);
    Bm = Bm.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]));
  }
  return { assen, aandeel: (lams[0] + lams[1]) / spoor };
}
const kaart = mds(D);
const kaartPer = slugs.map((s, i) => {
  const echt = slugs.map((_, j) => D[i][j]);
  const opKaart = slugs.map((_, j) => Math.hypot(kaart.assen[0][i] - kaart.assen[0][j], kaart.assen[1][i] - kaart.assen[1][j]));
  const idx = slugs.map((_, j) => j).filter((j) => j !== i);
  const buurEcht = idx.sort((x, y) => echt[x] - echt[y]).slice(0, 3).map((j) => slugs[j]);
  const buurKaart = [...idx].sort((x, y) => opKaart[x] - opKaart[y]).slice(0, 3).map((j) => slugs[j]);
  return { slug: s, r: r2(corr(idx.map((j) => echt[j]), idx.map((j) => opKaart[j]))), buurEcht, buurKaart, gedeeld: buurEcht.filter((x) => buurKaart.includes(x)).length, nGedeeld: gem(idx.map((j) => partijAfstand(bank, s, slugs[j]).n)) };
});

// ---------- 4. Kandidaten en logo's ----------
const kand = slugs.map((s) => {
  const k = kandidaten[s] || [];
  const w = (t) => (t ? t.split(/\s+/).length : 0);
  return { slug: s, n: k.length, foto: k.filter((x) => x.foto).length, bio: k.filter((x) => x.bio).length, linkedin: k.filter((x) => x.linkedin).length, bioWoorden: r2(gem(k.filter((x) => x.bio).map((x) => w(x.bio)))), logo: !!logos[s]?.bestand };
});

// ---------- 5. Partijteksten ----------
const teksten = partijen.map((p) => {
  const w = (t) => (t ? t.split(/\s+/).length : 0);
  return { slug: p.slug, achtergrond: w(p.achtergrond), kernboodschap: w(p.kernboodschap), speerpunten: p.speerpunten.length, speerpuntWoorden: w(p.speerpunten.join(' ')), opvallend: (p.opvallend || []).length, dun: (p.dun || []).length, basis: !!p.basis };
});

// ---------- Groepen samenvatten ----------
function groep(fn) { return Object.fromEntries(Object.entries(GROEPEN).map(([g, l]) => [g, r2(gem(l.map(fn)))])); }
const groepen = {
  bekend: groep((s) => perPartij.find((r) => r.slug === s).bekend),
  sterk: groep((s) => perPartij.find((r) => r.slug === s).sterk),
  willekeurTop: groep((s) => pct(sims.willekeurig[s].top)),
  mengTop: groep((s) => pct(sims['meng-gewoon'][s].top)),
  herkend: groep((s) => pct(sims['meng-gewoon'][s].herkend)),
  deelWinstTovVerwacht: groep((s) => deel.per[s].winstMeng / deel.per[s].verwacht),
  genoemdInUitleg: groep((s) => perPartij.find((r) => r.slug === s).genoemdInUitleg),
  fotoAandeel: groep((s) => { const k = kand.find((x) => x.slug === s); return k.n ? k.foto / k.n : 0; }),
};

const uit = { gemaakt: '2026-11-15', snel: SNEL, groepen: GROEPEN, assen: assen.map((a) => r2(a.aandeel)), perPartij, perStelling, richting, voorTegen, genoemd, tabelZ, sims, maten, masker, deel, vast, zelf, zelfSterk, kaart: { aandeel: r2(kaart.aandeel), per: kaartPer }, kand, teksten, groepSamenvatting: groepen };
if (!SNEL) fs.writeFileSync(new URL('werk/audit/eindcontrole/metingen.json', W), JSON.stringify(uit, null, 1));

// ---------- Op het scherm ----------
const t = (rows) => console.table(rows);
console.log('Hoofdassen (aandeel variantie):', uit.assen);
console.log('Score per antwoord (kolommen -2..2) per partijpositie (rijen):'); t(tabelZ);
t(perPartij.map((r) => ({ partij: kort[r.slug], bekend: r.bekend, '+2': r.plus2, '+1': r.plus1, '0': r.nul, '-1': r.min1, '-2': r.min2, sterk: r2(r.sterk), prog: r.programma, hulp: r.stemhulp, afg: r.afgeleid, raad: r.stemgedrag, klein: r.kleineKant, uitleg: r.genoemdInUitleg, as1: r.as1 })));
console.log('Richting van eens per thema:'); t(richting);
console.log('Voor/tegen gemiddeld woorden:', r2(voorTegen.voor), r2(voorTegen.tegen), 'voor veel langer:', voorTegen.voorLanger.length, 'tegen veel langer:', voorTegen.tegenLanger.length);
t(slugs.map((s) => ({ partij: kort[s], willekTop: pct(sims.willekeurig[s].top), willekOnder: pct(sims.willekeurig[s].onder), mengTop: pct(sims['meng-gewoon'][s].top), sterkTop: pct(sims['meng-sterk'][s].top), mildTop: pct(sims['meng-mild'][s].top), herkend: pct(sims['meng-gewoon'][s].herkend), herkSterk: pct(sims['meng-sterk'][s].herkend), herkMild: pct(sims['meng-mild'][s].herkend), volger: pct(sims.volger[s].herkend) })));
console.log('Zelfde kiezers, drie rekenwijzen (aandeel bovenaan, %):');
t(slugs.map((s) => ({ partij: kort[s], z: pct(maten.z[s]), afstand: pct(maten.afstand[s]), alleenBekend: pct(maten.bekendAlleen[s]) })));
console.log('Maskeerproef (30% van de standpunten weg):');
t(slugs.map((s) => ({ partij: kort[s], anderVoor: pct(masker[s].anderVoor), anderNa: pct(masker[s].anderNa), herkendVoor: pct(masker[s].herkendVoor), herkendNa: pct(masker[s].herkendNa), bekendAlleen_anderVoor: pct(masker[s].bAnderVoor), bAnderNa: pct(masker[s].bAnderNa), bHerkVoor: pct(masker[s].bHerkendVoor), bHerkNa: pct(masker[s].bHerkendNa) })));
const gm = (k) => r2(gem(slugs.map((s) => masker[s][k])) * 100);
console.log('Maskeerproef gemiddeld (z):', gm('anderVoor'), '→', gm('anderNa'), '| eigen kiezers', gm('herkendVoor'), '→', gm('herkendNa'), '|| alleen bekend:', gm('bAnderVoor'), '→', gm('bAnderNa'), '| eigen', gm('bHerkendVoor'), '→', gm('bHerkendNa'));
console.log(`Deelproef: ${deel.n} uitslagen (leeg ${deel.leeg}), mediaan ${deel.mediaanSet} stellingen; gelijke stand bovenaan ${deel.gelijkTop} van ${deel.uitslagen}, binnen 0,5 punt ${deel.bijnaGelijk}`);
t(slugs.map((s) => { const x = deel.per[s]; return { partij: kort[s], mee: x.mee, willekWinst: r2(x.winst / x.verwacht), mengWinst: r2(x.winstMeng / x.verwacht), gelijkEerst: x.gelijkEerst, gelijkMee: x.gelijkMee, nulInSet: r2(x.nulInSet / x.setN), nulInThemas: r2(x.nulInBank / x.bankN) }; }));
console.log('Vast antwoord, rang per partij:'); t(Object.fromEntries(slugs.map((s) => [kort[s], Object.fromEntries(SCHAAL.map((v) => [v, vast[v][s].rang]))])));
console.log('Zelfherkenning (exact / sterk):'); t(Object.fromEntries(slugs.map((s) => [kort[s], { rang: zelf[s].rang, score: zelf[s].score, tweede: kort[zelf[s].tweede], tweedeScore: zelf[s].tweedeScore, sterkRang: zelfSterk[s].rang, sterkEerste: kort[zelfSterk[s].eerste] }])));
console.log('Kaart: aandeel verklaarde spreiding', uit.kaart.aandeel); t(kaartPer.map((k) => ({ partij: kort[k.slug], r: k.r, gedeeldeBuren: k.gedeeld, buurEcht: k.buurEcht.map((x) => kort[x]).join(', '), buurKaart: k.buurKaart.map((x) => kort[x]).join(', ') })));
t(kand.map((k) => ({ partij: kort[k.slug], n: k.n, foto: k.foto, bio: k.bio, linkedin: k.linkedin, bioWoorden: k.bioWoorden, logo: k.logo })));
t(teksten.map((x) => ({ partij: kort[x.slug], achtergrond: x.achtergrond, kern: x.kernboodschap, speerp: x.speerpunten, spWoorden: x.speerpuntWoorden, opvallend: x.opvallend, dun: x.dun, basis: x.basis })));
const bek = slugs.map((s) => perPartij.find((r) => r.slug === s).bekend);
const samenhang = { willekeurTop: r2(corr(bek, slugs.map((s) => sims.willekeurig[s].top))), mengTop: r2(corr(bek, slugs.map((s) => sims['meng-gewoon'][s].top))), herkend: r2(corr(bek, slugs.map((s) => sims['meng-gewoon'][s].herkend))), deelMeng: r2(corr(bek, slugs.map((s) => deel.per[s].winstMeng / deel.per[s].verwacht))), z_vs_alleenBekend: r2(corr(bek, slugs.map((s) => maten.z[s] - maten.bekendAlleen[s]))) };
uit.samenhangMetBekend = samenhang;
if (!SNEL) fs.writeFileSync(new URL('werk/audit/eindcontrole/metingen.json', W), JSON.stringify(uit, null, 1));
console.log('Correlatie met aantal bekende standpunten:', samenhang);
console.log('Groepen:'); t(groepen);
console.log('Links (hoofdas):', GROEPEN.links.map((s) => kort[s]).join(', '), '| Rechts:', GROEPEN.rechts.map((s) => kort[s]).join(', '));
