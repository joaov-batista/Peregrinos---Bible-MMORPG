// Ajustes do jogador (ficam salvos neste aparelho). Menu ☰ › Ajustes.
import { store } from './util.js';

const PADRAO = {
  camCentro: true,       // câmera sempre com o personagem no meio (até na borda do mapa)
  esconderMissao: false, // esconde o cartão da missão no canto (a seta dourada continua)
  tremor: true,          // a tela treme nos golpes fortes
  vibrar: true,          // o controle (ou o celular) treme ao levar dano e na defesa perfeita
  numerosDano: true,     // mostra o dano em cima dos inimigos
  volMusica: 0.8,        // 0 a 1
  volEfeitos: 1,         // 0 a 1
  texto: 1               // tamanho da interface: 1, 1.15 ou 1.3
};
export const config = { ...PADRAO, ...store.get('peregrinos.config', {}) };
export function setConfig(k, v) { config[k] = v; store.set('peregrinos.config', config); aplicarTexto(); }
// tamanho do texto/interface (combina com o zoom do navegador, ver zoom.js)
export function aplicarTexto() { document.documentElement.style.setProperty('--ui-esc', String(config.texto || 1)); }
aplicarTexto();
