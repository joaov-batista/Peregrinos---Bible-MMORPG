// Todos os itens do jogo. "slot" = onde equipa; consumíveis têm efeito ao usar.
// raridade: comum | raro | epico | lendario | secreto
export const SLOTS = ['arma', 'escudo', 'cabeca', 'corpo', 'cinto', 'pes', 'reliquia', 'pet'];
export const SLOT_NOMES = { arma: 'Arma', escudo: 'Escudo', cabeca: 'Cabeça', corpo: 'Corpo', cinto: 'Cinto', pes: 'Pés', reliquia: 'Relíquia', pet: 'Animal' };
export const RARIDADE = {
  comum: { nome: 'Comum', cor: '#D8D2C4' },
  raro: { nome: 'Raro', cor: '#5DADEC' },
  epico: { nome: 'Épico', cor: '#B98AF0' },
  lendario: { nome: 'Armadura de Deus', cor: '#F2C14E' },
  secreto: { nome: 'Secreto', cor: '#FF5A6E' }
};

export const ITEMS = {
  // ---------- Consumíveis ----------
  pao: { nome: 'Pão', icon: '🍞', tipo: 'consumivel', cura: 45, preco: 12, desc: 'Recupera 45 de vida. "Eu sou o pão da vida" (Jo 6:35).' },
  peixe: { nome: 'Peixe Assado', icon: '🐟', tipo: 'consumivel', cura: 110, preco: 32, nivel: 4, desc: 'Recupera 110 de vida. Lembra a multiplicação (Jo 6:9).' },
  agua_viva: { nome: 'Água Viva', icon: '💧', tipo: 'consumivel', curaPct: 1, preco: 95, nivel: 6, raridade: 'raro', desc: 'Recupera toda a vida. "Quem beber desta água nunca terá sede" (Jo 4:14).' },
  mana: { nome: 'Maná', icon: '✨', tipo: 'consumivel', fe: 45, preco: 20, desc: 'Recupera 45 de Fé. O pão do céu no deserto (Êx 16).' },
  oleo: { nome: 'Azeite da Unção', icon: '🫒', tipo: 'consumivel', buff: { atk: 1.35, t: 30 }, preco: 70, nivel: 3, raridade: 'raro', desc: '+35% de ataque por 30s. "Unges a minha cabeça com óleo" (Sl 23:5).' },
  mel: { nome: 'Favo de Mel', icon: '🍯', tipo: 'consumivel', buff: { spd: 1.25, t: 30 }, preco: 45, nivel: 2, desc: '+25% de velocidade por 30s. Jônatas provou e seus olhos brilharam (1Sm 14:27).' },
  uvas: { nome: 'Cacho de Uvas', icon: '🍇', tipo: 'consumivel', cura: 75, preco: 22, nivel: 3, desc: 'Recupera 75 de vida. Os espias trouxeram um cacho enorme de Canaã (Nm 13:23).' },
  roma: { nome: 'Romã', icon: '🍎', tipo: 'consumivel', fe: 90, preco: 40, nivel: 5, desc: 'Recupera 90 de Fé. Romãs enfeitavam as vestes do sacerdote (Êx 28:33).' },
  tamaras: { nome: 'Tâmaras', icon: '🌴', tipo: 'consumivel', cura: 40, fe: 30, preco: 30, nivel: 4, desc: 'Recupera 40 de vida e 30 de Fé. "O justo florescerá como a palmeira" (Sl 92:12).' },
  leite_mel: { nome: 'Leite e Mel', icon: '🥛', tipo: 'consumivel', buff: { atk: 1.2, spd: 1.15, t: 40 }, preco: 90, nivel: 6, raridade: 'raro', desc: '+20% de ataque e +15% de velocidade por 40s. "Terra que mana leite e mel" (Êx 3:8).' },
  // Pratos da cozinha de casa (receitas em game/casa.js); não se vendem
  guisado_jaco: { nome: 'Guisado de Jacó', icon: '🍲', tipo: 'consumivel', cura: 220, fe: 40, raridade: 'raro', desc: 'Recupera 220 de vida e 40 de Fé. O guisado pelo qual Esaú vendeu a primogenitura (Gn 25:34). Valorize o que é eterno!' },
  bolo_passas: { nome: 'Bolo de Passas', icon: '🥮', tipo: 'consumivel', cura: 40, buff: { atk: 1.25, t: 60 }, raridade: 'raro', desc: '+25% de ataque por 60s. Davi deu bolos de passas ao povo quando a arca chegou (2Sm 6:19).' },
  pao_mel: { nome: 'Pão com Mel', icon: '🥯', tipo: 'consumivel', cura: 60, buff: { spd: 1.2, t: 60 }, raridade: 'raro', desc: '+20% de velocidade por 60s. O maná tinha gosto de bolo com mel (Êx 16:31).' },
  peixe_brasa: { nome: 'Peixe na Brasa com Pão', icon: '🍢', tipo: 'consumivel', curaPct: 1, fe: 30, raridade: 'raro', desc: 'Vida cheia e 30 de Fé. Jesus preparou peixe na brasa e pão para os discípulos na praia (Jo 21:9).' },
  suco_roma: { nome: 'Suco de Romã', icon: '🧃', tipo: 'consumivel', fe: 200, raridade: 'raro', desc: 'Recupera 200 de Fé. "Dar-te-ia a beber… do suco das minhas romãs" (Ct 8:2).' },
  tamaras_mel: { nome: 'Tâmaras com Mel', icon: '🍡', tipo: 'consumivel', buff: { atk: 1.2, spd: 1.15, t: 90 }, raridade: 'raro', desc: '+20% de ataque e +15% de velocidade por 90s. Doce como a terra que mana leite e mel (Êx 3:8).' },
  // Sementes para a horta de casa (ver game/casa.js)
  semente_trigo: { nome: 'Sementes de Trigo', icon: '🌾', tipo: 'semente', preco: 8, desc: 'Em 10 minutos vira 3 pães. "Se o grão de trigo não morrer, fica só" (Jo 12:24).' },
  semente_uva: { nome: 'Muda de Videira', icon: '🍇', tipo: 'semente', preco: 14, desc: 'Em 20 minutos dá 3 cachos de uvas. "Eu sou a videira, vós, os ramos" (Jo 15:5).' },
  semente_tamara: { nome: 'Caroço de Tâmara', icon: '🌴', tipo: 'semente', preco: 16, desc: 'Em 25 minutos dá 3 porções de tâmaras.' },
  semente_roma: { nome: 'Sementes de Romã', icon: '🍎', tipo: 'semente', preco: 22, desc: 'Em 35 minutos dá 2 romãs.' },
  pergaminho: { nome: 'Pergaminho do Retorno', icon: '📜', tipo: 'consumivel', retorno: true, preco: 25, desc: 'Leva você de volta à Cidade de Refúgio.' },

  // ---------- Armas por classe ----------
  espada_madeira: { nome: 'Espada de Madeira', icon: '🗡️', slot: 'arma', classe: 'guerreiro', atk: 3, preco: 10, desc: 'Para começar a jornada.' },
  espada_bronze: { nome: 'Espada de Bronze', icon: '🗡️', slot: 'arma', classe: 'guerreiro', atk: 9, preco: 160, nivel: 3, desc: 'Lâmina firme de bronze.' },
  espada_ferro: { nome: 'Espada de Ferro', icon: '⚔️', slot: 'arma', classe: 'guerreiro', atk: 17, preco: 520, nivel: 7, raridade: 'raro', desc: '"O ferro com ferro se afia" (Pv 27:17).' },
  espada_gideao: { nome: 'Espada de Gideão', icon: '⚔️', slot: 'arma', classe: 'guerreiro', atk: 27, preco: 1500, nivel: 11, raridade: 'epico', desc: '"Pela espada do Senhor e de Gideão!" (Jz 7:20).' },
  funda_couro: { nome: 'Funda de Couro', icon: '🪨', slot: 'arma', classe: 'pastor', atk: 3, preco: 10, desc: 'Funda simples de pastor.' },
  funda_trancada: { nome: 'Funda Trançada', icon: '🪨', slot: 'arma', classe: 'pastor', atk: 9, preco: 160, nivel: 3, desc: 'Arremessa mais longe.' },
  funda_benjamim: { nome: 'Funda de Benjamim', icon: '🎯', slot: 'arma', classe: 'pastor', atk: 17, preco: 520, nivel: 7, raridade: 'raro', desc: 'Atiravam numa pedra num fio de cabelo, sem errar (Jz 20:16).' },
  funda_davi: { nome: 'Funda de Davi', icon: '🎯', slot: 'arma', classe: 'pastor', atk: 27, preco: 1500, nivel: 11, raridade: 'epico', desc: 'A que derrubou o gigante (1Sm 17:49).' },
  cajado_oliveira: { nome: 'Cajado de Oliveira', icon: '🪄', slot: 'arma', classe: 'profeta', atk: 3, preco: 10, desc: 'Um cajado simples.' },
  cajado_amendoeira: { nome: 'Vara de Amendoeira', icon: '🪄', slot: 'arma', classe: 'profeta', atk: 10, preco: 160, nivel: 3, desc: 'Floresceu num só dia (Nm 17:8).' },
  cajado_eliseu: { nome: 'Manto de Eliseu', icon: '🧥', slot: 'arma', classe: 'profeta', atk: 18, preco: 520, nivel: 7, raridade: 'raro', desc: 'Porção dobrada do espírito (2Rs 2:9).' },
  cajado_moises: { nome: 'Vara de Moisés', icon: '🌊', slot: 'arma', classe: 'profeta', atk: 29, preco: 1500, nivel: 11, raridade: 'epico', desc: 'Estendeu a mão e o mar se abriu (Êx 14:21).' },
  trombeta_chifre: { nome: 'Shofar de Chifre', icon: '📯', slot: 'arma', classe: 'levita', atk: 3, preco: 10, desc: 'O chifre de carneiro.' },
  trombeta_prata: { nome: 'Trombeta de Prata', icon: '🎺', slot: 'arma', classe: 'levita', atk: 9, preco: 160, nivel: 3, desc: '"Faze duas trombetas de prata" (Nm 10:2).' },
  trombeta_jerico: { nome: 'Trombeta de Jericó', icon: '🎺', slot: 'arma', classe: 'levita', atk: 17, preco: 520, nivel: 7, raridade: 'raro', desc: 'As muralhas caíram ao som delas (Js 6:20).' },
  espada_golias: { nome: 'Espada de Golias', icon: '🗡️', slot: 'arma', classe: 'guerreiro', atk: 36, preco: 3200, nivel: 15, raridade: 'epico', desc: '"Não há outra igual; dá-ma" (1Sm 21:9).' },
  arco_jonatas: { nome: 'Arco de Jônatas', icon: '🏹', slot: 'arma', classe: 'pastor', atk: 36, preco: 3200, nivel: 15, raridade: 'epico', desc: '"O arco de Jônatas nunca voltou atrás" (2Sm 1:22).' },
  vara_arao: { nome: 'Vara de Arão', icon: '🌿', slot: 'arma', classe: 'profeta', atk: 38, preco: 3200, nivel: 15, raridade: 'epico', desc: 'Brotou, floresceu e deu amêndoas (Nm 17:8).' },
  cimbalos_asafe: { nome: 'Címbalos de Asafe', icon: '🥁', slot: 'arma', classe: 'levita', atk: 35, preco: 3200, nivel: 15, raridade: 'epico', desc: 'Asafe tocava os címbalos diante da arca (1Cr 16:5).' },
  // Zelote (adaga): menos dano por golpe, mas golpes bem mais rápidos
  adaga_ferro_velho: { nome: 'Adaga de Ferro Velho', icon: '🔪', slot: 'arma', classe: 'zelote', atk: 2, preco: 10, desc: 'Curta e escondida debaixo do manto.' },
  adaga_bronze: { nome: 'Adaga de Bronze', icon: '🔪', slot: 'arma', classe: 'zelote', atk: 7, preco: 160, nivel: 3, desc: 'Leve e rápida.' },
  adaga_eude: { nome: 'Punhal de Eúde', icon: '🗡️', slot: 'arma', classe: 'zelote', atk: 14, preco: 520, nivel: 7, raridade: 'raro', desc: 'De dois gumes, um côvado de comprimento (Jz 3:16).' },
  adaga_zelote: { nome: 'Sica do Zelote', icon: '🗡️', slot: 'arma', classe: 'zelote', atk: 23, preco: 1500, nivel: 11, raridade: 'epico', desc: 'A lâmina curva dos zelotes da Galileia. Simão deixou a revolta para seguir a Jesus (Lc 6:15).' },
  adaga_pedro: { nome: 'Espada Curta de Pedro', icon: '🗡️', slot: 'arma', classe: 'zelote', atk: 31, preco: 3200, nivel: 15, raridade: 'epico', desc: 'Pedro cortou a orelha de Malco, e Jesus o curou (Jo 18:10; Lc 22:51). Coragem com mansidão.' },
  // Valente de Davi (lança): alcance longo em linha reta
  lanca_pastor: { nome: 'Lança de Pastor', icon: '🔱', slot: 'arma', classe: 'valente', atk: 3, preco: 10, desc: 'Uma vara com ponta de ferro.' },
  lanca_bronze: { nome: 'Lança de Bronze', icon: '🔱', slot: 'arma', classe: 'valente', atk: 9, preco: 160, nivel: 3, desc: 'Ponta firme de bronze.' },
  lanca_benaia: { nome: 'Lança de Benaia', icon: '🔱', slot: 'arma', classe: 'valente', atk: 17, preco: 520, nivel: 7, raridade: 'raro', desc: 'Benaia tomou a lança da mão do egípcio e o venceu com ela (2Sm 23:21).' },
  lanca_abisai: { nome: 'Lança de Abisai', icon: '🔱', slot: 'arma', classe: 'valente', atk: 27, preco: 1500, nivel: 11, raridade: 'epico', desc: 'Brandiu a lança contra trezentos (2Sm 23:18).' },
  lanca_saul: { nome: 'Lança do Rei', icon: '🔱', slot: 'arma', classe: 'valente', atk: 36, preco: 3200, nivel: 15, raridade: 'epico', desc: 'Davi a tomou junto à cabeceira de Saul e não lhe fez mal (1Sm 26:12). Força com misericórdia.' },
  // Juiz (chicote): alcance médio-longo e puxa os inimigos
  chicote_couro: { nome: 'Chicote de Couro', icon: '〰️', slot: 'arma', classe: 'juiz', atk: 3, preco: 10, desc: 'Chicote simples de boieiro.' },
  chicote_trancado: { nome: 'Chicote Trançado', icon: '〰️', slot: 'arma', classe: 'juiz', atk: 9, preco: 160, nivel: 3, desc: 'Couro trançado, estala longe.' },
  aguilhada_sangar: { nome: 'Aguilhada de Sangar', icon: '🦯', slot: 'arma', classe: 'juiz', atk: 17, preco: 520, nivel: 7, raridade: 'raro', desc: 'Com uma aguilhada de bois, Sangar livrou Israel (Jz 3:31).' },
  chicote_gideao: { nome: 'Chicote dos Espinhos', icon: '〰️', slot: 'arma', classe: 'juiz', atk: 27, preco: 1500, nivel: 11, raridade: 'epico', desc: 'Gideão ensinou os homens de Sucote com espinhos do deserto (Jz 8:16).' },
  chicote_juiz: { nome: 'Chicote do Juiz de Israel', icon: '〰️', slot: 'arma', classe: 'juiz', atk: 35, preco: 3200, nivel: 15, raridade: 'epico', desc: '"Levantou o Senhor juízes, que os livraram" (Jz 2:16).' },
  harpa_davi: { nome: 'Harpa de Davi', icon: '🪕', slot: 'arma', classe: 'levita', atk: 26, preco: 1500, nivel: 11, raridade: 'epico', desc: 'Ao tocar, o espírito mau se retirava (1Sm 16:23).' },

  // ---------- Armaduras comuns ----------
  escudo_madeira: { nome: 'Escudo de Madeira', icon: '🛡️', slot: 'escudo', def: 2, block: 0.65, preco: 60, desc: 'Bloqueio reduz 65% do dano.' },
  escudo_bronze: { nome: 'Escudo de Bronze', icon: '🛡️', slot: 'escudo', def: 5, block: 0.75, preco: 300, nivel: 5, raridade: 'raro', desc: 'Bloqueio reduz 75% do dano.' },
  escudo_ferro: { nome: 'Escudo de Ferro', icon: '🛡️', slot: 'escudo', def: 8, block: 0.82, preco: 900, nivel: 9, raridade: 'raro', desc: 'Bloqueio reduz 82% do dano.' },
  escudo_salomao: { nome: 'Escudo de Ouro de Salomão', icon: '🛡️', slot: 'escudo', def: 11, block: 0.88, hp: 20, preco: 2400, nivel: 13, raridade: 'epico', desc: 'Salomão fez escudos de ouro batido (1Rs 10:17). Bloqueio reduz 88% do dano.' },
  turbante: { nome: 'Turbante de Linho', icon: '👳', slot: 'cabeca', def: 1, hp: 10, preco: 40, desc: '+10 de vida.' },
  elmo_bronze: { nome: 'Elmo de Bronze', icon: '⛑️', slot: 'cabeca', def: 4, hp: 25, preco: 280, nivel: 5, raridade: 'raro', desc: 'Pesado, mas protege.' },
  elmo_ferro: { nome: 'Elmo de Ferro', icon: '⛑️', slot: 'cabeca', def: 7, hp: 40, preco: 850, nivel: 10, raridade: 'raro', desc: 'Forjado para a batalha.' },
  tunica_linho: { nome: 'Túnica de Linho', icon: '👘', slot: 'corpo', def: 2, preco: 45, desc: 'Leve e fresca.' },
  gibao_couro: { nome: 'Gibão de Couro', icon: '🦺', slot: 'corpo', def: 6, hp: 15, preco: 180, nivel: 3, desc: 'Couro curtido.' },
  cota_malha: { nome: 'Cota de Malha', icon: '🥋', slot: 'corpo', def: 11, hp: 30, preco: 560, nivel: 7, raridade: 'raro', desc: 'Anéis de bronze trançados.' },
  couraca_golias: { nome: 'Couraça de Escamas', icon: '🥋', slot: 'corpo', def: 15, hp: 50, preco: 1700, nivel: 12, raridade: 'epico', desc: 'Como a couraça de escamas de bronze de Golias (1Sm 17:5) — mas agora num servo de Deus.' },
  sandalias: { nome: 'Sandálias', icon: '🩴', slot: 'pes', spd: 8, preco: 30, desc: '+8 de velocidade.' },
  botas_viajante: { nome: 'Botas de Viajante', icon: '🥾', slot: 'pes', spd: 16, def: 1, preco: 220, nivel: 4, desc: '+16 de velocidade.' },
  botas_couro_fino: { nome: 'Botas de Couro Fino', icon: '🥾', slot: 'pes', spd: 24, def: 3, preco: 650, nivel: 8, raridade: 'raro', desc: '"Calcei-te com couro fino" (Ez 16:10). +24 de velocidade.' },
  cinto_sacerdote: { nome: 'Cinto do Sacerdote', icon: '🎀', slot: 'cinto', def: 3, fe: 30, preco: 600, nivel: 8, raridade: 'raro', desc: 'Bordado, como o do sumo sacerdote (Êx 28:39).' },
  cinto_couro: { nome: 'Cinto de Couro', icon: '🪢', slot: 'cinto', def: 1, fe: 10, preco: 50, desc: 'Como o de João Batista (Mt 3:4).' },

  // ---------- Armadura de Deus (Efésios 6:13-17) — só se ganha nas fases ----------
  cinto_verdade: { nome: 'Cinto da Verdade', icon: '🎗️', slot: 'cinto', def: 3, fe: 25, raridade: 'lendario', desc: '"Cingidos com a verdade" (Ef 6:14). +25 Fé.' },
  calcados_paz: { nome: 'Calçados da Paz', icon: '👟', slot: 'pes', spd: 30, def: 3, raridade: 'lendario', desc: '"Pés calçados com a preparação do evangelho da paz" (Ef 6:15). Esquiva gasta menos fôlego.', esquiva: 0.6 },
  couraca_justica: { nome: 'Couraça da Justiça', icon: '🛡️', slot: 'corpo', def: 15, hp: 45, raridade: 'lendario', desc: '"Vestidos com a couraça da justiça" (Ef 6:14).' },
  escudo_fe: { nome: 'Escudo da Fé', icon: '🔰', slot: 'escudo', def: 7, block: 0.95, raridade: 'lendario', desc: '"Com o qual podereis apagar todos os dardos inflamados do maligno" (Ef 6:16). Bloqueia 95% do dano.' },
  capacete_salvacao: { nome: 'Capacete da Salvação', icon: '⛑️', slot: 'cabeca', def: 6, hp: 60, raridade: 'lendario', desc: '"Tomai o capacete da salvação" (Ef 6:17). Uma vez por fase, você levanta quando cair.', reviver: true },
  espada_espirito: { nome: 'Espada do Espírito', icon: '✝️', slot: 'arma', classe: 'todas', atk: 30, raridade: 'lendario', desc: '"A espada do Espírito, que é a palavra de Deus" (Ef 6:17). Funciona em qualquer classe e causa +50% de dano em chefes.', palavra: true },

  // ---------- Relíquias de chefes do mundo ----------
  osso_bronze: { nome: 'Osso de Bronze', icon: '🦴', slot: 'reliquia', atk: 8, def: 4, raridade: 'epico', desc: 'Do Beemote: "seus ossos são como tubos de bronze" (Jó 40:18).' },
  pedra_lisa: { nome: 'Pedra Lisa do Ribeiro', icon: '🪨', slot: 'reliquia', atk: 7, fe: 15, raridade: 'epico', desc: '"Escolheu cinco pedras lisas do ribeiro" (1Sm 17:40). Do Golias: a pedra que acertou a testa do gigante.' },
  escama_leviata: { nome: 'Escama do Leviatã', icon: '🐉', slot: 'reliquia', def: 9, hp: 40, raridade: 'epico', desc: '"Suas escamas são o seu orgulho" (Jó 41:15).' },
  anel_jose: { nome: 'Anel de José', icon: '💍', slot: 'reliquia', ouro: 0.15, def: 2, preco: 700, nivel: 5, raridade: 'raro', desc: 'Faraó tirou o anel e o pôs na mão de José (Gn 41:42). +15% de denários.' },
  manto_cores: { nome: 'Túnica de Muitas Cores', icon: '🧣', slot: 'reliquia', hp: 30, fe: 20, preco: 950, nivel: 7, raridade: 'raro', desc: 'O presente de Jacó para José (Gn 37:3).' },
  moeda_mamom: { nome: 'Moeda de Mamom', icon: '🪙', slot: 'reliquia', ouro: 0.3, raridade: 'raro', desc: '+30% de denários. Lembrete: "Não podeis servir a Deus e a Mamom" (Mt 6:24).' },

  // ---------- Animais (slot "pet"). montaria = multiplica a velocidade quando montado (tecla R) ----------
  burrinho: { nome: 'Burrinho', icon: '🫏', slot: 'pet', pet: 'burrinho', montaria: 1.3, preco: 1500, nivel: 4, raridade: 'raro', desc: 'Montaria mansa (um pouco lenta). "Eis que o teu Rei vem a ti, manso, montado num jumentinho" (Mt 21:5). Aperte R para montar.' },
  cavalo: { nome: 'Cavalo', icon: '🐎', slot: 'pet', pet: 'cavalo', montaria: 2.4, preco: 5000, nivel: 8, raridade: 'epico', desc: 'A montaria mais veloz do jogo (+140% de velocidade). "Vi o céu aberto, e eis um cavalo branco" (Ap 19:11). Aperte R para montar.' },
  cachorro: { nome: 'Cachorro', icon: '🐕', slot: 'pet', pet: 'cachorro', preco: 320, nivel: 3, desc: 'Companheiro fiel: ataca os vícios perto de você com mordidas fortes e acha moedas pelo caminho.' },
  gato: { nome: 'Gato', icon: '🐈', slot: 'pet', pet: 'gato', preco: 280, nivel: 2, desc: 'Companheiro ágil: arranha os vícios perto de você bem rápido (golpes mais fracos, mas seguidos).' },
  ovelha: { nome: 'Ovelhinha', icon: '🐑', slot: 'pet', pet: 'ovelha', preco: 260, nivel: 2, desc: 'Companheira mansa: enquanto ela está com você, a vida volta aos pouquinhos. "O Senhor é o meu pastor" (Sl 23:1).' },

  // ---------- Secretos ----------
  pagina_rasgada: { nome: 'Página Rasgada', icon: '📃', tipo: 'chave', raridade: 'secreto', desc: '"O pecado jaz à porta... mas a ti cumpre dominá-lo" (Gn 4:7). Alguém está à espreita nos portões.' }
};

