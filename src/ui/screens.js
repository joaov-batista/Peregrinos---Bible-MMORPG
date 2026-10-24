// Telas fora do jogo: entrar/criar conta, escolher personagem e criar personagem.
import { $, h, fmt, pick } from '../util.js';
import { net, ONLINE } from '../net.js';
import { sfx, initAudio } from '../audio.js';
import { CLASSES, LOOK_OPTIONS, defaultLook } from '../data/classes.js';
import { drawPerson, drawWeapon } from '../game/draw.js';
import { newCharData } from '../game/player.js';
import { SEMANA_ATUAL } from '../content/index.js';
import { pwa } from '../pwa.js';

const scr = () => $('screens');
function screen(...kids) {
  const s = scr(); s.innerHTML = ''; s.hidden = false;
  s.append(h('div', { class: 'screen' }, ...kids));
}
const logo = () => h('div', { class: 'logo' }, h('span', { class: 'cross' }, '✝'), h('h1', {}, 'PEREGRINOS'), h('p', {}, 'RPG bíblico online'));

export function showAuth(onDone) {
  let mode = 'entrar';
  const msg = h('p', { class: 'form-msg', role: 'status' });
  const email = h('input', { type: 'email', placeholder: 'seu@email.com', autocomplete: 'email', 'aria-label': 'E-mail' });
  const pass = h('input', { type: 'password', placeholder: 'senha (mín. 6)', autocomplete: 'current-password', 'aria-label': 'Senha' });
  const go = h('button', { class: 'btn gold wide', type: 'submit' }, 'Entrar');
  const tabs = h('div', { class: 'tabs' });
  const setMode = m => {
    mode = m; go.textContent = m === 'entrar' ? 'Entrar' : 'Criar conta';
    pass.autocomplete = m === 'entrar' ? 'current-password' : 'new-password';
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); msg.textContent = '';
  };
  tabs.append(h('button', { class: 'tab on', type: 'button', 'data-m': 'entrar', onclick: () => setMode('entrar') }, 'Entrar'), h('button', { class: 'tab', type: 'button', 'data-m': 'criar', onclick: () => setMode('criar') }, 'Criar conta'));
  const form = h('form', { class: 'card auth', onsubmit: async e => {
    e.preventDefault(); initAudio(); msg.className = 'form-msg'; msg.textContent = 'Aguarde…'; go.disabled = true;
    try {
      if (mode === 'entrar') { await net.signIn(email.value.trim(), pass.value); onDone(); }
      else {
        const r = await net.signUp(email.value.trim(), pass.value);
        if (r.needsConfirm) { msg.className = 'form-msg ok'; msg.textContent = 'Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.'; setMode('entrar'); }
        else onDone();
      }
    } catch (err) { msg.className = 'form-msg err'; msg.textContent = err.message; }
    go.disabled = false;
  } });
  if (ONLINE) form.append(tabs, h('label', {}, 'E-mail', email), h('label', {}, 'Senha', pass), go, msg,
    h('button', { class: 'link', type: 'button', onclick: () => { net.user = null; initAudio(); onDone(); } }, 'Jogar sem conta (salva só neste aparelho, sem ranking mundial)'));
  else form.append(h('p', { class: 'muted' }, 'Modo offline: o progresso fica salvo neste navegador. Para contas, ranking mundial e jogadores online, configure o Supabase (veja o README).'),
    h('button', { class: 'btn gold wide', type: 'button', onclick: () => { initAudio(); onDone(); } }, 'Começar a jornada'));
  screen(logo(), h('p', { class: 'week' }, 'Estudo da semana: ', h('b', {}, SEMANA_ATUAL.titulo), ' · ' + SEMANA_ATUAL.estudo), form, installButton(msg));
}

// Botão "Instalar app" (aparece só quando dá para instalar)
function installButton(msg) {
  const b = h('button', { class: 'btn install', type: 'button', onclick: () => pwa.install(t => { msg.className = 'form-msg ok'; msg.textContent = t; }) }, '📲 Instalar o app no celular');
  const sync = () => { b.hidden = !pwa.available; };
  sync(); const off = pwa.onChange(() => b.isConnected ? sync() : off());
  return b;
}

