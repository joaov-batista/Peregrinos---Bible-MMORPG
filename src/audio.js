// Efeitos sonoros e música sintetizados (WebAudio), sem arquivos.
import { store } from './util.js';
import { config } from './config.js';

let AC = null, master = null, musicGain = null, sfxGain = null, musicTimer = null;
export const audio = { muted: store.get('peregrinos.mute', false) };

export function initAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = audio.muted ? 0 : 0.8; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.connect(master);
      sfxGain = AC.createGain(); sfxGain.connect(master);
      setVolumes();
    } catch { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}
// volumes separados de música e efeitos (menu › Ajustes)
export function setVolumes() { if (!AC) return; musicGain.gain.value = 0.2 * (config.volMusica ?? 0.8); sfxGain.gain.value = config.volEfeitos ?? 1; }
export function setMuted(m) { audio.muted = m; store.set('peregrinos.mute', m); if (master) master.gain.value = m ? 0 : 0.8; }

function tone(f1, f2, dur, type = 'sine', vol = 0.2, delay = 0, dest) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || sfxGain || master); o.start(t); o.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol = 0.15, freq = 1200) {
  if (!AC) return;
  const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.value = vol;
  n.buffer = b; n.connect(f); f.connect(g); g.connect(sfxGain || master); n.start();
}

export function sfx(n) {
  if (!AC || audio.muted) return;
  switch (n) {
    case 'swing': noiseBurst(0.12, 0.12, 2400); break;
    case 'hit': tone(220, 90, 0.12, 'square', 0.12); noiseBurst(0.08, 0.1, 800); break;
    case 'crit': tone(520, 160, 0.18, 'square', 0.14); noiseBurst(0.1, 0.14, 1400); break;
    case 'hurt': tone(160, 70, 0.25, 'sawtooth', 0.16); break;
    case 'block': tone(900, 600, 0.08, 'triangle', 0.18); break;
    case 'parry': tone(1200, 1800, 0.12, 'triangle', 0.2); tone(1800, 2400, 0.15, 'sine', 0.12, 0.05); break;
    case 'dodge': noiseBurst(0.18, 0.08, 600); break;
    case 'shoot': tone(700, 300, 0.1, 'triangle', 0.1); break;
    case 'magic': tone(400, 1200, 0.3, 'sine', 0.14); tone(600, 1600, 0.3, 'sine', 0.08, 0.05); break;
    case 'kill': tone(300, 600, 0.12, 'square', 0.1); tone(600, 900, 0.12, 'square', 0.08, 0.08); break;
    case 'coin': tone(988, 0, 0.08, 'square', 0.08); tone(1319, 0, 0.18, 'square', 0.08, 0.07); break;
    case 'heal': [523, 659, 784].forEach((f, i) => tone(f, 0, 0.3, 'sine', 0.12, i * 0.08)); break;
    case 'right': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.18, 'triangle', 0.12, i * 0.07)); break;
    case 'wrong': tone(300, 150, 0.35, 'sawtooth', 0.12); break;
    case 'key': [784, 988, 1319].forEach((f, i) => tone(f, 0, 0.25, 'triangle', 0.14, i * 0.09)); break;
    case 'level': [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, 0, 0.3, 'triangle', 0.14, i * 0.09)); break;
    case 'boss': tone(80, 40, 1.2, 'sawtooth', 0.2); tone(120, 60, 1.2, 'square', 0.08, 0.1); break;
    case 'gate': tone(200, 400, 0.6, 'sine', 0.14); tone(300, 600, 0.6, 'sine', 0.1, 0.1); break;
    case 'click': tone(660, 0, 0.05, 'square', 0.05); break;
    case 'step': noiseBurst(0.03, 0.03, 400); break;
  }
}

// Música ambiente: arpejo modal de lira, troca de clima no combate com chefe.
const SCALES = { mundo: [0, 2, 3, 5, 7, 9, 10], chefe: [0, 1, 4, 5, 7, 8, 10], fase: [0, 2, 4, 5, 7, 9, 11] };
export function music(mode) {
  if (!AC) return;
  clearInterval(musicTimer);
  if (!mode) return;
  const sc = SCALES[mode] || SCALES.mundo, root = mode === 'chefe' ? 110 : 146.8;
  let step = 0;
  const beat = mode === 'chefe' ? 210 : 340;
  musicTimer = setInterval(() => {
    if (audio.muted || document.hidden) return;
    const pat = [0, 2, 4, 2, 5, 4, 2, 1];
    const deg = pat[step % 8] + (step % 32 >= 16 ? 2 : 0);
    const f = root * Math.pow(2, (sc[deg % 7] + 12 * Math.floor(deg / 7)) / 12);
    tone(f, 0, beat / 1000 * 2.2, 'triangle', 0.18, 0, musicGain);
    if (step % 8 === 0) tone(root / 2, 0, beat / 1000 * 7, 'sine', 0.22, 0, musicGain);
    if (mode === 'chefe' && step % 2 === 0) tone(55, 40, 0.12, 'square', 0.12, 0, musicGain);
    step++;
  }, beat);
}
