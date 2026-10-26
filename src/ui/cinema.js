// Player das cutscenes (content/cinematicas.js): cenário animado em canvas, personagens, câmera lenta (Ken Burns),
// faixas de cinema, título, legenda que acompanha a narração e o áudio do ElevenLabs (public/narracao/*.mp3).
// Sem o mp3, usa a voz do navegador (pt-BR) e, sem ela, só a legenda com tempo de leitura.
// Toque/clique/Enter/A avança uma cena; "Pular" (Esc/B) encerra.
import { h, rand, clamp, lerp, easeOut, ell, hash, TAU } from '../util.js';
import { config } from '../config.js';
import { audio, sfx } from '../audio.js';
import { pintarCena, pintarFiguras, alturaPessoa, alturaChefe } from './cinema-arte.js';
import { CINEMAS, segmentos } from '../content/cinematicas.js';

import { VW, VH } from './cinema-arte.js'; // espaço virtual 16:9; a tela é preenchida "cover"
const ASPECTO = 2; // faixas de cinema: quadro 2:1
const limpa = s => s.replace(/\[[^\]]*\]\s*/g, '').trim();

export function montarCinema(panel, close, id, opts = {}) {
  const def = CINEMAS[id];
  if (!def) { close(); return; }
  const cv = h('canvas', { class: 'cine-cv' });
  const g = cv.getContext('2d');
  const titulo = h('div', { class: 'cine-title' });
  const legenda = h('p', { class: 'cine-sub', 'aria-live': 'polite' });
  const avancar = h('button', { class: 'btn sm cine-next', type: 'button', onclick: e => { e.stopPropagation(); proxima(); } }, 'Avançar ▶');
  const pular = h('button', { class: 'btn sm cine-skip', type: 'button', onclick: e => { e.stopPropagation(); fim(); } }, 'Pular ⏭');
  const dica = h('small', { class: 'cine-hint' }, def.titulo);
  panel.classList.add('cine');
  panel.append(cv, titulo, h('div', { class: 'cine-bar' }, legenda, h('div', { class: 'cine-btns' }, dica, avancar, pular)));
  panel.addEventListener('pointerdown', e => { if (e.target === cv || e.target === panel) proxima(); });
  const onKey = e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); proxima(); } };
  addEventListener('keydown', onKey);

  const cenas = def.cenas, segs = segmentos(id);
  const vol = audio.muted ? 0 : (config.volVoz ?? 1);
  // pré-carrega os mp3 de cada trecho
  for (const s of segs) {
    s.ok = null;
    if (!vol) { s.ok = false; continue; }
    const a = new Audio('/narracao/' + s.arquivo + '.mp3'); a.preload = 'auto'; a.volume = vol;
    a.addEventListener('loadedmetadata', () => { s.ok = isFinite(a.duration) && a.duration > 0; }, { once: true });
    a.addEventListener('error', () => { s.ok = false; }, { once: true });
    s.audio = a;
  }
  const tts = vol && config.vozNavegador !== false && 'speechSynthesis' in window ? vozPt() : null;

  let raf = 0, last = performance.now(), T = 0, acabou = false, saindo = 0, errou = false;
  let si = -1, ci = -1, cenaT = 0, modo = 'timer', est = 4, falou = false, espera = 0;
  const viz = { ci: -1, t: 0, prev: -1, prevT: 0, dur: 4 }; // cena desenhada (com transição) e quanto ela dura

  function iniciarSeg(n) {
    si = n; const s = segs[si];
    if (!s) return fim();
    if (s.ok) {
      modo = 'mp3';
      const total = s.cenas.reduce((a, i) => a + peso(i), 0);
      let acc = 0; s.inicios = s.cenas.map(i => { const v = acc; acc += peso(i) / total * s.audio.duration; return v; });
      s.audio.currentTime = 0;
      s.audio.play().catch(() => { modo = tts ? 'tts' : 'timer'; mostrar(s.cenas[0]); });
      mostrar(s.cenas[0]);
    } else { modo = tts ? 'tts' : 'timer'; mostrar(s.cenas[0]); }
  }
  const peso = i => limpa(cenas[i].texto).length + 18; // pausas entre frases pesam um pouco
  function mostrar(i) {
    if (i === ci) return;
    ci = i; cenaT = 0; falou = false;
    const c = cenas[i], txt = limpa(c.texto);
    est = Math.max(3.2, txt.length / 15 + 1);
    viz.prev = viz.ci; viz.prevT = viz.t; viz.ci = i; viz.t = 0;
    // duração do plano (para a câmera chegar no fim junto com a fala)
    const sg = segs[si], kk = sg ? sg.cenas.indexOf(i) : -1;
    viz.dur = modo === 'mp3' && sg?.inicios ? ((sg.inicios[kk + 1] ?? sg.audio.duration) - sg.inicios[kk]) : est * (modo === 'tts' ? 1.1 : 1);
    // som: chefe aparecendo dá uma pancada grave; clarão, um brilho
    if ((c.fig || []).some(f => typeof f.p === 'string' && f.p.startsWith('chefe:') && f.entra)) sfx('boss');
    if (c.fx === 'clarão') sfx('magic');
    legenda.textContent = ''; legenda.dataset.full = txt;
    titulo.innerHTML = ''; titulo.classList.remove('on');
    if (c.titulo) { titulo.append(h('b', {}, c.titulo), c.sub ? h('span', {}, c.sub) : ''); requestAnimationFrame(() => titulo.classList.add('on')); }
    if (modo === 'tts') falar(txt);
    fxInicio(c);
  }
  function falar(txt) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'pt-BR'; u.voice = tts; u.rate = 0.95; u.pitch = segs[si]?.voz === 'vilao' ? 0.6 : 0.9; u.volume = vol;
    const ini = performance.now();
    // voz que falha ou termina rápido demais (aparelho sem voz pt-BR): segue só com a legenda, no tempo de leitura
    const meu = ci; // cancel() da cena anterior dispara onend/onerror dela: ignora
    u.onend = () => { if (ci !== meu) return; if (performance.now() - ini < est * 300) modo = 'timer'; else falou = true; };
    u.onerror = e => { if (ci !== meu || e.error === 'interrupted' || e.error === 'canceled') return; modo = 'timer'; };
    speechSynthesis.speak(u);
  }
  function proxima() {
    if (acabou) return;
    const s = segs[si]; if (!s) return;
    const k = s.cenas.indexOf(ci);
    if (modo === 'mp3') {
      if (k < s.cenas.length - 1) { s.audio.currentTime = s.inicios[k + 1] + 0.02; mostrar(s.cenas[k + 1]); }
      else { s.audio.pause(); iniciarSeg(si + 1); }
      return;
    }
    if (modo === 'tts') speechSynthesis.cancel();
    if (k < s.cenas.length - 1) mostrar(s.cenas[k + 1]); else iniciarSeg(si + 1);
  }
  function fim() {
    if (acabou) return;
    acabou = true; saindo = 0.0001;
    for (const s of segs) s.audio?.pause();
    if (tts) speechSynthesis.cancel();
  }
  function encerrar() {
    cancelAnimationFrame(raf); removeEventListener('keydown', onKey);
    for (const s of segs) if (s.audio) { s.audio.pause(); s.audio.src = ''; }
    if (tts) speechSynthesis.cancel();
  }

  // efeitos que disparam no começo da cena
  let tremor = 0, clarao = 0;
  function fxInicio(c) {
    if (c.fx === 'tremor') tremor = 1;
    if (c.fx === 'clarão' || c.fx === 'raio') clarao = c.fx === 'raio' ? 0.45 : 0.5;
  }

  // começa depois de esperar um pouco os mp3 (até 1,2 s)
  const t0 = performance.now();
  function pronto() { return segs.every(s => s.ok !== null) || performance.now() - t0 > 1200; }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    if (!panel.isConnected || panel.closest('.modal.out')) { encerrar(); return; }
    if (si < 0 && pronto()) iniciarSeg(0);
    if (si >= 0 && !acabou) {
      cenaT += dt; viz.t += dt;
      const s = segs[si];
      if (modo === 'mp3') {
        const a = s.audio, t = a.currentTime;
        let k = 0; while (k + 1 < s.inicios.length && t >= s.inicios[k + 1]) k++;
        mostrar(s.cenas[k]);
        if (a.ended || (a.duration && t >= a.duration - 0.03)) { espera += dt; if (espera > 0.5) { espera = 0; iniciarSeg(si + 1); } }
      } else if (modo === 'tts') {
        if ((falou && cenaT > 1.2) || cenaT > est * 2.2 + 3) proxima();
      } else if (cenaT > est) proxima();
      // legenda acompanha a fala (revela um pouco à frente)
      const full = legenda.dataset.full || '';
      let prog;
      if (modo === 'mp3') { const k = s.cenas.indexOf(ci), ini = s.inicios[k], fimK = s.inicios[k + 1] ?? s.audio.duration; prog = (s.audio.currentTime - ini) / Math.max(0.5, fimK - ini); }
      else prog = cenaT / (modo === 'tts' ? est * 0.9 : est * 0.7);
      const n = Math.ceil(clamp(prog * 1.25 + 0.04, 0, 1) * full.length);
      if (legenda.textContent.length !== n) legenda.textContent = full.slice(0, n);
    }
    if (acabou) { saindo += dt; if (saindo > 0.6) { encerrar(); close(); return; } }
    // um erro de desenho num plano não pode travar a cutscene: avisa no console e segue
    try { desenhar(dt); } catch (e) { if (!errou) { errou = true; console.error('[cinema ' + id + ']', e); } }
    raf = requestAnimationFrame(frame);
  }

  // ---------- câmera, luz e acabamento de cinema ----------
  // posição de cada figura no espaço virtual (com a animação de entrada) e da cabeça dela
  function posFig(f, i, t) {
    const ent = easeOut(clamp((t - i * 0.18) / 1.5, 0, 1));
    let x = f.x * VW, y = f.y * VH, alpha = 1;
    if (f.entra === 'esq') x = lerp(-80, x, ent); else if (f.entra === 'dir') x = lerp(VW + 80, x, ent);
    else if (f.entra === 'cima') { y = lerp(y - 260, y, ent); alpha = ent; }
    else if (f.entra === 'baixo') { y = lerp(y + 160, y, ent); alpha = ent; }
    else alpha = clamp((t - i * 0.15) / 0.6, 0, 1);
    const chefe = typeof f.p === 'string' && f.p.startsWith('chefe:');
    const alt = (chefe ? alturaChefe(f.s) : alturaPessoa(f.s)) * 0.9;
    return { x, y, alpha, ent, cabeca: { x, y: y - alt }, chefe };
  }
  // escolhe o movimento de câmera do plano: o que está nos dados (c.cam) ou um automático pelo conteúdo
  function camDe(c, i) {
    if (c.cam) return typeof c.cam === 'string' ? { tipo: c.cam } : c.cam;
    const fig = c.fig || [];
    if (c.voz === 'vilao' && fig.length) return { tipo: 'close', alvo: 0, z: 1.7 };          // a fala do vilão: close no rosto
    if (fig.length === 1 && fig[0].p === 'jogador') return { tipo: 'close', alvo: 0, z: 1.45 }; // o herói sozinho: aproxima
    if (fig.length === 1 && fig[0].p?.startsWith?.('chefe:')) return { tipo: 'subir', alvo: 0 }; // chefe surgindo: tilt de baixo para cima
    if (c.fx === 'clarão' || c.cena === 'luz') return { tipo: 'subir' };
    if (!fig.length) return { tipo: i % 2 ? 'pan' : 'push' };
    return { tipo: 'push' };
  }
  const suave = k => k * k * (3 - 2 * k);
  function camera(c, t, dur) {
    const cm = camDe(c, viz.ci), k = suave(clamp(t / Math.max(2.5, dur), 0, 1));
    const fig = c.fig || [];
    let cx = VW / 2, cy = VH / 2, z = 1.04 + k * 0.1;
    if (fig.length) {
      // centro de atenção: média das cabeças (enquadra o grupo)
      const ps = fig.map((f, n) => posFig(f, n, t));
      cx = ps.reduce((a, p) => a + p.x, 0) / ps.length; cy = ps.reduce((a, p) => a + (p.y + p.cabeca.y) / 2, 0) / ps.length;
    }
    if (cm.tipo === 'close' && fig[cm.alvo || 0]) {
      const p = posFig(fig[cm.alvo || 0], cm.alvo || 0, t);
      cx = lerp(p.x, p.x, k); cy = lerp((p.y + p.cabeca.y) / 2, p.cabeca.y + (p.y - p.cabeca.y) * 0.12, k);
      z = lerp((cm.z || 1.5) * 0.8, cm.z || 1.5, k);
    } else if (cm.tipo === 'subir') {
      cy = lerp(VH * 0.68, fig.length ? cy : VH * 0.42, k); z = lerp(1.3, 1.08, k);
    } else if (cm.tipo === 'descer') {
      cy = lerp(VH * 0.3, VH * 0.55, k); z = lerp(1.25, 1.1, k);
    } else if (cm.tipo === 'pan') {
      cx = lerp(VW * 0.4, VW * 0.6, k); z = 1.16;
    } else { cx = lerp(VW / 2, (cx + VW / 2) / 2, k); cy = lerp(VH / 2, (cy + VH / 2) / 2, k); }
    // sem mostrar fora do quadro
    const mx = VW / 2 / z, my = VH / 2 / z;
    return { cx: clamp(cx, mx, VW - mx), cy: clamp(cy, my, VH - my), z };
  }

  let bloomCv = null, grao = null;
  function desenhar(dt) {
    const dpr = Math.min(2, devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const W = cv.width, H = cv.height;
    // começa cada quadro limpo (nada de transparência ou filtro sobrando do quadro anterior)
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (viz.ci < 0) return;
    // enquadra pela área entre as faixas de cinema (2:1), não pela tela inteira
    const faixaH = Math.min(H, W / ASPECTO), k = Math.max(W / VW, faixaH / VH);
    tremor = Math.max(0, tremor - dt * 0.45); clarao = Math.max(0, clarao - dt * 1.8);
    const c = cenas[viz.ci];
    if (c.fx === 'raio' && Math.random() < dt * 0.3) { clarao = 0.4; sfx('boss'); }
    const cam = camera(c, viz.t, viz.dur || est);
    const sh = (tremor > 0 || c.fx === 'tremor') ? (tremor * 9 + (c.fx === 'tremor' ? 1.2 : 0)) : 0;
    // respiração da câmera na mão (bem leve)
    const mao = { x: Math.sin(T * 0.7) * 1.6 + Math.sin(T * 1.9) * 0.6, y: Math.cos(T * 0.6) * 1.2 };
    g.setTransform(k * cam.z, 0, 0, k * cam.z, W / 2, H / 2);
    g.translate(-cam.cx + mao.x + rand(-sh, sh), -cam.cy + mao.y + rand(-sh, sh) * 0.7);
    pintarCena(g, c, viz.t, T);
    raiosLuz(g, c, T);
    pintarFiguras(g, c, viz.t, T, opts);
    pintarFx(g, c, T);
    primeiroPlano(g, c, T, cam);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // bloom: as partes claras "vazam" luz (cópia reduzida e desfocada somada por cima)
    if (!bloomCv) bloomCv = document.createElement('canvas');
    bloomCv.width = Math.max(1, W >> 3); bloomCv.height = Math.max(1, H >> 3);
    const bg2 = bloomCv.getContext('2d'); bg2.filter = 'blur(3px)'; bg2.clearRect(0, 0, bloomCv.width, bloomCv.height); bg2.drawImage(cv, 0, 0, bloomCv.width, bloomCv.height);
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.18; g.imageSmoothingEnabled = true; g.drawImage(bloomCv, 0, 0, W, H); g.restore();
    // cor do filme por cena
    const tint = GRADE[c.cena] || GRADE.padrao;
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.22; g.fillStyle = tint; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'saturation'; g.globalAlpha = 0.18; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); g.restore();
    // transição: entra do preto (troca de lugar) ou um "piscar" curto (mesmo lugar)
    const fade = clamp(1 - viz.t / 0.7, 0, 1) * (viz.prev < 0 || cenas[viz.prev]?.cena !== c.cena ? 1 : 0.3);
    if (fade > 0) { g.fillStyle = 'rgba(0,0,0,' + fade + ')'; g.fillRect(0, 0, W, H); }
    if (clarao > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(220,236,255,' + clarao * 0.7 + ')'; g.fillRect(0, 0, W, H); g.restore(); }
    // vinheta e granulação
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (!grao) { grao = document.createElement('canvas'); grao.width = grao.height = 128; const gx = grao.getContext('2d'), d = gx.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } gx.putImageData(d, 0, 0); }
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07;
    const ox = (hash(Math.floor(T * 24), 1, 2) * 128) | 0, oy = (hash(Math.floor(T * 24), 2, 2) * 128) | 0;
    for (let y = -oy; y < H; y += 128) for (let x = -ox; x < W; x += 128) g.drawImage(grao, x, y);
    g.restore();
    // faixas de cinema (2.39:1) que entram no começo
    const alvoH = Math.max(0, (H - W / ASPECTO) / 2), barra = alvoH * easeOut(clamp(T / 1.2, 0, 1));
    g.fillStyle = '#000'; g.fillRect(0, 0, W, barra); g.fillRect(0, H - barra, W, barra);
    if (acabou) { g.fillStyle = 'rgba(0,0,0,' + clamp(saindo / 0.5, 0, 1) + ')'; g.fillRect(0, 0, W, H); }
  }
  raf = requestAnimationFrame(frame);
}

