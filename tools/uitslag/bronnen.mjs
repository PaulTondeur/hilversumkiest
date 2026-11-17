import fs from 'node:fs';
// Leest de officiële uitslagbestanden en zet ze om naar één vorm. Geen afhankelijkheden.
//   EML_NL 510 (telling) en 520 (resultaat), zoals de Kiesraad-software ze maakt (OSV2020, Abacus);
//   osv4-3-csv (telling per stembureau, partij en kandidaat), zoals Hilversum die bij TK2025 publiceerde;
//   een tabel met stemmen per partij op het liveblog van de gemeente.
// Elke lezer geeft { lijsten: [{ nr, naam, stemmen, kandidaten: { nr: stemmen } | null, gekozen: [nr] | null }], ... }
// of gooit een fout als de vorm niet klopt. Vertalen naar de partijen van de site doet naarUitslag().

const ontsnap = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const getal = (s) => { const t = String(s).replace(/[.\s]/g, ''); if (!/^\d+$/.test(t)) throw new Error(`geen getal: ${s}`); return +t; };
const alle = (re, t) => [...t.matchAll(re)];
const eerste = (re, t) => (t.match(re) || [])[1];
const zonderNs = (xml) => xml.replace(/<(\/?)[\w-]+:/g, '<$1'); // eml:Selection -> Selection, kr:… -> …

// ---------- EML 510: telling ----------
export function leesEmlTelling(xmlRuw) {
  const xml = zonderNs(xmlRuw);
  const id = eerste(/<EML\b[^>]*\bId="(\w+)"/, xml);
  if (!/^510/.test(id || '')) throw new Error(`geen EML 510 (Id ${id})`);
  const totaal = eerste(/<TotalVotes>([\s\S]*?)<\/TotalVotes>/, xml);
  if (!totaal) throw new Error('EML 510 zonder TotalVotes');
  const lijsten = [];
  let huidig = null;
  for (const [, sel] of alle(/<Selection>([\s\S]*?)<\/Selection>/g, totaal)) {
    const aff = sel.match(/<AffiliationIdentifier Id="(\d+)">[\s\S]*?<RegisteredName>([\s\S]*?)<\/RegisteredName>/);
    const stemmen = getal(eerste(/<ValidVotes>(\d+)<\/ValidVotes>/, sel));
    if (aff) { huidig = { nr: +aff[1], naam: ontsnap(aff[2]).trim(), stemmen, kandidaten: {} }; lijsten.push(huidig); continue; }
    const kid = eerste(/<CandidateIdentifier Id="(\d+)"/, sel);
    if (!kid || !huidig) throw new Error('EML 510: kandidaat zonder partij');
    huidig.kandidaten[kid] = stemmen;
  }
  for (const l of lijsten) if (!Object.keys(l.kandidaten).length) l.kandidaten = null;
  const reden = (code) => { const v = eerste(new RegExp(`<RejectedVotes ReasonCode="${code}">(\\d+)<`), totaal); return v === undefined ? null : +v; };
  const cast = eerste(/<Cast>(\d+)<\/Cast>/, totaal);
  const bureaus = alle(/<ReportingUnitVotes>/g, xml).length;
  return {
    soort: `EML ${id}`,
    gemaakt: eerste(/<CreationDateTime>([^<]+)</, xml) || null,
    verkiezing: [eerste(/<ElectionIdentifier Id="([^"]+)"/, xml), eerste(/<ElectionDate>([^<]+)</, xml)].filter(Boolean).join(' ') || null,
    lijsten,
    geldig: getal(eerste(/<TotalCounted>(\d+)<\/TotalCounted>/, totaal)),
    blanco: reden('blanco'),
    ongeldig: reden('ongeldig'),
    kiesgerechtigden: cast && +cast > 0 ? +cast : null,
    bureaus: bureaus ? { geteld: bureaus, totaal: bureaus } : null,
  };
}

