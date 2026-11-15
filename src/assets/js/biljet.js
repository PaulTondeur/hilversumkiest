// Het stembiljet op de voorpagina: kleur partijen en neem de keuze mee naar de stemwijzer.
import { laadStaat, bewaarStaat } from './deel.js';
for (const b of document.querySelectorAll('[data-biljet]')) {
  const vakjes = [...b.querySelectorAll('input[name="lijst"]')];
  const telling = b.querySelector('[data-telling]');
  const start = b.querySelector('[data-start]');
  const staat = laadStaat();
  for (const v of vakjes) v.checked = (staat.lijsten || []).includes(v.value);
  const werkBij = () => {
    const gekozen = vakjes.filter((v) => v.checked).map((v) => v.value);
    const s = laadStaat();
    if (JSON.stringify(s.lijsten || []) !== JSON.stringify(gekozen)) { s.lijsten = gekozen; delete s.set; s.stap = 'lijsten'; bewaarStaat(s); }
    if (telling) telling.textContent = gekozen.length === 0 ? 'Nog geen partij gekleurd' : gekozen.length === 1 ? '1 partij gekleurd: kies er minstens twee' : `${gekozen.length} partijen gekleurd`;
    if (start) {
      start.textContent = gekozen.length >= 2 ? `Start met ${gekozen.length} partijen` : 'Start de stemwijzer';
      start.href = gekozen.length >= 2 ? '/stemwijzer/#themas' : '/stemwijzer/';
    }
  };
  b.addEventListener('change', werkBij);
  b.querySelector('[data-alles]')?.addEventListener('click', () => { vakjes.forEach((v) => (v.checked = true)); werkBij(); });
  b.querySelector('[data-wis]')?.addEventListener('click', () => { vakjes.forEach((v) => (v.checked = false)); werkBij(); });
  werkBij();
}
