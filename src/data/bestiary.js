// Inimigos comuns (vícios) e chefes. ai: chase | hop | ranged | charge | blink | thief
// "licao" aparece quando o inimigo é vencido pela primeira vez.
export const ENEMIES = {
  preguica: { nome: 'Preguiça', lv: 1, hp: 26, atk: 6, def: 0, spd: 58, r: 14, xp: 8, ouro: 3, cor: '#7FB069', cor2: '#4E7A3A', ai: 'chase', licao: 'Vai ter com a formiga, ó preguiçoso (Pv 6:6).' },
  distracao: { nome: 'Distração', lv: 1, hp: 20, atk: 5, def: 0, spd: 112, r: 12, xp: 8, ouro: 3, cor: '#F06FB4', cor2: '#A33C78', ai: 'hop', licao: 'Pensai nas coisas lá do alto (Cl 3:2).' },
  desanimo: { nome: 'Desânimo', lv: 3, hp: 48, atk: 9, def: 1, spd: 72, r: 15, xp: 16, ouro: 6, cor: '#8E98BE', cor2: '#545D80', ai: 'chase', licao: 'Não nos cansemos de fazer o bem (Gl 6:9).' },
  inveja: { nome: 'Inveja', lv: 4, hp: 55, atk: 11, def: 2, spd: 96, r: 14, xp: 20, ouro: 7, cor: '#6CCB5F', cor2: '#2F7A2A', ai: 'chase', licao: 'O amor não inveja (1Co 13:4).' },
  ganancia: { nome: 'Ganância', lv: 5, hp: 62, atk: 10, def: 2, spd: 120, r: 13, xp: 24, ouro: 18, cor: '#F2C14E', cor2: '#B8791A', ai: 'thief', licao: 'O amor ao dinheiro é raiz de todos os males (1Tm 6:10).' },
  duvida: { nome: 'Dúvida', lv: 5, hp: 50, atk: 12, def: 1, spd: 80, r: 14, xp: 24, ouro: 8, cor: '#8B6AD6', cor2: '#4A3384', ai: 'ranged', licao: 'Peça com fé, sem duvidar (Tg 1:6).' },
  ira: { nome: 'Ira', lv: 6, hp: 80, atk: 16, def: 3, spd: 90, r: 16, xp: 32, ouro: 10, cor: '#FF5A3C', cor2: '#A4241A', ai: 'charge', licao: 'Irai-vos e não pequeis (Ef 4:26).' },
  medo: { nome: 'Medo', lv: 7, hp: 70, atk: 15, def: 2, spd: 100, r: 14, xp: 36, ouro: 11, cor: '#4B4E6D', cor2: '#1E2036', ai: 'blink', licao: 'Não temas, porque eu sou contigo (Is 41:10).' },
  orgulho: { nome: 'Orgulho', lv: 9, hp: 150, atk: 20, def: 5, spd: 62, r: 22, xp: 60, ouro: 20, cor: '#C79BFF', cor2: '#6E3FB0', ai: 'charge', licao: 'A soberba precede a ruína (Pv 16:18).' },
  vaidade: { nome: 'Vaidade', lv: 11, hp: 140, atk: 22, def: 6, spd: 105, r: 15, xp: 70, ouro: 22, cor: '#9FE6F0', cor2: '#3A8C99', ai: 'ranged', licao: 'Vaidade de vaidades, tudo é vaidade (Ec 1:2).' }
};

