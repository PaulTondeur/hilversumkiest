// Test het lezen, rekenen en controleren tegen echte uitslagen van eerdere verkiezingen in Hilversum, en laat zien dat
// kapotte of onvolledige bronnen worden tegengehouden.   node tools/uitslag/test.mjs
//   test/gr2022-hilversum-*.eml.xml: gemeenteraad 16 maart 2022 (Kiesraad, data.overheid.nl), telling ingekort tot 2
//   stembureaus; test/tk2025-hilversum-osv4-3.csv: Tweede Kamer 29 oktober 2025, zoals hilversum.nl hem publiceerde.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leesEmlTelling, leesEmlResultaat, leesOsv, naarUitslag } from './bronnen.mjs';
import { controleer, vergelijk, vulAan, waarschuwingen } from '../../src/uitslagcontrole.mjs';
import { verdeelZetels, gekozenen } from '../../src/zetels.mjs';

const T = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test');
const lees = (f) => fs.readFileSync(path.join(T, f), 'utf8');
let goed = 0, fout = 0;
const test = (naam, ok, info = '') => { if (ok) goed++; else fout++; console.log(`${ok ? 'goed' : 'FOUT'}  ${naam}${info ? `  (${info})` : ''}`); };
const gooit = (f) => { try { f(); return null; } catch (err) { return err.fouten?.join('; ') || err.message; } };

// De partijen en kandidaten van 2022 uit de kandidatenlijsten (EML 230), in de vorm van data/partijen.json.
export function site2022() {
  const xml = lees('gr2022-hilversum-230.eml.xml').replace(/<(\/?)[\w-]+:/g, '<$1');
  const partijen = [], kandidaten = {};
  for (const [, aff] of xml.matchAll(/<Affiliation>([\s\S]*?)<\/Affiliation>/g)) {
    const nr = +aff.match(/<AffiliationIdentifier Id="(\d+)"/)[1];
    const naam = aff.match(/<RegisteredName>([^<]*)</)[1];
    const slug = `lijst-${nr}`;
    partijen.push({ slug, nr, naam, kort: naam, kleur: '#888888', lijsttrekker: '' });
    kandidaten[slug] = [...aff.matchAll(/<Candidate>([\s\S]*?)<\/Candidate>/g)].map(([, c]) => ({
      nr: +c.match(/<CandidateIdentifier Id="(\d+)"/)[1],
      naam: [c.match(/<FirstName>([^<]*)</)?.[1], c.match(/<NamePrefix>([^<]*)</)?.[1], c.match(/<LastName>([^<]*)</)?.[1]].filter(Boolean).join(' '),
      woonplaats: c.match(/<LocalityName>([^<]*)</)?.[1] || '',
    }));
  }
  return { partijen, kandidaten };
}

const { partijen, kandidaten } = site2022();
const Z = { zetels: 37 };
const telling = leesEmlTelling(lees('gr2022-hilversum-510b-ingekort.eml.xml'));
const resultaat = leesEmlResultaat(lees('gr2022-hilversum-520.eml.xml'));
const meta = { naam: 'Gemeente Hilversum (test 2022)', url: 'https://www.hilversum.nl/' };

test('EML 510: 12 partijen gelezen', telling.lijsten.length === 12 && partijen.length === 12);
test('EML 510: geldige stemmen = som van de partijen', telling.geldig === telling.lijsten.reduce((n, l) => n + l.stemmen, 0), `${telling.geldig}`);
test('EML 510: voorkeurstemmen tellen per partij op', telling.lijsten.every((l) => Object.values(l.kandidaten).reduce((a, b) => a + b, 0) === l.stemmen));

