# Peregrinos — Análise do jogo e roadmap de melhorias

> Análise feita sobre o código da v0.1 (out/2026). As referências `arquivo:linha` apontam para o que existe hoje.

---

## 1. Diagnóstico: o que já está muito bom

Antes de mudar, vale saber o que **não** mexer — essas são as melhores ideias do projeto:

| Ponto forte | Onde está | Por que funciona |
|---|---|---|
| **Mecânica = lição** | `game.js:774` (Imoralidade), `game.js:747` (Mentira), `game.js:792` (Satanás) | A Imoralidade só se vence **fugindo** (esquiva quebra o encanto). A Mentira se revela pela **sombra**. O Acusador se vence com **versículos**. O jogador *aprende fazendo*, não lendo. Esta é a alma do jogo — toda novidade deve seguir esse padrão. |
| Esquiva + defesa perfeita que devolve projéteis | `game.js:560-583` | Base sólida de combate "souls-like" (janela de 0,35 s, guarda quebrada). |
| Golpes telegrafados | `this.tele` (círculos, linhas, anéis) | O jogador vê o golpe chegando: justo e legível. |
| Armadura de Deus como conjunto | `player.js:672` | Ef 6 vira objetivo de longo prazo com bônus de conjunto. |
| Conteúdo semanal em arquivo de dados | `content/semana-01.js` | Mapa ASCII + quiz + NPCs = uma semana nova sem programar… *quase* (ver 2.1). |
| Segredo do "Pecado" nos portões à noite | `game.js:1003`, `bestiary.js:290` | Ótimo gancho de mistério (Gn 4:7). Merece um arco inteiro. |
| Missões com personagens bíblicos coerentes | `npcs.js` | Sansão → Ira, Josué → Orgulho, Débora → Medo. Cada missão tem sentido. |

---

## 2. Problemas e gargalos (prioridade alta)

### 2.1 Cada chefe novo exige programar
Os ataques de todos os chefes estão num único `switch (b.id)` dentro de `updateBoss` (`game.js:718-857`). Uma semana nova com chefe novo = mexer no motor. Isso vai travar a expansão.

**Proposta:** um sistema de chefes **dirigido por dados**, com uma biblioteca de golpes reutilizáveis:

```js
// data/bosses/golias.js
export default {
  id: 'golias', nome: 'Golias de Gate', hp: 4200, ...
  fases: [
    { ate: 0.6, golpes: ['investida', 'pisao', 'lanca_arremesso'], ritmo: 1.0 },
    { ate: 0.3, golpes: ['investida', 'pisao_triplo', 'escudeiro'], ritmo: 0.8, fala: 'Sou eu um cão?' },
    { ate: 0,   golpes: ['furia'], ritmo: 0.6, fraqueza: 'testa' }
  ],
  regra: 'atordoar_para_ferir' // mecânica-lição (opcional)
};
```

A biblioteca (`game/bossMoves.js`) teria ~20 golpes genéricos (investida, chuva de projéteis, área no chão, invocar, teleporte, raio giratório, onda, mergulho, aura de lentidão…) parametrizáveis. Os golpes que já existem (`coins`, `clock`, `clones`, `charm`, `pools`, `dive`, `wave`, `whirl`, `stomp`, `rocks`) viram as primeiras entradas.

### 2.2 `game.js` com 1.800 linhas
Sugestão de divisão: `combat.js` (ataque, dano, parry), `enemies.js` (IA), `bosses/` (motor + golpes), `worldEvents.js` (dia/noite, Pecado, ovelhas), `quests.js`, `render.js`. Facilita colaboração e conteúdo.

### 2.3 Segurança / trapaça
- O campo `data` (inventário, itens, progresso) é `jsonb` livre e o cliente grava o que quiser (`net.js:70`). Pelo console (`window.__game`) dá para se dar a Espada do Espírito.
- O gatilho `check_score` só limita +20.000 por save.

**Proposta:** recompensas importantes (fim de fase, chefe, missão difícil, loja) passam por **Supabase Edge Functions** ou RPCs `security definer`, que validam e gravam. O cliente pede "terminei a fase 3", o servidor confere tempo mínimo, nível e progresso anterior. Sem isso, o ranking e uma futura economia entre jogadores (trocas, casas) ficam vulneráveis.

