// Droge oefening van begin tot eind met de echte bestanden van de gemeenteraadsverkiezing Hilversum 2022.
// Maakt een losse kopie van de repository in een tijdelijke map, met een eigen nep-origin: er gaat niets naar GitHub.
// De kopie krijgt de partijen en kandidaten van 2022, de "gemeentepagina's" zijn bestanden op schijf.
//   node tools/uitslag/oefening.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST = path.join(ROOT, 'tools/uitslag/test');
const MAP = fs.mkdtempSync(path.join(os.tmpdir(), 'uitslag-oefening-'));
const sh = (cmd, args, cwd = MAP) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString().trim();
const KOPIE = path.join(MAP, 'site');
const ORIGIN = path.join(MAP, 'origin.git');
const WEB = path.join(MAP, 'gemeente');

console.log(`oefenmap: ${MAP}`);
sh('git', ['clone', '-q', ROOT, KOPIE]);
sh('git', ['init', '-q', '--bare', ORIGIN]);
sh('git', ['remote', 'set-url', 'origin', ORIGIN], KOPIE);
sh('git', ['push', '-q', 'origin', 'HEAD:main'], KOPIE);
// Partijen en kandidaten van 2022 in de kopie (uit de officiële kandidatenlijsten, EML 230).
const xml230 = fs.readFileSync(path.join(TEST, 'gr2022-hilversum-230.eml.xml'), 'utf8').replace(/<(\/?)[\w-]+:/g, '<$1');
const partijen = [], kandidaten = {};
for (const [, aff] of xml230.matchAll(/<Affiliation>([\s\S]*?)<\/Affiliation>/g)) {
  const nr = +aff.match(/<AffiliationIdentifier Id="(\d+)"/)[1];
  const naam = aff.match(/<RegisteredName>([^<]*)</)[1];
  const slug = `lijst-${nr}`;
  partijen.push({ slug, nr, naam, kort: naam, kleur: ['#E8451E', '#00A85A', '#0A2D6E', '#39A935', '#007B5F', '#EC1B23', '#C2185B', '#00A7EB', '#7A4FA3', '#F2B705', '#2B3A8F', '#5E8C31'][nr - 1], lijsttrekker: '', programma: {}, speerpunten: [] });
  kandidaten[slug] = [...aff.matchAll(/<Candidate>([\s\S]*?)<\/Candidate>/g)].map(([, c]) => ({
    nr: +c.match(/<CandidateIdentifier Id="(\d+)"/)[1],
    naam: [c.match(/<FirstName>([^<]*)</)?.[1], c.match(/<NamePrefix>([^<]*)</)?.[1], c.match(/<LastName>([^<]*)</)?.[1]].filter(Boolean).join(' '),
    woonplaats: c.match(/<LocalityName>([^<]*)</)?.[1] || '',
  }));
}
fs.writeFileSync(path.join(KOPIE, 'data/partijen.json'), JSON.stringify(partijen, null, 1));
fs.writeFileSync(path.join(KOPIE, 'data/kandidaten.json'), JSON.stringify(kandidaten, null, 1));
fs.writeFileSync(path.join(KOPIE, 'data/uitslag.json'), '{}\n');
fs.writeFileSync(path.join(KOPIE, 'tools/uitslag/stembiljet.json'), '{}');
sh('git', ['commit', '-qam', 'oefening: partijen en kandidaten van 2022'], KOPIE);
sh('git', ['push', '-q', 'origin', 'HEAD:main'], KOPIE);

// De "gemeentesite": een liveblog en een uitslagenpagina, als bestanden.
fs.mkdirSync(path.join(WEB, 'bestanden'), { recursive: true });
fs.copyFileSync(path.join(TEST, 'gr2022-hilversum-510b-ingekort.eml.xml'), path.join(WEB, 'bestanden/telling.eml.xml'));
fs.copyFileSync(path.join(TEST, 'gr2022-hilversum-520.eml.xml'), path.join(WEB, 'bestanden/resultaat.eml.xml'));
const blog = (tekst) => fs.writeFileSync(path.join(WEB, 'liveblog.html'), `<html><body><main><h1>Liveblog</h1>${tekst}</main></body></html>`);
const uitslagen = (links) => fs.writeFileSync(path.join(WEB, 'uitslagen.html'), `<html><body><main>${links.map((l) => `<a href="${l}">${l}</a>`).join(' ')}</main></body></html>`);
const env = {
  ...process.env,
  UITSLAG_PAGINAS: [pathToFileURL(path.join(WEB, 'liveblog.html')).href, pathToFileURL(path.join(WEB, 'uitslagen.html')).href].join(','),
  UITSLAG_DATUM: '2022-03-16', UITSLAG_VASTSTELLING: '2022-03-21T10:00:00+01:00', UITSLAG_VERKIEZING: 'GR2022_Hilversum', UITSLAG_ZETELS: '37', UITSLAG_OEFENING: '1',
};
const commits = () => sh('git', ['--git-dir', ORIGIN, 'log', '--oneline', 'main']).split('\n').length;
function stap(naam, nu, { verwacht }) {
  const voor = commits();
  const r = spawnSync('node', ['tools/uitslag/haal.mjs', '--push'], { cwd: KOPIE, env: { ...env, UITSLAG_NU: nu }, encoding: 'utf8' });
  const uit = (() => { try { return JSON.parse(r.stdout); } catch { return { status: r.stdout || r.stderr }; } })();
  const na = commits();
  const ok = r.status === verwacht;
  console.log(`${ok ? 'goed' : 'FOUT'}  ${naam}: exit ${r.status} (verwacht ${verwacht}), ${uit.status}${uit.fouten ? ` – ${uit.fouten.slice(0, 2).join('; ')}` : ''}; ${na - voor} nieuwe commit(s) op origin/main`);
  if (!ok) console.log(r.stderr);
  return { ok, push: na - voor, uit };
}

