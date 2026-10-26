"""Gera as narrações das cutscenes localmente com o OmniVoice (o motor de voz do VoiceStudio), sem conta nem internet
depois do primeiro download do modelo. Salva em public/narracao/<id>-<n>.mp3 e pula os arquivos que já existem.

Uso (num ambiente com torch + omnivoice instalados, ver README):
    python scripts/gerar-narracoes-omnivoice.py                 # só as que faltam
    python scripts/gerar-narracoes-omnivoice.py chefe-satanas   # refaz as que começam com esse id
    python scripts/gerar-narracoes-omnivoice.py --vozes         # recria as vozes de referência (narrador e vilão)

As vozes são sintéticas (design de voz do OmniVoice), criadas uma vez e guardadas em scripts/vozes/*.wav; todas as falas
clonam essas referências, para o narrador soar igual em todas as cutscenes.
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
import torch
from omnivoice import OmniVoice

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'public', 'narracao')
VOZES = os.path.join(RAIZ, 'scripts', 'vozes')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

# como cada voz é desenhada (atributos aceitos pelo OmniVoice) e a frase de referência que ela fala
DESENHO = {
    'narrador': ('male, middle-aged, very low pitch',
                 'No princípio, criou Deus os céus e a terra. E a luz resplandeceu nas trevas, e as trevas não prevaleceram contra ela.'),
    'vilao': ('male, elderly, very low pitch',
              'Eu conheço você. Conheço cada erro. Você não vai escapar de mim, peregrino.'),
}
VELOCIDADE = {'narrador': 0.93, 'vilao': 0.9}
SEMENTE = {'narrador': 7, 'vilao': 13}

# marcas de direção da ElevenLabs → o que o OmniVoice entende (o resto sai do texto)
TAGS = {'[greedy laugh]': '[laughter]', '[yawns]': '[sigh]', '[mocking]': '', '[laughs]': '[laughter]'}


def segmentos():
    # lê as cutscenes direto do jogo (content/cinematicas.js) pelo Node
    js = ("import('file:///" + os.path.join(RAIZ, 'src', 'content', 'cinematicas.js').replace('\\', '/') + "').then(m => {"
          "const out = []; for (const id in m.CINEMAS) for (const s of m.segmentos(id)) out.push({ arquivo: s.arquivo, voz: s.voz, texto: s.texto });"
          "process.stdout.write(JSON.stringify(out)); })")
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], cwd=RAIZ))


def limpa(texto):
    for k, v in TAGS.items():
        texto = texto.replace(k, v)
    texto = re.sub(r'\[(?!laughter\]|sigh\])[^\]]*\]\s*', '', texto)  # tira as outras marcas
    return re.sub(r'\s+', ' ', texto).strip()


def salva_mp3(audio, sr, destino):
    wav = destino[:-4] + '.wav'
    sf.write(wav, audio, sr)
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', destino], check=True)
    os.remove(wav)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    refaz_vozes = '--vozes' in sys.argv
    filtro = args[0] if args else None
    os.makedirs(SAIDA, exist_ok=True); os.makedirs(VOZES, exist_ok=True)
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    print('carregando o modelo em', dev, '…', flush=True)
    model = OmniVoice.from_pretrained('k2-fsa/OmniVoice', device_map=dev, dtype=torch.float16 if dev == 'cuda' else torch.float32)
    sr = model.sampling_rate

    # 1) vozes de referência (uma vez)
    prompts = {}
    for voz, (instr, frase) in DESENHO.items():
        ref = os.path.join(VOZES, voz + '.wav')
        if refaz_vozes or not os.path.exists(ref):
            torch.manual_seed(SEMENTE[voz]); np.random.seed(SEMENTE[voz])
            audio = model.generate(text=frase, language='pt', instruct=instr, speed=VELOCIDADE[voz])[0]
            sf.write(ref, audio, sr)
            print('voz de referência criada:', ref, flush=True)
        prompts[voz] = model.create_voice_clone_prompt(ref_audio=ref, ref_text=frase)

    # 2) as falas
    feitos = 0
    for s in segmentos():
        destino = os.path.join(SAIDA, s['arquivo'] + '.mp3')
        if filtro and not s['arquivo'].startswith(filtro):
            continue
        if not filtro and os.path.exists(destino):
            continue
        texto = limpa(s['texto'])
        print(f"{s['arquivo']} ({s['voz']}, {len(texto)} caracteres)…", end=' ', flush=True)
        torch.manual_seed(1)
        audio = model.generate(text=texto, language='pt', voice_clone_prompt=prompts[s['voz']], speed=VELOCIDADE[s['voz']],
                               audio_chunk_duration=14, audio_chunk_threshold=18)[0]
        salva_mp3(audio, sr, destino)
        feitos += 1
        print(f'ok ({len(audio) / sr:.1f}s)', flush=True)
        if dev == 'cuda':
            torch.cuda.empty_cache()
    print(f'\n{feitos} arquivo(s) gerado(s).')


if __name__ == '__main__':
    main()
