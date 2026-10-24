// Controle (Xbox, PlayStation e genéricos no layout "standard" do navegador), no estilo Dark Souls:
//   analógico esq.: andar · analógico dir.: mirar · RB/R1: atacar (segurar = golpe forte) · RT/R2: especial
//   LB/L1: defender · LT/L2 ou R3: travar alvo · A/✕: falar/abrir · B/◯: esquiva · X/□: botija · Y/△: montar
//   ◀ ▶: atalhos · ▲ ou Select: mapa · Start: menu
// Com uma janela aberta, o direcional/analógico escolhe o botão, A confirma e B volta.
import { input } from './input.js';
import { config } from './config.js';

const ACOES = { 5: 'attack', 7: 'skill', 4: 'defend', 6: 'lock', 11: 'lock', 0: 'interact', 1: 'dodge', 2: 'botija', 3: 'mount', 14: 'item1', 15: 'item2' };
const ZONA = 0.22; // zona morta dos analógicos
let antes = [], nav = { t: 0, dir: null };
export const pad = { conectado: false, nome: '' };

export function initGamepad() {
  addEventListener('gamepadconnected', e => { pad.conectado = true; pad.nome = e.gamepad.id; usarControle(); input.padAvisar?.('🎮 Controle conectado! Aperte Start para o menu.'); });
  addEventListener('gamepaddisconnected', () => { pad.conectado = [...(navigator.getGamepads?.() || [])].some(Boolean); if (!pad.conectado) document.body.classList.remove('pad'); });
  const loop = () => { try { ler(); } catch { /* controle desconectado no meio da leitura */ } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

function usarControle() { input.touch = false; input.mouseAim = false; document.body.classList.add('pad'); document.body.classList.remove('touch'); }

function ler() {
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (!gp) { input.pad = null; input.padAim = null; return; }
  const b = gp.buttons.map(x => x.pressed || x.value > 0.5), ax = gp.axes;
  const borda = i => b[i] && !antes[i];
  if (b.some((x, i) => x && !antes[i]) || Math.hypot(ax[0] || 0, ax[1] || 0) > 0.5) usarControle();
  const janela = topo();
  if (janela) {
    // menus: navegação por foco
    input.pad = null; input.padAim = null;
    for (const a of Object.values(ACOES)) input.held.delete(a);
    menu(gp, b, borda, janela);
  } else {
    // movimento e mira
    const mx = Math.abs(ax[0]) > ZONA ? ax[0] : 0, my = Math.abs(ax[1]) > ZONA ? ax[1] : 0;
    input.pad = mx || my ? { x: mx, y: my } : null;
    const rx = ax[2] || 0, ry = ax[3] || 0;
    input.padAim = Math.hypot(rx, ry) > 0.4 ? Math.atan2(ry, rx) : null;
    for (const [i, a] of Object.entries(ACOES)) {
      if (b[i] && !antes[i]) input.pressed.add(a);
      if (b[i]) input.held.add(a); else if (antes[i]) input.held.delete(a);
    }
    if (borda(9)) input.padAcoes?.menu?.();
    if (borda(8) || borda(12)) input.padAcoes?.mapa?.();
  }
  antes = b;
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

function menu(gp, b, borda, janela) {
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
export function vibrar(ms = 120, forca = 0.6) {
  if (!config.vibrar) return;
  const gp = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (gp?.vibrationActuator?.playEffect) { gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: forca, weakMagnitude: forca * 0.6 }).catch(() => {}); return; }
  if (input.touch && navigator.vibrate) navigator.vibrate(Math.round(ms * 0.6));
}
