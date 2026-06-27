/**
 * main.js — Dino Gooiers boot sequence
 * Preloads dino SVG images, wires up storage, inits the engine.
 */

// ── Canvas roundRect polyfill (Safari < 15.4, older Android) ─────────────────
(function () {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  if (CanvasRenderingContext2D.prototype.roundRect) return;
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0), w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y, x + w, y + r, r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
  };
}());

(function () {
  'use strict';

  window._loadProgress = 0;
  window._assetsReady  = false;

  // ── Asset preloading ─────────────────────────────────────────────────────

  function preloadDinos() {
    return new Promise(function (resolve) {
      var all = [].concat(
        window.DINO_ROSTER    || [],
        window.TIRANNEN_TYPES || [],
        window.BOSS_DINOS     || []
      );

      if (!all.length) { window._loadProgress = 1; resolve(); return; }

      window.DinoImages = {};
      var loaded = 0;

      all.forEach(function (d) {
        var img = new Image();
        img.onload = function () {
          window.DinoImages[d.id] = img;
          loaded++;
          window._loadProgress = loaded / all.length;
          if (loaded === all.length) resolve();
        };
        img.onerror = function () {
          loaded++;
          window._loadProgress = loaded / all.length;
          if (loaded === all.length) resolve();
        };
        img.src = d.svgDataURI;
      });
    });
  }

  // ── Loading bar DOM helper ───────────────────────────────────────────────

  function setLoadingText(txt) {
    var el = document.getElementById('loadingText');
    if (el) el.textContent = txt;
  }

  function setLoadingBar(pct) {
    var el = document.getElementById('loadingBar');
    if (el) el.style.width = Math.round(pct * 100) + '%';
  }

  function hideLoadingOverlay() {
    var el = document.getElementById('loadingOverlay');
    if (!el) return;
    el.classList.add('hidden');
    setTimeout(function () { el.style.display = 'none'; }, 600);
  }

  // ── Storage restore ──────────────────────────────────────────────────────

  function restoreProgress() {
    try {
      var saved = window.Storage.load();
      Game.setState({ maxLevel: saved.maxLevel, stars: saved.stars });
    } catch (e) {
      Game.setState({ maxLevel: 1, stars: [] });
    }
  }

  // ── Boot sequence ─────────────────────────────────────────────────────────

  function boot() {
    setLoadingText('Fonts laden...');
    setLoadingBar(0.05);

    // Wait for Google Fonts
    document.fonts.ready.then(function () {
      setLoadingText('Dino\'s laden...');
      setLoadingBar(0.15);

      preloadDinos().then(function () {
        setLoadingText('Wereld bouwen...');
        setLoadingBar(0.95);

        // Brief pause for progress bar to reach 100 %
        setTimeout(function () {
          setLoadingBar(1.0);

          // Restore saved progress
          restoreProgress();

          // Boot engine — shows splash, which waits for _assetsReady
          Game.init({ initialScreen: 'splash' });

          window._assetsReady = true;

          // Hide DOM overlay after engine first frame
          setTimeout(hideLoadingOverlay, 350);
        }, 200);
      });
    });

    // Keep DOM loading bar in sync with asset progress
    var syncInterval = setInterval(function () {
      setLoadingBar(0.15 + window._loadProgress * 0.8);
      if (window._assetsReady) clearInterval(syncInterval);
    }, 80);
  }

  // ── Start after DOM is ready ──────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}());
