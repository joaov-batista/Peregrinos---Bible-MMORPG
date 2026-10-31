// Desenho procedural de personagens, inimigos e chefes (tudo em canvas, sem imagens).
import { TAU, rr, ell } from '../util.js';
export { drawPerson, drawWeapon, getPersonPose } from './character-art.js';
export { drawEnemy, enemyArtTop } from './enemy-art.js';
export { drawBoss, bossArtTop } from './boss-art.js';

/* ---------- Cor ---------- */
function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1); }
export function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const [r, gg, b] = hexRgb(hex);
  const f = c => amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
  return rgbHex(f(r), f(gg), f(b));
}
// tira saturação e puxa para um tom frio: as cores do jogador continuam reconhecíveis, mas "envelhecidas"
const MUTE = new Map();
export function mute(hex, sat = 0.55, dark = 0.12) {
  if (!hex || hex[0] !== '#') return hex;
  const k = hex + sat + dark; if (MUTE.has(k)) return MUTE.get(k);
  let [r, g, b] = hexRgb(hex);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
  r = r * (1 - dark) * 0.96; g = g * (1 - dark) * 0.98; b = b * (1 - dark) + 6;
  const out = rgbHex(Math.min(255, r), Math.min(255, g), Math.min(255, b)); MUTE.set(k, out); return out;
}
/* ---------- Objetos ---------- */
export function drawChest(g, c, T) {
  const x = c.x, y = c.y;
  g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + 2, y + 13, 15, 5); g.fill();
  if (!c.open && !c.locked) { g.fillStyle = 'rgba(255,220,120,' + (0.18 + 0.12 * Math.sin(T * 4)) + ')'; ell(g, x, y, 22, 18); g.fill(); }
  g.fillStyle = c.open ? '#5A3820' : '#8A5A35'; rr(g, x - 13, y - 6, 26, 18, 3); g.fill();
  g.fillStyle = c.open ? '#3A2414' : '#A86E40';
  if (c.open) { rr(g, x - 13, y - 16, 26, 8, 3); g.fill(); } else { rr(g, x - 13, y - 12, 26, 9, 4); g.fill(); }
  g.fillStyle = '#E9B949'; g.fillRect(x - 2, y - 5, 4, 6);
  if (c.locked) { g.fillStyle = '#fff'; g.font = '900 10px Nunito'; g.textAlign = 'center'; g.fillText(Math.ceil(c.locked), x, y - 18); }
  if (!c.open && !c.locked) { g.fillStyle = '#FFE38A'; g.font = '900 14px Nunito'; g.textAlign = 'center'; g.fillText('?', x, y - 20 + Math.sin(T * 4) * 2); }
}

export function drawPortal(g, x, y, T, state) {
  // state: 'aberto' | 'fechado' | 'feito'
  g.save(); g.translate(x, y);
  const cols = state === 'fechado' ? ['rgba(90,80,120,', '#5A507A'] : state === 'feito' ? ['rgba(120,230,160,', '#7CE0A0'] : ['rgba(255,214,110,', '#FFD66E'];
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = cols[0] + (0.25 + i * 0.12) + ')'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 40 - i * 8 + Math.sin(T * 2 + i) * 3, 46 - i * 9, 0, T * (i % 2 ? -1 : 1) * 0.8, T * (i % 2 ? -1 : 1) * 0.8 + 4.6); g.stroke();
  }
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, 44); gr.addColorStop(0, cols[0] + '0.55)'); gr.addColorStop(1, cols[0] + '0)');
  g.fillStyle = gr; ell(g, 0, 0, 44, 50); g.fill();
  g.restore();
}

