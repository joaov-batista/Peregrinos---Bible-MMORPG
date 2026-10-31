import './styles.css';
import './art-direction.css';
import './pwa.js';
import { $ } from './util.js';
import { initInput, input } from './input.js';
import { initZoom } from './zoom.js';
import { initAudio } from './audio.js';
import { initGamepad } from './gamepad.js';
import { net, ONLINE } from './net.js';
import { Game } from './game/game.js';
import { createHud } from './ui/hud.js';
import { showAuth, showSelect, showCreator, hideScreens } from './ui/screens.js';

const canvas = $('cv');
initZoom();
initInput(canvas);
initGamepad();
addEventListener('pointerdown', initAudio, { once: true });
addEventListener('keydown', initAudio, { once: true });

let game = null;
const ui = createHud(exitToSelect);
ui.show(false);

function play(char) {
  hideScreens();
  ui.show(true);
  input.clear();
  const novo = !char.data.stats.playtime;
  game = new Game(canvas, char, ui);
  ui.attach(game);
  ui.online(ONLINE ? 1 : 0);
  window.__game = game; // ajuda na depuração pelo console
  const viu = (() => { try { return localStorage.getItem('peregrinos.controles') === '1'; } catch { return false; } })();
  const boasVindas = () => novo && ui.dialog({
    nome: 'Bem-vindo, ' + char.name + '!',
    texto: 'Você chegou à Cidade de Refúgio. Fale com o Velho Peregrino (logo abaixo da fonte) para receber sua primeira missão.\n\nAo norte da cidade fica o Portão das Dungeons, com as fases de cada semana de estudo. Fora dos muros, vícios e demônios esperam por você.\n\n"Sede fortes no Senhor e na força do seu poder" (Ef 6:10).',
    acoes: [{ label: 'Vamos lá!' }]
  });
  // personagem novo: prólogo narrado (content/cinematicas.js), depois os controles e as boas-vindas
  if (novo || !viu) setTimeout(async () => { if (novo) await game.cinema('prologo'); await ui.controles(); try { localStorage.setItem('peregrinos.controles', '1'); } catch {} boasVindas(); }, 600);
}

function exitToSelect() {
  game?.destroy(); game = null; ui.show(false);
  start();
}

function select() {
  showSelect(play, () => showCreator(c => play(c), select), async () => { await net.signOut(); showAuth(select); });
}

async function start() {
  if (ONLINE) await net.init().catch(() => null);
  if (ONLINE && !net.user) showAuth(select);
  else if (!ONLINE && !sessionStorage.getItem('peregrinos.started')) showAuth(() => { sessionStorage.setItem('peregrinos.started', '1'); select(); });
  else select();
}
start();

// salva ao fechar a aba
addEventListener('visibilitychange', () => { if (document.hidden) game?.save(); });
