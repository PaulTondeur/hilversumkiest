// Telt de uitkomst van de leesrondes (werk/audit/eindcontrole/lezing/<partij>.json) per partij en per groep.
//   node werk/audit/eindcontrole/tel_lezing.mjs
import fs from 'node:fs';
const W = new URL('../../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const steek = lees('werk/audit/eindcontrole/steekproef/steekproef.json');
const OORDELEN = ['klopt', 'een-stap', 'een-stap-te-ver', 'andere-richting', 'ten-onrechte-geen', 'ten-onrechte-wel'];
const rijen = [];
const fouten = [];
for (const p of partijen) {
  const f = new URL(`werk/audit/eindcontrole/lezing/${p.slug}.json`, W);
  if (!fs.existsSync(f)) { rijen.push({ partij: p.kort, gelezen: 0 }); continue; }
  const l = JSON.parse(fs.readFileSync(f, 'utf8'));
  const r = { partij: p.kort, gelezen: l.length };
  for (const o of OORDELEN) r[o] = l.filter((x) => x.oordeel === o).length;
  r.anders = l.filter((x) => !OORDELEN.includes(x.oordeel)).length;
  r.fout = r['een-stap-te-ver'] + r['andere-richting'] + r['ten-onrechte-geen'] + r['ten-onrechte-wel'];
  r.foutPct = Math.round((100 * r.fout) / l.length);
  // richting van de fout voor de partij: zou ze meer of minder standpunten krijgen?
  r.citaatNiet = l.filter((x) => x.citaat && x.citaat !== 'letterlijk' && x.citaat !== 'n.v.t.').length;
  r.toonOpm = l.filter((x) => x.toon && x.toon !== 'zakelijk' && x.toon !== 'n.v.t.').length;
  const ab = Object.entries(steek[p.slug]).filter(([, v]) => v === 'A/B andere richting').map(([k]) => k);
  r.abGelezen = ab.length;
  r.abFout = l.filter((x) => ab.includes(x.id) && !['klopt', 'een-stap'].includes(x.oordeel)).length;
  rijen.push(r);
  for (const x of l) if (!['klopt', 'een-stap'].includes(x.oordeel)) fouten.push({ partij: p.slug, id: x.id, site: x.site_s, eigen: x.eigen_s, oordeel: x.oordeel, opmerking: x.opmerking });
}
console.table(rijen);
// per laag van de steekproef: de gespreide trekking is representatief, de andere lagen zijn bewust gezocht
const lagen = {};
for (const p of partijen) {
  const f = new URL(`werk/audit/eindcontrole/lezing/${p.slug}.json`, W);
  if (!fs.existsSync(f)) continue;
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const laag = steek[p.slug][x.id] || '?';
    const t = (lagen[laag] ||= { gelezen: 0, fout: 0, geen: 0, richting: 0 });
    t.gelezen++;
    if (!['klopt', 'een-stap'].includes(x.oordeel)) t.fout++;
    if (x.oordeel === 'ten-onrechte-geen') t.geen++;
    if (x.oordeel === 'andere-richting') t.richting++;
  }
}
console.table(lagen);
const som = (k) => rijen.reduce((s, r) => s + (r[k] || 0), 0);
console.log('Totaal gelezen', som('gelezen'), '| fout', som('fout'), `(${Math.round((100 * som('fout')) / som('gelezen'))}%)`, '| waarvan ten-onrechte-geen', som('ten-onrechte-geen'), '| andere richting', som('andere-richting'), '| A/B-gevallen', som('abGelezen'), 'waarvan fout', som('abFout'));
fs.writeFileSync(new URL('werk/audit/eindcontrole/lezing/_telling.json', W), JSON.stringify({ rijen, lagen, fouten }, null, 1));
