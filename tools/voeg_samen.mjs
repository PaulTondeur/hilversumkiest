// Voegt de twee onafhankelijke coderingen samen tot data/stellingen.json en schrijft een lijst met verschillen
// die een derde ronde moet beslechten (werk/codering/verschillen.json).
// A = per lijst (heel programma gelezen), B = per thema (alle lijsten naast elkaar), C = beslechting (als aanwezig).
import fs from 'node:fs';
const R = (p) => new URL('../' + p, import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const bestaat = (p) => fs.existsSync(R(p));
const basis = lees('data/stellingen-basis.json');
const partijen = lees('data/partijen.json');
const B = lees('werk/codering/B/per-stelling.json');
const C = bestaat('werk/codering/C/besluiten.json') ? lees('werk/codering/C/besluiten.json') : {};
const feiten = {};
if (fs.existsSync(R('werk/feitencheck/'))) for (const f of fs.readdirSync(R('werk/feitencheck/'))) if (f.endsWith('.json')) for (const x of lees('werk/feitencheck/' + f)) feiten[x.id] = x;
const hand = bestaat('data/redactie.json') ? lees('data/redactie.json') : {};
// Vierde ronde: consistentiecontrole per stelling over alle lijsten heen (werk/audit/*.json).
const audit = {};
const auditStelling = {};
if (fs.existsSync(R('werk/audit/'))) for (const f of fs.readdirSync(R('werk/audit/'))) if (f.endsWith('.json')) {
  const a = lees('werk/audit/' + f);
  for (const w of a.wijzigingen || []) audit[`${w.id}|${w.slug}`] = w;
  for (const x of a.stellingen || []) auditStelling[x.id] = x;
}
const auditStat = { score: 0, tekst: 0, vervallen: 0 };
// Stellingteksten van andere stemhulpen: die mogen niet als citaat van een lijst worden getoond.
const plat = (t) => t.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, '');
const stemhulpStellingen = new Set();
for (const p of partijen) {
  const f = `bronnen/${p.slug}/extra-stemhulp-antwoorden.txt`;
  if (bestaat(f)) for (const m of fs.readFileSync(R(f), 'utf8').matchAll(/^Stelling: (.+)$/gm)) stemhulpStellingen.add(plat(m[1]));
}
// Afbreekstreepjes uit de pdf ("min-der") weghalen: alleen als het streepje in de brontekst aan een regeleinde staat
// en het woord daar nergens met een gewoon koppelteken voorkomt.
const brontekst = {};
const alleWoorden = new Set();
for (const q of partijen) { const f = `bronnen/${q.slug}/programma.txt`; if (bestaat(f)) for (const m of fs.readFileSync(R(f), 'utf8').toLowerCase().matchAll(/(?<![-\p{L}])\p{L}{4,}(?![-\p{L}])/gu)) alleWoorden.add(m[0]); }
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function ontkoppel(c, slug) {
  if (!c.includes('-')) return c;
  if (!(slug in brontekst)) {
    const map = `bronnen/${slug}/`;
    brontekst[slug] = fs.existsSync(R(map)) ? fs.readdirSync(R(map)).filter((f) => f.endsWith('.txt')).map((f) => fs.readFileSync(R(map + f), 'utf8')).join('\n') : '';
  }
  const t = brontekst[slug];
  return c.replace(/(\p{L}{2,})-(\p{L}{2,})/gu, (heel, x, y) => {
    if (/^(en|of)$/i.test(y)) return heel;
    const aanRegeleinde = new RegExp(esc(x) + '-[ \\t]*\\r?\\n\\s*' + esc(y), 'u').test(t);
    const gewoon = t.includes(heel);
    // twee zelfstandige woorden die samen geen bestaand woord vormen ("positief-kritisch"): echt koppelteken
    const tweeWoorden = alleWoorden.has(x.toLowerCase()) && alleWoorden.has(y.toLowerCase()) && !alleWoorden.has((x + y).toLowerCase());
    return aanRegeleinde && !gewoon && !tweeWoorden ? x + y : heel;
  });
}
const isStemhulpStelling = (c) => { const x = plat(c); if (x.length < 12) return true; for (const t of stemhulpStellingen) if (t.includes(x) || x.includes(t)) return true; return false; };

