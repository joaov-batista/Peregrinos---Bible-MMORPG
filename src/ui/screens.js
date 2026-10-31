// Telas fora do jogo: entrar/criar conta, escolher personagem e criar personagem.
import { $, h, fmt } from '../util.js';
import { net, ONLINE } from '../net.js';
import { sfx, initAudio } from '../audio.js';
import { CLASSES } from '../data/classes.js';
import { drawPerson } from '../game/draw.js';
import { mountCreator } from './creator.js';
import { icon } from './icons.js';
import { SEMANA_ATUAL } from '../content/index.js';
import { pwa } from '../pwa.js';
import { ligarCeu, desligarCeu } from './ceu.js';

const scr = () => $('screens');
function screen(...kids) {
  const s = scr(); s.classList.remove('creating'); s.innerHTML = ''; s.hidden = false; ligarCeu();
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
  else form.append(h('p', { class: 'muted' }, 'Sua jornada fica salva neste navegador. Crie seu peregrino e descubra a Cidade de Refúgio.'),
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
  drawPerson(g, size / 2, size * 1.9, size / 28, look, { t: 0, fx: 0.2, fy: 1, semLuz: true }); // busto: cabeça e ombros
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
      h('div', { class: 'info' }, h('b', {}, c.name), h('small', {}, icon(CLASSES[c.cls].arma, 15), ' ' + CLASSES[c.cls].nome + ' · nível ' + c.level), h('small', {}, '⭐ ' + fmt(c.score) + ' pontos')),
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
  mountCreator(scr(), onCreated, onBack);
}

export function hideScreens() { scr().hidden = true; scr().innerHTML = ''; desligarCeu(); }
