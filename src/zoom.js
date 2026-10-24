// Zoom do navegador (Ctrl + / Ctrl -): a interface e a câmera compensam o zoom para o jogo ficar sempre igual.
// O zoom é estimado por outerWidth / innerWidth (PC). No celular não há zoom (user-scalable=no).
const LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
const coarse = matchMedia('(pointer: coarse)').matches;

export let zoom = 1;

function measure() {
  if (coarse || !outerWidth || !innerWidth) return 1;
  const r = outerWidth / innerWidth;
  if (Math.abs(r - 1) < 0.06) return 1; // bordas da janela / barra lateral
  return LEVELS.reduce((a, b) => Math.abs(b - r) < Math.abs(a - r) ? b : a, 1);
}

// Tamanho da tela como seria sem zoom (em px CSS de 100%).
export function viewSize() {
  const W = document.documentElement.clientWidth || innerWidth, H = document.documentElement.clientHeight || innerHeight;
  return { W, H, w: W * zoom, h: H * zoom };
}

function apply() {
  zoom = measure();
  document.documentElement.style.setProperty('--uiz', String(1 / zoom));
  const { w, h } = viewSize(), b = document.body.classList;
  b.toggle('compact', h <= 500); b.toggle('narrow', w <= 760); b.toggle('tiny', w <= 560);
}

export function initZoom() {
  apply();
  addEventListener('resize', apply);
  // evita zoom sem querer (Ctrl + rodinha / pinça do touchpad e Ctrl +/-) durante o jogo
  addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'].includes(e.code)) e.preventDefault();
  });
}
