// Verdeelt de open verschillen per lijst (werk/codering/C/in/<slug>.json) en bundelt besluiten (C/besluiten.json).
import fs from 'node:fs';
const R = (p) => new URL('../' + p, import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
fs.mkdirSync(R('werk/codering/C/in/'), { recursive: true });
const besluiten = {};
for (const f of fs.readdirSync(R('werk/codering/C/'))) {
  if (!f.endsWith('.json') || f === 'besluiten.json') continue;
  for (const x of lees('werk/codering/C/' + f)) {
    const s = typeof x.s === 'number' ? x.s : null;
    besluiten[x.sleutel] = s === null ? { s: null } : { s, kern: x.kern, toelichting: x.toelichting, citaat: x.citaat || null, bron: x.bron || null, soort: x.soort || null };
  }
}
fs.writeFileSync(R('werk/codering/C/besluiten.json'), JSON.stringify(besluiten, null, 1));
const v = lees('werk/codering/verschillen.json').filter((x) => !besluiten[x.sleutel]);
const per = {};
for (const x of v) (per[x.slug] ||= []).push(x);
const wil = process.argv.slice(2);
for (const [slug, lijst] of Object.entries(per)) {
  if (wil.length && !wil.includes(slug)) continue;
  fs.writeFileSync(R(`werk/codering/C/in/${slug}.json`), JSON.stringify(lijst, null, 1));
}
console.log('besluiten:', Object.keys(besluiten).length, '| open per lijst:', Object.fromEntries(Object.entries(per).map(([k, l]) => [k, l.length])));
