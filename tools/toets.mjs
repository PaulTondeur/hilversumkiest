// Eerlijkheidstoets voor de stellingenbank. `node tools/toets.mjs [--stil]`
// Schrijft data/toets.json (cijfers + een HTML-samenvatting voor de verantwoordingspagina).
import fs from 'node:fs';
import { kiesStellingen, bereken, positie, onderscheid, DIEPTES, zetMaat } from '../src/engine.mjs';
const mArg = process.argv.find((a) => a.startsWith('--maat='));
if (mArg) zetMaat(mArg.split('=')[1]);

const lees = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const partijen = lees('data/partijen.json');
const themas = lees('data/themas.json');
const bank = lees(process.argv.find((a) => a.endsWith('.json')) || 'data/stellingen.json');
const slugs = partijen.map((p) => p.slug);
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const stil = process.argv.includes('--stil');

// vaste willekeur, zodat de toets herhaalbaar is
let zaad = 20261118;
const rnd = () => { zaad = (zaad * 1664525 + 1013904223) >>> 0; return zaad / 4294967296; };
const kies = (arr) => arr[Math.floor(rnd() * arr.length)];
const schud = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SCHAAL = [-2, -1, 0, 1, 2];
const gem = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// 1. Dekking en richting per lijst
const perLijst = slugs.map((s) => {
  const ps = bank.map((st) => positie(st, s)).filter((v) => v !== null);
  return { slug: s, bekend: ps.length, gemiddelde: gem(ps), eens: ps.filter((v) => v > 0).length, midden: ps.filter((v) => v === 0).length, oneens: ps.filter((v) => v < 0).length };
});

// 2. Onderscheidend vermogen per stelling
const perStelling = bank.map((st) => {
  const ps = slugs.map((s) => positie(st, s));
  const bekend = ps.filter((v) => v !== null);
  const plus = bekend.filter((v) => v > 0).length;
  const min = bekend.filter((v) => v < 0).length;
  const kleinste = Math.min(plus, min);
  return { id: st.id, thema: st.thema, bekend: bekend.length, plus, nul: bekend.length - plus - min, min, kleinsteKant: bekend.length ? kleinste / bekend.length : 0, onderscheid: onderscheid(st, slugs) };
});

// 3. Zelfherkenning: wie precies antwoordt als lijst X, moet X bovenaan krijgen
function rangVan(set, mee, antwoorden, doel) {
  const uit = bereken(set, mee, antwoorden);
  const eigen = uit.find((u) => u.slug === doel).score;
  return 1 + uit.filter((u) => u.score > eigen + 1e-9).length;
}
const antwoordenVan = (set, slug, ruis = 0, overslaan = 0, willekeurig = 0) => {
  const a = {};
  for (const st of set) {
    const p = positie(st, slug);
    if (p === null) continue; // wie het programma volgt, heeft hier geen houvast: sla over
    if (rnd() < overslaan) continue;
    let v = p;
    if (rnd() < willekeurig) v = kies(SCHAAL);
    else if (rnd() < ruis) v = Math.max(-2, Math.min(2, v + (rnd() < 0.5 ? -1 : 1)));
    a[st.id] = v;
  }
  return a;
};
const zelf = slugs.map((s) => ({ slug: s, rang: rangVan(bank, slugs, antwoordenVan(bank, s), s) }));

// 4. Herkenning met ruis: een aanhanger die 40% overslaat, op een vijfde van de punten iets heel anders vindt
// en op de helft van de rest een stap afwijkt
const N_RUIS = 400;
const ruis = slugs.map((s) => {
  let top1 = 0, top3 = 0;
  for (let i = 0; i < N_RUIS; i++) {
    const r = rangVan(bank, slugs, antwoordenVan(bank, s, 0.5, 0.4, 0.2), s);
    if (r === 1) top1++;
    if (r <= 3) top3++;
  }
  return { slug: s, top1: top1 / N_RUIS, top3: top3 / N_RUIS };
});

// 5. Willekeurige kiezers: wie wint er als iemand zomaar wat invult?
const N_WILLEKEUR = 20000;
const winst = Object.fromEntries(slugs.map((s) => [s, 0]));
const gemScore = Object.fromEntries(slugs.map((s) => [s, 0]));
for (let i = 0; i < N_WILLEKEUR; i++) {
  const a = {};
  for (const st of bank) if (rnd() > 0.1) a[st.id] = kies(SCHAAL);
  const uit = bereken(bank, slugs, a);
  const top = uit.filter((u) => u.score > uit[0].score - 1e-9);
  for (const u of top) winst[u.slug] += 1 / top.length;
  for (const u of uit) gemScore[u.slug] += u.score / N_WILLEKEUR;
}
const willekeur = slugs.map((s) => ({ slug: s, winst: winst[s] / N_WILLEKEUR, gemScore: gemScore[s] }));

