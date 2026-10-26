// Player das cutscenes (content/cinematicas.js): cenário animado em canvas, personagens, câmera lenta (Ken Burns),
// faixas de cinema, título, legenda que acompanha a narração e o áudio do ElevenLabs (public/narracao/*.mp3).
// Sem o mp3, usa a voz do navegador (pt-BR) e, sem ela, só a legenda com tempo de leitura.
// Toque/clique/Enter/A avança uma cena; "Pular" (Esc/B) encerra.
import { h, rand, clamp, lerp, easeOut, ell, hash, TAU } from '../util.js';
import { config } from '../config.js';
import { audio, sfx } from '../audio.js';
import { drawPerson, drawBoss, drawEnemy, drawPortal, drawSheep, shade } from '../game/draw.js';
import { BOSSES, ENEMIES } from '../data/bestiary.js';
import { WORLD_NPCS } from '../data/npcs.js';
import { CINEMAS, segmentos } from '../content/cinematicas.js';

const VW = 960, VH = 540; // espaço virtual 16:9; a tela é preenchida "cover"
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
    if (c.fx === 'clarão' || c.fx === 'raio') clarao = 1;
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
    const alt = chefe ? VH * 0.0026 * (f.s || 1.5) * 84 : VH * 0.0046 * (f.s || 1.5) * 30;
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
    if (c.fx === 'raio' && Math.random() < dt * 0.35) { clarao = 0.8; sfx('boss'); }
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
    g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.22; g.fillStyle = tint; g.fillRect(0, 0, W, H); g.restore();
    // transição: entra do preto (troca de lugar) ou um "piscar" curto (mesmo lugar)
    const fade = clamp(1 - viz.t / 0.7, 0, 1) * (viz.prev < 0 || cenas[viz.prev]?.cena !== c.cena ? 1 : 0.3);
    if (fade > 0) { g.fillStyle = 'rgba(0,0,0,' + fade + ')'; g.fillRect(0, 0, W, H); }
    if (clarao > 0) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,246,220,' + clarao * 0.85 + ')'; g.fillRect(0, 0, W, H); g.restore(); }
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

/* ======================= Personagens ======================= */
function lookDe(p, opts) {
  if (p === 'jogador') return opts.look || { skin: '#C68B59', hair: '#3A2314', tunic: '#3B4CCA', cape: '#F2C14E', style: 'curto', beard: false };
  if (typeof p === 'string' && p.startsWith('npc:')) return WORLD_NPCS.find(n => n.id === p.slice(4))?.look;
  return typeof p === 'object' ? p : null;
}
function pintarFiguras(g, c, t, T, opts) {
  for (const [i, f] of (c.fig || []).entries()) {
    const ent = easeOut(clamp((t - i * 0.18) / 1.5, 0, 1));
    let x = f.x * VW, y = f.y * VH, alpha = 1;
    if (f.entra === 'esq') x = lerp(-80, x, ent); else if (f.entra === 'dir') x = lerp(VW + 80, x, ent);
    else if (f.entra === 'cima') { y = lerp(y - 260, y, ent); alpha = ent; }
    else if (f.entra === 'baixo') { y = lerp(y + 160, y, ent); alpha = ent; }
    else alpha = clamp((t - i * 0.15) / 0.6, 0, 1);
    const andando = f.anda && f.entra && ent < 1;
    g.save(); g.globalAlpha = alpha;
    if (typeof f.p === 'string' && f.p.startsWith('chefe:')) {
      const bid = f.p.slice(6), d = BOSSES[bid];
      const s = VH * 0.0026 * (f.s || 1.5);
      g.translate(x, y); g.scale(s * (f.vira || 1), s);
      // brilho atrás do chefe
      const gl = g.createRadialGradient(0, -30, 4, 0, -30, 120); gl.addColorStop(0, hexA(d?.cor || '#FF3C3C', 0.35)); gl.addColorStop(1, hexA(d?.cor || '#FF3C3C', 0));
      g.fillStyle = gl; ell(g, 0, -30, 120, 120); g.fill();
      drawBoss(g, { x: 0, y: -40, r: 40, id: bid, d, flash: 0, hp: 1, max: 1 }, T);
    } else {
      const L = lookDe(f.p, opts); if (!L) { g.restore(); continue; }
      const s = VH * 0.0046 * (f.s || 1.5), vira = f.vira || 1;
      if (L.anjo) { const gl = g.createRadialGradient(x, y - 70 * s / 3, 4, x, y - 70 * s / 3, 70 * s); gl.addColorStop(0, 'rgba(255,240,190,.55)'); gl.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gl; ell(g, x, y - 70 * s / 3, 70 * s, 70 * s); g.fill(); }
      // contraluz: um halo quente atrás do personagem recorta a silhueta do fundo
      { const cy2 = y - 22 * s, gl = g.createRadialGradient(x, cy2, 2, x, cy2, 30 * s); gl.addColorStop(0, 'rgba(255,236,190,.38)'); gl.addColorStop(1, 'rgba(255,236,190,0)'); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gl; g.fillRect(x - 30 * s, cy2 - 30 * s, 60 * s, 60 * s); g.restore(); }
      drawPerson(g, x, y + (L.anjo ? Math.sin(T * 1.6) * 6 : 0), s, L, { t: T + i, fx: andando ? 0.95 * (f.entra === 'dir' ? -1 : 1) : 0.28 * vira, fy: andando ? 0.3 : 1, walk: T, moving: andando });
    }
    g.restore();
  }
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}

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

