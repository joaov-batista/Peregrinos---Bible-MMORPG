// Desenho procedural de personagens, inimigos e chefes (tudo em canvas, sem imagens).
import { TAU, rr, ell, rand } from '../util.js';

/* ---------- Pessoas (jogadores e NPCs) ---------- */
// Formatos de corpo: w = largura do tronco, leg = altura das pernas
const BODY = {
  medio: { w: 1, leg: 1 }, magro: { w: 0.8, leg: 1.12 }, forte: { w: 1.2, leg: 1.05 },
  robusto: { w: 1.34, leg: 0.9 }, baixo: { w: 0.96, leg: 0.6 }, alto: { w: 0.94, leg: 1.4 }
};
// st: { t, fx, fy, walk, moving, weapon, shield, guard, armor, helmet, alpha }
// Estilo "livro ilustrado": toda forma tem contorno escuro (OL) e um pouco de luz e sombra.
const OL = '#2A1A10';
export function drawPerson(g, x, y, s, L, st) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const out = (w = 1.3) => { g.lineWidth = w; g.strokeStyle = OL; g.stroke(); };
  const fo = (c, w) => { g.fillStyle = c; g.fill(); out(w); };
  const t = st.t || 0, fx = st.fx || 0, fy = st.fy == null ? 1 : st.fy, back = fy < -0.55;
  const B = BODY[L.body] || BODY.medio, w = B.w, lx = 0.55 + 0.45 * w;
  const tunic = L.tunic || '#3B4CCA', tunicD = shade(tunic, -0.28), skin = L.skin || '#C68B59', hair = L.hair || '#3A2314';
  g.fillStyle = 'rgba(0,0,0,.26)'; ell(g, 0, 13, 12.5 * lx, 4.5); g.fill();
  // pernas mais longas/curtas: o corpo sobe ou desce
  if (B.leg !== 1) g.translate(0, -(B.leg - 1) * 10);
  if (L.anjo) {
    const f = Math.sin(t * 4) * 0.25;
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * 6, -6); g.rotate(sd * (0.5 + f));
      ell(g, sd * 11, -4, 13, 6); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.lineWidth = 1.1; g.strokeStyle = 'rgba(160,140,90,.8)'; g.stroke();
      g.strokeStyle = 'rgba(200,185,140,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sd * 4, -4); g.lineTo(sd * 19, -5); g.moveTo(sd * 6, -1); g.lineTo(sd * 18, -1); g.stroke();
      g.restore();
    }
  }
  // pernas e sandálias (ou botas do equipamento)
  const lw = st.moving ? Math.sin(st.walk * 14) * 3.5 : 0;
  const bob = st.moving ? -Math.abs(Math.sin(st.walk * 14)) * 2 : Math.sin(t * 2.2) * 0.6;
  const lh = 10 * B.leg;
  for (const [sx, d] of [[-6 * lx, lw], [6 * lx - 5, -lw]]) {
    rr(g, sx, 13 - lh, 5, lh + d, 2.2); fo(skin, 1.1);
    const boot = st.boots; rr(g, sx - 0.4, 13 + d - (boot ? 6 : 3), 5.8, boot ? 6 : 3, 1.5); fo(boot || '#7A4E2A', 1.1);
    if (!boot) { g.strokeStyle = '#7A4E2A'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + 0.5, 13 + d - 5.5); g.lineTo(sx + 4.5, 13 + d - 3.5); g.stroke(); }
  }
  g.translate(0, bob);
  const cape = L.cape && L.cape !== 'none' ? L.cape : null;
  const drawCape = () => {
    g.beginPath(); g.moveTo(-9 * w, -10); g.lineTo(9 * w, -10); g.quadraticCurveTo(12 * w - fx * 3, 2, 11 * w - fx * 3, 10.5); g.lineTo(-11 * w - fx * 3, 10.5); g.quadraticCurveTo(-12 * w - fx * 3, 2, -9 * w, -10); g.closePath(); fo(cape);
    g.strokeStyle = shade(cape, -0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(-4 * w - fx * 2, -4); g.lineTo(-5 * w - fx * 3, 9); g.moveTo(4 * w - fx * 2, -4); g.lineTo(5 * w - fx * 3, 9); g.stroke();
  };
  if (cape && !back) drawCape();
  const style = L.style || 'curto';
  if (style === 'veu') { g.beginPath(); g.arc(0, -19, 11.5, Math.PI, 0); g.lineTo(12.5, -3); g.lineTo(-12.5, -3); g.closePath(); fo('#EADBC8'); }
  if (!L.anjo) {
    // cabelo que fica atrás do corpo/cabeça
    g.fillStyle = hair;
    if (style === 'longo') { rr(g, -10.5, -22, 21, 21, 6); fo(hair); }
    else if (style === 'black') { ell(g, 0, -21, 14, 13); fo(hair); }
    else if (style === 'trancas') { for (const sd of [-1, 1]) { rr(g, sd * 9.5 - 2.2, -20, 4.4, 19, 2.2); fo(hair, 1.1); ell(g, sd * 9.5, 0, 2.8, 2.8); fo(shade(hair, 0.25), 1.1); } }
    else if (style === 'rabo' && !back) { g.beginPath(); g.ellipse(-fx * 8, -14, 3.6, 8, fx * 0.4, 0, TAU); fo(hair); }
  }
  // braços (mangas) atrás do corpo quando ele está de costas
  const arms = () => {
    for (const sd of [-1, 1]) {
      const hx = sd * 11.5 * w, hy = -3 + sd * lw * 0.4;
      g.beginPath(); g.moveTo(sd * 8 * w, -8.5); g.quadraticCurveTo(sd * 12 * w, -7, hx, hy - 1);
      g.lineWidth = 6.8; g.strokeStyle = OL; g.stroke(); g.lineWidth = 4.4; g.strokeStyle = shade(tunic, -0.1); g.stroke();
      ell(g, hx, hy, 3.1, 3.1); fo(skin, 1.1);
    }
  };
  if (back) arms();
  // corpo: túnica com gola, listras (clavi), barra mais escura e cinto com fivela
  rr(g, -10 * w, -11, 20 * w, 19, 7); fo(tunic);
  g.save(); rr(g, -10 * w, -11, 20 * w, 19, 7); g.clip();
  g.fillStyle = tunicD; g.fillRect(-10 * w, 2, 20 * w, 7);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-9 * w, -10, 4 * w, 10);
  if (!back) {
    g.fillStyle = shade(tunic, -0.35); g.fillRect(-4.6 * w, -10, 1.6, 18); g.fillRect(3 * w, -10, 1.6, 18);
    g.beginPath(); g.moveTo(-3.6, -11); g.lineTo(0, -6.5); g.lineTo(3.6, -11); g.closePath(); g.fillStyle = skin; g.fill(); out(1);
  }
  g.restore();
  rr(g, -10 * w, -11, 20 * w, 19, 7); out();
  if (st.armor) {
    rr(g, -9 * w, -10.5, 18 * w, 11.5, 5); fo(st.armor);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-6.5 * w, -9, 3.5, 8);
    g.strokeStyle = shade(st.armor, -0.35); g.lineWidth = 0.9; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-8 * w, -6.5 + i * 3.6); g.lineTo(8 * w, -6.5 + i * 3.6); g.stroke(); }
  }
  g.fillStyle = st.belt || '#C9973C'; g.fillRect(-10 * w, -1.2, 20 * w, 3.2); g.strokeStyle = OL; g.lineWidth = 0.9; g.strokeRect(-10 * w, -1.2, 20 * w, 3.2);
  if (!back) { rr(g, -2, -1.8, 4, 4.4, 1); fo('#F2D27A', 0.9); }
  if (cape && back) drawCape();
  if (!back) arms();
  // orelhas e cabeça
  if (!back && style !== 'veu') for (const sd of [-1, 1]) { ell(g, sd * 9.3, -17, 2.2, 2.8); fo(skin, 1.1); }
  ell(g, 0, -18, 9.5, 9.5); fo(skin);
  g.fillStyle = 'rgba(255,255,255,.16)'; ell(g, -3.5, -22.5, 4, 2.6); g.fill();
  if (back && style !== 'veu' && style !== 'careca') {
    ell(g, 0, -18.5, 9.8, 9.6); fo(hair);
    if (style === 'rabo') { g.beginPath(); g.ellipse(0, -10, 3.4, 7.5, 0, 0, TAU); fo(hair); }
    if (style === 'cacheado' || style === 'black') for (let i = 0; i < 7; i++) { const a = Math.PI * (0.9 + i * 0.2); ell(g, Math.cos(a) * 9, -18 + Math.sin(a) * 9, 3.6, 3.6); fo(hair, 1.1); }
  }
  else if (style === 'careca') { ell(g, -8.5, -16, 2.6, 4.5); fo(hair, 1); ell(g, 8.5, -16, 2.6, 4.5); fo(hair, 1); g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, -2, -25, 4, 1.8); g.fill(); }
  else if (style === 'turbante') {
    const tc = shade(tunic, 0.45); ell(g, 0, -24, 11.2, 6.8); fo(tc);
    g.strokeStyle = shade(tc, -0.25); g.lineWidth = 1; g.beginPath(); g.moveTo(-9, -25); g.quadraticCurveTo(0, -20, 9, -26); g.stroke();
  }
  else if (style === 'cacheado' || style === 'black') {
    // cachos em volta do topo da cabeça
    const R = style === 'black' ? 10.5 : 9.2, c = style === 'black' ? 4.4 : 3.5;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.95 + i * 0.1375); ell(g, Math.cos(a) * R, -19 + Math.sin(a) * R, c, c); fo(hair, 1.1); }
    ell(g, 0, -25, 7, 4); g.fillStyle = hair; g.fill();
  }
  else if (style === 'espetado') {
    g.beginPath(); g.moveTo(-10, -18);
    for (let i = 0; i <= 5; i++) { const xx = -10 + i * 4; g.lineTo(xx, -19 - (i % 2 ? 10 : 5) - (i === 2 || i === 3 ? 2 : 0)); }
    g.lineTo(10, -18); g.quadraticCurveTo(0, -23 + fy * 2, -10, -18); g.closePath(); fo(hair);
  }
  else if (style === 'franja') {
    g.beginPath(); g.arc(0, -19, 10, Math.PI, 0); g.lineTo(10, -16); g.quadraticCurveTo(2 + fx * 3, -20, -10, -14); g.closePath(); fo(hair);
  }
  else if (style !== 'veu') {
    g.beginPath(); g.arc(0, -19, 10, Math.PI, 0); g.quadraticCurveTo(0, -24 + fy * 2, -10, -19); g.closePath(); fo(hair);
    if (style === 'coque') { ell(g, 0, -29, 5, 4.5); fo(hair); }
  }
  // brilho no cabelo
  if (!back && !['careca', 'veu', 'turbante'].includes(style)) { g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -19, 7, Math.PI * 1.2, Math.PI * 1.45); g.stroke(); }
  if (style === 'veu') { g.beginPath(); g.arc(0, -19, 11, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(0, -22, -10.6, -21); g.closePath(); fo('#EADBC8'); }
  if (st.helmet) {
    g.beginPath(); g.arc(0, -20, 10.8, Math.PI, 0); g.closePath(); fo(st.helmet);
    rr(g, -11.5, -21, 23, 2.6, 1); fo(shade(st.helmet, -0.2), 1);
    rr(g, -1.6, -32, 3.2, 6, 1.2); fo(shade(st.helmet, 0.2), 1);
    g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, -4, -26, 3, 1.6); g.fill();
  }
  if (!back) {
    // rosto: olhos com brilho, sobrancelhas, boca e bochechas
    const ex = fx * 3, ey = -17 + fy * 1.5, px = fx * 0.6, py = fy * 0.4;
    for (const sd of [-1, 1]) {
      ell(g, ex + sd * 3.6, ey, 2, 2.4); g.fillStyle = '#FFFFFF'; g.fill(); out(0.9);
      ell(g, ex + sd * 3.6 + px, ey + py, 1.35, 1.75); g.fillStyle = '#24160C'; g.fill();
      ell(g, ex + sd * 3.6 + px - 0.5, ey + py - 0.7, 0.55, 0.55); g.fillStyle = '#FFFFFF'; g.fill();
      g.strokeStyle = shade(hair, -0.15); g.lineWidth = 1.1; g.beginPath(); g.moveTo(ex + sd * 2.2, ey - 3.4); g.lineTo(ex + sd * 5, ey - 3.8 + (L.beard ? 0.4 : 0)); g.stroke();
    }
    g.fillStyle = 'rgba(255,110,110,.28)'; ell(g, ex - 6, ey + 3, 2, 1.2); g.fill(); ell(g, ex + 6, ey + 3, 2, 1.2); g.fill();
    if (L.beard) { g.beginPath(); g.arc(fx * 2, -15, 8, 0.12 * Math.PI, 0.88 * Math.PI); g.closePath(); fo(hair, 1.1); }
    else { g.strokeStyle = shade(skin, -0.45); g.lineWidth = 0.9; g.beginPath(); g.arc(ex, ey + 3.2, 1.6, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  }
  if (L.anjo) {
    g.strokeStyle = '#FFD86B'; g.lineWidth = 2.2; g.shadowColor = '#FFD86B'; g.shadowBlur = 10;
    ell(g, 0, -31 + Math.sin(t * 3), 8, 2.6); g.stroke(); g.shadowBlur = 0;
  }
  // escudo erguido
  if (st.guard) {
    const sx = fx * 13, sy = -4 + fy * 8, sc = st.shieldColor || '#8A5A35';
    rr(g, sx - 9, sy - 11, 18, 22, 7); g.fillStyle = sc; g.fill(); g.lineWidth = 3.2; g.strokeStyle = OL; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = '#F2C14E'; g.stroke();
    ell(g, sx, sy, 3, 3); fo('#F2C14E', 1);
    if (st.guardPerfect) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; ell(g, sx, sy, 16, 18); g.stroke(); }
  }
  g.restore();
}

