// Atmosfera na tela: véu de cor leve por região, raios de sol, névoa em camadas que se move com a câmera,
// partículas flutuando (esporos, poeira, brasas, neve de luz), brilho das lâmpadas, vinheta e granulação.
// Roda por cima do mundo desenhado e por baixo dos textos. Desliga em menu › Ajustes › Atmosfera.
import { hash, fbm, TAU } from '../util.js';

// humor de cada lugar: tinta (multiply), luz de cima (screen), névoa e partículas
const HUMOR = {
  cidade:   { tinta: '#FFE2B0', luz: 'rgba(255,226,170,.16)', nevoa: [255, 244, 225], dens: 0.05, part: 'luz', raios: 0.5 },
  portoes:  { tinta: '#FFF0C8', luz: 'rgba(255,236,190,.20)', nevoa: [255, 248, 230], dens: 0.07, part: 'luz', raios: 0.8 },
  colinas:  { tinta: '#E8F4C8', luz: 'rgba(255,240,190,.14)', nevoa: [245, 252, 240], dens: 0.05, part: 'polen', raios: 0.5 },
  campos:   { tinta: '#FFE8A8', luz: 'rgba(255,230,160,.16)', nevoa: [255, 246, 220], dens: 0.05, part: 'polen', raios: 0.6 },
  floresta: { tinta: '#D8F0C8', luz: 'rgba(230,255,200,.14)', nevoa: [235, 250, 230], dens: 0.09, part: 'vagalume', raios: 0.9 },
  lago:     { tinta: '#D8ECFF', luz: 'rgba(225,240,255,.14)', nevoa: [240, 248, 255], dens: 0.08, part: 'luz', raios: 0.5 },
  deserto:  { tinta: '#FFD8A0', luz: 'rgba(255,214,150,.18)', nevoa: [255, 236, 205], dens: 0.06, part: 'areia', raios: 0.4 },
  costa:    { tinta: '#D8EAFF', luz: 'rgba(225,240,255,.14)', nevoa: [245, 250, 255], dens: 0.08, part: 'luz', raios: 0.5 },
  ela:      { tinta: '#F0E8D0', luz: 'rgba(255,236,200,.12)', nevoa: [250, 245, 235], dens: 0.06, part: 'polen', raios: 0.5 },
  fase:     { tinta: '#FFE8C8', luz: 'rgba(255,232,190,.12)', nevoa: [255, 245, 230], dens: 0.05, part: 'luz', raios: 0.5 },
  tribunal: { tinta: '#FFE0C0', luz: 'rgba(255,220,180,.12)', nevoa: [255, 240, 225], dens: 0.05, part: 'luz', raios: 0.6 },
  salao:    { tinta: '#E8DCFF', luz: 'rgba(240,225,255,.14)', nevoa: [245, 238, 255], dens: 0.08, part: 'luz', raios: 0.7 }
};

let FOG = null, GRAIN = null;
function texturas() {
  if (FOG) return;
  // névoa: ruído suave em tons de alfa, que se repete sem emenda
  FOG = document.createElement('canvas'); FOG.width = FOG.height = 256;
  const fg = FOG.getContext('2d'), id = fg.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = x / 256, v = y / 256;
    // mistura nas bordas para repetir sem costura
    const n = (fbm(u * 4, v * 4, 3) * (1 - u) * (1 - v) + fbm((u - 1) * 4, v * 4, 3) * u * (1 - v) + fbm(u * 4, (v - 1) * 4, 3) * (1 - u) * v + fbm((u - 1) * 4, (v - 1) * 4, 3) * u * v);
    const a = Math.max(0, Math.min(1, (n - 0.35) * 2.2));
    const i = (y * 256 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = a * 255;
  }
  fg.putImageData(id, 0, 0);
  GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 128;
  const gg = GRAIN.getContext('2d'), gd = gg.createImageData(128, 128);
  for (let i = 0; i < gd.data.length; i += 4) { const v = Math.random() * 255; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = 255; }
  gg.putImageData(gd, 0, 0);
}

export function humorDe(game) {
  if (game.scene === 'world') return HUMOR[game.zone] || HUMOR.colinas;
  if (game.scene === 'fase') return game.fase?.def?.tema === 'tribunal' ? HUMOR.tribunal : HUMOR.fase;
  return HUMOR.salao;
}

