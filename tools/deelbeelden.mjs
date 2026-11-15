// Maakt de deelafbeeldingen (1200 x 630) voor elke pagina en het apple-touch-icon, in src/assets/.
// Draai lokaal en zet de afbeeldingen in de repository: de bouwstap op GitHub heeft alleen Node, geen browser.
//
//   node tools/deelbeelden.mjs
//
// Heeft Playwright met Chromium nodig: geïnstalleerd waar Node het vindt, of via het pad in
// PLAYWRIGHT (bijvoorbeeld PLAYWRIGHT=/pad/naar/node_modules/playwright/index.mjs). Met ImageMagick erbij worden de bestanden verkleind tot 256 kleuren.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bestand = (p) => pathToFileURL(path.join(ROOT, p)).href;

async function laadPlaywright() {
  for (const p of [process.env.PLAYWRIGHT, 'playwright'].filter(Boolean)) {
    try { return await import(p.startsWith('/') ? pathToFileURL(p).href : p); } catch { /* volgende */ }
  }
  throw new Error('Playwright niet gevonden. Installeer het (npm i playwright) of zet PLAYWRIGHT=/pad/naar/playwright/index.mjs');
}

const partijen = lees('data/partijen.json');
const logos = lees('data/logos.json');
const teksten = lees('data/deelbeelden.json');
const UIT = path.join(ROOT, 'src/assets/deel');
fs.mkdirSync(UIT, { recursive: true });

