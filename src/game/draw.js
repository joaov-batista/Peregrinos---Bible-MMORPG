// Desenho procedural de personagens, inimigos e chefes (tudo em canvas, sem imagens).
import { TAU, rr, ell, rand } from '../util.js';

/* ---------- Cor ---------- */
const INK = '#0B0A10';          // contorno / tinta
const INK2 = '#16141E';         // corpo de tinta
const BONE = '#E9E4D6';         // máscaras e chifres
const RIM = 'rgba(205,222,255,.42)'; // luz de recorte (lua fria)

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
const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
function glow(g, x, y, r, cor, a = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(cor, a)); gr.addColorStop(1, rgba(cor, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function sombra(g, x, y, rx, ry, a = 0.38) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
}

/* ---------- Pessoas (jogadores e NPCs) ---------- */
// Formatos de corpo: w = largura do tronco, leg = altura das pernas
const BODY = {
  medio: { w: 0.9, leg: 1.05 }, magro: { w: 0.76, leg: 1.12 }, forte: { w: 1.02, leg: 1.05 },
  robusto: { w: 1.14, leg: 0.95 }, baixo: { w: 0.86, leg: 0.7 }, alto: { w: 0.82, leg: 1.35 }
};
// Heróis no estilo dos "vasos" de Hollow Knight: máscara redonda e clara com dois olhos grandes, uma crista que dá
// personalidade (chifres, antenas, juba, capuz…), capa colorida e drapeada com gola e broche, pernas escuras.
// Mapeamento da personalização: style = forma da cabeça, hair = cor da crista, skin = tom da máscara,
// tunic = capa, cape = gola/capinha, beard = barba no queixo da máscara, body = largura e altura.
const OLP = '#1C1620';  // tinta do contorno
const PERNA = '#2B2430'; // pernas e mãos (o "corpo" escuro por baixo da capa)
function mix(a, b, k) { const A = hexRgb(a), B2 = hexRgb(b); return rgbHex(A[0] + (B2[0] - A[0]) * k, A[1] + (B2[1] - A[1]) * k, A[2] + (B2[2] - A[2]) * k); }

// capa em sino: sai debaixo da máscara, abre até a barra com pontas soltas
function capaSino(g, w, t, sway, alt = 1) {
  const top = -8.5, bot = 8 * alt, nw = 4.6 * w, hw = 13.6 * w;
  g.beginPath(); g.moveTo(-nw, top); g.quadraticCurveTo(0, top - 1.5, nw, top);
  g.bezierCurveTo(nw + 2, top + 6, hw - 2.5 - sway * 0.5, bot - 6.5, hw - sway, bot);
  const pts = 6;
  for (let i = 1; i <= pts; i++) {
    const x = hw - sway - (2 * hw) * (i / pts) + sway * (i / pts) * 0.4, p = (i % 2 ? 2.6 : 0.4) + Math.sin(t * 2.4 + i * 1.9) * 0.8;
    g.quadraticCurveTo(x + hw / pts, bot + p + 1.2, x, bot + (i === pts ? 0 : 0.6));
  }
  g.bezierCurveTo(-hw + 2.5 - sway * 0.4, bot - 6.5, -nw - 2, top + 6, -nw, top);
  g.closePath();
}
// gola/capinha (a cor da "capa" escolhida): borda recortada em pontas, como na referência
function gola(g, w, t, sway) {
  const top = -9.5, bot = -4, hw = 7.4 * w;
  g.beginPath(); g.moveTo(-6 * w, top); g.quadraticCurveTo(0, top - 1.8, 6 * w, top);
  g.quadraticCurveTo(hw + 1, top + 3, hw - sway * 0.3, bot);
  for (let i = 1; i <= 5; i++) { const x = hw - sway * 0.3 - (2 * hw) * (i / 5); g.lineTo(x + hw / 5, bot + (i % 2 ? 2.4 : 0.6) + Math.sin(t * 3 + i) * 0.4); g.lineTo(x, bot); }
  g.quadraticCurveTo(-hw - 1, top + 3, -6 * w, top); g.closePath();
}
// máscara: redonda, um pouco mais larga em cima, queixo arredondado
function mascaraPath(g, hy, R) {
  const W2 = R * 1.16;
  g.beginPath(); g.moveTo(-W2, hy);
  g.bezierCurveTo(-W2, hy - R * 1.26, W2, hy - R * 1.26, W2, hy);
  g.bezierCurveTo(W2, hy + R * 0.62, R * 0.62, hy + R * 0.88, 0, hy + R * 0.88);
  g.bezierCurveTo(-R * 0.62, hy + R * 0.88, -W2, hy + R * 0.62, -W2, hy);
  g.closePath();
}
// cristas: o que dá personalidade a cada um (desenhadas atrás da máscara, exceto juba/véu/turbante)
function chifre(g, sd, hy, R, cor, alt, curva, ponta) {
  // chifre em lua crescente grossa: base larga na cabeça, abre para fora, sobe e a ponta volta para dentro (com entalhe)
  const u = 1 + alt, o = 1 + curva, X = v => sd * R * v, Y = v => hy - R * v;
  g.beginPath();
  g.moveTo(X(0.08), Y(0.96));
  g.bezierCurveTo(X(0.5 * o), Y(1.02), X(1.45 * o), Y(1.2 * u), X(1.3 * o), Y(2.1 * u));        // borda de fora
  g.bezierCurveTo(X(1.24 * o), Y(2.42 * u), X(0.78 * o), Y(2.46 * u), X(0.58 * o), Y(2.2 * u));   // ponta larga curvando para dentro
  if (ponta) { g.lineTo(X(0.78 * o), Y(2.08 * u)); g.lineTo(X(0.62 * o), Y(1.98 * u)); }             // entalhe
  g.bezierCurveTo(X(0.82 * o), Y(1.72 * u), X(0.74 * o), Y(1.4 * u), X(0.42), Y(1.22 * u));        // borda de dentro
  g.quadraticCurveTo(X(0.2), Y(1.12), X(0.5), Y(0.7));
  g.closePath();
  g.fillStyle = cor; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OLP; g.stroke();
  g.save(); g.clip(); g.fillStyle = 'rgba(60,40,50,.14)'; g.beginPath(); g.ellipse(X(1.25 * o), Y(1.65 * u), R * 0.36, R * 1.3, 0, 0, TAU); g.fill(); g.restore();
}
// cabelo de gente (no formato da cabeça grande): parte de trás (atrás do corpo/cabeça) e parte da frente (por cima da testa)
function capelo(g, hy, R, linha) {
  // calota de cabelo: cobre o alto da cabeça até a linha do cabelo (linha = altura da franja, 0 = meio da cabeça)
  const W2 = R * 1.2;
  g.beginPath(); g.moveTo(-W2, hy + R * 0.1);
  g.bezierCurveTo(-W2 - 0.4, hy - R * 1.42, W2 + 0.4, hy - R * 1.42, W2, hy + R * 0.1);
  g.quadraticCurveTo(R * 0.95, hy - R * linha * 0.6, R * 0.55, hy - R * linha);
  g.quadraticCurveTo(0, hy - R * (linha + 0.12), -R * 0.55, hy - R * linha);
  g.quadraticCurveTo(-R * 0.95, hy - R * linha * 0.6, -W2, hy + R * 0.1);
  g.closePath();
}
function pinta(g, cor, w = 1.4) { g.fillStyle = cor; g.fill(); g.lineWidth = w; g.strokeStyle = OLP; g.stroke(); }
function brilhoCabelo(g, hy, R) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.4; g.beginPath(); g.arc(-R * 0.1, hy - R * 0.35, R * 0.78, Math.PI * 1.18, Math.PI * 1.42); g.stroke(); }
function cristaAtras(g, style, hy, R, hair, mask, t, sway) {
  if (style === 'longo') {
    g.beginPath(); g.moveTo(-R * 1.15, hy - R * 0.2);
    g.bezierCurveTo(-R * 1.45, hy + R * 0.7, -R * 1.2 + sway * 0.4, hy + R * 1.5, -R * 1.0 + sway * 0.6, hy + R * 2.1);
    g.quadraticCurveTo(sway * 0.6, hy + R * 2.35, R * 1.0 + sway * 0.6, hy + R * 2.1);
    g.bezierCurveTo(R * 1.2 + sway * 0.4, hy + R * 1.5, R * 1.45, hy + R * 0.7, R * 1.15, hy - R * 0.2);
    g.closePath(); pinta(g, hair);
  } else if (style === 'trancas') {
    for (const sd of [-1, 1]) {
      const bx = sd * R * 0.95, sw = Math.sin(t * 2 + sd) * 0.8 + sway * 0.3;
      for (let k = 0; k < 4; k++) { ell(g, bx + sd * 0.6 + sw * k * 0.3, hy + R * (0.35 + k * 0.42), R * 0.24, R * 0.26); pinta(g, hair, 1.1); }
      ell(g, bx + sw * 1.2, hy + R * 2.05, R * 0.15, R * 0.15); pinta(g, '#C0392B', 1);
    }
  } else if (style === 'rabo') {
    g.beginPath(); g.ellipse(-0.5 + sway * 0.5, hy + R * 0.7, R * 0.32, R * 0.95, 0.15 + sway * 0.04, 0, TAU); pinta(g, hair);
  } else if (style === 'black' || style === 'cacheado') {
    // volume do cabelo atrás da cabeça
    const n = style === 'black' ? 12 : 9, rr2 = R * (style === 'black' ? 1.25 : 1.12), c = R * (style === 'black' ? 0.36 : 0.3);
    g.beginPath(); for (let i = 0; i < n; i++) { const a = Math.PI * (0.92 + i * (1.16 / (n - 1))); const x = Math.cos(a) * rr2, y = hy - R * 0.1 + Math.sin(a) * rr2; g.moveTo(x + c, y); g.arc(x, y, c, 0, TAU); }
    pinta(g, hair, 1.2);
  }
  void mask;
}
function cristaFrente(g, style, hy, R, hair, mask, tunic, back) {
  void mask;
  if (style === 'veu') {
    const c = '#EADBC8';
    g.beginPath(); g.moveTo(-R * 1.22, hy + R * 0.95); g.bezierCurveTo(-R * 1.5, hy - R * 1.75, R * 1.5, hy - R * 1.75, R * 1.22, hy + R * 0.95);
    if (back) g.closePath();
    else { g.quadraticCurveTo(R * 0.9, hy - R * 0.75, 0, hy - R * 0.82); g.quadraticCurveTo(-R * 0.9, hy - R * 0.75, -R * 1.22, hy + R * 0.95); g.closePath(); }
    pinta(g, c);
    g.strokeStyle = 'rgba(120,90,60,.35)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-R * 0.95, hy - R * 0.85); g.quadraticCurveTo(-R * 1.15, hy, -R * 1.05, hy + R * 0.75); g.moveTo(R * 0.95, hy - R * 0.85); g.quadraticCurveTo(R * 1.15, hy, R * 1.05, hy + R * 0.75); g.stroke();
    return;
  }
  if (style === 'turbante') {
    const c = shade(tunic, 0.45);
    g.beginPath(); g.moveTo(-R * 1.16, hy - R * 0.3); g.bezierCurveTo(-R * 1.3, hy - R * 1.7, R * 1.3, hy - R * 1.7, R * 1.16, hy - R * 0.3); g.quadraticCurveTo(0, hy - R * 0.68, -R * 1.16, hy - R * 0.3); g.closePath();
    pinta(g, c);
    g.strokeStyle = shade(c, -0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(-R * 0.95, hy - R * 0.72); g.quadraticCurveTo(0, hy - R * 0.38, R * 1.0, hy - R * 0.95); g.moveTo(-R * 0.8, hy - R * 1.1); g.quadraticCurveTo(R * 0.1, hy - R * 0.78, R * 0.85, hy - R * 1.25); g.stroke();
    if (!back) { ell(g, R * 0.5, hy - R * 0.92, 1.7, 1.7); pinta(g, '#F2C14E', 0.8); }
    return;
  }
  if (back) {
    // de costas: o cabelo cobre a cabeça toda
    if (style === 'careca') { g.beginPath(); g.moveTo(-R * 1.15, hy + R * 0.1); g.quadraticCurveTo(0, hy + R * 0.55, R * 1.15, hy + R * 0.1); g.quadraticCurveTo(R * 1.1, hy + R * 0.6, 0, hy + R * 0.8); g.quadraticCurveTo(-R * 1.1, hy + R * 0.6, -R * 1.15, hy + R * 0.1); g.closePath(); pinta(g, hair, 1.1); return; }
    mascaraPath(g, hy - 0.3, R * 1.02); pinta(g, hair, 1.5); brilhoCabelo(g, hy, R);
    if (style === 'coque') { ell(g, 0, hy - R * 0.2, R * 0.42, R * 0.4); pinta(g, hair, 1.3); }
    return;
  }
  switch (style) {
    case 'careca':
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * R * 1.15, hy - R * 0.15); g.quadraticCurveTo(sd * R * 1.28, hy + R * 0.3, sd * R * 1.0, hy + R * 0.55); g.quadraticCurveTo(sd * R * 1.05, hy + R * 0.1, sd * R * 0.98, hy - R * 0.4); g.closePath(); pinta(g, hair, 1.1); }
      g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, -R * 0.35, hy - R * 0.85, R * 0.28, R * 0.12); g.fill();
      break;
    case 'curto': case 'rabo': case 'trancas': case 'coque': case 'longo':
      capelo(g, hy, R, 0.5); pinta(g, hair); brilhoCabelo(g, hy, R);
      // risca do lado
      g.strokeStyle = shade(hair, -0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(-R * 0.35, hy - R * 1.02); g.quadraticCurveTo(-R * 0.25, hy - R * 0.75, -R * 0.45, hy - R * 0.52); g.stroke();
      if (style === 'coque') { ell(g, 0, hy - R * 1.3, R * 0.42, R * 0.38); pinta(g, hair, 1.3); }
      break;
    case 'franja':
      capelo(g, hy, R, 0.42); pinta(g, hair);
      // franja varrida para o lado
      g.beginPath(); g.moveTo(-R * 1.12, hy - R * 0.1); g.quadraticCurveTo(-R * 0.6, hy - R * 0.25, R * 0.2, hy - R * 0.55); g.quadraticCurveTo(R * 0.6, hy - R * 0.62, R * 0.95, hy - R * 0.5); g.quadraticCurveTo(R * 0.2, hy - R * 1.0, -R * 0.9, hy - R * 0.75); g.closePath(); pinta(g, hair, 1.2);
      brilhoCabelo(g, hy, R);
      break;
    case 'espetado':
      g.beginPath(); g.moveTo(-R * 1.18, hy - R * 0.05);
      for (let i = 0; i <= 6; i++) { const x = -R * 1.18 + i * (R * 2.36 / 6), y = hy - R * (i % 2 ? 1.62 : 1.0) - (i === 3 ? R * 0.2 : 0); g.lineTo(x, y); }
      g.lineTo(R * 1.18, hy - R * 0.05); g.quadraticCurveTo(R * 0.6, hy - R * 0.55, 0, hy - R * 0.55); g.quadraticCurveTo(-R * 0.6, hy - R * 0.55, -R * 1.18, hy - R * 0.05); g.closePath(); pinta(g, hair);
      break;
    case 'black': case 'cacheado': {
      // cachos por cima da testa
      const n = style === 'black' ? 9 : 8, rr2 = R * (style === 'black' ? 1.08 : 1.0), c = R * (style === 'black' ? 0.36 : 0.3);
      g.beginPath(); for (let i = 0; i < n; i++) { const a = Math.PI * (1.08 + i * (0.84 / (n - 1))); const x = Math.cos(a) * rr2, y = hy - R * 0.15 + Math.sin(a) * rr2; g.moveTo(x + c, y); g.arc(x, y, c, 0, TAU); }
      g.fillStyle = hair; g.fill(); g.lineWidth = 1.2; g.strokeStyle = OLP; g.stroke();
      capelo(g, hy - R * 0.1, R, 0.75); g.fillStyle = hair; g.fill();
      brilhoCabelo(g, hy - R * 0.2, R);
      break;
    }
  }
}

