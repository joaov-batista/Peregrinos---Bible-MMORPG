// Personagens do mundo aberto. tx/ty = posição em tiles. "acoes" = botões extras no diálogo.
// look segue o formato do criador de personagem (+ anjo opcional).
export const WORLD_NPCS = [
  {
    id: 'peregrino', nome: 'Velho Peregrino', tx: 90, ty: 81,
    look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#7A5232', cape: '#ECE3CF', style: 'longo', beard: true },
    falas: [
      'Bem-vindo à Cidade de Refúgio, peregrino! Aqui você está seguro.',
      'Ao norte ficam os 5 Portões. Toda semana eles se abrem para um novo estudo da Palavra.',
      'Lá fora há vícios e demônios. Use a esquiva para fugir dos golpes e o escudo para se defender. Uma defesa no tempo certo devolve o ataque!'
    ],
    missao: 'q_preguica'
  },
  {
    id: 'bezalel', nome: 'Bezalel, o Artesão', tx: 79, ty: 70, loja: 'ferreiro',
    look: { skin: '#A0673E', hair: '#1C120A', tunic: '#5B3E2B', cape: 'none', style: 'turbante', beard: true },
    falas: ['Deus me encheu de habilidade para trabalhar em metal e madeira (Êx 31:3). O que vai levar?']
  },
  {
    id: 'labao', nome: 'Labão, o Criador', tx: 99, ty: 76, loja: 'animais',
    look: { skin: '#C68B59', hair: '#D9D2C5', tunic: '#7A5232', cape: '#ECE3CF', style: 'turbante', body: 'robusto', beard: true },
    falas: ['Jacó cuidou dos meus rebanhos por vinte anos (Gn 31:41). Tenho burrinhos, cavalos, ovelhas, gatos e cães!', 'Montaria se monta com R (ou o botão 🐎). O burrinho é manso, mas o cavalo corre como o vento!']
  },
  {
    id: 'samuel', nome: 'Samuel, o Profeta', tx: 100, ty: 81, classe: true,
    look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#ECE3CF', cape: '#6B3FA0', style: 'longo', beard: true },
    falas: ['O Senhor não vê como o homem vê: o homem olha para a aparência, mas o Senhor olha para o coração (1Sm 16:7).', 'Quer servir de outro jeito? Eu posso te ungir para outra classe. Seu nível e seus itens continuam com você.']
  },
  {
    id: 'lidia', nome: 'Lídia, a Comerciante', tx: 101, ty: 70, loja: 'provisoes',
    look: { skin: '#E3B48C', hair: '#6B4423', tunic: '#8E44AD', cape: '#F2C14E', style: 'coque', beard: false },
    falas: ['Sou de Tiatira, vendo púrpura… e provisões para a jornada! (At 16:14)']
  },
  {
    id: 'baruque', nome: 'Baruque, o Escriba', tx: 83, ty: 82, ranking: true,
    look: { skin: '#C68B59', hair: '#3A2314', tunic: '#ECE3CF', cape: '#1F8A9E', style: 'curto', beard: true },
    falas: ['Eu escrevo os feitos de todos os peregrinos. Quer ver o ranking?']
  },
  {
    id: 'neemias', nome: 'Neemias', tx: 97, ty: 82,
    look: { skin: '#B97A4E', hair: '#2B1A10', tunic: '#C0392B', cape: '#ECE3CF', style: 'turbante', beard: true },
    falas: ['Reconstruímos os muros em 52 dias, com a espada numa mão e a ferramenta na outra (Ne 4:17).'],
    missao: 'q_muros'
  },
  {
    id: 'debora', nome: 'Débora, a Juíza', tx: 76, ty: 77,
    look: { skin: '#A0673E', hair: '#1C120A', tunic: '#2E8B57', cape: '#F2C14E', style: 'veu', beard: false },
    falas: ['Eu julgava Israel debaixo de uma palmeira (Jz 4:5). O Medo ronda a costa — enfrente-o!'],
    missao: 'q_medo'
  },
  {
    id: 'porteiro', nome: 'Porteiro das Dungeons', tx: 90, ty: 41,
    look: { skin: '#C68B59', hair: '#1C120A', tunic: '#2C3E50', cape: '#F2C14E', style: 'curto', beard: true },
    falas: [
      'Este é o Portão das Dungeons. Lá dentro fica o Salão, com uma sala para cada semana de estudo — a nova e as passadas.',
      'Em cada sala há 5 fases e um guia. Uma fase só abre quando você completa a anterior e tem o nível pedido.',
      'Dentro de cada fase: abra os baús, responda ao quiz e junte 3 chaves para abrir a porta do chefe.'
    ],
    missao: 'q_portao'
  },
  {
    id: 'davi', nome: 'Davi, o Pastorzinho', tx: 117, ty: 106, minijogo: 'ovelha', missao: 'q_ovelhas',
    look: { skin: '#E3B48C', hair: '#8E2F1F', tunic: '#D98E04', cape: 'none', style: 'curto', beard: false },
    falas: [
      'Eu tinha 100 ovelhas… e uma se perdeu! O pastor deixa as 99 e vai atrás da perdida (Lc 15:4).',
      'Me ajuda a encontrar? Eu te digo se você está perto ou longe.'
    ]
  },
  {
    id: 'pedro', nome: 'Pedro, o Pescador', tx: 49, ty: 101, minijogo: 'pesca', missao: 'q_pesca',
    look: { skin: '#C68B59', hair: '#3A2314', tunic: '#1F8A9E', cape: 'none', style: 'curto', beard: true },
    falas: ['Pescamos a noite toda e nada… Até Ele dizer: "Lancem a rede do lado direito" (Jo 21:6). Quer tentar?']
  },
  {
    id: 'moises', nome: 'Moisés', tx: 117, ty: 76, minijogo: 'mana',
    look: { skin: '#C68B59', hair: '#D9D2C5', tunic: '#B9875A', cape: '#ECE3CF', style: 'longo', beard: true },
    falas: ['No deserto, Deus mandava maná do céu toda manhã (Êx 16). Junte só o que precisa — nada de acumular!']
  },
  {
    id: 'noe', nome: 'Noé', tx: 58, ty: 84, minijogo: 'arca',
    look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#5B3E2B', cape: '#2E8B57', style: 'longo', beard: true },
    falas: ['Os animais entraram na arca de dois em dois (Gn 7:9). Me ajuda a formar os pares?']
  },
  {
    id: 'rute', nome: 'Rute', tx: 92, ty: 104,
    look: { skin: '#D9A273', hair: '#6B4423', tunic: '#D98E04', cape: 'none', style: 'veu', beard: false },
    falas: ['"Aonde quer que fores, irei eu" (Rt 1:16). O Desânimo tenta me fazer desistir dos campos.'],
    missao: 'q_desanimo'
  },
  {
    id: 'calebe', nome: 'Calebe', tx: 128, ty: 84,
    look: { skin: '#A0673E', hair: '#D9D2C5', tunic: '#7A5232', cape: '#C0392B', style: 'curto', beard: true },
    falas: ['Tenho 85 anos e a mesma força! "Dá-me este monte" (Js 14:12). No fundo do deserto mora o Beemote. Coragem!'],
    missao: 'q_beemote'
  },
  {
    id: 'jonas', nome: 'Jonas', tx: 128, ty: 44,
    look: { skin: '#C68B59', hair: '#1C120A', tunic: '#2C3E50', cape: 'none', style: 'curto', beard: true },
    falas: ['Eu sei bem o que mora no mar… O Leviatã aparece nesta costa. Não fuja do chamado como eu fugi!'],
    missao: 'q_leviata'
  },
  {
    id: 'saul', nome: 'Rei Saul', tx: 88, ty: 108,
    look: { skin: '#C68B59', hair: '#2B1A10', tunic: '#6B3FA0', cape: '#F2C14E', style: 'turbante', body: 'alto', beard: true },
    falas: [
      'Esse filisteu de Gate desafia Israel há quarenta dias (1Sm 17:16). Ninguém tem coragem de descer ao Vale de Elá.',
      'Quer a minha armadura? Davi não quis: "Não posso andar com isto" (1Sm 17:39). Contra Golias, bater na armadura não adianta.',
      'Espere a lança dele. Levante o escudo no instante do golpe — defesa perfeita — e a testa ficará exposta. Aí, ataque! Uma funda acerta em dobro.'
    ],
    missao: 'q_golias'
  },
  // ---------- missões secundárias difíceis ----------
  {
    id: 'gideao', nome: 'Gideão', tx: 104, ty: 54,
    look: { skin: '#C68B59', hair: '#3A2314', tunic: '#7A5232', cape: '#C0392B', style: 'curto', body: 'forte', beard: true },
    falas: ['Deus venceu com só 300 homens (Jz 7:7). Não é pela quantidade, é pela fé!', 'Você aguenta uma batalha longa? Os vícios são muitos.'],
    missao: 'q_gideao'
  },
  {
    id: 'sansao', nome: 'Sansão', tx: 126, ty: 74,
    look: { skin: '#A0673E', hair: '#1C120A', tunic: '#8A5A35', cape: 'none', style: 'longo', body: 'robusto', beard: true },
    falas: ['Minha força vinha do Senhor, não de mim (Jz 16:28). A Ira me fez perder muito…', 'No deserto a Ira anda solta. Vença-a com domínio próprio.'],
    missao: 'q_sansao'
  },
  {
    id: 'josue', nome: 'Josué', tx: 142, ty: 88,
    look: { skin: '#C68B59', hair: '#6B4423', tunic: '#2C3E50', cape: '#F2C14E', style: 'curto', body: 'forte', beard: true },
    falas: ['"Sê forte e corajoso" (Js 1:9). As muralhas do Orgulho caem diante de Deus!'],
    missao: 'q_josue'
  },
  {
    id: 'elias', nome: 'Elias', tx: 124, ty: 56,
    look: { skin: '#A0673E', hair: '#D9D2C5', tunic: '#8E7B5A', cape: '#6B3FA0', style: 'longo', beard: true },
    falas: ['No Carmelo, o fogo do Senhor caiu e consumiu o altar (1Rs 18:38). A Vaidade não resiste à verdade.'],
    missao: 'q_elias'
  },
  {
    id: 'jo', nome: 'Jó', tx: 136, ty: 60,
    look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#ECE3CF', cape: 'none', style: 'careca', body: 'magro', beard: true },
    falas: ['Deus me mostrou o Leviatã: "Quem lhe abrirá as portas da boca?" (Jó 41:14). Só Ele é maior.', 'Paciência e fé: vencer uma vez não basta.'],
    missao: 'q_jo'
  },
  {
    id: 'daniel', nome: 'Daniel', tx: 88, ty: 68,
    look: { skin: '#C68B59', hair: '#1C120A', tunic: '#6B3FA0', cape: '#F2C14E', style: 'curto', beard: false },
    falas: ['Fui fiel na cova dos leões (Dn 6:22). Seja fiel até a última fase da semana!'],
    missao: 'q_daniel'
  }
];

