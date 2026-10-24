// Minijogos dos personagens do mundo. Cada um termina com close({ score, item }) ou close(null).
import { h, rand, clamp, shuffle, rr, ell } from '../util.js';
import { sfx } from '../audio.js';

export function playMinigame(id, panel, close, opts) {
  ({ pesca, mana, arca, pescaria })[id](panel, close, opts);
}

function header(p, title, ref, close) {
  p.append(h('div', { class: 'p-head' }, h('h3', {}, title), h('small', { class: 'muted' }, ref), h('button', { class: 'x', onclick: () => close(null), 'aria-label': 'Fechar' }, '✕')));
}
function stage(p, w = 640, hgt = 320) {
  const c = h('canvas', { class: 'mini-canvas', width: w * 2, height: hgt * 2 });
  p.append(c);
  const g = c.getContext('2d'); g.scale(2, 2);
  return { c, g, w, h: hgt };
}
function finish(p, close, titulo, texto, score, item, extra) {
  sfx('level');
  p.append(h('div', { class: 'mini-end' }, h('h3', {}, titulo), h('p', {}, texto), h('b', { class: 'big' }, '+' + score + ' pontos'),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close({ score, item, ...extra }) }, 'Receber'))));
}

/* ---------- Pesca Maravilhosa (João 21:1-11) ---------- */
function pesca(p, close) {
  header(p, '🐟 A Pesca Maravilhosa', 'João 21:1-11', close);
  const msg = h('p', { class: 'mini-msg' }, 'Pescaram a noite toda… Toque em LANÇAR quando o marcador estiver na área verde.');
  p.append(msg);
  const { c, g, w, h: H } = stage(p);
  const btn = h('button', { class: 'btn gold big-btn' }, 'LANÇAR A REDE');
  p.append(h('div', { class: 'btn-row' }, btn));
  let round = 0, total = 0, x = 0, dir = 1, raf, t = 0, wait = 0, lastFish = 0;
  const rounds = [
    { zone: [0.08, 0.14], spd: 1.5, side: 'esquerdo', noite: true },
    { zone: [0.2, 0.25], spd: 1.7, side: 'esquerdo', noite: true },
    { zone: [0.55, 0.95], spd: 1.1, side: 'direito' },
    { zone: [0.6, 0.95], spd: 1.3, side: 'direito' }
  ];
  const draw = () => {
    t += 1 / 60;
    const R = rounds[Math.min(round, 3)];
    if (wait <= 0 && round < 4) { x += dir * R.spd / 60; if (x > 1) { x = 1; dir = -1; } if (x < 0) { x = 0; dir = 1; } }
    else wait -= 1 / 60;
    // céu e mar
    const sky = g.createLinearGradient(0, 0, 0, H * 0.45);
    sky.addColorStop(0, R.noite ? '#141838' : '#F6B26B'); sky.addColorStop(1, R.noite ? '#2B3A6E' : '#FBE3B5');
    g.fillStyle = sky; g.fillRect(0, 0, w, H * 0.45);
    g.fillStyle = R.noite ? '#173A5A' : '#2C78AE'; g.fillRect(0, H * 0.45, w, H * 0.55);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect((i * 97 + t * 30) % w, H * 0.5 + i * 18, 40, 2); }
    if (!R.noite) { g.fillStyle = '#FFF2B0'; ell(g, w * 0.85, H * 0.18, 26, 26); g.fill(); }
    // barco
    const bx = w / 2, by = H * 0.45 + Math.sin(t * 2) * 3;
    g.fillStyle = '#6B4A2F'; g.beginPath(); g.moveTo(bx - 90, by - 10); g.lineTo(bx + 90, by - 10); g.lineTo(bx + 60, by + 22); g.lineTo(bx - 60, by + 22); g.closePath(); g.fill();
    g.strokeStyle = '#4A3220'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by - 10); g.lineTo(bx, by - 90); g.stroke();
    g.fillStyle = '#F4EEE2'; g.beginPath(); g.moveTo(bx + 3, by - 86); g.lineTo(bx + 60, by - 30); g.lineTo(bx + 3, by - 26); g.fill();
    // Jesus na praia nas rodadas finais
    if (!R.noite) { g.fillStyle = '#E6CC8E'; g.fillRect(w - 110, H * 0.4, 110, 14); g.fillStyle = '#FFFFFF'; rr(g, w - 60, H * 0.4 - 30, 14, 30, 6); g.fill(); g.fillStyle = '#C68B59'; ell(g, w - 53, H * 0.4 - 36, 7, 7); g.fill(); g.strokeStyle = 'rgba(255,230,140,.8)'; g.lineWidth = 2; ell(g, w - 53, H * 0.4 - 46, 7, 2); g.stroke(); }
    // barra de precisão
    const by2 = H - 36, bw = w - 80;
    g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, 40, by2, bw, 18, 9); g.fill();
    g.fillStyle = '#36B368'; g.fillRect(40 + R.zone[0] * bw, by2, (R.zone[1] - R.zone[0]) * bw, 18);
    g.fillStyle = '#fff'; g.font = '800 11px Nunito'; g.textAlign = 'left'; g.fillText('ESQUERDA', 44, by2 - 6); g.textAlign = 'right'; g.fillText('DIREITA', 40 + bw, by2 - 6);
    g.fillStyle = '#FFD23F'; rr(g, 40 + x * bw - 5, by2 - 6, 10, 30, 4); g.fill();
    // peixes pulando
    if (lastFish > 0) { lastFish -= 1 / 60; for (let i = 0; i < 6; i++) { g.fillStyle = '#C0D6E4'; ell(g, bx + 110 + i * 14, H * 0.55 - Math.abs(Math.sin(t * 8 + i)) * 30, 8, 4); g.fill(); } }
    g.fillStyle = '#fff'; g.font = '900 16px Nunito'; g.textAlign = 'left'; g.fillText('🐟 ' + total + ' peixes', 14, 24);
    g.textAlign = 'right'; g.fillText('Lance ' + Math.min(round + 1, 4) + '/4', w - 14, 24);
    if (round < 4) raf = requestAnimationFrame(draw);
  };
  btn.onclick = () => {
    if (wait > 0 || round >= 4) return;
    const R = rounds[round];
    const inZone = x >= R.zone[0] && x <= R.zone[1];
    const center = (R.zone[0] + R.zone[1]) / 2, acc = 1 - Math.abs(x - center) / ((R.zone[1] - R.zone[0]) / 2);
    const fish = inZone ? (R.noite ? 2 : Math.round(55 + acc * 25)) : 0;
    total += fish; lastFish = fish ? 1.2 : 0; sfx(fish ? 'coin' : 'wrong');
    round++; wait = 0.8;
    if (round === 2) msg.textContent = 'Amanheceu. Alguém na praia grita: "Lancem a rede do lado DIREITO do barco, e acharão!"';
    else if (round < 4) msg.textContent = fish ? 'A rede veio cheia! +' + fish + ' peixes' : 'A rede veio vazia…';
    if (round >= 4) {
      btn.disabled = true;
      setTimeout(() => {
        cancelAnimationFrame(raf);
        const full = total >= 153;
        finish(p, close, full ? '153 grandes peixes!' : total + ' peixes', (full ? '"A rede estava cheia de 153 grandes peixes e, mesmo sendo tantos, a rede não se rompeu" (Jo 21:11). ' : '') + 'Quando obedecemos à voz de Jesus, o esforço dá fruto.', total * 4, full ? 'agua_viva' : 'peixe');
      }, 900);
    }
  };
  addEventListener('keydown', function k(e) { if (!document.body.contains(btn)) return removeEventListener('keydown', k); if (e.code === 'Space') { e.preventDefault(); btn.click(); } });
  draw();
}

