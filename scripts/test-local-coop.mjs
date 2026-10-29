// Run against npm run dev: COOP_TEST_BROWSER=msedge npm run test:coop
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, ...(process.env.COOP_TEST_BROWSER ? { channel: process.env.COOP_TEST_BROWSER } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.testPads = [];
  Object.defineProperty(navigator, 'getGamepads', { value: () => window.testPads });
});
try {
  await page.goto(process.env.COOP_TEST_URL || 'http://127.0.0.1:5180', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const { net } = await import('/src/net.js');
    const { rushCharacter } = await import('/src/game/coop.js');
    const c = rushCharacter(); c.name = 'Teste solo'; c.data.stats.playtime = 1;
    await net.createChar(c);
    window.savedBeforeRush = localStorage.getItem('peregrinos.local.v1');
    localStorage.setItem('peregrinos.controles', '1');
  });
  await page.getByRole('button', { name: '🎮 Dupla local — sem salvar' }).click();
  await page.getByRole('button', { name: 'Começar com 2 controles' }).click();
  await page.waitForFunction(() => window.__game?.localPlayers?.length === 2);
  const results = await page.evaluate(async () => {
    const { input, input2 } = await import('/src/input.js');
    const { readGamepads, setGamepadMode } = await import('/src/gamepad.js');
    const { splitNeeded } = await import('/src/game/coop.js');
    const { SEMANA_ATUAL } = await import('/src/content/index.js');
    const { MOVES } = await import('/src/game/bossMoves.js');
    const { net } = await import('/src/net.js');
    const g = window.__game, done = [];
    g.running = false;
    const check = (ok, label) => { if (!ok) throw new Error(label); done.push(label); };
    const pad = index => ({ index, id: 'test-' + index, connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    const a = pad(1), b = pad(3);
    window.testPads = [null, a, null, b];
    setGamepadMode('pads'); readGamepads();
    a.axes[0] = -1; b.axes[0] = 1; b.buttons[2].pressed = true; readGamepads();
    check(input.move().x === -1 && input2.move().x === 1, 'independent pads, including sparse indices');
    check(!input.consume('attack') && input2.consume('attack'), 'J2 attack never reaches J1');
    window.testPads[1] = null; readGamepads();
    check(input.pad === null && input2.move().x === 1 && !input.held.has('attack'), 'disconnect keeps J2 in its original slot');
    window.testPads[1] = a; readGamepads();
    check(input.move().x === -1 && input2.move().x === 1, 'reconnect restores J1');
    for (const [gp, target, other] of [[a, input, input2], [b, input2, input]]) {
      a.buttons.forEach(x => x.pressed = false); b.buttons.forEach(x => x.pressed = false); readGamepads();
      for (const [index, action] of [[2, 'attack'], [0, 'dodge'], [1, 'skill'], [3, 'interact'], [5, 'defend'], [7, 'botija'], [13, 'mount']]) {
        input.pressed.clear(); input2.pressed.clear(); gp.buttons[index].pressed = true; readGamepads();
        check(target.pressed.size === 1 && target.consume(action) && target.isHeld(action) && other.pressed.size === 0, 'button ' + index + ' maps only to ' + action + ' on pad ' + gp.index);
        readGamepads(); check(target.pressed.size === 0, 'holding ' + action + ' does not repeat presses on pad ' + gp.index);
        gp.buttons[index].pressed = false; readGamepads();
        check(!target.isHeld(action), 'release ' + action + ' on pad ' + gp.index);
      }
      gp.buttons[4].pressed = true; readGamepads();
      check(target.pressed.size === 0 && target.held.size === 0, 'broken L1 is ignored on pad ' + gp.index);
      gp.buttons[4].pressed = false; readGamepads();
    }
    check(document.querySelector('[data-act="attack"]').dataset.pad === 'X □' && document.querySelector('[data-act="defend"]').dataset.pad === 'RB / R1', 'HUD matches remapped attack and defense');
    setGamepadMode('keyboard'); window.testPads = [null, a]; readGamepads();
    input.keys.add('KeyD');
    check(input.move().x === 1 && input2.move().x === -1, 'keyboard plus one pad stays independent');
    input.mouseAim = true; readGamepads();
    check(input.mouseAim, 'J2 controller does not disable J1 mouse aim');
    window.testPads = []; setGamepadMode('pads');
    const [p1, p2] = g.localPlayers;
    const x1 = p1.x, y1 = p1.y, y2 = p2.y;
    input2.pad = { x: 0, y: 1 }; g.updatePlayer(0.05); input2.clear();
    check(p1.x === x1 && p1.y === y1 && p2.y > y2, 'J2 moves without moving J1');
    g.enemies = [g.makeEnemy('preguica', p2.x + 35, p2.y)];
    const enemy = g.enemies[0], hp = enemy.hp, sta = p1.sta;
    input2.padAim = 0; input2.pressed.add('attack'); g.updatePlayer(0.016);
    check(enemy.hp < hp && p1.sta === sta && p2.sta < 100, 'J2 deals melee damage and spends only its own stamina');
    input2.clear(); p2.atkCd = 0;
    input2.pressed.add('dodge'); g.updatePlayer(0.016);
    check(p2.dodgeT > 0 && p1.dodgeT <= 0, 'independent dodge');
    p2.dodgeT = 0; input2.held.add('defend'); g.updatePlayer(0.016);
    check(p2.guard && !p1.guard, 'independent guard'); input2.clear(); p2.guard = false;
    input2.pressed.add('skill'); g.updatePlayer(0.016);
    check(p2.skillCd > 0 && p1.skillCd <= 0, 'independent special');
    check(g.alvoDe({ x: p2.x, y: p2.y }) === p2, 'enemies target J2');
    g.enemies = []; g.projs = []; g.tele = []; g.hazards = [];
    p1.hp = p2.hp = g.st.maxHp; p1.inv = p2.inv = 0; p2.dodgeT = 0;
    g.proj({ x: p2.x, y: p2.y, a: 0, spd: 0, r: 3, life: 1, owner: 'e', dmg: 10 });
    g.updateProjectiles(0.01);
    check(p2.hp < g.st.maxHp && p1.hp === g.st.maxHp, 'enemy projectile damages J2');
    p1.inv = p2.inv = 0; const before = [p1.hp, p2.hp];
    g.hazards = [{ x: p1.x, y: p1.y, r: 120, t: 1, tick: 0, dmg: 10 }]; g.updateTele(0.01);
    check(p1.hp < before[0] && p2.hp < before[1], 'area hazards damage both players once per tick');
    p1.inv = p2.inv = 0; const ringHp = [p1.hp, p2.hp];
    p2.x = p1.x + 80; p2.y = p1.y;
    g.hazards = [{ ring: true, x: p1.x - 30, y: p1.y, r: 30, spd: 0, t: 2, dmg: 10 }];
    g.updateTele(0.01); g.hazards[0].r = 110; g.updateTele(0.01);
    check(p1.hp < ringHp[0] && p2.hp < ringHp[1], 'shockwave tracks hits separately for each player');
    g.hazards = []; g.regroup(); p1.inv = p2.inv = 0;
    const teleHp = [p1.hp, p2.hp];
    const boss = { x: p1.x, y: p1.y, step: 0, stepT: 1, atk: 10 };
    MOVES.marcados(g, boss, { vezes: 1 }, 0.01, { p: p2 }); g.updateTele(2);
    check(p1.hp < teleHp[0] && p2.hp < teleHp[1], 'delayed boss area checks both players at impact');
    g.pickups = [{ x: p2.x, y: p2.y, kind: 'ouro', v: 7, vx: 0, vy: 0, t: 1 }];
    const gold = g.char.data.gold; g.updatePickups(0.01);
    check(g.char.data.gold === gold + 7 && g.pickups.length === 0, 'J2 collects shared loot exactly once');
    let saves = 0; const oldSave = net.saveChar; net.saveChar = () => saves++;
    g.save(); g.saveT = 31; g.update(0.01); net.saveChar = oldSave;
    check(saves === 0 && !g.net && localStorage.getItem('peregrinos.local.v1') === window.savedBeforeRush, 'rush preserves existing saves and does not join online');
    g.withPlayer(p2, () => g.playerDown()); g.updatePlayer(5.1);
    check(!p2.dead && p2.hp === g.st.maxHp && Math.hypot(p2.x - p1.x, p2.y - p1.y) < 70, 'fallen J2 returns beside J1');
    g.enterSalao();
    check(g.scene === 'salao' && Math.hypot(p1.x - p2.x, p1.y - p2.y) < 70, 'both enter hub');
    g.enterSemana(SEMANA_ATUAL); g.enterFase(SEMANA_ATUAL, 1);
    check(g.scene === 'fase' && !g.cur.map.collides(p2.x, p2.y, p2.r), 'both enter dungeon on valid tiles');
    g.withPlayer(p1, () => g.playerDown()); g.withPlayer(p2, () => g.playerDown()); g.updatePlayer(5.1);
    check(g.scene === 'fase' && g.localPlayers.every(p => !p.dead && p.hp > 0), 'party wipe restarts dungeon');
    g.exitFase(); g.exitHub(); g.exitHub();
    check(g.scene === 'world' && Math.hypot(p1.x - p2.x, p1.y - p2.y) < 70, 'both leave dungeon and hubs');
    g.enemies = []; g.shakeA = 0;
    g.render(); check(!g.split, 'nearby players share camera');
    const sharedX = (p1.x + p2.x) / 2;
    check(Math.abs(g.camL + g.W / g.Z / 2 - sharedX) < 1, 'shared camera centers on both players');
    p2.x = p1.x + 800; g.render(); check(g.split, 'distant players split camera');
    const anchor = { x: 0, y: 0 }, edge = { x: g.W / g.Z * 0.55, y: 0 };
    check(!splitNeeded(anchor, edge, g.W, g.H, g.Z, false) && splitNeeded(anchor, edge, g.W, g.H, g.Z, true), 'hysteresis prevents camera flicker');
    g.regroup(); g.render(); check(!g.split, 'approaching players merge camera again');
    return done;
  });
  for (const result of results) console.log('PASS', result);
  await page.evaluate(() => {
    document.getElementById('banner').classList.remove('on');
    document.getElementById('toasts').innerHTML = '';
    window.__game.updateHud(0);
  });
  if (process.env.COOP_SCREENSHOTS) {
    await page.screenshot({ path: process.env.COOP_SCREENSHOTS + '/dupla-tela-unica.png' });
    await page.evaluate(() => { const g = window.__game; g.localPlayers[1].x += 800; g.render(); });
    await page.screenshot({ path: process.env.COOP_SCREENSHOTS + '/dupla-tela-dividida.png' });
  }
  await page.setViewportSize({ width: 960, height: 600 });
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => { const g = window.__game; g.render(); return g.W === 960 && g.cv.width === 960; }), true, 'resize');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  assert.equal(await page.evaluate(async () => {
    const { input2 } = await import('/src/input.js');
    const { readGamepads } = await import('/src/gamepad.js');
    const g = window.__game, before = g.localPlayers.map(p => [p.x, p.y]);
    input2.pad = { x: 1, y: 0 }; input2.pressed.add('attack'); input2.held.add('attack');
    readGamepads(); g.update(0.1);
    return g.ui.blocking && !input2.held.size && !input2.pressed.size && g.localPlayers.every((p, i) => p.x === before[i][0] && p.y === before[i][1]);
  }), true, 'shared modal pauses both and clears J2 actions');
  await page.getByRole('button', { name: 'Encerrar partida sem salvar', exact: true }).click();
  await page.getByRole('button', { name: '🎮 Dupla local — sem salvar' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('peregrinos.local.v1') === window.savedBeforeRush), true);
  await page.getByRole('button', { name: 'Começar a jornada', exact: true }).click();
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.waitForFunction(() => window.__game && !window.__game.localCoop);
  assert.equal(await page.evaluate(async () => {
    const g = window.__game; g.running = false;
    g.render(); g.char.data.gold += 1; await g.save();
    const data = JSON.parse(localStorage.getItem('peregrinos.local.v1'));
    return !document.body.classList.contains('local-coop') && !g.localPlayers && data.chars.length === 1 && data.chars[0].data.gold === g.char.data.gold;
  }), true, 'solo remains playable and saves normally');
  assert.deepEqual(errors, []);
  console.log('PASS resize, modal pause, exit, saved-character preservation, solo regression and no browser errors');
} finally { await browser.close(); }