function miniPortrait(look, cls, size = 80) {
  const c = h('canvas', { width: size * 2, height: size * 2, class: 'portrait' });
  const g = c.getContext('2d'); g.scale(2, 2);
  drawPerson(g, size / 2, size * 0.75, size / 44, look, { t: 0, fx: 0.3, fy: 1 });
  return c;
}

export async function showSelect(onPlay, onNew, onLogout) {
  screen(logo(), h('p', { class: 'muted' }, 'Carregando personagens…'));
  let chars = [];
  try { chars = await net.listChars(); } catch (e) { screen(logo(), h('p', { class: 'form-msg err' }, 'Erro: ' + e.message), h('button', { class: 'btn', onclick: onLogout }, 'Voltar')); return; }
  if (!chars.length) return onNew();
  const list = h('div', { class: 'char-list' });
  for (const c of chars) {
    list.append(h('div', { class: 'card char-card' },
      miniPortrait(c.look, c.cls),
      h('div', { class: 'info' }, h('b', {}, c.name), h('small', {}, CLASSES[c.cls].icon + ' ' + CLASSES[c.cls].nome + ' · nível ' + c.level), h('small', {}, '⭐ ' + fmt(c.score) + ' pontos')),
      h('div', { class: 'col' },
        h('button', { class: 'btn gold', onclick: () => { sfx('click'); onPlay(c); } }, 'Jogar'),
        h('button', { class: 'btn sm danger', onclick: async e => {
          const b = e.currentTarget;
          if (b.dataset.sure) { await net.deleteChar(c.id); showSelect(onPlay, onNew, onLogout); }
          else { b.dataset.sure = '1'; b.textContent = 'Tem certeza?'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Apagar'; } }, 3000); }
        } }, 'Apagar'))));
  }
  screen(logo(), h('h2', { class: 'title' }, 'Escolha seu peregrino'), list,
    h('div', { class: 'btn-row' }, chars.length < 3 ? h('button', { class: 'btn', onclick: onNew }, '+ Novo personagem') : '', h('button', { class: 'btn link', onclick: onLogout }, ONLINE && net.user ? 'Sair da conta' : 'Voltar')));
}

export function showCreator(onCreated, onBack) {
  const look = defaultLook();
  let cls = 'guerreiro', t = 0, raf, face = 0;
  const FACES = [[0, 1], [0.95, 0.3], [0, -1], [-0.95, 0.3]];
  const turn = d => { face = (face + d + 4) % 4; };
  const cv = h('canvas', { width: 360, height: 360, class: 'creator-preview' });
  const g = cv.getContext('2d');
  const draw = () => {
    t += 1 / 60;
    g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 180, 180);
    const gr = g.createRadialGradient(90, 110, 10, 90, 110, 90); gr.addColorStop(0, 'rgba(242,193,78,.25)'); gr.addColorStop(1, 'rgba(242,193,78,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 180, 180);
    // parado de frente; o jogador gira com os botões ◀ ▶
    const fx = FACES[face][0], fy = FACES[face][1];
    const w = CLASSES[cls].arma;
    const drawW = () => { g.save(); g.translate(90 + fx * 22, 112); g.scale(2.6, 2.6); g.rotate(w === 'espada' ? (fx < -0.3 ? -Math.PI + 0.9 : -0.9) : Math.atan2(fy, fx) * 0.4 - 0.4); drawWeapon(g, w, w === 'cajado' ? 30 : 26, 0); g.restore(); };
    if (fy < -0.3) drawW();
    drawPerson(g, 90, 130, 2.6, look, { t, fx, fy, walk: 0, moving: false });
    if (fy >= -0.3) drawW();
    raf = requestAnimationFrame(draw);
  };
  const name = h('input', { maxlength: 16, placeholder: 'Nome do personagem', 'aria-label': 'Nome', value: '' });
  const msg = h('p', { class: 'form-msg' });
  const classBox = h('div', { class: 'class-grid' });
  const renderClasses = () => {
    classBox.innerHTML = '';
    for (const k in CLASSES) {
      const C = CLASSES[k];
      classBox.append(h('button', { class: 'class-card' + (k === cls ? ' on' : ''), type: 'button', onclick: () => { cls = k; sfx('click'); renderClasses(); } },
        h('span', { class: 'ci' }, C.icon), h('b', {}, C.nome), h('small', {}, C.desc), h('small', { class: 'skill' }, '✦ ' + C.skill.nome + ' · ' + C.ref)));
    }
  };
  renderClasses();
  const swatches = (key, colors) => h('div', { class: 'swatches' }, colors.map(col => h('button', {
    type: 'button', class: 'sw' + (look[key] === col ? ' on' : ''), style: col === 'none' ? '' : 'background:' + col, 'aria-label': key + ' ' + col,
    onclick: e => { look[key] = col; e.currentTarget.parentElement.querySelectorAll('.sw').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); }
  }, col === 'none' ? '∅' : '')));
  const chips = (key, opts) => h('div', { class: 'chips-row' }, opts.map(o => h('button', {
    type: 'button', class: 'chip-btn' + (look[key] === o.id ? ' on' : ''),
    onclick: e => { look[key] = o.id; e.currentTarget.parentElement.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); }
  }, o.nome)));
  const looks = h('div', { class: 'look-opts' });
  const renderLooks = () => {
    looks.innerHTML = '';
    looks.append(h('label', {}, 'Pele', swatches('skin', LOOK_OPTIONS.skin)), h('label', {}, 'Cabelo', swatches('hair', LOOK_OPTIONS.hair)),
      h('label', {}, 'Estilo', chips('style', LOOK_OPTIONS.style)), h('label', {}, 'Corpo', chips('body', LOOK_OPTIONS.body)),
      h('label', {}, 'Barba', chips('beard', LOOK_OPTIONS.beard)),
      h('label', {}, 'Túnica', swatches('tunic', LOOK_OPTIONS.tunic)), h('label', {}, 'Capa', swatches('cape', LOOK_OPTIONS.cape)));
  };
  renderLooks();
  const random = () => {
    look.skin = pick(LOOK_OPTIONS.skin); look.hair = pick(LOOK_OPTIONS.hair); look.tunic = pick(LOOK_OPTIONS.tunic); look.cape = pick(LOOK_OPTIONS.cape);
    look.style = pick(LOOK_OPTIONS.style).id; look.body = pick(LOOK_OPTIONS.body).id; look.beard = Math.random() < 0.4; renderLooks();
  };
  const create = h('button', { class: 'btn gold wide', type: 'submit' }, 'Começar a jornada');
  const form = h('form', { class: 'creator', onsubmit: async e => {
    e.preventDefault();
    const n = name.value.trim();
    if (!/^[\p{L}0-9 _-]{3,16}$/u.test(n)) { msg.className = 'form-msg err'; msg.textContent = 'O nome precisa ter de 3 a 16 letras ou números.'; return; }
    create.disabled = true; msg.className = 'form-msg'; msg.textContent = 'Criando…';
    try {
      const c = await net.createChar({ name: n, cls, look: { ...look }, data: newCharData(cls) });
      cancelAnimationFrame(raf); sfx('level'); onCreated(c);
    } catch (err) { msg.className = 'form-msg err'; msg.textContent = err.message; create.disabled = false; }
  } },
  h('div', { class: 'creator-left' }, cv, h('div', { class: 'btn-row' },
    h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Girar para a esquerda', onclick: () => turn(-1) }, '◀'),
    h('button', { class: 'btn sm', type: 'button', onclick: random }, '🎲 Aleatório'),
    h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Girar para a direita', onclick: () => turn(1) }, '▶'))),
  h('div', { class: 'creator-right' },
    h('label', {}, 'Nome', name),
    h('h4', {}, 'Classe'), classBox,
    h('h4', {}, 'Aparência'), looks,
    msg, h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onclick: () => { cancelAnimationFrame(raf); onBack(); } }, 'Voltar'), create)));
  screen(h('h2', { class: 'title' }, 'Crie seu peregrino'), form);
  draw();
}

export function hideScreens() { scr().hidden = true; scr().innerHTML = ''; }
