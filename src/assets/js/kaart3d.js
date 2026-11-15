// De stembureaukaart: de hele gemeente in 3D, getekend in de browser uit open gegevens (3D BAG en OpenStreetMap).
//
// De kaart laadt in drie detailniveaus, afhankelijk van hoe ver je bent ingezoomd (meter per beeldpunt):
//   ver weg      alleen basis.bin.gz: vereenvoudigde grond, hoofdwegen en de stembureaus in 3D
//   dichterbij   blokken van 1 km (m/): grond en wegen in detail, elk gebouw als blok
//   dichtbij     blokken van 500 m (h/): elk gebouw met zijn dakvorm
// Alleen de blokken die in beeld zijn worden opgehaald; wat lang uit beeld is, wordt weer weggegooid.
// tools/kaart/bouw.py maakt de bestanden en beschrijft de vorm ervan.

import * as THREE from '../vendor/three.module.min.js';

THREE.ColorManagement.enabled = false;

const DATA = new URL('../kaart/', import.meta.url);
const DEG = Math.PI / 180;

// Onder deze waarden (meter per beeldpunt) komt het volgende detailniveau in beeld.
const ZICHT_GROOT = 12; // de grootste gebouwen als blok
const ZICHT_BLOK = 5; // blokken van 1 km
const ZICHT_DAK = 1.3; // dakvormen
const ZICHT_BOOM = 2.6; // bomen in het bos en langs de straat
const MAX_M = 70, MAX_H = 48, MAX_TEGELIJK = 5;

const HOEK_3D = 33, RICHTING_3D = 45;

const hex = (h) => new THREE.Color(h);
// Grondvlakken: land, bebouwd, bedrijven, gras, heide, zand, bos, moeras, sport, water.
const GROND = ['#fdfcf8', '#f3eee2', '#ebe8e1', '#e2ebd2', '#e7d8e4', '#f3e8c6', '#c8dbbf', '#d2e2da', '#cfe2b6', '#a9c4e6'].map(hex);
// Wegen: hoofdweg, doorgaande weg, straat, erfweg, pad, spoor, gemeentegrens.
const WEG = ['#dba93a', '#f1d488', '#ffffff', '#ffffff', '#ffffff', '#8b94a1', '#0e1b2c'].map(hex);
const WEGRAND = ['#a67a1c', '#c2a04c', '#c9c2b2', '#d6d0c3', '#e3ded3', '#5d6673', '#0e1b2c'].map(hex);
const BREEDTE = [7, 5, 3.4, 2, 1.1, 0.9, 0]; // halve breedte in meters
const MINPX = [1.5, 1.0, 0.55, 0.4, 0.35, 0.5, 1.1]; // en de kleinste halve breedte in beeldpunten
const HOOFD = 0, WEGK = 1, STRAAT = 2, DIENST = 3, PAD = 4, SPOOR = 5, GRENS = 6;
const INKT = '#0e1b2c', POTLOOD = '#d0271d', BUITEN = '#eff2f5';

const TYPES = { i16: Int16Array, u16: Uint16Array, u8: Uint8Array, u32: Uint32Array, i8: Int8Array, f32: Float32Array };