### 2.4 Multiplayer é "lado a lado", não "junto"
Inimigos não são compartilhados (README, "Limitações"). Para co-op, raids e eventos de mundo é preciso um dono da simulação:
- **Fase 1 (barato):** "anfitrião" — o primeiro jogador da sala simula os inimigos e transmite pelo canal Realtime; os outros só enviam golpes. Bom para grupos de 2–4 em dungeons.
- **Fase 2:** servidor autoritativo leve (Node + WebSocket, ou Colyseus) para chefes de mundo e eventos.

### 2.5 Curva de progressão quebrada no topo
`MAX_LEVEL = 40`, mas o conteúdo mais forte é nível 17 (Leviatã) e os itens param no 15. Do 18 ao 40 não há nada para fazer além de matar vícios. As novas regiões (seção 5) devem ocupar essa faixa.

---

## 3. Combate "estilo Dark Souls" (com identidade bíblica)

Hoje o combate tem esquiva, guarda e parry, mas **atacar não custa fôlego** (só esquiva e bloqueio gastam, `game.js:296` e `:573`). Isso permite apertar ataque sem parar, o oposto de Souls.

### 3.1 Ajustes de base
| Mudança | Detalhe |
|---|---|
| **Fôlego no ataque** | Cada golpe gasta 8–15 de fôlego; o 3º golpe do combo, mais. Obriga a escolher entre atacar, esquivar e defender. |
| **Postura (equilíbrio)** | Inimigos e chefes têm uma barra de postura que enche com parries e golpes pesados. Cheia → atordoado → **golpe de misericórdia** (dano alto). Isso dá recompensa ao jogador habilidoso. |
| **Ataque carregado** | Segurar o botão de ataque: golpe lento, alto dano de postura. |
| **Travar alvo (lock-on)** | Tecla Tab/botão no celular. Essencial para chefes. |
| **Recuperação de vida arriscada** | Usar item agora é instantâneo. Vire uma animação de ~0,8 s em que você fica parado: punível. |
| **Golpes com "atraso"** | Chefes com golpes que seguram o braço no alto antes de soltar — ensina a não esquivar por reflexo. |
| **Dificuldade escolhível** | Hoje é uma constante (`DIF`, `game.js:24`). Ofereça "Peregrino" (história) e "Provação" (Souls) — o jogo é para crianças e adultos. |

### 3.2 Os "sistemas Souls", traduzidos para a Bíblia
| Souls | Peregrinos | Referência |
|---|---|---|
| Fogueira (bonfire) | **Pedra de Ebenézer** — altar de descanso: salva, reabastece, renasce os inimigos, viagem rápida entre Ebenézers acesos | "Até aqui nos ajudou o Senhor" (1Sm 7:12) |
| Frasco de Estus | **Botija da Viúva** — cargas de azeite que curam e só se reenchem no altar | 1Rs 17:14 |
| Almas perdidas ao morrer | Ao cair no mundo, os denários ficam no chão como uma **sacola de talentos**; volte para buscá-la antes de cair de novo | Parábola dos talentos (Mt 25) |
| Mensagens no chão | **Pedras de testemunho** — jogadores deixam um versículo/dica curta (lista fechada de frases para evitar abuso) que outros podem "amém" | Js 4:7 |
| Invocar ajuda (co-op) | **Sinal de socorro**: outro jogador entra na sua luta de chefe | "Dois são melhores que um" (Ec 4:9) |
| NG+ | **Segunda Peregrinação**: chefes com golpes novos e lições mais profundas | |

### 3.3 Nova camada: virtudes contra vícios
Os inimigos já são **vícios**. Falta o lado das **virtudes**: o **Fruto do Espírito** (Gl 5:22-23) como árvore de talentos com 9 ramos — Amor, Alegria, Paz, Paciência, Benignidade, Bondade, Fidelidade, Mansidão, Domínio próprio.
- Cada virtude dá **vantagem contra vícios específicos** (Domínio próprio +dano contra Ira; Paciência contra Procrastinação; Alegria contra Desânimo; Paz contra Medo).
- Pontos de virtude vêm de **versículos memorizados**, não só de XP — isso liga aprender a ficar forte.