// Categorias para organizar lojas e inventário
export const CATEGORIAS = [
  { k: 'consumivel', nome: 'Consumíveis', ico: '🍞' }, { k: 'arma', nome: 'Armas', ico: '⚔️' }, { k: 'escudo', nome: 'Escudos', ico: '🛡️' },
  { k: 'armadura', nome: 'Armaduras', ico: '🥋' }, { k: 'reliquia', nome: 'Relíquias', ico: '💍' }, { k: 'pet', nome: 'Animais', ico: '🐾' },
  { k: 'semente', nome: 'Sementes', ico: '🌱' }, { k: 'especial', nome: 'Especiais', ico: '📃' }
];
export function categoria(id) {
  const it = ITEMS[id]; if (!it) return 'especial';
  if (it.tipo === 'consumivel') return 'consumivel';
  if (it.tipo === 'semente') return 'semente';
  if (['cabeca', 'corpo', 'cinto', 'pes'].includes(it.slot)) return 'armadura';
  return ['arma', 'escudo', 'reliquia', 'pet'].includes(it.slot) ? it.slot : 'especial';
}
// agrupa ids por categoria, na ordem de CATEGORIAS; dentro de cada uma, por nível e preço
export function porCategoria(ids) {
  const out = CATEGORIAS.map(c => ({ ...c, ids: [] }));
  for (const id of ids) out.find(c => c.k === categoria(id)).ids.push(id);
  for (const c of out) c.ids.sort((a, b) => (ITEMS[a].nivel || 0) - (ITEMS[b].nivel || 0) || (ITEMS[a].preco || 0) - (ITEMS[b].preco || 0));
  return out.filter(c => c.ids.length);
}

