// Arte das cutscenes: linguagem de cinema, separada dos desenhos do jogo.
// Pessoas são silhuetas adultas em contraluz (proporção real, sem rosto de desenho) com uma borda de luz;
// anjos são figuras de luz com asas de serafim; os chefes são sombras colossais com olhos acesos e fumaça;
// os cenários são pinturas em camadas com perspectiva atmosférica, névoa e arquitetura antiga em silhueta.
import { clamp, lerp, easeOut, hash, fbm, TAU } from '../util.js';
import { WORLD_NPCS } from '../data/npcs.js';

export const VW = 960, VH = 540;

/* ---------- cor ---------- */
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = (r, g, b) => '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
function mix(a, b, k) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); }
const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

/* ---------- texturas (nuvem/fumaça) ---------- */
let NUVEM = null;
function nuvemTex() {
  if (NUVEM) return NUVEM;
  const N = 256; NUVEM = document.createElement('canvas'); NUVEM.width = NUVEM.height = N;
  const x = NUVEM.getContext('2d'), d = x.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N;
    const n = fbm(u * 4, v * 4, 5) * (1 - u) * (1 - v) + fbm((u - 1) * 4, v * 4, 5) * u * (1 - v) + fbm(u * 4, (v - 1) * 4, 5) * (1 - u) * v + fbm((u - 1) * 4, (v - 1) * 4, 5) * u * v;
    const a = clamp((n - 0.38) * 2.4, 0, 1), k = (j * N + i) * 4;
    d.data[k] = d.data[k + 1] = d.data[k + 2] = 255; d.data[k + 3] = a * 255;
  }
  x.putImageData(d, 0, 0); return NUVEM;
}
const TINT = new Map();
function nuvemCor(cor) {
  if (TINT.has(cor)) return TINT.get(cor);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.drawImage(nuvemTex(), 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = cor; x.fillRect(0, 0, 256, 256);
  // borda de cima e de baixo some aos poucos: a faixa de névoa não tem linha reta
  const m = x.createLinearGradient(0, 0, 0, 256); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.35, 'rgba(0,0,0,1)'); m.addColorStop(0.65, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = m; x.fillRect(0, 0, 256, 256);
  TINT.set(cor, c); return c;
}
// faixa de névoa/nuvem que passa devagar
function nevoa(g, y, h, cor, a, T, vel = 6, esc = 2.2) {
  const tam = 256 * esc, img = nuvemCor(cor), ox = -((T * vel) % tam);
  g.save(); g.globalAlpha = a;
  for (let x = ox - tam; x < VW + tam; x += tam) g.drawImage(img, x, y, tam, h);
  g.restore();
}

/* ---------- pintura ---------- */
function ceu(g, stops) {
  const gr = g.createLinearGradient(0, 0, 0, VH);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  g.fillStyle = gr; g.fillRect(-80, -80, VW + 160, VH + 160);
}
function brilho(g, x, y, r, cor, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${cor},${a})`); gr.addColorStop(0.35, `rgba(${cor},${a * 0.35})`); gr.addColorStop(1, `rgba(${cor},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function astro(g, x, y, r, cor, halo) { g.save(); g.globalCompositeOperation = 'screen'; brilho(g, x, y, r * 7, halo, 0.55); g.restore(); g.fillStyle = `rgb(${cor})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function estrelas(g, T, n, alt, a = 1) {
  for (let i = 0; i < n; i++) { const tw = 0.35 + 0.65 * Math.abs(Math.sin(T * (0.3 + hash(i, 9, 2)) + i)); g.fillStyle = `rgba(255,252,240,${tw * a * (0.3 + hash(i, 3, 3) * 0.7)})`; const s = 0.6 + hash(i, 4, 4) * 1.3; g.fillRect(hash(i, 1, 1) * VW, hash(i, 2, 1) * VH * alt, s, s); }
}
// cordilheira orgânica (ruído), com perspectiva atmosférica pela cor
function serra(g, base, amp, seed, cor, freq = 3, aspero = 0.35) {
  g.fillStyle = cor; g.beginPath(); g.moveTo(-80, VH + 80);
  for (let x = -80; x <= VW + 80; x += 6) { const u = x / VW; const n = fbm(u * freq + seed, seed * 0.7, 2) * (1 - aspero) + fbm(u * freq * 6 + seed, seed, 4) * aspero; g.lineTo(x, base - (n - 0.35) * amp * 2); }
  g.lineTo(VW + 80, VH + 80); g.closePath(); g.fill();
}
function chao(g, y, cor) { g.fillStyle = cor; g.fillRect(-80, y, VW + 160, VH - y + 80); }
function coluna(g, x, base, h, w, cor) {
  g.fillStyle = cor;
  g.fillRect(x - w * 0.7, base - w * 0.35, w * 1.4, w * 0.35);              // base
  g.fillRect(x - w / 2, base - h, w, h);                                       // fuste
  g.fillRect(x - w * 0.75, base - h - w * 0.3, w * 1.5, w * 0.3);             // capitel
  g.fillRect(x - w * 0.9, base - h - w * 0.45, w * 1.8, w * 0.16);
}
function arco(g, x, base, w, h, cor) { g.fillStyle = cor; g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x - w / 2, base - h + w / 2); g.arc(x, base - h + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, base); g.closePath(); g.fill(); }
function templo(g, x, base, w, cor) {
  const n = 6, hc = w * 0.42; g.fillStyle = cor;
  g.fillRect(x - w / 2, base - w * 0.06, w, w * 0.06);
  for (let i = 0; i < n; i++) coluna(g, x - w / 2 + w * 0.08 + i * (w * 0.84 / (n - 1)), base - w * 0.06, hc, w * 0.055, cor);
  g.fillRect(x - w / 2, base - w * 0.06 - hc - w * 0.09, w, w * 0.07);
  g.beginPath(); g.moveTo(x - w / 2 - 4, base - w * 0.06 - hc - w * 0.09); g.lineTo(x, base - w * 0.06 - hc - w * 0.26); g.lineTo(x + w / 2 + 4, base - w * 0.06 - hc - w * 0.09); g.closePath(); g.fill();
}
function casas(g, base, x0, x1, cor, seed, janelas = 0, T = 0) {
  let x = x0;
  while (x < x1) {
    const w = 34 + hash(x, seed, 1) * 46, h = 30 + hash(x, seed, 2) * 60;
    g.fillStyle = cor; g.fillRect(x, base - h, w, h);
    if (hash(x, seed, 3) < 0.35) { g.beginPath(); g.arc(x + w / 2, base - h, w * 0.32, Math.PI, 0); g.fill(); }  // cúpula
    if (janelas) for (let k = 0; k < 2; k++) if (hash(x, seed, 10 + k) < janelas) { const a = 0.55 + 0.3 * Math.sin(T * 2 + x + k); g.fillStyle = `rgba(255,196,120,${a})`; g.fillRect(x + w * (0.25 + k * 0.35), base - h * 0.6, 4, 6); }
    x += w + 2;
  }
}
function muralha(g, base, x0, x1, h, cor) {
  g.fillStyle = cor; g.fillRect(x0, base - h, x1 - x0, h);
  for (let x = x0; x < x1; x += 18) g.fillRect(x, base - h - 9, 10, 9);
  for (const tx of [x0, (x0 + x1) / 2 - 20, x1 - 40]) { g.fillRect(tx, base - h * 1.6, 40, h * 1.6); for (let k = 0; k < 3; k++) g.fillRect(tx + k * 15, base - h * 1.6 - 9, 10, 9); }
}
function arvore(g, x, base, h, cor, tipo = 'oliveira') {
  g.fillStyle = cor;
  if (tipo === 'cipreste') { g.beginPath(); g.moveTo(x, base - h); g.quadraticCurveTo(x + h * 0.12, base - h * 0.5, x + h * 0.06, base); g.lineTo(x - h * 0.06, base); g.quadraticCurveTo(x - h * 0.12, base - h * 0.5, x, base - h); g.fill(); return; }
  g.fillRect(x - h * 0.03, base - h * 0.45, h * 0.06, h * 0.45);
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = h * (0.18 + hash(x, i, 6) * 0.1); g.beginPath(); g.arc(x + Math.cos(a) * h * 0.2, base - h * 0.62 + Math.sin(a) * h * 0.13, r, 0, TAU); g.fill(); }
}
function palmeira(g, x, base, h, cor, T) {
  g.strokeStyle = cor; g.lineWidth = h * 0.045; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + h * 0.15, base - h * 0.5, x + h * 0.06, base - h); g.stroke();
  g.fillStyle = cor;
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(T + i) * 0.03; g.save(); g.translate(x + h * 0.06, base - h); g.rotate(a); g.beginPath(); g.ellipse(h * 0.25, h * 0.04, h * 0.28, h * 0.035, 0.25, 0, TAU); g.fill(); g.restore(); }
}
function ondas(g, y, cor, T, alt, vel = 1, seed = 0) {
  g.fillStyle = cor; g.beginPath(); g.moveTo(-80, VH + 80);
  for (let x = -80; x <= VW + 80; x += 8) g.lineTo(x, y - Math.abs(Math.sin(x * 0.011 + T * vel + seed)) * alt - Math.sin(x * 0.031 + T * vel * 1.7 + seed) * alt * 0.3);
  g.lineTo(VW + 80, VH + 80); g.fill();
}
function multidao(g, base, n, cor, T, seed = 1) {
  g.fillStyle = cor;
  for (let i = 0; i < n; i++) { const x = hash(i, seed, 11) * VW, h = 46 + hash(i, seed, 12) * 26, b = Math.sin(T * 1.4 + i) * 1.2; silhuetaSimples(g, x, base + b, h); }
}
function silhuetaSimples(g, x, y, h) {
  g.beginPath(); g.ellipse(x, y - h * 0.9, h * 0.065, h * 0.075, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - h * 0.12, y - h * 0.8); g.quadraticCurveTo(x - h * 0.2, y - h * 0.3, x - h * 0.17, y); g.lineTo(x + h * 0.17, y); g.quadraticCurveTo(x + h * 0.2, y - h * 0.3, x + h * 0.12, y - h * 0.8); g.closePath(); g.fill();
}

/* ======================= Cenas ======================= */
// cada cena: luz principal (posição 0..1 e cor) para os contornos das figuras, e a pintura
export const CENAS = {
  cosmos: { luz: [0.5, 0.5, '255,246,224'], pinta(g, t, T, c) {
    ceu(g, ['#000004', '#04041a', '#0a0822', '#020208']);
    g.save(); g.globalCompositeOperation = 'screen';
    nevoa(g, 80, 260, '#3A2A7A', 0.35, T, 3, 2.6); nevoa(g, 220, 240, '#1E3A7A', 0.3, T, -2, 3);
    g.restore();
    estrelas(g, T, 260, 1);
    if (c?.fx === 'clarão') {
      // "Haja luz": um ponto que acende, raios que rasgam o escuro e um núcleo branco
      const k = easeOut(clamp((t - 0.2) / 3, 0, 1));
      g.save(); g.globalCompositeOperation = 'screen'; g.translate(VW / 2, VH / 2);
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * TAU + T * 0.02, len = (0.3 + hash(i, 7, 2) * 0.9) * VW * k, w = 2 + hash(i, 8, 2) * 10;
        g.save(); g.rotate(a); const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, `rgba(255,246,224,${0.55 * k})`); gr.addColorStop(1, 'rgba(255,246,224,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w * 0.2); g.lineTo(len, -w); g.lineTo(len, w); g.lineTo(0, w * 0.2); g.fill(); g.restore();
      }
      brilho(g, 0, 0, 40 + k * 300, '255,240,210', 0.9 * k); brilho(g, 0, 0, 14 + k * 50, '255,255,250', 1);
      g.restore();
    }
  } },
  eden: { luz: [0.72, 0.18, '255,232,180'], pinta(g, t, T) {
    ceu(g, ['#6E8FB8', '#C8B8A8', '#F2D2A0', '#F8E2B8']);
    astro(g, 0.72 * VW, 0.18 * VH, 26, '255,248,226', '255,232,180');
    serra(g, 300, 70, 1.3, '#9AA4A8', 2.4); nevoa(g, 250, 90, '#FFF2DC', 0.55, T, 4);
    serra(g, 350, 60, 4.1, '#5E7468', 3); nevoa(g, 320, 70, '#F8E8D0', 0.45, T, 6);
    chao(g, 420, '#263428'); serra(g, 430, 30, 7.2, '#263428', 5);
    // rio de luz
    const gr = g.createLinearGradient(0, 430, 0, VH); gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(1, 'rgba(255,236,190,.05)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(420, 430); g.quadraticCurveTo(560, 480, 470, VH + 20); g.lineTo(620, VH + 20); g.quadraticCurveTo(640, 470, 500, 430); g.fill();
    for (let i = 0; i < 6; i++) arvore(g, 60 + i * 175 + hash(i, 1, 1) * 40, 432, 140 + hash(i, 2, 2) * 90, '#17201A', i % 3 ? 'oliveira' : 'cipreste');
  } },
  queda: { luz: [0.72, 0.2, '220,150,140'], pinta(g, t, T, c) {
    CENAS.eden.pinta(g, t, T, c);
    const k = clamp(t / 6, 0, 1);
    g.fillStyle = `rgba(28,6,14,${0.25 + k * 0.5})`; g.fillRect(-80, -80, VW + 160, VH + 160);
    // a árvore e a serpente em silhueta
    arvore(g, 690, 440, 300, '#0A0608');
    g.strokeStyle = '#050304'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 40; i++) { const y = 420 - i * 5, x = 690 + Math.sin(i * 0.45 + T * 1.5) * 16; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 690 + Math.sin(40 * 0.45 + T * 1.5) * 16, 222, 14, '255,60,60', 0.9); g.restore();
  } },
  sombras: { luz: [0.5, 0.1, '200,170,220'], pinta(g, t, T) {
    ceu(g, ['#08060E', '#16101E', '#22182A', '#0A0810']);
    serra(g, 330, 70, 2.2, '#140E1A', 2.6); nevoa(g, 300, 120, '#5A3A6A', 0.4, T, 5);
    chao(g, 420, '#08060A');
    // multidão de sombras com olhos acesos, de vários tons
    const cores = ['#7FB069', '#8E98BE', '#6CCB5F', '#F2C14E', '#8B6AD6', '#FF5A3C', '#4B4E6D', '#C79BFF', '#9FE6F0', '#F06FB4'];
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 4, 1) * VW, z = 0.5 + hash(i, 5, 1) * 0.9, y = 360 + z * 90 + Math.sin(T * 0.7 + i) * 4, h = 60 * z;
      g.fillStyle = mix('#05030A', '#1A1424', 1 - z * 0.6); sombraFumaca(g, x, y, h, T + i);
      const cor = cores[i % cores.length], [r, gg, b] = rgb(cor);
      g.save(); g.globalCompositeOperation = 'screen'; for (const sd of [-1, 1]) brilho(g, x + sd * h * 0.08, y - h * 0.72, h * 0.12, `${r},${gg},${b}`, 0.9); g.restore();
    }
    nevoa(g, 420, 140, '#2A1A34', 0.7, T, 8);
  } },
  luz: { luz: [0.5, 0.12, '255,240,200'], pinta(g, t, T) {
    ceu(g, ['#0A0812', '#2A1C2A', '#7A5040', '#E8B070']);
    g.save(); g.globalCompositeOperation = 'screen';
    g.translate(VW / 2, VH * 0.12);
    for (let i = 0; i < 18; i++) { g.rotate(TAU / 18 + Math.sin(T * 0.1) * 0.002); const a = 0.06 + 0.05 * Math.sin(T * 0.6 + i * 1.3); const gr = g.createLinearGradient(0, 0, 0, VH * 1.3); gr.addColorStop(0, `rgba(255,240,200,${a * 2})`); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-70, VH * 1.3); g.lineTo(70, VH * 1.3); g.lineTo(6, 0); g.fill(); }
    g.restore();
    astro(g, VW / 2, VH * 0.12, 18, '255,252,240', '255,236,190');
    nevoa(g, 300, 120, '#FFD8A0', 0.35, T, 3);
    serra(g, 440, 40, 3.3, '#120A0E', 2);
    // a cruz no monte
    g.fillStyle = '#0A0608'; g.fillRect(VW / 2 - 4, 300, 8, 140); g.fillRect(VW / 2 - 34, 330, 68, 7);
    chao(g, 455, '#0A0608');
  } },
  cidade: { luz: [0.78, 0.55, '255,196,130'], pinta(g, t, T) {
    ceu(g, ['#1E1A38', '#5A3A5A', '#C8705A', '#F2B070']);
    astro(g, 0.78 * VW, 0.55 * VH, 34, '255,220,170', '255,180,120');
    nevoa(g, 160, 120, '#F2A080', 0.3, T, 3, 3);
    serra(g, 330, 40, 1.7, '#6A3E50', 2);
    muralha(g, 390, 120, 840, 60, '#2A1A22'); casas(g, 330, 160, 800, '#2A1A22', 3, 0.5, T);
    // portão aceso
    g.fillStyle = '#0E080A'; arco(g, 480, 392, 54, 70, '#0E080A');
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 480, 360, 70, '255,190,110', 0.8); g.restore();
    chao(g, 390, '#120A0C');
    const gr = g.createLinearGradient(0, 390, 0, VH); gr.addColorStop(0, 'rgba(255,190,120,.25)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(455, 392); g.lineTo(505, 392); g.lineTo(640, VH + 20); g.lineTo(320, VH + 20); g.fill();
    nevoa(g, 380, 90, '#C87A6A', 0.35, T, 7);
  } },
  portais: { luz: [0.5, 0.4, '230,200,255'], pinta(g, t, T) { corredorTemplo(g, T, { cor: '230,200,255', luz: 0.9 }); } },
  corinto: { luz: [0.18, 0.2, '255,236,200'], pinta(g, t, T) {
    ceu(g, ['#6A88B0', '#B8C0C8', '#F0D8B0', '#F8E8C8']);
    astro(g, 0.18 * VW, 0.2 * VH, 22, '255,250,232', '255,236,200');
    nevoa(g, 110, 100, '#FFFFFF', 0.4, T, 3, 3);
    // mar e navios ao longe
    const gr = g.createLinearGradient(0, 300, 0, 380); gr.addColorStop(0, '#9AB0C0'); gr.addColorStop(1, '#5E7A90'); g.fillStyle = gr; g.fillRect(-80, 300, VW + 160, 80);
    for (let i = 0; i < 4; i++) { const x = (150 + i * 230 + T * 4) % (VW + 100) - 50; g.fillStyle = '#3A4A58'; g.beginPath(); g.moveTo(x - 22, 316); g.lineTo(x + 22, 316); g.lineTo(x + 15, 324); g.lineTo(x - 15, 324); g.fill(); g.beginPath(); g.moveTo(x, 288); g.lineTo(x + 16, 314); g.lineTo(x, 314); g.fill(); }
    serra(g, 330, 120, 2.8, '#8A8070', 2, 0.25); nevoa(g, 300, 80, '#F8ECD8', 0.45, T, 5);
    templo(g, 660, 250, 230, '#4A443C');
    casas(g, 400, -40, VW + 40, '#2A2622', 7);
    chao(g, 400, '#1C1A18'); multidao(g, 430, 18, '#0E0C0C', T, 2);
  } },
  agora: { luz: [0.3, 0.15, '255,226,180'], pinta(g, t, T) {
    ceu(g, ['#C89A68', '#E8C090', '#F2D8B0']);
    astro(g, 0.3 * VW, 0.15 * VH, 24, '255,246,220', '255,220,160');
    templo(g, 480, 270, 420, '#6A5440');
    for (const x of [40, 160, 800, 920]) coluna(g, x, 470, 380, 40, '#2A2018');
    // bancas com toldos
    for (let i = 0; i < 5; i++) { const x = 220 + i * 130, cor = ['#5A2A20', '#2A3A2A', '#3A2A40', '#20303A', '#4A3020'][i]; g.fillStyle = cor; g.beginPath(); g.moveTo(x - 54, 360); g.lineTo(x + 54, 360); g.lineTo(x + 62, 388); g.lineTo(x - 62, 388); g.fill(); g.fillStyle = '#1A1410'; g.fillRect(x - 48, 388, 96, 46); }
    chao(g, 430, '#1A1410'); multidao(g, 450, 22, '#0C0806', T, 3);
    nevoa(g, 380, 100, '#F2C890', 0.3, T, 5);
  } },
  oficina: { luz: [0.15, 0.25, '255,200,130'], pinta(g, t, T) {
    ceu(g, ['#140C08', '#2A1A10', '#3A2416']);
    // janela alta com luz entrando
    g.fillStyle = 'rgba(255,214,150,.9)'; g.fillRect(110, 70, 90, 120);
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 155, 130, 160, '255,200,130', 0.6); g.restore();
    // tendas e couros pendurados em silhueta
    for (let i = 0; i < 5; i++) { const x = 260 + i * 150; g.fillStyle = '#1A100A'; g.beginPath(); g.moveTo(x - 70, 40); g.quadraticCurveTo(x, 70 + Math.sin(T * 0.8 + i) * 5, x + 70, 40); g.lineTo(x + 60, 280); g.quadraticCurveTo(x, 300 + Math.sin(T + i) * 4, x - 60, 280); g.fill(); }
    g.fillStyle = '#0C0806'; g.fillRect(120, 400, 720, 18); g.fillRect(140, 418, 14, 60); g.fillRect(806, 418, 14, 60);
    chao(g, 470, '#0C0806');
  } },
  sinagoga: { luz: [0.5, 0.4, '250,204,115'], pinta(g, t, T) { corredorTemplo(g, T, { cor: '250,204,115', luz: 0.85, largura: 0.9 }); } },
  casa: { luz: [0.74, 0.3, '190,200,255'], pinta(g, t, T) {
    ceu(g, ['#0A0A14', '#14141E', '#1C1A22']);
    // janela com lua
    g.fillStyle = '#1A2244'; g.fillRect(640, 90, 160, 140); estrelas(g, T, 20, 0.35);
    astro(g, 740, 140, 14, '230,236,255', '180,200,255');
    g.fillStyle = '#05050A'; g.fillRect(714, 90, 8, 140); g.fillRect(640, 156, 160, 8);
    // lamparina sobre a mesa
    g.fillStyle = '#06060A'; g.fillRect(170, 390, 300, 18); g.fillRect(190, 408, 12, 60); g.fillRect(440, 408, 12, 60);
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 300, 380, 150, '255,190,110', 0.55 + Math.sin(T * 7) * 0.04); g.restore();
    chao(g, 470, '#06060A');
  } },
  tribunal: { luz: [0.5, 0.4, '255,236,210'], pinta(g, t, T) { corredorTemplo(g, T, { cor: '255,236,210', luz: 1, largura: 1.25, vpy: 0.38 }); } },
  deserto: { luz: [0.7, 0.24, '255,214,150'], pinta(g, t, T) {
    ceu(g, ['#B07040', '#E0A060', '#F2C888', '#F8DCA8']);
    astro(g, 0.7 * VW, 0.24 * VH, 34, '255,240,206', '255,200,130');
    serra(g, 330, 50, 1.4, '#C08A58', 1.6, 0.1); nevoa(g, 300, 80, '#F8D8A8', 0.5, T, 14, 3);
    serra(g, 390, 70, 3.7, '#7A5034', 1.8, 0.08); nevoa(g, 370, 80, '#E8B880', 0.45, T, 22, 3);
    serra(g, 460, 60, 6.2, '#3A2418', 2.2, 0.05);
    nevoa(g, 420, 140, '#E0A870', 0.35, T, 40, 2.4); // areia soprando
  } },
  mar: { luz: [0.6, 0.15, '180,220,240'], pinta(g, t, T) {
    ceu(g, ['#06101A', '#102030', '#1A3040', '#0A1420']);
    for (let i = 0; i < 3; i++) nevoa(g, 30 + i * 60, 140, '#0A1218', 0.75, T, 5 + i * 3, 3);
    ondas(g, 300, '#0E2230', T, 30, 0.9, 0);
    ondas(g, 360, '#0A1A26', T, 40, 1.1, 2);
    ondas(g, 430, '#06121C', T, 50, 1.3, 4);
    g.save(); g.globalCompositeOperation = 'screen'; nevoa(g, 360, 140, '#9AC8DA', 0.18, T, 30, 2); g.restore();
  } },
  costa: { luz: [0.64, 0.5, '255,200,160'], pinta(g, t, T) {
    ceu(g, ['#2A3A60', '#A87080', '#F0B088', '#F8D8A8']);
    astro(g, 0.64 * VW, 0.5 * VH, 32, '255,226,190', '255,180,130');
    const gr = g.createLinearGradient(0, 300, 0, 420); gr.addColorStop(0, '#7A6A7A'); gr.addColorStop(1, '#2A2A3A'); g.fillStyle = gr; g.fillRect(-80, 300, VW + 160, 120);
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,210,170,.35)'; for (let i = 0; i < 12; i++) g.fillRect(0.64 * VW - 40 + Math.sin(T + i) * 10, 306 + i * 9, 80 - i * 4, 2); g.restore();
    serra(g, 430, 40, 2.2, '#140E12', 2); palmeira(g, 90, 440, 220, '#0C080A', T); palmeira(g, 860, 450, 180, '#0C080A', T + 1);
    chao(g, 440, '#0C080A');
  } },
  vale: { luz: [0.5, 0.18, '255,236,200'], pinta(g, t, T) {
    ceu(g, ['#7A90A8', '#C0C4C0', '#E8DCC0']);
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, VW / 2, VH * 0.2, 300, '255,240,210', 0.5); g.restore();
    serra(g, 320, 50, 2, '#8A8E88', 2); nevoa(g, 290, 80, '#F2ECE0', 0.5, T, 4);
    // encostas dos dois exércitos
    g.fillStyle = '#3A3E36'; g.beginPath(); g.moveTo(-80, 230); g.quadraticCurveTo(220, 250, 360, 470); g.lineTo(-80, VH + 80); g.fill();
    g.beginPath(); g.moveTo(VW + 80, 230); g.quadraticCurveTo(740, 250, 600, 470); g.lineTo(VW + 80, VH + 80); g.fill();
    for (let i = 0; i < 9; i++) { g.fillStyle = '#1C1E1A'; g.beginPath(); g.moveTo(20 + i * 30, 260 + i * 16); g.lineTo(34 + i * 30, 238 + i * 16); g.lineTo(48 + i * 30, 260 + i * 16); g.fill(); g.beginPath(); g.moveTo(VW - 20 - i * 30, 260 + i * 16); g.lineTo(VW - 34 - i * 30, 238 + i * 16); g.lineTo(VW - 48 - i * 30, 260 + i * 16); g.fill(); }
    chao(g, 470, '#22241E');
    nevoa(g, 420, 100, '#D8D4C8', 0.3, T, 6);
  } },
  colinas: { luz: [0.2, 0.2, '255,240,206'], pinta(g, t, T) {
    ceu(g, ['#7A9ABA', '#C8D0C8', '#F2E2C0']);
    astro(g, 0.2 * VW, 0.2 * VH, 20, '255,250,232', '255,236,200');
    nevoa(g, 90, 100, '#FFFFFF', 0.5, T, 4, 3);
    serra(g, 320, 60, 1.1, '#8A9A90', 2); nevoa(g, 290, 70, '#F8F0E0', 0.5, T, 5);
    serra(g, 380, 60, 3.4, '#4E5E50', 2.4); serra(g, 450, 50, 5.9, '#1E2A20', 3);
    for (let i = 0; i < 4; i++) arvore(g, 120 + i * 250, 456, 120, '#141C14', i % 2 ? 'cipreste' : 'oliveira');
  } },
  campos: { luz: [0.25, 0.3, '255,226,160'], pinta(g, t, T) {
    ceu(g, ['#8A9AB0', '#E0C8A0', '#F8D898']);
    astro(g, 0.25 * VW, 0.3 * VH, 26, '255,244,210', '255,220,150');
    serra(g, 330, 40, 2.3, '#9A8A68', 2); nevoa(g, 300, 70, '#F8E8C8', 0.5, T, 5);
    const gr = g.createLinearGradient(0, 360, 0, VH); gr.addColorStop(0, '#A88848'); gr.addColorStop(1, '#3A2A14'); g.fillStyle = gr; g.fillRect(-80, 360, VW + 160, VH);
    g.strokeStyle = 'rgba(30,20,8,.55)'; g.lineWidth = 1.4; for (let x = -80; x < VW + 80; x += 7) { const s = Math.sin(T * 1.2 + x * 0.03) * 5; g.beginPath(); g.moveTo(x, VH + 10); g.lineTo(x + s, 400 + hash(x, 1, 1) * 40); g.stroke(); }
  } },
  floresta: { luz: [0.4, 0.05, '230,255,220'], pinta(g, t, T) {
    ceu(g, ['#2A3A30', '#4A5A48', '#6A7A60']);
    for (let r = 0; r < 4; r++) { const cor = mix('#5A6A58', '#0A100C', r / 3); for (let i = 0; i < 9; i++) arvore(g, i * 120 + r * 50 - 30 + hash(i, r, 3) * 30, 330 + r * 55, 200 + r * 60, cor, (i + r) % 3 ? 'oliveira' : 'cipreste'); nevoa(g, 260 + r * 50, 90, '#C8D8C0', 0.25 - r * 0.05, T, 3 + r); }
  } },
  lago: { luz: [0.6, 0.2, '240,244,255'], pinta(g, t, T) {
    ceu(g, ['#6A7A9A', '#B0B8C8', '#E0DCD8']);
    serra(g, 300, 50, 2.6, '#6A7280', 2); nevoa(g, 270, 80, '#F0F0F0', 0.55, T, 3);
    const gr = g.createLinearGradient(0, 310, 0, VH); gr.addColorStop(0, '#9AA4B8'); gr.addColorStop(1, '#2A3242'); g.fillStyle = gr; g.fillRect(-80, 310, VW + 160, VH);
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = 320 + i * i * 1.3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= VW; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + T + i) * 1.2); g.stroke(); }
    // o barco
    const bx = 600 + Math.sin(T * 0.3) * 14, by = 372 + Math.sin(T) * 2;
    g.fillStyle = '#10141C'; g.beginPath(); g.moveTo(bx - 70, by); g.lineTo(bx + 70, by); g.lineTo(bx + 52, by + 18); g.lineTo(bx - 52, by + 18); g.fill(); g.fillRect(bx - 2, by - 90, 4, 90);
    nevoa(g, 330, 70, '#E8ECF0', 0.3, T, 6);
  } },
  noite: { luz: [0.78, 0.18, '200,214,255'], pinta(g, t, T) {
    ceu(g, ['#02030A', '#060A1C', '#0E1430', '#05060E']);
    estrelas(g, T, 200, 0.75); astro(g, 0.78 * VW, 0.18 * VH, 16, '236,240,255', '170,190,255');
    serra(g, 380, 50, 3.8, '#070A16', 2.5);
    muralha(g, 440, 300, 660, 70, '#04050C');
    g.save(); g.globalCompositeOperation = 'screen'; for (const x of [420, 540]) brilho(g, x, 360, 50 + Math.sin(T * 9 + x) * 3, '255,170,90', 0.7); g.restore();
    chao(g, 440, '#03040A');
    nevoa(g, 400, 120, '#2A3460', 0.4, T, 4);
  } },
  trono: { luz: [0.5, 0.95, '255,90,40'], pinta(g, t, T) {
    ceu(g, ['#020000', '#120204', '#2A0608', '#4A0A08']);
    // pilares quebrados
    for (let i = 0; i < 7; i++) { const x = 40 + i * 145, h = 260 + hash(i, 1, 9) * 160; g.fillStyle = '#060102'; g.beginPath(); g.moveTo(x - 28, 470); g.lineTo(x - 24, 470 - h); g.lineTo(x - 4, 470 - h - 26 * hash(i, 2, 9)); g.lineTo(x + 26, 470 - h + 20); g.lineTo(x + 28, 470); g.fill(); }
    chao(g, 460, '#050001');
    // rachaduras de brasa no chão
    g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = 'rgba(255,90,30,.9)'; g.lineWidth = 2.2; g.shadowColor = '#FF5A1C'; g.shadowBlur = 16;
    for (let i = 0; i < 8; i++) { g.beginPath(); let x = 60 + i * 120, y = 462; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i, k, 4) - 0.5) * 70; y += 16; g.lineTo(x, y); } g.stroke(); }
    g.restore();
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, VW / 2, VH, 520, '255,70,30', 0.55); nevoa(g, 360, 200, '#FF6A3A', 0.2, T, 10); g.restore();
  } },
  muralha: { luz: [0.3, 0.3, '255,214,170'], pinta(g, t, T) {
    ceu(g, ['#C08A68', '#E8B888', '#F2D2A8']);
    astro(g, 0.3 * VW, 0.3 * VH, 28, '255,240,210', '255,206,160');
    muralha(g, 440, -40, VW + 40, 200, '#3A2A24'); nevoa(g, 380, 100, '#E8C0A0', 0.35, T, 5);
    chao(g, 440, '#1A120E');
  } },
  carmelo: { luz: [0.5, 0.0, '255,200,120'], pinta(g, t, T) {
    ceu(g, ['#140A14', '#3A1A24', '#8A4A40', '#D88A58']);
    g.fillStyle = '#100808'; g.beginPath(); g.moveTo(-80, VH + 80); g.lineTo(380, 250); g.lineTo(580, 260); g.lineTo(VW + 80, VH + 80); g.fill();
    // fogo do céu sobre o altar
    g.save(); g.globalCompositeOperation = 'screen';
    const gr = g.createLinearGradient(0, -40, 0, 250); gr.addColorStop(0, 'rgba(255,240,200,.0)'); gr.addColorStop(1, 'rgba(255,200,110,.95)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(460, -40); g.lineTo(520, -40); g.lineTo(560, 250); g.lineTo(420, 250); g.fill();
    for (let k = 0; k < 8; k++) brilho(g, 490 + Math.sin(T * 8 + k) * 10, 240 - k * 14, 50 - k * 4, '255,150,60', 0.6);
    g.restore();
  } }
};

/* ======================= Linguagem do Isaías 6 ======================= */
// Silhueta quase preta + borda de luz que brilha (o "rim"). Mesmo truque do vídeo: pinta a forma na cor da luz e cobre com
// ela mesma deslocada para longe da luz; o que sobra é a borda. Depois a borda ganha um brilho borrado.
const PRETO = '#070608';
function rimLuz(g, path, ux, uy, k, cor, forca = 1, cx = 0, cy = 0) {
  g.save(); g.clip(path);
  g.fillStyle = `rgba(${cor},${Math.min(1, 0.95 * forca)})`; g.fill(path);
  g.translate(-ux * k, -uy * k); g.fillStyle = PRETO; g.fill(path);
  g.restore();
  // brilho da borda vazando para fora (bloom local), só do lado virado para a luz
  const px = -uy, py = ux, L = 6000;
  g.save(); g.beginPath(); g.moveTo(cx + px * L, cy + py * L); g.lineTo(cx + px * L + ux * L, cy + py * L + uy * L); g.lineTo(cx - px * L + ux * L, cy - py * L + uy * L); g.lineTo(cx - px * L, cy - py * L); g.closePath(); g.clip();
  g.globalCompositeOperation = 'screen'; g.shadowColor = `rgba(${cor},${0.8 * forca})`; g.shadowBlur = k * 5; g.strokeStyle = `rgba(${cor},${0.3 * forca})`; g.lineWidth = k * 0.6;
  g.translate(ux * k * 0.3, uy * k * 0.3); g.stroke(path); g.restore();
}

// perfil do rosto (mesmos pontos do Isaías 6): close-up com a luz recortando a testa, o nariz, os lábios e a barba
const PERFIL = [[-0.05, -0.62], [0.06, -0.5], [0.08, -0.3], [0.11, -0.23], [0.06, -0.17], [0.09, -0.12],
  [0.21, 0.0], [0.2, 0.03], [0.13, 0.06], [0.115, 0.1], [0.135, 0.135], [0.11, 0.165],
  [0.125, 0.19], [0.12, 0.215], [0.11, 0.26], [0.15, 0.36], [0.16, 0.5], [0.11, 0.66],
  [0.02, 0.78], [0.1, 0.9], [0.3, 1.05], [0.42, 1.8], [-0.9, 1.8], [-0.75, 1.05],
  [-0.48, 0.75], [-0.4, 0.45], [-0.5, 0.2], [-0.56, -0.12], [-0.5, -0.42], [-0.32, -0.62]];
const SEM_BARBA = [[0.11, 0.26], [0.08, 0.32], [0.0, 0.36], [-0.06, 0.42], [-0.02, 0.6]];
const CAPUZ = [[-0.12, -0.7], [0.1, -0.52], [0.13, -0.3], [0.0, -0.2], [-0.15, 0.4], [-0.2, 1.0], [-0.95, 1.2], [-0.62, -0.35], [-0.38, -0.66]];
export function perfil(g, cx, cy, F, o, luz) {
  const vira = o.vira || 1, barba = o.barba !== false, fala = o.fala || 0;
  const pts = PERFIL.map(([x, y], i) => {
    if (i >= 11 && i <= 18) y += fala * (i === 11 || i === 18 ? 0.5 : 1);
    if (!barba && i >= 14 && i <= 18) [x, y] = SEM_BARBA[i - 14];
    return [cx + x * F * vira, cy + y * F];
  });
  const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath();
  if (o.capuz) { const h = new Path2D(); CAPUZ.forEach(([x, y], i) => { const X = cx + x * F * vira, Y = cy + y * F; i ? h.lineTo(X, Y) : h.moveTo(X, Y); }); h.closePath(); p.addPath(h); }
  g.fillStyle = PRETO; g.fill(p);
  // a pele pega um pouco de luz perto da borda (meia-luz no rosto)
  g.save(); g.clip(p); const gr = g.createLinearGradient(cx + vira * F * 0.2, cy, cx - vira * F * 0.1, cy); gr.addColorStop(0, `rgba(${o.pele || '150,95,60'},.55)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - F, cy - F, F * 2, F * 3); g.restore();
  { const dx = luz.x - cx, dy = luz.y - cy, dl = Math.hypot(dx, dy) || 1; rimLuz(g, p, dx / dl, dy / dl, Math.max(2, F * 0.012), luz.cor, 1.3, cx, cy + F * 0.3); }
  // olho com o brilho
  const [ex, ey] = pts[4], exx = ex - vira * F * 0.03;
  g.fillStyle = '#030202'; g.beginPath(); g.ellipse(exx, ey + F * 0.005, F * 0.022, F * 0.008, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = 'screen'; brilho(g, exx + vira * F * 0.008, ey, F * 0.012, '255,250,235', 1); g.restore();
}

// serafim (Is 6:2): seis asas — duas cobrem o rosto, duas cobrem os pés, duas voam. Igual ao desenho do vídeo.
function pena(g, rx, ry, a, L, w) {
  const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
  g.moveTo(rx, ry); g.lineTo(rx + ca * L * 0.32 + px * w / 2, ry + sa * L * 0.32 + py * w / 2); g.lineTo(rx + ca * L, ry + sa * L); g.lineTo(rx + ca * L * 0.32 - px * w / 2, ry + sa * L * 0.32 - py * w / 2); g.closePath();
}
function asaPenas(g, rx, ry, base, abre, n, L, w, ordem, luz) {
  g.beginPath(); for (let i = 0; i < n; i++) { const f = i / (n - 1); pena(g, rx, ry, base + abre * (f - 0.5) * ordem, L * (0.55 + 0.45 * f), w * (0.8 + 0.4 * f)); }
  g.fillStyle = `rgba(${luz},${0.78})`; g.fill(); g.strokeStyle = 'rgba(120,80,30,.55)'; g.lineWidth = 1; g.stroke();
}
export function serafim(g, x, y, s, fase, cor = '255,214,140', curva = 0) {
  g.save(); g.globalCompositeOperation = 'screen';
  brilho(g, x, y - s * 0.1, s * 1.3, cor, 0.35); brilho(g, x, y - s * 0.1, s * 0.5, '255,246,224', 0.45);
  const lift = 0.25 + 0.42 * Math.sin(fase);
  for (const sd of [-1, 1]) {
    const base = sd < 0 ? Math.PI + lift : -lift, o = sd < 0 ? 1 : -1;
    asaPenas(g, x + sd * 0.05 * s, y - 0.2 * s, base, 1.15, 11, 0.98 * s, 0.11 * s, o, cor);
    asaPenas(g, x + sd * 0.05 * s, y - 0.2 * s, base - o * 0.1, 0.85, 8, 0.52 * s, 0.1 * s, o, '255,236,200');
  }
  g.fillStyle = 'rgba(255,250,236,.95)'; g.beginPath(); g.ellipse(x, y - 0.02 * s, 0.075 * s, 0.34 * s, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x, y - 0.44 * s + curva * 0.06 * s, 0.06 * s, 0.07 * s, 0, 0, TAU); g.fill();
  for (const sd of [-1, 1]) asaPenas(g, x + sd * 0.06 * s, y + 0.1 * s, Math.PI / 2 + sd * 0.35, 0.7, 7, 0.56 * s, 0.1 * s, sd, '255,226,170');
  for (const sd of [-1, 1]) asaPenas(g, x + sd * 0.065 * s, y - 0.3 * s + curva * 0.05 * s, -Math.PI / 2 - sd * (0.47 - curva * 0.1), 0.8, 7, 0.44 * s, 0.1 * s, sd, '255,240,210');
  g.restore();
}

// corredor do templo em perspectiva (colunas que somem na luz; juntas do chão; reflexo dourado no piso; raios)
export function corredorTemplo(g, T, o = {}) {
  const vx = VW / 2, vy = VH * (o.vpy ?? 0.42), luz = o.luz ?? 1, cor = o.cor || '250,204,115', camz = o.camz ?? (T * 0.02) % 1.1;
  const base = g.createLinearGradient(0, 0, 0, VH); base.addColorStop(0, '#050506'); base.addColorStop(vy / VH, mix('#050506', '#33210F', luz)); base.addColorStop(1, '#050506');
  g.fillStyle = base; g.fillRect(-80, -80, VW + 160, VH + 160);
  // reflexo no chão
  g.save(); g.globalCompositeOperation = 'screen'; const rf = g.createLinearGradient(0, vy, 0, VH); rf.addColorStop(0, `rgba(${cor},${0.5 * luz})`); rf.addColorStop(1, `rgba(${cor},0)`);
  g.fillStyle = rf; g.beginPath(); g.moveTo(vx - 6, vy); g.lineTo(vx + 6, vy); g.lineTo(vx + 160, VH + 40); g.lineTo(vx - 160, VH + 40); g.fill(); g.restore();
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 22; i++) { const a = i * TAU / 22 + 0.15 * Math.sin(T * 0.2 + i); const gr = g.createLinearGradient(vx, vy, vx + Math.cos(a) * 900, vy + Math.sin(a) * 900); gr.addColorStop(0, `rgba(${cor},${0.09 * luz})`); gr.addColorStop(1, `rgba(${cor},0)`); g.fillStyle = gr; g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + Math.cos(a - 0.02) * 1200, vy + Math.sin(a - 0.02) * 1200); g.lineTo(vx + Math.cos(a + 0.02) * 1200, vy + Math.sin(a + 0.02) * 1200); g.fill(); }
  g.restore();
  const zs = []; for (let k = -5; k < 18; k++) { const z = 1.2 + k * 1.1 - camz; if (z > 0.16) zs.push(z); } zs.sort((a, b) => b - a);
  const esc = 0.5; // o vídeo era 1080 de largura; aqui o quadro virtual tem 960
  for (const z of zs) { const yj = vy + 520 * esc / z; if (yj < VH) { g.fillStyle = 'rgba(16,13,11,.9)'; g.fillRect(-80, yj, VW + 160, Math.max(1, 3 / z)); } }
  for (const z of zs) {
    const s = esc / z, xin = 190 * s * (o.largura || 1), xout = 315 * s * (o.largura || 1), yb = vy + 520 * s, yt = vy - 1700 * s, nev = Math.min(z / 13, 1);
    const col = mix('#08080A', '#8C6633', luz * nev * 0.5), rim = `rgba(${cor},${luz * (1 - nev * 0.55) / (1 + 0.06 * z)})`;
    for (const sd of [-1, 1]) {
      const x1 = vx + sd * xin, x2 = vx + sd * xout;
      g.fillStyle = col; g.fillRect(Math.min(x1, x2), yt, Math.abs(x2 - x1), yb - yt);
      g.fillStyle = mix(col, '#FFFFFF', 0.03); g.fillRect(Math.min(x1, x2) - 12 * s, yb - 70 * s, Math.abs(x2 - x1) + 24 * s, 70 * s);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, 4 * s); for (const fr of [0.25, 0.5, 0.75]) { const xf = x1 + sd * (xout - xin) * fr; g.beginPath(); g.moveTo(xf, yt); g.lineTo(xf, yb - 70 * s); g.stroke(); }
      const rw = Math.max(1.2, 11 * s); g.fillStyle = rim; g.fillRect(Math.min(x1, x1 + sd * rw), yt, rw, yb - yt);
    }
  }
  g.save(); g.globalCompositeOperation = 'screen';
  brilho(g, vx, vy, VH * 0.6 * Math.sqrt(luz), cor, 0.9 * luz); brilho(g, vx, vy, 60 * luz, '255,246,224', 1);
  g.restore();
}

