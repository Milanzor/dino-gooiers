/**
 * worldmap.js — Dino Gooiers
 *
 * Interactive world map: 3 worlds × 10 levels = 30 levels on a winding path.
 * Horizontal swipe/drag scrolls between worlds.
 *
 * Exposes: window.WorldMap
 * Re-registers: Game screen 'worldmap' (overrides the placeholder in screens.js)
 *
 * Dependencies: engine.js must be loaded first (window.Game).
 */

(function (global) {
  'use strict';

  // ── Design constants ──────────────────────────────────────────────────────────
  var DW = 1170;
  var DH = 540;

  var WORLD_COUNT      = 3;
  var LEVELS_PER_WORLD = 10;

  var NODE_R        = 30;  // normal unlocked radius
  var BOSS_R        = 38;  // boss level radius
  var CURRENT_EXTRA = 6;   // extra radius added to current level

  // ── World theme definitions ───────────────────────────────────────────────────
  var WORLDS = [
    {
      name:    'Jungle Ruïnes',
      skyTop:  '#0d2408',
      skyMid:  '#1e4a10',
      skyBot:  '#3a6e1a',
      gndTop:  '#3d1f06',
      gndBot:  '#1e0e02',
      accent:  '#5ecf52',
      ropeCol: '#7a4e28',
      ropeShd: '#3a2010',
      scenery: 'jungle',
    },
    {
      name:    'Steen Stad',
      skyTop:  '#060e1c',
      skyMid:  '#0d1f3a',
      skyBot:  '#1a3060',
      gndTop:  '#42424e',
      gndBot:  '#1e1e26',
      accent:  '#6aadda',
      ropeCol: '#7a7a7a',
      ropeShd: '#404040',
      scenery: 'city',
    },
    {
      name:    'Stalen Burcht',
      skyTop:  '#040404',
      skyMid:  '#120808',
      skyBot:  '#1c0c0c',
      gndTop:  '#1a1a1a',
      gndBot:  '#080808',
      accent:  '#cc3333',
      ropeCol: '#4a4a4a',
      ropeShd: '#1a1a1a',
      scenery: 'fortress',
    },
  ];

  // ── Winding path positions (local to each world page, 0-indexed) ──────────────
  // 10 nodes per world page (1170 × 540).
  // Path goes bottom-left → bottom-right → mid-right → mid-left → top-right (boss).
  var LOCAL_POSITIONS = [
    { x: 152, y: 432 },   // 0  — start
    { x: 380, y: 432 },   // 1
    { x: 608, y: 432 },   // 2
    { x: 836, y: 432 },   // 3
    { x: 970, y: 295 },   // 4  — turn up on right
    { x: 760, y: 295 },   // 5
    { x: 540, y: 295 },   // 6
    { x: 320, y: 295 },   // 7
    { x: 180, y: 158 },   // 8  — turn up on left
    { x: 920, y: 158 },   // 9  — BOSS (far-right top)
  ];

  // Control-point offsets for the Bezier curve through the path segments.
  // Each entry is [cp1x, cp1y, cp2x, cp2y] offsets from start→end midpoint.
  // We use quadratic approximations per segment for simplicity.

  function _nodeLocalPos(localIdx) {
    return LOCAL_POSITIONS[Math.min(localIdx, 9)];
  }

  /** Return global (virtual scroll-space) position for levelId (1-indexed). */
  function _globalPos(levelId) {
    var idx      = levelId - 1;
    var worldIdx = Math.floor(idx / LEVELS_PER_WORLD);
    var localIdx = idx % LEVELS_PER_WORLD;
    var local    = _nodeLocalPos(localIdx);
    return { x: worldIdx * DW + local.x, y: local.y };
  }

  // ── Scroll state ──────────────────────────────────────────────────────────────
  var _scrollX        = 0;   // current rendered scroll (0 = world 1)
  var _targetScrollX  = 0;
  var _dragStartX     = 0;
  var _dragScrollBase = 0;
  var _isDragging     = false;

  // ── Time / animation ──────────────────────────────────────────────────────────
  var _t          = 0;
  var _animProg   = 1;   // 0→1 for draw-in; starts at 1 (no anim) until animateIn() called
  var ANIM_DUR    = 1.4; // seconds for full path draw-in

  // ── Preview panel state ───────────────────────────────────────────────────────
  var _preview = null;  // null or { levelId, x, y } for the panel

  // ── Input subscriptions (stored so we can unsubscribe on exit) ───────────────
  var _unsubDragStart = null;
  var _unsubDragMove  = null;
  var _unsubDragEnd   = null;
  var _unsubBtn       = null;  // back button from screens.js system

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function _lerp(a, b, t) { return a + (b - a) * t; }

  function _snapScroll(sx) {
    // Snap to nearest world boundary
    var world = Math.round(sx / DW);
    world = _clamp(world, 0, WORLD_COUNT - 1);
    return world * DW;
  }

  function _shadow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }

  function _noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  /** Draw a 5-pointed star centred at cx,cy. */
  function _drawStarShape(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r   = i % 2 === 0 ? outer : inner;
      var ang = (Math.PI * i) / 5 - Math.PI / 2;
      var px  = cx + r * Math.cos(ang);
      var py  = cy + r * Math.sin(ang);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** Draw a rounded rectangle path. */
  function _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // ── Scenery drawers ───────────────────────────────────────────────────────────

  function _drawJungleScenery(ctx, t) {
    // Animated floating fireflies / particles
    for (var i = 0; i < 18; i++) {
      var fx = ((i * 631 + 37) % 1100) + 35;
      var fy = ((i * 443 + 11) % 340) + 20;
      var flicker = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.1 + i * 1.3));
      ctx.globalAlpha = flicker * 0.7;
      ctx.fillStyle = '#aaff66';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Jungle trees (silhouettes)
    var treeCols = ['#1a4a08', '#0e3004', '#245a10'];
    var treeXs   = [60, 240, 480, 690, 820, 1040, 1130];
    for (var ti = 0; ti < treeXs.length; ti++) {
      var tx  = treeXs[ti];
      var th  = 140 + (ti % 3) * 40;
      var sway = Math.sin(t * 0.7 + ti * 1.1) * 4;
      ctx.fillStyle = treeCols[ti % treeCols.length];
      // Trunk
      ctx.fillRect(tx - 8 + sway * 0.3, DH * 0.68 - th * 0.25, 16, th * 0.28);
      // Canopy layers
      for (var ci = 0; ci < 3; ci++) {
        var cr = (50 - ci * 10) + (ti % 2) * 12;
        var cy = DH * 0.68 - th * 0.25 - ci * 38 + sway * (ci * 0.4);
        ctx.beginPath();
        ctx.ellipse(tx + sway * 0.5, cy, cr, cr * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Temple ruin stones scattered along ground
    ctx.fillStyle = '#5a3a1a';
    var stoneXs = [140, 310, 550, 760, 950];
    for (var si = 0; si < stoneXs.length; si++) {
      var sx = stoneXs[si];
      var sy = DH * 0.68 - 18;
      ctx.fillRect(sx, sy, 60 + (si % 3) * 20, 16);
      ctx.fillRect(sx + 8, sy - 14, 44, 14);
    }
    // Vines hanging from top
    ctx.strokeStyle = '#2a6010';
    ctx.lineWidth = 2;
    for (var vi = 0; vi < 5; vi++) {
      var vx = 180 + vi * 210;
      var vlen = 60 + (vi % 3) * 30;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.bezierCurveTo(
        vx + Math.sin(t * 0.5 + vi) * 12, vlen * 0.33,
        vx - Math.sin(t * 0.4 + vi) * 8,  vlen * 0.66,
        vx + Math.sin(t * 0.6 + vi) * 6,  vlen
      );
      ctx.stroke();
    }
  }

  function _drawCityScenery(ctx, t) {
    // Stars
    for (var i = 0; i < 60; i++) {
      var sx = ((i * 1117 + 23) % 1100) + 35;
      var sy = ((i * 733 + 17) % 260) + 10;
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + i * 0.8));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Buildings silhouette
    var buildings = [
      { x: 30,  w: 90,  h: 200, windows: [[15,30],[15,70],[15,110],[15,150],[50,30],[50,70],[50,110]] },
      { x: 150, w: 60,  h: 130, windows: [[10,20],[10,60],[10,100],[35,20],[35,60]] },
      { x: 250, w: 120, h: 260, windows: [[15,20],[15,60],[15,100],[15,140],[15,180],[50,20],[50,60],[50,100],[50,140],[85,20],[85,60],[85,100]] },
      { x: 420, w: 70,  h: 180, windows: [[10,20],[10,60],[10,100],[10,140],[40,20],[40,60],[40,100]] },
      { x: 540, w: 100, h: 240, windows: [[12,20],[12,60],[12,100],[12,140],[12,180],[45,20],[45,60],[45,100],[45,140],[75,20],[75,60]] },
      { x: 700, w: 55,  h: 155, windows: [[10,20],[10,60],[10,100],[30,20],[30,60]] },
      { x: 810, w: 140, h: 300, windows: [[15,20],[15,60],[15,100],[15,140],[15,180],[15,220],[55,20],[55,60],[55,100],[55,140],[55,180],[95,20],[95,60],[95,100],[95,140]] },
      { x: 1010,w: 80,  h: 200, windows: [[12,20],[12,60],[12,100],[12,140],[45,20],[45,60],[45,100]] },
      { x: 1110,w: 60,  h: 170, windows: [[8,20],[8,60],[8,100],[8,140],[30,20],[30,60]] },
    ];

    buildings.forEach(function (b) {
      // Body
      var grad = ctx.createLinearGradient(b.x, DH * 0.68 - b.h, b.x + b.w, DH * 0.68);
      grad.addColorStop(0, '#1c2030');
      grad.addColorStop(1, '#0a0e18');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, DH * 0.68 - b.h, b.w, b.h);
      // Windows (random lit/dark)
      b.windows.forEach(function (w, wi) {
        var lit = ((wi * 7 + b.x) % 5) > 1;
        var flick = lit && Math.sin(t * 0.3 + wi * 2.7 + b.x * 0.01) > 0.97;
        ctx.fillStyle = flick ? 'rgba(255,200,100,.15)' : lit ? 'rgba(255,240,160,.45)' : 'rgba(30,40,60,.6)';
        ctx.fillRect(b.x + w[0], DH * 0.68 - b.h + w[1], 14, 18);
      });
      // Roof light (blinking)
      if (b.h > 200) {
        var blink = Math.sin(t * 2.5 + b.x * 0.05) > 0.5;
        ctx.fillStyle = blink ? 'rgba(255,60,60,.9)' : 'rgba(255,60,60,.2)';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, DH * 0.68 - b.h - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Dino graffiti on one building — simple outline
    ctx.save();
    ctx.strokeStyle = 'rgba(80,255,80,.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Simple cartoon dino outline on building at x=810
    ctx.moveTo(840, DH * 0.68 - 80);
    ctx.bezierCurveTo(845, DH * 0.68 - 110, 870, DH * 0.68 - 120, 880, DH * 0.68 - 100);
    ctx.bezierCurveTo(890, DH * 0.68 - 90, 885, DH * 0.68 - 75, 875, DH * 0.68 - 70);
    ctx.stroke();
    ctx.restore();
  }

  function _drawFortressScenery(ctx, t) {
    // Dark embers / sparks rising
    for (var i = 0; i < 25; i++) {
      var ex = ((i * 503 + 41) % 1100) + 35;
      var ey = ((i * 311 + t * 30 * (1 + (i % 3) * 0.5)) % (DH * 0.68));
      ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(t * 3 + i));
      ctx.fillStyle = i % 3 === 0 ? '#ff6010' : i % 3 === 1 ? '#ff3000' : '#ffaa00';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Industrial pipes / girders
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    var pipeXs = [100, 350, 600, 850];
    pipeXs.forEach(function (px) {
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, DH * 0.5);
      ctx.stroke();
      // Bolt caps
      ctx.fillStyle = '#555';
      [60, 140, 220, 300].forEach(function (py) {
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Horizontal gantry beams
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 14;
    [80, 200, 330].forEach(function (by) {
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(DW, by);
      ctx.stroke();
    });

    // Red warning stripes on ground area
    var stripeW = 30;
    for (var sx = 0; sx < DW; sx += stripeW * 2) {
      ctx.fillStyle = 'rgba(200,40,0,.18)';
      ctx.fillRect(sx, DH * 0.68 - 20, stripeW, 20);
    }

    // Steel fortress silhouette wall
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, DH * 0.68 - 80, DW, 80);
    // Battlements
    for (var bx = 0; bx < DW; bx += 60) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(bx, DH * 0.68 - 120, 36, 40);
    }
    // Glowing cracks / lava veins
    ctx.strokeStyle = 'rgba(255,60,0,.3)';
    ctx.lineWidth = 1.5;
    [[200, 490, 280, 530], [450, 475, 520, 510], [700, 485, 770, 520]].forEach(function (pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.stroke();
    });
  }

  function _drawScenery(ctx, sceneryKey, t) {
    if (sceneryKey === 'jungle')   _drawJungleScenery(ctx, t);
    else if (sceneryKey === 'city')    _drawCityScenery(ctx, t);
    else if (sceneryKey === 'fortress') _drawFortressScenery(ctx, t);
  }

  // ── Background renderer ───────────────────────────────────────────────────────

  function _drawBackground(ctx, scrollX, t) {
    // Render all 3 world backgrounds in virtual scroll space
    for (var wi = 0; wi < WORLD_COUNT; wi++) {
      var world  = WORLDS[wi];
      var pageX  = wi * DW;  // left edge in virtual space

      // Clip to this world's page
      var visL = Math.max(pageX, scrollX);
      var visR = Math.min(pageX + DW, scrollX + DW);
      if (visR <= visL) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(pageX, 0, DW, DH);
      ctx.clip();

      // Sky
      var sky = ctx.createLinearGradient(0, 0, 0, DH * 0.68);
      sky.addColorStop(0, world.skyTop);
      sky.addColorStop(0.5, world.skyMid);
      sky.addColorStop(1, world.skyBot);
      ctx.fillStyle = sky;
      ctx.fillRect(pageX, 0, DW, DH * 0.68);

      // Scenery (translated to page space)
      ctx.save();
      ctx.translate(pageX, 0);
      _drawScenery(ctx, world.scenery, t);
      ctx.restore();

      // Ground
      var gnd = ctx.createLinearGradient(0, DH * 0.68, 0, DH);
      gnd.addColorStop(0, world.gndTop);
      gnd.addColorStop(1, world.gndBot);
      ctx.fillStyle = gnd;
      ctx.fillRect(pageX, DH * 0.68, DW, DH * 0.32);

      ctx.restore();
    }
  }

  // ── Rope / chain path renderer ────────────────────────────────────────────────

  /**
   * Draw the winding rope path for one world, with optional progress 0..1
   * for the draw-in animation.
   */
  function _drawWorldPath(ctx, worldIdx, animProgress) {
    var world  = WORLDS[worldIdx];
    var pageX  = worldIdx * DW;

    // Collect global points for this world's 10 nodes
    var pts = [];
    for (var li = 0; li < LEVELS_PER_WORLD; li++) {
      var local = _nodeLocalPos(li);
      pts.push({ x: pageX + local.x, y: local.y });
    }

    // Flatten points to a single polyline and limit to animProgress fraction
    var totalSegs = pts.length - 1;
    var drawnSegs = animProgress * totalSegs;

    // Outer rope (dark shadow)
    ctx.save();
    ctx.strokeStyle = world.ropeShd;
    ctx.lineWidth   = 14;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      var segProgress = _clamp(drawnSegs - (i - 1), 0, 1);
      if (segProgress <= 0) break;
      var tx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * segProgress;
      var ty = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * segProgress;
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    // Inner rope
    ctx.strokeStyle = world.ropeCol;
    ctx.lineWidth   = 9;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var j = 1; j < pts.length; j++) {
      var sp2 = _clamp(drawnSegs - (j - 1), 0, 1);
      if (sp2 <= 0) break;
      var tx2 = pts[j - 1].x + (pts[j].x - pts[j - 1].x) * sp2;
      var ty2 = pts[j - 1].y + (pts[j].y - pts[j - 1].y) * sp2;
      ctx.lineTo(tx2, ty2);
    }
    ctx.stroke();

    // Rope highlight stripe
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 14]);
    ctx.lineDashOffset = -_t * 18; // subtle flowing motion
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var k = 1; k < pts.length; k++) {
      var sp3 = _clamp(drawnSegs - (k - 1), 0, 1);
      if (sp3 <= 0) break;
      var tx3 = pts[k - 1].x + (pts[k].x - pts[k - 1].x) * sp3;
      var ty3 = pts[k - 1].y + (pts[k].y - pts[k - 1].y) * sp3;
      ctx.lineTo(tx3, ty3);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Knot circles at join points
    for (var m = 1; m < pts.length - 1; m++) {
      if (m >= drawnSegs) break;
      ctx.beginPath();
      ctx.arc(pts[m].x, pts[m].y, 7, 0, Math.PI * 2);
      ctx.fillStyle = world.ropeShd;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pts[m].x, pts[m].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = world.ropeCol;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Level node renderer ───────────────────────────────────────────────────────

  function _drawNode(ctx, levelId, gx, gy, t) {
    var G        = global.Game;
    var stars    = (G.state.stars   || [])[levelId - 1] || 0;
    var maxLevel = G.state.maxLevel || 1;
    var curLevel = G.state.currentLevel || 1;
    var worldIdx = Math.floor((levelId - 1) / LEVELS_PER_WORLD);
    var world    = WORLDS[worldIdx];

    var isBoss    = (levelId % LEVELS_PER_WORLD === 0);
    var isLocked  = (levelId > maxLevel);
    var isCurrent = (levelId === curLevel);

    var baseR   = isBoss ? BOSS_R : NODE_R;
    var bounce  = isCurrent ? Math.sin(t * 4.2) * 5 : 0;
    var r       = isCurrent ? baseR + CURRENT_EXTRA : baseR;
    var drawY   = gy + bounce;

    ctx.save();

    // ── Glow ──────────────────────────────────────────────────────────────────
    if (isCurrent) {
      var pulse = 0.6 + 0.4 * Math.sin(t * 3);
      _shadow(ctx, world.accent, 28 * pulse);
    } else if (isBoss && !isLocked) {
      var bpulse = 0.5 + 0.5 * Math.sin(t * 2.5 + levelId);
      _shadow(ctx, '#ff3300', 22 * bpulse);
    }

    // ── Node circle fill ──────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(gx, drawY, r, 0, Math.PI * 2);

    if (isLocked) {
      ctx.fillStyle = '#1a1830';
    } else if (isBoss) {
      var bossGrad = ctx.createRadialGradient(gx - r * 0.3, drawY - r * 0.3, r * 0.1, gx, drawY, r);
      bossGrad.addColorStop(0, '#ff6020');
      bossGrad.addColorStop(0.6, '#cc1800');
      bossGrad.addColorStop(1, '#600000');
      ctx.fillStyle = bossGrad;
    } else if (stars > 0) {
      var starGrad = ctx.createRadialGradient(gx - r * 0.25, drawY - r * 0.25, r * 0.05, gx, drawY, r);
      starGrad.addColorStop(0, '#f5d060');
      starGrad.addColorStop(0.7, '#c47a00');
      starGrad.addColorStop(1, '#7a4a00');
      ctx.fillStyle = starGrad;
    } else {
      var openGrad = ctx.createRadialGradient(gx - r * 0.25, drawY - r * 0.25, r * 0.05, gx, drawY, r);
      openGrad.addColorStop(0, '#304870');
      openGrad.addColorStop(1, '#0c1828');
      ctx.fillStyle = openGrad;
    }
    ctx.fill();

    // ── Border ────────────────────────────────────────────────────────────────
    _noShadow(ctx);
    ctx.beginPath();
    ctx.arc(gx, drawY, r, 0, Math.PI * 2);

    if (isCurrent) {
      ctx.strokeStyle = '#f5d060';
      ctx.lineWidth   = 4;
    } else if (isBoss && !isLocked) {
      ctx.strokeStyle = '#ff6030';
      ctx.lineWidth   = 3;
    } else if (!isLocked && stars > 0) {
      ctx.strokeStyle = '#f5c842';
      ctx.lineWidth   = 3;
    } else if (!isLocked) {
      ctx.strokeStyle = 'rgba(100,140,200,.7)';
      ctx.lineWidth   = 2;
    } else {
      ctx.strokeStyle = 'rgba(80,80,100,.5)';
      ctx.lineWidth   = 2;
    }
    ctx.stroke();

    // Inner highlight ring
    if (!isLocked) {
      ctx.beginPath();
      ctx.arc(gx - r * 0.2, drawY - r * 0.25, r * 0.5, 0, Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // ── Icon / label ──────────────────────────────────────────────────────────
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (isLocked) {
      // Padlock symbol
      _noShadow(ctx);
      ctx.fillStyle = 'rgba(160,160,180,.5)';
      ctx.font      = (r * 0.9) + 'px sans-serif';
      ctx.fillText('🔒', gx, drawY); // lock emoji fallback via unicode
      // Fallback drawn padlock
      ctx.strokeStyle = 'rgba(120,120,150,.7)';
      ctx.lineWidth   = 2;
      var lw = r * 0.32, lh = r * 0.28;
      var la = gx - lw / 2, lb = drawY - lh * 0.2;
      ctx.beginPath();
      ctx.arc(gx, drawY - r * 0.18, lw * 0.6, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(100,100,130,.7)';
      _rr(ctx, la, lb, lw, lh, 3);
      ctx.fill();
    } else if (isBoss) {
      // Skull icon (drawn, not emoji)
      _shadow(ctx, 'rgba(255,60,0,.6)', 10);
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold ' + Math.round(r * 0.9) + 'px sans-serif';
      ctx.fillText('☠', gx, drawY); // skull crossbones
      // Drawn skull fallback
      ctx.fillStyle = '#fff';
      var sr = r * 0.38;
      ctx.beginPath();
      ctx.arc(gx, drawY - r * 0.1, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cc1800';
      ctx.beginPath();
      ctx.arc(gx - sr * 0.35, drawY - r * 0.08, sr * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + sr * 0.35, drawY - r * 0.08, sr * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Jaw
      ctx.fillStyle = '#fff';
      ctx.fillRect(gx - sr * 0.38, drawY + r * 0.14, sr * 0.76, sr * 0.4);
      // Jaw gaps
      ctx.fillStyle = '#cc1800';
      ctx.fillRect(gx - sr * 0.1, drawY + r * 0.14, sr * 0.2, sr * 0.4);
    } else {
      // Level number
      _shadow(ctx, 'rgba(0,0,0,.5)', 4);
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold ' + Math.round(r * 0.65) + "px 'Nunito', sans-serif";
      ctx.fillText(String(levelId), gx, drawY);
    }
    _noShadow(ctx);

    // ── Star rating below node ────────────────────────────────────────────────
    if (!isLocked) {
      var starOuter = 7, starInner = 3;
      var starY     = drawY + r + 14;
      var spacing   = 16;
      for (var s = 0; s < 3; s++) {
        var sx = gx - spacing + s * spacing;
        _drawStarShape(ctx, sx, starY, starOuter, starInner);
        if (s < stars) {
          ctx.fillStyle = '#f5c842';
          _shadow(ctx, 'rgba(245,200,0,.5)', 6);
          ctx.fill();
          _noShadow(ctx);
          ctx.strokeStyle = '#c47a00';
          ctx.lineWidth   = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.15)';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // ── Level preview panel ───────────────────────────────────────────────────────

  function _drawPreviewPanel(ctx, levelId, t) {
    var G        = global.Game;
    var idx      = levelId - 1;
    var level    = window.LEVELS && window.LEVELS[idx];
    var stars    = (G.state.stars || [])[idx] || 0;
    var worldIdx = Math.floor(idx / LEVELS_PER_WORLD);
    var world    = WORLDS[worldIdx];

    // Dim overlay
    ctx.fillStyle = 'rgba(6,4,14,.75)';
    ctx.fillRect(0, 0, DW, DH);

    // Panel geometry
    var pw = 560, ph = 340;
    var px = (DW - pw) / 2, py = (DH - ph) / 2;

    // Panel background
    _shadow(ctx, 'rgba(0,0,0,.7)', 40);
    var pg = ctx.createLinearGradient(px, py, px, py + ph);
    pg.addColorStop(0, '#1a1030');
    pg.addColorStop(1, '#0a0818');
    ctx.fillStyle = pg;
    _rr(ctx, px, py, pw, ph, 20);
    ctx.fill();
    _noShadow(ctx);

    // Accent border
    ctx.strokeStyle = world.accent + '55';
    ctx.lineWidth   = 2;
    _rr(ctx, px + 1, py + 1, pw - 2, ph - 2, 19);
    ctx.stroke();

    // World badge
    ctx.fillStyle = world.accent + 'aa';
    ctx.font      = "600 12px 'Nunito', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('WERELD ' + (worldIdx + 1) + ' — ' + world.name.toUpperCase(), DW / 2, py + 22);

    // Level name
    _shadow(ctx, 'rgba(0,0,0,.6)', 8);
    ctx.fillStyle = '#f0e8ff';
    ctx.font      = "800 28px 'Baloo 2', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('Niveau ' + levelId + (level ? ': ' + level.name : ''), DW / 2, py + 58);
    _noShadow(ctx);

    // Stars
    for (var s = 0; s < 3; s++) {
      var sx  = DW / 2 - 40 + s * 40;
      var sy  = py + 100;
      _drawStarShape(ctx, sx, sy, 18, 8);
      if (s < stars) {
        ctx.fillStyle = '#f5c842';
        _shadow(ctx, 'rgba(245,200,0,.6)', 12);
        ctx.fill();
        _noShadow(ctx);
        ctx.strokeStyle = '#c47a00';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    }

    // Dino lineup icons
    if (level && level.dinoIds) {
      var dinos  = level.dinoIds.slice(0, 6);
      var dw2    = 42, gap = 8;
      var totalW = dinos.length * (dw2 + gap) - gap;
      var startX = (DW - totalW) / 2;
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font      = "600 11px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Dino\'s:', DW / 2, py + 148);

      dinos.forEach(function (dinoId, di) {
        var dx = startX + di * (dw2 + gap);
        var dy = py + 158;
        // Dino icon circle
        var dc = ctx.createRadialGradient(dx + dw2/2, dy + dw2/2, 2, dx + dw2/2, dy + dw2/2, dw2/2);
        dc.addColorStop(0, '#2a3a2a');
        dc.addColorStop(1, '#101810');
        ctx.fillStyle = dc;
        ctx.beginPath();
        ctx.arc(dx + dw2/2, dy + dw2/2, dw2/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,180,60,.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Dino initial letter
        ctx.fillStyle = '#90e870';
        ctx.font      = "700 14px 'Nunito', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dinoId.charAt(0).toUpperCase(), dx + dw2/2, dy + dw2/2 + 1);
        ctx.textBaseline = 'alphabetic';
      });

      // Dino labels below icons
      dinos.forEach(function (dinoId, di) {
        var dx = startX + di * (dw2 + gap);
        ctx.fillStyle = 'rgba(200,255,180,.5)';
        ctx.font      = "600 9px 'Nunito', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(dinoId, dx + dw2/2, py + 208);
      });
    }

    // Best score
    if (stars > 0) {
      ctx.fillStyle = 'rgba(245,200,0,.8)';
      ctx.font      = "700 18px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      var score = _getLevelBestScore(levelId);
      if (score > 0) {
        ctx.fillText('Beste score: ' + score.toLocaleString('nl'), DW / 2, py + 228);
      }
    }

    // PLAY button
    var btnW = 200, btnH = 56;
    var bx   = (DW - btnW) / 2, by = py + ph - btnH - 24;
    var pulse = 1 + Math.sin(t * 3) * 0.03;
    var bpw   = btnW * pulse, bph = btnH * pulse;
    var bpx   = bx + (btnW - bpw) / 2, bpy = by + (btnH - bph) / 2;

    _shadow(ctx, 'rgba(0,0,0,.5)', 14);
    var bg = ctx.createLinearGradient(bpx, bpy, bpx, bpy + bph);
    bg.addColorStop(0, '#56c754');
    bg.addColorStop(1, '#2a7a28');
    ctx.fillStyle = bg;
    _rr(ctx, bpx, bpy, bpw, bph, 12);
    ctx.fill();
    _noShadow(ctx);
    ctx.strokeStyle = '#9ef59c';
    ctx.lineWidth   = 2;
    _rr(ctx, bpx + 1, bpy + 1, bpw - 2, bph - 2, 11);
    ctx.stroke();

    _shadow(ctx, 'rgba(0,0,0,.4)', 6);
    ctx.fillStyle    = '#fff';
    ctx.font         = "800 22px 'Baloo 2', cursive";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶  SPELEN', bx + btnW / 2, by + btnH / 2 + 2);
    ctx.textBaseline = 'alphabetic';
    _noShadow(ctx);

    // Close hint
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font      = "600 12px 'Nunito', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('Tik buiten panel om te sluiten', DW / 2, py + ph + 18);
  }

  function _getLevelBestScore(levelId) {
    try {
      var d = JSON.parse(localStorage.getItem('dg_l' + levelId) || '{"score":0}');
      return d.score || 0;
    } catch (e) { return 0; }
  }

  // ── HUD elements (drawn in screen space, not virtual space) ──────────────────

  function _drawHUD(ctx, scrollX, t) {
    var G        = global.Game;
    var worldIdx = _clamp(Math.round(scrollX / DW), 0, WORLD_COUNT - 1);
    var world    = WORLDS[worldIdx];

    // Title
    _shadow(ctx, 'rgba(0,0,0,.6)', 10);
    ctx.fillStyle = '#f5c842';
    ctx.font      = "800 26px 'Baloo 2', cursive";
    ctx.textAlign = 'center';
    ctx.fillText('Wereldkaart', DW / 2, 36);
    _noShadow(ctx);

    // World name subtitle
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font      = "600 14px 'Nunito', sans-serif";
    ctx.fillText(world.name, DW / 2, 54);

    // World progress dots
    for (var wi = 0; wi < WORLD_COUNT; wi++) {
      var dotX   = DW / 2 - (WORLD_COUNT - 1) * 14 + wi * 28;
      var dotY   = 70;
      var active = Math.abs(scrollX / DW - wi) < 0.5;
      ctx.beginPath();
      ctx.arc(dotX, dotY, active ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = active ? WORLDS[wi].accent : 'rgba(255,255,255,.3)';
      if (active) _shadow(ctx, WORLDS[wi].accent, 10);
      ctx.fill();
      _noShadow(ctx);
    }

    // Back button
    var btnX = 18, btnY = 12, btnW = 108, btnH = 44;
    var bg   = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    bg.addColorStop(0, '#4a90e2');
    bg.addColorStop(1, '#1a4899');
    _shadow(ctx, 'rgba(0,0,0,.4)', 10);
    ctx.fillStyle = bg;
    _rr(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    _noShadow(ctx);
    ctx.strokeStyle = '#90c8ff';
    ctx.lineWidth   = 2;
    _rr(ctx, btnX + 1, btnY + 1, btnW - 2, btnH - 2, 11);
    ctx.stroke();
    _shadow(ctx, 'rgba(0,0,0,.4)', 4);
    ctx.fillStyle    = '#fff';
    ctx.font         = "800 16px 'Baloo 2', cursive";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Terug', btnX + btnW / 2, btnY + btnH / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    _noShadow(ctx);

    // Scroll arrows (only shown when not at world boundary)
    if (scrollX > 10) {
      _drawArrowBtn(ctx, 40, DH / 2, -1, world.accent, t);
    }
    if (scrollX < (WORLD_COUNT - 1) * DW - 10) {
      _drawArrowBtn(ctx, DW - 40, DH / 2, 1, world.accent, t);
    }
  }

  function _drawArrowBtn(ctx, cx, cy, dir, color, t) {
    var pulse = 0.7 + 0.3 * Math.sin(t * 2.5);
    ctx.save();
    ctx.globalAlpha = pulse * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fill();
    ctx.strokeStyle = color + 'aa';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dir < 0 ? '◀' : '▶', cx + dir, cy + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  function _render(ctx, _viewport) {
    var G        = global.Game;
    var scrollX  = _scrollX;

    // Clear
    ctx.clearRect(0, 0, DW, DH);

    // Draw backgrounds in virtual space
    ctx.save();
    ctx.translate(-scrollX, 0);
    _drawBackground(ctx, scrollX, _t);

    // Draw paths and nodes per world
    for (var wi = 0; wi < WORLD_COUNT; wi++) {
      var pageX  = wi * DW;
      var visL   = scrollX;
      var visR   = scrollX + DW;
      if (pageX + DW < visL - 100 || pageX > visR + 100) continue;

      // Animate-in progress for this world
      var ap = _animProg;  // uniform progress for all worlds on anim-in

      _drawWorldPath(ctx, wi, ap);
    }

    // Draw nodes (on top of paths)
    for (var li = 0; li < 30; li++) {
      var levelId = li + 1;
      var gpos    = _globalPos(levelId);
      // Only draw if near visible area
      if (gpos.x < scrollX - 80 || gpos.x > scrollX + DW + 80) continue;
      var nodeAp = _animProg;
      // Stagger per node during anim-in
      var nodeThresh = (li / 29);
      if (nodeAp < nodeThresh) continue;
      _drawNode(ctx, levelId, gpos.x, gpos.y, _t);
    }

    ctx.restore();

    // Draw HUD (screen space, no scroll translate)
    _drawHUD(ctx, scrollX, _t);

    // Draw preview panel if open (screen space)
    if (_preview !== null) {
      _drawPreviewPanel(ctx, _preview, _t);
    }
  }

  // ── Input handling ────────────────────────────────────────────────────────────

  function _handleDragStart(e) {
    if (_preview !== null) return; // panel open — don't scroll
    _isDragging     = true;
    _dragStartX     = e.position.x;
    _dragScrollBase = _scrollX;
  }

  function _handleDragMove(e) {
    if (!_isDragging) return;
    var dx   = e.position.x - _dragStartX;
    _scrollX = _clamp(_dragScrollBase - dx, 0, (WORLD_COUNT - 1) * DW);
    _targetScrollX = _scrollX;
  }

  function _handleDragEnd(e) {
    if (!_isDragging) return;
    _isDragging = false;

    var dx = e.position.x - _dragStartX;

    // If it was a tap (small movement) — check for node hit or panel close
    if (e.magnitude < 18) {
      if (_preview !== null) {
        // Check PLAY button
        var pw = 560, ph = 340;
        var px = (DW - pw) / 2, py = (DH - ph) / 2;
        var btnW = 200, btnH = 56;
        var bx   = (DW - btnW) / 2, by = py + ph - btnH - 24;
        var tapX = e.position.x, tapY = e.position.y;

        if (tapX >= bx && tapX <= bx + btnW && tapY >= by && tapY <= by + btnH) {
          // PLAY — launch level
          _launchLevel(_preview);
        } else {
          // Tap outside panel — close it
          _preview = null;
        }
      } else {
        // Check back button
        if (e.position.x >= 18 && e.position.x <= 126 &&
            e.position.y >= 12 && e.position.y <= 56) {
          global.Game.showScreen('menu');
          return;
        }
        // Check arrow buttons
        if (e.position.x <= 70 && Math.abs(e.position.y - DH / 2) < 32) {
          _targetScrollX = _clamp(_scrollX - DW, 0, (WORLD_COUNT - 1) * DW);
          _targetScrollX = _snapScroll(_targetScrollX);
          return;
        }
        if (e.position.x >= DW - 70 && Math.abs(e.position.y - DH / 2) < 32) {
          _targetScrollX = _clamp(_scrollX + DW, 0, (WORLD_COUNT - 1) * DW);
          _targetScrollX = _snapScroll(_targetScrollX);
          return;
        }
        // Check level nodes
        _checkNodeTap(e.position.x, e.position.y);
      }
      return;
    }

    // It was a swipe — snap to nearest world
    var vel = -dx;  // positive = scrolled right
    var snap = _snapScroll(_scrollX + vel * 0.3);
    _targetScrollX = snap;
  }

  function _checkNodeTap(tapX, tapY) {
    var G        = global.Game;
    var maxLevel = G.state.maxLevel || 1;
    var scrollX  = _scrollX;

    // Convert screen tap to virtual space
    var vx = tapX + scrollX;
    var vy = tapY;

    for (var li = 0; li < 30; li++) {
      var levelId = li + 1;
      var gpos    = _globalPos(levelId);
      var isBoss  = (levelId % LEVELS_PER_WORLD === 0);
      var r       = (isBoss ? BOSS_R : NODE_R) + 8; // generous hit area

      var dx = vx - gpos.x;
      var dy = vy - gpos.y;
      if (dx * dx + dy * dy <= r * r) {
        if (levelId <= maxLevel) {
          _preview = levelId;
        }
        return;
      }
    }
  }

  function _launchLevel(levelId) {
    var G = global.Game;
    var level = window.LEVELS && window.LEVELS[levelId - 1];
    _preview = null;
    G.setState({ currentLevel: levelId });
    G.showScreen('gameplay');
  }

  // ── handleClick (public API) ──────────────────────────────────────────────────

  function handleClick(x, y, worldIndex) {
    // worldIndex adjusts which world's scroll position we snap to
    if (worldIndex !== undefined) {
      _targetScrollX = worldIndex * DW;
      _scrollX       = _targetScrollX;
    }
    _checkNodeTap(x, y);
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  function _update(dt) {
    _t += dt;

    // Animate-in progress
    if (_animProg < 1) {
      _animProg = _clamp(_animProg + dt / ANIM_DUR, 0, 1);
    }

    // Smooth scroll interpolation
    if (!_isDragging) {
      var diff = _targetScrollX - _scrollX;
      if (Math.abs(diff) < 0.5) {
        _scrollX = _targetScrollX;
      } else {
        _scrollX += diff * Math.min(dt * 8, 1);
      }
    }
  }

  // ── Screen enter / exit ───────────────────────────────────────────────────────

  function _enter() {
    var G = global.Game;

    // Snap scroll to current world on enter
    var curWorld    = G.state.currentWorld || 1;
    _scrollX        = _clamp(curWorld - 1, 0, WORLD_COUNT - 1) * DW;
    _targetScrollX  = _scrollX;
    _preview        = null;
    _t              = 0;
    // Don't reset _animProg here — animateIn() controls it.
    // If animateIn() was called before enter, _animProg is already 0.

    // Subscribe to drag events
    _unsubDragStart = G.on('dragStart', _handleDragStart);
    _unsubDragMove  = G.on('dragMove',  _handleDragMove);
    _unsubDragEnd   = G.on('dragEnd',   _handleDragEnd);
  }

  function _exit() {
    if (_unsubDragStart) { _unsubDragStart(); _unsubDragStart = null; }
    if (_unsubDragMove)  { _unsubDragMove();  _unsubDragMove  = null; }
    if (_unsubDragEnd)   { _unsubDragEnd();   _unsubDragEnd   = null; }
    _preview = null;
  }

  // ── Register the worldmap screen (overrides the placeholder in screens.js) ────
  // We defer with a tiny timeout so screens.js has a chance to register first,
  // then we overwrite with the full implementation.
  setTimeout(function () {
    if (global.Game) {
      global.Game.registerScreen('worldmap', {
        enter:  _enter,
        exit:   _exit,
        update: _update,
        render: _render,
      });
    }
  }, 0);

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * @namespace WorldMap
   */
  global.WorldMap = {

    /**
     * Render the world map for a given world index into an arbitrary canvas.
     * If called with the game canvas, this matches the internal render.
     *
     * @param {HTMLCanvasElement}    canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {number}               worldIndex  0-based world index
     */
    render: function (canvas, ctx, worldIndex) {
      var savedScroll    = _scrollX;
      var savedTarget    = _targetScrollX;

      // Temporarily snap to requested world
      if (worldIndex !== undefined) {
        _scrollX       = _clamp(worldIndex, 0, WORLD_COUNT - 1) * DW;
        _targetScrollX = _scrollX;
      }

      _render(ctx, null);

      _scrollX       = savedScroll;
      _targetScrollX = savedTarget;
    },

    /**
     * Handle a tap/click at design-space coordinates, optionally for a specific world.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} [worldIndex]  If provided, snaps scroll to this world first.
     */
    handleClick: handleClick,

    /**
     * Trigger the path draw-in animation.
     * Call before or after entering the worldmap screen.
     */
    animateIn: function () {
      _animProg = 0;
    },

    /**
     * Programmatically scroll to a world (0-indexed), with optional animation.
     *
     * @param {number}  worldIndex
     * @param {boolean} [instant]  Skip tween if true.
     */
    goToWorld: function (worldIndex, instant) {
      var target = _clamp(worldIndex, 0, WORLD_COUNT - 1) * DW;
      _targetScrollX = target;
      if (instant) _scrollX = target;
    },

    /** Return the currently visible world index (0-based). */
    getCurrentWorld: function () {
      return _clamp(Math.round(_scrollX / DW), 0, WORLD_COUNT - 1);
    },

    /** Return the open preview level id (1-indexed), or null. */
    getPreviewLevel: function () {
      return _preview;
    },

    /** Close the level preview panel. */
    closePreview: function () {
      _preview = null;
    },

    /** World definitions (read-only reference). */
    WORLDS: WORLDS,
  };

}(window));
