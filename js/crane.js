/**
 * crane.js — Dino Gooiers construction-crane launcher mechanic
 *
 * Replaces the classic Angry Birds slingshot with an iconic yellow
 * construction crane on the left side of the gameplay canvas.
 *
 * Design canvas : 1170 × 540  (matches engine.js DESIGN_WIDTH / DESIGN_HEIGHT)
 * Ground line   : y = 490
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  CRANE GEOMETRY (design pixels, not scaled)                            │
 * │                                                                        │
 * │    [beacon]                                                            │
 * │    [apex]                                                              │
 * │    ◢══════════════════════════════════════╗ boom tip                  │
 * │    ║ counterweight ┤                      ║ pulley                    │
 * │    ╚══════════════════════════════════════╝   │                       │
 * │    ╔═╗  cab                                   │ cable                 │
 * │    ╠═╣  lattice mast (X-braced)               │                       │
 * │    ╠═╣                                    [cradle / hook]             │
 * │    ╠═╣                                    [current dino here]         │
 * │    ╠═╣                                                                │
 * │  ══╧═╧══  base pads / crawler tracks                                  │
 * │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  GROUND  y=490                       │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Exposed:  window.Crane
 *
 * API:
 *   Crane.init(canvas, dinoQueue)
 *   Crane.update(dt)
 *   Crane.draw(ctx)
 *   Crane.handleMouseDown(x, y)
 *   Crane.handleMouseMove(x, y)
 *   Crane.handleMouseUp(x, y)
 *   Crane.getCurrentDino()        → dino object (or id string) | null
 *   Crane.launchDino()            → { velocityX, velocityY }
 *   Crane.drawCrane(ctx, state)   (also exported for external renderers)
 *   Crane.drawTrajectory(ctx, sx, sy, vx, vy, gravity)
 *   Crane.drawDinoQueue(ctx, queue)
 */

