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
// en de spreiding 1. Een lijst zonder standpunt krijgt 0: het helpt haar niet en het schaadt haar niet.
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
      const w = dubbel.has(st.id) ? 2 : 1;
      const p = positie(st, slug);
      if (p !== null) bekend++;
      const [laag, hoog] = grenzen(a);
      const o = w * (overeenkomst(a, p) - laag);
      const n = w * (hoog - laag);
      teller += o;
      noemer += n;
      const t = (perThema[st.thema] ||= { teller: 0, noemer: 0, bekend: 0, n: 0 });
      t.teller += o;
      t.noemer += n;
      t.n++;
      if (p !== null) t.bekend++;
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
