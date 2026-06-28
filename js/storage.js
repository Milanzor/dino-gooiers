/**
 * storage.js — Dino Gooiers localStorage persistence
 * Provides a unified save/load API for all game state.
 *
 * API on window.Storage:
 *   save(key, value)      — write any value to localStorage as JSON
 *   load(key, default)    — read and parse from localStorage
 *   saveProgress(state)   — write the full game state object
 *   loadProgress()        — read game state, or return a clean default
 *   saveLevel(lvl, stars, score) — update a single level result
 *   clearAll()            — wipe everything (debug)
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  var NS          = 'dg_';          // namespace prefix for all keys
  var SAVE_KEY    = NS + 'save';    // primary save-slot key
  var TOTAL_LEVELS = 30;

  // ── Default initial state ─────────────────────────────────────────────────

  function _defaultState() {
    return {
      stars:          new Array(TOTAL_LEVELS).fill(0),
      unlockedLevels: [1],
      unlockedDinos:  ['rocky'],
      coins:          0,
      gems:           0,
      highScores:     {},           // keyed by level number (1-based)
      settings:       { sound: true, music: true },
      currentWorld:   0,
      // runtime convenience — kept in sync by saveLevel()
      maxLevel:       1,
    };
  }

  // ── Low-level helpers ─────────────────────────────────────────────────────

  function _save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Storage full or unavailable — fail silently in production
      if (typeof console !== 'undefined') console.warn('[Storage] save failed:', e);
    }
  }

  function _load(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  // ── Progress helpers ──────────────────────────────────────────────────────

  /**
   * Merge a saved object with the current default to handle new keys added
   * in later game versions gracefully.
   */
  function _mergeWithDefault(saved) {
    var def = _defaultState();
    var merged = {};

    // Copy defaults first, then overlay saved values
    Object.keys(def).forEach(function (k) {
      merged[k] = def[k];
    });

    if (!saved || typeof saved !== 'object') return merged;

    Object.keys(saved).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(def, k)) {
        merged[k] = saved[k];
      }
    });

    // Ensure stars array is always the right length
    if (!Array.isArray(merged.stars) || merged.stars.length !== TOTAL_LEVELS) {
      var existing = Array.isArray(merged.stars) ? merged.stars : [];
      var fixed = new Array(TOTAL_LEVELS).fill(0);
      for (var i = 0; i < Math.min(existing.length, TOTAL_LEVELS); i++) {
        fixed[i] = existing[i] || 0;
      }
      merged.stars = fixed;
    }

    return merged;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.Storage = {

    /**
     * Write any JSON-serialisable value under the given key.
     * Key is automatically namespaced with the 'dg_' prefix.
     */
    save: function (key, value) {
      _save(NS + key, value);
    },

    /**
     * Read a previously saved value. Returns defaultValue when the key does
     * not exist or JSON parsing fails.
     */
    load: function (key, defaultValue) {
      // Support legacy callers that call Storage.load() with no args to get
      // the full game state (matches the old stub in screens.js).
      if (arguments.length === 0) {
        return this.loadProgress();
      }
      return _load(NS + key, defaultValue !== undefined ? defaultValue : null);
    },

    /**
     * Persist the entire game state object to the primary save slot.
     * Only known keys are stored (see _defaultState for the schema).
     */
    saveProgress: function (state) {
      if (!state || typeof state !== 'object') return;

      // Build a clean snapshot — only persist the keys we own
      var def = _defaultState();
      var snapshot = {};
      Object.keys(def).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(state, k)) {
          snapshot[k] = state[k];
        } else {
          snapshot[k] = def[k];
        }
      });

      _save(SAVE_KEY, snapshot);
    },

    /**
     * Load the full game state. Missing or corrupt saves fall back to the
     * default initial state so the game always gets a valid object.
     */
    loadProgress: function () {
      var raw = _load(SAVE_KEY, null);
      return _mergeWithDefault(raw);
    },

    /**
     * Update a single level's result. Called by gameplay.js at level end.
     *
     * @param {number} levelNum   1-based level number
     * @param {number} stars      0-3
     * @param {number} score      raw score
     */
    saveLevel: function (levelNum, stars, score) {
      var progress = this.loadProgress();

      // Stars — only upgrade, never overwrite with a worse result
      var idx = levelNum - 1;
      if (idx >= 0 && idx < TOTAL_LEVELS) {
        if ((stars || 0) > (progress.stars[idx] || 0)) {
          progress.stars[idx] = stars;
        }
      }

      // High score
      var prev = progress.highScores[levelNum] || 0;
      if ((score || 0) > prev) {
        progress.highScores[levelNum] = score;
      }

      // Unlock next level
      var next = levelNum + 1;
      if (next <= TOTAL_LEVELS && progress.unlockedLevels.indexOf(next) === -1) {
        progress.unlockedLevels.push(next);
      }

      // Keep maxLevel in sync (used by worldmap / engine state)
      if (next > (progress.maxLevel || 1)) {
        progress.maxLevel = next;
      }

      this.saveProgress(progress);
    },

    /**
     * Persist coin balance. Updates only coins in the save slot.
     * @param {number} coins
     */
    saveCoins: function (coins) {
      var progress = this.loadProgress();
      progress.coins = Math.max(0, Math.round(coins || 0));
      this.saveProgress(progress);
    },

    /**
     * Wipe all Dino Gooiers data from localStorage.
     * For debug / settings reset only.
     */
    clearAll: function () {
      try {
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(NS) === 0) toRemove.push(k);
        }
        toRemove.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {
        if (typeof console !== 'undefined') console.warn('[Storage] clearAll failed:', e);
      }
    },

  };

}());
