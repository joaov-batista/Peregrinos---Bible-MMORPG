# Peregrinos — RPG bíblico online

> **Revisão visual:** personagens articulados, 10 monstros e 9 chefes redesenhados, movimentos mais fluidos, novas armas e ícones e criação em três etapas. Veja [LEIA-ME-REDESIGN.md](LEIA-ME-REDESIGN.md), as pranchas em `art/` e a prévia `art/movimento-fluido.mp4`.

Um jogo de ação e aventura (estilo MMORPG) focado na Bíblia. Toda semana os **5 Portões** do mundo abrem 5 fases novas baseadas num estudo bíblico.

- Jogue no **PC** (teclado + mouse), com **controle** (Xbox, PlayStation e genéricos) e no **celular deitado** (joystick e botões na tela).
- Contas, personagens, ranking mundial e outros jogadores aparecendo no mapa com **Supabase**.
- Hospedagem na **Vercel**.
- Sem Supabase configurado, o jogo funciona em **modo offline** (salva no navegador).

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:5180

## O que já existe (v0.1)

| Sistema | Detalhes |
|---|---|
| Personagem | 7 classes (Guerreiro da Fé, Pastor, Profeta, Levita, Zelote, Valente de Davi, Juiz), aparência personalizável, até 3 por conta |
| Combate | golpes gastam fôlego, golpe carregado, postura (quebra o equilíbrio), travar alvo, ataque com combo, especial por classe (gasta Fé), **esquiva** com invencibilidade, **defesa** (segurar) e **defesa perfeita** que atordoa e devolve projéteis |
| Mundo | mapa grande: Cidade de Refúgio, Caminho dos Portões, colinas, campos, floresta, lago, deserto e costa; ciclo de dia e noite (igual para todos) |
| Inimigos | 10 vícios (Preguiça, Distração, Desânimo, Inveja, Ganância, Dúvida, Ira, Medo, Orgulho, Vaidade); cada um ensina um versículo ao ser vencido |
| Chefes | Mamom, Procrastinação, Mentira, Imoralidade Sexual, Satanás (batalha de versículos), Golias (Vale de Elá: só a defesa perfeita contra a lança expõe a testa), Beemote e Leviatã (chefes do mundo) |
| Secreto | um vilão escondido aparece nos portões à noite… |
| Dungeons | um **Portão das Dungeons** no mundo leva ao **Salão**: uma sala por semana (a nova e as passadas), cada uma com 5 fases e um guia |
| Fases | baús com quiz → 3 chaves → porta do chefe. O prêmio da fase tem chance de cair nos baús do tesouro (depois das 3 chaves) ou no fim |
| Itens | lojas, armas por classe, armaduras, comida, buffs e as 6 peças da **Armadura de Deus** (Ef 6) |
| NPCs | personagens bíblicos com falas, missões, lojas e minijogos |
| Minijogos | A Ovelha Perdida (Lc 15), Pesca Maravilhosa (Jo 21), Colheita do Maná (Êx 16), Pares da Arca (Gn 7) e **pescaria livre** em qualquer beira de lago ou mar |
| Casa | **Áquila** (na cidade) dá uma tenda e reforma: casa de barro e casa sobre a rocha. Cama, parede de versículos, troféus, horta (sementes da Lídia), cozinha e livro de visitas. Visite a casa dos amigos e construa a casa do clã com doações |
| Classe | **Samuel** (na cidade) troca sua classe; nível e itens continuam |
| Atalhos | 2 itens usáveis nas teclas **1** e **2** (Q = atalho 1), escolhidos no menu › Personagem |
| Animais | Labão (na cidade) vende **burrinho** e **cavalo** (montarias, tecla R), **cachorro** (morde vícios, acha moedas) e **ovelha** (cura devagar) |
| Social | **amigos** (pedido/aceitar, online/offline) e **clãs** (sigla em cima do nome, chat do clã com `/c`, ranking de clãs) |
| Pontuação | ranking geral e semanal |
| Online | jogadores aparecem no mapa e conversam por chat (Supabase Realtime) |

> **Atualizou o jogo?** Rode o `supabase/schema.sql` de novo no SQL Editor (é seguro rodar mais de uma vez). Ele cria as tabelas de amizades e clãs e libera a troca de classe.

## Criar uma semana nova (5 fases)