/* ======================= Cenários ======================= */
function ceu(g, cores) {
  const gr = g.createLinearGradient(0, 0, 0, VH);
  cores.forEach((c, i) => gr.addColorStop(i / (cores.length - 1), c));
  g.fillStyle = gr; g.fillRect(-60, -60, VW + 120, VH + 120);
}
function morros(g, cor, base, amp, seed, freq = 0.006) {
  g.fillStyle = cor; g.beginPath(); g.moveTo(-60, VH + 60);
  for (let x = -60; x <= VW + 60; x += 12) g.lineTo(x, base - amp * (Math.sin(x * freq + seed) * 0.6 + Math.sin(x * freq * 2.3 + seed * 1.7) * 0.4));
  g.lineTo(VW + 60, VH + 60); g.fill();
}
function chao(g, cor, y) { g.fillStyle = cor; g.fillRect(-60, y, VW + 120, VH - y + 60); }
function sol(g, x, y, r, cor, halo) {
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r * 4); gr.addColorStop(0, halo); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; ell(g, x, y, r * 4, r * 4); g.fill(); g.fillStyle = cor; ell(g, x, y, r, r); g.fill();
}
function estrelas(g, T, n = 70, h = 0.6) {
  for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(255,255,240,' + (0.3 + 0.6 * Math.abs(Math.sin(T * 0.8 + i))) + ')'; g.fillRect(hash(i, 7, 1) * VW, hash(i, 8, 2) * VH * h, 1.6, 1.6); }
}
function arvore(g, x, y, s, cor = '#2F7A3A', tronco = '#5A3A22') {
  g.fillStyle = tronco; g.fillRect(x - 5 * s, y - 40 * s, 10 * s, 40 * s);
  g.fillStyle = shade(cor, -0.2); ell(g, x, y - 52 * s, 30 * s, 26 * s); g.fill();
  g.fillStyle = cor; ell(g, x - 8 * s, y - 58 * s, 22 * s, 20 * s); g.fill();
}
function palmeira(g, x, y, s, T) {
  g.strokeStyle = '#6A4A2A'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14 * s, y - 50 * s, x + 6 * s, y - 100 * s); g.stroke();
  g.strokeStyle = '#2F7A3A'; g.lineWidth = 5 * s;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.sin(T + i) * 0.05; g.beginPath(); g.moveTo(x + 6 * s, y - 100 * s); g.quadraticCurveTo(x + 6 * s + Math.cos(a) * 30 * s, y - 112 * s + Math.sin(a) * 8 * s, x + 6 * s + Math.cos(a) * 52 * s, y - 92 * s + Math.abs(Math.sin(a)) * 18 * s); g.stroke(); }
}
function colunas(g, xs, topo, base, cor, larg = 28) {
  for (const x of xs) {
    g.fillStyle = shade(cor, -0.25); g.fillRect(x - larg / 2 - 4, topo - 10, larg + 8, 12); g.fillRect(x - larg / 2 - 4, base - 10, larg + 8, 12);
    g.fillStyle = cor; g.fillRect(x - larg / 2, topo, larg, base - topo);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let k = -1; k <= 1; k++) g.fillRect(x + k * larg / 4 - 1, topo, 2, base - topo);
  }
}
function tocha(g, x, y, T, s = 1) {
  g.fillStyle = '#4A3420'; g.fillRect(x - 3 * s, y, 6 * s, 26 * s);
  const fl = 1 + Math.sin(T * 17 + x) * 0.15;
  const gr = g.createRadialGradient(x, y - 4, 2, x, y - 4, 70 * s); gr.addColorStop(0, 'rgba(255,190,90,.45)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = gr; ell(g, x, y - 4, 70 * s, 70 * s); g.fill();
  g.fillStyle = '#FF9A3C'; ell(g, x, y - 6 * s, 6 * s * fl, 11 * s * fl); g.fill(); g.fillStyle = '#FFE38A'; ell(g, x, y - 4 * s, 3 * s, 6 * s * fl); g.fill();
}
function aguas(g, y, cor1, cor2, T, agit = 1) {
  const gr = g.createLinearGradient(0, y, 0, VH); gr.addColorStop(0, cor1); gr.addColorStop(1, cor2);
  g.fillStyle = gr; g.fillRect(-60, y, VW + 120, VH - y + 60);
  g.strokeStyle = 'rgba(255,255,255,' + (0.12 + agit * 0.06) + ')'; g.lineWidth = 2;
  for (let r = 0; r < 9; r++) {
    const yy = y + 8 + r * r * 4.2; g.beginPath();
    for (let x = -60; x <= VW + 60; x += 14) g.lineTo(x, yy + Math.sin(x * 0.03 + T * (1 + agit) + r) * (1.5 + r * agit * 0.9));
    g.stroke();
  }
}
function interior(g, parede, chaoCor, T) {
  ceu(g, [shade(parede, -0.35), parede, shade(parede, -0.2)]);
  for (let y = 0; y < 330; y += 34) for (let x = (y / 34 % 2) * 30; x < VW; x += 60) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(x, y, 60, 34); }
  chao(g, chaoCor, 400);
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -40; x < VW + 60; x += 70) { g.beginPath(); g.moveTo(x, 400); g.lineTo(x - 40, VH); g.lineTo(x - 36, VH); g.lineTo(x + 4, 400); g.fill(); }
}
function multidao(g, y, n, T, cor = 'rgba(20,14,24,.55)') {
  g.fillStyle = cor;
  for (let i = 0; i < n; i++) { const x = hash(i, 5, 11) * VW, s = 0.7 + hash(i, 6, 2) * 0.5, b = Math.sin(T * 2 + i) * 1.5; ell(g, x, y - 30 * s + b, 9 * s, 10 * s); g.fill(); g.beginPath(); g.moveTo(x - 14 * s, y); g.quadraticCurveTo(x, y - 60 * s + b, x + 14 * s, y); g.fill(); }
}

