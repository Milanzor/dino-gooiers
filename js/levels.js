'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// levels.js  —  Dino Gooiers  —  30 levelsdefinities
// Canvas: 900×390 px  |  Grond: y=330  |  Blokgrootte: 40×40 px
// Rij-y-waarden (boven rand blok): 290 250 210 170 130 90 50 10
// Bloksoorten:  W=hout  S=steen  T=staal  X=TNT  G=glas
// ─────────────────────────────────────────────────────────────────────────────

window.LEVELS = [

  /* ══════════════════════════════════════════════════════════════════════════
     WERELD 1 — JUNGLE RUÏNES  (niveaus 1–10)
     Materialen: W, G, X   |   Vijanden: grunt, shieldback
     Achtergrond: 'jungle'
  ════════════════════════════════════════════════════════════════════════════ */

  // ── Niveau 1 ─────────────────────────────────────────────────────────────
  {
    id: 1,
    world: 1,
    name: 'Eerste Aanval',
    dinoIds: ['rocky'],
    structure: [
      { x: 520, y: 290, type: 'W' },
      { x: 520, y: 250, type: 'W' },
      { x: 520, y: 210, type: 'W' },
    ],
    enemies: [
      { type: 'grunt', x: 520, y: 170 },
    ],
    bonusDino: null,
    par: 200,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 2 ─────────────────────────────────────────────────────────────
  {
    id: 2,
    world: 1,
    name: 'Dubbele Toren',
    dinoIds: ['rocky', 'rocky'],
    structure: [
      { x: 460, y: 290, type: 'W' },
      { x: 460, y: 250, type: 'W' },
      { x: 460, y: 210, type: 'W' },
      { x: 600, y: 290, type: 'W' },
      { x: 600, y: 250, type: 'W' },
      { x: 600, y: 210, type: 'W' },
    ],
    enemies: [
      { type: 'grunt', x: 460, y: 170 },
      { type: 'grunt', x: 600, y: 170 },
    ],
    bonusDino: null,
    par: 1200,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 3 ─────────────────────────────────────────────────────────────
  // Brug: twee brede pylonen (elk 2 kolommen) met een dek ertussen.
  // Baksteenpatroon: elk dekblok overlapt twee steunpunten, stabiel in physics.
  {
    id: 3,
    world: 1,
    name: 'Houten Brug',
    dinoIds: ['rocky', 'dash'],
    structure: [
      // Linker pyloon
      { x: 440, y: 290, type: 'W' }, { x: 440, y: 250, type: 'W' }, { x: 440, y: 210, type: 'W' },
      { x: 480, y: 290, type: 'W' }, { x: 480, y: 250, type: 'W' }, { x: 480, y: 210, type: 'W' },
      // Brugdek (baksteenpatroon — elk blok overlapt pyloon + buurblok)
      { x: 460, y: 170, type: 'W' }, { x: 500, y: 170, type: 'W' }, { x: 540, y: 170, type: 'W' },
      { x: 580, y: 170, type: 'W' }, { x: 620, y: 170, type: 'W' },
      // Rechter pyloon
      { x: 600, y: 290, type: 'W' }, { x: 600, y: 250, type: 'W' }, { x: 600, y: 210, type: 'W' },
      { x: 640, y: 290, type: 'W' }, { x: 640, y: 250, type: 'W' }, { x: 640, y: 210, type: 'W' },
    ],
    enemies: [
      { type: 'grunt', x: 460, y: 130 },
      { type: 'grunt', x: 540, y: 130 },
      { type: 'grunt', x: 620, y: 130 },
    ],
    bonusDino: null,
    par: 1700,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 4 ─────────────────────────────────────────────────────────────
  // Piramide in baksteenpatroon: elk blok in rij n overlapt twee blokken in rij n-1.
  {
    id: 4,
    world: 1,
    name: 'De Piramide',
    dinoIds: ['rocky', 'dash', 'chomp'],
    structure: [
      // Basis — 5 blokken breed
      { x: 440, y: 290, type: 'W' }, { x: 480, y: 290, type: 'W' }, { x: 520, y: 290, type: 'W' },
      { x: 560, y: 290, type: 'W' }, { x: 600, y: 290, type: 'W' },
      // Rij 2 — 4 blokken (verschoven 20 px)
      { x: 460, y: 250, type: 'W' }, { x: 500, y: 250, type: 'W' },
      { x: 540, y: 250, type: 'W' }, { x: 580, y: 250, type: 'W' },
      // Rij 3 — 3 blokken
      { x: 480, y: 210, type: 'W' }, { x: 520, y: 210, type: 'W' }, { x: 560, y: 210, type: 'W' },
      // Rij 4 — 2 blokken
      { x: 500, y: 170, type: 'W' }, { x: 540, y: 170, type: 'W' },
      // Top
      { x: 520, y: 130, type: 'W' },
    ],
    enemies: [
      { type: 'grunt', x: 480, y: 170 },
      { type: 'grunt', x: 540, y: 130 },
      { type: 'grunt', x: 520, y: 90 },
    ],
    bonusDino: null,
    par: 2450,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 5 ─────────────────────────────────────────────────────────────
  // Twee torens met TNT-val ertussen — raak de TNT en alles valt!
  {
    id: 5,
    world: 1,
    name: 'TNT Valkuil',
    dinoIds: ['rocky', 'dash', 'chomp'],
    structure: [
      // Linker toren (2 kolommen, 4 hoog)
      { x: 440, y: 290, type: 'W' }, { x: 440, y: 250, type: 'W' },
      { x: 440, y: 210, type: 'W' }, { x: 440, y: 170, type: 'W' },
      { x: 480, y: 290, type: 'W' }, { x: 480, y: 250, type: 'W' },
      { x: 480, y: 210, type: 'W' }, { x: 480, y: 170, type: 'W' },
      // TNT-val tussen de torens
      { x: 520, y: 290, type: 'X' },
      { x: 560, y: 290, type: 'X' },
      // Glazen wacht-wand boven de TNT
      { x: 520, y: 250, type: 'G' },
      { x: 560, y: 250, type: 'G' },
      // Rechter toren (2 kolommen, 4 hoog)
      { x: 600, y: 290, type: 'W' }, { x: 600, y: 250, type: 'W' },
      { x: 600, y: 210, type: 'W' }, { x: 600, y: 170, type: 'W' },
      { x: 640, y: 290, type: 'W' }, { x: 640, y: 250, type: 'W' },
      { x: 640, y: 210, type: 'W' }, { x: 640, y: 170, type: 'W' },
    ],
    enemies: [
      { type: 'grunt', x: 440, y: 130 },
      { type: 'grunt', x: 540, y: 250 },
      { type: 'grunt', x: 640, y: 130 },
    ],
    bonusDino: null,
    par: 2650,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 6 ─────────────────────────────────────────────────────────────
  // Ruïnetrap omhoog — vijanden bewaken elke trede
  {
    id: 6,
    world: 1,
    name: 'Ruïne Trap',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky'],
    structure: [
      { x: 430, y: 290, type: 'W' },
      { x: 470, y: 290, type: 'W' }, { x: 470, y: 250, type: 'W' },
      { x: 510, y: 290, type: 'W' }, { x: 510, y: 250, type: 'W' }, { x: 510, y: 210, type: 'W' },
      { x: 550, y: 290, type: 'W' }, { x: 550, y: 250, type: 'W' },
      { x: 550, y: 210, type: 'W' }, { x: 550, y: 170, type: 'W' },
      { x: 590, y: 290, type: 'W' }, { x: 590, y: 250, type: 'W' },
      { x: 590, y: 210, type: 'W' }, { x: 590, y: 170, type: 'W' }, { x: 590, y: 130, type: 'W' },
      // Glazen balustrade langs de trap
      { x: 450, y: 250, type: 'G' },
      { x: 490, y: 210, type: 'G' },
      { x: 530, y: 170, type: 'G' },
      { x: 570, y: 130, type: 'G' },
    ],
    enemies: [
      { type: 'grunt', x: 430, y: 250 },
      { type: 'grunt', x: 470, y: 210 },
      { type: 'grunt', x: 510, y: 170 },
      { type: 'grunt', x: 550, y: 130 },
      { type: 'grunt', x: 590, y: 90 },
    ],
    bonusDino: null,
    par: 3550,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 7 ─────────────────────────────────────────────────────────────
  // Glazen tempel: vier kolommen (glas buiten, hout binnen) + piramidedak
  {
    id: 7,
    world: 1,
    name: 'Glazen Tempel',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky'],
    structure: [
      // Vier kolommen
      { x: 460, y: 290, type: 'G' }, { x: 460, y: 250, type: 'G' },
      { x: 460, y: 210, type: 'G' }, { x: 460, y: 170, type: 'G' },
      { x: 500, y: 290, type: 'W' }, { x: 500, y: 250, type: 'W' },
      { x: 500, y: 210, type: 'W' }, { x: 500, y: 170, type: 'W' },
      { x: 540, y: 290, type: 'W' }, { x: 540, y: 250, type: 'W' },
      { x: 540, y: 210, type: 'W' }, { x: 540, y: 170, type: 'W' },
      { x: 580, y: 290, type: 'G' }, { x: 580, y: 250, type: 'G' },
      { x: 580, y: 210, type: 'G' }, { x: 580, y: 170, type: 'G' },
      // Dakrand (rust op kolomtoppen)
      { x: 460, y: 130, type: 'W' }, { x: 500, y: 130, type: 'W' },
      { x: 540, y: 130, type: 'W' }, { x: 580, y: 130, type: 'W' },
      // Piramidedak — baksteenpatroon
      { x: 480, y: 90, type: 'W' }, { x: 520, y: 90, type: 'W' }, { x: 560, y: 90, type: 'W' },
      { x: 500, y: 50, type: 'W' }, { x: 540, y: 50, type: 'W' },
      { x: 520, y: 10, type: 'W' },
    ],
    enemies: [
      { type: 'shieldback', x: 520, y: 290 },
      { type: 'grunt',      x: 460, y: 90 },
      { type: 'grunt',      x: 580, y: 90 },
      { type: 'grunt',      x: 520, y: -30  },
      { type: 'grunt',      x: 520, y: -30  },
    ],
    bonusDino: null,
    par: 3850,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 8 ─────────────────────────────────────────────────────────────
  // Houten kasteel: twee torens + verbindende muur + TNT in de poortopening
  {
    id: 8,
    world: 1,
    name: 'Houten Burcht',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix'],
    structure: [
      // Linker toren (2 kolommen × 5 hoog)
      { x: 420, y: 290, type: 'W' }, { x: 420, y: 250, type: 'W' },
      { x: 420, y: 210, type: 'W' }, { x: 420, y: 170, type: 'W' }, { x: 420, y: 130, type: 'W' },
      { x: 460, y: 290, type: 'W' }, { x: 460, y: 250, type: 'W' },
      { x: 460, y: 210, type: 'W' }, { x: 460, y: 170, type: 'W' }, { x: 460, y: 130, type: 'W' },
      // Verbindende muur (2 hoog) — poortopening daarboven
      { x: 500, y: 290, type: 'W' }, { x: 500, y: 250, type: 'W' },
      { x: 540, y: 290, type: 'W' }, { x: 540, y: 250, type: 'W' },
      { x: 580, y: 290, type: 'W' }, { x: 580, y: 250, type: 'W' },
      // TNT in de poortopening
      { x: 520, y: 210, type: 'X' },
      // Rechter toren (2 kolommen × 5 hoog)
      { x: 620, y: 290, type: 'W' }, { x: 620, y: 250, type: 'W' },
      { x: 620, y: 210, type: 'W' }, { x: 620, y: 170, type: 'W' }, { x: 620, y: 130, type: 'W' },
      { x: 660, y: 290, type: 'W' }, { x: 660, y: 250, type: 'W' },
      { x: 660, y: 210, type: 'W' }, { x: 660, y: 170, type: 'W' }, { x: 660, y: 130, type: 'W' },
      // Kantelen boven torens
      { x: 420, y: 90, type: 'W' }, { x: 460, y: 90, type: 'W' },
      { x: 620, y: 90, type: 'W' }, { x: 660, y: 90, type: 'W' },
    ],
    enemies: [
      { type: 'grunt',      x: 420, y: 50  },
      { type: 'grunt',      x: 460, y: 50  },
      { type: 'shieldback', x: 540, y: 210 },
      { type: 'grunt',      x: 620, y: 50  },
      { type: 'grunt',      x: 660, y: 50  },
    ],
    bonusDino: null,
    par: 4950,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 9 ─────────────────────────────────────────────────────────────
  // Labyrint: drie gescheiden structuren met glas- en TNT-vallen
  {
    id: 9,
    world: 1,
    name: 'Het Labyrint',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix'],
    structure: [
      // Linker L-sectie
      { x: 420, y: 290, type: 'W' }, { x: 420, y: 250, type: 'W' },
      { x: 420, y: 210, type: 'W' }, { x: 420, y: 170, type: 'W' },
      { x: 460, y: 290, type: 'W' },
      { x: 460, y: 250, type: 'G' },
      { x: 460, y: 210, type: 'G' },
      { x: 500, y: 290, type: 'W' }, { x: 500, y: 250, type: 'W' },
      { x: 500, y: 210, type: 'W' }, { x: 500, y: 170, type: 'W' },
      // Platform boven links
      { x: 440, y: 130, type: 'W' }, { x: 480, y: 130, type: 'W' },
      // Midden-TNT-val
      { x: 540, y: 290, type: 'X' }, { x: 580, y: 290, type: 'X' },
      { x: 540, y: 250, type: 'W' }, { x: 580, y: 250, type: 'W' },
      { x: 560, y: 210, type: 'W' },
      // Rechter pilaarsectie
      { x: 640, y: 290, type: 'W' }, { x: 640, y: 250, type: 'W' },
      { x: 640, y: 210, type: 'W' }, { x: 640, y: 170, type: 'W' }, { x: 640, y: 130, type: 'W' },
      { x: 680, y: 290, type: 'W' }, { x: 680, y: 250, type: 'W' }, { x: 680, y: 210, type: 'W' },
      { x: 720, y: 290, type: 'W' }, { x: 720, y: 250, type: 'W' },
      { x: 720, y: 210, type: 'W' }, { x: 720, y: 170, type: 'W' },
      // Glazen brug rechts
      { x: 660, y: 170, type: 'G' }, { x: 700, y: 170, type: 'G' },
    ],
    enemies: [
      { type: 'grunt',      x: 420, y: 130 },
      { type: 'grunt',      x: 480, y: 90 },
      { type: 'shieldback', x: 560, y: 170 },
      { type: 'grunt',      x: 640, y: 90 },
      { type: 'grunt',      x: 680, y: 170 },
      { type: 'shieldback', x: 720, y: 130 },
    ],
    bonusDino: null,
    par: 5150,
    background: 'jungle',
    isBoss: false,
  },

  // ── Niveau 10 — BAAS ─────────────────────────────────────────────────────
  // Junglekoning: traptempel met TNT-basis en de Tyrannokoning erin
  {
    id: 10,
    world: 1,
    name: 'Junglekoning',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix'],
    structure: [
      // Brede basis afwisselend W–X
      { x: 400, y: 290, type: 'W' }, { x: 440, y: 290, type: 'X' },
      { x: 480, y: 290, type: 'W' }, { x: 520, y: 290, type: 'X' },
      { x: 560, y: 290, type: 'W' }, { x: 600, y: 290, type: 'X' },
      { x: 640, y: 290, type: 'W' }, { x: 680, y: 290, type: 'X' },
      { x: 720, y: 290, type: 'W' },
      // Tempel niveau 2
      { x: 420, y: 250, type: 'W' }, { x: 460, y: 250, type: 'W' },
      { x: 500, y: 250, type: 'W' }, { x: 540, y: 250, type: 'W' },
      { x: 580, y: 250, type: 'W' }, { x: 620, y: 250, type: 'W' },
      { x: 660, y: 250, type: 'W' }, { x: 700, y: 250, type: 'W' },
      // Tempel niveau 3
      { x: 440, y: 210, type: 'W' }, { x: 480, y: 210, type: 'W' },
      { x: 520, y: 210, type: 'W' }, { x: 560, y: 210, type: 'W' },
      { x: 600, y: 210, type: 'W' }, { x: 640, y: 210, type: 'W' },
      { x: 680, y: 210, type: 'W' },
      // Tempel niveau 4 (glas flanken)
      { x: 460, y: 170, type: 'G' }, { x: 500, y: 170, type: 'W' },
      { x: 540, y: 170, type: 'W' }, { x: 580, y: 170, type: 'W' },
      { x: 620, y: 170, type: 'G' },
      // Tempel niveau 5
      { x: 480, y: 130, type: 'W' }, { x: 520, y: 130, type: 'W' },
      { x: 560, y: 130, type: 'W' }, { x: 600, y: 130, type: 'W' },
      // Kroon
      { x: 500, y: 90, type: 'W' }, { x: 540, y: 90, type: 'W' }, { x: 580, y: 90, type: 'W' },
      { x: 520, y: 50, type: 'G' }, { x: 560, y: 50, type: 'G' },
      { x: 540, y: 10, type: 'W' },
    ],
    enemies: [
      { type: 'boss_tyranno_king', x: 560, y: 250 },
      { type: 'grunt',             x: 420, y: 210 },
      { type: 'grunt',             x: 700, y: 210 },
      { type: 'shieldback',        x: 460, y: 130 },
      { type: 'shieldback',        x: 620, y: 130 },
      { type: 'grunt',             x: 540, y: -30  },
      { type: 'grunt',             x: 540, y: -30  },
    ],
    bonusDino: 'bubba',
    par: 7050,
    background: 'jungle',
    isBoss: true,
  },

  /* ══════════════════════════════════════════════════════════════════════════
     WERELD 2 — STEEN STAD  (niveaus 11–20)
     Materialen: S, W, G, X   |   Vijanden: grunt, shieldback, helmet
     Achtergrond: 'city'
  ════════════════════════════════════════════════════════════════════════════ */

  // ── Niveau 11 ────────────────────────────────────────────────────────────
  // Solide stenen muur: 4 breed × 4 hoog, houten binnenkern
  {
    id: 11,
    world: 2,
    name: 'Stenen Muren',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix'],
    structure: [
      { x: 480, y: 290, type: 'S' }, { x: 520, y: 290, type: 'S' },
      { x: 560, y: 290, type: 'S' }, { x: 600, y: 290, type: 'S' },
      { x: 480, y: 250, type: 'S' }, { x: 520, y: 250, type: 'W' },
      { x: 560, y: 250, type: 'W' }, { x: 600, y: 250, type: 'S' },
      { x: 480, y: 210, type: 'S' }, { x: 520, y: 210, type: 'W' },
      { x: 560, y: 210, type: 'W' }, { x: 600, y: 210, type: 'S' },
      { x: 480, y: 170, type: 'S' }, { x: 520, y: 170, type: 'S' },
      { x: 560, y: 170, type: 'S' }, { x: 600, y: 170, type: 'S' },
    ],
    enemies: [
      { type: 'grunt',      x: 520, y: 130 },
      { type: 'shieldback', x: 520, y: 130 },
      { type: 'grunt',      x: 560, y: 130 },
    ],
    bonusDino: null,
    par: 4650,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 12 ────────────────────────────────────────────────────────────
  // Dubbele stadspoort: twee stenen bogen naast elkaar
  {
    id: 12,
    world: 2,
    name: 'Dubbele Poort',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix'],
    structure: [
      // Linker boog
      { x: 440, y: 290, type: 'S' }, { x: 440, y: 250, type: 'S' }, { x: 440, y: 210, type: 'S' },
      { x: 480, y: 290, type: 'W' },
      { x: 520, y: 290, type: 'S' }, { x: 520, y: 250, type: 'S' }, { x: 520, y: 210, type: 'S' },
      { x: 460, y: 170, type: 'S' }, { x: 500, y: 170, type: 'S' },
      // Middenpijler
      { x: 560, y: 290, type: 'S' }, { x: 560, y: 250, type: 'S' },
      { x: 560, y: 210, type: 'S' }, { x: 560, y: 170, type: 'S' },
      // Rechter boog
      { x: 600, y: 290, type: 'W' },
      { x: 640, y: 290, type: 'S' }, { x: 640, y: 250, type: 'S' }, { x: 640, y: 210, type: 'S' },
      { x: 580, y: 170, type: 'S' }, { x: 620, y: 170, type: 'S' },
      // Kantelen
      { x: 440, y: 130, type: 'S' }, { x: 480, y: 130, type: 'W' },
      { x: 560, y: 130, type: 'S' },
      { x: 600, y: 130, type: 'W' }, { x: 640, y: 130, type: 'S' },
    ],
    enemies: [
      { type: 'grunt',      x: 480, y: 250 },
      { type: 'shieldback', x: 560, y: 90 },
      { type: 'grunt',      x: 600, y: 250 },
      { type: 'helmet',     x: 560, y: 90 },
    ],
    bonusDino: null,
    par: 5400,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 13 ────────────────────────────────────────────────────────────
  // Schuttersnest: slanke stenen wachttoren 7 hoog + uitkijkplatform
  {
    id: 13,
    world: 2,
    name: 'Schuttersnest',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp'],
    structure: [
      // Brede basis (3 kolommen × 2 hoog)
      { x: 480, y: 290, type: 'S' }, { x: 520, y: 290, type: 'S' }, { x: 560, y: 290, type: 'S' },
      { x: 480, y: 250, type: 'S' }, { x: 520, y: 250, type: 'S' }, { x: 560, y: 250, type: 'S' },
      // Smalle torenschacht (2 kolommen)
      { x: 500, y: 210, type: 'S' }, { x: 540, y: 210, type: 'S' },
      { x: 500, y: 170, type: 'S' }, { x: 540, y: 170, type: 'S' },
      { x: 500, y: 130, type: 'S' }, { x: 540, y: 130, type: 'S' },
      { x: 500, y: 90,  type: 'S' }, { x: 540, y: 90,  type: 'S' },
      // Uitkijkplatform
      { x: 480, y: 50, type: 'W' }, { x: 520, y: 50, type: 'W' }, { x: 560, y: 50, type: 'W' },
      // Kantelen
      { x: 480, y: 10, type: 'S' }, { x: 560, y: 10, type: 'S' },
    ],
    enemies: [
      { type: 'grunt',  x: 480, y: 210 },
      { type: 'grunt',  x: 560, y: -30 },
      { type: 'helmet', x: 520, y: 10  },
      { type: 'grunt',  x: 480, y: -30  },
    ],
    bonusDino: null,
    par: 5750,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 14 ────────────────────────────────────────────────────────────
  // Versterkte basis: stalen buitenwanden, houten kern, glazen ramen, TNT op dak
  {
    id: 14,
    world: 2,
    name: 'Versterkte Basis',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp'],
    structure: [
      // Buitenwanden steen
      { x: 420, y: 290, type: 'S' }, { x: 420, y: 250, type: 'S' },
      { x: 420, y: 210, type: 'S' }, { x: 420, y: 170, type: 'S' },
      { x: 460, y: 290, type: 'S' }, { x: 460, y: 250, type: 'W' },
      { x: 460, y: 210, type: 'G' }, { x: 460, y: 170, type: 'S' },
      { x: 500, y: 290, type: 'W' }, { x: 500, y: 250, type: 'W' },
      { x: 500, y: 210, type: 'W' }, { x: 500, y: 170, type: 'W' },
      { x: 540, y: 290, type: 'W' }, { x: 540, y: 250, type: 'W' },
      { x: 540, y: 210, type: 'W' }, { x: 540, y: 170, type: 'W' },
      { x: 580, y: 290, type: 'S' }, { x: 580, y: 250, type: 'W' },
      { x: 580, y: 210, type: 'G' }, { x: 580, y: 170, type: 'S' },
      { x: 620, y: 290, type: 'S' }, { x: 620, y: 250, type: 'S' },
      { x: 620, y: 210, type: 'S' }, { x: 620, y: 170, type: 'S' },
      // Dak (steen)
      { x: 420, y: 130, type: 'S' }, { x: 460, y: 130, type: 'S' },
      { x: 500, y: 130, type: 'S' }, { x: 540, y: 130, type: 'S' },
      { x: 580, y: 130, type: 'S' }, { x: 620, y: 130, type: 'S' },
      // TNT op dak
      { x: 480, y: 90, type: 'X' }, { x: 560, y: 90, type: 'X' },
    ],
    enemies: [
      { type: 'grunt',      x: 500, y: 90 },
      { type: 'grunt',      x: 540, y: 90 },
      { type: 'helmet',     x: 520, y: 130 },
      { type: 'shieldback', x: 480, y: 50  },
      { type: 'grunt',      x: 560, y: 50  },
    ],
    bonusDino: null,
    par: 6550,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 15 ────────────────────────────────────────────────────────────
  // Stenen brug met centrale TNT-pijler
  {
    id: 15,
    world: 2,
    name: 'Stenen Brug',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt'],
    structure: [
      // Linker oever
      { x: 420, y: 290, type: 'S' }, { x: 420, y: 250, type: 'S' }, { x: 420, y: 210, type: 'S' },
      { x: 460, y: 290, type: 'S' }, { x: 460, y: 250, type: 'S' }, { x: 460, y: 210, type: 'S' },
      // Brugdek links
      { x: 440, y: 170, type: 'W' }, { x: 480, y: 170, type: 'W' },
      // Centrale TNT-pijler
      { x: 520, y: 290, type: 'S' }, { x: 520, y: 250, type: 'X' },
      { x: 520, y: 210, type: 'S' }, { x: 520, y: 170, type: 'S' },
      // Brugdek rechts
      { x: 560, y: 170, type: 'W' }, { x: 600, y: 170, type: 'W' },
      // Rechter oever
      { x: 580, y: 290, type: 'S' }, { x: 580, y: 250, type: 'S' }, { x: 580, y: 210, type: 'S' },
      { x: 620, y: 290, type: 'S' }, { x: 620, y: 250, type: 'S' }, { x: 620, y: 210, type: 'S' },
      // Wacht-platform boven pijler
      { x: 500, y: 130, type: 'W' }, { x: 540, y: 130, type: 'W' },
    ],
    enemies: [
      { type: 'shieldback', x: 440, y: 130 },
      { type: 'grunt',      x: 520, y: 130 },
      { type: 'shieldback', x: 600, y: 130 },
      { type: 'helmet',     x: 520, y: 130 },
    ],
    bonusDino: 'pim',
    par: 6800,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 16 ────────────────────────────────────────────────────────────
  // Schildformatie: afwisselende lagen steen–hout, 5 hoog, TNT-punt boven
  {
    id: 16,
    world: 2,
    name: 'Schildformatie',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt'],
    structure: [
      // Basis steen (6 breed)
      { x: 440, y: 290, type: 'S' }, { x: 480, y: 290, type: 'S' }, { x: 520, y: 290, type: 'S' },
      { x: 560, y: 290, type: 'S' }, { x: 600, y: 290, type: 'S' }, { x: 640, y: 290, type: 'S' },
      // Hout-laag
      { x: 440, y: 250, type: 'W' }, { x: 480, y: 250, type: 'W' }, { x: 520, y: 250, type: 'W' },
      { x: 560, y: 250, type: 'W' }, { x: 600, y: 250, type: 'W' }, { x: 640, y: 250, type: 'W' },
      // Steen-laag (smaller)
      { x: 460, y: 210, type: 'S' }, { x: 500, y: 210, type: 'S' },
      { x: 540, y: 210, type: 'S' }, { x: 580, y: 210, type: 'S' },
      // Hout-laag
      { x: 460, y: 170, type: 'W' }, { x: 500, y: 170, type: 'W' },
      { x: 540, y: 170, type: 'W' }, { x: 580, y: 170, type: 'W' },
      // Steen top
      { x: 480, y: 130, type: 'S' }, { x: 520, y: 130, type: 'S' }, { x: 560, y: 130, type: 'S' },
      // TNT-punt
      { x: 520, y: 90, type: 'X' },
    ],
    enemies: [
      { type: 'grunt',      x: 440, y: 210 },
      { type: 'shieldback', x: 520, y: 50 },
      { type: 'grunt',      x: 640, y: 210 },
      { type: 'shieldback', x: 500, y: 130 },
      { type: 'grunt',      x: 560, y: 170 },
      { type: 'helmet',     x: 520, y: 50  },
    ],
    bonusDino: null,
    par: 7000,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 17 ────────────────────────────────────────────────────────────
  // Stadstoren: 7-hoge centrale toren + lagere zijuitkijkposten
  {
    id: 17,
    world: 2,
    name: 'Stadstoren',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'pim'],
    structure: [
      // Centrale toren (2 kolommen × 7 hoog)
      { x: 520, y: 290, type: 'S' }, { x: 560, y: 290, type: 'S' },
      { x: 520, y: 250, type: 'S' }, { x: 560, y: 250, type: 'S' },
      { x: 520, y: 210, type: 'S' }, { x: 560, y: 210, type: 'S' },
      { x: 520, y: 170, type: 'S' }, { x: 560, y: 170, type: 'S' },
      { x: 520, y: 130, type: 'S' }, { x: 560, y: 130, type: 'S' },
      { x: 520, y: 90,  type: 'S' }, { x: 560, y: 90,  type: 'S' },
      { x: 520, y: 50,  type: 'S' }, { x: 560, y: 50,  type: 'S' },
      { x: 520, y: 10,  type: 'W' }, { x: 560, y: 10,  type: 'W' },
      // Linker uitkijkpost (3 hoog)
      { x: 440, y: 290, type: 'S' }, { x: 440, y: 250, type: 'S' }, { x: 440, y: 210, type: 'S' },
      { x: 480, y: 290, type: 'W' }, { x: 480, y: 250, type: 'W' },
      { x: 440, y: 170, type: 'W' }, { x: 480, y: 170, type: 'W' },
      // Verbindingsbrug (glas)
      { x: 500, y: 170, type: 'G' },
      // Rechter uitkijkpost (3 hoog)
      { x: 600, y: 290, type: 'S' }, { x: 600, y: 250, type: 'S' }, { x: 600, y: 210, type: 'S' },
      { x: 640, y: 290, type: 'W' }, { x: 640, y: 250, type: 'W' },
      { x: 600, y: 170, type: 'W' }, { x: 640, y: 170, type: 'W' },
      { x: 580, y: 170, type: 'G' },
    ],
    enemies: [
      { type: 'grunt',      x: 440, y: 130 },
      { type: 'grunt',      x: 640, y: 130 },
      { type: 'helmet',     x: 540, y: 90  },
      { type: 'grunt',      x: 520, y: -30  },
      { type: 'shieldback', x: 560, y: -30  },
    ],
    bonusDino: null,
    par: 8200,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 18 ────────────────────────────────────────────────────────────
  // Twee verbonden stadsgebouwen met glazen gang en TNT-kluis
  {
    id: 18,
    world: 2,
    name: 'Gevallen Pijler',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'pim'],
    structure: [
      // Linker gebouw (2 kolommen × 5 hoog)
      { x: 420, y: 290, type: 'S' }, { x: 460, y: 290, type: 'S' },
      { x: 420, y: 250, type: 'S' }, { x: 460, y: 250, type: 'W' },
      { x: 420, y: 210, type: 'S' }, { x: 460, y: 210, type: 'W' },
      { x: 420, y: 170, type: 'S' }, { x: 460, y: 170, type: 'S' },
      { x: 420, y: 130, type: 'S' }, { x: 460, y: 130, type: 'S' },
      // Glazen verbindingsgang
      { x: 500, y: 290, type: 'W' }, { x: 540, y: 290, type: 'W' },
      { x: 500, y: 250, type: 'G' }, { x: 540, y: 250, type: 'G' },
      // TNT boven de gang
      { x: 520, y: 210, type: 'X' },
      // Rechter gebouw (2 kolommen × 6 hoog)
      { x: 580, y: 290, type: 'S' }, { x: 620, y: 290, type: 'S' },
      { x: 580, y: 250, type: 'W' }, { x: 620, y: 250, type: 'S' },
      { x: 580, y: 210, type: 'W' }, { x: 620, y: 210, type: 'S' },
      { x: 580, y: 170, type: 'S' }, { x: 620, y: 170, type: 'S' },
      { x: 580, y: 130, type: 'S' }, { x: 620, y: 130, type: 'S' },
      { x: 580, y: 90,  type: 'S' }, { x: 620, y: 90,  type: 'S' },
      // Dak-uitbreiding links
      { x: 440, y: 90,  type: 'W' }, { x: 480, y: 90,  type: 'W' },
    ],
    enemies: [
      { type: 'grunt',      x: 420, y: 90 },
      { type: 'helmet',     x: 460, y: 90 },
      { type: 'grunt',      x: 520, y: 170 },
      { type: 'shieldback', x: 580, y: 50  },
      { type: 'grunt',      x: 620, y: 50  },
      { type: 'helmet',     x: 440, y: 50  },
    ],
    bonusDino: null,
    par: 8150,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 19 ────────────────────────────────────────────────────────────
  // Stadsvesting: getrapte stenen burcht, glas + TNT-val halverwege
  {
    id: 19,
    world: 2,
    name: 'Stadsvesting',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'pim'],
    structure: [
      // Brede fundering
      { x: 400, y: 290, type: 'S' }, { x: 440, y: 290, type: 'S' },
      { x: 480, y: 290, type: 'S' }, { x: 520, y: 290, type: 'S' },
      { x: 560, y: 290, type: 'S' }, { x: 600, y: 290, type: 'S' },
      { x: 640, y: 290, type: 'S' }, { x: 680, y: 290, type: 'S' },
      // Niveau 2
      { x: 420, y: 250, type: 'S' }, { x: 460, y: 250, type: 'W' },
      { x: 500, y: 250, type: 'W' }, { x: 540, y: 250, type: 'W' },
      { x: 580, y: 250, type: 'W' }, { x: 620, y: 250, type: 'W' },
      { x: 660, y: 250, type: 'S' },
      // Niveau 3 (glas flanken)
      { x: 440, y: 210, type: 'S' }, { x: 480, y: 210, type: 'G' },
      { x: 520, y: 210, type: 'G' }, { x: 560, y: 210, type: 'G' },
      { x: 600, y: 210, type: 'G' }, { x: 640, y: 210, type: 'S' },
      // Niveau 4 — TNT midden
      { x: 460, y: 170, type: 'S' }, { x: 500, y: 170, type: 'S' },
      { x: 540, y: 170, type: 'X' }, { x: 580, y: 170, type: 'S' },
      { x: 620, y: 170, type: 'S' },
      // Niveau 5
      { x: 480, y: 130, type: 'S' }, { x: 520, y: 130, type: 'S' },
      { x: 560, y: 130, type: 'S' }, { x: 600, y: 130, type: 'S' },
      // Niveau 6
      { x: 500, y: 90, type: 'S' }, { x: 540, y: 90, type: 'S' }, { x: 580, y: 90, type: 'S' },
      // Top
      { x: 520, y: 50, type: 'W' }, { x: 560, y: 50, type: 'W' },
    ],
    enemies: [
      { type: 'grunt',      x: 400, y: 250 },
      { type: 'grunt',      x: 680, y: 250 },
      { type: 'shieldback', x: 460, y: 130 },
      { type: 'helmet',     x: 640, y: 250 },
      { type: 'grunt',      x: 520, y: 170 },
      { type: 'shieldback', x: 500, y: 130 },
      { type: 'grunt',      x: 540, y: 50  },
    ],
    bonusDino: null,
    par: 8650,
    background: 'city',
    isBoss: false,
  },

  // ── Niveau 20 — BAAS ─────────────────────────────────────────────────────
  // Steenkoning: massief stenen citadel — Gepantserde Ceratops wacht bovenin
  {
    id: 20,
    world: 2,
    name: 'Steenkoning',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'pim'],
    structure: [
      // Brede basis (9 breed, staal)
      { x: 380, y: 290, type: 'S' }, { x: 420, y: 290, type: 'S' }, { x: 460, y: 290, type: 'S' },
      { x: 500, y: 290, type: 'S' }, { x: 540, y: 290, type: 'S' }, { x: 580, y: 290, type: 'S' },
      { x: 620, y: 290, type: 'S' }, { x: 660, y: 290, type: 'S' }, { x: 700, y: 290, type: 'S' },
      // Niveau 2 (7 breed)
      { x: 400, y: 250, type: 'S' }, { x: 440, y: 250, type: 'G' }, { x: 480, y: 250, type: 'S' },
      { x: 520, y: 250, type: 'S' }, { x: 560, y: 250, type: 'S' }, { x: 600, y: 250, type: 'G' },
      { x: 640, y: 250, type: 'S' },
      // TNT-laag (niveau 3)
      { x: 420, y: 210, type: 'S' }, { x: 460, y: 210, type: 'X' }, { x: 500, y: 210, type: 'S' },
      { x: 540, y: 210, type: 'X' }, { x: 580, y: 210, type: 'S' }, { x: 620, y: 210, type: 'X' },
      { x: 660, y: 210, type: 'S' },
      // Niveau 4
      { x: 440, y: 170, type: 'S' }, { x: 480, y: 170, type: 'S' },
      { x: 520, y: 170, type: 'S' }, { x: 560, y: 170, type: 'S' }, { x: 600, y: 170, type: 'S' },
      // Niveau 5
      { x: 460, y: 130, type: 'S' }, { x: 500, y: 130, type: 'S' },
      { x: 540, y: 130, type: 'S' }, { x: 580, y: 130, type: 'S' },
      // Niveau 6 — baas-etage
      { x: 480, y: 90, type: 'W' }, { x: 520, y: 90, type: 'S' },
      { x: 560, y: 90, type: 'S' }, { x: 600, y: 90, type: 'W' },
      // Centrale kroon
      { x: 500, y: 50, type: 'S' }, { x: 540, y: 50, type: 'S' },
      { x: 520, y: 10, type: 'S' },
    ],
    enemies: [
      { type: 'boss_armored_ceratops', x: 540, y: 170 },
      { type: 'grunt',                 x: 380, y: 250 },
      { type: 'grunt',                 x: 700, y: 250 },
      { type: 'shieldback',            x: 440, y: 130 },
      { type: 'shieldback',            x: 640, y: 210 },
      { type: 'helmet',                x: 480, y: 50  },
      { type: 'helmet',                x: 600, y: 50  },
      { type: 'grunt',                 x: 520, y: -30  },
    ],
    bonusDino: 'brons',
    par: 10750,
    background: 'city',
    isBoss: true,
  },

  /* ══════════════════════════════════════════════════════════════════════════
     WERELD 3 — STALEN BURCHT  (niveaus 21–30)
     Materialen: T, S, W, X, G   |   Vijanden: grunt, helmet, shieldback, bone
     Achtergrond: 'fortress'
  ════════════════════════════════════════════════════════════════════════════ */

  // ── Niveau 21 ────────────────────────────────────────────────────────────
  // Stalen kooi: staal omheen, glas binnenin — moeilijk door te dringen
  {
    id: 21,
    world: 3,
    name: 'Stalen Kooi',
    dinoIds: ['rocky', 'chomp', 'trix', 'stomp', 'bolt', 'bubba'],
    structure: [
      { x: 460, y: 290, type: 'T' }, { x: 460, y: 250, type: 'T' },
      { x: 460, y: 210, type: 'T' }, { x: 460, y: 170, type: 'T' },
      { x: 500, y: 290, type: 'T' }, { x: 500, y: 250, type: 'G' },
      { x: 500, y: 210, type: 'G' }, { x: 500, y: 170, type: 'T' },
      { x: 540, y: 290, type: 'T' }, { x: 540, y: 250, type: 'G' },
      { x: 540, y: 210, type: 'G' }, { x: 540, y: 170, type: 'T' },
      { x: 580, y: 290, type: 'T' }, { x: 580, y: 250, type: 'T' },
      { x: 580, y: 210, type: 'T' }, { x: 580, y: 170, type: 'T' },
      // Stalen dak
      { x: 460, y: 130, type: 'T' }, { x: 500, y: 130, type: 'T' },
      { x: 540, y: 130, type: 'T' }, { x: 580, y: 130, type: 'T' },
    ],
    enemies: [
      { type: 'grunt',  x: 520, y: 290 },
      { type: 'helmet', x: 520, y: 210 },
      { type: 'grunt',  x: 520, y: 130 },
    ],
    bonusDino: null,
    par: 6700,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 22 ────────────────────────────────────────────────────────────
  // Metalen bunker: stalen schil, TNT-kern, houten vulling
  {
    id: 22,
    world: 3,
    name: 'Metalen Bunker',
    dinoIds: ['rocky', 'chomp', 'trix', 'stomp', 'bolt', 'bubba', 'brons'],
    structure: [
      // Brede stalen basis
      { x: 440, y: 290, type: 'T' }, { x: 480, y: 290, type: 'T' }, { x: 520, y: 290, type: 'T' },
      { x: 560, y: 290, type: 'T' }, { x: 600, y: 290, type: 'T' }, { x: 640, y: 290, type: 'T' },
      // Zijwanden staal, TNT kern
      { x: 440, y: 250, type: 'T' }, { x: 480, y: 250, type: 'W' }, { x: 520, y: 250, type: 'X' },
      { x: 560, y: 250, type: 'X' }, { x: 600, y: 250, type: 'W' }, { x: 640, y: 250, type: 'T' },
      // Hoger niveau (houten vulling)
      { x: 440, y: 210, type: 'T' }, { x: 480, y: 210, type: 'W' }, { x: 520, y: 210, type: 'W' },
      { x: 560, y: 210, type: 'W' }, { x: 600, y: 210, type: 'W' }, { x: 640, y: 210, type: 'T' },
      // Stalen dak
      { x: 440, y: 170, type: 'T' }, { x: 480, y: 170, type: 'T' }, { x: 520, y: 170, type: 'T' },
      { x: 560, y: 170, type: 'T' }, { x: 600, y: 170, type: 'T' }, { x: 640, y: 170, type: 'T' },
      // Wachtposten
      { x: 460, y: 130, type: 'T' }, { x: 620, y: 130, type: 'T' },
    ],
    enemies: [
      { type: 'grunt',      x: 480, y: 130 },
      { type: 'grunt',      x: 600, y: 130 },
      { type: 'helmet',     x: 520, y: 130 },
      { type: 'shieldback', x: 460, y: 90 },
      { type: 'grunt',      x: 620, y: 90 },
    ],
    bonusDino: null,
    par: 8300,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 23 ────────────────────────────────────────────────────────────
  // Explosieve muren: stalen pilaren afgewisseld met TNT
  {
    id: 23,
    world: 3,
    name: 'Explosieve Muren',
    dinoIds: ['rocky', 'dash', 'chomp', 'trix', 'stomp', 'bolt', 'bubba', 'brons'],
    structure: [
      // Linker pilaar: T–X–T patroon
      { x: 440, y: 290, type: 'T' }, { x: 440, y: 250, type: 'X' },
      { x: 440, y: 210, type: 'T' }, { x: 440, y: 170, type: 'X' },
      { x: 440, y: 130, type: 'T' }, { x: 440, y: 90,  type: 'X' },
      // Midden-links pilaar (4 hoog)
      { x: 520, y: 290, type: 'T' }, { x: 520, y: 250, type: 'X' },
      { x: 520, y: 210, type: 'T' }, { x: 520, y: 170, type: 'T' },
      // Midden-rechts pilaar (4 hoog)
      { x: 600, y: 290, type: 'T' }, { x: 600, y: 250, type: 'X' },
      { x: 600, y: 210, type: 'T' }, { x: 600, y: 170, type: 'T' },
      // Rechter pilaar: T–X–T patroon
      { x: 680, y: 290, type: 'T' }, { x: 680, y: 250, type: 'X' },
      { x: 680, y: 210, type: 'T' }, { x: 680, y: 170, type: 'X' },
      { x: 680, y: 130, type: 'T' }, { x: 680, y: 90,  type: 'X' },
      // Horizontale steen-verbinding
      { x: 480, y: 170, type: 'S' }, { x: 480, y: 130, type: 'G' },
      { x: 560, y: 170, type: 'S' }, { x: 560, y: 130, type: 'G' },
      { x: 640, y: 170, type: 'S' },
    ],
    enemies: [
      { type: 'grunt',  x: 440, y: 50  },
      { type: 'helmet', x: 520, y: 130 },
      { type: 'helmet', x: 600, y: 130 },
      { type: 'grunt',  x: 680, y: 50  },
      { type: 'bone',   x: 560, y: 90 },
    ],
    bonusDino: null,
    par: 8750,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 24 ────────────────────────────────────────────────────────────
  // Dubbel bolwerk: twee verbonden stalen bastions met glasloopbrug
  {
    id: 24,
    world: 3,
    name: 'Dubbel Bolwerk',
    dinoIds: ['rocky', 'dash', 'chomp', 'trix', 'stomp', 'bolt', 'bubba', 'brons'],
    structure: [
      // Linker bastion
      { x: 400, y: 290, type: 'T' }, { x: 440, y: 290, type: 'T' },
      { x: 400, y: 250, type: 'T' }, { x: 440, y: 250, type: 'S' },
      { x: 400, y: 210, type: 'T' }, { x: 440, y: 210, type: 'S' },
      { x: 400, y: 170, type: 'T' }, { x: 440, y: 170, type: 'T' },
      { x: 400, y: 130, type: 'T' }, { x: 440, y: 130, type: 'T' },
      // Verbindingssectie
      { x: 480, y: 290, type: 'S' }, { x: 520, y: 290, type: 'X' }, { x: 560, y: 290, type: 'S' },
      { x: 480, y: 250, type: 'S' }, { x: 520, y: 250, type: 'S' }, { x: 560, y: 250, type: 'S' },
      { x: 480, y: 210, type: 'T' }, { x: 560, y: 210, type: 'T' },
      // Rechter bastion
      { x: 600, y: 290, type: 'T' }, { x: 640, y: 290, type: 'T' },
      { x: 600, y: 250, type: 'S' }, { x: 640, y: 250, type: 'T' },
      { x: 600, y: 210, type: 'S' }, { x: 640, y: 210, type: 'T' },
      { x: 600, y: 170, type: 'T' }, { x: 640, y: 170, type: 'T' },
      { x: 600, y: 130, type: 'T' }, { x: 640, y: 130, type: 'T' },
      // Glasloopbrug bovenin
      { x: 460, y: 90, type: 'T' }, { x: 500, y: 90, type: 'G' },
      { x: 540, y: 90, type: 'G' }, { x: 580, y: 90, type: 'T' },
    ],
    enemies: [
      { type: 'grunt',      x: 400, y: 90 },
      { type: 'helmet',     x: 440, y: 90 },
      { type: 'shieldback', x: 520, y: 210 },
      { type: 'helmet',     x: 600, y: 90 },
      { type: 'grunt',      x: 640, y: 90 },
      { type: 'bone',       x: 520, y: 90  },
    ],
    bonusDino: null,
    par: 10100,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 25 ────────────────────────────────────────────────────────────
  // Drie stalen torens van verschillende hoogte
  {
    id: 25,
    world: 3,
    name: 'Staaltorens',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'bubba', 'brons'],
    structure: [
      // Linker toren — 4 hoog
      { x: 420, y: 290, type: 'T' }, { x: 460, y: 290, type: 'T' },
      { x: 420, y: 250, type: 'T' }, { x: 460, y: 250, type: 'T' },
      { x: 420, y: 210, type: 'T' }, { x: 460, y: 210, type: 'T' },
      { x: 420, y: 170, type: 'T' }, { x: 460, y: 170, type: 'T' },
      { x: 440, y: 130, type: 'G' },
      // Midden toren — 7 hoog
      { x: 540, y: 290, type: 'T' }, { x: 580, y: 290, type: 'T' },
      { x: 540, y: 250, type: 'T' }, { x: 580, y: 250, type: 'T' },
      { x: 540, y: 210, type: 'X' }, { x: 580, y: 210, type: 'X' },
      { x: 540, y: 170, type: 'T' }, { x: 580, y: 170, type: 'T' },
      { x: 540, y: 130, type: 'T' }, { x: 580, y: 130, type: 'T' },
      { x: 540, y: 90,  type: 'T' }, { x: 580, y: 90,  type: 'T' },
      { x: 540, y: 50,  type: 'T' }, { x: 580, y: 50,  type: 'T' },
      { x: 560, y: 10,  type: 'G' },
      // Rechter toren — 5 hoog
      { x: 660, y: 290, type: 'T' }, { x: 700, y: 290, type: 'T' },
      { x: 660, y: 250, type: 'T' }, { x: 700, y: 250, type: 'T' },
      { x: 660, y: 210, type: 'T' }, { x: 700, y: 210, type: 'T' },
      { x: 660, y: 170, type: 'T' }, { x: 700, y: 170, type: 'T' },
      { x: 660, y: 130, type: 'T' }, { x: 700, y: 130, type: 'T' },
      { x: 680, y: 90,  type: 'G' },
    ],
    enemies: [
      { type: 'helmet', x: 440, y: 90 },
      { type: 'grunt',  x: 560, y: 90  },
      { type: 'bone',   x: 560, y: -30  },
      { type: 'helmet', x: 680, y: 50  },
      { type: 'grunt',  x: 420, y: 130 },
    ],
    bonusDino: null,
    par: 11550,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 26 ────────────────────────────────────────────────────────────
  // IJzeren gordijn: brede stalen muur met smalle doorgangen en sluipschutters
  {
    id: 26,
    world: 3,
    name: 'IJzeren Gordijn',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'bubba', 'pim', 'brons'],
    structure: [
      // Linker murensectie
      { x: 400, y: 290, type: 'T' }, { x: 400, y: 250, type: 'T' },
      { x: 400, y: 210, type: 'T' }, { x: 400, y: 170, type: 'T' },
      { x: 440, y: 290, type: 'T' }, { x: 440, y: 250, type: 'T' },
      { x: 440, y: 210, type: 'T' }, { x: 440, y: 170, type: 'T' },
      // Schietgat links (enkel basis + dak)
      { x: 480, y: 290, type: 'S' }, { x: 480, y: 170, type: 'T' },
      // Tweede murensectie
      { x: 520, y: 290, type: 'T' }, { x: 520, y: 250, type: 'T' },
      { x: 520, y: 210, type: 'T' }, { x: 520, y: 170, type: 'T' },
      { x: 560, y: 290, type: 'T' }, { x: 560, y: 250, type: 'X' },
      { x: 560, y: 210, type: 'T' }, { x: 560, y: 170, type: 'T' },
      // Schietgat midden
      { x: 600, y: 290, type: 'S' }, { x: 600, y: 170, type: 'T' },
      // Derde murensectie
      { x: 640, y: 290, type: 'T' }, { x: 640, y: 250, type: 'T' },
      { x: 640, y: 210, type: 'T' }, { x: 640, y: 170, type: 'T' },
      { x: 680, y: 290, type: 'T' }, { x: 680, y: 250, type: 'T' },
      { x: 680, y: 210, type: 'T' }, { x: 680, y: 170, type: 'T' },
      // Bovenste weergang
      { x: 400, y: 130, type: 'T' }, { x: 440, y: 130, type: 'T' },
      { x: 520, y: 130, type: 'T' }, { x: 560, y: 130, type: 'T' },
      { x: 640, y: 130, type: 'T' }, { x: 680, y: 130, type: 'T' },
    ],
    enemies: [
      { type: 'grunt',  x: 480, y: 250 },
      { type: 'grunt',  x: 600, y: 250 },
      { type: 'helmet', x: 400, y: 90 },
      { type: 'bone',   x: 520, y: 90 },
      { type: 'helmet', x: 640, y: 90 },
      { type: 'grunt',  x: 560, y: 90 },
      { type: 'bone',   x: 680, y: 90 },
    ],
    bonusDino: null,
    par: 12750,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 27 ────────────────────────────────────────────────────────────
  // Wapenopslagplaats: staal + glas + maximale TNT-lading
  {
    id: 27,
    world: 3,
    name: 'Wapenopslagplaats',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'bubba', 'pim', 'brons'],
    structure: [
      // Fundering (afwisselend S–T)
      { x: 420, y: 290, type: 'S' }, { x: 460, y: 290, type: 'T' }, { x: 500, y: 290, type: 'S' },
      { x: 540, y: 290, type: 'T' }, { x: 580, y: 290, type: 'S' }, { x: 620, y: 290, type: 'T' },
      { x: 660, y: 290, type: 'S' },
      // TNT-laag 1
      { x: 420, y: 250, type: 'X' }, { x: 460, y: 250, type: 'T' }, { x: 500, y: 250, type: 'X' },
      { x: 540, y: 250, type: 'T' }, { x: 580, y: 250, type: 'X' }, { x: 620, y: 250, type: 'T' },
      { x: 660, y: 250, type: 'X' },
      // Stalen scheidingswanden met glas
      { x: 440, y: 210, type: 'T' }, { x: 520, y: 210, type: 'T' }, { x: 600, y: 210, type: 'T' },
      { x: 480, y: 210, type: 'G' }, { x: 560, y: 210, type: 'G' }, { x: 640, y: 210, type: 'G' },
      // TNT-laag 2
      { x: 440, y: 170, type: 'X' }, { x: 480, y: 170, type: 'X' },
      { x: 560, y: 170, type: 'X' }, { x: 600, y: 170, type: 'X' },
      // Stalen afdekking
      { x: 460, y: 130, type: 'T' }, { x: 500, y: 130, type: 'T' },
      { x: 540, y: 130, type: 'T' }, { x: 580, y: 130, type: 'T' }, { x: 620, y: 130, type: 'T' },
      // Top
      { x: 500, y: 90, type: 'T' }, { x: 540, y: 90, type: 'T' }, { x: 580, y: 90, type: 'T' },
    ],
    enemies: [
      { type: 'helmet',     x: 460, y: 210 },
      { type: 'grunt',      x: 520, y: 170 },
      { type: 'bone',       x: 540, y: 50 },
      { type: 'bone',       x: 540, y: 50  },
      { type: 'helmet',     x: 580, y: 50  },
      { type: 'grunt',      x: 640, y: 170 },
      { type: 'shieldback', x: 500, y: 50 },
    ],
    bonusDino: null,
    par: 11550,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 28 ────────────────────────────────────────────────────────────
  // Laatste Linie: alle materialen tegelijk — brede getrapte mega-constructie
  {
    id: 28,
    world: 3,
    name: 'Laatste Linie',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'bubba', 'pim', 'brons'],
    structure: [
      // Basis (staal, 9 breed)
      { x: 380, y: 290, type: 'T' }, { x: 420, y: 290, type: 'T' }, { x: 460, y: 290, type: 'T' },
      { x: 500, y: 290, type: 'T' }, { x: 540, y: 290, type: 'T' }, { x: 580, y: 290, type: 'T' },
      { x: 620, y: 290, type: 'T' }, { x: 660, y: 290, type: 'T' }, { x: 700, y: 290, type: 'T' },
      // Laag 2 (steen + TNT kern)
      { x: 400, y: 250, type: 'S' }, { x: 440, y: 250, type: 'X' }, { x: 480, y: 250, type: 'S' },
      { x: 520, y: 250, type: 'X' }, { x: 560, y: 250, type: 'S' }, { x: 600, y: 250, type: 'X' },
      { x: 640, y: 250, type: 'S' }, { x: 680, y: 250, type: 'T' },
      // Laag 3 (gemengd T + W + G)
      { x: 420, y: 210, type: 'T' }, { x: 460, y: 210, type: 'W' }, { x: 500, y: 210, type: 'G' },
      { x: 540, y: 210, type: 'W' }, { x: 580, y: 210, type: 'G' }, { x: 620, y: 210, type: 'W' },
      { x: 660, y: 210, type: 'T' },
      // Laag 4 (T + S + X)
      { x: 440, y: 170, type: 'T' }, { x: 480, y: 170, type: 'S' }, { x: 520, y: 170, type: 'X' },
      { x: 560, y: 170, type: 'S' }, { x: 600, y: 170, type: 'X' }, { x: 640, y: 170, type: 'T' },
      // Laag 5
      { x: 460, y: 130, type: 'T' }, { x: 500, y: 130, type: 'T' },
      { x: 540, y: 130, type: 'T' }, { x: 580, y: 130, type: 'T' }, { x: 620, y: 130, type: 'T' },
      // Laag 6
      { x: 480, y: 90, type: 'T' }, { x: 520, y: 90, type: 'S' },
      { x: 560, y: 90, type: 'S' }, { x: 600, y: 90, type: 'T' },
      // Top
      { x: 500, y: 50, type: 'T' }, { x: 540, y: 50, type: 'G' }, { x: 580, y: 50, type: 'T' },
      { x: 520, y: 10, type: 'T' }, { x: 560, y: 10, type: 'T' },
    ],
    enemies: [
      { type: 'grunt',      x: 380, y: 250 },
      { type: 'grunt',      x: 700, y: 250 },
      { type: 'shieldback', x: 480, y: 50 },
      { type: 'shieldback', x: 600, y: 50 },
      { type: 'helmet',     x: 460, y: 90 },
      { type: 'bone',       x: 540, y: 170 },
      { type: 'helmet',     x: 540, y: 90 },
      { type: 'grunt',      x: 540, y: 10  },
      { type: 'bone',       x: 540, y: 10  },
    ],
    bonusDino: null,
    par: 13200,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 29 ────────────────────────────────────────────────────────────
  // Het Bolwerk: pre-eindbaas — twee vleugels + centrale 8-hoge toren
  {
    id: 29,
    world: 3,
    name: 'Het Bolwerk',
    dinoIds: ['rocky', 'dash', 'chomp', 'sky', 'trix', 'stomp', 'bolt', 'bubba', 'pim', 'brons'],
    structure: [
      // Linker vleugel
      { x: 360, y: 290, type: 'T' }, { x: 400, y: 290, type: 'T' },
      { x: 360, y: 250, type: 'T' }, { x: 400, y: 250, type: 'S' },
      { x: 360, y: 210, type: 'T' }, { x: 400, y: 210, type: 'S' },
      { x: 360, y: 170, type: 'T' }, { x: 400, y: 170, type: 'T' },
      { x: 360, y: 130, type: 'T' },
      // Verbinding links
      { x: 440, y: 290, type: 'S' }, { x: 440, y: 250, type: 'X' },
      { x: 440, y: 210, type: 'S' }, { x: 440, y: 170, type: 'G' },
      // Centrale toren (2 kolommen × 8 hoog)
      { x: 480, y: 290, type: 'T' }, { x: 520, y: 290, type: 'T' },
      { x: 480, y: 250, type: 'T' }, { x: 520, y: 250, type: 'T' },
      { x: 480, y: 210, type: 'X' }, { x: 520, y: 210, type: 'X' },
      { x: 480, y: 170, type: 'T' }, { x: 520, y: 170, type: 'T' },
      { x: 480, y: 130, type: 'T' }, { x: 520, y: 130, type: 'T' },
      { x: 480, y: 90,  type: 'T' }, { x: 520, y: 90,  type: 'T' },
      { x: 480, y: 50,  type: 'S' }, { x: 520, y: 50,  type: 'S' },
      { x: 500, y: 10,  type: 'T' },
      // Verbinding rechts
      { x: 560, y: 290, type: 'S' }, { x: 560, y: 250, type: 'X' },
      { x: 560, y: 210, type: 'S' }, { x: 560, y: 170, type: 'G' },
      // Rechter vleugel
      { x: 600, y: 290, type: 'T' }, { x: 640, y: 290, type: 'T' },
      { x: 600, y: 250, type: 'S' }, { x: 640, y: 250, type: 'T' },
      { x: 600, y: 210, type: 'S' }, { x: 640, y: 210, type: 'T' },
      { x: 600, y: 170, type: 'T' }, { x: 640, y: 170, type: 'T' },
      { x: 640, y: 130, type: 'T' },
      // Glazen loopbrug bovenin
      { x: 420, y: 90, type: 'G' }, { x: 460, y: 90, type: 'G' },
      { x: 540, y: 90, type: 'G' }, { x: 580, y: 90, type: 'G' },
    ],
    enemies: [
      { type: 'grunt',      x: 360, y: 90 },
      { type: 'shieldback', x: 440, y: 130 },
      { type: 'helmet',     x: 500, y: 90  },
      { type: 'bone',       x: 500, y: -30  },
      { type: 'helmet',     x: 560, y: 130 },
      { type: 'shieldback', x: 560, y: 130 },
      { type: 'grunt',      x: 640, y: 90 },
      { type: 'bone',       x: 420, y: 50  },
      { type: 'bone',       x: 580, y: 50  },
      { type: 'grunt',      x: 480, y: 10  },
    ],
    bonusDino: null,
    par: 13450,
    background: 'fortress',
    isBoss: false,
  },

  // ── Niveau 30 — EINDBAAS ─────────────────────────────────────────────────
  // Oertijdtiran: het ultieme fort — alle materialen, Mega Rex binnenin
  {
    id: 30,
    world: 3,
    name: 'Oertijdtiran',
    dinoIds: ['rocky', 'chomp', 'trix', 'stomp', 'bolt', 'bubba', 'brons'],
    structure: [
      // Massieve basis (10 breed, staal)
      { x: 340, y: 290, type: 'T' }, { x: 380, y: 290, type: 'T' }, { x: 420, y: 290, type: 'T' },
      { x: 460, y: 290, type: 'T' }, { x: 500, y: 290, type: 'T' }, { x: 540, y: 290, type: 'T' },
      { x: 580, y: 290, type: 'T' }, { x: 620, y: 290, type: 'T' }, { x: 660, y: 290, type: 'T' },
      { x: 700, y: 290, type: 'T' },
      // Laag 2 — TNT-kern
      { x: 360, y: 250, type: 'T' }, { x: 400, y: 250, type: 'X' }, { x: 440, y: 250, type: 'T' },
      { x: 480, y: 250, type: 'X' }, { x: 520, y: 250, type: 'T' }, { x: 560, y: 250, type: 'X' },
      { x: 600, y: 250, type: 'T' }, { x: 640, y: 250, type: 'X' }, { x: 680, y: 250, type: 'T' },
      // Laag 3 — steen + glas ramen
      { x: 380, y: 210, type: 'S' }, { x: 420, y: 210, type: 'G' }, { x: 460, y: 210, type: 'S' },
      { x: 500, y: 210, type: 'G' }, { x: 540, y: 210, type: 'S' }, { x: 580, y: 210, type: 'G' },
      { x: 620, y: 210, type: 'S' }, { x: 660, y: 210, type: 'G' }, { x: 700, y: 210, type: 'S' },
      // Laag 4 — staal
      { x: 400, y: 170, type: 'T' }, { x: 440, y: 170, type: 'T' }, { x: 480, y: 170, type: 'T' },
      { x: 520, y: 170, type: 'T' }, { x: 560, y: 170, type: 'T' }, { x: 600, y: 170, type: 'T' },
      { x: 640, y: 170, type: 'T' },
      // Laag 5 — steen + X
      { x: 420, y: 130, type: 'S' }, { x: 460, y: 130, type: 'X' }, { x: 500, y: 130, type: 'S' },
      { x: 540, y: 130, type: 'X' }, { x: 580, y: 130, type: 'S' }, { x: 620, y: 130, type: 'X' },
      { x: 660, y: 130, type: 'S' },
      // Laag 6 — staal
      { x: 440, y: 90, type: 'T' }, { x: 480, y: 90, type: 'T' },
      { x: 520, y: 90, type: 'T' }, { x: 560, y: 90, type: 'T' },
      { x: 600, y: 90, type: 'T' }, { x: 640, y: 90, type: 'T' },
      // Laag 7
      { x: 460, y: 50, type: 'T' }, { x: 500, y: 50, type: 'S' },
      { x: 540, y: 50, type: 'S' }, { x: 580, y: 50, type: 'T' },
      // Kroon van het kwaad
      { x: 480, y: 10, type: 'T' }, { x: 520, y: 10, type: 'T' }, { x: 560, y: 10, type: 'T' },
    ],
    enemies: [
      { type: 'boss_mega_rex', x: 540, y: 10 },
      { type: 'grunt',         x: 340, y: 250 },
      { type: 'grunt',         x: 700, y: 250 },
      { type: 'shieldback',    x: 400, y: 130 },
      { type: 'shieldback',    x: 680, y: 210 },
      { type: 'helmet',        x: 420, y: 90 },
      { type: 'helmet',        x: 660, y: 90 },
      { type: 'bone',          x: 460, y: 10 },
      { type: 'bone',          x: 620, y: 90 },
      { type: 'helmet',        x: 520, y: 50  },
      { type: 'grunt',         x: 520, y: -30  },
    ],
    bonusDino: 'pim',
    par: 14350,
    background: 'fortress',
    isBoss: true,
  },

]; // einde LEVELS


/* ─────────────────────────────────────────────────────────────────────────────
   HULPFUNCTIES  (exporteert op window)
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Geef het level-object terug voor het opgegeven id.
 * @param {number} id
 * @returns {Object|undefined}
 */
window.getLevelById = function getLevelById(id) {
  return window.LEVELS.find(l => l.id === id);
};

/**
 * Geef alle levels voor een gegeven wereld.
 * @param {number} world  1, 2 of 3
 * @returns {Object[]}
 */
window.getLevelsByWorld = function getLevelsByWorld(world) {
  return window.LEVELS.filter(l => l.world === world);
};

/**
 * Geef alle baas-niveaus terug.
 * @returns {Object[]}
 */
window.getBossLevels = function getBossLevels() {
  return window.LEVELS.filter(l => l.isBoss);
};

// Zelftestje in de console (alleen op localhost)
if (typeof console !== 'undefined' && window.location && window.location.hostname === 'localhost') {
  console.groupCollapsed('[levels.js] Niveaus geladen');
  console.log('Totaal:', window.LEVELS.length);
  console.log('Wereld 1:', window.getLevelsByWorld(1).length, 'niveaus');
  console.log('Wereld 2:', window.getLevelsByWorld(2).length, 'niveaus');
  console.log('Wereld 3:', window.getLevelsByWorld(3).length, 'niveaus');
  console.log('Bazen:', window.getBossLevels().map(l => l.id));
  console.groupEnd();
}
