/**
 * dinos.js — Dino Gooiers
 * Dino roster data en SVG-rendering voor alle spelers en vijanden.
 *
 * Kleuren worden als CSS-variabelen in SVG-componenten gebruikt:
 *   --main   : primaire lichaamskleur
 *   --dark   : schaduw / donkere accenten
 *   --belly  : buik / lichtere accenten
 *   --ink    : outline / oogkleur
 */

'use strict';

/* ─────────────────────────────────────────────
   HULPFUNCTIES — SVG-bouwstenen
   ───────────────────────────────────────────── */

/**
 * Bouw een inline SVG-string op voor een viervoeter (quadruped).
 * Alle kleuren zijn CSS-var()-verwijzingen zodat elk dino-exemplaar
 * zijn eigen palette kan krijgen via een <style>-blok of inline vars.
 *
 * @param {Object} opts
 * @param {string} opts.id          - uniek SVG-id-prefix
 * @param {string} opts.bodyShape   - 'round' | 'long' | 'wide'
 * @param {string[]} opts.extras    - extra SVG-fragmenten (staart, helm, enz.)
 * @returns {string}
 */
function buildQuadrupedSVG(opts = {}) {
  const { id = 'dino', bodyShape = 'round', extras = [] } = opts;
  const bRx = bodyShape === 'long' ? 55 : bodyShape === 'wide' ? 60 : 46;
  const bRy = bodyShape === 'wide' ? 34 : 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 165" width="210" height="165" aria-hidden="true">
  <defs>
    <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <g id="${id}-dino" filter="url(#${id}-shadow)">
    <!-- staart -->
    <path d="M44 106 Q16 90 9 112 Q13 134 41 124 Q47 120 44 106Z"
      fill="var(--main)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round"/>
    <!-- achterste poot -->
    <ellipse cx="72" cy="128" rx="13" ry="20" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.8"/>
    <path d="M60 147 Q66 156 72 152 Q78 156 84 147" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round"/>
    <!-- voorste poot -->
    <ellipse cx="122" cy="128" rx="11" ry="17" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.8"/>
    <path d="M112 144 Q118 153 124 148 Q130 153 136 144" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round"/>
    <!-- romp -->
    <ellipse cx="96" cy="100" rx="${bRx}" ry="${bRy}" fill="var(--main)" stroke="var(--ink)" stroke-width="2.5"/>
    <!-- buik -->
    <ellipse cx="96" cy="112" rx="${bRx - 13}" ry="${bRy - 16}" fill="var(--belly)" stroke="var(--ink)" stroke-width="1.5"/>
    <!-- romp glans -->
    <ellipse cx="82" cy="86" rx="${Math.round(bRx * 0.44)}" ry="${Math.round(bRy * 0.3)}" fill="rgba(255,255,255,0.18)"/>
    <!-- nek -->
    <ellipse cx="150" cy="80" rx="19" ry="27" fill="var(--main)" stroke="var(--ink)" stroke-width="2.2"/>
    <!-- hoofd -->
    <ellipse cx="166" cy="57" rx="26" ry="22" fill="var(--main)" stroke="var(--ink)" stroke-width="2.5"/>
    <!-- snuit -->
    <ellipse cx="182" cy="64" rx="14" ry="10" fill="var(--main)" stroke="var(--ink)" stroke-width="2"/>
    <!-- glimlach -->
    <path d="M170 70 Q180 78 190 70" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- neusgat -->
    <ellipse cx="185" cy="60" rx="2.5" ry="2" fill="var(--ink)"/>
    <!-- oog wit -->
    <circle cx="172" cy="50" r="9" fill="white" stroke="var(--ink)" stroke-width="1.5"/>
    <!-- iris -->
    <circle cx="173" cy="51" r="5.5" fill="var(--ink)"/>
    <!-- glint -->
    <circle cx="171" cy="49" r="2.2" fill="white"/>
    ${extras.join('\n    ')}
  </g>
</svg>`;
}

function buildBipedSVG(opts = {}) {
  const { id = 'dino', headSize = 'large', extras = [] } = opts;
  const hr = headSize === 'large' ? 32 : 26;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 210" width="200" height="210" aria-hidden="true">
  <defs>
    <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <g id="${id}-dino" filter="url(#${id}-shadow)">
    <!-- staart -->
    <path d="M62 132 Q26 118 20 144 Q28 168 60 154 Q64 146 62 132Z"
      fill="var(--main)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round"/>
    <!-- benen -->
    <rect x="80" y="150" width="17" height="36" rx="7" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.8"/>
    <rect x="105" y="150" width="17" height="36" rx="7" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.8"/>
    <!-- voeten met teentjes -->
    <path d="M74 185 Q80 196 88 190 Q94 196 100 185" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M99 185 Q105 196 113 190 Q119 196 125 185" fill="var(--dark)" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round"/>
    <!-- romp -->
    <ellipse cx="102" cy="118" rx="43" ry="40" fill="var(--main)" stroke="var(--ink)" stroke-width="2.5"/>
    <!-- buik -->
    <ellipse cx="104" cy="128" rx="29" ry="26" fill="var(--belly)" stroke="var(--ink)" stroke-width="1.5"/>
    <!-- romp glans -->
    <ellipse cx="88" cy="102" rx="22" ry="14" fill="rgba(255,255,255,0.18)"/>
    <!-- armpje links -->
    <path d="M62 110 Q44 120 46 134 Q52 140 58 132 Q60 120 68 114Z" fill="var(--main)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- armpje rechts -->
    <path d="M142 110 Q160 120 158 134 Q152 140 146 132 Q144 120 136 114Z" fill="var(--main)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- nek -->
    <ellipse cx="102" cy="82" rx="18" ry="23" fill="var(--main)" stroke="var(--ink)" stroke-width="2.2"/>
    <!-- hoofd -->
    <ellipse cx="104" cy="54" rx="${hr}" ry="${hr - 4}" fill="var(--main)" stroke="var(--ink)" stroke-width="2.5"/>
    <!-- snuit -->
    <ellipse cx="120" cy="64" rx="15" ry="10" fill="var(--main)" stroke="var(--ink)" stroke-width="2"/>
    <!-- glimlach -->
    <path d="M110 70 Q122 80 134 70" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- neusgat -->
    <ellipse cx="126" cy="60" rx="2.5" ry="2" fill="var(--ink)"/>
    <!-- oog wit -->
    <circle cx="116" cy="46" r="10" fill="white" stroke="var(--ink)" stroke-width="1.5"/>
    <!-- iris -->
    <circle cx="117" cy="47" r="6" fill="var(--ink)"/>
    <!-- glint -->
    <circle cx="115" cy="45" r="2.5" fill="white"/>
    ${extras.join('\n    ')}
  </g>
</svg>`;
}