/* ---------- Pescaria livre (qualquer beira d'água do mundo) ---------- */
// dif: 0 fácil … 1 difícil (o quanto o peixe foge na hora de puxar)
const PEIXES = {
  lago: [
    { nome: 'Tilápia (peixe de São Pedro)', icon: '🐟', p: 50, dif: 0.25, pts: 25, item: 'peixe' },
    { nome: 'Carpa da Galileia', icon: '🐟', p: 30, dif: 0.45, pts: 40, item: 'peixe' },
    { nome: 'Bagre', icon: '🐡', p: 14, dif: 0.65, pts: 60, item: 'peixe' }
  ],
  costa: [
    { nome: 'Sardinha', icon: '🐟', p: 45, dif: 0.3, pts: 25, item: 'peixe' },
    { nome: 'Atum', icon: '🐠', p: 30, dif: 0.55, pts: 50, item: 'peixe' },
    { nome: 'Peixe-espada', icon: '🐬', p: 14, dif: 0.8, pts: 90, item: 'agua_viva' }
  ],
  // raro em qualquer lugar: "achará um estáter" (Mt 17:27)
  raro: { nome: 'Peixe com a moeda na boca', icon: '🪙', p: 6, dif: 0.7, pts: 150, ouro: 60, ref: 'Mateus 17:27' }
};
function pescaria(p, close, opts = {}) {
  const lista = [...(PEIXES[opts.zona] || PEIXES.lago), PEIXES.raro];
  header(p, '🎣 Pescaria', opts.nome || 'Lucas 5:4', close);
  const msg = h('p', { class: 'mini-msg' }, 'Lance a linha e espere. Quando aparecer o ❗, puxe rápido! Depois segure o botão para manter o peixe dentro da faixa verde.');
  p.append(msg);
  const { g, w, h: H } = stage(p);
  const btn = h('button', { class: 'btn gold big-btn' }, 'LANÇAR');
  p.append(h('div', { class: 'btn-row' }, btn));
  // fases: pronto → espera → fisgou (janela curta) → puxando → fim
  let fase = 'pronto', t = 0, espera = 0, beliscos = [], janela = 0, raf, held = false;
  let peixe = null, fx = 0.5, fv = 0, alvo = 0.5, zx = 0.4, zv = 0, prog = 0.3, fim = null;
  const ZW = 0.34; // largura da faixa verde
  const sorteia = () => { let r = Math.random() * lista.reduce((s, f) => s + f.p, 0); for (const f of lista) if ((r -= f.p) < 0) return f; return lista[0]; };
  const acabar = (ok, texto) => {
    fase = 'fim'; btn.disabled = true; sfx(ok ? 'coin' : 'wrong');
    setTimeout(() => {
      cancelAnimationFrame(raf);
      if (!ok) { p.append(h('div', { class: 'mini-end' }, h('h3', {}, 'Escapou!'), h('p', {}, texto + ' "Lançai a rede e achareis" (Jo 21:6) — tente de novo!'), h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close(null) }, 'Ok')))); return; }
      finish(p, close, peixe.icon + ' ' + peixe.nome + '!', peixe.ref ? '"Abrindo-lhe a boca, achará um estáter" (' + peixe.ref + '). +' + peixe.ouro + ' denários!' : 'Bela pescaria! Jesus disse: "Vinde após mim, e eu vos farei pescadores de homens" (Mt 4:19).', peixe.pts, peixe.item || null, { ouro: peixe.ouro || 0, peixe: peixe.nome });
      fim = { peixe };
    }, 700);
  };
  const press = () => {
    if (fase === 'pronto') { fase = 'espera'; espera = rand(1.6, 4.2); beliscos = [rand(0.5, espera - 0.6)].filter(x => x > 0.3 && Math.random() < 0.4); btn.textContent = 'PUXAR!'; msg.textContent = 'Espere o peixe morder…'; sfx('dodge'); return; }
    if (fase === 'espera') { acabar(false, 'Você puxou cedo demais e o peixe fugiu.'); return; }
    if (fase === 'fisgou') { fase = 'puxando'; peixe = sorteia(); btn.textContent = 'SEGURE PARA PUXAR'; msg.textContent = 'Fisgou! Segure o botão (ou Espaço) para mover a faixa verde e mantenha o peixe dentro dela.'; sfx('right'); }
  };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); held = true; press(); });
  addEventListener('pointerup', () => { held = false; });
  const kd = e => { if (!document.body.contains(btn)) { removeEventListener('keydown', kd); removeEventListener('keyup', kd); return; } if (e.code !== 'Space') return; e.preventDefault(); if (e.type === 'keydown') { if (!e.repeat) { held = true; press(); } } else held = false; };
  addEventListener('keydown', kd); addEventListener('keyup', kd);
  const draw = () => {
    const dt = 1 / 60; t += dt;
    // lógica
    let bob = Math.sin(t * 3) * 2;
    if (fase === 'espera') {
      espera -= dt;
      for (const b of beliscos) if (Math.abs((espera) - b) < 0.12) bob += 5; // belisco: não é hora ainda!
      if (espera <= 0) { fase = 'fisgou'; janela = 1.2; sfx('parry'); }
    } else if (fase === 'fisgou') { janela -= dt; bob += 9; if (janela <= 0) acabar(false, 'O peixe soltou a isca.'); }
    else if (fase === 'puxando') {
      // o peixe muda de rumo de tempos em tempos (mais difícil = mais rápido e agitado)
      if (Math.random() < 0.012 + peixe.dif * 0.03) alvo = rand(0.1, 0.9);
      fv += (alvo - fx) * (1.4 + peixe.dif * 3.5) * dt; fv *= 0.92; fx = clamp(fx + fv * dt * 5, 0, 1);
      // faixa verde mais pesada e macia (menos sensível ao toque)
      zv += (held ? 1.15 : -1.0) * dt; zv *= 0.9; zx += zv * dt * 5;
      if (zx < 0) { zx = 0; zv = Math.max(0, zv) * -0.3; } if (zx > 1 - ZW) { zx = 1 - ZW; zv = Math.min(0, zv) * -0.3; }
      const dentro = fx >= zx && fx <= zx + ZW;
      prog = clamp(prog + (dentro ? 0.2 : -(0.08 + peixe.dif * 0.08)) * dt, 0, 1);
      if (prog >= 1) acabar(true); else if (prog <= 0) acabar(false, 'A linha afrouxou e o peixe escapou.');
    }
    // desenho: céu, água, margem e boia
    const sky = g.createLinearGradient(0, 0, 0, H * 0.4); sky.addColorStop(0, '#9FD3F0'); sky.addColorStop(1, '#E6F4FA');
    g.fillStyle = sky; g.fillRect(0, 0, w, H * 0.4);
    g.fillStyle = opts.zona === 'costa' ? '#2C78AE' : '#3C8DC0'; g.fillRect(0, H * 0.4, w, H * 0.6);
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect((i * 83 + t * 20) % w, H * 0.46 + i * 16, 36, 2); }
    g.fillStyle = '#7DB356'; g.beginPath(); g.moveTo(0, H * 0.38); g.lineTo(120, H * 0.42); g.lineTo(150, H); g.lineTo(0, H); g.fill();
    // pescador e linha
    g.fillStyle = '#6B4A2F'; g.lineWidth = 3; g.strokeStyle = '#6B4A2F'; g.beginPath(); g.moveTo(70, H * 0.55); g.lineTo(200, H * 0.2); g.stroke();
    const boiaX = fase === 'pronto' ? 200 : w * 0.6 + (fase === 'puxando' ? (fx - 0.5) * 120 : 0), boiaY = fase === 'pronto' ? H * 0.2 : H * 0.55 + bob;
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(200, H * 0.2); g.quadraticCurveTo((200 + boiaX) / 2, H * 0.3, boiaX, boiaY); g.stroke();
    if (fase !== 'pronto') { g.fillStyle = '#E0483A'; ell(g, boiaX, boiaY, 6, 6); g.fill(); g.fillStyle = '#fff'; ell(g, boiaX, boiaY - 3, 6, 3); g.fill(); }
    if (fase === 'fisgou') { g.fillStyle = '#FFD23F'; g.font = '900 34px Nunito'; g.textAlign = 'center'; g.fillText('❗', boiaX, boiaY - 22); }
    // barra de puxar
    if (fase === 'puxando' || (fase === 'fim' && peixe)) {
      const bx = 40, bw = w - 80, by = H - 46;
      g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, bx, by, bw, 22, 11); g.fill();
      g.fillStyle = 'rgba(54,179,104,.85)'; rr(g, bx + zx * bw, by, ZW * bw, 22, 11); g.fill();
      g.font = '22px sans-serif'; g.textAlign = 'center'; g.fillText('🐟', bx + fx * bw, by + 18);
      g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, bx, by - 14, bw, 7, 4); g.fill();
      g.fillStyle = '#FFD23F'; rr(g, bx, by - 14, bw * prog, 7, 4); g.fill();
    }
    if (fase !== 'fim' || !fim) raf = requestAnimationFrame(draw);
  };
  draw();
}

