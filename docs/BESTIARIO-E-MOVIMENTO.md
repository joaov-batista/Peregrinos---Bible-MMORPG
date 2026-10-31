# Bestiário e movimento

Os desenhos seguem a direção de tinta, porcelana, metal envelhecido e noites azuladas do personagem. A referência de atmosfera é Hollow Knight; os desenhos e a implementação são originais deste projeto.

## Monstros

| Criatura | Desenho e movimento |
| --- | --- |
| Preguiça | Casco de pedra e musgo, corpo baixo e passos curtos |
| Distração | Mariposa com asas articuladas, antenas e suspensão no ar |
| Desânimo | Capuz comprido, braços pendentes e tecido arrastado |
| Inveja | Corpo estreito, patas articuladas e lâminas curvas de louva-a-deus |
| Ganância | Escaravelho de casco dourado, bolsa e seis patas alternadas |
| Dúvida | Duas máscaras que oscilam em oposição e um anel interrompido |
| Ira | Carneiro de pedra, chifres curvos e preparação inclinada para investir |
| Medo | Sombra encapuzada com braços compridos e caudas de tecido |
| Orgulho | Armadura pesada, coroa e passos alternados |
| Vaidade | Asas ornamentais, reflexos de porcelana e fitas leves |

## Chefes

| Chefe | Desenho e movimento |
| --- | --- |
| Mamom | Rei-cofre, mãos de garras, correntes e moedas em órbita |
| Procrastinação | Caracol com relógio mineral e musgo |
| Mentira | Marionete de face dividida e pequenas máscaras suspensas |
| Imoralidade | Serpente velada com leque e anéis que ondulam em sequência |
| Satanás | Serafim de asas rasgadas, halo quebrado e penas com atraso entre si |
| Beemote | Colosso quadrúpede, patas alternadas, cabeça e cauda com balanço próprio |
| Golias | Armadura de bronze, escudo preso ao antebraço e lança presa à mão |
| Leviatã | Corpo em S, cauda, pescoço, cabeça e nadadeiras com fases de movimento diferentes |
| Pecado | Silhueta escura, olhos vermelhos e tecido que se desfaz nas extremidades |

Chefes futuros sem desenho próprio recebem uma figura de armadura e manto com o destaque de cor dos seus dados.

## Fluidez

`sprite-motion.js` guarda o estado visual por criatura em `WeakMap`. O movimento do personagem entra e sai gradualmente, sua orientação é interpolada e o braço acompanha a posição desejada da empunhadura. A arma e a mão são desenhadas a partir do mesmo ponto, inclusive durante golpes e giros.

Pernas, cintura, tronco, cabeça e braço têm pequenas diferenças de fase. A respiração continua no repouso. Capas, asas, penas e nadadeiras seguem movimentos mais lentos ou atrasados para evitar que todo o corpo se mova como uma peça única. Criaturas terrestres adaptam a intensidade dos passos à velocidade observada.

Os tempos de combate, colisões, atributos e dados de progresso continuam definidos pelos sistemas existentes. A interpolação é visual; não introduz atraso nos comandos do jogador. O número de quadros exibidos depende do dispositivo e do navegador.

Clones da Mentira usam o mesmo desenho do chefe real. A invisibilidade e a submersão respeitam a opacidade da entidade. Quando Golias fica exposto, o elmo cai e a testa ganha um sinal luminoso. Os nomes e marcadores de atordoamento ficam acima das novas silhuetas.

## Arquivos exportados

As pranchas `art/monstros-redesenhados.png` e `art/chefes-redesenhados.png` apresentam todas as criaturas. `art/movimento-fluido.mp4` é um estudo de 12 segundos com seis exemplos renderizados pelo mesmo código do jogo; não é uma gravação de uma batalha.

- `monstros-atlas.png`: 10 colunas e 16 linhas; células de 192 × 192, 160 quadros.
- `chefes-atlas.png`: 9 colunas e 18 linhas; células de 384 × 384, 146 quadros. As duas últimas linhas contêm somente Golias exposto e Leviatã submerso; as demais células dessas linhas ficam vazias.
- Os JSONs correspondentes registram coordenadas, pivô, escala, criatura, estado e instante de referência.
- Cada criatura tem quatro amostras de repouso, oito de caminhada, duas de preparação, uma de golpe e uma de dano. O aspecto de cada estado depende da anatomia e do comportamento da criatura.

Os raios foram normalizados para 16 nos monstros e 40 nos chefes apenas na exportação. Os tamanhos relativos dentro do jogo continuam usando `src/data/bestiary.js`. A animação ao vivo é procedural e contínua; os atlas são referências complementares e não limitam o movimento a esses quadros.

## Validação

Foram verificadas 573 renderizações de criaturas, conservação das transformações e opacidade do canvas, estados especiais, continuidade do braço e desaceleração da caminhada. Todos os 306 quadros exportados de criaturas têm bordas transparentes, sem corte da silhueta. O build de produção e o fluxo offline de criação, movimento, ataque e inventário também foram conferidos.

A integração com outros jogadores usa o mesmo renderizador e os campos de aparência já transmitidos. Esta revisão não foi testada em uma partida real pelo Supabase.