### 3.4 IA dos inimigos
São 6 comportamentos (`chase, hop, ranged, charge, blink, thief`). Para expandir:
- **Grupos com papéis**: um vício cura os outros (Murmuração), um protege (Hipocrisia, com escudo de "aparência"), um foge e chama reforços (Fofoca).
- **Elites** com nome e cor (ex.: "Ira Ardente") que soltam itens melhores.
- **Variantes noturnas** — à noite os vícios ficam mais fortes ("os homens amaram mais as trevas", Jo 3:19). O ciclo de dia e noite já existe e é igual para todos (`game.js:1032`).

---

## 4. Chefes — ideias "estilo Dark Souls"

Regra de ouro: **cada chefe ensina sua lição pela mecânica**. Inimigos humanos da Bíblia podem ser chefes de *história*; vícios e forças espirituais são os chefes "malignos". Deus e Jesus **nunca** aparecem como combatentes — aparecem como luz, voz ou intervenção.

| Chefe | Região | Fases e mecânica-lição |
|---|---|---|
| **Golias de Gate** | Vale de Elá | Gigante com armadura: armas comuns quase não ferem. Só **defesa perfeita** contra a lança abre a guarda e mostra a **testa** como ponto fraco. A funda do Pastor causa dano extra. Lição: não é pela armadura de Saul, é confiando em Deus (1Sm 17:39,45). |
| **A Estátua de Nabucodonosor** | Babilônia | 5 fases = 5 materiais (ouro, prata, bronze, ferro, barro). Cada uma muda os golpes. No fim, a **pedra que desce do monte** (cutscene) acerta os pés de barro (Dn 2:34). |
| **A Fornalha Ardente** | Babilônia | Não é luta: sobreviva 90 s em arena de fogo com 2 amigos NPC. Aos 60 s aparece uma **quarta figura de luz** e o fogo deixa de ferir (Dn 3:25). Lição: Deus está no fogo com você. |
| **Os 450 Profetas de Baal** | Monte Carmelo | Ondas de inimigos + um altar. Você precisa **encharcar o altar** (3 baldes de água) enquanto se defende. Quando terminar, fogo cai e limpa a arena (1Rs 18:33-38). Feito para o Profeta. |
| **Dagom** | Asdode | Ídolo que cai de cara no chão e **se remonta** se você não destruir as mãos e a cabeça a tempo (1Sm 5:4). Ensina: ídolos não se sustentam. |
| **Legião** | Gerasa | Um chefe que **se divide em vários**; dá para afastar os pedaços para a manada de porcos, que corre para o lago (Mc 5:13). Quanto mais se divide, mais fraco fica cada um. |
| **Faraó e as 10 Pragas** | Egito | Uma fase por praga (rãs, gafanhotos, trevas…), cada uma com seu perigo. No fim, fuga pelo **Mar Vermelho aberto** com os carros de guerra atrás de você. |
| **Sísera** | Vale do Quisom | Luta montada (carros de ferro). A chuva transforma o chão em lama e os carros atolam (Jz 5:21). Débora e Jael aparecem. |
| **A Serpente Antiga** | Secreto (Éden) | Não ataca: **oferece**. A cada fruta aceita você fica mais forte… e perde vida máxima. Recusar sempre = final verdadeiro. |
| **O Tentador no Deserto** | Fim de temporada | Evolução do Acusador: 3 fases = as 3 tentações (Mt 4) — pão, pináculo, reinos. Responda com o versículo certo de Deuteronômio. |
| **O Pecado (???)** | Final do arco secreto | Já existe com 99.999 de vida. A lição: **é impossível vencê-lo sozinho**. Depois de cair, uma luz desce, o chefe é derrotado *por graça*, e o jogador recebe o título "Mais que vencedor" (Rm 8:37). Um final que surpreende e ensina. |

**Chefes de mundo (raid):** Beemote e Leviatã deveriam ter **vida compartilhada** entre todos os jogadores online (ver 2.4), com placar de contribuição e um evento anunciado no chat ("O chão treme no Deserto de Sim…").

