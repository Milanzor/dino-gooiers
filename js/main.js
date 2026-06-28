/**
 * main.js — Dino Gooiers entry point & integration
 *
 * Boot sequence:
 *  1. CanvasRenderingContext2D.roundRect polyfill (Safari < 15.4, old Android)
 *  2. DOMContentLoaded → boot()
 *  3. Preload dino / enemy / boss SVG images; track progress 0 → 1
 *  4. Game.init() → engine creates canvas (#game-canvas, DPR 1170×540 design
 *     space), starts rAF loop, shows 'splash' screen
 *  5. Drive DOM loading overlay bar 0 → 100 % over ≥ 2 seconds real time
 *  6. Hide DOM overlay; canvas-based splash screen takes over
 *  7. Wire all Game event-bus handlers
 *  8. Build gameplay HTML HUD overlay in #ui-root (pause, stars, wind, queue)
 *
 * Touch events:
 *  engine.js converts touchstart / touchmove / touchend on the canvas to
 *  dragStart / dragMove / dragEnd events. This file adds touch pass-through
 *  for HTML UI overlay elements so they fire on both touch and mouse.
 *
 * Canvas / resize:
 *  engine.js fully owns #game-canvas — DPR scaling, letterboxing and the
 *  window resize listener are all engine-internal. We do NOT create a second
 *  requestAnimationFrame loop or a second resize handler here.
 */

// ── Canvas roundRect polyfill (Safari < 15.4, older Android WebView) ─────────
(function () {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  if (CanvasRenderingContext2D.prototype.roundRect) return;
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0), w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y,     x + w, y + r,  r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y,     x + r, y,     r);
    this.closePath();
  };
}());