function vozPt() {
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /pt[-_]BR/i.test(v.lang) && /Antonio|Daniel|Google|Francisca|Thalita/i.test(v.name)) || vs.find(v => /pt[-_]BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }

/* ======================= Luz e primeiro plano ======================= */
// cor do "filme" de cada lugar (soft-light por cima de tudo)
const GRADE = {
  padrao: '#F2D8B0', cosmos: '#6A70C8', eden: '#FFE6A0', queda: '#C8506A', sombras: '#6A4A8A', luz: '#FFE2A0', cidade: '#FFB890',
  portais: '#B8A0F0', corinto: '#FFE0B0', agora: '#FFD8A0', oficina: '#FFB878', sinagoga: '#F0C890', casa: '#FFC890', tribunal: '#F0D0B0',
  deserto: '#FFC080', mar: '#5A90B0', costa: '#FFC8A0', vale: '#E8D8A8', colinas: '#E8F0B0', campos: '#FFE0A0', floresta: '#A8E0B0',
  lago: '#B8D8F0', noite: '#5A70C0', trono: '#E04030', muralha: '#FFD0A0', carmelo: '#FF9A60'
};
// de onde vem a luz principal (x da fonte no topo, 0..1) e a cor dela; null = cena sem feixes
const LUZ = {
  eden: [0.78, '255,240,200'], queda: [0.78, '255,200,180'], luz: [0.5, '255,244,210'], cidade: [0.8, '255,210,160'], corinto: [0.2, '255,240,210'],
  agora: [0.3, '255,230,190'], oficina: [0.15, '255,210,150'], sinagoga: [0.5, '255,226,170'], casa: [0.75, '200,210,255'], tribunal: [0.4, '255,236,200'],
  deserto: [0.73, '255,220,160'], colinas: [0.2, '255,244,210'], campos: [0.25, '255,236,180'], floresta: [0.4, '220,255,210'], lago: [0.6, '230,240,255'],
  costa: [0.66, '255,220,180'], vale: [0.5, '255,240,210'], portais: [0.5, '230,215,255'], carmelo: [0.5, '255,200,120'], muralha: [0.3, '255,226,180']
};
// feixes de luz volumétricos com poeira dançando dentro
function raiosLuz(g, c, T) {
  const L = LUZ[c.cena]; if (!L) return;
  const [fx0, cor] = L, sx = fx0 * VW;
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const ang = -0.5 + i * 0.25 + Math.sin(T * 0.13 + i) * 0.03, w0 = 16 + i * 6, w1 = 90 + i * 30, len = VH * 1.25;
    const a = 0.08 + 0.05 * Math.sin(T * 0.4 + i * 1.7);
    g.save(); g.translate(sx, -30); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(' + cor + ',' + a * 1.8 + ')'); gr.addColorStop(0.6, 'rgba(' + cor + ',' + a * 0.6 + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-w0, 0); g.lineTo(w0, 0); g.lineTo(w1, len); g.lineTo(-w1, len); g.closePath(); g.fill();
    g.restore();
  }
  // poeira no feixe
  for (let i = 0; i < 40; i++) {
    const x = sx + (hash(i, 3, 3) - 0.5) * VW * 0.7 + Math.sin(T * 0.3 + i) * 12, y = ((hash(i, 4, 3) * VH + T * (6 + hash(i, 5, 3) * 10)) % VH);
    const perto = 1 - Math.min(1, Math.abs(x - sx - (y * 0.35) * (x > sx ? 1 : -1)) / (VW * 0.35));
    const a = perto * (0.35 + 0.45 * Math.abs(Math.sin(T * 0.8 + i)));
    if (a <= 0.02) continue;
    g.fillStyle = 'rgba(' + cor + ',' + a + ')'; g.beginPath(); g.arc(x, y, 0.8 + hash(i, 6, 3) * 1.4, 0, TAU); g.fill();
  }
  g.restore();
}
// silhuetas desfocadas na frente da câmera (dão profundidade); se movem mais que o cenário quando a câmera anda
const FRENTE = {
  eden: 'folhas', queda: 'folhas', floresta: 'folhas', colinas: 'capim', campos: 'capim', vale: 'capim', lago: 'capim', costa: 'capim', deserto: 'pedras',
  agora: 'colunas', sinagoga: 'colunas', tribunal: 'colunas', portais: 'colunas', oficina: 'panos', casa: 'panos', cidade: 'capim', noite: 'capim',
  trono: 'brasas', mar: 'ondas', muralha: 'pedras', carmelo: 'pedras', corinto: 'colunas'
};
function primeiroPlano(g, c, T, cam) {
  const tipo = FRENTE[c.cena]; if (!tipo) return;
  const px = (cam.cx - VW / 2) * 0.6, py = (cam.cy - VH / 2) * 0.4; // paralaxe: anda mais que o fundo
  g.save(); g.translate(-px, -py);
  try { g.filter = 'blur(3px)'; } catch {}
  const escuro = c.cena === 'trono' ? '#0A0204' : c.cena === 'noite' || c.cena === 'mar' ? '#05070F' : '#120C10';
  g.fillStyle = escuro;
  if (tipo === 'capim' || tipo === 'pedras') {
    g.beginPath(); g.moveTo(-80, VH + 40);
    for (let x = -80; x <= VW + 80; x += 9) { const h2 = tipo === 'capim' ? 30 + hash(x, 1, 7) * 50 + Math.sin(T * 1.4 + x * 0.05) * 6 : 18 + Math.abs(Math.sin(x * 0.02)) * 40; g.lineTo(x, VH + 10 - h2 * (x < 180 || x > VW - 180 ? 1.4 : 0.5)); g.lineTo(x + 4.5, VH + 10); }
    g.lineTo(VW + 80, VH + 40); g.closePath(); g.fill();
  } else if (tipo === 'folhas') {
    for (const [ox, oy, sd] of [[-30, -20, 1], [VW + 30, -10, -1]]) {
      for (let i = 0; i < 8; i++) { const a = sd * (0.4 + i * 0.22) + Math.sin(T * 0.8 + i) * 0.04; g.save(); g.translate(ox, oy); g.rotate(a); g.beginPath(); g.ellipse(70 + i * 12, 0, 60, 14, 0, 0, TAU); g.fill(); g.restore(); }
    }
  } else if (tipo === 'colunas') {
    for (const x of [-20, VW + 20]) { g.fillRect(x - 46, -40, 92, VH + 80); }
  } else if (tipo === 'panos') {
    for (const sd of [-1, 1]) { const x = sd < 0 ? -10 : VW + 10; g.beginPath(); g.moveTo(x, -20); g.quadraticCurveTo(x - sd * 140, VH * 0.3 + Math.sin(T) * 6, x - sd * 40, VH + 20); g.lineTo(x, VH + 20); g.closePath(); g.fill(); }
  } else if (tipo === 'ondas') {
    g.beginPath(); g.moveTo(-80, VH + 40); for (let x = -80; x <= VW + 80; x += 10) g.lineTo(x, VH - 26 - Math.abs(Math.sin(x * 0.012 + T * 1.6)) * 34); g.lineTo(VW + 80, VH + 40); g.closePath(); g.fill();
  } else if (tipo === 'brasas') {
    g.filter = 'blur(2px)'; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) { const k = (T * 0.15 + i / 14) % 1, x = hash(i, 8, 1) * VW, y = VH + 30 - k * (VH + 60); g.fillStyle = 'rgba(255,' + (100 + i * 8) + ',40,' + (1 - k) * 0.8 + ')'; g.beginPath(); g.arc(x + Math.sin(T + i) * 20, y, 3 + hash(i, 9, 1) * 5, 0, TAU); g.fill(); }
  }
  g.restore();
}