// 6. Ja-knikkers en nee-zeggers: overal hetzelfde antwoord
const vast = {};
for (const v of [2, 1, 0, -1, -2]) {
  const a = Object.fromEntries(bank.map((st) => [st.id, v]));
  const uit = bereken(bank, slugs, a);
  vast[v] = { top: uit.slice(0, 3).map((u) => [u.slug, +u.score.toFixed(3)]), onder: uit.slice(-2).map((u) => [u.slug, +u.score.toFixed(3)]), spreiding: +(uit[0].score - uit[uit.length - 1].score).toFixed(3) };
}

// 7. De echte werking: willekeurige deelverzamelingen van lijsten en thema's
const N_SUB = 3000;
let subZelf = 0, subTot = 0, subLeeg = 0;
const subGrootte = {};
const subWinst = Object.fromEntries(slugs.map((s) => [s, { mee: 0, winst: 0 }]));
for (let i = 0; i < N_SUB; i++) {
  const n = kies([2, 2, 3, 3, 4, 5, 6, 8]);
  const mee = schud(slugs).slice(0, n);
  const th = schud(themas.map((t) => t.id)).slice(0, kies([1, 2, 3, 4, 6, 11]));
  const diepte = kies(Object.keys(DIEPTES));
  const set = kiesStellingen(bank, mee, th, DIEPTES[diepte].perThema);
  if (!set.length) { subLeeg++; continue; }
  (subGrootte[n] ||= []).push(set.length);
  // zelfherkenning binnen de deelverzameling
  const doel = kies(mee);
  const a = antwoordenVan(set, doel);
  if (Object.keys(a).length) { subTot++; if (rangVan(set, mee, a, doel) === 1) subZelf++; }
  // willekeurige kiezer binnen de deelverzameling
  const w = {};
  for (const st of set) w[st.id] = kies(SCHAAL);
  const uit = bereken(set, mee, w);
  const top = uit.filter((u) => u.score > uit[0].score - 1e-9);
  for (const s of mee) subWinst[s].mee++;
  for (const u of top) subWinst[u.slug].winst += 1 / top.length;
}
// verwachte winstkans bij loting is 1/n per deelname; we rapporteren winst / verwacht
const subVerwacht = Object.fromEntries(slugs.map((s) => [s, 0]));
// (benadering: gemiddelde 1/n over deelnames is niet apart bijgehouden; we gebruiken de ratio winst/mee t.o.v. het gemiddelde over alle lijsten)
const subRatio = slugs.map((s) => ({ slug: s, kans: subWinst[s].mee ? subWinst[s].winst / subWinst[s].mee : 0 }));
const subGem = gem(subRatio.map((x) => x.kans));

// 8. Paren: op hoeveel stellingen verschilt elk tweetal?
const paren = [];
for (let i = 0; i < slugs.length; i++) for (let j = i + 1; j < slugs.length; j++) {
  const n = bank.filter((st) => onderscheid(st, [slugs[i], slugs[j]]) > 0).length;
  paren.push({ a: slugs[i], b: slugs[j], n });
}
paren.sort((x, y) => x.n - y.n);

const perThema = themas.map((t) => ({ thema: t.id, n: bank.filter((s) => s.thema === t.id).length, som: gem(bank.filter((s) => s.thema === t.id).flatMap((st) => slugs.map((s) => positie(st, s)).filter((v) => v !== null))) }));

const uitkomst = {
  gemaakt: new Date().toISOString().slice(0, 10),
  stellingen: bank.length,
  perLijst, perStelling, zelf, ruis, willekeur, vast, perThema,
  sub: { n: N_SUB, zelf: subTot ? subZelf / subTot : null, leeg: subLeeg, kans: subRatio, gemKans: subGem },
  minstVerschillendeParen: paren.slice(0, 12),
};