/* ---------- Colheita do Maná (Êxodo 16) ---------- */
function mana(p, close) {
  header(p, '✨ A Colheita do Maná', 'Êxodo 16:14-21', close);
  p.append(h('p', { class: 'mini-msg' }, 'Mova a cesta (dedo, mouse ou setas). Pegue o maná e as codornizes. Evite o maná estragado com vermes — ele apodrece quando é guardado por ganância (Êx 16:20)!'));
  const { c, g, w, h: H } = stage(p);
  let bx = w / 2, items = [], score = 0, caught = 0, worms = 0, t = 0, end = 30, raf, keys = {};
  const move = e => { const r = c.getBoundingClientRect(); bx = clamp((e.clientX - r.left) / r.width * w, 30, w - 30); };
  c.addEventListener('pointermove', move); c.addEventListener('pointerdown', move);
  const kd = e => { keys[e.code] = e.type === 'keydown'; };
  addEventListener('keydown', kd); addEventListener('keyup', kd);
  const loop = () => {
    const dt = 1 / 60; t += dt;
    if (keys.ArrowLeft || keys.KeyA) bx = Math.max(30, bx - 360 * dt);
    if (keys.ArrowRight || keys.KeyD) bx = Math.min(w - 30, bx + 360 * dt);
    if (Math.random() < 0.09 + t * 0.002) items.push({ x: rand(20, w - 20), y: -10, vy: rand(70, 130) + t * 3, k: Math.random() < 0.2 ? 'verme' : Math.random() < 0.06 ? 'codorniz' : 'mana', r: rand(0, 6) });
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#F8D9A0'); sky.addColorStop(1, '#E6CC8E');
    g.fillStyle = sky; g.fillRect(0, 0, w, H);
    g.fillStyle = '#D9BC7A'; g.fillRect(0, H - 30, w, 30);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#C2412D'; g.beginPath(); g.moveTo(40 + i * 140, H - 30); g.lineTo(70 + i * 140, H - 70); g.lineTo(100 + i * 140, H - 30); g.fill(); }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.y += it.vy * dt; it.r += dt * 3;
      if (it.k === 'mana') { g.fillStyle = '#FFFDF2'; g.shadowColor = '#fff'; g.shadowBlur = 8; ell(g, it.x, it.y, 6, 4); g.fill(); g.shadowBlur = 0; }
      else if (it.k === 'verme') { g.fillStyle = '#C8C0A0'; ell(g, it.x, it.y, 7, 5); g.fill(); g.strokeStyle = '#7A5232'; g.lineWidth = 2; g.beginPath(); g.moveTo(it.x - 6, it.y); g.quadraticCurveTo(it.x, it.y - 8 + Math.sin(it.r * 3) * 3, it.x + 6, it.y); g.stroke(); }
      else { g.font = '18px sans-serif'; g.textAlign = 'center'; g.fillText('🐦', it.x, it.y + 6); }
      if (it.y > H - 48 && it.y < H - 20 && Math.abs(it.x - bx) < 32) {
        items.splice(i, 1);
        if (it.k === 'mana') { score += 10; caught++; sfx('coin'); }
        else if (it.k === 'codorniz') { score += 30; sfx('right'); }
        else { score = Math.max(0, score - 20); worms++; sfx('wrong'); }
      } else if (it.y > H) items.splice(i, 1);
    }
    // cesta
    g.fillStyle = '#8A5A35'; rr(g, bx - 30, H - 50, 60, 22, 8); g.fill(); g.strokeStyle = '#5A3820'; g.lineWidth = 2; for (let i = -20; i <= 20; i += 10) { g.beginPath(); g.moveTo(bx + i, H - 50); g.lineTo(bx + i, H - 28); g.stroke(); }
    g.fillStyle = '#2A2016'; g.font = '900 16px Nunito'; g.textAlign = 'left'; g.fillText('✨ ' + score, 12, 24); g.textAlign = 'right'; g.fillText(Math.ceil(end - t) + 's', w - 12, 24);
    if (t < end) raf = requestAnimationFrame(loop);
    else {
      removeEventListener('keydown', kd); removeEventListener('keyup', kd);
      finish(p, close, 'Colheita encerrada!', 'Você juntou ' + caught + ' porções de maná' + (worms ? ' e pegou ' + worms + ' estragadas' : '') + '. "O que colheu muito não teve demais, e o que colheu pouco não teve falta" (Êx 16:18). Deus cuida do nosso pão de cada dia.', score, score >= 300 ? 'mana' : null);
    }
  };
  loop();
}