/* ======================= Efeitos ======================= */
const PART = Array.from({ length: 90 }, (_, i) => ({ x: hash(i, 1, 3), y: hash(i, 2, 5), v: 0.3 + hash(i, 3, 7), r: 0.5 + hash(i, 4, 9) * 2 }));
function pintarFx(g, c, T) {
  const fx = c.fx;
  if (fx === 'brasas' || fx === 'fogo') {
    for (const p of PART) {
      const y = VH - ((p.y * VH + T * 40 * p.v) % (VH + 40)), x = p.x * VW + Math.sin(T * p.v + p.y * 9) * 18;
      g.fillStyle = fx === 'fogo' ? 'rgba(255,' + (90 + p.r * 40 | 0) + ',40,' + (0.5 + p.r * 0.2) + ')' : 'rgba(255,200,120,' + (0.35 + p.r * 0.15) + ')';
      ell(g, x, y, p.r * 1.3, p.r * 1.3); g.fill();
    }
  }
  if (fx === 'chuva') {
    g.strokeStyle = 'rgba(180,210,230,.35)'; g.lineWidth = 1.2; g.beginPath();
    for (const p of PART) { const x = (p.x * VW + T * 260 * p.v) % VW, y = (p.y * VH + T * 900 * (0.6 + p.v)) % VH; g.moveTo(x, y); g.lineTo(x - 6, y + 22); }
    g.stroke();
  }
  if (fx === 'estrelas') for (const p of PART) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.abs(Math.sin(T * p.v * 2 + p.x * 20))) + ')'; ell(g, p.x * VW, p.y * VH * 0.8, p.r * 0.7, p.r * 0.7); g.fill(); }
}

export { CENAS_DISPONIVEIS } from './cinema-arte.js';