// fumaça iluminada pela luz da cena + poeira caindo + faíscas: a "atmosfera" de todos os planos do vídeo
export function atmosferaCine(g, T, luz, dens = 1) {
  g.save();
  nevoa(g, VH * 0.1, VH * 0.9, '#120E0C', 0.55 * dens, T, 14, 2.6);
  g.globalCompositeOperation = 'screen';
  // fumaça clara só perto da luz
  g.save(); g.beginPath(); g.arc(luz.x, luz.y, VH * 0.75, 0, TAU); g.clip();
  nevoa(g, luz.y - VH * 0.5, VH, `rgb(${luz.cor})`, 0.16 * dens, T, -9, 2.2);
  g.restore();
  for (let i = 0; i < 90; i++) { // poeira descendo devagar
    const x = (hash(i, 31, 1) * VW + Math.sin(T * 0.7 + i) * 6) % VW, y = (hash(i, 32, 1) * VH + T * (8 + hash(i, 33, 1) * 14)) % VH;
    const perto = clamp(1 - Math.hypot(x - luz.x, y - luz.y) / (VH * 0.9), 0, 1);
    g.fillStyle = `rgba(${luz.cor},${0.15 + perto * 0.7})`; g.fillRect(x, y, 1.3, 1.3);
  }
  for (let i = 0; i < 24; i++) { // faíscas maiores que piscam
    const x = (hash(i, 41, 2) * VW + T * 6) % VW, y = (hash(i, 42, 2) * VH - T * 10 + VH * 10) % VH, b = 0.4 + 0.6 * Math.abs(Math.sin(T * 2 * (0.5 + hash(i, 43, 2)) + i));
    brilho(g, x, y, 4, luz.cor, 0.6 * b);
  }
  g.restore();
}

