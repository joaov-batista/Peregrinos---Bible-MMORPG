// Dupla local: uma simulação e progresso temporário compartilhado, duas entradas/câmeras.
import { Game } from './game.js';
import { input, input2 } from '../input.js';
import { setGamepadMode } from '../gamepad.js';
import { defaultLook } from '../data/classes.js';
import { newCharData } from './player.js';
import { h, clamp } from '../util.js';

export function rushCharacter() {
  return { id: 'local-rush', name: 'Dupla local', cls: 'guerreiro', level: 1, score: 0, week_score: 0,
    look: defaultLook(), data: newCharData('guerreiro') };
}

// Limiares distintos evitam alternância constante na borda. Considera a altura também.
export function splitNeeded(a, b, width, height, zoom, wasSplit = false) {
  const margin = wasSplit ? 0.46 : 0.65;
  return Math.abs(a.x - b.x) > width / zoom * margin || Math.abs(a.y - b.y) > height / zoom * margin;
}

export class CoopGame extends Game {
  constructor(canvas, ui, mode = 'pads') {
    super(canvas, rushCharacter(), ui, { localCoop: true });
    this.coopMode = mode;
    setGamepadMode(mode);
    this.localPlayers = [this.p, { ...this.p, buffs: {}, controls: input2 }];
    this.localPlayers.forEach((p, i) => {
      p.controls = i ? input2 : input; p.name = 'J' + (i + 1);
      p.color = i ? '#79DFFF' : '#FFE38A';
      p.look = { ...this.char.look, tunic: i ? '#1F8A9E' : '#3B4CCA', cape: i ? '#E9E4D6' : '#E0483A' };
    });
    this.regroup();
    this.viewCanvas = document.createElement('canvas');
    this.viewContext = this.viewCanvas.getContext('2d');
    this.cards = this.localPlayers.map(p => {
      const status = h('small', {}), hp = h('span', {}), fe = h('span', {}), sta = h('span', {});
      const card = h('div', { class: 'coop-card', style: '--player-color:' + p.color }, h('b', {}, p.name), status,
        h('div', { class: 'coop-hp' }, hp), h('div', { class: 'coop-fe' }, fe), h('div', { class: 'coop-sta' }, sta));
      return { card, status, hp, fe, sta };
    });
    this.coopHud = h('div', { class: 'coop-hud' }, ...this.cards.map(c => c.card));
    document.getElementById('hud').append(this.coopHud);
    document.body.classList.add('local-coop');
    ui.toast('Dupla local · sem salvar. J1 conduz diálogos e portais. Start abre o menu.', 7000);
  }

  cinema() { return Promise.resolve(false); }

  destroy() {
    super.destroy(); this.coopHud?.remove();
    document.body.classList.remove('local-coop'); setGamepadMode();
  }

  update(dt) {
    if (this.ui.blocking) input2.clear();
    super.update(dt);
    // J2 combate e coleta; os diálogos/progresso são conduzidos por J1.
    input2.pressed.clear();
    if (this.cards) this.localPlayers.forEach((p, i) => {
      const c = this.cards[i];
      const source = !i && this.coopMode === 'keyboard' ? 'Teclado + mouse' : p.controls.padConnected ? 'Controle conectado' : 'Aperte um botão no controle';
      c.status.textContent = p.dead ? 'Volta em ' + Math.ceil(p.reviveT) + 's' : source;
      c.hp.style.width = clamp(p.hp / this.st.maxHp, 0, 1) * 100 + '%';
      c.fe.style.width = clamp(p.fe / this.st.maxFe, 0, 1) * 100 + '%';
      c.sta.style.width = clamp(p.sta / 100, 0, 1) * 100 + '%';
      c.card.title = p.name + ' · Vida ' + Math.ceil(p.hp) + '/' + this.st.maxHp + ' · Fé ' + Math.floor(p.fe) + ' · Fôlego ' + Math.floor(p.sta);
    });
  }

  updatePlayer(dt) {
    for (const p of this.localPlayers) if (p.dead) p.reviveT -= dt;
    if (this.localPlayers.every(p => p.dead) && this.localPlayers.some(p => p.reviveT <= 0)) {
      for (const p of this.localPlayers) this.revive(p);
      if (this.fase) this.enterFase(this.fase.sem, this.fase.n);
      else this.enterWorld(false, this.pontoDeVolta());
      return;
    }
    for (const p of this.localPlayers) {
      if (p.dead && p.reviveT <= 0) {
        const friend = this.localPlayers.find(other => !other.dead);
        this.revive(p); if (friend) this.placeNear(p, friend);
      }
      this.withPlayer(p, () => super.updatePlayer(dt));
    }
  }

  updatePet(dt) {
    for (const p of this.localPlayers) this.withPlayer(p, () => super.updatePet(dt));
  }