// asas de anjo: duas asas grandes de penas largas em duas fileiras (rêmiges compridas embaixo, coberteiras curtas por cima),
// mais um par pequeno embaixo (os serafins de Is 6:2). Abrem e fecham devagar, com luz passando por dentro.
function pena(g, L2, W2, alfa) {
  g.beginPath(); g.moveTo(0, 0);
  g.bezierCurveTo(L2 * 0.2, -W2, L2 * 0.72, -W2 * 1.05, L2, -W2 * 0.2);   // borda de cima, larga
  g.quadraticCurveTo(L2 * 1.06, W2 * 0.25, L2 * 0.88, W2 * 0.55);          // ponta arredondada
  g.bezierCurveTo(L2 * 0.6, W2 * 0.95, L2 * 0.2, W2 * 0.75, 0, 0);          // borda de baixo
  g.closePath();
  const gr = g.createLinearGradient(0, 0, L2, 0);
  gr.addColorStop(0, 'rgba(255,252,240,' + alfa + ')'); gr.addColorStop(0.7, 'rgba(255,244,214,' + alfa + ')'); gr.addColorStop(1, 'rgba(250,214,140,' + alfa + ')');
  g.fillStyle = gr; g.fill(); g.lineWidth = 0.9; g.strokeStyle = 'rgba(170,128,60,.85)'; g.stroke();
  g.strokeStyle = 'rgba(205,165,95,.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(1, 0); g.quadraticCurveTo(L2 * 0.5, -W2 * 0.15, L2 * 0.95, W2 * 0.1); g.stroke(); // raque
}
function asa(g, t, escala, abre, k) {
  const leque = 0.95 + abre * 0.35;
  g.save(); g.scale(escala, escala);
  // brilho atrás da asa
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 22, -10, 36, '#FFE9B0', 0.22); g.restore();
  // rêmiges (compridas), da de trás para a da frente
  for (let i = 0; i < 7; i++) {
    const a = -1.25 * leque + i * 0.2 * leque, L2 = 40 - Math.abs(i - 2) * 3.4, W2 = 6.4;
    g.save(); g.rotate(a + Math.sin(t * 2.4 + i * 0.3 + k) * 0.03); g.translate(3, 0); pena(g, L2, W2, 0.97); g.restore();
  }
  // coberteiras (curtas, por cima)
  for (let i = 0; i < 6; i++) {
    const a = -1.2 * leque + i * 0.22 * leque, L2 = 22 - Math.abs(i - 2) * 1.6, W2 = 5.4;
    g.save(); g.rotate(a); g.translate(2, 0); pena(g, L2, W2, 1); g.restore();
  }
  // osso da asa (borda de ataque) com brilho
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -18 * leque, 26, -26 * leque); g.stroke();
  g.restore();
}
function asasSerafim(g, t) {
  const abre = 0.5 + 0.5 * Math.sin(t * 2.2); // abre e fecha
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 5, -7); g.scale(sd, 1);
    g.save(); g.rotate(0.95 + abre * 0.12); asa(g, t, 0.55, abre * 0.6, 1); g.restore(); // par pequeno de baixo
    g.save(); g.rotate(-0.05 - abre * 0.18); asa(g, t, 1, abre, 0); g.restore();        // asa grande
    g.restore();
  }
}
// st: { t, fx, fy, walk, moving, weapon, shield, guard, armor, helmet, alpha }
export function drawPerson(g, x, y, s, L, st) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const out = (w = 1.4) => { g.lineWidth = w; g.strokeStyle = OLP; g.stroke(); };
  const t = st.t || 0, fx = st.fx || 0, fy = st.fy == null ? 1 : st.fy, back = fy < -0.55;
  const B = BODY[L.body] || BODY.medio, w = B.w, alt = 0.9 + (B.leg - 1) * 0.5;
  const tunic = L.tunic || '#3B4CCA', tunicD = shade(tunic, -0.35), tunicL = shade(tunic, 0.25);
  const mask = L.skin || '#C68B59', maskD = shade(mask, -0.2); // rosto: a cor de pele escolhida
  const hair = L.hair || '#3A2314', style = L.style || 'curto';
  const walkPh = st.moving ? Math.sin((st.walk || 0) * 13) : 0;
  const sway = fx * 2 + walkPh * 1.4 + Math.sin(t * 1.6) * 0.45;
  sombra(g, 0, 13, 12.5 * w, 4, 0.32);
  // luz: todo herói tem um brilho quente leve; o anjo tem muito
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, -12, L.anjo ? 70 : 26, '#FFE9B0', L.anjo ? 0.4 : 0.09); g.restore();
  if (L.anjo) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(0, -16); g.rotate(t * 0.2);
    for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = 'rgba(255,236,180,' + (0.06 + 0.05 * Math.sin(t * 2 + i)) + ')'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, 64); g.lineTo(6, 64); g.closePath(); g.fill(); }
    g.restore();
    g.translate(0, -4 + Math.sin(t * 1.5) * 2.4); // flutua
    asasSerafim(g, t);
  }
  // pernas escuras com pezinho; balançam ao andar
  const lh = 8.5 * B.leg;
  for (const [sx, d] of [[-3.4 * w, walkPh * 3.4], [3.4 * w, -walkPh * 3.4]]) {
    const x0 = sx * 0.9, y0 = 13 - lh - 1, x1 = sx + d * 0.45, y1 = 13 + Math.min(0, d) * 0.3;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1 - 1);
    g.lineWidth = 5.4; g.strokeStyle = OLP; g.stroke(); g.lineWidth = 3.6; g.strokeStyle = st.boots || PERNA; g.stroke();
    ell(g, x1 + (sx > 0 ? 0.8 : -0.8), y1, 2.8, 1.6); g.fillStyle = st.boots || PERNA; g.fill(); out(1);
  }
  const bob = st.moving ? -Math.abs(walkPh) * 1.6 : Math.sin(t * 2) * 0.5;
  g.translate(0, bob);
  // cabeça grande (como em HK): crista comprida fica atrás da capa
  const hy = -19.5, R = 11;
  if (style === 'longo' || style === 'trancas') cristaAtras(g, style, hy, R, hair, mask, t, sway, back);
  // capa (corpo)
  capaSino(g, w, t, sway, alt); g.fillStyle = tunic; g.fill();
  g.save(); capaSino(g, w, t, sway, alt); g.clip();
  // luz de um lado, sombra do outro (corte diagonal suave, como nos desenhos de referência)
  const gr = g.createLinearGradient(-12, -8, 12, 8); gr.addColorStop(0, rgba(tunicL, 0.55)); gr.addColorStop(0.45, rgba(tunic, 0)); gr.addColorStop(1, rgba(tunicD, 0.85));
  g.fillStyle = gr; g.fillRect(-16, -10, 32, 22);
  // dobras do pano, que acompanham o balanço
  g.strokeStyle = rgba(tunicD, 0.8); g.lineWidth = 0.9;
  for (const k of [-0.62, -0.22, 0.2, 0.6]) { g.beginPath(); g.moveTo(k * 6 * w, -6); g.quadraticCurveTo(k * 9 * w - sway * 0.3, 0, k * 12 * w - sway * (0.6 + Math.abs(k) * 0.3), 6.5 * alt); g.stroke(); }
  // abertura da frente mostrando o corpo escuro
  if (!back) { g.beginPath(); g.moveTo(-1.4, -4); g.quadraticCurveTo(-2.6 - sway * 0.2, 2, -3.2 - sway * 0.4, 8 * alt); g.lineTo(3.2 - sway * 0.4, 8 * alt); g.quadraticCurveTo(2.6 - sway * 0.2, 2, 1.4, -4); g.closePath(); g.fillStyle = PERNA; g.fill(); }
  g.restore();
  capaSino(g, w, t, sway, alt); out(1.5);
  // mãos escuras saindo da capa
  for (const sd of [-1, 1]) { ell(g, sd * 8.6 * w + sway * 0.2, 0.5 - sd * walkPh * 0.8, 1.9, 2.1); g.fillStyle = PERNA; g.fill(); out(1.1); }
  if (st.armor) {
    // ombreiras e peitoral de metal por cima da capa
    const a = st.armor;
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 6.4 * w, -6.5, 4.4, 3, sd * 0.35, 0, TAU); g.fillStyle = a; g.fill(); out(1.2); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(sd * 6.4 * w, -7.2, 3, 1.6, sd * 0.35, Math.PI * 1.1, Math.PI * 1.8); g.stroke(); }
    g.beginPath(); g.moveTo(-4.6, -7); g.quadraticCurveTo(0, -8.5, 4.6, -7); g.lineTo(3.6, 1); g.quadraticCurveTo(0, 2.6, -3.6, 1); g.closePath(); g.fillStyle = a; g.fill(); out(1.2);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2.6, -5.6); g.lineTo(-2.2, -0.5); g.stroke();
  }
  // gola/capinha com broche
  const cape = L.cape && L.cape !== 'none' ? L.cape : null;
  if (cape) {
    gola(g, w, t, sway); g.fillStyle = cape; g.fill();
    g.save(); gola(g, w, t, sway); g.clip(); g.fillStyle = rgba(shade(cape, -0.35), 0.6); g.fillRect(0, -12, 14, 12); g.strokeStyle = rgba(shade(cape, -0.4), 0.6); g.lineWidth = 0.8;
    for (const k of [-0.6, -0.2, 0.2, 0.6]) { g.beginPath(); g.moveTo(k * 5 * w, -8.5); g.lineTo(k * 9 * w, -2); g.stroke(); } g.restore();
    gola(g, w, t, sway); out(1.3);
  }
  if (!back) { ell(g, 0, -7.2, 2, 2); g.fillStyle = st.belt || '#F2C14E'; g.fill(); out(1); g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, -0.6, -7.8, 0.6, 0.6); g.fill(); }
  // cabeça: crista atrás, máscara, crista da frente, olhos
  if (style !== 'longo' && style !== 'trancas') cristaAtras(g, style, hy, R, hair, mask, t, sway, back);
  mascaraPath(g, hy, R); g.fillStyle = mask; g.fill();
  g.save(); mascaraPath(g, hy, R); g.clip();
  // sombra lateral (lado oposto à luz) e reflexo
  g.fillStyle = rgba(maskD, 0.28); g.beginPath(); g.ellipse(R * 0.85, hy + R * 0.3, R * 0.5, R * 1.2, -0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-R * 0.45, hy - R * 0.6, R * 0.3, R * 0.16, -0.5, 0, TAU); g.fill();
  g.restore();
  mascaraPath(g, hy, R); out(1.6);
  if (st.helmet) {
    const hc = st.helmet;
    g.beginPath(); g.moveTo(-R * 1.05, hy - R * 0.2); g.bezierCurveTo(-R * 1.1, hy - R * 1.45, R * 1.1, hy - R * 1.45, R * 1.05, hy - R * 0.2); g.quadraticCurveTo(0, hy - R * 0.5, -R * 1.05, hy - R * 0.2); g.closePath(); g.fillStyle = hc; g.fill(); out(1.4);
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(0, hy - R * 0.3, R * 0.8, Math.PI * 1.15, Math.PI * 1.4); g.stroke();
    g.beginPath(); g.moveTo(-1.5, hy - R * 1.05); g.lineTo(0, hy - R * 1.6); g.lineTo(1.5, hy - R * 1.05); g.closePath(); g.fillStyle = shade(hc, 0.2); g.fill(); out(1);
  }
  if (!back) {
    cristaFrente(g, style, hy, R, hair, mask, tunic, false);
    // olhos: dois ovais pretos grandes, um pouco inclinados; olham para onde o personagem vira
    const ex = fx * R * 0.32, ey = hy + R * 0.12 + fy * 0.6;
    const pisca = (t * 0.33 + (L.skin ? L.skin.charCodeAt(3) : 0) * 0.17) % 5 < 0.09;
    for (const sd of [-1, 1]) {
      const lado = 1 - Math.max(0, sd * fx) * 0.35; // o olho do lado para onde ele vira fica mais estreito (perspectiva)
      g.save(); g.translate(ex + sd * R * 0.4 * (1 - Math.abs(fx) * 0.15), ey); g.rotate(sd * 0.14);
      if (pisca) { g.strokeStyle = OLP; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-2.2, 0); g.lineTo(2.2, 0); g.stroke(); }
      else {
        ell(g, 0, 0, R * 0.24 * lado, R * 0.34); g.fillStyle = '#100C14'; g.fill();
        g.fillStyle = L.anjo ? 'rgba(255,236,170,.95)' : 'rgba(255,255,255,.85)'; ell(g, -R * 0.07, -R * 0.13, R * 0.06, R * 0.075); g.fill();
      }
      g.restore();
    }
    if (L.beard) {
      // barba: tufo de pelos saindo do queixo da máscara
      const c = mix(hair, '#FFFFFF', 0.05);
      g.beginPath(); g.moveTo(-R * 0.62, hy + R * 0.62);
      for (let i = 0; i <= 6; i++) { const xx = -R * 0.62 + i * R * 0.207, yy = hy + R * (1.3 + (i % 2 ? 0.25 : 0)) + Math.sin(t * 2 + i) * 0.4; g.lineTo(xx, yy); }
      g.quadraticCurveTo(R * 0.7, hy + R * 0.7, R * 0.62, hy + R * 0.62); g.quadraticCurveTo(0, hy + R * 0.95, -R * 0.62, hy + R * 0.62); g.closePath();
      g.fillStyle = c; g.fill(); out(1.2);
    }
  } else cristaFrente(g, style, hy, R, hair, mask, tunic, true);
  if (L.anjo) {
    const ay = hy - R * 1.55 + Math.sin(t * 3) * 0.8;
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, 0, ay, 22, '#FFE7A8', 0.65); g.restore();
    g.strokeStyle = '#FFF6D6'; g.lineWidth = 2.2; g.shadowColor = '#FFE08A'; g.shadowBlur = 16; ell(g, 0, ay, 8.6, 2.6); g.stroke();
    g.strokeStyle = '#FFD86B'; g.lineWidth = 0.9; ell(g, 0, ay, 10, 3.2); g.stroke(); g.shadowBlur = 0;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) { const dd = (t * 0.4 + k / 10) % 1, xx = Math.sin(k * 2.7 + t) * 22; g.fillStyle = 'rgba(255,244,210,' + (1 - dd) * 0.9 + ')'; ell(g, xx, -30 + dd * 52, 1, 1); g.fill(); }
    g.restore();
  }
  // escudo erguido
  if (st.guard) {
    const sx = fx * 13, sy = -2 + fy * 7, sc = st.shieldColor || '#8A5A35';
    ell(g, sx, sy, 9.5, 10.5); g.fillStyle = sc; g.fill(); out(2.4);
    g.strokeStyle = '#F2C14E'; g.lineWidth = 1.5; ell(g, sx, sy, 7.2, 8.2); g.stroke();
    ell(g, sx, sy, 2.6, 2.6); g.fillStyle = '#F2C14E'; g.fill(); out(1);
    if (st.guardPerfect) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5; g.shadowColor = '#FFF2C0'; g.shadowBlur = 14; ell(g, sx, sy, 16, 18); g.stroke(); g.shadowBlur = 0; }
  }
  g.restore();
}

