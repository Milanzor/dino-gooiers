/**
 * screens.js — Dino Gooiers non-gameplay screens
 *
 * Registers: splash, menu, worldmap, levelcomplete, gameover, bossintro
 * All rendering is done on the canvas in design-space (0-1170 × 0-540).
 * Button hit-testing uses 'dragEnd' events from Game.
 */

(function (G) {
  'use strict';

  const DW = G.DESIGN_WIDTH;   // 1170
  const DH = G.DESIGN_HEIGHT;  // 540

  // ── Shared drawing utilities ─────────────────────────────────────────────

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function shadow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }

  function noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  function drawStar(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r   = i % 2 === 0 ? outer : inner;
      const ang = (Math.PI * i) / points - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang))
              : ctx.lineTo(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
    }
    ctx.closePath();
  }

  /** Draw pulsating button with rounded corners. */
  function drawButton(ctx, x, y, w, h, label, hue, t) {
    const pulse = 1 + Math.sin(t * 3) * 0.025;
    const pw = w * pulse, ph = h * pulse;
    const px = x + (w - pw) / 2, py = y + (h - ph) / 2;
    ctx.save();
    shadow(ctx, 'rgba(0,0,0,.45)', 14);
    const bg = ctx.createLinearGradient(px, py, px, py + ph);
    bg.addColorStop(0, hue.top);
    bg.addColorStop(1, hue.bot);
    ctx.fillStyle = bg;
    rr(ctx, px, py, pw, ph, 14);
    ctx.fill();
    noShadow(ctx);
    // border
    ctx.strokeStyle = hue.border;
    ctx.lineWidth = 2.5;
    rr(ctx, px + 1, py + 1, pw - 2, ph - 2, 13);
    ctx.stroke();
    // text
    shadow(ctx, 'rgba(0,0,0,.5)', 6);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(ph * 0.38)}px 'Baloo 2', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + pw / 2, py + ph / 2 + 2);
    noShadow(ctx);
    ctx.restore();
  }

  const BTN_GREEN  = { top: '#56c754', bot: '#2e8b2c', border: '#9ef59c' };
  const BTN_ORANGE = { top: '#ff9a2a', bot: '#c05800', border: '#ffd090' };
  const BTN_BLUE   = { top: '#4a90e2', bot: '#1a4899', border: '#90c8ff' };
  const BTN_RED    = { top: '#e25050', bot: '#991818', border: '#ff9090' };
  const BTN_GOLD   = { top: '#f5c842', bot: '#c47a00', border: '#ffe090' };

  /** Sky gradient for current world */
  function drawSky(ctx, world, t) {
    let colors;
    if (world === 3) {
      colors = ['#0a0612', '#180c2a', '#2a1040'];
    } else if (world === 2) {
      colors = ['#0d1b38', '#23366a', '#5c3e88'];
    } else {
      colors = ['#e05020', '#f08030', '#ffc060'];
    }
    const g = ctx.createLinearGradient(0, 0, 0, DH * 0.72);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.5, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DW, DH * 0.72);
  }

  /** Draw animated stars (world 2 & 3) */
  function drawStars(ctx, t, count) {
    count = count || 80;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < count; i++) {
      const x = ((i * 1317 + 47) % 1100) + 35;
      const y = ((i * 787 + 23) % 300) + 10;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i * 0.7));
      const r = (1 + (i % 3) * 0.7) * twinkle;
      ctx.globalAlpha = twinkle * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Draw distant mountain silhouettes */
  function drawMountains(ctx, world) {
    const col  = world === 1 ? '#5a3010'
               : world === 2 ? '#1a1a3a' : '#0a0a1a';
    const col2 = world === 1 ? '#7a5030'
               : world === 2 ? '#252550' : '#101028';
    // Back mountains
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, DH * 0.72);
    const pts = [50,0.52, 150,0.38, 250,0.55, 380,0.3, 500,0.48, 620,0.25,
                 750,0.42, 870,0.28, 1000,0.44, 1100,0.32, 1170,0.46];
    for (let i = 0; i < pts.length; i += 2) {
      ctx.lineTo(pts[i], DH * pts[i + 1]);
    }
    ctx.lineTo(DW, DH * 0.72);
    ctx.closePath();
    ctx.fill();
    // Front mountains
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(0, DH * 0.72);
    const pts2 = [80,0.64, 200,0.54, 330,0.68, 450,0.48, 570,0.62, 680,0.45,
                  800,0.60, 920,0.50, 1050,0.65, 1170,0.55];
    for (let i = 0; i < pts2.length; i += 2) {
      ctx.lineTo(pts2[i], DH * pts2[i + 1]);
    }
    ctx.lineTo(DW, DH * 0.72);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw ground band */
  function drawGround(ctx, world) {
    const gy = DH * 0.72;
    const gh = DH - gy;
    const g = ctx.createLinearGradient(0, gy, 0, DH);
    if (world === 1) {
      g.addColorStop(0, '#6a4020'); g.addColorStop(1, '#3a2010');
    } else if (world === 2) {
      g.addColorStop(0, '#505060'); g.addColorStop(1, '#282830');
    } else {
      g.addColorStop(0, '#303040'); g.addColorStop(1, '#101018');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, DW, gh);
    // Ground stripe (hazard) for world 3
    if (world === 3) {
      const stripeH = 16;
      for (let x = 0; x < DW; x += 36) {
        ctx.fillStyle = x % 72 < 36 ? 'rgba(255,180,0,.15)' : 'transparent';
        ctx.fillRect(x, DH - stripeH, 36, stripeH);
      }
    }
  }

  /** Draw animated clouds (world 1) */
  function drawClouds(ctx, t) {
    ctx.fillStyle = 'rgba(255,220,180,.35)';
    [[200, 80, 100, 36], [450, 60, 130, 28], [720, 95, 90, 32],
     [950, 70, 110, 34], [350, 120, 70, 22]].forEach(([bx, y, w, h], i) => {
      const x = ((bx + t * 18 * (1 + i * 0.3)) % (DW + 200)) - 100;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.4, y - h * 0.35, w * 0.55, h * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Full scene background (sky + features + ground) */
  function drawBackground(ctx, world, t) {
    drawSky(ctx, world, t);
    if (world > 1) drawStars(ctx, t, world === 3 ? 120 : 70);
    if (world === 1) drawClouds(ctx, t);
    drawMountains(ctx, world);
    drawGround(ctx, world);
  }

  /** Draw the logo text (DINO GOOIERS / Bouw ze plat!) */
  function drawLogo(ctx, cx, cy, scale, t) {
    scale = scale || 1;
    ctx.save();
    ctx.textAlign = 'center';
    // Shadow layer
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.font = `${Math.round(scale * 88)}px 'Bungee', cursive`;
    ctx.fillText('DINO GOOIERS', cx + 3, cy + 7);
    // Main text
    shadow(ctx, 'rgba(245,180,0,.7)', 28 * scale);
    ctx.fillStyle = '#f5c842';
    ctx.font = `${Math.round(scale * 88)}px 'Bungee', cursive`;
    ctx.fillText('DINO GOOIERS', cx, cy);
    // Subtitle
    noShadow(ctx);
    shadow(ctx, 'rgba(180,80,0,.6)', 14 * scale);
    ctx.fillStyle = '#ff8c2a';
    ctx.font = `800 ${Math.round(scale * 32)}px 'Baloo 2', cursive`;
    ctx.letterSpacing = '3px';
    ctx.fillText('BOUW ZE PLAT!', cx, cy + scale * 52);
    ctx.letterSpacing = '0px';
    noShadow(ctx);
    ctx.restore();
  }

  // ── Button tap system ────────────────────────────────────────────────────

  let _activeButtons = [];
  let _tapOffFn = null;

  function registerButtons(buttons) {
    clearButtons();
    _activeButtons = buttons;
    _tapOffFn = G.on('dragEnd', function (e) {
      if (e.magnitude > 18) return; // not a tap
      const { x, y } = e.position;
      _activeButtons.forEach(function (b) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          b.onClick();
        }
      });
    });
  }

  function clearButtons() {
    _activeButtons = [];
    if (_tapOffFn) { _tapOffFn(); _tapOffFn = null; }
  }

  // ── SPLASH SCREEN ────────────────────────────────────────────────────────

  let _splashT = 0;
  let _splashDone = false;

  G.registerScreen('splash', {
    enter: function () {
      _splashT = 0;
      _splashDone = false;
    },
    exit:   function () { clearButtons(); },
    update: function (dt) {
      _splashT += dt;
      if (_splashT > 0.5 && !_splashDone && window._assetsReady) {
        _splashDone = true;
        G.showScreen('menu');
      }
    },
    render: function (ctx) {
      // Background
      drawBackground(ctx, 1, _splashT);
      // Logo
      const pulse = 1 + Math.sin(_splashT * 2.2) * 0.018;
      ctx.save();
      ctx.translate(DW / 2, DH * 0.38);
      ctx.scale(pulse, pulse);
      drawLogo(ctx, 0, 0, 1, _splashT);
      ctx.restore();
      // Loading bar
      const progress = window._loadProgress || 0;
      const bw = 360, bh = 10;
      const bx = (DW - bw) / 2, by = DH * 0.72;
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      rr(ctx, bx, by, bw, bh, 5);
      ctx.fill();
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#f5c842');
      grad.addColorStop(1, '#ff8c2a');
      ctx.fillStyle = grad;
      rr(ctx, bx, by, bw * progress, bh, 5);
      ctx.fill();
    },
  });

  // ── MENU SCREEN ──────────────────────────────────────────────────────────

  let _menuT = 0;

  G.registerScreen('menu', {
    enter: function () {
      _menuT = 0;
      registerButtons([
        { x: DW/2 - 140, y: DH * 0.62, w: 280, h: 72,
          onClick: function () { G.showScreen('worldmap'); } },
      ]);
    },
    exit:   function () { clearButtons(); _menuT = 0; },
    update: function (dt) { _menuT += dt; },
    render: function (ctx) {
      drawBackground(ctx, G.state.currentWorld || 1, _menuT);

      // Glow halo behind logo
      shadow(ctx, 'rgba(245,180,0,.3)', 60);
      ctx.fillStyle = 'transparent';
      ctx.beginPath();
      ctx.arc(DW / 2, DH * 0.32, 160, 0, Math.PI * 2);
      ctx.fill();
      noShadow(ctx);

      // Logo
      drawLogo(ctx, DW / 2, DH * 0.30, 1, _menuT);

      // High score
      const best = window.Storage ? Storage.getBestTotal() : 0;
      if (best > 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,230,140,.75)';
        ctx.font = "600 20px 'Nunito', sans-serif";
        ctx.fillText('Beste: ' + best.toLocaleString('nl'), DW / 2, DH * 0.56);
      }

      // Play button
      drawButton(ctx, DW/2 - 140, DH * 0.62, 280, 72, '▶  SPELEN', BTN_GREEN, _menuT);
    },
  });

  // ── WORLD MAP SCREEN ─────────────────────────────────────────────────────

  let _mapT = 0;
  let _mapScroll = 0;

  const WORLD_COLORS = [
    { bg: '#2a5020', node: '#56c754', boss: '#f5c842', name: 'Jungle Ruïnes' },
    { bg: '#1a2850', node: '#4a90e2', boss: '#f5c842', name: 'Stenen Stad'   },
    { bg: '#201828', node: '#c050d0', boss: '#f5c842', name: 'Stalen Burcht' },
  ];

  G.registerScreen('worldmap', {
    enter: function () {
      _mapT = 0;
      registerButtons([
        // Back button
        { x: 20, y: 14, w: 110, h: 44,
          onClick: function () { G.showScreen('menu'); } },
      ]);
      // Register level node buttons dynamically (up to 30)
      const unlocked = G.state.maxLevel || 1;
      for (let i = 0; i < 30; i++) {
        const pos = _levelNodePos(i);
        const btn = {
          x: pos.x - 30, y: pos.y - 30, w: 60, h: 60,
          levelIdx: i,
          onClick: (function (li) {
            return function () {
              if (li + 1 > (G.state.maxLevel || 1)) return;
              G.setState({ currentLevel: li + 1 });
              G.showScreen('gameplay');
            };
          }(i)),
        };
        _activeButtons.push(btn);
      }
    },
    exit:   function () { clearButtons(); },
    update: function (dt) { _mapT += dt; },
    render: function (ctx) {
      // Background: world-coloured gradient
      const worldIdx = Math.floor((G.state.currentLevel - 1) / 10);
      const wc = WORLD_COLORS[Math.min(worldIdx, 2)];
      const g = ctx.createLinearGradient(0, 0, 0, DH);
      g.addColorStop(0, '#0a0612'); g.addColorStop(1, wc.bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, DW, DH);

      // Draw path connecting nodes
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = 6;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      for (let i = 0; i < 30; i++) {
        const p = _levelNodePos(i);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const unlocked = G.state.maxLevel || 1;
      const stars    = G.state.stars    || [];

      for (let i = 0; i < 30; i++) {
        const p    = _levelNodePos(i);
        const lvl  = i + 1;
        const st   = stars[i] || 0;
        const isBoss = (lvl % 10 === 0);
        const isLocked = lvl > unlocked;
        const isActive = lvl === G.state.currentLevel;
        const worldFor = Math.floor(i / 10);
        const color  = WORLD_COLORS[worldFor];

        // Node glow for active
        if (isActive) {
          const pulse = 1 + Math.sin(_mapT * 3) * 0.12;
          shadow(ctx, color.node, 22 * pulse);
        }

        // Node circle
        const r = isBoss ? 32 : 24;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isLocked ? '#1a1a2a'
                      : isBoss   ? color.boss : color.node;
        ctx.fill();

        // Border
        ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,.35)';
        ctx.lineWidth = isActive ? 3.5 : 1.5;
        ctx.stroke();
        noShadow(ctx);

        // Level number or lock
        ctx.fillStyle = isLocked ? 'rgba(255,255,255,.25)' : '#fff';
        ctx.font = `800 ${isBoss ? 14 : 13}px 'Nunito', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isLocked ? '🔒' : (isBoss ? '👑' : lvl), p.x, p.y);

        // Stars below node
        if (st > 0 && !isLocked) {
          for (let s = 0; s < 3; s++) {
            const sx = p.x - 12 + s * 12;
            const sy = p.y + r + 10;
            drawStar(ctx, sx, sy, 6, 3, 5);
            ctx.fillStyle = s < st ? '#f5c842' : 'rgba(255,255,255,.2)';
            ctx.fill();
          }
        }
      }

      // World labels
      WORLD_COLORS.forEach(function (wc2, wi) {
        const p = _levelNodePos(wi * 10);
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.font = "700 14px 'Nunito', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('Wereld ' + (wi + 1) + ' — ' + wc2.name, p.x + 60, p.y - 44);
      });

      // Back button
      drawButton(ctx, 20, 14, 110, 44, '← Terug', BTN_BLUE, _mapT);

      // Title
      ctx.fillStyle = '#f5c842';
      ctx.font = "800 26px 'Baloo 2', cursive";
      ctx.textAlign = 'center';
      ctx.fillText('Wereldkaart', DW / 2, 34);
    },
  });

  /** Return canvas position for level index i (0-based) in a winding path. */
  function _levelNodePos(i) {
    const world = Math.floor(i / 10);
    const li    = i % 10; // level within world 0-9
    // Serpentine: odd rows go right-to-left
    const row = Math.floor(li / 5);
    const col = li % 5;
    const effectiveCol = row % 2 === 0 ? col : 4 - col;
    const worldOffX = world * 380;
    const x = 80 + worldOffX + effectiveCol * 68;
    const y = row === 0 ? 200 : 370;
    return { x: Math.min(x, DW - 60), y };
  }

  // ── LEVEL COMPLETE SCREEN ────────────────────────────────────────────────

  let _lcT = 0;
  let _lcStars = 0;
  let _lcScore = 0;

  G.registerScreen('levelcomplete', {
    enter: function () {
      _lcT = 0;
      _lcStars = G.state.lastStars || 0;
      _lcScore = G.state.lastScore || 0;
      const isLast = G.state.currentLevel >= 30;
      registerButtons([
        { x: DW/2 - 270, y: DH * 0.72, w: 230, h: 68,
          onClick: function () {
            G.setState({ currentLevel: G.state.currentLevel });
            G.showScreen('gameplay');
          }},
        { x: DW/2 + 40, y: DH * 0.72, w: 230, h: 68,
          onClick: function () {
            if (!isLast) {
              G.setState({ currentLevel: G.state.currentLevel + 1 });
              G.showScreen('gameplay');
            } else {
              G.showScreen('worldmap');
            }
          }},
      ]);
    },
    exit:   function () { clearButtons(); },
    update: function (dt) { _lcT += dt; },
    render: function (ctx) {
      // Dim overlay
      ctx.fillStyle = 'rgba(10,6,18,.82)';
      ctx.fillRect(0, 0, DW, DH);

      // Panel
      const pw = 640, ph = 480;
      const px = (DW - pw) / 2, py = (DH - ph) / 2;
      const pg = ctx.createLinearGradient(px, py, px, py + ph);
      pg.addColorStop(0, '#1e1040');
      pg.addColorStop(1, '#0a0820');
      shadow(ctx, 'rgba(80,40,160,.6)', 40);
      ctx.fillStyle = pg;
      rr(ctx, px, py, pw, ph, 24);
      ctx.fill();
      noShadow(ctx);
      ctx.strokeStyle = 'rgba(180,130,255,.3)';
      ctx.lineWidth = 2;
      rr(ctx, px + 1, py + 1, pw - 2, ph - 2, 23);
      ctx.stroke();

      // Title
      shadow(ctx, 'rgba(100,255,80,.5)', 20);
      ctx.fillStyle = '#6eff50';
      ctx.font = "800 46px 'Bungee', cursive";
      ctx.textAlign = 'center';
      ctx.fillText('NIVEAU KLAAR!', DW / 2, py + 68);
      noShadow(ctx);

      // Stars
      const starReveal = Math.min(_lcT / 0.8, 1); // all stars in 0.8 s
      for (let s = 0; s < 3; s++) {
        const shown = s < _lcStars && starReveal > s / 3;
        const scale = shown ? Math.min((_lcT - s * 0.25) / 0.3, 1) : 0.35;
        const sx = DW / 2 + (s - 1) * 110;
        const sy = py + 170;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);
        drawStar(ctx, 0, 0, 48, 22, 5);
        ctx.fillStyle = shown ? '#f5c842' : 'rgba(255,255,255,.18)';
        shadow(ctx, shown ? 'rgba(245,200,0,.7)' : 'transparent', 18);
        ctx.fill();
        noShadow(ctx);
        ctx.strokeStyle = shown ? '#c47a00' : 'rgba(255,255,255,.1)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Score
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = "700 26px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Score: ' + _lcScore.toLocaleString('nl'), DW / 2, py + 270);

      // Level name
      const lv = window.LEVELS[G.state.currentLevel - 1];
      ctx.fillStyle = 'rgba(200,180,255,.65)';
      ctx.font = "600 18px 'Nunito', sans-serif";
      ctx.fillText('Niveau ' + G.state.currentLevel + ' — ' + (lv ? lv.name : ''), DW / 2, py + 302);

      // Buttons
      drawButton(ctx, DW/2 - 270, DH * 0.72, 230, 68, '↩ Opnieuw', BTN_ORANGE, _lcT);
      const isLast = G.state.currentLevel >= 30;
      drawButton(ctx, DW/2 + 40, DH * 0.72, 230, 68,
        isLast ? '🗺️ Kaart' : 'Volgende ▶', BTN_GREEN, _lcT);
    },
  });

  // ── GAME OVER SCREEN ─────────────────────────────────────────────────────

  let _goT = 0;

  G.registerScreen('gameover', {
    enter: function () {
      _goT = 0;
      registerButtons([
        { x: DW/2 - 150, y: DH * 0.68, w: 300, h: 72,
          onClick: function () {
            G.showScreen('gameplay');
          }},
        { x: DW/2 - 80, y: DH * 0.82, w: 160, h: 48,
          onClick: function () { G.showScreen('worldmap'); }},
      ]);
    },
    exit:   function () { clearButtons(); _goT = 0; },
    update: function (dt) { _goT += dt; },
    render: function (ctx) {
      ctx.fillStyle = 'rgba(10,6,18,.88)';
      ctx.fillRect(0, 0, DW, DH);

      // Panel
      const pw = 520, ph = 400;
      const px = (DW - pw) / 2, py = (DH - ph) / 2 - 20;
      shadow(ctx, 'rgba(200,40,40,.5)', 40);
      ctx.fillStyle = '#180810';
      rr(ctx, px, py, pw, ph, 24);
      ctx.fill();
      noShadow(ctx);
      ctx.strokeStyle = 'rgba(200,60,60,.4)';
      ctx.lineWidth = 2;
      rr(ctx, px+1, py+1, pw-2, ph-2, 23);
      ctx.stroke();

      // Title wobble
      const shake = Math.sin(_goT * 8) * (Math.max(0, 0.5 - _goT) * 6);
      ctx.save();
      ctx.translate(DW/2 + shake, DH * 0.3);
      shadow(ctx, 'rgba(255,60,60,.7)', 28);
      ctx.fillStyle = '#ff4040';
      ctx.font = "800 62px 'Bungee', cursive";
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 0, 0);
      noShadow(ctx);
      ctx.restore();

      ctx.fillStyle = 'rgba(255,180,180,.75)';
      ctx.font = "700 22px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('De Tirannen hebben gewonnen... dit keer.', DW/2, DH * 0.46);

      const sc = G.state.lastScore || 0;
      ctx.fillStyle = '#f5c842';
      ctx.font = "700 26px 'Nunito', sans-serif";
      ctx.fillText('Score: ' + sc.toLocaleString('nl'), DW/2, DH * 0.54);

      drawButton(ctx, DW/2 - 150, DH * 0.63, 300, 68, '↩ Probeer Opnieuw', BTN_RED, _goT);
      drawButton(ctx, DW/2 - 80, DH * 0.78, 160, 44, '🗺️ Kaart', BTN_BLUE, _goT);
    },
  });

  // ── BOSS INTRO SCREEN ────────────────────────────────────────────────────

  let _bossT = 0;

  G.registerScreen('bossintro', {
    enter: function () {
      _bossT = 0;
      setTimeout(function () {
        G.showScreen('gameplay');
      }, 3200);
    },
    exit:   function () {},
    update: function (dt) { _bossT += dt; },
    render: function (ctx) {
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(0, 0, DW, DH);

      // Lightning flashes
      const flash = Math.max(0, Math.sin(_bossT * 12) - 0.6) / 0.4;
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,100,50,' + (flash * 0.25) + ')';
        ctx.fillRect(0, 0, DW, DH);
      }

      // BOSS text
      const scale = Math.min(_bossT / 0.5, 1);
      ctx.save();
      ctx.translate(DW / 2, DH * 0.38);
      ctx.scale(scale, scale);
      shadow(ctx, 'rgba(255,50,0,.8)', 40);
      ctx.fillStyle = '#ff2020';
      ctx.font = "800 80px 'Bungee', cursive";
      ctx.textAlign = 'center';
      ctx.fillText('BAAS!', 0, 0);
      noShadow(ctx);

      const lv = window.LEVELS[G.state.currentLevel - 1];
      if (lv) {
        shadow(ctx, 'rgba(245,200,0,.5)', 16);
        ctx.fillStyle = '#f5c842';
        ctx.font = "700 32px 'Baloo 2', cursive";
        ctx.fillText(lv.name, 0, 60);
        noShadow(ctx);
      }
      ctx.restore();

      // Warning stripe bars (top and bottom)
      const stripe = 14;
      for (let x = -36; x < DW + 36; x += 36) {
        const alt = Math.floor((x + _bossT * 40) / 36) % 2;
        ctx.fillStyle = alt ? 'rgba(255,180,0,.75)' : 'rgba(0,0,0,.75)';
        ctx.save();
        ctx.transform(1, 0, 0.5, 1, 0, 0);
        ctx.fillRect(x, 0, 36, stripe);
        ctx.fillRect(x, DH - stripe, 36, stripe);
        ctx.restore();
      }
    },
  });

  // ── Storage helper (thin wrapper; real storage in main.js) ───────────────
  // Exposed here so button callbacks can call it safely
  window.Storage = window.Storage || {
    getBestTotal:  function () { return parseInt(localStorage.getItem('dg_best') || '0', 10); },
    saveLevel:     function (lvl, stars, score) {
      const key = 'dg_l' + lvl;
      const prev = JSON.parse(localStorage.getItem(key) || '{"stars":0,"score":0}');
      if (stars > prev.stars || (stars === prev.stars && score > prev.score)) {
        localStorage.setItem(key, JSON.stringify({ stars, score }));
      }
      const best = parseInt(localStorage.getItem('dg_best') || '0', 10);
      if (score > best) localStorage.setItem('dg_best', score);
      const maxLv = parseInt(localStorage.getItem('dg_maxlv') || '1', 10);
      if (lvl + 1 > maxLv) localStorage.setItem('dg_maxlv', lvl + 1);
    },
    load: function () {
      const stars = [];
      for (let i = 0; i < 30; i++) {
        const d = JSON.parse(localStorage.getItem('dg_l' + (i + 1)) || '{"stars":0}');
        stars.push(d.stars);
      }
      const maxLevel = parseInt(localStorage.getItem('dg_maxlv') || '1', 10);
      return { stars, maxLevel };
    },
  };

}(window.Game));
