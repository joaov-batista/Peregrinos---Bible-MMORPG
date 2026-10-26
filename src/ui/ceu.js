// Fundo das telas iniciais: céu da aurora animado. Raios de sol saindo de trás dos montes, nuvens passando,
// partículas de luz subindo, a Cidade de Refúgio ao longe e pássaros. Roda só enquanto as telas iniciais estão abertas.
import { hash, TAU } from '../util.js';

let cv = null, raf = 0, t0 = 0;
export function ligarCeu() {
  if (cv) return;
  cv = document.createElement('canvas'); cv.id = 'ceu';
  document.body.prepend(cv);
  t0 = performance.now();
  // agenda o próximo quadro antes de desenhar: um erro num quadro não pode parar o céu
  const loop = now => { raf = requestAnimationFrame(loop); if (cv) desenhar(cv, Math.max(0, now - t0) / 1000); };
  raf = requestAnimationFrame(loop);
}
export function desligarCeu() { cancelAnimationFrame(raf); cv?.remove(); cv = null; }

function desenhar(c, T) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
  if (!W || !H) return; // janela ainda sem tamanho (aba escondida)
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext('2d'), s = H / 900;
  // céu: azul profundo no alto, rosa e dourado no horizonte
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2B3A78'); sky.addColorStop(0.35, '#6A5AA0'); sky.addColorStop(0.62, '#E89A8A'); sky.addColorStop(0.8, '#FFD9A0'); sky.addColorStop(1, '#FFEFC8');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // últimas estrelas no alto
  for (let i = 0; i < 70; i++) { const a = 0.15 + 0.5 * Math.abs(Math.sin(T * 0.6 + i)); g.fillStyle = 'rgba(255,255,255,' + a * (1 - hash(i, 3, 1) * 0.6) + ')'; g.fillRect(hash(i, 1, 1) * W, hash(i, 2, 1) * H * 0.38, 1.6 * dpr, 1.6 * dpr); }
  // sol nascendo atrás dos montes
  const sx = W * 0.5, sy = H * 0.74;
  g.globalCompositeOperation = 'lighter';
  let gr = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.7); gr.addColorStop(0, 'rgba(255,240,200,.85)'); gr.addColorStop(0.25, 'rgba(255,210,150,.35)'); gr.addColorStop(1, 'rgba(255,180,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // raios de luz girando devagar
  g.save(); g.translate(sx, sy); g.rotate(T * 0.015);
  for (let i = 0; i < 16; i++) {
    g.rotate(TAU / 16);
    const a = 0.05 + 0.04 * Math.sin(T * 0.5 + i * 1.3), larg = (0.05 + 0.03 * Math.sin(i * 2.1)) * H;
    const rg = g.createLinearGradient(0, 0, 0, -H * 1.2); rg.addColorStop(0, 'rgba(255,240,200,' + a + ')'); rg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = rg; g.beginPath(); g.moveTo(-larg * 0.15, 0); g.lineTo(-larg, -H * 1.2); g.lineTo(larg, -H * 1.2); g.lineTo(larg * 0.15, 0); g.fill();
  }
  g.restore();
  g.globalCompositeOperation = 'source-over';
  // nuvens (camadas com paralaxe)
  for (const [y, vel, esc, cor] of [[0.16, 6, 1.3, 'rgba(255,220,235,.16)'], [0.3, 10, 1.0, 'rgba(255,214,205,.2)'], [0.6, 16, 0.8, 'rgba(255,236,215,.28)']]) {
    for (let i = 0; i < 3; i++) {
      const w2 = 260 * esc * s, x = ((i * 0.27 + T * vel / 1000 * 1) % 1.3 - 0.15) * (W + w2), yy = H * y + Math.sin(i * 3 + T * 0.2) * 6 * s;
      g.fillStyle = cor;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * w2 * 0.18, yy - Math.sin(k * 1.3) * 18 * esc * s, w2 * 0.2, 26 * esc * s, 0, 0, TAU); g.fill(); }
    }
  }
  // montes ao longe e a cidade
  const morro = (base, amp, seed, cor) => { g.fillStyle = cor; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10 * dpr) g.lineTo(x, H * base - amp * H * (Math.sin(x / W * 5 + seed) * 0.6 + Math.sin(x / W * 11 + seed * 2) * 0.4)); g.lineTo(W, H); g.fill(); };
  morro(0.77, 0.03, 1, 'rgba(170,120,150,.55)');
  // cidade de refúgio: muralha, torres e a luz no portão
  g.fillStyle = 'rgba(110,80,110,.9)';
  const cx = W * 0.5, cw = H * 0.3, cy = H * 0.77;
  g.fillRect(cx - cw / 2, cy - H * 0.03, cw, H * 0.04);
  for (let i = 0; i <= 6; i++) { const tx = cx - cw / 2 + i * cw / 6; g.fillRect(tx - H * 0.007, cy - H * 0.05, H * 0.014, H * 0.03); }
  g.fillRect(cx - H * 0.018, cy - H * 0.068, H * 0.036, H * 0.045);
  // casinhas e telhados aparecendo por cima do muro
  for (let i = 0; i < 9; i++) { const hx = cx - cw * 0.42 + i * cw * 0.105, hh = H * (0.018 + hash(i, 9, 3) * 0.02); g.fillRect(hx, cy - H * 0.03 - hh, cw * 0.07, hh); }
  g.globalCompositeOperation = 'lighter';
  gr = g.createRadialGradient(cx, cy - H * 0.04, 0, cx, cy - H * 0.04, H * 0.08); gr.addColorStop(0, 'rgba(255,230,160,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr; g.fillRect(cx - H * 0.1, cy - H * 0.14, H * 0.2, H * 0.2);
  g.globalCompositeOperation = 'source-over';
  morro(0.82, 0.03, 4, 'rgba(96,70,104,.95)');
  morro(0.9, 0.025, 7, '#4A3458');
  // pássaros
  g.strokeStyle = 'rgba(70,50,80,.7)'; g.lineWidth = 1.6 * dpr; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x = ((T * 0.025 + i * 0.13) % 1.2 - 0.1) * W, y = H * (0.42 + i * 0.03) + Math.sin(T * 1.2 + i) * 8 * s, b = Math.sin(T * 7 + i * 2) * 5 * s;
    g.beginPath(); g.moveTo(x - 9 * s, y - b); g.quadraticCurveTo(x - 4 * s, y - 3 * s, x, y); g.quadraticCurveTo(x + 4 * s, y - 3 * s, x + 9 * s, y - b); g.stroke();
  }
  // partículas de luz subindo
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const z = 0.4 + hash(i, 4, 2), x = (hash(i, 5, 2) * W + Math.sin(T * 0.4 + i) * 40 * s) % W, y = H - ((hash(i, 6, 2) * H + T * 22 * z * s) % H);
    const r = (0.6 + z * 1.1) * s, a = 0.3 + 0.45 * Math.abs(Math.sin(T + i));
    gr = g.createRadialGradient(x, y, 0, x, y, r * 4); gr.addColorStop(0, 'rgba(255,240,200,' + a + ')'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  g.globalCompositeOperation = 'source-over';
  // vinheta leve
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H); gr.addColorStop(0, 'rgba(40,20,40,0)'); gr.addColorStop(1, 'rgba(40,20,40,.35)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
