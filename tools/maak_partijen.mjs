// Bouwt data/partijen.json uit bronnen/lijsten.tsv, meta.json en digest.json per lijst.
import fs from 'node:fs';
const B = new URL('../bronnen/', import.meta.url).pathname;
const extra = {
  'hart-voor-hilversum': { kort: 'Hart voor Hilversum', kleur: '#E8451E' },
  pro: { kort: 'PRO', naam: 'PRO (GroenLinks-PvdA)', kleur: '#C2185B' },
  d66: { kort: 'D66', kleur: '#00A85A' },
  vvd: { kort: 'VVD', kleur: '#0A2D6E' },
  cda: { kort: 'CDA', kleur: '#007B5F' },
  'lokaal-een': { kort: 'Lokaal Eén', kleur: '#7A4FA3' },
  sp: { kort: 'SP', kleur: '#EC1B23' },
  christenunie: { kort: 'ChristenUnie', kleur: '#00A7EB' },
  bvnl: { kort: 'BVNL', kleur: '#2B3A8F' },
  scb: { kort: 'SCB', kleur: '#8C6D3F' },
  'gewoon-hilversum': { kort: 'Gewoon, Hilversum', kleur: '#F2B705' },
  'dorp-voor-dorp': { kort: 'Dorp voor Dorp', kleur: '#5E8C31' },
  'stop-betaald-parkeren-vip': { kort: 'Stop Betaald Parkeren-VIP', kleur: '#4A4A4A' },
  'opstand-nu': { kort: 'Opstand.nu', kleur: '#E6007E' },
  pvdd: { kort: 'Partij voor de Dieren', kleur: '#006B2D' },
  'blanco-van-oostveen': { kort: 'Lijst Van Oostveen', naam: 'Blanco lijst (Van Oostveen)', kleur: '#9AA0A6' },
  lfd: { kort: 'LFD', naam: 'Libertaire Fractie Durlacher (LFD)', kleur: '#C9A200' },
  volt: { kort: 'Volt', kleur: '#502379' },
  fvd: { kort: 'FVD', naam: 'Forum voor Democratie', kleur: '#7B1E1E' },
  bbb: { kort: 'BBB', kleur: '#94C11F' },
};
const rows = fs.readFileSync(B + 'lijsten.tsv', 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const red = JSON.parse(fs.readFileSync(new URL('../data/partij-redactie.json', import.meta.url), 'utf8'));
const lees = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const uit = rows.map(([nr, slug, naam, lijsttrekker]) => {
  const meta = lees(`${B}${slug}/meta.json`) || {};
  const dg = lees(`${B}${slug}/digest.json`) || {};
  const e = extra[slug] || {};
  return {
    slug, nr: +nr, naam: e.naam || naam.replace(/ \(.*\)$/, ''), kort: e.kort || naam, kleur: e.kleur || '#888',
    lijsttrekker, website: meta.website || null, achtergrond: red[slug]?.achtergrond || null, basis: red[slug]?.basis || null,
    programma: { titel: meta.programma_titel || null, url: meta.programma_url || null, paginas: meta.programma_paginas || null, woorden: meta.programma_woorden || null },
    kernboodschap: red[slug] && 'kernboodschap' in red[slug] ? red[slug].kernboodschap : dg.kernboodschap || null, speerpunten: dg.speerpunten || [], opvallend: dg.opvallend || [], dun: dg.dun || [],
  };
});
fs.writeFileSync(new URL('../data/partijen.json', import.meta.url), JSON.stringify(uit, null, 1));
console.log(uit.length, 'lijsten;', uit.filter((p) => p.kernboodschap).length, 'met digest');
