// Maakt de tabellen per partij en per groep voor het rapport, uit metingen.json, varianten.json en lezing/_telling.json.
//   node werk/audit/eindcontrole/tabellen.mjs > werk/audit/eindcontrole/tabellen.md
import fs from 'node:fs';
const W = new URL('../../../', import.meta.url);
const lees = (p) => JSON.parse(fs.readFileSync(new URL(p, W), 'utf8'));
const partijen = lees('data/partijen.json');
const m = lees('werk/audit/eindcontrole/metingen.json');
const v = lees('werk/audit/eindcontrole/varianten.json');
const t = lees('werk/audit/eindcontrole/lezing/_telling.json');
const kort = Object.fromEntries(partijen.map((p) => [p.slug, p.kort]));
const pp = (s) => m.perPartij.find((r) => r.slug === s);
const f1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? '–' : (Math.round(x * 10) / 10).toLocaleString('nl-NL'));
const pc = (x) => f1(x * 100);
const tabel = (kop, rijen) => `| ${kop.join(' | ')} |\n|${kop.map((k, i) => (i ? '---:' : '---')).join('|')}|\n${rijen.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;

console.log('### Tabel A. Standpunten per partij\n');
console.log(tabel(['Partij', 'Bekend (van 90)', '+2', '+1', '0', '−1', '−2', 'Aandeel ±2', 'Programma', 'Stemhulp', 'Stemgedrag', 'Afgeleid', 'Programma (woorden)'],
  partijen.map((p) => { const r = pp(p.slug); return [p.kort, r.bekend, r.plus2, r.plus1, r.nul, r.min1, r.min2, pc(r.sterk) + '%', r.programma, r.stemhulp, r.stemgedrag, r.afgeleid, r.programmaWoorden.toLocaleString('nl-NL')]; })));

console.log('\n### Tabel B. Uitslag per partij: huidige rekenwijze en het voorstel\n');
console.log('Herkend = aandeel van de kiezers met deze partij als hoofdpartij (mengkiezer, zie methode) dat haar bovenaan krijgt. Willekeur = aandeel bovenaan bij willekeurige antwoorden (eerlijk is 5%). Alle twintig partijen en alle 90 stellingen.\n');
console.log(tabel(['Partij', 'Bekend', 'Herkend nu', 'Herkend voorstel', 'Willekeur nu', 'Willekeur voorstel', 'Willekeur onderaan nu', 'Maskeer: eigen kiezers nu', 'Maskeer: voorstel'],
  partijen.map((p) => { const s = p.slug; return [p.kort, pp(s).bekend, f1(v.site.herkend[s]) + '%', f1(v.zBekend.herkend[s]) + '%', f1(v.site.willekeurTop[s]) + '%', f1(v.zBekend.willekeurTop[s]) + '%', pc(m.sims.willekeurig[s].onder) + '%', `${f1(v.site.masker[s].eigenVoor)} → ${f1(v.site.masker[s].eigenNa)}%`, `${f1(v.zBekend.masker[s].eigenVoor)} → ${f1(v.zBekend.masker[s].eigenNa)}%`]; })));

console.log('\n### Tabel C. Rekenwijzen naast elkaar (zelfde kiezers)\n');
const sv = (k) => v[k].samenvatting;
console.log(tabel(['Rekenwijze', 'Willekeur min–max', 'Samenhang willekeur en aantal bekend', 'Herkend gemiddeld (laagste)', 'Samenhang herkend en aantal bekend', 'Maskeerproef: andere kiezers', 'Maskeerproef: eigen kiezers', 'Spreiding bij overal hetzelfde antwoord (+2/+1/0/−1/−2)', 'Dunne winst in deelverzamelingen'],
  [['Site nu', 'site'], ['Voorstel: geen standpunt telt niet mee', 'zBekend'], ['Idem met krimp', 'zKrimp'], ['Gewone afstand, alleen bekend', 'afstandBekend']].map(([n, k]) => [n, `${f1(sv(k).willekeurMin)}–${f1(sv(k).willekeurMax)}%`, f1(sv(k).willekeurCorrBekend), `${f1(sv(k).herkendGem)}% (${f1(sv(k).herkendMin)}%)`, f1(sv(k).herkendCorrBekend), sv(k).maskerAnder + '%', sv(k).maskerEigen + '%', sv(k).vastSpreiding, sv(k).deelDunneWinst === undefined ? '–' : f1(sv(k).deelDunneWinst) + '%'])));

console.log('\n### Tabel D. Gelijke stand en de keuze van stellingen (deelverzamelingen zoals bezoekers ze maken)\n');
console.log(`${m.deel.n.toLocaleString('nl-NL')} proeven met 2 tot 20 partijen en 1 tot 11 thema's, telkens een willekeurige kiezer en een mengkiezer: ${m.deel.uitslagen.toLocaleString('nl-NL')} uitslagen. Exact gelijke stand bovenaan: ${m.deel.gelijkTop} keer (${pc(m.deel.gelijkTop / m.deel.uitslagen)}%); binnen een half procentpunt ('staan even dicht bij je'): ${m.deel.bijnaGelijk} keer (${pc(m.deel.bijnaGelijk / m.deel.uitslagen)}%).\n`);
console.log(tabel(['Partij', 'Slug (bepaalt nu de volgorde)', 'Bij gelijke stand bovenaan', 'Daarvan als eerste genoemd', 'Winst t.o.v. verwacht (mengkiezer)', 'Geen standpunt in gekozen stellingen', 'Geen standpunt in die thema\'s'],
  partijen.map((p) => { const x = m.deel.per[p.slug]; return [p.kort, p.slug, x.gelijkMee, `${x.gelijkEerst} (${x.gelijkMee ? Math.round((100 * x.gelijkEerst) / x.gelijkMee) : 0}%)`, f1(x.winstMeng / x.verwacht), pc(x.nulInSet / x.setN) + '%', pc(x.nulInBank / x.bankN) + '%']; })));

