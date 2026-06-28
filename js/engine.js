/**
 * engine.js — Dino Gooiers core game engine
 *
 * Responsibilities:
 *  - Canvas setup with DPR-aware rendering and 19.5:9 letterboxing
 *  - Screen lifecycle management (enter / update / render / exit)
 *  - Matter.js physics integration (manual tick, custom canvas render)
 *  - requestAnimationFrame game loop
 *  - Mouse & touch drag-to-aim input for the crane launcher
 *  - Lightweight publish/subscribe event bus
 *
 * Dependencies: Matter.js must be loaded before this file (window.Matter).
 * Exposes:       window.Game
 */

(function (global) {
  'use strict';

  // ── Design constants ────────────────────────────────────────────────────────

  /** Logical (design-space) dimensions — 19.5 : 9 ratio */
  var DESIGN_WIDTH  = 1170;
  var DESIGN_HEIGHT = 540;
  var ASPECT_RATIO  = DESIGN_WIDTH / DESIGN_HEIGHT; // ≈ 2.1667

  var SCREENS = [
    'splash',
    'loading',
    'menu',
    'worldmap',
    'gameplay',
    'levelcomplete',
    'gameover',
    'bossbattle',
  ];

  // ── Game state ──────────────────────────────────────────────────────────────

  var state = {
    currentScreen:  'splash',
    currentLevel:   1,
    currentWorld:   1,
    stars:          [],   // e.g. [3, 2, 3, ...] per level
    coins:          0,
    gems:           0,
    unlockedDinos:  ['raptor'],
  };

  // ── Internal variables ──────────────────────────────────────────────────────

  // Event bus
  var _listeners = {};

  // Screen lifecycle hooks  { [screenName]: { enter, exit, update, render } }
  var _screenHooks = {};

  // Matter.js handles
  var _matter = null;
  var _engine = null;
  var _world  = null;
  var _runner = null;

  // Canvas / rendering
  var _canvas   = null;
  var _ctx      = null;
  var _dpr      = 1;
  var _viewport = { x: 0, y: 0, width: DESIGN_WIDTH, height: DESIGN_HEIGHT, scale: 1 };

  // Game loop
  var _rafId    = null;
  var _running  = false;
  var _lastTime = 0;

  // Drag / aim input state
  var _input = {
    isDragging:  false,
    pointerDown: false,
    dragStart:   { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    dragEnd:     null,
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _getMatter() {
    if (!_matter) {
      _matter = global.Matter;
      if (!_matter) {
        throw new Error('[Game] Matter.js not found on window. Load Matter.js before engine.js.');
      }
    }
    return _matter;
  }

  // ── Event bus ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to a named event.
   * Returns an unsubscribe function.
   *
   * @param  {string}   event
   * @param  {Function} callback
   * @return {Function} unsubscribe
   */
  function on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('[Game] on() requires a function callback');
    }
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    return function off() {
      _listeners[event] = _listeners[event].filter(function (cb) {
        return cb !== callback;
      });
    };
  }

  /**
   * Emit a named event, calling all registered listeners with data.
   *
   * @param {string} event
   * @param {*}      [data]
   */
  function emit(event, data) {
    var cbs = _listeners[event];
    if (!cbs || !cbs.length) return;
    // Snapshot to avoid mutation issues during iteration
    cbs.slice().forEach(function (cb) {
      try {
        cb(data);
      } catch (e) {
        console.error('[Game] Uncaught error in "' + event + '" listener:', e);
      }
    });
  }

  // ── Screen management ────────────────────────────────────────────────────────

  /**
   * Transition to a named screen.
   * Runs the previous screen's exit() hook, updates state, toggles DOM
   * elements with [data-screen="<name>"], then runs the new screen's enter().
   *
   * @param {string} name  One of SCREENS
   */
  function showScreen(name) {
    if (SCREENS.indexOf(name) === -1) {
      console.warn('[Game] showScreen: unknown screen "' + name + '"');
      return;
    }

    var previous = state.currentScreen;

    // Exit previous screen
    if (previous && _screenHooks[previous] && _screenHooks[previous].exit) {
      try {
        _screenHooks[previous].exit();
      } catch (e) {
        console.error('[Game] Error in ' + previous + '.exit():', e);
      }
    }

    state.currentScreen = name;

    // Toggle DOM screen elements (optional HTML layer on top of canvas)
    document.querySelectorAll('[data-screen]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.screen === name);
    });

    // Enter new screen
    if (_screenHooks[name] && _screenHooks[name].enter) {
      try {
        _screenHooks[name].enter();
      } catch (e) {
        console.error('[Game] Error in ' + name + '.enter():', e);
      }
    }

    emit('screenChange', { from: previous, to: name });
  }

  /**
   * Register lifecycle hooks for a screen.
   *
   * @param {string} name
   * @param {{
   *   enter?  : function(),
   *   exit?   : function(),
   *   update? : function(dt: number),
   *   render? : function(ctx: CanvasRenderingContext2D, viewport: object)
   * }} hooks
   */
  function registerScreen(name, hooks) {
    _screenHooks[name] = hooks || {};
  }

  // ── Canvas & viewport ────────────────────────────────────────────────────────

  function _createCanvas() {
    // Reuse an existing #game-canvas element if present in HTML
    _canvas = document.getElementById('game-canvas');
    if (!_canvas) {
      _canvas = document.createElement('canvas');
      _canvas.id = 'game-canvas';
      _canvas.style.display = 'block';
      document.body.appendChild(_canvas);
    }

    _ctx = _canvas.getContext('2d');
    _dpr = global.devicePixelRatio || 1;

    _resizeCanvas();
    global.addEventListener('resize', _resizeCanvas, { passive: true });
  }

  function _resizeCanvas() {
    var winW = global.innerWidth;
    var winH = global.innerHeight;
    _dpr = global.devicePixelRatio || 1;

    var drawW, drawH, offsetX, offsetY;

    if (winW / winH > ASPECT_RATIO) {
      // Window wider than 19.5:9 — letterbox left & right
      drawH   = winH;
      drawW   = winH * ASPECT_RATIO;
      offsetX = (winW - drawW) / 2;
      offsetY = 0;
    } else {
      // Window taller than 19.5:9 — pillarbox top & bottom
      drawW   = winW;
      drawH   = winW / ASPECT_RATIO;
      offsetX = 0;
      offsetY = (winH - drawH) / 2;
    }

    var scale = drawW / DESIGN_WIDTH;

    _viewport = {
      x:      offsetX,
      y:      offsetY,
      width:  drawW,
      height: drawH,
      scale:  scale,
    };

    // Physical pixel dimensions
    _canvas.width  = Math.round(winW * _dpr);
    _canvas.height = Math.round(winH * _dpr);

    // CSS dimensions (always 1:1 to the window so it covers fully)
    _canvas.style.width    = winW + 'px';
    _canvas.style.height   = winH + 'px';
    _canvas.style.position = 'fixed';
    _canvas.style.top      = '0';
    _canvas.style.left     = '0';
    _canvas.style.zIndex   = '0';

    emit('resize', { viewport: _viewport, dpr: _dpr });
  }

  /**
   * Convert a client-space coordinate (from a mouse/touch event) into the
   * logical design-space coordinate used by game logic.
   *
   * @param  {number} clientX
   * @param  {number} clientY
   * @return {{ x: number, y: number }}
   */
  function screenToDesign(clientX, clientY) {
    return {
      x: (clientX - _viewport.x) / _viewport.scale,
      y: (clientY - _viewport.y) / _viewport.scale,
    };
  }

  // ── Physics setup ────────────────────────────────────────────────────────────

  /**
   * Create and return a fresh Matter.js engine + world + runner.
   * The runner is NOT started here; physics are stepped manually in the loop.
   */
  function createPhysics() {
    var M = _getMatter();

    _engine = M.Engine.create();
    _engine.gravity.x = 0;
    _engine.gravity.y = 0.7;

    _world  = _engine.world;

    // Runner exists so external code can use M.Runner.run() if desired,
    // but we default to manual stepping via M.Engine.update().
    _runner = M.Runner.create({ delta: 1000 / 60 });

    return { engine: _engine, world: _world, runner: _runner };
  }

  /**
   * Tear down the current physics simulation (clears all bodies / constraints).
   */
  function destroyPhysics() {
    if (_runner) {
      _getMatter().Runner.stop(_runner);
      _runner = null;
    }
    if (_engine) {
      var M = _getMatter();
      M.Composite.clear(_world, false);
      M.Engine.clear(_engine);
      _engine = null;
      _world  = null;
    }
  }

  // ── Input handling ───────────────────────────────────────────────────────────

  function _getEventCoords(e) {
    var touch   = e.touches ? (e.touches[0] || e.changedTouches[0]) : null;
    var clientX = touch ? touch.clientX : e.clientX;
    var clientY = touch ? touch.clientY : e.clientY;
    return screenToDesign(clientX, clientY);
  }

  function _onPointerDown(e) {
    if (e.type === 'touchstart') e.preventDefault();
    var pos = _getEventCoords(e);
    _input.pointerDown  = true;
    _input.isDragging   = true;
    _input.dragStart    = { x: pos.x, y: pos.y };
    _input.dragCurrent  = { x: pos.x, y: pos.y };
    _input.dragEnd      = null;
    emit('dragStart', { position: pos, raw: e });
  }

  function _onPointerMove(e) {
    if (!_input.isDragging) return;
    if (e.type === 'touchmove') e.preventDefault();
    var pos = _getEventCoords(e);
    _input.dragCurrent = { x: pos.x, y: pos.y };
    emit('dragMove', {
      position: pos,
      start:    _input.dragStart,
      delta: {
        x: pos.x - _input.dragStart.x,
        y: pos.y - _input.dragStart.y,
      },
      raw: e,
    });
  }

  function _onPointerUp(e) {
    if (!_input.isDragging) return;
    var pos = _getEventCoords(e);
    _input.isDragging  = false;
    _input.pointerDown = false;
    _input.dragEnd     = { x: pos.x, y: pos.y };

    var dx = pos.x - _input.dragStart.x;
    var dy = pos.y - _input.dragStart.y;
    emit('dragEnd', {
      position:  pos,
      start:     _input.dragStart,
      delta:     { x: dx, y: dy },
      magnitude: Math.sqrt(dx * dx + dy * dy),
      raw: e,
    });
  }

  function _bindInput() {
    _canvas.addEventListener('mousedown',   _onPointerDown);
    _canvas.addEventListener('mousemove',   _onPointerMove);
    _canvas.addEventListener('mouseup',     _onPointerUp);
    _canvas.addEventListener('mouseleave',  _onPointerUp);
    _canvas.addEventListener('touchstart',  _onPointerDown,  { passive: false });
    _canvas.addEventListener('touchmove',   _onPointerMove,  { passive: false });
    _canvas.addEventListener('touchend',    _onPointerUp,    { passive: false });
    _canvas.addEventListener('touchcancel', _onPointerUp,    { passive: false });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function _render() {
    var ctx = _ctx;
    var vp  = _viewport;

    // 1. Clear everything (using raw pixel coordinates, no transform)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // 2. Black letterbox bars
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    ctx.restore();

    // 3. Set up design-space transform:
    //    physical pixels = DPR × (viewport offset + scale × design coords)
    ctx.save();
    ctx.scale(_dpr, _dpr);
    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.scale, vp.scale);

    // Clip to the exact 19.5:9 play area so screens can't draw into bars
    ctx.beginPath();
    ctx.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.clip();

    // 4. Delegate to the active screen's render hook
    var hooks = _screenHooks[state.currentScreen];
    if (hooks && hooks.render) {
      try {
        hooks.render(ctx, vp);
      } catch (e) {
        console.error('[Game] Render error in screen "' + state.currentScreen + '":', e);
      }
    } else {
      // Fallback placeholder while a screen isn't registered yet
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.currentScreen.toUpperCase(), DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    }

    ctx.restore();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  function _tick(timestamp) {
    if (!_running) return;
    _rafId = requestAnimationFrame(_tick);

    // dt in seconds, capped to 50 ms to avoid tunnelling on tab restore
    var dt = Math.min((timestamp - _lastTime) / 1000, 0.05);
    _lastTime = timestamp;

    // Step physics only on screens that use it
    if (_engine) {
      var screen = state.currentScreen;
      if (screen === 'gameplay' || screen === 'bossbattle') {
        _getMatter().Engine.update(_engine, dt * 1000);
      }
    }

    // Update active screen
    var hooks = _screenHooks[state.currentScreen];
    if (hooks && hooks.update) {
      try {
        hooks.update(dt);
      } catch (e) {
        console.error('[Game] Update error in screen "' + state.currentScreen + '":', e);
      }
    }

    _render();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  /** Start the game loop. Called automatically by init(). */
  function start() {
    if (_running) return;
    _running  = true;
    _lastTime = performance.now();
    _rafId    = requestAnimationFrame(_tick);
    emit('start', {});
  }

  /** Pause the game loop (canvas freeze, physics halted). */
  function stop() {
    if (!_running) return;
    _running = false;
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    emit('stop', {});
  }

  /**
   * Initialise the engine. Call once when the page is ready.
   *
   * @param {{
   *   initialScreen? : string,   // default 'splash'
   *   physics?       : boolean,  // default true — set false to skip Matter.js init
   * }} [options]
   */
  function init(options) {
    options = options || {};

    _createCanvas();
    _bindInput();

    if (options.physics !== false) {
      createPhysics();
    }

    showScreen(options.initialScreen || 'splash');
    start();
    emit('init', { options: options });
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * @namespace Game
   */
  global.Game = {

    // ── Constants ──────────────────────────────────────────────────────────────
    DESIGN_WIDTH:  DESIGN_WIDTH,
    DESIGN_HEIGHT: DESIGN_HEIGHT,
    ASPECT_RATIO:  ASPECT_RATIO,
    SCREENS:       SCREENS,

    // ── Mutable game state ─────────────────────────────────────────────────────
    /** Live state object — read freely, write via setState() */
    state: state,

    /**
     * Merge a partial object into state and emit 'stateChange'.
     * @param {Partial<typeof state>} patch
     */
    setState: function (patch) {
      Object.assign(state, patch);
      emit('stateChange', { state: state });
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    init:  init,
    start: start,
    stop:  stop,

    // ── Screen management ──────────────────────────────────────────────────────
    showScreen:     showScreen,
    registerScreen: registerScreen,

    // ── Physics ────────────────────────────────────────────────────────────────
    createPhysics:  createPhysics,
    destroyPhysics: destroyPhysics,
    /** @return {Matter.Engine|null} */
    getEngine:  function () { return _engine; },
    /** @return {Matter.Composite|null} */
    getWorld:   function () { return _world;  },
    /** @return {Matter.Runner|null} */
    getRunner:  function () { return _runner; },

    // ── Rendering ──────────────────────────────────────────────────────────────
    /** @return {HTMLCanvasElement} */
    getCanvas:   function () { return _canvas;   },
    /** @return {CanvasRenderingContext2D} */
    getCtx:      function () { return _ctx;      },
    /**
     * Current viewport descriptor.
     * @return {{ x: number, y: number, width: number, height: number, scale: number }}
     */
    getViewport: function () { return _viewport; },

    /**
     * Map a client-space point to design-space coordinates.
     * @param  {number} clientX
     * @param  {number} clientY
     * @return {{ x: number, y: number }}
     */
    screenToDesign: screenToDesign,

    // ── Input ──────────────────────────────────────────────────────────────────
    /**
     * Current drag/aim state (live object, read-only).
     * Fields: isDragging, pointerDown, dragStart, dragCurrent, dragEnd.
     */
    getInput: function () { return _input; },

    // ── Event bus ──────────────────────────────────────────────────────────────
    /**
     * Subscribe to a game event.
     * Built-in events: 'init', 'start', 'stop', 'resize', 'screenChange',
     *                  'stateChange', 'dragStart', 'dragMove', 'dragEnd'.
     *
     * @param  {string}   event
     * @param  {Function} callback
     * @return {Function} call to unsubscribe
     */
    on:   on,
    emit: emit,
  };

}(window));