---

## 5. Mundo e mapa

### 5.1 Problemas do mapa atual
- O mundo tem 180×130 tiles gerados por ruído (`world.js:280`). É grande, mas **genérico**: floresta, deserto e campos parecem iguais em todo canto; quase não há lugares marcantes.
- Casas (`T.HOUSE`) são sólidas — **não dá para entrar em nada**.
- Não há viagem rápida: atravessar o mapa sem cavalo é lento.
- As regiões não contam uma história; são só faixas de nível.

### 5.2 Propostas
1. **Pontos de referência desenhados à mão** dentro do mapa gerado: o carvalho de Manre, o poço de Jacó, a sarça, uma torre de vigia, ruínas, um acampamento. Cada um com um NPC, segredo ou desafio. Regra: em qualquer lugar do mapa, deve haver algo interessante a no máximo ~20 s de caminhada.
2. **Interiores**: casas, sinagoga, oficina e templo que se abrem como as fases (o sistema de mapa ASCII já serve).
3. **Pedras de Ebenézer** como viagem rápida (ver 3.2).
4. **Mapa-múndi em camadas**: a "Terra Prometida" vira o primeiro continente; viagens de barco/caravana levam a outros mapas (Egito, Mesopotâmia, Mediterrâneo de Paulo).
5. **Clima por região**: tempestade de areia no deserto (visão reduzida), neblina no lago à noite, chuva nos campos (plantações crescem mais rápido — ver 6).
6. **Atalhos que se abrem** (marca de Souls): portões trancados que você destrava pelo outro lado, ligando regiões.

### 5.3 Novos vilarejos e regiões (sugestão de ordem)
| Região | Nível | Arco de história | Chefe |
|---|---|---|---|
| **Belém** | 12–16 | Rute e Boaz, Davi pastor | Golias |
| **Jericó** | 14–18 | Raabe, as muralhas — dar 7 voltas abre o segredo | Muralha Viva (Orgulho) |
| **Cafarnaum e o Lago** | 16–20 | Pedro, os pescadores, a tempestade acalmada | Legião |
| **Monte Carmelo** | 18–22 | Elias e Acabe | 450 Profetas de Baal |
| **Jerusalém** (nova capital) | 20+ | Templo, Neemias, mercado de jogadores, casas | — |
| **Egito / Gósen** | 22–28 | José e Moisés | Faraó e as Pragas |
| **Babilônia** | 28–34 | Daniel e os três amigos | Estátua, Fornalha |
| **Nínive** | 34–38 | Jonas (o NPC Jonas já existe e pode iniciar o arco) | — (missão de **não lutar**: convencer) |
| **As viagens de Paulo** | 38–40 | Filipos, Éfeso, naufrágio em Malta | Ídolo de Diana; a víbora de Malta |

Cada vilarejo deve ter: 1 ferreiro com equipamento da região, 1 cadeia de missões contando a história, 1 minijogo próprio, 1 segredo e 1 chefe.

---

## 6. Casa do jogador (housing)

A ideia encaixa muito bem com a Bíblia: começa como **Tenda** ("Pela fé, Abraão habitou em tendas", Hb 11:9) e evolui.

| Nível | Tipo | Como conseguir |
|---|---|---|
| 1 | Tenda de peregrino | Missão de Priscila e Áquila (fazedores de tendas — já são NPCs!) |
| 2 | Casa de barro | Denários + tijolos |
| 3 | Casa de pedra com terraço | "Sobre a rocha" (Mt 7:24) — missão do construtor prudente |
| 4 | Casa com pátio e jardim | Conteúdo de fim de jogo |

