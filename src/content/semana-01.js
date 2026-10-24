// SEMANA 1 — Corinto: trabalho e missão (Atos 18:1-17)
// Para criar uma semana nova, copie este arquivo, troque o conteúdo e registre em content/index.js.
//
// Legenda dos mapas:  # parede  . chão  , chão decorado  W água  T obstáculo (coluna/árvore/caixote)
// = mesa/banca  C baú com quiz (dá chave)  E inimigo  N M O personagens  P início
// D porta do chefe (abre com 3 chaves)  B chefe  H fonte de cura

export default {
  id: 'semana-01',
  titulo: 'Corinto: Trabalho e Missão',
  estudo: 'Atos 18:1-17',
  resumo: 'Paulo chega a Corinto, trabalha fazendo tendas com Priscila e Áquila, ensina na sinagoga, recebe uma visão do Senhor e é levado ao tribunal de Gálio. Trabalho e missão andam juntos.',
  versiculo: { texto: 'Não temas; pelo contrário, fala e não te cales; porquanto eu estou contigo.', ref: 'Atos 18:9-10' },
  recompensaSemana: 'espada_espirito',
  // sala da semana no Salão das Dungeons: piso (tema) e o personagem que guia o jogador
  sala: 'agora',
  guia: { nome: 'Silas, o Guia', look: { skin: '#C68B59', hair: '#2B1A10', tunic: '#1F8A9E', cape: '#F2C14E', style: 'curto', beard: true } },
  fases: [
    {
      n: 1, nome: 'A Ágora de Corinto', ref: 'Atos 18:1', tema: 'agora', nivel: 1,
      objetivo: 'Ache 3 chaves nos baús e derrote Mamom.',
      licao: 'Corinto era uma cidade rica e cheia de ídolos. Paulo chegou sozinho, mas não sozinho: Deus estava com ele.',
      inimigos: ['preguica', 'distracao', 'ganancia'], chefe: 'mamom', recompensa: 'cinto_verdade',
      versiculo: { texto: 'Depois disto, Paulo saiu de Atenas e foi para Corinto.', ref: 'Atos 18:1' },
      npcs: {
        N: { nome: 'Mercador', look: { skin: '#D9A273', hair: '#3A2314', tunic: '#C0392B', cape: 'none', style: 'turbante', beard: true }, falas: ['Bem-vindo à Ágora! Aqui se vende de tudo… até ídolos de prata.', 'Ouvi dizer que um tal Paulo chegou de Atenas. Fala de um Deus que não se compra.'] },
        M: { nome: 'Paulo', look: { skin: '#C68B59', hair: '#6A5A4A', tunic: '#B9875A', cape: 'none', style: 'careca', beard: true }, falas: ['Acabei de chegar de Atenas. Esta cidade precisa conhecer Jesus.', 'Cuidado com Mamom, o espírito da ganância. Ele guarda o salão no norte. Ache as 3 chaves!'] }
      },
      quiz: [
        { q: 'De qual cidade Paulo veio antes de chegar a Corinto? (At 18:1)', a: ['Atenas', 'Roma', 'Jerusalém'] },
        { q: 'Em qual livro da Bíblia está essa história?', a: ['Atos dos Apóstolos', 'Romanos', 'Gênesis'] },
        { q: 'Corinto ficava em qual região?', a: ['Grécia (Acaia)', 'Egito', 'Galileia'] },
        { q: 'Onde podemos mostrar o caráter de Cristo?', a: ['Na escola, no trabalho e em casa', 'Só dentro da igreja', 'Só no domingo'] },
        { q: 'Mateus 6:24 diz que não podemos servir a Deus e a…', a: ['Mamom (o dinheiro)', 'César', 'Moisés'] },
        { q: 'Quem escreveu duas cartas aos Coríntios?', a: ['Paulo', 'Pedro', 'João'] }
      ],
      mapa: [
        '########################################',
        '#############..............#############',
        '##########....................##########',
        '########...T......B.......T.....########',
        '########........................########',
        '##########....................##########',
        '#############......H.......#############',
        '#################..DD..#################',
        '#........,,,,,.....,,......,,,,,.......#',
        '#..C..TT.,,,,,..E..,,..==..,,,,,..TT.C.#',
        '#.....TT..........................TT...#',
        '#..........E.............E.............#',
        '#.....######......WWWW......######.....#',
        '#.....#....#......WWWW......#....#..E..#',
        '#..E..#.C..#......WWWW......#.N..#.....#',
        '#.....#....#................#....#.....#',
        '#.....##.###....TT....TT....###.##.....#',
        '#...............TT....TT...............#',
        '#..==......E...............E.......==..#',
        '#..==..............C...............==..#',
        '#.......,,,,,,..........,,,,,,.........#',
        '#...E...,,,,,,....M.....,,,,,,....E....#',
        '#......................................#',
        '#..TT.......==......P.......==.....TT..#',
        '#..TT..................................#',
        '########################################'
      ]
    },
    {
      n: 2, nome: 'A Oficina de Tendas', ref: 'Atos 18:2-3', tema: 'oficina', nivel: 3,
      objetivo: 'Converse com Priscila e Áquila, ache 3 chaves e vença a Procrastinação.',
      licao: 'Paulo trabalhava com as mãos para se sustentar. O trabalho bem feito também é adoração a Deus.',
      inimigos: ['preguica', 'distracao', 'desanimo'], chefe: 'procrastinacao', recompensa: 'calcados_paz',
      versiculo: { texto: 'Como era do mesmo ofício, ficou com eles e trabalhava; pois eram fabricantes de tendas.', ref: 'Atos 18:3' },
      npcs: {
        N: { nome: 'Priscila', look: { skin: '#D9A273', hair: '#3A2314', tunic: '#8E44AD', cape: 'none', style: 'veu', beard: false }, falas: ['Fazemos tendas junto com o Paulo. O trabalho também é lugar de servir a Deus!', 'A Procrastinação vive dizendo "amanhã". Não deixe ela parar de apanhar, senão ela se recupera!'] },
        M: { nome: 'Áquila', look: { skin: '#B97A4E', hair: '#2B1A10', tunic: '#7A5232', cape: 'none', style: 'curto', beard: true }, falas: ['Saímos de Roma porque o imperador Cláudio expulsou os judeus.', 'Mas Deus usou isso para nos trazer até Paulo. Ele transforma o mal em bem.'] }
      },
      quiz: [
        { q: 'Como se chamava o casal que Paulo conheceu? (At 18:2)', a: ['Priscila e Áquila', 'Ananias e Safira', 'Isabel e Zacarias'] },
        { q: 'Por que Priscila e Áquila tinham saído de Roma?', a: ['Cláudio mandou os judeus saírem', 'Foram passar férias', 'Foram vender tendas'] },
        { q: 'Qual era a profissão de Paulo, Priscila e Áquila? (At 18:3)', a: ['Faziam tendas', 'Eram pescadores', 'Eram carpinteiros'] },
        { q: 'Áquila era natural de qual lugar?', a: ['Ponto', 'Tarso', 'Egito'] },
        { q: 'Provérbios 6:6 manda o preguiçoso olhar para…', a: ['A formiga', 'O leão', 'A águia'] },
        { q: 'Colossenses 3:23: façam tudo de todo o coração, como para…', a: ['O Senhor', 'O chefe', 'Os amigos'] }
      ],
      mapa: [
        '########################################',
        '#######..........................#######',
        '#######..T....................T..#######',
        '#######..........B...............#######',
        '#######..T....................T..#######',
        '#######...........H..............#######',
        '#################..DD..#################',
        '#.......#..........,,..........#.......#',
        '#..C....#..==..==..,,..==..==..#...E...#',
        '#.......#......................#.......#',
        '#...E...#..==..==..E...==..==..#....C..#',
        '#.......#......................#.......#',
        '####.####..........,,..........####.####',
        '#..................,,..................#',
        '#..TT.....E.....N......M.....E.....TT..#',
        '#..TT..............................TT..#',
        '#...........==............==...........#',
        '####.########.############.#########.###',
        '#.......#......#........#.......#......#',
        '#..E....#..C...#...TT...#...E...#..C...#',
        '#.......#......#...TT...#.......#......#',
        '#..............................E.......#',
        '#......,,,,,,.........P.....,,,,,,.....#',
        '#......................................#',
        '########################################'
      ]
    },
    {
      n: 3, nome: 'A Sinagoga', ref: 'Atos 18:4-6', tema: 'sinagoga', nivel: 5,
      objetivo: 'Ouça Paulo, ache 3 chaves e desmascare a Mentira.',
      licao: 'Paulo anunciava a verdade todo sábado, mesmo quando resistiam. A Mentira se disfarça — só a verdade revela quem ela é.',
      inimigos: ['desanimo', 'duvida', 'inveja'], chefe: 'mentira', recompensa: 'couraca_justica',
      versiculo: { texto: 'E todos os sábados discorria na sinagoga, persuadindo judeus e gregos.', ref: 'Atos 18:4' },
      npcs: {
        N: { nome: 'Paulo', look: { skin: '#C68B59', hair: '#6A5A4A', tunic: '#B9875A', cape: 'none', style: 'careca', beard: true }, falas: ['Todo sábado eu ensino aqui. Judeus e gregos precisam ouvir!', 'A Mentira cria cópias iguaizinhas. Não dá para saber olhando: golpeie! A cópia se desfaz com um toque; a verdadeira, não.'] },
        M: { nome: 'Silas', look: { skin: '#B97A4E', hair: '#1C120A', tunic: '#2E8B57', cape: '#ECE3CF', style: 'curto', beard: true }, falas: ['Timóteo e eu chegamos da Macedônia. Agora Paulo pode se dedicar só à Palavra!'] },
        O: { nome: 'Timóteo', look: { skin: '#E3B48C', hair: '#6B4423', tunic: '#1F8A9E', cape: 'none', style: 'curto', beard: false }, falas: ['Paulo diz que ninguém deve desprezar minha juventude (1Tm 4:12). Vale pra você também!'] }
      },
      quiz: [
        { q: 'Onde Paulo ensinava todos os sábados? (At 18:4)', a: ['Na sinagoga', 'No mercado', 'No teatro'] },
        { q: 'Quem Paulo procurava convencer?', a: ['Judeus e gregos', 'Só os soldados', 'Só os romanos'] },
        { q: 'Quem chegou da Macedônia? (At 18:5)', a: ['Silas e Timóteo', 'Pedro e João', 'Barnabé e Marcos'] },
        { q: 'O que Paulo fez quando resistiram e blasfemaram? (At 18:6)', a: ['Sacudiu as vestes', 'Desistiu de pregar', 'Voltou para Atenas'] },
        { q: 'Em João 8:44, Jesus chama o diabo de pai da…', a: ['Mentira', 'Preguiça', 'Inveja'] },
        { q: 'Efésios 4:25: deixem a mentira e falem a…', a: ['Verdade', 'Qualquer coisa', 'Metade'] }
      ],
      mapa: [
        '########################################',
        '#####..............................#####',
        '#####..S......S........S......S....#####',
        '#####..............B...............#####',
        '#####..S......S........S......S....#####',
        '#####..............H...............#####',
        '#################..DD..#################',
        '#L.................,,................L.#',
        '#.....C............N.............C.....#',
        '#......................................#',
        '#..====..====..====..====..====..====..#',
        '#..........E.....................E.....#',
        '#..====..====..====..====..====..====..#',
        '#......................................#',
        '#..====..====..====..====..====..====..#',
        '#....E...........M...O..........E......#',
        '#####.######.##########.#######.####.###',
        '#......#.......#......#......#.........#',
        '#..C...#...E...#..TT..#..E...#....C....#',
        '#......#.......#......#......#.........#',
        '#..........E..........................E#',
        '#L...................P...............L.#',
        '########################################'
      ]
    },
    {
      n: 4, nome: 'A Casa de Tício Justo', ref: 'Atos 18:7-11', tema: 'casa', nivel: 7,
      objetivo: 'Ache 3 chaves e fuja da Imoralidade — esquivar quebra o encanto!',
      licao: 'O Senhor disse a Paulo: "Não temas, fala!". Corinto era famosa pela imoralidade, e Paulo ensinou: fujam dela — o corpo é templo do Espírito.',
      inimigos: ['inveja', 'ira', 'medo'], chefe: 'imoralidade', recompensa: 'escudo_fe',
      versiculo: { texto: 'Fugi da imoralidade… acaso não sabeis que o vosso corpo é santuário do Espírito Santo?', ref: '1 Coríntios 6:18-19' },
      npcs: {
        N: { nome: 'Tício Justo', look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#ECE3CF', cape: '#3B4CCA', style: 'curto', beard: true }, falas: ['Minha casa fica ao lado da sinagoga. Paulo ensina aqui agora!', 'Eu temia a Deus mesmo sendo gentio. Deus abre portas para todos.'] },
        M: { nome: 'Crispo', look: { skin: '#C68B59', hair: '#1C120A', tunic: '#2C3E50', cape: '#F2C14E', style: 'turbante', beard: true }, falas: ['Eu era o chefe da sinagoga. Cri no Senhor com toda a minha casa! (At 18:8)'] },
        O: { nome: 'Anjo', look: { skin: '#F2D0B0', hair: '#F2C14E', tunic: '#FFFFFF', cape: 'none', style: 'longo', beard: false, anjo: true }, falas: ['O Senhor disse em visão: "Não temas; fala e não te cales, porque eu estou contigo".', 'A Imoralidade puxa você para perto. Não lute contra o encanto: FUJA! Use a esquiva.'] }
      },
      quiz: [
        { q: 'Para a casa de quem Paulo foi? (At 18:7)', a: ['Tício Justo', 'Gálio', 'Sóstenes'] },
        { q: 'Quem creu no Senhor com toda a sua casa? (At 18:8)', a: ['Crispo, chefe da sinagoga', 'Áquila', 'O carcereiro'] },
        { q: 'O que o Senhor disse a Paulo em visão? (At 18:9)', a: ['"Não temas; fala e não te cales"', '"Fuja da cidade"', '"Pare de pregar"'] },
        { q: 'Quanto tempo Paulo ficou em Corinto ensinando? (At 18:11)', a: ['Um ano e seis meses', 'Três dias', 'Dez anos'] },
        { q: 'O que 1 Coríntios 6:18 manda fazer com a imoralidade?', a: ['Fugir', 'Negociar', 'Esconder'] },
        { q: 'Segundo 1Co 6:19, nosso corpo é…', a: ['Santuário do Espírito Santo', 'Só nosso', 'Sem importância'] }
      ],
      mapa: [
        '########################################',
        '######............................######',
        '######..TT....................TT..######',
        '######...........B................######',
        '######..TT....................TT..######',
        '######.............H..............######',
        '#################..DD..#################',
        '#,,,,,,,,,,,,,,,,..,,..,,,,,,,,,,,,,,,,#',
        '#,..C...,,,,TT,,,,,,,,,,,,TT,,,,...C..,#',
        '#,......,,,,,,,,,,,,,,,,,,,,,,,,......,#',
        '#,,,,E,,,,,,,,,,,,,O,,,,,,,,,,,,,,E,,,,#',
        '#########.##########.###########.#######',
        '#...........#.............#............#',
        '#..==..E....#..N.......M..#....E..==...#',
        '#..==.......#.............#.......==...#',
        '#...........#....==..==...#............#',
        '#.....C.....#.............#.....C......#',
        '#####.#############.###########.########',
        '#......................................#',
        '#..TT....WWW.....E.......WWW.....TT....#',
        '#..TT....WWW.............WWW.....TT....#',
        '#.....E...........P..........E.........#',
        '########################################'
      ]
    },
    {
      n: 5, nome: 'O Tribunal de Gálio', ref: 'Atos 18:12-17', tema: 'tribunal', nivel: 9,
      objetivo: 'Ache 3 chaves e vença o Acusador com a Palavra de Deus.',
      licao: 'Levaram Paulo ao tribunal com acusações, mas Deus o protegeu como prometeu. Satanás acusa — Jesus defende. Responda às acusações com a Bíblia!',
      inimigos: ['duvida', 'ira', 'medo', 'orgulho'], chefe: 'satanas', recompensa: 'capacete_salvacao',
      versiculo: { texto: 'Foi expulso o acusador de nossos irmãos… Eles o venceram pelo sangue do Cordeiro e pela palavra do seu testemunho.', ref: 'Apocalipse 12:10-11' },
      npcs: {
        N: { nome: 'Gálio', look: { skin: '#F2D0B0', hair: '#B8863B', tunic: '#ECE3CF', cape: '#8E1B2E', style: 'curto', beard: false }, falas: ['Sou Gálio, procônsul da Acaia. Não vou julgar questões de palavras e nomes da vossa lei!'] },
        M: { nome: 'Sóstenes', look: { skin: '#C68B59', hair: '#3A2314', tunic: '#2C3E50', cape: 'none', style: 'turbante', beard: true }, falas: ['Eu era o chefe da sinagoga e acusei Paulo… Mais tarde, me tornei irmão dele na fé (1Co 1:1).'] },
        O: { nome: 'Priscila', look: { skin: '#D9A273', hair: '#3A2314', tunic: '#8E44AD', cape: 'none', style: 'veu', beard: false }, falas: ['O Acusador mente sobre você. Quando ele acusar, responda com o versículo certo!'] }
      },
      quiz: [
        { q: 'Quem era o procônsul da Acaia? (At 18:12)', a: ['Gálio', 'Pilatos', 'Félix'] },
        { q: 'Do que acusaram Paulo diante do tribunal? (At 18:13)', a: ['De persuadir a adorar a Deus contra a lei', 'De roubar tendas', 'De não pagar impostos'] },
        { q: 'O que Gálio fez com a acusação? (At 18:14-16)', a: ['Recusou julgar e os mandou embora', 'Prendeu Paulo', 'Expulsou Paulo da cidade'] },
        { q: 'Quem foi espancado diante do tribunal? (At 18:17)', a: ['Sóstenes', 'Silas', 'Crispo'] },
        { q: 'Em Apocalipse 12:10, Satanás é chamado de…', a: ['O acusador dos irmãos', 'O juiz', 'O pastor'] },
        { q: 'Como venceram o acusador? (Ap 12:11)', a: ['Pelo sangue do Cordeiro e pelo testemunho', 'Com força própria', 'Fugindo para longe'] }
      ],
      mapa: [
        '########################################',
        '####................................####',
        '####..S....S....S....S....S....S....####',
        '####................................####',
        '####..............B.................####',
        '####................................####',
        '####..S....S....S....S....S....S....####',
        '####...............H................####',
        '#################..DD..#################',
        '#......................................#',
        '#..C....S......S..N...S......S....C....#',
        '#.........E.....................E......#',
        '#..====....====....====....====....==..#',
        '#......................................#',
        '#.E....S......S...M....S......S......E.#',
        '######.#######.#########.#######.#######',
        '#.......#..........O..........#........#',
        '#..C....#...E.............E...#....C...#',
        '#.......#.....TT........TT....#........#',
        '#..............................E.......#',
        '#..E..............P....................#',
        '########################################'
      ]
    }
  ]
};