/* ---------- Pares da Arca (Gênesis 7:9) ---------- */
function arca(p, close) {
  header(p, '🦁 Os Pares da Arca', 'Gênesis 7:9', close);
  const info = h('p', { class: 'mini-msg' }, 'Encontre os pares de animais para levá-los à arca antes da chuva!');
  p.append(info);
  const animals = ['🦁', '🐑', '🐘', '🦒', '🐪', '🕊️', '🐫', '🐻'];
  const cards = shuffle([...animals, ...animals]).map((a, i) => ({ a, i, up: false, ok: false }));
  const grid = h('div', { class: 'memory' });
  p.append(grid);
  let first = null, lock = false, moves = 0, pairs = 0;
  const t0 = performance.now();
  const els = cards.map(cd => {
    const b = h('button', { class: 'card', 'aria-label': 'Carta' }, h('span', {}, cd.a));
    b.onclick = () => {
      if (lock || cd.up || cd.ok) return;
      cd.up = true; b.classList.add('up'); sfx('click');
      if (!first) { first = { cd, b }; return; }
      moves++;
      if (first.cd.a === cd.a) {
        cd.ok = first.cd.ok = true; b.classList.add('ok'); first.b.classList.add('ok'); first = null; pairs++; sfx('right');
        info.textContent = 'Par encontrado! ' + pairs + '/' + animals.length + ' · jogadas: ' + moves;
        if (pairs === animals.length) {
          const secs = Math.round((performance.now() - t0) / 1000);
          const score = Math.max(80, 700 - moves * 12 - secs * 4);
          setTimeout(() => finish(p, close, 'Todos na arca!', 'Em ' + moves + ' jogadas e ' + secs + 's. Depois do dilúvio, a pomba voltou com uma folha de oliveira (Gn 8:11) — sinal de esperança. Deus cumpre suas promessas!', score, score >= 400 ? 'oleo' : null), 500);
        }
      } else {
        lock = true; const f = first; first = null;
        setTimeout(() => { cd.up = f.cd.up = false; b.classList.remove('up'); f.b.classList.remove('up'); lock = false; }, 700);
      }
    };
    grid.append(b); return b;
  });
  void els;
}
