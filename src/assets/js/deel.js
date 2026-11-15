// Gedeelde hulpjes voor de pagina's die standpunten tonen.
export const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const POS = { 2: 'Eens', 1: 'Eerder eens', 0: 'Midden', '-1': 'Eerder oneens', '-2': 'Oneens', null: 'Geen standpunt gevonden' };
export const ANTWOORD = { 2: 'Eens', 1: 'Eerder eens', 0: 'Neutraal', '-1': 'Eerder oneens', '-2': 'Oneens' };
export const SCHAAL = [2, 1, 0, -1, -2];
export const SOORT = { programma: 'Verkiezingsprogramma', mijnstem: 'Antwoord van de lijst in MijnStem', stemgids: 'Antwoord van de lijst in Stemgids Hilversum', hilversumsnieuws: 'Reactie van de lijst in Hilversums Nieuws', stemgedrag: 'Stemgedrag in de raad', afgeleid: 'Afgeleid uit wat de lijst over een verwant punt zegt' };

const SLEUTEL = 'hilversumkiest.v1';
export function laadStaat() {
  try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; }
}
export function bewaarStaat(s) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(s)); } catch { /* privé-venster: dan onthouden we niets */ }
}
export async function laadData() {
  const r = await fetch('/data/stemwijzer.json');
  if (!r.ok) throw new Error('De gegevens konden niet worden geladen.');
  return r.json();
}
export const pos = (st, slug) => { const p = st.posities[slug]; return p && typeof p.s === 'number' ? p.s : null; };

export function standpuntHtml(st, partij) {
  const p = st.posities[partij.slug] || { s: null };
  const s = typeof p.s === 'number' ? p.s : null;
  const bron = p.bron || p.soort ? `<cite>${e(SOORT[p.soort] || '')}${p.soort && p.bron ? ': ' : ''}${e(p.bron || '')}</cite>` : '';
  return `<div class="standpunt" style="border-left-color:${partij.kleur}">
  <h5>${e(partij.kort)} <span class="pos" data-s="${s ?? 'null'}">${POS[s]}</span>${p.kern ? ` <span>${e(p.kern)}</span>` : ''}</h5>
  ${p.toelichting ? `<p>${e(p.toelichting)}</p>` : s === null ? '<p class="grijs">Hierover is geen duidelijk standpunt gevonden.</p>' : ''}
  ${p.citaat ? `<blockquote>“${e(p.citaat)}”</blockquote>` : ''}
  ${bron}
</div>`;
}

// Vijf kolommen van eens naar oneens, met de lijsten als fiches en eventueel het eigen antwoord.
export function spectrumHtml(st, partijen, jouw) {
  const kolommen = SCHAAL.map((v) => {
    const hier = partijen.filter((p) => pos(st, p.slug) === v);
    const chips = hier.map((p) => `<span class="chip chip--vast" title="${e(st.posities[p.slug]?.kern || '')}"><i style="background:${p.kleur}"></i>${e(p.kort)}</span>`).join('');
    const jij = jouw === v ? '<span class="chip chip--jij">Jij</span>' : '';
    return `<div class="${jouw === v ? 'jouw' : ''}"><h5>${POS[v]}</h5><div class="chips">${jij}${chips}</div></div>`;
  }).join('');
  const onbekend = partijen.filter((p) => pos(st, p.slug) === null);
  return `<div class="spectrum">${kolommen}</div>${onbekend.length ? `<p class="onbekend">Geen standpunt gevonden: ${onbekend.map((p) => e(p.kort)).join(', ')}</p>` : ''}`;
}
