// Cutscenes (cinemáticas) com narração. Cada uma é uma lista de cenas ("planos"):
//   { cena, texto, titulo?, sub?, fig?, fx?, voz? }
//   cena:  fundo animado desenhado em ui/cinema.js (cosmos, eden, queda, sombras, cidade, portais, corinto, agora, oficina,
//          sinagoga, casa, tribunal, deserto, mar, vale, colinas, campos, floresta, lago, costa, noite, trono, luz, muralha, carmelo)
//   texto: o que o narrador fala (as marcas entre colchetes, como [whispers], são direção de voz do ElevenLabs e não aparecem na legenda)
//   fig:   personagens em cena: { p: 'jogador' | 'npc:davi' | 'chefe:mamom' | look, x: 0..1, y: 0..1 (pés), s: tamanho, anda, vira: -1, entra: 'esq'|'dir'|'cima'|'baixo' }
//   fx:    'tremor' | 'raio' | 'clarão' | 'fogo' | 'chuva' | 'brasas' | 'estrelas'
//   voz:   'vilao' para falas de chefe (voz grave e ameaçadora); o padrão é o narrador
// Os áudios ficam em public/narracao/<id>-<n>.mp3: cenas seguidas com a mesma voz formam um arquivo (n = 0, 1, 2…).
// Sem o arquivo, a cutscene roda do mesmo jeito, só com a legenda.
import semana01 from './semana-01.js';

