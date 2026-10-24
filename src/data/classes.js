// Classes jogáveis. "arma" define como o ataque básico funciona (ver game/combat.js).
export const CLASSES = {
  guerreiro: {
    nome: 'Guerreiro da Fé', icon: '⚔️', arma: 'espada', ref: 'Juízes 7',
    desc: 'Luta de perto com a espada. Muita vida e defesa. Combo de 3 golpes.',
    base: { hp: 120, fe: 40, atk: 12, def: 6, spd: 168 },
    grow: { hp: 14, fe: 3, atk: 2.2, def: 1.2 },
    skill: { nome: 'Giro de Gideão', custo: 15, cd: 4, desc: 'Um giro que acerta todos ao redor e empurra os inimigos.' },
    armaInicial: 'espada_madeira'
  },
  pastor: {
    nome: 'Pastor', icon: '🪨', arma: 'funda', ref: '1 Samuel 17',
    desc: 'Ataca de longe com a funda, como Davi. Rápido e certeiro.',
    base: { hp: 95, fe: 50, atk: 11, def: 4, spd: 184 },
    grow: { hp: 11, fe: 4, atk: 2.1, def: 0.8 },
    skill: { nome: 'Cinco Pedras Lisas', custo: 18, cd: 5, desc: 'Lança 5 pedras em leque. "Escolheu cinco pedras lisas" (1Sm 17:40).' },
    armaInicial: 'funda_couro'
  },
  profeta: {
    nome: 'Profeta', icon: '🔥', arma: 'cajado', ref: '1 Reis 18',
    desc: 'O cajado lança luz que persegue o inimigo. Pouca vida, muito poder.',
    base: { hp: 85, fe: 80, atk: 13, def: 3, spd: 170 },
    grow: { hp: 9, fe: 7, atk: 2.6, def: 0.6 },
    skill: { nome: 'Fogo do Céu', custo: 25, cd: 6, desc: 'Fogo cai do céu numa área, como no Carmelo (1Rs 18:38).' },
    armaInicial: 'cajado_oliveira'
  },
  levita: {
    nome: 'Levita', icon: '🎺', arma: 'trombeta', ref: 'Josué 6',
    desc: 'A trombeta solta ondas de som que empurram. Cura com louvor.',
    base: { hp: 108, fe: 60, atk: 10, def: 8, spd: 170 },
    grow: { hp: 12, fe: 5, atk: 1.9, def: 1.4 },
    skill: { nome: 'Cântico de Louvor', custo: 22, cd: 7, desc: 'Cura você e os peregrinos próximos e afasta os inimigos (2Cr 20:22).' },
    armaInicial: 'trombeta_chifre'
  }
};

export const LOOK_OPTIONS = {
  skin: ['#F2D0B0', '#E3B48C', '#C68B59', '#A0673E', '#6E4428'],
  hair: ['#1C120A', '#3A2314', '#6B4423', '#B8863B', '#E8C77A', '#D9D2C5', '#8E2F1F', '#C85A2A'],
  tunic: ['#3B4CCA', '#C0392B', '#2E8B57', '#8E44AD', '#D98E04', '#2C3E50', '#ECE3CF', '#1F8A9E'],
  cape: ['#E0483A', '#F2C14E', '#3B4CCA', '#6B3FA0', '#2E8B57', '#ECE3CF', 'none'],
  style: [
    { id: 'curto', nome: 'Curto' }, { id: 'longo', nome: 'Longo' }, { id: 'coque', nome: 'Coque' },
    { id: 'veu', nome: 'Véu' }, { id: 'careca', nome: 'Careca' }, { id: 'turbante', nome: 'Turbante' },
    { id: 'cacheado', nome: 'Cacheado' }, { id: 'black', nome: 'Black power' }, { id: 'trancas', nome: 'Tranças' },
    { id: 'rabo', nome: 'Rabo de cavalo' }, { id: 'espetado', nome: 'Espetado' }, { id: 'franja', nome: 'Franja' }
  ],
  // formato do corpo (largura do tronco e altura das pernas; ver BODY em game/draw.js)
  body: [
    { id: 'medio', nome: 'Médio' }, { id: 'magro', nome: 'Magro' }, { id: 'forte', nome: 'Forte' },
    { id: 'robusto', nome: 'Robusto' }, { id: 'baixo', nome: 'Baixo' }, { id: 'alto', nome: 'Alto' }
  ],
  beard: [{ id: false, nome: 'Sem barba' }, { id: true, nome: 'Com barba' }]
};

export function defaultLook() {
  return { skin: '#C68B59', hair: '#3A2314', tunic: '#3B4CCA', cape: '#E0483A', style: 'curto', body: 'medio', beard: false };
}
