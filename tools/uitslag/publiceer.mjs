// Schrijft een nieuwe stand naar data/uitslag.json, maar alleen als alle controles slagen. Daarna (met --push) een
// commit en push naar main, zodat GitHub Pages de site opnieuw bouwt. Gebruikt door haal.mjs en door een Claude-taak
// die de cijfers met de hand uit de bron overneemt als het script de bron niet herkent.
//
//   node tools/uitslag/publiceer.mjs <nieuw.json> [--push]
//
// Uitkomst (exit code): 0 = gepubliceerd of niets nieuws, 3 = afgewezen door de controles (er verandert niets).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { controleer, vergelijk, waarschuwingen } from '../../src/uitslagcontrole.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lees = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const DOEL = path.join(ROOT, 'data/uitslag.json');

export function beoordeel(nieuw) {
  const partijen = lees('data/partijen.json');
  const kandidaten = lees('data/kandidaten.json');
  const oud = fs.existsSync(DOEL) ? JSON.parse(fs.readFileSync(DOEL, 'utf8')) : {};
  const fouten = [];
  if (nieuw.simulatie) fouten.push('simulatie: verzonnen cijfers worden nooit gepubliceerd');
  // UITSLAG_ZETELS alleen voor de oefening met een oude verkiezing (Hilversum 2022: 37 zetels).
  const opties = process.env.UITSLAG_ZETELS ? { zetels: +process.env.UITSLAG_ZETELS } : {};
  fouten.push(...controleer(nieuw, partijen, kandidaten, opties), ...vergelijk(oud, nieuw));
  // Alleen het tijdstip anders? Dan is er niets nieuws.
  const zonderTijd = (u) => JSON.stringify({ ...u, bijgewerkt: null });
  const zelfde = zonderTijd(oud) === zonderTijd(nieuw);
  const w = fouten.length ? [] : waarschuwingen(nieuw, partijen, kandidaten, opties.zetels || 39);
  return { fouten, zelfde, oud, waarschuwingen: w };
}

export function publiceer(nieuw, { push = false, bericht } = {}) {
  const { fouten, zelfde, waarschuwingen: w } = beoordeel(nieuw);
  if (fouten.length) return { status: 'afgewezen', fouten };
  if (zelfde) return { status: 'niets nieuws' };
  const vorige = fs.existsSync(DOEL) ? fs.readFileSync(DOEL, 'utf8') : '{}\n';
  fs.writeFileSync(DOEL, JSON.stringify(nieuw, null, 1) + '\n');
  // Proefbouw: als de site met deze cijfers niet bouwt, zetten we het oude bestand terug.
  try {
    execFileSync('node', ['build.mjs'], { cwd: ROOT, stdio: 'pipe', env: { ...process.env, SIMULATIE: '' } });
  } catch (err) {
    fs.writeFileSync(DOEL, vorige);
    return { status: 'afgewezen', fouten: [`bouwen mislukt: ${String(err.stderr || err.message).slice(0, 500)}`] };
  }
  if (!push) return { status: 'geschreven', waarschuwingen: w };
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  const tekst = bericht || `Uitslag: ${nieuw.stadium}${nieuw.bureaus && nieuw.stadium === 'tussenstand' ? ` (${nieuw.bureaus.geteld} van ${nieuw.bureaus.totaal} stembureaus)` : ''}${nieuw.kandidaten ? ', met voorkeurstemmen' : ''}`;
  git('add', 'data/uitslag.json');
  git('commit', '-m', tekst, '--', 'data/uitslag.json');
  for (let poging = 1; ; poging++) {
    try {
      git('pull', '--rebase', '--autostash', 'origin', 'main');
      git('push', 'origin', 'HEAD:main');
      break;
    } catch (err) {
      // Publiceerde iemand anders (de GitHub-workflow of de Claude-taak) net ook een stand? Dan botst data/uitslag.json.
      // Onze commit vervalt; de volgende ronde kijkt opnieuw, vanaf de stand die er nu staat.
      if (fs.existsSync(path.join(ROOT, '.git/rebase-merge')) || fs.existsSync(path.join(ROOT, '.git/rebase-apply'))) {
        try { git('rebase', '--abort'); } catch { /* al weg */ }
        git('reset', '--keep', 'HEAD~1');
        try { git('pull', '--rebase', '--autostash', 'origin', 'main'); } catch { /* volgende ronde */ }
        return { status: 'overgeslagen: er stond net een andere nieuwe stand', fouten: [] };
      }
      if (poging >= 3) {
        git('reset', '--keep', 'HEAD~1');
        return { status: 'push mislukt', fouten: [String(err.stderr || err.message).slice(0, 500)] };
      }
    }
  }
  return { status: 'gepubliceerd', commit: git('rev-parse', '--short', 'HEAD'), waarschuwingen: w };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bestand = process.argv[2];
  if (!bestand) { console.error('gebruik: node tools/uitslag/publiceer.mjs <nieuw.json> [--push]'); process.exit(1); }
  const r = publiceer(JSON.parse(fs.readFileSync(bestand, 'utf8')), { push: process.argv.includes('--push') });
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.status === 'afgewezen' || r.status === 'push mislukt' ? 3 : 0);
}
