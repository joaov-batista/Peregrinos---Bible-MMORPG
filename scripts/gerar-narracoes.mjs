// Gera as narrações das cutscenes com o ElevenLabs e salva em public/narracao/<id>-<n>.mp3.
// Uso:   ELEVENLABS_API_KEY=sua_chave node scripts/gerar-narracoes.mjs            (só as que faltam)
//        ELEVENLABS_API_KEY=sua_chave node scripts/gerar-narracoes.mjs prologo    (só as que começam com "prologo"; refaz)
// Opcional: ELEVENLABS_MODEL (padrão eleven_v3, que entende as marcas [whispers], [tense]…),
//           VOZ_NARRADOR e VOZ_VILAO (ids de voz do ElevenLabs).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { CINEMAS, segmentos } from '../src/content/cinematicas.js';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Defina ELEVENLABS_API_KEY (Perfil › API Keys no site do ElevenLabs).'); process.exit(1); }
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_v3';
const VOZES = {
  narrador: process.env.VOZ_NARRADOR || 'NFmEzNOony1UsEJGXLth', // Carlos — Resonant & Majestic Storyteller (pt-BR)
  vilao: process.env.VOZ_VILAO || 'acdKA5HckGxoxxvy40dA'        // Nassif — grave, sombrio (pt-BR)
};
const filtro = process.argv[2];
const DIR = new URL('../public/narracao/', import.meta.url);
mkdirSync(DIR, { recursive: true });

let feitos = 0, chars = 0;
for (const id of Object.keys(CINEMAS)) {
  if (filtro && !id.startsWith(filtro)) continue;
  for (const s of segmentos(id)) {
    const out = new URL(s.arquivo + '.mp3', DIR);
    if (!filtro && existsSync(out)) continue;
    process.stdout.write(s.arquivo + ' (' + s.voz + ', ' + s.texto.length + ' caracteres)… ');
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOZES[s.voz] + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: s.texto, model_id: MODEL, language_code: 'pt',
        voice_settings: s.voz === 'vilao' ? { stability: 0.35, similarity_boost: 0.8, style: 0.6 } : { stability: 0.5, similarity_boost: 0.8, style: 0.35 } })
    });
    if (!r.ok) {
      const erro = await r.text(); console.log('ERRO ' + r.status + ': ' + erro.slice(0, 300));
      if (r.status === 401 || /quota/i.test(erro)) process.exit(1); // sem chave válida ou sem créditos: não adianta continuar
      continue;
    }
    writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    feitos++; chars += s.texto.length; console.log('ok');
  }
}
console.log('\n' + feitos + ' arquivo(s) gerado(s), ' + chars + ' caracteres.');