/* ---------- Armas na mão ---------- */
// lâminas claras e finas (o "ferrão"), cabos de tinta
export function drawWeapon(g, kind, len, glowR, legendary) {
  g.save();
  if (glowR) { g.shadowColor = legendary ? '#FFF6D6' : '#DDE8FF'; g.shadowBlur = glowR; }
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'espada') {
    g.fillStyle = legendary ? '#FFFDF4' : '#D9DDE6'; g.beginPath(); g.moveTo(9, -2); g.lineTo(len - 4, -1.2); g.lineTo(len + 3, 0); g.lineTo(len - 4, 1.2); g.lineTo(9, 2); g.closePath(); g.fill();
    g.shadowBlur = 0; g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(9, -5); g.lineTo(9, 5); g.stroke();
    g.strokeStyle = '#3A3444'; g.lineWidth = 3; g.beginPath(); g.moveTo(2, 0); g.lineTo(8, 0); g.stroke();
  } else if (kind === 'funda') {
    g.strokeStyle = '#5E5446'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(len * 0.5, 8, len * 0.7, 0); g.stroke();
    g.fillStyle = '#9A978F'; ell(g, len * 0.7, 0, 3.4, 3.4); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
  } else if (kind === 'adaga') {
    g.fillStyle = '#D9DDE6'; g.beginPath(); g.moveTo(6, -1.6); g.lineTo(len + 2, 0); g.lineTo(6, 1.6); g.closePath(); g.fill(); g.shadowBlur = 0; g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(6, -3.5); g.lineTo(6, 3.5); g.stroke(); g.beginPath(); g.moveTo(1, 0); g.lineTo(5, 0); g.stroke();
  } else if (kind === 'lanca') {
    g.strokeStyle = '#2A2632'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-10, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#D9DDE6'; g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(len + 12, 0); g.lineTo(len - 1, -3.6); g.lineTo(len + 2, 0); g.lineTo(len - 1, 3.6); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'chicote') {
    g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(8, 0); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#4E4438'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(len * 0.8, 9, len * 0.55, 14); g.quadraticCurveTo(len * 0.2, 16, len * 0.4, 6); g.stroke();
  } else if (kind === 'cajado') {
    g.strokeStyle = '#2A2632'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 0); g.lineTo(len, 0); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(len, 0); g.quadraticCurveTo(len + 7, -6, len + 2, -9); g.stroke();
    glow(g, len + 3, -2, 12, '#F6E6B0', 0.6); g.fillStyle = '#FFF4D2'; ell(g, len + 3, -2, 2.6, 2.6); g.fill();
  } else {
    // berrante/shofar: chifre claro
    g.fillStyle = BONE; g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(len * 0.6, -6, len, -9); g.lineTo(len + 2, 7); g.quadraticCurveTo(len * 0.6, 4, 4, 3); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
  }
  g.restore();
}

