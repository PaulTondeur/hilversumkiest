// Rekenkern van de stemwijzer. Wordt gebruikt door de browser én door de eerlijkheidstoets (tools/toets.mjs).
// Schaal voor antwoorden en partijposities: -2 (helemaal oneens) … +2 (helemaal eens). null = geen standpunt bekend.

export const DIEPTES = {
  kort: { label: 'Kort', perThema: 4 },
  normaal: { label: 'Gewoon', perThema: 7 },
  diep: { label: 'Verdiepend', perThema: 12 },
};

// --- Overeenkomst tussen een antwoord en een positie ---
// Basis is de afstand op de schaal van vijf ("city block"). Die maat heeft een bekend nadeel: een lijst op een
// middenpositie ligt nooit ver van je af en scoort dus gemiddeld hoger, wat je ook antwoordt. Daarom wordt de
// afstand per positie gestandaardiseerd: voor elke positie is de verwachte score van een willekeurige invuller 0
// en de spreiding 1. Heeft een lijst geen standpunt, dan telt de stelling in bereken voor haar niet mee.
const SCHAAL = [-2, -1, 0, 1, 2];
const Z = {};
for (const p of SCHAAL) {
  const v = SCHAAL.map((a) => 1 - Math.abs(a - p) / 4);
  const m = v.reduce((x, y) => x + y, 0) / v.length;
  const sd = Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length);
  Z[p] = Object.fromEntries(SCHAAL.map((a, i) => [a, (v[i] - m) / sd]));
}
const BEST = Object.fromEntries(SCHAAL.map((a) => [a, Math.max(...SCHAAL.map((p) => Z[p][a]))]));
const SLECHTST = Object.fromEntries(SCHAAL.map((a) => [a, Math.min(...SCHAAL.map((p) => Z[p][a]))]));

// Voor de toets kan de oude rekenwijze nog worden aangezet: 'afstand' (alleen afstand, onbekend = half)
// of 'meng' (afstand en richting half om half).
let MAAT = 'z';
export function zetMaat(m) { MAAT = m; }
export function overeenkomst(antwoord, positie) {
  if (MAAT === 'z') return positie === null || positie === undefined ? 0 : Z[positie][antwoord];
  if (positie === null || positie === undefined) return 0.5;
  const afstand = 1 - Math.abs(antwoord - positie) / 4;
  if (MAAT === 'afstand') return afstand;
  return 0.5 * afstand + 0.5 * (1 + (antwoord * positie) / 4) / 2;
}
// Onder- en bovengrens van de score voor één antwoord, om de som naar een percentage te schalen.
function grenzen(antwoord) {
  return MAAT === 'z' ? [SLECHTST[antwoord], BEST[antwoord]] : [0, 1];
}

export function positie(stelling, slug) {
  const p = stelling.posities[slug];
  return p && typeof p.s === 'number' ? p.s : null;
}

// Hoe sterk scheidt een stelling de gekozen lijsten? 0 = iedereen hetzelfde of te weinig bekend.
export function onderscheid(stelling, slugs) {
  const bekend = slugs.map((s) => positie(stelling, s)).filter((v) => v !== null);
  if (bekend.length < 2) return 0;
  let som = 0;
  let n = 0;
  for (let i = 0; i < bekend.length; i++) {
    for (let j = i + 1; j < bekend.length; j++) {
      som += Math.abs(bekend[i] - bekend[j]);
      n++;
    }
  }
  const spreiding = som / n; // 0..4
  const dekking = bekend.length / slugs.length;
  return spreiding * Math.sqrt(dekking);
}

// Kies per thema de stellingen die de gekozen lijsten het best van elkaar scheiden.
// Stellingen over hetzelfde onderwerp krijgen een korting, zodat een thema niet drie keer dezelfde vraag stelt.
export function kiesStellingen(stellingen, slugs, themas, perThema) {
  const gekozen = [];
  for (const thema of themas) {
    const kandidaten = stellingen
      .filter((s) => s.thema === thema)
      .map((s) => ({ s, d: onderscheid(s, slugs) }))
      .filter((k) => k.d > 0);
    const gepakt = [];
    const onderwerpen = new Map();
    while (gepakt.length < perThema && kandidaten.length) {
      let beste = -1;
      let besteWaarde = -1;
      kandidaten.forEach((k, i) => {
        const keer = onderwerpen.get(k.s.onderwerp || k.s.id) || 0;
        const waarde = k.d * Math.pow(0.55, keer);
        if (waarde > besteWaarde + 1e-9) {
          besteWaarde = waarde;
          beste = i;
        }
      });
      const [k] = kandidaten.splice(beste, 1);
      gepakt.push(k.s);
      const sleutel = k.s.onderwerp || k.s.id;
      onderwerpen.set(sleutel, (onderwerpen.get(sleutel) || 0) + 1);
    }
    // Toon in de vaste volgorde van de stellingenbank, niet in volgorde van onderscheid.
    const volgorde = new Map(stellingen.map((s, i) => [s.id, i]));
    gepakt.sort((a, b) => volgorde.get(a.id) - volgorde.get(b.id));
    gekozen.push(...gepakt);
  }
  return gekozen;
}