1. Copie `src/content/semana-01.js` para `src/content/semana-02.js`.
2. Troque `id`, `titulo`, `estudo`, `versiculo` e as 5 `fases` (nome, referência, lição, quiz, personagens, mapa, chefe e recompensa).
   - Quiz: 10 a 15 perguntas por fase; a resposta certa é sempre a **primeira** (o jogo embaralha) e `porque` explica a resposta depois que o jogador responde. Perguntas erradas vão para "Para revisar" (menu › Bíblia).
3. Registre em `src/content/index.js`:
   ```js
   import semana02 from './semana-02.js';
   export const SEMANAS = [semana01, semana02];
   ```
4. Publique. Todas as semanas aparecem no Salão das Dungeons; a última da lista é a NOVA. Cada semana pode ter `sala` (piso da sala) e `guia` (nome e aparência do guia).

Mapas das fases são desenhados com letras (a legenda está no topo de `semana-01.js`). Chefes ficam em `src/data/bestiary.js`.

## Criar um chefe novo (sem programar)

Os chefes são só dados: cada um escolhe golpes de uma biblioteca (`src/game/bossMoves.js`) e diz em que fase usa cada um. O chefe pode ir em `src/data/bestiary.js` ou direto no arquivo da semana, no campo `chefes`:

```js
// semana-02.js
export default {
  id: 'semana-02', /* … */
  chefes: {
    golias: {
      nome: 'Golias de Gate', titulo: 'Chefe', lv: 10, hp: 1400, atk: 22, def: 8, spd: 70, r: 42, xp: 600, ouro: 300,
      cor: '#9A8466', cor2: '#3D3325', simbolo: '🛡️', ref: '1 Samuel 17',
      intro: 'Sou eu algum cão, para vires a mim com paus?', derrota: '"A batalha é do Senhor" (1Sm 17:47).',
      golpes: {
        lanca: { tipo: 'investida', vel: 560, dur: 0.8 },
        pisao: { tipo: 'pisao', ondas: 2 },
        dardos: { tipo: 'rajada', vezes: 3, angulos: [-0.2, 0, 0.2], cor: '#C9B48A' }
      },
      fases: [
        { golpes: ['lanca', 'pisao'], mover: { tipo: 'perseguir', vel: 0.6 } },
        { vida: 0.4, grito: 'GOLIAS AVANÇA!', golpes: ['lanca', 'pisao', 'dardos', 'lanca'], mover: { tipo: 'perseguir', vel: 0.8 } }
      ]
    }
  },
  fases: [ /* … */ { n: 5, chefe: 'golias', /* … */ } ]
};
```

| Campo | O que faz |
|---|---|
| `golpes` | Golpes que o chefe usa (nome livre → `tipo` + números). Tipos: `anel`, `investida`, `invocar`, `raios`, `clones`, `trocar`, `leque`, `rajada`, `marcados`, `chuva`, `pisao`, `pocas`, `encanto`, `mergulho`, `onda`, `estocada`. Os parâmetros de cada um estão comentados em `bossMoves.js`; todos aceitam `dano` e `espera`. |
| `fases` | Lista de fases. Vale a **última** cuja `vida` (fração, ex.: `0.5`) e `quando` (ex.: `'temClones'`) batem. Repetir um golpe na lista faz ele sair mais vezes. `grito` aparece uma vez ao entrar na fase. |
| `mover` | Como anda entre os golpes: `perseguir`, `rodear` (mantém distância) ou `parado`. |
| `regras` | Passivas da luta toda: `aura` (deixa lento), `regenera` (cura se você parar de bater), `acusacoes` (batalha de versículos), `fugaVulneravel` (esquivar do encanto deixa o chefe vulnerável), `armadura` (absorve quase todo o dano; uma defesa perfeita contra os golpes listados expõe o ponto fraco — é a mecânica do Golias). |
| `mundo` / `respawn` / `drop` / `ancoras` | Para chefes do mundo aberto: onde mora (tiles), quando volta, o que deixa cair e onde pode ressurgir da água. |
| `desenho` / `simbolo` | Reaproveita o desenho de outro chefe (`desenho: 'mamom'`); sem desenho próprio, aparece um vulto com `cor`, `cor2` e o `simbolo`. |

Se algum golpe, fase ou regra estiver escrito errado, o console do navegador avisa (`[chefe golias] …`) assim que o jogo abre.

