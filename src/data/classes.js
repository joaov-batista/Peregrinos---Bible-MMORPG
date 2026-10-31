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
  },
  zelote: {
    nome: 'Zelote', icon: '🗡️', arma: 'adaga', ref: 'Lucas 6:15',
    desc: 'Rápido e ágil com a adaga, como Simão, o Zelote. Golpes curtos e muito seguidos, com mais chance de crítico.',
    base: { hp: 92, fe: 48, atk: 10, def: 3, spd: 192 },
    grow: { hp: 10, fe: 4, atk: 2.1, def: 0.7 },
    skill: { nome: 'Investida do Zelote', custo: 16, cd: 4, desc: 'Atravessa os inimigos num avanço rápido, ferindo todos no caminho, e fica invencível durante o avanço.' },
    armaInicial: 'adaga_ferro_velho'
  },
  valente: {
    nome: 'Valente de Davi', icon: '🔱', arma: 'lanca', ref: '2 Samuel 23:18',
    desc: 'A lança alcança longe em linha reta, como Abisai, que brandiu a lança contra trezentos. Resistente e firme.',
    base: { hp: 112, fe: 42, atk: 12, def: 6, spd: 164 },
    grow: { hp: 13, fe: 3, atk: 2.2, def: 1.1 },
    skill: { nome: 'Lança de Abisai', custo: 20, cd: 5, desc: 'Arremessa a lança, que atravessa todos os inimigos em linha (2Sm 23:18).' },
    armaInicial: 'lanca_pastor'
  },
  juiz: {
    nome: 'Juiz', icon: '〰️', arma: 'chicote', ref: 'Juízes 3:31',
    desc: 'O chicote de boieiro alcança longe e puxa os inimigos. Sangar venceu seiscentos filisteus com uma aguilhada de bois.',
    base: { hp: 100, fe: 55, atk: 11, def: 5, spd: 174 },
    grow: { hp: 11, fe: 5, atk: 2.1, def: 0.9 },
    skill: { nome: 'Aguilhada de Sangar', custo: 22, cd: 6, desc: 'Gira o chicote em volta, acerta todos por perto e puxa os inimigos para junto de você (Jz 3:31).' },
    armaInicial: 'chicote_couro'
  }
};

// Initial cloth palettes; player choices and existing saves always take precedence.
export const CLASS_ATTIRE = {
  guerreiro: { tunic: '#526C78', cape: '#394F62' },
  pastor: { tunic: '#4C665E', cape: '#877451' },
  profeta: { tunic: '#D2CFBB', cape: '#55516D' },
  levita: { tunic: '#497A80', cape: '#C8C9BC' },
  zelote: { tunic: '#343F51', cape: '#713E49' },
  valente: { tunic: '#874D4C', cape: '#394F62' },
  juiz: { tunic: '#A18C61', cape: '#40594F' }
};

export const LOOK_OPTIONS = {
  skin: ['#F2D0B0', '#E3B48C', '#C68B59', '#A0673E', '#6E4428'],
  hair: ['#1C120A', '#3A2314', '#6B4423', '#B8863B', '#E8C77A', '#D9D2C5', '#8E2F1F', '#C85A2A'],
  tunic: ['#526C78', '#874D4C', '#4C665E', '#686078', '#A18C61', '#343F51', '#D2CFBB', '#497A80'],
  cape: ['#394F62', '#877451', '#713E49', '#55516D', '#40594F', '#C8C9BC', 'none'],
  style: [
    { id: 'curto', nome: 'Curto' }, { id: 'longo', nome: 'Longo' }, { id: 'coque', nome: 'Coque' },
    { id: 'veu', nome: 'Véu' }, { id: 'careca', nome: 'Careca' }, { id: 'turbante', nome: 'Turbante' },
    { id: 'cacheado', nome: 'Cacheado' }, { id: 'black', nome: 'Black power' }, { id: 'trancas', nome: 'Tranças' },
    { id: 'rabo', nome: 'Rabo de cavalo' }, { id: 'espetado', nome: 'Espetado' }, { id: 'franja', nome: 'Franja' }
  ],
  // formato do corpo (largura do tronco e altura das pernas; ver BODY em game/character-art.js)
  body: [
    { id: 'medio', nome: 'Médio' }, { id: 'magro', nome: 'Magro' }, { id: 'forte', nome: 'Forte' },
    { id: 'robusto', nome: 'Robusto' }, { id: 'baixo', nome: 'Baixo' }, { id: 'alto', nome: 'Alto' }
  ],
  beard: [{ id: false, nome: 'Sem barba' }, { id: true, nome: 'Com barba' }]
};

export function defaultLook() {
  return { skin: '#C68B59', hair: '#3A2314', tunic: '#526C78', cape: '#394F62', style: 'curto', body: 'medio', beard: false };
}