async function laad(pad) {
  const r = await fetch(new URL(pad, DATA));
  if (!r.ok) throw new Error(`${pad}: ${r.status}`);
  let buf = await r.arrayBuffer();
  const b = new Uint8Array(buf, 0, 2);
  // Sommige servers pakken .gz zelf al uit; anders doen we het hier.
  if (b[0] === 0x1f && b[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const n = new DataView(buf).getUint32(0, true);
  const kop = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
  const reeks = (naam) => {
    const d = kop.delen[naam];
    return d ? new TYPES[d[0]](buf, 4 + n + d[1], d[2]) : null;
  };
  return { kop, reeks };
}

// ---------------------------------------------------------------------------------------------------------------
// Tekenwijze

// De zon staat laag in het westen. Wat boven de grond uitsteekt, tekent eerst zijn diepte gezien vanuit de zon;
// daarmee weet elk vlak of het in de schaduw ligt.
const schaduwGlsl = `
  uniform sampler2D tSchaduw; uniform mat4 schaduwMat; uniform float schaduwKracht; uniform vec2 schaduwStap; uniform float schaduwMarge;
  float schaduw(vec3 w) {
    vec4 s = schaduwMat * vec4(w, 1.0);
    vec3 p = s.xyz * 0.5 + 0.5;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 0.0;
    float d = p.z - schaduwMarge, som = 0.0;
    som += step(texture2D(tSchaduw, p.xy + schaduwStap * vec2(-0.7, -0.3)).x, d);
    som += step(texture2D(tSchaduw, p.xy + schaduwStap * vec2(0.3, -0.7)).x, d);
    som += step(texture2D(tSchaduw, p.xy + schaduwStap * vec2(0.7, 0.3)).x, d);
    som += step(texture2D(tSchaduw, p.xy + schaduwStap * vec2(-0.3, 0.7)).x, d);
    return som * 0.25 * schaduwKracht;
  }
  const vec3 SCHADUWTINT = vec3(0.79, 0.82, 0.90);`;

const grondShader = {
  vertexShader: `
    attribute float klasse; uniform vec3 kleur[10]; varying vec3 vKleur; varying vec3 vWereld; varying float vKlasse;
    void main() {
      vKleur = kleur[int(klasse + 0.5)]; vKlasse = klasse;
      vec4 w = modelMatrix * vec4(position.x, 0.0, position.y, 1.0);
      vWereld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    varying vec3 vKleur; varying vec3 vWereld; varying float vKlasse; uniform vec2 fijn;
    ${schaduwGlsl}
    float toeval(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec3 c = vKleur;
      if (vKlasse > 8.5) {
        // Water: dunne lichte golflijnen.
        float golf = sin(vWereld.z * 0.5 + sin(vWereld.x * 0.06) * 1.8 + sin(vWereld.x * 0.011) * 4.0);
        c = mix(c, vec3(1.0), 0.32 * smoothstep(0.94, 0.995, golf) * fijn.x);
      } else if (vKlasse > 5.5 && vKlasse < 6.5) {
        // Bos van boven: een stippel per boom, zolang de bomen zelf nog niet staan.
        vec2 q = vWereld.xz / 12.0, cel = floor(q);
        vec2 f = fract(q) - 0.5 - (vec2(toeval(cel), toeval(cel + 7.3)) - 0.5) * 0.45;
        c *= 1.0 - 0.11 * smoothstep(0.34, 0.24, length(f)) * fijn.y;
      }
      c = mix(c, c * SCHADUWTINT, schaduw(vWereld));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// Buiten de gemeente ligt een sluier over de kaart: de omgeving blijft te zien, maar de gemeente springt eruit.
const sluierShader = {
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, 0.0, position.y, 1.0); }`,
  fragmentShader: `uniform vec3 kleur; uniform float dekking; void main() { gl_FragColor = vec4(kleur, dekking); }`,
};

// Een weg is een lint om zijn hartlijn. De breedte is die van de echte weg, maar nooit smaller dan een paar
// beeldpunten: zo blijft een hoofdweg ook van ver te zien.
const wegShader = {
  vertexShader: `
    attribute float klasse; attribute vec2 uit;
    uniform vec3 kleur[7]; uniform float breedte[7]; uniform float minpx[7]; uniform float zicht[7]; uniform float mpp; uniform float rand;
    varying vec3 vKleur; varying vec3 vWereld;
    void main() {
      int k = int(klasse + 0.5);
      vKleur = kleur[k];
      float half_ = (max(breedte[k], minpx[k] * mpp) + rand * mpp) * zicht[k];
      vec2 p = position.xy + uit * half_;
      vec4 w = modelMatrix * vec4(p.x, 0.0, p.y, 1.0);
      vWereld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    varying vec3 vKleur; varying vec3 vWereld;
    ${schaduwGlsl}
    void main() { gl_FragColor = vec4(mix(vKleur, vKleur * SCHADUWTINT, schaduw(vWereld)), 1.0); }`,
};

// Gebouwen krijgen geen normalen mee: de richting van elk vlak volgt uit het vlak zelf. Muren in drie tinten naar
// de zon, platte daken licht, schuine daken leigrijs, en van dichtbij ramen in de muren: een maquette van karton.
const gebouwShader = {
  vertexShader: `
    attribute float soort; varying vec3 vPlek; varying float vSoort;
    #ifdef POTLOOD
    attribute vec3 tint; varying vec3 vTint;
    #endif
    void main() {
      vec4 w = modelMatrix * vec4(position.x, position.z, position.y, 1.0);
      vPlek = w.xyz; vSoort = soort;
      #ifdef POTLOOD
      vTint = tint;
      #endif
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform vec3 muur; uniform vec3 dak; uniform vec3 schuin; uniform vec3 raam; uniform vec3 zon; uniform vec3 kijk; uniform float ramen;
    varying vec3 vPlek; varying float vSoort;
    #ifdef POTLOOD
    varying vec3 vTint;
    #endif
    ${schaduwGlsl}
    void main() {
      vec3 n = normalize(cross(dFdx(vPlek), dFdy(vPlek)));
      if (dot(n, kijk) > 0.0) n = -n;
      float licht = dot(n, zon);
      #ifdef POTLOOD
      vec3 c = vTint * (licht > 0.2 ? 1.0 : (licht > -0.4 ? 0.86 : 0.72));
      #else
      float s = licht > 0.05 ? schaduw(vPlek + n * 0.45) : 0.0;
      vec3 c;
      if (vSoort > 0.5) {
        c = n.y > 0.96 ? dak * mix(1.0, 0.86, s) : schuin * (licht > 0.3 ? mix(1.0, 0.85, s) : 0.84);
      } else {
        c = muur * (licht > 0.2 ? mix(1.0, 0.86, s) : (licht > -0.4 ? 0.88 : 0.77));
        if (ramen > 0.01 && abs(n.y) < 0.3) {
          // Ramen: een raster langs de muur, een verdieping per drie meter.
          vec2 langs = normalize(vec2(-n.z, n.x));
          vec2 g = vec2(dot(vPlek.xz, langs) / 2.6, (vPlek.y - 0.75) / 3.0);
          vec2 f = fract(g), rand_ = fwidth(g) * 1.2;
          float in_ = smoothstep(0.27, 0.27 + rand_.x, f.x) * smoothstep(0.73, 0.73 - rand_.x, f.x)
                    * smoothstep(0.12, 0.12 + rand_.y, f.y) * smoothstep(0.62, 0.62 - rand_.y, f.y);
          c = mix(c, raam * (licht > 0.2 ? 1.0 : 0.82), in_ * ramen * step(0.0, g.y));
        }
      }
      c *= mix(vec3(1.0), vec3(0.95, 0.96, 1.0), s);
      #endif
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// Bomen: een kroon van twintig vlakjes op een stam, duizenden keren hetzelfde net op een andere plek.
const boomShader = {
  vertexShader: `
    attribute vec3 plek; attribute float deel; varying vec3 vPlek; varying float vDeel; varying float vEigen;
    void main() {
      float g = plek.z;
      vEigen = fract(sin(dot(plek.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float breed = g * (0.85 + 0.4 * vEigen);
      vec4 w = modelMatrix * vec4(plek.x + position.x * breed, position.y * g, plek.y + position.z * breed, 1.0);
      vPlek = w.xyz; vDeel = deel;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform vec3 kroon; uniform vec3 stam; uniform vec3 zon; uniform vec3 kijk;
    varying vec3 vPlek; varying float vDeel; varying float vEigen;
    void main() {
      vec3 n = normalize(cross(dFdx(vPlek), dFdy(vPlek)));
      if (dot(n, kijk) > 0.0) n = -n;
      float licht = dot(n, zon);
      vec3 c = vDeel > 0.5 ? kroon * (0.93 + 0.14 * vEigen) : stam;
      gl_FragColor = vec4(c * (licht > 0.25 ? 1.0 : (licht > -0.3 ? 0.87 : 0.74)), 1.0);
    }`,
};

// Alleen diepte, voor het beeld vanuit de zon.
const diepteShader = {
  vertexShader: `
    #ifdef BOOM
    attribute vec3 plek;
    #endif
    void main() {
      #ifdef BOOM
      float g = plek.z, e = fract(sin(dot(plek.xy, vec2(12.9898, 78.233))) * 43758.5453), breed = g * (0.85 + 0.4 * e);
      vec4 w = modelMatrix * vec4(plek.x + position.x * breed, position.y * g, plek.y + position.z * breed, 1.0);
      #else
      vec4 w = modelMatrix * vec4(position.x, position.z, position.y, 1.0);
      #endif
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `void main() { gl_FragColor = vec4(1.0); }`,
};

// Na het tekenen: een inktlijn waar de diepte een sprong maakt, dus om elk gebouw en langs elke dakrand. Vier
// metingen per beeldpunt maken de lijn glad; een vleug korrel geeft het papier.
const inktShader = {
  vertexShader: `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tKleur; uniform sampler2D tDiepte; uniform vec2 stap; uniform vec2 punt; uniform float bereik; uniform float drempel; uniform float sterkte; uniform vec3 inkt;
    varying vec2 vUv;
    float diepte(vec2 uv) { return texture2D(tDiepte, uv).x * bereik; }
    float lijn(vec2 uv) {
      float d = diepte(uv);
      float sprong = max(max(diepte(uv + vec2(stap.x, 0.0)), diepte(uv - vec2(stap.x, 0.0))), max(diepte(uv + vec2(0.0, stap.y)), diepte(uv - vec2(0.0, stap.y)))) - d;
      return smoothstep(drempel, drempel * 1.6, sprong);
    }
    void main() {
      vec3 c = texture2D(tKleur, vUv).rgb;
      float l = (lijn(vUv + punt * vec2(-0.25, -0.25)) + lijn(vUv + punt * vec2(0.25, -0.25)) + lijn(vUv + punt * vec2(-0.25, 0.25)) + lijn(vUv + punt * vec2(0.25, 0.25))) * 0.25;
      c = mix(c, inkt, l * sterkte);
      c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.016;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// ---------------------------------------------------------------------------------------------------------------
// Netten bouwen uit de reeksen

// De kaart bepaalt zelf welke blokken in beeld zijn; three.js hoeft dat niet per net na te rekenen.
const OVERAL = new THREE.Sphere(new THREE.Vector3(), Infinity);
const net_ = () => Object.assign(new THREE.BufferGeometry(), { boundingSphere: OVERAL });

function grondNet(d) {
  const g = net_();
  g.setAttribute('position', new THREE.BufferAttribute(d.reeks('gP'), 2));
  g.setAttribute('klasse', new THREE.BufferAttribute(d.reeks('gK'), 1));
  g.setIndex(new THREE.BufferAttribute(d.reeks('gI'), 1));
  return g;
}

function wegNet(d) {
  const wK = d.reeks('wK'), wN = d.reeks('wN'), wP = d.reeks('wP');
  const eenheid = 1 / d.kop.schaal;
  let punten = 0, stukken = 0;
  for (let i = 0; i < wN.length; i++) { punten += wN[i]; stukken += wN[i] - 1; }
  const pos = new Int16Array(punten * 4), uit = new Float32Array(punten * 4), klasse = new Uint8Array(punten * 2), idx = new Uint32Array(stukken * 6);
  let p = 0, v = 0, q = 0;
  for (let i = 0; i < wN.length; i++) {
    const n = wN[i], k = wK[i];
    for (let j = 0; j < n; j++) {
      const x = wP[(p + j) * 2], y = wP[(p + j) * 2 + 1];
      // De dwarsrichting in dit punt: het gemiddelde van die van het stuk ervoor en erna, verlengd in de bocht.
      let ax = 0, ay = 0, bx = 0, by = 0;
      if (j > 0) { const dx = x - wP[(p + j - 1) * 2], dy = y - wP[(p + j - 1) * 2 + 1], l = Math.hypot(dx, dy) || 1; ax = -dy / l; ay = dx / l; }
      if (j < n - 1) { const dx = wP[(p + j + 1) * 2] - x, dy = wP[(p + j + 1) * 2 + 1] - y, l = Math.hypot(dx, dy) || 1; bx = -dy / l; by = dx / l; }
      if (j === 0) { ax = bx; ay = by; }
      if (j === n - 1) { bx = ax; by = ay; }
      let mx = ax + bx, my = ay + by;
      const l = Math.hypot(mx, my);
      if (l < 1e-3) { mx = ax; my = ay; } else { mx /= l; my /= l; const s = 1 / Math.max(mx * ax + my * ay, 0.45); mx *= s; my *= s; }
      pos[v * 2] = x; pos[v * 2 + 1] = y; uit[v * 2] = mx * eenheid; uit[v * 2 + 1] = my * eenheid; klasse[v] = k; v++;
      pos[v * 2] = x; pos[v * 2 + 1] = y; uit[v * 2] = -mx * eenheid; uit[v * 2 + 1] = -my * eenheid; klasse[v] = k; v++;
      if (j < n - 1) { const a = v - 2; idx[q++] = a; idx[q++] = a + 1; idx[q++] = a + 2; idx[q++] = a + 1; idx[q++] = a + 3; idx[q++] = a + 2; }
    }
    p += n;
  }
  const g = net_();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 2));
  g.setAttribute('uit', new THREE.BufferAttribute(uit, 2));
  g.setAttribute('klasse', new THREE.BufferAttribute(klasse, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

function gebouwNet(pos, soort, idx) {
  const g = net_();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('soort', new THREE.BufferAttribute(soort, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

// Gebouwen als blok: van elk grondvlak de muren optrekken tot de hoogte en er het dak op leggen.
function blokNetten(d, groepen) {
  const lH = d.reeks('lH'), lR = d.reeks('lR'), lRN = d.reeks('lRN'), lP = d.reeks('lP'), lTN = d.reeks('lTN'), lT = d.reeks('lT');
  const hoog = 0.1 / d.kop.schaal;
  const netten = [];
  let b = 0, ri = 0, pi = 0, ti = 0;
  for (const aantal of groepen) {
    let nv = 0, ni = 0;
    for (let i = b, r = ri; i < b + aantal; i++) {
      let np = 0;
      for (let k = 0; k < lR[i]; k++) np += lRN[r++];
      nv += np * 3; ni += np * 6 + lTN[i] * 3;
    }
    if (!aantal || !nv) { netten.push(null); b += aantal; continue; }
    const pos = new Int16Array(nv * 3), soort = new Uint8Array(nv), idx = new Uint32Array(ni);
    let v = 0, q = 0;
    for (let i = b; i < b + aantal; i++) {
      const h = Math.round(lH[i] * hoog);
      let np = 0;
      for (let k = 0; k < lR[i]; k++) {
        const n = lRN[ri++], start = v;
        for (let j = 0; j < n; j++) {
          const x = lP[(pi + np + j) * 2], y = lP[(pi + np + j) * 2 + 1];
          pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = 0; v++;
          pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = h; v++;
        }
        for (let j = 0; j < n; j++) {
          const a = start + 2 * j, c = start + 2 * ((j + 1) % n);
          idx[q++] = a; idx[q++] = c; idx[q++] = c + 1; idx[q++] = a; idx[q++] = c + 1; idx[q++] = a + 1;
        }
        np += n;
      }
      const dak = v;
      for (let j = 0; j < np; j++) { pos[v * 3] = lP[(pi + j) * 2]; pos[v * 3 + 1] = lP[(pi + j) * 2 + 1]; pos[v * 3 + 2] = h; soort[v] = 1; v++; }
      for (let j = 0; j < lTN[i] * 3; j++) idx[q++] = dak + lT[ti++];
      pi += np;
    }
    b += aantal;
    netten.push(gebouwNet(pos, soort, idx));
  }
  return netten;
}

// Kleine dingen die bewegen (treinen, boten, dieren) zijn opgebouwd uit gekleurde dozen. Een doos: midden x, y
// (dwars), z (hoogte), dan lengte, breedte, hoogte en kleur. Vooruit is +x.
function dozenNet(dozen) {
  const pos = [], tint = [], idx = [];
  for (const [cx, cy, cz, lx, ly, lz, kleur] of dozen) {
    const k = new THREE.Color(kleur), basis = pos.length / 3;
    for (let i = 0; i < 8; i++) { pos.push(cx + (i & 1 ? lx : -lx) / 2, cy + (i & 2 ? ly : -ly) / 2, cz + (i & 4 ? lz : -lz) / 2); tint.push(k.r, k.g, k.b); }
    for (const v of [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]) idx.push(basis + v);
  }
  const g = net_();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(tint), 3));
  g.setIndex(idx);
  return g;
}
const GEEL = '#ffc917', NSBLAUW = '#003082', WIT = '#f4f4f1', ONDER = '#3a4250';
const VORMEN = {
  // Sprinter: wit met blauwe raamband en gele deuren. Intercity: geel met blauwe band, een verdieping hoger.
  sprinter: () => dozenNet([[0, 0, 0.6, 17.4, 2.6, 0.7, ONDER], [0, 0, 1.6, 18, 2.9, 1.3, WIT], [0, 0, 2.75, 18, 2.92, 1.0, NSBLAUW], [0, 0, 3.5, 17.6, 2.7, 0.5, '#d9dadb'], [-5, 0, 2.0, 1.5, 2.96, 2.1, GEEL], [5, 0, 2.0, 1.5, 2.96, 2.1, GEEL]]),
  intercity: () => dozenNet([[0, 0, 0.6, 25.4, 2.6, 0.7, ONDER], [0, 0, 1.7, 26, 2.9, 1.5, GEEL], [0, 0, 2.95, 26, 2.92, 1.0, NSBLAUW], [0, 0, 3.95, 26, 2.9, 1.0, GEEL], [0, 0, 4.65, 25.4, 2.6, 0.4, '#d9dadb']]),
  boot: (romp) => dozenNet([[0, 0, 0.45, 7.5, 2.4, 0.9, romp], [2.9, 0, 0.6, 2.2, 1.5, 0.9, romp], [0.2, 0, 5.2, 0.16, 0.16, 8.6, '#8a7a66'], [-1.3, 0, 4.2, 2.9, 0.1, 5.6, WIT], [-0.6, 0, 6.6, 1.5, 0.1, 2.6, WIT], [1.7, 0, 3.4, 2.3, 0.1, 3.6, WIT]]),
  hert: () => dozenNet([[0, 0, 0.95, 1.5, 0.48, 0.55, '#9a6b43'], [0.85, 0, 1.45, 0.3, 0.26, 0.8, '#9a6b43'], [1.05, 0, 1.9, 0.5, 0.26, 0.26, '#8a5d38'], [-0.6, 0.15, 0.35, 0.13, 0.13, 0.7, '#7d5433'], [-0.6, -0.15, 0.35, 0.13, 0.13, 0.7, '#7d5433'], [0.6, 0.15, 0.35, 0.13, 0.13, 0.7, '#7d5433'], [0.6, -0.15, 0.35, 0.13, 0.13, 0.7, '#7d5433'], [-0.8, 0, 1.2, 0.14, 0.2, 0.2, '#f1ead8']]),
  eend: () => dozenNet([[0, 0, 0.12, 0.5, 0.3, 0.24, '#8a6f52'], [0.26, 0, 0.36, 0.2, 0.18, 0.2, '#2f6b4f'], [0.4, 0, 0.34, 0.12, 0.1, 0.06, '#e2a12e'], [-0.28, 0, 0.2, 0.12, 0.2, 0.14, '#f1ead8']]),
};

// Eén boom, hoogte 1: een vierkante stam en een kroon van twintig vlakken.
function boomVorm() {
  const pos = [], deel = [];
  const r = 0.035, h = 0.34;
  const hoeken = [[-r, -r], [r, -r], [r, r], [-r, r]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = hoeken[i], [bx, bz] = hoeken[(i + 1) % 4];
    pos.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, 0, az, bx, h, bz, ax, h, az);
    for (let k = 0; k < 6; k++) deel.push(0);
  }
  const bol = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  for (let i = 0; i < bol.count; i++) { pos.push(bol.getX(i) * 0.27, 0.64 + bol.getY(i) * 0.38, bol.getZ(i) * 0.27); deel.push(1); }
  return { pos: new Float32Array(pos), deel: new Float32Array(deel) };
}
const BOOM = boomVorm();
function bomenNet(d) {
  const tP = d.reeks('tP'), tG = d.reeks('tG');
  if (!tG || !tG.length) return null;
  const plek = new Float32Array(tG.length * 3);
  for (let i = 0; i < tG.length; i++) { plek[i * 3] = tP[i * 2]; plek[i * 3 + 1] = tP[i * 2 + 1]; plek[i * 3 + 2] = tG[i] * 5; }
  const g = new THREE.InstancedBufferGeometry();
  g.boundingSphere = OVERAL;
  g.setAttribute('position', new THREE.BufferAttribute(BOOM.pos, 3));
  g.setAttribute('deel', new THREE.BufferAttribute(BOOM.deel, 1));
  g.setAttribute('plek', new THREE.InstancedBufferAttribute(plek, 3));
  g.instanceCount = tG.length;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------

export async function maakKaart(vak, { opKies = () => {} } = {}) {
  const doek = vak.querySelector('.kaart3d'), etiket = vak.querySelector('.kaartlabels'), melding = vak.querySelector('.kaartlaadt');
  const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: doek, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(hex(BUITEN), 1);

  const basis = await laad('basis.bin.gz');
  const [XMIN, YMIN, XMAX, YMAX] = basis.kop.gebied;
  const OX = (XMIN + XMAX) / 2, OY = (YMIN + YMAX) / 2;
  const GROOT = basis.kop.groot, KLEIN = basis.kop.klein;
  const heeftM = new Set(basis.kop.m), heeftH = new Set(basis.kop.h);
  const plaats = (m, x0, y0, s) => { m.position.set(x0 - OX, 0, -(y0 - OY)); m.scale.set(s, s, -s); m.frustumCulled = false; m.matrixAutoUpdate = false; m.updateMatrix(); return m; };

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 2000, 60000);
  const AFSTAND = 30000;
  const zon = new THREE.Vector3(-0.72, 0.62, -0.3).normalize();
  const kijk = new THREE.Vector3();

  // Schaduw: een dieptebeeld vanuit de zon, gedeeld door alles wat schaduw ontvangt.
  const grof = matchMedia('(pointer: coarse)').matches;
  const SCHADUW = grof ? 1536 : 2048;
  const schaduwDoel = new THREE.WebGLRenderTarget(SCHADUW, SCHADUW, { depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  schaduwDoel.depthTexture = new THREE.DepthTexture(SCHADUW, SCHADUW);
  const zonCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
  zonCam.layers.set(1);
  const schaduwU = { tSchaduw: { value: schaduwDoel.depthTexture }, schaduwMat: { value: new THREE.Matrix4() }, schaduwKracht: { value: 1 }, schaduwStap: { value: new THREE.Vector2(1 / SCHADUW, 1 / SCHADUW) }, schaduwMarge: { value: 0.0005 } };
  const fijn = new THREE.Vector2(1, 1);
  const matGrond = new THREE.ShaderMaterial({ ...grondShader, uniforms: { kleur: { value: GROND }, fijn: { value: fijn }, ...schaduwU }, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const zichtWeg = [1, 1, 1, 1, 1, 1, 0], zichtGrens = [0, 0, 0, 0, 0, 0, 1];
  const wegUniforms = (kleur, zicht, rand) => ({ kleur: { value: kleur }, breedte: { value: BREEDTE }, minpx: { value: MINPX }, zicht: { value: zicht }, mpp: { value: 1 }, rand: { value: rand }, ...schaduwU });
  const wegMat = (kleur, zicht, rand) => new THREE.ShaderMaterial({ ...wegShader, uniforms: wegUniforms(kleur, zicht, rand), depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const matWegRand = wegMat(WEGRAND, zichtWeg, 0.9), matWeg = wegMat(WEG, zichtWeg, 0), matGrens = wegMat(WEG, zichtGrens, 0);
  // De sluier en de grens komen na de gebouwen aan de beurt en gaan er dus achterlangs.
  const matSluier = new THREE.ShaderMaterial({ ...sluierShader, uniforms: { kleur: { value: hex(BUITEN) }, dekking: { value: 0.7 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  Object.assign(matGrens, { transparent: true, depthTest: true });
  const ramen = { value: 0 };
  const gebouwMat = (muur, dak, schuin, raam, potlood) => new THREE.ShaderMaterial({
    ...gebouwShader, uniforms: { muur: { value: hex(muur) }, dak: { value: hex(dak) }, schuin: { value: hex(schuin) }, raam: { value: hex(raam) }, zon: { value: zon }, kijk: { value: kijk }, ramen, ...schaduwU },
    defines: potlood ? { POTLOOD: 1 } : {}, side: THREE.DoubleSide,
  });
  const matGebouw = gebouwMat('#e6dfd0', '#f8f5ee', '#b9c4d1', '#8496ad'), matBureau = gebouwMat('#b3211a', '#d0271d', '#d0271d', '#f6cfca');
  const matStil = gebouwMat('#d3ccbc', '#e9e4d8', '#b9c4d1', '#8496ad'), matDoos = gebouwMat('#ffffff', '#ffffff', '#ffffff', '#ffffff', true);
  const matBoom = new THREE.ShaderMaterial({ ...boomShader, uniforms: { kroon: { value: hex('#8cb181') }, stam: { value: hex('#9a8a78') }, zon: { value: zon }, kijk: { value: kijk } }, side: THREE.DoubleSide });
  const matDiepte = new THREE.ShaderMaterial({ ...diepteShader, side: THREE.DoubleSide, colorWrite: false });
  const matBoomDiepte = new THREE.ShaderMaterial({ ...diepteShader, defines: { BOOM: 1 }, side: THREE.DoubleSide, colorWrite: false });
  // Wat schaduw werpt, staat ook op laag 1: alleen die laag ziet de zon.
  const werpt = (net, diepte = matDiepte) => { net.layers.enable(1); net.userData.diepte = diepte; return net; };

  // ---- de basis: altijd in beeld
  scene.add(Object.assign(plaats(new THREE.Mesh(grondNet(basis), matGrond), XMIN, YMIN, basis.kop.schaal), { renderOrder: 0 }));
  const basisWeg = wegNet(basis);
  for (const [mat, volgorde] of [[matWegRand, 1], [matWeg, 2], [matGrens, 20]]) scene.add(Object.assign(plaats(new THREE.Mesh(basisWeg, mat), XMIN, YMIN, basis.kop.schaal), { renderOrder: volgorde }));
  {
    const g = net_();
    g.setAttribute('position', new THREE.BufferAttribute(basis.reeks('sP'), 2));
    g.setIndex(new THREE.BufferAttribute(basis.reeks('sI'), 1));
    scene.add(Object.assign(plaats(new THREE.Mesh(g, matSluier), XMIN, YMIN, basis.kop.schaal), { renderOrder: 15 }));
  }
  const [grootNet] = blokNetten(basis, [basis.reeks('lH').length]);
  const groot = grootNet ? plaats(new THREE.Mesh(grootNet, matGebouw), XMIN, YMIN, basis.kop.schaal) : new THREE.Group();
  groot.renderOrder = 30;
  if (grootNet) werpt(groot);
  scene.add(groot);

  // De rand van de gemeente: daarop past het eerste beeld.
  const rand = [];
  {
    const wK = basis.reeks('wK'), wN = basis.reeks('wN'), wP = basis.reeks('wP');
    for (let i = 0, p = 0; i < wN.length; p += wN[i], i++) {
      if (wK[i] !== GRENS) continue;
      for (let j = 0; j < wN[i]; j += 3) rand.push(new THREE.Vector3(XMIN + wP[(p + j) * 2] * basis.kop.schaal - OX, 0, -(YMIN + wP[(p + j) * 2 + 1] * basis.kop.schaal - OY)));
    }
  }

  // ---- stembureaus: het gebouw in rood. Bureaus in hetzelfde gebouw delen een plek.
  const plekken = [];
  {
    const bP = basis.reeks('bP'), bK = basis.reeks('bK'), bI = basis.reeks('bI');
    const opPlek = new Map();
    basis.kop.bureaus.forEach((b, nr) => {
      if (!b) return;
      const sleutel = `${Math.round(b.x / 4)}_${Math.round(b.y / 4)}`;
      let plek = opPlek.get(sleutel);
      if (!plek) {
        plek = { nrs: [], x: XMIN + b.x - OX, z: -(YMIN + b.y - OY), maat: b.maat || 30, hoogte: b.hoogte || 0, gebouw: null, zicht: true };
        opPlek.set(sleutel, plek);
        plekken.push(plek);
      }
      plek.nrs.push(nr);
      if (b.net && !plek.gebouw) {
        const [v0, vn, i0, n] = b.net;
        const idx = new Uint32Array(n);
        for (let i = 0; i < n; i++) idx[i] = bI[i0 + i] - 0;
        plek.gebouw = new THREE.Mesh(gebouwNet(bP.slice(v0 * 3, (v0 + vn) * 3), bK.slice(v0, v0 + vn), idx), matBureau);
        plek.gebouw.frustumCulled = false;
        plek.gebouw.renderOrder = 30;
        plek.gebouw.position.set(plek.x, 0, plek.z);
        werpt(plek.gebouw);
        scene.add(plek.gebouw);
      }
    });
  }

  // ---- leven op de kaart: treinen over het spoor, zeilboten op de plassen, herten op de hei, eenden in de vijver.
  // De vormen zijn vrije 3D-modellen (bronnen/_kaart/modellen/LICENTIES.md), omgezet door tools/kaart/modellen.py;
  // ontbreekt dat bestand, dan vallen ze terug op de vormen van dozen hierboven.
  const leven = basis.kop.leven || { spoor: [], boten: [], eenden: [], herten: [] };
  const modellen = await laad('modellen.bin.gz').catch(() => null);
  const vorm = (naam, anders) => {
    if (!modellen?.kop.modellen[naam]) return { net: anders(), lengte: 0 };
    const g = net_();
    g.setAttribute('position', new THREE.BufferAttribute(modellen.reeks(`${naam}P`), 3));
    g.setAttribute('tint', new THREE.BufferAttribute(modellen.reeks(`${naam}C`), 3, true));
    g.setIndex(new THREE.BufferAttribute(modellen.reeks(`${naam}I`), 1));
    return { net: g, lengte: modellen.kop.modellen[naam].lengte };
  };
  const wereld = ([px, py]) => [XMIN + px - OX, -(YMIN + py - OY)];
  const baan = (punten, rond) => {
    const p = punten.map(wereld);
    if (rond) p.push(p[0]);
    const s = [0];
    for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    return { p, s, lengte: s[s.length - 1] };
  };
  // De plek en de richting op een baan, een afstand vanaf het begin.
  const opBaan = (b, afstand, uit) => {
    let i = 1;
    while (i < b.s.length - 1 && b.s[i] < afstand) i++;
    const t = Math.min(Math.max((afstand - b.s[i - 1]) / (b.s[i] - b.s[i - 1] || 1), 0), 1), a = b.p[i - 1], c = b.p[i];
    uit.x = a[0] + (c[0] - a[0]) * t; uit.z = a[1] + (c[1] - a[1]) * t; uit.hoek = Math.atan2(-(c[1] - a[1]), c[0] - a[0]);
    return uit;
  };
  const ding = (net) => { const m = werpt(new THREE.Mesh(net, matDoos)); m.frustumCulled = false; m.renderOrder = 31; m.visible = false; scene.add(m); return m; };
  const zet = (m, x, z, hoek, schaal, smal = 1) => { m.position.set(x, 0, z); m.rotation.y = hoek; m.scale.set(schaal, schaal, schaal * smal); };

  // Treinen: een intercity van zes bakken en een sprinter van drie, met een kop voor en achter.
  const spoor = leven.spoor.map((b) => baan(b));
  const bakken = {
    intercity: { kop: vorm('intercity-kop', VORMEN.intercity), wagen: vorm('intercity-wagen', VORMEN.intercity), aantal: 6, maat: 1 },
    sprinter: { kop: vorm('sprinter-kop', VORMEN.sprinter), wagen: vorm('sprinter-wagen', VORMEN.sprinter), aantal: 3, maat: 0.74 },
  };
  const treinen = spoor.length ? [0.4, 2.5, 6, 11].map((wacht, i) => ({ netten: [], wacht, rijdt: false, eerste: true, soort: i % 2 ? 'sprinter' : 'intercity' })) : [];
  const bootVorm = vorm('zeilboot', () => VORMEN.boot('#f4f4f1'));
  const boten = leven.boten.map((b, i) => ({ baan: baan(b, true), afstand: i * 137, net: ding(bootVorm.net) }));
  const hertVormen = [vorm('hert', VORMEN.hert)], eendVorm = vorm('eend', VORMEN.eend);
  const kudde = (plekken_, netten, n, spreiding) => plekken_.flatMap((pl_, g) => Array.from({ length: n }, (_, i) => {
    const [x, z] = wereld(pl_), a = (g * 2.4 + i * 2.1) % 6.28;
    return { thuis: [x, z], x: x + Math.cos(a) * spreiding, z: z + Math.sin(a) * spreiding, hoek: a, doel: null, rust: 2 + ((g * 7 + i * 3) % 9), fase: a, net: ding(netten[i === 0 ? netten.length - 1 : 0].net) };
  }));
  const herten = kudde(leven.herten, hertVormen, 3, 6), eenden = kudde(leven.eenden, [eendVorm], 3, 3);
  const pl = { x: 0, z: 0, hoek: 0 };
  let vorige = 0;
  // Zolang de kaart in beeld is en er iets kan bewegen, blijft ze doortekenen.
  const leeft = () => !rustig && opScherm_ && !document.hidden && (treinen.length > 0 || boten.length > 0 || herten.length > 0);
  function stapLeven(nu) {
    const dt = Math.min(Math.max((nu - vorige) / 1000, 0), 0.1), mpp = stand.mpp;
    vorige = nu;
    // Van ver groter dan echt, net als de stembureaus: anders zie je ze niet rijden of varen.
    const groot = Math.min(Math.max(mpp / 1.6, 1.25), 8);
    for (const t of treinen) {
      if (!t.rijdt) {
        t.wacht -= dt;
        if (t.wacht > 0 || rustig) continue;
        t.soort = t.soort === 'sprinter' ? 'intercity' : 'sprinter';
        t.baan = spoor[Math.floor(Math.random() * spoor.length)];
        t.heen = Math.random() < 0.5;
        // De allereerste keer staat de trein al ergens onderweg, zodat er meteen iets rijdt.
        t.afstand = t.eerste ? Math.random() * t.baan.lengte * 0.7 : 0;
        t.eerste = false; t.rijdt = true;
        for (const m of t.netten) scene.remove(m);
        const b = bakken[t.soort];
        t.netten = Array.from({ length: b.aantal }, (_, i) => ding((i === 0 || i === b.aantal - 1 ? b.kop : b.wagen).net));
      }
      const b = bakken[t.soort], schaal = b.maat * groot, stap = ((b.wagen.lengte || 26) * b.maat + 0.5) * groot;
      t.afstand += 30 * dt;
      let ergens = false;
      t.netten.forEach((bak, i) => {
        const a = t.afstand - i * stap, op = a > 0 && a < t.baan.lengte;
        bak.visible = op;
        ergens = ergens || a < t.baan.lengte;
        if (!op) return;
        opBaan(t.baan, t.heen ? a : t.baan.lengte - a, pl);
        // De neus wijst in de rijrichting; de laatste bak staat andersom.
        zet(bak, pl.x, pl.z, pl.hoek + (t.heen ? 0 : Math.PI) + (i === b.aantal - 1 ? Math.PI : 0), schaal, 0.72);
      });
      if (!ergens) { t.rijdt = false; t.wacht = 5 + Math.random() * 18; }
    }
    const bootMaat = Math.min(Math.max(mpp / 1.1, 2.4), 13);
    for (const b of boten) {
      b.afstand = (b.afstand + 2.8 * dt) % b.baan.lengte;
      opBaan(b.baan, b.afstand, pl);
      b.net.visible = true;
      zet(b.net, pl.x, pl.z, pl.hoek, bootMaat);
      b.net.rotation.x = Math.sin(nu / 900 + b.baan.lengte) * 0.07; // een beetje deinen
    }
    for (const h of herten) {
      h.net.visible = mpp < 3;
      if (!h.net.visible) continue;
      if (h.doel) {
        const dx = h.doel[0] - h.x, dz = h.doel[1] - h.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { h.doel = null; h.rust = 3 + Math.random() * 9; } else { h.x += dx / d * 1.4 * dt; h.z += dz / d * 1.4 * dt; h.hoek = Math.atan2(-dz, dx); }
      } else if ((h.rust -= dt) < 0 && !rustig) {
        const a = Math.random() * 6.28, r = 4 + Math.random() * 16;
        h.doel = [h.thuis[0] + Math.cos(a) * r, h.thuis[1] + Math.sin(a) * r];
      }
      zet(h.net, h.x, h.z, h.hoek, Math.min(Math.max(mpp * 1.6, 2), 4.5));
    }
    for (const e_ of eenden) {
      e_.net.visible = mpp < 1.4;
      if (!e_.net.visible) continue;
      e_.fase += dt * 0.25;
      zet(e_.net, e_.thuis[0] + Math.cos(e_.fase) * 3, e_.thuis[1] + Math.sin(e_.fase) * 3, -e_.fase - Math.PI / 2, 3.5);
    }
  }
  let opScherm_ = true;
  new IntersectionObserver((r) => { opScherm_ = r[0].isIntersecting; if (opScherm_) vraagBeeld(); }).observe(vak);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) vraagBeeld(); });

  // ---- stand van de camera
  const stand = { x: 0, z: 0, mpp: 10, az: RICHTING_3D, el: HOEK_3D };
  let breed = 1, hoog = 1, pr = 1, mppMax = 60, plat = false, gekozen = null, zweef = null, hier = null;
  const vooruit = new THREE.Vector3();

  function zetCamera() {
    const a = stand.az * DEG, e = stand.el * DEG;
    vooruit.set(Math.cos(e) * Math.sin(a), -Math.sin(e), -Math.cos(e) * Math.cos(a));
    kijk.copy(vooruit);
    cam.left = -breed * stand.mpp / 2; cam.right = breed * stand.mpp / 2; cam.top = hoog * stand.mpp / 2; cam.bottom = -hoog * stand.mpp / 2;
    cam.position.set(stand.x, 0, stand.z).addScaledVector(vooruit, -AFSTAND);
    cam.up.set(Math.sin(a), 0.0001, -Math.cos(a));
    cam.lookAt(stand.x, 0, stand.z);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }
  const v3 = new THREE.Vector3();
  // Het punt op de grond onder een plek op het scherm.
  function grondOp(px, py) {
    v3.set((px / breed) * 2 - 1, -((py / hoog) * 2 - 1), -1).unproject(cam);
    const t = -v3.y / vooruit.y;
    return { x: v3.x + vooruit.x * t, z: v3.z + vooruit.z * t };
  }
  function opScherm(x, y, z) {
    v3.set(x, y, z).project(cam);
    return { x: (v3.x + 1) / 2 * breed, y: (1 - v3.y) / 2 * hoog };
  }
  function klem() {
    stand.mpp = Math.min(Math.max(stand.mpp, 0.12), mppMax);
    stand.x = Math.min(Math.max(stand.x, XMIN - OX), XMAX - OX);
    stand.z = Math.min(Math.max(stand.z, -(YMAX - OY)), -(YMIN - OY));
  }
  // De stand waarin de hele gemeente past, bij een gegeven kijkrichting.
  function heleGemeente(az, el) {
    const oud = { ...stand };
    Object.assign(stand, { x: 0, z: 0, mpp: 1, az, el });
    zetCamera();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of rand) { const s = opScherm(p.x, 0, p.z); x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
    const midden = grondOp((x0 + x1) / 2, (y0 + y1) / 2);
    const marge = Math.min(breed, hoog) < 500 ? 28 : 56;
    const mpp = Math.max((x1 - x0) / Math.max(breed - marge, 50), (y1 - y0) / Math.max(hoog - marge - 30, 50));
    Object.assign(stand, oud);
    zetCamera();
    return { x: midden.x, z: midden.z, mpp, az, el };
  }

  // ---- vloeiend naar een andere stand
  let vlucht = null;
  function vlieg(doel, ms = 650) {
    const van = { ...stand }, naar = { ...stand, ...doel };
    naar.az = van.az + ((((naar.az - van.az) % 360) + 540) % 360 - 180);
    if (rustig || ms <= 0) { Object.assign(stand, naar); stand.az = ((stand.az % 360) + 360) % 360; klem(); vlucht = null; vraagBeeld(); return; }
    vlucht = { van, naar, start: performance.now(), ms };
    vraagBeeld();
  }
  function stapVlucht(nu) {
    if (!vlucht) return;
    const t = Math.min((nu - vlucht.start) / vlucht.ms, 1), s = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const { van, naar } = vlucht;
    stand.x = van.x + (naar.x - van.x) * s; stand.z = van.z + (naar.z - van.z) * s;
    stand.mpp = Math.exp(Math.log(van.mpp) + (Math.log(naar.mpp) - Math.log(van.mpp)) * s);
    stand.az = van.az + (naar.az - van.az) * s; stand.el = van.el + (naar.el - van.el) * s;
    if (t >= 1) { stand.az = ((stand.az % 360) + 360) % 360; vlucht = null; }
  }

  // ---- blokken laden en weggooien
  const blokM = new Map(), blokH = new Map();
  let bezig = 0, klok = 0;
  const groeiers = new Set();
  function groei(net) {
    if (rustig) return;
    net.userData.groei = performance.now();
    net.scale.y = 0.001; net.updateMatrix();
    groeiers.add(net);
  }
  function stapGroei(nu) {
    for (const net of groeiers) {
      const t = Math.min((nu - net.userData.groei) / 380, 1);
      net.scale.y = net.scale.x * (1 - Math.pow(1 - t, 3));
      net.updateMatrix();
      if (t >= 1) groeiers.delete(net);
    }
  }
  async function haalM(naam) {
    const blok = { klaar: false, netten: [], gebouwen: [null, null, null, null], namen: [], gebruikt: klok };
    blokM.set(naam, blok);
    bezig++;
    try {
      const d = await laad(`m/${naam}.bin.gz`);
      const { x, y, schaal } = d.kop;
      const zet = (net, mat, volgorde) => { const m = plaats(new THREE.Mesh(net, mat), x, y, schaal); m.renderOrder = volgorde; m.visible = false; scene.add(m); blok.netten.push(m); return m; };
      if (d.reeks('gI').length) zet(grondNet(d), matGrond, 10);
      if (d.reeks('wN').length) { const w = wegNet(d); zet(w, matWegRand, 11); zet(w, matWeg, 12); }
      blokNetten(d, d.kop.kwadrant).forEach((net, k) => { if (net) blok.gebouwen[k] = werpt(zet(net, matGebouw, 30)); });
      const bomen = bomenNet(d);
      if (bomen) blok.bomen = werpt(zet(bomen, matBoom, 30), matBoomDiepte);
      blok.namen = d.kop.namen.map(([naam_, lx, ly, hoek, lengte, klasse]) => ({ naam: naam_, x: x + lx - OX, z: -(y + ly - OY), hoek, lengte, klasse }));
      blok.x = x; blok.y = y;
      blok.klaar = true; blok.nieuw = true;
    } catch (fout) { console.warn(fout); blok.mislukt = true; }
    bezig--;
    vraagBeeld();
  }
  async function haalH(naam) {
    const blok = { klaar: false, net: null, gebruikt: klok };
    blokH.set(naam, blok);
    bezig++;
    try {
      const d = await laad(`h/${naam}.bin.gz`);
      blok.net = plaats(new THREE.Mesh(gebouwNet(d.reeks('hP'), d.reeks('hK'), d.reeks('hI')), matGebouw), d.kop.x, d.kop.y, d.kop.schaal);
      blok.net.renderOrder = 30; blok.net.visible = false;
      werpt(blok.net);
      scene.add(blok.net);
      blok.klaar = true;
    } catch (fout) { console.warn(fout); blok.mislukt = true; }
    bezig--;
    vraagBeeld();
  }
  function ruim(blokken, max, netten) {
    if (blokken.size <= max) return;
    const oud = [...blokken].filter(([, b]) => b.klaar && b.gebruikt < klok).sort((a, b) => a[1].gebruikt - b[1].gebruikt);
    for (const [naam, b] of oud.slice(0, blokken.size - max)) {
      const gedeeld = new Set();
      for (const net of netten(b)) { scene.remove(net); if (!gedeeld.has(net.geometry)) { net.geometry.dispose(); gedeeld.add(net.geometry); } }
      blokken.delete(naam);
    }
  }
  // Welke blokken van een bepaalde maat raken het beeld? Dichtst bij het midden eerst.
  function inBeeld(maat, bekend) {
    const hoeken = [grondOp(0, 0), grondOp(breed, 0), grondOp(0, hoog), grondOp(breed, hoog)];
    const rx = hoeken.map((h) => h.x + OX), ry = hoeken.map((h) => OY - h.z);
    const i0 = Math.floor((Math.min(...rx) - XMIN) / maat), i1 = Math.floor((Math.max(...rx) - XMIN) / maat);
    const j0 = Math.floor((Math.min(...ry) - YMIN) / maat) - 1, j1 = Math.floor((Math.max(...ry) - YMIN) / maat);
    const uit = [], straal = maat * 0.75 / stand.mpp;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const naam = `${XMIN + i * maat}_${YMIN + j * maat}`;
      if (!bekend.has(naam)) continue;
      const cx = XMIN + (i + 0.5) * maat - OX, cz = -(YMIN + (j + 0.5) * maat - OY), s = opScherm(cx, 0, cz);
      if (s.x < -straal || s.x > breed + straal || s.y < -straal - 60 / stand.mpp || s.y > hoog + straal) continue;
      uit.push({ naam, i, j, afstand: Math.hypot(cx - stand.x, cz - stand.z) });
    }
    return uit.sort((a, b) => a.afstand - b.afstand);
  }

  let straten = [];
  function werkBij() {
    klok++;
    const mpp = stand.mpp;
    for (const mat of [matWegRand, matWeg, matGrens]) mat.uniforms.mpp.value = mpp;
    // Kleine wegen verdwijnen als je uitzoomt.
    zichtWeg[STRAAT] = mpp < 9 ? 1 : 0; zichtWeg[DIENST] = mpp < 3 ? 1 : 0; zichtWeg[PAD] = mpp < 2.2 ? 1 : 0;
    groot.visible = mpp < ZICHT_GROOT && mpp >= ZICHT_BLOK;
    ramen.value = Math.min(Math.max((1.25 - mpp) / 0.55, 0), 1);
    fijn.set(Math.min(Math.max((3.2 - mpp) / 1.2, 0), 1), Math.min(Math.max((6 - mpp) / 2, 0), 1) * Math.min(Math.max((mpp - 1.6) / 1.0, 0.25), 1));

    const wilM = mpp < ZICHT_BLOK ? inBeeld(GROOT, heeftM) : [];
    const wilH = mpp < ZICHT_DAK ? inBeeld(KLEIN, heeftH) : [];
    for (const b of blokM.values()) for (const net of b.netten) net.visible = false;
    for (const b of blokH.values()) if (b.net) b.net.visible = false;
    const metDak = new Set();
    for (const w of wilH) {
      const b = blokH.get(w.naam);
      if (!b) { if (bezig < MAX_TEGELIJK) haalH(w.naam); continue; }
      b.gebruikt = klok;
      if (b.klaar) { b.net.visible = true; metDak.add(w.naam); }
    }
    straten = [];
    for (const w of wilM) {
      const b = blokM.get(w.naam);
      if (!b) { if (bezig < MAX_TEGELIJK) haalM(w.naam); continue; }
      b.gebruikt = klok;
      if (!b.klaar) continue;
      for (const net of b.netten) net.visible = true;
      b.gebouwen.forEach((net, k) => {
        if (!net) return;
        // Is de dakvorm van dit kwart er al, dan maakt het blok plaats.
        net.visible = !metDak.has(`${b.x + (k & 1) * KLEIN}_${b.y + (k >> 1) * KLEIN}`);
        if (b.nieuw && net.visible) groei(net);
      });
      if (b.bomen) { b.bomen.visible = mpp < ZICHT_BOOM; if (b.bomen.visible && !b.bomenGegroeid) { b.bomenGegroeid = true; groei(b.bomen); } }
      b.nieuw = false;
      if (mpp < 1.5) straten.push(...b.namen);
    }
    ruim(blokM, MAX_M, (b) => b.netten);
    ruim(blokH, MAX_H, (b) => (b.net ? [b.net] : []));
    if (melding) melding.hidden = bezig === 0;

    // Stembureaus: van ver groter dan ze zijn, zodat ze uit de kaart steken.
    const ver = Math.min(Math.max((mpp - 14) / 26, 0), 1); // helemaal uitgezoomd op een smal scherm: alles wat kleiner
    const groter = (17 - 6 * ver) * Math.min(Math.max((mpp - 3.5) / 5, 0), 1);
    for (const p of plekken) {
      const k = p.zicht ? Math.max(1, mpp * groter / p.maat) : 1; // weggefilterd: een gewoon gebouw op ware grootte
      if (p.gebouw) {
        p.gebouw.material = p.zicht ? matBureau : matStil;
        p.gebouw.scale.set(0.1 * k, 0.1 * k, -0.1 * k);
      }
      p.top = p.hoogte * k;
      p.straal = Math.max(p.maat * k / mpp / 2, 12); // in beeldpunten, om het aan te kunnen tikken
    }
  }

  // ---- namen en platte stippen, op een tweede doek boven de kaart
  const pen = etiket.getContext('2d');
  function tekenNamen() {
    pen.setTransform(pr, 0, 0, pr, 0, 0);
    pen.clearRect(0, 0, breed, hoog);
    const bezet = [];
    const vrij = (x0, y0, x1, y1) => x1 > 0 && x0 < breed && y1 > 0 && y0 < hoog && !bezet.some((b) => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
    const mpp = stand.mpp;
    pen.textBaseline = 'middle'; pen.lineJoin = 'round';
    const schrijf = (tekst, x, y, kleur) => { pen.strokeStyle = 'rgba(255,255,255,0.92)'; pen.lineWidth = 3.5; pen.strokeText(tekst, x, y); pen.fillStyle = kleur; pen.fillText(tekst, x, y); };

    for (const p of plekken) {
      if (!p.zicht) continue;
      p.kop = opScherm(p.x, p.top, p.z);
      p.scherm = opScherm(p.x, p.top / 2, p.z);
      if (!p.gebouw) {
        // Geen gebouw gevonden bij dit adres: dan een rode stip op de plek.
        pen.beginPath(); pen.arc(p.kop.x, p.kop.y, 7, 0, Math.PI * 2);
        pen.fillStyle = POTLOOD; pen.fill(); pen.lineWidth = 2; pen.strokeStyle = INKT; pen.stroke();
      }
      bezet.push([p.scherm.x - p.straal * 0.6, p.kop.y - 4, p.scherm.x + p.straal * 0.6, p.scherm.y + p.straal * 0.4]);
    }
    if (hier) {
      const s = opScherm(hier.x, 0, hier.z);
      pen.beginPath(); pen.arc(s.x, s.y, 7, 0, Math.PI * 2); pen.fillStyle = '#1d4f91'; pen.fill(); pen.lineWidth = 3; pen.strokeStyle = '#fff'; pen.stroke();
      bezet.push([s.x - 9, s.y - 9, s.x + 9, s.y + 9]);
    }
    // Namen van stembureaus: de gekozene altijd, de rest als je dichtbij bent.
    pen.font = '600 13px Jost, Futura, sans-serif';
    for (const p of [gekozen, zweef, ...(mpp < 3.2 ? plekken : [])]) {
      if (!p || !p.zicht || !p.kop || p.benoemd === klok) continue;
      const tekst = p.naam || '', b = pen.measureText(tekst).width;
      const x = p.kop.x + Math.min(p.straal * 0.5, 16) + 6, y = p.kop.y - (stand.el >= 78 ? 0 : 8);
      if (p !== gekozen && p !== zweef && !vrij(x - 4, y - 10, x + b + 6, y + 10)) continue;
      p.benoemd = klok;
      pen.fillStyle = '#fff'; pen.fillRect(x - 4, y - 10, b + 9, 20);
      pen.strokeStyle = INKT; pen.lineWidth = 1.5; pen.strokeRect(x - 4, y - 10, b + 9, 20);
      pen.fillStyle = INKT; pen.fillText(tekst, x, y + 0.5);
      bezet.push([x - 4, y - 10, x + b + 6, y + 10]);
    }
    // Plaatsnamen.
    pen.textAlign = 'center';
    const namen = [];
    for (const [naam, lx, ly, rang] of basis.kop.plaatsen) {
      if ((rang === 2 && mpp > 16) || (rang === 3 && (mpp > 5 || mpp < 0.5)) || (rang < 2 && mpp < 1.2)) continue;
      const s = opScherm(XMIN + lx - OX, 0, -(YMIN + ly - OY));
      const maat = rang === 0 ? 17 : rang === 1 ? 14 : 12;
      pen.font = `${rang < 2 ? 600 : 500} ${maat}px Jost, Futura, sans-serif`;
      const b = pen.measureText(naam).width / 2 + 3;
      if (s.x > 0 && s.x < breed) s.x = Math.min(Math.max(s.x, b + 2), breed - b - 2);
      // Een stad of dorp staat er altijd, ook over een stembureau heen; de rest wijkt.
      const vak_ = [s.x - b, s.y - maat * 0.7, s.x + b, s.y + maat * 0.7];
      if (rang < 2 ? namen.some((n) => vak_[0] < n[2] && vak_[2] > n[0] && vak_[1] < n[3] && vak_[3] > n[1]) : !vrij(...vak_)) continue;
      schrijf(naam, s.x, s.y, rang < 2 ? INKT : '#556070');
      bezet.push(vak_); namen.push(vak_);
    }
    // Straatnamen, langs de straat.
    if (mpp < 1.5) {
      pen.font = '500 11.5px Jost, Futura, sans-serif';
      for (const st of straten.sort((a, b) => a.klasse - b.klasse || b.lengte - a.lengte)) {
        const h = st.hoek * DEG, dx = Math.cos(h) * 10, dz = -Math.sin(h) * 10;
        const a = opScherm(st.x - dx, 0, st.z - dz), b = opScherm(st.x + dx, 0, st.z + dz);
        const perMeter = Math.hypot(b.x - a.x, b.y - a.y) / 20, w = pen.measureText(st.naam).width;
        if (w + 10 > st.lengte * perMeter) continue;
        let hoek = Math.atan2(b.y - a.y, b.x - a.x);
        if (hoek > Math.PI / 2) hoek -= Math.PI; else if (hoek < -Math.PI / 2) hoek += Math.PI;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const bx = (w * Math.abs(Math.cos(hoek)) + 12 * Math.abs(Math.sin(hoek))) / 2 + 3, by = (w * Math.abs(Math.sin(hoek)) + 12 * Math.abs(Math.cos(hoek))) / 2 + 3;
        if (!vrij(mx - bx - 14, my - by - 10, mx + bx + 14, my + by + 10)) continue;
        pen.save(); pen.translate(mx, my); pen.rotate(hoek); schrijf(st.naam, 0, 0, '#3b4656'); pen.restore();
        bezet.push([mx - bx, my - by, mx + bx, my + by]);
      }
    }
    pen.textAlign = 'left';
  }

  // ---- tekenen: eerst de kaart naar een tussenbeeld, dan de inktlijnen eroverheen
  let doel = null;
  const inkt = new THREE.ShaderMaterial({
    ...inktShader, depthTest: false, depthWrite: false,
    uniforms: { tKleur: { value: null }, tDiepte: { value: null }, stap: { value: new THREE.Vector2() }, punt: { value: new THREE.Vector2() }, bereik: { value: 58000 }, drempel: { value: 2 }, sterkte: { value: 0.9 }, inkt: { value: hex(INKT) } },
  });
  const vel = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), inkt);
  vel.frustumCulled = false;
  const velScene = new THREE.Scene().add(vel), velCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Het dieptebeeld vanuit de zon, passend om wat er in beeld is (met ruimte voor schaduwen die van buiten komen).
  const zonKijk = new THREE.Matrix4(), hoekpunt = new THREE.Vector3();
  function tekenSchaduw() {
    zonCam.position.copy(zon).multiplyScalar(40000);
    zonCam.up.set(0, 1, 0);
    zonCam.lookAt(0, 0, 0);
    zonCam.updateMatrixWorld(true);
    zonKijk.copy(zonCam.matrixWorld).invert();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [px, py] of [[0, 0], [breed, 0], [0, hoog], [breed, hoog]]) {
      const g = grondOp(px, py);
      for (const hoogte of [0, 160]) {
        hoekpunt.set(g.x, hoogte, g.z).applyMatrix4(zonKijk);
        x0 = Math.min(x0, hoekpunt.x); x1 = Math.max(x1, hoekpunt.x); y0 = Math.min(y0, hoekpunt.y); y1 = Math.max(y1, hoekpunt.y);
        z0 = Math.min(z0, hoekpunt.z); z1 = Math.max(z1, hoekpunt.z);
      }
    }
    // Op hele beeldpunten van het dieptebeeld leggen: dan trilt de schaduwrand niet bij het schuiven.
    const maat_ = Math.ceil(Math.max(x1 - x0, y1 - y0) / 64 + 1) * 64, korrel = maat_ / SCHADUW;
    const cx = Math.round((x0 + x1) / 2 / korrel) * korrel, cy = Math.round((y0 + y1) / 2 / korrel) * korrel;
    zonCam.left = cx - maat_ / 2; zonCam.right = cx + maat_ / 2; zonCam.bottom = cy - maat_ / 2; zonCam.top = cy + maat_ / 2;
    zonCam.near = -z1 - 400; zonCam.far = -z0 + 400;
    zonCam.updateProjectionMatrix();
    schaduwU.schaduwMat.value.multiplyMatrices(zonCam.projectionMatrix, zonKijk);
    schaduwU.schaduwMarge.value = Math.max(0.5, korrel * 1.2) / (zonCam.far - zonCam.near);
    schaduwU.schaduwKracht.value = 1 - 0.45 * Math.min(Math.max((stand.mpp - 6) / 14, 0), 1);
    const gewisseld = [];
    for (const net of scene.children) {
      if (!net.visible || !net.userData.diepte) continue;
      gewisseld.push(net, net.material);
      net.material = net.userData.diepte;
    }
    renderer.setRenderTarget(schaduwDoel);
    renderer.clear();
    renderer.render(scene, zonCam);
    for (let i = 0; i < gewisseld.length; i += 2) gewisseld[i].material = gewisseld[i + 1];
  }

  let fijner = 1;
  function maat() {
    const r = vak.getBoundingClientRect();
    breed = Math.max(Math.round(r.width), 50); hoog = Math.max(Math.round(r.height), 50);
    pr = Math.min(window.devicePixelRatio || 1, 2);
    // Op een scherm met grove beeldpunten twee keer zo fijn tekenen: dat maakt de inktlijnen glad.
    fijner = pr < 1.5 ? 2 : 1;
    renderer.setPixelRatio(pr);
    renderer.setSize(breed, hoog, false);
    const w = Math.round(breed * pr * fijner), h = Math.round(hoog * pr * fijner);
    doel?.dispose();
    doel = new THREE.WebGLRenderTarget(w, h, { samples: 4, depthBuffer: true });
    doel.depthTexture = new THREE.DepthTexture(w, h);
    inkt.uniforms.tKleur.value = doel.texture; inkt.uniforms.tDiepte.value = doel.depthTexture;
    inkt.uniforms.stap.value.set((fijner === 2 ? 2 : 1.5) / w, (fijner === 2 ? 2 : 1.5) / h);
    inkt.uniforms.punt.value.set(1 / (breed * pr), 1 / (hoog * pr));
    etiket.width = Math.round(breed * pr); etiket.height = Math.round(hoog * pr);
    zetCamera();
    mppMax = heleGemeente(RICHTING_3D, HOEK_3D).mpp * 1.25;
  }

  let gevraagd = false;
  function vraagBeeld() { if (!gevraagd) { gevraagd = true; requestAnimationFrame(teken); } }
  function teken(nu) {
    gevraagd = false;
    stapVlucht(nu);
    klem();
    zetCamera();
    werkBij();
    stapGroei(nu);
    stapLeven(nu);
    // De drempel groeit mee met het beeldpunt: van ver telt alleen de omtrek van een gebouw, dichtbij ook een dakrand.
    inkt.uniforms.drempel.value = Math.max(1.6, 4.8 * stand.mpp / (pr * fijner));
    tekenSchaduw();
    inkt.uniforms.sterkte.value = 0.88 - 0.5 * Math.min(Math.max((stand.mpp - 0.7) / 3.3, 0), 1);
    renderer.setRenderTarget(doel);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    renderer.render(velScene, velCam);
    tekenNamen();
    if (vlucht || groeiers.size) vraagBeeld();
    else if (leeft()) setTimeout(vraagBeeld, 30);
  }

  // ---- bediening
  const plekOp = (x, y) => {
    let best = null, dichtst = Infinity;
    for (const p of plekken) {
      if (!p.zicht || !p.scherm) continue;
      const d = Math.hypot(x - p.scherm.x, y - (p.scherm.y + p.kop.y) / 2);
      if (d < p.straal + 6 && d < dichtst) { dichtst = d; best = p; }
    }
    return best;
  };
  function kies(p, vliegen = true) {
    gekozen = p;
    opKies(p ? p.nrs : null);
    if (p && vliegen) vlieg({ x: p.x, z: p.z, mpp: Math.min(stand.mpp, 1.4) }, 900);
    vraagBeeld();
  }
  function zoomOm(px, py, factor) {
    vlucht = null;
    const voor = grondOp(px, py);
    stand.mpp *= factor; klem(); zetCamera();
    const na = grondOp(px, py);
    stand.x += voor.x - na.x; stand.z += voor.z - na.z;
    vraagBeeld();
  }
  const wijzers = new Map();
  let anker = null, bewogen = false, knijp = null;
  const plek = (e) => { const r = doek.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  doek.addEventListener('pointerdown', (e) => {
    doek.setPointerCapture(e.pointerId);
    const p = plek(e);
    wijzers.set(e.pointerId, p);
    vlucht = null; zetCamera();
    if (wijzers.size === 1) { anker = grondOp(p.x, p.y); bewogen = false; anker.sx = p.x; anker.sy = p.y; } else if (wijzers.size === 2) {
      const [a, b] = [...wijzers.values()];
      knijp = { afstand: Math.hypot(a.x - b.x, a.y - b.y), mpp: stand.mpp, anker: grondOp((a.x + b.x) / 2, (a.y + b.y) / 2) };
      bewogen = true;
    }
  });
  doek.addEventListener('pointermove', (e) => {
    const p = plek(e);
    if (!wijzers.has(e.pointerId)) {
      const raak = plekOp(p.x, p.y);
      if (raak !== zweef) { zweef = raak; doek.style.cursor = raak ? 'pointer' : ''; vraagBeeld(); }
      return;
    }
    wijzers.set(e.pointerId, p);
    if (wijzers.size === 1 && anker) {
      if (!bewogen && Math.hypot(p.x - anker.sx, p.y - anker.sy) < 5) return;
      bewogen = true;
      const g = grondOp(p.x, p.y);
      stand.x += anker.x - g.x; stand.z += anker.z - g.z; klem(); zetCamera();
    } else if (wijzers.size === 2 && knijp) {
      const [a, b] = [...wijzers.values()];
      stand.mpp = knijp.mpp * knijp.afstand / Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1); klem(); zetCamera();
      const g = grondOp((a.x + b.x) / 2, (a.y + b.y) / 2);
      stand.x += knijp.anker.x - g.x; stand.z += knijp.anker.z - g.z; klem(); zetCamera();
    }
    vraagBeeld();
  });
  const los = (e) => {
    if (!wijzers.has(e.pointerId)) return;
    const p = wijzers.get(e.pointerId);
    wijzers.delete(e.pointerId);
    if (wijzers.size === 0 && !bewogen && e.type === 'pointerup') kies(plekOp(p.x, p.y));
    if (wijzers.size === 1) { const [q] = [...wijzers.values()]; anker = grondOp(q.x, q.y); anker.sx = q.x; anker.sy = q.y; knijp = null; }
    if (wijzers.size === 0) { anker = null; knijp = null; }
  };
  doek.addEventListener('pointerup', los);
  doek.addEventListener('pointercancel', los);
  doek.addEventListener('pointerleave', () => { if (zweef) { zweef = null; doek.style.cursor = ''; vraagBeeld(); } });
  doek.addEventListener('wheel', (e) => { e.preventDefault(); const p = plek(e); zoomOm(p.x, p.y, Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : e.deltaMode ? 0.05 : 0.0016))); }, { passive: false });
  doek.addEventListener('dblclick', (e) => { const p = plek(e), g = grondOp(p.x, p.y); vlieg({ x: (g.x + stand.x) / 2, z: (g.z + stand.z) / 2, mpp: stand.mpp / 2 }, 350); });
  doek.addEventListener('keydown', (e) => {
    const stapje = 80 * stand.mpp, a = stand.az * DEG;
    const schuif = (rechts, op) => { vlieg({ x: stand.x + (Math.cos(a) * rechts + Math.sin(a) * op) * stapje, z: stand.z + (Math.sin(a) * rechts - Math.cos(a) * op) * stapje }, 180); };
    if (e.key === 'ArrowLeft') schuif(-1, 0); else if (e.key === 'ArrowRight') schuif(1, 0); else if (e.key === 'ArrowUp') schuif(0, 1); else if (e.key === 'ArrowDown') schuif(0, -1);
    else if (e.key === '+' || e.key === '=') vlieg({ mpp: stand.mpp / 1.6 }, 220); else if (e.key === '-') vlieg({ mpp: stand.mpp * 1.6 }, 220);
    else return;
    e.preventDefault();
  });

  function weergave(naarPlat) {
    plat = naarPlat;
    vlieg(plat ? { az: 0, el: 90 } : { az: RICHTING_3D, el: HOEK_3D }, 800);
  }
  const acties = {
    in: () => vlieg({ mpp: stand.mpp / 1.8 }, 280),
    uit: () => vlieg({ mpp: stand.mpp * 1.8 }, 280),
    draai: () => vlieg({ az: (vlucht ? vlucht.naar.az : stand.az) + 90 }, 700),
    thuis: () => vlieg(heleGemeente(plat ? 0 : RICHTING_3D, plat ? 90 : HOEK_3D), 800),
  };

  new ResizeObserver(() => { maat(); vraagBeeld(); }).observe(vak);
  maat();
  Object.assign(stand, heleGemeente(RICHTING_3D, HOEK_3D));
  document.fonts?.ready.then(vraagBeeld);
  vraagBeeld();

  return {
    acties, weergave,
    get plat() { return plat; },
    // Namen bij de stembureaus, in de volgorde van de lijst op de pagina.
    namen(lijst) { for (const p of plekken) p.naam = p.nrs.length > 1 ? `${lijst[p.nrs[0]]} +${p.nrs.length - 1}` : lijst[p.nrs[0]]; vraagBeeld(); },
    // Alleen deze stembureaus uitlichten (de rest wordt een gewoon gebouw).
    filter(zichtbaar) { for (const p of plekken) p.zicht = p.nrs.some((n) => zichtbaar.has(n)); if (gekozen && !gekozen.zicht) kies(null); vraagBeeld(); },
    toon(nr) { const p = plekken.find((q) => q.nrs.includes(nr)); if (p) kies(p); return !!p; },
    sluit() { kies(null); },
    // Voor het nameten (stemmen/?kaartmeet): een stand zetten, wachten tot alles geladen is en beelden tekenen.
    async meet(doel, beelden = 20) {
      Object.assign(stand, doel); vlucht = null;
      for (let i = 0, rust = 0; i < 600 && rust < 6; i++) { teken(performance.now()); rust = bezig === 0 ? rust + 1 : 0; await new Promise((r) => setTimeout(r, 25)); }
      const gl = renderer.getContext(), start = performance.now();
      for (let i = 0; i < beelden; i++) { teken(performance.now()); gl.finish(); }
      const info = renderer.info;
      const waar = (m) => (m ? [Math.round(m.position.x), Math.round(m.position.z)] : null);
      return { trein: waar(treinen.flatMap((t) => t.netten).find((m) => m.visible)), boot: waar(boten[0]?.net), hert: waar(herten[0]?.net), eend: waar(eenden[0]?.net), treinen: treinen.filter((t) => t.rijdt).length, bakken: treinen.reduce((n, t) => n + t.netten.filter((m) => m.visible).length, 0), boten: boten.length, herten: herten.length, eenden: eenden.length, modellen: !!modellen, msPerBeeld: +((performance.now() - start) / beelden).toFixed(1), mpp: +stand.mpp.toFixed(2), blokkenM: blokM.size, blokkenH: blokH.size, driehoeken: info.render.triangles, netten: info.memory.geometries };
    },
    // Een punt in rijksdriehoekscoordinaten tonen (de eigen plek van de bezoeker).
    hier(rdx, rdy) {
      if (rdx < XMIN || rdx > XMAX || rdy < YMIN || rdy > YMAX) return false;
      hier = { x: rdx - OX, z: -(rdy - OY) };
      vlieg({ x: hier.x, z: hier.z, mpp: Math.min(stand.mpp, 2.2) }, 900);
      return true;
    },
  };
}