// partículas: espaço de tela com paralaxe (movem um pouco menos que a câmera = parecem flutuar entre camadas)
function particulas(game, W, H, H2, T, tipo, s) {
  const P = game._motes || (game._motes = Array.from({ length: 70 }, (_, i) => ({ x: hash(i, 1, 8) * 2000, y: hash(i, 2, 8) * 2000, z: 0.4 + hash(i, 3, 8) * 1.2, ph: hash(i, 4, 8) * TAU })));
  const camX = game.camL * game.Z * game.DPR, camY = game.camT * game.Z * game.DPR;
  const cor = { poeira: '255,240,210', polen: '255,240,170', vagalume: '220,255,150', luz: '255,246,214', areia: '255,214,160', chuva: '210,230,255', brasas: '255,170,90' }[tipo] || '255,246,214';
  const n = tipo === 'chuva' ? 70 : 46;
  for (let i = 0; i < n; i++) {
    const p = P[i];
    let x, y;
    if (tipo === 'chuva') { x = ((p.x - camX * p.z * 0.6 + T * 60) % W + W) % W; y = ((p.y - camY * p.z * 0.6 + T * 520 * p.z) % H + H) % H; }
    else {
      const sobe = tipo === 'brasas' ? -30 : tipo === 'areia' ? 4 : -8;
      x = ((p.x - camX * p.z * 0.7 + Math.sin(T * 0.4 + p.ph) * 30 * s + (tipo === 'areia' ? T * 70 : 0)) % W + W) % W;
      y = ((p.y - camY * p.z * 0.7 + T * sobe * p.z) % H + H) % H;
    }
    const a = (0.25 + 0.45 * Math.abs(Math.sin(T * 0.7 + p.ph))) * (p.z > 1 ? 0.8 : 1);
    if (tipo === 'chuva') { H2.strokeStyle = 'rgba(' + cor + ',' + a * 0.4 + ')'; H2.lineWidth = 1 * s; H2.beginPath(); H2.moveTo(x, y); H2.lineTo(x - 3 * s, y + 16 * s * p.z); H2.stroke(); continue; }
    const r = (1 + p.z * 1.4) * s;
    const gr = H2.createRadialGradient(x, y, 0, x, y, r * 4); gr.addColorStop(0, 'rgba(' + cor + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
    H2.fillStyle = gr; H2.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
}

// g em coordenadas de tela (pixels do canvas)
export function atmosfera(game, g) {
  texturas();
  const W = game.cv.width, H = game.cv.height, T = game.T, h = humorDe(game), s = game.DPR * game.Z / 1.6;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  // 1) um véu de cor bem leve do lugar (aquece/refresca sem apagar as cores)
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.22; g.fillStyle = h.tinta; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  // 2) luz do céu vindo de cima e raios de sol diagonais que passeiam devagar
  g.globalCompositeOperation = 'screen';
  const lg = g.createLinearGradient(0, 0, W * 0.3, H); lg.addColorStop(0, h.luz); lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  if (h.raios) {
    g.save(); g.translate(W * 0.15, -H * 0.1); g.rotate(0.42);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 0.22 + T * 0.006 + game.camL * 0.00025) % 1.4 - 0.2) * W * 1.4, lw = (60 + 50 * Math.sin(i * 2.3)) * s * 1.6;
      const a2 = h.raios * (0.05 + 0.035 * Math.sin(T * 0.5 + i * 1.7));
      const rg = g.createLinearGradient(0, 0, 0, H * 1.4); rg.addColorStop(0, 'rgba(255,244,214,' + a2 + ')'); rg.addColorStop(1, 'rgba(255,244,214,0)');
      g.fillStyle = rg; g.fillRect(x, 0, lw, H * 1.5);
    }
    g.restore();
  }
  // 3) brilho das lâmpadas e do portão
  g.globalCompositeOperation = 'lighter';
  const k = game.DPR * game.Z;
  for (const L of game.cur.lights || []) {
    const x = (L.x - game.camL) * k, y = (L.y - game.camT) * k, r = L.r * k * 0.7 * (L.gate ? 1 + 0.06 * Math.sin(T * 2) : 1 + 0.03 * Math.sin(T * 9 + L.x));
    if (x < -r || y < -r || x > W + r || y > H + r) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, L.gate ? 'rgba(246,226,170,.30)' : 'rgba(255,200,130,.22)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 4) névoa em duas camadas com paralaxe diferente
  g.globalCompositeOperation = 'screen';
  const [nr, ng, nb] = h.nevoa;
  for (const [esc, par, vel, al] of [[3.2, 0.35, 10, 1], [2.1, 0.7, -16, 0.7]]) {
    const tam = 256 * esc * s, ox = -(((game.camL * k * par + T * vel * s) % tam) + tam) % tam, oy = -(((game.camT * k * par * 0.6) % tam) + tam) % tam;
    g.globalAlpha = h.dens * al;
    // pinta a textura (branca) com a cor da névoa
    for (let y = oy; y < H; y += tam) for (let x = ox; x < W; x += tam) g.drawImage(tinge(nr, ng, nb), x, y, tam, tam);
  }
  g.globalAlpha = 1;
  // névoa baixa no pé da tela (chão "afundando" no escuro)
  g.globalCompositeOperation = 'source-over';
  // 5) partículas
  g.globalCompositeOperation = 'lighter';
  particulas(game, W, H, g, T, h.part, Math.max(0.6, s));
  // 6) vinheta
  g.globalCompositeOperation = 'source-over';
  const vg = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(30,20,10,0)'); vg.addColorStop(1, 'rgba(30,20,10,.28)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

const TINTE = new Map();
function tinge(r, g2, b) {
  const key = r + ',' + g2 + ',' + b;
  if (TINTE.has(key)) return TINTE.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.drawImage(FOG, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(' + key + ')'; x.fillRect(0, 0, 256, 256);
  TINTE.set(key, c); return c;
}