**O que fazer na casa:**
- **Decoração** com móveis de lojas, drops de chefes e trabalho manual (troféus: cabeça do Beemote, escama do Leviatã, espada de Golias na parede).
- **Parede de versículos**: cada versículo memorizado vira um quadro que você pendura. A casa mostra visualmente o quanto você aprendeu.
- **Horta** (parábola do semeador, Mt 13): plantar trigo, uvas, figos e romãs; regar; colher em tempo real (algumas horas). Terra boa, pedregosa ou com espinhos dá resultados diferentes. Gera ingredientes para cozinhar.
- **Cozinha**: combinar ingredientes em pratos com bônus (pão ázimo, guisado de Jacó, bolos de passas).
- **Descanso**: dormir na própria cama dá um bônus temporário de "Repouso" (+XP).
- **Visitas**: amigos podem entrar, deixar um recado no livro de visitas e ganham um bônus de hospitalidade (Hb 13:2).
- **Casa do clã**: o clã constrói junto uma **Casa de Oração/Congregação** com doações dos membros.

**Técnico:** cada casa é uma instância (mapa ASCII pequeno, igual às fases) + tabela `houses (owner, nivel, layout jsonb)` no Supabase. Lotes ficam num bairro de Jerusalém, com placas e o nome do dono.

---

## 7. Aprendizado e imersão

### 7.1 Problemas atuais
- 6 perguntas por fase, sempre as mesmas e com 3 alternativas. Na 2ª vez o jogador decora a posição da resposta, não o conteúdo.
- O versículo aparece como texto e some; não há revisão.
- Errar o quiz não explica **por que** a resposta certa é a certa.

### 7.2 Propostas
| Ideia | Como funciona |
|---|---|
| **Memorização espaçada** | Os versículos aprendidos (`data.verses`) voltam de tempos em tempos como desafio rápido (completar a lacuna, ordenar as palavras). Acertar fortalece a "Espada do Espírito" (dano extra). |
| **Golpe da Palavra** | No meio da luta, um especial em que você **monta o versículo** arrastando palavras. Mais rápido = mais dano. A frase "A espada do Espírito é a palavra de Deus" vira jogabilidade. |
| **Explicação depois de responder** | Toda pergunta ganha um campo `porque` com 1–2 frases e a referência. Mostrar sempre, ao acertar e ao errar. |
| **Banco maior de perguntas** | 15–20 por fase, sorteando 6. Variar o formato: verdadeiro/falso, quem disse, ordenar acontecimentos, localizar no mapa. |
| **Códice do Peregrino** | Um livro no menu com: bestiário (vício + versículo), personagens que você conheceu (ficha com resumo e referências), linha do tempo bíblica que vai se preenchendo, mapa das viagens. Colecionar é aprender. |
| **Diário da semana** | No fim das 5 fases, um resumo do estudo e uma pergunta para refletir ("Onde você pode mostrar o caráter de Cristo esta semana?"), com espaço para anotar. Ótimo para grupos de jovens e escola bíblica. |
| **Modo grupo/professor** | Um líder cria uma sala para a turma, vê quem completou a semana e as perguntas que mais erraram. Transforma o jogo em ferramenta de igreja. |
| **Narrador e falas** | Cutscenes curtas (texto + desenho no canvas) na entrada de cada fase contando a passagem. Opcional: narração em áudio. |

---

## 8. Eventos

### 8.1 Calendário de festas bíblicas (eventos sazonais)
| Evento | Época | Atividade |
|---|---|---|
| **Páscoa** | Mar/Abr | Pão ázimo, a marca nas portas; noite em que os vícios não entram nas casas marcadas. |
| **Pentecostes** | 50 dias depois | O chat ganha "línguas": mensagens aparecem traduzidas para todos; bônus de Fé em dobro (At 2). |
| **Festa dos Tabernáculos** | Set/Out | Todos montam **tendas** decoradas na cidade; concurso de tendas. |
| **Purim** | Fev/Mar | Arco de Ester: espionagem no palácio, derrotar o plano de Hamã. |
| **Natal** | Dez | Seguir a estrela pelo mapa; os pastores; presentes entre amigos. |
| **Jubileu** | 1× por ano | Perdão de "dívidas": desconto em lojas, itens liberados. |

### 8.2 Eventos de mundo (dinâmicos)
- **Os filisteus atacam!** Ondas de inimigos vêm em direção à Cidade de Refúgio; os jogadores defendem os muros com Neemias ("espada numa mão, ferramenta na outra"). Os NPCs já sugerem isso.
- **Fome em Canaã**: as lojas ficam sem comida; José no Egito vende trigo (evento econômico).
- **Chuva de maná**: a cada X minutos cai maná em uma região aleatória — recolher só o necessário (quem acumula, perde: estragou! Êx 16:20).
- **Eclipse/trevas**: 3 minutos de escuridão total com inimigos fortes e baús raros.