/* ---------- Inimigos comuns ---------- */
// Vícios: criaturas de tinta com uma máscara de osso; os olhos (e as marcas) acendem na cor do vício.
export function drawEnemy(g, e, d, T, px, py) {
  const t = T + e.ph, r = e.r;
  const sq = Math.sin(t * 5) * 0.06;
  g.save(); g.translate(e.x, e.y);
  sombra(g, 0, r * 0.85, r * 1.1, r * 0.36, 0.45);
  const hop = e.type === 'distracao' ? -Math.abs(Math.sin(t * 10)) * 5 : 0;
  if (e.telegraph > 0) { g.strokeStyle = 'rgba(220,40,60,' + (0.35 + 0.4 * Math.sin(T * 30)) + ')'; g.lineWidth = 2; ell(g, 0, r * 0.4, r + 8, (r + 8) * 0.55); g.stroke(); }
  const cor = d.cor, escuro = mute(d.cor2, 0.35, 0.72);
  glow(g, 0, -r * 0.1, r * 2.2, cor, e.type === 'medo' ? 0.12 : 0.2);
  g.translate(0, hop - 2); g.scale(1 + sq, 1 - sq);
  if (e.type === 'medo') g.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 5);
  // corpo de tinta com tentáculos/franjas embaixo
  g.beginPath(); g.moveTo(-r * 0.95, r * 0.1); g.bezierCurveTo(-r * 1.05, -r * 1.05, r * 1.05, -r * 1.05, r * 0.95, r * 0.1);
  const n = 6;
  for (let i = 0; i <= n; i++) { const x = r * 0.95 - (1.9 * r) * (i / n), y = r * (0.7 + (i % 2 ? 0.1 : 0.42) + 0.14 * Math.sin(t * 7 + i * 1.3)); g.lineTo(x, y); }
  g.closePath();
  if (e.flash > 0) g.fillStyle = '#FFFFFF';
  else { const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, escuro); gr.addColorStop(0.7, INK2); gr.addColorStop(1, rgba(cor, 0.55)); g.fillStyle = gr; }
  g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  // recorte de luz
  g.strokeStyle = 'rgba(200,215,255,.22)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -r * 0.05, r * 0.82, -1.2, -0.2); g.stroke();
  // máscara de osso
  const mw = r * 0.62, my = -r * 0.32;
  g.beginPath(); g.moveTo(-mw, my - r * 0.2); g.quadraticCurveTo(0, my - r * 0.72, mw, my - r * 0.2); g.quadraticCurveTo(mw * 0.9, my + r * 0.42, 0, my + r * 0.55); g.quadraticCurveTo(-mw * 0.9, my + r * 0.42, -mw, my - r * 0.2); g.closePath();
  g.fillStyle = e.flash > 0 ? '#FFFFFF' : BONE; g.fill(); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
  // chifres de osso
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * r * 0.3, my - r * 0.48); g.quadraticCurveTo(sd * r * 0.62, -r * 1.15, sd * r * 0.5, -r * 1.38); g.quadraticCurveTo(sd * r * 0.42, -r * 1.0, sd * r * 0.12, my - r * 0.56); g.closePath(); g.fillStyle = BONE; g.fill(); g.lineWidth = 1.1; g.stroke(); }
  // olhos: buracos que acendem, olhando para o jogador
  const dx = px - e.x, dy = py - e.y, dl = Math.hypot(dx, dy) || 1, lx = dx / dl * r * 0.06, ly = dy / dl * r * 0.05;
  const olho = e.type === 'ira' ? '#FF3B2E' : cor;
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * r * 0.26 + lx, my + r * 0.02 + ly); g.rotate(sd * (e.type === 'preguica' ? 0.05 : 0.35));
    ell(g, 0, 0, r * 0.15, e.type === 'preguica' ? r * 0.06 : r * 0.21); g.fillStyle = INK; g.fill();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(olho, 0.95); ell(g, 0, r * 0.02, r * 0.08, e.type === 'preguica' ? r * 0.035 : r * 0.11); g.fill();
    g.globalCompositeOperation = 'source-over'; g.restore();
  }
  // marcas próprias de cada vício (discretas)
  g.fillStyle = rgba(cor, 0.85); g.strokeStyle = rgba(cor, 0.85); g.lineWidth = 1.6; g.textAlign = 'center';
  if (e.type === 'preguica') { const zz = (t * 0.6) % 1; g.globalAlpha *= 1 - zz; g.font = 'italic 600 10px Alegreya, serif'; g.fillText('z', r * 0.7 + zz * 6, -r - zz * 12); g.globalAlpha = 1; }
  else if (e.type === 'distracao') { g.fillStyle = rgba(cor, 0.5 + 0.5 * Math.abs(Math.sin(t * 6))); rr(g, -4, -r - 15, 8, 10, 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); }
  else if (e.type === 'desanimo') { for (let k = 0; k < 3; k++) { const dd = (t * 1.2 + k / 3) % 1; g.globalAlpha = 1 - dd; ell(g, -5 + k * 5, r * 0.9 + dd * 8, 1, 2); g.fill(); } g.globalAlpha = 1; }
  else if (e.type === 'duvida') { g.font = '600 13px Alegreya, serif'; g.fillText('?', Math.sin(t * 3) * 3, -r * 1.45); }
  else if (e.type === 'ganancia') { for (let k = 0; k < 3; k++) { const a = t * 2 + k * TAU / 3; ell(g, Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.4 - r * 0.2, 2, 2); g.fill(); } }
  else if (e.type === 'ira') { g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { const dd = (t * 1.6 + k / 4) % 1; g.globalAlpha = 1 - dd; ell(g, -r * 0.5 + k * r * 0.33, -r * 0.9 - dd * 14, 1.6, 2.6); g.fill(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  else if (e.type === 'orgulho') { g.fillStyle = BONE; g.beginPath(); g.moveTo(-r * 0.5, -r * 0.95); g.lineTo(-r * 0.5, -r * 1.35); g.lineTo(-r * 0.25, -r * 1.12); g.lineTo(0, -r * 1.5); g.lineTo(r * 0.25, -r * 1.12); g.lineTo(r * 0.5, -r * 1.35); g.lineTo(r * 0.5, -r * 0.95); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); }
  else if (e.type === 'vaidade') { g.strokeStyle = rgba(cor, 0.7); ell(g, 0, -r * 1.35, r * 0.32, r * 0.2); g.stroke(); }
  g.restore();
}

/* ---------- Chefes ---------- */
export function drawBoss(g, b, T) {
  const s = b.r / 40, hit = b.flash;
  g.save(); g.translate(b.x, b.y);
  if (b.alpha != null) g.globalAlpha = b.alpha;
  if (!b.clone) sombra(g, 0, b.r * 0.9, b.r * 1.25, b.r * 0.38, 0.5);
  if (hit > 0) g.translate(rand(-3, 3), rand(-2, 2));
  const fn = BOSS_DRAW[b.d?.desenho || b.id] || BOSS_DRAW.generico;
  fn(g, b, s, T);
  if (hit > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, hit * 4) + ')'; ell(g, 0, -b.r * 0.3, b.r, b.r * 1.1); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}

// olhos acesos (fendas inclinadas)
function eyes(g, x, y, r, col = '#FFE066', sono) {
  g.save(); g.globalCompositeOperation = 'lighter';
  glow(g, x, y, r * 6, col, 0.35);
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 10;
  const h2 = sono ? 0.25 : 1;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x + sd * r * 1.7, y - r * 0.7 * h2); g.lineTo(x + sd * r * 0.35, y); g.lineTo(x + sd * r * 1.55, y + r * 0.45 * h2); g.closePath(); g.fill(); }
  g.restore();
}
// máscara de osso genérica (rosto dos chefes)
function mascara(g, x, y, w, h, chifres = 0) {
  g.beginPath(); g.moveTo(x - w, y - h * 0.25); g.quadraticCurveTo(x, y - h * 1.1, x + w, y - h * 0.25); g.quadraticCurveTo(x + w * 0.85, y + h * 0.6, x, y + h * 0.85); g.quadraticCurveTo(x - w * 0.85, y + h * 0.6, x - w, y - h * 0.25); g.closePath();
  g.fillStyle = BONE; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  g.strokeStyle = 'rgba(120,110,95,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w * 0.3, y - h * 0.6); g.lineTo(x + w * 0.15, y - h * 0.25); g.lineTo(x + w * 0.32, y); g.stroke(); // rachadura
  for (let i = 0; i < chifres; i++) for (const sd of [-1, 1]) {
    const k = 1 + i * 0.55;
    g.beginPath(); g.moveTo(x + sd * w * 0.4, y - h * 0.75); g.quadraticCurveTo(x + sd * w * (0.9 + i * 0.4), y - h * (1.5 * k), x + sd * w * (0.6 + i * 0.5), y - h * (2 * k)); g.quadraticCurveTo(x + sd * w * 0.55, y - h * 1.3 * k, x + sd * w * 0.1, y - h * 0.85); g.closePath();
    g.fillStyle = BONE; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
  }
}
function cavidades(g, x, y, r, col, sono) {
  for (const sd of [-1, 1]) { g.save(); g.translate(x + sd * r * 1.25, y); g.rotate(sd * 0.3); ell(g, 0, 0, r * 0.75, sono ? r * 0.28 : r); g.fillStyle = INK; g.fill(); g.restore(); }
  eyes(g, x, y, r * 0.55, col, sono);
}
// corpo de tinta com franjas que ondulam
function vulto(g, w, h, T, cor, pontas = 7, topo = -h) {
  g.beginPath(); g.moveTo(-w * 0.55, topo + h * 0.25); g.bezierCurveTo(-w * 0.6, topo - h * 0.15, w * 0.6, topo - h * 0.15, w * 0.55, topo + h * 0.25);
  g.quadraticCurveTo(w * 1.05, h * 0.2, w, h * 0.55);
  for (let i = 1; i <= pontas; i++) { const x = w - 2 * w * (i / pontas), p = (i % 2 ? h * 0.22 : h * 0.04) + Math.sin(T * 2.4 + i) * h * 0.05; g.lineTo(x + w / pontas, h * 0.55 + p); g.lineTo(x, h * 0.55); }
  g.quadraticCurveTo(-w * 1.05, h * 0.2, -w * 0.55, topo + h * 0.25); g.closePath();
  const gr = g.createLinearGradient(0, topo, 0, h * 0.8); gr.addColorStop(0, mute(cor, 0.35, 0.7)); gr.addColorStop(0.65, INK2); gr.addColorStop(1, rgba(cor, 0.5));
  g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
}