  refreshStats() {
    super.refreshStats();
    for (const p of this.localPlayers || []) {
      p.hp = Math.min(p.hp, this.st.maxHp); p.fe = Math.min(p.fe, this.st.maxFe);
      if (p !== this.p && (p.pet?.kind || null) !== (this.st.pet || null)) p.pet = this.st.pet ? { kind: this.st.pet, x: p.x, y: p.y, fx: 1, walk: 0, cd: 0 } : null;
      if (!this.st.montaria) p.mounted = false;
    }
  }

  gainXp(n) {
    const level = this.char.level;
    super.gainXp(n);
    if (this.char.level > level) for (const p of this.localPlayers) if (!p.dead) { p.hp = this.st.maxHp; p.fe = this.st.maxFe; }
  }

  alvoDe(e) {
    if (!this.localPlayers) return this.eu;
    return this.localPlayers.filter(p => !p.dead).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0] || this.eu;
  }

  playerDown() {
    const p = this.p;
    p.dead = true; p.hp = 0; p.reviveT = 5; p.charm = null; p.guard = false;
    p.controls.clear(); this.char.data.stats.deaths++;
    this.ui.toast(p.name + ' caiu e volta em 5 segundos.');
  }

  revive(p) {
    Object.assign(p, { dead: false, hp: this.st.maxHp, fe: this.st.maxFe, sta: 100, inv: 2, stun: 0,
      dodgeT: 0, drink: 0, holdT: 0, atkBuf: 0, charging: false, mounted: false, charm: null, slow: 1 });
  }

  placeNear(p, anchor) {
    for (const [dx, dy] of [[36, 0], [-36, 0], [0, 36], [0, -36], [0, 0]]) {
      if (!this.cur.map.collides(anchor.x + dx, anchor.y + dy, p.r)) { p.x = anchor.x + dx; p.y = anchor.y + dy; break; }
    }
  }

  regroup() {
    if (!this.localPlayers) return;
    for (const p of this.localPlayers) {
      if (p !== this.eu) this.placeNear(p, this.eu);
      p.lock = null; p.charm = null; p.slow = 1; p.dodgeT = 0; p.mounted = false;
      if (p.dead) this.revive(p);
      if (p.pet) { p.pet.x = p.x; p.pet.y = p.y; }
    }
    this.lock = null; this.split = false;
  }

  enterWorld(...args) { super.enterWorld(...args); this.regroup(); }
  enterHub(...args) { super.enterHub(...args); this.regroup(); }
  enterFase(...args) {
    super.enterFase(...args); this.regroup();
    for (const p of this.localPlayers || []) p.hp = Math.max(p.hp, this.st.maxHp * 0.6);
  }
  viajar(...args) { super.viajar(...args); this.regroup(); }
  enterCasa(...args) { super.enterCasa(...args); this.regroup(); }
  updateInteract() { if (!this.eu.dead) super.updateInteract(); else input.pressed.delete('interact'); }

  // Serviços sociais não participam da partida temporária, mesmo com conta conectada.
  escolherVisita() { this.ui.toast('Visitas online não estão disponíveis na dupla local.'); }
  enterCasaCla() { this.ui.toast('Clãs não estão disponíveis na dupla local.'); }
  livroVisitas() { this.ui.toast('O livro de visitas não está disponível na dupla local.'); }

  render() {
    if (!this.localPlayers) return super.render();
    const [a, b] = this.localPlayers, alive = this.localPlayers.filter(p => !p.dead);
    this.split = alive.length === 2 && splitNeeded(a, b, this.W, this.H, this.Z, this.split);
    const center = alive.length === 1 ? alive[0] : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const original = { cv: this.cv, ctx: this.ctx, W: this.W, H: this.H, Z: this.Z };
    const views = this.split ? [a, b] : [center];
    const width = original.W / views.length;
    const cv = this.viewCanvas;
    const pw = Math.round(width * this.DPR), ph = original.cv.height;
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    original.ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
      this.cv = cv; this.ctx = this.viewContext; this.W = width;
      const lw = Math.ceil(width / 2), lh = Math.ceil(this.H / 2);
      if (this.light.width !== lw || this.light.height !== lh) { this.light.width = lw; this.light.height = lh; }
      views.forEach((camera, i) => {
        this.cameraTarget = camera;
        this.withPlayer(this.split ? this.localPlayers[i] : a, () => super.render());
        if (i === 0) this.aimCamera = { x: this.camL, y: this.camT, z: this.Z };
        const left = Math.round(i * original.cv.width / views.length);
        const right = Math.round((i + 1) * original.cv.width / views.length);
        original.ctx.drawImage(cv, 0, 0, cv.width, cv.height, left, 0, right - left, ph);
      });
    } finally { Object.assign(this, original); this.cameraTarget = null; }
    if (this.aimCamera) { this.camL = this.aimCamera.x; this.camT = this.aimCamera.y; }
    if (this.split) {
      original.ctx.fillStyle = '#E9C777';
      original.ctx.fillRect(Math.floor(original.cv.width / 2) - this.DPR, 0, 2 * this.DPR, original.cv.height);
    }
  }
}