/* ---------- Animais de estimação e montarias ---------- */
// st: { t, fx, moving, walk }. Desenhados de lado, virados para onde andam.
const ANIMAIS = {
  cavalo: { body: '#8A5A35', dark: '#5A3820', mane: '#2A1A10', w: 20, h: 9, leg: 13, head: 1.1 },
  burrinho: { body: '#9A938A', dark: '#6E675E', mane: '#3A3530', w: 14, h: 8, leg: 8, head: 0.85, orelha: true },
  cachorro: { body: '#C8964E', dark: '#8A5F2A', mane: '#8A5F2A', w: 9, h: 5, leg: 5, head: 0.6, cao: true },
  gato: { body: '#E08A3C', dark: '#9A5420', mane: '#9A5420', w: 7, h: 4, leg: 4, head: 0.5, cao: true, gato: true }
};
export function drawAnimal(g, kind, x, y, st) {
  if (kind === 'ovelha') return drawSheep(g, x, y, st.t, false, st.fx < 0);
  const A = ANIMAIS[kind]; if (!A) return;
  const t = st.t || 0, dir = (st.fx || 1) < 0 ? -1 : 1, ph = st.moving ? st.walk * (A.cao ? 20 : 13) : 0;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, 0, 10, A.w + 3, 4); g.fill();
  const top = 10 - A.leg, bob = st.moving ? -Math.abs(Math.sin(ph)) * 1.5 : 0;
  // pernas (pares alternados)
  g.fillStyle = A.dark;
  [[-A.w * 0.7, 0], [-A.w * 0.45, Math.PI], [A.w * 0.45, Math.PI], [A.w * 0.7, 0]].forEach(([lx, o]) => {
    const sw = st.moving ? Math.sin(ph + o) * 3 : 0;
    g.save(); g.translate(lx, top + bob); g.rotate(sw * 0.08); g.fillRect(-1.6, 0, 3.2, A.leg); g.restore();
  });
  g.translate(0, bob);
  // rabo
  g.strokeStyle = A.mane; g.lineWidth = A.cao ? 2.5 : 3.5; g.lineCap = 'round';
  const wag = A.cao ? Math.sin(t * 14) * 4 : Math.sin(t * 2) * 1.5;
  g.beginPath(); g.moveTo(-A.w, top - A.h * 0.5); g.quadraticCurveTo(-A.w - 5, top - A.h * (A.cao ? 1.4 : 0.2) + wag, -A.w - 3, top + (A.cao ? -A.h : 4)); g.stroke();
  // corpo
  g.fillStyle = A.body; ell(g, 0, top - A.h * 0.5, A.w, A.h); g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)'; ell(g, -A.w * 0.2, top - A.h, A.w * 0.6, A.h * 0.35); g.fill();
  // pescoço e cabeça
  const s = A.head, hx = A.w * 0.85, hy = top - A.h * 0.6;
  g.fillStyle = A.body;
  if (!A.cao) { g.beginPath(); g.moveTo(hx - 5 * s, hy + 3); g.lineTo(hx + 4 * s, hy - 14 * s); g.lineTo(hx + 10 * s, hy - 10 * s); g.lineTo(hx + 4 * s, hy + 4); g.closePath(); g.fill(); }
  const cx = hx + (A.cao ? 5 : 9) * s, cy = hy - (A.cao ? 5 : 13) * s;
  ell(g, cx, cy, (A.cao ? 6 : 5) * s, (A.cao ? 5 : 4.5) * s); g.fill();
  if (!A.gato) { ell(g, cx + (A.cao ? 5 : 6) * s, cy + 2 * s, (A.cao ? 3.5 : 4.2) * s, (A.cao ? 2.6 : 3.4) * s); g.fill(); }
  g.fillStyle = A.dark;
  if (A.orelha) { for (const o of [-2, 2]) { g.save(); g.translate(cx + o * 0.6, cy - 4 * s); g.rotate(-0.25 + o * 0.08); ell(g, 0, -5, 1.8, 6); g.fill(); g.restore(); } }
  else if (A.gato) { g.fillStyle = A.body; for (const o of [-2.2, 1.8]) { g.beginPath(); g.moveTo(cx + o - 1.8, cy - 2); g.lineTo(cx + o, cy - 6.5); g.lineTo(cx + o + 1.8, cy - 2); g.fill(); } g.fillStyle = A.dark; for (let i = -1; i <= 1; i++) g.fillRect(-A.w * 0.3 + i * 3, top - A.h * 1.3, 1.2, A.h * 0.9); }
  else if (A.cao) { ell(g, cx - 2.5, cy - 1, 2.2, 4.5); g.fill(); }
  else { g.beginPath(); g.moveTo(cx - 1, cy - 4); g.lineTo(cx + 1, cy - 9); g.lineTo(cx + 3, cy - 4); g.fill(); }
  if (!A.cao) { g.fillStyle = A.mane; g.beginPath(); g.moveTo(hx - 4 * s, hy); g.lineTo(cx - 3 * s, cy - 3 * s); g.lineTo(cx - 1 * s, cy + 1); g.lineTo(hx - 1, hy + 3); g.closePath(); g.fill(); }
  g.fillStyle = '#120A04'; ell(g, cx + 1.5 * s, cy - 1 * s, 1.1, 1.1); g.fill();
  if (A.gato) { g.fillStyle = '#F29BB0'; ell(g, cx + 5 * s, cy + 1 * s, 1, 0.8); g.fill(); }
  else if (A.cao) { ell(g, cx + 8 * s, cy + 1.5 * s, 1.4, 1.2); g.fill(); }
  g.restore();
}