/**
 * Genereer een SVG-data-URI voor een dino met de gegeven kleurenpalet.
 * @param {'quadruped'|'biped'} type
 * @param {Object} colors  {main, dark, belly, ink}
 * @param {string} id
 * @param {string[]} extras
 * @returns {string}  data:image/svg+xml;base64,...
 */
function dinoSVGDataURI(type, colors, id, extras = []) {
  const styleBlock = `<style>
    #${id}-dino { --main:${colors.main}; --dark:${colors.dark}; --belly:${colors.belly}; --ink:${colors.ink}; }
  </style>`;

  let svgRaw;
  if (type === 'biped') {
    svgRaw = buildBipedSVG({ id, extras }).replace('<svg ', `<svg ${''}`);
  } else {
    svgRaw = buildQuadrupedSVG({ id, extras }).replace('<svg ', `<svg ${''}`);
  }
  // Injecteer de style vóór de eerste <g>
  svgRaw = svgRaw.replace(/(<g )/, styleBlock + '\n  $1');

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgRaw);
}

/* ─────────────────────────────────────────────
   GOED DINO ROSTER  (window.DINO_ROSTER)
   ───────────────────────────────────────────── */

window.DINO_ROSTER = [

  /* 1 ─ Rocky ─────────────────────────────── */
  {
    id: 'rocky',
    name: 'Rocky',
    dutchName: 'Rocky de Stegosaurus',
    emoji: '🦕',
    colors: {
      main:  '#4caf50',
      dark:  '#2e7d32',
      belly: '#c8e6c9',
      ink:   '#1a2e1a',
    },
    power: 'triple_shot',
    powerDescription: 'Schiet drie keien tegelijk af in een waaier!',
    rarity: 'common',
    unlockLevel: 1,
    svgType: 'quadruped',
    svgExtras: [
      /* stegosaurus-platen langs de rug */
      '<polygon points="80,62 88,40 96,62"  fill="var(--dark)" />',
      '<polygon points="96,58 104,34 112,58" fill="var(--dark)" />',
      '<polygon points="112,62 120,38 128,62" fill="var(--dark)" />',
      '<polygon points="70,66 78,46 86,66"  fill="var(--dark)" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 2 ─ Chomp ──────────────────────────────── */
  {
    id: 'chomp',
    name: 'Chomp',
    dutchName: 'Chomp de T-Rex',
    emoji: '🦖',
    colors: {
      main:  '#e53935',
      dark:  '#b71c1c',
      belly: '#ffcdd2',
      ink:   '#1a0a0a',
    },
    power: 'steel_bite',
    powerDescription: 'Bijt dwars door stalen blokken alsof het boter is!',
    rarity: 'uncommon',
    unlockLevel: 3,
    svgType: 'biped',
    svgExtras: [
      /* extra tanden -->  */
      '<polygon points="110,72 114,82 118,72" fill="var(--belly)" />',
      '<polygon points="118,72 122,80 126,72" fill="var(--belly)" />',
      '<polygon points="126,72 130,78 134,72" fill="var(--belly)" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 3 ─ Sky ────────────────────────────────── */
  {
    id: 'sky',
    name: 'Sky',
    dutchName: 'Sky de Pterodactylus',
    emoji: '🦅',
    colors: {
      main:  '#00bcd4',
      dark:  '#006064',
      belly: '#b2ebf2',
      ink:   '#002a2e',
    },
    power: 'dive_bomb',
    powerDescription: 'Duikt van grote hoogte recht op vijanden neer (tik in de lucht)!',
    rarity: 'uncommon',
    unlockLevel: 4,
    svgType: 'quadruped',
    svgExtras: [
      /* vleugels */
      '<path d="M50,80 Q20,50 10,30 Q40,48 60,75" fill="var(--main)" opacity="0.85" />',
      '<path d="M140,78 Q170,48 190,28 Q162,46 142,73" fill="var(--main)" opacity="0.85" />',
      /* kuif */
      '<polygon points="162,30 170,8 178,30" fill="var(--dark)" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 4 ─ Dash ───────────────────────────────── */
  {
    id: 'dash',
    name: 'Dash',
    dutchName: 'Dash de Velociraptor',
    emoji: '⚡',
    colors: {
      main:  '#ff9800',
      dark:  '#e65100',
      belly: '#ffe0b2',
      ink:   '#2a1500',
    },
    power: 'speed_burst',
    powerDescription: 'Schiet razendsnel vooruit en splitst op in drie raptors!',
    rarity: 'common',
    unlockLevel: 2,
    svgType: 'biped',
    svgExtras: [
      /* scherpe klauwen -->  */
      '<line x1="58" y1="130" x2="48" y2="148" stroke="var(--dark)" stroke-width="3" stroke-linecap="round" />',
      '<line x1="62" y1="128" x2="50" y2="145" stroke="var(--dark)" stroke-width="3" stroke-linecap="round" />',
      /* snelheidsstrepen */
      '<path d="M30,100 Q50,96 44,110" stroke="var(--belly)" stroke-width="2" fill="none" opacity="0.7" />',
      '<path d="M22,112 Q42,108 36,122" stroke="var(--belly)" stroke-width="2" fill="none" opacity="0.7" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 5 ─ Stomp ──────────────────────────────── */
  {
    id: 'stomp',
    name: 'Stomp',
    dutchName: 'Stomp de Brontosaurus',
    emoji: '💥',
    colors: {
      main:  '#9c27b0',
      dark:  '#4a148c',
      belly: '#e1bee7',
      ink:   '#1a0022',
    },
    power: 'ground_stomp',
    powerDescription: 'Stampt zo hard op de grond dat een schokgolf alles omver blaast!',
    rarity: 'rare',
    unlockLevel: 8,
    svgType: 'quadruped',
    svgExtras: [
      /* extra lange nek -->  */
      '<ellipse cx="160" cy="50" rx="14" ry="30" fill="var(--main)" />',
      '<ellipse cx="160" cy="24" rx="20" ry="16" fill="var(--main)" />',
      '<circle cx="168" cy="18" r="6" fill="var(--belly)" />',
      '<circle cx="170" cy="18" r="3" fill="var(--ink)" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 6 ─ Trix ───────────────────────────────── */
  {
    id: 'trix',
    name: 'Trix',
    dutchName: 'Trix de Triceratops',
    emoji: '🔱',
    colors: {
      main:  '#1565c0',
      dark:  '#0d47a1',
      belly: '#bbdefb',
      ink:   '#000a1a',
    },
    power: 'horn_drill',
    powerDescription: 'Boort met drie hoorns dwars door elke constructie heen!',
    rarity: 'uncommon',
    unlockLevel: 5,
    svgType: 'quadruped',
    svgExtras: [
      /* nekschild -->  */
      '<ellipse cx="152" cy="72" rx="28" ry="20" fill="var(--dark)" opacity="0.7" />',
      /* drie hoorns -->  */
      '<polygon points="178,44 184,18 190,44" fill="var(--belly)" />',
      '<polygon points="168,36 172,12 178,36" fill="var(--belly)" />',
      '<polygon points="185,54 192,36 198,54" fill="var(--belly)" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 7 ─ Bolt ───────────────────────────────── */
  {
    id: 'bolt',
    name: 'Bolt',
    dutchName: 'Bolt de Ankylosaurus',
    emoji: '⚡🛡️',
    colors: {
      main:  '#f9a825',
      dark:  '#f57f17',
      belly: '#fff9c4',
      ink:   '#1a1400',
    },
    power: 'electric_tail',
    powerDescription: 'Mept met zijn elektrische staartknots — vijanden worden tijdelijk verlamd!',
    rarity: 'rare',
    unlockLevel: 9,
    svgType: 'quadruped',
    svgExtras: [
      /* pantserschubben -->  */
      '<ellipse cx="80"  cy="78" rx="14" ry="8" fill="var(--dark)" opacity="0.8" />',
      '<ellipse cx="100" cy="72" rx="14" ry="8" fill="var(--dark)" opacity="0.8" />',
      '<ellipse cx="120" cy="76" rx="14" ry="8" fill="var(--dark)" opacity="0.8" />',
      /* staartknots -->  */
      '<circle cx="16" cy="108" r="14" fill="var(--dark)" />',
      /* elektrische vonken -->  */
      '<path d="M16,94 L10,86 L18,88 L12,80" stroke="#fff176" stroke-width="2" fill="none" />',
      '<path d="M28,100 L36,92 L30,96 L38,88" stroke="#fff176" stroke-width="2" fill="none" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 8 ─ Bubba ──────────────────────────────── */
  {
    id: 'bubba',
    name: 'Bubba',
    dutchName: 'Bubba de Boem-Ankylosaur',
    emoji: '💣',
    colors: {
      main:  '#e91e63',
      dark:  '#880e4f',
      belly: '#fce4ec',
      ink:   '#1a0010',
    },
    power: 'bomb_explode',
    powerDescription: 'Explodeert bij inslag en vernietigt alles in de omgeving!',
    rarity: 'rare',
    unlockLevel: 10,
    svgType: 'quadruped',
    svgBodyShape: 'wide',
    svgExtras: [
      /* extra dikke ronde buik -->  */
      '<ellipse cx="95" cy="105" rx="52" ry="44" fill="var(--main)" />',
      '<ellipse cx="95" cy="118" rx="38" ry="28" fill="var(--belly)" />',
      /* lont -->  */
      '<path d="M95,58 Q102,42 108,30" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round" />',
      '<circle cx="108" cy="28" r="5" fill="#ff6f00" />',
      /* X-ogen (boos) -->  */
      '<line x1="158" y1="44" x2="168" y2="54" stroke="var(--ink)" stroke-width="3" />',
      '<line x1="168" y1="44" x2="158" y2="54" stroke="var(--ink)" stroke-width="3" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI('quadruped', this.colors, this.id, this.svgExtras);
    },
  },

  /* 9 ─ Pim ────────────────────────────────── */
  {
    id: 'pim',
    name: 'Pim',
    dutchName: 'Pim het Babydino',
    emoji: '🐣',
    colors: {
      main:  '#8bc34a',
      dark:  '#558b2f',
      belly: '#dcedc8',
      ink:   '#0a1a00',
    },
    power: 'multiply',
    powerDescription: 'Vermenigvuldigt zichzelf midden in de lucht — ineens zijn het er drie!',
    rarity: 'legendary',
    unlockLevel: 15,
    svgType: 'quadruped',
    svgExtras: [
      /* ei-schaalresten op hoofd -->  */
      '<path d="M155,42 Q162,28 170,42" stroke="var(--dark)" stroke-width="2" fill="var(--belly)" />',
      /* grote onschuldige ogen -->  */
      '<circle cx="170" cy="50" r="10" fill="var(--belly)" />',
      '<circle cx="170" cy="50" r="5"  fill="var(--ink)" />',
      '<circle cx="168" cy="48" r="2"  fill="white" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI(this.svgType, this.colors, this.id, this.svgExtras);
    },
  },

  /* 10 ─ Brons ─────────────────────────────── */
  {
    id: 'brons',
    name: 'Brons',
    dutchName: 'Brons de Brachiosaurus',
    emoji: '🏆',
    colors: {
      main:  '#ffd54f',
      dark:  '#f9a825',
      belly: '#fff8e1',
      ink:   '#1a1200',
    },
    power: 'massive_weight',
    powerDescription: 'Zijn kolossale gewicht verbrijzelt alle blokken die onder hem liggen bij de landing!',
    rarity: 'legendary',
    unlockLevel: 20,
    svgType: 'quadruped',
    svgBodyShape: 'long',
    svgExtras: [
      /* zeer lange nek -->  */
      '<rect x="148" y="20" width="26" height="70" rx="13" fill="var(--main)" />',
      /* hoofd bovenaan -->  */
      '<ellipse cx="161" cy="18" rx="20" ry="14" fill="var(--main)" />',
      '<circle cx="170" cy="12" r="6" fill="var(--belly)" />',
      '<circle cx="172" cy="12" r="3" fill="var(--ink)" />',
      /* vlekkenpatroon -->  */
      '<circle cx="88"  cy="90" r="8" fill="var(--dark)" opacity="0.4" />',
      '<circle cx="110" cy="82" r="6" fill="var(--dark)" opacity="0.4" />',
      '<circle cx="72"  cy="96" r="5" fill="var(--dark)" opacity="0.4" />',
    ],
    get svgDataURI() {
      return dinoSVGDataURI('quadruped', this.colors, this.id, this.svgExtras);
    },
  },

]; // einde DINO_ROSTER


/* ─────────────────────────────────────────────
   VIJANDEN — TIRANNEN  (window.TIRANNEN_TYPES)
   ───────────────────────────────────────────── */

window.TIRANNEN_TYPES = [

  {
    id: 'grunt',
    name: 'Grunt',
    dutchName: 'Grommert',
    emoji: '😡',
    color: '#2f6a57',
    health: 40,
    points: 100,
    size: 'small',
    description: 'Een kleine boze raptor die overal rondloopt en blokken bewaakt.',
    special: null,
    svgType: 'biped',
    svgExtras: [
      /* gefronste wenkbrauwen -->  */
      '<line x1="106" y1="42" x2="118" y2="46" stroke="#1a3d30" stroke-width="3" />',
      '<line x1="120" y1="44" x2="130" y2="42" stroke="#1a3d30" stroke-width="3" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#1a3d30', belly: '#a8d5c2', ink: '#0a1f18' };
      return dinoSVGDataURI(this.svgType, c, this.id, this.svgExtras);
    },
  },

  {
    id: 'shieldback',
    name: 'Shieldback',
    dutchName: 'Schildrug',
    emoji: '🛡️',
    color: '#3a5a3a',
    health: 80,
    points: 200,
    size: 'medium',
    description: 'Een middelgrote dino met een botschild op zijn rug. De eerste treffer ketst af!',
    special: 'shield_absorbs_first_hit',
    shieldActive: true,
    svgType: 'quadruped',
    svgExtras: [
      /* botschild op rug -->  */
      '<ellipse cx="90" cy="70" rx="46" ry="18" fill="#c8b87a" opacity="0.9" />',
      '<line x1="90" y1="52" x2="90" y2="88" stroke="#a09060" stroke-width="2" />',
      '<line x1="60" y1="70" x2="120" y2="70" stroke="#a09060" stroke-width="2" />',
      '<line x1="66" y1="56" x2="114" y2="84" stroke="#a09060" stroke-width="2" opacity="0.6" />',
      '<line x1="114" y1="56" x2="66" y2="84" stroke="#a09060" stroke-width="2" opacity="0.6" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#1f3a1f', belly: '#b0cbb0', ink: '#0a150a' };
      return dinoSVGDataURI(this.svgType, c, this.id, this.svgExtras);
    },
  },

  {
    id: 'helmet',
    name: 'Helmet',
    dutchName: 'Staalhelm',
    emoji: '⛑️',
    color: '#4a4a6a',
    health: 60,
    points: 150,
    size: 'medium',
    description: 'Een dino met een stalen helm — beschermd tegen aanvallen van bovenaf.',
    special: 'helmet_blocks_top_hits',
    helmetActive: true,
    svgType: 'biped',
    svgExtras: [
      /* stalen helm -->  */
      '<ellipse cx="102" cy="46" rx="34" ry="18" fill="#78909c" />',
      '<rect x="70" y="42" width="64" height="12" rx="4" fill="#546e7a" />',
      /* reflectiestreep op helm -->  */
      '<path d="M80,38 Q102,30 124,38" stroke="#b0bec5" stroke-width="2" fill="none" opacity="0.7" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#2a2a4a', belly: '#c5cae9', ink: '#0a0a1a' };
      return dinoSVGDataURI(this.svgType, c, this.id, this.svgExtras);
    },
  },

  {
    id: 'king',
    name: 'King',
    dutchName: 'Dinovorst',
    emoji: '👑',
    color: '#7a3a2a',
    health: 120,
    points: 300,
    size: 'large',
    description: 'De vette dinokoning met een gouden kroon. Hij roept andere tirannen te hulp!',
    special: 'summons_grunts_on_damage',
    svgType: 'quadruped',
    svgBodyShape: 'wide',
    svgExtras: [
      /* gouden kroon -->  */
      '<polygon points="148,38 154,18 162,34 170,14 178,34 186,18 192,38" fill="#ffd700" />',
      '<rect x="148" y="36" width="44" height="8" rx="2" fill="#ffc107" />',
      /* juwelen in kroon -->  */
      '<circle cx="162" cy="36" r="4" fill="#e53935" />',
      '<circle cx="170" cy="36" r="4" fill="#1565c0" />',
      '<circle cx="178" cy="36" r="4" fill="#2e7d32" />',
      /* dikke buik -->  */
      '<ellipse cx="95" cy="108" rx="50" ry="42" fill="#7a3a2a" />',
      '<ellipse cx="95" cy="118" rx="36" ry="28" fill="#c4785a" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#4a1a0a', belly: '#c4785a', ink: '#1a0800' };
      return dinoSVGDataURI('quadruped', c, this.id, this.svgExtras);
    },
  },

  {
    id: 'bone',
    name: 'Bone',
    dutchName: 'Botdino',
    emoji: '💀',
    color: '#9a9a8a',
    health: 90,
    points: 250,
    size: 'medium',
    description: 'Een skeletten-dino. Kan niet worden platgedrukt en is immuun voor explosies!',
    special: 'immune_to_squish_and_explosion',
    immuneToSquish: true,
    immuneToExplosion: true,
    svgType: 'quadruped',
    svgExtras: [
      /* ribben-patroon -->  */
      '<line x1="72" y1="84" x2="72" y2="116" stroke="#5a5a4a" stroke-width="2" />',
      '<line x1="84" y1="78" x2="84" y2="120" stroke="#5a5a4a" stroke-width="2" />',
      '<line x1="96" y1="76" x2="96" y2="120" stroke="#5a5a4a" stroke-width="2" />',
      '<line x1="108" y1="78" x2="108" y2="118" stroke="#5a5a4a" stroke-width="2" />',
      '<line x1="120" y1="82" x2="120" y2="114" stroke="#5a5a4a" stroke-width="2" />',
      '<ellipse cx="95" cy="98" rx="42" ry="34" fill="none" stroke="#5a5a4a" stroke-width="2" />',
      /* skelet-oog -->  */
      '<circle cx="168" cy="50" r="10" fill="#1a1a10" />',
      '<circle cx="168" cy="50" r="5"  fill="white" />',
      '<path d="M158,66 L164,60 L170,66 L176,60 L182,66" stroke="#5a5a4a" stroke-width="2" fill="none" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#5a5a4a', belly: '#e8e8d8', ink: '#1a1a10' };
      return dinoSVGDataURI('quadruped', c, this.id, this.svgExtras);
    },
  },

]; // einde TIRANNEN_TYPES


/* ─────────────────────────────────────────────
   BAZEN  (window.BOSS_DINOS)
   ───────────────────────────────────────────── */

window.BOSS_DINOS = [

  /* ── Baas 1 ─────────────────────────────── */
  {
    id: 'boss_tyranno_king',
    name: 'Tyranno King',
    dutchName: 'De Tyrannokoning',
    emoji: '👑🦖',
    color: '#2f6a57',
    triggerLevel: 10,
    health: 600,
    points: 5000,
    description: 'De heerser van het oerwoud. Schreeuwt zo hard dat blokken trillen en breken.',
    phases: [
      {
        phase: 1,
        healthThreshold: 1.0,   // 100% → 67%
        name: 'Woede',
        dutchDescription: 'Rent heen en weer en gooit rotsen naar de katapult.',
        attacks: ['rock_throw', 'charge'],
      },
      {
        phase: 2,
        healthThreshold: 0.67,  // 67% → 33%
        name: 'Razernij',
        dutchDescription: 'Roept twee Grommerts te hulp en sprint sneller.',
        attacks: ['rock_throw', 'charge', 'summon_grunts'],
      },
      {
        phase: 3,
        healthThreshold: 0.33,  // 33% → 0%
        name: 'Laatste Kracht',
        dutchDescription: 'Brult zo hard dat een schokgolf het hele scherm raakt!',
        attacks: ['rock_throw', 'charge', 'summon_grunts', 'roar_shockwave'],
      },
    ],
    svgType: 'biped',
    svgExtras: [
      /* koninklijke kroon -->  */
      '<polygon points="82,20 90,4 98,20 106,2 114,20 122,4 130,20" fill="#ffd700" />',
      '<rect x="82" y="18" width="48" height="10" rx="2" fill="#ffc107" />',
      /* littekens -->  */
      '<line x1="92" y1="100" x2="86" y2="140" stroke="#1a3d30" stroke-width="2" opacity="0.6" />',
      '<line x1="112" y1="96" x2="118" y2="136" stroke="#1a3d30" stroke-width="2" opacity="0.6" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#1a3d30', belly: '#a8d5c2', ink: '#0a1f18' };
      return dinoSVGDataURI(this.svgType, c, this.id + '_svg', this.svgExtras);
    },
  },

  /* ── Baas 2 ─────────────────────────────── */
  {
    id: 'boss_armored_ceratops',
    name: 'Armored Ceratops',
    dutchName: 'De Gepantserde Ceratops',
    emoji: '🛡️🔱',
    color: '#4a3a6a',
    triggerLevel: 20,
    health: 900,
    points: 10000,
    description: 'Volledig bepantserd met botplaten en drie kolossale hoorns. Zijn schild is bijna ondoordringbaar.',
    phases: [
      {
        phase: 1,
        healthThreshold: 1.0,
        name: 'Gepantserd',
        dutchDescription: 'Pantserschild actief — elke vijfde treffer wordt afgeblokt.',
        attacks: ['shield_block', 'horn_charge'],
      },
      {
        phase: 2,
        healthThreshold: 0.67,
        name: 'Gebroken Schild',
        dutchDescription: 'Schild breekt deels — wordt woedender en sneller.',
        attacks: ['horn_charge', 'stomp', 'horn_volley'],
      },
      {
        phase: 3,
        healthThreshold: 0.33,
        name: 'Laatste Aanval',
        dutchDescription: 'Raast als een hogesnelheidstrein door het scherm.',
        attacks: ['full_charge', 'stomp', 'horn_volley', 'summon_shieldbacks'],
      },
    ],
    svgType: 'quadruped',
    svgExtras: [
      /* massief nekschild -->  */
      '<ellipse cx="148" cy="68" rx="36" ry="26" fill="#7b68a0" />',
      '<ellipse cx="148" cy="68" rx="30" ry="20" fill="#4a3a6a" />',
      /* drie lange hoorns -->  */
      '<polygon points="174,40 178,8  182,40" fill="#c8b8e0" />',
      '<polygon points="162,32 166,4  170,32" fill="#c8b8e0" />',
      '<polygon points="186,52 192,28 198,52" fill="#c8b8e0" />',
      /* pantserplaten -->  */
      '<ellipse cx="80"  cy="72" rx="16" ry="9" fill="#7b68a0" opacity="0.8" />',
      '<ellipse cx="102" cy="66" rx="16" ry="9" fill="#7b68a0" opacity="0.8" />',
      '<ellipse cx="122" cy="70" rx="16" ry="9" fill="#7b68a0" opacity="0.8" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#2a1a4a', belly: '#d0c8e8', ink: '#0a0014' };
      return dinoSVGDataURI(this.svgType, c, this.id + '_svg', this.svgExtras);
    },
  },

  /* ── Baas 3 ─────────────────────────────── */
  {
    id: 'boss_mega_rex',
    name: 'Mega Rex',
    dutchName: 'De Mega Rex — Eindbaas',
    emoji: '💀👑🦖',
    color: '#3a1a2a',
    triggerLevel: 30,
    health: 1500,
    points: 25000,
    description: 'De onontkoombare Mega Rex. Groter dan een gebouw, sneller dan een rotsbrok. Dit is het eindgevecht.',
    isFinalBoss: true,
    phases: [
      {
        phase: 1,
        healthThreshold: 1.0,
        name: 'Ontwaken',
        dutchDescription: 'Langzaam maar dreigend — elke stap laat de grond beven.',
        attacks: ['ground_pound', 'claw_swipe'],
      },
      {
        phase: 2,
        healthThreshold: 0.75,
        name: 'Honger',
        dutchDescription: 'Begint te rennen en bijt blokken stuk voor een doorgang.',
        attacks: ['ground_pound', 'claw_swipe', 'steel_bite', 'charge'],
      },
      {
        phase: 3,
        healthThreshold: 0.40,
        name: 'Waanzin',
        dutchDescription: 'Roept alle vijandige dino-typen samen; schokgolven elke 10 seconden.',
        attacks: ['ground_pound', 'claw_swipe', 'steel_bite', 'charge', 'summon_all', 'roar_shockwave'],
      },
      {
        phase: 4,
        healthThreshold: 0.15,
        name: 'Ultieme Kracht',
        dutchDescription: 'Wordt twee keer zo groot — vult bijna het hele scherm!',
        attacks: ['mega_stomp', 'claw_swipe', 'steel_bite', 'summon_all', 'laser_roar'],
        sizeMultiplier: 2.0,
      },
    ],
    svgType: 'biped',
    svgExtras: [
      /* schedel-decoraties op hoofd -->  */
      '<polygon points="90,24 102,4 114,24" fill="#7a4a60" />',
      '<polygon points="76,28 84,12 92,28"  fill="#7a4a60" />',
      '<polygon points="110,28 118,12 126,28" fill="#7a4a60" />',
      /* enorme tanden -->  */
      '<polygon points="108,74 112,90 116,74" fill="#f5f5dc" />',
      '<polygon points="118,72 122,88 126,72" fill="#f5f5dc" />',
      '<polygon points="128,74 132,88 136,74" fill="#f5f5dc" />',
      '<polygon points="138,76 142,88 146,76" fill="#f5f5dc" />',
      /* gloeiende rode ogen -->  */
      '<circle cx="118" cy="46" r="12" fill="#ff1744" opacity="0.9" />',
      '<circle cx="120" cy="46" r="6"  fill="#b71c1c" />',
      '<circle cx="118" cy="44" r="3"  fill="#ff8a80" opacity="0.8" />',
      /* littekens -->  */
      '<path d="M68,90 L58,130" stroke="#1a0010" stroke-width="3" opacity="0.5" />',
      '<path d="M136,88 L146,128" stroke="#1a0010" stroke-width="3" opacity="0.5" />',
    ],
    get svgDataURI() {
      const c = { main: this.color, dark: '#1a0010', belly: '#7a4a60', ink: '#0a0008' };
      return dinoSVGDataURI(this.svgType, c, this.id + '_svg', this.svgExtras);
    },
  },

]; // einde BOSS_DINOS


/* ─────────────────────────────────────────────
   HULPFUNCTIES  (exporteert op window)
   ───────────────────────────────────────────── */

/**
 * Zoek een speler-dino op id.
 * @param {string} id
 * @returns {Object|undefined}
 */
window.getDinoById = function getDinoById(id) {
  return window.DINO_ROSTER.find(d => d.id === id);
};

/**
 * Zoek een vijand-type op id.
 * @param {string} id
 * @returns {Object|undefined}
 */
window.getTirannenById = function getTirannenById(id) {
  return window.TIRANNEN_TYPES.find(t => t.id === id);
};

/**
 * Zoek een baas op triggerniveau.
 * @param {number} level
 * @returns {Object|undefined}
 */
window.getBossForLevel = function getBossForLevel(level) {
  return window.BOSS_DINOS.find(b => b.triggerLevel === level);
};

/**
 * Geef alle dino's terug die beschikbaar zijn voor het opgegeven level.
 * @param {number} currentLevel
 * @returns {Object[]}
 */
window.getUnlockedDinos = function getUnlockedDinos(currentLevel) {
  return window.DINO_ROSTER.filter(d => d.unlockLevel <= currentLevel);
};

/**
 * Render een dino-SVG als HTMLImageElement met de juiste kleurvariabelen.
 * @param {Object} dinoOrTirann  - item uit DINO_ROSTER, TIRANNEN_TYPES of BOSS_DINOS
 * @param {number} [width=80]
 * @param {number} [height=80]
 * @returns {HTMLImageElement}
 */
window.renderDinoImage = function renderDinoImage(dinoOrTirann, width = 80, height = 80) {
  const img = document.createElement('img');
  img.src = dinoOrTirann.svgDataURI;
  img.width = width;
  img.height = height;
  img.alt = dinoOrTirann.dutchName || dinoOrTirann.name;
  img.classList.add('dino-sprite');
  if (dinoOrTirann.rarity) img.dataset.rarity = dinoOrTirann.rarity;
  return img;
};

// Zelftestje in de console (alleen in development)
if (typeof console !== 'undefined' && window.location && window.location.hostname === 'localhost') {
  console.groupCollapsed('[dinos.js] Roster geladen');
  console.log('Speler-dinos:', window.DINO_ROSTER.length);
  console.log('Tirannen-types:', window.TIRANNEN_TYPES.length);
  console.log('Bazen:', window.BOSS_DINOS.length);
  console.groupEnd();
}