## Cutscenes narradas

Cenas de cinema tocam no começo do jogo (prólogo), ao entrar no Salão e numa semana, antes de cada fase, quando um chefe aparece, ao aceitar uma missão e no fim da semana. Cada uma toca uma vez por personagem; dá para rever em menu › Ajustes › Rever cutscenes (e desligar em Ajustes › Cutscenes).

- **Roteiro:** `src/content/cinematicas.js` — lista de planos com cenário, personagens, efeitos, câmera (`cam`) e o texto narrado. Para uma semana nova, crie `semana-02` e `semana-02-fase-1…5` no mesmo formato.
- **Player:** `src/ui/cinema.js` — cenários animados, câmera (close, push-in, tilt, pan), faixas de cinema, luz volumétrica, primeiro plano desfocado, bloom e granulação.
- **Áudio:** `public/narracao/<id>-<n>.mp3`, um arquivo por trecho de voz (cenas seguidas com a mesma voz). Sem o arquivo, a cena usa a voz do aparelho e a legenda.

Gerar as narrações que faltam (motor OmniVoice, o mesmo do VoiceStudio; roda no PC, sem conta):

```bash
python -m venv .venv-voz
.venv-voz/Scripts/pip install torch==2.8.0+cu128 torchaudio==2.8.0+cu128 --extra-index-url https://download.pytorch.org/whl/cu128
.venv-voz/Scripts/pip install omnivoice
.venv-voz/Scripts/python scripts/gerar-narracoes-omnivoice.py
```

Precisa de `node` e `ffmpeg` no PATH. As vozes do narrador e do vilão ficam em `scripts/vozes/` (recrie com `--vozes`). Também há `npm run narracoes` para gerar com a ElevenLabs (precisa de `ELEVENLABS_API_KEY` e de plano pago).

## Colocar online

### 1. Supabase (banco de dados e contas)
1. Crie um projeto grátis em https://supabase.com.
2. Vá em **SQL Editor → New query**, cole o arquivo `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Providers → Email**, deixe ligado. Para testar mais rápido, desligue **Confirm email**.
4. Em **Project Settings → API**, copie a *Project URL* e a chave *anon public*.
5. Crie um arquivo `.env.local` na pasta do projeto (use `.env.example` como modelo):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### 2. Vercel (hospedagem)
1. Suba esta pasta num repositório do GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório. O framework (Vite) é detectado sozinho.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Clique em **Deploy**. Cada `git push` publica de novo.

Também dá para publicar pelo terminal com `npx vercel` (pede login na primeira vez).

## Estrutura

```
src/
  main.js            início: telas de login → personagem → jogo
  game/game.js       loop, combate, IA, chefes, fases, rede
  game/world.js      geração do mapa e das fases
  game/draw.js       desenho dos personagens, inimigos e chefes
  game/player.js     atributos, inventário, equipamento
  ui/hud.js          HUD, menus, lojas, quiz, diálogos
  ui/screens.js      login, escolha e criação de personagem
  ui/minigames.js    minijogos
  data/              classes, itens, inimigos, NPCs e missões
  content/           estudos bíblicos semanais (5 fases cada)
supabase/schema.sql  tabelas, segurança e ranking
```

## Mundo compartilhado

No mundo aberto, todos veem os **mesmos** vícios e chefes. O jogador que está no mundo há mais tempo é o *anfitrião*: só ele simula os inimigos e manda o estado para os outros (~7 vezes por segundo, pelo Supabase Realtime). Os outros mandam seus golpes para ele, que aplica o dano; a recompensa vai para todos que ajudaram a vencer. Se o anfitrião sair, o próximo da fila assume. Nas **dungeons em grupo** (até 4, convite em menu › Social) vale o mesmo sistema dentro da fase do grupo (`src/game/grupo.js`); jogando sozinho, a dungeon é local. Código em `src/game/mundoNet.js`.

## Limitações conhecidas

- O anfitrião é o aparelho de um jogador: se ele minimizar o jogo, o mundo para por alguns segundos até outro assumir. Um servidor dedicado (Node no Fly.io/Railway) pode assumir esse papel no futuro com as mesmas mensagens.
- O banco tem uma proteção básica contra trapaça (a pontuação não pode cair nem pular demais de uma vez). Para um ranking à prova de trapaça, a pontuação precisa ser validada no servidor.