let goed = true;
const zie = (x) => { goed = goed && x.ok; return x; };
blog('<p>De stembureaus zijn open.</p>'); uitslagen([]);
zie(stap('ochtend, nog niets', '2022-03-16T06:00:00Z', { verwacht: 0 }));
zie(stap('stembureaus open: stadium "wacht" wordt gepubliceerd', '2022-03-16T07:00:00Z', { verwacht: 0 }));
zie(stap('nogmaals: niets nieuws, geen commit', '2022-03-16T08:00:00Z', { verwacht: 0 }));
blog('<article><h2>22.40 uur</h2><p>De tussenstand: 30 van de 63 stembureaus zijn geteld. Zie de grafiek hieronder.</p><img src="grafiek.png"></article>');
zie(stap('liveblog meldt een tussenstand als plaatje: niet leesbaar, exit 2 voor de Claude-taak, geen commit', '2022-03-16T21:45:00Z', { verwacht: 2 }));
uitslagen(['bestanden/kapot.eml.xml']);
fs.writeFileSync(path.join(WEB, 'bestanden/kapot.eml.xml'), fs.readFileSync(path.join(TEST, 'gr2022-hilversum-510b-ingekort.eml.xml'), 'utf8').slice(0, 5000));
zie(stap('afgekapt telbestand: niet gepubliceerd', '2022-03-17T00:10:00Z', { verwacht: 2 }));
const zonder = fs.readFileSync(path.join(TEST, 'gr2022-hilversum-510b-ingekort.eml.xml'), 'utf8').replace(/<Selection><AffiliationIdentifier Id="12">[\s\S]*?(?=<Cast>)/, '');
fs.writeFileSync(path.join(WEB, 'bestanden/onvolledig.eml.xml'), zonder);
uitslagen(['bestanden/onvolledig.eml.xml']);
zie(stap('telbestand mist een partij: niet gepubliceerd', '2022-03-17T00:20:00Z', { verwacht: 2 }));
const geknoeid = fs.readFileSync(path.join(TEST, 'gr2022-hilversum-510b-ingekort.eml.xml'), 'utf8').replace('<ValidVotes>6678</ValidVotes>', '<ValidVotes>6778</ValidVotes>');
fs.writeFileSync(path.join(WEB, 'bestanden/telfout.eml.xml'), geknoeid);
uitslagen(['bestanden/telfout.eml.xml']);
zie(stap('telbestand telt niet op: afgewezen, vorige stand blijft', '2022-03-17T00:30:00Z', { verwacht: 3 }));
uitslagen(['bestanden/telling.eml.xml']);
const v = zie(stap('echt telbestand 2022: voorlopige uitslag met voorkeurstemmen gepubliceerd', '2022-03-17T00:55:00Z', { verwacht: 0 }));
zie({ ok: v.push === 1 });
zie(stap('zelfde bestand nog eens: niets nieuws', '2022-03-17T01:55:00Z', { verwacht: 0 }));
uitslagen(['bestanden/telling.eml.xml', 'bestanden/resultaat.eml.xml']);
zie(stap('resultaat (EML 520) vóór de vaststelling: blijft voorlopig', '2022-03-18T10:00:00Z', { verwacht: 0 }));
// Het centraal stembureau stelt vast: de 520 krijgt een tijdstip na de zitting.
fs.writeFileSync(path.join(WEB, 'bestanden/resultaat.eml.xml'), fs.readFileSync(path.join(TEST, 'gr2022-hilversum-520.eml.xml'), 'utf8').replace(/<kr:CreationDateTime>[^<]+</, '<kr:CreationDateTime>2022-03-21T10:40:00.000<'));
const o = zie(stap('na de vaststelling: officiële uitslag gepubliceerd', '2022-03-21T10:30:00Z', { verwacht: 0 }));
zie({ ok: o.push === 1 });
zie(stap('daarna: officiële uitslag compleet, planning mag uit (exit 10)', '2022-03-21T11:30:00Z', { verwacht: 10 }));

const eind = JSON.parse(sh('git', ['--git-dir', ORIGIN, 'show', 'main:data/uitslag.json']));
console.log(`\neindstand op origin/main: ${eind.stadium}, ${Object.values(eind.partijen).reduce((n, p) => n + p.zetels, 0)} zetels, ${Object.values(eind.gekozen).flat().length} gekozen, bron ${eind.bron.naam}`);
console.log(sh('git', ['--git-dir', ORIGIN, 'log', '--format=  %s', 'main', '-6']));
console.log(goed ? '\nOefening geslaagd.' : '\nOefening NIET geslaagd.');
process.exit(goed ? 0 : 1);