// ---------- EML 520: resultaat (wie gekozen is) ----------
export function leesEmlResultaat(xmlRuw) {
  const xml = zonderNs(xmlRuw);
  const id = eerste(/<EML\b[^>]*\bId="(\w+)"/, xml);
  if (id !== '520') throw new Error(`geen EML 520 (Id ${id})`);
  const lijsten = [];
  let huidig = null;
  for (const [, sel] of alle(/<Selection>([\s\S]*?)<\/Selection>/g, xml)) {
    const aff = sel.match(/<AffiliationIdentifier Id="(\d+)">[\s\S]*?<RegisteredName>([\s\S]*?)<\/RegisteredName>/);
    if (aff) { huidig = { nr: +aff[1], naam: ontsnap(aff[2]).trim(), gekozenNamen: [] }; lijsten.push(huidig); continue; }
    // Let op: in EML 520 is CandidateIdentifier een volgnummer binnen het resultaat, niet het nummer op de lijst.
    // Daarom koppelen we gekozen kandidaten op naam.
    if (!/<CandidateIdentifier/.test(sel) || !huidig) throw new Error('EML 520: kandidaat zonder partij');
    const voornaam = ontsnap(eerste(/<FirstName>([^<]*)</, sel) || '');
    const achternaam = [eerste(/<NamePrefix>([^<]*)</, sel), eerste(/<LastName>([^<]*)</, sel)].filter(Boolean).map(ontsnap).join(' ');
    if (!achternaam) throw new Error('EML 520: kandidaat zonder achternaam');
    if (/<Elected>yes<\/Elected>/.test(sel)) huidig.gekozenNamen.push({ voornaam, achternaam });
  }
  const bekend = new Set(lijsten.map((l) => l.nr));
  if (bekend.size !== lijsten.length) throw new Error('EML 520: partij dubbel');
  return { soort: 'EML 520', gemaakt: eerste(/<CreationDateTime>([^<]+)</, xml) || null, verkiezing: [eerste(/<ElectionIdentifier Id="([^"]+)"/, xml), eerste(/<ElectionDate>([^<]+)</, xml)].filter(Boolean).join(' ') || null, lijsten };
}

// ---------- osv4-3-csv: telling per stembureau ----------
function csvRegels(tekst) {
  const regels = [];
  for (const regel of tekst.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!regel.trim()) { regels.push([]); continue; }
    const cellen = [];
    let i = 0;
    while (i <= regel.length) {
      if (regel[i] === '"') {
        let v = '';
        i++;
        while (i < regel.length) {
          if (regel[i] === '"' && regel[i + 1] === '"') { v += '"'; i += 2; } else if (regel[i] === '"') { i++; break; } else v += regel[i++];
        }
        cellen.push(v);
        i++; // ;
      } else {
        const j = regel.indexOf(';', i);
        cellen.push(j < 0 ? regel.slice(i) : regel.slice(i, j));
        i = j < 0 ? regel.length + 1 : j + 1;
      }
    }
    regels.push(cellen);
  }
  return regels;
}
export function leesOsv(tekst) {
  const r = csvRegels(tekst);
  const kop = r.findIndex((c) => c[0] === 'Lijstnummer' && c[4] === 'Totaal');
  if (kop < 0) throw new Error('osv4-3: kopregel "Lijstnummer … Totaal" niet gevonden');
  const meta = Object.fromEntries(r.slice(0, kop).filter((c) => c[0]).map((c) => [c[0], c[2]]));
  const bureaus = r[kop].length - 5;
  const tel = (naam) => { const c = r.find((x) => !x[0] && x[1] === naam); return c ? getal(c[4]) : null; };
  const lijsten = [];
  let huidig = null;
  for (const c of r.slice(kop + 1)) {
    if (c[0] && /^\d+$/.test(c[0])) { huidig = { nr: +c[0], naam: c[1].trim(), stemmen: getal(c[4]), kandidaten: {}, namen: {} }; lijsten.push(huidig); continue; }
    if (!c[0] && !c[1] && /^\d+$/.test(c[2] || '')) {
      if (!huidig) throw new Error('osv4-3: kandidaat zonder partij');
      huidig.kandidaten[c[2]] = getal(c[4]);
      huidig.namen[c[2]] = c[3];
    }
  }
  for (const l of lijsten) if (!Object.keys(l.kandidaten).length) { l.kandidaten = null; l.namen = null; }
  return {
    soort: 'osv4-3',
    verkiezing: meta.Verkiezing || null,
    datum: meta.Datum || null,
    gebied: meta.Gebied || null,
    lijsten,
    geldig: tel('geldige stembiljetten'),
    blanco: tel('blanco stembiljetten'),
    ongeldig: tel('ongeldige stembiljetten'),
    kiesgerechtigden: tel('opgeroepenen'),
    bureaus: { geteld: bureaus, totaal: bureaus },
  };
}

// ---------- Liveblog: een html-tabel met partijen en stemmen ----------
// Alleen een duidelijke tabel: een rij per partij met een getal. Al het andere (lopende tekst, plaatjes) herkent het
// script niet; dan meldt het "niet herkend" en kijkt de Claude-taak ernaar.
export function leesTabellen(html) {
  const tekst = (s) => ontsnap(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return alle(/<table[\s\S]*?<\/table>/gi, html).map(([t]) => alle(/<tr[\s\S]*?<\/tr>/gi, t).map(([tr]) => alle(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi, tr).map((m) => tekst(m[1]))));
}

// ---------- Namen vergelijken ----------
export const normaal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Namen op het stembiljet (Gemeenteblad), naast naam en korte naam van de site.
let BILJET = {};
try { BILJET = JSON.parse(fs.readFileSync(new URL('./stembiljet.json', import.meta.url), 'utf8')); } catch { BILJET = {}; }
// Een partij uit de bron hoort bij een partij van de site als de namen gelijk zijn, of als alle woorden van de kortste
// naam als heel woord in de andere voorkomen (dus "SP" past bij "Socialistische Partij (SP)", maar niet bij "Opstand.nu").
export function zelfdePartij(bronNaam, p, { biljet = true } = {}) {
  const woorden = (s) => normaal(s).split(' ').filter(Boolean);
  const metHaakjes = (s) => [s, ...[...String(s || '').matchAll(/\(([^)]*)\)/g)].map((m) => m[1]), String(s || '').replace(/\(.*?\)/g, ' ')];
  const opties = [p.naam, p.kort, biljet ? BILJET[p.nr] : null].filter(Boolean).flatMap(metHaakjes).map(woorden).filter((w) => w.length);
  const bron = metHaakjes(bronNaam).map(woorden).filter((w) => w.length);
  return bron.some((b) => opties.some((o) => {
    if (b.join(' ') === o.join(' ')) return true;
    const [kort, lang] = b.length <= o.length ? [b, o] : [o, b];
    return kort.join('').length >= 4 && kort.every((x) => lang.includes(x));
  }));
}
// "Lancé, R." of "Ron Lancé" tegen "Ron Lancé": de achternaam moet in de naam op de site voorkomen.
export function zelfdeKandidaat(bronNaam, naam) {
  const b = normaal(String(bronNaam).split(',')[0]);
  const n = normaal(naam);
  if (!b || !n) return false;
  return n.includes(b) || b.split(' ').filter((x) => x.length > 2).every((x) => n.includes(x));
}

