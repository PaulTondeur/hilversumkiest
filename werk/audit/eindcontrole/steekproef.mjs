// Eindcontrole neutraliteit: trekt per partij een vaste steekproef van standpunten om opnieuw tegen de bron te lezen.
// `node werk/audit/eindcontrole/steekproef.mjs` → werk/audit/eindcontrole/steekproef/<partij>.blind.json en .site.json
// Per partij: alle stellingen waar ronde A en B van richting verschilden (tegengesteld, of midden tegen een kant),
// alle stellingen die nu 'geen standpunt' zijn terwijl een van de rondes wel een standpunt zag,
// en daarnaast een gespreide trekking (één per thema, aangevuld tot 12) uit de overige stellingen, plus 3 overige 'geen standpunt'.
import fs from 'node:fs';
const W = new URL('../../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const bank = lees('data/stellingen.json');
const B = lees('werk/codering/B/per-stelling.json');
const themas = lees('data/themas.json').map((t) => t.id);
let zaad = 20261115;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const schud = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uit = new URL('werk/audit/eindcontrole/steekproef/', W);
fs.mkdirSync(uit, { recursive: true });
const overzicht = {};
for (const p of partijen) {
  const A = lees(`werk/codering/A/${p.slug}.json`);
  const reden = new Map();
  for (const st of bank) {
    const a = A.find((x) => x.id === st.id)?.s ?? null;
    const b = B[st.id]?.[p.slug]?.s ?? null;
    const f = st.posities[p.slug]?.s ?? null;
    if (a !== null && b !== null && Math.sign(a) !== Math.sign(b)) reden.set(st.id, 'A/B andere richting');
    else if (f === null && (a !== null && a !== 0 || b !== null && b !== 0)) reden.set(st.id, 'nu geen standpunt, een ronde zag er wel een');
  }
  const rest = schud(bank.filter((st) => !reden.has(st.id)));
  const bekend = rest.filter((st) => st.posities[p.slug]?.s != null);
  const onbekend = rest.filter((st) => st.posities[p.slug]?.s == null);
  const extra = [];
  for (const t of themas) { const x = bekend.find((st) => st.thema === t && !extra.includes(st)); if (x) extra.push(x); }
  for (const x of bekend) { if (extra.length >= 12) break; if (!extra.includes(x)) extra.push(x); }
  extra.forEach((st) => reden.set(st.id, 'gespreide trekking'));
  onbekend.slice(0, 3).forEach((st) => reden.set(st.id, 'gespreide trekking (geen standpunt)'));
  const ids = bank.filter((st) => reden.has(st.id)).map((st) => st.id);
  const blind = ids.map((id) => { const st = bank.find((s) => s.id === id); return { id, thema: st.thema, stelling: st.stelling, uitleg: st.uitleg }; });
  const site = ids.map((id) => { const st = bank.find((s) => s.id === id); const x = st.posities[p.slug] || {}; return { id, s: x.s ?? null, kern: x.kern ?? null, toelichting: x.toelichting ?? null, citaat: x.citaat ?? null, bron: x.bron ?? null, soort: x.soort ?? null }; });
  fs.writeFileSync(new URL(`${p.slug}.blind.json`, uit), JSON.stringify(blind, null, 1));
  fs.writeFileSync(new URL(`${p.slug}.site.json`, uit), JSON.stringify(site, null, 1));
  overzicht[p.slug] = Object.fromEntries(ids.map((id) => [id, reden.get(id)]));
}
fs.writeFileSync(new URL('steekproef.json', uit), JSON.stringify(overzicht, null, 1));
const tel = Object.fromEntries(Object.entries(overzicht).map(([s, o]) => [s, Object.keys(o).length]));
console.log(tel, Object.values(tel).reduce((a, b) => a + b, 0));
