// Getekende beeldmerken per thema (eigen werk, geen licentie van anderen nodig).
// Eén beeld per thema, voor alle partijen hetzelfde. Het beeld toont het onderwerp,
// nooit een standpunt. Tekenvlak 100 x 100 met een grondlijn op y = 86.
// Lijnkleur en lijndikte erven van het <svg>-element (CSS: stroke, stroke-width),
// zodat hetzelfde beeld groot en klein even stevig oogt.
const B = '#dba93a'; // baksteen
const BL = '#f8edcf'; // baksteen licht
const D = '#1d4f91'; // Dudok-blauw
const W = '#fff';
const grond = '<path d="M6 86h88" fill="none"/>';

export const THEMABEELDEN = {
  // Rij huizen: een puntdak, een blok met ramen, een puntdak
  wonen: `${grond}
<path d="M12 86V54l14-14 14 14v32" fill="${B}"/><path d="M21 60h10v10H21z" fill="${W}"/>
<path d="M40 86V30h26v56" fill="${BL}"/><path d="M45 37h6v6h-6zM55 37h6v6h-6zM45 49h6v6h-6zM55 49h6v6h-6zM45 61h6v6h-6zM55 61h6v6h-6zM50 74h6v12h-6z" fill="${D}"/>
<path d="M66 86V58l12-12 12 12v28" fill="${W}"/><path d="M73 63h10v9H73z" fill="${D}"/>`,

  // Auto en fiets naast elkaar op de weg
  verkeer: `${grond}
<path d="M6 80V67h9l7-10h18l8 10h6v13z" fill="${D}"/><path d="M19 66l5-6h6v6zM34 66v-6h5l5 6z" fill="${W}"/>
<circle cx="17" cy="80" r="6" fill="${W}"/><circle cx="44" cy="80" r="6" fill="${W}"/>
<circle cx="66" cy="77" r="9" fill="none"/><circle cx="85" cy="77" r="9" fill="none"/>
<path d="M66 77l8-15h10l1 15M74 62l3 15 7-15M72 57h6M83 62l-1-6h5" fill="none"/>`,

  // Zon, zonnepaneel en stroom
  klimaat: `${grond}
<circle cx="30" cy="30" r="12" fill="${B}"/>
<path d="M30 8v6M30 46v6M8 30h6M46 30h6M14.4 14.4l4.3 4.3M41.3 41.3l4.3 4.3M14.4 45.6l4.3-4.3M41.3 18.7l4.3-4.3" fill="none"/>
<path d="M52 66l10-26h32l-10 26z" fill="${D}"/><path d="M55.5 57h32M59 48h32M72 40l-6 26M83 40l-6 26" fill="none" stroke="${W}"/>
<path d="M52 66l10-26h32l-10 26z" fill="none"/><path d="M73 66v20" fill="none"/>
<path d="M32 54L18 74h10l-5 12 19-22H31l7-10z" fill="${BL}"/>`,

  // Bomen, heide en water met riet
  natuur: `${grond}
<path d="M26 86V60" fill="none"/><circle cx="26" cy="46" r="15" fill="${BL}"/>
<path d="M48 86V68" fill="none"/><path d="M48 24L36 58h24z" fill="${B}"/><path d="M48 42L39 70h18z" fill="${B}"/>
<path d="M60 86c0-5 6-8 17-8s17 3 17 8" fill="${D}"/><path d="M68 83h8M80 83h7" fill="none" stroke="${W}"/>
<path d="M70 79c0-12-1-22-4-30M80 78c0-14 1-26 4-34" fill="none"/><path d="M64 38h5v11h-5zM82 33h5v11h-5z" fill="${B}"/>`,

  // Hart met een plus: zorg en welzijn
  zorg: `${grond}
<path d="M44 82C18 66 12 46 22 34c8-9 18-6 22 2 4-8 14-11 22-2 10 12 4 32-22 48z" fill="${B}"/>
<circle cx="74" cy="30" r="14" fill="${D}"/><path d="M74 22v16M66 30h16" fill="none" stroke="${W}"/>`,

  // Straatlantaarn met lichtkegel
  veiligheid: `
<path d="M54 36L36 86h48L64 36z" fill="${BL}" stroke="none"/>
${grond}
<path d="M24 86V22c0-6 4-8 10-8h25" fill="none"/><path d="M18 86h12" fill="none"/>
<path d="M51 22h16l-3 14H54z" fill="${B}"/><path d="M59 14v8" fill="none"/>`,

  // Mensen onder één dak
  asiel: `${grond}
<path d="M8 44L50 14l42 30" fill="none"/>
<circle cx="28" cy="50" r="7" fill="${W}"/><path d="M17 86V70a11 11 0 0 1 22 0v16" fill="${D}"/>
<circle cx="50" cy="44" r="8" fill="${W}"/><path d="M38 86V66a12 12 0 0 1 24 0v20" fill="${B}"/>
<circle cx="72" cy="56" r="6" fill="${W}"/><path d="M63 86V74a9 9 0 0 1 18 0v12" fill="${BL}"/>`,

  // Winkel met luifel en een zendmast
  economie: `${grond}
<path d="M12 86V46h54v40" fill="${W}"/>
<path d="M8 46l4-14h54l4 14z" fill="${B}"/><path d="M21 32l-3 14M30 32l-1 14M39 32v14M48 32l1 14M57 32l3 14" fill="none"/>
<path d="M18 54h22v18H18z" fill="${D}"/><path d="M46 56h14v30H46z" fill="${BL}"/>
<path d="M76 86l8-64 8 64M78.5 66h11M80.5 48h7" fill="none"/>
<circle cx="84" cy="18" r="3" fill="${B}"/><path d="M76 12a12 12 0 0 0 0 12M92 12a12 12 0 0 1 0 12" fill="none"/>`,

  // Open boek, bal en muzieknoot
  cultuur: `${grond}
<path d="M12 80V58c12-6 26-6 38 2 12-8 26-8 38-2v22c-12-6-26-6-38 2-12-8-26-8-38-2z" fill="${W}"/><path d="M50 60v22" fill="none"/>
<path d="M20 64c8-3 16-3 22 0M20 71c8-3 16-3 22 0M58 64c6-3 14-3 22 0M58 71c6-3 14-3 22 0" fill="none" stroke="${D}"/>
<circle cx="28" cy="30" r="13" fill="${B}"/><path d="M15 30h26M28 17c-6 8-6 18 0 26M28 17c6 8 6 18 0 26" fill="none"/>
<path d="M76 42V16l12 4" fill="none"/><ellipse cx="70" cy="42" rx="7" ry="5.5" fill="${D}"/>`,

  // Raadhuis met toren
  bestuur: `${grond}
<path d="M10 86V58h36v28" fill="${B}"/><path d="M15 64h26v6H15z" fill="${D}"/>
<path d="M46 86V22h16v64" fill="${BL}"/><path d="M43 22h22v-6H43z" fill="${B}"/><path d="M54 16V6" fill="none"/><path d="M54 6h9v5h-9" fill="${D}"/>
<path d="M50 30h8v4h-8zM50 40h8v4h-8zM50 50h8v4h-8z" fill="${D}"/><path d="M50 72h8v14h-8z" fill="${W}"/>
<path d="M62 86V66h28v20" fill="${W}"/><path d="M67 72h18v6H67z" fill="${D}"/>`,

  // Stapel munten en een euro
  financien: `${grond}
<path d="M10 76v6c0 5.3 30 5.3 30 0v-6" fill="${B}"/><ellipse cx="25" cy="76" rx="15" ry="4" fill="${B}"/><path d="M10 68v6c0 5.3 30 5.3 30 0v-6" fill="${B}"/><ellipse cx="25" cy="68" rx="15" ry="4" fill="${B}"/><path d="M10 60v6c0 5.3 30 5.3 30 0v-6" fill="${B}"/><ellipse cx="25" cy="60" rx="15" ry="4" fill="${B}"/><path d="M10 52v6c0 5.3 30 5.3 30 0v-6" fill="${B}"/><ellipse cx="25" cy="52" rx="15" ry="4" fill="${B}"/>
<circle cx="68" cy="54" r="24" fill="${BL}"/>
<path d="M76 43a12 12 0 1 0 0 22M57 50h15M57 58h15" fill="none" stroke="${D}"/>`,
};

// Eén verborgen sprite per pagina; de beelden worden met <use href="#tb-..."> geplaatst.
export const themaSprite = (ids) => `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>${ids
  .filter((id) => THEMABEELDEN[id])
  .map((id) => `<symbol id="tb-${id}" viewBox="0 0 100 100">${THEMABEELDEN[id].replace(/\n/g, '')}</symbol>`)
  .join('')}</defs></svg>`;

export const themaBeeld = (id, klas = 'themabeeld') => (THEMABEELDEN[id]
  ? `<svg class="${klas}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#tb-${id}"/></svg>`
  : '');