/* ======================= Figuras ======================= */
function lookDe(p, opts) {
  if (p === 'jogador') return opts.look || { tunic: '#3B4CCA', cape: '#F2C14E', style: 'curto' };
  if (typeof p === 'string' && p.startsWith('npc:')) return WORLD_NPCS.find(n => n.id === p.slice(4))?.look;
  return typeof p === 'object' ? p : null;
}
// fumaça na base das sombras (borda irregular que se mexe)
function sombraFumaca(g, x, y, h, T) {
  g.beginPath(); g.ellipse(x, y - h * 0.72, h * 0.12, h * 0.14, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - h * 0.16, y - h * 0.62);
  g.quadraticCurveTo(x - h * 0.3, y - h * 0.2, x - h * 0.24, y);
  for (let i = 0; i <= 6; i++) g.lineTo(x - h * 0.24 + i * h * 0.08, y + Math.sin(T * 3 + i) * h * 0.05 + (i % 2 ? h * 0.04 : 0));
  g.quadraticCurveTo(x + h * 0.3, y - h * 0.2, x + h * 0.16, y - h * 0.62); g.closePath(); g.fill();
}

// Pessoa em silhueta adulta (pés em x,y; H = altura). A luz da cena desenha uma borda clara no lado iluminado.
function pessoaPath(H, L, st) {
  const p = new Path2D(), t = st.t, sway = (st.anda ? Math.sin(t * 4.2) * 0.012 : Math.sin(t * 0.9) * 0.004) * H;
  const hy = -0.9 * H, hr = 0.058 * H;
  const estilo = L.style || 'curto';
  // cabeça (um pouco oval) e cabelo/véu
  if (estilo === 'veu' || L.veu) {
    p.moveTo(-hr * 1.35, hy + hr * 2.2); p.bezierCurveTo(-hr * 1.6, hy - hr * 1.6, hr * 1.6, hy - hr * 1.6, hr * 1.35, hy + hr * 2.2); p.closePath();
  } else {
    p.ellipse(0, hy, hr, hr * 1.18, 0, 0, TAU);
    if (estilo === 'turbante') p.ellipse(0, hy - hr * 0.6, hr * 1.25, hr * 0.85, 0, 0, TAU);
    else if (estilo === 'longo' || estilo === 'trancas') { p.moveTo(-hr * 1.05, hy); p.quadraticCurveTo(-hr * 1.3, hy + hr * 2.6, -hr * 0.6, hy + hr * 3.2); p.lineTo(hr * 0.6, hy + hr * 3.2); p.quadraticCurveTo(hr * 1.3, hy + hr * 2.6, hr * 1.05, hy); p.closePath(); }
    else if (estilo === 'black' || estilo === 'cacheado') p.ellipse(0, hy - hr * 0.2, hr * 1.35, hr * 1.35, 0, 0, TAU);
    else if (estilo === 'coque') p.ellipse(0, hy - hr * 1.25, hr * 0.5, hr * 0.45, 0, 0, TAU);
    else if (estilo === 'rabo') p.ellipse(-hr * 0.9, hy + hr * 0.4, hr * 0.35, hr * 0.9, 0.4, 0, TAU);
    if (L.beard) { p.moveTo(-hr * 0.85, hy + hr * 0.4); p.quadraticCurveTo(0, hy + hr * 2.6, hr * 0.85, hy + hr * 0.4); p.closePath(); }
  }
  // pescoço, ombros e manto até os pés (cai em dobras; balança um pouco ao andar)
  const sh = 0.13 * H, hem = 0.19 * H;
  p.moveTo(-hr * 0.5, hy + hr); p.lineTo(hr * 0.5, hy + hr);
  p.moveTo(-sh * 0.4, -0.83 * H);
  p.bezierCurveTo(-sh * 0.9, -0.84 * H, -sh * 1.05, -0.8 * H, -sh, -0.74 * H);
  p.bezierCurveTo(-sh * 1.15, -0.45 * H, -hem * 0.95 + sway, -0.18 * H, -hem + sway * 1.6, 0);
  p.lineTo(hem + sway * 1.6, 0);
  p.bezierCurveTo(hem * 0.95 + sway, -0.18 * H, sh * 1.15, -0.45 * H, sh, -0.74 * H);
  p.bezierCurveTo(sh * 1.05, -0.8 * H, sh * 0.9, -0.84 * H, sh * 0.4, -0.83 * H);
  p.closePath();
  // braço erguido (pregando) ou mãos à frente
  if (st.gesto === 'erguer') { p.moveTo(sh * 0.8, -0.74 * H); p.quadraticCurveTo(sh * 1.8, -0.9 * H, sh * 1.6, -1.08 * H); p.lineTo(sh * 1.35, -1.08 * H); p.quadraticCurveTo(sh * 1.4, -0.92 * H, sh * 0.6, -0.68 * H); p.closePath(); }
  // capa: mais larga, cai atrás e sobra dos lados
  if (L.cape && L.cape !== 'none') { p.moveTo(-sh * 1.05, -0.78 * H); p.quadraticCurveTo(-hem * 1.5 + sway * 2, -0.3 * H, -hem * 1.35 + sway * 2.6, -0.02 * H); p.lineTo(-hem * 0.8, -0.02 * H); p.lineTo(-sh * 0.7, -0.7 * H); p.closePath(); p.moveTo(sh * 1.05, -0.78 * H); p.quadraticCurveTo(hem * 1.5 + sway * 2, -0.3 * H, hem * 1.35 + sway * 2.6, -0.02 * H); p.lineTo(hem * 0.8, -0.02 * H); p.lineTo(sh * 0.7, -0.7 * H); p.closePath(); }
  return p;
}
function pessoaCine(g, x, y, H, L, st, luz) {
  g.save(); g.translate(x, y); if (st.vira < 0) g.scale(-1, 1);
  const path = pessoaPath(H, L, st);
  const dx = luz.x - x, dy = luz.y - (y - H * 0.5), dl = Math.hypot(dx, dy) || 1, ux = dx / dl * (st.vira < 0 ? -1 : 1), uy = dy / dl;
  // sombra no chão, do lado oposto à luz
  g.save(); g.scale(1, 0.18); g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(-ux * H * 0.25, 0, H * 0.32, H * 0.32, 0, 0, TAU); g.fill(); g.restore();
  if (L.anjo) { serafim(g, 0, -H * 0.55, H * 1.05, st.t * 1.6, '255,214,140', 0.3); g.restore(); return; }
  // corpo: preto, com um fio da cor da roupa; a borda de luz recorta a silhueta e brilha
  g.fillStyle = mix(L.tunic || '#3B4CCA', PRETO, 0.9); g.fill(path);
  rimLuz(g, path, ux, uy, Math.max(1.6, H * 0.016), luz.cor, 1, 0, -H * 0.5);
  g.restore();
}
// asas de serafim (Is 6:2): três pares de planos de pena em leque, luz somada
function asasSerafim(g, H, t) {
  const bate = Math.sin(t * 1.6);
  g.save(); g.globalCompositeOperation = 'screen';
  const par = (y, ang, comp, n, a) => {
    for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
      const an = sd * (ang + i * 0.16 + bate * 0.05 * (i + 1) / n), L2 = comp * (1 - i * 0.06);
      g.save(); g.translate(sd * H * 0.05, y); g.rotate(an - Math.PI / 2 * sd);
      const gr = g.createLinearGradient(0, 0, L2 * sd, 0); gr.addColorStop(0, `rgba(255,250,236,${a})`); gr.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -H * 0.012); g.lineTo(L2 * sd, -H * 0.05); g.lineTo(L2 * 0.92 * sd, H * 0.03); g.lineTo(0, H * 0.012); g.closePath(); g.fill();
      g.strokeStyle = `rgba(255,255,255,${a * 0.5})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(L2 * 0.95 * sd, -H * 0.01); g.stroke();
      g.restore();
    }
  };
  par(-H * 0.8, 0.1, H * 0.95, 8, 0.55);   // as de cima (sobem)
  par(-H * 0.65, 0.85, H * 1.05, 9, 0.6);  // as do meio (abertas)
  par(-H * 0.4, 1.7, H * 0.7, 7, 0.45);    // as de baixo (descem)
  g.restore();
}

/* ---------- chefes: sombras colossais ---------- */
function olhos(g, x, y, d, r, cor, sono = false) {
  g.save(); g.globalCompositeOperation = 'screen';
  for (const sd of [-1, 1]) { brilho(g, x + sd * d, y, r * 5, cor, 0.6); g.fillStyle = `rgba(${cor},1)`; g.beginPath(); g.ellipse(x + sd * d, y, r, sono ? r * 0.25 : r * 0.6, sd * 0.25, 0, TAU); g.fill(); }
  g.restore();
}
function fumacaBase(g, x, y, w, T, cor = '#030203') {
  g.save(); try { g.filter = 'blur(6px)'; } catch {}
  g.fillStyle = cor;
  for (let i = 0; i < 9; i++) { const k = i / 8 - 0.5; g.beginPath(); g.ellipse(x + k * w + Math.sin(T * 0.8 + i) * 8, y - 10 + Math.sin(T * 1.3 + i * 2) * 6, w * 0.22, w * 0.1, 0, 0, TAU); g.fill(); }
  g.restore();
}
const CHEFES = {
  satanas(g, S, T) {
    const asa = (sd) => {
      g.save(); g.scale(sd, 1); g.beginPath(); g.moveTo(S * 0.08, -S * 0.72);
      g.quadraticCurveTo(S * 0.5, -S * 1.25, S * 1.05, -S * 1.05);
      const pts = [[0.95, -0.82], [1.0, -0.62], [0.78, -0.6], [0.82, -0.36], [0.6, -0.4], [0.62, -0.16], [0.4, -0.26], [0.2, -0.5]];
      for (const [px, py] of pts) g.lineTo(S * px, S * py + Math.sin(T * 1.2 + px * 5) * S * 0.01);
      g.closePath(); g.fill(); g.restore();
    };
    g.fillStyle = '#040102'; const ab = Math.sin(T * 0.8) * 0.03; g.save(); g.rotate(-ab); asa(-1); g.restore(); g.save(); g.rotate(ab); asa(1); g.restore();
    // corpo/manto e cabeça com chifres
    g.beginPath(); g.moveTo(-S * 0.1, -S * 0.86); g.quadraticCurveTo(-S * 0.3, -S * 0.4, -S * 0.34, 0); g.lineTo(S * 0.34, 0); g.quadraticCurveTo(S * 0.3, -S * 0.4, S * 0.1, -S * 0.86); g.fill();
    g.beginPath(); g.ellipse(0, -S * 0.92, S * 0.075, S * 0.09, 0, 0, TAU); g.fill();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * S * 0.04, -S * 0.98); g.quadraticCurveTo(sd * S * 0.16, -S * 1.12, sd * S * 0.12, -S * 1.24); g.quadraticCurveTo(sd * S * 0.1, -S * 1.1, sd * S * 0.02, -S * 1.0); g.fill(); }
    olhos(g, 0, -S * 0.92, S * 0.03, S * 0.012, '255,70,30');
    fumacaBase(g, 0, 0, S * 0.9, T);
    g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 18; k++) { const dd = (T * 0.2 + k / 18) % 1; g.fillStyle = `rgba(255,${90 + k * 6},30,${(1 - dd) * 0.9})`; g.beginPath(); g.arc(Math.sin(k * 7 + T) * S * 0.5, -dd * S * 1.2, 1.6, 0, TAU); g.fill(); } g.restore();
  },
  mamom(g, S, T) {
    // montanha de ouro brilhando
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 0, -S * 0.1, S * 0.9, '255,200,90', 0.45); g.restore();
    g.fillStyle = '#2A1A04'; g.beginPath(); g.moveTo(-S * 0.8, 0); g.quadraticCurveTo(0, -S * 0.5, S * 0.8, 0); g.fill();
    g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 40; i++) { const x = (hash(i, 1, 3) - 0.5) * S * 1.3, y = -hash(i, 2, 3) * S * 0.3 * (1 - Math.abs(x) / S), a = 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)); g.fillStyle = `rgba(255,214,110,${a})`; g.fillRect(x, y, 2, 2); } g.restore();
    // a figura sentada, curvada, com coroa
    g.fillStyle = '#060402';
    g.beginPath(); g.moveTo(-S * 0.3, -S * 0.25); g.quadraticCurveTo(-S * 0.38, -S * 0.75, -S * 0.08, -S * 0.86); g.quadraticCurveTo(S * 0.3, -S * 0.82, S * 0.34, -S * 0.25); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(-S * 0.02, -S * 0.9, S * 0.1, S * 0.1, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-S * 0.1, -S * 0.96); for (let i = 0; i <= 4; i++) g.lineTo(-S * 0.1 + i * S * 0.05, -S * (i % 2 ? 1.02 : 1.1)); g.lineTo(S * 0.1, -S * 0.96); g.fill();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * S * 0.28, -S * 0.6); g.quadraticCurveTo(sd * S * 0.55, -S * 0.4, sd * S * 0.48, -S * 0.12); g.lineWidth = S * 0.05; g.strokeStyle = '#060402'; g.stroke(); }
    olhos(g, -S * 0.02, -S * 0.9, S * 0.035, S * 0.012, '255,214,110');
  },
  procrastinacao(g, S, T) {
    // relógio enorme, rachado
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, S * 0.15, -S * 0.75, S * 0.6, '170,210,230', 0.25); g.restore();
    g.fillStyle = '#C8C4B8'; g.beginPath(); g.arc(S * 0.15, -S * 0.75, S * 0.42, 0, TAU); g.fill();
    g.strokeStyle = '#1A1A20'; g.lineWidth = S * 0.02; g.stroke();
    g.fillStyle = '#1A1A20'; g.font = `${Math.round(S * 0.06)}px Cinzel, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'III', 'VI', 'IX'].forEach((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; g.fillText(n, S * 0.15 + Math.cos(a) * S * 0.33, -S * 0.75 + Math.sin(a) * S * 0.33); });
    g.lineCap = 'round'; g.lineWidth = S * 0.018; g.beginPath(); g.moveTo(S * 0.15, -S * 0.75); g.lineTo(S * 0.15 + Math.cos(T * 0.05) * S * 0.2, -S * 0.75 + Math.sin(T * 0.05) * S * 0.2); g.stroke();
    g.lineWidth = S * 0.01; g.beginPath(); g.moveTo(S * 0.15, -S * 0.75); g.lineTo(S * 0.15 + Math.cos(T * 0.6) * S * 0.3, -S * 0.75 + Math.sin(T * 0.6) * S * 0.3); g.stroke();
    g.strokeStyle = 'rgba(30,30,36,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(S * 0.3, -S * 1.12); g.lineTo(S * 0.2, -S * 0.9); g.lineTo(S * 0.28, -S * 0.75); g.stroke();
    // a sombra deitada, apoiada no relógio
    g.fillStyle = '#05060A'; g.beginPath(); g.moveTo(-S * 0.7, 0); g.quadraticCurveTo(-S * 0.6, -S * 0.42, -S * 0.25, -S * 0.42); g.quadraticCurveTo(S * 0.1, -S * 0.3, S * 0.5, 0); g.fill();
    g.beginPath(); g.ellipse(-S * 0.5, -S * 0.42, S * 0.11, S * 0.1, 0, 0, TAU); g.fill();
    olhos(g, -S * 0.5, -S * 0.42, S * 0.035, S * 0.012, '150,210,230', true);
  },
  mentira(g, S, T) {
    for (const [ox, a] of [[-S * 0.55, 0.35], [S * 0.55, 0.35], [0, 1]]) {
      g.save(); g.translate(ox, 0); g.globalAlpha *= a;
      g.fillStyle = '#05030A'; g.beginPath(); g.moveTo(-S * 0.08, -S * 0.86); g.quadraticCurveTo(-S * 0.26, -S * 0.3, -S * 0.22, 0); g.lineTo(S * 0.22, 0); g.quadraticCurveTo(S * 0.26, -S * 0.3, S * 0.08, -S * 0.86); g.fill();
      g.beginPath(); g.ellipse(0, -S * 0.93, S * 0.09, S * 0.1, 0, 0, TAU); g.fill();
      // máscara branca sorrindo: a única coisa iluminada
      g.fillStyle = '#ECE6DA'; g.beginPath(); g.moveTo(-S * 0.065, -S * 0.99); g.quadraticCurveTo(0, -S * 1.03, S * 0.065, -S * 0.99); g.quadraticCurveTo(S * 0.07, -S * 0.88, 0, -S * 0.85); g.quadraticCurveTo(-S * 0.07, -S * 0.88, -S * 0.065, -S * 0.99); g.fill();
      g.fillStyle = '#05030A'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * S * 0.025, -S * 0.95, S * 0.014, S * 0.006, sd * 0.3, 0, TAU); g.fill(); }
      g.strokeStyle = '#05030A'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, -S * 0.915, S * 0.03, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.restore();
    }
    fumacaBase(g, 0, 0, S * 1.4, T, '#0A0612');
  },
  imoralidade(g, S, T) {
    g.save(); g.globalCompositeOperation = 'screen'; brilho(g, 0, -S * 0.5, S * 0.9, '230,90,140', 0.35); g.restore();
    g.fillStyle = '#0A0206';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(Math.sin(T * 0.8 + i) * S * 0.04, -i * S * 0.12, S * (0.4 - i * 0.05), S * 0.08, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(-S * 0.08, -S * 0.5); g.quadraticCurveTo(-S * 0.12, -S * 0.85, 0, -S * 0.95); g.quadraticCurveTo(S * 0.12, -S * 0.85, S * 0.08, -S * 0.5); g.fill();
    // véu translúcido
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#E87AA0'; g.beginPath(); g.moveTo(-S * 0.14, -S * 0.98); g.quadraticCurveTo(-S * 0.4, -S * 0.5, -S * 0.3 + Math.sin(T) * S * 0.03, -S * 0.2); g.lineTo(S * 0.3 + Math.sin(T + 1) * S * 0.03, -S * 0.2); g.quadraticCurveTo(S * 0.4, -S * 0.5, S * 0.14, -S * 0.98); g.fill(); g.restore();
    olhos(g, 0, -S * 0.86, S * 0.03, S * 0.01, '255,150,190');
  },
  behemote(g, S, T) {
    const st = Math.sin(T * 1.2) * S * 0.01;
    g.fillStyle = '#0A0806';
    for (const lx of [-0.4, -0.18, 0.16, 0.36]) g.fillRect(lx * S - S * 0.06, -S * 0.28 + (lx > 0 ? st : -st), S * 0.12, S * 0.28);
    g.beginPath(); g.ellipse(0, -S * 0.42, S * 0.62, S * 0.3, 0, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { const px = -S * 0.42 + i * S * 0.16; g.beginPath(); g.moveTo(px - S * 0.07, -S * 0.62); g.lineTo(px, -S * 0.78 - (i % 2) * S * 0.04); g.lineTo(px + S * 0.07, -S * 0.62); g.fill(); }
    g.beginPath(); g.ellipse(-S * 0.62, -S * 0.44, S * 0.2, S * 0.16, -0.2, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-S * 0.72, -S * 0.52); g.quadraticCurveTo(-S * 0.92, -S * 0.78, -S * 0.78, -S * 0.9); g.quadraticCurveTo(-S * 0.82, -S * 0.7, -S * 0.66, -S * 0.56); g.fill();
    g.lineWidth = S * 0.06; g.strokeStyle = '#0A0806'; g.lineCap = 'round'; g.beginPath(); g.moveTo(S * 0.58, -S * 0.46); g.quadraticCurveTo(S * 0.85, -S * 0.6 + st * 3, S * 0.8, -S * 0.86); g.stroke();
    olhos(g, -S * 0.66, -S * 0.46, S * 0.04, S * 0.012, '255,140,60');
    fumacaBase(g, 0, 0, S * 1.6, T, '#3A2414');
  },
  leviata(g, S, T) {
    g.fillStyle = '#02070A';
    for (let i = 0; i < 4; i++) { const x = S * (0.7 - i * 0.42), h = S * (0.25 + i * 0.05); g.beginPath(); g.ellipse(x, Math.sin(T * 1.4 + i) * S * 0.03, h * 0.9, h, 0, Math.PI, 0); g.fill(); }
    // pescoço e cabeça subindo do mar
    g.beginPath(); g.moveTo(-S * 0.5, 0); g.quadraticCurveTo(-S * 0.55, -S * 0.7, -S * 0.2, -S * 1.0); g.quadraticCurveTo(S * 0.05, -S * 1.08, S * 0.08, -S * 0.92); g.quadraticCurveTo(-S * 0.18, -S * 0.75, -S * 0.22, 0); g.fill();
    g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 7; i++) { const k = i / 6; g.fillStyle = `rgba(94,209,232,${0.5 - k * 0.3})`; g.beginPath(); g.moveTo(-S * (0.5 - k * 0.25), -S * (0.1 + k * 0.8)); g.lineTo(-S * (0.62 - k * 0.25), -S * (0.18 + k * 0.82)); g.lineTo(-S * (0.48 - k * 0.25), -S * (0.2 + k * 0.8)); g.fill(); } g.restore();
    olhos(g, -S * 0.08, -S * 0.98, S * 0.03, S * 0.012, '127,240,255');
  },
  golias(g, S, T, luz) {
    pessoaCine(g, 0, 0, S * 1.1, { tunic: '#4A3E2E', cape: '#2E2A26', beard: true, style: 'curto' }, { t: T }, luz || { x: 480, y: 0, cor: '255,236,200' });
    g.fillStyle = '#06050A';
    g.beginPath(); g.ellipse(0, -S * 1.1 * 0.93, S * 0.08, S * 0.07, 0, Math.PI, 0); g.fill(); // elmo
    g.fillRect(-S * 0.01, -S * 1.12, S * 0.02, S * 0.09);
    g.lineWidth = S * 0.025; g.strokeStyle = '#06050A'; g.beginPath(); g.moveTo(S * 0.22, -S * 1.25); g.lineTo(S * 0.26, 0); g.stroke(); // lança
    g.beginPath(); g.moveTo(S * 0.21, -S * 1.25); g.lineTo(S * 0.225, -S * 1.36); g.lineTo(S * 0.24, -S * 1.25); g.fill();
    g.beginPath(); g.arc(-S * 0.2, -S * 0.55, S * 0.12, 0, TAU); g.fill(); // escudo
  },
  pecado(g, S, T) {
    g.fillStyle = 'rgba(0,0,0,.96)'; sombraFumaca(g, 0, 0, S, T);
    olhos(g, 0, -S * 0.72, S * 0.03, S * 0.008, '255,40,60');
  },
  generico(g, S, T) { g.fillStyle = '#050308'; sombraFumaca(g, 0, 0, S, T); olhos(g, 0, -S * 0.72, S * 0.04, S * 0.012, '255,200,120'); }
};