export function itemCor(id) { const it = ITEMS[id]; return RARIDADE[(it && it.raridade) || 'comum'].cor; }

// Atributos de equipamento, na ordem em que aparecem. pct = mostrar em %
export const STATS = [
  { k: 'atk', ico: '⚔', nome: 'Ataque' }, { k: 'def', ico: '🛡', nome: 'Defesa' }, { k: 'hp', ico: '❤', nome: 'Vida' },
  { k: 'fe', ico: '✨', nome: 'Fé' }, { k: 'spd', ico: '👟', nome: 'Velocidade' }, { k: 'block', ico: '🔰', nome: 'Bloqueio', pct: true },
  { k: 'ouro', ico: '🪙', nome: 'Denários', pct: true }, { k: 'montaria', ico: '🐎', nome: 'Montaria', pct: true, base: 1 }
];
// valor numérico comparável de um atributo (montaria 1.75 → 75)
export function statVal(it, s) { const v = it && it.slot ? it[s.k] || 0 : 0; return s.pct ? Math.round((v - (v ? s.base || 0 : 0)) * 100) : v; }
// efeitos de consumível em texto curto
export function efeitos(it) {
  const e = [];
  if (it.cura) e.push(['❤', '+' + it.cura + ' vida']); if (it.curaPct) e.push(['❤', 'vida cheia']);
  if (it.fe && !it.slot) e.push(['✨', '+' + it.fe + ' Fé']);
  if (it.buff?.atk) e.push(['⚔', '+' + Math.round((it.buff.atk - 1) * 100) + '% ataque · ' + it.buff.t + 's']);
  if (it.buff?.spd) e.push(['👟', '+' + Math.round((it.buff.spd - 1) * 100) + '% velocidade · ' + it.buff.t + 's']);
  if (it.retorno) e.push(['📜', 'volta à cidade']);
  return e;
}

export function statLine(it) {
  const s = [];
  if (it.atk) s.push('+' + it.atk + ' ATQ');
  if (it.def) s.push('+' + it.def + ' DEF');
  if (it.hp) s.push('+' + it.hp + ' VIDA');
  if (it.fe && it.slot) s.push('+' + it.fe + ' FÉ');
  if (it.spd) s.push('+' + it.spd + ' VEL');
  if (it.block) s.push('Bloqueio ' + Math.round(it.block * 100) + '%');
  if (it.cura) s.push('Cura ' + it.cura);
  if (it.curaPct) s.push('Cura total');
  if (it.fe && !it.slot) s.push('+' + it.fe + ' Fé');
  if (it.ouro) s.push('+' + Math.round(it.ouro * 100) + '% denários');
  if (it.montaria) s.push('Montaria: +' + Math.round((it.montaria - 1) * 100) + '% VEL');
  return s.join(' · ');
}