// Chefes. Os de fase surgem na arena da fase; os de mundo têm "mundo" (onde moram, em tiles) e "respawn".
//
// COMO O CHEFE LUTA (tudo em dados; o comportamento de cada golpe fica em game/bossMoves.js):
//   golpes: { nomeLivre: { tipo, ...números } }  tipos: anel, investida, invocar, raios, clones, trocar, leque, rajada,
//           marcados, chuva, pisao, pocas, encanto, mergulho, onda
//   fases:  [{ vida?: 0.5, quando?: 'temClones', golpes: ['nomeLivre', ...], mover: { tipo: 'perseguir'|'rodear'|'parado', vel }, grito?, corGrito?, tremor? }]
//           Vale a ÚLTIMA fase da lista cuja vida (fração ≤) e condição batem. Repetir um golpe na lista = ele sai mais vezes.
//   regras: { aura, regenera, acusacoes, fugaVulneravel } — passivas da luta toda (a lição do chefe costuma morar aqui)
//   contato: dano ao encostar (fração do ataque, padrão 0.6) · desenho: id de um desenho de draw.js (padrão: o próprio id;
//            sem desenho próprio, usa um genérico com cor, cor2 e "simbolo")
// Uma semana pode trazer chefes novos no campo "chefes" do arquivo da semana (ver content/index.js).
export const BOSSES = {
  mamom: {
    nome: 'Mamom, a Ganância', titulo: 'Subchefe', lv: 4, hp: 520, atk: 14, def: 3, spd: 110, r: 30, xp: 220, ouro: 140,
    cor: '#F2C14E', cor2: '#8A5A0A', ref: 'Mateus 6:24',
    intro: 'Tudo em Corinto tem preço! Sirva a mim e terá riquezas!',
    derrota: '"Ninguém pode servir a dois senhores." Você escolheu servir a Deus.',
    golpes: {
      moedas: { tipo: 'anel', n: 12, vel: 230, cor: '#FFD23F', som: 'coin', espera: 1.6 },
      investida: { tipo: 'investida', vel: 520, dur: 0.7 },
      chamar: { tipo: 'invocar', tipos: ['ganancia'], n: 2, forca: 1.2, fala: 'Mais! Mais!', corFala: '#FFD23F' }
    },
    fases: [
      { golpes: ['moedas', 'investida'], mover: { tipo: 'perseguir' } },
      { vida: 0.5, golpes: ['moedas', 'investida', 'chamar'], mover: { tipo: 'perseguir' } }
    ]
  },
  procrastinacao: {
    nome: 'Procrastinação', titulo: 'Subchefe', lv: 6, hp: 780, atk: 16, def: 4, spd: 70, r: 32, xp: 320, ouro: 180,
    cor: '#7FA7B5', cor2: '#3C5A66', ref: 'Eclesiastes 11:4',
    intro: 'Pra que trabalhar hoje? Deixa pra amanhã… e depois de amanhã…',
    derrota: '"Tudo o que fizerem, façam de todo o coração" (Cl 3:23). Fazer hoje venceu o "amanhã".',
    regras: {
      aura: { raio: 190, lentidao: 0.55, falas: ['amanhã…', 'depois…', 'só 5 minutinhos…'] },
      regenera: { apos: 3.5, taxa: 0.025, texto: 'Adiando… (+vida)' } // se você parar de bater, ela se recupera
    },
    golpes: {
      relogio: { tipo: 'raios', alcance: 240, giro: 1.6, dur: 3.6, espera: 1.4 },
      chamar: { tipo: 'invocar', tipos: ['preguica', 'distracao'], n: 3, forca: 1.4, espalha: 80, espera: 2.2 }
    },
    fases: [{ golpes: ['relogio', 'relogio', 'chamar'], mover: { tipo: 'perseguir', vel: 0.6 } }]
  },
  mentira: {
    nome: 'Mentira', titulo: 'Subchefe', lv: 8, hp: 900, atk: 18, def: 5, spd: 95, r: 28, xp: 420, ouro: 220,
    cor: '#9B59B6', cor2: '#4A1C5E', ref: 'João 8:44',
    intro: 'Ninguém vai acreditar nesse Jesus… Qual de nós é o verdadeiro? Hahaha!',
    derrota: '"Conhecereis a verdade, e a verdade vos libertará" (Jo 8:32).',
    golpes: {
      copias: { tipo: 'clones', n: 4, fala: 'Qual é o verdadeiro?', corFala: '#E6DBFF', espera: 0.8 },
      trocar: { tipo: 'trocar' },
      mentiras: { tipo: 'leque', n: 5, abertura: 0.22, vel: 260, cor: '#C79BFF', rotulo: 'falsas' }
    },
    fases: [
      { golpes: ['copias', 'mentiras'], mover: { tipo: 'rodear', dist: 200 } },
      { quando: 'temClones', golpes: ['mentiras', 'trocar', 'mentiras', 'trocar'], mover: { tipo: 'rodear', dist: 220 } },
      { vida: 0.5, golpes: ['copias', 'mentiras', 'copias'], mover: { tipo: 'rodear', dist: 220, vel: 1.2 } },
      { vida: 0.5, quando: 'temClones', golpes: ['mentiras', 'trocar', 'trocar', 'mentiras'], mover: { tipo: 'rodear', dist: 220, vel: 1.2 } }
    ]
  },
  imoralidade: {
    nome: 'Imoralidade Sexual', titulo: 'Subchefe', lv: 10, hp: 1100, atk: 20, def: 6, spd: 85, r: 32, xp: 520, ouro: 260,
    cor: '#D2416E', cor2: '#5E1230', ref: '1 Coríntios 6:18',
    intro: 'Chegue mais perto… ninguém está olhando…',
    derrota: '"Fugi da imoralidade… o vosso corpo é santuário do Espírito Santo" (1Co 6:18-19).',
    regras: { fugaVulneravel: 3 }, // fugir do encanto com a esquiva deixa ela vulnerável por 3s
    golpes: {
      encanto: { tipo: 'encanto', alcance: 320, duracao: 2.4, fala: 'Chegue mais perto…', corFala: '#FFB3D1' },
      pocas: { tipo: 'pocas', n: 4, raioArea: 56, duracao: 3.2, dano: 0.5, cor: '210,65,110' }
    },
    fases: [
      { golpes: ['encanto', 'pocas'], mover: { tipo: 'perseguir', vel: 0.5 } },
      { vida: 0.6, golpes: ['encanto', 'pocas', 'encanto'], mover: { tipo: 'perseguir', vel: 0.5 } }
    ]
  },
  satanas: {
    nome: 'Satanás, o Acusador', titulo: 'Chefe', lv: 12, hp: 1800, atk: 24, def: 7, spd: 90, r: 40, xp: 1000, ouro: 500,
    cor: '#8E1B2E', cor2: '#14060F', ref: 'Apocalipse 12:10',
    intro: 'Eu acuso você dia e noite! Você não merece estar aqui!',
    derrota: '"Eles o venceram pelo sangue do Cordeiro e pela palavra do seu testemunho" (Ap 12:11).',
    regras: { acusacoes: { marcas: [0.75, 0.5, 0.25] } }, // batalha de versículos nessas porcentagens de vida
    golpes: {
      fogo: { tipo: 'rajada', vezes: 3, intervalo: 0.35, angulos: [-0.25, 0, 0.25], vel: 300, raio: 9, cor: '#FF5A3C', espera: 1.3 },
      golpes: { tipo: 'marcados', vezes: 3, intervalo: 0.5, raioArea: 74, dano: 1.4 },
      servos: { tipo: 'invocar', tipos: ['duvida', 'medo', 'ira'], n: 2, forca: 1.5, espalha: 90, fala: 'Venham, meus servos!', corFala: '#FF8A8A' }
    },
    fases: [
      { golpes: ['fogo', 'golpes', 'fogo'], mover: { tipo: 'perseguir', vel: 0.7 } },
      { vida: 0.5, golpes: ['fogo', 'golpes', 'servos'], mover: { tipo: 'perseguir', vel: 0.7 } }
    ]
  },
  behemote: {
    nome: 'Beemote', titulo: 'Chefe do Mundo', lv: 14, hp: 5400, atk: 34, def: 12, spd: 92, r: 46, xp: 900, ouro: 400,
    cor: '#7A6A4F', cor2: '#3D3325', ref: 'Jó 40:15', respawn: 480, drop: 'osso_bronze', mundo: { tx: 152, ty: 100 },
    intro: '*O chão treme. Uma criatura enorme se levanta do deserto.*',
    derrota: 'Só o Criador pode chegar até ele com a espada (Jó 40:19). Deus é maior que qualquer gigante.',
    golpes: {
      investida: { tipo: 'investida', vel: 600, dur: 0.9 },
      investida2: { tipo: 'investida', vel: 680, dur: 0.9, repete: 1 },
      pedras: { tipo: 'chuva', n: 5, fala: 'O chão treme…', corFala: '#FFB37A', espera: 1.1 },
      pedras2: { tipo: 'chuva', n: 8, fala: 'O chão treme…', corFala: '#FFB37A', espera: 0.6 },
      pisao: { tipo: 'pisao', ondas: 2, vel: 240, espera: 1.2 },
      pisao2: { tipo: 'pisao', ondas: 3, vel: 270, espera: 0.7 }
    },
    fases: [
      { golpes: ['investida', 'pisao', 'pedras', 'investida'], mover: { tipo: 'perseguir', vel: 0.55 } },
      { vida: 0.5, grito: 'O BEEMOTE ESTÁ FURIOSO!', corGrito: '#FF8A3C', tremor: 16,
        golpes: ['investida2', 'pisao2', 'pedras2', 'investida2', 'pedras2'], mover: { tipo: 'perseguir', vel: 0.75 } }
    ]
  },
  // Lição: não é a armadura nem a força que vencem o gigante (1Sm 17:39,45). Bater na armadura quase não adianta;
  // só quem espera a lança e defende no momento certo (defesa perfeita) faz a testa aparecer — e a funda acerta em dobro (1Sm 17:49).
  golias: {
    nome: 'Golias de Gate', titulo: 'Chefe do Mundo', lv: 11, hp: 3400, atk: 30, def: 10, spd: 70, r: 44, xp: 800, ouro: 360,
    cor: '#B08D57', cor2: '#5A4630', ref: '1 Samuel 17', respawn: 420, drop: 'pedra_lisa', mundo: { tx: 78, ty: 119 },
    intro: 'Sou eu algum cão, para vires a mim com paus? (1Sm 17:43)',
    derrota: '"Tu vens contra mim com espada e lança; eu, porém, vou contra ti em nome do Senhor dos Exércitos" (1Sm 17:45). A batalha é do Senhor!',
    regras: {
      armadura: { reducao: 0.9, golpes: ['lanca', 'lanca2'], nomeGolpe: 'lança', exposto: 2.2, atordoa: 0.9, bonus: 1.25, bonusArma: { funda: 1.6 }, texto: 'A TESTA ESTÁ EXPOSTA!' }
    },
    golpes: {
      lanca: { tipo: 'estocada', aviso: 0.8, alcance: 180, avanco: 50, dano: 1.3 },
      lanca2: { tipo: 'estocada', aviso: 0.65, alcance: 190, avanco: 60, dano: 1.3, repete: 2 },
      pisao: { tipo: 'pisao', ondas: 2, vel: 230, espera: 1.1 },
      dardo: { tipo: 'rajada', vezes: 2, intervalo: 0.5, angulos: [-0.15, 0.15], vel: 330, raio: 8, cor: '#C9A46A', espera: 1.2 }, // "dardo de bronze" (1Sm 17:6)
      desafio: { tipo: 'invocar', tipos: ['medo'], n: 2, forca: 1.3, espalha: 90, fala: 'Dai-me um homem, para que lutemos! (1Sm 17:10)', corFala: '#FFB37A' }
    },
    fases: [
      { golpes: ['lanca', 'lanca', 'pisao', 'dardo'], mover: { tipo: 'perseguir', vel: 0.6 } },
      { vida: 0.6, golpes: ['lanca', 'lanca', 'pisao', 'dardo', 'desafio'], mover: { tipo: 'perseguir', vel: 0.65 } },
      { vida: 0.3, grito: 'O GIGANTE SE ENFURECE!', corGrito: '#FF8A3C', tremor: 14,
        golpes: ['lanca2', 'lanca2', 'pisao', 'dardo', 'desafio'], mover: { tipo: 'perseguir', vel: 0.8 } }
    ]
  },
  leviata: {
    nome: 'Leviatã', titulo: 'Chefe do Mundo', lv: 17, hp: 6200, atk: 37, def: 13, spd: 0, r: 44, xp: 1100, ouro: 480,
    cor: '#1F6F8B', cor2: '#0B2A36', ref: 'Isaías 27:1', respawn: 540, drop: 'escama_leviata', mundo: { tx: 141, ty: 47 },
    ancoras: { area: [128, 30, 160, 64] }, // água perto da margem onde ele pode ressurgir (tiles x0, y0, x1, y1)
    intro: '*O mar ferve. Escamas brilham sob as ondas.*',
    derrota: '"Naquele dia o Senhor castigará o Leviatã, a serpente veloz" (Is 27:1).',
    golpes: {
      jatos: { tipo: 'rajada', vezes: 5, intervalo: 0.32, desvio: 0.12, vel: 360, raio: 11, cor: '#5ED1E8', espera: 1.1 },
      jatos2: { tipo: 'rajada', vezes: 7, intervalo: 0.32, angulos: [-0.25, 0, 0.25], desvio: 0.12, vel: 360, raio: 11, cor: '#5ED1E8', espera: 0.7 },
      mergulho: { tipo: 'mergulho' },
      onda: { tipo: 'onda', dur: 1.4, espera: 1.1 },
      onda2: { tipo: 'onda', repete: true, dur: 2.1, espera: 0.7 },
      redemoinho: { tipo: 'pocas', n: 3, espalhaX: 120, espalhaY: 90, raioArea: 60, duracao: 3.5, dano: 0.45, cor: '90,200,230', dur: 1.3, espera: 1.2 },
      redemoinho2: { tipo: 'pocas', n: 4, espalhaX: 120, espalhaY: 90, raioArea: 60, duracao: 3.5, dano: 0.45, cor: '90,200,230', dur: 1.3, espera: 0.8 }
    },
    fases: [
      { golpes: ['jatos', 'mergulho', 'onda', 'redemoinho', 'jatos'], mover: { tipo: 'parado' } },
      { vida: 0.5, grito: 'O MAR SE REVOLTA!', corGrito: '#5ED1E8', tremor: 14,
        golpes: ['jatos2', 'mergulho', 'onda2', 'redemoinho2', 'jatos2', 'redemoinho2'], mover: { tipo: 'parado' } }
    ]
  },
  pecado: {
    nome: '???', titulo: 'Secreto', lv: 99, hp: 99999, atk: 40, def: 99, spd: 120, r: 26,
    cor: '#0A0A0F', cor2: '#000000', ref: 'Gênesis 4:7'
  }
};