// ── Main integration IIFE ─────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── Module-level state ──────────────────────────────────────────────────────

  var _assetsReady     = false;  // true once all SVG images are loaded
  var _loadProgress    = 0;      // 0..1 — image-load fraction
  var _domOverlayGone  = false;  // true after #loadingOverlay is hidden
  var _paused          = false;  // in-game pause flag
  var _hudVisible      = false;  // gameplay HUD currently injected in DOM
  var _hudIntervalId   = null;   // rAF / interval for HUD animation
  var _windAngle       = 0;      // current wind direction (radians)
  var _windSpeed       = 0;      // current wind speed (1-10)
  var _windTargetAngle = 0;
  var _windTargetSpeed = 0;
  var _windUpdateTimer = 0;      // seconds until next wind shift
  var _hudStarFills    = [0, 0, 0]; // 0=grey, 1=gold for each of 3 stars
  var _levelStartTime  = 0;      // ms timestamp when gameplay screen entered

  // ── DOM helpers ─────────────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  function setLoadingText(txt) {
    var el = $('loadingText');
    if (el) el.textContent = txt;
  }

  function setLoadingBar(pct) {
    var el = $('loadingBar');
    if (el) el.style.width = Math.round(pct * 100) + '%';
  }

  function hideLoadingOverlay() {
    if (_domOverlayGone) return;
    _domOverlayGone = true;
    var el = $('loadingOverlay');
    if (!el) return;
    el.style.transition = 'opacity .55s ease';
    el.style.opacity    = '0';
    setTimeout(function () {
      if (el.parentNode) el.style.display = 'none';
    }, 600);
  }

  // ── Asset preloading ────────────────────────────────────────────────────────

  /**
   * Creates an Image element for every dino.
   * Tries PNG from assets/heroes/{id}.png first; falls back to SVG data URI.
   * Caches results in window.DinoImages and resolves once all are loaded.
   * @returns {Promise<void>}
   */
  function preloadDinos() {
    return new Promise(function (resolve) {
      var all = [].concat(
        window.DINO_ROSTER    || [],
        window.TIRANNEN_TYPES || [],
        window.BOSS_DINOS     || []
      );

      if (!all.length) {
        _loadProgress = 1;
        resolve();
        return;
      }

      window.DinoImages = {};
      var loaded = 0;
      var total  = all.length;

      var HERO_IDS = ['rocky','chomp','sky','dash','stomp','trix','bolt','bubba','pim','brons'];

      all.forEach(function (d) {
        var img    = new Image();
        var finish = function () {
          loaded++;
          _loadProgress = loaded / total;
          if (loaded === total) resolve();
        };
        img.onload  = function () { window.DinoImages[d.id] = img; finish(); };

        if (HERO_IDS.indexOf(d.id) !== -1) {
          // Load PNG; fall back to SVG if it fails
          img.onerror = function () {
            var fallback = new Image();
            fallback.onload  = function () { window.DinoImages[d.id] = fallback; finish(); };
            fallback.onerror = finish;
            fallback.src     = d.svgDataURI;
          };
          img.src = 'assets/heroes/' + d.id + '.png';
        } else {
          img.onerror = finish;
          img.src     = d.svgDataURI;
        }
      });
    });
  }

  // ── Storage restore ─────────────────────────────────────────────────────────

  function restoreProgress() {
    try {
      var saved = window.Storage.load();
      window.Game.setState({ maxLevel: saved.maxLevel, stars: saved.stars });
    } catch (e) {
      window.Game.setState({ maxLevel: 1, stars: [] });
    }
  }

  // ── Event handler wiring ────────────────────────────────────────────────────

  /**
   * Wire all high-level game events onto the Game event bus.
   * Subsystems (worldmap, gameplay, screens) emit these events; main.js
   * responds with cross-cutting concerns (storage, screen transitions, HUD).
   */
  function wireEventHandlers() {
    var G = window.Game;

    // ── levelSelect ──────────────────────────────────────────────────────────
    // Emitted by worldmap or level-select UI when the player picks a level.
    // data: { levelId: number }
    G.on('levelSelect', function (data) {
      var levelId = (data && data.levelId) || G.state.currentLevel || 1;
      G.setState({ currentLevel: levelId });
      // Screen transition handled by gameplay screen's own enter() hook.
      G.showScreen('gameplay');
    });

    // ── levelComplete ────────────────────────────────────────────────────────
    // Emitted when all enemies in a level are destroyed.
    // data: { levelId, stars, score, details }
    G.on('levelComplete', function (data) {
      var levelId = (data && data.levelId) || G.state.currentLevel;
      var stars   = (data && data.stars)   || G.state.lastStars || 1;
      var score   = (data && data.score)   || G.state.lastScore || 0;
      var details = (data && data.details) || {};

      // Persist result
      if (window.Storage) {
        window.Storage.saveLevel(levelId, stars, score);
        var saved = window.Storage.load();
        G.setState({ maxLevel: saved.maxLevel, stars: saved.stars });
      }

      // Hand off to the screens module for the level-complete panel
      if (window.Screens) {
        window.Screens.showLevelComplete(levelId, stars, score, details);
      } else {
        G.showScreen('levelcomplete');
      }
    });

    // ── gameOver ─────────────────────────────────────────────────────────────
    // Emitted when the player runs out of dinos without clearing all enemies.
    G.on('gameOver', function () {
      if (window.Screens) {
        window.Screens.showGameOver();
      } else {
        G.showScreen('gameover');
      }
    });

    // ── goToMenu ─────────────────────────────────────────────────────────────
    G.on('goToMenu', function () {
      if (window.Screens) {
        window.Screens.showMenu();
      } else {
        G.showScreen('menu');
      }
    });

    // ── goToWorldMap ─────────────────────────────────────────────────────────
    // data (optional): { worldIndex: number } 0-based
    G.on('goToWorldMap', function (data) {
      var worldIndex = (data && data.worldIndex != null)
        ? data.worldIndex
        : Math.max(0, Math.floor(((G.state.currentLevel || 1) - 1) / 10));
      if (window.Screens) {
        window.Screens.showWorldMap(worldIndex);
      } else {
        G.setState({ currentWorld: worldIndex + 1 });
        G.showScreen('worldmap');
      }
    });

    // ── screenChange — manage gameplay HUD ──────────────────────────────────
    G.on('screenChange', function (e) {
      if (e.to === 'gameplay') {
        _levelStartTime = Date.now();
        _hudStarFills   = [0, 0, 0];
        _paused         = false;
        _showGameplayHUD();
      } else {
        _hideGameplayHUD();
      }

      // Sync pause state: always unpause on screen change
      if (_paused && e.to !== 'gameplay') {
        _paused = false;
      }
    });

    // ── resize — reposition HUD on viewport change ───────────────────────────
    G.on('resize', function () {
      if (_hudVisible) _repositionHUD();
    });
  }

  // ── Touch event conversion for HTML overlay elements ─────────────────────────
  /**
   * Forwards touch events from an overlay element to the equivalent pointer
   * events, so buttons in #ui-root respond identically on touch and mouse.
   * @param {HTMLElement} el
   */
  function makeTouchable(el) {
    el.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      el.dispatchEvent(new MouseEvent('click', {
        bubbles:  true,
        clientX:  t.clientX,
        clientY:  t.clientY,
      }));
    }, { passive: false });
  }

  // ── Wind simulation ─────────────────────────────────────────────────────────

  function _updateWind(dt) {
    _windUpdateTimer -= dt;
    if (_windUpdateTimer <= 0) {
      // Pick a new random wind target every 4–10 seconds
      _windTargetAngle = (Math.random() * Math.PI * 2);
      _windTargetSpeed = 1 + Math.random() * 9;
      _windUpdateTimer = 4 + Math.random() * 6;
    }

    // Smoothly interpolate toward target
    var da = _windTargetAngle - _windAngle;
    // Wrap to [-PI, PI]
    while (da >  Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    _windAngle += da * Math.min(dt * 1.2, 1);
    _windSpeed += (_windTargetSpeed - _windSpeed) * Math.min(dt * 0.8, 1);
  }

  // ── Star milestone tracking ─────────────────────────────────────────────────

  /**
   * Update star fill state based on elapsed time in the level.
   * Because gameplay.js does not expose a live score, we use time as a
   * proxy so the HUD stars still give visual feedback during play.
   *  • 1 star: after  5 s
   *  • 2 stars: after 15 s
   *  • 3 stars: after 30 s
   */
  function _updateStars() {
    if (window.Game && window.Game.state.currentScreen !== 'gameplay') return;
    var elapsed = (Date.now() - _levelStartTime) / 1000;
    _hudStarFills[0] = elapsed >  5 ? 1 : 0;
    _hudStarFills[1] = elapsed > 15 ? 1 : 0;
    _hudStarFills[2] = elapsed > 30 ? 1 : 0;
  }

  // ── Gameplay HTML HUD ───────────────────────────────────────────────────────

  /**
   * Inject the gameplay HUD into #ui-root.
   * The HUD uses CSS positioned inside the #ui-root (position:absolute, 100%
   * size). Interactive elements re-enable pointer-events locally.
   * Positions are expressed as viewport percentages so the HUD scales with
   * the canvas letterbox automatically.
   */
  function _showGameplayHUD() {
    if (_hudVisible) return;
    _hudVisible = true;

    var uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;

    // Inject HUD styles once
    if (!document.getElementById('main-hud-styles')) {
      var s = document.createElement('style');
      s.id = 'main-hud-styles';
      s.textContent = [
        '#main-hud{position:absolute;inset:0;pointer-events:none;z-index:11;',
          'font-family:"Baloo 2",cursive;user-select:none}',
        '.mh-btn{pointer-events:auto;cursor:pointer;border:none;border-radius:10px;',
          'display:flex;align-items:center;justify-content:center;',
          '-webkit-tap-highlight-color:transparent;',
          'transition:transform .12s,filter .12s;',
          'background:rgba(0,0,0,.5);border:1.5px solid rgba(255,255,255,.2);',
          'color:#fff;font-family:"Baloo 2",cursive}',
        '.mh-btn:hover{transform:scale(1.08);filter:brightness(1.2)}',
        '.mh-btn:active{transform:scale(.93)}',
        '#mh-pause{position:absolute;top:12px;left:12px;width:42px;height:42px;',
          'font-size:1.4rem;padding:0}',
        '#mh-score{position:absolute;top:10px;left:50%;transform:translateX(-50%);',
          'background:rgba(0,0,0,.5);border:1.5px solid rgba(255,210,0,.35);',
          'border-radius:12px;padding:4px 18px;',
          'font-size:clamp(.85rem,2.4vw,1.2rem);font-weight:800;color:#ffd23f;',
          'text-shadow:0 0 12px rgba(255,200,0,.6);white-space:nowrap}',
        '#mh-stars{position:absolute;top:10px;right:12px;display:flex;gap:4px;',
          'align-items:center;background:rgba(0,0,0,.45);',
          'border:1.5px solid rgba(255,255,255,.15);border-radius:10px;',
          'padding:4px 10px}',
        '.mh-star{font-size:clamp(1rem,2.8vw,1.5rem);',
          'transition:filter .4s,opacity .4s;filter:grayscale(1);opacity:.35}',
        '.mh-star.lit{filter:none;opacity:1;',
          'animation:mh-starpop .4s cubic-bezier(.34,1.56,.64,1) forwards}',
        '#mh-wind{position:absolute;bottom:20px;left:14px;',
          'background:rgba(0,0,0,.5);border:1.5px solid rgba(160,220,255,.25);',
          'border-radius:10px;padding:6px 12px;display:flex;',
          'align-items:center;gap:8px}',
        '#mh-wind-canvas{display:block}',
        '#mh-wind-label{font-size:clamp(.6rem,1.6vw,.78rem);color:rgba(180,230,255,.8);',
          'line-height:1.3}',
        '#mh-queue{position:absolute;bottom:20px;right:12px;',
          'background:rgba(0,0,0,.5);border:1.5px solid rgba(255,255,255,.15);',
          'border-radius:10px;padding:6px 10px;',
          'display:flex;align-items:center;gap:6px;flex-direction:row-reverse}',
        '.mh-dino-icon{width:36px;height:36px;border-radius:50%;overflow:hidden;',
          'display:flex;align-items:center;justify-content:center;',
          'background:rgba(40,40,60,.8);border:1.5px solid rgba(255,255,255,.25);',
          'font-size:1.1rem;flex-shrink:0}',
        '#mh-pause-overlay{position:absolute;inset:0;z-index:15;',
          'background:rgba(8,4,16,.82);display:none;',
          'flex-direction:column;align-items:center;justify-content:center;gap:18px;',
          'pointer-events:auto}',
        '#mh-pause-overlay.visible{display:flex}',
        '#mh-pause-title{font-family:"Bungee",cursive;font-size:clamp(2rem,6vw,3.5rem);',
          'color:#ffd23f;text-shadow:0 0 30px rgba(255,200,0,.6)}',
        '@keyframes mh-starpop{',
          '0%{transform:scale(0) rotate(-180deg)}',
          '65%{transform:scale(1.4) rotate(12deg)}',
          '100%{transform:scale(1) rotate(0deg)}}',
      ].join('');
      document.head.appendChild(s);
    }

    // Build HUD markup
    var hud = document.createElement('div');
    hud.id = 'main-hud';
    hud.innerHTML = [
      // Pause button (top-left)
      '<button id="mh-pause" class="mh-btn" aria-label="Pauze" title="Pauze (P)">⏸</button>',

      // Live score placeholder (top-centre; will be updated by poll)
      '<div id="mh-score" style="display:none">0</div>',

      // Star indicators (top-right)
      '<div id="mh-stars">',
        '<span class="mh-star" id="mh-star-0">⭐</span>',
        '<span class="mh-star" id="mh-star-1">⭐</span>',
        '<span class="mh-star" id="mh-star-2">⭐</span>',
      '</div>',

      // Wind indicator (bottom-left)
      '<div id="mh-wind">',
        '<canvas id="mh-wind-canvas" width="38" height="38"></canvas>',
        '<div id="mh-wind-label">Wind<br><span id="mh-wind-speed">—</span> kt</div>',
      '</div>',

      // Dino queue (bottom-right)
      '<div id="mh-queue"><span style="font-size:.65rem;color:rgba(255,255,255,.45);',
        'writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:.08em;',
        'margin-right:2px">WACHT</span>',
        '<div id="mh-queue-icons" style="display:flex;gap:6px;flex-direction:row-reverse"></div>',
      '</div>',

      // Pause overlay (full-screen dimmer shown when paused)
      '<div id="mh-pause-overlay">',
        '<div id="mh-pause-title">PAUZE</div>',
        '<button id="mh-resume-btn" class="mh-btn" style="font-size:1.1rem;padding:14px 36px;',
          'pointer-events:auto;border-radius:14px;background:linear-gradient(180deg,#ffd23f,#f5a623);',
          'color:#1a0e2e;font-weight:800;border:none;box-shadow:0 4px 0 #8b6000">',
          '▶  DOORGAAN',
        '</button>',
        '<button id="mh-quit-btn" class="mh-btn" style="font-size:.95rem;padding:10px 28px;',
          'pointer-events:auto;border-radius:12px">',
          '🗺  KAART',
        '</button>',
      '</div>',
    ].join('');

    uiRoot.appendChild(hud);

    // Wire pause button
    var pauseBtn  = document.getElementById('mh-pause');
    var resumeBtn = document.getElementById('mh-resume-btn');
    var quitBtn   = document.getElementById('mh-quit-btn');

    function togglePause() {
      _paused = !_paused;
      var overlay = document.getElementById('mh-pause-overlay');
      if (overlay) {
        overlay.classList.toggle('visible', _paused);
      }
      if (pauseBtn) pauseBtn.textContent = _paused ? '▶' : '⏸';
      // Stop / restart engine loop (engine exposes stop/start)
      if (_paused) {
        window.Game.stop();
      } else {
        window.Game.start();
      }
    }

    pauseBtn.addEventListener('click', togglePause);
    makeTouchable(pauseBtn);

    resumeBtn.addEventListener('click', function () {
      if (_paused) togglePause();
    });
    makeTouchable(resumeBtn);

    quitBtn.addEventListener('click', function () {
      if (_paused) togglePause(); // restart loop so engine is running
      window.Game.emit('goToWorldMap', {});
    });
    makeTouchable(quitBtn);

    // Keyboard shortcut — P / Escape to pause
    document.addEventListener('keydown', _onKeyDown);

    // Start HUD animation loop
    _startHUDLoop();
  }

  function _hideGameplayHUD() {
    if (!_hudVisible) return;
    _hudVisible = false;

    document.removeEventListener('keydown', _onKeyDown);
    _stopHUDLoop();

    // If game was paused when leaving gameplay, make sure loop is running
    if (_paused) {
      _paused = false;
      window.Game.start();
    }

    var hud = document.getElementById('main-hud');
    if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
  }

  function _onKeyDown(e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      var pauseBtn = document.getElementById('mh-pause');
      if (pauseBtn) pauseBtn.click();
    }
  }

  // ── HUD animation loop (runs via rAF while gameplay screen is active) ────────

  var _hudRafId   = null;
  var _hudLastTs  = 0;

  function _startHUDLoop() {
    _hudLastTs = performance.now();
    _hudRafId  = requestAnimationFrame(_hudTick);
  }

  function _stopHUDLoop() {
    if (_hudRafId !== null) {
      cancelAnimationFrame(_hudRafId);
      _hudRafId = null;
    }
  }

  function _hudTick(ts) {
    if (!_hudVisible) return;
    _hudRafId = requestAnimationFrame(_hudTick);

    var dt = Math.min((ts - _hudLastTs) / 1000, 0.05);
    _hudLastTs = ts;

    if (_paused) return; // don't animate HUD while paused

    _updateWind(dt);
    _updateStars();
    _renderWindCanvas();
    _updateStarDOM();
    _updateQueueDOM();
  }

  function _renderWindCanvas() {
    var c = document.getElementById('mh-wind-canvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var cx = c.width / 2, cy = c.height / 2, r = cx - 3;

    ctx.clearRect(0, 0, c.width, c.height);

    // Dial background
    ctx.fillStyle = 'rgba(30,50,80,.8)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,160,255,.35)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Cardinal marks
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font      = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx,     cy - r + 6);
    ctx.fillText('Z', cx,     cy + r - 6);
    ctx.fillText('W', cx - r + 6, cy);
    ctx.fillText('O', cx + r - 6, cy);

    // Arrow (points in wind direction)
    var arrowLen = r * 0.68;
    var ax = cx + Math.cos(_windAngle) * arrowLen;
    var ay = cy + Math.sin(_windAngle) * arrowLen;
    var tailX = cx - Math.cos(_windAngle) * arrowLen * 0.5;
    var tailY = cy - Math.sin(_windAngle) * arrowLen * 0.5;

    ctx.strokeStyle = '#60c0ff';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(ax, ay); ctx.stroke();

    // Arrowhead
    var hAngle = _windAngle;
    var hSize  = 7;
    ctx.fillStyle = '#60c0ff';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - hSize * Math.cos(hAngle - 0.45), ay - hSize * Math.sin(hAngle - 0.45));
    ctx.lineTo(ax - hSize * Math.cos(hAngle + 0.45), ay - hSize * Math.sin(hAngle + 0.45));
    ctx.closePath(); ctx.fill();

    // Centre dot
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();

    // Speed label
    var speedEl = document.getElementById('mh-wind-speed');
    if (speedEl) speedEl.textContent = Math.round(_windSpeed);
  }

  function _updateStarDOM() {
    for (var i = 0; i < 3; i++) {
      var el = document.getElementById('mh-star-' + i);
      if (!el) continue;
      var shouldBeLit = _hudStarFills[i] === 1;
      var isLit       = el.classList.contains('lit');
      if (shouldBeLit && !isLit) {
        el.classList.add('lit');
      } else if (!shouldBeLit && isLit) {
        el.classList.remove('lit');
      }
    }
  }

  function _updateQueueDOM() {
    var container = document.getElementById('mh-queue-icons');
    if (!container) return;

    // Gather current dino queue from gameplay state
    // gameplay.js exposes nothing publicly; we try to derive from Game.state
    var G      = window.Game;
    var screen = G && G.state && G.state.currentScreen;
    if (screen !== 'gameplay') return;

    // Rebuild queue display each tick only when count changes
    // We can't directly access gameplay._dinoQueue; use DinoImages keys as proxy
    // to at least render placeholder icons for remaining dinos via the level data
    var level = window.LEVELS &&
      window.LEVELS[Math.max(0, (G.state.currentLevel || 1) - 1)];
    if (!level || (!level.dinoIds && !level.dinos)) return;

    var dinos  = level.dinoIds || level.dinos || [];
    var wanted = dinos.length;
    var current = container.children.length;
    if (current === wanted) return; // no change — skip DOM thrash

    container.innerHTML = '';
    dinos.forEach(function (dinoId) {
      var icon = document.createElement('div');
      icon.className = 'mh-dino-icon';

      if (window.DinoImages && window.DinoImages[dinoId]) {
        var img = document.createElement('img');
        img.src    = window.DinoImages[dinoId].src;
        img.width  = 30;
        img.height = 30;
        img.style.cssText = 'object-fit:contain;border-radius:50%';
        icon.appendChild(img);
      } else {
        // Fallback: coloured initial
        var d = window.getDinoById && window.getDinoById(dinoId);
        icon.style.background = (d && d.colors && d.colors.main) || '#4caf50';
        icon.textContent = dinoId ? dinoId.charAt(0).toUpperCase() : '?';
        icon.style.color = '#fff';
        icon.style.fontWeight = '800';
      }
      container.appendChild(icon);
    });
  }

  function _repositionHUD() {
    // HUD uses 100%/CSS positioning — no explicit pixel repositioning needed.
    // This hook exists for future use if any element needs viewport-precise offsets.
  }

  // ── Loading sequence — drives DOM overlay 0 → 100% over ≥ 2 seconds ─────────

  /**
   * Animate the DOM loading bar smoothly from current value to target,
   * then call cb() when bar reaches ≥ 1.0.
   *
   * @param {function():number} getProgress  Returns 0..1 live progress.
   * @param {number}            minDuration  Minimum milliseconds to spend loading.
   * @param {function}          cb           Called once when complete.
   */
  function animateLoadingBar(getProgress, minDuration, cb) {
    var startTime  = performance.now();
    var displayed  = 0;  // currently displayed 0..1

    function tick() {
      var elapsed  = performance.now() - startTime;
      // Combine real progress with time-based progress for a smooth feel
      var timeFrac = Math.min(elapsed / minDuration, 1);
      var realFrac = getProgress();
      // Show whichever is further, but time can't exceed real progress once done
      var target   = realFrac >= 1 ? timeFrac : Math.min(timeFrac, realFrac * 0.85);
      target = Math.max(target, displayed); // never go backwards

      // Ease toward target
      displayed += (target - displayed) * 0.06;

      setLoadingBar(displayed);

      if (displayed >= 0.995 && realFrac >= 1 && timeFrac >= 1) {
        setLoadingBar(1);
        cb();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  // ── Boot sequence ─────────────────────────────────────────────────────────────

  function boot() {
    // Guard: Game engine must be available (loaded before main.js in HTML)
    if (!window.Game) {
      console.error('[main.js] window.Game not found — check script load order.');
      return;
    }

    setLoadingText('Fonts laden…');
    setLoadingBar(0.04);

    // ── Step 1: Wait for Google Fonts ─────────────────────────────────────────
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {

      setLoadingText('Dino\'s laden…');
      setLoadingBar(0.12);

      // ── Step 2: Preload all SVG dino assets ─────────────────────────────────
      var loadPromise = preloadDinos();

      // ── Step 3: Restore saved progress ASAP ─────────────────────────────────
      restoreProgress();

      // ── Step 4: Initialise Game engine ──────────────────────────────────────
      //  Engine sets up #game-canvas, DPR scaling (design space 1170×540),
      //  letterboxing, window resize, physics, rAF loop and the 'splash' screen.
      window.Game.init({ initialScreen: 'splash' });

      // ── Step 5: Wire all inter-system event handlers ─────────────────────────
      wireEventHandlers();

      // ── Step 6: Drive DOM loading bar over ≥ 2 000 ms ───────────────────────
      setLoadingText('Wereld bouwen…');

      loadPromise.then(function () {
        // Give the bar a moment to show 100%, then hide overlay
        animateLoadingBar(
          function () { return _loadProgress; },
          2000, // minimum 2 s shown
          function () {
            setLoadingText('Klaar!');
            setLoadingBar(1);
            // Brief pause at 100% so the player sees it
            setTimeout(function () {
              hideLoadingOverlay();
              // Show splash HTML once DOM overlay is gone
              if (window.Screens) window.Screens.showSplash();
            }, 250);
          }
        );
      });

      // Keep DOM loading text in sync during asset loading
      var syncId = setInterval(function () {
        if (_assetsReady) { clearInterval(syncId); return; }
        var pct = _loadProgress;
        if (pct > 0 && pct < 1) {
          setLoadingText('Dino\'s laden… ' + Math.round(pct * 100) + ' %');
        }
      }, 120);

      loadPromise.then(function () {
        clearInterval(syncId);
        _assetsReady = true;
      });

    });
  }

  // ── Kick off on DOM ready ─────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // Script loaded after DOMContentLoaded (e.g. deferred or at end of <body>)
    boot();
  }

}());