// Zetels: onze berekening tegen de officiële uitkomst van 2022 (aantal gekozenen per partij in EML 520).
const officieel = Object.fromEntries(partijen.map((p) => [p.slug, resultaat.lijsten.find((l) => l.nr === p.nr)?.gekozenNamen.length || 0]));
const max = Object.fromEntries(partijen.map((p) => [p.slug, kandidaten[p.slug].length]));
const v = verdeelZetels(Object.fromEntries(telling.lijsten.map((l) => [`lijst-${l.nr}`, l.stemmen])), 37, max);
test('zetelverdeling 2022 klopt met het centraal stembureau', partijen.every((p) => v.zetels[p.slug] === officieel[p.slug]), partijen.map((p) => `${p.nr}:${v.zetels[p.slug]}/${officieel[p.slug]}`).join(' '));
// Wie gekozen is: onze toepassing van de voorkeurdrempel tegen de officiële lijst.
const gekozenOk = partijen.every((p) => {
  const l = telling.lijsten.find((x) => x.nr === p.nr);
  const r = gekozenen(kandidaten[p.slug].map((k) => ({ nr: k.nr, stemmen: l.kandidaten[k.nr] })), v.zetels[p.slug], v.kiesdeler);
  const o = naarUitslag(telling, { partijen, kandidaten, stadium: 'officieel', bijgewerkt: '2022-03-21T10:00:00+01:00', bronMeta: { naam: 'x', url: 'https://x' }, resultaat }).gekozen[p.slug];
  const gelijk = [...r.gekozen].sort((a, b) => a - b).join() === [...o].sort((a, b) => a - b).join();
  if (!gelijk) console.log(`   ${p.kort}: berekend ${r.gekozen} tegen officieel ${o}`);
  return gelijk;
});
test('gekozen kandidaten 2022 (voorkeurdrempel 25%) kloppen met het centraal stembureau', gekozenOk);

// Van bron naar data/uitslag.json, en door de controles.
const u = naarUitslag(telling, { partijen, kandidaten, stadium: 'voorlopig', bijgewerkt: '2022-03-17T01:48:44+01:00', bronMeta: meta });
test('omzetten 2022: controles slagen', controleer(u, partijen, kandidaten, Z).length === 0, controleer(u, partijen, kandidaten, Z).join('; '));
const uo = naarUitslag(telling, { partijen, kandidaten, stadium: 'officieel', bijgewerkt: '2022-03-21T10:00:00+01:00', bronMeta: meta, resultaat });
test('omzetten 2022 met EML 520: controles slagen, zetels uit de bron nagerekend', controleer(uo, partijen, kandidaten, Z).length === 0, controleer(uo, partijen, kandidaten, Z).join('; '));
test('vulAan berekent dezelfde gekozenen', JSON.stringify(vulAan(u, partijen, kandidaten, 37).gekozen) === JSON.stringify(Object.fromEntries(partijen.map((p) => [p.slug, vulAan(u, partijen, kandidaten, 37).gekozen[p.slug]]))));

// osv4-3-csv van TK2025: vorm lezen en optellen (andere verkiezing, dus niet koppelen aan de partijen van de site).
const osv = leesOsv(lees('tk2025-hilversum-osv4-3.csv'));
test('osv4-3: partijen, kandidaten en stembureaus gelezen', osv.lijsten.length > 20 && osv.bureaus.totaal > 40 && osv.datum === '2025-10-29', `${osv.lijsten.length} partijen, ${osv.bureaus.totaal} stembureaus`);
test('osv4-3: geldige stemmen = som van de partijen', osv.geldig === osv.lijsten.reduce((n, l) => n + l.stemmen, 0), `${osv.geldig}`);
test('osv4-3: voorkeurstemmen tellen per partij op', osv.lijsten.every((l) => Object.values(l.kandidaten).reduce((a, b) => a + b, 0) === l.stemmen));

