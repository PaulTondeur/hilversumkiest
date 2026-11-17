// Haalt de uitslag op bij de gemeente Hilversum, zet hem om en publiceert hem via publiceer.mjs (met alle controles).
//
//   node tools/uitslag/haal.mjs            kijken en lokaal schrijven (droog: geen commit)
//   node tools/uitslag/haal.mjs --push     ook committen en naar main pushen
//
// Leidende bron: wat de gemeente Hilversum (organisator van de verkiezing) op hilversum.nl zet. Eerst de officiële
// telbestanden (EML of osv4-3-csv) die aan de verkiezingspagina's hangen; anders een tabel op het liveblog.
// Cijfers uit nieuwsberichten worden nooit overgenomen.
//
// Exit code: 0 = gepubliceerd of niets nieuws, 2 = de gemeente meldt iets wat het script niet kan lezen (een mens of
// de Claude-taak moet kijken), 3 = afgewezen door de controles, 4 = bron onbereikbaar, 10 = officiële uitslag compleet:
// de planning mag uit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leesEmlTelling, leesEmlResultaat, leesOsv, leesTabellen, naarUitslag, zelfdePartij } from './bronnen.mjs';
import { publiceer, beoordeel } from './publiceer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lees = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const PUSH = process.argv.includes('--push');
const NU = process.env.UITSLAG_NU ? new Date(process.env.UITSLAG_NU) : new Date();
const VERKIEZINGSDATUM = process.env.UITSLAG_DATUM || '2026-11-18';
const VASTSTELLING = new Date(process.env.UITSLAG_VASTSTELLING || '2026-11-26T10:00:00+01:00');
const OPEN = new Date(`${VERKIEZINGSDATUM}T07:30:00+01:00`);
const DICHT = new Date(`${VERKIEZINGSDATUM}T21:00:00+01:00`);
const LIVEBLOG = 'https://hilversum.nl/liveblog';
const PAGINAS = (process.env.UITSLAG_PAGINAS || [
  LIVEBLOG,
  'https://hilversum.nl/verkiezingen/gemeenteraadsverkiezing-2026',
  'https://hilversum.nl/verkiezingen/gemeenteraadsverkiezing-2026/stemmen-tellen-vaststellen-uitslag',
  'https://hilversum.nl/verkiezingen/gemeenteraadsverkiezing-2026/uitslagen',
  'https://hilversum.nl/verkiezingen/uitslagen-gemeenteraadsverkiezing-2026',
  'https://hilversum.nl/verkiezingen/gemeenteraadsverkiezing-2026/openbare-bekendmakingen-gemeenteraadsverkiezingen-2026',
].join(',')).split(',').map((s) => s.trim()).filter(Boolean);

const log = (...a) => console.error(...a);
// In de oefening (tools/uitslag/oefening.mjs) staan de bronbestanden op schijf; op de site komt dan dit adres te staan.
const toonUrl = (u) => (u.startsWith('file://') && process.env.UITSLAG_OEFENING ? `https://www.hilversum.nl/oefening/${path.basename(fileURLToPath(u))}` : u);
function klaar(code, status, extra = {}) {
  console.log(JSON.stringify({ status, tijd: NU.toISOString(), ...extra }, null, 1));
  process.exit(code);
}

async function haalTekst(url) {
  if (url.startsWith('file://')) { const p = fileURLToPath(url); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'hilversumkiest.nl uitslag (onafhankelijke stemwijzer)', 'cache-control': 'no-cache' } });
    if (r.status === 404 || r.status === 410) return null;
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

// Een zip uitpakken in een eigen lege map en alleen .xml- en .csv-bestanden lezen.
function pakUit(buf) {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'uitslag-zip-'));
  fs.writeFileSync(path.join(map, 'bron.zip'), buf);
  execFileSync('unzip', ['-qq', '-o', 'bron.zip', '-d', 'inhoud'], { cwd: map, timeout: 60000 });
  const uit = [];
  const loop = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) loop(p); else if (/\.(xml|csv)$/i.test(f.name)) uit.push({ naam: f.name, tekst: fs.readFileSync(p, 'utf8') }); } };
  loop(path.join(map, 'inhoud'));
  return uit;
}

const isDezeVerkiezing = (b) => {
  const id = `${b.verkiezing || ''} ${b.datum || ''} ${b.gebied || ''}`;
  return new RegExp(VERKIEZINGSDATUM).test(id) || (/GR2026|2026/.test(id) && /Hilversum/i.test(id)) || process.env.UITSLAG_VERKIEZING && id.includes(process.env.UITSLAG_VERKIEZING);
};
// EML-tijden staan zonder tijdzone in Nederlandse tijd; in november is dat UTC+1.
const emlTijd = (t) => (t ? new Date(/[Z+]/.test(t.slice(10)) ? t : `${t.replace(/\.\d+$/, '')}+01:00`).toISOString() : null);