console.log('\n### Tabel E. Leesronde: steekproef tegen de bron\n');
console.log(tabel(['Partij', 'Gelezen', 'Klopt', 'Eén stap (verdedigbaar)', 'Eén stap te ver', 'Andere richting', 'Ten onrechte geen standpunt', 'Ten onrechte wel', 'Fout %'],
  t.rijen.map((r) => [r.partij, r.gelezen, r.klopt, r['een-stap'], r['een-stap-te-ver'], r['andere-richting'], r['ten-onrechte-geen'], r['ten-onrechte-wel'], r.foutPct + '%'])));
console.log(tabel(['Laag van de steekproef', 'Gelezen', 'Fout', 'Ten onrechte geen', 'Andere richting'], Object.entries(t.lagen).map(([k, x]) => [k, x.gelezen, `${x.fout} (${Math.round((100 * x.fout) / x.gelezen)}%)`, x.geen, x.richting])));

console.log('\n### Tabel F. Presentatie, kandidaten en teksten per partij\n');
console.log(tabel(['Partij', 'Kandidaten', 'Foto', 'Beschrijving', 'LinkedIn', 'Woorden per beschrijving', 'Logo', 'Woorden achtergrond', 'Woorden kernboodschap', 'Speerpunten', 'Genoemd in uitleg stellingen', 'Kaart: juiste buren (van 3)'],
  partijen.map((p) => { const k = m.kand.find((x) => x.slug === p.slug), x = m.teksten.find((y) => y.slug === p.slug), kp = m.kaart.per.find((y) => y.slug === p.slug); return [p.kort, k.n, k.foto, k.bio, k.linkedin, f1(k.bioWoorden), k.logo ? 'ja' : 'nee (naam)', x.achtergrond, x.kernboodschap, x.speerpunten, pp(p.slug).genoemdInUitleg, kp.gedeeld]; })));

console.log('\n### Tabel G. Per groep (gemiddelde van de partijen in de groep)\n');
const g = m.groepSamenvatting;
const groepen = Object.keys(m.groepen);
const namen = { bekend: 'Standpunten bekend', sterk: 'Aandeel ±2 (%)', willekeurTop: 'Bovenaan bij willekeur (%)', mengTop: 'Bovenaan bij mengkiezers (%)', herkend: 'Herkend door eigen kiezers (%)', deelWinstTovVerwacht: 'Winst in deelverzamelingen t.o.v. verwacht', genoemdInUitleg: 'Genoemd in uitleg', fotoAandeel: 'Kandidaten met foto (%)' };
const pct100 = new Set(['sterk', 'fotoAandeel']);
const herkV = Object.fromEntries(groepen.map((gr) => [gr, m.groepen[gr].reduce((s, x) => s + v.zBekend.herkend[x], 0) / m.groepen[gr].length]));
console.log(tabel(['Maat', ...groepen.map((x) => `${x} (${m.groepen[x].length})`)], [...Object.entries(namen).map(([k, n]) => [n, ...groepen.map((gr) => (pct100.has(k) ? pc(g[k][gr]) : f1(g[k][gr])))]), ['Herkend, voorstel (%)', ...groepen.map((gr) => f1(herkV[gr]))]]));
console.log('Indeling: ' + groepen.map((gr) => `**${gr}**: ${m.groepen[gr].map((s) => kort[s]).join(', ')}`).join('; ') + '.');
