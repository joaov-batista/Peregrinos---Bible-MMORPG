// Interface dentro do jogo: HUD, diálogos, quiz, lojas, menu, ranking e telas de vitória/derrota.
import { $, h, fmt, shuffle, clamp } from '../util.js';
import { sfx, audio, setMuted, initAudio, setVolumes } from '../audio.js';
import { input } from '../input.js';
import { net, ONLINE } from '../net.js';
import { ITEMS, SLOTS, SLOT_NOMES, RARIDADE, itemCor, statLine, STATS, statVal, efeitos, porCategoria } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { ENEMIES, BOSSES } from '../data/bestiary.js';
import { QUESTS, LOJAS } from '../data/npcs.js';
import { SEMANA_ATUAL } from '../content/index.js';
import { drawPerson } from '../game/draw.js';
import { count, addItem, removeItem, equip, unequip, canEquip, faseProg, computeStats } from '../game/player.js';
import { playMinigame } from './minigames.js';
import { TS, ZONES, ZONE_LABELS } from '../game/world.js';
import { pwa } from '../pwa.js';
import { config, setConfig } from '../config.js';

export function createHud(onExit) {
  let modals = 0, game = null;
  const root = $('overlay');
  const ui = {
    get blocking() { return modals > 0; },
    attach(g) {
      game = g;
      const sk = CLASSES[g.char.cls].skill, b = $('aSkill');
      b.dataset.name = sk.nome; b.title = sk.nome + ' — ' + sk.desc + ' (custa ' + sk.custo + ' Fé)';
      document.querySelectorAll('#actions [data-act]').forEach(x => { if (x !== b) x.title = x.dataset.name + ' (' + x.dataset.key + ')'; });
    },
    show(on) { $('hud').hidden = !on; $('actions').hidden = !on; $('chat').hidden = !on; document.body.classList.toggle('playing', on); }
  };

  /* ---------- Modal genérico ---------- */
  function modal(build, opts = {}) {
    return new Promise(resolve => {
      modals++; input.clear();
      const wrap = h('div', { class: 'modal' + (opts.cls ? ' ' + opts.cls : '') });
      const panel = h('div', { class: 'panel' + (opts.wide ? ' wide' : '') });
      wrap.append(panel); root.append(wrap);
      let done = false;
      const close = v => { if (done) return; done = true; modals--; wrap.classList.add('out'); setTimeout(() => wrap.remove(), 160); input.clear(); resolve(v); };
      if (opts.dismiss !== false) wrap.addEventListener('pointerdown', e => { if (e.target === wrap) close(opts.dismissValue); });
      wrap._close = close;
      build(panel, close);
      requestAnimationFrame(() => panel.querySelector('button:not([disabled])')?.focus({ preventScroll: true }));
    });
  }
  // botão de montar: só aparece com burrinho/cavalo equipado
  ui.mountBtn = (tem, montado) => { const b = $('aMount'); b.hidden = !tem; b.classList.toggle('on', !!montado); b.dataset.name = montado ? 'Descer' : 'Montar'; };
  ui.closeAll = () => root.querySelectorAll('.modal').forEach(m => m._close?.());
  input.padAcoes = { menu: () => { if (!modals && game) ui.openMenu(); }, mapa: () => { if (!modals && game) ui.openMap(); } };
  input.padAvisar = msg => ui.toast(msg, 4000);
  addEventListener('keydown', e => {
    if (e.code === 'Escape' && modals > 0) { const all = root.querySelectorAll('.modal:not(.locked)'); all[all.length - 1]?._close?.(); }
  });

  function portrait(look, size = 64) {
    const c = h('canvas', { class: 'portrait', width: size * 2, height: size * 2 });
    if (look) { const g = c.getContext('2d'); g.scale(2, 2); drawPerson(g, size / 2, size * 0.78, size / 40, look, { t: 0, fx: 0, fy: 1 }); }
    else { const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, size * 2, size * 2); g.fillStyle = '#FF2E4A'; g.fillRect(size * 0.8, size * 0.9, 10, 5); g.fillRect(size * 1.1, size * 0.9, 10, 5); }
    return c;
  }

  /* ---------- HUD ---------- */
  const bar = (id, v, max) => { $(id).style.width = clamp(v / max * 100, 0, 100) + '%'; };
  ui.hud = s => {
    bar('bHp', s.hp, s.maxHp); bar('bFe', s.fe, s.maxFe); bar('bSta', s.sta, 100); bar('bXp', s.xp, s.xpNeed);
    $('tHp').textContent = Math.ceil(s.hp) + '/' + s.maxHp; $('tFe').textContent = Math.floor(s.fe) + '/' + s.maxFe;
    $('hLvl').textContent = s.level; $('hGold').textContent = fmt(s.gold); $('hScore').textContent = fmt(s.score);
    $('hpWrap').classList.toggle('low', s.hp / s.maxHp < 0.3);
    const sk = $('aSkill'); sk.style.setProperty('--cd', (s.skillCd * 100) + '%'); sk.classList.toggle('nofe', !s.skillOk);
    $('aLock').classList.toggle('on', !!s.lock);
    const bb = $('aBotija'), nb = s.botija.n + '/' + s.botija.max; if (bb.dataset.n !== nb) { bb.dataset.n = nb; bb.classList.toggle('vazio', s.botija.n <= 0); }
    const bDef = document.querySelector('[data-act="defend"]'); if (bDef._e !== s.escudo) { bDef._e = s.escudo; bDef.classList.toggle('vazio', !s.escudo); bDef.title = s.escudo ? 'Defender (Shift)' : 'Sem escudo: equipe um no menu › Personagem'; }
    s.atalhos.forEach((a, i) => {
      const b = $('aItem' + (i + 1)), key = a ? a.icon + a.n : '';
      if (b._k === key) return; b._k = key;
      b.textContent = a ? a.icon : '＋'; b.dataset.n = a ? a.n : ''; b.classList.toggle('vazio', !a || !a.n);
      b.dataset.name = a ? a.nome : 'Atalho ' + (i + 1); b.title = b.dataset.name + ' (' + b.dataset.key + ')';
    });
  };
  ui.hurt = () => { const v = $('vignette'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); };
  ui.online = n => { $('hOnline').textContent = n ? '🟢 ' + n + ' online' : '📴 offline'; };
  ui.zone = (name, safe) => {
    const z = $('zoneName'); z.innerHTML = ''; z.append(h('b', {}, name), h('small', {}, safe ? 'Área segura' : 'Cuidado: vícios à solta'));
    z.classList.remove('on'); void z.offsetWidth; z.classList.add('on');
  };
  ui.banner = (top, title, ref) => {
    const b = $('banner'); b.innerHTML = ''; b.append(h('small', {}, top), h('b', {}, title), ref ? h('i', {}, ref) : '');
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  };
  ui.toast = (msg, ms = 3200) => {
    const t = h('div', { class: 'toast' }, msg); $('toasts').append(t);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  };
  ui.bossBar = (name, ratio, titulo, postura = 0) => {
    const b = $('bossBar');
    if (!name) { b.hidden = true; return; }
    b.hidden = false; b.querySelector('.bn').textContent = (titulo ? titulo + ' · ' : '') + name;
    b.querySelector('.bb i').style.width = Math.max(0, ratio * 100) + '%';
    b.querySelector('.bp i').style.width = Math.min(100, Math.max(0, postura * 100)) + '%';
  };
  ui.faseHud = f => {
    const el = $('faseHud');
    if (!f) { el.hidden = true; return; }
    el.hidden = false;
    const keys = [0, 1, 2].map(i => '<span class="' + (i < f.keys ? 'on' : '') + '">🔑</span>').join('');
    const time = f.time != null ? Math.floor(f.time / 60) + ':' + String(Math.floor(f.time % 60)).padStart(2, '0') : '';
    const html = '<b>Fase ' + f.n + ' · ' + f.nome + '</b><div class="keys">' + keys + '<em>' + time + '</em></div><small>' + f.objetivo + '</small>';
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
  };
  ui.grupoHud = lista => {
    const el = $('grupoHud');
    if (!lista) { el.hidden = true; el._h = ''; return; }
    const html = '<b>⚔️ Grupo</b>' + lista.map(m => '<div class="gm' + (m.junto ? '' : ' longe') + '"><span>' + (m.lider ? '👑 ' : '') + m.nome.replace(/</g, '') + '</span><i style="width:' + Math.round(Math.max(0, m.hp) * 100) + '%"></i></div>').join('');
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.hidden = false;
  };
  ui.sheepHint = (text, time, heat) => {
    const el = $('sheepHud');
    if (!text) { el.hidden = true; return; }
    el.hidden = false; el.dataset.heat = heat;
    el.innerHTML = '<b>🐑 Ovelha perdida</b><small>' + text + '</small><em>' + Math.max(0, Math.ceil(time)) + 's</em>';
  };
  let interactLabel = null;
  ui.setInteract = label => {
    if (label === interactLabel) return; interactLabel = label;
    const b = $('aInteract'); b.hidden = !label; b.querySelector('span').textContent = label || '';
  };

  /* ---------- Guia da missão atual ---------- */
  ui.guide = (gd, q) => {
    const el = $('questHud');
    if ((!gd && !q) || config.esconderMissao) { el.hidden = true; el._h = ''; return; }
    let html = '';
    if (q) {
      const pct = q.st === 'pronta' ? 100 : Math.round(q.n / q.qtd * 100);
      html += '<b>📜 ' + q.titulo + '</b><small>' + (q.st === 'pronta' ? 'Pronta! Entregue para ' + q.giver + '.' : q.desc) + '</small>' +
        '<div class="qbar"><i style="width:' + pct + '%"></i><span>' + (q.st === 'pronta' ? 'Completa' : q.n + '/' + q.qtd) + '</span></div>';
    }
    if (gd) html += '<em>' + (gd.waypoint ? '' : '➤ ') + gd.label + ' · ' + gd.dist + ' m</em>';
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.hidden = false;
  };
  $('questHud').addEventListener('click', () => { if (!modals && game) game.scene === 'fase' ? ui.openMap() : ui.openMenu('missoes'); });

  // minimapa
  let mmSrc = null;
  ui.minimapSource = (src) => { mmSrc = src; $('minimap').hidden = !src; };
  ui.minimapDraw = g => {
    if (!mmSrc) return;
    const c = $('minimap'), x = c.getContext('2d'), W = c.width, H = c.height;
    const span = Math.min(70, mmSrc.width, mmSrc.height * W / H), spanY = span * H / W, px = g.p.x / TS, py = g.p.y / TS;
    const sx = clamp(px - span / 2, 0, mmSrc.width - span), sy = clamp(py - spanY / 2, 0, mmSrc.height - spanY);
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.imageSmoothingEnabled = false;
    x.drawImage(mmSrc, sx, sy, span, spanY, 0, 0, W, H);
    const k = W / span;
    const dot = (tx, ty, col, r = 3) => { x.fillStyle = col; x.beginPath(); x.arc((tx - sx) * k, (ty - sy) * k, r, 0, 7); x.fill(); };
    for (const n of g.npcs) dot(n.x / TS, n.y / TS, n.missao || n.minijogo || n.loja ? '#FFD23F' : '#FFFFFF', 2.2);
    for (const ch of g.chests || []) if (!ch.open) dot(ch.x / TS, ch.y / TS, '#C98A3A', 2.6);
    for (const o of g.others.values()) if ((o.sala || 'world') === g.salaAtual()) dot(o.x / TS, o.y / TS, '#5DADEC', 2.5);
    for (const e of g.enemies) if (e.kind === 'boss') dot(e.x / TS, e.y / TS, '#FF2E4A', 4);
    if (g.guide) {
      // destino: estrela (ou seta na borda do minimapa)
      const gx = clamp((g.guide.x / TS - sx) * k, 6, W - 6), gy = clamp((g.guide.y / TS - sy) * k, 6, H - 6);
      x.font = '13px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', gx, gy);
    }
    x.strokeStyle = '#000'; x.lineWidth = 1.5; dot(px, py, '#FF5A5F', 3.5); x.stroke();
  };
  $('minimap').addEventListener('click', () => { if (!modals && game) ui.openMap(); });

  /* ---------- Mapa completo ---------- */
  ui.openMap = () => modal((p, close) => {
    p.classList.add('map-panel');
    const g = game, src = mmSrc; if (!src) { close(); return; }
    const pois = g.pois();
    const fase = g.scene !== 'world'; // mapa local (fase ou salão), sem nomes de regiões
    const titulo = g.scene === 'fase' ? 'Mapa · Fase ' + g.fase.n + ': ' + g.fase.def.nome : g.scene === 'salao' ? 'Mapa · ' + g.hub.nome : 'Mapa do mundo';
    p.append(h('div', { class: 'p-head' }, h('h3', {}, titulo), h('button', { class: 'x', onclick: () => close(), 'aria-label': 'Fechar' }, '✕')));
    const cv = h('canvas', { class: 'world-map' });
    const info = h('div', { class: 'map-info' }, h('p', { class: 'hint' }, 'Toque num ícone ou num item da lista para ver os detalhes e marcar como destino.'));
    const list = h('div', { class: 'map-list' });
    p.append(h('div', { class: 'map-wrap' }, h('div', { class: 'map-left' }, cv, info), list));
    let sel = null;
    const S = 4; // pixels por tile no canvas
    cv.width = src.width * S; cv.height = src.height * S;
    const x = cv.getContext('2d');
    const draw = () => {
      x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, cv.width, cv.height);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (!fase) for (const [z, tx, ty] of ZONE_LABELS) {
        x.font = '900 22px Cinzel, serif'; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.6)'; x.fillStyle = 'rgba(255,246,227,.92)';
        x.strokeText(ZONES[z].nome, tx * S, ty * S); x.fillText(ZONES[z].nome, tx * S, ty * S);
      }
      for (const o of pois) {
        const px = o.x / TS * S, py = o.y / TS * S;
        if (o === sel) { x.strokeStyle = '#FFD23F'; x.lineWidth = 4; x.beginPath(); x.arc(px, py, 20, 0, 7); x.stroke(); }
        x.font = (fase ? 22 : 24) + 'px sans-serif'; x.fillText(o.icon, px, py);
      }
      for (const o of g.others.values()) { x.fillStyle = '#5DADEC'; x.beginPath(); x.arc(o.x / TS * S, o.y / TS * S, 6, 0, 7); x.fill(); }
      if (g.guide) { x.font = '26px sans-serif'; x.fillText('⭐', g.guide.x / TS * S, g.guide.y / TS * S - 22); }
      x.fillStyle = '#FF5A5F'; x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.arc(g.p.x / TS * S, g.p.y / TS * S, 9, 0, 7); x.fill(); x.stroke();
      x.font = '900 16px Nunito, sans-serif'; x.fillStyle = '#fff'; x.lineWidth = 4; x.strokeText('VOCÊ', g.p.x / TS * S, g.p.y / TS * S - 20); x.fillText('VOCÊ', g.p.x / TS * S, g.p.y / TS * S - 20);
    };
    const select = o => {
      sel = o; draw(); info.innerHTML = '';
      const dist = Math.round(Math.hypot(o.x - g.p.x, o.y - g.p.y) / TS);
      info.append(h('b', {}, o.icon + ' ' + o.nome), h('small', {}, o.tipo + ' · ' + dist + ' m de você'), h('p', {}, o.desc));
      if (!fase) {
        const wp = g.char.data.waypoint, marked = wp && wp.x === o.x && wp.y === o.y;
        info.append(h('div', { class: 'btn-row' }, marked
          ? h('button', { class: 'btn sm', onclick: () => { delete g.char.data.waypoint; g.mmT = 0; select(o); } }, 'Desmarcar destino')
          : h('button', { class: 'btn sm gold', onclick: () => { g.char.data.waypoint = { x: o.x, y: o.y, label: o.nome }; g.mmT = 0; sfx('click'); close(); ui.toast('Destino marcado: ' + o.nome + '. Siga a seta dourada!'); } }, '📍 Marcar como destino')));
      }
    };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * cv.width, my = (e.clientY - r.top) / r.height * cv.height;
      let best = null, bd = 40;
      for (const o of pois) { const d = Math.hypot(o.x / TS * S - mx, o.y / TS * S - my); if (d < bd) { bd = d; best = o; } }
      if (best) select(best);
    });
    const groups = {};
    for (const o of pois) (groups[o.tipo] = groups[o.tipo] || []).push(o);
    for (const k in groups) {
      list.append(h('h4', {}, k));
      for (const o of groups[k]) list.append(h('button', { class: 'map-item', onclick: () => select(o) }, h('span', {}, o.icon), o.nome));
    }
    draw();
  }, { wide: true });

  /* ---------- Chat ---------- */
  ui.chatAdd = (name, text, me, cla) => {
    const log = $('chatLog');
    log.append(h('div', { class: (me ? 'me' : '') + (cla ? ' cla' : '') }, h('b', {}, name + ': '), text));
    while (log.children.length > 40) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
    $('chat').classList.add('fresh'); clearTimeout(ui._chatT); ui._chatT = setTimeout(() => $('chat').classList.remove('fresh'), 6000);
  };
  const chatIn = $('chatIn');
  chatIn.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { game?.chat(chatIn.value); chatIn.value = ''; chatIn.blur(); }
    if (e.key === 'Escape') chatIn.blur();
  });
  $('chatToggle').addEventListener('click', () => { $('chat').classList.toggle('open'); if ($('chat').classList.contains('open')) chatIn.focus(); });

  /* ---------- Tela de controles (PC e celular) ---------- */
  // o aparelho atual aparece primeiro e marcado
  ui.controles = () => modal((p, close) => {
    p.classList.add('controles');
    const sk = game ? CLASSES[game.char.cls].skill.nome : 'Especial da classe', toque = input.touch;
    const k = t => h('kbd', {}, t);
    const linha = (teclas, txt) => h('div', { class: 'ctl' }, h('span', { class: 'ctl-k' }, ...teclas), h('span', {}, txt));
    const pc = h('div', { class: 'ctl-card' + (toque ? '' : ' atual') }, h('h4', {}, '💻 Computador', toque ? '' : h('em', {}, 'você está aqui')),
      linha([k('W'), k('A'), k('S'), k('D')], 'andar (ou as setas)'),
      linha([k('🖱 mover')], 'mirar'),
      linha([k('Clique'), k('J')], 'atacar (cliques seguidos fazem o combo; cada golpe gasta fôlego)'),
      linha([k('Segurar clique')], 'carregar um GOLPE FORTE (quebra a postura)'),
      linha([k('T'), k('Botão do meio')], 'travar / soltar o alvo'),
      linha([k('Botão direito'), k('K')], 'especial: ' + sk),
      linha([k('Espaço')], 'esquiva (invencível por um instante)'),
      linha([k('Shift')], 'segurar: defender (precisa de escudo equipado)'),
      linha([k('E')], 'falar, abrir baú, pescar, entrar'),
      linha([k('1'), k('2'), k('Q')], 'usar os itens dos atalhos'),
      linha([k('R')], 'montar / descer (burrinho ou cavalo)'),
      linha([k('M'), k('I')], 'mapa · menu'),
      linha([k('Enter')], 'chat (/c fala com o clã)'));
    const cel = h('div', { class: 'ctl-card' + (toque ? ' atual' : '') }, h('h4', {}, '📱 Celular (deitado)', toque ? h('em', {}, 'você está aqui') : ''),
      linha([h('span', { class: 'ctl-i' }, '🕹')], 'arraste o dedo no lado esquerdo da tela para andar'),
      linha([h('span', { class: 'ctl-i gold' }, '⚔')], 'tocar: atacar · segurar: golpe forte'),
      linha([h('span', { class: 'ctl-i' }, '🎯')], 'travar o alvo mais perto'),
      linha([h('span', { class: 'ctl-i' }, '✦')], 'especial: ' + sk),
      linha([h('span', { class: 'ctl-i' }, '💨')], 'esquiva'),
      linha([h('span', { class: 'ctl-i' }, '🛡')], 'segurar: defender (precisa de escudo)'),
      linha([h('span', { class: 'ctl-i' }, '🍞'), h('span', { class: 'ctl-i' }, '✨')], 'atalhos de itens'),
      linha([h('span', { class: 'ctl-i' }, '🐎')], 'montar (aparece com montaria)'),
      linha([h('span', { class: 'ctl-pill' }, 'Falar')], 'botão dourado: falar, abrir, pescar'),
      linha([h('span', { class: 'ctl-i' }, '🗺'), h('span', { class: 'ctl-i' }, '☰')], 'mapa · menu (no canto de cima)'));
    const pd = h('div', { class: 'ctl-card' + (document.body.classList.contains('pad') ? ' atual' : '') }, h('h4', {}, '🎮 Controle', document.body.classList.contains('pad') ? h('em', {}, 'você está aqui') : ''),
      linha([k('Analógico esq.')], 'andar'), linha([k('Analógico dir.')], 'mirar'),
      linha([k('RB / R1')], 'atacar (segurar: golpe forte)'), linha([k('RT / R2')], 'especial: ' + sk),
      linha([k('LB / L1')], 'defender (no tempo certo: defesa perfeita)'), linha([k('B / ◯')], 'esquiva'),
      linha([k('A / ✕')], 'falar, abrir, pescar, entrar'), linha([k('X / □')], 'beber da Botija da Viúva'),
      linha([k('LT / L2'), k('R3')], 'travar / soltar o alvo'), linha([k('Y / △')], 'montar'),
      linha([k('◀'), k('▶')], 'atalhos de itens'), linha([k('Start'), k('Select / ▲')], 'menu · mapa'),
      linha([k('Nos menus')], 'direcional escolhe · A confirma · B volta'));
    p.append(h('div', { class: 'p-head' }, h('h3', {}, '🎮 Como jogar'), h('button', { class: 'x', onclick: () => close(), 'aria-label': 'Fechar' }, '✕')),
      h('div', { class: 'ctl-grid' }, ...(document.body.classList.contains('pad') ? [pd, pc, cel] : toque ? [cel, pc, pd] : [pc, cel, pd])),
      h('p', { class: 'hint' }, 'Dica: logo ao levantar o escudo vem a DEFESA PERFEITA — atordoa o inimigo e devolve projéteis. Veja esta tela de novo em ☰ › Ajuda.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close() }, 'Entendi, vamos jogar!')));
  }, { wide: true });

  /* ---------- Diálogo ---------- */
  ui.dialog = ({ nome, look, texto, acoes }) => modal((p, close) => {
    p.classList.add('dialog');
    const head = h('div', { class: 'dlg-head' }, look !== undefined ? portrait(look) : '', h('h3', {}, nome));
    p.append(head, h('p', { class: 'dlg-text' }, texto));
    const row = h('div', { class: 'btn-row' });
    (acoes && acoes.length ? acoes : [{ label: 'Ok' }]).forEach((a, i) => row.append(h('button', { class: 'btn' + (i === 0 ? ' gold' : ''), onclick: () => { sfx('click'); close(a.label); a.fn && setTimeout(a.fn, 30); } }, a.label)));
    p.append(row);
  });

  /* ---------- Caixa de texto (livro de visitas) ---------- */
  ui.pergunta = (titulo, texto, ph = '') => modal((p, close) => {
    const inp = h('input', { maxlength: 120, placeholder: ph });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') close(inp.value.trim()); if (e.key === 'Escape') close(''); });
    p.append(h('h3', {}, titulo), h('p', { class: 'muted', style: 'margin:8px 0' }, texto), inp,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close(inp.value.trim()) }, 'Enviar'), h('button', { class: 'btn', onclick: () => close('') }, 'Cancelar')));
    setTimeout(() => inp.focus(), 50);
  }, { dismissValue: '' });

  /* ---------- Quiz ---------- */
  ui.quiz = (q, title) => modal((p, close) => {
    p.classList.add('quiz'); p.parentElement.classList.add('locked');
    const right = q.a[0];
    p.append(h('small', { class: 'eyebrow' }, title || 'Quiz bíblico'), h('h3', {}, q.q));
    const box = h('div', { class: 'answers' });
    shuffle(q.a.slice()).forEach(a => box.append(h('button', {
      class: 'btn answer', onclick: e => {
        const ok = a === right; box.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.textContent === right) b.classList.add('right'); });
        if (!ok) e.currentTarget.classList.add('wrong');
        sfx(ok ? 'right' : 'wrong');
        p.append(h('p', { class: 'feedback ' + (ok ? 'ok' : 'no') }, ok ? 'Certo! Você ganhou uma chave.' : 'Não foi dessa vez. A resposta certa era: ' + right + '. O baú vai trancar por alguns segundos.'));
        // explicação: por que a resposta certa é a certa (fica até o jogador continuar)
        if (q.porque) {
          p.append(h('div', { class: 'porque' }, h('b', {}, '📖 Por quê?'), h('p', {}, q.porque)),
            h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close(ok) }, 'Continuar')));
          p.querySelector('.porque + .btn-row button')?.focus();
        } else setTimeout(() => close(ok), ok ? 900 : 1500);
      }
    }, a)));
    p.append(box);
  }, { dismiss: false });

  /* ---------- Batalha de versículos (Satanás) ---------- */
  ui.verseBattle = (acc, falsas) => modal((p, close) => {
    p.classList.add('verse'); p.parentElement.classList.add('locked');
    p.append(h('small', { class: 'eyebrow red' }, 'O ACUSADOR FALA:'), h('h3', { class: 'lie' }, '“' + acc.lie + '”'), h('p', {}, 'Responda com a Palavra de Deus:'));
    const box = h('div', { class: 'answers' });
    const opts = shuffle([{ t: acc.v, ref: acc.ref, ok: true }, ...falsas.map(f => ({ t: f, ok: false }))]);
    opts.forEach(o => box.append(h('button', {
      class: 'btn answer', onclick: e => {
        box.querySelectorAll('button').forEach(b => b.disabled = true);
        e.currentTarget.classList.add(o.ok ? 'right' : 'wrong');
        p.append(h('p', { class: 'feedback ' + (o.ok ? 'ok' : 'no') }, o.ok ? 'Está escrito! (' + acc.ref + ')' : 'Isso não está na Bíblia! A resposta era: "' + acc.v + '" (' + acc.ref + ')'));
        setTimeout(() => close(o.ok), o.ok ? 1100 : 2400);
      }
    }, o.t)));
    p.append(box);
  }, { dismiss: false });

  /* ---------- Morte ---------- */
  ui.dead = ({ titulo, texto, acoes }) => modal((p, close) => {
    p.classList.add('dead'); p.parentElement.classList.add('locked');
    p.append(h('h2', {}, titulo), h('p', {}, texto));
    const row = h('div', { class: 'btn-row' });
    acoes.forEach((a, i) => row.append(h('button', { class: 'btn' + (i === 0 ? ' gold' : ''), onclick: () => { close(); a.fn(); } }, a.label)));
    p.append(row);
  }, { dismiss: false });

  /* ---------- Fase concluída ---------- */
  ui.faseComplete = d => modal((p, close) => {
    p.classList.add('victory'); p.parentElement.classList.add('locked');
    const mm = Math.floor(d.secs / 60) + ':' + String(d.secs % 60).padStart(2, '0');
    p.append(h('small', { class: 'eyebrow' }, 'FASE ' + d.fase.n + ' CONCLUÍDA'), h('h2', {}, d.fase.nome),
      h('blockquote', {}, '“' + d.fase.versiculo.texto + '”', h('cite', {}, d.fase.versiculo.ref)),
      h('p', { class: 'lesson' }, d.fase.licao),
      h('div', { class: 'stats' },
        h('div', {}, h('b', {}, mm), h('small', {}, 'tempo')), h('div', {}, h('b', {}, d.ok + '/' + (d.ok + d.err)), h('small', {}, 'quiz')),
        h('div', {}, h('b', {}, d.kills), h('small', {}, 'vícios')), h('div', {}, h('b', {}, '+' + fmt(d.pts)), h('small', {}, 'pontos'))),
      h('p', { class: 'rewards' }, '+' + d.xp + ' XP · +' + d.gold + ' denários' + (d.first ? '' : ' · (replay: 30% dos pontos)')));
    if (d.item) p.append(h('div', { class: 'loot' }, h('span', { class: 'big' }, ITEMS[d.item].icon), h('div', {}, h('b', { style: 'color:' + itemCor(d.item) }, ITEMS[d.item].nome), h('small', {}, ITEMS[d.item].desc))));
    if (d.semana) p.append(h('div', { class: 'loot legendary' }, h('span', { class: 'big' }, ITEMS[d.semana].icon), h('div', {}, h('b', {}, 'SEMANA COMPLETA! ' + ITEMS[d.semana].nome), h('small', {}, ITEMS[d.semana].desc))));
    if (d.semPremio) p.append(h('p', { class: 'hint' }, 'O prêmio ' + ITEMS[d.fase.recompensa].icon + ' ' + ITEMS[d.fase.recompensa].nome + ' não caiu desta vez. Jogue de novo: ele pode sair nos baús do tesouro ou no fim da fase!'));
    if (d.item || d.semana) p.append(h('p', { class: 'hint' }, 'Equipe no menu ☰ › Personagem.'));
    p.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn gold', onclick: () => close() }, 'Voltar ao mundo')));
  }, { dismiss: false });

  /* ---------- Loja ---------- */
  ui.shop = id => {
    const L = LOJAS[id], c = game.char;
    return modal((p, close) => {
      p.classList.add('shop');
      let tab = 'comprar', cat = 'todas';
      const render = () => {
        p.innerHTML = '';
        p.append(h('div', { class: 'p-head' }, h('h3', {}, L.nome), h('span', { class: 'chip' }, '🪙 ' + fmt(c.data.gold)), h('button', { class: 'x', onclick: () => close(), 'aria-label': 'Fechar' }, '✕')));
        p.append(h('div', { class: 'tabs' }, ['comprar', 'vender'].map(t => h('button', { class: 'tab' + (t === tab ? ' on' : ''), onclick: () => { tab = t; render(); } }, t === 'comprar' ? 'Comprar' : 'Vender'))));
        const list = h('div', { class: 'item-list' });
        // ids da aba atual, agrupados por categoria, com filtro em fichas
        const idsAba = tab === 'comprar' ? L.itens.filter(iid => { const it = ITEMS[iid]; return !it.classe || it.classe === c.cls || it.classe === 'todas'; })
          : Object.keys(c.data.inv).filter(i => ITEMS[i] && ITEMS[i].preco && !['lendario', 'secreto'].includes(ITEMS[i].raridade));
        const grupos = porCategoria(idsAba);
        if (!grupos.some(g => g.k === cat)) cat = 'todas';
        if (grupos.length > 1) p.append(h('div', { class: 'cat-chips' }, [{ k: 'todas', nome: 'Tudo', ico: '📦', ids: idsAba }, ...grupos].map(g => h('button', { class: 'chip-btn' + (g.k === cat ? ' on' : ''), onclick: () => { cat = g.k; render(); } }, g.ico + ' ' + g.nome + ' (' + g.ids.length + ')'))));
        const secoes = grupos.filter(g => cat === 'todas' || g.k === cat);
        const secao = g => list.append(h('h4', { class: 'cat-head' }, g.ico + ' ' + g.nome));
        if (tab === 'comprar') {
          for (const g of secoes) for (const [i, iid] of g.ids.entries()) {
            if (!i) secao(g);
            const it = ITEMS[iid];
            const lock = it.nivel && c.level < it.nivel, poor = c.data.gold < it.preco;
            list.append(row(iid, h('button', { class: 'btn sm gold', disabled: lock || poor, onclick: () => {
              c.data.gold -= it.preco; addItem(c, iid); sfx('coin'); ui.toast('Comprou ' + it.icon + ' ' + it.nome);
              if (it.slot && !c.data.eq[it.slot] && !canEquip(c, iid)) { equip(c, iid); game.refreshStats(); }
              game.save(); render();
            } }, lock ? 'Nv ' + it.nivel : '🪙 ' + it.preco), 0, true));
          }
        } else {
          if (!idsAba.length) list.append(h('p', { class: 'empty' }, 'Nada para vender.'));
          for (const g of secoes) for (const [i, iid] of g.ids.entries()) {
            if (!i) secao(g);
            const val = Math.max(1, Math.floor(ITEMS[iid].preco * 0.4));
            list.append(row(iid, h('button', { class: 'btn sm', onclick: () => { removeItem(c, iid); c.data.gold += val; sfx('coin'); game.save(); render(); } }, 'Vender 🪙' + val), count(c, iid), false));
          }
        }
        p.append(list);
      };
      render();
    }, { wide: true });
  };
  // Atributos do item em "fichas". Para equipamento, compara com o que está equipado no mesmo lugar.
  function statChips(iid, comparar = true) {
    const it = ITEMS[iid], c = game.char, wrap = h('div', { class: 'stat-chips' });
    if (!it.slot) { for (const [ico, t] of efeitos(it)) wrap.append(h('span', { class: 'sc' }, ico + ' ' + t)); return wrap; }
    const eqId = c.data.eq[it.slot], eq = comparar && eqId && eqId !== iid ? ITEMS[eqId] : null;
    let melhor = 0, pior = 0;
    for (const s of STATS) {
      const v = statVal(it, s), old = eq ? statVal(eq, s) : 0;
      if (!v && !old) continue;
      const d = eq || (comparar && !eqId) ? v - old : 0;
      if (d > 0) melhor++; else if (d < 0) pior++;
      wrap.append(h('span', { class: 'sc' + (d > 0 ? ' up' : d < 0 ? ' down' : ''), title: s.nome },
        s.ico + ' ' + (v ? (s.pct ? v + '%' : '+' + v) : '0'), d ? h('em', {}, (d > 0 ? '▲' : '▼') + Math.abs(d) + (s.pct ? '%' : '')) : ''));
    }
    if (eqId === iid) wrap.append(h('span', { class: 'sc tag' }, '✓ equipado'));
    else if (comparar && (eq || !eqId)) wrap.append(h('span', { class: 'sc tag ' + (melhor && !pior ? 'up' : pior && !melhor ? 'down' : '') },
      !eqId ? 'lugar vazio: ' + SLOT_NOMES[it.slot] : melhor && !pior ? 'melhor que ' + eq.icon + ' ' + eq.nome : pior && !melhor ? 'pior que ' + eq.icon + ' ' + eq.nome : 'troca com ' + eq.icon + ' ' + eq.nome));
    return wrap;
  }
  function requisito(it) {
    const c = game.char, r = [];
    if (it.nivel) r.push(h('span', { class: c.level >= it.nivel ? 'ok' : 'no' }, 'nível ' + it.nivel));
    if (it.classe && it.classe !== 'todas') r.push(h('span', { class: it.classe === c.cls ? 'ok' : 'no' }, CLASSES[it.classe].nome));
    return r.length ? h('small', { class: 'req' }, 'Requer: ', ...r.flatMap((x, i) => i ? [' · ', x] : [x])) : '';
  }
  function row(iid, action, qty, comparar) {
    const it = ITEMS[iid];
    return h('div', { class: 'item-row' },
      h('span', { class: 'ico', style: '--c:' + itemCor(iid) }, it.icon),
      h('div', { class: 'info' }, h('b', { style: 'color:' + itemCor(iid) }, it.nome + (qty > 1 ? ' x' + qty : ''), h('small', { class: 'rar' }, ' · ' + RARIDADE[it.raridade || 'comum'].nome + (it.slot ? ' · ' + SLOT_NOMES[it.slot] : ''))),
        statChips(iid, comparar), requisito(it), h('small', { class: 'desc' }, it.desc)),
      action);
  }

  /* ---------- Menu principal ---------- */
  ui.openMenu = (tab = 'personagem') => modal((p, close) => {
    p.classList.add('menu');
    const c = game.char;
    const tabs = [['personagem', '🎒', 'Personagem'], ['missoes', '📜', 'Missões'], ['biblia', '📖', 'Bíblia'], ['social', '👥', 'Social'], ['ranking', '🏆', 'Ranking'], ['ajustes', '⚙️', 'Ajustes'], ['ajuda', '❔', 'Ajuda']];
    const render = () => {
      p.innerHTML = '';
      // trilho de abas à esquerda (medalhões) + conteúdo
      const rail = h('nav', { class: 'rail' }, tabs.map(([k, ico, l]) => h('button', { class: 'rail-btn' + (k === tab ? ' on' : ''), title: l, 'aria-label': l, onclick: () => { sfx('click'); tab = k; render(); } },
        h('span', { class: 'ri' }, ico), h('small', {}, l), k === 'social' && game.social.pedidos ? h('em', {}, game.social.pedidos) : '')));
      const label = tabs.find(t => t[0] === tab)[2];
      const main = h('div', { class: 'menu-main' }, h('div', { class: 'p-head' },
        h('div', { class: 'menu-title' }, h('h3', {}, label), h('small', {}, c.name + ' · ' + CLASSES[c.cls].nome + ' · nível ' + c.level)),
        h('button', { class: 'x', onclick: () => close(), 'aria-label': 'Fechar' }, '✕')));
      const body = h('div', { class: 'tab-body' }); main.append(body);
      p.append(h('div', { class: 'menu-layout' }, rail, main));
      ({ personagem: tabChar, missoes: tabQuests, biblia: tabBible, social: tabSocial, ranking: tabRanking, ajustes: tabConfig, ajuda: tabHelp })[tab](body, render, close);
    };
    render();
  }, { wide: true });

  /* ---------- Amigos e clãs ---------- */
  // Cartão de outro jogador (ao chegar perto dele no mapa)
  ui.playerCard = o => modal((p, close) => {
    const amigo = game.social.friends.has(o.id);
    p.append(h('div', { class: 'dlg-head' }, portrait(o.look || {}), h('div', {}, h('h3', {}, (o.cla ? '[' + o.cla + '] ' : '') + o.name), h('small', { class: 'muted' }, (CLASSES[o.cls]?.nome || '') + ' · nível ' + (o.lvl || '?') + (amigo ? ' · 💚 amigo' : '')))));
    const msg = h('p', { class: 'form-msg' });
    const row = h('div', { class: 'btn-row' });
    if (!amigo) row.append(h('button', { class: 'btn gold', onclick: async e => {
      e.currentTarget.disabled = true;
      try { await net.social.addFriend(game.char, o.id); msg.className = 'form-msg ok'; msg.textContent = 'Pedido de amizade enviado!'; sfx('right'); game.refreshSocial(); }
      catch (err) { msg.className = 'form-msg err'; msg.textContent = err.message; }
    } }, '💚 Pedir amizade'));
    row.append(h('button', { class: 'btn', onclick: () => close() }, 'Fechar'));
    p.append(msg, row);
  });

  async function tabSocial(body, render) {
    const me = game.char, S = net.social;
    if (!ONLINE) body.append(h('p', { class: 'muted' }, 'Modo offline: amigos e clãs funcionam entre os personagens deste aparelho. Com o Supabase ligado, valem para o mundo todo.'));
    const wrap = h('div', { class: 'social' }), colA = h('div', { class: 'soc-col' }), colB = h('div', { class: 'soc-col' });
    wrap.append(colA, colB); body.append(wrap);
    const err = (box, e) => { box.append(h('p', { class: 'form-msg err' }, e.message)); };
    const act = (fn) => async e => { const b = e.currentTarget; b.disabled = true; try { await fn(); sfx('click'); await game.refreshSocial(); render(); } catch (x) { ui.toast(x.message); b.disabled = false; } };

    // --- Grupo para as dungeons ---
    const gb = h('div', { class: 'quest-focus' });
    const g = game.grupo;
    gb.append(h('small', { class: 'eyebrow' }, '⚔️ GRUPO PARA AS DUNGEONS'));
    if (!game.net) gb.append(h('p', {}, 'O grupo funciona online (com o Supabase ligado).'));
    else {
      gb.append(h('p', {}, g && g.membros.length > 1 ? g.membros.map(m => (String(m.id) === String(g.lider) ? '👑 ' : '• ') + m.name).join('  ') : 'Chame até 3 amigos ou gente do clã que estejam online. Quando o líder entra numa fase, todos lutam juntos.'));
      const lista = h('div', { class: 'btn-row', style: 'justify-content:flex-start' }, h('small', { class: 'muted' }, 'Procurando quem está online…'));
      gb.append(lista);
      game.candidatosGrupo().then(cs => {
        lista.innerHTML = '';
        if (!g || game.souLider()) for (const c of cs) lista.append(h('button', { class: 'btn sm gold', onclick: () => { game.convidar(c.id, c.name); render(); } }, '+ ' + c.name));
        if (!cs.length && (!g || game.souLider())) lista.append(h('small', { class: 'muted' }, 'Nenhum amigo ou membro do clã online agora.'));
        if (g) lista.append(h('button', { class: 'btn sm danger', onclick: () => { game.sairGrupo(); render(); } }, game.souLider() ? 'Desfazer grupo' : 'Sair do grupo'));
      });
    }
    body.prepend(gb);

    // --- Amigos ---
    colA.append(h('h4', {}, '💚 Amigos'));
    const online = new Set(game.net?.online?.() || []);
    const fl = h('div', { class: 'fase-list' }, h('p', { class: 'empty' }, 'Carregando…'));
    colA.append(fl);
    S.friends(me).then(list => {
      fl.innerHTML = '';
      if (!list.length) fl.append(h('p', { class: 'empty' }, 'Nenhum amigo ainda. Procure pelo nome abaixo ou chegue perto de outro jogador no mapa. "Em todo tempo ama o amigo" (Pv 17:17).'));
      const ord = { recebido: 0, amigo: 1, enviado: 2 };
      for (const f of list.sort((a, b) => ord[a.st] - ord[b.st])) {
        const on = online.has(f.id);
        const btns = f.st === 'recebido'
          ? [h('button', { class: 'btn sm gold', onclick: act(() => S.acceptFriend(f.fid)) }, 'Aceitar'), h('button', { class: 'btn sm', onclick: act(() => S.removeFriend(f.fid)) }, 'Recusar')]
          : [h('button', { class: 'btn sm', title: f.st === 'amigo' ? 'Desfazer amizade' : 'Cancelar pedido', onclick: act(() => S.removeFriend(f.fid)) }, '✕')];
        fl.append(h('div', { class: 'fase-row' + (f.st === 'amigo' ? ' done' : '') }, h('span', { class: 'num', title: on ? 'Online' : 'Offline' }, f.st === 'amigo' ? (on ? '🟢' : '⚪') : f.st === 'recebido' ? '📩' : '⏳'),
          h('div', {}, h('b', {}, f.name), h('small', {}, (CLASSES[f.cls]?.nome || '') + (f.level ? ' · nv ' + f.level : '') + ' · ' + (f.st === 'amigo' ? (on ? 'online agora' : 'offline') : f.st === 'recebido' ? 'quer ser seu amigo' : 'pedido enviado'))), ...btns));
      }
    }).catch(e => { fl.innerHTML = ''; err(fl, e); });
    const q = h('input', { placeholder: 'Procurar jogador pelo nome…', maxlength: 16 });
    const res = h('div', { class: 'fase-list' });
    let qt;
    q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(async () => {
      res.innerHTML = '';
      try {
        const r = await S.search(me, q.value);
        if (q.value.trim().length >= 2 && !r.length) res.append(h('p', { class: 'empty' }, 'Ninguém com esse nome.'));
        for (const x of r) res.append(h('div', { class: 'fase-row' }, h('div', {}, h('b', {}, x.name), h('small', {}, (CLASSES[x.cls]?.nome || '') + ' · nv ' + x.level)),
          h('button', { class: 'btn sm gold', onclick: act(() => S.addFriend(me, x.id)) }, '+ Amigo')));
      } catch (e) { err(res, e); }
    }, 300); });
    q.addEventListener('keydown', e => e.stopPropagation());
    colA.append(h('label', { class: 'soc-search' }, q), res);

    // --- Clã ---
    colB.append(h('h4', {}, '🛡 Clã'));
    const cb = h('div', {}, h('p', { class: 'empty' }, 'Carregando…'));
    colB.append(cb);
    try {
      const mine = await S.myClan(me);
      cb.innerHTML = '';
      if (mine) {
        const { clan, members } = mine, lider = clan.owner === me.id;
        cb.append(h('div', { class: 'quest-focus' }, h('small', { class: 'eyebrow' }, 'SEU CLÃ'), h('b', {}, '[' + clan.tag + '] ' + clan.name), clan.lema ? h('p', {}, '“' + clan.lema + '”') : '',
          h('small', {}, members.length + '/30 membros · ⭐ ' + fmt(members.reduce((t, m) => t + (m.score || 0), 0)) + ' pontos juntos'),
          h('small', {}, '🏛 Casa do clã: nível ' + (clan.casa_nivel || 0) + ' · 💰 tesouro ' + fmt(clan.tesouro || 0) + ' (fale com Áquila, na cidade, para entrar)'),
          h('small', { class: 'where' }, '💬 Para falar só com o clã, escreva no chat: /c sua mensagem')));
        const ml = h('div', { class: 'fase-list' });
        for (const m of members) ml.append(h('div', { class: 'fase-row' }, h('span', { class: 'num' }, m.role === 'lider' ? '👑' : online.has(m.id) ? '🟢' : '⚪'),
          h('div', {}, h('b', {}, m.name), h('small', {}, (CLASSES[m.cls]?.nome || '') + ' · nv ' + (m.level || '?') + ' · ⭐ ' + fmt(m.score || 0))),
          lider && m.id !== me.id ? h('button', { class: 'btn sm', title: 'Remover do clã', onclick: act(() => S.leaveClan(me, clan, m.id)) }, '✕') : ''));
        cb.append(ml, h('div', { class: 'btn-row' }, h('button', { class: 'btn sm danger', onclick: e => {
          if (lider && !confirm('Você é o líder. Se sair, o clã acaba para todos. Continuar?')) return;
          act(() => S.leaveClan(me, clan))(e);
        } }, lider ? 'Desfazer clã' : 'Sair do clã')));
      } else {
        const nome = h('input', { placeholder: 'Nome do clã', maxlength: 20 }), tag = h('input', { placeholder: 'Sigla (ex: LUZ)', maxlength: 4, style: 'text-transform:uppercase' }), lema = h('input', { placeholder: 'Lema (opcional) — ex: Sede fortes no Senhor', maxlength: 80 });
        [nome, tag, lema].forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
        const m2 = h('p', { class: 'form-msg' });
        cb.append(h('p', { class: 'muted' }, 'Junte-se a um clã para jogar com amigos, conversar no chat do clã e somar pontos no ranking de clãs. "Melhor é serem dois do que um" (Ec 4:9).'),
          h('div', { class: 'soc-form' }, nome, tag, lema, h('button', { class: 'btn gold', onclick: async e => {
            const b = e.currentTarget; b.disabled = true;
            try { await S.createClan(me, nome.value, tag.value, lema.value); sfx('level'); await game.refreshSocial(); render(); }
            catch (x) { m2.className = 'form-msg err'; m2.textContent = x.message; b.disabled = false; }
          } }, 'Fundar clã')), m2);
      }
      colB.append(h('h4', {}, '🏆 Clãs do mundo'));
      const cl = h('ol', { class: 'rank' });
      const all = await S.clans();
      if (!all.length) cl.append(h('li', { class: 'muted' }, 'Nenhum clã ainda. Funde o primeiro!'));
      all.forEach((c, i) => cl.append(h('li', { class: c.id === mine?.clan.id ? 'me' : '' }, h('span', { class: 'pos' }, i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1), h('b', {}, '[' + c.tag + '] ' + c.name), h('small', {}, c.membros + ' membros'), h('em', {}, fmt(c.score)),
        !mine && c.membros < 30 ? h('button', { class: 'btn sm', onclick: act(() => S.joinClan(me, c.id)) }, 'Entrar') : '')));
      colB.append(cl);
    } catch (e) { cb.innerHTML = ''; err(cb, e); }
  }

  // Personagem: equipamento e atributos à esquerda, bolsa (grade de espaços) no meio, detalhe do item à direita.
  // A seleção e o filtro da bolsa ficam guardados entre um redesenho e outro.
  const SLOT_ICONE = { arma: '⚔️', escudo: '🛡️', cabeca: '⛑️', corpo: '🥋', cinto: '🎗️', pes: '🥾', reliquia: '💍', pet: '🐾' };
  let invSel = null, invFiltro = 'todas';
  function tabChar(body, render) {
    const c = game.char, st = computeStats(c);
    const popup = document.body.classList.contains('narrow'); // tela estreita: o detalhe abre por cima
    if (invSel && !(invSel.eq ? c.data.eq[invSel.slot] === invSel.id : c.data.inv[invSel.id])) invSel = null;

    // --- esquerda: retrato, equipamento e atributos ---
    const side = h('div', { class: 'inv-side' });
    const cv = h('canvas', { width: 392, height: 300, class: 'char-preview' });
    const g = cv.getContext('2d'); g.scale(2, 2);
    drawPerson(g, 98, 110, 2.35, c.look, { t: 0, fx: 0, fy: 1, ...game.equipLook(c.data.eq) });
    const equipGrid = h('div', { class: 'equip' });
    for (const s of SLOTS) {
      const id = c.data.eq[s], on = invSel?.eq && invSel.slot === s;
      equipGrid.append(h('button', { class: 'slot' + (id ? ' has' : '') + (on ? ' sel' : ''), style: id ? '--c:' + itemCor(id) : '', title: id ? ITEMS[id].nome : SLOT_NOMES[s] + ' (vazio)',
        onclick: () => { if (!id) return; sfx('click'); invSel = { id, eq: true, slot: s }; popup ? detail() : render(); } },
        h('span', {}, id ? ITEMS[id].icon : SLOT_ICONE[s]), h('small', {}, SLOT_NOMES[s])));
    }
    side.append(cv, equipGrid, h('div', { class: 'statgrid' },
      ...[['❤ Vida', st.maxHp], ['✨ Fé', st.maxFe], ['⚔ Ataque', st.atk], ['🛡 Defesa', st.def], ['👟 Veloc.', st.spd], ['🔰 Bloqueio', Math.round(st.block * 100) + '%']]
        .map(([k, v]) => h('div', {}, h('small', {}, k), h('b', {}, v)))));
    if (st.armaduraCompleta) side.append(h('p', { class: 'set-bonus' }, '✦ Armadura de Deus completa: +15% em tudo! (Ef 6:13)'));

    // --- meio: bolsa com filtros por categoria ---
    const ids = Object.keys(c.data.inv).filter(i => ITEMS[i]);
    const grupos = porCategoria(ids);
    if (invFiltro !== 'todas' && !grupos.some(gr => gr.k === invFiltro)) invFiltro = 'todas';
    const filtros = [{ k: 'todas', nome: 'Tudo', ico: '♾️' }, ...grupos];
    const shown = invFiltro === 'todas' ? grupos.flatMap(gr => gr.ids) : grupos.find(gr => gr.k === invFiltro).ids;
    if (!invSel && !popup && shown.length) invSel = { id: shown[0], eq: false }; // o painel da direita nunca começa vazio
    const bag = h('div', { class: 'bag' });
    for (const id of shown) {
      const on = invSel && !invSel.eq && invSel.id === id;
      bag.append(h('button', { class: 'cell' + (on ? ' sel' : ''), style: '--c:' + itemCor(id), title: ITEMS[id].nome,
        onclick: () => { sfx('click'); invSel = { id, eq: false }; popup ? detail() : render(); } },
        h('span', {}, ITEMS[id].icon), c.data.inv[id] > 1 ? h('em', {}, 'x' + c.data.inv[id]) : ''));
    }
    // completa a grade com espaços vazios (no mínimo 4 fileiras)
    const vazios = Math.max(20, Math.ceil((shown.length + 1) / 5) * 5) - shown.length;
    for (let i = 0; i < vazios; i++) bag.append(h('div', { class: 'cell vazio' }));
    const center = h('div', { class: 'inv-center' },
      h('div', { class: 'bag-head' }, h('h4', {}, 'Bolsa · ' + (filtros.find(f => f.k === invFiltro)?.nome || 'Tudo')), h('small', {}, ids.length + ' tipos de item')),
      h('div', { class: 'bag-tabs' }, filtros.map(f => h('button', { class: f.k === invFiltro ? 'on' : '', title: f.nome, 'aria-label': f.nome, onclick: () => { sfx('click'); invFiltro = f.k; render(); } }, f.ico))),
      bag,
      h('div', { class: 'bag-foot' }, h('span', { class: 'chip' }, '🪙 ', h('b', {}, fmt(c.data.gold)), ' denários'),
        c.data.eq.pet ? h('button', { class: 'btn sm', onclick: () => { unequip(c, 'pet'); game.refreshStats(); sfx('click'); game.save(); render(); } }, '🐾 Guardar ' + ITEMS[c.data.eq.pet].nome) : ''));

    const right = h('div', { class: 'inv-detail' });
    body.append(h('div', { class: 'inv-layout' }, side, center, right));
    if (!popup) fill(right, () => {});

    // painel de detalhe: arte grande, nome, atributos, descrição e ações
    function fill(box, fechar) {
      box.innerHTML = '';
      if (!invSel) { box.append(h('p', { class: 'det-empty' }, 'Escolha um item da bolsa ou do equipamento para ver os detalhes.')); return; }
      const { id, eq } = invSel, it = ITEMS[id];
      const feito = () => { fechar(); render(); };
      box.append(h('div', { class: 'det-art', style: '--c:' + itemCor(id) }, h('span', {}, it.icon)),
        h('h3', { style: 'color:' + itemCor(id) }, it.nome),
        h('small', { class: 'rar' }, RARIDADE[it.raridade || 'comum'].nome + (it.slot ? ' · ' + SLOT_NOMES[it.slot] : '') + (!eq && c.data.inv[id] > 1 ? ' · x' + c.data.inv[id] : '')),
        statChips(id, !eq), requisito(it), h('p', {}, it.desc));
      const row = h('div', { class: 'btn-row' });
      if (eq) row.append(h('button', { class: 'btn sm', onclick: () => { const e = unequip(c, it.slot); if (e) ui.toast(e); else { invSel = { id, eq: false }; game.refreshStats(); game.save(); feito(); } } }, 'Desequipar'));
      else if (it.slot) { const err = canEquip(c, id); row.append(h('button', { class: 'btn sm gold', disabled: !!err, onclick: () => { equip(c, id); invSel = { id, eq: true, slot: it.slot }; game.refreshStats(); sfx('click'); game.save(); feito(); } }, err || 'Equipar')); }
      else if (it.tipo === 'consumivel') {
        const at = game.atalhos();
        row.append(h('button', { class: 'btn sm gold', onclick: () => { if (game.useItem(id)) { game.save(); feito(); } } }, 'Usar'),
          ...[0, 1].map(i => h('button', { class: 'btn sm' + (at[i] === id ? ' on' : ''), title: 'Usar com a tecla ' + (i + 1), onclick: () => { at[i] = id; if (at[1 - i] === id) at[1 - i] = null; sfx('click'); game.save(); feito(); } }, at[i] === id ? '✓ Atalho ' + (i + 1) : '⌨ Atalho ' + (i + 1))));
      }
      box.append(row);
    }
    function detail() {
      modal((p, close) => {
        p.classList.add('item-pop');
        const box = h('div', { class: 'inv-detail' }); p.append(box);
        fill(box, close);
        box.querySelector('.btn-row').append(h('button', { class: 'btn sm', onclick: () => close() }, 'Fechar'));
      }).then(() => render());
    }
  }

  function tabQuests(body, render) {
    const c = game.char, prog = faseProg(c, SEMANA_ATUAL.id);
    const tracked = game.trackedQuest();
    if (tracked) {
      const q = QUESTS[tracked], s = c.data.quests[tracked], r = q.recompensa;
      const pct = s.st === 'pronta' ? 100 : Math.round(s.n / q.qtd * 100);
      body.append(h('div', { class: 'quest-focus' },
        h('small', { class: 'eyebrow' }, 'MISSÃO ACOMPANHADA'),
        h('b', {}, q.titulo), h('p', {}, q.desc),
        h('div', { class: 'qbar' }, h('i', { style: 'width:' + pct + '%' }), h('span', {}, s.st === 'pronta' ? 'Completa! Volte para entregar.' : s.n + '/' + q.qtd)),
        h('small', {}, 'Recompensa: 🪙 ' + (r.ouro || 0) + ' · ' + (r.xp || 0) + ' XP · ⭐ ' + (r.pontos || 0) + (r.itens ? ' · ' + Object.keys(r.itens).map(k => ITEMS[k].icon + ' ' + ITEMS[k].nome + ' x' + r.itens[k]).join(', ') : '')),
        game.guide ? h('small', { class: 'where' }, '➤ ' + game.guide.label) : '',
        h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => { ui.closeAll(); setTimeout(() => ui.openMap(), 200); } }, '🗺 Ver no mapa'))));
    }
    body.append(h('h4', {}, 'Estudo da semana: ' + SEMANA_ATUAL.titulo + ' (' + SEMANA_ATUAL.estudo + ')'), h('p', { class: 'muted' }, SEMANA_ATUAL.resumo));
    const fl = h('div', { class: 'fase-list' });
    SEMANA_ATUAL.fases.forEach(f => {
      const pr = prog[f.n];
      fl.append(h('div', { class: 'fase-row' + (pr?.done ? ' done' : '') }, h('span', { class: 'num' }, f.n), h('div', {}, h('b', {}, f.nome), h('small', {}, f.ref + ' · nível ' + f.nivel + ' · chefe: ' + BOSSES[f.chefe].nome)), h('span', {}, pr?.done ? '✅ ' + fmt(pr.best) : ITEMS[f.recompensa].icon)));
    });
    body.append(fl, h('h4', {}, 'Missões'));
    const ql = h('div', { class: 'fase-list' });
    const ids = Object.keys(c.data.quests);
    if (!ids.length) ql.append(h('p', { class: 'empty' }, 'Fale com os personagens com ❗ para pegar missões.'));
    for (const id of ids) {
      const q = QUESTS[id], s = c.data.quests[id];
      const track = s.st !== 'feita' && id !== tracked
        ? h('button', { class: 'btn sm', onclick: () => { c.data.track = id; delete c.data.waypoint; game.mmT = 0; game.guide = game.questTarget(); render(); } }, '📍 Acompanhar')
        : h('span', {}, id === tracked ? '📍' : '');
      ql.append(h('div', { class: 'fase-row' + (s.st === 'feita' ? ' done' : '') }, h('span', { class: 'num' }, s.st === 'feita' ? '✓' : s.st === 'pronta' ? '🎁' : '…'), h('div', {}, h('b', {}, q.titulo), h('small', {}, q.desc + ' · ' + (s.st === 'ativa' ? s.n + '/' + q.qtd : s.st === 'pronta' ? 'entregar' : 'feita'))), track));
    }
    body.append(ql);
    const mini = c.data.mini;
    body.append(h('h4', {}, 'Minijogos (recordes)'), h('p', { class: 'muted' }, '🐑 Ovelhas encontradas: ' + (mini.ovelha || 0) + ' · 🐟 Pesca: ' + (mini.pesca || 0) + ' · ✨ Maná: ' + (mini.mana || 0) + ' · 🦁 Arca: ' + (mini.arca || 0) + ' · 🎣 Pescaria: ' + Object.values(c.data.peixes || {}).reduce((a, b) => a + b, 0) + ' peixes'));
  }

  function tabBible(body) {
    const c = game.char;
    body.append(h('h4', {}, 'Versículo da semana'), h('blockquote', {}, '“' + SEMANA_ATUAL.versiculo.texto + '”', h('cite', {}, SEMANA_ATUAL.versiculo.ref)));
    const rev = c.data.revisar || [];
    if (rev.length) {
      body.append(h('h4', {}, '📌 Para revisar (' + rev.length + ')'), h('p', { class: 'muted' }, 'Perguntas que você errou. Quando acertar de novo num baú, ela sai daqui.'));
      const rl = h('div', { class: 'fase-list' });
      for (const r of rev.slice().reverse()) rl.append(h('div', { class: 'fase-row' }, h('span', { class: 'num' }, '?'), h('div', {}, h('b', {}, r.q), h('small', { class: 'certa' }, '✔ ' + r.certa), r.porque ? h('small', {}, r.porque) : '')));
      body.append(rl);
    }
    body.append(h('h4', {}, 'Versículos conquistados (' + c.data.verses.length + ')'));
    body.append(h('div', { class: 'tags' }, c.data.verses.length ? c.data.verses.map(v => h('span', { class: 'tag' }, v)) : h('p', { class: 'empty' }, 'Complete fases e vença o Acusador para colecionar versículos.')));
    body.append(h('h4', {}, 'Bestiário: o que aprendemos vencendo cada vício'));
    const bl = h('div', { class: 'fase-list' });
    for (const k in ENEMIES) {
      const e = ENEMIES[k], seen = c.data.licoes.includes(k);
      bl.append(h('div', { class: 'fase-row' + (seen ? '' : ' locked') }, h('span', { class: 'num', style: 'background:' + (seen ? e.cor : '#333') }, seen ? c.data.kills[k] || 0 : '?'), h('div', {}, h('b', {}, seen ? e.nome : '???'), h('small', {}, seen ? e.licao : 'Vença este vício para aprender a lição.'))));
    }
    body.append(bl);
    if (c.data.secrets.length) body.append(h('p', { class: 'secret' }, '📃 Você encontrou algo à espreita nos portões… "O pecado jaz à porta" (Gn 4:7).'));
  }

  async function tabRanking(body) {
    let kind = 'semana';
    const draw = async () => {
      body.innerHTML = '';
      body.append(h('div', { class: 'tabs small' }, [['semana', 'Esta semana'], ['geral', 'Geral']].map(([k, l]) => h('button', { class: 'tab' + (k === kind ? ' on' : ''), onclick: () => { kind = k; draw(); } }, l))));
      if (!ONLINE) body.append(h('p', { class: 'muted' }, 'Modo offline: o ranking mostra só os personagens deste aparelho. Configure o Supabase para o ranking mundial.'));
      const list = h('ol', { class: 'rank' }, h('li', { class: 'muted' }, 'Carregando…'));
      body.append(list);
      try {
        await game.save();
        const r = await net.ranking(kind);
        list.innerHTML = '';
        if (!r.length) list.append(h('li', { class: 'muted' }, 'Ninguém pontuou ainda. Seja o primeiro!'));
        r.forEach((x, i) => list.append(h('li', { class: x.name === game.char.name ? 'me' : '' }, h('span', { class: 'pos' }, i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1), h('b', {}, x.name), h('small', {}, (CLASSES[x.cls]?.nome || '') + ' · nv ' + x.level), h('em', {}, fmt(x.score)))));
      } catch (e) { list.innerHTML = ''; list.append(h('li', { class: 'muted' }, 'Não foi possível carregar: ' + e.message)); }
    };
    draw();
  }

  // Ajustes: interruptores salvos neste aparelho
  function tabConfig(body, render) {
    const opcoes = [
      ['camCentro', '🎥 Câmera sempre centralizada', 'O personagem fica sempre no meio da tela, até perto das bordas do mapa.'],
      ['esconderMissao', '📜 Esconder a barra de missão', 'Tira o cartão da missão do canto da tela. A seta dourada continua mostrando o caminho.'],
      ['tremor', '💥 Tremor da tela', 'A tela treme nos golpes fortes, nos chefes e nas explosões.'],
      ['numerosDano', '🔢 Números de dano', 'Mostra quanto cada golpe tirou dos inimigos.'],
      ['vibrar', '📳 Vibração', 'O controle (ou o celular) treme ao levar dano e na defesa perfeita.']
    ];
    const list = h('div', { class: 'fase-list' });
    for (const [k, nome, desc] of opcoes) list.append(h('div', { class: 'fase-row cfg' }, h('div', {}, h('b', {}, nome), h('small', {}, desc)),
      h('button', { class: 'toggle' + (config[k] ? ' on' : ''), role: 'switch', 'aria-checked': String(!!config[k]), 'aria-label': nome, onclick: () => { setConfig(k, !config[k]); sfx('click'); game.mmT = 0; render(); } }, h('i'))));
    list.append(h('div', { class: 'fase-row cfg' }, h('div', {}, h('b', {}, '🔊 Som'), h('small', {}, 'Música e efeitos.')),
      h('button', { class: 'toggle' + (audio.muted ? '' : ' on'), role: 'switch', 'aria-checked': String(!audio.muted), 'aria-label': 'Som', onclick: () => { initAudio(); setMuted(!audio.muted); $('bMute').textContent = audio.muted ? '🔇' : '🔊'; render(); } }, h('i'))));
    const faixa = (k, nome, desc) => h('div', { class: 'fase-row cfg' }, h('div', {}, h('b', {}, nome), h('small', {}, desc)),
      h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round((config[k] ?? 1) * 100), class: 'cfg-range', 'aria-label': nome, oninput: e => { setConfig(k, +e.target.value / 100); initAudio(); setVolumes(); }, onchange: () => sfx('click') }));
    list.append(faixa('volMusica', '🎵 Volume da música', 'A lira do mundo e a música dos chefes.'), faixa('volEfeitos', '🔔 Volume dos efeitos', 'Golpes, moedas, passos e avisos.'));
    list.append(h('div', { class: 'fase-row cfg' }, h('div', {}, h('b', {}, '🔠 Tamanho da interface'), h('small', {}, 'Aumenta textos, botões e janelas.')),
      h('div', { class: 'cfg-opts' }, [[1, 'Normal'], [1.15, 'Grande'], [1.3, 'Enorme']].map(([v, l]) => h('button', { class: 'chip-btn' + ((config.texto || 1) === v ? ' on' : ''), onclick: () => { setConfig('texto', v); sfx('click'); render(); } }, l)))));
    body.append(list, h('p', { class: 'hint' }, 'Os ajustes ficam salvos neste aparelho.' + (document.body.classList.contains('pad') ? ' Controle conectado: veja os botões em Ajuda › Ver tela de controles.' : '')));
  }

  function tabHelp(body, render, close) {
    const C = CLASSES[game.char.cls];
    body.append(h('div', { class: 'help' },
      h('div', {}, h('h4', {}, '⌨️ Computador'), h('ul', {},
        h('li', {}, h('b', {}, 'WASD / setas'), ' andar'), h('li', {}, h('b', {}, 'Mouse'), ' mirar · ', h('b', {}, 'clique'), ' atacar (gasta fôlego) · ', h('b', {}, 'segurar'), ' golpe forte · ', h('b', {}, 'T'), ' travar alvo'),
        h('li', {}, h('b', {}, 'Botão direito / K'), ' especial: ' + C.skill.nome), h('li', {}, h('b', {}, 'Espaço'), ' esquiva (invencível por um instante)'),
        h('li', {}, h('b', {}, 'Shift (segurar)'), ' defender (vira sozinho para o inimigo) — logo ao levantar o escudo é DEFESA PERFEITA e devolve projéteis'),
        h('li', {}, h('b', {}, 'R'), ' montar/descer do burrinho ou cavalo · ', h('b', {}, 'E'), ' na beira da água: pescar'),
        h('li', {}, 'Chat: ', h('b', {}, '/c mensagem'), ' fala só com o seu clã'),
        h('li', {}, h('b', {}, '1 / Q'), ' e ', h('b', {}, '2'), ' usam os itens dos atalhos (escolha no menu › Personagem) · ', h('b', {}, 'E'), ' falar / abrir'), h('li', {}, h('b', {}, 'I'), ' menu · ', h('b', {}, 'Enter'), ' chat'))),
      h('div', {}, h('h4', {}, '📱 Celular (deitado)'), h('ul', {},
        h('li', {}, 'Lado esquerdo da tela: joystick'), h('li', {}, '⚔ tocar: atacar · segurar: golpe forte · 🎯 travar alvo · ✦ especial'), h('li', {}, '💨 esquiva · 🛡 segurar para defender'), h('li', {}, '🍞 ✨ atalhos de itens · 🐎 montar · botão dourado para falar'))),
      h('div', {}, h('h4', {}, '✝️ Como jogar'), h('ul', {},
        h('li', {}, 'O Portão das Dungeons (norte da cidade) leva ao Salão: uma sala por semana de estudo, cada uma com 5 fases.'), h('li', {}, 'Nas fases: abra baús, acerte o quiz e junte 3 chaves para enfrentar o chefe.'),
        h('li', {}, 'Ganhe as 6 peças da Armadura de Deus (Ef 6:13-17).'), h('li', {}, 'Ajude os personagens: missões e minijogos dão pontos para o ranking.'),
        h('li', {}, 'Beemote mora no deserto e Leviatã na costa. Vá preparado!'))),
    ), h('div', { class: 'btn-row' },
      h('button', { class: 'btn gold', onclick: () => ui.controles() }, '🎮 Ver tela de controles'),
      pwa.available ? h('button', { class: 'btn gold', onclick: () => pwa.install(ui.toast) }, '📲 Instalar app') : '',
      h('button', { class: 'btn', onclick: () => { setMuted(!audio.muted); $('bMute').textContent = audio.muted ? '🔇' : '🔊'; } }, 'Som liga/desliga'),
      h('button', { class: 'btn danger', onclick: async () => { close(); await game.save(); onExit(); } }, 'Salvar e sair')));
  }

  /* ---------- Minijogos ---------- */
  ui.minigame = (id, opts) => modal((p, close) => { p.classList.add('mini'); p.parentElement.classList.add('locked'); playMinigame(id, p, close, opts); }, { dismiss: false, wide: true });

  /* ---------- Botões fixos ---------- */
  $('bMenu').addEventListener('click', () => { sfx('click'); if (!modals) ui.openMenu(); });
  $('bMute').textContent = audio.muted ? '🔇' : '🔊';
  $('bMute').addEventListener('click', () => { initAudio(); setMuted(!audio.muted); $('bMute').textContent = audio.muted ? '🔇' : '🔊'; });
  $('bFull').addEventListener('click', () => toggleFull(ui));
  if (pwa.installed) $('bFull').hidden = true; // o app instalado já abre em tela cheia
  $('bMap').addEventListener('click', () => { sfx('click'); if (!modals && game) ui.openMap(); });
  addEventListener('keydown', e => {
    if (!game || e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyI' || e.code === 'Tab') { if (!modals) ui.openMenu(); }
    if (e.code === 'KeyM') { if (!modals) ui.openMap(); else if (root.querySelector('.map-panel')) ui.closeAll(); }
    if (e.code === 'Enter' && !modals) { e.preventDefault(); $('chat').classList.add('open'); chatIn.focus(); }
  });
  return ui;
}

export async function toggleFull(ui) {
  const d = document, el = d.documentElement;
  const isFull = d.fullscreenElement || d.webkitFullscreenElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) {
    // iPhone não deixa sites entrarem em tela cheia
    ui?.toast('Seu navegador não permite tela cheia. No iPhone: Compartilhar → "Adicionar à Tela de Início" e abra o jogo por lá.', 6000);
    return;
  }
  try {
    if (!isFull) {
      await req.call(el, { navigationUI: 'hide' });
      if (matchMedia('(pointer: coarse)').matches) await screen.orientation?.lock?.('landscape').catch(() => {});
    } else {
      screen.orientation?.unlock?.();
      await (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }
  } catch { ui?.toast('Não foi possível entrar em tela cheia neste navegador.'); }
}
const syncFull = () => { const b = $('bFull'); if (b) { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); b.textContent = on ? '🗗' : '⛶'; b.title = on ? 'Sair da tela cheia' : 'Tela cheia'; } };
document.addEventListener('fullscreenchange', syncFull); document.addEventListener('webkitfullscreenchange', syncFull);
