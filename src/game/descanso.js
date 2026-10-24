// Ciclo "souls" com sentido bíblico:
// - Pedras de Ebenézer: descansar cura, enche a botija, salva o ponto de volta e libera a viagem rápida (1Sm 7:12).
// - Botija da Viúva: cura com cargas; beber leva quase um segundo, parado e vulnerável (1Rs 17:14).
// - Sacola de talentos: ao cair no mundo, os denários ficam numa sacola onde você caiu; volte para buscar.
//   Se cair de novo antes, a sacola antiga se perde (parábola dos talentos, Mt 25:25).
import { TS } from './world.js';
import { ell, rr } from '../util.js';
import { sfx } from '../audio.js';
import { EBENEZER, BOTIJA } from '../data/ebenezer.js';

export function instalarDescanso(Game) { Object.assign(Game.prototype, metodos); }

const metodos = {
  // pedras no chão livre mais perto do ponto do mapa
  criarAltares() {
    const m = this.world.map;
    this.altares = EBENEZER.map(a => {
      let best = null;
      for (let r = 0; r < 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
        const tx = a.tx + dx, ty = a.ty + dy;
        if (!m.solid(tx, ty) && !m.solid(tx, ty - 1) && !m.solid(tx + 1, ty) && !m.solid(tx - 1, ty)) { best = { x: tx * TS + 16, y: ty * TS + 16 }; break; }
      }
      return { ...a, ...(best || { x: a.tx * TS + 16, y: a.ty * TS + 16 }) };
    });
  },
  acesas() { return (this.char.data.ebenezer = this.char.data.ebenezer || ['cidade']); },
  botija() { const d = this.char.data; return (d.botija = d.botija || { n: BOTIJA.cargas, max: BOTIJA.cargas }); },

  descansar(a) {
    const c = this.char, p = this.p, acesas = this.acesas();
    if (!acesas.includes(a.id)) {
      acesas.push(a.id); sfx('level'); this.burst(a.x, a.y - 20, 40, '#FFE38A', 220);
      this.ui.banner('PEDRA DE EBENÉZER ACESA', a.nome, '"Até aqui nos ajudou o Senhor" (1Sm 7:12)');
    }
    p.hp = this.st.maxHp; p.fe = this.st.maxFe; p.sta = 100;
    const b = this.botija(); b.n = b.max;
    c.data.descanso = a.id; sfx('heal');
    this.addText(p.x, p.y - 40, 'Descansou · botija cheia', '#9BD98A', 14);
    this.save();
    const outras = this.altares.filter(o => o.id !== a.id && acesas.includes(o.id));
    this.ui.dialog({
      nome: 'Pedra de Ebenézer · ' + a.nome,
      texto: 'Você descansou. Vida e Fé restauradas, a Botija da Viúva está cheia (' + b.max + ' cargas), e é aqui que você vai se levantar se cair.\n\n' +
        (outras.length ? 'Pedras acesas: ' + acesas.length + '/' + this.altares.length + '. Para onde quer ir?' : 'Acenda outras pedras pelo mundo para viajar entre elas.'),
      acoes: [...outras.map(o => ({ label: '➜ ' + o.nome, fn: () => this.viajar(o) })), { label: 'Ficar aqui' }]
    });
  },
  viajar(a) {
    const p = this.p;
    this.dismount(true);
    p.x = a.x; p.y = a.y + 36; this.lock = null;
    if (this.pet) { this.pet.x = p.x - 24; this.pet.y = p.y; }
    sfx('gate'); this.burst(p.x, p.y, 30, '#FFE38A', 200);
    this.ui.toast('Você chegou: ' + a.nome);
  },
  // ponto onde o jogador levanta depois de cair no mundo
  pontoDeVolta() {
    const a = this.altares?.find(o => o.id === this.char.data.descanso) || this.altares?.find(o => o.id === 'cidade');
    return a ? { x: a.x, y: a.y + 36 } : null;
  },

  // ---------- Botija da Viúva ----------
  beberBotija() {
    const p = this.p, b = this.botija();
    if (p.drink > 0 || p.dead) return;
    if (b.n <= 0) { this.addText(p.x, p.y - 36, 'Botija vazia! Descanse numa Pedra de Ebenézer.', '#FFB3B3', 12); return; }
    b.n--; p.drink = BOTIJA.tempo; p.holdT = 0; p.charging = false; sfx('click');
  },
  // chamado todo quadro; enquanto bebe, não ataca e anda bem devagar
  tickBotija(dt) {
    const p = this.p;
    if (!(p.drink > 0)) return false;
    p.drink -= dt;
    if (p.drink <= 0) {
      const cura = this.st.maxHp * BOTIJA.cura;
      p.hp = Math.min(this.st.maxHp, p.hp + cura); sfx('heal');
      this.addText(p.x, p.y - 38, '+' + Math.round(cura), '#7CE0A0', 16);
      this.burst(p.x, p.y - 10, 16, '#9FE6F0', 120);
    }
    return true;
  },

  // ---------- Sacola de talentos ----------
  deixarSacola() {
    const c = this.char, p = this.p, g = c.data.gold;
    const perdeu = c.data.sacola?.v || 0;
    c.data.sacola = g > 0 ? { x: Math.round(p.x), y: Math.round(p.y), v: g } : null;
    c.data.gold = 0;
    return { deixou: g, perdeu };
  },
  pegarSacola() {
    const c = this.char, s = c.data.sacola, p = this.p;
    if (!s || this.scene !== 'world' || p.dead) return;
    if (Math.hypot(s.x - p.x, s.y - p.y) > 34) return;
    c.data.gold += s.v; c.data.sacola = null; sfx('coin'); sfx('level');
    this.burst(s.x, s.y, 30, '#FFD23F', 220);
    this.addText(p.x, p.y - 44, '+' + s.v + ' denários recuperados!', '#FFD23F', 15, 2);
    this.ui.toast('Você recuperou sua sacola de talentos! "Muito bem, servo bom e fiel" (Mt 25:21)', 4500);
    this.save();
  },

  // ---------- Desenho ----------
  drawAltar(g, a, T) {
    const acesa = this.acesas().includes(a.id), x = a.x, y = a.y;
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x, y + 10, 20, 6); g.fill();
    g.lineJoin = 'round'; g.lineWidth = 1.6; g.strokeStyle = '#2A1A10';
    // pedras empilhadas (memorial)
    rr(g, x - 16, y - 2, 32, 14, 5); g.fillStyle = '#8F8C86'; g.fill(); g.stroke();
    rr(g, x - 11, y - 16, 22, 15, 5); g.fillStyle = '#A9A59D'; g.fill(); g.stroke();
    rr(g, x - 7, y - 30, 14, 15, 5); g.fillStyle = '#C2BEB5'; g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - 5, y - 28, 4, 10);
    if (acesa) {
      // chama sobre a pedra
      const f = Math.sin(T * 9) * 1.5;
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, y - 40, 2, x, y - 40, 40); gr.addColorStop(0, 'rgba(255,220,120,.55)'); gr.addColorStop(1, 'rgba(255,180,60,0)');
      g.fillStyle = gr; ell(g, x, y - 40, 40, 40); g.fill(); g.restore();
      g.fillStyle = '#FF9A3C'; g.beginPath(); g.moveTo(x - 6, y - 31); g.quadraticCurveTo(x - 7, y - 44 + f, x, y - 52 + f); g.quadraticCurveTo(x + 7, y - 44 - f, x + 6, y - 31); g.closePath(); g.fill();
      g.fillStyle = '#FFE38A'; g.beginPath(); g.moveTo(x - 3, y - 31); g.quadraticCurveTo(x - 3, y - 40, x, y - 45 + f); g.quadraticCurveTo(x + 3, y - 40, x + 3, y - 31); g.closePath(); g.fill();
    }
    g.font = '700 10px Cinzel, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)';
    const label = 'Ebenézer'; g.strokeText(label, x, y + 24); g.fillStyle = acesa ? '#FFE38A' : '#D8D2C4'; g.fillText(label, x, y + 24);
  },
  drawSacola(g, T) {
    const s = this.char.data.sacola; if (!s || this.scene !== 'world') return;
    const x = s.x, y = s.y + Math.sin(T * 3) * 2;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y - 6, 2, x, y - 6, 34); gr.addColorStop(0, 'rgba(255,215,90,.6)'); gr.addColorStop(1, 'rgba(255,215,90,0)');
    g.fillStyle = gr; ell(g, x, y - 6, 34, 34); g.fill(); g.restore();
    g.lineWidth = 1.5; g.strokeStyle = '#2A1A10';
    g.beginPath(); g.moveTo(x - 9, y + 8); g.quadraticCurveTo(x - 12, y - 6, x - 4, y - 9); g.lineTo(x + 4, y - 9); g.quadraticCurveTo(x + 12, y - 6, x + 9, y + 8); g.closePath();
    g.fillStyle = '#B08D57'; g.fill(); g.stroke();
    g.fillStyle = '#7A5232'; g.fillRect(x - 5, y - 11, 10, 3);
    g.fillStyle = '#FFD23F'; g.font = '900 10px Nunito'; g.textAlign = 'center'; g.fillText('🪙', x, y + 4);
    g.font = '800 10px Nunito'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; const t = 'Sua sacola · ' + s.v;
    g.strokeText(t, x, y - 18); g.fillStyle = '#FFE38A'; g.fillText(t, x, y - 18);
  }
};