// ---------- Kapotte en onvolledige bronnen ----------
const xml = lees('gr2022-hilversum-510b-ingekort.eml.xml');
test('afgekapt bestand wordt niet gelezen', !!gooit(() => leesEmlTelling(xml.slice(0, 3000))));
test('ander soort bestand (520 als telling) wordt niet gelezen', !!gooit(() => leesEmlTelling(lees('gr2022-hilversum-520.eml.xml'))));
const zonderPartij = xml.replace(/<Selection><AffiliationIdentifier Id="12">[\s\S]*?(?=<Cast>)/, '');
test('partij ontbreekt: tegengehouden', !!gooit(() => naarUitslag(leesEmlTelling(zonderPartij), { partijen, kandidaten, stadium: 'voorlopig', bijgewerkt: '2022-03-17T02:00:00+01:00', bronMeta: meta })));
const andereNaam = xml.replace('<RegisteredName>VVD</RegisteredName>', '<RegisteredName>Partij voor Iets Anders</RegisteredName>');
test('partijnaam klopt niet bij het lijstnummer: tegengehouden', !!gooit(() => naarUitslag(leesEmlTelling(andereNaam), { partijen, kandidaten, stadium: 'voorlopig', bijgewerkt: '2022-03-17T02:00:00+01:00', bronMeta: meta })));
const kapotGetal = xml.replace('<ValidVotes>6678</ValidVotes>', '<ValidVotes>6.6x8</ValidVotes>');
test('onleesbaar getal: tegengehouden', !!gooit(() => leesEmlTelling(kapotGetal)));
const telFout = xml.replace('<ValidVotes>6678</ValidVotes>', '<ValidVotes>6778</ValidVotes>');
const uTel = naarUitslag(leesEmlTelling(telFout), { partijen, kandidaten, stadium: 'voorlopig', bijgewerkt: '2022-03-17T02:00:00+01:00', bronMeta: meta });
const fTel = controleer(uTel, partijen, kandidaten, Z);
test('getallen tellen niet op: tegengehouden', fTel.length > 0, fTel.slice(0, 2).join('; '));
const zetelFout = { ...u, partijen: Object.fromEntries(Object.entries(uo.partijen).map(([sl, x]) => [sl, { stemmen: x.stemmen, zetels: x.zetels + (sl === 'lijst-1' ? 1 : sl === 'lijst-2' ? -1 : 0) }])) };
const wZ = waarschuwingen(zetelFout, partijen, kandidaten, 37);
test('zetels van de bron wijken af van de eigen berekening: bron leidend, wel een waarschuwing', controleer(zetelFout, partijen, kandidaten, Z).length === 0 && wZ.length > 0, wZ[0]);
test('zetels van de bron gelijk aan de eigen berekening: geen waarschuwing', waarschuwingen(uo, partijen, kandidaten, 37).length === 0);
const teVeel = { ...u, partijen: Object.fromEntries(Object.entries(u.partijen).map(([s, x]) => [s, { stemmen: x.stemmen, zetels: 4 }])) };
test('zetels samen niet 37: tegengehouden', controleer(teVeel, partijen, kandidaten, Z).some((x) => /tellen op/.test(x)));
const tussen = { stadium: 'tussenstand', bijgewerkt: '2022-03-16T23:00:00+01:00', bron: meta, bureaus: { geteld: 40, totaal: 63 }, partijen: Object.fromEntries(Object.entries(u.partijen).map(([s, x]) => [s, { stemmen: Math.round(x.stemmen * 0.6) }])) };
const terug = { ...tussen, bijgewerkt: '2022-03-16T23:15:00+01:00', bureaus: { geteld: 41, totaal: 63 }, partijen: { ...tussen.partijen, 'lijst-3': { stemmen: tussen.partijen['lijst-3'].stemmen - 50 } } };
test('stemmen lopen terug in de tussenstand: tegengehouden', vergelijk(tussen, terug).length > 0, vergelijk(tussen, terug)[0]);
test('minder stembureaus geteld dan eerst: tegengehouden', vergelijk({ ...tussen, bureaus: { geteld: 45, totaal: 63 } }, tussen).length > 0);
test('van voorlopig terug naar tussenstand: tegengehouden', vergelijk(u, tussen).length > 0);
test('voorlopig terwijl niet alle stembureaus geteld zijn: tegengehouden', controleer({ ...u, bureaus: { geteld: 50, totaal: 63 } }, partijen, kandidaten, Z).length > 0);
const kandFout = { ...u, kandidaten: { ...u.kandidaten, 'lijst-1': { ...u.kandidaten['lijst-1'], 1: u.kandidaten['lijst-1'][1] + 10 } } };
test('voorkeurstemmen tellen niet op tot de partij: tegengehouden', controleer(kandFout, partijen, kandidaten, Z).length > 0);
const kandMist = { ...u, kandidaten: { ...u.kandidaten, 'lijst-2': Object.fromEntries(Object.entries(u.kandidaten['lijst-2']).slice(1)) } };
test('kandidaat ontbreekt: tegengehouden', controleer(kandMist, partijen, kandidaten, Z).length > 0);
const naamFout = { ...resultaat, lijsten: resultaat.lijsten.map((l) => (l.nr === 1 ? { ...l, gekozenNamen: [{ voornaam: 'Jan', achternaam: 'Iemand Anders' }, ...l.gekozenNamen.slice(1)] } : l)) };
test('kandidaatnaam in EML 520 klopt niet: tegengehouden', !!gooit(() => naarUitslag(telling, { partijen, kandidaten, stadium: 'officieel', bijgewerkt: '2022-03-21T10:00:00+01:00', bronMeta: meta, resultaat: naamFout })));
test('onbekend stadium: tegengehouden', controleer({ stadium: 'bijna' }, partijen, kandidaten, Z).length > 0);
test('leeg bestand is in orde (site blijft zoals ze is)', controleer({}, partijen, kandidaten, Z).length === 0);

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
