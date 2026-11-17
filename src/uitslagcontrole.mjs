// Strenge controle van data/uitslag.json. De bouwstap en het ophaalscript (tools/uitslag/haal.mjs) gebruiken allebei
// deze functies: klopt er iets niet, dan bouwt de site niet met deze cijfers en blijft de vorige stand staan.
import { verdeelZetels, gekozenen } from './zetels.mjs';

export const STADIA = ['wacht', 'tussenstand', 'voorlopig', 'officieel'];
const heel = (x) => Number.isInteger(x) && x >= 0;

// u: de inhoud van data/uitslag.json; partijen en kandidaten: data/partijen.json en data/kandidaten.json.
// Geeft een lijst met fouten terug; leeg betekent: in orde.
// opties: zetels (39) en de grenzen voor het aantal kiesgerechtigden; anders alleen om oude uitslagen te testen.
export function controleer(u, partijen, kandidaten, { zetels: ZETELS = 39, kiesgerechtigden: KG = [60000, 120000] } = {}) {
  const f = [];
  if (!u || !Object.keys(u).length) return f; // leeg bestand: geen uitslag, de site blijft zoals ze is
  if (!STADIA.includes(u.stadium)) return [`onbekend stadium: ${u.stadium}`];
  if (!u.bijgewerkt || Number.isNaN(Date.parse(u.bijgewerkt))) f.push('bijgewerkt ontbreekt of is geen tijdstip');
  if (u.stadium === 'wacht') return f;
  if (!u.bron?.naam || !/^https:\/\//.test(u.bron?.url || '')) f.push('bron (naam en https-adres) ontbreekt');

  const slugs = partijen.map((p) => p.slug);
  const P = u.partijen || {};
  const extra = Object.keys(P).filter((s) => !slugs.includes(s));
  const mist = slugs.filter((s) => !(s in P));
  if (extra.length) f.push(`onbekende partijen: ${extra.join(', ')}`);
  if (mist.length) f.push(`partijen ontbreken: ${mist.join(', ')}`);
  if (extra.length || mist.length) return f;
  // Alleen zetels, zonder stemmen per partij: mag bij een voorlopige uitslag als de bron alleen de zetelverdeling geeft.
  const alleenZetels = slugs.every((s) => P[s].stemmen === null || P[s].stemmen === undefined);
  if (alleenZetels) {
    if (u.stadium !== 'voorlopig') return [...f, 'zonder stemmen per partij kan alleen een voorlopige zetelverdeling'];
    if (!slugs.every((s) => heel(P[s].zetels))) return [...f, 'zonder stemmen moeten alle zetels er staan'];
    const som = slugs.reduce((n, s) => n + P[s].zetels, 0);
    if (som !== ZETELS) f.push(`zetels tellen op tot ${som}, niet ${ZETELS}`);
    for (const s of slugs) if (P[s].zetels > (kandidaten[s] || []).length) f.push(`${s}: meer zetels dan kandidaten`);
    if (u.kandidaten || u.gekozen) f.push('voorkeurstemmen zonder stemmen per partij');
    return f;
  }
  for (const s of slugs) if (!heel(P[s].stemmen)) f.push(`${s}: stemmen is geen heel getal`);
  if (f.length) return f;
  const geldig = slugs.reduce((n, s) => n + P[s].stemmen, 0);
  if (!geldig) f.push('nog geen enkele stem');
  if (u.geldig !== undefined && u.geldig !== geldig) f.push(`geldige stemmen ${u.geldig} is niet de som van de partijen (${geldig})`);
  for (const k of ['blanco', 'ongeldig', 'uitgebracht', 'kiesgerechtigden']) if (u[k] !== undefined && u[k] !== null && !heel(u[k])) f.push(`${k} is geen heel getal`);
  if (heel(u.uitgebracht) && heel(u.blanco) && heel(u.ongeldig) && u.uitgebracht !== geldig + u.blanco + u.ongeldig) f.push(`uitgebracht (${u.uitgebracht}) is niet geldig + blanco + ongeldig (${geldig + u.blanco + u.ongeldig})`);
  if (heel(u.kiesgerechtigden) && heel(u.uitgebracht) && u.uitgebracht > u.kiesgerechtigden) f.push('meer stemmen dan kiesgerechtigden');
  if (heel(u.kiesgerechtigden) && (u.kiesgerechtigden < KG[0] || u.kiesgerechtigden > KG[1])) f.push(`aantal kiesgerechtigden ${u.kiesgerechtigden} is niet aannemelijk voor deze gemeente`);

  const b = u.bureaus;
  if (b) {
    if (!heel(b.geteld) || !heel(b.totaal) || b.geteld > b.totaal || !b.totaal) f.push('bureaus: geteld en totaal kloppen niet');
    else if (u.stadium !== 'tussenstand' && b.geteld !== b.totaal) f.push(`${u.stadium}, maar pas ${b.geteld} van de ${b.totaal} stembureaus geteld`);
  } else if (u.stadium === 'tussenstand') f.push('tussenstand zonder aantal getelde stembureaus');

  if (u.stadium === 'voorlopig' || u.stadium === 'officieel') {
    const max = Object.fromEntries(slugs.map((s) => [s, (kandidaten[s] || []).length]));
    const v = verdeelZetels(Object.fromEntries(slugs.map((s) => [s, P[s].stemmen])), ZETELS, max);
    const heeftZetels = slugs.every((s) => heel(P[s].zetels));
    if (heeftZetels) {
      const som = slugs.reduce((n, s) => n + P[s].zetels, 0);
      if (som !== ZETELS) f.push(`zetels tellen op tot ${som}, niet ${ZETELS}`);
      for (const s of slugs) if (P[s].zetels > max[s]) f.push(`${s}: meer zetels dan kandidaten`);
      // Geeft de bron zelf zetels, dan zijn die leidend. Wijkt onze eigen berekening af, dan is dat een waarschuwing
      // voor Paul (waarschuwingen() hieronder), geen reden om de bron tegen te houden.
      void v;
    } else if (slugs.some((s) => P[s].zetels !== undefined && P[s].zetels !== null)) f.push('zetels staan bij een deel van de partijen');
  } else if (slugs.some((s) => P[s].zetels !== undefined && P[s].zetels !== null)) f.push('zetels horen niet bij een tussenstand');

  if (u.kandidaten) {
    if (u.stadium === 'tussenstand') f.push('voorkeurstemmen horen niet bij een tussenstand');
    for (const s of slugs) {
      const rij = u.kandidaten[s];
      const lijst = kandidaten[s] || [];
      if (!rij) { f.push(`${s}: voorkeurstemmen ontbreken`); continue; }
      const nrs = Object.keys(rij).map(Number).sort((a, b) => a - b);
      if (nrs.length !== lijst.length || nrs.some((n, i) => n !== lijst[i].nr)) { f.push(`${s}: kandidaatnummers komen niet overeen met de lijst`); continue; }
      if (nrs.some((n) => !heel(rij[n]))) { f.push(`${s}: voorkeurstemmen zijn geen hele getallen`); continue; }
      const som = nrs.reduce((n, k) => n + rij[k], 0);
      if (som !== P[s].stemmen) f.push(`${s}: voorkeurstemmen (${som}) tellen niet op tot de partijstemmen (${P[s].stemmen})`);
    }
  }
  if (u.gekozen) {
    if (!u.kandidaten) f.push('gekozen zonder voorkeurstemmen');
    for (const s of slugs) {
      const g = u.gekozen[s] || [];
      if (g.length !== (P[s].zetels ?? -1)) f.push(`${s}: ${g.length} gekozen, maar ${P[s].zetels} zetels`);
      if (g.some((n) => !(kandidaten[s] || []).some((k) => k.nr === n))) f.push(`${s}: gekozen kandidaat staat niet op de lijst`);
    }
  }
  return f;
}

// Vergelijkt een nieuwe stand met de vorige. Cijfers mogen niet teruglopen, behalve een kleine correctie wanneer de
// voorkeurstemmen of de officiële uitslag binnenkomen (bij het natellen per kandidaat worden soms fouten hersteld).
export function vergelijk(oud, nieuw) {
  const stemmenVan = (u, s) => u.partijen?.[s]?.stemmen ?? null;
  const f = [];
  if (!oud?.stadium || oud.stadium === 'wacht') return f;
  if (STADIA.indexOf(nieuw.stadium) < STADIA.indexOf(oud.stadium)) f.push(`stadium loopt terug van ${oud.stadium} naar ${nieuw.stadium}`);
  if (Date.parse(nieuw.bijgewerkt) < Date.parse(oud.bijgewerkt)) f.push('nieuwe stand is ouder dan de vorige');
  if (oud.kandidaten && !nieuw.kandidaten) f.push('voorkeurstemmen verdwijnen uit de stand');
  if (oud.gekozen && !nieuw.gekozen && oud.gekozenBron !== 'berekend') f.push('gekozen kandidaten van de bron verdwijnen uit de stand');
  if (oud.bureaus && nieuw.bureaus && nieuw.bureaus.geteld < oud.bureaus.geteld) f.push(`minder stembureaus geteld dan eerst (${nieuw.bureaus.geteld} na ${oud.bureaus.geteld})`);
  if (oud.bureaus && nieuw.bureaus && nieuw.bureaus.totaal !== oud.bureaus.totaal) f.push('totaal aantal stembureaus veranderd');
  const correctie = (nieuw.kandidaten && !oud.kandidaten) || (nieuw.stadium === 'officieel' && oud.stadium !== 'officieel');
  for (const [s, o] of Object.entries(oud.partijen || {})) {
    const n = nieuw.partijen?.[s];
    if (!n) continue;
    if (stemmenVan(oud, s) !== null && stemmenVan(nieuw, s) === null) { f.push(`${s}: stemmen verdwijnen uit de stand`); continue; }
    if (stemmenVan(oud, s) === null) continue;
    if (n.stemmen < o.stemmen) {
      const marge = Math.max(25, Math.round(o.stemmen * 0.02));
      if (!correctie) f.push(`${s}: stemmen lopen terug (${n.stemmen} na ${o.stemmen})`);
      else if (o.stemmen - n.stemmen > marge) f.push(`${s}: correctie van ${o.stemmen - n.stemmen} stemmen is groter dan toegestaan (${marge})`);
    }
  }
  if (oud.stadium !== 'tussenstand' && nieuw.stadium !== 'tussenstand' && !correctie) {
    const z = Object.entries(nieuw.partijen || {}).filter(([s, n]) => oud.partijen?.[s] && Number.isInteger(oud.partijen[s].zetels) && Number.isInteger(n.zetels) && oud.partijen[s].zetels !== n.zetels && n.stemmen === oud.partijen[s].stemmen);
    if (z.length) f.push(`zetels veranderd zonder andere stemmen: ${z.map(([s]) => s).join(', ')}`);
  }
  return f;
}

// Verschillen tussen wat de bron zegt en wat de site zelf met de Kieswet berekent. Die houden een publicatie niet tegen
// (de bron is leidend), maar Paul moet ze te zien krijgen.
export function waarschuwingen(u, partijen, kandidaten, ZETELS = 39) {
  const w = [];
  if (!u?.partijen || !['voorlopig', 'officieel'].includes(u.stadium)) return w;
  const slugs = partijen.map((p) => p.slug);
  if (slugs.some((s) => u.partijen[s]?.stemmen == null)) return w;
  const max = Object.fromEntries(slugs.map((s) => [s, (kandidaten[s] || []).length]));
  const v = verdeelZetels(Object.fromEntries(slugs.map((s) => [s, u.partijen[s].stemmen])), ZETELS, max);
  const bronZetels = slugs.every((s) => heel(u.partijen[s].zetels)) && u.zetelsBron !== 'berekend';
  if (bronZetels && v.zetels) {
    const anders = slugs.filter((s) => v.zetels[s] !== u.partijen[s].zetels);
    if (anders.length) w.push(`zetels van de bron wijken af van de eigen berekening (Kieswet): ${anders.map((s) => `${s} bron ${u.partijen[s].zetels}, berekend ${v.zetels[s]}`).join('; ')}`);
  }
  if (bronZetels && v.loting) w.push('de eigen berekening komt op een loting uit; de zetels van de bron staan op de site');
  if (u.gekozen && u.gekozenBron !== 'berekend' && u.kandidaten && v.kiesdeler) {
    for (const s of slugs) {
      const rij = (kandidaten[s] || []).map((k) => ({ nr: k.nr, stemmen: u.kandidaten[s][k.nr] }));
      const r = gekozenen(rij, u.partijen[s].zetels, v.kiesdeler);
      const a = [...(u.gekozen[s] || [])].sort((x, y) => x - y).join(), b = r.gekozen ? [...r.gekozen].sort((x, y) => x - y).join() : 'loting';
      if (a !== b) w.push(`${s}: gekozen volgens de bron ${a || '-'}, volgens de eigen berekening ${b || '-'}`);
    }
  }
  return w;
}

// Vult de zetels en de gekozen kandidaten aan met de wettelijke berekening, als de bron die zelf niet geeft.
// Komt er een loting uit, dan blijven ze leeg.
export function vulAan(u, partijen, kandidaten, ZETELS = 39) {
  if (!u?.partijen || !['voorlopig', 'officieel'].includes(u.stadium)) return u;
  const slugs = partijen.map((p) => p.slug);
  if (slugs.every((s) => u.partijen[s]?.stemmen == null)) return { ...u, zetelsBron: 'bron' };
  const max = Object.fromEntries(slugs.map((s) => [s, (kandidaten[s] || []).length]));
  const v = verdeelZetels(Object.fromEntries(slugs.map((s) => [s, u.partijen[s].stemmen])), ZETELS, max);
  if (!slugs.every((s) => heel(u.partijen[s].zetels))) {
    if (!v.zetels) return { ...u, zetelsBron: null, loting: !!v.loting };
    u = { ...u, zetelsBron: 'berekend', partijen: Object.fromEntries(slugs.map((s) => [s, { ...u.partijen[s], zetels: v.zetels[s] }])) };
  } else if (u.zetelsBron !== 'berekend') {
    // Zetels van de bron: leidend. Wel vastleggen of onze eigen berekening hetzelfde uitkomt.
    u = { ...u, zetelsBron: 'bron', zetelsGelijk: !!v.zetels && slugs.every((s) => v.zetels[s] === u.partijen[s].zetels) };
  }
  if (u.gekozen && !u.gekozenBron) u = { ...u, gekozenBron: 'bron' };
  if (u.kandidaten && !u.gekozen) {
    const g = {};
    for (const s of slugs) {
      const rij = (kandidaten[s] || []).map((k) => ({ nr: k.nr, stemmen: u.kandidaten[s][k.nr] }));
      const r = gekozenen(rij, u.partijen[s].zetels, v.kiesdeler);
      if (r.loting) return { ...u, gekozenLoting: true };
      g[s] = r.gekozen;
    }
    u = { ...u, gekozen: g, gekozenBron: 'berekend' };
  }
  return u;
}
