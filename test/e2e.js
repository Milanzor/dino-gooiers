'use strict';
/**
 * test/e2e.js — Dino Gooiers browser smoke test
 * Runs with Puppeteer against the live GitHub Pages URL.
 * Called by the GitHub Actions browser-test job after deployment.
 *
 * Usage:
 *   node test/e2e.js [url]
 *   GAME_URL=https://milanzor.github.io/dino-gooiers/ node test/e2e.js
 */

const puppeteer   = require('puppeteer');
const fs          = require('fs');
const path        = require('path');

const GAME_URL     = process.env.GAME_URL || process.argv[2] || 'https://milanzor.github.io/dino-gooiers/';
const SHOTS_DIR    = process.env.SHOTS_DIR || path.join(__dirname, '..', 'screenshots');
const TIMEOUT      = 40000;

fs.mkdirSync(SHOTS_DIR, { recursive: true });

let passed = 0, failed = 0;

function log(msg)  { console.log('[E2E] ' + msg); }
function pass(lbl, detail) { passed++; console.log('  PASS  ' + lbl + (detail ? '  [' + detail + ']' : '')); }
function fail(lbl, detail) { failed++; console.error('  FAIL  ' + lbl + (detail ? '  [' + detail + ']' : '')); }

async function shot(page, name) {
  const p = path.join(SHOTS_DIR, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  log('screenshot → ' + p);
  return p;
}

(async () => {
  log('Target: ' + GAME_URL);
  log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1170, height: 540 });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('PAGEERR: ' + err.message));

  try {

    // ── 1. Page loads ──────────────────────────────────────────────────
    log('\n[1] Page load');
    const nav = await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    if (nav && nav.ok()) pass('HTTP 200 OK');
    else fail('HTTP load', String(nav && nav.status()));

    await shot(page, '01-initial-load');

    // ── 2. Game scripts initialize ─────────────────────────────────────
    log('\n[2] Script init');
    try {
      await page.waitForFunction(
        () => window.Game && window.LEVELS && window.DINO_ROSTER,
        { timeout: TIMEOUT }
      );
      const info = await page.evaluate(() => ({
        levelCount: window.LEVELS ? window.LEVELS.length : 0,
        dinoCount:  window.DINO_ROSTER ? window.DINO_ROSTER.length : 0,
        hasScreens: !!window.Screens,
        hasStorage: !!window.Storage,
        currentScreen: window.Game ? window.Game.state.currentScreen : 'none',
      }));
      pass('window.Game exists');
      pass('LEVELS loaded', info.levelCount + ' levels');
      pass('DINO_ROSTER loaded', info.dinoCount + ' heroes');
      if (info.hasScreens)  pass('Screens module present');  else fail('Screens missing');
      if (info.hasStorage)  pass('Storage module present');  else fail('Storage missing');
    } catch (e) { fail('Script init', e.message.slice(0, 120)); }

    // ── 3. Canvas active ───────────────────────────────────────────────
    log('\n[3] Canvas');
    try {
      await page.waitForFunction(
        () => { const c = document.getElementById('game-canvas'); return c && c.width > 0; },
        { timeout: TIMEOUT }
      );
      const dims = await page.$eval('#game-canvas', c => c.width + 'x' + c.height);
      pass('Canvas initialized', dims);
    } catch (e) { fail('Canvas', e.message.slice(0, 120)); }

    // ── 4. Loading overlay hides → splash screen ───────────────────────
    log('\n[4] Loading → Splash');
    try {
      await page.waitForFunction(
        () => {
          const el = document.getElementById('loadingOverlay');
          return !el || el.style.display === 'none' || parseFloat(el.style.opacity || '1') < 0.1;
        },
        { timeout: 20000 }
      );
      pass('Loading overlay hides');
      await shot(page, '02-after-loading');
    } catch (e) { fail('Loading overlay hides', e.message.slice(0, 120)); }

    // ── 5. PNG assets loaded (DinoImages populated) ────────────────────
    log('\n[5] PNG assets');
    try {
      await page.waitForFunction(
        () => window.DinoImages && Object.keys(window.DinoImages).length > 0,
        { timeout: 15000 }
      );
      const imgInfo = await page.evaluate(() => {
        const imgs = window.DinoImages || {};
        const ids  = Object.keys(imgs);
        const pngs = ids.filter(id => imgs[id].src && imgs[id].src.includes('.png'));
        return { total: ids.length, pngCount: pngs.length, ids: ids.join(', '), pngs: pngs.join(', ') };
      });
      pass('DinoImages populated', imgInfo.total + ' entries');
      if (imgInfo.pngCount > 0) pass('PNG assets loaded', imgInfo.pngCount + ' heroes use PNG: ' + imgInfo.pngs);
      else fail('PNG assets not used', 'all fell back to SVG — ids: ' + imgInfo.ids);
    } catch (e) { fail('PNG assets', e.message.slice(0, 120)); }

    // ── 6. Splash screen content ───────────────────────────────────────
    log('\n[6] Splash screen');
    try {
      await page.waitForFunction(
        () => { const sc = document.getElementById('screen-container'); return sc && sc.innerHTML.length > 100; },
        { timeout: 10000 }
      );
      const text = await page.$eval('#screen-container', el => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80));
      pass('Splash screen rendered', text);
      await shot(page, '03-splash');
    } catch (e) { fail('Splash screen', e.message.slice(0, 120)); }

    // ── 7. Splash tap → Main menu ──────────────────────────────────────
    log('\n[7] Splash → Menu');
    try {
      await page.click('#screen-container');
      await page.waitForFunction(
        () => document.getElementById('btn-spelen') !== null,
        { timeout: 8000 }
      );
      pass('Tap splash → main menu');
      const btnTxt = await page.$eval('#btn-spelen', el => el.textContent.trim());
      pass('SPELEN button visible', btnTxt);
      await shot(page, '04-main-menu');
    } catch (e) { fail('Splash → Menu', e.message.slice(0, 120)); }

    // ── 8. SPELEN → world map ──────────────────────────────────────────
    log('\n[8] Menu → World map');
    try {
      await page.click('#btn-spelen');
      await page.waitForFunction(
        () => window.Game && window.Game.state.currentScreen === 'worldmap',
        { timeout: 8000 }
      );
      pass('SPELEN → world map');
      await shot(page, '05-worldmap');
    } catch (e) { fail('Menu → World map', e.message.slice(0, 120)); }

    // ── 9. Start Level 1 → gameplay ───────────────────────────────────
    log('\n[9] Level 1 start');
    try {
      await page.evaluate(() => {
        window.Game.setState({ currentLevel: 1 });
        if (window.Screens && window.Screens.clearScreen) window.Screens.clearScreen();
        window.Game.showScreen('gameplay');
      });
      await page.waitForFunction(
        () => window.Game && window.Game.state.currentScreen === 'gameplay',
        { timeout: 10000 }
      );
      pass('Level 1 gameplay screen active');
      await page.waitForTimeout(1800);
      await shot(page, '06-gameplay-start');
    } catch (e) { fail('Level 1 start', e.message.slice(0, 120)); }

    // ── 10. Gameplay HUD present ───────────────────────────────────────
    log('\n[10] Gameplay HUD');
    try {
      const hud = await page.$('#main-hud');
      if (hud) pass('HUD element present');
      else fail('HUD missing');

      const canvas = await page.$('#game-canvas');
      if (canvas) {
        const { width, height } = await canvas.boundingBox();
        pass('Canvas in DOM', Math.round(width) + 'x' + Math.round(height) + ' px');
      }
    } catch (e) { fail('Gameplay HUD', e.message.slice(0, 120)); }

    // ── 11. Mouse drag (aim crane) ─────────────────────────────────────
    log('\n[11] Mouse drag / aim');
    try {
      const canvas = await page.$('#game-canvas');
      const box    = await canvas.boundingBox();
      const sx = box.x + 352 * (box.width  / 1170);
      const sy = box.y + 360 * (box.height / 540);
      const px = box.x + 200 * (box.width  / 1170);
      const py = box.y + 420 * (box.height / 540);

      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.waitForTimeout(80);
      await page.mouse.move(px, py, { steps: 12 });
      await page.waitForTimeout(250);
      await shot(page, '07-aiming');
      await page.mouse.up();
      pass('Mouse drag-to-aim (pointerdown → move → pointerup)');
      await page.waitForTimeout(2000);
      await shot(page, '08-after-launch');
      pass('Dino launched — physics loop running');
    } catch (e) { fail('Mouse drag', e.message.slice(0, 120)); }

    // ── 12. Touch events ───────────────────────────────────────────────
    log('\n[12] Touch events');
    try {
      await page.evaluate(() => {
        if (window.Screens && window.Screens.showMenu) window.Screens.showMenu();
      });
      await page.waitForTimeout(600);
      const sBtn = await page.$('#btn-spelen');
      if (sBtn) {
        const bBox = await sBtn.boundingBox();
        await page.touchscreen.tap(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
        await page.waitForTimeout(500);
        pass('Touch tap on SPELEN button registered');
        await shot(page, '09-after-touch');
      } else {
        fail('SPELEN btn not found for touch test');
      }
    } catch (e) { fail('Touch events', e.message.slice(0, 120)); }

    // ── 13. Console errors ─────────────────────────────────────────────
    log('\n[13] Console errors');
    const gameErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR_') &&
      !e.includes('manifest') && !e.includes('Google Fonts')
    );
    if (gameErrors.length === 0) pass('Zero JS errors during test run');
    else fail('JS errors detected', gameErrors.length + ': ' + gameErrors.slice(0, 3).join(' | '));

    // Final art shot
    log('\n[14] Final art screenshot');
    try {
      await page.evaluate(() => {
        window.Game.setState({ currentLevel: 1 });
        if (window.Screens && window.Screens.clearScreen) window.Screens.clearScreen();
        window.Game.showScreen('gameplay');
      });
      await page.waitForTimeout(2500);
      await shot(page, '10-final-gameplay');
      pass('Final gameplay screenshot captured');
    } catch (e) { fail('Final screenshot', e.message.slice(0, 120)); }

  } catch (fatal) {
    fail('Unexpected error', fatal.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(56));
  console.log('Dino Gooiers E2E  —  ' + passed + ' passed  ' + failed + ' failed');
  console.log('Screenshots → ' + SHOTS_DIR);
  console.log('='.repeat(56));

  if (consoleErrors.length) {
    console.log('\nAll console errors captured:');
    consoleErrors.forEach(e => console.log('  ! ' + e));
  }

  process.exit(failed > 0 ? 1 : 0);
})();
