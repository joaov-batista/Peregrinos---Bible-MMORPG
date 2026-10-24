// SEMANA 1 — Corinto: trabalho e missão (Atos 18:1-17)
// Para criar uma semana nova, copie este arquivo, troque o conteúdo e registre em content/index.js.
//
// Legenda dos mapas:  # parede  . chão  , chão decorado  W água  T obstáculo (coluna/árvore/caixote)
// = mesa/banca  C baú com quiz (dá chave)  E inimigo  N M O personagens  P início
// D porta do chefe (abre com 3 chaves)  B chefe  H fonte de cura
//
// Quiz: a resposta certa é sempre a PRIMEIRA (o jogo embaralha). "porque" explica a resposta depois que o jogador responde.
// Use 10 a 15 perguntas por fase: cada baú sorteia uma, sem repetir até acabar.

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
        { q: 'De qual cidade Paulo veio antes de chegar a Corinto? (At 18:1)', a: ['Atenas', 'Roma', 'Jerusalém'], porque: 'Atos 18:1 diz que Paulo saiu de Atenas e foi para Corinto. Em Atenas ele tinha falado no Areópago (At 17:22).' },
        { q: 'Em qual livro da Bíblia está essa história?', a: ['Atos dos Apóstolos', 'Romanos', 'Gênesis'], porque: 'Atos dos Apóstolos foi escrito por Lucas e conta como o evangelho se espalhou depois que Jesus subiu ao céu.' },
        { q: 'Corinto ficava em qual região?', a: ['Grécia (Acaia)', 'Egito', 'Galileia'], porque: 'Corinto era a capital da província romana da Acaia, no sul da Grécia: uma cidade portuária, rica e cheia de gente de todo lugar.' },
        { q: 'Onde podemos mostrar o caráter de Cristo?', a: ['Na escola, no trabalho e em casa', 'Só dentro da igreja', 'Só no domingo'], porque: 'Paulo vivia a fé no trabalho, na sinagoga e nas casas. A fé não fica só no domingo: "tudo o que fizerem, façam em nome do Senhor Jesus" (Cl 3:17).' },
        { q: 'Mateus 6:24 diz que não podemos servir a Deus e a…', a: ['Mamom (o dinheiro)', 'César', 'Moisés'], porque: 'Mamom é a riqueza tratada como um senhor. Jesus disse que ninguém consegue servir a dois senhores ao mesmo tempo (Mt 6:24).' },
        { q: 'Quem escreveu duas cartas aos Coríntios?', a: ['Paulo', 'Pedro', 'João'], porque: 'Depois de fundar a igreja em Corinto, Paulo escreveu 1 e 2 Coríntios para ensinar e corrigir os irmãos de lá.' },
        { q: 'Por que Corinto era uma cidade tão movimentada?', a: ['Tinha dois portos e muito comércio', 'Era a capital de Israel', 'Ficava no meio do deserto'], porque: 'Corinto ficava num istmo entre dois mares, com os portos de Cencreia e Lequeu. Passava gente do mundo inteiro por lá.' },
        { q: 'Onde Jesus manda ajuntar tesouros? (Mt 6:19-20)', a: ['No céu', 'Num cofre bem guardado', 'Em lugar nenhum'], porque: 'Os tesouros da terra se estragam; os do céu ficam. "Onde está o teu tesouro, aí estará também o teu coração" (Mt 6:21).' },
        { q: '1 Timóteo 6:10 diz que o amor ao dinheiro é…', a: ['A raiz de todos os males', 'Um sinal de bênção', 'Uma virtude'], porque: 'O problema não é ter dinheiro, mas amá-lo acima de Deus e das pessoas.' },
        { q: 'Paulo chegou a Corinto sozinho. Quem estava com ele, segundo a promessa de Jesus? (Mt 28:20)', a: ['Jesus, todos os dias', 'Ninguém', 'Só os soldados romanos'], porque: 'Jesus prometeu: "Eu estou com vocês todos os dias, até o fim dos tempos". Paulo chegou sozinho, mas não abandonado.' },
        { q: 'Verdadeiro ou falso: Corinto era uma cidade cheia de ídolos e templos pagãos.', a: ['Verdadeiro', 'Falso'], porque: 'Corinto tinha muitos templos. Mesmo assim, Deus disse a Paulo: "tenho muito povo nesta cidade" (At 18:10).' },
        { q: 'Quanto Paulo cobrava para anunciar o evangelho em Corinto? (1Co 9:18)', a: ['Nada: pregava de graça', 'Um denário por dia', 'Metade do que ganhava'], porque: 'Paulo trabalhava com as próprias mãos para anunciar o evangelho de graça (1Co 9:18; At 18:3).' }
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
        { q: 'Como se chamava o casal que Paulo conheceu? (At 18:2)', a: ['Priscila e Áquila', 'Ananias e Safira', 'Isabel e Zacarias'], porque: 'Priscila e Áquila viraram grandes amigos e colaboradores de Paulo. Mais tarde ensinaram Apolo em Éfeso (At 18:26).' },
        { q: 'Por que Priscila e Áquila tinham saído de Roma?', a: ['Cláudio mandou os judeus saírem', 'Foram passar férias', 'Foram vender tendas'], porque: 'O imperador Cláudio mandou os judeus saírem de Roma (At 18:2), por volta do ano 49 d.C.' },
        { q: 'Qual era a profissão de Paulo, Priscila e Áquila? (At 18:3)', a: ['Faziam tendas', 'Eram pescadores', 'Eram carpinteiros'], porque: 'Eram fabricantes de tendas (At 18:3), um trabalho com couro e tecido grosso. Paulo trabalhava com eles para se sustentar.' },
        { q: 'Áquila era natural de qual lugar?', a: ['Ponto', 'Tarso', 'Egito'], porque: 'Ponto era uma região no norte da atual Turquia, junto ao Mar Negro (At 18:2).' },
        { q: 'Provérbios 6:6 manda o preguiçoso olhar para…', a: ['A formiga', 'O leão', 'A águia'], porque: 'A formiga trabalha sem chefe mandando e guarda comida no verão para o inverno (Pv 6:6-8).' },
        { q: 'Colossenses 3:23: façam tudo de todo o coração, como para…', a: ['O Senhor', 'O chefe', 'Os amigos'], porque: 'Qualquer trabalho feito de coração e bem feito é feito para Deus, não só para as pessoas (Cl 3:23).' },
        { q: 'Em que dia Paulo deixava as tendas e ia ensinar na sinagoga? (At 18:4)', a: ['No sábado', 'Na segunda-feira', 'Só nas festas'], porque: 'Durante a semana ele fazia tendas; todo sábado discutia as Escrituras na sinagoga.' },
        { q: 'Eclesiastes 11:4: quem fica só observando o vento…', a: ['Nunca semeará', 'Terá colheita farta', 'Ficará rico'], porque: 'Quem espera o momento perfeito nunca começa. Essa é a Procrastinação: deixar tudo para depois.' },
        { q: '2 Tessalonicenses 3:10: se alguém não quer trabalhar…', a: ['Também não coma', 'Deve descansar mais', 'Deve pedir dinheiro'], porque: 'Paulo ensinou que o trabalho faz parte da vida cristã e deu o exemplo trabalhando dia e noite (2Ts 3:8).' },
        { q: 'Verdadeiro ou falso: Priscila também ensinava a Palavra junto com o marido.', a: ['Verdadeiro', 'Falso'], porque: 'Priscila e Áquila juntos explicaram "com mais exatidão o caminho de Deus" a Apolo (At 18:26).' },
        { q: 'Para onde Priscila e Áquila viajaram com Paulo depois de Corinto? (At 18:18-19)', a: ['Éfeso', 'Jerusalém', 'Babilônia'], porque: 'Eles foram com Paulo até Éfeso e ficaram lá ajudando a igreja.' },
        { q: 'Provérbios 13:4: o preguiçoso deseja, mas…', a: ['Nada alcança', 'Sempre consegue', 'Fica satisfeito'], porque: '"O preguiçoso deseja e coisa nenhuma alcança, mas a alma dos diligentes se farta" (Pv 13:4).' }
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
        { q: 'Onde Paulo ensinava todos os sábados? (At 18:4)', a: ['Na sinagoga', 'No mercado', 'No teatro'], porque: 'A sinagoga era o lugar onde os judeus se reuniam para ler e estudar as Escrituras todo sábado (At 18:4).' },
        { q: 'Quem Paulo procurava convencer?', a: ['Judeus e gregos', 'Só os soldados', 'Só os romanos'], porque: 'O evangelho é para todos: "primeiro do judeu e também do grego" (Rm 1:16).' },
        { q: 'Quem chegou da Macedônia? (At 18:5)', a: ['Silas e Timóteo', 'Pedro e João', 'Barnabé e Marcos'], porque: 'Silas e Timóteo chegaram da Macedônia (At 18:5). Com a ajuda deles, Paulo pôde se dedicar só à Palavra.' },
        { q: 'O que Paulo fez quando resistiram e blasfemaram? (At 18:6)', a: ['Sacudiu as vestes', 'Desistiu de pregar', 'Voltou para Atenas'], porque: 'Sacudir as vestes era um gesto de "não sou mais responsável por vocês". Depois disso ele foi pregar aos gentios (At 18:6).' },
        { q: 'Em João 8:44, Jesus chama o diabo de pai da…', a: ['Mentira', 'Preguiça', 'Inveja'], porque: 'Jesus disse que o diabo é mentiroso e pai da mentira (Jo 8:44). Toda mentira tenta nos afastar da verdade.' },
        { q: 'Efésios 4:25: deixem a mentira e falem a…', a: ['Verdade', 'Qualquer coisa', 'Metade'], porque: 'Quem segue a Cristo deixa a mentira e fala a verdade com o próximo, "porque somos membros uns dos outros" (Ef 4:25).' },
        { q: 'Qual era a mensagem principal de Paulo na sinagoga? (At 18:5)', a: ['Que Jesus é o Cristo', 'Que todos deviam ficar ricos', 'Que o templo seria reconstruído'], porque: 'Paulo mostrava pelas Escrituras que Jesus era o Cristo, o Messias prometido.' },
        { q: 'João 8:32: conhecereis a verdade, e a verdade vos…', a: ['Libertará', 'Condenará', 'Cansará'], porque: 'A verdade de Jesus liberta da mentira e do pecado.' },
        { q: 'Para quem Paulo disse que iria pregar depois de ser rejeitado? (At 18:6)', a: ['Para os gentios', 'Para os soldados de Roma', 'Para ninguém mais'], porque: 'Rejeitado por muitos na sinagoga, ele levou a mensagem aos gentios, os não judeus.' },
        { q: 'Verdadeiro ou falso: Timóteo era jovem quando trabalhava com Paulo.', a: ['Verdadeiro', 'Falso'], porque: 'Paulo escreveu a ele: "Ninguém despreze a tua mocidade" (1Tm 4:12).' },
        { q: 'Provérbios 12:22: os lábios mentirosos são…', a: ['Abomináveis ao Senhor', 'Sinal de esperteza', 'Sem importância'], porque: '"Os lábios mentirosos são abomináveis ao Senhor, mas os que agem fielmente são o seu prazer" (Pv 12:22).' },
        { q: 'Verdadeiro ou falso: a Mentira sempre se mostra feia e fácil de reconhecer.', a: ['Falso', 'Verdadeiro'], porque: 'A mentira se disfarça e parece verdade. Por isso precisamos conhecer bem a Palavra (2Co 11:14).' }
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
        { q: 'Para a casa de quem Paulo foi? (At 18:7)', a: ['Tício Justo', 'Gálio', 'Sóstenes'], porque: 'Tício Justo era um gentio que temia a Deus. A casa dele ficava ao lado da sinagoga (At 18:7).' },
        { q: 'Quem creu no Senhor com toda a sua casa? (At 18:8)', a: ['Crispo, chefe da sinagoga', 'Áquila', 'O carcereiro'], porque: 'Crispo, o chefe da sinagoga, creu no Senhor com toda a sua casa, e muitos coríntios também creram (At 18:8).' },
        { q: 'O que o Senhor disse a Paulo em visão? (At 18:9)', a: ['"Não temas; fala e não te cales"', '"Fuja da cidade"', '"Pare de pregar"'], porque: 'Deus falou com Paulo de noite, numa visão: "Não temas; fala e não te cales, porque eu estou contigo" (At 18:9-10).' },
        { q: 'Quanto tempo Paulo ficou em Corinto ensinando? (At 18:11)', a: ['Um ano e seis meses', 'Três dias', 'Dez anos'], porque: 'Encorajado pela visão, Paulo ficou um ano e seis meses ensinando a Palavra em Corinto (At 18:11).' },
        { q: 'O que 1 Coríntios 6:18 manda fazer com a imoralidade?', a: ['Fugir', 'Negociar', 'Esconder'], porque: 'Contra a imoralidade, a Bíblia não manda ficar perto e resistir: manda fugir, como José fugiu (1Co 6:18; Gn 39:12).' },
        { q: 'Segundo 1Co 6:19, nosso corpo é…', a: ['Santuário do Espírito Santo', 'Só nosso', 'Sem importância'], porque: 'O corpo de quem crê é morada do Espírito Santo; por isso cuidamos dele e honramos a Deus com ele (1Co 6:19-20).' },
        { q: 'Por que Paulo não precisava ter medo em Corinto? (At 18:10)', a: ['Deus estava com ele e tinha muito povo ali', 'Ele tinha guarda-costas', 'Ninguém sabia quem ele era'], porque: 'Deus prometeu: "Eu estou contigo… pois tenho muito povo nesta cidade" (At 18:10).' },
        { q: 'Quem fugiu da mulher de Potifar? (Gn 39:12)', a: ['José', 'Davi', 'Sansão'], porque: 'José deixou até a roupa para trás e fugiu. Fugir do pecado também é coragem.' },
        { q: '1 Coríntios 10:13 promete que, na tentação, Deus…', a: ['Providencia a saída', 'Deixa a gente sozinho', 'Fica de longe olhando'], porque: 'Deus não deixa ninguém ser tentado além do que pode suportar e, com a tentação, dá o escape.' },
        { q: 'Verdadeiro ou falso: muitos coríntios ouviram, creram e foram batizados.', a: ['Verdadeiro', 'Falso'], porque: '"Muitos dos coríntios, ouvindo, criam e eram batizados" (At 18:8).' },
        { q: 'Salmo 119:9: como o jovem guardará puro o seu caminho?', a: ['Observando a Palavra de Deus', 'Ficando sempre sozinho', 'Tendo muito dinheiro'], porque: 'Guardar a Palavra no coração protege o nosso caminho (Sl 119:9-11).' },
        { q: '2 Timóteo 2:22: fuja das paixões da mocidade e siga…', a: ['A justiça, a fé, o amor e a paz', 'A fama', 'A riqueza'], porque: 'Não basta fugir do mal: é preciso seguir o bem junto com os que invocam o Senhor de coração puro.' }
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
        { q: 'Quem era o procônsul da Acaia? (At 18:12)', a: ['Gálio', 'Pilatos', 'Félix'], porque: 'Gálio era o procônsul, o governador romano da Acaia (At 18:12).' },
        { q: 'Do que acusaram Paulo diante do tribunal? (At 18:13)', a: ['De persuadir a adorar a Deus contra a lei', 'De roubar tendas', 'De não pagar impostos'], porque: 'Os acusadores disseram que Paulo persuadia as pessoas a adorar a Deus contra a lei (At 18:13).' },
        { q: 'O que Gálio fez com a acusação? (At 18:14-16)', a: ['Recusou julgar e os mandou embora', 'Prendeu Paulo', 'Expulsou Paulo da cidade'], porque: 'Gálio achou que era questão de palavras e nomes da lei judaica, recusou julgar e mandou todos embora (At 18:14-16).' },
        { q: 'Quem foi espancado diante do tribunal? (At 18:17)', a: ['Sóstenes', 'Silas', 'Crispo'], porque: 'Sóstenes, o chefe da sinagoga, foi espancado diante do tribunal (At 18:17). Mais tarde um Sóstenes aparece como irmão junto de Paulo (1Co 1:1).' },
        { q: 'Em Apocalipse 12:10, Satanás é chamado de…', a: ['O acusador dos irmãos', 'O juiz', 'O pastor'], porque: 'Satanás é chamado de "o acusador de nossos irmãos" (Ap 12:10). Mas Jesus é o nosso advogado diante do Pai (1Jo 2:1).' },
        { q: 'Como venceram o acusador? (Ap 12:11)', a: ['Pelo sangue do Cordeiro e pelo testemunho', 'Com força própria', 'Fugindo para longe'], porque: 'Os fiéis venceram o acusador pelo sacrifício de Jesus e pela palavra do seu testemunho (Ap 12:11).' },
        { q: 'Paulo chegou a se defender diante de Gálio? (At 18:14)', a: ['Não: Gálio falou antes', 'Sim, falou por horas', 'Sim, e foi condenado'], porque: 'Paulo ia começar a falar, mas Gálio já encerrou o caso. Deus cumpriu a promessa de protegê-lo.' },
        { q: 'Romanos 8:1: para os que estão em Cristo Jesus não há…', a: ['Nenhuma condenação', 'Nenhum problema', 'Nenhum trabalho'], porque: 'A culpa foi paga por Jesus. Por isso a acusação perde a força.' },
        { q: '1 João 2:1: se alguém pecar, temos um Advogado junto ao Pai. Quem é?', a: ['Jesus Cristo, o Justo', 'Moisés', 'Um anjo'], porque: 'Jesus nos defende diante do Pai: o acusador acusa, mas Jesus advoga por nós.' },
        { q: 'Verdadeiro ou falso: Deus tinha prometido que ninguém faria mal a Paulo em Corinto.', a: ['Verdadeiro', 'Falso'], porque: '"Ninguém lançará mão de ti para te fazer mal" (At 18:10). No tribunal, a promessa se cumpriu.' },
        { q: 'O que Gálio fez quando bateram em Sóstenes? (At 18:17)', a: ['Não se importou', 'Prendeu os agressores', 'Socorreu Sóstenes'], porque: '"Gálio não se importava com nenhuma destas coisas" (At 18:17).' },
        { q: 'Depois do tribunal, Paulo foi embora de Corinto no mesmo dia? (At 18:18)', a: ['Não: ficou ainda muitos dias', 'Sim, fugiu à noite', 'Sim, foi expulso'], porque: 'Paulo "ficou ainda muitos dias" e depois partiu para a Síria (At 18:18).' }
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
