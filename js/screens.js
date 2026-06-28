/**
 * screens.js — Dino Gooiers
 *
 * HTML screen implementations for all non-gameplay screens.
 * Injects markup into #screen-container and manages tap/click handlers.
 *
 * Exposes:  window.Screens
 * Also registers minimal canvas hooks with Game.registerScreen() so the
 * engine's fallback placeholder text never shows through.
 *
 * Dependencies (load order in index.html): engine.js → dinos.js → levels.js → screens.js
 */

(function (G) {
  'use strict';

  // ── One-time CSS injection ──────────────────────────────────────────────────

  (function () {
    if (document.getElementById('sc-styles')) return;
    var el = document.createElement('style');
    el.id = 'sc-styles';
    el.textContent =
      '@keyframes sc-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}' +
      '@keyframes sc-blink{0%,45%{opacity:1}50%,95%{opacity:0}100%{opacity:1}}' +
      '@keyframes sc-pop{0%{transform:scale(0) rotate(-200deg);opacity:0}' +
        '65%{transform:scale(1.3) rotate(12deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}' +
      '@keyframes sc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}' +
      '@keyframes sc-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}' +
        '40%{transform:translateX(10px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}' +
      '@keyframes sc-flash{0%,100%{opacity:0}50%{opacity:1}}' +
      '@keyframes sc-hazard{0%{background-position:0 0}100%{background-position:56px 0}}' +
      '@keyframes sc-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.85}}' +
      '@keyframes sc-coin{0%{transform:translate(0,0) scale(1);opacity:1}' +
        '100%{transform:translate(var(--cdx),var(--cdy)) scale(0.2);opacity:0}}' +
      '@keyframes sc-smoke{0%{transform:translateY(0) scale(.8);opacity:.55}' +
        '100%{transform:translateY(-44px) scale(1.5);opacity:0}}' +
      '@keyframes sc-lightning{0%,80%,100%{opacity:0}82%,96%{opacity:.9}90%{opacity:.2}}' +
      '@keyframes sc-hpslam{from{width:0}to{width:100%}}' +
      '@keyframes sc-fadeup{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes sc-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
      '.sc-full{position:absolute;inset:0;overflow:hidden}' +
      '.sc-btn{display:inline-block;border:none;cursor:pointer;font-family:"Baloo 2",cursive;' +
        'font-weight:700;border-radius:14px;text-align:center;letter-spacing:.03em;' +
        'transition:transform .12s,filter .12s;user-select:none;-webkit-tap-highlight-color:transparent}' +
      '.sc-btn:hover{transform:scale(1.05);filter:brightness(1.12)}' +
      '.sc-btn:active{transform:scale(.96)}' +
      '.sc-btn-gold{background:linear-gradient(180deg,#ffd23f 0%,#f5a623 100%);color:#1a0e2e;' +
        'box-shadow:0 4px 0 #8b6000,0 6px 22px rgba(255,180,0,.45);border:2px solid rgba(255,255,255,.35)}' +
      '.sc-btn-purple{background:linear-gradient(180deg,#5a3a9e 0%,#2d1b5e 100%);color:#fff;' +
        'box-shadow:0 3px 0 #110828,0 5px 16px rgba(80,30,180,.45);border:1.5px solid rgba(180,140,255,.25)}' +
      '.sc-btn-red{background:linear-gradient(180deg,#e25050 0%,#991818 100%);color:#fff;' +
        'box-shadow:0 3px 0 #5a0808,0 5px 14px rgba(200,0,0,.4);border:1.5px solid rgba(255,140,140,.28)}' +
      '.sc-btn-green{background:linear-gradient(180deg,#56c754 0%,#2e8b2c 100%);color:#fff;' +
        'box-shadow:0 3px 0 #0a5008,0 5px 14px rgba(0,180,0,.4);border:1.5px solid rgba(140,255,140,.28)}' +
      '.sc-btn-blue{background:linear-gradient(180deg,#4a90e2 0%,#1a4899 100%);color:#fff;' +
        'box-shadow:0 3px 0 #0a1860,0 5px 14px rgba(20,60,200,.4);border:1.5px solid rgba(140,180,255,.28)}' +
      '.sc-star-slot{display:inline-block;font-size:2.8rem;opacity:.2;filter:grayscale(1)}' +
      '.sc-star-slot.lit{opacity:1;filter:none;animation:sc-pop .45s cubic-bezier(.34,1.56,.64,1) forwards}';
    document.head.appendChild(el);
  }());

  // ── Container helpers ───────────────────────────────────────────────────────

  var _sc = null;

  function sc() { return _sc || (_sc = document.getElementById('screen-container')); }

  function setHTML(html) {
    var el = sc();
    el.innerHTML = html;
    el.style.display = 'block';
    el.style.pointerEvents = 'auto';
  }

  function clearScreen() {
    var el = sc();
    el.innerHTML = '';
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  }

  function $(id) { return document.getElementById(id); }

  // ── SVG assets ──────────────────────────────────────────────────────────────

  var SVG_STEGO = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 170" width="220" height="170" aria-hidden="true">',
    '<polygon points="60,60 68,34 76,60" fill="#1b5e20"/>',
    '<polygon points="76,54 87,26 98,54" fill="#1b5e20"/>',
    '<polygon points="97,58 109,28 121,58" fill="#1b5e20"/>',
    '<polygon points="120,62 130,36 140,62" fill="#1b5e20"/>',
    '<ellipse cx="93" cy="102" rx="54" ry="40" fill="#4caf50"/>',
    '<ellipse cx="93" cy="116" rx="40" ry="26" fill="#c8e6c9"/>',
    '<ellipse cx="66" cy="134" rx="13" ry="19" fill="#388e3c"/>',
    '<ellipse cx="50" cy="150" rx="18" ry="8" fill="#2e7d32"/>',
    '<ellipse cx="118" cy="132" rx="12" ry="17" fill="#388e3c"/>',
    '<ellipse cx="133" cy="148" rx="16" ry="7" fill="#2e7d32"/>',
    '<ellipse cx="146" cy="84" rx="20" ry="27" fill="#4caf50"/>',
    '<ellipse cx="162" cy="62" rx="25" ry="21" fill="#4caf50"/>',
    '<circle cx="171" cy="54" r="7" fill="#c8e6c9"/>',
    '<circle cx="173" cy="54" r="4" fill="#1a2e1a"/>',
    '<circle cx="183" cy="65" r="3" fill="#2e7d32"/>',
    '<path d="M166 72 Q177 79 188 72" stroke="#2e7d32" stroke-width="2" fill="none"/>',
    '<path d="M37 106 Q8 92 5 112 Q9 130 34 120" fill="#4caf50"/>',
    '</svg>',
  ].join('');

  // Construction crane silhouette
  var SVG_CRANE = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 200" width="90" height="200" aria-hidden="true" style="display:block">',
    // Tower
    '<rect x="36" y="80" width="18" height="118" fill="#37474f"/>',
    '<line x1="36" y1="82" x2="54" y2="122" stroke="#546e7a" stroke-width="1.5"/>',
    '<line x1="54" y1="82" x2="36" y2="122" stroke="#546e7a" stroke-width="1.5"/>',
    '<line x1="36" y1="122" x2="54" y2="162" stroke="#546e7a" stroke-width="1.5"/>',
    '<line x1="54" y1="122" x2="36" y2="162" stroke="#546e7a" stroke-width="1.5"/>',
    // Jib
    '<rect x="8" y="66" width="74" height="10" rx="2" fill="#455a64"/>',
    // Counter-jib
    '<rect x="2" y="68" width="26" height="6" fill="#546e7a"/>',
    '<rect x="2" y="62" width="18" height="14" rx="2" fill="#78909c"/>',
    // Cab
    '<rect x="32" y="54" width="26" height="18" rx="3" fill="#455a64"/>',
    '<rect x="37" y="57" width="10" height="9" rx="2" fill="#b0bec5"/>',
    // Rope + hook
    '<line x1="80" y1="76" x2="80" y2="140" stroke="#90a4ae" stroke-width="1.5"/>',
    '<path d="M77 140 Q80 150 83 140" stroke="#90a4ae" stroke-width="1.5" fill="none"/>',
    // Warning stripe on jib tip
    '<rect x="74" y="66" width="8" height="10" fill="#ffd23f" opacity=".7"/>',
    '</svg>',
  ].join('');

  // Sad T-Rex for game over
  var SVG_SAD_REX = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230" width="180" height="207" aria-hidden="true">',
    '<rect x="72" y="160" width="18" height="42" rx="6" fill="#b71c1c"/>',
    '<rect x="98" y="162" width="18" height="40" rx="6" fill="#b71c1c"/>',
    '<ellipse cx="81" cy="200" rx="17" ry="8" fill="#b71c1c"/>',
    '<ellipse cx="107" cy="200" rx="17" ry="8" fill="#b71c1c"/>',
    '<ellipse cx="103" cy="132" rx="42" ry="37" fill="#e53935" transform="rotate(8,103,132)"/>',
    '<ellipse cx="110" cy="144" rx="28" ry="23" fill="#ffcdd2" transform="rotate(8,110,144)"/>',
    '<ellipse cx="64" cy="138" rx="9" ry="20" fill="#e53935" transform="rotate(40,64,138)"/>',
    '<ellipse cx="146" cy="142" rx="9" ry="20" fill="#e53935" transform="rotate(-35,146,142)"/>',
    '<ellipse cx="110" cy="96" rx="18" ry="24" fill="#e53935" transform="rotate(6,110,96)"/>',
    '<ellipse cx="122" cy="70" rx="31" ry="25" fill="#e53935" transform="rotate(14,122,70)"/>',
    '<circle cx="137" cy="60" r="9" fill="#ffcdd2"/>',
    '<circle cx="139" cy="62" r="5" fill="#1a0a0a"/>',
    '<path d="M129 52 Q139 47 146 53" stroke="#b71c1c" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M124 83 Q137 77 148 83" stroke="#b71c1c" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    '<ellipse cx="131" cy="68" rx="3" ry="4.5" fill="#64b5f6" opacity=".85"/>',
    '<path d="M60 140 Q30 130 26 152 Q32 174 58 162" fill="#e53935"/>',
    '</svg>',
  ].join('');

  // ── World / level data ──────────────────────────────────────────────────────

  var WORLDS = [
    { num: 1, name: 'Jungle Ruïnes', bg: 'linear-gradient(160deg,#0d2010 0%,#1a3a18 50%,#2a5020 100%)',
      accent: '#56c754', nodeBg: '#2e7d32', bossBg: '#b71c1c', textColor: '#a5d6a7' },
    { num: 2, name: 'Stenen Stad',   bg: 'linear-gradient(160deg,#060e20 0%,#0d1b38 50%,#1a2850 100%)',
      accent: '#4a90e2', nodeBg: '#1565c0', bossBg: '#b71c1c', textColor: '#90caf9' },
    { num: 3, name: 'Stalen Burcht', bg: 'linear-gradient(160deg,#060410 0%,#100818 50%,#201828 100%)',
      accent: '#ba68c8', nodeBg: '#7b1fa2', bossBg: '#b71c1c', textColor: '#ce93d8' },
  ];

  var DINO_TIPS = [
    'Gooi Rocky recht op een houten toren voor maximale schade!',
    'Gebruik Dash om meerdere vijanden tegelijk neer te halen.',
    'Sky duikt van bovenaf — perfect voor vijanden op hoge platforms.',
    'TNT-blokken activeren bij de kleinste aanraking — gebruik dit slim!',
    'Glazen blokken breken makkelijk maar kunnen vijanden beschermen.',
    'Stalen blokken zijn het hardst — laat ze omvallen in plaats van ze te rammen.',
    'Kijk goed naar de constructie vóór je gooit. Soms is één dino genoeg.',
    'Chomp bijt dwars door staal — zet hem in bij de moeilijkste torens.',
    'Bubba explodeert bij inslag — gooi hem op de basis voor kettingreacties!',
    'Vijanden die onder vallende blokken worden geraakt leveren bonuspunten op.',
    'Trix boort met drie hoorns — ideaal voor horizontale constructies.',
    'Stomp zijn schokgolf raakt alles op de grond. Perfect voor bruggen!',
    'Een bonus-dino die overblijft levert extra punten op. Zuinig schieten loont!',
    'Brons verbrijzelt met zijn gewicht alles onder hem bij de landing.',
  ];

  // ── Loading screen state ────────────────────────────────────────────────────

  var _loadingVisible = false;
  var _tipTimer = null;
  var _tipIdx = 0;

  function _nextTip() {
    _tipIdx = (_tipIdx + 1) % DINO_TIPS.length;
    var el = $('sc-tip-text');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function () {
      if ($('sc-tip-text')) {
        $('sc-tip-text').textContent = DINO_TIPS[_tipIdx];
        $('sc-tip-text').style.opacity = '1';
      }
    }, 350);
  }

  // ── Stars SVG helper (small, for node decoration) ──────────────────────────

  function starsHTML(count, size) {
    size = size || 14;
    var h = '';
    for (var i = 0; i < 3; i++) {
      var color = i < count ? '#ffd23f' : 'rgba(255,255,255,.18)';
      var shadow = i < count ? 'drop-shadow(0 0 3px rgba(255,200,0,.8))' : 'none';
      h += '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 20 20" style="filter:' + shadow + ';display:inline-block;vertical-align:middle">' +
        '<polygon points="10,2 12.4,7.8 18.5,8.2 14,12.2 15.4,18.2 10,15 4.6,18.2 6,12.2 1.5,8.2 7.6,7.8" fill="' + color + '"/>' +
        '</svg>';
    }
    return h;
  }

  // ── SPLASH SCREEN ───────────────────────────────────────────────────────────

  function showSplash() {
    G.showScreen('splash');

    // Generate twinkling star dots
    var stars = '';
    for (var i = 0; i < 60; i++) {
      var sx = Math.round((i * 1317 + 47) % 95);
      var sy = Math.round((i * 787 + 23) % 60);
      var sr = (0.8 + (i % 3) * 0.6).toFixed(1);
      var sd = (i * 0.37 % 2.5).toFixed(2);
      stars += '<div style="position:absolute;left:' + sx + '%;top:' + sy + '%;width:' + sr +
        'px;height:' + sr + 'px;border-radius:50%;background:#fff;animation:sc-flash ' +
        (1.5 + i % 2) + 's ' + sd + 's ease-in-out infinite;opacity:' + (0.3 + (i % 4) * 0.15) + '"></div>';
    }

    setHTML(
      '<div class="sc-full" id="sc-splash" style="background:linear-gradient(160deg,#1a0e2e 0%,#2d1b4e 55%,#1a0e2e 100%);' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#fff;">' +

        // Stars background
        '<div style="position:absolute;inset:0;overflow:hidden">' + stars + '</div>' +

        // Crane silhouette — bottom-right corner
        '<div style="position:absolute;bottom:0;right:24px;opacity:.55">' + SVG_CRANE + '</div>' +

        // Logo block
        '<div style="position:relative;z-index:1;text-align:center;margin-bottom:10px">' +
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(2.8rem,8vw,5.8rem);color:#ffd23f;line-height:1.05;' +
            'text-shadow:0 0 40px rgba(255,210,63,.75),0 4px 0 #8b6000,0 6px 22px rgba(0,0,0,.8)">' +
            'DINO<br>GOOIERS</div>' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.95rem,2.8vw,1.4rem);' +
            'color:rgba(255,255,255,.65);margin-top:6px;letter-spacing:.06em">Gooi ze omver!</div>' +
        '</div>' +

        // Bouncing hero dino
        '<div style="position:relative;z-index:1;animation:sc-bounce 1.6s ease-in-out infinite;margin:6px 0 4px">' +
          (function () {
            var src = (window.DinoImages && window.DinoImages['rocky'])
              ? window.DinoImages['rocky'].src
              : 'assets/heroes/rocky.png';
            return '<img src="' + src + '" width="200" height="200" alt="Rocky" ' +
              'style="display:block;object-fit:contain;filter:drop-shadow(0 0 30px rgba(76,175,80,.65))" ' +
              'onerror="this.onerror=null;this.style.display=\'none\'">';
          }()) +
        '</div>' +

        // Tap prompt
        '<div style="position:relative;z-index:1;font-family:\'Baloo 2\',cursive;font-size:clamp(.9rem,2.5vw,1.25rem);' +
          'color:#ffd23f;letter-spacing:.12em;animation:sc-blink 1.4s ease-in-out infinite;margin-top:18px">' +
          'TIK OM TE SPELEN' +
        '</div>' +

        // Version
        '<div style="position:absolute;bottom:12px;right:18px;font-family:\'Nunito\',sans-serif;' +
          'font-size:11px;color:rgba(255,255,255,.28)">v1.0</div>' +

      '</div>'
    );

    // Single-tap handler — advance to main menu
    $('sc-splash').addEventListener('pointerdown', function handler() {
      $('sc-splash').removeEventListener('pointerdown', handler);
      showMenu();
    }, { once: true });
  }

  // ── LOADING SCREEN ──────────────────────────────────────────────────────────

  function showLoading(progress) {
    progress = Math.max(0, Math.min(100, progress || 0));

    if (!_loadingVisible) {
      _loadingVisible = true;
      _tipIdx = Math.floor(Math.random() * DINO_TIPS.length);
      G.showScreen('loading');

      setHTML(
        '<div class="sc-full" style="background:#1a0e2e;display:flex;flex-direction:column;' +
          'align-items:center;justify-content:center;color:#fff;gap:22px">' +

          // Logo
          '<div style="text-align:center">' +
            '<div style="font-family:\'Bungee\',cursive;font-size:clamp(2rem,6vw,4rem);color:#ffd23f;' +
              'text-shadow:0 0 28px rgba(255,210,63,.65),0 3px 0 #8b6000;line-height:1.1">DINO GOOIERS</div>' +
            '<div style="font-family:\'Baloo 2\',cursive;font-size:clamp(.7rem,2vw,.95rem);color:#f5a623;' +
              'letter-spacing:.12em;margin-top:2px">BOUW ZE PLAT!</div>' +
          '</div>' +

          // Progress bar track
          '<div style="width:min(380px,72vw);background:rgba(255,255,255,.1);border-radius:8px;' +
            'overflow:hidden;height:18px;border:1px solid rgba(255,255,255,.1)">' +
            '<div id="sc-load-bar" style="height:100%;width:' + progress + '%;border-radius:8px;' +
              'background:repeating-linear-gradient(90deg,#ffd23f 0px,#ffd23f 20px,#f5a623 20px,#f5a623 28px,' +
              '#ffd23f 28px,#ffd23f 48px,#0a0000 48px,#0a0000 56px);' +
              'background-size:56px 100%;animation:sc-hazard .6s linear infinite;' +
              'transition:width .3s ease"></div>' +
          '</div>' +

          // Percentage + label
          '<div style="display:flex;gap:16px;align-items:center">' +
            '<div style="font-family:\'Baloo 2\',cursive;font-size:clamp(.8rem,2.2vw,1rem);' +
              'color:rgba(255,255,255,.45);letter-spacing:.08em;text-transform:uppercase">Laden...</div>' +
            '<div id="sc-load-pct" style="font-family:\'Bungee\',cursive;font-size:1.1rem;color:#ffd23f">' +
              Math.round(progress) + '%</div>' +
          '</div>' +

          // Dino tip
          '<div style="max-width:min(400px,78vw);text-align:center;border-top:1px solid rgba(255,255,255,.1);' +
            'padding-top:16px">' +
            '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.65rem,1.8vw,.85rem);' +
              'color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">' +
              'Dino Tip</div>' +
            '<div id="sc-tip-text" style="font-family:\'Nunito\',sans-serif;font-size:clamp(.8rem,2.2vw,1rem);' +
              'color:rgba(255,220,160,.8);transition:opacity .35s;font-weight:700">' +
              DINO_TIPS[_tipIdx] + '</div>' +
          '</div>' +

        '</div>'
      );

      // Cycle tips every 3 seconds
      _tipTimer = setInterval(_nextTip, 3000);
    }

    // Update bar + counter in place
    var bar = $('sc-load-bar');
    var pct = $('sc-load-pct');
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = Math.round(progress) + '%';

    // Transition when done
    if (progress >= 100) {
      clearInterval(_tipTimer);
      _tipTimer = null;
      setTimeout(function () {
        _loadingVisible = false;
        showMenu();
      }, 600);
    }
  }

  // ── MENU SCREEN ─────────────────────────────────────────────────────────────

  function showMenu() {
    G.showScreen('menu');

    var coins = (G.state && G.state.coins) || 0;

    // SVG dusk sky landscape with hills + crane
    var skyBg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice"',
      ' style="position:absolute;bottom:0;left:0;width:100%;height:60%">',
      '<defs><linearGradient id="sky-g" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#1a0e2e"/>',
      '<stop offset="50%" stop-color="#3d1654"/>',
      '<stop offset="100%" stop-color="#c45820"/>',
      '</linearGradient>',
      '<linearGradient id="sun-g" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#ffe066"/>',
      '<stop offset="100%" stop-color="#f5a623"/>',
      '</linearGradient></defs>',
      // Sky fill
      '<rect width="1200" height="320" fill="url(#sky-g)"/>',
      // Sun / glow disk
      '<ellipse cx="900" cy="260" rx="80" ry="80" fill="url(#sun-g)" opacity=".65"/>',
      '<ellipse cx="900" cy="260" rx="130" ry="130" fill="#f5a623" opacity=".18"/>',
      // Far hills
      '<path d="M0 320 L0 220 Q90 160 180 200 Q270 240 360 170 Q450 100 540 160',
      ' Q630 220 720 140 Q810 60 900 130 Q990 200 1080 150 Q1140 110 1200 170 L1200 320 Z"',
      ' fill="#3d1a00" opacity=".8"/>',
      // Near hills
      '<path d="M0 320 L0 270 Q100 230 200 260 Q300 290 400 240 Q500 190 600 250',
      ' Q700 310 800 260 Q900 210 1000 260 Q1100 310 1200 270 L1200 320 Z"',
      ' fill="#2a1200"/>',
      '</svg>',
    ].join('');

    // Smoke puffs from crane
    var smokePuffs = '';
    for (var i = 0; i < 3; i++) {
      smokePuffs += '<div style="position:absolute;bottom:80px;right:82px;width:' + (10 + i * 3) +
        'px;height:' + (10 + i * 3) + 'px;border-radius:50%;background:rgba(160,140,120,.45);' +
        'animation:sc-smoke 2.6s ease-out ' + (i * 0.8) + 's infinite"></div>';
    }

    // Rocky hero dino for menu — use preloaded image (PNG or SVG fallback)
    var rockyImg = '';
    var _rockyPreload = window.DinoImages && window.DinoImages['rocky'];
    if (_rockyPreload) {
      rockyImg = '<img src="' + _rockyPreload.src + '" width="160" height="160" alt="Rocky" ' +
        'style="animation:sc-float 2.2s ease-in-out infinite;filter:drop-shadow(0 8px 24px rgba(0,200,0,.5))">';
    } else if (window.DINO_ROSTER) {
      var _rocky = window.DINO_ROSTER.find(function (d) { return d.id === 'rocky'; });
      if (_rocky) {
        rockyImg = '<img src="assets/heroes/rocky.png" width="160" height="160" alt="Rocky" ' +
          'style="animation:sc-float 2.2s ease-in-out infinite;filter:drop-shadow(0 8px 24px rgba(0,200,0,.5))" ' +
          'onerror="this.onerror=null;this.src=\'' + _rocky.svgDataURI.replace(/'/g, "\\'") + '\'">';
      }
    }

    setHTML(
      '<div class="sc-full" style="background:#1a0e2e;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:flex-start;color:#fff;overflow:hidden">' +

        // Sky background SVG
        skyBg +

        // Crane (right side with smoke)
        '<div style="position:absolute;bottom:0;right:28px">' +
          SVG_CRANE + smokePuffs +
        '</div>' +

        // Logo
        '<div style="position:relative;z-index:1;text-align:center;margin-top:clamp(18px,5vh,40px)">' +
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(2.4rem,7vw,5rem);color:#ffd23f;' +
            'line-height:1.05;text-shadow:0 0 44px rgba(255,210,63,.7),0 4px 0 #8b6000,0 6px 24px rgba(0,0,0,.7)">' +
            'DINO GOOIERS</div>' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.85rem,2.4vw,1.2rem);' +
            'color:rgba(255,255,255,.55);letter-spacing:.06em;margin-top:2px">Gooi ze omver!</div>' +
        '</div>' +

        // Hero Rocky
        '<div style="position:relative;z-index:1;margin:clamp(8px,2vh,20px) 0 clamp(4px,1.5vh,14px)">' +
          (rockyImg || '') +
        '</div>' +

        // Buttons
        '<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;' +
          'gap:clamp(8px,1.8vh,16px);width:min(320px,82vw)">' +
          '<button id="btn-spelen" class="sc-btn sc-btn-gold" style="width:100%;font-size:clamp(1.1rem,3.2vw,1.55rem);padding:clamp(12px,2.2vh,18px) 32px">' +
            '▶  SPELEN' +
          '</button>' +
          '<button id="btn-worldmap" class="sc-btn sc-btn-purple" style="width:100%;font-size:clamp(.9rem,2.5vw,1.15rem);padding:clamp(10px,1.8vh,14px) 24px">' +
            '🗺  WERELD KAART' +
          '</button>' +
          '<button id="btn-roster" class="sc-btn sc-btn-purple" style="width:100%;font-size:clamp(.9rem,2.5vw,1.15rem);padding:clamp(10px,1.8vh,14px) 24px">' +
            '🦕  DINO ROSTER' +
          '</button>' +
          '<button id="btn-shop" class="sc-btn sc-btn-purple" style="width:100%;font-size:clamp(.9rem,2.5vw,1.15rem);padding:clamp(10px,1.8vh,14px) 24px">' +
            '🛒  WINKEL' +
          '</button>' +
        '</div>' +

        // Bottom bar — coins + settings
        '<div style="position:absolute;bottom:16px;left:0;right:0;display:flex;' +
          'justify-content:space-between;align-items:center;padding:0 20px;z-index:1">' +
          // Coins
          '<div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.45);' +
            'border-radius:20px;padding:6px 14px;border:1px solid rgba(255,210,0,.3)">' +
            '<span style="font-size:1.3rem">🪙</span>' +
            '<span style="font-family:\'Baloo 2\',cursive;font-size:1rem;font-weight:700;color:#ffd23f">' +
              coins.toLocaleString('nl') + '</span>' +
          '</div>' +
          // Settings gear
          '<button id="btn-settings" class="sc-btn sc-btn-purple" style="font-size:1.3rem;padding:8px 12px;border-radius:50%;width:44px;height:44px;line-height:1;display:flex;align-items:center;justify-content:center">' +
            '⚙️' +
          '</button>' +
        '</div>' +

      '</div>'
    );

    // Button handlers
    $('btn-spelen').addEventListener('click', function () {
      var worldIdx = (G.state && G.state.currentWorld) ? G.state.currentWorld - 1 : 0;
      showWorldMap(worldIdx);
    });
    $('btn-worldmap').addEventListener('click', function () {
      var worldIdx = (G.state && G.state.currentWorld) ? G.state.currentWorld - 1 : 0;
      showWorldMap(worldIdx);
    });
    $('btn-roster').addEventListener('click', function () {
      showRoster();
    });
    $('btn-shop').addEventListener('click', function () {
      showShop();
    });
    $('btn-settings').addEventListener('click', function () {
      showSettings();
    });
  }

  // ── WORLD MAP SCREEN ─────────────────────────────────────────────────────────

  function showWorldMap(worldIndex) {
    worldIndex = Math.max(0, Math.min(2, worldIndex || 0));
    G.showScreen('worldmap');

    var w = WORLDS[worldIndex];
    var maxLevel = (G.state && G.state.maxLevel) || 1;
    var starData = (G.state && G.state.stars) || [];
    var firstLevel = worldIndex * 10 + 1;  // 1, 11, 21
    var levels = window.LEVELS ? window.LEVELS.filter(function (l) { return l.world === worldIndex + 1; }) : [];

    // Node layout: 5 cols × 2 rows, serpentine (row 0 left→right, row 1 right→left)
    // Position is in percentage of the map container
    function nodePos(localIdx) {
      var row = localIdx < 5 ? 0 : 1;
      var col = row === 0 ? localIdx : 9 - localIdx;  // col 0-4
      var x = 10 + col * 20;   // 10%, 30%, 50%, 70%, 90%
      var y = row === 0 ? 35 : 72;
      return { x: x, y: y };
    }

    // Build SVG path connecting nodes (rope/chain)
    var pathD = '';
    for (var i = 0; i < 10; i++) {
      var p = nodePos(i);
      pathD += (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y + ' ';
    }

    // Build node HTML
    var nodesHTML = '';
    for (var ni = 0; ni < 10; ni++) {
      var levelId = firstLevel + ni;
      var pos = nodePos(ni);
      var levelData = levels[ni];
      var isBoss = levelData && levelData.isBoss;
      var isLocked = levelId > maxLevel;
      var stars = starData[levelId - 1] || 0;

      var nodeBg = isLocked ? 'rgba(30,20,50,.9)'
                 : isBoss   ? 'linear-gradient(135deg,#b71c1c,#7f0000)'
                            : 'linear-gradient(135deg,' + w.nodeBg + ',rgba(0,0,0,.3))';
      var borderColor = isBoss ? '#ff5252' : isLocked ? 'rgba(255,255,255,.15)' : w.accent;
      var borderExtra = isBoss ? 'box-shadow:0 0 18px rgba(255,50,50,.7),0 0 6px rgba(255,50,50,.5);' : '';
      var innerContent = isLocked
        ? '<span style="font-size:1.1rem">🔒</span>'
        : isBoss
          ? '<span style="font-size:1.3rem">💀</span>'
          : '<span style="font-family:\'Bungee\',cursive;font-size:1rem;color:#fff">' + levelId + '</span>';
      var nodeSize = isBoss ? 58 : 46;
      var levelName = levelData ? levelData.name : '';

      nodesHTML +=
        '<div class="wm-node" data-level="' + levelId + '" data-locked="' + (isLocked ? '1' : '0') + '" ' +
          'style="position:absolute;left:calc(' + pos.x + '% - ' + (nodeSize / 2) + 'px);' +
          'top:calc(' + pos.y + '% - ' + (nodeSize / 2) + 'px);' +
          'width:' + nodeSize + 'px;height:' + nodeSize + 'px;border-radius:50%;' +
          'background:' + nodeBg + ';' +
          'border:2.5px solid ' + borderColor + ';' + borderExtra +
          'display:flex;align-items:center;justify-content:center;cursor:' + (isLocked ? 'default' : 'pointer') + ';' +
          'transition:transform .15s,filter .15s;z-index:2">' +
          '<div>' +
            innerContent +
            (stars > 0 && !isLocked
              ? '<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap">' +
                starsHTML(stars, 11) + '</div>'
              : '') +
            '<div style="position:absolute;top:' + (nodeSize + 22) + 'px;left:50%;transform:translateX(-50%);' +
              'white-space:nowrap;font-family:\'Nunito\',sans-serif;font-size:10px;color:' + w.textColor + ';' +
              'text-align:center;max-width:80px;line-height:1.2">' + levelName + '</div>' +
          '</div>' +
        '</div>';
    }

    setHTML(
      '<div class="sc-full" style="background:' + w.bg + ';color:#fff;display:flex;flex-direction:column">' +

        // Header
        '<div style="position:relative;z-index:3;display:flex;align-items:center;justify-content:center;' +
          'padding:14px 20px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0">' +
          // Back button
          '<button id="btn-wm-back" class="sc-btn sc-btn-blue" style="position:absolute;left:16px;' +
            'font-size:.85rem;padding:7px 14px;border-radius:10px">← Terug</button>' +
          // Title
          '<div style="text-align:center">' +
            '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1rem,3vw,1.5rem);color:#ffd23f">' +
              'WERELD ' + w.num + '</div>' +
            '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.7rem,1.8vw,.9rem);' +
              'color:' + w.textColor + ';letter-spacing:.06em">' + w.name + '</div>' +
          '</div>' +
          // World nav buttons
          '<div style="position:absolute;right:16px;display:flex;gap:8px">' +
            (worldIndex > 0
              ? '<button id="btn-wm-prev" class="sc-btn sc-btn-purple" style="font-size:.8rem;padding:6px 12px;border-radius:10px">◀</button>'
              : '') +
            (worldIndex < 2
              ? '<button id="btn-wm-next" class="sc-btn sc-btn-purple" style="font-size:.8rem;padding:6px 12px;border-radius:10px">▶</button>'
              : '') +
          '</div>' +
        '</div>' +

        // Map area
        '<div id="wm-map" style="position:relative;flex:1;overflow:hidden">' +

          // SVG connecting path (rope/chain)
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" ' +
            'style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:1">' +
            '<defs>' +
              '<filter id="rope-blur"><feGaussianBlur stdDeviation=".3"/></filter>' +
            '</defs>' +
            // Shadow rope
            '<path d="' + pathD + '" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.2" stroke-linecap="round"' +
              ' stroke-dasharray="4 3" stroke-dashoffset="0" filter="url(#rope-blur)" vector-effect="non-scaling-stroke"/>' +
            // Main rope
            '<path d="' + pathD + '" fill="none" stroke="rgba(200,160,80,.7)" stroke-width="2" stroke-linecap="round"' +
              ' stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>' +
            // Knot dots
            [0,1,2,3,4,5,6,7,8,9].map(function (i) {
              var p = nodePos(i);
              return '<circle cx="' + p.x + '" cy="' + p.y + '" r=".8" fill="rgba(200,160,80,.9)"/>';
            }).join('') +
          '</svg>' +

          // Level nodes
          nodesHTML +

        '</div>' +

      '</div>'
    );

    // Button handlers
    $('btn-wm-back').addEventListener('click', function () { showMenu(); });
    if ($('btn-wm-prev')) {
      $('btn-wm-prev').addEventListener('click', function () { showWorldMap(worldIndex - 1); });
    }
    if ($('btn-wm-next')) {
      $('btn-wm-next').addEventListener('click', function () { showWorldMap(worldIndex + 1); });
    }

    // Level node tap handlers
    var nodes = document.querySelectorAll('.wm-node');
    nodes.forEach(function (node) {
      if (node.dataset.locked === '1') {
        node.addEventListener('click', function () {
          node.style.animation = 'sc-shake .4s ease';
          setTimeout(function () { node.style.animation = ''; }, 420);
        });
        return;
      }
      node.style.setProperty('transition', 'transform .15s,filter .15s');
      node.addEventListener('mouseenter', function () { node.style.transform = 'scale(1.15)'; node.style.filter = 'brightness(1.2)'; });
      node.addEventListener('mouseleave', function () { node.style.transform = ''; node.style.filter = ''; });
      node.addEventListener('click', function () {
        var lvl = parseInt(node.dataset.level, 10);
        G.setState({ currentLevel: lvl });
        var levelData = window.LEVELS && window.LEVELS.find(function (l) { return l.id === lvl; });
        if (levelData && levelData.isBoss) {
          var bossIdx = Math.floor((lvl - 1) / 10);
          showBossIntro(bossIdx);
        } else {
          clearScreen();
          G.showScreen('gameplay');
        }
      });
    });
  }

  // ── LEVEL COMPLETE SCREEN ────────────────────────────────────────────────────

  function showLevelComplete(levelId, stars, score, details) {
    stars = Math.max(0, Math.min(3, stars || 0));
    score = score || 0;
    details = details || {};
    var coinsEarned = details.coinsEarned || Math.round(score / 100);
    var levelData = window.LEVELS && window.LEVELS.find(function (l) { return l.id === levelId; });
    var levelName = levelData ? levelData.name : ('Niveau ' + levelId);
    var isLast = levelId >= 30;

    // Update game state
    G.setState({ lastStars: stars, lastScore: score });
    if (window.Storage) window.Storage.saveLevel(levelId, stars, score);
    G.showScreen('levelcomplete');

    setHTML(
      '<div class="sc-full" style="background:rgba(10,6,18,.88);display:flex;align-items:center;justify-content:center">' +

        // Panel
        '<div style="background:linear-gradient(160deg,#1e1040 0%,#0a0820 100%);border-radius:22px;' +
          'border:2px solid rgba(180,130,255,.28);box-shadow:0 0 50px rgba(80,30,180,.5);' +
          'padding:clamp(22px,4vh,40px) clamp(26px,5vw,52px);text-align:center;' +
          'width:min(560px,90vw);max-height:90vh;overflow-y:auto">' +

          // Title
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1.5rem,5vw,2.5rem);color:#6eff50;' +
            'text-shadow:0 0 22px rgba(100,255,80,.55);margin-bottom:clamp(10px,2vh,20px)">' +
            'NIVEAU VOLTOOID!' +
          '</div>' +

          // Level name badge
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.7rem,2vw,.95rem);' +
            'color:rgba(200,180,255,.6);letter-spacing:.04em;margin-bottom:clamp(12px,2.5vh,22px)">' +
            'Niveau ' + levelId + ' — ' + levelName +
          '</div>' +

          // Stars
          '<div style="display:flex;justify-content:center;gap:clamp(10px,3vw,24px);' +
            'margin-bottom:clamp(14px,3vh,26px)" id="lc-stars">' +
            [0, 1, 2].map(function (i) {
              return '<span class="sc-star-slot" id="lc-star-' + i + '" style="' +
                (i < stars
                  ? 'animation-delay:' + (i * 0.28) + 's;animation-duration:.45s'
                  : '') + '">' +
                '⭐</span>';
            }).join('') +
          '</div>' +

          // Score
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1.3rem,4vw,2rem);color:#ffd23f;' +
            'text-shadow:0 0 18px rgba(255,200,0,.5);margin-bottom:clamp(8px,1.5vh,16px)">' +
            score.toLocaleString('nl') +
          '</div>' +

          // Score breakdown
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.75rem,2vw,.95rem);' +
            'color:rgba(255,255,255,.6);line-height:2;margin-bottom:clamp(12px,2.5vh,22px)">' +
            (details.enemiesDefeated !== undefined
              ? '<div>Vijanden verslagen: <b style="color:#fff">' + details.enemiesDefeated + '</b></div>' : '') +
            (details.blocksDestroyed !== undefined
              ? '<div>Blokken vernietigd: <b style="color:#fff">' + details.blocksDestroyed + '</b></div>' : '') +
            (details.bonusDinos !== undefined
              ? '<div>Bonus dino\'s over: <b style="color:#ffd23f">+' + details.bonusDinos + '</b></div>' : '') +
            (coinsEarned > 0
              ? '<div>Munten verdiend: <b style="color:#ffd23f">+' + coinsEarned + ' 🪙</b></div>' : '') +
          '</div>' +

          // Buttons
          '<div style="display:flex;gap:clamp(10px,2.5vw,20px);justify-content:center;flex-wrap:wrap">' +
            '<button id="btn-lc-retry" class="sc-btn sc-btn-red" style="font-size:clamp(.85rem,2.3vw,1.1rem);padding:12px 22px;min-width:130px">' +
              '↩ OPNIEUW' +
            '</button>' +
            '<button id="btn-lc-next" class="sc-btn sc-btn-green" style="font-size:clamp(.85rem,2.3vw,1.1rem);padding:12px 22px;min-width:130px">' +
              (isLast ? '🗺 KAART' : 'VOLGENDE ▶') +
            '</button>' +
          '</div>' +

        '</div>' +

        // Coin burst animation container
        '<div id="lc-coin-burst" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>' +

      '</div>'
    );

    // Animate stars in one by one
    for (var si = 0; si < stars; si++) {
      (function (idx) {
        setTimeout(function () {
          var el = $('lc-star-' + idx);
          if (el) el.classList.add('lit');
        }, idx * 280 + 200);
      }(si));
    }

    // Coins flying animation
    if (coinsEarned > 0) {
      setTimeout(function () {
        var burst = $('lc-coin-burst');
        if (!burst) return;
        var count = Math.min(coinsEarned, 12);
        for (var ci = 0; ci < count; ci++) {
          (function (idx) {
            setTimeout(function () {
              if (!$('lc-coin-burst')) return;
              var coin = document.createElement('div');
              var sx = 30 + Math.random() * 40;
              var sy = 40 + Math.random() * 20;
              var dx = -(sx - 8) + 'vw';
              var dy = -(sy - 92) + 'vh';
              coin.style.cssText = 'position:absolute;left:' + sx + '%;top:' + sy +
                '%;font-size:1.4rem;--cdx:' + dx + ';--cdy:' + dy +
                ';animation:sc-coin .9s ease-in forwards';
              coin.textContent = '🪙';
              burst.appendChild(coin);
              setTimeout(function () { if (coin.parentNode) coin.parentNode.removeChild(coin); }, 950);
            }, idx * 80);
          }(ci));
        }
      }, stars * 280 + 500);
    }

    // Button handlers
    $('btn-lc-retry').addEventListener('click', function () {
      clearScreen();
      G.showScreen('gameplay');
    });
    $('btn-lc-next').addEventListener('click', function () {
      if (isLast) {
        showWorldMap(Math.min(2, Math.floor((levelId - 1) / 10)));
      } else {
        G.setState({ currentLevel: levelId + 1 });
        var nextData = window.LEVELS && window.LEVELS.find(function (l) { return l.id === levelId + 1; });
        if (nextData && nextData.isBoss) {
          showBossIntro(Math.floor((levelId) / 10));
        } else {
          clearScreen();
          G.showScreen('gameplay');
        }
      }
    });
  }

  // ── GAME OVER SCREEN ─────────────────────────────────────────────────────────

  function showGameOver() {
    var score = (G.state && G.state.lastScore) || 0;
    G.showScreen('gameover');

    setHTML(
      '<div class="sc-full" style="background:rgba(8,2,6,.92);display:flex;align-items:center;justify-content:center">' +

        // Red vignette
        '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,rgba(180,0,0,.4) 100%);pointer-events:none"></div>' +

        // Panel
        '<div style="position:relative;z-index:1;background:linear-gradient(160deg,#180810 0%,#0e0408 100%);' +
          'border-radius:22px;border:2px solid rgba(200,60,60,.38);' +
          'box-shadow:0 0 50px rgba(200,0,0,.45);' +
          'padding:clamp(24px,4vh,42px) clamp(28px,6vw,60px);text-align:center;' +
          'width:min(500px,88vw)">' +

          // Sad T-Rex
          '<div style="display:flex;justify-content:center;margin-bottom:clamp(8px,1.5vh,16px)">' +
            SVG_SAD_REX +
          '</div>' +

          // Title
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(2rem,6vw,3.2rem);color:#ff4040;' +
            'text-shadow:0 0 28px rgba(255,50,50,.7);animation:sc-shake .5s ease .3s;' +
            'margin-bottom:8px">GAME OVER</div>' +

          // Subtitle
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.8rem,2.2vw,1.05rem);' +
            'color:rgba(255,180,180,.7);margin-bottom:clamp(12px,2.5vh,22px)">' +
            'De Tirannen hebben gewonnen... dit keer.' +
          '</div>' +

          // Score
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1.2rem,3.5vw,1.8rem);color:#ffd23f;' +
            'text-shadow:0 0 14px rgba(255,200,0,.5);margin-bottom:clamp(16px,3vh,28px)">' +
            score.toLocaleString('nl') +
          '</div>' +

          // Buttons
          '<div style="display:flex;flex-direction:column;align-items:center;gap:clamp(10px,2vh,16px)">' +
            '<button id="btn-go-retry" class="sc-btn sc-btn-red" style="font-size:clamp(.9rem,2.5vw,1.15rem);padding:13px 32px;width:100%;max-width:280px">' +
              '↩ OPNIEUW PROBEREN' +
            '</button>' +
            '<button id="btn-go-map" class="sc-btn sc-btn-blue" style="font-size:clamp(.8rem,2.2vw,1rem);padding:10px 24px;width:100%;max-width:200px">' +
              '🗺 KAART' +
            '</button>' +
          '</div>' +

        '</div>' +

      '</div>'
    );

    $('btn-go-retry').addEventListener('click', function () {
      clearScreen();
      G.showScreen('gameplay');
    });
    $('btn-go-map').addEventListener('click', function () {
      var worldIdx = G.state ? Math.max(0, Math.floor(((G.state.currentLevel || 1) - 1) / 10)) : 0;
      showWorldMap(worldIdx);
    });
  }

  // ── BOSS INTRO SCREEN ─────────────────────────────────────────────────────────

  function showBossIntro(bossIndex) {
    bossIndex = bossIndex || 0;
    var boss = window.BOSS_DINOS && window.BOSS_DINOS[bossIndex];
    var bossName = boss ? boss.dutchName : 'De Eindbaas';
    var bossHealth = boss ? boss.health : 500;
    var bossImg = boss ? boss.svgDataURI : '';

    // Lightning bolt positions
    var bolts = '';
    for (var bi = 0; bi < 5; bi++) {
      var lx = 10 + bi * 20;
      var ld = (bi * 0.3).toFixed(1);
      var lh = 1.2 + (bi % 3) * 0.4;
      bolts += '<div style="position:absolute;left:' + lx + '%;top:0;width:3px;height:100%;' +
        'background:linear-gradient(180deg,transparent 0%,#fff 40%,#80d8ff 60%,transparent 100%);' +
        'opacity:0;animation:sc-lightning ' + lh + 's ' + ld + 's ease-in-out infinite;' +
        'pointer-events:none;filter:blur(1px)"></div>';
    }

    // Red flicker vignette
    var vignette = '<div style="position:absolute;inset:0;' +
      'background:radial-gradient(ellipse at center,transparent 20%,rgba(150,0,0,.5) 100%);' +
      'animation:sc-flash 1.8s ease-in-out infinite;pointer-events:none"></div>';

    setHTML(
      '<div class="sc-full" style="background:#0a0006;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;color:#fff;overflow:hidden">' +

        // Lightning bolts
        bolts +
        vignette +

        // Boss dino SVG
        (bossImg
          ? '<div style="position:relative;z-index:2;animation:sc-pulse 1.4s ease-in-out infinite;margin-bottom:clamp(8px,2vh,18px)">' +
              '<img src="' + bossImg + '" width="200" height="200" alt="' + bossName + '" ' +
                'style="filter:drop-shadow(0 0 28px rgba(255,30,30,.8)) drop-shadow(0 0 8px rgba(255,80,80,.5))">' +
            '</div>'
          : ''),

        // Boss name
        '<div style="position:relative;z-index:2;text-align:center;margin-bottom:clamp(10px,2.5vh,22px)">' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:clamp(.7rem,2vw,.9rem);' +
            'color:rgba(255,160,160,.7);letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px">' +
            '— GEVAARSNIVEAU KRITIEK —' +
          '</div>' +
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1.4rem,4.5vw,2.6rem);color:#ff4040;' +
            'text-shadow:0 0 30px rgba(255,30,30,.9),0 3px 0 #5a0000;line-height:1.1">' +
            bossName + '</div>' +
        '</div>' +

        // Health bar
        '<div style="position:relative;z-index:2;width:min(380px,76vw)">' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:.8rem;color:rgba(255,200,200,.6);' +
            'text-align:center;margin-bottom:6px;letter-spacing:.06em">LEVENSPUNTEN: ' + bossHealth + '</div>' +
          '<div style="height:16px;background:rgba(80,0,0,.6);border-radius:8px;overflow:hidden;' +
            'border:1.5px solid rgba(255,60,60,.4)">' +
            '<div style="height:100%;background:linear-gradient(90deg,#ff1744,#ff6d00);border-radius:8px;' +
              'animation:sc-hpslam .8s .4s cubic-bezier(.22,1,.36,1) both"></div>' +
          '</div>' +
        '</div>' +

        // "GEVECHT BEGINT!" text — fades in after 1.8s
        '<div style="position:relative;z-index:2;font-family:\'Bungee\',cursive;' +
          'font-size:clamp(1rem,3.5vw,1.8rem);color:#ffd23f;margin-top:clamp(14px,3vh,26px);' +
          'text-shadow:0 0 20px rgba(255,200,0,.7);opacity:0;' +
          'animation:sc-fadeup .5s 1.8s ease forwards;letter-spacing:.08em">' +
          'GEVECHT BEGINT!' +
        '</div>' +

        // Countdown dots
        '<div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;z-index:2;' +
          'font-family:\'Nunito\',sans-serif;font-size:.85rem;color:rgba(255,150,150,.5)">' +
          'Begint over 3 seconden...' +
        '</div>' +

      '</div>'
    );

    // Auto-advance to gameplay after 3 seconds
    var _bossTimeout = setTimeout(function () {
      clearScreen();
      G.showScreen('gameplay');
    }, 3000);

    // Allow tapping to skip
    sc().addEventListener('pointerdown', function skipHandler() {
      sc().removeEventListener('pointerdown', skipHandler);
      clearTimeout(_bossTimeout);
      clearScreen();
      G.showScreen('gameplay');
    }, { once: true });
  }

  // ── ROSTER SCREEN ────────────────────────────────────────────────────────────

  function showRoster() {
    G.showScreen('menu');

    var rarityColors = {
      common:    { bg: '#2e5e2e', border: '#4caf50', label: 'GEWOON',    text: '#a5d6a7' },
      uncommon:  { bg: '#1a3a5e', border: '#4a90e2', label: 'ONGEWOON',  text: '#90caf9' },
      rare:      { bg: '#3a1a5e', border: '#9c27b0', label: 'ZELDZAAM',  text: '#ce93d8' },
      legendary: { bg: '#5e3a00', border: '#f5c842', label: 'LEGENDARISCH', text: '#fff176' },
    };

    var cards = '';
    (window.DINO_ROSTER || []).forEach(function (d) {
      var rc = rarityColors[d.rarity] || rarityColors.common;
      var maxLv = (window.Game && window.Game.state && window.Game.state.maxLevel) || 1;
      var unlocked = maxLv >= d.unlockLevel;
      var imgSrc = (window.DinoImages && window.DinoImages[d.id])
        ? window.DinoImages[d.id].src
        : 'assets/heroes/' + d.id + '.png';

      cards +=
        '<div style="background:linear-gradient(160deg,' + rc.bg + ' 0%,rgba(10,6,20,.9) 100%);' +
          'border:2px solid ' + (unlocked ? rc.border : 'rgba(255,255,255,.12)') + ';' +
          'border-radius:16px;padding:14px 10px;text-align:center;' +
          'opacity:' + (unlocked ? '1' : '0.45') + ';' +
          'box-shadow:0 4px 18px rgba(0,0,0,.5);position:relative">' +

          '<div style="position:absolute;top:8px;right:8px;font-family:\'Nunito\',sans-serif;' +
            'font-size:8px;letter-spacing:.06em;color:' + rc.text + ';font-weight:800;' +
            'background:rgba(0,0,0,.4);border-radius:6px;padding:2px 6px">' +
            rc.label + '</div>' +

          (unlocked ? '' : '<div style="position:absolute;top:8px;left:8px;font-size:.9rem">🔒</div>') +

          '<div style="margin:0 auto 8px;width:80px;height:80px;display:flex;align-items:center;justify-content:center">' +
            '<img src="' + imgSrc + '" width="80" height="80" alt="' + d.name + '" ' +
              'style="object-fit:contain;filter:' + (unlocked ? 'drop-shadow(0 4px 10px rgba(0,0,0,.5))' : 'grayscale(1)') + '">' +
          '</div>' +

          '<div style="font-family:\'Bungee\',cursive;font-size:.85rem;color:' + (unlocked ? '#ffd23f' : '#888') + ';margin-bottom:4px">' +
            d.name + '</div>' +

          '<div style="font-family:\'Nunito\',sans-serif;font-size:.65rem;color:rgba(255,255,255,.5);margin-bottom:6px">' +
            d.dutchName + '</div>' +

          '<div style="font-family:\'Nunito\',sans-serif;font-size:.68rem;color:rgba(200,220,255,.75);' +
            'line-height:1.4;min-height:38px">' +
            (unlocked ? d.powerDescription : 'Vrijgespeeld op niveau ' + d.unlockLevel) + '</div>' +

        '</div>';
    });

    setHTML(
      '<div class="sc-full" style="background:linear-gradient(160deg,#0a0618 0%,#140a28 100%);' +
        'display:flex;flex-direction:column;color:#fff;overflow:hidden">' +

        '<div style="display:flex;align-items:center;justify-content:center;padding:14px 20px;' +
          'background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;position:relative">' +
          '<button id="btn-ros-back" class="sc-btn sc-btn-blue" style="position:absolute;left:16px;' +
            'font-size:.85rem;padding:7px 14px;border-radius:10px">← Terug</button>' +
          '<div style="text-align:center">' +
            '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1rem,3vw,1.6rem);color:#ffd23f">DINO ROSTER</div>' +
            '<div style="font-family:\'Nunito\',sans-serif;font-size:.75rem;color:rgba(255,255,255,.45);margin-top:2px">' +
              (window.DINO_ROSTER ? window.DINO_ROSTER.length : 0) + ' dino\'s beschikbaar</div>' +
          '</div>' +
        '</div>' +

        '<div style="flex:1;overflow-y:auto;padding:16px 12px">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;' +
            'max-width:900px;margin:0 auto">' +
            cards +
          '</div>' +
        '</div>' +

      '</div>'
    );

    $('btn-ros-back').addEventListener('click', function () { showMenu(); });
  }

  // ── SHOP / WINKEL SCREEN ──────────────────────────────────────────────────────

  function showShop() {
    G.showScreen('menu');

    var coins = (window.Game && window.Game.state && window.Game.state.coins) || 0;

    var HATS = [
      { id: 'bouwhelm', emoji: '🪖', name: 'Bouwhelm',         desc: 'Professionele veiligheidshelm voor de bouwplaats.',  price: 40  },
      { id: 'party',    emoji: '🎉', name: 'Partyhoedje',       desc: 'Voor als het feestje voorbij is maar je hoed niet.', price: 60  },
      { id: 'cowboy',   emoji: '🤠', name: 'Cowboyhoed',        desc: 'Yee-haw! Perfect voor snelle raptors.',              price: 90  },
      { id: 'viking',   emoji: '⚔️', name: 'Vikinghelm',        desc: 'Robuuste helm van de noormannen. Stoot-proof.',      price: 130 },
      { id: 'tover',    emoji: '🧙', name: 'Tovenaarshoed',     desc: 'Magische krachten voor dino\'s met talent.',         price: 200 },
      { id: 'kroon',    emoji: '👑', name: 'Koninklijke Kroon', desc: 'De ultieme statussymbool. Draag hem met trots.',     price: 350 },
    ];

    var savedHats = {};
    try { savedHats = JSON.parse(localStorage.getItem('dg_hats') || '{}'); } catch(e) {}

    var items = '';
    HATS.forEach(function (hat) {
      var owned = !!savedHats[hat.id];
      var canAfford = coins >= hat.price;

      items +=
        '<div style="background:linear-gradient(160deg,#1e1040 0%,#0a0820 100%);' +
          'border:2px solid ' + (owned ? '#ffd23f' : 'rgba(180,130,255,.2)') + ';' +
          'border-radius:16px;padding:18px 14px;text-align:center;' +
          'box-shadow:' + (owned ? '0 0 18px rgba(255,210,63,.25),' : '') + '0 4px 16px rgba(0,0,0,.5)">' +

          '<div style="font-size:2.6rem;margin-bottom:8px;' +
            (owned ? 'filter:drop-shadow(0 0 10px rgba(255,210,0,.6))' : '') + '">' +
            hat.emoji + '</div>' +

          '<div style="font-family:\'Bungee\',cursive;font-size:.9rem;color:' + (owned ? '#ffd23f' : '#fff') + ';margin-bottom:4px">' +
            hat.name + '</div>' +

          '<div style="font-family:\'Nunito\',sans-serif;font-size:.68rem;color:rgba(200,180,255,.7);' +
            'line-height:1.4;margin-bottom:12px;min-height:38px">' +
            hat.desc + '</div>' +

          (owned
            ? '<div style="font-family:\'Baloo 2\',cursive;font-size:.85rem;color:#ffd23f">✓ In bezit</div>'
            : '<div style="display:flex;align-items:center;justify-content:center;gap:8px">' +
                '<span style="font-family:\'Bungee\',cursive;font-size:.9rem;color:#ffd23f">🪙 ' + hat.price + '</span>' +
                '<button class="sc-btn sc-btn-gold shop-buy-btn" data-hat="' + hat.id + '" data-price="' + hat.price + '" ' +
                  'style="font-size:.75rem;padding:6px 14px;border-radius:10px;' + (canAfford ? '' : 'opacity:.4;pointer-events:none') + '">' +
                  'KOPEN' +
                '</button>' +
              '</div>') +

        '</div>';
    });

    setHTML(
      '<div class="sc-full" style="background:linear-gradient(160deg,#0a0618 0%,#140a28 100%);' +
        'display:flex;flex-direction:column;color:#fff;overflow:hidden">' +

        '<div style="display:flex;align-items:center;justify-content:center;padding:14px 20px;' +
          'background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;position:relative">' +
          '<button id="btn-shop-back" class="sc-btn sc-btn-blue" style="position:absolute;left:16px;' +
            'font-size:.85rem;padding:7px 14px;border-radius:10px">← Terug</button>' +
          '<div style="text-align:center">' +
            '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1rem,3vw,1.6rem);color:#ffd23f">🛒 WINKEL</div>' +
            '<div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:4px">' +
              '<span style="font-size:1.1rem">🪙</span>' +
              '<span id="shop-coin-count" style="font-family:\'Baloo 2\',cursive;font-size:1rem;color:#ffd23f;font-weight:800">' +
                coins.toLocaleString('nl') + '</span>' +
              '<span style="font-family:\'Nunito\',sans-serif;font-size:.7rem;color:rgba(255,255,255,.4)">munten</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="flex:1;overflow-y:auto;padding:16px 12px">' +
          '<div style="font-family:\'Nunito\',sans-serif;font-size:.85rem;color:rgba(255,200,120,.8);' +
            'text-align:center;margin-bottom:14px">Hoeden voor je dino\'s — stijl is alles!</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;' +
            'max-width:900px;margin:0 auto">' +
            items +
          '</div>' +
        '</div>' +

      '</div>'
    );

    $('btn-shop-back').addEventListener('click', function () { showMenu(); });

    document.querySelectorAll('.shop-buy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hatId = btn.dataset.hat;
        var price = parseInt(btn.dataset.price, 10);
        var curCoins = (window.Game && window.Game.state && window.Game.state.coins) || 0;
        if (curCoins < price) return;
        var newCoins = curCoins - price;
        if (window.Game) window.Game.setState({ coins: newCoins });
        savedHats[hatId] = true;
        try { localStorage.setItem('dg_hats', JSON.stringify(savedHats)); } catch(e) {}
        showShop();
      });
    });
  }

  // ── SETTINGS SCREEN ──────────────────────────────────────────────────────────

  function showSettings() {
    G.showScreen('menu');

    var soundOn = localStorage.getItem('dg_sound') !== 'off';
    var version = 'v1.0';

    setHTML(
      '<div class="sc-full" style="background:linear-gradient(160deg,#0a0618 0%,#140a28 100%);' +
        'display:flex;flex-direction:column;color:#fff;overflow:hidden">' +

        '<div style="display:flex;align-items:center;justify-content:center;padding:14px 20px;' +
          'background:rgba(0,0,0,.4);border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;position:relative">' +
          '<button id="btn-set-back" class="sc-btn sc-btn-blue" style="position:absolute;left:16px;' +
            'font-size:.85rem;padding:7px 14px;border-radius:10px">← Terug</button>' +
          '<div style="font-family:\'Bungee\',cursive;font-size:clamp(1rem,3vw,1.6rem);color:#ffd23f">⚙️ INSTELLINGEN</div>' +
        '</div>' +

        '<div style="flex:1;overflow-y:auto;padding:24px 20px;max-width:480px;margin:0 auto;width:100%">' +

          '<div style="background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);' +
            'border-radius:14px;padding:16px 20px;margin-bottom:14px;' +
            'display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<div style="font-family:\'Baloo 2\',cursive;font-size:1rem;font-weight:700">🔊 Geluid</div>' +
              '<div style="font-family:\'Nunito\',sans-serif;font-size:.75rem;color:rgba(255,255,255,.45);margin-top:2px">Speelgeluiden aan of uit</div>' +
            '</div>' +
            '<button id="btn-sound-toggle" class="sc-btn" style="' +
              (soundOn
                ? 'background:linear-gradient(180deg,#56c754,#2e8b2c);color:#fff;border:1.5px solid rgba(140,255,140,.3)'
                : 'background:rgba(60,60,80,.8);color:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.12)') +
              ';font-size:.85rem;padding:8px 18px;border-radius:10px;min-width:76px">' +
              (soundOn ? 'AAN' : 'UIT') +
            '</button>' +
          '</div>' +

          '<div style="background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);' +
            'border-radius:14px;padding:16px 20px;margin-bottom:14px;' +
            'display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<div style="font-family:\'Baloo 2\',cursive;font-size:1rem;font-weight:700">🗑️ Voortgang wissen</div>' +
              '<div style="font-family:\'Nunito\',sans-serif;font-size:.75rem;color:rgba(255,255,255,.45);margin-top:2px">Alle niveaus en munten resetten</div>' +
            '</div>' +
            '<button id="btn-reset" class="sc-btn sc-btn-red" style="font-size:.85rem;padding:8px 18px;border-radius:10px">' +
              'RESET' +
            '</button>' +
          '</div>' +

          '<div style="text-align:center;margin-top:24px;font-family:\'Nunito\',sans-serif;' +
            'font-size:.75rem;color:rgba(255,255,255,.25)">' +
            'Dino Gooiers ' + version + ' — Bouw ze plat!' +
          '</div>' +

        '</div>' +

      '</div>'
    );

    $('btn-set-back').addEventListener('click', function () { showMenu(); });

    $('btn-sound-toggle').addEventListener('click', function () {
      var isOn = localStorage.getItem('dg_sound') !== 'off';
      localStorage.setItem('dg_sound', isOn ? 'off' : 'on');
      showSettings();
    });

    $('btn-reset').addEventListener('click', function () {
      if (!confirm('Weet je zeker dat je alle voortgang wilt wissen?')) return;
      ['dg_maxlv','dg_best','dg_coins','dg_hats','dg_save'].forEach(function (k) {
        localStorage.removeItem(k);
      });
      for (var i = 1; i <= 30; i++) localStorage.removeItem('dg_l' + i);
      if (window.Game) window.Game.setState({ maxLevel: 1, stars: [], coins: 0 });
      showMenu();
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.Screens = {
    showSplash:        showSplash,
    showLoading:       showLoading,
    showMenu:          showMenu,
    showWorldMap:      showWorldMap,
    showLevelComplete: showLevelComplete,
    showGameOver:      showGameOver,
    showBossIntro:     showBossIntro,
    showRoster:        showRoster,
    showShop:          showShop,
    showSettings:      showSettings,
    clearScreen:       clearScreen,
  };

  // ── Register minimal canvas hooks ────────────────────────────────────────────
  // These paint a solid dark background so the engine's fallback
  // placeholder text never shows through the HTML overlay.

  var _canvasBg = '#1a0e2e';

  function _darkRender(ctx) {
    ctx.fillStyle = _canvasBg;
    ctx.fillRect(0, 0, G.DESIGN_WIDTH, G.DESIGN_HEIGHT);
  }

  var _htmlScreens = ['splash', 'loading', 'menu', 'worldmap', 'levelcomplete', 'gameover', 'roster', 'shop', 'settings'];
  _htmlScreens.forEach(function (name) {
    G.registerScreen(name, {
      enter:  function () {},
      exit:   function () {},
      update: function () {},
      render: _darkRender,
    });
  });

  // When engine transitions to gameplay or bossbattle, clear the HTML overlay.
  G.on('screenChange', function (e) {
    if (e.to === 'gameplay' || e.to === 'bossbattle') {
      clearScreen();
    }
  });

  // ── Storage helper ───────────────────────────────────────────────────────────

  window.Storage = window.Storage || {
    getBestTotal: function () {
      return parseInt(localStorage.getItem('dg_best') || '0', 10);
    },
    saveLevel: function (lvl, stars, score) {
      var key = 'dg_l' + lvl;
      var prev = JSON.parse(localStorage.getItem(key) || '{"stars":0,"score":0}');
      if (stars > prev.stars || (stars === prev.stars && score > prev.score)) {
        localStorage.setItem(key, JSON.stringify({ stars: stars, score: score }));
      }
      var best = parseInt(localStorage.getItem('dg_best') || '0', 10);
      if (score > best) localStorage.setItem('dg_best', score);
      var maxLv = parseInt(localStorage.getItem('dg_maxlv') || '1', 10);
      if (lvl + 1 > maxLv) localStorage.setItem('dg_maxlv', lvl + 1);
    },
    load: function () {
      var stars = [];
      for (var i = 0; i < 30; i++) {
        var d = JSON.parse(localStorage.getItem('dg_l' + (i + 1)) || '{"stars":0}');
        stars.push(d.stars);
      }
      var maxLevel = parseInt(localStorage.getItem('dg_maxlv') || '1', 10);
      return { stars: stars, maxLevel: maxLevel };
    },
  };

}(window.Game));
