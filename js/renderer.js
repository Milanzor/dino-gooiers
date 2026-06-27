/**
 * renderer.js — Dino Gooiers
 * Canvas renderer: world backgrounds, dino sprites, block damage, particles, UI.
 *
 * Dependencies (must be loaded first):
 *   engine.js  → window.Game  (DESIGN_WIDTH, DESIGN_HEIGHT)
 *   dinos.js   → window.DINO_ROSTER, window.TIRANNEN_TYPES, window.BOSS_DINOS
 *
 * Exposes: window.Renderer
 */

'use strict';

(function (global) {

  /* ──────────────────────────────────────────────────────────────────────────
     DESIGN CONSTANTS
     Use engine.js values when available; fall back to 1170 × 540.
  ────────────────────────────────────────────────────────────────────────── */

  var DW = (global.Game && global.Game.DESIGN_WIDTH)  || 1170;
  var DH = (global.Game && global.Game.DESIGN_HEIGHT) || 540;

  /* ──────────────────────────────────────────────────────────────────────────
     IMAGE CACHE
     HTMLImageElement instances keyed by dino / enemy id.
     Also exposed as window.DinoImages for compatibility with gameplay.js.
  ────────────────────────────────────────────────────────────────────────── */

  var _imgCache = {};

  function _loadImg(id, src) {
    if (_imgCache[id]) return _imgCache[id];
    var img = new Image();
    img.src = src;
    _imgCache[id] = img;
    return img;
  }

  function _preloadImages() {
    function load(arr) {
      if (!arr) return;
      arr.forEach(function (d) { _loadImg(d.id, d.svgDataURI); });
    }
    load(global.DINO_ROSTER);
    load(global.TIRANNEN_TYPES);
    load(global.BOSS_DINOS);
    global.DinoImages = _imgCache;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     COLOUR / DRAW UTILITIES
  ────────────────────────────────────────────────────────────────────────── */

  function _lighten(hex, amt) {
    if (!hex || hex[0] !== '#') return hex || '#888';
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    var c = function (v) { return Math.min(255, Math.round(v + 255 * amt)); };
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }

  function _darken(hex, amt) { return _lighten(hex, -amt); }

  function _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  function _shadow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function _noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     WORLD 1 — JUNGLE RUINS
  ────────────────────────────────────────────────────────────────────────── */

  function _drawJungle(ctx, t) {

    /* Sky: deep purple → mid purple → sunset orange at horizon */
    var sky = ctx.createLinearGradient(0, 0, 0, DH * 0.78);
    sky.addColorStop(0,    '#1a0e2e');
    sky.addColorStop(0.44, '#3a2050');
    sky.addColorStop(0.78, '#7a3020');
    sky.addColorStop(1.0,  '#c4602f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, DW, DH * 0.78);

    /* Animated haze clouds near horizon */
    ctx.save();
    [[210,65,185,42], [530,50,225,46], [830,72,165,38], [1085,58,205,50]].forEach(function (c, ci) {
      var cx = ((c[0] + t * 13) % (DW + 320)) - 160;
      var a  = ['rgba(255,155,70,0.11)', 'rgba(200,75,35,0.09)', 'rgba(255,195,90,0.07)', 'rgba(240,120,50,0.10)'][ci];
      ctx.fillStyle = a;
      ctx.beginPath(); ctx.ellipse(cx,        c[1],        c[2],        c[3],        0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx+c[2]*0.44, c[1]-c[3]*0.38, c[2]*0.58, c[3]*0.68, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* Hill layers — three depth passes */
    var hpts = [
      { col: '#2a1808', pts: [0,.70, 130,.52, 255,.62, 385,.44, 520,.58, 650,.40, 770,.55, 900,.42, 1040,.57, 1170,.48] },
      { col: '#1b2e10', pts: [0,.78, 105,.62, 235,.72, 355,.57, 485,.70, 615,.55, 735,.68, 865,.58, 995,.72, 1105,.60, 1170,.70] },
      { col: '#253818', pts: [0,.82,  80,.70, 200,.80, 325,.66, 445,.78, 565,.67, 685,.76, 805,.65, 925,.78, 1060,.70, 1170,.78] },
    ];
    hpts.forEach(function (l) {
      ctx.fillStyle = l.col;
      ctx.beginPath();
      ctx.moveTo(0, DH);
      for (var i = 0; i < l.pts.length; i += 2) ctx.lineTo(l.pts[i], l.pts[i+1] * DH);
      ctx.lineTo(DW, DH);
      ctx.closePath();
      ctx.fill();
    });

    /* Stone pillar silhouettes */
    ctx.fillStyle = '#12100a';
    [75, 175, 315, 755, 895, 1045].forEach(function (px) {
      var pw = 17 + (px % 11);
      var ph = 52 + (px % 78);
      var py = DH * 0.60 - ph;
      ctx.fillRect(px - pw/2,      py, pw, ph + DH * 0.2);   /* shaft  */
      ctx.fillRect(px - pw/2 - 5,  py, pw + 10, 9);           /* capital top */
      ctx.fillRect(px - pw/2 - 3,  py + 7, pw + 6, 5);        /* capital base */
      if (px % 3 === 0) ctx.fillRect(px - 3, py - 19, 6, 21); /* broken top   */
    });

    /* Palm trees right side */
    [DW * 0.82, DW * 0.90, DW * 0.96].forEach(function (tx, ti) {
      _palm(ctx, tx, DH * (0.66 + ti * 0.02));
    });

    /* Floating debris rocks */
    ctx.fillStyle = 'rgba(38,26,14,0.72)';
    [[0.30, 0.34, 13], [0.56, 0.27, 9], [0.73, 0.31, 16]].forEach(function (r, ri) {
      var rx = r[0] * DW;
      var ry = r[1] * DH + Math.sin(t * 0.75 + ri * 1.7) * 5;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(t * 0.09 + ri * 1.1);
      ctx.beginPath(); ctx.ellipse(0, 0, r[2] * 1.4, r[2], 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    /* Ground — dark earth */
    var gy = DH * 0.82;
    var gGrad = ctx.createLinearGradient(0, gy, 0, DH);
    gGrad.addColorStop(0,   '#5c3d2e');
    gGrad.addColorStop(0.3, '#4a2e1c');
    gGrad.addColorStop(1,   '#3d2b1f');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, gy, DW, DH - gy);

    /* Dirt texture clumps */
    ctx.fillStyle = 'rgba(28,16,6,0.38)';
    for (var gx = 0; gx < DW; gx += 36) {
      ctx.fillRect(gx, gy, 21 + (gx % 17), 2 + (gx % 4));
    }

    /* Ground edge glow */
    var eg = ctx.createLinearGradient(0, gy - 3, 0, gy + 5);
    eg.addColorStop(0, 'rgba(175,95,35,0.65)');
    eg.addColorStop(1, 'transparent');
    ctx.fillStyle = eg;
    ctx.fillRect(0, gy - 3, DW, 9);
  }

  function _palm(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#0d0d07';
    ctx.strokeStyle = '#0d1506';
    /* Trunk */
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x - 9, y - 38, x - 2, y - 78);
    ctx.quadraticCurveTo(x + 5, y - 80, x + 7, y - 78);
    ctx.quadraticCurveTo(x + 11, y - 38, x + 8, y);
    ctx.closePath();
    ctx.fill();
    /* Fronds */
    var fronds = [[-1.3,-0.9], [-0.7,-1.2], [0,-1.35], [0.8,-1.1], [1.35,-0.8], [0.6,-0.7], [-0.9,-0.65]];
    ctx.lineWidth = 5;
    fronds.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(x, y - 79);
      ctx.quadraticCurveTo(x + f[0]*28, y - 79 + f[1]*18, x + f[0]*58, y - 79 + f[1]*9 + 20);
      ctx.stroke();
    });
    ctx.restore();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     WORLD 2 — STONE CITY
  ────────────────────────────────────────────────────────────────────────── */

  function _drawCity(ctx, t) {

    /* Sky */
    var sky = ctx.createLinearGradient(0, 0, 0, DH * 0.78);
    sky.addColorStop(0,   '#1a0e2e');
    sky.addColorStop(0.5, '#2d1b4e');
    sky.addColorStop(1.0, '#4a2060');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, DW, DH * 0.78);

    /* Stars */
    ctx.save();
    for (var i = 0; i < 120; i++) {
      var sx = ((i * 1337 + 77) % DW) + 10;
      var sy = ((i * 791  + 33) % (DH * 0.64)) + 8;
      var tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.4 + i * 0.85));
      ctx.globalAlpha = tw * 0.65;
      ctx.fillStyle   = i % 7 === 0 ? '#ffd0a0' : '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 0.7 + (i % 3) * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* Moon */
    var mx = DW * 0.85, my = DH * 0.11;
    var mg = ctx.createRadialGradient(mx - 4, my - 4, 2, mx, my, 30);
    mg.addColorStop(0,   '#fff8e8');
    mg.addColorStop(0.6, '#e8d8b8');
    mg.addColorStop(1,   'transparent');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, 30, 0, Math.PI * 2); ctx.fill();
    var mglow = ctx.createRadialGradient(mx, my, 18, mx, my, 78);
    mglow.addColorStop(0, 'rgba(230,200,130,0.18)');
    mglow.addColorStop(1, 'transparent');
    ctx.fillStyle = mglow;
    ctx.beginPath(); ctx.arc(mx, my, 78, 0, Math.PI * 2); ctx.fill();

    /* Back skyline silhouette */
    ctx.fillStyle = '#12102a';
    _skylineBand(ctx, 0.7, [
      [40,110],[90,125],[140,105],[195,140],[250,118],[310,122],[365,108],
      [420,130],[475,112],[530,135],[585,115],[640,128],[700,110],[755,132],
      [810,118],[860,125],[915,108],[975,130],[1030,120],[1090,115],[1145,130]
    ], true);

    /* Gargoyles */
    ctx.fillStyle = '#1a1830';
    _gargoyle(ctx, DW * 0.22, DH * 0.38);
    _gargoyle(ctx, DW * 0.55, DH * 0.40);
    _gargoyle(ctx, DW * 0.78, DH * 0.37);

    /* Front skyline silhouette */
    ctx.fillStyle = '#1e1c38';
    _skylineBand(ctx, 0.76, [
      [0,88],[52,98],[100,84],[155,100],[205,103],[262,90],[310,97],
      [360,86],[418,101],[470,93],[530,103],[580,96],[635,88],[688,98],
      [748,93],[794,101],[850,88],[912,96],[962,103],[1018,91],[1068,98],[1130,88]
    ], false);

    /* Ground — stone wall */
    var gy = DH * 0.82;
    var wg = ctx.createLinearGradient(0, gy, 0, DH);
    wg.addColorStop(0,   '#484858');
    wg.addColorStop(0.4, '#363645');
    wg.addColorStop(1,   '#28283a');
    ctx.fillStyle = wg;
    ctx.fillRect(0, gy, DW, DH - gy);

    /* Cobblestones */
    ctx.strokeStyle = 'rgba(28,26,48,0.6)';
    ctx.lineWidth = 1.4;
    [gy+7, gy+21, gy+35, gy+51].forEach(function (ry) {
      var sx2 = 0;
      while (sx2 < DW) {
        var sw = 34 + (sx2 % 24);
        ctx.strokeRect(sx2 + 1, ry + 1, sw - 2, 12);
        sx2 += sw;
      }
    });

    /* Crack lines */
    ctx.strokeStyle = 'rgba(18,16,34,0.5)'; ctx.lineWidth = 1;
    [[0.20,0.85,0.35,0.88],[0.50,0.86,0.62,0.90],[0.70,0.84,0.80,0.87]].forEach(function (cl) {
      ctx.beginPath(); ctx.moveTo(cl[0]*DW, cl[1]*DH); ctx.lineTo(cl[2]*DW, cl[3]*DH); ctx.stroke();
    });

    /* Torch glows */
    [0.14, 0.29, 0.47, 0.61, 0.74, 0.87].forEach(function (tx2, ti) {
      var tx3 = tx2 * DW;
      var ty2 = gy - 16 - (ti % 2) * 14;
      var flk = 0.7 + Math.sin(t * 8.2 + ti * 2.5) * 0.3;
      var tg = ctx.createRadialGradient(tx3, ty2, 0, tx3, ty2, 20);
      tg.addColorStop(0, 'rgba(255,140,20,' + flk * 0.7 + ')');
      tg.addColorStop(0.4, 'rgba(255,75,0,' + flk * 0.28 + ')');
      tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx3, ty2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,80,' + flk + ')';
      ctx.beginPath(); ctx.arc(tx3, ty2, 3.5, 0, Math.PI * 2); ctx.fill();
    });

    /* Ground edge */
    var eg2 = ctx.createLinearGradient(0, gy - 3, 0, gy + 5);
    eg2.addColorStop(0, 'rgba(118,118,158,0.72)');
    eg2.addColorStop(1, 'transparent');
    ctx.fillStyle = eg2;
    ctx.fillRect(0, gy - 3, DW, 9);
  }

  /** Draw a row of rectangular building silhouettes, bases reaching DH.
   *  @param {number}   yFrac  horizon fraction (0–1) for tallest buildings
   *  @param {Array}    defs   [[x, h], ...] — x position and building height
   *  @param {boolean}  cren   add crenellations
   */
  function _skylineBand(ctx, yFrac, defs, cren) {
    var baseY = DH;
    defs.forEach(function (d, i) {
      var bx = d[0];
      var bw = (defs[i+1] ? defs[i+1][0] - d[0] : 50);
      var bh = d[1];
      var by = DH * yFrac - bh;
      ctx.fillRect(bx, by, bw, baseY - by);
      if (cren) {
        for (var cx = bx; cx < bx + bw - 4; cx += 9) {
          ctx.fillRect(cx, by - 11, 6, 11);
        }
      }
      /* Window dots */
      ctx.fillStyle = 'rgba(255,220,100,0.08)';
      for (var wy = by + 10; wy < by + bh - 10; wy += 18) {
        for (var wx = bx + 6; wx < bx + bw - 6; wx += 12) {
          ctx.fillRect(wx, wy, 5, 8);
        }
      }
      ctx.fillStyle = i < defs.length / 2 ? '#12102a' : '#1e1c38'; /* restore colour */
    });
  }

  function _gargoyle(ctx, x, y) {
    /* Simple dino-silhouette gargoyle */
    ctx.beginPath(); ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 14, y - 6, 8, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 2); ctx.lineTo(x - 25, y - 21); ctx.lineTo(x - 10, y + 4); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 29, y - 23); ctx.lineTo(x + 14, y + 2); ctx.closePath(); ctx.fill();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     WORLD 3 — STEEL FORTRESS
  ────────────────────────────────────────────────────────────────────────── */

  function _drawFortress(ctx, t) {

    /* Sky: near-black → dark red at horizon */
    var sky = ctx.createLinearGradient(0, 0, 0, DH * 0.78);
    sky.addColorStop(0,    '#0a0614');
    sky.addColorStop(0.55, '#1a0820');
    sky.addColorStop(0.85, '#2e0a0a');
    sky.addColorStop(1.0,  '#3a0a0a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, DW, DH * 0.78);

    /* Dim reddish stars */
    ctx.save();
    for (var i = 0; i < 80; i++) {
      var sx = ((i * 1337 + 33) % DW) + 10;
      var sy = ((i * 791  + 77) % (DH * 0.54)) + 6;
      var tw = 0.2 + 0.5 * Math.abs(Math.sin(t * 0.8 + i * 1.2));
      ctx.globalAlpha = tw * 0.75;
      ctx.fillStyle = i % 5 === 0 ? '#ff8060' : '#ffffff';
      ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* Hazard warning lights (blinking) */
    [0.07, 0.21, 0.37, 0.57, 0.71, 0.87, 0.93].forEach(function (lx, li) {
      var lX = lx * DW;
      var lY = DH * (0.07 + (li % 3) * 0.055);
      var lit = Math.floor(t * 1.2 + li * 0.7) % 3 < 2;
      if (lit) {
        var lg2 = ctx.createRadialGradient(lX, lY, 0, lX, lY, 16);
        lg2.addColorStop(0, 'rgba(255,120,0,0.9)');
        lg2.addColorStop(0.5, 'rgba(255,55,0,0.4)');
        lg2.addColorStop(1, 'transparent');
        ctx.fillStyle = lg2;
        ctx.beginPath(); ctx.arc(lX, lY, 16, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = lit ? '#ff8020' : '#3a1800';
      ctx.beginPath(); ctx.arc(lX, lY, 4, 0, Math.PI * 2); ctx.fill();
    });

    /* Industrial fortress silhouette */
    ctx.fillStyle = '#0d0b18';
    ctx.beginPath();
    ctx.moveTo(0, DH * 0.75);
    var fp = [
      0,0.75, 60,0.55, 82,0.55, 82,0.38, 92,0.35, 102,0.38, 102,0.43,
      118,0.22, 122,0.19, 126,0.22, 128,0.43, 148,0.43, 148,0.48, 190,0.48,
      210,0.42, 235,0.36, 262,0.40, 282,0.50, 325,0.55, 370,0.45, 395,0.38,
      412,0.22, 416,0.18, 420,0.22, 422,0.38, 445,0.46,
      505,0.50, 545,0.55, 610,0.45, 658,0.48, 690,0.36, 712,0.32,
      725,0.16, 729,0.13, 733,0.16, 744,0.32, 762,0.38, 785,0.43,
      828,0.50, 868,0.55, 908,0.45, 958,0.48, 990,0.40, 1012,0.33,
      1028,0.18, 1032,0.14, 1036,0.18, 1044,0.33, 1065,0.40,
      1082,0.48, 1125,0.55, 1152,0.52, 1170,0.55, 1170,0.75
    ];
    for (var fi = 0; fi < fp.length; fi += 2) {
      ctx.lineTo(fp[fi], fp[fi+1] * DH);
    }
    ctx.closePath();
    ctx.fill();

    /* X-brace girder details */
    ctx.strokeStyle = 'rgba(38,28,58,0.8)'; ctx.lineWidth = 2;
    [82, 122, 235, 395, 422, 690, 733, 1012, 1036].forEach(function (gx) {
      var t1 = DH * 0.28, t2 = DH * 0.54;
      ctx.beginPath(); ctx.moveTo(gx - 13, t1); ctx.lineTo(gx + 13, t2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + 13, t1); ctx.lineTo(gx - 13, t2); ctx.stroke();
    });

    /* Lava glow at ground level */
    var lvg = ctx.createLinearGradient(0, DH * 0.68, 0, DH * 0.84);
    lvg.addColorStop(0, 'transparent');
    lvg.addColorStop(0.5, 'rgba(255,55,0,0.08)');
    lvg.addColorStop(1, 'rgba(255,80,0,0.20)');
    ctx.fillStyle = lvg;
    ctx.fillRect(0, DH * 0.68, DW, DH * 0.16);

    /* Lava pool pulses */
    [0.18, 0.42, 0.68, 0.88].forEach(function (lx, li) {
      var lpx = lx * DW;
      var lpy = DH * 0.80;
      var pulse = 0.8 + Math.sin(t * 2.5 + li * 1.8) * 0.2;
      var pg = ctx.createRadialGradient(lpx, lpy, 0, lpx, lpy, 58 * pulse);
      pg.addColorStop(0, 'rgba(255,140,0,' + 0.3 * pulse + ')');
      pg.addColorStop(0.5, 'rgba(255,38,0,' + 0.14 * pulse + ')');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(lpx, lpy, 58 * pulse, 0, Math.PI * 2); ctx.fill();
    });

    /* Ground — dark metal grating */
    var gy = DH * 0.82;
    var mg = ctx.createLinearGradient(0, gy, 0, DH);
    mg.addColorStop(0,   '#282838');
    mg.addColorStop(0.5, '#1e1e2c');
    mg.addColorStop(1,   '#0e0e1a');
    ctx.fillStyle = mg;
    ctx.fillRect(0, gy, DW, DH - gy);

    /* Grating lines */
    ctx.strokeStyle = 'rgba(58,48,78,0.55)'; ctx.lineWidth = 1;
    for (var gry = gy + 7; gry < DH; gry += 14) {
      ctx.beginPath(); ctx.moveTo(0, gry); ctx.lineTo(DW, gry); ctx.stroke();
    }
    for (var grx = 0; grx < DW; grx += 14) {
      ctx.beginPath(); ctx.moveTo(grx, gy); ctx.lineTo(grx, DH); ctx.stroke();
    }

    /* Hazard stripes */
    for (var hx = 0; hx < DW; hx += 44) {
      ctx.fillStyle = (Math.floor(hx / 44) % 2 === 0) ? 'rgba(255,160,0,0.10)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(hx, DH - 16, 44, 16);
    }

    /* Ground top edge — dark red glow */
    var eg3 = ctx.createLinearGradient(0, gy - 3, 0, gy + 6);
    eg3.addColorStop(0, 'rgba(180,38,0,0.55)');
    eg3.addColorStop(1, 'transparent');
    ctx.fillStyle = eg3;
    ctx.fillRect(0, gy - 3, DW, 9);
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PUBLIC: drawBackground
  ────────────────────────────────────────────────────────────────────────── */

  /**
   * Draw the full background for a world.
   * @param {CanvasRenderingContext2D} ctx
   * @param {1|2|3} world
   * @param {number} time  elapsed seconds (used for animations)
   */
  function drawBackground(ctx, world, time) {
    if (world === 3)      _drawFortress(ctx, time || 0);
    else if (world === 2) _drawCity(ctx,    time || 0);
    else                  _drawJungle(ctx,  time || 0);
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DINO SPRITE DRAWING
  ────────────────────────────────────────────────────────────────────────── */

  /**
   * Get the cached HTMLImageElement for a dino/enemy.
   * @param  {string} id
   * @return {HTMLImageElement|null}
   */
  function getDinoImage(id) {
    return _imgCache[id] || null;
  }

  /**
   * Draw a dino sprite centred at (x, y) with given size.
   * Falls back to a coloured circle + emoji if the image isn't loaded yet.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} id    dino / enemy id
   * @param {number} x     centre x
   * @param {number} y     centre y
   * @param {number} w
   * @param {number} h
   */
  function drawDinoSprite(ctx, id, x, y, w, h) {
    var img = _imgCache[id];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      return;
    }
    /* Fallback */
    var roster  = global.DINO_ROSTER    && global.DINO_ROSTER.find(function (d) { return d.id === id; });
    var enemy   = global.TIRANNEN_TYPES && global.TIRANNEN_TYPES.find(function (e) { return e.id === id; });
    var data    = roster || enemy;
    var color   = data ? (data.colors ? data.colors.main : data.color) : '#8bc34a';
    var r       = Math.min(w, h) / 2;
    ctx.save();
    _shadow(ctx, 'rgba(0,0,0,0.3)', 6);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    _noShadow(ctx);
    if (data && data.emoji) {
      ctx.font = (r * 1.1) + 'px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.emoji, x, y);
    }
    ctx.restore();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     BLOCK DRAWING WITH DAMAGE STATES
  ────────────────────────────────────────────────────────────────────────── */

  var BLOCK_CFG = {
    /* Short keys (from levels.js) */
    W: { color: '#c8922a', dark: '#8a5e18', grain: '#a87828' },
    S: { color: '#8a8a8a', dark: '#4e4e4e', grain: '#6e6e6e' },
    T: { color: '#5874a0', dark: '#2c3e60', grain: '#496080' },
    X: { color: '#e84020', dark: '#901808', grain: '#c02818' },
    G: { color: '#b8e0f0', dark: '#60a0c0', grain: '#90c8e0' },
    /* Long keys (from gameplay.js BLOCK_T) */
    wood:  { color: '#c8922a', dark: '#8a5e18', grain: '#a87828' },
    stone: { color: '#8a8a8a', dark: '#4e4e4e', grain: '#6e6e6e' },
    steel: { color: '#5874a0', dark: '#2c3e60', grain: '#496080' },
    tnt:   { color: '#e84020', dark: '#901808', grain: '#c02818' },
    ice:   { color: '#b8e0f0', dark: '#60a0c0', grain: '#90c8e0' },
    glass: { color: '#b8e0f0', dark: '#60a0c0', grain: '#90c8e0' },
  };

  /**
   * Draw a block (centred at block.x, block.y) with damage-based cracks.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{
   *   x:     number,   centre x
   *   y:     number,   centre y
   *   w?:    number,   width  (default 40)
   *   h?:    number,   height (default 40)
   *   type:  string,   'W'|'S'|'T'|'X'|'G' or long form
   *   hp:    number,
   *   maxHp: number,
   *   angle?:number
   * }} block
   */
  function drawBlock(ctx, block) {
    var bw   = block.w    || 40;
    var bh   = block.h    || 40;
    var type = block.type || 'W';
    var cfg  = BLOCK_CFG[type] || BLOCK_CFG.W;
    var dmgR = (block.maxHp > 0) ? (1 - block.hp / block.maxHp) : 0;
    dmgR     = Math.max(0, Math.min(1, dmgR));
    var severe = dmgR >= 0.9;

    ctx.save();
    ctx.translate(block.x, block.y);
    if (block.angle) ctx.rotate(block.angle);

    /* Drop shadow */
    _shadow(ctx, 'rgba(0,0,0,0.38)', 6);
    ctx.fillStyle = cfg.dark;
    _rr(ctx, -bw/2 + 2, -bh/2 + 2, bw, bh, 4);
    ctx.fill();
    _noShadow(ctx);

    /* Main fill — darken progressively with damage */
    var darkAmt  = dmgR * 0.32;
    var baseCol  = dmgR < 0.05 ? cfg.color : _darken(cfg.color, darkAmt);
    var topCol   = _lighten(baseCol, 0.13);
    var bg = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
    bg.addColorStop(0, topCol);
    bg.addColorStop(1, baseCol);
    ctx.fillStyle = bg;
    _rr(ctx, -bw/2, -bh/2, bw, bh, 4);
    ctx.fill();

    /* ── Type-specific textures ── */
    if (type === 'W' || type === 'wood') {
      /* Wood grain */
      ctx.strokeStyle = cfg.grain; ctx.lineWidth = 1;
      for (var gi = 1; gi < 4; gi++) {
        ctx.globalAlpha = 0.44;
        ctx.beginPath();
        ctx.moveTo(-bw/2 + 4, -bh/2 + bh * gi / 4);
        ctx.lineTo( bw/2 - 4, -bh/2 + bh * gi / 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* Knot */
      ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1; ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.ellipse(bw * 0.14, 1, 6, 4, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (type === 'S' || type === 'stone') {
      /* Mortar lines */
      ctx.strokeStyle = cfg.dark; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.38;
      ctx.beginPath(); ctx.moveTo(-bw/2+3, 0); ctx.lineTo(bw/2-3, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-bw/4, -bh/2+3); ctx.lineTo(-bw/4, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( bw/4, 0); ctx.lineTo( bw/4,  bh/2-3); ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (type === 'T' || type === 'steel') {
      /* Sheen */
      var sh = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, -bh/2);
      sh.addColorStop(0,    'rgba(255,255,255,0.02)');
      sh.addColorStop(0.35, 'rgba(255,255,255,0.14)');
      sh.addColorStop(0.65, 'rgba(255,255,255,0.05)');
      sh.addColorStop(1,    'transparent');
      ctx.fillStyle = sh;
      _rr(ctx, -bw/2, -bh/2, bw, bh, 4); ctx.fill();
      /* Rivets */
      [[-bw/2+6,-bh/2+6],[bw/2-6,-bh/2+6],[-bw/2+6,bh/2-6],[bw/2-6,bh/2-6]].forEach(function (rp) {
        ctx.fillStyle = cfg.dark;
        ctx.beginPath(); ctx.arc(rp[0], rp[1], 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.arc(rp[0]-0.6, rp[1]-0.6, 1, 0, Math.PI * 2); ctx.fill();
      });

    } else if (type === 'X' || type === 'tnt') {
      /* TNT bands + label */
      ctx.fillStyle = '#1a0808';
      ctx.fillRect(-bw/2+2, -bh/2+4,  bw-4, 7);
      ctx.fillRect(-bw/2+2,  bh/2-11, bw-4, 7);
      ctx.fillStyle    = '#ffcc00';
      ctx.font         = 'bold ' + Math.round(bh * 0.28) + 'px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', 0, 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      /* Fuse */
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bw * 0.2, -bh/2 + 2);
      ctx.quadraticCurveTo(bw * 0.36, -bh/2 - 8, bw * 0.26, -bh/2 - 16);
      ctx.stroke();
      ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(bw * 0.26, -bh/2 - 16, 3, 0, Math.PI * 2); ctx.fill();

    } else if (type === 'G' || type === 'glass' || type === 'ice') {
      /* Glass / ice — shine layers */
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      _rr(ctx, -bw/2+4, -bh/2+4, (bw-8)*0.5, (bh-8)*0.4, 3); ctx.fill();
      ctx.fillStyle = 'rgba(200,240,255,0.08)';
      _rr(ctx, -bw/2, -bh/2, bw, bh, 4); ctx.fill();
    }

    /* Block outline */
    ctx.strokeStyle = severe ? 'rgba(0,0,0,0.75)' : cfg.dark;
    ctx.lineWidth   = 1.8;
    _rr(ctx, -bw/2, -bh/2, bw, bh, 4);
    ctx.stroke();

    /* ── Damage cracks ──────────────────────────────────────────────────────
     *   0  – 33%:  clean — no cracks
     *  33  – 66%:  light — 2 cracks from near-centre
     *  66  – 90%:  heavy — 4 cracks + dark overlay
     *  90  – 100%: critical — shatter web + near-black overlay
     */

    if (severe) {
      /* Critical: dark overlay + shatter web */
      ctx.fillStyle = 'rgba(0,0,0,0.46)';
      _rr(ctx, -bw/2, -bh/2, bw, bh, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.78)'; ctx.lineWidth = 1.2;
      [
        [-0.30,-0.40,-0.06,-0.07, 0.24,-0.36],
        [ 0.10,-0.09, 0.38,-0.30, 0.34, 0.06],
        [ 0.06, 0.10, 0.30, 0.33,-0.06, 0.36],
        [-0.06, 0.09,-0.33, 0.38,-0.27, 0.06],
        [-0.07,-0.07, 0.06, 0.09,-0.23, 0.30],
        [ 0.07,-0.05,-0.09, 0.07, 0.27, 0.29],
      ].forEach(function (sc) {
        ctx.beginPath();
        ctx.moveTo(sc[0]*bw, sc[1]*bh);
        ctx.lineTo(sc[2]*bw, sc[3]*bh);
        ctx.lineTo(sc[4]*bw, sc[5]*bh);
        ctx.stroke();
      });

    } else if (dmgR >= 0.66) {
      /* Heavy: 4 cracks + slight darken */
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      _rr(ctx, -bw/2, -bh/2, bw, bh, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.5;
      [
        [-0.28,-0.35,-0.06,-0.09, 0.18,-0.29],
        [-0.09, 0.23, 0.27, 0.10, 0.12,-0.21],
        [ 0.32,-0.15, 0.09, 0.06, 0.24, 0.33],
        [-0.38, 0.19,-0.13, 0.06,-0.20,-0.31],
      ].forEach(function (cr) {
        ctx.beginPath();
        ctx.moveTo(cr[0]*bw, cr[1]*bh);
        ctx.lineTo(cr[2]*bw, cr[3]*bh);
        ctx.lineTo(cr[4]*bw, cr[5]*bh);
        ctx.stroke();
      });

    } else if (dmgR >= 0.33) {
      /* Light: 2 cracks */
      ctx.strokeStyle = 'rgba(0,0,0,0.60)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bw*0.28, -bh*0.35); ctx.lineTo(-bw*0.06, -bh*0.09); ctx.lineTo(bw*0.18, -bh*0.29);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-bw*0.09, bh*0.23); ctx.lineTo(bw*0.27, bh*0.10); ctx.lineTo(bw*0.12, -bh*0.21);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PARTICLE SYSTEM
  ────────────────────────────────────────────────────────────────────────── */

  var _particles = [];

  /**
   * Create a single particle.
   * @param {number} x
   * @param {number} y
   * @param {'dust'|'debris'|'star'|'coin'|'spark'|'blood'|'score'} type
   * @param {Object} [opts]  key/value overrides
   * @return {Object} the particle
   */
  function createParticle(x, y, type, opts) {
    opts = opts || {};
    var p = {
      x: x, y: y, vx: 0, vy: 0,
      life: 1.0, maxLife: 0.8,
      color: '#ffffff', size: 6,
      type: type, ang: 0, spin: 0,
      text: null, gravity: 0.28, drag: 0.96,
    };

    switch (type) {
      case 'dust':
        p.vx      = (Math.random() - 0.5) * 2.5;
        p.vy      = -Math.random() * 2.5 - 0.5;
        p.color   = opts.color || 'rgba(175,138,95,0.72)';
        p.size    = 10 + Math.random() * 18;
        p.maxLife = 0.4 + Math.random() * 0.3;
        p.gravity = 0.04;
        p.drag    = 0.93;
        break;

      case 'debris':
        p.vx      = (Math.random() - 0.5) * 8;
        p.vy      = -Math.random() * 8 - 2;
        p.color   = opts.color || '#8a5e18';
        p.w       = 8  + Math.random() * 10;
        p.h       = 5  + Math.random() * 8;
        p.maxLife = 0.5 + Math.random() * 0.5;
        p.ang     = Math.random() * Math.PI * 2;
        p.spin    = (Math.random() - 0.5) * 0.32;
        break;

      case 'star':
        p.vx      = (Math.random() - 0.5) * 5;
        p.vy      = -Math.random() * 6 - 2;
        p.color   = opts.color || '#f5c842';
        p.size    = 5 + Math.random() * 6;
        p.maxLife = 0.65 + Math.random() * 0.45;
        p.ang     = Math.random() * Math.PI * 2;
        p.spin    = (Math.random() - 0.5) * 0.25;
        p.gravity = 0.14;
        break;

      case 'coin':
        p.vx      = (Math.random() - 0.5) * 4;
        p.vy      = -Math.random() * 7 - 3;
        p.color   = opts.color || '#ffd700';
        p.size    = 8 + Math.random() * 5;
        p.maxLife = 0.75 + Math.random() * 0.45;
        p.ang     = Math.random() * Math.PI * 2;
        p.spin    = (Math.random() - 0.5) * 0.22;
        break;

      case 'spark':
        p.vx      = (Math.random() - 0.5) * 12;
        p.vy      = -Math.random() * 10 - 3;
        p.color   = opts.color || '#ffcc00';
        p.size    = 3 + Math.random() * 4;
        p.maxLife = 0.22 + Math.random() * 0.22;
        p.gravity = 0.42;
        p.drag    = 0.91;
        break;

      case 'blood':
        p.vx      = (Math.random() - 0.5) * 7;
        p.vy      = -Math.random() * 6 - 1;
        p.color   = opts.color || '#cc0000';
        p.size    = 4 + Math.random() * 8;
        p.maxLife = 0.5 + Math.random() * 0.4;
        p.gravity = 0.36;
        p.drag    = 0.93;
        break;

      case 'score':
        p.vx      = (Math.random() - 0.5) * 1.5;
        p.vy      = -2.6;
        p.color   = opts.color || '#f5c842';
        p.size    = opts.size  || 22;
        p.maxLife = 0.9;
        p.text    = opts.text  || '+100';
        p.gravity = 0;
        p.drag    = 0.98;
        break;
    }

    Object.keys(opts).forEach(function (k) { p[k] = opts[k]; });
    _particles.push(p);
    return p;
  }

  /**
   * Spawn multiple particles at once.
   * @param {number} x
   * @param {number} y
   * @param {string} type
   * @param {number} [count=8]
   * @param {Object} [opts]
   */
  function spawnParticles(x, y, type, count, opts) {
    for (var i = 0; i < (count || 8); i++) createParticle(x, y, type, opts);
  }

  /**
   * Spawn a score-popup text particle.
   * @param {number} x
   * @param {number} y
   * @param {string|number} text   e.g. '+100', '+BOOM!'
   * @param {string} [color]
   */
  function spawnScorePopup(x, y, text, color) {
    var s = String(text);
    createParticle(x, y, 'score', {
      text: s,
      color: color || '#f5c842',
      size: s.length > 4 ? 26 : 22,
    });
  }

  /**
   * Update all active particles. Call each frame.
   * @param {number} dt  seconds since last frame
   */
  function updateParticles(dt) {
    for (var i = _particles.length - 1; i >= 0; i--) {
      var p = _particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity * dt * 60;
      p.vx *= p.drag;
      p.vy *= (p.drag + (1 - p.drag) * 0.5);
      if (p.spin) p.ang += p.spin;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) _particles.splice(i, 1);
    }
  }

  /**
   * Draw all active particles.
   * @param {CanvasRenderingContext2D} ctx
   */
  function drawParticles(ctx) {
    for (var i = 0; i < _particles.length; i++) {
      var p = _particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);

      switch (p.type) {

        case 'score':
          _shadow(ctx, 'rgba(0,0,0,0.55)', 5);
          ctx.fillStyle    = p.color;
          ctx.font         = 'bold ' + p.size + 'px "Baloo 2", cursive';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text || '+?', 0, 0);
          _noShadow(ctx);
          break;

        case 'dust': {
          var dustR = p.size * (0.6 + (1 - p.life) * 0.9);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(0, 0, dustR, 0, Math.PI * 2); ctx.fill();
          break;
        }

        case 'star':
          ctx.rotate(p.ang);
          ctx.fillStyle = p.color;
          _star5(ctx, p.size, p.size * 0.42);
          /* Tiny white centre glow */
          ctx.fillStyle = 'rgba(255,255,200,0.6)';
          _star5(ctx, p.size * 0.35, p.size * 0.14);
          break;

        case 'coin': {
          ctx.rotate(p.ang);
          var cw = Math.max(p.size * Math.abs(Math.cos(p.ang * 3)), 1);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(0, 0, cw, p.size, 0, 0, Math.PI * 2); ctx.fill();
          if (cw > 2) {
            ctx.fillStyle = 'rgba(255,255,200,0.45)';
            ctx.beginPath(); ctx.ellipse(-cw*0.2, -p.size*0.2, cw*0.3, p.size*0.3, 0, 0, Math.PI * 2); ctx.fill();
          }
          break;
        }

        case 'debris':
          ctx.rotate(p.ang);
          ctx.fillStyle = p.color;
          ctx.fillRect(-(p.w||p.size)/2, -(p.h||p.size*0.65)/2, p.w||p.size, p.h||p.size*0.65);
          ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
          ctx.strokeRect(-(p.w||p.size)/2, -(p.h||p.size*0.65)/2, p.w||p.size, p.h||p.size*0.65);
          break;

        case 'spark': {
          var spLen = Math.sqrt(p.vx*p.vx + p.vy*p.vy) * 0.8 + 3;
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(0, 0, spLen, p.size * 0.38, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }

        case 'blood':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.68, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
          ctx.fill();
          break;

        default:
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
          break;
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Filled 5-point star centred at current transform origin. */
  function _star5(ctx, outer, inner) {
    ctx.beginPath();
    for (var j = 0; j < 10; j++) {
      var r2 = j % 2 === 0 ? outer : inner;
      var a  = j * Math.PI / 5 - Math.PI / 2;
      if (j === 0) ctx.moveTo(r2 * Math.cos(a), r2 * Math.sin(a));
      else          ctx.lineTo(r2 * Math.cos(a), r2 * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Remove all particles. */
  function clearParticles() { _particles = []; }

  /* ──────────────────────────────────────────────────────────────────────────
     UI HELPERS
  ────────────────────────────────────────────────────────────────────────── */

  /**
   * Draw a rounded pill button.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x   centre x
   * @param {number} y   centre y
   * @param {number} w
   * @param {number} h
   * @param {string} label
   * @param {string} [bg='#f5c842']
   * @param {string} [fg='#1a0e2e']
   */
  function drawButton(ctx, x, y, w, h, label, bg, fg) {
    bg = bg || '#f5c842'; fg = fg || '#1a0e2e';
    ctx.save();
    _shadow(ctx, 'rgba(0,0,0,0.42)', 12);
    ctx.fillStyle = _darken(bg, 0.28);
    _rr(ctx, x-w/2+2, y-h/2+3, w, h, h/2); ctx.fill();
    _noShadow(ctx);
    var bGrad = ctx.createLinearGradient(x-w/2, y-h/2, x-w/2, y+h/2);
    bGrad.addColorStop(0, _lighten(bg, 0.14));
    bGrad.addColorStop(1, bg);
    ctx.fillStyle = bGrad;
    _rr(ctx, x-w/2, y-h/2, w, h, h/2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y-h*0.20, w*0.42, h*0.24, 0, 0, Math.PI*2); ctx.fill();
    _shadow(ctx, 'rgba(0,0,0,0.22)', 3);
    ctx.fillStyle    = fg;
    ctx.font         = 'bold ' + Math.round(h*0.44) + 'px "Nunito", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
    _noShadow(ctx);
    ctx.restore();
  }

  /**
   * Draw a star rating row.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx       centre x of the row
   * @param {number} cy       centre y
   * @param {number} total    number of stars (usually 3)
   * @param {number} filled   how many are filled
   * @param {number} [sz=32]  radius of each star
   */
  function drawStars(ctx, cx, cy, total, filled, sz) {
    sz = sz || 32;
    var gap = sz * 1.42;
    var x0  = cx - ((total - 1) * gap) / 2;
    for (var i = 0; i < total; i++) {
      ctx.save();
      ctx.translate(x0 + i * gap, cy);
      if (i < filled) {
        _shadow(ctx, 'rgba(255,200,0,0.45)', 10);
        ctx.fillStyle = '#f5c842';
        _star5(ctx, sz, sz * 0.42);
        _noShadow(ctx);
        ctx.fillStyle = 'rgba(255,255,200,0.32)';
        _star5(ctx, sz * 0.6, sz * 0.25);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        _star5(ctx, sz, sz * 0.42);
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        ctx.lineWidth = 1.5;
        _star5(ctx, sz, sz * 0.42);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Draw a health / progress bar.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x        left edge
   * @param {number} y        top edge
   * @param {number} w
   * @param {number} h
   * @param {number} fraction 0.0 – 1.0
   * @param {string} [fillColor='#40e040']
   * @param {string} [bgColor='rgba(0,0,0,0.5)']
   */
  function drawBar(ctx, x, y, w, h, fraction, fillColor, bgColor) {
    fillColor = fillColor || '#40e040';
    bgColor   = bgColor   || 'rgba(0,0,0,0.5)';
    var r = h / 2;
    ctx.save();
    ctx.fillStyle = bgColor;
    _rr(ctx, x, y, w, h, r); ctx.fill();
    if (fraction > 0) {
      var fw = Math.max(w * fraction, r * 2);
      ctx.fillStyle = fillColor;
      _rr(ctx, x, y, fw, h, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      _rr(ctx, x+2, y+2, Math.max(fw-4, 0), h/2-2, r-1); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
    _rr(ctx, x, y, w, h, r); ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw the dino queue strip (top-left HUD indicator).
   * @param {CanvasRenderingContext2D} ctx
   * @param {string[]} ids   ordered list — first = current dino
   * @param {number}   t     elapsed time for pulsing animation
   */
  function drawDinoQueue(ctx, ids, t) {
    ids.forEach(function (id, i) {
      var dino = global.DINO_ROSTER && global.DINO_ROSTER.find(function (d) { return d.id === id; });
      if (!dino) return;
      var qx = 24 + i * 44;
      var qy = 20;
      var qr = i === 0 ? 18 : 13;
      ctx.save();
      ctx.globalAlpha = i === 0 ? 1.0 : 0.55;
      var img = _imgCache[id];
      if (img && img.complete && img.naturalWidth > 0) {
        var sz = qr * 2.8;
        ctx.drawImage(img, qx - sz*0.45, qy - sz*0.45, sz, sz);
      } else {
        ctx.fillStyle = dino.colors.main;
        ctx.beginPath(); ctx.arc(qx, qy, qr, 0, Math.PI*2); ctx.fill();
      }
      if (i === 0) {
        ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.2;
        ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(qx, qy, qr+3, 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────────────────────── */

  /**
   * Initialise the renderer.
   * Pre-loads all dino images and exposes them as window.DinoImages.
   * Call once before the game loop starts (or after DOMContentLoaded).
   */
  function init() {
    _preloadImages();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────────────────────────────────────── */

  global.Renderer = {

    /* Lifecycle */
    init: init,

    /* World backgrounds */
    drawBackground: drawBackground,
    drawJungle:     _drawJungle,
    drawCity:       _drawCity,
    drawFortress:   _drawFortress,

    /* Dino sprites */
    getDinoImage:   getDinoImage,
    drawDinoSprite: drawDinoSprite,
    imageCache:     _imgCache,

    /* Blocks */
    drawBlock:    drawBlock,
    BLOCK_CFG:    BLOCK_CFG,

    /* Particle system */
    get particles() { return _particles; },
    createParticle:  createParticle,
    spawnParticles:  spawnParticles,
    spawnScorePopup: spawnScorePopup,
    updateParticles: updateParticles,
    drawParticles:   drawParticles,
    clearParticles:  clearParticles,

    /* UI helpers */
    drawButton:    drawButton,
    drawStars:     drawStars,
    drawBar:       drawBar,
    drawDinoQueue: drawDinoQueue,

    /* Low-level utilities */
    rr:      _rr,
    shadow:  _shadow,
    noShadow: _noShadow,
    lighten: _lighten,
    darken:  _darken,
  };

}(window));