export function pintarCena(g, c, t, T) {
  g.save(); (CENAS[c.cena] || CENAS.noite).pinta(g, t, T, c); g.restore();
  // como no Isaías 6: uma fonte de luz por plano, o resto afunda no escuro
  const L = luzDaCena(c);
  g.save(); const r = g.createRadialGradient(L.x, L.y, VH * 0.15, L.x, L.y, VH * 1.25); r.addColorStop(0, 'rgba(4,3,6,0)'); r.addColorStop(1, 'rgba(4,3,6,.62)');
  g.fillStyle = r; g.fillRect(-80, -80, VW + 160, VH + 160); g.restore();
  atmosferaCine(g, T, L, c.cena === 'cosmos' ? 0.25 : 1);
}
export function luzDaCena(c) { const l = (CENAS[c.cena] || CENAS.noite).luz; return { x: l[0] * VW, y: l[1] * VH, cor: l[2] }; }
export const alturaPessoa = s => VH * 0.2 * (s || 1.5);
export const alturaChefe = s => VH * 0.24 * (s || 1.5);

export function pintarFiguras(g, c, t, T, opts) {
  const luz = luzDaCena(c);
  for (const [i, f] of (c.fig || []).entries()) {
    const ent = easeOut(clamp((t - i * 0.25) / 1.8, 0, 1));
    let x = f.x * VW, y = f.y * VH + 10, alpha = 1;
    if (f.entra === 'esq') x = lerp(-120, x, ent); else if (f.entra === 'dir') x = lerp(VW + 120, x, ent);
    else if (f.entra === 'cima') { y = lerp(y - 260, y, ent); alpha = ent; }
    else if (f.entra === 'baixo') { y = lerp(y + 180, y, ent); alpha = ent; }
    else alpha = clamp((t - i * 0.2) / 1.2, 0, 1);
    g.save(); g.globalAlpha = alpha;
    if (typeof f.p === 'string' && f.p.startsWith('chefe:')) {
      const id = f.p.slice(6), S = alturaChefe(f.s);
      g.translate(x, y); if (f.vira < 0) g.scale(-1, 1);
      (CHEFES[id] || CHEFES.generico)(g, S, T, luz);
    } else if (f.perfil) {
      const L = lookDe(f.p, opts) || {}, pele = L.skin ? rgb(L.skin).map(v => Math.round(v * 0.75)).join(',') : '150,95,60';
      perfil(g, x, f.y * VH, VH * 0.26 * (f.s || 1.5), { vira: f.vira || 1, barba: !!L.beard, capuz: L.style === 'veu' || L.style === 'turbante' || f.capuz, pele, fala: f.fala ? Math.abs(Math.sin(T * 9)) * 0.04 : 0 }, luz);
    } else if (f.p === 'serafim') {
      serafim(g, x, f.y * VH, VH * 0.35 * (f.s || 1.5), T * 1.6 + i, '255,214,140', 0.2);
    } else {
      const L = lookDe(f.p, opts); if (L) pessoaCine(g, x, y, alturaPessoa(f.s), L, { t: T + i * 1.7, anda: f.anda && f.entra && ent < 1, vira: f.vira || 1, gesto: f.gesto }, luz);
    }
    g.restore();
  }
}

export const CENAS_DISPONIVEIS = Object.keys(CENAS);