### 8.3 Temporadas
Agrupe as semanas em **temporadas** de 8–12 semanas (ex.: "Temporada 1: Atos de Paulo"), com um **chefe final de temporada**, um título cosmético e um placar sazonal.

---

## 9. Easter eggs (segredos)

| Segredo | Como encontrar | Recompensa |
|---|---|---|
| **153 peixes** | Pesque exatamente 153 peixes (Jo 21:11) | Título "Pescador de Homens" + rede dourada |
| **A jumenta de Balaão** | Bata 3 vezes no seu próprio burrinho | Ele **fala** com você (Nm 22:28) e recebe o nome "Profetisa" |
| **Muralhas de Jericó** | Dê 7 voltas na muralha, depois toque a trombeta (Levita) | Os muros caem e abrem uma área secreta |
| **Enoque** | NPC que só aparece algumas vezes; na 3ª conversa ele **desaparece** (Gn 5:24) | Item "Andou com Deus" |
| **Carro de fogo** | No pôr do sol, num monte específico | Animação de Elias subindo; deixa cair o **manto** (2Rs 2:13) |
| **Zaqueu** | Uma figueira-brava na cidade de Jericó tem alguém em cima | Ele devolve 4× o ouro que você perdeu na última morte (Lc 19:8) |
| **Torre de Babel** | Uma ruína no deserto; perto dela, o chat de todos fica embaralhado | Conquista "Confusão" |
| **Matusalém** | NPC com contador de dias jogados; conversa especial no dia 969 | Título lendário |
| **Melquisedeque** | Aparece sem origem e sem aviso, abençoa e some (Hb 7:3) | Bênção aleatória poderosa |
| **Corvos de Elias** | Fique parado perto do ribeiro de Querite sem comida | Corvos trazem pão e carne (1Rs 17:6) |
| **O pecado à porta** | Já existe. Expandir em 7 encontros, 1 por semana, até o chefe final | Arco secreto completo |
| **Konami bíblico** | Digitar "JOAO316" no chat | Fogos e uma mensagem de Jo 3:16 |

---

## 10. Classes e personagem

- **Novas classes**: **Escriba** (dano escala com versículos memorizados — a classe do estudo), **Pescador** (rede que prende inimigos, arpão), **Médico** (Lucas, cura forte em grupo), **Nazireu** (força crescente enquanto não usa itens de cura — Sansão).
- **Especializações no nível 20** (2 por classe): Guerreiro → *Valente de Davi* (dano) ou *Guarda do Templo* (tanque); Levita → *Salmista* (cura) ou *Trombeteiro* (controle).
- **Papéis em grupo** já existem implicitamente (Guerreiro aguenta, Levita cura, Pastor e Profeta atacam de longe) — as dungeons de grupo devem exigir essa combinação.
- **Mais 1 especial por classe** e a escolha de 2 entre 4 habilidades.
- **Aparência**: roupas cosméticas (túnica, manto, véu, cajado) vindas de eventos e conquistas, separadas dos atributos.

---

## 11. Interface (UI/UX)

### 11.1 O que melhorar no HUD atual (`index.html`, `ui/hud.js`)
| Problema | Proposta |
|---|---|
| Quase tudo é emoji (🍞 ⚔ 🛡) — muda de desenho em cada celular e parece improvisado | Conjunto próprio de ícones (SVG ou pixel art) com a mesma linha e paleta. |
| Barra do chefe simples | Barra larga embaixo, com **nome + título + marcas das fases** (tracinhos em 60% e 30%) e uma barra de postura. |
| Não há tela de configurações | Volume de música/efeitos separados, tamanho do texto, dificuldade, tremor de tela on/off, modo daltônico, inverter botões no celular, sensibilidade do joystick. |
| Sem controle (gamepad) | `input.js` não usa a Gamepad API. Suportar controle é barato e muda muito a sensação de jogo de ação. |
| Diário de missões espalhado | **Diário** com abas: Em andamento, Concluídas, História principal, Secundárias — com a referência bíblica de cada uma. |
| Menu de inventário em lista | Grade com comparação lado a lado (verde/vermelho) ao passar sobre um item. |
| Textos de diálogo aparecem prontos | Texto que se escreve letra a letra, retrato do personagem grande e nome em destaque (Cinzel já está carregada). |
| Toasts para tudo | Separar: **notificações** (canto), **conquistas** (faixa dourada no topo), **lição/versículo** (cartão central que fica até o jogador fechar). |

