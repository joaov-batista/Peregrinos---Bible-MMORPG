# Peregrinos — o que já foi feito e o que falta

Atualizado em out/2026. O plano completo, com as ideias detalhadas, está em [ANALISE-E-ROADMAP.md](ANALISE-E-ROADMAP.md).
No ar em: https://peregrinos-pi.vercel.app

## ✅ Feito

### Base do jogo (v0.1)
- 4 classes (Guerreiro da Fé, Pastor, Profeta, Levita) com aparência personalizável, até 3 personagens por conta.
- Combate: combo, especial por classe, esquiva com invencibilidade, defesa e defesa perfeita (atordoa e devolve projéteis).
- Mundo aberto com cidade, regiões, ciclo de dia e noite, 10 vícios como inimigos (cada um ensina um versículo).
- Dungeons semanais: Salão com uma sala por semana, 5 fases com quiz, 3 chaves e chefe. Semana 1: Corinto (Atos 18).
- Itens, lojas, Armadura de Deus (Ef 6), montarias e animais de estimação, minijogos, missões, amigos, clãs, ranking e chat online (Supabase).
- PC e celular deitado, modo offline e app instalável (PWA).

### Análise e roadmap
- Análise completa do jogo com sugestões de combate estilo Dark Souls, chefes, vilarejos, casa do jogador, aprendizado, eventos e easter eggs ([ANALISE-E-ROADMAP.md](ANALISE-E-ROADMAP.md)).

### Chefes dirigidos por dados (item 1 do Top 10)
- Biblioteca de golpes reaproveitáveis em `src/game/bossMoves.js`: anel, investida, invocar, raios, clones, trocar, leque, rajada, marcados, chuva, pisão, poças, encanto, mergulho, onda e estocada.
- Regras passivas: aura, regenera, acusações, fuga vulnerável e armadura.
- Fases por porcentagem de vida, gritos de fúria e movimentos (perseguir, rodear, parado).
- Os 7 chefes antigos (Mamom, Procrastinação, Mentira, Imoralidade, Satanás, Beemote, Leviatã) foram passados para dados, com o mesmo comportamento.
- Uma semana nova pode trazer chefes próprios no campo `chefes`, sem programar.
- Validação automática: erros nos dados do chefe aparecem no console do navegador.
- Desenho genérico para chefes sem arte própria (`cor`, `cor2`, `simbolo`).

### Golias de Gate (primeiro chefe novo)
- Chefe do mundo no novo **Vale de Elá**, com encostas e o ribeiro das cinco pedras lisas.
- A armadura absorve 85% do dano. Só a defesa perfeita contra a lança expõe a testa (3,5 s). A funda causa dano triplo nesse momento.
- 3 fases: lança, pisão e dardo; depois chama o Medo; por fim, estocadas seguidas.
- **Rei Saul** na entrada do vale com a missão "O gigante de Gate".
- Relíquia nova: **Pedra Lisa do Ribeiro**.

### Visual novo
- **Interface** em madeira, moldura dourada e pergaminho. Novas fontes: Cinzel e Alegreya.
- **Menu** com abas em medalhões e **inventário** em grade com filtros por categoria e painel de detalhe do item.
- HUD, loja, diálogos, avisos, telas de login e criação de personagem redesenhados, no PC e no celular.
- **Personagens** com contorno, olhos com brilho, mangas, túnica com gola e listras, sandálias e fivela. Vícios com contorno.
- **Mapa** com bordas arredondadas entre terrenos, espuma nas margens, grama sem "xadrez", flores, árvores com contorno, cedros no Líbano, rochas, cactos, palmeiras e casas com telhas e janelas.

### Combate, classes e mundo compartilhado
- Combate com peso: fôlego no ataque, golpe carregado, postura e travar alvo.
- 3 classes novas: Zelote (adaga), Valente de Davi (lança) e Juiz (chicote), com 5 armas cada.
- Pastor e Levita melhorados (alcance e efeitos da trombeta, pedra com rastro e pedra dupla).
- Corpos mais esguios.
- Chefes mais difíceis; a Mentira não entrega mais qual é a verdadeira; Golias mais duro.
- Menu › Ajustes: câmera centralizada, esconder a barra de missão, tremor e som.
- **Mundo compartilhado**: todos veem os mesmos vícios e chefes (anfitrião via Supabase Realtime).
- **Pedras de Ebenézer** (9 pelo mundo): descansar cura, enche a botija, vira o ponto de volta e libera viagem rápida.
- **Botija da Viúva** (tecla H / 🫙): 3 cargas que curam 42%, mas leva quase 1 s parado para beber.
- **Quiz que ensina**: explicação depois de cada resposta, 12 perguntas por fase (60 na semana) e lista "Para revisar" com as erradas.
- **Controle (gamepad)** no estilo Dark Souls, inclusive nos menus, com vibração.
- **Mais ajustes**: volume da música e dos efeitos, tamanho da interface, números de dano e vibração.
- **Casa do jogador** (Áquila, na cidade): tenda grátis → casa de barro → casa sobre a rocha; cama com +15% de XP, parede de versículos, troféus e horta com sementes que crescem em tempo real.
- **Cozinha** (6 receitas bíblicas), **visitas** à casa de amigos com livro de visitas e hospitalidade, e **casa do clã** construída com doações (tenda da congregação → casa de oração → sinagoga), com altar de oração.
- **Dungeons em grupo** (até 4): convite pela aba Social, o líder entra e chama o grupo; vícios, chaves e chefe compartilhados; quem cai levanta em 15 s.
- **Sacola de talentos**: ao cair no mundo, todos os denários ficam onde você caiu; cair de novo antes de buscar perde a sacola.

## ⏳ Falta (pela ordem sugerida no roadmap)

### Próximos passos (Top 10)
- [ ] **Validação no servidor** das recompensas (Edge Functions), contra trapaça no ranking.
- [ ] **Ícones próprios** para os itens no lugar dos emojis.
- [ ] **Arco do Pecado** em 7 encontros, terminando no chefe que só se vence pela graça.
- [ ] **Evento de mundo**: os filisteus atacam os muros da cidade.

### Conteúdo
- [ ] Semana 2 em diante (novas fases e chefes, agora só com dados).
- [ ] Novas regiões: Belém, Jericó, Cafarnaum, Monte Carmelo, Jerusalém, Egito, Babilônia, Nínive e as viagens de Paulo (níveis 12 a 40).
- [ ] Mais chefes: Estátua de Daniel 2, Fornalha Ardente, Profetas de Baal, Dagom, Legião, Faraó e as Pragas, Sísera, Serpente Antiga e o Tentador.
- [ ] Easter eggs: 153 peixes, jumenta de Balaão, muralhas de Jericó, Enoque, carro de fogo, Zaqueu, Torre de Babel e outros.
- [ ] Festas bíblicas como eventos do ano e temporadas com chefe final.
- [ ] Classes novas (Escriba, Pescador, Médico, Nazireu), especializações no nível 20 e árvore do Fruto do Espírito.

### Técnico
- [ ] Dividir `src/game/game.js` (ainda com ~1.700 linhas) em combate, inimigos, mundo e missões.
- [ ] Servidor dedicado assumindo o papel de anfitrião do mundo (hoje é o aparelho de um jogador).
- [ ] Equilibrar o Golias jogando de verdade (vida, dano e tempo da testa exposta ficam em `src/data/bestiary.js`).
- [ ] Testar o visual novo num celular real com toque.