// Respostas para as acusações do Satanás (o certo é o versículo; mentiras usadas como alternativas erradas).
export const ACUSACOES = [
  { lie: 'Você não consegue nada. Desista!', v: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13' },
  { lie: 'Deus já se esqueceu de você.', v: 'Nunca te deixarei, nem te desampararei.', ref: 'Hebreus 13:5' },
  { lie: 'Seu trabalho e seus estudos não importam para Deus.', v: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor.', ref: 'Colossenses 3:23' },
  { lie: 'Tenha medo! Você é fraco demais.', v: 'Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.', ref: '2 Timóteo 1:7' },
  { lie: 'Seus erros não têm perdão.', v: 'Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar.', ref: '1 João 1:9' },
  { lie: 'Você está sozinho nessa luta.', v: 'Eu estou com vocês todos os dias, até o fim dos tempos.', ref: 'Mateus 28:20' },
  { lie: 'Só o dinheiro e as coisas importam.', v: 'Nem só de pão viverá o homem, mas de toda palavra que sai da boca de Deus.', ref: 'Mateus 4:4' },
  { lie: 'Cale-se! Ninguém quer ouvir sobre Jesus.', v: 'Não temas; pelo contrário, fala e não te cales, porque eu estou contigo.', ref: 'Atos 18:9-10' },
  { lie: 'Você é condenado. Não há saída.', v: 'Nenhuma condenação há para os que estão em Cristo Jesus.', ref: 'Romanos 8:1' }
];
export const FALSAS = [
  'Faça o que quiser, ninguém está vendo.', 'Deus ajuda só quem é perfeito.', 'Amanhã você muda, hoje pode.',
  'Você precisa ganhar o céu sozinho.', 'Fé é só para domingo.', 'Quem tem mais, vale mais.',
  'Esconda seus erros e tudo bem.', 'Desista, os outros são melhores.'
];
