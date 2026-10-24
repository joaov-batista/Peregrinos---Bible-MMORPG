// Pedras de Ebenézer: "Até aqui nos ajudou o Senhor" (1Sm 7:12).
// Descansar numa pedra cura tudo, enche a Botija da Viúva, vira o ponto onde você levanta ao cair
// e libera a viagem rápida entre as pedras já acesas. tx/ty em tiles (o jogo procura o chão livre mais perto).
export const EBENEZER = [
  { id: 'cidade', nome: 'Cidade de Refúgio', tx: 86, ty: 78 },
  { id: 'portoes', nome: 'Caminho dos Portões', tx: 98, ty: 40 },
  { id: 'colinas', nome: 'Colinas de Efraim', tx: 92, ty: 56 },
  { id: 'campos', nome: 'Campos de Belém', tx: 106, ty: 103 },
  { id: 'ela', nome: 'Vale de Elá', tx: 84, ty: 105 },
  { id: 'lago', nome: 'Lago de Genesaré', tx: 53, ty: 97 },
  { id: 'floresta', nome: 'Floresta do Líbano', tx: 61, ty: 80 },
  { id: 'deserto', nome: 'Deserto de Sim', tx: 138, ty: 91 },
  { id: 'costa', nome: 'Costa de Jope', tx: 126, ty: 52 }
];

// Botija da Viúva: "A farinha da panela não se acabará, e o azeite da botija não faltará" (1Rs 17:14).
export const BOTIJA = { cargas: 3, cura: 0.42, tempo: 0.9 };
