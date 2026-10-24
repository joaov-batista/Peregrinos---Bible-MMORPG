// Ajustes do jogador (ficam salvos neste aparelho). Menu ☰ › Ajustes.
import { store } from './util.js';

const PADRAO = {
  camCentro: true,       // câmera sempre com o personagem no meio (até na borda do mapa)
  esconderMissao: false, // esconde o cartão da missão no canto (a seta dourada continua)
  tremor: true           // a tela treme nos golpes fortes
};
export const config = { ...PADRAO, ...store.get('peregrinos.config', {}) };
export function setConfig(k, v) { config[k] = v; store.set('peregrinos.config', config); }
