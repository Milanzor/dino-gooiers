/**
 * hud.js — Dino Gooiers gameplay HUD
 *
 * Drawn on the canvas on top of the game world every frame.
 *
 * Public API on window.HUD:
 *   drawHUD(ctx, gameState)        — full in-play overlay
 *   drawPauseOverlay(ctx, gameState) — dimmed pause menu
 *   triggerCombo(multiplier)       — kick off the COMBO x3! animation
 *   triggerScorePop()              — kick off the score-pop animation
 *
 * gameState shape expected:
 *   score         {number}
 *   prevScore     {number}   used to detect increases
 *   levelName     {string}
 *   levelNum      {number}
 *   par           {number}   target dino budget (star thresholds use this)
 *   dinosUsed     {number}   dinos thrown so far
 *   dinoQueue     {string[]} remaining dino IDs (including current)
 *   curDinoId     {string}
 *   wind          {number}   kph, negative = left, positive = right
 *   onResume      {function}
 *   onRestart     {function}
 *   onMenu        {function}
 */

(function () {
  'use strict';

  // ── Design dimensions (mirror engine.js constants) ────────────────────────
  var DW = (window.Game && window.Game.DESIGN_WIDTH)  || 1170;
  var DH = (window.Game && window.Game.DESIGN_HEIGHT) || 540;

  // ── Internal animation state ──────────────────────────────────────────────
  var _comboMult    = 1;
  var _comboAlpha   = 0;      // 0 = invisible, 1 = fully visible
  var _comboTimer   = 0;      // seconds remaining
  var _COMBO_DUR    = 2.0;    // total display duration (s)

  var _scorePop     = 0;      // 0-1, scale overshoot when score increases
  var _scorePopDir  = 0;      // 1 = growing, -1 = shrinking

  var _lastFrameTime = 0;

  // ── Pause-menu button hit-areas (populated during draw, read on tap) ──────
  var _pauseBtns = {};        // { resume, restart, menu } → { x, y, w, h }

  // ── Pause button hit-area ─────────────────────────────────────────────────
  var _pauseBtn = { x: 14, y: 8, r: 22 };

  // ── Colours ───────────────────────────────────────────────────────────────
  var C = {
    gold:       '#f5c842',
    goldDark:   '#c89810',
    starGrey:   '#3a3a4a',
    starGold:   '#f5c842',
    starRing:   '#c89810',
    panelBg:    'rgba(10,10,20,0.55)',
    panelBg2:   'rgba(10,10,20,0.82)',
    white:      '#ffffff',
    windBg:     'rgba(0,0,0,0.38)',
    comboText:  '#ff9a00',
    comboGlow:  'rgba(255,154,0,0.35)',
    pauseHover: 'rgba(255,255,255,0.12)',
    btnNormal:  'rgba(255,255,255,0.10)',
    btnBorder:  'rgba(255,255,255,0.22)',
    btnText:    '#ffffff',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _dt(now) {
    var dt = (now - _lastFrameTime) / 1000;
    _lastFrameTime = now;
    return Math.min(dt, 0.1); // clamp to avoid huge jumps
  }

  function _shadow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }

  function _noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  function _pill(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── Star milestones ───────────────────────────────────────────────────────
  // Stars are awarded based on fraction of par used: ≤33%, ≤66%, ≤100%
  // Here we map score-progress differently: the HUD shows earned stars by
  // checking how many dinos were used vs par.
  function _earnedStars(dinosUsed, par) {
    if (!par || par <= 0) return 0;
    var frac = dinosUsed / par;
    if (frac <= 0.33) return 3;
    if (frac <= 0.66) return 2;
    if (frac <= 1.00) return 1;
    return 0;
  }

  // ── Pause button (top-left 44px circle) ──────────────────────────────────

  function _drawPauseButton(ctx) {
    var cx = _pauseBtn.x + _pauseBtn.r;
    var cy = _pauseBtn.y + _pauseBtn.r;
    var r  = _pauseBtn.r;

    ctx.save();

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = C.panelBg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pause bars
    ctx.fillStyle = C.white;
    var bw = 5;
    var bh = 14;
    var gap = 4;
    var bx = cx - gap / 2 - bw;
    var by = cy - bh / 2;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(bx + bw + gap, by, bw, bh);

    ctx.restore();
  }

  // ── Score display (top-centre) ────────────────────────────────────────────

  function _drawScore(ctx, score, levelName, levelNum, scorePop) {
    ctx.save();

    var cx = DW / 2;
    var scale = 1 + scorePop * 0.18;

    ctx.translate(cx, 0);
    ctx.scale(scale, scale);
    ctx.translate(-cx, 0);

    // Score value
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = "800 28px 'Bungee', cursive";
    ctx.fillStyle    = C.gold;
    _shadow(ctx, 'rgba(0,0,0,0.7)', 10);
    ctx.fillText(score.toLocaleString('nl'), cx, 8);
    _noShadow(ctx);

    // Level label below score
    ctx.font      = "600 13px 'Nunito', sans-serif";
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    var label = levelNum ? 'Niveau ' + levelNum + (levelName ? ' — ' + levelName : '') : (levelName || '');
    ctx.fillText(label, cx, 42);

    ctx.restore();
  }

  // ── Star indicators (top-right) ───────────────────────────────────────────

  function _drawStars(ctx, earned) {
    ctx.save();

    var count  = 3;
    var r      = 13;
    var gap    = 6;
    var totalW = count * r * 2 + (count - 1) * gap;
    var startX = DW - 20 - totalW;
    var cy     = 26;

    for (var i = 0; i < count; i++) {
      var cx = startX + i * (r * 2 + gap) + r;
      var lit = (i < earned);
      _drawStar(ctx, cx, cy, r, lit);
    }

    ctx.restore();
  }

  function _drawStar(ctx, cx, cy, r, lit) {
    // 5-pointed star path
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 2);

    ctx.beginPath();
    for (var p = 0; p < 10; p++) {
      var angle  = (Math.PI * 2 / 10) * p;
      var radius = (p % 2 === 0) ? r : r * 0.42;
      var px = Math.cos(angle) * radius;
      var py = Math.sin(angle) * radius;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (lit) {
      // Gold filled star with glow
      _shadow(ctx, 'rgba(245,200,60,0.7)', 10);
      var grad = ctx.createRadialGradient(0, -r * 0.2, 0, 0, 0, r);
      grad.addColorStop(0, '#ffe87a');
      grad.addColorStop(1, C.starGold);
      ctx.fillStyle = grad;
      ctx.fill();
      _noShadow(ctx);
      ctx.strokeStyle = C.starRing;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    } else {
      // Grey empty star
      ctx.fillStyle   = C.starGrey;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Remaining dino portraits (right side, vertical column) ───────────────

  function _drawDinoQueue(ctx, curDinoId, dinoQueue) {
    if (!window.getDinoById) return;

    var allDinos = dinoQueue ? dinoQueue.slice() : [];
    // Ensure current dino is at the top of the list
    if (curDinoId && (allDinos.length === 0 || allDinos[0] !== curDinoId)) {
      allDinos.unshift(curDinoId);
    }

    var portraitR = 20;    // circle radius
    var gap       = 10;
    var startX    = DW - 20 - portraitR;
    var startY    = 70;

    ctx.save();

    allDinos.forEach(function (id, i) {
      var d = window.getDinoById(id);
      if (!d) return;

      var cx = startX;
      var cy = startY + i * (portraitR * 2 + gap);

      var isCurrent = (id === curDinoId && i === 0);
      var alpha = isCurrent ? 1.0 : 0.5;

      ctx.globalAlpha = alpha;

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, portraitR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();

      // Dino portrait
      if (window.DinoImages && window.DinoImages[id]) {
        var img = window.DinoImages[id];
        var sz  = portraitR * 2.2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, portraitR - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
        ctx.restore();
      } else {
        ctx.fillStyle    = d.colors ? d.colors.main : '#8bc34a';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = (portraitR * 1.1) + 'px sans-serif';
        ctx.fillText(d.emoji || '?', cx, cy);
        ctx.textBaseline = 'alphabetic';
      }

      // Gold ring highlight for current dino
      if (isCurrent) {
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy, portraitR + 2, 0, Math.PI * 2);
        ctx.strokeStyle = C.gold;
        ctx.lineWidth   = 2.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, portraitR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Wind indicator (bottom-left) ──────────────────────────────────────────

  function _drawWind(ctx, wind) {
    ctx.save();

    var panW = 110;
    var panH = 36;
    var panX = 14;
    var panY = DH - panH - 14;
    var padX = 10;

    // Panel background
    _pill(ctx, panX, panY, panW, panH, 10);
    ctx.fillStyle = C.windBg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Wind arrow
    var arrowX = panX + padX + 10;
    var arrowY = panY + panH / 2;
    var dir    = wind >= 0 ? 1 : -1;  // 1 = right, -1 = left
    var speed  = Math.abs(wind);

    ctx.strokeStyle = speed < 1 ? 'rgba(255,255,255,0.4)' : C.gold;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo(arrowX - 8 * dir, arrowY);
    ctx.lineTo(arrowX + 8 * dir, arrowY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowX + 8 * dir, arrowY);
    ctx.lineTo(arrowX + 2 * dir, arrowY - 5);
    ctx.moveTo(arrowX + 8 * dir, arrowY);
    ctx.lineTo(arrowX + 2 * dir, arrowY + 5);
    ctx.stroke();

    ctx.lineCap = 'butt';

    // Label
    var kphText = speed.toFixed(0) + ' kph';
    var label   = speed < 0.5 ? 'geen wind' : (dir > 0 ? '→ ' : '← ') + kphText;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.font         = "600 12px 'Nunito', sans-serif";
    ctx.fillStyle    = 'rgba(255,255,255,0.75)';
    ctx.fillText(label, arrowX + 16, arrowY);
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }

  // ── Combo indicator (centre-screen, fades out) ────────────────────────────

  function _drawCombo(ctx, mult, alpha) {
    if (alpha <= 0) return;

    ctx.save();

    var cx    = DW / 2;
    var cy    = DH * 0.38;
    var scale = 0.7 + alpha * 0.3 + (1 - alpha) * 0.1; // bounce-in

    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // Glow halo
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
    glow.addColorStop(0, C.comboGlow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 90, cy - 90, 180, 180);

    // Text
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = "900 52px 'Bungee', cursive";
    _shadow(ctx, 'rgba(0,0,0,0.8)', 16);
    ctx.fillStyle = C.comboText;
    ctx.fillText('COMBO x' + mult + '!', cx, cy);
    _noShadow(ctx);

    // Thin outline for legibility
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 2;
    ctx.strokeText('COMBO x' + mult + '!', cx, cy);

    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Update animations ─────────────────────────────────────────────────────

  function _updateAnimations(dt, score, prevScore) {
    // Combo fade
    if (_comboTimer > 0) {
      _comboTimer -= dt;
      if (_comboTimer <= 0) {
        _comboTimer = 0;
        _comboAlpha = 0;
      } else {
        // Hold for 60% of duration then fade
        var holdEnd = _COMBO_DUR * 0.6;
        if (_comboTimer < holdEnd) {
          _comboAlpha = _comboTimer / holdEnd;
        } else {
          _comboAlpha = 1;
        }
      }
    }

    // Score pop
    if (_scorePopDir !== 0) {
      _scorePop += _scorePopDir * dt * 6;
      if (_scorePopDir === 1 && _scorePop >= 1) {
        _scorePop    = 1;
        _scorePopDir = -1;
      } else if (_scorePopDir === -1 && _scorePop <= 0) {
        _scorePop    = 0;
        _scorePopDir = 0;
      }
    }

    // Trigger score pop when score increases
    if (typeof score === 'number' && typeof prevScore === 'number' && score > prevScore) {
      if (_scorePopDir === 0 && _scorePop === 0) {
        _scorePopDir = 1;
      }
    }
  }

  // ── Pause button overlay ──────────────────────────────────────────────────

  function _drawPauseOverlay(ctx, gameState) {
    var gs = gameState || {};

    ctx.save();

    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, DW, DH);

    // Panel
    var panW = 340;
    var panH = 320;
    var panX = DW / 2 - panW / 2;
    var panY = DH / 2 - panH / 2;

    _pill(ctx, panX, panY, panW, panH, 20);
    var panGrad = ctx.createLinearGradient(panX, panY, panX, panY + panH);
    panGrad.addColorStop(0, 'rgba(20,22,40,0.97)');
    panGrad.addColorStop(1, 'rgba(12,14,28,0.97)');
    ctx.fillStyle = panGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Title: GEPAUZEERD
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = "900 26px 'Bungee', cursive";
    _shadow(ctx, 'rgba(0,0,0,0.6)', 8);
    ctx.fillStyle = C.white;
    ctx.fillText('GEPAUZEERD', DW / 2, panY + 28);
    _noShadow(ctx);

    // Level info
    var levelLabel = '';
    if (gs.levelNum) levelLabel = 'Niveau ' + gs.levelNum;
    if (gs.levelName) levelLabel += (levelLabel ? ' — ' : '') + gs.levelName;
    ctx.font         = "600 13px 'Nunito', sans-serif";
    ctx.fillStyle    = 'rgba(255,255,255,0.5)';
    ctx.fillText(levelLabel, DW / 2, panY + 64);

    // Score so far
    if (typeof gs.score === 'number') {
      ctx.font         = "700 20px 'Bungee', cursive";
      ctx.fillStyle    = C.gold;
      ctx.fillText(gs.score.toLocaleString('nl') + ' pts', DW / 2, panY + 90);
    }

    // Buttons
    var btnW   = 220;
    var btnH   = 50;
    var btnGap = 16;
    var btnX   = DW / 2 - btnW / 2;
    var btns   = [
      { key: 'resume',  label: 'Doorgaan',  color: C.gold,  textColor: '#1a1a00', fn: gs.onResume  },
      { key: 'restart', label: 'Herstarten', color: null,   textColor: C.white,   fn: gs.onRestart },
      { key: 'menu',    label: 'Hoofdmenu',  color: null,   textColor: C.white,   fn: gs.onMenu    },
    ];

    var totalBtnsH = btns.length * btnH + (btns.length - 1) * btnGap;
    var firstBtnY  = panY + panH - totalBtnsH - 30;

    btns.forEach(function (btn, i) {
      var bx = btnX;
      var by = firstBtnY + i * (btnH + btnGap);

      _pill(ctx, bx, by, btnW, btnH, 12);

      if (btn.color) {
        var bGrad = ctx.createLinearGradient(bx, by, bx, by + btnH);
        bGrad.addColorStop(0, '#ffe04a');
        bGrad.addColorStop(1, '#c89408');
        ctx.fillStyle = bGrad;
      } else {
        ctx.fillStyle = C.btnNormal;
      }
      ctx.fill();

      ctx.strokeStyle = btn.color ? 'rgba(255,200,0,0.5)' : C.btnBorder;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.font         = "700 17px 'Nunito', sans-serif";
      ctx.fillStyle    = btn.textColor;
      _shadow(ctx, 'rgba(0,0,0,0.4)', 4);
      ctx.fillText(btn.label, DW / 2, by + btnH / 2);
      _noShadow(ctx);

      // Store hit-area for pointer handling
      _pauseBtns[btn.key] = { x: bx, y: by, w: btnW, h: btnH, fn: btn.fn };
    });

    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Main drawHUD entry point ──────────────────────────────────────────────

  function _drawHUD(ctx, gameState) {
    var gs  = gameState || {};
    var now = performance.now();
    var dt  = _dt(now);

    _updateAnimations(dt, gs.score, gs.prevScore);

    ctx.save();

    // 1. Pause button — top-left
    _drawPauseButton(ctx);

    // 2. Score + level name — top-centre
    _drawScore(ctx, gs.score || 0, gs.levelName || '', gs.levelNum || 0, _scorePop);

    // 3. Stars — top-right
    var earned = _earnedStars(gs.dinosUsed || 0, gs.par || 1);
    _drawStars(ctx, earned);

    // 4. Dino queue column — right side (below stars)
    _drawDinoQueue(ctx, gs.curDinoId, gs.dinoQueue);

    // 5. Wind indicator — bottom-left
    _drawWind(ctx, typeof gs.wind === 'number' ? gs.wind : 0);

    // 6. Combo indicator — centre screen (fades)
    _drawCombo(ctx, _comboMult, _comboAlpha);

    ctx.restore();
  }

  // ── Hit-test helper for pause overlay buttons ─────────────────────────────

  function _handlePauseTap(x, y) {
    var keys = Object.keys(_pauseBtns);
    for (var i = 0; i < keys.length; i++) {
      var btn = _pauseBtns[keys[i]];
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (typeof btn.fn === 'function') btn.fn();
        return true;
      }
    }
    return false;
  }

  function _isPauseButtonHit(x, y) {
    var cx = _pauseBtn.x + _pauseBtn.r;
    var cy = _pauseBtn.y + _pauseBtn.r;
    var dx = x - cx;
    var dy = y - cy;
    return (dx * dx + dy * dy) <= (_pauseBtn.r + 6) * (_pauseBtn.r + 6);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.HUD = {

    /**
     * Draw the full in-play HUD onto ctx.
     * Call once per frame, after the game world has been rendered.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} gameState  — see header comment for shape
     */
    drawHUD: function (ctx, gameState) {
      _drawHUD(ctx, gameState);
    },

    /**
     * Draw the pause-menu overlay.
     * Typically called instead of (not in addition to) drawHUD while paused.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} gameState  — needs levelNum, levelName, score, onResume, onRestart, onMenu
     */
    drawPauseOverlay: function (ctx, gameState) {
      _drawPauseOverlay(ctx, gameState);
    },

    /**
     * Trigger the COMBO xN! centre-screen animation.
     *
     * @param {number} multiplier  e.g. 3 for "COMBO x3!"
     */
    triggerCombo: function (multiplier) {
      _comboMult  = multiplier || 2;
      _comboTimer = _COMBO_DUR;
      _comboAlpha = 1;
    },

    /**
     * Trigger the score-pop scale animation (call when score increases).
     * drawHUD auto-detects score increases via gameState.prevScore, but you
     * can also call this manually for guaranteed triggering.
     */
    triggerScorePop: function () {
      if (_scorePopDir === 0 && _scorePop === 0) {
        _scorePopDir = 1;
      }
    },

    /**
     * Returns true if the given canvas-space coordinate lands on the pause button.
     * Use to intercept pointer events before passing them to gameplay.
     */
    isPauseButtonHit: function (x, y) {
      return _isPauseButtonHit(x, y);
    },

    /**
     * Returns true if the tap landed on a pause-overlay button and fires its
     * handler. Only meaningful while the pause overlay is visible.
     */
    handlePauseTap: function (x, y) {
      return _handlePauseTap(x, y);
    },

  };

}());