// De vormtaal van de site: wit papier, inkt, potloodrood, baksteengeel, Jost voor koppen en Plex voor tekst.
const stijl = `
@font-face { font-family: Jost; src: url("${bestand('src/assets/fonts/jost.woff2')}"); font-weight: 100 900; }
@font-face { font-family: Plex; src: url("${bestand('src/assets/fonts/plex.woff2')}"); font-weight: 100 700; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { background: #fff; color: #0e1b2c; font: 400 30px/1.35 Plex, sans-serif; display: grid; grid-template-rows: auto 1fr auto; }
.kop { display: flex; align-items: center; gap: 18px; padding: 36px 64px 26px; border-bottom: 2px solid #0e1b2c; box-shadow: 0 8px 0 #dba93a; font: 600 40px/1 Jost, sans-serif; letter-spacing: -0.02em; }
.vakje { width: 42px; height: 42px; border: 3px solid #0e1b2c; border-radius: 50%; background: #fff; flex: none; display: inline-block; }
.vol { background: repeating-linear-gradient(-58deg, #d0271d 0 4px, #de4a3f 4px 5.6px); box-shadow: inset 0 0 0 3px #fff; }
.lijf { padding: 52px 64px 0; display: flex; flex-direction: column; justify-content: center; gap: 22px; min-height: 0; }
h1 { font: 600 84px/1.02 Jost, sans-serif; letter-spacing: -0.025em; max-width: 1000px; text-wrap: balance; }
.tekst { color: #556070; max-width: 940px; font-size: 32px; }
.voet { background: #0e1b2c; border-top: 8px solid #dba93a; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 26px 64px 30px; font: 500 30px/1.2 Jost, sans-serif; margin-top: 40px; }
.voet span:last-child { color: #dba93a; }
.rij { display: flex; gap: 12px; }
.rij .vakje { width: 38px; height: 38px; }
.nummers { display: flex; gap: 10px; }
.nummers span { display: grid; place-items: center; width: 44px; height: 44px; border: 3px solid #0e1b2c; border-radius: 50%; font: 600 20px/1 Jost, sans-serif; }
.antwoorden { display: flex; gap: 10px; }
.antwoorden > span { font: 600 24px/1 Jost, sans-serif; white-space: nowrap; border: 3px solid #0e1b2c; padding: 15px 16px; display: inline-flex; gap: 12px; align-items: center; }
.antwoorden .vakje { width: 24px; height: 24px; }
.antwoorden .aan { background: #0e1b2c; color: #fff; }
.antwoorden .aan .vakje { border-color: #fff; box-shadow: none; }
.speld { width: 64px; height: 64px; fill: none; stroke: #d0271d; stroke-width: 1.8; }
.partij { display: grid; grid-template-columns: 360px 1fr; gap: 52px; align-items: center; padding: 48px 64px 0; min-height: 0; }
.logo { width: 360px; height: 216px; border: 2px solid #c5ccd5; background: #fff; display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; padding: 26px; }
.logo img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
.logo.donker { background: #0e1b2c; border-color: #0e1b2c; }
.logo.naam { font: 600 34px/1.15 Jost, sans-serif; color: #556070; text-align: center; }
.nr { font: 500 34px/1 Jost, sans-serif; color: #556070; display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.nr i { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #0e1b2c; display: inline-block; }
.partij h1 { font-size: 64px; line-height: 1.05; max-width: none; }
.trekker { color: #556070; margin-top: 18px; font-size: 30px; }
`;
const kop = `<div class="kop"><span class="vakje vol"></span>Hilversum kiest</div>`;
const voet = `<div class="voet"><span>Gemeenteraadsverkiezing · woensdag 18 november 2026</span><span>hilversumkiest.nl</span></div>`;
const html = (lijf) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>${stijl}</style></head><body>${kop}${lijf}${voet}</body></html>`;

const extra = {
  voorpagina: `<div class="rij">${Array.from({ length: 20 }, (_, i) => `<span class="vakje${[3, 8, 14].includes(i) ? ' vol' : ''}"></span>`).join('')}</div>`,
  partijen: `<div class="nummers">${partijen.map((p) => `<span>${p.nr}</span>`).join('')}</div>`,
  stemwijzer: `<div class="antwoorden">${['Eens', 'Eerder eens', 'Neutraal', 'Eerder oneens', 'Oneens'].map((t, i) => `<span class="${i === 1 ? 'aan' : ''}"><span class="vakje${i === 1 ? ' vol' : ''}"></span>${t}</span>`).join('')}</div>`,
  stembureauvinder: `<svg class="speld" viewBox="0 0 20 20"><path d="M10 18s6-5.6 6-10A6 6 0 0 0 4 8c0 4.4 6 10 6 10z"/><circle cx="10" cy="8" r="2.2"/></svg>`,
};

const beelden = [];
for (const [naam, t] of Object.entries(teksten)) {
  beelden.push([naam, html(`<div class="lijf">${naam === 'stembureauvinder' ? extra[naam] : ''}<h1>${e(t.kop)}</h1><p class="tekst">${e(t.tekst)}</p>${naam !== 'stembureauvinder' && extra[naam] ? extra[naam] : ''}</div>`)]);
}
// Eén per partij, voor elke partij gelijk: hetzelfde vak voor het logo en dezelfde lettergrootte voor de naam.
for (const p of partijen) {
  const l = logos[p.slug];
  const logo = l?.bestand
    ? `<div class="logo${l.achtergrond === 'donker' ? ' donker' : ''}"><img src="${bestand(`src/assets/logos/${l.bestand}`)}" alt=""></div>`
    : `<div class="logo naam">${e(p.kort.replace(/\s*\(.*$/, ''))}</div>`;
  beelden.push([`partij-${p.slug}`, html(`<div class="partij">${logo}<div><div class="nr"><i style="background:${e(p.kleur)}"></i>Lijst ${p.nr}</div><h1>${e(p.naam)}</h1><p class="trekker">Lijsttrekker ${e(p.lijsttrekker)}</p></div></div>`)]);
}

const { chromium } = await laadPlaywright();
const browser = await chromium.launch(fs.existsSync('/usr/bin/chromium') && !process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: '/usr/bin/chromium' } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deelbeeld-'));
const magick = (() => { try { execFileSync('magick', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
async function maak(naam, inhoud, uit, maat) {
  const f = path.join(tmp, `${naam}.html`);
  fs.writeFileSync(f, inhoud);
  await page.setViewportSize(maat);
  await page.goto(pathToFileURL(f).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Te lange tekst valt onder de voet: dan klopt het ontwerp niet en stopt het script.
  const over = await page.evaluate(() => [...document.querySelectorAll('h1, .tekst, .trekker')].some((x) => x.getBoundingClientRect().bottom > (document.querySelector('.voet')?.getBoundingClientRect().top ?? 1e9)));
  if (over) throw new Error(`${naam}: de tekst past niet`);
  await page.screenshot({ path: uit });
  if (magick) execFileSync('magick', [uit, '-strip', '-colors', '256', `PNG8:${uit}`]);
  console.log(naam.padEnd(40), Math.round(fs.statSync(uit).size / 1024), 'kB');
}
for (const [naam, inhoud] of beelden) await maak(naam, inhoud, path.join(UIT, `${naam}.png`), { width: 1200, height: 630 });
// apple-touch-icon: het rode stemvakje van het favicon, op 180 x 180.
await maak('apple-touch-icon', `<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#fff;display:grid;place-items:center"><svg width="180" height="180" viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><circle cx="16" cy="16" r="10" fill="#d0271d" stroke="#0e1b2c" stroke-width="2.4"/></svg></body></html>`, path.join(ROOT, 'src/assets/apple-touch-icon.png'), { width: 180, height: 180 });
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