// Missões. tipo: kill (alvo = tipo de inimigo ou "*"), boss, fase, pesca, ovelha
export const QUESTS = {
  // difíceis
  q_gideao: { titulo: 'Os 300 de Gideão', desc: 'Derrote 60 vícios quaisquer.', tipo: 'kill', alvo: '*', qtd: 60, dificil: true, recompensa: { ouro: 900, xp: 900, itens: { leite_mel: 3 }, pontos: 1800 } },
  q_sansao: { titulo: 'Domínio próprio', desc: 'Derrote 25 Iras no deserto.', tipo: 'kill', alvo: 'ira', qtd: 25, dificil: true, recompensa: { ouro: 1000, xp: 1000, itens: { escudo_ferro: 1 }, pontos: 2000 } },
  q_josue: { titulo: 'As muralhas caem', desc: 'Derrote 20 Orgulhos no deserto.', tipo: 'kill', alvo: 'orgulho', qtd: 20, dificil: true, recompensa: { ouro: 1300, xp: 1300, itens: { couraca_golias: 1 }, pontos: 2600 } },
  q_elias: { titulo: 'Fogo no Carmelo', desc: 'Derrote 15 Vaidades na costa.', tipo: 'kill', alvo: 'vaidade', qtd: 15, dificil: true, recompensa: { ouro: 1400, xp: 1400, itens: { elmo_ferro: 1, agua_viva: 3 }, pontos: 2800 } },
  q_jo: { titulo: 'Quem pode com o Leviatã?', desc: 'Derrote o Leviatã 2 vezes.', tipo: 'boss', alvo: 'leviata', qtd: 2, dificil: true, recompensa: { ouro: 2000, xp: 1800, itens: { escudo_salomao: 1 }, pontos: 4000 } },
  q_daniel: { titulo: 'Fiel até o fim', desc: 'Complete a Fase 5 da semana nova.', tipo: 'fase', alvo: 5, qtd: 1, dificil: true, recompensa: { ouro: 1500, xp: 1500, itens: { manto_cores: 1 }, pontos: 3000 } },
  q_pesca: { titulo: 'Pescadores de homens', desc: 'Pesque 10 peixes em qualquer beira de lago ou mar.', tipo: 'pesca', alvo: '*', qtd: 10, dificil: true, recompensa: { ouro: 700, xp: 600, itens: { botas_couro_fino: 1 }, pontos: 1500 } },
  q_ovelhas: { titulo: 'O bom pastor', desc: '3 ovelhas fugiram do rebanho do Davi pelos campos e colinas! Elas fogem quando você chega perto: corra até elas cansarem, pegue e leve ao Davi.', tipo: 'ovelha', alvo: '*', qtd: 3, dificil: true, recompensa: { ouro: 600, xp: 600, itens: { ovelha: 1 }, pontos: 1200 } },
  q_preguica: { titulo: 'Vença a Preguiça', desc: 'Derrote 5 Preguiças nas colinas ao redor da cidade.', tipo: 'kill', alvo: 'preguica', qtd: 5, recompensa: { ouro: 40, xp: 40, itens: { pao: 3 }, pontos: 100 } },
  q_desanimo: { titulo: 'Não desista!', desc: 'Derrote 6 Desânimos nos campos do sul ou na floresta.', tipo: 'kill', alvo: 'desanimo', qtd: 6, recompensa: { ouro: 90, xp: 90, itens: { peixe: 2 }, pontos: 200 } },
  q_muros: { titulo: 'Guarda dos Muros', desc: 'Derrote 15 inimigos quaisquer.', tipo: 'kill', alvo: '*', qtd: 15, recompensa: { ouro: 120, xp: 120, itens: { gibao_couro: 1 }, pontos: 250 } },
  q_medo: { titulo: 'Não temas', desc: 'Derrote 5 Medos perto da costa.', tipo: 'kill', alvo: 'medo', qtd: 5, recompensa: { ouro: 220, xp: 220, itens: { oleo: 2 }, pontos: 400 } },
  q_portao: { titulo: 'O Primeiro Portão', desc: 'Entre no Portão das Dungeons e complete a Fase 1 da semana nova.', tipo: 'fase', alvo: 1, qtd: 1, recompensa: { ouro: 80, xp: 80, itens: { pergaminho: 2 }, pontos: 150 } },
  q_beemote: { titulo: 'Dá-me este monte', desc: 'Derrote o Beemote no fundo do deserto.', tipo: 'boss', alvo: 'behemote', qtd: 1, recompensa: { ouro: 600, xp: 500, itens: { agua_viva: 2 }, pontos: 1500 } },
  q_golias: { titulo: 'O gigante de Gate', desc: 'Desça ao Vale de Elá e derrote Golias. Dica: apare a lança com a defesa perfeita para expor a testa.', tipo: 'boss', alvo: 'golias', qtd: 1, recompensa: { ouro: 650, xp: 550, itens: { agua_viva: 2, oleo: 2 }, pontos: 1600 } },
  q_leviata: { titulo: 'O monstro do mar', desc: 'Derrote o Leviatã na costa nordeste.', tipo: 'boss', alvo: 'leviata', qtd: 1, recompensa: { ouro: 700, xp: 600, itens: { agua_viva: 2 }, pontos: 1800 } }
};

