# Peregrinos — revisão visual

O personagem foi redesenhado com anatomia estilizada, contorno de tinta, tecido em camadas e cores de noite, prata e linho. A referência de atmosfera é Hollow Knight, com desenhos originais e identidade bíblica.

## O que mudou

- Corpo articulado com pescoço, tronco, braços, mãos, cintura, pernas e botas; seis constituições, doze estilos de cabelo/cobertura e barba.
- Capa com curvas e balanço, acessórios de classe, armadura, elmo e escudo.
- Sete famílias de armas. A posição da arma nasce da articulação da mão, incluindo caminhada, ataque, giro e mudanças de direção. Madeira, bronze e metal têm acabamentos próprios.
- Um único renderizador atende a criação, o jogo, outros jogadores, NPCs e o inventário.
- Criação em três etapas: vocação, aparência e nome. A aparência tem grupos de rosto/cabelo e corpo/vestes. A prévia permite girar, caminhar e testar o ataque.
- Família de ícones vetoriais para classes, armas, equipamentos, itens, ações, menu e marcadores de NPCs. Ícone do aplicativo atualizado.
- Paletas iniciais por classe; escolhas de cores feitas pelo jogador continuam valendo ao voltar e trocar a vocação.
- Navegação por teclado nas telas iniciais, validação do nome e recuperação após erro ao salvar.
- Dez monstros redesenhados com formas próprias: casco, mariposa, espectro, louva-a-deus, escaravelho, duas máscaras, carneiro, sombra, cavaleiro e asas ornamentais.
- Nove chefes com corpos, materiais e acessórios distintos. Golias segura a lança pela mesma articulação que move o braço; a preparação, a estocada e o retorno são interpolados.
- Movimento contínuo com aceleração e desaceleração visual, flexão de pernas, balanço de tronco e braços, respiração e atraso no movimento de capas, penas, caudas e nadadeiras.

Detalhes do bestiário e da animação em [docs/BESTIARIO-E-MOVIMENTO.md](docs/BESTIARIO-E-MOVIMENTO.md).

## Executar

Com Node.js instalado, abra um terminal nesta pasta:

```sh
npm ci
npm run dev
```

Abra o endereço local mostrado pelo Vite, normalmente `http://localhost:5180`.

Para conferir a versão compilada:

```sh
npm run build
npm run preview
```

A pasta `dist/` já acompanha o pacote, com a versão compilada. Sirva-a por HTTP; abrir o HTML diretamente como arquivo não executa corretamente os módulos do jogo. O `.env.example` original continua disponível para configurar o Supabase.

## Arquivos de arte

| Arquivo | Conteúdo |
| --- | --- |
| `src/game/character-art.js` | Modelo articulado, roupas, cabelos, equipamento e armas |
| `src/game/sprite-motion.js` | Transições graduais de movimento, orientação e poses |
| `src/game/enemy-art.js` | Os dez monstros e suas animações |
| `src/game/boss-art.js` | Os nove chefes, lança articulada e estados especiais |
| `src/game/creature-primitives.js` | Contornos, máscaras, materiais e tecidos compartilhados |
| `src/ui/creator.js` | Criação em etapas e cenário da prévia |
| `src/ui/icons.js` | Ícones compartilhados entre interface e canvas |
| `src/art-direction.css` | Direção visual e layout adaptável |
| `art/caderno-de-arte.png` | Prancha das sete classes, direções, armas e símbolos |
| `art/peregrinos-atlas.png` | Exportação transparente de 112 quadros |
| `art/peregrinos-atlas.json` | Coordenadas, nomes, aparência e pivô de cada quadro |
| `art/monstros-redesenhados.png` | Prancha com os dez monstros |
| `art/chefes-redesenhados.png` | Prancha com os nove chefes |
| `art/monstros-atlas.png` e `.json` | 160 quadros transparentes, com coordenadas e pivôs |
| `art/chefes-atlas.png` e `.json` | 146 quadros transparentes, incluindo estados especiais |
| `art/movimento-fluido.mp4` | Estudo animado com o mesmo código usado pelo jogo |

O atlas tem sete colunas e dezesseis linhas, com células de 192 × 192 pixels. Cada classe tem quatro direções e quatro estados de referência: repouso, dois passos e ataque. A animação dentro do jogo continua procedural e admite personalização; o atlas é uma exportação complementar, não limita o jogo a esses quadros.

## Verificação

- Build de produção concluído com Vite.
- Fluxo offline completo: vocação → aparência → nome → criação → jogo → inventário.
- Validação de nome vazio e recuperação após nome duplicado.
- Conservação de nome e aparência ao avançar e voltar entre as etapas.
- Movimento e ataque no jogo, menus e renderização dos novos ícones.
- 4.032 combinações de corpo, cabelo, classe, direção e ataque, sem erros de renderização ou vazamento do estado do canvas.
- Layouts conferidos em 1440 × 1000, 1280 × 800, 390 × 844 e 844 × 390.
- 573 renderizações de criaturas e estados: repouso, preparação, golpe, dano, atordoamento, exposição, submersão, transparência e fala, sem erros de canvas.
- Clones da Mentira visualmente idênticos; Golias com ponto fraco somente quando exposto; Leviatã com opacidade de submersão; chefe oculto sem pixels visíveis.
- Desaceleração gradual do personagem e continuidade da mão ao parar; bordas dos 306 quadros exportados de criaturas sem cortes.

O esquema de personagem e os dados de progresso existentes foram mantidos. A validação funcional foi feita no modo offline; contas e partidas reais pelo Supabase não foram exercitadas nesta revisão. A alteração do desenho de outros jogadores usa os campos de aparência e equipamento já transmitidos pelo projeto.