const pct = (v) => (v * 100).toFixed(0) + '%';
const wMin = Math.min(...willekeur.map((w) => w.winst)), wMax = Math.max(...willekeur.map((w) => w.winst));
const zwak = perStelling.filter((s) => s.kleinsteKant < 0.2);
uitkomst.html = `
<h2 id="toets">Hoe de eerlijkheid is getoetst</h2>
<div class="smal">
<p>Een stemhulp kan een lijst ongemerkt bevoordelen: door de keuze van stellingen, door de formulering, of doordat een vaag programma minder kan “mislopen” dan een uitgesproken programma. Daarom draait bij elke wijziging van de stellingenbank een vaste reeks proeven. Dit zijn de uitkomsten voor de huidige ${bank.length} stellingen (stand ${uitkomst.gemaakt}).</p>
<ul>
<li><strong>Zelfherkenning.</strong> Wie precies antwoordt zoals lijst X, moet lijst X bovenaan krijgen. Dat lukt voor ${zelf.filter((z) => z.rang === 1).length} van de ${zelf.length} lijsten${zelf.some((z) => z.rang > 1) ? ` (niet voor: ${zelf.filter((z) => z.rang > 1).map((z) => kort[z.slug]).join(', ')})` : ''}. Binnen willekeurig gekozen groepjes lijsten en thema's lukt het in ${subTot ? pct(subZelf / subTot) : '–'} van ${subTot} proeven.</li>
<li><strong>Aanhangers met eigen accenten.</strong> Een kiezer die vier van de tien stellingen overslaat, op een vijfde van de rest iets heel anders vindt dan zijn lijst en op de helft een stap afwijkt, krijgt die lijst gemiddeld in ${pct(gem(ruis.map((r) => r.top1)))} van de gevallen op één (laagste lijst: ${pct(Math.min(...ruis.map((r) => r.top1)))}, hoogste: ${pct(Math.max(...ruis.map((r) => r.top1)))}) en in ${pct(gem(ruis.map((r) => r.top3)))} bij de eerste drie.</li>
<li><strong>Willekeurige antwoorden.</strong> Bij ${N_WILLEKEUR.toLocaleString('nl-NL')} kiezers die zomaar iets invullen zou elke lijst idealiter even vaak winnen (5%). De uitkomst loopt van ${(wMin * 100).toFixed(1)}% tot ${(wMax * 100).toFixed(1)}%.</li>
<li><strong>Overal “eens” of overal “oneens”.</strong> Wie op alles hetzelfde antwoordt, mag daar geen lijst mee uitkiezen. Het verschil tussen de hoogste en laagste lijst is dan ${pct(vast[2].spreiding)} (overal eens) en ${pct(vast[-2].spreiding)} (overal oneens).</li>
<li><strong>Richting van de stellingen.</strong> Per lijst is geteld hoe vaak zij het met een stelling eens en oneens is. Geen lijst mag de vaste “ja-partij” of “nee-partij” zijn. Het gemiddelde standpunt per lijst loopt van ${Math.min(...perLijst.map((l) => l.gemiddelde)).toFixed(2)} tot ${Math.max(...perLijst.map((l) => l.gemiddelde)).toFixed(2)} op een schaal van −2 tot +2.</li>
<li><strong>Onderscheid.</strong> Bij ${bank.length - zwak.length} van de ${bank.length} stellingen staat minstens een vijfde van de lijsten met een standpunt aan elke kant.${zwak.length ? ` De overige ${zwak.length} zijn bewust gehouden omdat ze lijsten scheiden die verder dicht bij elkaar staan.` : ''}</li>
</ul>
</div>
<div class="tabel-wrap"><table><thead><tr><th>Lijst</th><th class="num">Eens</th><th class="num">Midden</th><th class="num">Oneens</th><th class="num">Wint bij willekeur</th><th class="num">Aanhanger op 1</th></tr></thead><tbody>
${perLijst.map((l) => `<tr><td>${kort[l.slug]}</td><td class="num">${l.eens}</td><td class="num">${l.midden}</td><td class="num">${l.oneens}</td><td class="num">${(willekeur.find((w) => w.slug === l.slug).winst * 100).toFixed(1)}%</td><td class="num">${pct(ruis.find((r) => r.slug === l.slug).top1)}</td></tr>`).join('\n')}
</tbody></table></div>`;

fs.writeFileSync(new URL('../data/toets.json', import.meta.url), JSON.stringify(uitkomst, null, 1));

if (!stil) {
  const t = (rows) => console.table(rows);
  console.log(`\n== ${bank.length} stellingen ==`);
  t(perThema.map((x) => ({ thema: x.thema, n: x.n, gemPositie: +x.som.toFixed(2) })));
  t(perLijst.map((l) => ({ lijst: l.slug, bekend: l.bekend, eens: l.eens, midden: l.midden, oneens: l.oneens, gem: +l.gemiddelde.toFixed(2), zelfRang: zelf.find((z) => z.slug === l.slug).rang, ruisTop1: +ruis.find((r) => r.slug === l.slug).top1.toFixed(2), ruisTop3: +ruis.find((r) => r.slug === l.slug).top3.toFixed(2), willekeur: +(willekeur.find((w) => w.slug === l.slug).winst * 100).toFixed(1), gemScore: +willekeur.find((w) => w.slug === l.slug).gemScore.toFixed(3), subKans: +(subRatio.find((x) => x.slug === l.slug).kans / subGem).toFixed(2) })));
  console.log('Vast antwoord:', JSON.stringify(vast, null, 0));
  console.log(`Deelverzamelingen: zelfherkenning ${subTot ? pct(subZelf / subTot) : '-'} (${subTot}), lege sets ${subLeeg}/${N_SUB}`);
  console.log('Zwak onderscheidende stellingen (<20% aan kleinste kant):', zwak.map((s) => `${s.id}[+${s.plus}/0:${s.nul}/-${s.min}/?${20 - s.bekend}]`).join(' '));
  console.log('Paren met de minste verschilstellingen:', paren.slice(0, 12).map((p) => `${p.a}~${p.b}:${p.n}`).join('  '));
}
