// Maakt een schermafbeelding van de voorpagina van elke stemhulp in data/stemhulpen.json, voor /andere-stemhulpen/.
// Draai lokaal en zet de afbeeldingen in de repository: de bouwstap op GitHub heeft geen browser.
//
//   node tools/stemhulpbeelden.mjs            (alle)
//   node tools/stemhulpbeelden.mjs stemgids   (alleen die met dit beeld)
//
// Heeft Playwright met Chromium nodig (zie tools/deelbeelden.mjs, of zet PLAYWRIGHT=/pad/naar/playwright/index.mjs)
// en ImageMagick om te verkleinen. Een cookiemelding wordt niet weggeklikt: met "verberg" in de lijst
// (CSS-selectors) blijft die alleen buiten beeld. Er wordt niets aangeklikt of ingevuld.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { stemhulpen } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stemhulpen.json'), 'utf8'));
const UIT = path.join(ROOT, 'src/assets/stemhulpen');
fs.mkdirSync(UIT, { recursive: true });

async function laadPlaywright() {
  for (const p of [process.env.PLAYWRIGHT, 'playwright'].filter(Boolean)) {
    try { return await import(p.startsWith('/') ? pathToFileURL(p).href : p); } catch { /* volgende */ }
  }
  throw new Error('Playwright niet gevonden. Installeer het (npm i playwright) of zet PLAYWRIGHT=/pad/naar/playwright/index.mjs');
}

const alleen = process.argv[2];
const { chromium } = await laadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'nl-NL', deviceScaleFactor: 1 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stemhulp-'));
for (const s of stemhulpen) {
  if (!s.beeld || s.logo || (alleen && s.beeld !== alleen)) continue;
  const page = await ctx.newPage();
  await page.goto(s.beeldUrl || s.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(s.wacht ?? 3000);
  if (s.verberg?.length) await page.addStyleTag({ content: `${s.verberg.join(', ')} { display: none !important; } html, body { overflow: auto !important; }` });
  if (s.scroll) await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
  await page.waitForTimeout(500);
  const ruw = path.join(tmp, `${s.beeld}.png`);
  await page.screenshot({ path: ruw });
  const doel = path.join(UIT, `${s.beeld}.jpg`);
  execFileSync('magick', [ruw, '-resize', '880x550', '-strip', '-quality', '80', '-interlace', 'Plane', doel]);
  console.log(`${s.naam} -> ${path.relative(ROOT, doel)} (${Math.round(fs.statSync(doel).size / 1024)} kB)`);
  await page.close();
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