### 11.2 Celular
- Botões de ação podem ser **personalizados** (arrastar posição e tamanho).
- Ataque com **segurar = ataque carregado** e **deslizar = esquiva na direção**.
- Vibração (Vibration API) ao tomar dano e no parry perfeito.

### 11.3 Acessibilidade
- Fontes maiores e opção de fonte para dislexia (bom para crianças).
- Leitura em voz alta de versículos (Web Speech API, em português).
- Golpes telegrafados com **forma** além da cor (já usa círculo/linha/anel — manter).

---

## 12. Áudio e arte

- A música é sintetizada (`audio.js`). Adicionar **temas por região** (deserto com escala frígia, lago calmo, cidade festiva) e **música de chefe com fases** (fica mais intensa na fase 2).
- Usar salmos de domínio público como base melódica nas cidades.
- Personagens são desenhados por código (`draw.js`) — charmoso e leve. Para a próxima etapa: animações de golpe mais "pesadas" (antecipação → golpe → recuperação), partículas de impacto e **pausa de 50 ms no acerto** (hit-stop), que é o que dá a sensação de peso no Souls.

---

## 13. Roadmap sugerido

| Versão | Foco | Itens |
|---|---|---|
| **v0.2 — Base sólida** | Técnico + combate | Dividir `game.js`; chefes por dados (2.1); fôlego no ataque, postura, lock-on, ataque carregado, hit-stop; tela de configurações; gamepad; explicação no quiz. |
| **v0.3 — Souls bíblico** | Sistemas | Pedras de Ebenézer, Botija da Viúva, sacola de talentos ao morrer, atalhos no mapa, dificuldade escolhível, Códice do Peregrino. |
| **v0.4 — Belém e Jericó** | Conteúdo | 2 vilarejos, Golias, Muralha Viva, primeiros 6 easter eggs, Escriba como 5ª classe. |
| **v0.5 — Minha Casa** | Social | Tenda → casa, parede de versículos, horta, cozinha, visitas, casa do clã. |
| **v0.6 — Juntos** | Rede | Validação no servidor (2.3), co-op com anfitrião nas dungeons, sinal de socorro, chefes de mundo com vida compartilhada. |
| **v0.7 — Temporadas** | Eventos | Calendário de festas, eventos de mundo, temporada 1 com chefe final, modo professor/grupo. |
| **v1.0 — Peregrinação** | Fim de jogo | Egito e Babilônia, Fruto do Espírito (talentos), especializações, arco final do Pecado, Segunda Peregrinação (NG+). |

---

## 14. Top 10 — se só der para fazer dez coisas

1. **Chefes dirigidos por dados** — destrava todo o resto do conteúdo.
2. **Fôlego no ataque + postura + hit-stop** — o combate passa a ter peso.
3. **Pedras de Ebenézer + Botija da Viúva** — o ciclo Souls com sentido bíblico.
4. **Explicação depois de cada pergunta + banco maior de perguntas** — aprendizado de verdade.
5. **Golias** como primeiro chefe Souls "de vitrine" (ótimo para divulgar).
6. **Casa/Tenda com parede de versículos** — motivo para voltar todo dia.
7. **Validação de recompensas no servidor** — antes que o ranking fique cheio de trapaça.
8. **Tela de configurações + ícones próprios** — o jogo passa a parecer "pronto".
9. **Arco do Pecado em 7 encontros** terminando no chefe impossível vencido pela graça.
10. **Um evento de mundo** (filisteus atacando os muros) para os jogadores online se juntarem.