// antwoorden: { [stellingId]: -2..2 } (overgeslagen stellingen ontbreken)
// zwaar: Set of array met stelling-id's die dubbel tellen
export function bereken(stellingen, slugs, antwoorden, zwaar = []) {
  const dubbel = new Set(zwaar);
  const uit = slugs.map((slug) => {
    let teller = 0;
    let noemer = 0;
    let bekend = 0;
    let beantwoord = 0;
    const perThema = {};
    for (const st of stellingen) {
      const a = antwoorden[st.id];
      if (a === undefined || a === null) continue;
      beantwoord++;
      const t = (perThema[st.thema] ||= { teller: 0, noemer: 0, bekend: 0, n: 0 });
      t.n++;
      const p = positie(st, slug);
      // Geen standpunt: de stelling telt voor deze partij niet mee, in teller noch noemer.
      // (Tot 16 november telde ze als 0 op de gestandaardiseerde maat, wat partijen met minder standpunten benadeelde;
      // zie werk/audit/eindcontrole-neutraliteit.md, bevinding 1.)
      if (p === null) continue;
      bekend++;
      t.bekend++;
      const w = dubbel.has(st.id) ? 2 : 1;
      const [laag, hoog] = grenzen(a);
      const o = w * (overeenkomst(a, p) - laag);
      const n = w * (hoog - laag);
      teller += o;
      noemer += n;
      t.teller += o;
      t.noemer += n;
    }
    const themas = {};
    for (const [id, t] of Object.entries(perThema)) {
      themas[id] = { score: t.noemer ? t.teller / t.noemer : null, bekend: t.bekend, n: t.n };
    }
    return { slug, score: noemer ? teller / noemer : null, bekend, beantwoord, themas };
  });
  uit.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.bekend - a.bekend || a.slug.localeCompare(b.slug));
  return uit;
}

// --- Buiten je keuze ---
// Partijen die je niet koos, maar die op jouw antwoorden dichter bij je staan dan elk van je eigen partijen.
// Elke partij, gekozen of niet, wordt hier op dezelfde manier gemeten: alleen op de beantwoorde stellingen waar
// zij een standpunt heeft (geen standpunt telt dus niet mee, in plus noch min). Een partij buiten je keuze komt
// alleen in aanmerking met een standpunt op minstens de helft van je stellingen en op minstens acht, en als ze
// minstens 10 procentpunt dichter bij je staat dan je eigen partij die het dichtst bij staat. Hoe die drempels
// gekozen zijn: werk/feedback/meet-suggestie.mjs en werk/feedback/advies-16-november.md.
export const BUITEN = { minBekend: 8, minDekking: 1 / 2, marge: 0.10, max: 2 };

export function scoreOpBekend(stellingen, slug, antwoorden, zwaar = []) {
  const dubbel = new Set(zwaar);
  let teller = 0;
  let noemer = 0;
  let bekend = 0;
  for (const st of stellingen) {
    const a = antwoorden[st.id];
    if (a === undefined || a === null) continue;
    const p = positie(st, slug);
    if (p === null) continue;
    const w = dubbel.has(st.id) ? 2 : 1;
    const [laag, hoog] = grenzen(a);
    teller += w * (overeenkomst(a, p) - laag);
    noemer += w * (hoog - laag);
    bekend++;
  }
  return { slug, score: noemer ? teller / noemer : null, bekend };
}

// Geeft de partijen terug op volgorde van het meegegeven `alle` (de volgorde van het stembiljet).
export function buitenKeuze(stellingen, gekozen, alle, antwoorden, zwaar = [], regel = BUITEN) {
  const beantwoord = stellingen.filter((st) => antwoorden[st.id] !== undefined && antwoorden[st.id] !== null).length;
  const eigen = gekozen.map((s) => scoreOpBekend(stellingen, s, antwoorden, zwaar).score).filter((v) => v !== null);
  if (!eigen.length || beantwoord < regel.minBekend) return [];
  const lat = Math.max(...eigen) + regel.marge;
  const kandidaten = alle
    .filter((s) => !gekozen.includes(s))
    .map((s) => scoreOpBekend(stellingen, s, antwoorden, zwaar))
    .filter((u) => u.bekend >= regel.minBekend && u.bekend >= regel.minDekking * beantwoord && u.score >= lat - 1e-9);
  // Halen er meer dan `max` de lat, dan de partijen die het verst boven de lat uitkomen; getoond op stembiljetvolgorde.
  const gepakt = new Set([...kandidaten].sort((a, b) => b.score - a.score).slice(0, regel.max).map((u) => u.slug));
  return kandidaten.filter((u) => gepakt.has(u.slug));
}

// Afstand tussen twee lijsten over alle stellingen waar beide een standpunt hebben (0 = identiek, 1 = tegenpolen).
export function partijAfstand(stellingen, a, b, thema = null) {
  let som = 0;
  let n = 0;
  for (const st of stellingen) {
    if (thema && st.thema !== thema) continue;
    const pa = positie(st, a);
    const pb = positie(st, b);
    if (pa === null || pb === null) continue;
    som += Math.abs(pa - pb) / 4;
    n++;
  }
  return { afstand: n ? som / n : null, n };
}

export function procent(score) {
  return score === null ? null : Math.round(score * 100);
}