(function (global) {
  'use strict';

  // ── Design coordinate system ───────────────────────────────────────────────
  var DW = 1170;   // design width
  var DH = 540;    // design height

  // ── Crane geometry constants ───────────────────────────────────────────────
  //  Mast is centred at x=120, spanning x=60..180 (~120 px wide as requested).
  //  Tower runs from y=88 down to GROUND_Y=490.
  //  Main boom extends right from the mast top to x=368 (~240 px arm length).

  var MAST_CX       = 120;    // mast centre X
  var MAST_W        = 28;     // mast chord width (between rail centrelines)
  var MAST_TOP_Y    = 88;     // tip of the lattice tower
  var BOOM_Y        = 100;    // vertical centre of the main boom
  var BOOM_H        = 20;     // boom cross-section height
  var BOOM_END_X    = 368;    // right end of boom (cable exit)
  var CJIB_END_X    = 22;     // left end of counter-jib
  var GROUND_Y      = 490;    // ground reference y

  // Pulley / hook geometry
  var PULLEY_Y      = BOOM_Y + BOOM_H / 2 + 8;   // pulley wheel centre y
  var HOOK_X        = BOOM_END_X;                  // cable exit x
  var HOOK_Y        = PULLEY_Y;                    // cable exit y

  // Dino resting position (hangs below pulley)
  var REST_X        = HOOK_X;
  var REST_Y        = 340;

  // Cab geometry
  var CAB_X         = MAST_CX - 20;
  var CAB_Y         = BOOM_Y + BOOM_H + 4;
  var CAB_W         = 46;
  var CAB_H         = 38;

  // ── Launch mechanics ───────────────────────────────────────────────────────
  var MAX_PULL      = 120;    // max drag distance from REST_X/Y (design px)
  var LAUNCH_K      = 0.112;  // velocity = pull_distance × LAUNCH_K  (≈13.4 at max)
  var DINO_R        = 22;     // visual radius of dino in cradle

  // ── Post-launch cable animation ────────────────────────────────────────────
  var SWING_K       = 0.22;   // spring stiffness (per 60fps step)
  var SWING_DAMP    = 0.82;   // velocity damping factor per step

  // ── Module state ───────────────────────────────────────────────────────────
  var _canvas     = null;
  var _queue      = [];       // waiting dino objects / ids
  var _curDino    = null;     // dino currently in cradle

  // Phase: 'idle' | 'aiming' | 'launched' | 'loading' | 'empty'
  var _phase      = 'empty';
  var _t          = 0;        // seconds, global animation clock

  // Drag
  var _isDragging = false;
  var _dragPos    = { x: REST_X, y: REST_Y };

  // Cable swing after launch
  var _cableEndX  = REST_X;
  var _cableEndY  = REST_Y;
  var _cableVX    = 0;
  var _cableVY    = 0;

  // Load animation (next dino rising into cradle)
  var _loadT      = 0;    // 0..1 progress
  var _loadFromY  = GROUND_Y + 30;

  // Boom bob
  var _bobY       = 0;    // vertical offset applied to boom & cab

  // Launch result (returned by launchDino())
  var _lastVelX   = 0;
  var _lastVelY   = 0;

  // ── Tiny helpers ──────────────────────────────────────────────────────────

  function _rr(ctx, x, y, w, h, r) {
    // Rounded rectangle path helper. r may be a number or array (uses first value).
    var rVal = Array.isArray(r) ? r[0] : (r || 0);
    rVal = Math.min(rVal, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rVal, y);
    ctx.lineTo(x + w - rVal, y);
    ctx.arcTo(x + w, y,     x + w,     y + rVal, rVal);
    ctx.lineTo(x + w,     y + h - rVal);
    ctx.arcTo(x + w, y + h, x + w - rVal, y + h, rVal);
    ctx.lineTo(x + rVal,  y + h);
    ctx.arcTo(x, y + h,   x,            y + h - rVal, rVal);
    ctx.lineTo(x,         y + rVal);
    ctx.arcTo(x, y,       x + rVal,     y, rVal);
    ctx.closePath();
  }

  function _sha(ctx, col, blur) { ctx.shadowColor = col; ctx.shadowBlur = blur; }
  function _noSha(ctx)          { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }

  function _easeOutBack(t) {
    // Overshoot ease: smooth arrival with slight spring
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function _dinoId(dino) {
    if (!dino) return null;
    if (typeof dino === 'string') return dino;
    return dino.id || null;
  }

  function _dinoColors(dino) {
    if (dino && dino.colors) return dino.colors;
    return { main: '#6ab04c', dark: '#3a6030', belly: '#b0e080', ink: '#0a1a00' };
  }

  // ── Public: init ──────────────────────────────────────────────────────────

  /**
   * Initialise the crane module.
   * @param {HTMLCanvasElement} canvas
   * @param {Array}             dinoQueue  Array of dino objects or ID strings
   */
  function init(canvas, dinoQueue) {
    _canvas    = canvas;
    _queue     = dinoQueue ? dinoQueue.slice() : [];
    _t         = 0;
    _bobY      = 0;
    _isDragging = false;
    _dragPos    = { x: REST_X, y: REST_Y };
    _lastVelX   = 0;
    _lastVelY   = 0;

    if (_queue.length > 0) {
      _curDino = _queue.shift();
      _phase   = 'idle';
    } else {
      _curDino = null;
      _phase   = 'empty';
    }

    _resetCable();
  }

  function _resetCable() {
    _cableEndX = REST_X;
    _cableEndY = REST_Y;
    _cableVX   = 0;
    _cableVY   = 0;
  }

  // ── Public: update ────────────────────────────────────────────────────────

  /**
   * Update crane state and animations. Call once per frame.
   * @param {number} dt  Delta time in seconds
   */
  function update(dt) {
    _t += dt;

    // Gentle boom bob (always running)
    _bobY = Math.sin(_t * 1.6) * 2.5;

    if (_phase === 'launched') {
      // Spring the cable back toward rest position
      var dtFactor = dt * 60; // normalise to 60 fps
      var spX = (REST_X - _cableEndX) * SWING_K;
      var spY = (REST_Y - _cableEndY) * SWING_K;
      _cableVX = (_cableVX + spX) * SWING_DAMP;
      _cableVY = (_cableVY + spY) * SWING_DAMP;
      _cableEndX += _cableVX * dtFactor;
      _cableEndY += _cableVY * dtFactor;

      // Settle check
      var dxR = REST_X - _cableEndX;
      var dyR = REST_Y - _cableEndY;
      if (Math.sqrt(dxR * dxR + dyR * dyR) < 4 &&
          Math.abs(_cableVX) < 0.8 && Math.abs(_cableVY) < 0.8) {
        _cableEndX = REST_X;
        _cableEndY = REST_Y;
        _cableVX   = 0;
        _cableVY   = 0;

        if (_queue.length > 0) {
          _phase    = 'loading';
          _loadT    = 0;
          _loadFromY = GROUND_Y + 40;
        } else {
          _curDino = null;
          _phase   = 'empty';
        }
      }
    }

    if (_phase === 'loading') {
      _loadT += dt * 1.5; // ~0.67 s load time
      if (_loadT >= 1) {
        _loadT   = 1;
        _curDino = _queue.shift() || null;
        _phase   = _curDino ? 'idle' : 'empty';
        _loadT   = 0;
      }
    }
  }

  // ── Public: draw ─────────────────────────────────────────────────────────

  /**
   * Full crane draw: structure, cable, dino cradle, queue, trajectory & gauge.
   * Call inside the game's render function after the background is drawn.
   * @param {CanvasRenderingContext2D} ctx
   */
  function draw(ctx) {
    drawCrane(ctx, { bobY: _bobY, t: _t });

    // Trajectory + power gauge while player is dragging
    if (_phase === 'aiming' && _isDragging) {
      var vx = (HOOK_X - _dragPos.x) * LAUNCH_K;
      var vy = (HOOK_Y - _dragPos.y) * LAUNCH_K;
      drawTrajectory(ctx, _dragPos.x, _dragPos.y, vx, vy, 0.52);
      _drawPowerGauge(ctx);
    }

    // Cable and cradle / dino
    _drawCableAndDino(ctx);

    // Waiting dinos at base
    drawDinoQueue(ctx, _queue);
  }

  // ── drawCrane ─────────────────────────────────────────────────────────────

  /**
   * Draw the full crane structure (tower, boom, counterweight, cab, pulley).
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ bobY?: number, t?: number }} craneState
   */
  function drawCrane(ctx, craneState) {
    var bY   = (craneState && craneState.bobY) || 0;
    var t    = (craneState && craneState.t)    || 0;
    var mx   = MAST_CX;
    var boomY = BOOM_Y + bY * 0.35;

    ctx.save();

    // ── 1. Crawler / base pads ─────────────────────────────────────────────

    // Crawler track body
    ctx.fillStyle = '#3a3a4a';
    _rr(ctx, mx - 72, GROUND_Y - 2, 144, 14, 5);
    ctx.fill();

    // Crawler segments
    ctx.fillStyle = '#505060';
    for (var i = 0; i < 9; i++) {
      _rr(ctx, mx - 70 + i * 16, GROUND_Y, 13, 12, 3);
      ctx.fill();
    }

    // Hazard stripe on base (yellow / black diagonal)
    ctx.save();
    _rr(ctx, mx - 72, GROUND_Y - 18, 144, 18, 4);
    ctx.fill(); // fills with above style — we repaint below
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    _rr(ctx, mx - 72, GROUND_Y - 18, 144, 18, 4);
    ctx.clip();
    for (var si = -4; si < 12; si++) {
      ctx.fillStyle = (si % 2 === 0) ? '#f5c000' : '#1e1e2e';
      ctx.fillRect(mx - 72 + si * 13, GROUND_Y - 18, 13, 18);
    }
    ctx.restore();

    // Base pad outline
    ctx.strokeStyle = '#282836';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    _rr(ctx, mx - 72, GROUND_Y - 18, 144, 18, 4);
    ctx.stroke();

    // ── 2. Lattice mast (tower) ────────────────────────────────────────────

    var leftRail  = mx - MAST_W / 2;
    var rightRail = mx + MAST_W / 2;

    // Rails (I-beam style: yellow like a real Liebherr crane)
    // Left rail fill
    ctx.fillStyle = '#f5a000';
    ctx.fillRect(leftRail - 5, MAST_TOP_Y, 10, GROUND_Y - MAST_TOP_Y - 18);
    // Right rail fill
    ctx.fillRect(rightRail - 5, MAST_TOP_Y, 10, GROUND_Y - MAST_TOP_Y - 18);

    // Hazard stripes on lower third of rails
    var railStripeTop = GROUND_Y - (GROUND_Y - MAST_TOP_Y) * 0.42;
    ctx.save();
    ctx.beginPath();
    ctx.rect(leftRail - 5, railStripeTop, 10, GROUND_Y - railStripeTop - 18);
    ctx.clip();
    for (var ri = 0; ri < 16; ri++) {
      ctx.fillStyle = (ri % 2 === 0) ? '#f5c000' : '#1a1a28';
      ctx.fillRect(leftRail - 5, railStripeTop + ri * 12, 10, 12);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(rightRail - 5, railStripeTop, 10, GROUND_Y - railStripeTop - 18);
    ctx.clip();
    for (var ri2 = 0; ri2 < 16; ri2++) {
      ctx.fillStyle = (ri2 % 2 === 0) ? '#f5c000' : '#1a1a28';
      ctx.fillRect(rightRail - 5, railStripeTop + ri2 * 12, 10, 12);
    }
    ctx.restore();

    // Rail outlines
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth   = 1;
    ctx.strokeRect(leftRail - 5, MAST_TOP_Y, 10, GROUND_Y - MAST_TOP_Y - 18);
    ctx.strokeRect(rightRail - 5, MAST_TOP_Y, 10, GROUND_Y - MAST_TOP_Y - 18);

    // Lattice X-bracing between rails
    ctx.strokeStyle = '#e09000';
    ctx.lineWidth   = 2.5;
    var braceStep = 38;
    for (var by = MAST_TOP_Y + 10; by < GROUND_Y - 32; by += braceStep) {
      ctx.beginPath();
      ctx.moveTo(leftRail,  by);
      ctx.lineTo(rightRail, by + braceStep);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightRail, by);
      ctx.lineTo(leftRail,  by + braceStep);
      ctx.stroke();
      // Horizontal chord
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftRail,  by);
      ctx.lineTo(rightRail, by);
      ctx.stroke();
      ctx.lineWidth = 2.5;
    }
    // Bottom chord
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftRail,  GROUND_Y - 20);
    ctx.lineTo(rightRail, GROUND_Y - 20);
    ctx.stroke();

    // ── 3. Operator cab ────────────────────────────────────────────────────

    var cY = CAB_Y + bY * 0.15;

    // Cab body
    _sha(ctx, 'rgba(0,0,0,.45)', 14);
    ctx.fillStyle = '#f5a000';
    ctx.beginPath();
    _rr(ctx, CAB_X, cY, CAB_W, CAB_H, 7);
    ctx.fill();
    _noSha(ctx);

    // Window glass (blue-ish)
    ctx.fillStyle = 'rgba(160,210,235,0.78)';
    ctx.beginPath();
    _rr(ctx, CAB_X + 7, cY + 8, CAB_W - 14, CAB_H - 18, 4);
    ctx.fill();

    // Window reflection gleam
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(CAB_X + 9, cY + 10);
    ctx.lineTo(CAB_X + 18, cY + 10);
    ctx.lineTo(CAB_X + 13, cY + 20);
    ctx.lineTo(CAB_X + 9,  cY + 20);
    ctx.closePath();
    ctx.fill();

    // Hazard stripe at bottom of cab
    ctx.save();
    ctx.beginPath();
    _rr(ctx, CAB_X, cY + CAB_H - 7, CAB_W, 7, 4);
    ctx.clip();
    for (var ci = 0; ci < 8; ci++) {
      ctx.fillStyle = (ci % 2 === 0) ? '#f5c000' : '#1e1e2e';
      ctx.fillRect(CAB_X + ci * 6, cY + CAB_H - 7, 6, 7);
    }
    ctx.restore();

    // Cab outline
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    _rr(ctx, CAB_X, cY, CAB_W, CAB_H, 7);
    ctx.stroke();

    // ── 4. Mast apex (triangular head) ────────────────────────────────────

    ctx.fillStyle = '#e09000';
    ctx.beginPath();
    ctx.moveTo(mx - 18, MAST_TOP_Y + 5);
    ctx.lineTo(mx,      MAST_TOP_Y - 20);
    ctx.lineTo(mx + 18, MAST_TOP_Y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 18, MAST_TOP_Y + 5);
    ctx.lineTo(mx,      MAST_TOP_Y - 20);
    ctx.lineTo(mx + 18, MAST_TOP_Y + 5);
    ctx.closePath();
    ctx.stroke();

    // Beacon light (flashes)
    var beacon = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.4));
    ctx.globalAlpha = beacon;
    _sha(ctx, 'rgba(255,60,0,.9)', 16);
    ctx.fillStyle = '#ff3808';
    ctx.beginPath();
    ctx.arc(mx, MAST_TOP_Y - 30, 5.5, 0, Math.PI * 2);
    ctx.fill();
    _noSha(ctx);
    ctx.globalAlpha = 1;

    // ── 5. Counter-jib (left arm) ──────────────────────────────────────────

    var bTop = boomY - 8;
    var bBot = boomY + BOOM_H + 6;

    ctx.fillStyle = '#e09000';
    ctx.beginPath();
    ctx.moveTo(mx - MAST_W / 2, bTop + 2);
    ctx.lineTo(CJIB_END_X, boomY + 3);
    ctx.lineTo(CJIB_END_X, boomY + BOOM_H - 3);
    ctx.lineTo(mx - MAST_W / 2, bBot - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - MAST_W / 2, bTop + 2);
    ctx.lineTo(CJIB_END_X, boomY + 3);
    ctx.lineTo(CJIB_END_X, boomY + BOOM_H - 3);
    ctx.lineTo(mx - MAST_W / 2, bBot - 2);
    ctx.closePath();
    ctx.stroke();

    // Counter-jib stay cable
    ctx.strokeStyle = '#505868';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(mx, MAST_TOP_Y - 12);
    ctx.lineTo(CJIB_END_X + 8, boomY + BOOM_H * 0.5);
    ctx.stroke();

    // Counterweight block (dark grey slab)
    ctx.fillStyle = '#505870';
    ctx.beginPath();
    _rr(ctx, CJIB_END_X - 8, boomY - 2, 22, BOOM_H + 4, 3);
    ctx.fill();
    ctx.strokeStyle = '#303848';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    _rr(ctx, CJIB_END_X - 8, boomY - 2, 22, BOOM_H + 4, 3);
    ctx.stroke();

    // ── 6. Main boom / jib ────────────────────────────────────────────────
    // Tapered trapezoidal cross-section (thicker at mast, tapers right)

    var tipTopY = boomY + 1  + bY * 0.3;
    var tipBotY = boomY + BOOM_H - 1 + bY * 0.3;

    _sha(ctx, 'rgba(0,0,0,.3)', 10);
    ctx.fillStyle = '#f5a000';
    ctx.beginPath();
    ctx.moveTo(mx + MAST_W / 2, bTop);
    ctx.lineTo(BOOM_END_X + 12, tipTopY);
    ctx.lineTo(BOOM_END_X + 12, tipBotY);
    ctx.lineTo(mx + MAST_W / 2, bBot);
    ctx.closePath();
    ctx.fill();
    _noSha(ctx);

    // Boom lower flange reinforcement strip
    ctx.fillStyle = '#d89000';
    ctx.beginPath();
    ctx.moveTo(mx + MAST_W / 2 + 6, bBot - 5);
    ctx.lineTo(BOOM_END_X + 12, tipBotY - 2);
    ctx.lineTo(BOOM_END_X + 12, tipBotY);
    ctx.lineTo(mx + MAST_W / 2 + 6, bBot);
    ctx.closePath();
    ctx.fill();

    // Hazard stripes on boom (semi-transparent dark bands)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx + MAST_W / 2, bTop);
    ctx.lineTo(BOOM_END_X + 12, tipTopY);
    ctx.lineTo(BOOM_END_X + 12, tipBotY);
    ctx.lineTo(mx + MAST_W / 2, bBot);
    ctx.closePath();
    ctx.clip();
    for (var bi = 0; bi < 22; bi++) {
      var bx = mx + MAST_W / 2 + bi * 22;
      if (bi % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        ctx.fillRect(bx, bTop - 2, 11, bBot - bTop + 4);
      }
    }
    ctx.restore();

    // Boom outline
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    ctx.moveTo(mx + MAST_W / 2, bTop);
    ctx.lineTo(BOOM_END_X + 12, tipTopY);
    ctx.lineTo(BOOM_END_X + 12, tipBotY);
    ctx.lineTo(mx + MAST_W / 2, bBot);
    ctx.closePath();
    ctx.stroke();

    // Internal truss verticals
    ctx.strokeStyle = 'rgba(192,120,0,.45)';
    ctx.lineWidth   = 1;
    var boomLen = BOOM_END_X - mx;
    for (var ti = 1; ti <= 5; ti++) {
      var tx    = mx + MAST_W / 2 + ti * (boomLen / 6);
      var ratio = (tx - mx) / boomLen;
      var ttY   = bTop  + (tipTopY - bTop)  * ratio;
      var tbY   = bBot  + (tipBotY - bBot)  * ratio;
      ctx.beginPath();
      ctx.moveTo(tx, ttY);
      ctx.lineTo(tx, tbY);
      ctx.stroke();
    }

    // ── 7. Stay cables from mast apex to boom ─────────────────────────────

    ctx.strokeStyle = '#505868';
    ctx.lineWidth   = 2.2;
    ctx.beginPath();
    ctx.moveTo(mx, MAST_TOP_Y - 14);
    ctx.lineTo(BOOM_END_X * 0.72 + mx * 0.28, tipTopY);
    ctx.stroke();

    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, MAST_TOP_Y - 14);
    ctx.lineTo(BOOM_END_X * 0.46 + mx * 0.54, tipTopY);
    ctx.stroke();

    // ── 8. Pulley wheel at boom tip ────────────────────────────────────────

    var pY = tipBotY + 8;  // pulley centre y
    _sha(ctx, 'rgba(0,0,0,.45)', 8);
    ctx.fillStyle = '#3a4858';
    ctx.beginPath();
    ctx.arc(HOOK_X, pY, 10, 0, Math.PI * 2);
    ctx.fill();
    _noSha(ctx);

    // Pulley groove
    ctx.fillStyle = '#505868';
    ctx.beginPath();
    ctx.arc(HOOK_X, pY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#282030';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(HOOK_X, pY, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Pulley hub pin
    ctx.fillStyle = '#8898a8';
    ctx.beginPath();
    ctx.arc(HOOK_X, pY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── drawTrajectory ────────────────────────────────────────────────────────

  /**
   * Draw a dotted arc trajectory preview.
   * Shows denser dots at 3-step intervals near launch, 6-step beyond 30 steps.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startX      Launch start X
   * @param {number} startY      Launch start Y
   * @param {number} velocityX   Initial horizontal velocity (px/step)
   * @param {number} velocityY   Initial vertical velocity (px/step)
   * @param {number} [gravity]   Downward acceleration per step (default 0.52)
   */
  function drawTrajectory(ctx, startX, startY, velocityX, velocityY, gravity) {
    var g = (gravity != null) ? gravity : 0.52;
    var px = startX, py = startY;
    var pvx = velocityX, pvy = velocityY;

    ctx.save();

    for (var i = 0; i < 90; i++) {
      px  += pvx;
      py  += pvy;
      pvy += g;

      if (py > GROUND_Y + 24 || px > DW + 60 || px < -60) break;

      // Show 3-dots close in, 6-dots further out
      var step = (i < 30) ? 3 : 6;
      if (i % step !== 0) continue;

      var alpha = (1 - i / 90) * 0.8;
      var sz    = Math.max(5.5 - i * 0.055, 2.5);

      // Colour ramp: green → yellow → white
      var dotColor;
      if (i < 18)      dotColor = '#5cff70';
      else if (i < 45) dotColor = '#fff060';
      else             dotColor = 'rgba(255,255,255,.85)';

      ctx.globalAlpha = alpha;

      // Soft glow ring
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.arc(px, py, sz + 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Dot
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── drawDinoQueue ─────────────────────────────────────────────────────────

  /**
   * Render waiting dinos as a row at the crane base (bottom-left area).
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array}                    dinoQueue
   */
  function drawDinoQueue(ctx, dinoQueue) {
    if (!dinoQueue || dinoQueue.length === 0) return;

    var startX   = MAST_CX - 58;
    var qY       = GROUND_Y - 44;
    var spacing  = 26;
    var maxShow  = 5;
    var count    = Math.min(dinoQueue.length, maxShow);

    ctx.save();

    for (var i = 0; i < count; i++) {
      var dino    = dinoQueue[i];
      var qx      = startX + i * spacing;
      var r       = Math.max(10 - i * 1.2, 5);
      var alpha   = Math.max(0.75 - i * 0.12, 0.28);
      var colors  = _dinoColors(dino);
      var id      = _dinoId(dino);

      ctx.globalAlpha = alpha;

      // Try preloaded SVG image
      if (global.DinoImages && id && global.DinoImages[id]) {
        var img = global.DinoImages[id];
        var sz  = r * 2.4;
        ctx.drawImage(img, qx - sz * 0.5, qY - sz * 0.5, sz, sz);
      } else {
        // Fallback: cartoon circle dino

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.arc(qx + 1, qY + 1, r, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = colors.dark;
        ctx.beginPath();
        ctx.arc(qx, qY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.main;
        ctx.beginPath();
        ctx.arc(qx - 0.5, qY - 0.5, r - 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(qx, qY + r * 0.2, r * 0.45, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(qx + r * 0.3, qY - r * 0.22, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.ink || '#111';
        ctx.beginPath();
        ctx.arc(qx + r * 0.35, qY - r * 0.2, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      // "NEXT" badge on first queued dino
      if (i === 0 && count > 1) {
        ctx.globalAlpha = Math.min(alpha + 0.1, 0.92);
        ctx.fillStyle = '#f5c842';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NEXT', qx, qY + r + 7);
      }
    }

    // Overflow indicator
    if (dinoQueue.length > maxShow) {
      ctx.globalAlpha  = 0.6;
      ctx.fillStyle    = '#fff';
      ctx.font         = 'bold 9px sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('+' + (dinoQueue.length - maxShow), startX + maxShow * spacing + 3, qY);
    }

    ctx.globalAlpha  = 1;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Power gauge ────────────────────────────────────────────────────────────

  function _drawPowerGauge(ctx) {
    var dx   = _dragPos.x - REST_X;
    var dy   = _dragPos.y - REST_Y;
    var pull = Math.sqrt(dx * dx + dy * dy);
    var pct  = Math.min(pull / MAX_PULL, 1);

    if (pct < 0.04) return;

    var cx  = _dragPos.x;
    var cy  = _dragPos.y + 48;
    var rad = 20;

    ctx.save();

    // Background track
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'butt';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();

    // Coloured fill arc — green (low) → yellow → red (full)
    var startA  = Math.PI * 0.75;
    var sweepA  = Math.PI * 1.5 * pct;
    var endA    = startA + sweepA;

    var gaugeColor;
    if (pct < 0.4) {
      gaugeColor = '#3cdd3c';
    } else if (pct < 0.72) {
      var tp = (pct - 0.4) / 0.32;
      var gr = Math.round(64 + tp * 191);
      var gg = Math.round(221 - tp * 100);
      gaugeColor = 'rgb(' + gr + ',' + gg + ',48)';
    } else {
      var tp2 = (pct - 0.72) / 0.28;
      var gg2 = Math.round(121 - tp2 * 121);
      gaugeColor = 'rgb(255,' + gg2 + ',32)';
    }

    ctx.strokeStyle = gaugeColor;
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    _sha(ctx, gaugeColor, 6);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, startA, endA);
    ctx.stroke();
    _noSha(ctx);
    ctx.lineCap = 'butt';

    // Percentage text
    _sha(ctx, 'rgba(0,0,0,.7)', 4);
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(pct * 100) + '%', cx, cy);
    _noSha(ctx);

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Cable and dino cradle ──────────────────────────────────────────────────

  function _drawCableAndDino(ctx) {
    if (_phase === 'empty') return;

    var boomY   = BOOM_Y + _bobY * 0.35;
    var tipBotY = boomY + BOOM_H - 1 + _bobY * 0.3;
    var pulleyY = tipBotY + 8;   // must mirror drawCrane's pulley position

    // Compute cable end position for this frame
    var cableEndX, cableEndY;

    if (_phase === 'aiming' && _isDragging) {
      cableEndX = _dragPos.x;
      cableEndY = _dragPos.y;
    } else if (_phase === 'launched') {
      cableEndX = _cableEndX;
      cableEndY = _cableEndY;
    } else if (_phase === 'loading') {
      var eased = _easeOutBack(Math.min(_loadT, 1));
      cableEndX = REST_X;
      cableEndY = _loadFromY + (REST_Y - _loadFromY) * eased;
    } else {
      // idle — gentle pendulum sway
      cableEndX = REST_X + Math.sin(_t * 1.4) * 3.5;
      cableEndY = REST_Y + Math.cos(_t * 1.1) * 1.8;
    }

    var taut = (_isDragging && _phase === 'aiming') || _phase === 'launched';

    ctx.save();

    // ── Cable line ─────────────────────────────────────────────────────────

    ctx.strokeStyle = taut ? '#ff8020' : '#3a4858';
    ctx.lineWidth   = taut ? 3.5 : 2.5;
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(HOOK_X, pulleyY);

    if (taut) {
      // Straight taut cable while pulled
      ctx.lineTo(cableEndX, cableEndY);
    } else {
      // Natural catenary droop
      var droop  = Math.abs(cableEndX - HOOK_X) * 0.07 + 14;
      var midCX  = (HOOK_X + cableEndX) / 2;
      var midCY  = (pulleyY + cableEndY) / 2 + droop;
      ctx.quadraticCurveTo(midCX, midCY, cableEndX, cableEndY);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ── Hook / cradle ──────────────────────────────────────────────────────

    if (_phase !== 'launched') {
      // Cradle disc
      _sha(ctx, 'rgba(0,0,0,.35)', 6);
      ctx.fillStyle = '#505868';
      ctx.beginPath();
      ctx.arc(cableEndX, cableEndY, 9, 0, Math.PI * 2);
      ctx.fill();
      _noSha(ctx);
      ctx.strokeStyle = '#2a3040';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(cableEndX, cableEndY, 9, 0, Math.PI * 2);
      ctx.stroke();

      // J-hook shape hanging below disc
      ctx.strokeStyle = '#8898a8';
      ctx.lineWidth   = 2.8;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(cableEndX, cableEndY + 4);
      ctx.lineTo(cableEndX, cableEndY + 13);
      ctx.arcTo(cableEndX + 10, cableEndY + 13,
                cableEndX + 10, cableEndY + 5, 9);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // ── Dino in cradle ─────────────────────────────────────────────────────

    if (_curDino && _phase !== 'launched' && _phase !== 'empty') {
      ctx.save();
      ctx.translate(cableEndX, cableEndY - 6);

      // Gentle idle sway
      if (_phase === 'idle') {
        ctx.rotate(Math.sin(_t * 1.7) * 0.07);
      }

      var id     = _dinoId(_curDino);
      var colors = _dinoColors(_curDino);

      // Try preloaded SVG image
      if (global.DinoImages && id && global.DinoImages[id]) {
        var dinoImg = global.DinoImages[id];
        var dSz = DINO_R * 3.4;
        ctx.drawImage(dinoImg, -dSz * 0.5, -dSz * 0.46, dSz, dSz);
      } else {
        // Fallback cartoon hero
        _drawCartoonDino(ctx, colors, DINO_R);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ── Fallback cartoon dino ─────────────────────────────────────────────────

  function _drawCartoonDino(ctx, colors, r) {
    // Body
    _sha(ctx, 'rgba(0,0,0,.3)', 8);
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    _noSha(ctx);

    ctx.fillStyle = colors.main;
    ctx.beginPath();
    ctx.arc(-1, -1, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.46, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye white
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = colors.ink || '#111';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.16, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Highlight dot
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    ctx.arc(r * 0.26, -r * 0.26, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = colors.ink || '#111';
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    ctx.arc(r * 0.26, -r * 0.02, r * 0.2, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  // ── Public: handleMouseDown ───────────────────────────────────────────────

  /**
   * Call with design-space coordinates when the player presses down.
   * @param {number} x
   * @param {number} y
   */
  function handleMouseDown(x, y) {
    if (_phase !== 'idle') return;

    var dx = x - REST_X;
    var dy = y - REST_Y;
    if (Math.sqrt(dx * dx + dy * dy) < 58) {
      _isDragging = true;
      _phase      = 'aiming';
      _dragPos    = { x: x, y: y };
    }
  }

  // ── Public: handleMouseMove ───────────────────────────────────────────────

  /**
   * Call with design-space coordinates during pointer drag.
   * @param {number} x
   * @param {number} y
   */
  function handleMouseMove(x, y) {
    if (!_isDragging || _phase !== 'aiming') return;

    // Clamp to MAX_PULL measured from REST position
    var dx   = x - REST_X;
    var dy   = y - REST_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var tx = x, ty = y;

    if (dist > MAX_PULL) {
      tx = REST_X + (dx / dist) * MAX_PULL;
      ty = REST_Y + (dy / dist) * MAX_PULL;
    }

    _dragPos = { x: tx, y: ty };
  }

  // ── Public: handleMouseUp ─────────────────────────────────────────────────

  /**
   * Call with design-space coordinates when the player releases.
   * Triggers launch animation; call launchDino() to get the velocity vector.
   * @param {number} x
   * @param {number} y
   */
  function handleMouseUp(x, y) {
    if (!_isDragging || _phase !== 'aiming') return;
    _isDragging = false;

    var dx   = _dragPos.x - REST_X;
    var dy   = _dragPos.y - REST_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 16) {
      // Too small a pull — cancel
      _dragPos = { x: REST_X, y: REST_Y };
      _phase   = 'idle';
      return;
    }

    // Velocity: vector from drag point → hook point, scaled by LAUNCH_K
    _lastVelX = (HOOK_X - _dragPos.x) * LAUNCH_K;
    _lastVelY = (HOOK_Y - _dragPos.y) * LAUNCH_K;

    // Seed cable swing animation from drag position
    _cableEndX = _dragPos.x;
    _cableEndY = _dragPos.y;
    // Give cable a kick in the launch direction (opposite of velocity)
    _cableVX   = -_lastVelX * 0.4;
    _cableVY   = -_lastVelY * 0.4;

    _dragPos = { x: REST_X, y: REST_Y };
    _phase   = 'launched';
  }

  // ── Public: getCurrentDino ────────────────────────────────────────────────

  /**
   * Returns the dino currently loaded in the crane cradle.
   * @return {Object|string|null}
   */
  function getCurrentDino() {
    return _curDino;
  }

  // ── Public: launchDino ────────────────────────────────────────────────────

  /**
   * Returns the launch velocity vector.
   * - While dragging (phase='aiming'): computes from current drag position.
   * - After release:                   returns stored launch velocity.
   * @return {{ velocityX: number, velocityY: number }}
   */
  function launchDino() {
    if (_isDragging && _phase === 'aiming') {
      return {
        velocityX: (HOOK_X - _dragPos.x) * LAUNCH_K,
        velocityY: (HOOK_Y - _dragPos.y) * LAUNCH_K,
      };
    }
    return { velocityX: _lastVelX, velocityY: _lastVelY };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * @namespace Crane
   */
  global.Crane = {

    // ── Lifecycle ────────────────────────────────────────────────────────────
    /** @param {HTMLCanvasElement} canvas @param {Array} dinoQueue */
    init:   init,
    /** @param {number} dt  seconds */
    update: update,
    /** @param {CanvasRenderingContext2D} ctx */
    draw:   draw,

    // ── Named drawing functions ───────────────────────────────────────────────
    /**
     * Draw only the crane structure (no dino, no cable, no trajectory).
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ bobY?: number, t?: number }} craneState
     */
    drawCrane:     drawCrane,

    /**
     * Draw a ballistic trajectory preview.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} startX
     * @param {number} startY
     * @param {number} velocityX
     * @param {number} velocityY
     * @param {number} [gravity=0.52]
     */
    drawTrajectory: drawTrajectory,

    /**
     * Draw the dino queue row at the crane base.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array}                    dinoQueue
     */
    drawDinoQueue: drawDinoQueue,

    // ── Input ────────────────────────────────────────────────────────────────
    /** @param {number} x @param {number} y */
    handleMouseDown: handleMouseDown,
    /** @param {number} x @param {number} y */
    handleMouseMove: handleMouseMove,
    /** @param {number} x @param {number} y — triggers launch animation */
    handleMouseUp:   handleMouseUp,

    // ── State queries ─────────────────────────────────────────────────────────
    /** @return {Object|string|null} */
    getCurrentDino: getCurrentDino,

    /**
     * Returns the launch velocity based on current drag state, or the most
     * recent launch if the dino has already been released.
     * @return {{ velocityX: number, velocityY: number }}
     */
    launchDino: launchDino,

    // ── Geometry constants (read-only) ────────────────────────────────────────
    HOOK_X:   HOOK_X,
    HOOK_Y:   HOOK_Y,
    REST_X:   REST_X,
    REST_Y:   REST_Y,
    MAX_PULL: MAX_PULL,
    LAUNCH_K: LAUNCH_K,
    GROUND_Y: GROUND_Y,
    MAST_CX:  MAST_CX,
    BOOM_END_X: BOOM_END_X,
  };

}(window));