export function drawSheep(g, x, y, T, lost, flip) {
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, 0, 10, 13, 4); g.fill();
  const b = Math.sin(T * 3 + x) * 1;
  g.fillStyle = '#3A2A1E'; g.fillRect(-8, 4, 3, 7); g.fillRect(5, 4, 3, 7);
  const la = [[-6, -2], [0, -5], [6, -2], [-3, 2], [4, 2]];
  g.fillStyle = '#5A4A3A'; for (const [ox, oy] of la) { ell(g, ox, oy + b, 8.4, 7.4); g.fill(); } // contorno
  g.fillStyle = '#F7F3EA'; for (const [ox, oy] of la) { ell(g, ox, oy + b, 7, 6); g.fill(); }
  g.fillStyle = '#3A2A1E'; ell(g, 11, -3 + b, 5, 4.5); g.fill();
  g.fillStyle = '#fff'; ell(g, 12.5, -4 + b, 1.2, 1.2); g.fill();
  if (lost) { g.font = '900 12px Nunito'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('béé!', 0, -17 + Math.sin(T * 5) * 2); g.fillStyle = '#fff'; g.fillText('béé!', 0, -17 + Math.sin(T * 5) * 2); }
  g.restore();
}

export function drawProjectile(g, p, T) {
  g.save(); g.translate(p.x, p.y);
  if (p.kind === 'pedra') {
    // rastro da pedra (velocidade) + pedra com contorno
    const v = Math.hypot(p.vx, p.vy) || 1, tx = -p.vx / v, ty = -p.vy / v;
    const gr = g.createLinearGradient(0, 0, tx * 26, ty * 26); gr.addColorStop(0, 'rgba(255,245,220,.55)'); gr.addColorStop(1, 'rgba(255,245,220,0)');
    g.strokeStyle = gr; g.lineWidth = p.r * 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(tx * 26, ty * 26); g.stroke();
    ell(g, 0, 0, p.r, p.r * 0.85); g.fillStyle = '#B4B0A8'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#3A3530'; g.stroke();
    g.fillStyle = '#E2DED6'; ell(g, -1.2, -1.2, p.r * 0.4, p.r * 0.32); g.fill();
  }
  else if (p.kind === 'luz' || p.kind === 'palavra') {
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, p.r * 2); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.4, p.kind === 'palavra' ? 'rgba(255,230,140,.9)' : 'rgba(255,210,80,.8)'); gr.addColorStop(1, 'rgba(255,180,40,0)');
    g.fillStyle = gr; ell(g, 0, 0, p.r * 2, p.r * 2); g.fill();
  } else if (p.kind === 'corte') {
    // risco rápido da adaga
    g.rotate(p.a); const k = 1 - p.life / p.max, R = p.big ? 34 : 26, d = p.flip ? -1 : 1;
    g.strokeStyle = 'rgba(255,250,235,' + (0.9 * (1 - k)) + ')'; g.lineWidth = p.big ? 5 : 3; g.lineCap = 'round';
    g.beginPath(); g.arc(4, 0, R, -0.7 * d, (-0.7 + 1.4 * Math.min(1, k * 2)) * d, d < 0); g.stroke();
  } else if (p.kind === 'chicote') {
    // o chicote se estica, estala na ponta e volta
    const k = 1 - p.life / p.max, ext = Math.sin(Math.min(1, k * 1.4) * Math.PI) * p.len;
    g.strokeStyle = '#6B4426'; g.lineWidth = p.big ? 3.5 : 2.5; g.lineCap = 'round';
    if (p.giro) {
      g.rotate(k * Math.PI * 2.2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(p.len * 0.5, 18, p.len, 0); g.stroke();
      g.strokeStyle = 'rgba(255,230,160,.35)'; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, p.len * 0.85, -0.8, 0); g.stroke();
    } else {
      g.rotate(p.a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ext * 0.5, Math.sin(k * 12) * 10, ext, 0); g.stroke();
      if (k > 0.25 && k < 0.6) { g.fillStyle = '#FFF2C6'; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('✦', ext, 4); }
    }
  } else if (p.kind === 'lanca') {
    g.rotate(Math.atan2(p.vy, p.vx));
    g.strokeStyle = '#7A5232'; g.lineWidth = 3; g.beginPath(); g.moveTo(-28, 0); g.lineTo(8, 0); g.stroke();
    g.fillStyle = '#E8E4DA'; g.strokeStyle = '#2A1A10'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 0); g.lineTo(7, -5); g.lineTo(7, 5); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,240,200,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-28, 0); g.lineTo(-48, 0); g.stroke();
  } else if (p.kind === 'som') {
    // ondas douradas que se espalham até o alcance, com notas musicais
    const k = 1 - p.life / p.max, alc = p.alc || 100, abre = p.roda ? Math.PI : (p.abre || 0.7), cor = p.cura ? '160,240,170' : '255,226,140';
    g.rotate(p.a); g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const kk = k - i * 0.16; if (kk <= 0) continue;
      const rad = 12 + kk * alc, al = Math.max(0, 1 - kk) * 0.85;
      g.strokeStyle = 'rgba(' + cor + ',' + al + ')'; g.lineWidth = 5 - i * 1.2;
      g.beginPath(); g.arc(0, 0, rad, -abre, abre); g.stroke();
    }
    if (k < 0.9) { g.fillStyle = 'rgba(' + cor + ',' + (1 - k) + ')'; g.font = '900 13px Nunito'; g.textAlign = 'center';
      const n = p.roda ? 6 : 3; for (let i = 0; i < n; i++) { const an = p.roda ? i * TAU / n : (i - 1) * abre * 0.6, rr2 = 18 + k * alc * 0.8; g.fillText(i % 2 ? '♫' : '♪', Math.cos(an) * rr2, Math.sin(an) * rr2 - k * 8); } }
  } else {
    // projéteis inimigos
    const c = p.color || '#B98AF0';
    g.shadowColor = c; g.shadowBlur = 10; g.fillStyle = c; ell(g, 0, 0, p.r, p.r); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, -p.r * 0.3, -p.r * 0.3, p.r * 0.35, p.r * 0.35); g.fill();
    if (p.label) { g.fillStyle = '#fff'; g.font = '900 9px Nunito'; g.textAlign = 'center'; g.fillText(p.label, 0, -p.r - 4); }
  }
  g.restore();
}
