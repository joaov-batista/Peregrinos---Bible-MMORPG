// Controle (Xbox, PlayStation e genéricos no layout "standard" do navegador), no estilo Dark Souls:
//   analógico esq.: andar · analógico dir.: mirar · RB/R1: atacar (segurar = golpe forte) · RT/R2: especial
//   LB/L1: defender · LT/L2 ou R3: travar alvo · A/✕: falar/abrir · B/◯: esquiva · X/□: botija · Y/△: montar
//   ◀ ▶: atalhos · ▲ ou Select: mapa · Start: menu
// Com uma janela aberta, o direcional/analógico escolhe o botão, A confirma e B volta.
import { input, input2 } from './input.js';
import { config } from './config.js';

const ACOES = { 5: 'attack', 7: 'skill', 4: 'defend', 6: 'lock', 11: 'lock', 0: 'interact', 1: 'dodge', 2: 'botija', 3: 'mount', 14: 'item1', 15: 'item2' };
const ZONA = 0.22; // zona morta dos analógicos
let mode = 'solo', slots = [null, null];
const previous = new Map(), navigation = new Map();
export const pad = { conectado: false, nome: '' };

export function initGamepad() {
  addEventListener('gamepadconnected', e => { pad.conectado = true; pad.nome = e.gamepad.id; usarControle(); input.padAvisar?.('🎮 Controle conectado! Aperte Start para o menu.'); });
  addEventListener('gamepaddisconnected', () => { pad.conectado = [...(navigator.getGamepads?.() || [])].some(Boolean); if (!pad.conectado) document.body.classList.remove('pad'); });
  const loop = () => { try { readGamepads(); } catch { /* controle desconectado no meio da leitura */ } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

function usarControle(target = input) {
  target.touch = false; target.mouseAim = false;
  document.body.classList.toggle('pad', mode !== 'keyboard'); document.body.classList.remove('touch');
}

// Os índices ficam reservados: desconectar J1 não transfere J2 para ele.
export function setGamepadMode(next = 'solo') {
  mode = next; slots = [null, null]; previous.clear(); navigation.clear();
  input.clear(); input2.clear();
  input.padIndex = input2.padIndex = -1;
  input.padConnected = input2.padConnected = false;
  if (mode === 'keyboard') document.body.classList.remove('pad');
}

function release(target) {
  target.pad = null; target.padAim = null;
  for (const action of new Set(Object.values(ACOES))) { target.held.delete(action); target.pressed.delete(action); }
}

export function readGamepads() {
  const pads = [...(navigator.getGamepads?.() || [])].filter(gp => gp && gp.connected !== false);
  const assignments = mode === 'solo' ? [[pads[0], input]] : (() => {
    const active = mode === 'keyboard' ? [1] : [0, 1];
    for (const i of active) {
      if (pads.some(gp => gp.index === slots[i])) continue;
      const next = pads.find(gp => !slots.includes(gp.index));
      if (next) { slots[i] = next.index; previous.delete(next.index); }
    }
    return active.map(i => [pads.find(gp => gp.index === slots[i]), i === 0 ? input : input2]);
  })();
  pad.conectado = pads.length > 0;
  const janela = topo();
  let menuHandled = false;
  for (const [gp, target] of assignments) {
    target.padConnected = !!gp;
    target.padIndex = gp?.index ?? -1;
    if (!gp) { release(target); continue; }
    const b = gp.buttons.map(x => x.pressed || x.value > 0.5), ax = gp.axes;
    const antes = previous.get(gp.index) || [];
    const borda = i => b[i] && !antes[i];
    if (document.hidden || !document.hasFocus()) { release(target); previous.set(gp.index, b); continue; }
    if (b.some((x, i) => x && !antes[i]) || Math.hypot(ax[0] || 0, ax[1] || 0) > 0.5) usarControle(target);
    if (janela) {
      release(target);
      if (!menuHandled && (b.some((x, i) => x && !antes[i]) || ax.some(x => Math.abs(x) > 0.5))) {
        const nav = navigation.get(gp.index) || { t: 0, dir: null };
        menu(gp, b, borda, janela, nav); navigation.set(gp.index, nav); menuHandled = true;
      } else if (!b.some(Boolean) && ax.every(x => Math.abs(x) < 0.5)) navigation.delete(gp.index);
    } else {
      const mx = Math.abs(ax[0]) > ZONA ? ax[0] : 0, my = Math.abs(ax[1]) > ZONA ? ax[1] : 0;
      target.pad = mx || my ? { x: mx, y: my } : null;
      const rx = ax[2] || 0, ry = ax[3] || 0;
      target.padAim = Math.hypot(rx, ry) > 0.4 ? Math.atan2(ry, rx) : null;
      // L2 e R3 são a mesma ação; soltar um não solta o outro.
      for (const action of new Set(Object.values(ACOES))) {
        const buttons = Object.keys(ACOES).filter(i => ACOES[i] === action);
        if (buttons.some(i => borda(i))) target.pressed.add(action);
        if (buttons.some(i => b[i])) target.held.add(action);
        else if (buttons.some(i => antes[i])) target.held.delete(action);
      }
      if (borda(9)) input.padAcoes?.menu?.();
      if (borda(8) || borda(12)) input.padAcoes?.mapa?.();
    }
    previous.set(gp.index, b);
  }
}

// janela aberta por cima do jogo (ou as telas de login/personagem)
function topo() {
  const modais = document.querySelectorAll('#overlay .modal');
  if (modais.length) return modais[modais.length - 1];
  const telas = document.getElementById('screens');
  return telas && telas.children.length && !telas.hidden && getComputedStyle(telas).display !== 'none' ? telas : null;
}

function focaveis(raiz) {
  return [...raiz.querySelectorAll('button:not([disabled]), input, [tabindex="0"]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}

// escolhe o botão mais perto na direção apertada
function mover(raiz, dx, dy) {
  const els = focaveis(raiz); if (!els.length) return;
  const at = document.activeElement;
  if (!raiz.contains(at) || !els.includes(at)) { els[0].focus(); return; }
  const r0 = at.getBoundingClientRect(), cx = r0.x + r0.width / 2, cy = r0.y + r0.height / 2;
  let best = null, bs = Infinity;
  for (const el of els) {
    if (el === at) continue;
    const r = el.getBoundingClientRect(), vx = r.x + r.width / 2 - cx, vy = r.y + r.height / 2 - cy;
    const along = vx * dx + vy * dy; if (along <= 4) continue;
    const perp = Math.abs(vx * dy - vy * dx), s = along + perp * 2.5;
    if (s < bs) { bs = s; best = el; }
  }
  (best || at).focus(); (best || at).scrollIntoView?.({ block: 'nearest' });
}

function menu(gp, b, borda, janela, nav) {
  const ax = gp.axes, agora = performance.now();
  let dx = 0, dy = 0;
  if (b[12] || ax[1] < -0.5) dy = -1; else if (b[13] || ax[1] > 0.5) dy = 1;
  else if (b[14] || ax[0] < -0.5) dx = -1; else if (b[15] || ax[0] > 0.5) dx = 1;
  const dir = dx + ',' + dy;
  if (dx || dy) {
    if (dir !== nav.dir || agora > nav.t) { mover(janela, dx, dy); nav.t = agora + (dir !== nav.dir ? 320 : 140); }
  }
  nav.dir = dx || dy ? dir : null;
  if (borda(0)) { const at = document.activeElement; if (janela.contains(at) && at.click) at.click(); else focaveis(janela)[0]?.focus(); }
  if (borda(1) || borda(9)) { if (janela.classList.contains('modal') && !janela.classList.contains('locked')) janela._close?.(); }
}

// tremida do controle (ou do celular) nos golpes e na defesa perfeita
export function vibrar(ms = 120, forca = 0.6, index) {
  if (!config.vibrar) return;
  const pads = [...(navigator.getGamepads?.() || [])];
  const gp = index == null ? pads.find(Boolean) : pads.find(p => p?.index === index);
  if (gp?.vibrationActuator?.playEffect) { gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: forca, weakMagnitude: forca * 0.6 }).catch(() => {}); return; }
  if (input.touch && navigator.vibrate) navigator.vibrate(Math.round(ms * 0.6));
}