export const LOJAS = {
  ferreiro: {
    nome: 'Oficina de Bezalel',
    itens: ['espada_bronze', 'espada_ferro', 'espada_gideao', 'funda_trancada', 'funda_benjamim', 'funda_davi',
      'cajado_amendoeira', 'cajado_eliseu', 'cajado_moises', 'trombeta_prata', 'trombeta_jerico', 'harpa_davi',
      'escudo_madeira', 'escudo_bronze', 'turbante', 'elmo_bronze', 'tunica_linho', 'gibao_couro', 'cota_malha',
      'espada_golias', 'arco_jonatas', 'vara_arao', 'cimbalos_asafe', 'escudo_ferro', 'escudo_salomao', 'elmo_ferro', 'couraca_golias',
      'sandalias', 'botas_viajante', 'botas_couro_fino', 'cinto_couro', 'cinto_sacerdote', 'anel_jose', 'manto_cores']
  },
  animais: { nome: 'Curral de Labão', itens: ['burrinho', 'ovelha', 'gato', 'cachorro', 'cavalo'] },
  provisoes: { nome: 'Tenda de Lídia', itens: ['pao', 'uvas', 'tamaras', 'peixe', 'agua_viva', 'mana', 'roma', 'mel', 'oleo', 'leite_mel', 'pergaminho'] }
};