async function main() {
  // Eerst de nieuwste stand van main ophalen, zodat we vergelijken met wat er echt online staat.
  if (PUSH) { try { execFileSync('git', ['pull', '-q', '--rebase', '--autostash', 'origin', 'main'], { cwd: ROOT, stdio: 'pipe' }); } catch (err) { log(`git pull mislukt: ${String(err.stderr || err.message).slice(0, 300)}`); } }
  const partijen = lees('data/partijen.json');
  const kandidaten = lees('data/kandidaten.json');
  const huidig = fs.existsSync(path.join(ROOT, 'data/uitslag.json')) ? lees('data/uitslag.json') : {};
  if (huidig.stadium === 'officieel' && huidig.gekozen && huidig.kandidaten && huidig.kandidatenStadium !== 'voorlopig') klaar(10, 'officiële uitslag staat er al compleet in; niets meer te doen');

  // 1. Pagina's van de gemeente ophalen en links naar telbestanden verzamelen.
  const paginas = {};
  let bereikt = 0;
  for (const url of PAGINAS) {
    try { const b = await haalTekst(url); if (b !== null) { paginas[url] = b.toString(); bereikt++; } } catch (err) { log(`niet bereikbaar: ${err.message}`); }
  }
  if (!bereikt) klaar(4, 'geen enkele pagina van de gemeente bereikbaar', { paginas: PAGINAS });
  const links = new Set();
  for (const [url, html] of Object.entries(paginas)) {
    for (const [, href] of html.matchAll(/href="([^"]+\.(?:csv|xml|zip)(?:\?[^"]*)?)"/gi)) links.add(new URL(href.replace(/&amp;/g, '&'), url).href);
  }

  // 2. Telbestanden lezen. Alleen bestanden van déze verkiezing tellen mee.
  const tellingen = [], resultaten = [], onleesbaar = [];
  for (const link of links) {
    let delen;
    try {
      const buf = await haalTekst(link);
      if (!buf) continue;
      delen = /\.zip(\?|$)/i.test(link) ? pakUit(buf) : [{ naam: link, tekst: buf.toString('utf8') }];
    } catch (err) { onleesbaar.push(`${link}: ${err.message}`); continue; }
    for (const { naam, tekst } of delen) {
      try {
        if (/^\s*(<\?xml|<EML|<eml:EML)/.test(tekst.replace(/^﻿/, ''))) {
          const id = (tekst.match(/<(?:\w+:)?EML\b[^>]*\bId="(\w+)"/) || [])[1] || '';
          if (/^510/.test(id)) { const b = leesEmlTelling(tekst); if (isDezeVerkiezing(b)) tellingen.push({ ...b, url: link }); }
          else if (id === '520') { const b = leesEmlResultaat(tekst); if (isDezeVerkiezing(b)) resultaten.push({ ...b, url: link }); }
        } else if (/"?Lijstnummer"?;/.test(tekst)) {
          const b = leesOsv(tekst);
          if (isDezeVerkiezing(b)) tellingen.push({ ...b, url: link });
        }
      } catch (err) { onleesbaar.push(`${naam}: ${err.message}`); }
    }
  }
  log(`links: ${links.size}, tellingen: ${tellingen.length}, resultaten: ${resultaten.length}, onleesbaar: ${onleesbaar.length}`);

  let nieuw = null;
  const tellingMetBureaus = tellingen.filter((t) => t.lijsten.length === partijen.length);
  if (tellingMetBureaus.length) {
    // Liefst de telling van de hele gemeente met voorkeurstemmen, en de nieuwste.
    const t = tellingMetBureaus.sort((a, b) => (b.lijsten.every((l) => l.kandidaten) - a.lijsten.every((l) => l.kandidaten)) || String(b.gemaakt || '').localeCompare(String(a.gemaakt || '')))[0];
    const r = resultaten.sort((a, b) => String(b.gemaakt || '').localeCompare(String(a.gemaakt || '')))[0] || null;
    const officieel = !!r && NU >= VASTSTELLING && new Date(emlTijd(r.gemaakt)) >= new Date(VASTSTELLING.getTime() - 3 * 3600e3);
    try {
      nieuw = naarUitslag(t, {
        partijen, kandidaten,
        stadium: officieel ? 'officieel' : 'voorlopig',
        bijgewerkt: emlTijd(t.gemaakt) || NU.toISOString(),
        bronMeta: { naam: `Gemeente Hilversum, telbestand (${t.soort})`, url: toonUrl(t.url) },
        resultaat: r,
      });
      if (nieuw.kandidaten && !officieel) nieuw.kandidatenStadium = 'voorlopig';
      if (r) nieuw.bron = { naam: `${officieel ? 'Centraal stembureau Hilversum' : 'Gemeente Hilversum'}, telling en resultaat (EML)`, url: toonUrl(r.url) };
    } catch (err) {
      klaar(3, 'telbestand gevonden, maar het past niet bij de site', { fouten: err.fouten || [err.message], bestand: t.url });
    }
  }

  // 3. Geen telbestand: een tabel op het liveblog?
  const blog = paginas[PAGINAS[0]] || '';
  const blogTekst = blog.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!nieuw && blog) {
    for (const tabel of leesTabellen(blog)) {
      const rijen = {};
      for (const cellen of tabel) {
        const p = partijen.find((x) => cellen.some((c) => zelfdePartij(c, x) && !/^\d/.test(c)));
        const getallen = cellen.filter((c) => /^\d{1,3}(\.\d{3})*$|^\d+$/.test(c)).map((c) => +c.replace(/\./g, ''));
        if (p && getallen.length && !rijen[p.slug]) rijen[p.slug] = getallen;
      }
      if (Object.keys(rijen).length !== partijen.length) continue;
      const kop = (tabel[0] || []).map((c) => c.toLowerCase());
      const kolomZetels = kop.findIndex((c) => /zetel/.test(c));
      const kolomStemmen = kop.findIndex((c) => /stemmen|aantal/.test(c));
      const geteld = blogTekst.match(/(\d+)\s+van\s+(?:de\s+)?(\d+)\s+stembureaus/i);
      const stadium = /tussenstand/i.test(blogTekst) && geteld ? 'tussenstand' : /voorlopige uitslag/i.test(blogTekst) ? 'voorlopig' : null;
      // Een voorlopige uitslag van het liveblog alleen met een zetelkolom: die moet dan precies kloppen met de Kieswet.
      if (!stadium || kolomStemmen < 0 || (stadium === 'voorlopig' && kolomZetels < 0)) klaar(2, 'liveblog heeft een tabel met alle partijen, maar stadium of kolommen zijn niet eenduidig', { url: LIVEBLOG });
      // Kolommen tellen alleen de getallen in een rij: stemmen is het eerste getal, zetels het laatste als er een zetelkolom is.
      nieuw = { stadium, bijgewerkt: NU.toISOString(), bron: { naam: 'Gemeente Hilversum, liveblog', url: LIVEBLOG }, partijen: {} };
      for (const p of partijen) {
        const g = rijen[p.slug];
        nieuw.partijen[p.slug] = { stemmen: g[0] };
        if (stadium === 'voorlopig') nieuw.partijen[p.slug].zetels = g.length >= 2 ? g[g.length - 1] : null;
      }
      if (stadium === 'tussenstand') nieuw.bureaus = { geteld: +geteld[1], totaal: +geteld[2] };
      break;
    }
  }

  // 4. Niets leesbaars. Meldt de gemeente wel iets over de uitslag, dan moet er iemand kijken.
  if (!nieuw) {
    const naSluiting = NU >= DICHT;
    const signaal = /tussenstand|voorlopige uitslag|uitslag is bekend|zetelverdeling|zetels|stemmen geteld|stembureaus geteld/i.test(blogTekst);
    if (naSluiting && (signaal || onleesbaar.length || tellingen.length)) {
      klaar(2, 'de gemeente meldt iets over de uitslag dat het script niet kan lezen', { liveblog: LIVEBLOG, onleesbaar, tellingenMetAnderAantalPartijen: tellingen.filter((t) => !tellingMetBureaus.includes(t)).map((t) => `${t.url}: ${t.lijsten.length} partijen`) });
    }
    if (!huidig.stadium && NU >= OPEN) nieuw = { stadium: 'wacht', bijgewerkt: NU.toISOString() };
    else klaar(0, 'niets nieuws', { links: links.size });
  }

  // 5. Controleren en publiceren.
  const { fouten } = beoordeel(nieuw);
  if (fouten.length) klaar(3, 'afgewezen door de controles; de vorige stand blijft staan', { fouten, bron: nieuw.bron });
  const r = publiceer(nieuw, { push: PUSH });
  klaar(r.status === 'afgewezen' || r.status === 'push mislukt' ? 3 : 0, r.status, { ...r, stadium: nieuw.stadium });
}

main().catch((err) => klaar(4, `onverwachte fout: ${err.message}`));
