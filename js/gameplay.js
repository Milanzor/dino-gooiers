/**
 * gameplay.js — Dino Gooiers core gameplay
 * Handles the construction-crane launcher, Matter.js physics, dino powers,
 * block/enemy rendering and all in-game logic.
 */

(function (G, M) {
  'use strict';

  // ── Design constants ──────────────────────────────────────────────────────
  const DW = G.DESIGN_WIDTH;    // 1170
  const DH = G.DESIGN_HEIGHT;   // 540

  // Crane geometry
  const MAST_X   = 190;   // mast centre x
  const MAST_TOP = 52;    // top of mast y
  const JIB_END  = 368;   // tip of crane arm x
  const JIB_Y    = 62;    // crane arm y
  const HOOK_X   = 352;   // cable exit point x
  const HOOK_Y   = 72;    // cable exit point y
  const REST_X   = HOOK_X;
  const REST_Y   = 360;   // dino resting y (hanging at rest)
  const GROUND_Y = 490;   // visual ground line

  const MAX_PULL    = 195;   // max drag distance from HOOK
  const LAUNCH_K    = 0.068; // velocity multiplier
  const DINO_RADIUS = 22;    // physics circle radius for launched dino
  const SETTLE_TIME = 2.8;   // seconds to wait for physics to settle
  const NEXT_DELAY  = 1.0;   // seconds between dinos

  // ── Block types ───────────────────────────────────────────────────────────
  const BLOCK_T = {
    wood:  { hp: 40,  density: 0.001, rest: 0.32, color: '#c8922a', dark: '#8a5e18', grain: '#a87828', pts: 50  },
    stone: { hp: 95,  density: 0.002, rest: 0.16, color: '#8a8a8a', dark: '#4e4e4e', grain: '#6e6e6e', pts: 100 },
    steel: { hp: 240, density: 0.004, rest: 0.06, color: '#5874a0', dark: '#2c3e60', grain: '#496080', pts: 180 },
    ice:   { hp: 18,  density: 0.0008,rest: 0.72, color: '#a4d4e8', dark: '#5e92a8', grain: '#88c0d8', pts: 40  },
  };

  // ── Enemy config ──────────────────────────────────────────────────────────
  const ENEMY_CFG = {
    grunt:      { r: 20, color: '#2a6248', bodyColor: '#3a7a58', hp: 45,  pts: 100, name: 'Grommert'   },
    shieldback: { r: 24, color: '#385a38', bodyColor: '#4a7248', hp: 85,  pts: 200, name: 'Schildrug'  },
    helmet:     { r: 20, color: '#484868', bodyColor: '#5a5a80', hp: 65,  pts: 150, name: 'Staalhelm'  },
    king:       { r: 28, color: '#7a3828', bodyColor: '#924232', hp: 130, pts: 350, name: 'Dinovorst'  },
    bone:       { r: 23, color: '#9a9a88', bodyColor: '#b4b4a0', hp: 95,  pts: 250, name: 'Botdino'    },
  };

  // ── Module state ──────────────────────────────────────────────────────────
  let _level      = null;
  let _phase      = 'AIMING'; // AIMING | FLYING | SETTLING | NEXT_DINO | COMPLETE | DEAD
  let _physObjs   = [];       // { body, kind:'block'|'enemy', type, hp, maxHp, pts, destroyed }
  let _dinoQueue  = [];       // remaining dino IDs
  let _curDinoId  = null;
  let _activeBody = null;     // physics body for flying dino
  let _splitBodies = [];      // extra bodies from triple_shot / speed_burst
  let _powerUsed  = false;
  let _drillMode  = false;    // horn_drill: pass through blocks
  let _dmgMult    = 1;        // steel_bite damage multiplier
  let _stompMode  = false;    // ground_stomp: explode on ground hit
  let _score          = 0;
  let _enemiesDefeated = 0;
  let _blocksDestroyed = 0;
  let _timer      = 0;
  let _particles  = [];
  let _cleanup    = null;
  let _isDragging = false;
  let _dragPos    = { x: REST_X, y: REST_Y };
  let _groundBody = null;
  let _explosions = [];       // { x, y, r, t, maxT }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function shadow(ctx, c, b) {
    ctx.shadowColor = c;
    ctx.shadowBlur = b;
  }

  // ── Physics setup ─────────────────────────────────────────────────────────

  function _buildPhysics() {
    const world = G.getWorld();

    // Ground (static)
    _groundBody = M.Bodies.rectangle(DW / 2, GROUND_Y + 20, DW * 2, 40, {
      isStatic: true, label: 'ground', restitution: 0.2,
    });
    M.World.add(world, _groundBody);

    // Left wall (prevents dino rolling off)
    M.World.add(world, M.Bodies.rectangle(-20, DH / 2, 40, DH, { isStatic: true, label: 'wall' }));

    // Blocks
    _level.blocks.forEach(function (b) {
      const cfg = BLOCK_T[b.type] || BLOCK_T.wood;
      const body = M.Bodies.rectangle(b.x, b.y, b.w, b.h, {
        density: cfg.density,
        restitution: cfg.rest,
        friction: 0.5,
        frictionStatic: 0.6,
        label: 'block',
      });
      const obj = { body, kind: 'block', type: b.type, w: b.w, h: b.h,
                    hp: cfg.hp, maxHp: cfg.hp, pts: cfg.pts, destroyed: false };
      body._gobj = obj;
      _physObjs.push(obj);
      M.World.add(world, body);
    });

    // Enemies
    _level.enemies.forEach(function (e) {
      const cfg = ENEMY_CFG[e.type] || ENEMY_CFG.grunt;
      const body = M.Bodies.circle(e.x, e.y, cfg.r, {
        density: 0.0015,
        restitution: 0.3,
        friction: 0.4,
        label: 'enemy',
      });
      const obj = { body, kind: 'enemy', type: e.type, r: cfg.r,
                    hp: cfg.hp, maxHp: cfg.hp, pts: cfg.pts, destroyed: false };
      body._gobj = obj;
      _physObjs.push(obj);
      M.World.add(world, body);
    });
  }

  function _createDinoBody(x, y) {
    const body = M.Bodies.circle(x, y, DINO_RADIUS, {
      density: 0.003,
      restitution: 0.35,
      friction: 0.3,
      label: 'dino',
    });
    body._gobj = { kind: 'dino', dinoId: _curDinoId };
    M.World.add(G.getWorld(), body);
    return body;
  }

  function _removeBody(body) {
    if (!body) return;
    M.World.remove(G.getWorld(), body);
  }

  // ── Collision handling ────────────────────────────────────────────────────

  function _onCollision(event) {
    event.pairs.forEach(function (pair) {
      const bA = pair.bodyA, bB = pair.bodyB;
      const isActiveDino = (bA === _activeBody || bB === _activeBody) ||
        _splitBodies.includes(bA) || _splitBodies.includes(bB);

      // Relative speed
      const rvx = bA.velocity.x - bB.velocity.x;
      const rvy = bA.velocity.y - bB.velocity.y;
      const speed = Math.sqrt(rvx * rvx + rvy * rvy);
      if (speed < 1.5) return;

      const damage = Math.round(speed * 9 + 4);

      if (isActiveDino) {
        const dino   = (bA === _activeBody || _splitBodies.includes(bA)) ? bA : bB;
        const other  = dino === bA ? bB : bA;
        const gobj   = other._gobj;
        if (!gobj) return;

        if (gobj.kind === 'block' && !gobj.destroyed) {
          const d = damage * _dmgMult * (_drillMode ? 2.5 : 1);
          _damageBlock(gobj, d, dino.position);
        } else if (gobj.kind === 'enemy' && !gobj.destroyed) {
          const d = damage * _dmgMult * 1.6;
          _damageEnemy(gobj, d, dino.position);
        } else if (other.label === 'ground' && _stompMode) {
          _stompMode = false;
          _createExplosion(dino.position.x, dino.position.y - 20, 130);
        }
      } else {
        // Block/enemy chain collisions
        const goA = bA._gobj, goB = bB._gobj;
        if (goA && goB && speed > 3) {
          const chainDmg = Math.round(speed * 4 + 2);
          if (goA.kind === 'block' && !goA.destroyed) _damageBlock(goA, chainDmg, bA.position);
          if (goB.kind === 'block' && !goB.destroyed) _damageBlock(goB, chainDmg, bB.position);
          if (goA.kind === 'enemy' && !goA.destroyed) _damageEnemy(goA, chainDmg * 0.5, bA.position);
          if (goB.kind === 'enemy' && !goB.destroyed) _damageEnemy(goB, chainDmg * 0.5, bB.position);
        }
      }
    });
  }

  function _damageBlock(obj, dmg, pos) {
    obj.hp -= dmg;
    if (obj.hp <= 0) {
      obj.destroyed = true;
      _score += obj.pts;
      _blocksDestroyed++;
      _spawnBlockDebris(pos.x, pos.y, obj.type);
      _removeBody(obj.body);
    }
  }

  function _damageEnemy(obj, dmg, pos) {
    obj.hp -= dmg;
    if (obj.hp <= 0) {
      obj.destroyed = true;
      _score += obj.pts;
      _enemiesDefeated++;
      _spawnEnemyParticles(pos.x, pos.y);
      _removeBody(obj.body);
    }
  }

  function _createExplosion(x, y, r) {
    _explosions.push({ x, y, r, t: 0, maxT: 0.45 });
    // Blast all bodies within radius
    M.Composite.allBodies(G.getWorld()).forEach(function (b) {
      if (b.isStatic) return;
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r && dist > 0) {
        const force = (1 - dist / r) * 0.15;
        M.Body.applyForce(b, b.position, { x: (dx / dist) * force, y: (dy / dist) * force - 0.05 });
        const gobj = b._gobj;
        if (gobj && !gobj.destroyed) {
          const blastDmg = Math.round((1 - dist / r) * 80);
          if (gobj.kind === 'block') _damageBlock(gobj, blastDmg, b.position);
          if (gobj.kind === 'enemy') _damageEnemy(gobj, blastDmg, b.position);
        }
      }
    });
    _spawnEnemyParticles(x, y, 20);
  }

  // ── Particle effects ──────────────────────────────────────────────────────

  function _spawnBlockDebris(x, y, type) {
    const cfg = BLOCK_T[type] || BLOCK_T.wood;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i / 8) + Math.random() * 0.5;
      const speed = 2 + Math.random() * 5;
      _particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: i % 2 === 0 ? cfg.color : cfg.dark,
        w: 8 + Math.random() * 10,
        h: 6 + Math.random() * 8,
        ang: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        life: 1.0, maxLife: 0.6 + Math.random() * 0.5,
      });
    }
  }

  function _spawnEnemyParticles(x, y, count) {
    count = count || 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + Math.random() * 0.4;
      const speed = 2 + Math.random() * 6;
      const colors = ['#f5c842', '#ff6030', '#50ff50', '#ff50a0', '#50d0ff'];
      _particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: colors[i % colors.length],
        w: 6, h: 6, ang: 0, spin: 0,
        life: 1.0, maxLife: 0.7 + Math.random() * 0.5,
        circle: true,
      });
    }
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  function _onDragStart(e) {
    if (_phase !== 'AIMING') {
      // Tap during flight = activate power
      if (_phase === 'FLYING' && !_powerUsed) {
        _activatePower();
        _powerUsed = true;
      }
      return;
    }
    const dx = e.position.x - REST_X;
    const dy = e.position.y - REST_Y;
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      _isDragging = true;
      _dragPos = { x: e.position.x, y: e.position.y };
    }
  }

  function _onDragMove(e) {
    if (!_isDragging || _phase !== 'AIMING') return;
    let tx = e.position.x, ty = e.position.y;
    const dx = tx - HOOK_X, dy = ty - HOOK_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_PULL) {
      tx = HOOK_X + (dx / dist) * MAX_PULL;
      ty = HOOK_Y + (dy / dist) * MAX_PULL;
    }
    _dragPos = { x: tx, y: ty };
  }

  function _onDragEnd(e) {
    if (_phase === 'FLYING' && !_powerUsed && e.magnitude < 18) {
      _activatePower();
      _powerUsed = true;
      return;
    }
    if (!_isDragging || _phase !== 'AIMING') return;
    _isDragging = false;

    const dx = _dragPos.x - HOOK_X;
    const dy = _dragPos.y - HOOK_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 20) { _dragPos = { x: REST_X, y: REST_Y }; return; }

    _launch();
  }

  function _launch() {
    const vx = (HOOK_X - _dragPos.x) * LAUNCH_K;
    const vy = (HOOK_Y - _dragPos.y) * LAUNCH_K;
    _activeBody = _createDinoBody(_dragPos.x, _dragPos.y);
    M.Body.setVelocity(_activeBody, { x: vx, y: vy });
    _dragPos = { x: REST_X, y: REST_Y };
    _phase = 'FLYING';
    _timer = 0;
    _powerUsed = false;
    _drillMode = false;
    _dmgMult = 1;
    _stompMode = false;
    _splitBodies = [];
  }

  // ── Dino powers ───────────────────────────────────────────────────────────

  function _activatePower() {
    if (!_activeBody || !_curDinoId) return;
    const dino = window.getDinoById(_curDinoId);
    if (!dino) return;

    switch (dino.power) {
      case 'triple_shot': {
        const v = _activeBody.velocity;
        const base = Math.sqrt(v.x * v.x + v.y * v.y);
        const angle = Math.atan2(v.y, v.x);
        [-0.22, 0.22].forEach(function (spread) {
          const b = _createDinoBody(_activeBody.position.x, _activeBody.position.y);
          M.Body.setVelocity(b, {
            x: Math.cos(angle + spread) * base,
            y: Math.sin(angle + spread) * base,
          });
          _splitBodies.push(b);
        });
        break;
      }
      case 'dive_bomb': {
        const v = _activeBody.velocity;
        M.Body.setVelocity(_activeBody, { x: v.x, y: Math.max(v.y + 14, 10) });
        break;
      }
      case 'speed_burst': {
        const v = _activeBody.velocity;
        const len = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
        M.Body.setVelocity(_activeBody, { x: v.x / len * (len + 12), y: v.y / len * (len + 12) });
        // Spawn two clones with slight spread
        const angle = Math.atan2(v.y, v.x);
        [0.15, -0.15].forEach(function (s) {
          const b = _createDinoBody(_activeBody.position.x, _activeBody.position.y);
          M.Body.setVelocity(b, { x: Math.cos(angle + s) * (len + 8), y: Math.sin(angle + s) * (len + 8) });
          _splitBodies.push(b);
        });
        break;
      }
      case 'horn_drill':
        _drillMode = true;
        _dmgMult = 2;
        break;
      case 'steel_bite':
        _dmgMult = 3;
        break;
      case 'ground_stomp':
        _stompMode = true;
        // Add downward impulse
        M.Body.setVelocity(_activeBody, { x: _activeBody.velocity.x, y: 18 });
        break;
      case 'massive_weight':
        M.Body.setDensity(_activeBody, 0.02);
        M.Body.setVelocity(_activeBody, { x: _activeBody.velocity.x, y: _activeBody.velocity.y + 8 });
        break;
      case 'electric_tail':
        // Electrify: short-range damage to nearby enemies
        _physObjs.forEach(function (obj) {
          if (obj.kind !== 'enemy' || obj.destroyed) return;
          const dx = obj.body.position.x - _activeBody.position.x;
          const dy = obj.body.position.y - _activeBody.position.y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) {
            _damageEnemy(obj, 55, _activeBody.position);
          }
        });
        _spawnEnemyParticles(_activeBody.position.x, _activeBody.position.y, 10);
        break;
      case 'multiply':
        // Spawn 2 more small clones
        const v2 = _activeBody.velocity;
        [-0.3, 0.3].forEach(function (s) {
          const b = _createDinoBody(_activeBody.position.x, _activeBody.position.y);
          M.Body.setVelocity(b, { x: v2.x + Math.sin(s) * 4, y: v2.y + Math.cos(s) * 2 });
          _splitBodies.push(b);
        });
        break;
      case 'bomb_explode':
        _createExplosion(_activeBody.position.x, _activeBody.position.y, 160);
        if (_activeBody) { _removeBody(_activeBody); _activeBody = null; }
        _phase = 'SETTLING';
        _timer = 0;
        break;
    }
  }

  // ── Game state machine ────────────────────────────────────────────────────

  function _update(dt) {
    _timer += dt;

    // Update particles
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.x  += p.vx;  p.y  += p.vy;
      p.vy += 0.28;  p.vx *= 0.96;
      p.ang += p.spin;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) _particles.splice(i, 1);
    }

    // Update explosions
    for (let i = _explosions.length - 1; i >= 0; i--) {
      _explosions[i].t += dt;
      if (_explosions[i].t >= _explosions[i].maxT) _explosions.splice(i, 1);
    }

    if (_phase === 'FLYING') {
      // Check off-screen
      const allFlying = [_activeBody, ..._splitBodies].filter(Boolean);
      const allOffScreen = allFlying.every(function (b) {
        return !b || b.position.x > DW + 100 || b.position.x < -100 || b.position.y > GROUND_Y + 80;
      });
      if (allOffScreen || _timer > 8) {
        _phase = 'SETTLING';
        _timer = 0;
      }
    }

    if (_phase === 'SETTLING') {
      if (_timer >= SETTLE_TIME) {
        _cleanupActiveBodies();
        _checkWinLose();
      }
    }

    if (_phase === 'NEXT_DINO') {
      if (_timer >= NEXT_DELAY) {
        _prepareNextDino();
      }
    }
  }

  function _cleanupActiveBodies() {
    if (_activeBody) { _removeBody(_activeBody); _activeBody = null; }
    _splitBodies.forEach(function (b) { _removeBody(b); });
    _splitBodies = [];
  }

  function _checkWinLose() {
    const surviving = _physObjs.filter(function (o) { return o.kind === 'enemy' && !o.destroyed; });
    const enemiesLeft = surviving.length;

    if (enemiesLeft <= 0) {
      // Level complete
      const dinoBonus = _dinoQueue.length * 1000;
      _score += dinoBonus;
      const dinos  = _level.dinos.length;
      const used   = dinos - _dinoQueue.length;
      const par    = _level.par;
      const stars  = used <= par - 2 ? 3 : used <= par ? 2 : 1;
      G.setState({ lastScore: _score, lastStars: stars });
      window.Storage.saveLevel(G.state.currentLevel, stars, _score);
      // Update max level
      const saved = window.Storage.load();
      G.setState({ maxLevel: saved.maxLevel, stars: saved.stars });
      _phase = 'COMPLETE';
      setTimeout(function () { G.emit('levelComplete', { levelId: G.state.currentLevel, stars: stars, score: _score, details: { enemiesDefeated: _enemiesDefeated, blocksDestroyed: _blocksDestroyed, bonusDinos: _dinoQueue.length } }); }, 600);
    } else if (_dinoQueue.length === 0) {
      // Game over
      G.setState({ lastScore: _score });
      _phase = 'DEAD';
      setTimeout(function () { G.emit('gameOver', { score: _score }); }, 600);
    } else {
      _phase = 'NEXT_DINO';
      _timer = 0;
    }
  }

  function _prepareNextDino() {
    _curDinoId = _dinoQueue.shift();
    _dragPos = { x: REST_X, y: REST_Y };
    _phase = 'AIMING';
    _timer = 0;
  }

  // ── Screen enter / exit ───────────────────────────────────────────────────

  function _enter() {
    const levelIdx = G.state.currentLevel - 1;
    _level = window.LEVELS[levelIdx];
    if (!_level) { G.showScreen('worldmap'); return; }

    _physObjs        = [];
    _dinoQueue       = _level.dinos.slice(1); // first one is ready
    _curDinoId       = _level.dinos[0];
    _score           = 0;
    _enemiesDefeated = 0;
    _blocksDestroyed = 0;
    _timer           = 0;
    _particles  = [];
    _explosions = [];
    _activeBody = null;
    _splitBodies = [];
    _phase      = 'AIMING';
    _powerUsed  = false;
    _isDragging = false;
    _dragPos    = { x: REST_X, y: REST_Y };
    _groundBody = null;

    // Build new physics
    G.destroyPhysics();
    G.createPhysics();
    _buildPhysics();

    // Event bindings
    const offDS = G.on('dragStart', _onDragStart);
    const offDM = G.on('dragMove',  _onDragMove);
    const offDE = G.on('dragEnd',   _onDragEnd);
    const colHandler = function (e) { _onCollision(e); };
    M.Events.on(G.getEngine(), 'collisionStart', colHandler);

    _cleanup = function () {
      offDS(); offDM(); offDE();
      if (G.getEngine()) M.Events.off(G.getEngine(), 'collisionStart', colHandler);
    };
  }

  function _exit() {
    if (_cleanup) { _cleanup(); _cleanup = null; }
    _particles  = [];
    _explosions = [];
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  let _t = 0;

  function _render(ctx) {
    _t += 0.016;

    _drawBackground(ctx);
    _drawBlocks(ctx);
    _drawEnemies(ctx);
    _drawActiveDinos(ctx);
    _drawParticles(ctx);
    _drawExplosions(ctx);
    _drawCrane(ctx);
    if (_phase === 'AIMING' && _isDragging) _drawTrajectory(ctx);
    _drawCableAndDino(ctx);
    _drawHUD(ctx);
  }

  // ── Background ────────────────────────────────────────────────────────────

  function _drawBackground(ctx) {
    const world = _level ? _level.world : 1;

    // Sky
    let skyColors;
    if (world === 3) skyColors = ['#0a0612', '#170828', '#241038'];
    else if (world === 2) skyColors = ['#0c1830', '#1f3060', '#4a3078'];
    else skyColors = ['#d04018', '#e86020', '#f8b040'];

    const sg = ctx.createLinearGradient(0, 0, 0, DH * 0.7);
    sg.addColorStop(0, skyColors[0]); sg.addColorStop(0.55, skyColors[1]); sg.addColorStop(1, skyColors[2]);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, DW, DH * 0.7);

    // Stars (world 2+)
    if (world >= 2) {
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 1337 + 77) % 1050) + 60;
        const sy = ((i * 791 + 33) % 280) + 15;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(_t * 1.4 + i * 0.8));
        ctx.globalAlpha = tw * (world === 3 ? 0.9 : 0.6);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Clouds (world 1)
    if (world === 1) {
      ctx.fillStyle = 'rgba(255,220,170,.28)';
      [[230, 72, 110, 38], [480, 55, 135, 30], [740, 88, 95, 34], [980, 66, 115, 36]].forEach(function (c) {
        const cx = ((c[0] + _t * 16) % (DW + 240)) - 120;
        ctx.beginPath(); ctx.ellipse(cx, c[1], c[2], c[3], 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + c[2]*0.4, c[1]-c[3]*0.4, c[2]*0.55, c[3]*0.65, 0, 0, Math.PI * 2); ctx.fill();
      });
    }

    // Mountains back layer
    const mCol = world === 1 ? '#5a3010' : world === 2 ? '#1a1a38' : '#0e0a18';
    ctx.fillStyle = mCol;
    ctx.beginPath(); ctx.moveTo(0, DH * 0.7);
    [50,0.52, 150,0.38, 280,0.54, 400,0.30, 530,0.47, 660,0.26, 780,0.44, 900,0.30, 1050,0.46, 1170,0.36]
      .reduce(function (_, v, i, a) { if (i%2===0) ctx.lineTo(a[i], DH*a[i+1]); return _; }, 0);
    ctx.lineTo(DW, DH * 0.7); ctx.closePath(); ctx.fill();

    // Mountains front layer
    const mCol2 = world === 1 ? '#7a4a20' : world === 2 ? '#242448' : '#161424';
    ctx.fillStyle = mCol2;
    ctx.beginPath(); ctx.moveTo(0, DH * 0.7);
    [80,0.64, 200,0.54, 330,0.67, 460,0.49, 590,0.62, 700,0.46, 820,0.60, 940,0.51, 1060,0.65, 1170,0.56]
      .reduce(function (_, v, i, a) { if (i%2===0) ctx.lineTo(a[i], DH*a[i+1]); return _; }, 0);
    ctx.lineTo(DW, DH * 0.7); ctx.closePath(); ctx.fill();

    // Ground
    const gy = DH * 0.7;
    const gg = ctx.createLinearGradient(0, gy, 0, DH);
    if (world === 1) { gg.addColorStop(0, '#7a4a1a'); gg.addColorStop(1, '#3a1a08'); }
    else if (world === 2) { gg.addColorStop(0, '#484858'); gg.addColorStop(1, '#28283a'); }
    else { gg.addColorStop(0, '#282838'); gg.addColorStop(1, '#0e0e1a'); }
    ctx.fillStyle = gg; ctx.fillRect(0, gy, DW, DH - gy);

    // Ground surface line
    const surfG = ctx.createLinearGradient(0, gy - 4, 0, gy + 2);
    surfG.addColorStop(0, world === 1 ? '#c89040' : world === 2 ? '#909090' : '#505060');
    surfG.addColorStop(1, 'transparent');
    ctx.fillStyle = surfG; ctx.fillRect(0, gy - 4, DW, 8);

    // World 3: hazard stripes
    if (world === 3) {
      for (let x = 0; x < DW; x += 38) {
        ctx.fillStyle = (Math.floor(x / 38) % 2 === 0) ? 'rgba(255,160,0,.12)' : 'rgba(0,0,0,.06)';
        ctx.fillRect(x, DH - 18, 38, 18);
      }
    }

    // Lava glow world 3 in distance
    if (world === 3) {
      const lg = ctx.createRadialGradient(DW * 0.7, DH * 0.7, 0, DW * 0.7, DH * 0.7, 320);
      lg.addColorStop(0, 'rgba(255,80,0,.18)'); lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, DW, DH);
    }
  }

  // ── Block drawing ─────────────────────────────────────────────────────────

  function _drawBlocks(ctx) {
    _physObjs.forEach(function (obj) {
      if (obj.kind !== 'block' || obj.destroyed) return;
      const b = obj.body;
      const bw = obj.w, bh = obj.h;
      const cfg = BLOCK_T[obj.type] || BLOCK_T.wood;
      const dmgR = 1 - obj.hp / obj.maxHp;

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      // Shadow
      shadow(ctx, 'rgba(0,0,0,.35)', 6);
      ctx.fillStyle = cfg.dark;
      rr(ctx, -bw/2 + 2, -bh/2 + 2, bw, bh, 4);
      ctx.fill();
      noShadow(ctx);

      // Main fill
      const bg = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
      bg.addColorStop(0, _lighten(cfg.color, 0.12));
      bg.addColorStop(1, cfg.color);
      ctx.fillStyle = bg;
      rr(ctx, -bw/2, -bh/2, bw, bh, 4);
      ctx.fill();

      // Texture
      if (obj.type === 'wood') {
        ctx.strokeStyle = cfg.grain;
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const gy2 = -bh/2 + bh * i / 4;
          ctx.globalAlpha = 0.45;
          ctx.beginPath(); ctx.moveTo(-bw/2 + 4, gy2); ctx.lineTo(bw/2 - 4, gy2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (obj.type === 'steel') {
        const sg2 = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, -bh/2);
        sg2.addColorStop(0, 'rgba(255,255,255,.04)'); sg2.addColorStop(0.4, 'rgba(255,255,255,.14)');
        sg2.addColorStop(0.6, 'rgba(255,255,255,.04)'); sg2.addColorStop(1, 'transparent');
        ctx.fillStyle = sg2;
        rr(ctx, -bw/2, -bh/2, bw, bh, 4);
        ctx.fill();
        // Rivets
        ctx.fillStyle = cfg.dark;
        [[-bw/2+7, -bh/2+7], [bw/2-7, -bh/2+7], [-bw/2+7, bh/2-7], [bw/2-7, bh/2-7]].forEach(function (rp) {
          ctx.beginPath(); ctx.arc(rp[0], rp[1], 3, 0, Math.PI*2); ctx.fill();
        });
      } else if (obj.type === 'ice') {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        rr(ctx, -bw/2 + 4, -bh/2 + 4, bw - 8, bh/3, 3);
        ctx.fill();
      }

      // Outline
      ctx.strokeStyle = cfg.dark;
      ctx.lineWidth = 1.8;
      rr(ctx, -bw/2, -bh/2, bw, bh, 4);
      ctx.stroke();

      // Damage cracks
      if (dmgR > 0.25) {
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.28, -bh * 0.35);
        ctx.lineTo(-bw * 0.05, -bh * 0.08);
        ctx.lineTo( bw * 0.18, -bh * 0.28);
        ctx.stroke();
      }
      if (dmgR > 0.55) {
        ctx.beginPath();
        ctx.moveTo(-bw * 0.08, bh * 0.22);
        ctx.lineTo( bw * 0.28, bh * 0.1);
        ctx.lineTo( bw * 0.12, -bh * 0.2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // ── Enemy drawing ─────────────────────────────────────────────────────────

  function _drawEnemies(ctx) {
    _physObjs.forEach(function (obj) {
      if (obj.kind !== 'enemy' || obj.destroyed) return;
      const b = obj.body;
      const r = obj.r;
      const cfg = ENEMY_CFG[obj.type];
      const dmgFlash = obj.hp < obj.maxHp * 0.35 ? Math.abs(Math.sin(_t * 12)) * 0.35 : 0;

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      // Try SVG image
      if (window.DinoImages && window.DinoImages[obj.type]) {
        const img = window.DinoImages[obj.type];
        const sz = r * 2.6;
        ctx.drawImage(img, -sz * 0.55, -sz * 0.55, sz, sz);
      } else {
        _drawCartoonEnemy(ctx, obj.type, r, cfg, _t);
      }

      // Damage flash overlay
      if (dmgFlash > 0) {
        ctx.globalAlpha = dmgFlash;
        ctx.fillStyle = '#ff4040';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // HP bar
      if (obj.hp < obj.maxHp) {
        const bw = r * 2.6, bh = 6;
        const bx = -r * 1.3, by = -r - 14;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        rr(ctx, bx - 1, by - 1, bw + 2, bh + 2, 3); ctx.fill();
        ctx.fillStyle = '#d02020';
        rr(ctx, bx, by, bw, bh, 2); ctx.fill();
        ctx.fillStyle = '#40e040';
        rr(ctx, bx, by, bw * (obj.hp / obj.maxHp), bh, 2); ctx.fill();
      }

      ctx.restore();
    });
  }

  function _drawCartoonEnemy(ctx, type, r, cfg, t) {
    const c = cfg.bodyColor;
    const dark = cfg.color;

    // Body
    shadow(ctx, 'rgba(0,0,0,.3)', 8);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(-1, -1, r - 2, 0, Math.PI * 2); ctx.fill();

    // Belly
    ctx.fillStyle = _lighten(c, 0.28);
    ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.5, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.18, r * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.14, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.22, r * 0.07, 0, Math.PI * 2); ctx.fill();

    // Angry brow
    ctx.strokeStyle = '#1a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.56); ctx.lineTo(r * 0.55, -r * 0.38);
    ctx.stroke();

    // Type-specific decorations
    if (type === 'helmet') {
      ctx.fillStyle = '#6878a0';
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.88, Math.PI * 1.1, 0, false); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#809ab8';
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.88, Math.PI * 1.2, Math.PI * 1.05, false); ctx.stroke();
      ctx.fillStyle = '#4a5880';
      ctx.fillRect(-r * 0.9, -r * 0.12, r * 1.8, r * 0.28);
    } else if (type === 'shieldback') {
      // Shield on back (left side from perspective)
      ctx.fillStyle = '#c8b870';
      ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.72, r * 0.32, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a09050'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.67); ctx.lineTo(-r * 0.2, -r * 0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.92, -r * 0.35); ctx.lineTo(r * 0.52, -r * 0.35); ctx.stroke();
    } else if (type === 'king') {
      ctx.fillStyle = '#f5c842';
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.85);
      [[-0.35, -1.25], [-0.12, -0.98], [0, -1.35], [0.12, -0.98], [0.35, -1.25], [0.52, -0.85]]
        .forEach(function (p) { ctx.lineTo(r * p[0], r * p[1]); });
      ctx.lineTo(r * 0.52, -r * 0.85); ctx.closePath();
      shadow(ctx, 'rgba(200,160,0,.6)', 10); ctx.fill(); noShadow(ctx);
      // Jewels
      ['#e22', '#22e', '#2a2'].forEach(function (jc, ji) {
        ctx.fillStyle = jc;
        ctx.beginPath(); ctx.arc(r * (-0.2 + ji * 0.2), -r * 0.88, r * 0.09, 0, Math.PI * 2); ctx.fill();
      });
    } else if (type === 'bone') {
      // Ribcage lines
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 3; i++) {
        const ry = -r * 0.15 + i * r * 0.22;
        ctx.beginPath(); ctx.moveTo(-r * 0.55, ry); ctx.lineTo(r * 0.55, ry); ctx.stroke();
      }
      // Skull mouth
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.28); ctx.lineTo(r * 0.2, r * 0.2);
      ctx.lineTo(r * 0.3, r * 0.28); ctx.lineTo(r * 0.4, r * 0.2); ctx.stroke();
    }
  }

  // ── Active dino drawing ───────────────────────────────────────────────────

  function _drawActiveDinos(ctx) {
    const bodies = [_activeBody, ..._splitBodies].filter(Boolean);
    bodies.forEach(function (b) {
      _drawDinoBody(ctx, b, _curDinoId, _phase === 'FLYING');
    });
  }

  function _drawDinoBody(ctx, body, dinoId, flying) {
    if (!body) return;
    const x = body.position.x, y = body.position.y;
    const dino = window.getDinoById(dinoId);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    if (flying) {
      // Speed trail
      const v = body.velocity;
      const spd = Math.sqrt(v.x * v.x + v.y * v.y);
      if (spd > 3) {
        const trailAngle = Math.atan2(-v.y, -v.x);
        const trailLen = Math.min(spd * 3, 50);
        const tg = ctx.createLinearGradient(0, 0, Math.cos(trailAngle) * trailLen, Math.sin(trailAngle) * trailLen);
        tg.addColorStop(0, dino ? dino.colors.belly : 'rgba(255,255,255,.6)');
        tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(Math.cos(trailAngle) * trailLen * 0.5, Math.sin(trailAngle) * trailLen * 0.5,
          trailLen, DINO_RADIUS * 0.5, trailAngle, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (window.DinoImages && dino && window.DinoImages[dino.id]) {
      const img = window.DinoImages[dino.id];
      const sz = DINO_RADIUS * 3.2;
      ctx.drawImage(img, -sz * 0.52, -sz * 0.52, sz, sz);
    } else if (dino) {
      _drawCartoonHero(ctx, dino, DINO_RADIUS, _t);
    } else {
      ctx.fillStyle = '#8bc34a';
      ctx.beginPath(); ctx.arc(0, 0, DINO_RADIUS, 0, Math.PI * 2); ctx.fill();
    }

    // Power-ready glow
    if (_phase === 'FLYING' && !_powerUsed) {
      ctx.globalAlpha = 0.35 + Math.sin(_t * 6) * 0.15;
      ctx.strokeStyle = '#f5c842';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, DINO_RADIUS + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function _drawCartoonHero(ctx, dino, r, t) {
    const c = dino.colors;

    // Body
    shadow(ctx, 'rgba(0,0,0,.3)', 8);
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = c.main;
    ctx.beginPath(); ctx.arc(-1, -1, r - 2, 0, Math.PI * 2); ctx.fill();

    // Belly spot
    ctx.fillStyle = c.belly;
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.48, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.2, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.ink;
    ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.16, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.26, r * 0.08, 0, Math.PI * 2); ctx.fill();

    // Friendly smile
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(r * 0.28, -r * 0.02, r * 0.2, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Dino-specific extras
    if (dino.id === 'rocky' || dino.id === 'stomp') {
      // Back spines
      ctx.fillStyle = c.dark;
      for (let i = 0; i < 3; i++) {
        const sx = -r * 0.2 + i * r * 0.2;
        ctx.beginPath();
        ctx.moveTo(sx - r * 0.12, -r * 0.65);
        ctx.lineTo(sx, -r * 1.1);
        ctx.lineTo(sx + r * 0.12, -r * 0.65);
        ctx.closePath(); ctx.fill();
      }
    } else if (dino.id === 'chomp') {
      // Teeth
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(r * (0.05 + i * 0.18), r * 0.42);
        ctx.lineTo(r * (0.14 + i * 0.18), r * 0.7);
        ctx.lineTo(r * (0.23 + i * 0.18), r * 0.42);
        ctx.closePath(); ctx.fill();
      }
    } else if (dino.id === 'sky') {
      // Wings
      ctx.fillStyle = c.main;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, 0);
      ctx.lineTo(-r * 1.2, -r * 0.6);
      ctx.lineTo(-r * 0.8, r * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.2);
      ctx.lineTo(r * 1.2, -r * 0.6);
      ctx.lineTo(r * 0.7, r * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (dino.id === 'trix') {
      // Three horns
      ctx.fillStyle = c.belly;
      [[r * 0.3, -r * 0.65, -0.2], [r * 0.5, -r * 0.5, 0.1], [r * 0.15, -r * 0.7, -0.5]].forEach(function (h) {
        ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate(h[2]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.08, r * 0.3); ctx.lineTo(r * 0.08, r * 0.3); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    } else if (dino.id === 'dash') {
      // Speed lines
      ctx.strokeStyle = c.belly;
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
      [[-r*0.8, -r*0.2, -r*0.4, -r*0.3], [-r*0.9, r*0.1, -r*0.5, 0],
       [-r*0.7, r*0.35, -r*0.35, r*0.2]].forEach(function (l) {
        ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  // ── Particles ─────────────────────────────────────────────────────────────

  function _drawParticles(ctx) {
    _particles.forEach(function (p) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = p.color;
      if (p.circle) {
        ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // ── Explosion effects ─────────────────────────────────────────────────────

  function _drawExplosions(ctx) {
    _explosions.forEach(function (ex) {
      const progress = ex.t / ex.maxT;
      const r = ex.r * (0.4 + progress * 0.6);
      const eg = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
      eg.addColorStop(0, 'rgba(255,240,100,' + (1 - progress) * 0.9 + ')');
      eg.addColorStop(0.4, 'rgba(255,120,20,' + (1 - progress) * 0.7 + ')');
      eg.addColorStop(1, 'rgba(200,60,0,0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2); ctx.fill();
      // Shockwave ring
      ctx.strokeStyle = 'rgba(255,200,100,' + (1 - progress) * 0.4 + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 1.2, 0, Math.PI * 2); ctx.stroke();
    });
  }

  // ── Crane rendering ───────────────────────────────────────────────────────

  function _drawCrane(ctx) {
    const mx = MAST_X;
    const mt = MAST_TOP;

    ctx.save();

    // Mast (lattice tower)
    ctx.fillStyle = '#4a5870';
    ctx.strokeStyle = '#303848';
    ctx.lineWidth = 1.5;
    const mw = 20;
    ctx.fillRect(mx - mw / 2, mt, mw, GROUND_Y - mt);
    ctx.strokeRect(mx - mw / 2, mt, mw, GROUND_Y - mt);

    // Lattice bracing on mast
    ctx.strokeStyle = '#3a4858';
    ctx.lineWidth = 1;
    for (let y = mt; y < GROUND_Y - 30; y += 36) {
      ctx.beginPath();
      ctx.moveTo(mx - mw / 2, y);
      ctx.lineTo(mx + mw / 2, y + 36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + mw / 2, y);
      ctx.lineTo(mx - mw / 2, y + 36);
      ctx.stroke();
    }

    // Base pads
    ctx.fillStyle = '#303848';
    ctx.fillRect(mx - 40, GROUND_Y - 10, 80, 10);

    // Operator cab
    ctx.fillStyle = '#f5a000';
    shadow(ctx, 'rgba(0,0,0,.4)', 10);
    rr(ctx, mx - 32, JIB_Y + 4, 44, 34, 6); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = '#ffe080';
    rr(ctx, mx - 25, JIB_Y + 10, 30, 18, 4); ctx.fill();
    // Cab outline
    ctx.strokeStyle = '#c07800'; ctx.lineWidth = 1.5;
    rr(ctx, mx - 32, JIB_Y + 4, 44, 34, 6); ctx.stroke();

    // Counter-jib (left of mast)
    ctx.fillStyle = '#e09000';
    ctx.beginPath();
    ctx.moveTo(mx - 12, JIB_Y - 6);
    ctx.lineTo(mx - 90, JIB_Y + 4);
    ctx.lineTo(mx - 90, JIB_Y + 16);
    ctx.lineTo(mx - 12, JIB_Y + 6);
    ctx.closePath(); ctx.fill();
    // Counter-jib strut
    ctx.strokeStyle = '#303848'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx, mt); ctx.lineTo(mx - 90, JIB_Y + 10); ctx.stroke();
    // Counterweight
    ctx.fillStyle = '#485060';
    ctx.fillRect(mx - 100, JIB_Y, 20, 24);

    // Main jib (arm extending right)
    ctx.fillStyle = '#f5a000';
    ctx.beginPath();
    ctx.moveTo(mx - 12, JIB_Y - 6);
    ctx.lineTo(JIB_END + 8, JIB_Y);
    ctx.lineTo(JIB_END + 8, JIB_Y + 12);
    ctx.lineTo(mx - 12, JIB_Y + 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c07800'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 12, JIB_Y - 6);
    ctx.lineTo(JIB_END + 8, JIB_Y);
    ctx.lineTo(JIB_END + 8, JIB_Y + 12);
    ctx.lineTo(mx - 12, JIB_Y + 6);
    ctx.closePath(); ctx.stroke();

    // Tension cable from mast top to jib
    ctx.strokeStyle = '#404858'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx, mt); ctx.lineTo(JIB_END * 0.65 + mx * 0.35, JIB_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, mt); ctx.lineTo(mx - 60, JIB_Y + 10); ctx.stroke();

    // Mast top cap
    ctx.fillStyle = '#e09000';
    ctx.beginPath(); ctx.arc(mx, mt, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff4000';
    ctx.beginPath(); ctx.arc(mx, mt - 12, 5, 0, Math.PI * 2); ctx.fill(); // beacon

    // Jib tip pulley
    ctx.fillStyle = '#303848';
    ctx.beginPath(); ctx.arc(HOOK_X, JIB_Y + 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#50607a';
    ctx.beginPath(); ctx.arc(HOOK_X, JIB_Y + 6, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // ── Cable and hanging dino ────────────────────────────────────────────────

  function _drawCableAndDino(ctx) {
    if (_phase !== 'AIMING' && _phase !== 'NEXT_DINO') return;

    const dinoX = _dragPos.x;
    const dinoY = _dragPos.y;

    // Cable
    ctx.save();
    ctx.strokeStyle = '#2a3848';
    ctx.lineWidth = _isDragging ? 3.5 : 2.5;
    ctx.setLineDash(_isDragging ? [] : []);
    ctx.beginPath();
    ctx.moveTo(HOOK_X, HOOK_Y);

    if (_isDragging) {
      // Rubber band — straight line to dragged position
      ctx.strokeStyle = '#ff8020';
      ctx.lineTo(dinoX, dinoY);
    } else {
      // Natural cable droop (catenary approximation)
      const midX = (HOOK_X + dinoX) / 2;
      const midY = (HOOK_Y + dinoY) / 2 + Math.abs(dinoX - HOOK_X) * 0.05 + 10;
      ctx.quadraticCurveTo(midX, midY, dinoX, dinoY);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Dino hanging at rest
    const dino = window.getDinoById(_curDinoId);
    ctx.save();
    ctx.translate(dinoX, dinoY);

    // Hook/cradle
    if (!_isDragging) {
      ctx.fillStyle = '#485060';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#303848'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    }

    if (window.DinoImages && dino && window.DinoImages[dino.id]) {
      const img = window.DinoImages[dino.id];
      const sz = DINO_RADIUS * 3.4;
      ctx.drawImage(img, -sz * 0.5, -sz * 0.4, sz, sz);
    } else if (dino) {
      const wobble = _isDragging ? 0 : Math.sin(_t * 3) * 0.08;
      ctx.rotate(wobble);
      _drawCartoonHero(ctx, dino, DINO_RADIUS, _t);
    }

    ctx.restore();
  }

  // ── Trajectory preview ────────────────────────────────────────────────────

  function _drawTrajectory(ctx) {
    const vx = (HOOK_X - _dragPos.x) * LAUNCH_K;
    const vy = (HOOK_Y - _dragPos.y) * LAUNCH_K;
    let px = _dragPos.x, py = _dragPos.y;
    let pvx = vx, pvy = vy;
    const grav = 0.28; // approximation per preview step

    ctx.save();
    for (let i = 0; i < 72; i++) {
      px  += pvx; py  += pvy;
      pvy += grav;
      if (py > GROUND_Y || px > DW || px < 0) break;
      const alpha = (1 - i / 72) * 0.72;
      const sz = 4.5 - i * 0.04;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 3 === 0 ? '#fff' : 'rgba(255,200,80,.8)';
      ctx.beginPath(); ctx.arc(px, py, Math.max(sz, 2), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  function _drawHUD(ctx) {
    ctx.save();

    // Level name top-centre
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = "700 17px 'Nunito', sans-serif";
    ctx.fillText('Niveau ' + G.state.currentLevel + ' — ' + (_level ? _level.name : ''), DW / 2, 26);

    // Score top-right
    ctx.textAlign = 'right';
    shadow(ctx, 'rgba(0,0,0,.5)', 8);
    ctx.fillStyle = '#f5c842';
    ctx.font = "800 24px 'Baloo 2', cursive";
    ctx.fillText(_score.toLocaleString('nl'), DW - 20, 30);
    noShadow(ctx);

    // Dino queue — top-left
    const allDinos = [_curDinoId, ..._dinoQueue];
    allDinos.forEach(function (id, i) {
      const d = window.getDinoById(id);
      if (!d) return;
      const qx = 24 + i * 44;
      const qy = 20;
      const qr = i === 0 ? 18 : 13;
      const alpha = i === 0 ? 1 : 0.55;
      ctx.globalAlpha = alpha;

      if (window.DinoImages && window.DinoImages[id]) {
        const img = window.DinoImages[id];
        const sz = qr * 2.8;
        ctx.drawImage(img, qx - sz * 0.45, qy - sz * 0.45, sz, sz);
      } else {
        ctx.fillStyle = d.colors.main;
        ctx.beginPath(); ctx.arc(qx, qy, qr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `${qr * 1.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.emoji || '🦕', qx, qy);
        ctx.textBaseline = 'alphabetic';
      }

      // Highlight active
      if (i === 0) {
        ctx.globalAlpha = 0.6 + Math.sin(_t * 4) * 0.2;
        ctx.strokeStyle = '#f5c842';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(qx, qy, qr + 3, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Phase hints
    if (_phase === 'AIMING') {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + Math.sin(_t * 2) * 0.2) + ')';
      ctx.font = "600 14px 'Nunito', sans-serif";
      ctx.fillText('← Trek en laat los om te gooien  •  Tik tijdens vlucht voor kracht →', DW / 2, DH - 14);
    } else if (_phase === 'FLYING') {
      ctx.textAlign = 'center';
      ctx.fillStyle = _powerUsed ? 'rgba(200,255,200,.55)' : 'rgba(255,220,80,' + (0.6 + Math.sin(_t * 5) * 0.3) + ')';
      ctx.font = "700 15px 'Nunito', sans-serif";
      ctx.fillText(_powerUsed ? '✓ Kracht gebruikt!' : '⚡ Tik voor kracht!', DW / 2, DH - 14);
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── Colour helper ─────────────────────────────────────────────────────────

  function _lighten(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const to255 = function (v) { return Math.min(255, Math.round(v + 255 * amount)); };
    return 'rgb(' + to255(r) + ',' + to255(g) + ',' + to255(b) + ')';
  }

  // ── Register screen ───────────────────────────────────────────────────────

  G.registerScreen('gameplay', {
    enter:  _enter,
    exit:   _exit,
    update: _update,
    render: _render,
  });

}(window.Game, window.Matter));