export function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  const f = c => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return '#' + ((1 << 24) + (f(r) << 16) + (f(gg) << 8) + f(b)).toString(16).slice(1);
}

/* ---------- Armas na mão ---------- */
export function drawWeapon(g, kind, len, glow, legendary) {
  g.save();
  if (glow) { g.shadowColor = legendary ? '#FFF2B0' : '#FFE9A0'; g.shadowBlur = glow; }
  g.lineCap = 'round';
  if (kind === 'espada') {
    g.strokeStyle = legendary ? '#FFFDF2' : '#E8E4DA'; g.lineWidth = legendary ? 5 : 4;
    g.beginPath(); g.moveTo(9, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#E9B949'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(9, -6); g.lineTo(9, 6); g.stroke();
    g.strokeStyle = '#6B3F08'; g.lineWidth = 3; g.beginPath(); g.moveTo(3, 0); g.lineTo(8, 0); g.stroke();
  } else if (kind === 'funda') {
    g.strokeStyle = '#8A5A35'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(len * 0.5, 8, len * 0.7, 0); g.stroke();
    g.fillStyle = '#9A958C'; ell(g, len * 0.7, 0, 3.5, 3.5); g.fill();
  } else if (kind === 'adaga') {
    g.strokeStyle = '#E8E4DA'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#B8791A'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, -3.5); g.lineTo(6, 3.5); g.stroke();
    g.strokeStyle = '#4A2E14'; g.lineWidth = 3; g.beginPath(); g.moveTo(1, 0); g.lineTo(5, 0); g.stroke();
  } else if (kind === 'lanca') {
    g.strokeStyle = '#7A5232'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#D9D6CE'; g.strokeStyle = '#2A1A10'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(len + 11, 0); g.lineTo(len - 1, -4); g.lineTo(len - 1, 4); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'chicote') {
    g.strokeStyle = '#5A3820'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(8, 0); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#8A5A35'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(len * 0.8, 9, len * 0.55, 14); g.quadraticCurveTo(len * 0.2, 16, len * 0.4, 6); g.stroke();
  } else if (kind === 'cajado') {
    g.strokeStyle = '#7A5232'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-6, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#FFE38A'; g.shadowColor = '#FFD23F'; g.shadowBlur = 10; ell(g, len + 2, 0, 4, 4); g.fill();
  } else {
    g.fillStyle = '#E9D8A6'; g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(len * 0.6, -6, len, -9); g.lineTo(len + 2, 7); g.quadraticCurveTo(len * 0.6, 4, 4, 3); g.closePath(); g.fill();
    g.strokeStyle = '#B8791A'; g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
}

/* ---------- Inimigos comuns ---------- */
export function drawEnemy(g, e, d, T, px, py) {
  const t = T + e.ph, r = e.r;
  const w = Math.sin(t * 6) * 0.08;
  g.save(); g.translate(e.x, e.y);
  g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, 0, r * 0.85, r, r * 0.35); g.fill();
  const hop = e.type === 'distracao' ? -Math.abs(Math.sin(t * 10)) * 5 : 0;
  if (e.telegraph > 0) { g.strokeStyle = 'rgba(255,60,60,' + (0.4 + 0.4 * Math.sin(T * 30)) + ')'; g.lineWidth = 3; ell(g, 0, 0, r + 6, r + 6); g.stroke(); }
  g.translate(0, hop - 2); g.scale(1 + w, 1 - w);
  if (e.type === 'duvida' || e.type === 'medo' || e.type === 'vaidade') { g.shadowColor = d.cor; g.shadowBlur = 14; }
  if (e.type === 'medo') g.globalAlpha *= 0.65 + 0.35 * Math.sin(t * 5);
  g.beginPath(); g.moveTo(-r, 0); g.arc(0, 0, r, Math.PI, 0); g.lineTo(r, r * 0.7);
  for (let i = 0; i < 4; i++) { const x1 = r - (i + 0.5) * (r / 2), x2 = r - (i + 1) * (r / 2); g.quadraticCurveTo(x1, r * 0.7 + r * 0.3 * (i % 2 ? -0.4 : 1) * (0.7 + 0.3 * Math.sin(t * 8 + i)), x2, r * 0.7); }
  g.closePath();
  if (e.flash > 0) g.fillStyle = '#FFFFFF';
  else { const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, d.cor); gr.addColorStop(1, d.cor2); g.fillStyle = gr; }
  g.fill(); g.shadowBlur = 0;
  g.lineJoin = 'round'; g.lineWidth = 2; g.strokeStyle = shade(d.cor2, -0.6); g.stroke();
  // brilho em cima
  g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, -r * 0.35, -r * 0.62, r * 0.32, r * 0.16); g.fill();
  // chifrinhos de demônio
  g.fillStyle = shade(d.cor2, -0.3);
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * r * 0.35, -r * 0.85); g.lineTo(sd * r * 0.62, -r * 1.3); g.lineTo(sd * r * 0.7, -r * 0.7); g.closePath(); g.fill(); g.lineWidth = 1.4; g.stroke(); }
  const dx = px - e.x, dy = py - e.y, dl = Math.hypot(dx, dy) || 1, lx = dx / dl * 2, ly = dy / dl * 2;
  g.fillStyle = '#fff'; ell(g, -r * 0.35, -r * 0.15, r * 0.26, r * 0.3); g.fill(); ell(g, r * 0.35, -r * 0.15, r * 0.26, r * 0.3); g.fill();
  g.fillStyle = e.type === 'ira' ? '#C0141E' : '#1A1008';
  ell(g, -r * 0.35 + lx, -r * 0.12 + ly, r * 0.12, r * 0.14); g.fill(); ell(g, r * 0.35 + lx, -r * 0.12 + ly, r * 0.12, r * 0.14); g.fill();
  g.strokeStyle = '#1A1008'; g.lineWidth = 1.8;
  if (e.type === 'preguica') {
    g.fillStyle = d.cor; g.fillRect(-r * 0.65, -r * 0.5, r * 1.3, r * 0.38);
    g.fillStyle = '#fff'; g.font = '900 9px Nunito, sans-serif'; g.textAlign = 'left';
    const zz = (t * 0.8) % 1; g.globalAlpha = 1 - zz; g.fillText('z', r * 0.6 + zz * 6, -r - zz * 12); g.globalAlpha = 1;
  } else {
    g.beginPath(); g.moveTo(-r * 0.6, -r * 0.55); g.lineTo(-r * 0.15, -r * 0.38); g.moveTo(r * 0.6, -r * 0.55); g.lineTo(r * 0.15, -r * 0.38); g.stroke();
  }
  if (e.type === 'distracao') {
    g.strokeStyle = d.cor2; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -r - 8); g.stroke();
    g.fillStyle = '#222'; rr(g, -6, -r - 20, 12, 13, 2); g.fill();
    g.fillStyle = ['#5CE1E6', '#FFD23F', '#FF6B9A'][Math.floor(t * 4) % 3]; g.fillRect(-4.5, -r - 18.5, 9, 9);
  } else if (e.type === 'desanimo') {
    g.fillStyle = '#6C7391'; ell(g, -4, -r - 9, 7, 5); g.fill(); ell(g, 4, -r - 10, 8, 6); g.fill();
    g.fillStyle = '#9CC9FF'; for (let k = 0; k < 3; k++) { const dd = (t * 1.5 + k / 3) % 1; g.fillRect(-6 + k * 6, -r - 6 + dd * 10, 1.6, 3); }
  } else if (e.type === 'duvida') {
    g.fillStyle = '#E6DBFF'; g.font = '900 14px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('?', Math.sin(t * 3) * 3, -r - 8);
  } else if (e.type === 'ganancia') {
    g.fillStyle = '#FFE38A'; g.font = '900 12px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('$', 0, r * 0.45);
  } else if (e.type === 'ira') {
    g.fillStyle = 'rgba(255,140,40,.8)'; for (let k = 0; k < 3; k++) { ell(g, -6 + k * 6, -r - 3 - Math.abs(Math.sin(t * 9 + k)) * 6, 2.5, 4); g.fill(); }
  } else if (e.type === 'orgulho') {
    g.fillStyle = '#F2C14E'; g.beginPath(); g.moveTo(-10, -r + 2); g.lineTo(-10, -r - 9); g.lineTo(-5, -r - 3); g.lineTo(0, -r - 11); g.lineTo(5, -r - 3); g.lineTo(10, -r - 9); g.lineTo(10, -r + 2); g.closePath(); g.fill();
  } else if (e.type === 'inveja') {
    g.strokeStyle = '#1A1008'; g.beginPath(); g.moveTo(-r * 0.4, r * 0.35); g.quadraticCurveTo(0, r * 0.15, r * 0.4, r * 0.35); g.stroke();
  } else if (e.type === 'vaidade') {
    g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, -5, -r - 18, 10, 13, 5); g.fill(); g.strokeStyle = '#D9A93A'; g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
}