const BOSS_DRAW = {
  // vulto com as cores do chefe (cor, cor2), máscara e um símbolo ("simbolo" no bestiário)
  generico(g, b, s, T) {
    const d = b.d || {}, bob = Math.sin(T * 2.2) * 3;
    g.scale(s, s); g.translate(0, bob);
    glow(g, 0, -6, 70, d.cor || '#888888', 0.22);
    vulto(g, 34, 36, T, d.cor || '#888888');
    mascara(g, 0, -16, 18, 16, 1); cavidades(g, 0, -14, 4.4, d.cor || '#FFE066');
    if (d.simbolo) { g.font = '20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha *= 0.85; g.fillText(d.simbolo, 0, 18); }
  },
  // gigante de armadura de bronze (1Sm 17:5-7); sem o capacete, a testa brilha como alvo
  golias(g, b, s, T) {
    const S = 2.4 * s, a = b.lancaA ?? 0, fx = Math.cos(a) >= 0 ? 1 : -1, exposto = b.exposto > 0;
    const hx = fx * 12 * S * 0.5, hy = -6 * S, puxa = b.lanca === 'mira' ? -26 : b.lanca === 'golpe' ? 22 : -10, len = 96;
    const x0 = hx + Math.cos(a) * puxa, y0 = hy + Math.sin(a) * puxa, x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    const atras = Math.sin(a) < -0.2;
    const lanca = () => {
      g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = '#3A3226'; g.lineWidth = 3.6; g.stroke();
      g.fillStyle = '#C9CDD6'; g.beginPath(); g.moveTo(x1 + Math.cos(a) * 20, y1 + Math.sin(a) * 20);
      g.lineTo(x1 + Math.cos(a + 1.9) * 7, y1 + Math.sin(a + 1.9) * 7); g.lineTo(x1 + Math.cos(a - 1.9) * 7, y1 + Math.sin(a - 1.9) * 7); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
    };
    if (atras) lanca();
    drawPerson(g, 0, 0, S, { skin: '#B07A52', hair: '#1C120A', tunic: '#4A3E2E', cape: '#2E2A26', style: 'curto', body: 'robusto', beard: true },
      { t: T, fx, fy: 1, walk: T * 0.6, moving: !b.act, armor: '#9C7E4E', helmet: exposto ? null : '#9C7E4E' });
    if (!atras) lanca();
    if (exposto) {
      const pulse = 0.6 + 0.4 * Math.sin(T * 10), cy = -22 * S;
      glow(g, 0, cy, 30, '#FF5A46', 0.4 * pulse);
      g.strokeStyle = 'rgba(255,90,70,' + pulse + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, cy, 9 + pulse * 3, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,227,138,' + pulse + ')'; g.beginPath(); g.arc(0, cy, 3.5, 0, TAU); g.fill();
      g.fillStyle = mute('#B08D57', 0.45, 0.15); g.beginPath(); g.arc(-fx * 34, 30, 12, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    }
  },
  // Mamom: um rei-cofre de tinta, coroa de osso, moedas acesas girando e ouro escorrendo da boca
  mamom(g, b, s, T) {
    g.scale(s, s);
    const bob = Math.sin(T * 2.6) * 3;
    g.translate(0, bob);
    glow(g, 0, 0, 80, '#E8B54F', 0.25);
    for (let i = 0; i < 7; i++) { const a = T * 1.6 + i * TAU / 7, z = Math.sin(a); if (z < 0) moeda(g, Math.cos(a) * 54, z * 16 - 6, 4.5 + z, T); }
    vulto(g, 40, 38, T, '#C9922A', 8);
    // braços longos que agarram
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 26, -8); g.quadraticCurveTo(sd * 48, 4 + Math.sin(T * 3 + sd) * 4, sd * 40, 26); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = INK2; g.stroke(); }
    mascara(g, 0, -20, 20, 18, 0);
    // coroa
    g.beginPath(); g.moveTo(-16, -34); for (let i = 0; i <= 4; i++) { g.lineTo(-16 + i * 8, i % 2 ? -42 : -52); } g.lineTo(16, -34); g.closePath(); g.fillStyle = mute('#E8B54F', 0.55, 0.1); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    cavidades(g, 0, -20, 4.4, '#FFE08A');
    // boca com ouro escorrendo
    g.fillStyle = INK; ell(g, 0, -6, 7, 3); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,205,90,.85)'; for (let k = 0; k < 3; k++) { const dd = (T * 0.8 + k / 3) % 1; ell(g, -3 + k * 3, -4 + dd * 22, 1.4, 2.4); g.fill(); } g.restore();
    for (let i = 0; i < 7; i++) { const a = T * 1.6 + i * TAU / 7, z = Math.sin(a); if (z >= 0) moeda(g, Math.cos(a) * 54, z * 16 - 6, 4.5 + z, T); }
  },
  // Procrastinação: uma lesma enorme de tinta com um relógio de osso rachado como concha; olhos quase fechados
  procrastinacao(g, b, s, T) {
    g.scale(s, s);
    glow(g, 4, -10, 70, '#7FA7B5', 0.2);
    g.beginPath(); g.moveTo(-52, 26); g.quadraticCurveTo(-50, -2, -30, -4); g.quadraticCurveTo(10, 4, 46, 14); g.quadraticCurveTo(54, 26, 40, 30);
    for (let i = 0; i < 6; i++) g.lineTo(40 - i * 16, 30 + (i % 2 ? 4 : 1) + Math.sin(T * 2 + i) * 1.5);
    g.closePath(); const gr = g.createLinearGradient(0, -4, 0, 30); gr.addColorStop(0, '#2C3A44'); gr.addColorStop(1, INK2); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    // concha-relógio
    ell(g, 8, -14, 30, 30); g.fillStyle = mute('#E9E3D6', 0.5, 0.08); g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
    ell(g, 8, -14, 24, 24); g.lineWidth = 1; g.strokeStyle = 'rgba(40,40,50,.6)'; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(8 + Math.cos(a) * 20, -14 + Math.sin(a) * 20); g.lineTo(8 + Math.cos(a) * 23, -14 + Math.sin(a) * 23); g.stroke(); }
    g.strokeStyle = 'rgba(60,55,50,.55)'; g.beginPath(); g.moveTo(22, -36); g.lineTo(14, -22); g.lineTo(20, -12); g.stroke();
    g.strokeStyle = INK; g.lineCap = 'round';
    const a1 = T * 0.25, a2 = T * 2.2;
    g.lineWidth = 3; g.beginPath(); g.moveTo(8, -14); g.lineTo(8 + Math.cos(a1) * 12, -14 + Math.sin(a1) * 12); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(8, -14); g.lineTo(8 + Math.cos(a2) * 19, -14 + Math.sin(a2) * 19); g.stroke();
    // cabeça com máscara e antenas caídas
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(-40 + sd * 4, -6); g.quadraticCurveTo(-46 + sd * 8, -26, -54 + sd * 6, -22 + Math.sin(T * 1.5 + sd) * 2); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); }
    mascara(g, -40, 4, 12, 11, 0); cavidades(g, -40, 5, 3, '#9FD8E8', true);
    g.fillStyle = 'rgba(220,235,245,.7)'; g.font = 'italic 600 11px Alegreya, serif'; g.textAlign = 'center'; const zz = (T * 0.5) % 1; g.globalAlpha *= 1 - zz; g.fillText('amanhã…', -44, -24 - zz * 18); g.globalAlpha = 1;
  },
  // Mentira: figura alta de manto rasgado e máscara sorridente perfeita demais; a sombra dela não bate com o corpo
  mentira(g, b, s, T) {
    g.scale(s, s);
    const fl = Math.sin(T * 2.6) * 3;
    glow(g, 0, -10, 70, '#9B59B6', 0.24);
    g.translate(0, Math.sin(T * 1.8) * 3);
    g.beginPath(); g.moveTo(-14, -34); g.quadraticCurveTo(-30, 0, -34, 44 + fl);
    for (let i = 0; i < 7; i++) g.lineTo(-34 + (i + 0.5) * 9.7, 50 + (i % 2 ? -6 : 2) + Math.sin(T * 3 + i) * 2), g.lineTo(-34 + (i + 1) * 9.7, 44);
    g.quadraticCurveTo(30, 0, 14, -34); g.closePath();
    const gr = g.createLinearGradient(0, -34, 0, 50); gr.addColorStop(0, '#2A1838'); gr.addColorStop(0.6, INK2); gr.addColorStop(1, 'rgba(155,89,182,.55)'); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    // mãos longas e finas
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 18, -6); g.quadraticCurveTo(sd * 30, 8, sd * 26 + Math.sin(T * 2 + sd) * 3, 22); g.lineWidth = 2; g.strokeStyle = BONE; g.stroke(); }
    // máscara sorridente
    g.beginPath(); g.moveTo(-17, -42); g.quadraticCurveTo(0, -54, 17, -42); g.quadraticCurveTo(19, -16, 0, -10); g.quadraticCurveTo(-19, -16, -17, -42); g.closePath();
    g.fillStyle = '#F2EEE6'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 12, -34); g.quadraticCurveTo(sd * 7, -38, sd * 3, -33); g.quadraticCurveTo(sd * 7, -31, sd * 12, -34); g.fillStyle = INK; g.fill(); }
    eyes(g, 0, -33.5, 2.4, '#D9B8FF');
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(0, -26, 8.5, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.strokeStyle = '#B04A8A'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -17.5); g.lineTo(0, -10 + fl); g.lineTo(-3, -6 + fl); g.moveTo(0, -10 + fl); g.lineTo(3, -6 + fl); g.stroke();
  },
  // Imoralidade: serpente de tinta enrolada, luz rosada que hipnotiza e máscaras pequenas orbitando
  imoralidade(g, b, s, T) {
    g.scale(s, s);
    glow(g, 0, -10, 80, '#D2416E', 0.28);
    for (let i = 4; i >= 0; i--) {
      const yy = 30 - i * 11, xx = Math.sin(T * 1.6 + i) * 6, rx = 40 - i * 5;
      ell(g, xx, yy, rx, 13); const gr = g.createLinearGradient(0, yy - 13, 0, yy + 13); gr.addColorStop(0, '#3A1526'); gr.addColorStop(1, INK2); g.fillStyle = gr; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = 'rgba(255,140,180,.28)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(xx, yy - 3, rx * 0.8, 6, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    g.beginPath(); g.moveTo(-14, -28); g.quadraticCurveTo(0, -56, 14, -28); g.quadraticCurveTo(10, -18, 0, -16); g.quadraticCurveTo(-10, -18, -14, -28); g.fillStyle = '#2A0F1E'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    mascara(g, 0, -32, 10, 9, 0); cavidades(g, 0, -31, 2.4, '#FFB3D1');
    g.strokeStyle = '#E05A8A'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -15); g.lineTo(-3, -11); g.moveTo(0, -15); g.lineTo(3, -11); g.stroke();
    for (let i = 0; i < 3; i++) { const a = T * 1.2 + i * TAU / 3; mascara(g, Math.cos(a) * 46, Math.sin(a) * 14 - 8, 6, 6, 0); g.fillStyle = INK; ell(g, Math.cos(a) * 46 - 2, Math.sin(a) * 14 - 8, 1.2, 1.6); g.fill(); ell(g, Math.cos(a) * 46 + 2, Math.sin(a) * 14 - 8, 1.2, 1.6); g.fill(); }
  },
  // Satanás, o Acusador: querubim caído — vulto alto, asas enormes e rasgadas, chifres de osso, brasas subindo
  satanas(g, b, s, T) {
    g.scale(s * 0.95, s * 0.95);
    g.translate(0, Math.sin(T * 1.3) * 4);
    const fl = Math.sin(T * 2.2) * 0.12;
    glow(g, 0, -20, 110, '#8E1B2E', 0.35);
    for (const sd of [-1, 1]) {
      g.save(); g.scale(sd, 1); g.translate(12, -22); g.rotate(fl - 0.1);
      g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(30, -70, 96, -62);
      const pts = [[84, -44], [92, -30], [74, -24], [80, -6], [60, -8], [62, 12], [42, 2], [38, 22], [22, 8], [6, 14]];
      for (const [px2, py2] of pts) g.lineTo(px2, py2 + Math.sin(T * 2 + px2) * 1.5);
      g.closePath();
      const gr = g.createLinearGradient(0, -60, 0, 20); gr.addColorStop(0, '#1C0A12'); gr.addColorStop(1, INK); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = 'rgba(160,40,60,.35)'; g.lineWidth = 1.2; for (const [px2, py2] of [[84, -44], [74, -24], [60, -8], [42, 2], [22, 8]]) { g.beginPath(); g.moveTo(4, -2); g.quadraticCurveTo(px2 * 0.5, py2 * 0.6 - 20, px2, py2); g.stroke(); }
      g.restore();
    }
    // manto
    g.beginPath(); g.moveTo(-20, -30); g.lineTo(20, -30); g.quadraticCurveTo(40, 10, 40, 56);
    for (let i = 0; i < 8; i++) g.lineTo(40 - (i + 0.5) * 10, 64 + (i % 2 ? -8 : 2) + Math.sin(T * 4 + i) * 2), g.lineTo(40 - (i + 1) * 10, 56);
    g.quadraticCurveTo(-40, 10, -20, -30); g.closePath();
    const gr = g.createLinearGradient(0, -30, 0, 64); gr.addColorStop(0, '#2A0C16'); gr.addColorStop(0.6, INK2); gr.addColorStop(1, 'rgba(255,80,40,.45)'); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    // cabeça: máscara com chifres longos
    mascara(g, 0, -44, 17, 15, 2);
    cavidades(g, 0, -42, 4.4, '#FF4A2E');
    g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, -34); g.quadraticCurveTo(0, -30 + (b.talk ? Math.abs(Math.sin(T * 18)) * 4 : 0), 8, -34); g.stroke();
    // brasas
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 10; k++) { const dd = (T * 0.4 + k / 10) % 1, x = Math.sin(k * 7.3 + T) * 34; g.fillStyle = 'rgba(255,' + (90 + k * 10) + ',40,' + (1 - dd) * 0.8 + ')'; ell(g, x, 50 - dd * 110, 1.4, 1.4); g.fill(); }
    g.restore();
  },
  // Beemote: besta imensa de tinta coberta de placas de osso, olhos de brasa, presa curva
  behemote(g, b, s, T) {
    g.scale(s, s);
    const st = Math.sin(T * 3) * 2;
    glow(g, -30, -10, 70, '#FF8A3C', 0.16);
    g.fillStyle = INK;
    for (const lx of [-28, -12, 12, 28]) { rr(g, lx - 8, 12 + (lx % 2 ? st : -st), 16, 26, 6); g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke(); }
    ell(g, 0, 0, 52, 32); const gr = g.createLinearGradient(0, -32, 0, 32); gr.addColorStop(0, '#2E2A24'); gr.addColorStop(1, INK2); g.fillStyle = gr; g.fill(); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
    // placas de osso nas costas
    for (let i = 0; i < 5; i++) { const px2 = -24 + i * 14, py2 = -26 + Math.abs(i - 2) * 3; g.beginPath(); g.moveTo(px2 - 9, py2 + 8); g.quadraticCurveTo(px2, py2 - 10, px2 + 9, py2 + 8); g.closePath(); g.fillStyle = mute(BONE, 0.6, 0.12); g.fill(); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke(); }
    g.strokeStyle = 'rgba(200,215,255,.2)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, 48, 28, 0, Math.PI * 1.15, Math.PI * 1.75); g.stroke();
    // cabeça
    ell(g, -44, -8, 20, 17); g.fillStyle = INK2; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    mascara(g, -46, -10, 13, 11, 0);
    g.fillStyle = BONE; g.beginPath(); g.moveTo(-56, -14); g.quadraticCurveTo(-74, -38, -60, -52); g.quadraticCurveTo(-64, -32, -50, -20); g.closePath(); g.fill(); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke();
    cavidades(g, -46, -10, 3, '#FF8A3C');
    g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(48, -4); g.quadraticCurveTo(70, -18 + st * 3, 64, -38); g.stroke();
  },
  // Leviatã: serpente marinha de tinta, barbatanas que brilham em ciano, dentes de osso
  leviata(g, b, s, T) {
    g.scale(s, s);
    if (b.submerged) g.globalAlpha *= 0.3;
    glow(g, 0, -10, 90, '#5ED1E8', 0.22);
    for (let i = 6; i >= 0; i--) {
      const x = 46 - i * 14 + Math.sin(T * 2.4 + i) * 4, y = 20 + Math.cos(T * 1.8 + i) * 6;
      ell(g, x, y, 18 - i, 12 - i * 0.5); g.fillStyle = i % 2 ? INK2 : '#14303A'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(94,209,232,.35)'; g.beginPath(); g.moveTo(x - 4, y - 10); g.lineTo(x, y - 20 + Math.sin(T * 3 + i) * 2); g.lineTo(x + 4, y - 10); g.fill(); g.restore();
    }
    g.beginPath(); g.moveTo(-34, -6); g.quadraticCurveTo(-14, -56, 22, -42); g.quadraticCurveTo(34, -22, 12, 10); g.closePath();
    const gr = g.createLinearGradient(0, -50, 0, 10); gr.addColorStop(0, '#1A3A46'); gr.addColorStop(1, INK2); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(94,209,232,' + (0.45 + 0.25 * Math.sin(T * 3 + i)) + ')'; g.beginPath(); g.moveTo(-16 + i * 9, -36 + i * 3); g.lineTo(-11 + i * 9, -54 + i * 3); g.lineTo(-6 + i * 9, -34 + i * 3); g.fill(); }
    g.restore();
    mascara(g, -8, -24, 11, 9, 0); cavidades(g, -8, -23, 2.8, '#7FF0FF');
    g.fillStyle = BONE; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-30 + i * 6, -4); g.lineTo(-27 + i * 6, 5); g.lineTo(-24 + i * 6, -4); g.fill(); }
    g.strokeStyle = 'rgba(200,235,245,.45)'; g.lineWidth = 1.6; g.beginPath(); for (let x = -64; x <= 64; x += 6) g.lineTo(x, 36 + Math.sin(T * 3 + x * 0.1) * 3); g.stroke();
  },
  // ??? (o Pecado): só um vazio em forma de gente, com dois pontos vermelhos
  pecado(g, b, s, T) {
    g.scale(s, s);
    glow(g, 0, -10, 60, '#000000', 0.7);
    g.fillStyle = 'rgba(2,2,4,.94)';
    g.beginPath(); g.moveTo(-18, 30); g.quadraticCurveTo(-24, -12, 0, -44); g.quadraticCurveTo(24, -12, 18, 30);
    for (let x = 18; x >= -18; x -= 6) g.lineTo(x, 30 + Math.sin(T * 6 + x) * 4);
    g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#FF2E4A'; g.shadowColor = '#FF2E4A'; g.shadowBlur = 16; ell(g, -5, -20, 2.2, 1.2); g.fill(); ell(g, 5, -20, 2.2, 1.2); g.fill(); g.restore();
  }
};
function moeda(g, x, y, r, T) {
  g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y, r * 3, '#FFD36A', 0.35); g.restore();
  ell(g, x, y, r * Math.abs(Math.cos(T * 3 + x)) + 0.8, r); g.fillStyle = '#D9A93A'; g.fill(); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
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
