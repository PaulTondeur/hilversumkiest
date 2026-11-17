// Zetelverdeling en voorkeurstemmen volgens de Kieswet, voor een gemeenteraad van 19 of meer zetels
// (de nieuwe raad van Hilversum krijgt er 39). Rekent alleen met hele getallen, zodat er nooit een afrondingsfout
// in sluipt. Waar de wet loting voorschrijft (gelijke gemiddelden, gelijke voorkeurstemmen op de grens), geeft dit
// geen uitkomst maar { loting: true }: dan beslist het centraal stembureau en toont de site de zetels niet.

// stemmen: { slug: aantal }, zetels: 39, max: { slug: aantal kandidaten op de lijst }
export function verdeelZetels(stemmen, zetels, max = {}) {
  const slugs = Object.keys(stemmen);
  const geldig = slugs.reduce((s, k) => s + stemmen[k], 0);
  if (!geldig) return { fout: 'geen geldige stemmen' };
  const plafond = (k) => (max[k] ?? Infinity);
  // Volle zetels: aantal keren dat de kiesdeler (geldig / zetels) in de stemmen past (Kieswet P 6).
  const z = Object.fromEntries(slugs.map((k) => [k, Math.min(Math.floor((stemmen[k] * zetels) / geldig), plafond(k))]));
  // Restzetels: grootste gemiddelden, alleen voor partijen die de kiesdeler haalden (P 7) en nog kandidaten over
  // hebben (P 10).
  const haaltDeler = (k) => stemmen[k] * zetels >= geldig;
  let rest = zetels - slugs.reduce((s, k) => s + z[k], 0);
  while (rest > 0) {
    const kan = slugs.filter((k) => haaltDeler(k) && z[k] < plafond(k));
    if (!kan.length) return { fout: 'geen partij meer die een restzetel kan krijgen' };
    // gemiddelde a > b  <=>  stemmen[a] * (z[b] + 1) > stemmen[b] * (z[a] + 1)
    const vgl = (a, b) => stemmen[a] * (z[b] + 1) - stemmen[b] * (z[a] + 1);
    let top = [kan[0]];
    for (const k of kan.slice(1)) {
      const d = vgl(k, top[0]);
      if (d > 0) top = [k];
      else if (d === 0) top.push(k);
    }
    if (top.length > rest) return { loting: true, kiesdeler: geldig / zetels, gelijk: top };
    for (const k of top) z[k]++;
    rest -= top.length;
  }
  return { zetels: z, kiesdeler: geldig / zetels, geldig };
}

// Wie een zetel krijgt binnen één partij (Kieswet P 15 tot P 17). rij: [{ nr, stemmen }] in de volgorde van de lijst.
// Eerst de kandidaten met ten minste 25% van de kiesdeler aan voorkeurstemmen, op volgorde van hun aantal stemmen;
// daarna de rest op volgorde van de lijst.
export function gekozenen(rij, zetels, kiesdeler) {
  if (!zetels) return { gekozen: [] };
  const drempel = kiesdeler * 0.25;
  const boven = rij.filter((k) => k.stemmen >= drempel).sort((a, b) => b.stemmen - a.stemmen);
  if (boven.length > zetels && boven[zetels - 1].stemmen === boven[zetels].stemmen) return { loting: true, drempel };
  const gekozen = boven.slice(0, zetels).map((k) => k.nr);
  for (const k of rij) {
    if (gekozen.length >= zetels) break;
    if (!gekozen.includes(k.nr)) gekozen.push(k.nr);
  }
  return { gekozen, drempel, opVoorkeur: boven.slice(0, zetels).map((k) => k.nr) };
}