const F = (n, k) => semana01.fases[n - 1].npcs[k].look;
const PAULO = F(1, 'M'), PRISCILA = F(2, 'N'), AQUILA = F(2, 'M'), SILAS = F(3, 'M'), TIMOTEO = F(3, 'O');
const TICIO = F(4, 'N'), CRISPO = F(4, 'M'), ANJO = F(4, 'O'), GALIO = F(5, 'N'), SOSTENES = F(5, 'M'), MERCADOR = F(1, 'N');
const ESDRAS = { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#3E3656', cape: '#F2C14E', style: 'turbante', beard: true };
const ADAO = { skin: '#C68B59', hair: '#3A2314', tunic: '#ECE3CF', cape: 'none', style: 'curto', beard: true };
const EVA = { skin: '#D9A273', hair: '#2B1A10', tunic: '#ECE3CF', cape: 'none', style: 'longo', beard: false };

export const CINEMAS = {
  /* ================= Começo do jogo ================= */
  prologo: {
    titulo: 'Prólogo',
    cenas: [
      { cena: 'cosmos', fx: 'estrelas', titulo: 'PEREGRINOS', sub: 'No princípio…',
        texto: '[solemn] No princípio, criou Deus os céus e a terra. A terra era sem forma e vazia… e havia trevas sobre a face do abismo.' },
      { cena: 'cosmos', fx: 'clarão',
        texto: 'Então Deus disse: "Haja luz!" E houve luz. E Deus viu que a luz era boa.' },
      { cena: 'eden', fig: [{ p: ADAO, x: 0.44, y: 0.8, s: 1.5 }, { p: EVA, x: 0.56, y: 0.8, s: 1.5, vira: -1 }],
        texto: 'Num jardim plantado ao oriente, no Éden, o homem e a mulher andavam com o seu Criador, na viração do dia. Não havia medo. Não havia vergonha.' },
      { cena: 'queda', fx: 'tremor', fig: [{ p: ADAO, x: 0.4, y: 0.8, s: 1.4 }, { p: EVA, x: 0.52, y: 0.8, s: 1.4, vira: -1 }],
        texto: '[ominous] Mas uma voz sussurrou entre as árvores: "É assim que Deus disse?" O fruto foi tomado… e o pecado entrou no mundo.' },
      { cena: 'sombras', fx: 'brasas',
        texto: 'Desde então, sombras andam pela terra. Preguiça. Inveja. Ira. Medo. Orgulho. Vícios que prendem o coração. E por trás deles, o Acusador, que acusa os filhos de Deus dia e noite.' },
      { cena: 'luz', fx: 'clarão',
        texto: '[hopeful] Mas Deus não abandonou a sua criação. Ele enviou o seu Filho, e a luz resplandeceu nas trevas… e as trevas não prevaleceram contra ela.' },
      { cena: 'cidade', fig: [{ p: 'jogador', x: 0.5, y: 0.84, s: 1.7, anda: true, entra: 'baixo' }],
        texto: 'Agora, um novo peregrino chega à Cidade de Refúgio. Você não tem riquezas, nem fama. Tem uma Bíblia, um coração disposto… e um caminho pela frente.' },
      { cena: 'portais', fig: [{ p: 'jogador', perfil: true, x: 0.36, y: 0.36, s: 1.7 }], cam: 'push',
        titulo: 'Sede fortes no Senhor', sub: 'Efésios 6:10',
        texto: 'Ao norte da cidade, os Portões das Dungeons guardam as histórias da Palavra. Vista a armadura de Deus, peregrino. A jornada começa agora.' }
    ]
  },

  /* ================= Salão e semanas ================= */
  salao: {
    titulo: 'O Salão das Dungeons',
    cenas: [
      { cena: 'portais', titulo: 'SALÃO DAS DUNGEONS',
        texto: 'Além do portão, um salão antigo, iluminado por lâmpadas que nunca se apagam. Cada portal leva a uma semana de estudo: uma história da Bíblia vivida por dentro.' },
      { cena: 'portais', fig: [{ p: ESDRAS, x: 0.62, y: 0.82, s: 1.7, vira: -1 }, { p: 'jogador', x: 0.36, y: 0.84, s: 1.5, entra: 'esq', anda: true }],
        texto: 'Quem guarda o salão é Esdras, o escriba, que dedicou o coração a estudar a Lei do Senhor, a cumpri-la e a ensiná-la. Ele conhece cada portal pelo nome.' },
      { cena: 'portais', fx: 'brasas',
        texto: 'O portal marcado como NOVO é o estudo desta semana. Os outros ficam abertos para sempre: volte quando quiser. Mas cuidado… em cada sala, um inimigo do coração espera no último salão.' }
    ]
  },
  'semana-01': {
    titulo: 'Corinto: Trabalho e Missão',
    cenas: [
      { cena: 'corinto', titulo: 'SEMANA 1', sub: 'Corinto · Atos 18:1-17',
        texto: 'Grécia, por volta do ano cinquenta. Corinto: cidade de dois portos, de mercadores do mundo inteiro, de templos e ídolos em cada esquina. Rica por fora… vazia por dentro.' },
      { cena: 'colinas', fig: [{ p: PAULO, x: 0.5, y: 0.82, s: 1.7, anda: true, entra: 'esq' }],
        texto: 'Pela estrada que vem de Atenas, chega um homem sozinho, com as mãos calejadas e uma mensagem que pode virar a cidade de cabeça para baixo. O nome dele é Paulo.' },
      { cena: 'oficina', fig: [{ p: PRISCILA, x: 0.34, y: 0.82, s: 1.5 }, { p: PAULO, x: 0.5, y: 0.82, s: 1.5 }, { p: AQUILA, x: 0.66, y: 0.82, s: 1.5, vira: -1 }],
        texto: 'Ele vai costurar tendas com Priscila e Áquila, ensinar na sinagoga, ser rejeitado, receber uma visão do próprio Senhor e ser arrastado a um tribunal romano.' },
      { cena: 'tribunal', fx: 'brasas', titulo: 'Não temas', sub: 'Atos 18:9-10', fig: [{ p: PAULO, perfil: true, x: 0.34, y: 0.4, s: 1.6 }], cam: 'push',
        texto: 'Cinco salões. Cinco inimigos. Mamom, a Procrastinação, a Mentira, a Imoralidade… e, no fim, o próprio Acusador. Peregrino: trabalho e missão andam juntos. Não temas. Fala, e não te cales.' }
    ]
  },
  'semana-01-fim': {
    titulo: 'O Acusador caiu',
    cenas: [
      { cena: 'luz', fx: 'clarão', titulo: 'VITÓRIA', sub: 'Apocalipse 12:11',
        texto: '[emotional] O Acusador foi lançado fora. Não pela sua força, peregrino, mas pelo sangue do Cordeiro e pela palavra do testemunho.' },
      { cena: 'corinto', fig: [{ p: PAULO, x: 0.42, y: 0.82, s: 1.5 }, { p: 'jogador', x: 0.58, y: 0.82, s: 1.5, vira: -1 }],
        texto: 'Paulo ficou em Corinto um ano e seis meses, e ali nasceu uma igreja. Deus tinha muito povo naquela cidade… e tem muito povo na sua também.' },
      { cena: 'portais', texto: 'A Espada do Espírito agora é sua. Guarde a Palavra no coração. Na próxima semana, um novo portal vai se abrir.' }
    ]
  },

  /* ================= Fases (antes de entrar pela primeira vez) ================= */
  'semana-01-fase-1': {
    titulo: 'Fase 1 · A Ágora de Corinto',
    cenas: [
      { cena: 'agora', titulo: 'FASE 1', sub: 'A Ágora de Corinto · Atos 18:1',
        texto: 'A Ágora: o grande mercado de Corinto. Prata, perfume, seda, escravos… e ídolos de todos os tamanhos. Aqui tudo tem preço.' },
      { cena: 'agora', fig: [{ p: MERCADOR, x: 0.38, y: 0.82, s: 1.6 }, { p: PAULO, x: 0.62, y: 0.82, s: 1.6, vira: -1, entra: 'dir', anda: true }],
        texto: 'Entre as bancas, um mercador conta moedas sem parar. E Paulo, recém-chegado de Atenas, observa a cidade que precisa conhecer um Deus que não se compra.' },
      { cena: 'agora', fx: 'brasas', fig: [{ p: 'chefe:mamom', x: 0.5, y: 0.78, s: 1.5 }],
        texto: '[tense] Mas no salão do norte mora Mamom, o espírito da ganância. Ele promete riqueza a quem se ajoelhar. Ache as três chaves nos baús, abra a porta… e lembre-se: ninguém pode servir a dois senhores.' }
    ]
  },
  'semana-01-fase-2': {
    titulo: 'Fase 2 · A Oficina de Tendas',
    cenas: [
      { cena: 'oficina', titulo: 'FASE 2', sub: 'A Oficina de Tendas · Atos 18:2-3',
        texto: 'Cheiro de couro e de linho grosso. Agulhas, cordas, martelos. Esta é a oficina de Priscila e Áquila, fabricantes de tendas.' },
      { cena: 'oficina', fig: [{ p: PRISCILA, x: 0.4, y: 0.82, s: 1.6 }, { p: AQUILA, x: 0.6, y: 0.82, s: 1.6, vira: -1 }],
        texto: 'Eles fugiram de Roma quando o imperador Cláudio expulsou os judeus. Perderam a casa, mas Deus os trouxe até Paulo. Aqui, o trabalho bem feito também é adoração.' },
      { cena: 'oficina', fx: 'brasas', fig: [{ p: 'chefe:procrastinacao', x: 0.5, y: 0.78, s: 1.5 }],
        texto: '[slow, drowsy] No fundo da oficina, alguém boceja. É a Procrastinação. Ela deixa tudo lento ao redor e sussurra: "amanhã…". Se você parar de lutar, ela se recupera. Faça hoje.' }
    ]
  },
  'semana-01-fase-3': {
    titulo: 'Fase 3 · A Sinagoga',
    cenas: [
      { cena: 'sinagoga', titulo: 'FASE 3', sub: 'A Sinagoga · Atos 18:4-6',
        texto: 'Todo sábado, Paulo deixa as tendas e vai à sinagoga. Abre os rolos das Escrituras e mostra a judeus e gregos que Jesus é o Cristo.' },
      { cena: 'sinagoga', fig: [{ p: SILAS, x: 0.4, y: 0.84, s: 1.3, entra: 'esq', anda: true }, { p: PAULO, x: 0.5, y: 0.84, s: 1.4 }, { p: TIMOTEO, x: 0.6, y: 0.84, s: 1.2, vira: -1, entra: 'dir', anda: true }],
        texto: 'Silas e Timóteo chegam da Macedônia. Timóteo é jovem, mas ninguém deve desprezar a sua mocidade. Agora Paulo pode se dedicar inteiro à Palavra.' },
      { cena: 'sinagoga', fx: 'raio', fig: [{ p: 'chefe:mentira', x: 0.3, y: 0.78, s: 1.2 }, { p: 'chefe:mentira', x: 0.5, y: 0.78, s: 1.4 }, { p: 'chefe:mentira', x: 0.7, y: 0.78, s: 1.2 }],
        texto: '[mysterious] Mas nem todos querem ouvir. Entre as colunas, a Mentira se multiplica em cópias perfeitas. Qual delas é a verdadeira? Só a verdade revela quem ela é.' }
    ]
  },
  'semana-01-fase-4': {
    titulo: 'Fase 4 · A Casa de Tício Justo',
    cenas: [
      { cena: 'casa', titulo: 'FASE 4', sub: 'A Casa de Tício Justo · Atos 18:7-11',
        texto: 'Rejeitado na sinagoga, Paulo atravessa a rua. Ao lado, fica a casa de Tício Justo, um gentio que temia a Deus. As portas se abrem.' },
      { cena: 'casa', fig: [{ p: TICIO, x: 0.38, y: 0.82, s: 1.6 }, { p: CRISPO, x: 0.62, y: 0.82, s: 1.6, vira: -1 }],
        texto: 'E então, o impossível: Crispo, o chefe da sinagoga, crê no Senhor com toda a sua casa. Muitos coríntios ouvem, creem e são batizados.' },
      { cena: 'luz', fx: 'clarão', fig: [{ p: 'serafim', x: 0.66, y: 0.42, s: 1.3 }, { p: PAULO, perfil: true, x: 0.3, y: 0.42, s: 1.5 }], cam: 'push',
        texto: '[softly] Numa noite, o Senhor fala a Paulo em visão: "Não temas. Fala, e não te cales, porque eu estou contigo. Tenho muito povo nesta cidade."' },
      { cena: 'casa', fx: 'brasas', fig: [{ p: 'chefe:imoralidade', x: 0.5, y: 0.78, s: 1.5 }],
        texto: '[tense] Mas Corinto era famosa por outra coisa. No último salão, a Imoralidade encanta e puxa para perto. Contra ela, não se luta parado: foge. Use a esquiva, e o encanto se quebra.' }
    ]
  },
  'semana-01-fase-5': {
    titulo: 'Fase 5 · O Tribunal de Gálio',
    cenas: [
      { cena: 'tribunal', titulo: 'FASE 5', sub: 'O Tribunal de Gálio · Atos 18:12-17',
        texto: 'Mármore branco, estandartes de Roma. O tribunal da Acaia. Uma multidão arrasta Paulo até aqui com uma acusação: ele ensina a adorar a Deus contra a lei.' },
      { cena: 'tribunal', fig: [{ p: GALIO, x: 0.5, y: 0.76, s: 1.7 }, { p: SOSTENES, x: 0.3, y: 0.84, s: 1.4 }, { p: PAULO, x: 0.7, y: 0.84, s: 1.4, vira: -1 }],
        texto: 'No assento do juiz está Gálio, o procônsul. Sóstenes, chefe da sinagoga, lidera os acusadores. Mas Deus tinha prometido: ninguém lançará mão de ti para te fazer mal.' },
      { cena: 'trono', fx: 'fogo', fig: [{ p: 'chefe:satanas', x: 0.5, y: 0.78, s: 1.6 }],
        texto: '[deep, slow] Por trás de toda acusação há um acusador. No salão mais profundo espera Satanás, aquele que acusa os irmãos dia e noite. Ele vai dizer quem você foi. Responda com quem Deus diz que você é.' }
    ]
  },

  /* ================= Chefes (quando aparecem pela primeira vez) ================= */
  'chefe-mamom': {
    titulo: 'Mamom, a Ganância',
    cenas: [
      { cena: 'agora', fx: 'brasas', fig: [{ p: 'chefe:mamom', x: 0.5, y: 0.78, s: 1.8, entra: 'cima' }], titulo: 'MAMOM', sub: 'a Ganância · Mateus 6:24',
        texto: 'Moedas começam a girar no ar. Do meio do ouro surge Mamom: a riqueza que quer ser senhor.' },
      { cena: 'agora', voz: 'vilao', fig: [{ p: 'chefe:mamom', x: 0.5, y: 0.78, s: 2 }],
        texto: '[greedy laugh] Tudo em Corinto tem preço, peregrino! Ajoelhe-se diante de mim… e terá tudo o que quiser.' }
    ]
  },
  'chefe-procrastinacao': {
    titulo: 'Procrastinação',
    cenas: [
      { cena: 'oficina', fig: [{ p: 'chefe:procrastinacao', x: 0.5, y: 0.78, s: 1.8 }], titulo: 'PROCRASTINAÇÃO', sub: 'Eclesiastes 11:4',
        texto: 'O ar fica pesado. Os passos ficam lentos. Os ponteiros de um relógio giram em volta dela.' },
      { cena: 'oficina', voz: 'vilao', fig: [{ p: 'chefe:procrastinacao', x: 0.5, y: 0.78, s: 2 }],
        texto: '[yawns] [lazy] Pra que trabalhar hoje? Senta aí… descansa… deixa pra amanhã. E depois de amanhã.' }
    ]
  },
  'chefe-mentira': {
    titulo: 'Mentira',
    cenas: [
      { cena: 'sinagoga', fx: 'raio', fig: [{ p: 'chefe:mentira', x: 0.5, y: 0.78, s: 1.8 }], titulo: 'MENTIRA', sub: 'João 8:44',
        texto: 'Uma figura de púrpura sorri entre as colunas. Ela fala doce, parece verdade… e se divide em muitas.' },
      { cena: 'sinagoga', voz: 'vilao', fig: [{ p: 'chefe:mentira', x: 0.3, y: 0.78, s: 1.4 }, { p: 'chefe:mentira', x: 0.5, y: 0.78, s: 1.7 }, { p: 'chefe:mentira', x: 0.7, y: 0.78, s: 1.4 }],
        texto: '[mocking] Ninguém vai acreditar nesse Jesus… E você? Consegue dizer qual de nós é a verdadeira? Hahaha!' }
    ]
  },
  'chefe-imoralidade': {
    titulo: 'Imoralidade Sexual',
    cenas: [
      { cena: 'casa', fig: [{ p: 'chefe:imoralidade', x: 0.5, y: 0.78, s: 1.8 }], titulo: 'IMORALIDADE', sub: '1 Coríntios 6:18',
        texto: 'Um perfume enjoativo enche a sala. A luz fica rosada. Ela não ataca de frente: ela convida.' },
      { cena: 'casa', voz: 'vilao', fig: [{ p: 'chefe:imoralidade', x: 0.5, y: 0.78, s: 2 }],
        texto: '[whispers] Chegue mais perto… ninguém está olhando…' },
      { cena: 'casa', fig: [{ p: 'jogador', x: 0.5, y: 0.84, s: 1.6, vira: -1 }],
        texto: 'Lembre-se de José: ele deixou até a capa para trás e fugiu. Fugir também é coragem.' }
    ]
  },
  'chefe-satanas': {
    titulo: 'Satanás, o Acusador',
    cenas: [
      { cena: 'trono', fx: 'tremor', titulo: 'SATANÁS', sub: 'o Acusador · Apocalipse 12:10',
        texto: '[deep] As tochas se apagam uma a uma. O chão do tribunal racha, e um calor de fornalha sobe do abismo.' },
      { cena: 'trono', fx: 'fogo', fig: [{ p: 'chefe:satanas', x: 0.5, y: 0.78, s: 1.9, entra: 'baixo' }],
        texto: 'Ele foi um querubim de luz. Quis subir acima das estrelas de Deus e caiu. Desde então, o seu trabalho é um só: acusar.' },
      { cena: 'trono', voz: 'vilao', fx: 'fogo', fig: [{ p: 'chefe:satanas', x: 0.5, y: 0.78, s: 2.1 }],
        texto: '[menacing] Eu conheço você. Conheço cada erro. Eu acuso você dia e noite diante do trono… Você não merece estar aqui!' },
      { cena: 'luz', fig: [{ p: 'jogador', perfil: true, x: 0.4, y: 0.4, s: 1.7 }], cam: 'push',
        texto: '[firm] Mas para os que estão em Cristo Jesus, nenhuma condenação há. Quando ele acusar, responda com a Palavra.' }
    ]
  },
  'chefe-behemote': {
    titulo: 'Beemote',
    cenas: [
      { cena: 'deserto', fx: 'tremor', titulo: 'BEEMOTE', sub: 'Chefe do Mundo · Jó 40:15',
        texto: '[awed] O chão do deserto treme. As dunas escorrem como água. Algo enorme está se levantando da areia.' },
      { cena: 'deserto', fx: 'tremor', fig: [{ p: 'chefe:behemote', x: 0.5, y: 0.8, s: 2.2, entra: 'baixo' }],
        texto: 'É o Beemote. A sua força está nos lombos, os seus ossos são como tubos de bronze, a sua cauda se move como um cedro. É a obra-prima dos caminhos de Deus.' },
      { cena: 'deserto', fig: [{ p: 'chefe:behemote', x: 0.66, y: 0.8, s: 1.8 }, { p: 'jogador', x: 0.28, y: 0.86, s: 1.4 }],
        texto: 'Nenhum homem consegue domá-lo. Só aquele que o fez pode chegar até ele com a espada. Peregrino: o seu gigante é grande… mas o seu Deus é maior.' }
    ]
  },
  'chefe-leviata': {
    titulo: 'Leviatã',
    cenas: [
      { cena: 'mar', fx: 'chuva', titulo: 'LEVIATÃ', sub: 'Chefe do Mundo · Isaías 27:1',
        texto: '[tense] O mar da costa começa a ferver. O céu escurece. Escamas brilham debaixo das ondas, e a espuma fica branca como cabelos de ancião.' },
      { cena: 'mar', fx: 'raio', fig: [{ p: 'chefe:leviata', x: 0.5, y: 0.74, s: 2.2, entra: 'baixo' }],
        texto: 'É o Leviatã, a serpente veloz, o dragão que está no mar. Da sua boca saem tochas, das suas narinas sai fumaça. Na terra não há nada igual a ele.' },
      { cena: 'mar', fx: 'chuva', fig: [{ p: 'chefe:leviata', x: 0.68, y: 0.74, s: 1.8 }, { p: 'jogador', x: 0.26, y: 0.86, s: 1.4 }],
        texto: 'Ninguém é ousado o bastante para despertá-lo. Mas a Escritura promete: naquele dia, o Senhor castigará o Leviatã com a sua espada dura, grande e forte.' }
    ]
  },
  'chefe-golias': {
    titulo: 'Golias de Gate',
    cenas: [
      { cena: 'vale', titulo: 'GOLIAS', sub: 'Chefe do Mundo · 1 Samuel 17',
        texto: 'O Vale de Elá. De um lado, o exército de Israel, tremendo. Do outro, os filisteus. E no meio, um homem de quase três metros.' },
      { cena: 'vale', fx: 'tremor', fig: [{ p: 'chefe:golias', x: 0.56, y: 0.8, s: 2.1, vira: -1 }, { p: 'jogador', x: 0.26, y: 0.86, s: 1.3 }],
        texto: 'Capacete de bronze, couraça de escamas, a haste da lança como o eixo de um tear. Por quarenta dias ele desafiou o povo de Deus.' },
      { cena: 'vale', voz: 'vilao', fig: [{ p: 'chefe:golias', x: 0.5, y: 0.8, s: 2.3 }],
        texto: '[shouting] [arrogant] Sou eu algum cão, para vires a mim com paus? Dai-me um homem, para que lutemos!' },
      { cena: 'vale', fig: [{ p: 'jogador', x: 0.5, y: 0.86, s: 1.7 }],
        texto: 'Bater na armadura não adianta. Espere a lança. Defenda no momento exato… e a testa do gigante vai ficar exposta. A batalha é do Senhor.' }
    ]
  },
  pecado: {
    titulo: '???',
    cenas: [
      { cena: 'noite', fx: 'brasas', titulo: '???', sub: 'Gênesis 4:7',
        texto: '[whispers] A noite cai sobre os portões. As tochas tremem. Alguém está parado na escuridão… e não faz sombra.' },
      { cena: 'noite', voz: 'vilao', fig: [{ p: 'chefe:pecado', x: 0.5, y: 0.8, s: 1.6 }],
        texto: '[whispers] [sinister] Você me sente, não sente? Eu estou sempre à porta. Esperando. Ainda não é hora de você me enfrentar… mas eu sei o seu nome.' },
      { cena: 'noite',
        texto: '"O pecado jaz à porta, e o seu desejo será contra ti. Mas a ti cumpre dominá-lo."' }
    ]
  },

  /* ================= Missões (ao aceitar) ================= */
  'q_preguica': {
    titulo: 'Missão · Vença a Preguiça',
    cenas: [
      { cena: 'colinas', fig: [{ p: 'npc:peregrino', x: 0.4, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'VENÇA A PREGUIÇA', sub: 'Provérbios 6:6',
        texto: 'O Velho Peregrino aponta para as colinas. Lá, criaturas verdes e moles se arrastam pela grama: são as Preguiças. Elas não atacam com força. Atacam com sono.' },
      { cena: 'colinas', texto: 'Vá ter com a formiga, ó preguiçoso. Ela trabalha sem ninguém mandar. Derrote cinco Preguiças e volte.' }
    ]
  },
  'q_muros': {
    titulo: 'Missão · Guarda dos Muros',
    cenas: [
      { cena: 'muralha', fig: [{ p: 'npc:neemias', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'GUARDA DOS MUROS', sub: 'Neemias 4:17',
        texto: 'Neemias reconstruiu os muros de Jerusalém em cinquenta e dois dias, com a ferramenta numa mão e a espada na outra.' },
      { cena: 'muralha', fx: 'brasas', texto: 'Agora os muros da Cidade de Refúgio precisam de guardas. Derrote quinze inimigos lá fora e mostre que você vigia e trabalha.' }
    ]
  },
  'q_medo': {
    titulo: 'Missão · Não temas',
    cenas: [
      { cena: 'costa', fig: [{ p: 'npc:debora', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'NÃO TEMAS', sub: 'Isaías 41:10',
        texto: 'Débora julgava Israel debaixo de uma palmeira, e quando o exército tremeu, ela foi junto para a batalha.' },
      { cena: 'costa', fx: 'raio', texto: 'Perto da costa, o Medo some e reaparece nas suas costas. Não fuja dele. Derrote cinco Medos: "Não temas, porque eu sou contigo."' }
    ]
  },
  'q_portao': {
    titulo: 'Missão · O Primeiro Portão',
    cenas: [
      { cena: 'portais', fig: [{ p: 'npc:porteiro', x: 0.4, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'O PRIMEIRO PORTÃO',
        texto: 'O Porteiro das Dungeons tira uma chave antiga do cinto. Atrás dele, o primeiro portal pulsa com luz dourada.' },
      { cena: 'portais', texto: 'Entre no Salão, escolha a semana nova e complete a primeira fase. Leia o texto antes: as perguntas dos baús saem da Palavra.' }
    ]
  },
  'q_ovelhas': {
    titulo: 'Missão · O bom pastor',
    cenas: [
      { cena: 'campos', fig: [{ p: 'npc:davi', x: 0.42, y: 0.82, s: 1.4 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'O BOM PASTOR', sub: 'Lucas 15:4-6',
        texto: 'Davi, o pastorzinho, conta e reconta o rebanho. Faltam três. Elas fugiram pelos campos e colinas.' },
      { cena: 'campos', texto: 'Ovelhas assustadas correm de quem chega perto. Corra até elas cansarem, pegue no colo e traga de volta. Há alegria no céu por uma ovelha encontrada.' }
    ]
  },
  'q_pesca': {
    titulo: 'Missão · Pescadores de homens',
    cenas: [
      { cena: 'lago', fig: [{ p: 'npc:pedro', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'PESCADORES DE HOMENS', sub: 'João 21:6',
        texto: 'Pedro passou uma noite inteira sem pescar nada. Então Jesus disse: "Lancem a rede do lado direito." E a rede quase arrebentou.' },
      { cena: 'lago', texto: 'Pesque dez peixes em qualquer beira de lago ou mar. Paciência… e confiança em quem manda lançar a rede.' }
    ]
  },
  'q_desanimo': {
    titulo: 'Missão · Não desista!',
    cenas: [
      { cena: 'campos', fig: [{ p: 'npc:rute', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'NÃO DESISTA!', sub: 'Gálatas 6:9',
        texto: 'Rute perdeu o marido, a terra e quase tudo. Mesmo assim disse: "Aonde quer que fores, irei eu." E foi colher nos campos.' },
      { cena: 'floresta', texto: 'Nos campos do sul e na floresta, o Desânimo tenta convencer todo mundo a parar. Derrote seis deles. Não nos cansemos de fazer o bem.' }
    ]
  },
  'q_beemote': {
    titulo: 'Missão · Dá-me este monte',
    cenas: [
      { cena: 'deserto', fig: [{ p: 'npc:calebe', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'DÁ-ME ESTE MONTE', sub: 'Josué 14:12',
        texto: 'Calebe tem oitenta e cinco anos e a mesma força de quando era moço. Quando os outros viram gigantes, ele viu a promessa de Deus.' },
      { cena: 'deserto', fx: 'tremor', fig: [{ p: 'chefe:behemote', x: 0.5, y: 0.8, s: 1.8 }],
        texto: '[tense] No fundo do deserto mora o Beemote, a criatura mais forte que Deus fez em terra. Ossos de bronze, cauda de cedro. Ele investe, pisa e faz chover pedras.' },
      { cena: 'deserto', texto: 'Desvie das investidas, saia das ondas do pisão e não pare de bater. Como Calebe, diga: "Dá-me este monte!"' }
    ]
  },
  'q_leviata': {
    titulo: 'Missão · O monstro do mar',
    cenas: [
      { cena: 'costa', fig: [{ p: 'npc:jonas', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'O MONSTRO DO MAR', sub: 'Isaías 27:1',
        texto: 'Jonas fugiu do chamado de Deus e passou três dias no ventre de um grande peixe. Ele sabe bem o que mora no fundo do mar.' },
      { cena: 'mar', fx: 'chuva', fig: [{ p: 'chefe:leviata', x: 0.5, y: 0.74, s: 1.9 }],
        texto: '[tense] Na costa nordeste, o Leviatã sobe das águas. Ele cospe jatos, mergulha e ressurge onde você não espera, e levanta ondas e redemoinhos.' },
      { cena: 'mar', texto: 'Fique longe da água revolta, ataque quando ele emergir. E não fuja do chamado, como Jonas fugiu.' }
    ]
  },
  'q_golias': {
    titulo: 'Missão · O gigante de Gate',
    cenas: [
      { cena: 'vale', fig: [{ p: 'npc:saul', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'O GIGANTE DE GATE', sub: '1 Samuel 17',
        texto: 'O rei Saul oferece a própria armadura. Mas armadura nenhuma derrotou Golias. Um menino com uma funda e cinco pedras lisas, sim.' },
      { cena: 'vale', texto: 'Desça ao Vale de Elá. Apare a lança com a defesa perfeita para expor a testa do gigante. Tu vens a mim com espada e lança; eu vou a ti em nome do Senhor.' }
    ]
  },
  'q_gideao': {
    titulo: 'Missão · Os 300 de Gideão',
    cenas: [
      { cena: 'noite', fx: 'brasas', fig: [{ p: 'npc:gideao', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'OS 300 DE GIDEÃO', sub: 'Juízes 7:7',
        texto: 'Gideão tinha trinta e dois mil homens. Deus mandou ficar só com trezentos, com tochas, cântaros e trombetas. E venceu um exército.' },
      { cena: 'noite', texto: 'Esta é uma batalha longa: derrote sessenta vícios. Não é pela quantidade. É pela fé.' }
    ]
  },
  'q_sansao': {
    titulo: 'Missão · Domínio próprio',
    cenas: [
      { cena: 'deserto', fig: [{ p: 'npc:sansao', x: 0.42, y: 0.82, s: 1.7 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'DOMÍNIO PRÓPRIO', sub: 'Juízes 16:28',
        texto: 'Sansão rasgou um leão com as mãos. Mas a força que ele não controlava, a ira e os desejos, quase o destruiu.' },
      { cena: 'deserto', fx: 'fogo', texto: 'No deserto, a Ira anda solta e investe sem pensar. Derrote vinte e cinco Iras. Melhor é quem domina o seu espírito do que quem conquista uma cidade.' }
    ]
  },
  'q_josue': {
    titulo: 'Missão · As muralhas caem',
    cenas: [
      { cena: 'muralha', fig: [{ p: 'npc:josue', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'AS MURALHAS CAEM', sub: 'Josué 6:20',
        texto: 'Sete dias rodeando Jericó em silêncio. No sétimo, as trombetas soaram, o povo gritou… e as muralhas caíram sozinhas.' },
      { cena: 'deserto', fx: 'tremor', texto: 'O Orgulho também ergue muralhas no coração. Derrote vinte Orgulhos no deserto. Sê forte e corajoso.' }
    ]
  },
  'q_elias': {
    titulo: 'Missão · Fogo no Carmelo',
    cenas: [
      { cena: 'carmelo', fx: 'fogo', fig: [{ p: 'npc:elias', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'FOGO NO CARMELO', sub: '1 Reis 18:38',
        texto: 'Quatrocentos e cinquenta profetas gritaram o dia inteiro, e nada. Elias orou uma vez, e o fogo do Senhor caiu e consumiu o altar molhado.' },
      { cena: 'costa', texto: 'Na costa, a Vaidade brilha como espelho e atira de longe. Derrote quinze Vaidades. Vaidade de vaidades: tudo passa. A Palavra fica.' }
    ]
  },
  'q_jo': {
    titulo: 'Missão · Quem pode com o Leviatã?',
    cenas: [
      { cena: 'mar', fx: 'chuva', fig: [{ p: 'npc:jo', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'QUEM PODE COM O LEVIATÃ?', sub: 'Jó 41',
        texto: 'Jó perdeu tudo e fez muitas perguntas. Deus respondeu de dentro de um redemoinho, mostrando o Leviatã: "Quem lhe abrirá as portas da boca?"' },
      { cena: 'mar', fig: [{ p: 'chefe:leviata', x: 0.5, y: 0.74, s: 1.9 }],
        texto: 'Vencer uma vez não basta. Derrote o Leviatã duas vezes. Paciência e fé: o Deus que fez o mar é maior que o monstro do mar.' }
    ]
  },
  'q_daniel': {
    titulo: 'Missão · Fiel até o fim',
    cenas: [
      { cena: 'noite', fig: [{ p: 'npc:daniel', x: 0.42, y: 0.82, s: 1.6 }, { p: 'jogador', x: 0.6, y: 0.82, s: 1.5, vira: -1 }], titulo: 'FIEL ATÉ O FIM', sub: 'Daniel 6:22',
        texto: 'Daniel orava três vezes por dia, de janela aberta, mesmo sabendo que a cova dos leões o esperava. E Deus fechou a boca dos leões.' },
      { cena: 'trono', fx: 'brasas', texto: 'Seja fiel até a última fase da semana nova. Lá embaixo, o Acusador espera. Sê fiel até a morte, e eu te darei a coroa da vida.' }
    ]
  }
};

// Qual cutscene toca quando um chefe aparece (id do bestiário → id da cutscene)
export const CINEMA_CHEFE = { mamom: 'chefe-mamom', procrastinacao: 'chefe-procrastinacao', mentira: 'chefe-mentira', imoralidade: 'chefe-imoralidade', satanas: 'chefe-satanas', behemote: 'chefe-behemote', leviata: 'chefe-leviata', golias: 'chefe-golias' };

// Agrupa cenas seguidas com a mesma voz: cada grupo vira um arquivo de áudio (public/narracao/<id>-<n>.mp3)
export function segmentos(id) {
  const segs = [];
  CINEMAS[id].cenas.forEach((c, i) => {
    const voz = c.voz || 'narrador', last = segs[segs.length - 1];
    if (last && last.voz === voz) last.cenas.push(i); else segs.push({ voz, cenas: [i] });
  });
  return segs.map((s, n) => ({ ...s, arquivo: id + '-' + n, texto: s.cenas.map(i => CINEMAS[id].cenas[i].texto).join(' ') }));
}