const CENAS = {
  cosmos(g, t, T, c) {
    ceu(g, ['#020108', '#0B0620', '#120A2A']);
    for (const [x, y, r, c] of [[300, 200, 260, 'rgba(110,60,180,.22)'], [700, 330, 300, 'rgba(40,90,170,.18)'], [520, 160, 180, 'rgba(200,90,140,.12)']]) {
      const gr = g.createRadialGradient(x + Math.sin(T * 0.1) * 20, y, 10, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    }
    estrelas(g, T, 160, 1);
    const luz = c.fx === 'clarão' ? clamp((t - 0.3) / 2.5, 0, 1) : 0;
    if (luz > 0) sol(g, VW / 2, VH / 2, 6 + luz * 30, 'rgba(255,250,230,' + luz + ')', 'rgba(255,230,160,' + luz * 0.6 + ')');
  },
  eden(g, t, T) {
    ceu(g, ['#7EC8F0', '#BDE6F6', '#FCEFC8']);
    sol(g, 760, 110, 34, '#FFF4C8', 'rgba(255,236,170,.6)');
    morros(g, '#8CC67A', 330, 40, 1); morros(g, '#5FAE5A', 380, 30, 4);
    aguas(g, 440, '#5EC2E0', '#2E8FB8', T, 0.2); g.fillStyle = '#4E9E48'; g.fillRect(-60, 470, VW + 120, 100);
    for (let i = 0; i < 7; i++) arvore(g, 60 + i * 140 + (i % 2) * 30, 400 + (i % 3) * 8, 1.1 + (i % 2) * 0.3, i === 3 ? '#3E9A46' : '#2F8A3A');
    g.fillStyle = '#C0392B'; for (let i = 0; i < 6; i++) { ell(g, 470 + Math.cos(i) * 18, 330 + Math.sin(i * 2) * 10, 4, 4); g.fill(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = ['#FFE066', '#FF8AB3', '#FFFFFF'][i % 3]; ell(g, (hash(i, 1, 9) * VW + T * 12) % VW, 300 + Math.sin(T * 2 + i) * 30 + hash(i, 2, 1) * 120, 2.5, 2); g.fill(); }
  },
  queda(g, t, T) {
    CENAS.eden(g, t, T);
    const esc = clamp(t / 5, 0, 1);
    g.fillStyle = 'rgba(40,0,10,' + esc * 0.6 + ')'; g.fillRect(-60, -60, VW + 120, VH + 120);
    g.strokeStyle = 'rgba(20,40,20,.9)'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 30; i++) { const x = 560 + i * 6, y = 330 - i * 3 + Math.sin(i * 0.6 + T * 3) * 8; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = '#FF3C3C'; ell(g, 742, 238 + Math.sin(T * 3) * 6, 2.5, 2.5); g.fill();
    if (esc > 0.3) { g.strokeStyle = 'rgba(255,60,60,' + (esc - 0.3) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 470); for (let x = 0; x < VW; x += 30) g.lineTo(x, 470 + hash(x, 3, 3) * 30); g.stroke(); }
  },
  sombras(g, t, T) {
    ceu(g, ['#1A1424', '#3A2A48', '#5A3E58']);
    morros(g, '#2A2034', 360, 50, 2); chao(g, '#1A1422', 420);
    const ids = Object.keys(ENEMIES);
    ids.forEach((k, i) => {
      const d = ENEMIES[k], x = 70 + i * 92 + Math.sin(T * 0.5 + i) * 14, y = 380 + (i % 3) * 34 + Math.sin(T * 1.3 + i) * 5;
      const surge = clamp((t - i * 0.25) / 1.2, 0, 1);
      g.save(); g.globalAlpha = surge; g.translate(x, y + (1 - surge) * 30); g.scale(1.9, 1.9);
      drawEnemy(g, { x: 0, y: 0, r: d.r, ph: i, type: k, flash: 0, telegraph: 0 }, d, T, 0, -60);
      g.restore();
      g.fillStyle = 'rgba(255,240,220,' + 0.65 * surge + ')'; g.font = 'italic 600 13px Alegreya, serif'; g.textAlign = 'center'; g.fillText(d.nome, x, y + 52);
    });
    for (let i = 0; i < 5; i++) { const gr = g.createRadialGradient((i * 230 + T * 15) % (VW + 200) - 100, 430, 10, (i * 230 + T * 15) % (VW + 200) - 100, 430, 200); gr.addColorStop(0, 'rgba(120,80,160,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
    g.fillStyle = 'rgba(160,20,40,.5)'; ell(g, 480, 120, 70, 30); g.fill(); g.fillStyle = '#FF2E4A'; ell(g, 455, 118, 7, 4); g.fill(); ell(g, 505, 118, 7, 4); g.fill();
  },
  luz(g, t, T) {
    ceu(g, ['#1A1230', '#5A3A5A', '#F2B36A']);
    g.save(); g.translate(VW / 2, 120);
    for (let i = 0; i < 16; i++) { g.rotate(TAU / 16); g.fillStyle = 'rgba(255,236,170,' + (0.07 + 0.05 * Math.sin(T + i)) + ')'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, 700); g.lineTo(40, 700); g.fill(); }
    g.restore();
    sol(g, VW / 2, 120, 26, '#FFF8E0', 'rgba(255,240,190,.8)');
    morros(g, '#2A1E2E', 430, 30, 5); chao(g, '#20172A', 460);
    g.fillStyle = '#140E1C'; g.fillRect(VW / 2 - 5, 300, 10, 140); g.fillRect(VW / 2 - 36, 330, 72, 9);
  },
  cidade(g, t, T) {
    ceu(g, ['#2B1F4A', '#B4537A', '#F2A65A']); sol(g, 760, 300, 40, '#FFD39A', 'rgba(255,170,90,.5)');
    morros(g, '#5A3A5A', 330, 30, 3);
    g.fillStyle = '#6E5848'; g.fillRect(80, 220, 800, 150);
    g.fillStyle = '#5A4638'; for (let x = 80; x < 880; x += 40) g.fillRect(x, 204, 24, 18);
    for (const x of [80, 300, 620, 840]) { g.fillStyle = '#5A4638'; g.fillRect(x - 20, 170, 80, 200); for (let k = 0; k < 3; k++) g.fillRect(x - 20 + k * 30, 156, 18, 16); }
    g.fillStyle = '#2A1A10'; g.beginPath(); g.moveTo(430, 370); g.lineTo(430, 290); g.quadraticCurveTo(480, 240, 530, 290); g.lineTo(530, 370); g.fill();
    g.fillStyle = 'rgba(255,190,90,.3)'; g.fillRect(440, 300, 80, 70);
    tocha(g, 410, 300, T); tocha(g, 550, 300, T);
    chao(g, '#3A2A24', 370); g.fillStyle = '#5A4232'; g.beginPath(); g.moveTo(440, 370); g.lineTo(520, 370); g.lineTo(640, VH); g.lineTo(320, VH); g.fill();
  },
  portais(g, t, T) {
    ceu(g, ['#0E0A1A', '#1E1636', '#2A2040']);
    colunas(g, [60, 220, 740, 900], 40, 420, '#4A4060', 40);
    chao(g, '#1A1426', 420); g.strokeStyle = 'rgba(255,214,110,.12)'; for (let x = -60; x < VW + 60; x += 60) { g.beginPath(); g.moveTo(VW / 2, 420); g.lineTo(x * 2 - VW / 2, VH); g.stroke(); }
    const st = ['feito', 'aberto', 'aberto', 'fechado', 'fechado'];
    [[340, 300, 1.4], [480, 270, 1.8], [620, 300, 1.4]].forEach(([x, y, s], i) => { g.save(); g.translate(x, y); g.scale(s, s); drawPortal(g, 0, 0, T + i, st[i + 1] || 'aberto'); g.restore(); });
    tocha(g, 150, 230, T); tocha(g, 810, 230, T);
  },
  corinto(g, t, T) {
    ceu(g, ['#6FB7E8', '#BDE3F5', '#F5E6C8']); sol(g, 200, 100, 28, '#FFF6D0', 'rgba(255,240,180,.55)');
    aguas(g, 300, '#3E9CC8', '#1E6E9A', T, 0.4);
    for (let i = 0; i < 3; i++) { const x = (120 + i * 300 + T * 8) % (VW + 100) - 50; g.fillStyle = '#5A3A22'; g.beginPath(); g.moveTo(x - 30, 320); g.lineTo(x + 30, 320); g.lineTo(x + 20, 332); g.lineTo(x - 20, 332); g.fill(); g.fillStyle = '#F2EBDD'; g.beginPath(); g.moveTo(x, 280); g.lineTo(x + 22, 316); g.lineTo(x, 316); g.fill(); }
    morros(g, '#C9B48A', 300, 60, 2, 0.004); g.fillStyle = '#E8DCC0';
    g.fillRect(600, 190, 220, 14); g.beginPath(); g.moveTo(590, 190); g.lineTo(710, 150); g.lineTo(830, 190); g.fill(); colunas(g, [615, 655, 695, 735, 775, 805], 204, 262, '#EFE6D2', 14);
    chao(g, '#D9C49A', 400); for (let i = 0; i < 9; i++) { g.fillStyle = ['#C0392B', '#1F8A9E', '#F2C14E'][i % 3]; g.fillRect(40 + i * 110, 360, 70, 10); }
    multidao(g, 420, 14, T);
  },
  agora(g, t, T) {
    ceu(g, ['#F2C27A', '#F7DDA8', '#F5E6C8']);
    colunas(g, [40, 140, 820, 920], 60, 400, '#E8DCC0', 34);
    g.fillStyle = '#C9B48A'; g.fillRect(-60, 40, VW + 120, 26);
    for (let i = 0; i < 5; i++) { const x = 200 + i * 130; g.fillStyle = ['#C0392B', '#2E8B57', '#8E44AD', '#1F8A9E', '#D35400'][i]; g.beginPath(); g.moveTo(x - 50, 250); g.lineTo(x + 50, 250); g.lineTo(x + 58, 280); g.lineTo(x - 58, 280); g.fill(); g.fillStyle = '#7A5232'; g.fillRect(x - 46, 330, 92, 40); g.fillRect(x - 48, 280, 6, 60); g.fillRect(x + 42, 280, 6, 60);
      g.fillStyle = '#F2C14E'; for (let k = 0; k < 4; k++) { ell(g, x - 30 + k * 20, 326, 7, 4); g.fill(); } }
    chao(g, '#D9C49A', 400); multidao(g, 430, 18, T, 'rgba(60,40,30,.45)');
    for (let i = 0; i < 4; i++) { g.fillStyle = '#B8B0A0'; g.fillRect(290 + i * 120, 220, 14, 30); ell(g, 297 + i * 120, 214, 9, 9); g.fill(); }
  },
  oficina(g, t, T) {
    interior(g, '#8A6A4A', '#5A4230', T);
    for (let i = 0; i < 4; i++) { const x = 120 + i * 220; g.fillStyle = ['#C9A46A', '#B9875A', '#ECE3CF', '#9A7A50'][i]; g.beginPath(); g.moveTo(x - 70, 60); g.quadraticCurveTo(x, 90 + Math.sin(T + i) * 6, x + 70, 60); g.lineTo(x + 60, 250); g.quadraticCurveTo(x, 270 + Math.sin(T * 1.3 + i) * 5, x - 60, 250); g.fill(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.stroke(); }
    g.fillStyle = '#6A4A2A'; g.fillRect(120, 330, 720, 22); g.fillRect(140, 352, 14, 60); g.fillRect(806, 352, 14, 60);
    g.fillStyle = '#ECE3CF'; g.fillRect(300, 318, 140, 14); g.fillStyle = '#8A5A35'; g.fillRect(520, 314, 90, 18);
    tocha(g, 60, 200, T, 0.8); tocha(g, 900, 200, T, 0.8);
  },
  sinagoga(g, t, T) {
    interior(g, '#7A7068', '#4A423A', T);
    for (let i = 0; i < 5; i++) { const x = 100 + i * 190; g.fillStyle = '#5A524A'; g.beginPath(); g.moveTo(x - 60, 400); g.lineTo(x - 60, 160); g.arc(x, 160, 60, Math.PI, 0); g.lineTo(x + 60, 400); g.lineTo(x + 46, 400); g.lineTo(x + 46, 160); g.arc(x, 160, 46, 0, Math.PI, true); g.lineTo(x - 46, 400); g.fill(); }
    g.fillStyle = '#C9A44A'; g.fillRect(476, 220, 8, 90); for (let k = -3; k <= 3; k++) { g.fillRect(480 + k * 16 - 2, 200, 4, 30); tocha(g, 480 + k * 16, 196, T + k, 0.35); }
    g.fillStyle = '#6A4A2A'; g.fillRect(380, 330, 200, 18); g.fillStyle = '#ECE3CF'; g.fillRect(410, 318, 140, 12); g.fillStyle = '#7A5232'; ell(g, 410, 324, 7, 9); g.fill(); ell(g, 550, 324, 7, 9); g.fill();
  },
  casa(g, t, T) {
    interior(g, '#A8865E', '#6A4E36', T);
    g.fillStyle = '#1A1630'; g.fillRect(640, 110, 150, 120); estrelasJanela(g, T); g.strokeStyle = '#5A3A22'; g.lineWidth = 8; g.strokeRect(640, 110, 150, 120); g.beginPath(); g.moveTo(715, 110); g.lineTo(715, 230); g.stroke();
    g.fillStyle = '#7A5232'; g.fillRect(180, 340, 300, 20); g.fillRect(200, 360, 12, 50); g.fillRect(450, 360, 12, 50);
    g.fillStyle = '#C0392B'; ell(g, 260, 334, 18, 7); g.fill(); g.fillStyle = '#F2C14E'; ell(g, 330, 332, 12, 6); g.fill();
    g.fillStyle = '#2F7A3A'; for (let i = 0; i < 5; i++) { ell(g, 860 + Math.cos(i) * 14, 330 + Math.sin(i * 2) * 10, 14, 10); g.fill(); } g.fillStyle = '#8A5A35'; g.fillRect(844, 340, 34, 36);
    tocha(g, 560, 230, T, 0.7);
  },
  tribunal(g, t, T) {
    ceu(g, ['#9AB8D8', '#D8E4EE', '#EFE6D2']);
    g.fillStyle = '#E8DCC0'; g.beginPath(); g.moveTo(80, 120); g.lineTo(480, 40); g.lineTo(880, 120); g.fill(); g.fillRect(80, 120, 800, 18);
    colunas(g, [120, 230, 340, 620, 730, 840], 138, 380, '#F2EBDD', 30);
    for (const x of [285, 675]) { g.fillStyle = '#8E1B2E'; g.fillRect(x - 24, 150, 48, 140 + Math.sin(T * 1.5 + x) * 3); g.beginPath(); g.moveTo(x - 24, 290); g.lineTo(x, 305); g.lineTo(x + 24, 290); g.fill(); g.fillStyle = '#F2C14E'; g.font = '900 13px Cinzel, serif'; g.textAlign = 'center'; g.fillText('SPQR', x, 200); }
    g.fillStyle = '#D8CCB0'; for (let k = 0; k < 4; k++) g.fillRect(360 + k * 10, 330 + k * 14, 240 - k * 20, 14);
    chao(g, '#CFC2A4', 390); multidao(g, 440, 16, T, 'rgba(50,30,30,.5)');
  },
  deserto(g, t, T) {
    ceu(g, ['#E8A050', '#F5C878', '#FBE3A8']); sol(g, 700, 120, 42, '#FFF2C0', 'rgba(255,220,140,.6)');
    morros(g, '#D9A860', 320, 40, 1, 0.004); morros(g, '#C89048', 380, 50, 3, 0.005); morros(g, '#B07838', 450, 40, 6, 0.007);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,240,200,' + (0.05 + 0.03 * Math.sin(T * 3 + i)) + ')'; g.fillRect(-60, 300 + i * 30 + Math.sin(T * 2 + i) * 4, VW + 120, 6); }
    g.fillStyle = 'rgba(120,80,40,.6)'; for (let i = 0; i < 5; i++) { ell(g, 100 + i * 200, 490, 30, 10); g.fill(); }
  },
  mar(g, t, T) {
    ceu(g, ['#0A1A24', '#1E3A48', '#2E5868']);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(10,20,28,.55)'; ell(g, (i * 300 + T * 20) % (VW + 300) - 100, 70 + i * 20, 220, 50); g.fill(); }
    const base = 300;
    for (let r = 0; r < 4; r++) {
      g.fillStyle = ['#1E5A70', '#174A5E', '#103A4C', '#0B2A36'][r]; g.beginPath(); g.moveTo(-60, VH + 60);
      for (let x = -60; x <= VW + 60; x += 10) g.lineTo(x, base + r * 50 - Math.abs(Math.sin(x * 0.012 + T * (1 + r * 0.3) + r * 2)) * (26 + r * 8));
      g.lineTo(VW + 60, VH + 60); g.fill();
      g.strokeStyle = 'rgba(220,240,250,.25)'; g.lineWidth = 2; g.stroke();
    }
    g.fillStyle = '#3A2A1A'; g.beginPath(); g.moveTo(-60, 470); g.lineTo(300, 455); g.lineTo(340, VH + 60); g.lineTo(-60, VH + 60); g.fill();
  },
  costa(g, t, T) {
    ceu(g, ['#4A6A9A', '#E89A7A', '#F7D08A']); sol(g, 640, 280, 36, '#FFE0A0', 'rgba(255,190,120,.6)');
    aguas(g, 290, '#3E7AA8', '#1E4E78', T, 0.5);
    g.fillStyle = '#E8CF9A'; g.beginPath(); g.moveTo(-60, 400); for (let x = -60; x <= VW + 60; x += 20) g.lineTo(x, 400 + Math.sin(x * 0.01) * 14); g.lineTo(VW + 60, VH + 60); g.lineTo(-60, VH + 60); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.beginPath(); for (let x = -60; x <= VW + 60; x += 20) g.lineTo(x, 398 + Math.sin(x * 0.01) * 14 + Math.sin(T * 2 + x * 0.05) * 3); g.stroke();
    palmeira(g, 80, 440, 1.3, T); palmeira(g, 880, 450, 1.1, T + 1);
  },
  vale(g, t, T) {
    ceu(g, ['#7AA8C8', '#C8DCE8', '#E8E0C8']);
    morros(g, '#8A9A6A', 300, 30, 2);
    g.fillStyle = '#6A7A4A'; g.beginPath(); g.moveTo(-60, 200); g.quadraticCurveTo(200, 210, 330, 430); g.lineTo(-60, VH + 60); g.fill();
    g.beginPath(); g.moveTo(VW + 60, 200); g.quadraticCurveTo(760, 210, 630, 430); g.lineTo(VW + 60, VH + 60); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = '#ECE3CF'; g.beginPath(); g.moveTo(30 + i * 40, 240 + i * 14); g.lineTo(48 + i * 40, 216 + i * 14); g.lineTo(66 + i * 40, 240 + i * 14); g.fill(); g.fillStyle = '#B08D57'; g.beginPath(); g.moveTo(VW - 30 - i * 40, 240 + i * 14); g.lineTo(VW - 48 - i * 40, 216 + i * 14); g.lineTo(VW - 66 - i * 40, 240 + i * 14); g.fill(); }
    chao(g, '#9AA070', 430); g.fillStyle = '#5EA8C8'; g.beginPath(); g.moveTo(400, 430); g.quadraticCurveTo(480, 480, 440, VH + 60); g.lineTo(520, VH + 60); g.quadraticCurveTo(560, 480, 560, 430); g.fill();
    g.fillStyle = '#C8C0B0'; for (let i = 0; i < 5; i++) { ell(g, 470 + i * 12, 470 + (i % 2) * 8, 5, 4); g.fill(); }
  },
  colinas(g, t, T) {
    ceu(g, ['#7EC0E8', '#BFE2F2', '#F2EBC8']); sol(g, 180, 110, 26, '#FFF6D0', 'rgba(255,240,180,.5)');
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; const x = (i * 340 + T * 10) % (VW + 200) - 100; ell(g, x, 90 + i * 22, 50, 16); g.fill(); ell(g, x + 30, 82 + i * 22, 34, 14); g.fill(); }
    morros(g, '#9CCB7A', 320, 50, 2); morros(g, '#7AB860', 380, 40, 5); morros(g, '#5E9E4A', 450, 30, 8);
    g.fillStyle = '#C9A46A'; g.beginPath(); g.moveTo(300, VH + 60); g.quadraticCurveTo(460, 460, 520, 380); g.lineTo(540, 380); g.quadraticCurveTo(520, 470, 660, VH + 60); g.fill();
  },
  campos(g, t, T) {
    CENAS.colinas(g, t, T);
    g.fillStyle = '#E2B84A'; g.fillRect(-60, 440, VW + 120, 120);
    g.strokeStyle = '#C89A30'; g.lineWidth = 2; for (let x = -60; x < VW + 60; x += 9) { const s = Math.sin(T * 1.6 + x * 0.04) * 4; g.beginPath(); g.moveTo(x, VH); g.lineTo(x + s, 446 + hash(x, 1, 1) * 10); g.stroke(); }
    drawSheep(g, 760, 430, T, false, false); drawSheep(g, 820, 438, T + 1, false, true);
  },
  floresta(g, t, T) {
    ceu(g, ['#1E3A2A', '#2E5A3A', '#4A7A4A']);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) arvore(g, i * 120 + r * 40 - 20, 330 + r * 60, 1.4 + r * 0.4, shade('#2F6A3A', -0.3 + r * 0.15), '#3A2A1A');
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,240,180,.07)'; g.beginPath(); g.moveTo(180 + i * 220, -40); g.lineTo(240 + i * 220, -40); g.lineTo(150 + i * 220, VH); g.lineTo(60 + i * 220, VH); g.fill(); }
  },
  lago(g, t, T) {
    ceu(g, ['#8AB8D8', '#CFE4EE', '#EAF0E0']);
    morros(g, '#6A9A6A', 280, 40, 3); aguas(g, 300, '#5E9EC0', '#2E6E98', T, 0.3);
    const x = 560 + Math.sin(T * 0.4) * 20, y = 360 + Math.sin(T * 1.2) * 3;
    g.fillStyle = '#6A4A2A'; g.beginPath(); g.moveTo(x - 60, y); g.lineTo(x + 60, y); g.lineTo(x + 46, y + 18); g.lineTo(x - 46, y + 18); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 40, y); g.quadraticCurveTo(x + 80, y + 20, x + 70, y + 60); g.stroke();
    g.fillStyle = '#8A7A5A'; g.fillRect(-60, 450, VW + 120, 100);
  },
  noite(g, t, T) {
    ceu(g, ['#05060F', '#0E1430', '#1E2448']); estrelas(g, T, 120, 0.7); sol(g, 760, 100, 24, '#F2EED8', 'rgba(220,220,255,.25)');
    morros(g, '#111528', 360, 40, 4); chao(g, '#0B0E1C', 430);
    g.fillStyle = '#1A1C30'; g.fillRect(360, 220, 240, 210); g.fillStyle = '#05060F'; g.beginPath(); g.moveTo(440, 430); g.lineTo(440, 320); g.quadraticCurveTo(480, 280, 520, 320); g.lineTo(520, 430); g.fill();
    tocha(g, 420, 320, T, 0.9); tocha(g, 540, 320, T, 0.9);
  },
  trono(g, t, T) {
    ceu(g, ['#0A0204', '#2A0610', '#4A0E14']);
    for (let i = 0; i < 6; i++) { const x = 80 + i * 160; g.fillStyle = '#1A0A0E'; g.beginPath(); g.moveTo(x - 30, 440); g.lineTo(x - 24, 120 + (i % 3) * 40); g.lineTo(x - 4, 100 + (i % 2) * 50); g.lineTo(x + 26, 150); g.lineTo(x + 30, 440); g.fill(); }
    chao(g, '#14060A', 420);
    g.strokeStyle = '#FF5A1C'; g.lineWidth = 3; g.shadowColor = '#FF5A1C'; g.shadowBlur = 14;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = 80 + i * 160, y = 420; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (hash(i, k, 4) - 0.5) * 60; y += 24; g.lineTo(x, y); } g.stroke(); }
    g.shadowBlur = 0;
    for (let i = 0; i < 2; i++) { const x = i ? 820 : 140; for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,' + (80 + k * 25) + ',30,' + (0.5 - k * 0.07) + ')'; ell(g, x + Math.sin(T * 6 + k) * 6, 400 - k * 26, 26 - k * 3, 34 - k * 3); g.fill(); } }
  },
  muralha(g, t, T) {
    ceu(g, ['#E8B07A', '#F2D0A0', '#F5E6C8']);
    g.fillStyle = '#9A8466'; g.fillRect(-60, 160, VW + 120, 260);
    for (let y = 160; y < 420; y += 30) for (let x = -60 + (y / 30 % 2) * 30; x < VW + 60; x += 60) { g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(x, y, 60, 30); }
    g.fillStyle = '#8A7456'; for (let x = -60; x < VW + 60; x += 50) g.fillRect(x, 136, 30, 26);
    for (const x of [140, 820]) { g.fillStyle = '#7A6446'; g.fillRect(x - 50, 90, 100, 330); for (let k = 0; k < 3; k++) g.fillRect(x - 50 + k * 38, 70, 24, 22); }
    chao(g, '#B89A6A', 420);
  },
  carmelo(g, t, T) {
    ceu(g, ['#2A1A3A', '#8A4A5A', '#E8A06A']);
    g.fillStyle = '#4A3A3A'; g.beginPath(); g.moveTo(-60, VH); g.lineTo(380, 220); g.lineTo(560, 230); g.lineTo(VW + 60, VH); g.fill();
    g.fillStyle = '#8A7A6A'; for (let k = 0; k < 12; k++) { g.fillRect(430 + (k % 4) * 26, 210 - Math.floor(k / 4) * 14, 24, 13); }
    g.fillStyle = 'rgba(255,200,90,.85)'; g.beginPath(); g.moveTo(470, -60); g.lineTo(510, -60); g.lineTo(540, 200); g.lineTo(440, 200); g.fill();
    for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(255,' + (120 + k * 18) + ',40,' + (0.7 - k * 0.08) + ')'; ell(g, 482 + Math.sin(T * 8 + k) * 8, 190 - k * 16, 34 - k * 4, 26 - k * 2); g.fill(); }
  }
};
function estrelasJanela(g, T) { for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(255,255,230,' + (0.4 + 0.5 * Math.abs(Math.sin(T + i))) + ')'; g.fillRect(648 + hash(i, 1, 4) * 134, 118 + hash(i, 2, 4) * 100, 2, 2); } }

function pintarCena(g, c, t, T) {
  g.save();
  (CENAS[c.cena] || CENAS.noite)(g, t, T, c);
  g.restore();
}

export const CENAS_DISPONIVEIS = Object.keys(CENAS);