/* ---------- Chefes ---------- */
export function drawBoss(g, b, T) {
  const s = b.r / 40, hit = b.flash;
  g.save(); g.translate(b.x, b.y);
  if (b.alpha != null) g.globalAlpha = b.alpha;
  // as ilusões da Mentira não têm sombra
  if (!b.clone) { g.fillStyle = 'rgba(0,0,0,.28)'; ell(g, 0, b.r * 0.9, b.r * 1.1, b.r * 0.35); g.fill(); }
  if (hit > 0) g.translate(rand(-3, 3), rand(-2, 2));
  // "desenho" no bestiário reaproveita o desenho de outro chefe; sem desenho próprio, usa o genérico
  const fn = BOSS_DRAW[b.d?.desenho || b.id] || BOSS_DRAW.generico;
  fn(g, b, s, T);
  if (hit > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,' + Math.min(0.7, hit * 4) + ')'; ell(g, 0, -b.r * 0.3, b.r, b.r * 1.1); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}

function eyes(g, x, y, r, col = '#FFE066') {
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 12;
  g.beginPath(); g.moveTo(x - r * 1.6, y - r * 0.6); g.lineTo(x - r * 0.3, y); g.lineTo(x - r * 1.5, y + r * 0.4); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + r * 1.6, y - r * 0.6); g.lineTo(x + r * 0.3, y); g.lineTo(x + r * 1.5, y + r * 0.4); g.closePath(); g.fill();
  g.shadowBlur = 0;
}