const A = {};
for (const p of partijen) {
  const f = `werk/codering/A/${p.slug}.json`;
  if (bestaat(f)) A[p.slug] = Object.fromEntries(lees(f).map((x) => [x.id, x]));
}
const num = (v) => (typeof v === 'number' ? v : null);
const stat = { gelijk: 0, beideNull: 0, eenStap: 0, conflict: 0, alleenA: 0, alleenB: 0, totaal: 0, zonderA: 0 };
const verschillen = [];
const uit = basis.map((st) => {
  const posities = {};
  for (const p of partijen) {
    const a = A[p.slug]?.[st.id];
    const b = B[st.id]?.[p.slug] || { s: null };
    const sa = a ? num(a.s) : null, sb = num(b.s);
    const sleutel = `${st.id}|${p.slug}`;
    const detailA = a && sa !== null ? { s: sa, kern: a.kern, toelichting: a.toelichting, citaat: a.citaat || null, bron: a.bron || null, soort: a.soort || null } : null;
    const detailB = sb !== null ? { s: sb, kern: b.kern || null, toelichting: null, citaat: null, bron: null, soort: /mijnstem/i.test(b.basis || '') ? 'mijnstem' : /stemgids/i.test(b.basis || '') ? 'stemgids' : /hilversums/i.test(b.basis || '') ? 'hilversumsnieuws' : /stemgedrag/i.test(b.basis || '') ? 'stemgedrag' : /afgeleid/i.test(b.basis || '') ? 'afgeleid' : 'programma', _basis: b.basis } : null;
    let keuze;
    if (!A[p.slug]) { stat.zonderA++; keuze = detailB || { s: null }; }
    else {
      stat.totaal++;
      if (sa === null && sb === null) { stat.beideNull++; keuze = { s: null }; }
      else if (sa !== null && sb !== null && sa === sb) { stat.gelijk++; keuze = detailA; }
      else if (sa !== null && sb !== null && Math.abs(sa - sb) === 1 && sa * sb >= 0) { stat.eenStap++; keuze = detailA; }
      else if (sa !== null && sb === null) {
        stat.alleenA++;
        if (a.soort === 'afgeleid' || a.zeker === 'laag') { verschillen.push({ sleutel, id: st.id, slug: p.slug, soort: 'alleen A (afgeleid/laag)', A: a, B: b }); keuze = { s: null }; }
        else keuze = detailA;
      } else if (sa === null && sb !== null) {
        stat.alleenB++;
        if (detailB.soort === 'afgeleid') keuze = { s: null };
        else { verschillen.push({ sleutel, id: st.id, slug: p.slug, soort: 'alleen B', A: a, B: b }); keuze = { s: null }; }
      } else { stat.conflict++; verschillen.push({ sleutel, id: st.id, slug: p.slug, soort: 'tegenstrijdig', A: a, B: b }); keuze = { s: null }; }
    }
    if (C[sleutel]) { keuze = C[sleutel]; stat.beslecht = (stat.beslecht || 0) + 1; }
    const w = audit[sleutel];
    if (w) {
      const sn = typeof w.s_nieuw === 'number' ? w.s_nieuw : null;
      const oud = typeof keuze.s === 'number' ? keuze.s : null;
      if (sn === null) { if (oud !== null) auditStat.vervallen++; keuze = { s: null }; }
      else {
        if (sn !== oud) auditStat.score++; else auditStat.tekst++;
        keuze = { ...keuze, s: sn, kern: w.kern || keuze.kern, toelichting: w.toelichting || keuze.toelichting, citaat: w.citaat || keuze.citaat || null, bron: w.bron || keuze.bron || null, soort: w.soort || keuze.soort || 'afgeleid' };
      }
    }
    // Eindredactie: bij een herformuleerde stelling kunnen scores verschuiven (tekst van het standpunt blijft).
    const hr = hand[st.id];
    if (hr?.alleen_posities) keuze = p.slug in hr.alleen_posities && typeof keuze.s === 'number' ? { ...keuze, s: hr.alleen_posities[p.slug] } : { s: null };
    if (hr?.posities && p.slug in hr.posities && typeof keuze.s === 'number') keuze = { ...keuze, s: hr.posities[p.slug] };
    const { _basis, ...schoon } = keuze;
    // Een kaal "Antwoord: voor" of een herhaling van de stemhulp-stelling is geen citaat van de lijst.
    if (schoon.citaat && /^\s*(Antwoord|Stelling|Herkomst)\s*:/i.test(schoon.citaat)) schoon.citaat = null;
    if (schoon.citaat && isStemhulpStelling(schoon.citaat)) schoon.citaat = null;
    if (schoon.citaat && /geen toelichting/i.test(schoon.citaat)) schoon.citaat = null;
    if (schoon.citaat) schoon.citaat = ontkoppel(schoon.citaat.replace(/\s+/g, ' ').trim(), p.slug);
    // Bronvermelding leesbaar maken: geen schuifbalkwaarden, geen pijpjes.
    if (schoon.bron) schoon.bron = schoon.bron.replace(/\s*\((?:schuifbalk\s*)?\d{1,3}\)/gi, '').replace(/\s*\|\s*/g, '; ').replace(/\s+/g, ' ').trim();
    posities[p.slug] = schoon;
  }
  const f = feiten[st.id] || {};
  const h = hand[st.id] || {};
  return { ...st, stelling: h.stelling || st.stelling, kop: h.kop || st.kop, uitleg: h.uitleg || f.uitleg_nieuw || st.uitleg, voor: h.voor || f.voor_nieuw || st.voor, tegen: h.tegen || f.tegen_nieuw || st.tegen, posities };
}).filter((st) => !(hand[st.id] && hand[st.id].schrap));
// Woordkeus op de site: het gaat om partijen. 'Lijst' blijft alleen staan waar het een opsomming is ("een vaste lijst van").
const woordkeus = (t) => t.replace(/\b([Dd]e|[Dd]eze|[Dd]ie|[Ee]lke|[Ee]en|[Gg]een) lijst\b(?! van)/g, '$1 partij').replace(/\blijsten\b/g, 'partijen').replace(/\bLijsten\b/g, 'Partijen');
for (const st of uit) {
  for (const veld of ['stelling', 'uitleg', 'voor', 'tegen', 'kop']) if (typeof st[veld] === 'string') st[veld] = woordkeus(st[veld]);
  for (const pos of Object.values(st.posities || {})) for (const veld of ['kern', 'toelichting']) if (typeof pos[veld] === 'string') pos[veld] = woordkeus(pos[veld]);
}
fs.writeFileSync(R('data/stellingen.json'), JSON.stringify(uit, null, 1));
fs.writeFileSync(R('werk/codering/verschillen.json'), JSON.stringify(verschillen, null, 1));
fs.writeFileSync(R('werk/codering/statistiek.json'), JSON.stringify(stat, null, 1));
console.log('lijsten met codering A:', Object.keys(A).length, '| stellingen:', uit.length, '| beslecht (C):', Object.keys(C).length);
console.log('audit:', auditStat);
fs.writeFileSync(R('werk/codering/statistiek.json'), JSON.stringify({ ...stat, audit: auditStat }, null, 1));
console.log(stat, '| open verschillen:', verschillen.filter((v) => !C[v.sleutel]).length);