// Zet een gelezen bron om naar de vorm van data/uitslag.json. Gooit een fout als partijen of kandidaten niet te
// koppelen zijn: liever niets publiceren dan iets aan de verkeerde partij toeschrijven.
export function naarUitslag(bron, { partijen, kandidaten, stadium, bijgewerkt, bronMeta, resultaat = null }) {
  const fouten = [];
  if (bron.lijsten.length !== partijen.length) fouten.push(`bron heeft ${bron.lijsten.length} partijen, de site ${partijen.length}`);
  const perNr = Object.fromEntries(bron.lijsten.map((l) => [l.nr, l]));
  const u = { stadium, bijgewerkt, bron: bronMeta, partijen: {} };
  let metKandidaten = bron.lijsten.every((l) => l.kandidaten);
  if (metKandidaten) u.kandidaten = {};
  for (const p of partijen) {
    const l = perNr[p.nr];
    if (!l) { fouten.push(`lijst ${p.nr} (${p.kort}) staat niet in de bron`); continue; }
    if (!zelfdePartij(l.naam, p)) fouten.push(`lijst ${p.nr}: "${l.naam}" in de bron lijkt niet op "${p.naam}"`);
    u.partijen[p.slug] = { stemmen: l.stemmen };
    if (metKandidaten) {
      u.kandidaten[p.slug] = Object.fromEntries(Object.entries(l.kandidaten).map(([k, v]) => [k, v]));
      for (const [k, naam] of Object.entries(l.namen || {})) {
        const op = (kandidaten[p.slug] || []).find((x) => x.nr === +k);
        if (!op) fouten.push(`${p.kort} kandidaat ${k} staat niet op de lijst van de site`);
        else if (!zelfdeKandidaat(naam, op.naam)) fouten.push(`${p.kort} kandidaat ${k}: "${naam}" in de bron, "${op.naam}" op de site`);
      }
    }
  }
  for (const k of ['geldig', 'blanco', 'ongeldig', 'kiesgerechtigden']) if (bron[k] !== null && bron[k] !== undefined) u[k] = bron[k];
  if (Number.isInteger(u.geldig) && Number.isInteger(u.blanco) && Number.isInteger(u.ongeldig)) u.uitgebracht = u.geldig + u.blanco + u.ongeldig;
  if (bron.bureaus && stadium === 'tussenstand') u.bureaus = bron.bureaus;
  else if (bron.bureaus) u.bureaus = { geteld: bron.bureaus.totaal, totaal: bron.bureaus.totaal };
  if (resultaat) {
    const g = {};
    for (const p of partijen) {
      // Een partij zonder gekozenen staat soms niet in EML 520: dan 0 zetels.
      const r = resultaat.lijsten.find((l) => l.nr === p.nr) || { naam: p.naam, gekozenNamen: [] };
      if (!zelfdePartij(r.naam, p)) fouten.push(`resultaat: "${r.naam}" lijkt niet op "${p.naam}"`);
      g[p.slug] = [];
      for (const { voornaam, achternaam } of r.gekozenNamen) {
        const treffers = (kandidaten[p.slug] || []).filter((x) => zelfdeKandidaat(achternaam, x.naam) && (!voornaam || normaal(x.naam).split(' ').includes(normaal(voornaam).split(' ')[0])));
        if (treffers.length !== 1) fouten.push(`resultaat: ${p.kort}: gekozen "${voornaam} ${achternaam}" ${treffers.length ? 'past bij meer kandidaten' : 'staat niet op de lijst van de site'}`);
        else g[p.slug].push(treffers[0].nr);
      }
      u.partijen[p.slug].zetels = g[p.slug].length;
    }
    u.gekozen = g;
    u.gekozenBron = 'bron';
  }
  if (fouten.length) { const err = new Error(`bron past niet bij de site:\n- ${fouten.join('\n- ')}`); err.fouten = fouten; throw err; }
  return u;
}