const BOSS_DRAW = {
  // vulto com as cores do chefe (cor, cor2), olhos e um símbolo no peito ("simbolo" no bestiário)
  generico(g, b, s, T) {
    const d = b.d || {}, bob = Math.sin(T * 2.6) * 3;
    g.scale(s, s);
    g.fillStyle = d.cor2 || '#333'; ell(g, 0, 6 + bob, 36, 36); g.fill();
    g.fillStyle = d.cor || '#888'; ell(g, 0, 2 + bob, 31, 32); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; ell(g, -10, -12 + bob, 12, 9); g.fill();
    eyes(g, 0, -10 + bob, 7);
    if (d.simbolo) { g.font = '22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d.simbolo, 0, 16 + bob); }
  },
  // gigante de armadura de bronze (1Sm 17:5-7); sem o capacete, a testa brilha como alvo
  golias(g, b, s, T) {
    const S = 2.4 * s, a = b.lancaA ?? 0, fx = Math.cos(a) >= 0 ? 1 : -1, exposto = b.exposto > 0;
    // lança: recolhida enquanto mira, esticada no golpe
    const hx = fx * 12 * S * 0.5, hy = -6 * S, puxa = b.lanca === 'mira' ? -26 : b.lanca === 'golpe' ? 22 : -10, len = 96;
    const x0 = hx + Math.cos(a) * puxa, y0 = hy + Math.sin(a) * puxa, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    const atras = Math.sin(a) < -0.2;
    const lanca = () => {
      g.strokeStyle = '#6B4A2F'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.fillStyle = '#C9CDD6'; g.beginPath(); g.moveTo(x1 + Math.cos(a) * 18, y1 + Math.sin(a) * 18);
      g.lineTo(x1 + Math.cos(a + 1.9) * 7, y1 + Math.sin(a + 1.9) * 7); g.lineTo(x1 + Math.cos(a - 1.9) * 7, y1 + Math.sin(a - 1.9) * 7); g.closePath(); g.fill();
    };
    if (atras) lanca();
    drawPerson(g, 0, 0, S, { skin: '#C68B59', hair: '#1C120A', tunic: '#5A4630', cape: 'none', style: 'curto', body: 'robusto', beard: true },
      { t: T, fx, fy: 1, walk: T * 0.6, moving: !b.act, armor: '#B08D57', helmet: exposto ? null : '#B08D57' });
    if (!atras) lanca();
    if (exposto) {
      const pulse = 0.6 + 0.4 * Math.sin(T * 10), cy = -22 * S;
      g.strokeStyle = 'rgba(255,90,70,' + pulse + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, cy, 9 + pulse * 3, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,227,138,' + pulse + ')'; g.beginPath(); g.arc(0, cy, 3.5, 0, TAU); g.fill();
      // o capacete caído no chão
      g.fillStyle = '#B08D57'; g.beginPath(); g.arc(-fx * 34, 30, 12, Math.PI, 0); g.closePath(); g.fill();
    }
  },
  mamom(g, b, s, T) {
    g.scale(s, s);
    const bob = Math.sin(T * 3) * 3;
    g.fillStyle = '#8A5A0A'; ell(g, 0, 8 + bob, 38, 34); g.fill();
    g.fillStyle = '#C9922A'; ell(g, 0, 4 + bob, 34, 30); g.fill();
    g.fillStyle = '#6B3F08'; rr(g, -14, -34 + bob, 28, 12, 5); g.fill();
    g.fillStyle = '#F2C14E'; g.font = '900 34px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 14 + bob);
    eyes(g, 0, -6 + bob, 6, '#FFF3B0');
    g.fillStyle = '#5A2A0A'; g.beginPath(); g.arc(0, 2 + bob, 10, 0.1 * Math.PI, 0.9 * Math.PI); g.fill();
    for (let i = 0; i < 6; i++) { const a = T * 2 + i * TAU / 6; g.fillStyle = '#FFD23F'; ell(g, Math.cos(a) * 52, Math.sin(a) * 18 - 4, 6, 6); g.fill(); g.fillStyle = '#B8791A'; ell(g, Math.cos(a) * 52, Math.sin(a) * 18 - 4, 3, 3); g.fill(); }
  },
  procrastinacao(g, b, s, T) {
    g.scale(s, s);
    // uma lesma-relógio sonolenta
    g.fillStyle = '#3C5A66'; ell(g, 0, 18, 46, 20); g.fill();
    g.fillStyle = '#7FA7B5'; ell(g, 0, 14, 42, 16); g.fill();
    g.fillStyle = '#E9E3D6'; ell(g, 6, -12, 30, 30); g.fill();
    g.strokeStyle = '#3C5A66'; g.lineWidth = 5; ell(g, 6, -12, 30, 30); g.stroke();
    g.strokeStyle = '#2A2016'; g.lineWidth = 3; g.lineCap = 'round';
    const a1 = T * 0.4, a2 = T * 4;
    g.beginPath(); g.moveTo(6, -12); g.lineTo(6 + Math.cos(a1) * 14, -12 + Math.sin(a1) * 14); g.stroke();
    g.beginPath(); g.moveTo(6, -12); g.lineTo(6 + Math.cos(a2) * 22, -12 + Math.sin(a2) * 22); g.stroke();
    g.fillStyle = '#7FA7B5'; ell(g, -34, 2, 14, 12); g.fill();
    g.fillStyle = '#1A1008'; g.fillRect(-42, -2, 7, 2); g.fillRect(-32, -2, 7, 2);
    g.fillStyle = '#fff'; g.font = '900 13px Nunito'; g.textAlign = 'center'; const zz = (T * 0.6) % 1; g.globalAlpha *= 1 - zz; g.fillText('amanhã…', -40, -18 - zz * 20); g.globalAlpha = 1;
  },
  mentira(g, b, s, T) {
    g.scale(s, s);
    const fl = Math.sin(T * 4) * 3;
    g.fillStyle = '#4A1C5E'; g.beginPath(); g.moveTo(-30, -10); g.quadraticCurveTo(-36, 40, -20, 46 + fl); g.lineTo(0, 36); g.lineTo(20, 46 - fl); g.quadraticCurveTo(36, 40, 30, -10); g.closePath(); g.fill();
    g.fillStyle = '#9B59B6'; ell(g, 0, -18, 26, 26); g.fill();
    // máscara sorridente
    g.fillStyle = '#F4EEE2'; g.beginPath(); g.moveTo(-20, -30); g.quadraticCurveTo(0, -40, 20, -30); g.quadraticCurveTo(22, -4, 0, 2); g.quadraticCurveTo(-22, -4, -20, -30); g.fill();
    g.fillStyle = '#1A1008'; ell(g, -8, -22, 4, 2.5); g.fill(); ell(g, 8, -22, 4, 2.5); g.fill();
    g.strokeStyle = '#C0392B'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -14, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    // língua bifurcada
    g.strokeStyle = '#E0483A'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 6 + fl); g.lineTo(-4, 11 + fl); g.moveTo(0, 6 + fl); g.lineTo(4, 11 + fl); g.stroke();
  },
  imoralidade(g, b, s, T) {
    g.scale(s, s);
    // serpente enrolada com muitas máscaras
    for (let i = 4; i >= 0; i--) { g.fillStyle = i % 2 ? '#8E1F48' : '#D2416E'; ell(g, Math.sin(T * 2 + i) * 6, 30 - i * 11, 40 - i * 5, 14); g.fill(); }
    g.fillStyle = '#D2416E'; ell(g, 0, -34, 18, 16); g.fill();
    eyes(g, 0, -36, 4, '#FFB3D1');
    g.strokeStyle = '#5E1230'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -16); g.lineTo(-4, -12); g.moveTo(0, -16); g.lineTo(4, -12); g.stroke();
    for (let i = 0; i < 3; i++) { const a = T * 1.5 + i * TAU / 3; g.fillStyle = 'rgba(255,214,230,.85)'; ell(g, Math.cos(a) * 44, Math.sin(a) * 14 - 10, 7, 9); g.fill(); g.fillStyle = '#5E1230'; ell(g, Math.cos(a) * 44 - 2, Math.sin(a) * 14 - 12, 1.5, 1); g.fill(); ell(g, Math.cos(a) * 44 + 2, Math.sin(a) * 14 - 12, 1.5, 1); g.fill(); }
  },
  satanas(g, b, s, T) {
    g.scale(s * 0.9, s * 0.9);
    g.translate(0, Math.sin(T * 1.6) * 4);
    const fl = Math.sin(T * 3) * 0.15;
    g.fillStyle = '#2A0F2E'; g.strokeStyle = '#6B1E4E'; g.lineWidth = 2.5;
    for (const sd of [-1, 1]) {
      g.save(); g.scale(sd, 1); g.translate(14, -18); g.rotate(fl);
      g.beginPath(); g.moveTo(0, -6); g.lineTo(44, -56); g.lineTo(80, -30); g.lineTo(64, -22); g.lineTo(72, 2); g.lineTo(52, -6); g.lineTo(48, 16); g.lineTo(30, 4); g.lineTo(10, 12); g.closePath();
      g.fill(); g.stroke(); g.restore();
    }
    const gr = g.createLinearGradient(0, -22, 0, 60); gr.addColorStop(0, '#5A1444'); gr.addColorStop(1, '#14060F');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-22, -22); g.lineTo(22, -22); g.lineTo(38, 55);
    const pts = [28, 46, 18, 58, 8, 46, -2, 60, -12, 46, -22, 58, -30, 46, -38, 55];
    for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1] + Math.sin(T * 5 + i) * 2);
    g.closePath(); g.fill();
    g.fillStyle = '#E8D3B0';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 12, -50); g.quadraticCurveTo(sd * 32, -62, sd * 26, -84); g.quadraticCurveTo(sd * 22, -64, sd * 3, -54); g.closePath(); g.fill(); }
    g.fillStyle = '#8E1B2E'; ell(g, 0, -36, 20, 19); g.fill();
    eyes(g, 0, -38, 7);
    g.strokeStyle = '#2A0508'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-9, -26); g.quadraticCurveTo(0, -20 + (b.talk ? Math.abs(Math.sin(T * 18)) * 4 : 0), 9, -26); g.stroke();
  },
  behemote(g, b, s, T) {
    g.scale(s, s);
    const st = Math.sin(T * 4) * 2;
    g.fillStyle = '#3D3325';
    for (const lx of [-26, -10, 12, 28]) rr(g, lx - 7, 14 + (lx % 2 ? st : -st), 14, 24, 5), g.fill();
    g.fillStyle = '#7A6A4F'; ell(g, 0, 0, 48, 30); g.fill();
    g.fillStyle = '#9A8A6C'; ell(g, -6, -10, 34, 14); g.fill();
    g.fillStyle = '#6A5A40'; ell(g, -40, -10, 18, 16); g.fill();
    g.fillStyle = '#E8D3B0'; g.beginPath(); g.moveTo(-50, -18); g.quadraticCurveTo(-64, -40, -52, -50); g.quadraticCurveTo(-56, -30, -44, -22); g.fill();
    eyes(g, -42, -14, 3, '#FF8A3C');
    g.strokeStyle = '#3D3325'; g.lineWidth = 6; g.beginPath(); g.moveTo(44, -4); g.quadraticCurveTo(64, -18 + st * 3, 60, -36); g.stroke();
  },
  leviata(g, b, s, T) {
    g.scale(s, s);
    if (b.submerged) { g.globalAlpha *= 0.35; }
    for (let i = 5; i >= 0; i--) { g.fillStyle = i % 2 ? '#0B2A36' : '#1F6F8B'; ell(g, 40 - i * 14 + Math.sin(T * 3 + i) * 4, 20 + Math.cos(T * 2 + i) * 6, 18 - i, 12 - i * 0.5); g.fill(); }
    g.fillStyle = '#1F6F8B'; g.beginPath(); g.moveTo(-30, -10); g.quadraticCurveTo(-10, -50, 20, -38); g.quadraticCurveTo(30, -20, 10, 10); g.closePath(); g.fill();
    g.fillStyle = '#5ED1E8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-14 + i * 9, -34 + i * 3); g.lineTo(-10 + i * 9, -48 + i * 3); g.lineTo(-6 + i * 9, -32 + i * 3); g.fill(); }
    eyes(g, -4, -26, 4, '#FF5A3C');
    g.fillStyle = '#F4F1EA'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-26 + i * 6, -6); g.lineTo(-23 + i * 6, 2); g.lineTo(-20 + i * 6, -6); g.fill(); }
    // ondas
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); for (let x = -60; x <= 60; x += 6) g.lineTo(x, 34 + Math.sin(T * 4 + x * 0.1) * 3); g.stroke();
  },
  pecado(g, b, s, T) {
    g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.85)';
    g.beginPath(); g.moveTo(-18, 30); g.quadraticCurveTo(-22, -10, 0, -40); g.quadraticCurveTo(22, -10, 18, 30);
    for (let x = 18; x >= -18; x -= 6) g.lineTo(x, 30 + Math.sin(T * 6 + x) * 4);
    g.closePath(); g.fill();
    g.fillStyle = '#FF2E4A'; g.shadowColor = '#FF2E4A'; g.shadowBlur = 16; ell(g, -5, -18, 2.4, 1.4); g.fill(); ell(g, 5, -18, 2.4, 1.4); g.fill(); g.shadowBlur = 0;
  }
};

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
  if (p.kind === 'pedra') { g.fillStyle = '#B4B0A8'; ell(g, 0, 0, 4.5, 4); g.fill(); g.fillStyle = '#7C7870'; ell(g, 1, 1, 2, 2); g.fill(); }
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
    g.rotate(p.a); g.strokeStyle = 'rgba(255,240,200,' + Math.max(0, p.life / p.max) + ')'; g.lineWidth = 3;
    const rad = 14 + (1 - p.life / p.max) * 40; g.beginPath(); g.arc(-rad + 10, 0, rad, -0.6, 0.6); g.stroke();
  } else {
    // projéteis inimigos
    const c = p.color || '#B98AF0';
    g.shadowColor = c; g.shadowBlur = 10; g.fillStyle = c; ell(g, 0, 0, p.r, p.r); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, -p.r * 0.3, -p.r * 0.3, p.r * 0.35, p.r * 0.35); g.fill();
    if (p.label) { g.fillStyle = '#fff'; g.font = '900 9px Nunito'; g.textAlign = 'center'; g.fillText(p.label, 0, -p.r - 4); }
  }
  g.restore();
}
