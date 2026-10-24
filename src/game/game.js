// Núcleo do jogo: loop, câmera, combate, inimigos, chefes, fases e mundo compartilhado.
import { TAU, rand, randi, clamp, lerp, pick, angDiff, ell, rr, shuffle, weekId } from '../util.js';
import { input } from '../input.js';
import { viewSize, zoom } from '../zoom.js';
import { sfx, music } from '../audio.js';
import { net, ONLINE } from '../net.js';
import { config } from '../config.js';
import { vibrar } from '../gamepad.js';
import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES, BOSSES, ACUSACOES, FALSAS } from '../data/bestiary.js';
import { WORLD_NPCS, QUESTS } from '../data/npcs.js';
import { SEMANAS, SEMANA_ATUAL } from '../content/index.js';
import { TS, T, generateWorld, buildFase, buildSalao, buildSemanaSala, zoneAt, ZONES, GATE_XS, GATE_Y, makeMinimap } from './world.js';
import { MOVES, MOVIMENTOS, REGRAS, faseAtual, modDano, aoDefender } from './bossMoves.js';
import { instalarMundoNet } from './mundoNet.js';
import { instalarDescanso } from './descanso.js';
import { drawPerson, drawWeapon, drawEnemy, drawBoss, drawChest, drawPortal, drawSheep, drawProjectile, drawAnimal, shade } from './draw.js';
import { computeStats, xpNeed, addItem, removeItem, count, faseProg, arrumarArmas, MAX_LEVEL } from './player.js';

const SPAWN = { x: 90 * TS + 16, y: 78 * TS + 8 };
const RIDE_H = { cavalo: 17, burrinho: 12 }; // quanto o cavaleiro fica acima do chão em cada montaria
// animais que lutam: mult = fração do ataque do jogador, cd = segundos entre golpes
const PET_LUTA = { cachorro: { mult: 0.45, cd: 1.1, som: 'Au!' }, gato: { mult: 0.22, cd: 0.5, som: 'Miau!' } };
// chance do prêmio da fase (ex.: peça da Armadura de Deus) cair num baú do tesouro / no fim da fase
const CHANCE_PREMIO = { bau: 0.15, fim: 0.35 };
const PERFEITA = 0.35; // janela da defesa perfeita (s) depois de levantar o escudo
// combate com peso: cada golpe gasta fôlego; segurar o ataque carrega um golpe forte; os golpes enchem a postura do inimigo
const CUSTO_ATK = { espada: 10, funda: 8, cajado: 10, trombeta: 12, adaga: 6, lanca: 12, chicote: 11 };
const CARGA = { inicio: 0.3, cheia: 0.85, custo: 22 }; // s segurando para começar e para completar; fôlego do golpe forte
// dificuldade dos vícios: mais vida e dano, atacam mais vezes e notam o jogador de mais longe
const DIF = { hp: 1.3, atk: 1.25, cd: 0.78, aggro: 170 };
// dificuldade dos chefes: mais vida e dano, e menos pausa entre um golpe e outro
const DIF_CHEFE = { hp: 1.5, atk: 1.32, ritmo: 0.78 };
let WORLD = null; // gerado uma única vez

export class Game {
  constructor(canvas, char, ui) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.char = char; this.ui = ui;
    this.T = 0; this.shakeA = 0; this.hitstop = 0; this.saveT = 0; this.netT = 0; this.mmT = 0;
    this.parts = []; this.texts = []; this.projs = []; this.tele = []; this.hazards = []; this.pickups = [];
    this.others = new Map(); this.zone = null; this.light = document.createElement('canvas');
    if (!WORLD) WORLD = generateWorld();
    this.world = WORLD;
    this.refreshStats();
    const d = char.data;
    this.p = {
      x: SPAWN.x, y: SPAWN.y, r: 12, fx: 0, fy: 1, walk: 0, moving: false,
      hp: d.hp ?? this.st.maxHp, fe: d.fe ?? this.st.maxFe, sta: 100,
      inv: 0, atkT: 0, atkCd: 0, combo: 0, comboT: 0, skillCd: 0, dodgeT: 0, dodgeCd: 0, dvx: 0, dvy: 0,
      guard: false, guardT: 0, staT: 0, stun: 0, mounted: false, slow: 1, charm: null, buffs: {}, swingA: 0, spin: 0, carrying: null,
      holdT: 0, atkBuf: 0, charging: false
    };
    if (d.pos && !this.world.map.solid(Math.floor(d.pos.x / TS), Math.floor(d.pos.y / TS))) { this.p.x = d.pos.x; this.p.y = d.pos.y; }
    this.p.hp = Math.min(this.p.hp, this.st.maxHp);
    this.eu = this.p; // o jogador de verdade (this.p vira outro jogador por um instante quando o anfitrião simula a IA)
    this.nidSeq = 0; this.proxies = new Map();
    arrumarArmas(char); // saves antigos podiam ter armas de outra classe na mochila
    this.refreshStats(); // de novo, agora com o jogador criado (animal de estimação)
    // tela cheia e giro do celular nem sempre disparam "resize" na hora certa: observa o tamanho real
    this._rs = () => { this.resize(); setTimeout(() => this.resize(), 250); };
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(document.documentElement);
    addEventListener('resize', this._rs); addEventListener('orientationchange', this._rs); document.addEventListener('fullscreenchange', this._rs);
    this.resize();
    this.enterWorld(true);
    if (ONLINE) this.net = net.joinWorld({ id: char.id, name: char.name, cls: char.cls }, {
      pos: m => this.onNetPos(m), chat: m => this.onNetChat(m), ev: m => this.onNetEv(m), leave: k => this.others.delete(k), count: n => this.ui.online(n)
    });
    this.social = { clan: null, friends: new Set(), pedidos: 0 };
    this.refreshSocial();
    this.last = performance.now();
    this.running = true;
    requestAnimationFrame(t => this.loop(t));
  }

  destroy() {
    this.running = false; this.net?.leave(); music(null);
    this._ro.disconnect(); removeEventListener('resize', this._rs); removeEventListener('orientationchange', this._rs); document.removeEventListener('fullscreenchange', this._rs);
  }

  refreshStats() {
    this.st = computeStats(this.char);
    if (this.p && !this.st.montaria) this.p.mounted = false;
    if (this.p && (this.pet?.kind || null) !== (this.st.pet || null)) this.pet = this.st.pet ? { kind: this.st.pet, x: this.p.x - 24, y: this.p.y, fx: 1, walk: 0, moving: false, cd: 0 } : null;
    this.ui.mountBtn?.(!!this.st.montaria, this.p?.mounted);
    if (this.p) { this.p.hp = Math.min(this.p.hp, this.st.maxHp); this.p.fe = Math.min(this.p.fe, this.st.maxFe); } }

  resize() {
    const DPR = Math.min(2, devicePixelRatio || 1);
    const { W, H, w, h } = viewSize();
    if (W === this.W && H === this.H && DPR === this.DPR) return;
    this.W = W; this.H = H; this.DPR = DPR;
    this.cv.width = Math.round(this.W * DPR); this.cv.height = Math.round(this.H * DPR);
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    // câmera calculada no tamanho "sem zoom": o zoom do navegador não muda quanto do mapa aparece
    this.Z = clamp(Math.min(h / (12 * TS), w / (19 * TS)), 0.8, 2.1) / zoom;
    this.light.width = Math.ceil(this.W / 2); this.light.height = Math.ceil(this.H / 2);
  }

  /* ================= Cenas ================= */
  enterWorld(first, at) {
    this.scene = 'world'; this.cur = { map: this.world.map, lights: this.world.lights };
    this.projs = []; this.tele = []; this.hazards = []; this.pickups = []; this.chests = [];
    this.npcs = WORLD_NPCS.map(n => ({ ...n, x: n.tx * TS + 16, y: n.ty * TS + 16, talkT: 0 }));
    if (!this.altares) this.criarAltares();
    this.enemies = [];
    this.spawns = this.world.spawns.map((s, i) => ({ ...s, i, alive: false, at: 0 }));
    this.worldSince = Date.now(); this._host = undefined;
    for (const s of this.spawns) this.spawnFrom(s);
    // chefes do mundo: todo chefe com "mundo" no bestiário mora num ponto do mapa
    this.worldBosses = Object.entries(BOSSES).filter(([, d]) => d.mundo)
      .map(([id, d]) => ({ id, home: { x: d.mundo.tx * TS, y: d.mundo.ty * TS }, at: 0, alive: false }));
    for (const wb of this.worldBosses) this.spawnWorldBoss(wb);
    this.pecado = null;
    if (at) { this.p.x = at.x; this.p.y = at.y; }
    else if (!first) { this.p.x = SPAWN.x; this.p.y = SPAWN.y; }
    if (this.pet) { this.pet.x = this.p.x - 24; this.pet.y = this.p.y; }
    this.fase = null; this.boss = null; this.hub = null;
    this.ui.bossBar(null); this.ui.faseHud(null);
    this.ui.minimapSource(this.world.minimap, this.world.map.w, this.world.map.h);
    music('mundo');
    this.zone = null;
  }

  // Salão das Dungeons (um portal por semana) e sala de cada semana (5 portais de fase + guia)
  enterHub(hub, built, at) {
    this.scene = 'salao'; this.hub = hub;
    this.cur = { map: built.map, lights: built.lights };
    this.projs = []; this.tele = []; this.hazards = []; this.pickups = []; this.enemies = []; this.chests = [];
    this.fase = null; this.boss = null; this.pecado = null;
    this.npcs = hub.guia && built.guia ? [{ id: 'guia', ...hub.guia, x: built.guia.x, y: built.guia.y, talkT: 0 }] : [];
    this.portais = built.portals.map(pt => ({ ...pt, ...hub.portal(pt.key) })).filter(pt => pt.label);
    this.saida = built.exit;
    const pt = at && this.portais.find(x => x.key === at);
    if (pt) { this.p.x = pt.x; this.p.y = pt.y + 56; } else { this.p.x = built.start.x; this.p.y = built.start.y; }
    this.p.charm = null; this.p.slow = 1; this.dismount(true);
    if (this.pet) { this.pet.x = this.p.x - 24; this.pet.y = this.p.y; }
    this.ui.bossBar(null); this.ui.faseHud(null);
    this.ui.minimapSource(makeMinimap(built.map));
    music('fase');
  }
  enterSalao(at) {
    const c = this.char, built = buildSalao(SEMANAS.length);
    this.enterHub({
      tipo: 'salao', nome: 'Salão das Dungeons',
      guia: { nome: 'Esdras, o Guardião', look: { skin: '#E3B48C', hair: '#D9D2C5', tunic: '#3E3656', cape: '#F2C14E', style: 'turbante', beard: true },
        falas: ['Bem-vindo ao Salão das Dungeons! Cada portal leva à sala de uma semana de estudo.', 'O portal NOVO é o estudo desta semana. Os outros são semanas passadas: você pode jogar quando quiser e ganhar os prêmios que faltam.', '"Lâmpada para os meus pés é a tua palavra" (Sl 119:105). Leia o texto de cada fase antes de entrar!'] },
      portal: k => {
        const sem = SEMANAS[k - 1]; if (!sem) return {};
        const prog = faseProg(c, sem.id), feitas = sem.fases.filter(x => prog[x.n]?.done).length, nova = sem === SEMANA_ATUAL;
        return { sem, state: feitas === sem.fases.length ? 'feito' : 'aberto', tag: nova ? 'NOVA' : 'Semana ' + k, label: sem.titulo + ' (' + feitas + '/' + sem.fases.length + ')', fn: () => { sfx('gate'); this.enterSemana(sem); } };
      }
    }, built, at);
    this.ui.banner('SALÃO DAS DUNGEONS', 'Escolha uma semana de estudo', SEMANAS.length + (SEMANAS.length > 1 ? ' semanas' : ' semana'));
  }
  enterSemana(sem, at) {
    const c = this.char, prog = faseProg(c, sem.id), built = buildSemanaSala(sem.sala);
    const guia = sem.guia || { nome: 'Silas, o Guia', look: { skin: '#C68B59', hair: '#2B1A10', tunic: '#1F8A9E', cape: '#F2C14E', style: 'curto', beard: true } };
    this.enterHub({
      tipo: 'semana', sem, nome: sem.titulo,
      guia: { ...guia, falas: [
        'Esta é a semana "' + sem.titulo + '" — estudo de ' + sem.estudo + '.',
        sem.resumo,
        '📖 Antes de cada fase, leia o texto na sua Bíblia: ' + sem.fases.map(x => 'Fase ' + x.n + ' (' + x.ref + ')').join(', ') + '. As perguntas dos baús saem desses textos!',
        'Versículo da semana: "' + sem.versiculo.texto + '" (' + sem.versiculo.ref + ').',
        'Complete as ' + sem.fases.length + ' fases para ganhar ' + ITEMS[sem.recompensaSemana].icon + ' ' + ITEMS[sem.recompensaSemana].nome + '!'
      ] },
      portal: k => {
        const fd = sem.fases[k - 1]; if (!fd) return {};
        const open = (k === 1 || prog[k - 1]?.done) && c.level >= fd.nivel;
        return { fase: fd, state: prog[k]?.done ? 'feito' : open ? 'aberto' : 'fechado', tag: 'Fase ' + k, label: fd.nome, fn: () => this.gateDialog(sem, k) };
      }
    }, built, at);
    if (!at) this.ui.banner(sem === SEMANA_ATUAL ? 'SEMANA NOVA' : 'SEMANA PASSADA', sem.titulo, sem.estudo);
  }

  enterFase(sem, n) {
    const fase = sem.fases[n - 1];
    const built = buildFase(fase);
    this.scene = 'fase';
    this.cur = { map: built.map, lights: built.lights };
    this.hub = null;
    this.fase = { def: fase, sem, n, built, keys: 0, quiz: shuffle(fase.quiz.slice()), t0: this.T, kills: 0, ok: 0, err: 0, revived: false, bossSpawned: false, done: false, healCd: 0 };
    this.projs = []; this.tele = []; this.hazards = []; this.pickups = []; this.enemies = []; this.boss = null;
    this.chests = built.chests.map(c => ({ ...c, open: false, locked: 0 }));
    this.npcs = built.npcs.map(n2 => { const d = fase.npcs[n2.key]; return { id: 'f' + n2.key, nome: d.nome, look: d.look, falas: d.falas, x: n2.x, y: n2.y, talkT: 0 }; });
    const lvBoost = 1 + (n - 1) * 0.24;
    for (const e of built.enemies) this.enemies.push(this.makeEnemy(pick(fase.inimigos), e.x, e.y, lvBoost));
    this.p.x = built.start.x; this.p.y = built.start.y; this.p.charm = null; this.p.slow = 1; this.dismount(true);
    if (this.pet) { this.pet.x = this.p.x - 24; this.pet.y = this.p.y; }
    this.p.hp = Math.max(this.p.hp, this.st.maxHp * 0.6);
    this.ui.bossBar(null);
    this.ui.faseHud({ n, nome: fase.nome, keys: 0, objetivo: fase.objetivo });
    this.ui.minimapSource(makeMinimap(built.map));
    this.ui.banner('FASE ' + n, fase.nome, fase.ref);
    music('fase');
  }

  exitFase() {
    this.enterSemana(this.fase.sem, this.fase.n);
    this.save();
  }
  // saída do salão / da sala da semana
  exitHub() {
    if (this.hub?.tipo === 'semana') this.enterSalao(SEMANAS.indexOf(this.hub.sem) + 1);
    else this.enterWorld(false, { x: GATE_XS[0] * TS + 16, y: (GATE_Y + 2) * TS + 16 });
  }

  /* ================= Entidades ================= */
  makeEnemy(type, x, y, boost = 1) {
    const d = ENEMIES[type];
    const hp = Math.round(d.hp * boost * DIF.hp);
    return {
      kind: 'enemy', nid: 'a' + String(this.char.id).slice(0, 6) + '.' + (++this.nidSeq), boost, type, d, x, y, hx: x, hy: y, r: d.r, hp, max: hp, atk: Math.round(d.atk * boost * DIF.atk), def: d.def, spd: d.spd,
      xp: Math.round(d.xp * boost), ouro: Math.round(d.ouro * boost), lv: Math.round(d.lv * boost),
      ph: Math.random() * 10, flash: 0, kx: 0, ky: 0, cd: rand(0.5, 1.5), telegraph: 0, aggro: false, stun: 0, dash: 0, stolen: 0,
      pos: 0, posMax: Math.round(22 + d.lv * 6), broken: 0
    };
  }
  spawnFrom(s) {
    const e = this.makeEnemy(s.type, s.tx * TS + 16, s.ty * TS + 16);
    e.spawn = s; e.nid = 's' + s.i; s.alive = true; this.enemies.push(e);
  }
  makeBoss(id, x, y) {
    const d = BOSSES[id];
    return {
      kind: 'boss', nid: 'a' + String(this.char.id).slice(0, 6) + '.' + (++this.nidSeq), id, d, x, y, hx: x, hy: y, r: d.r, hp: Math.round(d.hp * DIF_CHEFE.hp), max: Math.round(d.hp * DIF_CHEFE.hp), atk: Math.round(d.atk * DIF_CHEFE.atk), def: d.def, spd: d.spd,
      flash: 0, kx: 0, ky: 0, stun: 0, act: null, actT: 1.5, cd: 2, lastHit: 0, phase: 0, accused: 0, ph: 0, engaged: false, alpha: 1,
      pos: 0, posMax: d.postura ?? Math.round(90 + d.lv * 12), broken: 0
    };
  }
  spawnWorldBoss(wb) {
    const b = this.makeBoss(wb.id, wb.home.x, wb.home.y);
    b.world = wb; wb.alive = true; b.nid = 'b:' + wb.id;
    if (b.d.ancoras) {
      // pontos na água perto da margem, de onde o chefe pode ressurgir (golpe "mergulho")
      b.anchors = [];
      const m = this.world.map, [x0, y0, x1, y1] = b.d.ancoras.area;
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
        if (m.get(tx, ty) !== T.WATER) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t2 = m.get(tx + dx * 2, ty + dy * 2); return t2 === T.SAND || t2 === T.PATH || t2 === T.GRASS; })) b.anchors.push({ x: tx * TS + 16, y: ty * TS + 16 });
      }
      if (b.anchors.length) { const a = b.anchors.reduce((best, a2) => Math.hypot(a2.x - wb.home.x, a2.y - wb.home.y) < Math.hypot(best.x - wb.home.x, best.y - wb.home.y) ? a2 : best); b.x = b.hx = a.x; b.y = b.hy = a.y; }
    }
    this.enemies.push(b);
  }

  /* ================= Loop ================= */
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.hitstop > 0) this.hitstop -= dt;
    else this.update(dt);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.T += dt;
    const blocking = this.ui.blocking;
    this.updateFx(dt);
    this.updateOthers(dt);
    if (blocking) {
      input.pressed.clear();
      if (this.netAtivo() && this.souHost() && this.proxies.size) { this.updateEnemies(dt); this.updateProjectiles(dt); this.updateTele(dt); this.netTick(dt); }
      return;
    }
    this.char.data.stats.playtime += dt;
    this.updatePlayer(dt);
    this.updatePet(dt);
    this.netTick(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateTele(dt);
    this.updatePickups(dt);
    if (this.scene === 'world') this.updateWorld(dt); else if (this.scene === 'fase') this.updateFase(dt);
    this.updateInteract();
    this.updateHud(dt);
    this.saveT += dt; if (this.saveT > 30) { this.saveT = 0; this.save(); }
    this.netT += dt; if (this.net && this.scene === 'world' && this.netT > 0.1) { this.netT = 0; this.sendPos(); }
  }

  /* ================= Jogador ================= */
  aimAngle() {
    const p = this.p;
    if (this.lock) return Math.atan2(this.lock.y - p.y, this.lock.x - p.x);
    if (input.padAim != null) return input.padAim;
    if (input.mouseAim && !input.touch) {
      const wx = input.mx / this.Z + this.camL, wy = input.my / this.Z + this.camT;
      return Math.atan2(wy - (p.y - 6), wx - p.x);
    }
    let best = null, bd = 280;
    for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    if (best) return Math.atan2(best.y - p.y, best.x - p.x);
    return Math.atan2(p.fy, p.fx);
  }

  updatePlayer(dt) {
    const p = this.p, st = this.st, m = this.cur.map;
    if (p.dead) return;
    for (const k in p.buffs) { p.buffs[k].t -= dt; if (p.buffs[k].t <= 0) delete p.buffs[k]; }
    p.inv = Math.max(0, p.inv - dt); p.atkT = Math.max(0, p.atkT - dt); p.atkCd -= dt; p.skillCd -= dt; p.dodgeCd -= dt; p.comboT -= dt; p.stun -= dt; p.spin = Math.max(0, p.spin - dt);
    if (p.comboT <= 0) p.combo = 0;
    const mv = input.move();
    if (p.stun > 0) { mv.x = mv.y = 0; }
    // mira / direção do rosto
    const aim = this.aimAngle();
    if (this.lock || input.padAim != null || (input.mouseAim && !input.touch)) { p.fx = Math.cos(aim); p.fy = Math.sin(aim); }
    // segurando o escudo, vira sozinho para o inimigo mais perto
    else if (input.isHeld('defend') && this.char.data.eq.escudo) { p.fx = Math.cos(aim); p.fy = Math.sin(aim); }
    else if (mv.x || mv.y) { const l = Math.hypot(mv.x, mv.y); p.fx = mv.x / l; p.fy = mv.y / l; }
    // montaria (R / botão 🐎): atacar, defender ou usar o especial desmonta
    if (input.consume('mount')) this.toggleMount();
    // travar alvo (T / botão do meio / 🎯)
    if (input.consume('lock')) this.toggleLock();
    this.checkLock();
    if (p.mounted && (input.isHeld('attack') || input.pressed.has('attack') || input.pressed.has('skill') || input.isHeld('defend'))) this.dismount();
    // esquiva
    const dodgeCost = 26 * st.esquiva;
    if (input.consume('botija')) this.beberBotija();
    if (input.consume('dodge') && p.dodgeCd <= 0 && p.sta >= dodgeCost && p.stun <= 0 && !(p.drink > 0)) {
      let dx = mv.x, dy = mv.y; if (!dx && !dy) { dx = -p.fx; dy = -p.fy; }
      const l = Math.hypot(dx, dy) || 1; p.dvx = dx / l; p.dvy = dy / l;
      p.dodgeT = 0.34; p.dodgeCd = 0.5; p.sta -= dodgeCost; p.staT = 0.6; sfx('dodge');
      if (p.charm) { p.charm = null; this.addText(p.x, p.y - 30, 'FUGIU!', '#7CE0A0', 18); p.buffs.atk = { mul: 1.3, t: 5 }; if (this.boss?.d.regras?.fugaVulneravel) this.boss.vuln = this.boss.d.regras.fugaVulneravel; }
    }
    // defesa
    const temEscudo = !!this.char.data.eq.escudo;
    if (!temEscudo && input.consume('defend')) this.addText(p.x, p.y - 34, 'Sem escudo! Equipe um no menu', '#FFB3B3', 11);
    const wantGuard = temEscudo && input.isHeld('defend') && p.sta > 0 && p.dodgeT <= 0 && p.stun <= 0;
    if (wantGuard && !p.guard) p.guardT = 0;
    p.guard = wantGuard; if (p.guard) { p.guardT += dt; p.staT = 0.4; }
    // movimento
    let sp = st.spd * (p.buffs.spd?.mul || 1) * p.slow * (p.guard ? 0.6 : 1) * (p.charging ? 0.45 : 1) * (p.drink > 0 ? 0.3 : 1) * (p.mounted ? st.montaria : 1);
    const tile = m.get(Math.floor(p.x / TS), Math.floor(p.y / TS));
    if (tile === T.SHALLOW) sp *= 0.6;
    let vx, vy;
    if (p.dodgeT > 0) { p.dodgeT -= dt; const s = 560 * (0.4 + p.dodgeT / 0.34 * 0.8); vx = p.dvx * s; vy = p.dvy * s; this.puff(p.x, p.y + 10, 1, 'rgba(230,220,200,.6)'); }
    else { vx = mv.x * sp; vy = mv.y * sp; }
    if (p.charm) {
      const b = p.charm.src, dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      vx += dx / d * 150; vy += dy / d * 150; p.charm.t -= dt;
      if (p.charm.t <= 0 || b.hp <= 0) p.charm = null;
    }
    this.moveEnt(p, vx * dt, vy * dt);
    p.moving = Math.hypot(vx, vy) > 10; if (p.moving) p.walk += dt;
    p.slow = Math.min(1, p.slow + dt * 0.8);
    // fôlego e fé
    p.staT -= dt; if (p.staT <= 0 && !p.guard) p.sta = Math.min(100, p.sta + 34 * dt);
    p.fe = Math.min(st.maxFe, p.fe + dt * (0.8 + st.maxFe * 0.01));
    const z = this.zone && ZONES[this.zone];
    if ((this.scene === 'salao' || (this.scene === 'world' && z?.seguro)) && p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + st.maxHp * 0.04 * dt);
    // ações
    if (p.stun > 0 || p.dodgeT > 0) { p.holdT = 0; p.charging = false; return; }
    if (this.tickBotija(dt)) { input.pressed.delete('attack'); return; }
    // ataque: cada toque é um golpe (toques seguidos fazem o combo); segurar carrega um golpe forte
    if (input.consume('attack')) p.atkBuf = 0.3;
    p.atkBuf -= dt;
    if (input.isHeld('attack') && !p.guard) p.holdT += dt;
    else { if (p.holdT >= CARGA.cheia) this.heavy(aim); p.holdT = 0; }
    if (p.holdT >= CARGA.cheia && p.holdT - dt < CARGA.cheia) { sfx('magic'); this.burst(p.x, p.y - 6, 14, '#FFE38A', 140); }
    p.charging = p.holdT >= CARGA.inicio;
    if (p.atkBuf > 0 && p.atkCd <= 0 && !p.guard && !p.charging) { p.atkBuf = 0; this.attack(aim); }
    if (input.consume('skill') && !p.guard) this.skill(aim);
    if (input.consume('item1')) this.useAtalho(0);
    if (input.consume('item2')) this.useAtalho(1);
  }

  toggleMount() {
    const p = this.p;
    if (p.mounted) return this.dismount();
    if (!this.st.montaria) { this.ui.toast(this.st.pet ? 'Esse animal não é de montaria. Burrinho e cavalo podem ser montados.' : 'Você não tem montaria. Compre um burrinho ou um cavalo com Labão, na cidade.'); return; }
    if (this.scene !== 'world') { this.ui.toast('Dentro das dungeons não dá para montar.'); return; }
    p.mounted = true; sfx('dodge'); this.puff(p.x, p.y + 10, 6, 'rgba(230,220,200,.6)');
    this.ui.mountBtn?.(true, true);
  }
  dismount(quiet) {
    const p = this.p; if (!p.mounted) return;
    p.mounted = false; if (this.pet) { this.pet.x = p.x - p.fx * 22; this.pet.y = p.y + 4; }
    if (!quiet) sfx('click');
    this.ui.mountBtn?.(!!this.st.montaria, false);
  }
  // Golpe do animal: mais leve que o do jogador (sem tremer a tela nem pausar o jogo)
  petHit(a, e, luta) {
    if (!this.souHost() && e.nid) return this.netGolpe(e, luta.mult, Math.atan2(e.y - a.y, e.x - a.x), 40, luta.mult * 9, luta.som);
    (e.hitBy = e.hitBy || new Set()).add(this.meuId());
    const { dmg } = this.dmgCalc(luta.mult, e);
    e.hp -= dmg; e.flash = 0.1; e.aggro = true; if (e.kind === 'boss') e.lastHit = this.T;
    if (e.kind !== 'boss') { const ang = Math.atan2(e.y - a.y, e.x - a.x); e.kx += Math.cos(ang) * 40; e.ky += Math.sin(ang) * 40; }
    if (config.numerosDano) this.addText(e.x + rand(-6, 6), e.y - e.r - 8, luta.som + ' ' + dmg, '#FFE38A', 11);
    this.burst(e.x, e.y, 3, '#FFF6E3', 100); sfx('hit');
    if (e.hp <= 0) this.kill(e);
  }
  // Animal que acompanha o jogador: segue atrás; o cachorro morde vícios e acha moedas; a ovelha cura devagar
  updatePet(dt) {
    const a = this.pet, p = this.p; if (!a || p.dead) return;
    if (p.mounted) { a.x = p.x; a.y = p.y; a.fx = p.fx; a.moving = p.moving; return; }
    a.cd -= dt;
    let tx = p.x - p.fx * 26, ty = p.y - p.fy * 14 + 4, spd = this.st.spd * 1.15;
    const luta = PET_LUTA[a.kind];
    if (luta) {
      // ataca o vício mais perto do jogador (mesmo que ainda não tenha visto você); chefes só durante a luta
      let alvo = null, bd = 210;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.clone || e.submerged || e.inv || (e.kind === 'boss' && !e.engaged)) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; alvo = e; }
      }
      if (alvo) {
        tx = alvo.x; ty = alvo.y; spd *= 1.35;
        if (Math.hypot(alvo.x - a.x, alvo.y - a.y) < alvo.r + 12 && a.cd <= 0) { a.cd = luta.cd; this.petHit(a, alvo, luta); }
      } else if (a.kind === 'cachorro' && this.scene === 'world' && a.cd <= 0 && Math.random() < dt * 0.04) { a.cd = 8; this.pickups.push({ kind: 'ouro', v: randi(2, 6), x: a.x, y: a.y, vx: rand(-30, 30), vy: rand(-30, 30), t: 0 }); this.addText(a.x, a.y - 20, 'Au au!', '#FFFFFF', 10); }
    } else if (a.kind === 'ovelha') p.hp = Math.min(this.st.maxHp, p.hp + this.st.maxHp * 0.006 * dt);
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    if (d > 600) { a.x = p.x - p.fx * 26; a.y = p.y; return; } // ficou para trás: aparece do lado
    a.moving = d > 10;
    if (a.moving) { const v = Math.min(d, spd * dt * (d > 80 ? 1.6 : 1)); a.x += dx / d * v; a.y += dy / d * v; a.walk += dt; if (Math.abs(dx) > 2) a.fx = Math.sign(dx); }
  }

  moveEnt(e, dx, dy) {
    const m = this.cur.map, r = e.r * 0.8;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8) || 1;
    for (let i = 0; i < steps; i++) {
      if (!m.collides(e.x + dx / steps, e.y, r)) e.x += dx / steps;
      if (!m.collides(e.x, e.y + dy / steps, r)) e.y += dy / steps;
    }
  }

  dmgCalc(mult, target) {
    const st = this.st, p = this.p;
    let base = st.atk * mult * (p.buffs.atk?.mul || 1) * rand(0.9, 1.1);
    const crit = Math.random() < (st.weapon === 'adaga' ? 0.25 : st.weapon === 'funda' ? 0.22 : 0.12); // adaga e a pontaria de Davi
    if (crit) base *= 1.7;
    if (target.kind === 'boss' && st.palavra) base *= 1.5;
    if (target.vuln > 0) base *= 1.5;
    if (target.broken > 0) base *= 1.6;
    if (target.kind === 'boss') base *= modDano(this, target); // armadura e pontos fracos do chefe
    return { dmg: Math.max(1, Math.round(base - target.def * 0.6)), crit };
  }

  // gasta fôlego; com o fôlego zerado não dá para atacar (respire, esquive ou defenda)
  gastaFolego(c) {
    const p = this.p;
    if (p.sta <= 0) {
      if (this.T - (p.semFolegoT || 0) > 0.8) { p.semFolegoT = this.T; this.addText(p.x, p.y - 34, 'Sem fôlego!', '#9BD98A', 12); }
      p.atkCd = 0.25; return false;
    }
    p.sta = Math.max(0, p.sta - c); p.staT = 0.55; return true;
  }

  attack(a) {
    const p = this.p, w = this.st.weapon;
    if (!this.gastaFolego((CUSTO_ATK[w] ?? 10) * (w === 'espada' && p.combo === 2 ? 1.5 : 1))) return;
    p.swingA = a; p.fx = Math.cos(a); p.fy = Math.sin(a);
    if (w === 'espada') {
      p.combo = (p.combo % 3) + 1; p.comboT = 0.75;
      const big = p.combo === 3;
      p.atkT = 0.22; p.atkCd = big ? 0.42 : 0.26; sfx('swing');
      const range = big ? 62 : 50;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < range + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 1.25) this.hit(e, big ? 1.6 : 1, a, big ? 260 : 150);
      }
      if (this.st.palavra && big) this.proj({ x: p.x, y: p.y - 6, a, spd: 460, r: 9, life: 0.6, mult: 1, kind: 'palavra', pierce: 3 });
    } else if (w === 'adaga') {
      // golpes curtos e muito seguidos; o 4º do combo é mais forte
      p.combo = (p.combo % 4) + 1; p.comboT = 0.6;
      const fim = p.combo === 4;
      p.atkT = 0.14; p.atkCd = fim ? 0.3 : 0.16; sfx('swing');
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.14, max: 0.14, kind: 'corte', owner: 'fx', flip: p.combo % 2 });
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 42 + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 1.0) this.hit(e, fim ? 1.2 : 0.72, a, fim ? 160 : 70);
      }
    } else if (w === 'lanca') {
      // estocada longa em linha reta
      p.atkT = 0.2; p.atkCd = 0.42; sfx('swing');
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (this.naLinha(e, p.x, p.y, a, 96, 16)) this.hit(e, 1.15, a, 200); }
    } else if (w === 'chicote') {
      // estalo longo e estreito que puxa o inimigo para perto
      p.atkT = 0.25; p.atkCd = 0.5; sfx('swing');
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.25, max: 0.25, kind: 'chicote', owner: 'fx', len: 118 });
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 118 + e.r && d > 20 && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 0.45) this.hit(e, 0.95, a, -150);
      }
    } else if (w === 'funda') {
      // a cada 3 tiros sai uma pedra dupla
      p.combo = (p.combo % 3) + 1; p.comboT = 1.2;
      p.atkT = 0.18; p.atkCd = 0.38; sfx('shoot');
      this.proj({ x: p.x, y: p.y - 6, a, spd: 700, r: 5.5, life: 0.62, mult: 1, kind: 'pedra' });
      if (p.combo === 3) this.proj({ x: p.x, y: p.y - 6, a: a + 0.12, spd: 700, r: 5.5, life: 0.62, mult: 0.8, kind: 'pedra' });
    } else if (w === 'cajado') {
      p.atkT = 0.2; p.atkCd = 0.55; sfx('magic');
      this.proj({ x: p.x + Math.cos(a) * 16, y: p.y - 10, a, spd: 400, r: 7, life: 1.1, mult: 1.15, kind: 'luz', homing: 3.5, pierce: 1 });
    } else {
      // onda de som em cone: alcance longo, empurra e abala o equilíbrio (Js 6:20)
      p.atkT = 0.25; p.atkCd = 0.48; sfx('shoot');
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.38, max: 0.38, kind: 'som', owner: 'fx', alc: 130, abre: 0.85 });
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 130 + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 0.85) this.hit(e, 0.95, a, 340, 14);
      }
    }
  }

  // inimigo dentro de uma faixa reta a partir de (x, y), na direção a (estocadas e avanços)
  naLinha(e, x, y, a, len, w) {
    const dx = e.x - x, dy = e.y - y, along = dx * Math.cos(a) + dy * Math.sin(a), perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    return along > -e.r && along < len + e.r && perp < w + e.r;
  }

  // golpe carregado: lento, forte e quebra a postura
  heavy(a) {
    const p = this.p, w = this.st.weapon;
    if (!this.gastaFolego(CARGA.custo)) return;
    p.swingA = a; p.fx = Math.cos(a); p.fy = Math.sin(a); p.atkCd = 0.5;
    this.shake(5);
    if (w === 'espada') {
      p.combo = 3; p.comboT = 0.1; p.atkT = 0.22; sfx('swing');
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 76 + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 1.6) this.hit(e, 2.6, a, 380, 42);
      }
      this.burst(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40 - 6, 18, '#FFE38A', 220);
    } else if (w === 'adaga') {
      // avança e crava a adaga em quem estiver no caminho
      p.atkT = 0.14; sfx('swing'); p.inv = Math.max(p.inv, 0.2);
      const x0 = p.x, y0 = p.y; this.moveEnt(p, Math.cos(a) * 70, Math.sin(a) * 70);
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (this.naLinha(e, x0, y0, a, Math.hypot(p.x - x0, p.y - y0) + 30, 18)) this.hit(e, 2.4, a, 200, 40); }
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.18, max: 0.18, kind: 'corte', owner: 'fx', big: true });
    } else if (w === 'lanca') {
      p.atkT = 0.26; sfx('swing');
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (this.naLinha(e, p.x, p.y, a, 150, 20)) this.hit(e, 2.7, a, 340, 45); }
      for (let i = 1; i <= 6; i++) this.puff(p.x + Math.cos(a) * i * 22, p.y + Math.sin(a) * i * 22 - 6, 1, 'rgba(255,230,160,.7)');
    } else if (w === 'chicote') {
      p.atkT = 0.3; sfx('swing');
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.3, max: 0.3, kind: 'chicote', owner: 'fx', len: 132, big: true });
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.submerged) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 132 + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a)) < 0.9) this.hit(e, 2.3, a, -230, 40);
      }
    } else if (w === 'funda') {
      p.atkT = 0.22; sfx('shoot');
      this.proj({ x: p.x, y: p.y - 6, a, spd: 780, r: 8, life: 0.7, mult: 2.6, kind: 'pedra', pierce: 2, pos: 40 });
    } else if (w === 'cajado') {
      p.atkT = 0.25; sfx('magic');
      this.proj({ x: p.x + Math.cos(a) * 16, y: p.y - 10, a, spd: 460, r: 12, life: 1.2, mult: 2.6, kind: 'luz', homing: 4, pierce: 2, pos: 40 });
    } else {
      // toque longo: onda em círculo que derruba muralhas (Js 6:20)
      p.atkT = 0.3; sfx('shoot'); this.shake(7);
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.5, max: 0.5, kind: 'som', owner: 'fx', alc: 165, roda: true });
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < 165 + e.r) this.hit(e, 2.2, Math.atan2(e.y - p.y, e.x - p.x), 560, 50); }
    }
  }

  // Travar alvo: escolhe o inimigo mais perto na frente do jogador; mira e rosto seguem ele
  toggleLock() {
    const p = this.p;
    if (this.lock) { this.lock = null; sfx('click'); return; }
    let best = null, bs = Infinity;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.submerged || e.clone) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > 380) continue;
      const score = d + Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), Math.atan2(p.fy, p.fx))) * 90;
      if (score < bs) { bs = score; best = e; }
    }
    if (best) { this.lock = best; sfx('click'); } else this.addText(p.x, p.y - 34, 'Nenhum alvo perto', '#ccc', 11);
  }
  checkLock() {
    const e = this.lock;
    if (e && (!this.enemies.includes(e) || e.hp <= 0 || e.submerged || Math.hypot(e.x - this.p.x, e.y - this.p.y) > 560)) this.lock = null;
  }

  // Postura: golpes enchem a barra; cheia, o inimigo fica atordoado e recebe dano extra (golpe de misericórdia)
  postura(e, amt) {
    if (e.clone || e.broken > 0 || e.hp <= 0) return;
    if (e.d.regras?.armadura && !(e.exposto > 0)) amt *= 0.35; // a armadura do Golias também segura o equilíbrio
    e.pos += amt; e.posT = this.T;
    if (e.pos < e.posMax) return;
    e.pos = 0; e.broken = e.kind === 'boss' ? 2.5 : 2; e.stun = Math.max(e.stun || 0, e.broken); e.telegraph = 0;
    if (e.d.regras?.armadura) e.exposto = Math.max(e.exposto || 0, e.d.regras.armadura.exposto ?? 3.5);
    this.addText(e.x, e.y - e.r - 46, e.kind === 'boss' ? 'POSTURA QUEBRADA!' : 'Desequilibrado!', '#FFE38A', e.kind === 'boss' ? 17 : 13, 1.6);
    this.burst(e.x, e.y - e.r * 0.5, 24, '#FFE38A', 240); this.shake(e.kind === 'boss' ? 10 : 4); sfx('crit');
  }

  skill(a) {
    const p = this.p, C = CLASSES[this.char.cls].skill;
    if (p.skillCd > 0) { this.addText(p.x, p.y - 34, 'Aguarde ' + Math.ceil(p.skillCd) + 's', '#ccc', 11); return; }
    if (p.fe < C.custo) { this.addText(p.x, p.y - 34, 'Sem Fé suficiente', '#8EC9FF', 12); return; }
    p.fe -= C.custo; p.skillCd = C.cd;
    const cls = this.char.cls;
    if (cls === 'guerreiro') {
      p.spin = 0.45; sfx('swing'); this.shake(6);
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < 88 + e.r) this.hit(e, 2.2, Math.atan2(e.y - p.y, e.x - p.x), 380); }
      this.burst(p.x, p.y, 24, '#FFE38A', 260);
    } else if (cls === 'pastor') {
      sfx('shoot');
      for (let i = -2; i <= 2; i++) this.proj({ x: p.x, y: p.y - 6, a: a + i * 0.2, spd: 620, r: 6, life: 0.7, mult: 1.35, kind: 'pedra', pierce: 1 });
    } else if (cls === 'profeta') {
      let tx = p.x + Math.cos(a) * 170, ty = p.y + Math.sin(a) * 170;
      let best = null, bd = 300;
      for (const e of this.enemies) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
      if (best) { tx = best.x; ty = best.y; }
      this.tele.push({ kind: 'circle', x: tx, y: ty, r: 90, t: 0.55, max: 0.55, color: '255,170,60', friendly: true, onEnd: () => {
        sfx('magic'); this.shake(10); this.burst(tx, ty, 40, '#FF9A3C', 300); this.burst(tx, ty, 20, '#FFE38A', 200);
        for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (Math.hypot(e.x - tx, e.y - ty) < 90 + e.r) this.hit(e, 3.2, Math.atan2(e.y - ty, e.x - tx), 200); }
      } });
    } else if (cls === 'levita') {
      sfx('heal'); const heal = this.st.maxHp * 0.35; p.hp = Math.min(this.st.maxHp, p.hp + heal);
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a: 0, r: 0, life: 0.6, max: 0.6, kind: 'som', owner: 'fx', alc: 150, roda: true, cura: true });
      this.addText(p.x, p.y - 36, '+' + Math.round(heal), '#7CE0A0', 15);
      for (let i = 0; i < 14; i++) this.parts.push({ x: p.x + rand(-30, 30), y: p.y + rand(-10, 10), vx: rand(-20, 20), vy: rand(-90, -40), life: 1.2, max: 1.2, size: 10, txt: pick(['♪', '♫']), color: '#FFE38A' });
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < 140 + e.r) this.hit(e, 1, Math.atan2(e.y - p.y, e.x - p.x), 420); }
    } else if (cls === 'zelote') {
      // Investida do Zelote: atravessa os inimigos, invencível durante o avanço
      sfx('dodge'); p.inv = Math.max(p.inv, 0.35);
      const x0 = p.x, y0 = p.y; this.moveEnt(p, Math.cos(a) * 160, Math.sin(a) * 160);
      const len = Math.hypot(p.x - x0, p.y - y0);
      for (let i = 0; i <= 8; i++) this.puff(x0 + (p.x - x0) * i / 8, y0 + (p.y - y0) * i / 8 + 6, 2, 'rgba(200,190,170,.7)');
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; if (this.naLinha(e, x0, y0, a, len + 24, 24)) this.hit(e, 2.0, a, 160, 30); }
    } else if (cls === 'valente') {
      // Lança de Abisai: arremesso que atravessa todos em linha
      sfx('shoot'); this.shake(4);
      this.proj({ x: p.x, y: p.y - 8, a, spd: 720, r: 9, life: 0.8, mult: 2.4, kind: 'lanca', pierce: 99, pos: 30 });
    } else if (cls === 'juiz') {
      // Aguilhada de Sangar: giro do chicote que acerta e puxa todos em volta
      sfx('swing'); this.shake(6); p.spin = 0.4;
      this.projs.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, a, r: 0, life: 0.4, max: 0.4, kind: 'chicote', owner: 'fx', len: 130, giro: true });
      for (const e of this.enemies) { if (e.hp <= 0 || e.submerged) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 130 + e.r && d > 24) this.hit(e, 1.6, Math.atan2(e.y - p.y, e.x - p.x), -260, 20); }
    }
  }

  proj(o) {
    if (o.owner === 'e' && this.netAtivo() && this.souHost() && this.proxies.size) this.netProj(o);
    this.projs.push({ x: o.x, y: o.y, vx: Math.cos(o.a) * o.spd, vy: Math.sin(o.a) * o.spd, r: o.r, life: o.life, max: o.life, mult: o.mult, kind: o.kind, owner: o.owner || 'p', homing: o.homing || 0, pierce: o.pierce || 0, pos: o.pos, hitSet: new Set(), dmg: o.dmg, color: o.color, label: o.label, src: o.src, reflect: o.reflect });
  }

  hit(e, mult, a, knock, pos = mult * 9) {
    if (e.inv || e.hp <= 0) return;
    if (e.clone) { this.burst(e.x, e.y, 14, '#B98AF0', 160); this.addText(e.x, e.y - 30, 'Ilusão!', '#E6DBFF', 13); e.hp = 0; this.enemies.splice(this.enemies.indexOf(e), 1); return; }
    if (!this.souHost() && e.nid) return this.netGolpe(e, mult, a, knock, pos);
    (e.hitBy = e.hitBy || new Set()).add(this.meuId());
    const { dmg, crit } = this.dmgCalc(mult, e);
    e.hp -= dmg; e.flash = 0.12; e.lastHit = this.T; e.aggro = true; if (e.kind === 'boss') e.engaged = true;
    const kb = e.kind === 'boss' ? knock * 0.1 : knock;
    e.kx += Math.cos(a) * kb; e.ky += Math.sin(a) * kb;
    if (config.numerosDano) this.addText(e.x + rand(-8, 8), e.y - e.r - 10, (crit ? '✦' : '') + dmg, crit ? '#FFD23F' : '#FFFFFF', crit ? 17 : 13);
    this.burst(e.x, e.y, crit ? 10 : 5, crit ? '#FFD23F' : '#FFF6E3', 160);
    sfx(crit ? 'crit' : 'hit'); this.hitstop = Math.max(this.hitstop, crit || pos >= 40 ? 0.07 : 0.03); this.shake(crit ? 5 : 2);
    if (e.hp <= 0) this.kill(e); else this.postura(e, pos);
  }

  kill(e) {
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.burst(e.x, e.y, 26, e.d.cor, 240); sfx('kill');
    if (this.lock === e) this.lock = null;
    if (e.spawn) { e.spawn.alive = false; e.spawn.at = this.T + rand(25, 45); }
    if (e.world) { e.world.alive = false; e.world.at = this.T + e.d.respawn; }
    if (this.netAtivo()) this.netEnviar({ t: 'morte', id: e.nid, por: [...(e.hitBy || [])] });
    if (!e.hitBy || e.hitBy.has(this.meuId())) this.recompensa(e);
    else if (this.boss === e) { this.boss = null; this.ui.bossBar(null); }
  }

  // XP, denários, missões e lições de quem ajudou a vencer o inimigo
  recompensa(e) {
    const c = this.char;
    if (e.kind === 'boss') return this.bossDefeated(e);
    c.data.stats.kills++; c.data.kills[e.type] = (c.data.kills[e.type] || 0) + 1;
    if (this.fase) this.fase.kills++;
    this.gainXp(e.xp); this.addScore(e.lv * 6);
    const gold = Math.round((e.ouro + e.stolen) * this.st.ouro * rand(0.8, 1.3));
    for (let i = 0; i < Math.min(6, Math.ceil(gold / 4)); i++) this.pickups.push({ kind: 'ouro', v: Math.ceil(gold / Math.min(6, Math.ceil(gold / 4))), x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-90, 90), t: 0 });
    if (Math.random() < 0.14) this.pickups.push({ kind: 'cura', v: 18, x: e.x, y: e.y, vx: rand(-50, 50), vy: rand(-50, 50), t: 0 });
    if (Math.random() < 0.04) this.pickups.push({ kind: 'item', id: pick(['pao', 'pao', 'mana', 'mel']), x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });
    if (!c.data.licoes.includes(e.type)) { c.data.licoes.push(e.type); this.ui.toast(e.d.nome + ' vencido! ' + e.d.licao, 5000); }
    this.questEvent('kill', e.type);
  }

  bossDefeated(b) {
    const c = this.char, d = b.d;
    this.ui.bossBar(null); this.shake(16); sfx('level'); music(this.scene === 'world' ? 'mundo' : 'fase');
    this.burst(b.x, b.y, 80, '#FFE38A', 380); this.burst(b.x, b.y, 50, d.cor, 300);
    c.data.stats.bosses[b.id] = (c.data.stats.bosses[b.id] || 0) + 1;
    this.gainXp(d.xp); this.addScore(d.lv * 120);
    c.data.gold += Math.round(d.ouro * this.st.ouro); sfx('coin');
    this.enemies = this.enemies.filter(e => !e.clone);
    if (b.world) {
      const first = c.data.stats.bosses[b.id] === 1;
      if (d.drop && (first || Math.random() < 0.25)) { addItem(c, d.drop); this.ui.toast('Você ganhou: ' + ITEMS[d.drop].nome + '!', 4000); }
      this.questEvent('boss', b.id);
      this.ui.dialog({ nome: d.nome + ' derrotado!', texto: d.derrota, acoes: [{ label: 'Glória a Deus!' }] });
      this.save();
      return;
    }
    if (this.fase) { this.boss = null; setTimeout(() => this.faseComplete(), 900); }
  }

  gainXp(n) {
    const c = this.char, p = this.p;
    if (c.level >= MAX_LEVEL) return;
    c.data.xp += n;
    let up = false;
    while (c.data.xp >= xpNeed(c.level) && c.level < MAX_LEVEL) { c.data.xp -= xpNeed(c.level); c.level++; up = true; }
    if (up) {
      this.refreshStats(); p.hp = this.st.maxHp; p.fe = this.st.maxFe;
      sfx('level'); this.burst(p.x, p.y, 40, '#FFE38A', 260);
      this.addText(p.x, p.y - 44, 'NÍVEL ' + c.level + '!', '#FFD23F', 20);
      this.ui.toast('Você subiu para o nível ' + c.level + '! Vida e Fé restauradas.');
      this.save();
    }
  }
  addScore(n) { this.char.score += n; this.char.week_score += n; }

  // Barra de atalhos: 2 itens usáveis escolhidos pelo jogador (menu › Personagem › item › Atalho 1/2)
  atalhos() { const d = this.char.data; return (d.atalhos = d.atalhos || ['pao', 'mana']); }
  useAtalho(i) {
    const id = this.atalhos()[i], it = id && ITEMS[id], p = this.p;
    if (!it) { this.ui.toast('Atalho ' + (i + 1) + ' vazio. Escolha um item no menu ☰ › Personagem.'); return; }
    if (!count(this.char, id)) { this.ui.toast('Acabou ' + it.icon + ' ' + it.nome + '! Compre com Lídia na cidade.'); return; }
    if ((it.cura || it.curaPct) && !it.fe && !it.buff && this.st.maxHp - p.hp < 5) { this.addText(p.x, p.y - 34, 'Vida cheia', '#ccc', 11); return; }
    if (it.fe && !it.cura && !it.buff && this.st.maxFe - p.fe < 5) { this.addText(p.x, p.y - 34, 'Fé cheia', '#ccc', 11); return; }
    if (this.useItem(id)) this.save();
  }

  useItem(id) {
    const it = ITEMS[id], p = this.p, c = this.char;
    if (!it || it.tipo !== 'consumivel' || !count(c, id)) return false;
    if (it.retorno) {
      if (this.boss?.engaged) { this.ui.toast('Não dá para fugir no meio de uma batalha com chefe!'); return false; }
      removeItem(c, id); this.ui.closeAll?.();
      if (this.scene !== 'world') this.enterWorld(false); else { p.x = SPAWN.x; p.y = SPAWN.y; }
      sfx('gate'); return true;
    }
    removeItem(c, id);
    if (it.cura) { p.hp = Math.min(this.st.maxHp, p.hp + it.cura); this.addText(p.x, p.y - 36, '+' + it.cura, '#7CE0A0', 15); }
    if (it.curaPct) { p.hp = this.st.maxHp; this.addText(p.x, p.y - 36, 'Vida cheia!', '#7CE0A0', 15); }
    if (it.fe) { p.fe = Math.min(this.st.maxFe, p.fe + it.fe); this.addText(p.x, p.y - 22, '+' + it.fe + ' Fé', '#8EC9FF', 13); }
    if (it.buff) { if (it.buff.atk) p.buffs.atk = { mul: it.buff.atk, t: it.buff.t }; if (it.buff.spd) p.buffs.spd = { mul: it.buff.spd, t: it.buff.t }; this.addText(p.x, p.y - 36, it.nome + '!', '#FFD23F', 13); }
    sfx('heal'); this.burst(p.x, p.y, 12, '#7CE0A0', 120);
    return true;
  }

  damagePlayer(amount, src, opts = {}) {
    const p = this.p;
    if (p.remote) return this.netDanoRemoto(p, amount, src, opts);
    if (p.dead || p.dodgeT > 0 || p.inv > 0 || this.ui.blocking) return 'miss';
    let dmg = amount * 60 / (60 + this.st.def);
    if (p.guard && !opts.unblockable) {
      const ang = Math.atan2(src.y - p.y, src.x - p.x), face = Math.atan2(p.fy, p.fx);
      if (Math.abs(angDiff(ang, face)) < 2.1) {
        if (p.guardT < PERFEITA) {
          sfx('parry'); vibrar(70, 0.35); this.addText(p.x, p.y - 40, 'DEFESA PERFEITA!', '#FFFFFF', 15); this.burst(p.x + p.fx * 14, p.y + p.fy * 14, 16, '#FFFFFF', 220);
          this.hitstop = 0.08; p.fe = Math.min(this.st.maxFe, p.fe + 6);
          if (src.kind === 'enemy' || src.kind === 'boss') { src.stun = src.kind === 'boss' ? 0.8 : 1.4; src.kx -= Math.cos(ang) * 200; src.ky -= Math.sin(ang) * 200; }
          if (src.kind === 'boss') aoDefender(this, src);
          if (src.kind === 'enemy' || src.kind === 'boss') this.postura(src, src.kind === 'boss' ? 34 : 999);
          if (!this.souHost() && src.nid) this.netEnviar({ t: 'parry', id: src.nid });
          return 'parry';
        }
        dmg *= 1 - this.st.block; p.sta -= 10; p.staT = 0.5; sfx('block');
        this.burst(p.x + p.fx * 14, p.y + p.fy * 14, 6, '#F2C14E', 120);
        if (p.sta <= 0) { p.sta = 0; p.guard = false; p.stun = 0.5; this.addText(p.x, p.y - 40, 'Guarda quebrada!', '#FF8A8A', 13); }
        if (dmg < 1) return 'block';
      }
    }
    dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg; p.inv = 0.45; sfx('hurt'); vibrar(dmg > this.st.maxHp * 0.2 ? 220 : 120, dmg > this.st.maxHp * 0.2 ? 1 : 0.55);
    if (p.mounted && dmg >= 6) { this.dismount(); this.addText(p.x, p.y - 52, 'Caiu da montaria!', '#FFB3B3', 12); } this.shake(7); this.ui.hurt();
    this.addText(p.x, p.y - 30, '-' + dmg, '#FF5A5F', 15);
    if (src && !opts.noKnock) { const a = Math.atan2(p.y - src.y, p.x - src.x); this.moveEnt(p, Math.cos(a) * 14, Math.sin(a) * 14); }
    if (p.hp <= 0) this.playerDown();
    return 'hit';
  }

  playerDown() {
    const p = this.p, c = this.char;
    if (this.st.reviver && this.fase && !this.fase.revived) {
      this.fase.revived = true; p.hp = this.st.maxHp * 0.4; p.inv = 2;
      this.ui.toast('O Capacete da Salvação te levantou! "Quem crê em mim, ainda que morra, viverá" (Jo 11:25)', 5000);
      this.burst(p.x, p.y, 50, '#FFE38A', 300); sfx('heal'); return;
    }
    p.dead = true; p.hp = 0; c.data.stats.deaths++; p.charm = null;
    input.clear();
    if (this.scene === 'fase') {
      this.ui.dead({
        titulo: 'Você caiu…', texto: '"O justo cai sete vezes e se levanta" (Pv 24:16). Tente de novo!',
        acoes: [{ label: 'Recomeçar a fase', fn: () => { p.dead = false; p.hp = this.st.maxHp; p.fe = this.st.maxFe; this.enterFase(this.fase.sem, this.fase.n); } },
          { label: 'Voltar para a sala da semana', fn: () => { p.dead = false; p.hp = this.st.maxHp; this.enterSemana(this.fase.sem, this.fase.n); } }]
      });
    } else {
      const { deixou, perdeu } = this.scene === 'world' ? this.deixarSacola() : { deixou: 0, perdeu: 0 };
      const volta = this.pontoDeVolta(), pedra = this.altares?.find(o => o.id === c.data.descanso);
      this.ui.dead({
        titulo: 'Você caiu…',
        texto: (deixou ? '💰 Seus ' + deixou + ' denários ficaram numa sacola onde você caiu. Volte para buscá-la antes de cair de novo! (Mt 25)\n\n' : '') +
          (perdeu ? '⚠️ A sacola anterior (' + perdeu + ' denários) se perdeu.\n\n' : '') +
          '"Ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum" (Sl 23:4).',
        acoes: [{ label: 'Levantar na Pedra de Ebenézer' + (pedra ? ' · ' + pedra.nome : ''), fn: () => {
          p.dead = false; p.hp = this.st.maxHp; p.fe = this.st.maxFe; p.drink = 0; this.botija().n = this.botija().max;
          if (this.scene !== 'world') this.enterWorld(false);
          const pt = volta || SPAWN; p.x = pt.x; p.y = pt.y; this.lock = null;
        } }]
      });
    }
    this.save();
  }

  /* ================= Inimigos ================= */
  updateEnemies(dt) {
    if (!this.souHost()) return this.updateEnemiesCliente(dt);
    try { for (const e of this.enemies.slice()) {
      this.p = this.eu;
      e.flash = Math.max(0, e.flash - dt); e.stun = Math.max(0, (e.stun || 0) - dt); if (e.vuln) e.vuln -= dt;
      if (e.broken > 0) e.broken -= dt;
      if (e.pos > 0 && this.T - (e.posT || 0) > 1.6) e.pos = Math.max(0, e.pos - e.posMax * 0.2 * dt);
      const alvo = this.alvoDe(e), dist = Math.hypot(alvo.x - e.x, alvo.y - e.y);
      if (this.scene === 'world' && dist > 1300 && e.kind !== 'boss') continue;
      // empurrão
      if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { this.moveEnt(e, e.kx * dt, e.ky * dt); e.kx *= Math.pow(0.002, dt); e.ky *= Math.pow(0.002, dt); }
      if (e.stun > 0) continue;
      this.p = alvo;
      if (e.kind === 'boss') { this.updateBoss(e, dt, dist); continue; }
      this.updateEnemy(e, dt, dist);
    } } finally { this.p = this.eu; }
    // ninguém fica em cima de ninguém
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
      const a = es[i], b = es[j]; if (a.submerged || b.submerged) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d > 0 && d < min) { const push = (min - d) / 2; if (a.kind !== 'boss') this.moveEnt(a, -dx / d * push, -dy / d * push); if (b.kind !== 'boss') this.moveEnt(b, dx / d * push, dy / d * push); }
    }
  }

  updateEnemy(e, dt, dist) {
    const p = this.p, d = e.d;
    e.cd -= dt;
    if (!e.aggro && dist < DIF.aggro && !p.dead) e.aggro = true;
    const home = Math.hypot(e.x - e.hx, e.y - e.hy);
    if (e.aggro && (home > 520 || p.dead || (this.scene === 'world' && ZONES[zoneAt(Math.floor(p.x / TS), Math.floor(p.y / TS))].seguro))) { e.aggro = false; }
    const ax = p.x - e.x, ay = p.y - e.y, al = dist || 1;
    if (!e.aggro) {
      // passeia perto de casa
      if (home > 40) this.moveEnt(e, (e.hx - e.x) / home * e.spd * 0.5 * dt, (e.hy - e.y) / home * e.spd * 0.5 * dt);
      else { e.wa = (e.wa || 0) + dt; this.moveEnt(e, Math.cos(e.ph + e.wa * 0.6) * 20 * dt, Math.sin(e.ph * 1.3 + e.wa * 0.5) * 20 * dt); }
      if (e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * 0.1 * dt);
      return;
    }
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      if (e.telegraph <= 0) this.enemyStrike(e, dist);
      return;
    }
    if (e.dash > 0) {
      e.dash -= dt; this.moveEnt(e, e.dvx * 430 * dt, e.dvy * 430 * dt);
      if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 4 && !e.dashHit) { e.dashHit = true; this.damagePlayer(e.atk * 1.3, e); }
      return;
    }
    let speed = e.spd;
    switch (d.ai) {
      case 'ranged': {
        const want = 190;
        const dir = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
        this.moveEnt(e, ax / al * speed * dir * dt + Math.cos(this.T + e.ph) * 30 * dt, ay / al * speed * dir * dt + Math.sin(this.T + e.ph) * 30 * dt);
        if (e.cd <= 0 && dist < 340) { e.cd = 1.9 * DIF.cd; e.telegraph = 0.35; e.mode = 'shoot'; }
        return;
      }
      case 'charge':
        if (e.cd <= 0 && dist < 240 && dist > 50) { e.cd = 2.6 * DIF.cd; e.telegraph = 0.5; e.mode = 'charge'; e.dvx = ax / al; e.dvy = ay / al; return; }
        break;
      case 'blink':
        if (e.cd <= 0 && dist < 320) { e.cd = 3.2 * DIF.cd; const a = rand(0, TAU); this.burst(e.x, e.y, 10, '#4B4E6D', 100); e.x = p.x + Math.cos(a) * 60; e.y = p.y + Math.sin(a) * 60; if (this.cur.map.collides(e.x, e.y, e.r)) { e.x = e.hx; e.y = e.hy; } e.telegraph = 0.45; e.mode = 'melee'; return; }
        break;
      case 'thief':
        if (e.stolen) { this.moveEnt(e, -ax / al * speed * 1.2 * dt, -ay / al * speed * 1.2 * dt); return; }
        break;
      case 'hop': speed *= 0.7 + Math.abs(Math.sin(this.T * 5 + e.ph)) * 0.9; break;
    }
    if (dist > e.r + p.r + 2) this.moveEnt(e, ax / al * speed * dt, ay / al * speed * dt);
    if (dist < e.r + p.r + 14 && e.cd <= 0) { e.cd = 1.3 * DIF.cd; e.telegraph = 0.38; e.mode = 'melee'; }
  }

  enemyStrike(e, dist) {
    const p = this.p;
    if (e.mode === 'shoot') {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      this.proj({ x: e.x, y: e.y - 4, a, spd: 250, r: 6, life: 2, owner: 'e', kind: 'mal', dmg: e.atk, color: e.d.cor, src: e, reflect: true });
      sfx('shoot');
    } else if (e.mode === 'charge') { e.dash = 0.45; e.dashHit = false; }
    else if (dist < e.r + p.r + 22) {
      const r = this.damagePlayer(e.atk, e);
      if (r === 'hit' && e.d.ai === 'thief' && !e.stolen && !p.remote) {
        const s = Math.min(this.char.data.gold, randi(3, 8)); this.char.data.gold -= s; e.stolen = s;
        if (s) this.addText(p.x, p.y - 46, '-' + s + ' denários', '#F2C14E', 13);
      }
    }
  }

  /* ================= Chefes ================= */
  updateBoss(b, dt, dist) {
    const p = this.p;
    if (b.clone) return this.updateClone(b, dt, dist);
    if (b.world) {
      if (!b.engaged && dist < 380 && !p.dead) { b.engaged = true; if (p === this.eu) { b._intro = true; this.bossIntro(b); } }
      if (b.engaged && (dist > 950 || p.dead)) { b.engaged = false; b.hp = b.max; b.x = b.hx; b.y = b.hy; b.gritos = null; b._intro = false; if (this.boss === b) { this.ui.bossBar(null); this.boss = null; music('mundo'); } }
      if (!b.engaged) return;
    }
    if (!b.engaged) return;
    // barra do chefe só para quem está perto dele
    if (Math.hypot(this.eu.x - b.x, this.eu.y - b.y) < 950) {
      if (!b._intro) { b._intro = true; this.bossIntro(b); }
      this.boss = b; this.ui.bossBar(b.d.nome, b.hp / b.max, b.d.titulo, b.pos / b.posMax);
    } else if (this.boss === b) { this.boss = null; this.ui.bossBar(null); }
    b.actT -= dt;
    const d = b.d, c = { p, dist, ax: p.x - b.x, ay: p.y - b.y, al: dist || 1 };
    // contato
    if (dist < b.r + p.r && !b.submerged) this.damagePlayer(b.atk * (d.contato ?? 0.6), b);
    // regras passivas (aura, regenerar, acusações…); uma regra pode tomar o quadro todo (retorna true)
    for (const k in d.regras) if (REGRAS[k]?.(this, b, d.regras[k], dt, c)) return;
    // fase atual pela vida; ao entrar numa fase com "grito", anuncia uma vez
    const fi = faseAtual(this, b), fase = d.fases[fi];
    if (fase.grito && !(b.gritos = b.gritos || new Set()).has(fi)) {
      b.gritos.add(fi); this.addText(b.x, b.y - 80, fase.grito, fase.corGrito || '#FF8A3C', 16); this.shake(fase.tremor ?? 14); sfx('boss');
    }
    if (!b.act) {
      const m = fase.mover || { tipo: 'perseguir' };
      MOVIMENTOS[m.tipo](this, b, m, dt, c);
      if (b.actT <= 0) { b.act = pick(fase.golpes); b.actT = 0; b.step = 0; b.stepT = 0; }
      return;
    }
    if (b.act === 'accuse') return; // batalha de versículos em andamento
    const g = d.golpes[b.act];
    b.stepT += dt;
    MOVES[g.tipo](this, b, g, dt, c);
  }

  updateClone(c, dt, dist) {
    const p = this.p; c.cd -= dt; c.ph += dt;
    this.moveEnt(c, Math.cos(c.ph * 1.7) * 40 * dt, Math.sin(c.ph * 1.3) * 40 * dt);
    if (c.cd <= 0 && dist < 420) { c.cd = rand(1.3, 2.3); this.proj({ x: c.x, y: c.y - 10, a: Math.atan2(p.y - c.y, p.x - c.x), spd: 220, r: 6, life: 2.2, owner: 'e', kind: 'mal', dmg: c.atk * 0.5, color: '#C79BFF', src: c, reflect: true }); }
  }

  endAct(b, wait) { b.act = null; b.actT = wait * DIF_CHEFE.ritmo; b.talk = false; }

  inLine(p, x, y, a, len, w) {
    const dx = p.x - x, dy = p.y - y, along = dx * Math.cos(a) + dy * Math.sin(a), perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    return along > 0 && along < len && perp < w / 2 + p.r;
  }

  bossIntro(b) {
    sfx('boss'); music('chefe'); this.shake(10);
    this.ui.banner(b.d.titulo.toUpperCase(), b.d.nome, b.d.ref);
    this.addText(b.x, b.y - b.r - 30, b.d.intro, '#FFFFFF', 14, 3.5);
  }

  async accusation(b) {
    b.act = 'accuse'; b.inv = true; b.talk = true;
    const acc = pick(ACUSACOES);
    const ok = await this.ui.verseBattle(acc, shuffle(FALSAS.slice()).slice(0, 2));
    b.inv = false; b.talk = false;
    if (ok) {
      const dmg = Math.round(b.max * 0.1); b.hp -= dmg; b.stun = 3.5; b.flash = 0.5;
      this.addText(b.x, b.y - 70, 'Está escrito! -' + dmg, '#FFE38A', 20); this.burst(b.x, b.y, 60, '#FFE38A', 320); this.shake(14); sfx('right');
      this.char.data.stats.quizOk++; this.addScore(150);
      if (!this.char.data.verses.includes(acc.ref)) this.char.data.verses.push(acc.ref);
      if (b.hp <= 0) this.kill(b);
    } else { sfx('wrong'); this.p.inv = 0; this.damagePlayer(28, b, { unblockable: true }); }
    this.endAct(b, 1.5);
  }

  /* ================= Projéteis, áreas e efeitos ================= */
  updateProjectiles(dt) {
    const p = this.p, m = this.cur.map;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const q = this.projs[i];
      q.life -= dt;
      if (q.owner === 'fx') { if (q.life <= 0) this.projs.splice(i, 1); continue; }
      if (q.homing) {
        let best = null, bd = 260;
        for (const e of this.enemies) { if (e.hp <= 0 || e.submerged || q.hitSet.has(e)) continue; const d = Math.hypot(e.x - q.x, e.y - q.y); if (d < bd) { bd = d; best = e; } }
        if (best) {
          const cur = Math.atan2(q.vy, q.vx), want = Math.atan2(best.y - q.y, best.x - q.x), sp = Math.hypot(q.vx, q.vy);
          const na = cur + clamp(angDiff(want, cur), -q.homing * dt, q.homing * dt); q.vx = Math.cos(na) * sp; q.vy = Math.sin(na) * sp;
        }
      }
      q.x += q.vx * dt; q.y += q.vy * dt;
      let dead = q.life <= 0;
      const tl = m.get(Math.floor(q.x / TS), Math.floor(q.y / TS));
      if (m.solid(Math.floor(q.x / TS), Math.floor(q.y / TS)) && tl !== T.WATER && tl !== T.TABLE) { dead = true; this.burst(q.x, q.y, 4, '#ccc', 60); }
      if (q.kind === 'luz' && Math.random() < 0.6) this.parts.push({ x: q.x, y: q.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.3, max: 0.3, size: 3, color: '#FFE38A', glow: true });
      if (!dead && q.owner === 'p') {
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.submerged || q.hitSet.has(e)) continue;
          if (Math.hypot(e.x - q.x, e.y - q.y) < e.r + q.r) {
            q.hitSet.add(e); this.hit(e, q.mult, Math.atan2(q.vy, q.vx), 120, q.pos);
            if (q.pierce-- <= 0) { dead = true; break; }
          }
        }
      } else if (!dead && q.owner === 'e') {
        if (Math.hypot(p.x - q.x, p.y - (q.y)) < p.r + q.r) {
          const r = this.damagePlayer(q.dmg, q);
          if (r === 'parry' && q.reflect) {
            // devolve o projétil
            q.owner = 'p'; q.vx *= -1.3; q.vy *= -1.3; q.mult = 2; q.kind = 'luz'; q.life = 1.5; q.hitSet = new Set(); q.pierce = 0;
            this.addText(p.x, p.y - 56, 'Devolvido!', '#FFE38A', 13);
          } else if (r !== 'miss') dead = true;
        }
      }
      if (dead) this.projs.splice(i, 1);
    }
  }

  updateTele(dt) {
    for (let i = this.tele.length - 1; i >= 0; i--) { const t = this.tele[i]; t.t -= dt; if (t.t <= 0) { this.tele.splice(i, 1); t.onEnd?.(); } }
    const p = this.p;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.delay > 0) { h.delay -= dt; continue; }
      h.t -= dt;
      if (h.ring) {
        h.r += h.spd * dt;
        const d = Math.hypot(p.x - h.x, p.y - h.y);
        if (!h.hit && Math.abs(d - h.r) < 16) { h.hit = true; this.damagePlayer(h.dmg, h, { unblockable: true }); }
      } else {
        h.tick -= dt;
        if (h.tick <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < h.r) { h.tick = 0.5; this.damagePlayer(h.dmg, h, { unblockable: true, noKnock: true }); }
      }
      if (h.t <= 0) this.hazards.splice(i, 1);
    }
  }

  updatePickups(dt) {
    const p = this.p, c = this.char;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]; k.t += dt;
      k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= Math.pow(0.02, dt); k.vy *= Math.pow(0.02, dt);
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      if (k.t > 0.4 && d < 90) { k.x += (p.x - k.x) * dt * 8; k.y += (p.y - k.y) * dt * 8; }
      if (k.t > 0.4 && d < 20) {
        this.pickups.splice(i, 1);
        if (k.kind === 'ouro') { c.data.gold += k.v; sfx('coin'); this.addText(p.x + rand(-10, 10), p.y - 30, '+' + k.v, '#F2C14E', 11); }
        else if (k.kind === 'cura') { p.hp = Math.min(this.st.maxHp, p.hp + k.v); sfx('heal'); this.addText(p.x, p.y - 30, '+' + k.v, '#7CE0A0', 12); }
        else { addItem(c, k.id); sfx('coin'); this.ui.toast('Você achou: ' + ITEMS[k.id].icon + ' ' + ITEMS[k.id].nome); }
      } else if (k.t > 40) this.pickups.splice(i, 1);
    }
  }

  updateFx(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy = q.vy * 0.92 + (q.grav || 0) * dt; if (q.life <= 0) this.parts.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y -= 26 * dt; if (t.life <= 0) this.texts.splice(i, 1); }
    this.shakeA = Math.max(0, this.shakeA - dt * 30);
  }
  burst(x, y, n, color, spd) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(0.3, 1) * spd; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, size: rand(2, 4.5), color }); } if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700); }
  puff(x, y, n, color) { for (let i = 0; i < n; i++) this.parts.push({ x: x + rand(-6, 6), y, vx: rand(-20, 20), vy: rand(-30, -5), life: 0.4, max: 0.4, size: rand(3, 6), color }); }
  addText(x, y, txt, color, size = 13, life = 1.1) { this.texts.push({ x, y, txt, color, size, life, max: life }); }
  shake(a) { if (config.tremor) this.shakeA = Math.max(this.shakeA, a); }

  /* ================= Mundo ================= */
  updateWorld(dt) {
    this.pegarSacola();
    this.updateFugidas(dt);
    const p = this.p;
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), z = zoneAt(tx, ty);
    if (z !== this.zone) { this.zone = z; this.ui.zone(ZONES[z].nome, ZONES[z].seguro); }
    // reaparecer inimigos longe do jogador
    if (this.souHost()) {
      for (const s of this.spawns) if (!s.alive && this.T > s.at && Math.hypot(s.tx * TS - p.x, s.ty * TS - p.y) > 600) this.spawnFrom(s);
      for (const wb of this.worldBosses) if (!wb.alive && this.T > wb.at && Math.hypot(wb.home.x - p.x, wb.home.y - p.y) > 900) this.spawnWorldBoss(wb);
    }
    // o Pecado espreita os portões à noite (Gn 4:7)
    const night = this.darkness() > 0.35;
    if (night && !this.pecado && !this.char.data.secrets.includes('pecado1') && Math.random() < dt / 20) {
      const gx = pick(GATE_XS); this.pecado = { x: gx * TS + 16, y: (GATE_Y + 1) * TS + 10, t: 0, r: 20, met: false };
    }
    if (this.pecado) {
      this.pecado.t += dt;
      if (!night && !this.pecado.met) this.pecado = null;
      else if (!this.pecado.met && Math.hypot(p.x - this.pecado.x, p.y - this.pecado.y) < 130) { this.pecado.met = true; this.meetPecado(); }
    }
    // ovelha perdida
    const sh = this.sheep;
    if (sh) {
      sh.time -= dt;
      if (sh.found) {
        const dx = p.x - 30 * p.fx - sh.x, dy = p.y - 30 * p.fy - sh.y, d = Math.hypot(dx, dy);
        if (d > 30) { sh.x += dx / d * Math.min(d, 260 * dt * (d / 40)); sh.y += dy / d * Math.min(d, 260 * dt * (d / 40)); }
        const davi = this.npcs.find(n => n.id === 'davi');
        if (Math.hypot(p.x - davi.x, p.y - davi.y) < 90) this.sheepDone(true);
      } else {
        const d = Math.hypot(p.x - sh.x, p.y - sh.y);
        // direção aproximada (8 rumos) para não ficar perdido no mapa
        const rumo = ['leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste', 'norte', 'nordeste'][(Math.round(Math.atan2(sh.y - p.y, sh.x - p.x) / (Math.PI / 4)) + 8) % 8];
        const hint = d < 160 ? 'MUITO PERTO! Ouço um "béé"!' : d < 450 ? 'Quente! Está perto, a ' + rumo + '.' : d < 1000 ? 'Morno… o "béé" vem do ' + rumo + '.' : d < 1800 ? 'Frio. Está longe, para o ' + rumo + '.' : 'Muito frio! Bem longe, para o ' + rumo + '.';
        this.ui.sheepHint(hint, sh.time, d < 450 ? (d < 160 ? 3 : 2) : d < 1000 ? 1 : 0);
        if (d < 52) { sh.found = true; sfx('right'); this.ui.toast('Você achou a ovelha perdida! Leve-a de volta ao Davi.', 4000); this.ui.sheepHint('Leve a ovelha ao Davi (Campos de Belém)', sh.time, 3); }
      }
      if (sh.time <= 0 && !sh.done) this.sheepDone(false);
    }
  }

  darkness() {
    const ph = (Date.now() / 1000 % 600) / 600; // um dia = 10 minutos, igual para todos
    if (ph < 0.55) return 0;
    if (ph < 0.62) return (ph - 0.55) / 0.07 * 0.55;
    if (ph < 0.93) return 0.55;
    return (1 - ph) / 0.07 * 0.55;
  }

  async meetPecado() {
    const pc = this.pecado;
    await this.ui.dialog({ nome: '???', look: null, texto: '…Você me sente, não sente? Eu estou sempre à porta. Esperando.', acoes: [{ label: 'Quem é você?' }] });
    await this.ui.dialog({ nome: '???', texto: 'Ainda não é hora de você me enfrentar. Mas eu sei o seu nome… e você logo vai saber o meu.', acoes: [{ label: '…' }] });
    this.burst(pc.x, pc.y, 60, '#000000', 260); this.burst(pc.x, pc.y, 20, '#FF2E4A', 200); this.shake(10); sfx('boss');
    this.pecado = null;
    this.char.data.secrets.push('pecado1'); addItem(this.char, 'pagina_rasgada'); this.addScore(777);
    this.ui.toast('Item secreto: 📃 Página Rasgada — "O pecado jaz à porta… mas a ti cumpre dominá-lo" (Gn 4:7)', 7000);
    this.save();
  }

  // ---------- Ovelhas fugidas (missão "O bom pastor"): andam, fogem de você e cansam ----------
  updateFugidas(dt) {
    const c = this.char, qs = c.data.quests.q_ovelhas, p = this.p, st = this.st;
    if (!qs || qs.st !== 'ativa') { this.fugidas = null; return; }
    const faltam = QUESTS.q_ovelhas.qtd - qs.n;
    if (!this.fugidas) {
      // nascem longe do Davi, cada uma num lugar diferente
      const davi = this.npcs.find(n => n.id === 'davi'), spots = shuffle(this.world.sheepSpots.filter(s => Math.hypot(s.x - davi.x, s.y - davi.y) > 18 * TS));
      this.fugidas = spots.slice(0, faltam).map(s => ({ x: s.x, y: s.y, r: 10, fx: 1, walk: 0, moving: false, st: 'solta', fuga: 0, cansada: 0, ang: rand(0, TAU), troca: 0 }));
    }
    const davi = this.npcs.find(n => n.id === 'davi');
    let fila = 0;
    for (const o of this.fugidas.slice()) {
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
      let vx = 0, vy = 0;
      if (o.st === 'seguindo') {
        // em fila atrás do jogador
        fila++; const tx = p.x - p.fx * 30 * fila, ty = p.y - p.fy * 20 * fila + 6, ex = tx - o.x, ey = ty - o.y, de = Math.hypot(ex, ey);
        if (de > 600) { o.x = tx; o.y = ty; } else if (de > 8) { const v = Math.min(de, st.spd * 1.25 * dt * (de > 60 ? 1.5 : 1)); vx = ex / de * v / dt; vy = ey / de * v / dt; }
        if (Math.hypot(p.x - davi.x, p.y - davi.y) < 120) { // entrega quando o jogador chega ao Davi (a fila toda)
          this.fugidas.splice(this.fugidas.indexOf(o), 1); this.questEvent('ovelha', '*');
          this.addText(davi.x, davi.y - 46, 'Obrigado! 🐑', '#7CE0A0', 14); this.burst(o.x, o.y, 20, '#FFFFFF', 160); sfx('right');
          continue;
        }
      } else if (o.cansada > 0) {
        o.cansada -= dt; // parada, ofegante: é a hora de pegar!
        if (Math.random() < dt * 3) this.puff(o.x + o.fx * 10, o.y - 6, 1, 'rgba(255,255,255,.7)');
      } else if (d < 170) {
        // foge na direção contrária, desviando um pouco; depois de correr um tempo, cansa
        o.fuga += dt;
        const a = Math.atan2(dy, dx) + Math.sin(this.T * 3 + o.ang) * 0.6, v = st.spd * 0.9;
        vx = Math.cos(a) * v; vy = Math.sin(a) * v;
        if (o.fuga > 2.4) { o.fuga = 0; o.cansada = 2; this.addText(o.x, o.y - 26, 'cansou!', '#FFE38A', 11); }
        if (Math.random() < dt * 1.2) this.addText(o.x, o.y - 24, 'béé!', '#FFFFFF', 10);
      } else {
        // passeia devagar
        o.fuga = Math.max(0, o.fuga - dt * 0.5); o.troca -= dt;
        if (o.troca <= 0) { o.troca = rand(1.5, 3.5); o.ang = Math.random() < 0.35 ? null : rand(0, TAU); }
        if (o.ang != null) { vx = Math.cos(o.ang) * 34; vy = Math.sin(o.ang) * 34; }
      }
      if (o.st === 'solta' && d < 40) { o.st = 'seguindo'; sfx('key'); this.ui.toast('Pegou uma ovelha fugida! Leve ao Davi, nos Campos de Belém.', 3500); }
      const ox = o.x, oy = o.y; this.moveEnt(o, vx * dt, vy * dt);
      o.moving = Math.hypot(o.x - ox, o.y - oy) > 0.3; if (o.moving) o.walk += dt; if (Math.abs(vx) > 2) o.fx = Math.sign(vx);
      if (o.st === 'solta' && !o.moving && o.ang != null && o.cansada <= 0 && d >= 170) o.ang = rand(0, TAU); // bateu em algo: muda de rumo
    }
  }

  startSheep() {
    const spot = pick(this.world.sheepSpots);
    this.sheep = { x: spot.x, y: spot.y, time: 300, found: false, done: false };
    this.ui.sheepHint('Procure a ovelha! Siga as dicas de quente, frio e direção.', 300, 0);
  }
  sheepDone(ok) {
    const sh = this.sheep; if (!sh || sh.done) return; sh.done = true; this.sheep = null; this.ui.sheepHint(null);
    if (ok) {
      const bonus = Math.round(sh.time * 3);
      this.char.data.gold += 60; this.gainXp(80); this.addScore(300 + bonus); addItem(this.char, 'peixe', 1);
      this.char.data.mini.ovelha = (this.char.data.mini.ovelha || 0) + 1;
      this.ui.dialog({ nome: 'Davi, o Pastorzinho', look: WORLD_NPCS.find(n => n.id === 'davi').look, texto: '"Alegrem-se comigo, pois encontrei a minha ovelha perdida!" (Lc 15:6). Assim há alegria no céu por um pecador que se arrepende. Obrigado!\n\n+60 denários · +80 XP · +' + (300 + bonus) + ' pontos · 🐟 Peixe', acoes: [{ label: 'Amém!' }] });
      sfx('level');
    } else this.ui.toast('O tempo acabou… Fale com o Davi para tentar de novo.');
  }

  /* ================= Fase ================= */
  updateFase(dt) {
    const f = this.fase, p = this.p;
    if (!f || f.done) return;
    f.healCd -= dt;
    const doorRow = f.built.door.length ? f.built.door[0].ty : 0;
    if (!f.bossSpawned && f.keys >= 3 && p.y < doorRow * TS) {
      f.bossSpawned = true;
      const bp = f.built.boss;
      const b = this.makeBoss(f.def.chefe, bp.x, bp.y); b.engaged = true;
      this.enemies.push(b); this.bossIntro(b);
    }
    for (const c of this.chests) if (c.locked > 0) c.locked = Math.max(0, c.locked - dt);
    this.ui.faseHud({ n: f.n, nome: f.def.nome, keys: f.keys, objetivo: f.keys >= 3 ? (f.bossSpawned ? 'Derrote ' + BOSSES[f.def.chefe].nome + '!' : 'A porta do chefe está aberta — siga para o norte!') : f.def.objetivo, time: this.T - f.t0 });
  }

  async openChest(c) {
    const f = this.fase;
    if (c.open || c.locked > 0) return;
    if (!f.quiz.length) f.quiz = shuffle(f.def.quiz.slice());
    const q = f.quiz.pop();
    const ok = await this.ui.quiz(q, 'Baú da Fase ' + f.n);
    this.revisao(q, ok);
    if (ok && f.keys >= 3) return this.bonusChest(c);
    if (ok) {
      c.open = true; f.keys++; f.ok++; this.char.data.stats.quizOk++; this.addScore(60); sfx('key');
      this.p.fe = Math.min(this.st.maxFe, this.p.fe + 20);
      this.addText(c.x, c.y - 30, 'CHAVE ' + f.keys + '/3', '#FFD23F', 16); this.burst(c.x, c.y, 30, '#FFD23F', 200);
      if (Math.random() < 0.5) this.pickups.push({ kind: 'ouro', v: 10, x: c.x, y: c.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 });
      if (f.keys === 3) this.openDoor();
    } else {
      c.locked = 8; f.err++; this.char.data.stats.quizErr++; sfx('wrong');
      this.p.inv = 0; this.damagePlayer(Math.round(this.st.maxHp * 0.08), c, { unblockable: true, noKnock: true });
    }
  }
  // Perguntas erradas vão para a lista "Para revisar" (menu › Bíblia); acertar depois tira da lista
  revisao(q, ok) {
    const r = (this.char.data.revisar = this.char.data.revisar || []), i = r.findIndex(x => x.q === q.q);
    if (ok) { if (i >= 0) { r.splice(i, 1); this.ui.toast('Pergunta revisada e aprendida! ✔'); } return; }
    if (i < 0) { r.push({ q: q.q, certa: q.a[0], porque: q.porque || '' }); if (r.length > 40) r.shift(); }
  }
  // Baús que sobram depois das 3 chaves: tesouro de verdade para quem continua respondendo
  bonusChest(c) {
    const f = this.fase, ch = this.char;
    c.open = true; f.ok++; ch.data.stats.quizOk++; sfx('key');
    const ouro = randi(40, 70) * f.n, xp = 30 * f.n;
    ch.data.gold += ouro; this.gainXp(xp); this.addScore(150);
    const premio = [];
    // o prêmio da fase pode sair aqui
    const rec = f.def.recompensa, sorte = rec && !this.temItem(rec) && Math.random() < CHANCE_PREMIO.bau;
    if (sorte) { premio.push(rec); f.premio = true; this.ui.toast('✨ O PRÊMIO DA FASE estava no baú: ' + ITEMS[rec].icon + ' ' + ITEMS[rec].nome + '!', 6000); sfx('level'); }
    const raro = ['escudo_bronze', 'elmo_bronze', 'botas_viajante', 'cota_malha', 'moeda_mamom'].filter(id => !ch.data.inv[id] && !Object.values(ch.data.eq).includes(id) && ch.level >= (ITEMS[id].nivel || 1));
    if (raro.length && Math.random() < 0.2) premio.push(pick(raro));
    else premio.push(pick(['agua_viva', 'oleo', 'mel', 'peixe']));
    if (Math.random() < 0.5) premio.push(pick(['pao', 'mana', 'peixe']));
    for (const id of premio) addItem(ch, id);
    this.p.hp = Math.min(this.st.maxHp, this.p.hp + this.st.maxHp * 0.25); this.p.fe = this.st.maxFe;
    this.addText(c.x, c.y - 30, 'TESOURO!', '#FFD23F', 18); this.burst(c.x, c.y, 40, '#FFD23F', 240); this.shake(4);
    for (let i = 0; i < 6; i++) this.pickups.push({ kind: 'ouro', v: 5, x: c.x, y: c.y, vx: rand(-90, 90), vy: rand(-90, 90), t: 0 });
    this.ui.toast('Baú do tesouro! +' + ouro + ' denários, +' + xp + ' XP, ' + premio.map(id => ITEMS[id].icon + ' ' + ITEMS[id].nome).join(', ') + '. "Ajuntai tesouros no céu" (Mt 6:20)', 5500);
  }
  temItem(id) { const c = this.char; return !!c.data.inv[id] || Object.values(c.data.eq).includes(id); }
  openDoor() {
    const m = this.cur.map;
    for (const d of this.fase.built.door) m.set(d.tx, d.ty, T.FLOOR);
    m.invalidate(); sfx('gate'); this.shake(8);
    this.ui.toast('As 3 chaves abriram a porta do chefe! Vá para o norte.', 4000);
  }

  faseComplete() {
    const f = this.fase, c = this.char, def = f.def;
    f.done = true;
    const sem = f.sem, prog = faseProg(c, sem.id);
    const first = !prog[f.n]?.done;
    const secs = Math.round(this.T - f.t0);
    const timeBonus = Math.max(0, 600 - secs) * 2;
    const pts = 500 * f.n + timeBonus + f.ok * 50 - f.err * 25;
    const best = Math.max(prog[f.n]?.best || 0, pts);
    prog[f.n] = { done: true, best, time: Math.min(prog[f.n]?.time || 99999, secs) };
    this.addScore(Math.max(100, first ? pts : Math.round(pts * 0.3)));
    const xp = 120 * f.n, gold = 80 * f.n;
    this.gainXp(xp); c.data.gold += gold;
    // prêmio da fase: sorteado no fim (se ainda não caiu num baú do tesouro e você não tem)
    let item = null, semPremio = false;
    if (def.recompensa && !f.premio && !this.temItem(def.recompensa)) {
      if (Math.random() < CHANCE_PREMIO.fim) { addItem(c, def.recompensa); item = def.recompensa; } else semPremio = true;
    }
    if (!c.data.verses.includes(def.versiculo.ref)) c.data.verses.push(def.versiculo.ref);
    let semana = null;
    const all = sem.fases.every(x => prog[x.n]?.done);
    if (all && !prog.semana) { prog.semana = true; addItem(c, sem.recompensaSemana); semana = sem.recompensaSemana; this.addScore(3000); }
    this.questEvent('fase', f.n);
    this.save();
    this.ui.faseComplete({ fase: def, semPremio, secs, pts: first ? pts : Math.round(pts * 0.3), first, xp, gold, item, semana, ok: f.ok, err: f.err, kills: f.kills }).then(() => this.exitFase());
  }

  /* ================= Interação ================= */
  updateInteract() {
    const p = this.p; let best = null, bd = 64;
    const consider = (o, d, label, fn) => { if (d < bd) { bd = d; best = { o, label, fn }; } };
    for (const n of this.npcs) consider(n, Math.hypot(n.x - p.x, n.y - p.y), 'Falar com ' + n.nome, () => this.talk(n));
    if (this.scene === 'world') {
      { const x = GATE_XS[0] * TS + 16, y = 36 * TS + 8; consider({ x, y }, Math.hypot(x - p.x, y - p.y) * 0.8, 'Entrar no Portão das Dungeons', () => { sfx('gate'); this.enterSalao(); }); }
      for (const o of this.others.values()) consider(o, Math.hypot(o.x - p.x, o.y - p.y) + 8, 'Falar com ' + o.name, () => this.ui.playerCard(o));
      // pescar em qualquer beira de lago ou mar
      const agua = this.waterNear();
      if (agua) consider(agua, 60, '🎣 Pescar', () => this.playMini('pescaria', { zona: agua.zona, nome: agua.zona === 'costa' ? 'Costa de Jope' : agua.zona === 'lago' ? 'Lago de Genesaré' : 'Águas tranquilas' }));
      const fx = 90 * TS + 16, fy = 75 * TS + 16; consider({ x: fx, y: fy }, Math.hypot(fx - p.x, fy - p.y) - 40, 'Beber da Fonte de Betesda', () => this.fountain());
      for (const a of this.altares) consider(a, Math.hypot(a.x - p.x, a.y - p.y) - 10, (this.acesas().includes(a.id) ? '🔥 Descansar na' : '🪨 Acender a') + ' Pedra de Ebenézer', () => this.descansar(a));
    } else if (this.scene === 'salao') {
      for (const pt of this.portais) consider(pt, Math.hypot(pt.x - p.x, pt.y + 20 - p.y) * 0.8, (pt.state === 'fechado' ? '🔒 ' : '') + pt.tag + ': ' + pt.label, pt.fn);
      if (this.saida) consider(this.saida, Math.hypot(this.saida.x - p.x, this.saida.y - p.y), this.hub.tipo === 'semana' ? 'Voltar ao Salão das Dungeons' : 'Sair para o mundo', () => { sfx('gate'); this.exitHub(); });
    } else if (this.fase) {
      for (const c of this.chests) if (!c.open) consider(c, Math.hypot(c.x - p.x, c.y - p.y), c.locked ? 'Trancado (' + Math.ceil(c.locked) + 's)' : this.fase.keys >= 3 ? 'Abrir baú do tesouro (quiz)' : 'Abrir baú (quiz)', () => this.openChest(c));
      for (const h of this.fase.built.heal) consider(h, Math.hypot(h.x - p.x, h.y - p.y) - 10, 'Fonte de cura', () => this.faseHeal());
    }
    this.interactTarget = best;
    this.ui.setInteract(best ? best.label : null);
    if (best && input.consume('interact')) best.fn();
    input.pressed.delete('interact');
  }

  // Água funda a até 1 tile do jogador (para pescar)
  waterNear() {
    const m = this.world.map, tx = Math.floor(this.p.x / TS), ty = Math.floor(this.p.y / TS);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.get(tx + dx, ty + dy) === T.WATER) {
      const z = zoneAt(tx, ty);
      return { x: (tx + dx) * TS + 16, y: (ty + dy) * TS + 16, zona: z === 'costa' || tx > 118 ? 'costa' : 'lago' };
    }
    return null;
  }
  fountain() {
    const p = this.p; p.hp = this.st.maxHp; p.fe = this.st.maxFe; sfx('heal'); this.burst(p.x, p.y, 30, '#9FE6F0', 200);
    this.ui.toast('Vida e Fé restauradas! "Levanta-te, toma o teu leito e anda" (Jo 5:8)');
  }
  faseHeal() {
    if (this.fase.healCd > 0) { this.ui.toast('A fonte está enchendo… ' + Math.ceil(this.fase.healCd) + 's'); return; }
    this.fase.healCd = 45; const p = this.p; p.hp = this.st.maxHp; p.fe = this.st.maxFe; sfx('heal'); this.burst(p.x, p.y, 30, '#9FE6F0', 200);
  }

  gateDialog(sem, n) {
    const f = sem.fases[n - 1], c = this.char, prog = faseProg(c, sem.id);
    if (!f) return;
    const prevOk = n === 1 || prog[n - 1]?.done, lvlOk = c.level >= f.nivel;
    const done = prog[n]?.done;
    let txt = f.ref + ' — ' + f.licao + '\n\n';
    if (!prevOk) txt += '🔒 Complete a Fase ' + (n - 1) + ' para abrir este portão.';
    else if (!lvlOk) txt += '🔒 Precisa do nível ' + f.nivel + ' (você está no ' + c.level + '). Vença vícios no mundo para subir.';
    else txt += done ? '✅ Fase concluída! Melhor pontuação: ' + prog[n].best + '. Pode jogar de novo.' : 'Chefe: ' + BOSSES[f.chefe].nome + '. Prêmio raro: ' + ITEMS[f.recompensa].icon + ' ' + ITEMS[f.recompensa].nome + (this.temItem(f.recompensa) ? ' (você já tem)' : ' — pode cair nos baús do tesouro (depois das 3 chaves) ou no fim da fase.');
    if (done && !this.temItem(f.recompensa)) txt += '\nO prêmio ' + ITEMS[f.recompensa].icon + ' ' + ITEMS[f.recompensa].nome + ' ainda não caiu: jogue de novo para tentar!';
    if (sem !== SEMANA_ATUAL && !done) txt += '\n\n(Semana passada: os prêmios continuam valendo!)';
    if (prevOk && lvlOk && !done) txt += '\n\n📖 Recomendado: leia ' + f.ref + ' na Bíblia antes de entrar. As perguntas dos baús saem desse texto!';
    const acoes = [];
    const entrar = () => { sfx('gate'); this.enterFase(sem, n); };
    const lidoKey = sem.id + ':' + n, lidos = c.data.lidos || (c.data.lidos = []);
    if (prevOk && lvlOk) acoes.push({ label: done ? 'Jogar de novo' : 'Entrar no portão', fn: done || lidos.includes(lidoKey) ? entrar : () => this.readFirst(f, lidoKey, entrar) });
    acoes.push({ label: 'Voltar' });
    this.ui.dialog({ nome: 'Fase ' + n + ': ' + f.nome, texto: txt, acoes });
  }
  // Antes da primeira vez na fase: sugere ler o texto bíblico (sem obrigar)
  readFirst(f, key, entrar) {
    const marcar = () => { if (!this.char.data.lidos.includes(key)) this.char.data.lidos.push(key); };
    this.ui.dialog({
      nome: '📖 Já leu ' + f.ref + '?',
      texto: 'Antes de entrar, leia ' + f.ref + ' na sua Bíblia (ou no link abaixo). Quem lê vai melhor nos baús e entende a lição da fase:\n\n"' + f.licao + '"',
      acoes: [
        { label: 'Já li! Entrar', fn: () => { marcar(); entrar(); } },
        { label: '📖 Ler agora', fn: () => { open('https://www.biblegateway.com/passage/?search=' + encodeURIComponent(f.ref) + '&version=ARC', '_blank', 'noopener'); setTimeout(() => this.readFirst(f, key, entrar), 300); } },
        { label: 'Entrar sem ler', fn: entrar }
      ]
    });
  }

  async talk(n) {
    const c = this.char;
    n.talkT = this.T;
    const acoes = [];
    if (n.loja) acoes.push({ label: '🛒 Ver loja', fn: () => this.ui.shop(n.loja) });
    if (n.ranking) acoes.push({ label: '🏆 Ver ranking', fn: () => this.ui.openMenu('ranking') });
    if (n.classe) acoes.push({ label: '✝ Trocar de classe', fn: () => this.trocarClasse(n) });
    if (n.minijogo) {
      const MJ = { ovelha: 'Procurar a ovelha', pesca: 'Pescar', mana: 'Colher o maná', arca: 'Formar os pares' };
      acoes.push({ label: '🎮 ' + MJ[n.minijogo], fn: () => this.playMini(n.minijogo) });
    }
    let texto = n.falas[(n.idx = ((n.idx ?? -1) + 1) % n.falas.length)];
    if (n.missao) {
      const qd = QUESTS[n.missao], qs = c.data.quests[n.missao];
      if (!qs) acoes.unshift({ label: (qd.dificil ? '🔥 Missão difícil: ' : '📜 Missão: ') + qd.titulo, fn: () => { c.data.quests[n.missao] = { st: 'ativa', n: 0 }; this.ui.toast('Missão aceita: ' + qd.titulo + ' — ' + qd.desc, 4500); sfx('right'); if (qd.tipo === 'fase' && faseProg(c, SEMANA_ATUAL.id)[qd.alvo]?.done) this.questEvent('fase', qd.alvo); } });
      else if (qs.st === 'ativa') texto += '\n\n📜 ' + qd.titulo + ': ' + qd.desc + ' (' + qs.n + '/' + qd.qtd + ')';
      else if (qs.st === 'pronta') acoes.unshift({ label: '🎁 Entregar missão', fn: () => this.completeQuest(n.missao) });
    }
    acoes.push({ label: 'Tchau' });
    this.ui.dialog({ nome: n.nome, look: n.look, texto, acoes });
  }

  // Troca de classe (Samuel): mantém nível e itens; a arma muda para a melhor que você tiver da nova classe
  precoClasse() { return 150 + this.char.level * 50; }
  trocarClasse(n) {
    const c = this.char, preco = this.precoClasse();
    const acoes = Object.keys(CLASSES).filter(k => k !== c.cls).map(k => ({ label: CLASSES[k].icon + ' ' + CLASSES[k].nome, fn: () => {
      if (c.data.gold < preco) { this.ui.toast('Você precisa de ' + preco + ' denários para a unção.'); return; }
      c.data.gold -= preco;
      const velha = c.data.eq.arma; delete c.data.eq.arma;
      c.cls = k;
      if (velha) addItem(c, velha); // vai para a guarda se for da classe antiga
      const { voltaram } = arrumarArmas(c);
      const armas = Object.keys(c.data.inv).filter(id => ITEMS[id]?.slot === 'arma' && (ITEMS[id].classe === k || ITEMS[id].classe === 'todas') && c.level >= (ITEMS[id].nivel || 1));
      const melhor = armas.sort((a, b) => (ITEMS[b].atk || 0) - (ITEMS[a].atk || 0))[0];
      if (melhor) { removeItem(c, melhor); c.data.eq.arma = melhor; } else c.data.eq.arma = CLASSES[k].armaInicial;
      this.refreshStats(); this.p.hp = this.st.maxHp; this.p.fe = this.st.maxFe; this.p.skillCd = 0;
      this.ui.attach(this); sfx('level'); this.burst(this.p.x, this.p.y, 50, '#FFE38A', 260);
      this.ui.dialog({ nome: n.nome, look: n.look, texto: 'Você agora é ' + CLASSES[k].nome + '! Arma: ' + ITEMS[c.data.eq.arma].icon + ' ' + ITEMS[c.data.eq.arma].nome + '.' + (voltaram.length ? ' Suas armas de ' + CLASSES[k].nome + ' guardadas voltaram para a mochila.' : '') + ' Especial: ' + CLASSES[k].skill.nome + ' — ' + CLASSES[k].skill.desc + '\n\n"Tomou Samuel o chifre do azeite e o ungiu" (1Sm 16:13).', acoes: [{ label: 'Amém!' }] });
      this.save();
    } }));
    acoes.push({ label: 'Agora não' });
    this.ui.dialog({ nome: n.nome, look: n.look, texto: 'Você é ' + CLASSES[c.cls].nome + '. A unção para outra classe custa 🪙 ' + preco + ' (você tem ' + c.data.gold + ').\nSeu nível, itens e progresso continuam. Cada classe só carrega as próprias armas: as da classe atual ficam guardadas comigo e voltam se você retornar a ela.' + (Object.keys(c.data.guardadas || {}).length ? '\n\nGuardadas comigo: ' + Object.keys(c.data.guardadas).map(id => ITEMS[id].icon + ' ' + ITEMS[id].nome).join(', ') + '.' : ''), acoes });
  }

  questEvent(tipo, alvo) {
    const c = this.char;
    for (const id in c.data.quests) {
      const qs = c.data.quests[id], qd = QUESTS[id];
      if (qs.st !== 'ativa' || qd.tipo !== tipo) continue;
      if (qd.alvo !== '*' && qd.alvo !== alvo) continue;
      qs.n = Math.min(qd.qtd, qs.n + 1);
      if (qs.n >= qd.qtd) { qs.st = 'pronta'; this.ui.toast('Missão completa: ' + qd.titulo + '! Volte para receber a recompensa.', 4500); sfx('key'); }
    }
  }
  completeQuest(id) {
    const c = this.char, qd = QUESTS[id], r = qd.recompensa;
    c.data.quests[id].st = 'feita';
    c.data.gold += r.ouro || 0; this.gainXp(r.xp || 0); this.addScore(r.pontos || 0);
    for (const k in r.itens || {}) addItem(c, k, r.itens[k]);
    sfx('level');
    this.ui.dialog({ nome: 'Missão concluída!', texto: qd.titulo + '\n\n+' + (r.ouro || 0) + ' denários · +' + (r.xp || 0) + ' XP · +' + (r.pontos || 0) + ' pontos\n' + Object.keys(r.itens || {}).map(k => ITEMS[k].icon + ' ' + ITEMS[k].nome + ' x' + r.itens[k]).join(', '), acoes: [{ label: 'Amém!' }] });
    this.save();
  }

  async playMini(id, opts) {
    if (id === 'ovelha') {
      if (this.sheep) { this.ui.toast('Você já está procurando a ovelha!'); return; }
      this.startSheep(); return;
    }
    const res = await this.ui.minigame(id, opts);
    if (!res) return;
    const c = this.char;
    c.data.mini[id] = Math.max(c.data.mini[id] || 0, res.score);
    if (res.peixe) { c.data.peixes = c.data.peixes || {}; c.data.peixes[res.peixe] = (c.data.peixes[res.peixe] || 0) + 1; this.questEvent('pesca', '*'); }
    const gold = Math.round(res.score / 10) + (res.ouro || 0), pts = res.score;
    c.data.gold += gold; this.addScore(pts); this.gainXp(Math.round(res.score / 8));
    if (res.item) addItem(c, res.item);
    sfx('coin'); this.ui.toast('Minijogo: +' + pts + ' pontos, +' + gold + ' denários' + (res.item ? ', ' + ITEMS[res.item].icon + ' ' + ITEMS[res.item].nome : ''), 4000);
    this.save();
  }

  /* ================= Rede ================= */
  sendPos() {
    const p = this.p, c = this.char;
    const st = { id: c.id, w: this.worldSince, name: c.name, cls: c.cls, look: c.look, lvl: c.level, cla: this.social.clan?.tag, pet: this.st.pet ? { k: this.st.pet, m: p.mounted ? 1 : 0 } : undefined, x: Math.round(p.x), y: Math.round(p.y), fx: +p.fx.toFixed(2), fy: +p.fy.toFixed(2), mv: p.moving ? 1 : 0, atk: p.atkT > 0 ? 1 : 0, eq: c.data.eq };
    const key = st.x + ',' + st.y + ',' + st.atk + ',' + st.fx;
    if (key === this.lastSent && this.T - (this.lastSentT || 0) < 3) return;
    this.lastSent = key; this.lastSentT = this.T;
    this.net.send(st);
  }
  onNetPos(m) {
    // a conexão antiga (antes de recarregar a página, ou outro aparelho com o mesmo personagem) ainda manda a posição: não é outro jogador
    if (m.id === this.char.id) return;
    let o = this.others.get(m.id);
    if (!o) { o = { ...m, walk: 0 }; this.others.set(m.id, o); }
    Object.assign(o, { w: m.w, tx: m.x, ty: m.y, fx: m.fx, fy: m.fy, mv: m.mv, atk: m.atk, lvl: m.lvl, look: m.look, eq: m.eq, cla: m.cla, pet: m.pet, seen: performance.now() });
  }
  updateOthers(dt) {
    const now = performance.now();
    for (const [id, o] of this.others) {
      if (now - o.seen > 12000) { this.others.delete(id); continue; }
      o.x = lerp(o.x, o.tx, Math.min(1, dt * 10)); o.y = lerp(o.y, o.ty, Math.min(1, dt * 10));
      if (o.mv) o.walk += dt;
    }
  }
  chat(text) {
    if (!text.trim()) return;
    // "/c mensagem" fala só com o clã
    const paraCla = /^\/c\s+/i.test(text), cla = paraCla && this.social.clan;
    if (paraCla && !cla) { this.ui.toast('Você ainda não tem clã. Abra o menu ☰ → 👥 Social.'); return; }
    if (cla) text = text.replace(/^\/c\s+/i, '');
    const msg = { name: this.char.name, text: text.slice(0, 120), ...(cla ? { cla: cla.id } : {}) };
    this.ui.chatAdd((cla ? '[' + cla.tag + '] ' : '') + msg.name, msg.text, true, !!cla); this.net?.chat(msg);
    if (!cla) this.addText(this.p.x, this.p.y - 50, text.slice(0, 40), '#FFFFFF', 12, 3);
  }
  onNetChat(m) {
    if (m.cla && m.cla !== this.social.clan?.id) return;
    this.ui.chatAdd((m.cla ? '[' + this.social.clan.tag + '] ' : '') + m.name, m.text, false, !!m.cla);
  }
  // Carrega o clã e os amigos (sigla em cima da cabeça, amigos com nome verde)
  async refreshSocial() {
    try {
      const [mc, fr] = await Promise.all([net.social.myClan(this.char), net.social.friends(this.char)]);
      this.social.clan = mc ? { id: mc.clan.id, tag: mc.clan.tag, name: mc.clan.name } : null;
      this.social.friends = new Set(fr.filter(f => f.st === 'amigo').map(f => f.id));
      this.social.pedidos = fr.filter(f => f.st === 'recebido').length;
    } catch (e) { console.warn('social', e); }
  }

  save() {
    const c = this.char, p = this.p;
    c.data.hp = Math.round(p.hp); c.data.fe = Math.round(p.fe);
    if (this.scene === 'world') c.data.pos = { x: Math.round(p.x), y: Math.round(p.y) };
    c.week_id = c.week_id || weekId();
    return net.saveChar(c);
  }

  updateHud(dt) {
    const p = this.p, c = this.char;
    this.ui.hud({ hp: p.hp, maxHp: this.st.maxHp, fe: p.fe, maxFe: this.st.maxFe, sta: p.sta, xp: c.data.xp, xpNeed: xpNeed(c.level), level: c.level, gold: c.data.gold, score: c.score, skillCd: Math.max(0, p.skillCd) / CLASSES[c.cls].skill.cd, skillOk: p.fe >= CLASSES[c.cls].skill.custo, escudo: !!c.data.eq.escudo, lock: !!this.lock, botija: this.botija(), atalhos: this.atalhos().map(id => id && ITEMS[id] ? { icon: ITEMS[id].icon, nome: ITEMS[id].nome, n: count(c, id) } : null) });
    this.mmT -= dt;
    if (this.mmT <= 0) {
      this.mmT = 0.25;
      this.guide = this.questTarget();
      const qid = this.scene === 'world' ? this.trackedQuest() : null;
      this.ui.guide(this.guide && { label: this.guide.label, dist: Math.round(Math.hypot(this.guide.x - p.x, this.guide.y - p.y) / TS), waypoint: this.guide.waypoint },
        qid && { id: qid, ...QUESTS[qid], ...c.data.quests[qid], giver: WORLD_NPCS.find(n => n.missao === qid)?.nome });
      this.ui.minimapDraw(this);
    }
  }

  /* ================= Guia da missão ================= */
  trackedQuest() {
    const q = this.char.data.quests, t = this.char.data.track;
    if (t && q[t] && q[t].st !== 'feita') return t;
    const ids = Object.keys(q).filter(id => q[id].st !== 'feita');
    return ids.find(id => q[id].st === 'pronta') || ids[0] || null;
  }

  // Para onde a seta aponta: objetivo da fase, missão acompanhada, próximo portão ou alguém com missão nova.
  questTarget() {
    const c = this.char, p = this.p;
    const nearest = (list, f = o => o) => { let best = null, bd = Infinity; for (const o of list) { const pt = f(o); const d = Math.hypot(pt.x - p.x, pt.y - p.y); if (d < bd) { bd = d; best = pt; } } return best; };
    const npcPos = id => { const n = this.npcs.find(x => x.id === id); return n && { x: n.x, y: n.y }; };
    if (this.scene === 'salao' && !this.trackedQuest()) {
      const prog = faseProg(c, SEMANA_ATUAL.id), next = SEMANA_ATUAL.fases.find(f => !prog[f.n]?.done && (f.n === 1 || prog[f.n - 1]?.done) && c.level >= f.nivel);
      return next ? this.dungeonTarget(SEMANA_ATUAL, next.n, 'Fase ' + next.n + ': ' + next.nome) : null;
    }
    if (this.scene === 'fase') {
      const f = this.fase; if (!f || f.done) return null;
      if (f.keys < 3) { const ch = nearest(this.chests.filter(x => !x.open)); return ch && { ...ch, label: 'Baú com quiz (' + f.keys + '/3 chaves)' }; }
      if (!f.bossSpawned) { const d = f.built.door; const x = d.reduce((s, t) => s + t.tx, 0) / d.length * TS + 16, y = d[0].ty * TS; return { x, y, label: 'Porta do chefe' }; }
      const b = this.enemies.find(e => e.kind === 'boss' && !e.clone);
      return b && { x: b.x, y: b.y, label: 'Derrote ' + b.d.nome };
    }
    const wp = c.data.waypoint;
    if (wp) {
      if (Math.hypot(wp.x - p.x, wp.y - p.y) < 80) { delete c.data.waypoint; this.ui.toast('Você chegou: ' + wp.label); sfx('key'); }
      else return { x: wp.x, y: wp.y, label: '📍 ' + wp.label, waypoint: true };
    }
    if (this.sheep?.found) { const d = npcPos('davi'); return d && { ...d, label: 'Leve a ovelha ao Davi' }; }
    if (this.sheep) return null; // a ovelha é achada no "quente ou frio"
    const id = this.trackedQuest();
    if (id) {
      const qd = QUESTS[id], qs = c.data.quests[id];
      const giver = WORLD_NPCS.find(n => n.missao === id);
      if (qs.st === 'pronta') { const d = npcPos(giver.id); return d && { ...d, label: 'Entregar: ' + qd.titulo + ' (' + giver.nome + ')' }; }
      const prog = ' (' + qs.n + '/' + qd.qtd + ')';
      if (qd.tipo === 'kill') {
        const alive = this.enemies.filter(e => e.kind === 'enemy' && (qd.alvo === '*' || e.type === qd.alvo));
        const pt = nearest(alive) || nearest(this.spawns.filter(s => qd.alvo === '*' || s.type === qd.alvo), s => ({ x: s.tx * TS + 16, y: s.ty * TS + 16 }));
        const nome = qd.alvo === '*' ? 'inimigos' : ENEMIES[qd.alvo].nome;
        return pt && { x: pt.x, y: pt.y, label: 'Derrote ' + nome + prog };
      }
      if (qd.tipo === 'boss') { const wb = this.worldBosses.find(w => w.id === qd.alvo); const b = this.enemies.find(e => e.id === qd.alvo); const pt = b || wb.home; return { x: pt.x, y: pt.y, label: 'Derrote ' + BOSSES[qd.alvo].nome }; }
      if (qd.tipo === 'fase') return this.dungeonTarget(SEMANA_ATUAL, qd.alvo, 'Complete a Fase ' + qd.alvo);
      if (qd.tipo === 'pesca') { const d = npcPos('pedro'); return d && { ...d, label: 'Pesque na beira do lago ou do mar' + prog }; }
      if (qd.tipo === 'ovelha') {
        if (this.fugidas?.some(o => o.st === 'seguindo')) { const d = npcPos('davi'); return d && { ...d, label: 'Leve as ovelhas ao Davi' + prog }; }
        const o = this.fugidas && nearest(this.fugidas); return o && { x: o.x, y: o.y, label: 'Ovelha fugida — alcance até ela cansar' + prog };
      }
    }
    // sem missão: próximo portão liberado, senão alguém com missão nova
    const prog = faseProg(c, SEMANA_ATUAL.id);
    const next = SEMANA_ATUAL.fases.find(f => !prog[f.n]?.done && (f.n === 1 || prog[f.n - 1]?.done) && c.level >= f.nivel);
    const giver = nearest(this.npcs.filter(n => n.missao && !c.data.quests[n.missao]));
    if (giver && (!next || Math.hypot(giver.x - p.x, giver.y - p.y) < 1400)) { const n = this.npcs.find(x => x.x === giver.x && x.y === giver.y); return { x: n.x, y: n.y, label: 'Nova missão: ' + n.nome }; }
    if (next) return this.dungeonTarget(SEMANA_ATUAL, next.n, 'Fase ' + next.n + ': ' + next.nome);
    return null;
  }
  // caminho até uma fase: portão do mundo → portal da semana no salão → portal da fase
  dungeonTarget(sem, n, label) {
    if (this.scene === 'world') return { x: GATE_XS[0] * TS + 16, y: (GATE_Y + 1) * TS, label: label + ' (Portão das Dungeons)' };
    if (this.scene !== 'salao') return null;
    const pt = this.hub.tipo === 'semana' && this.hub.sem === sem ? this.portais.find(x => x.key === n) : this.hub.tipo === 'salao' ? this.portais.find(x => x.sem === sem) : null;
    if (pt) return { x: pt.x, y: pt.y, label };
    return this.saida && { x: this.saida.x, y: this.saida.y, label: label + ' (volte ao Salão)' };
  }

  // Pontos de interesse para o mapa completo
  pois() {
    const c = this.char, out = [];
    const MJ = { ovelha: 'A Ovelha Perdida (Lc 15)', pesca: 'Pesca Maravilhosa (Jo 21)', mana: 'Colheita do Maná (Êx 16)', arca: 'Pares da Arca (Gn 7)' };
    if (this.scene === 'fase') {
      const f = this.fase;
      for (const ch of this.chests) out.push({ x: ch.x, y: ch.y, icon: ch.open ? '✅' : '🎁', nome: ch.open ? 'Baú aberto' : 'Baú com quiz', tipo: 'Baús', desc: ch.open ? 'Você já ganhou esta chave.' : 'Responda o quiz para ganhar uma chave.' });
      if (f.built.door.length) { const d = f.built.door; out.push({ x: d.reduce((s, t) => s + t.tx, 0) / d.length * TS + 16, y: d[0].ty * TS, icon: f.keys >= 3 ? '🚪' : '🔒', nome: 'Porta do chefe', tipo: 'Objetivo', desc: f.keys >= 3 ? 'Aberta! O chefe espera lá dentro.' : 'Precisa de 3 chaves (' + f.keys + '/3).' }); }
      for (const h of f.built.heal) out.push({ x: h.x, y: h.y, icon: '💧', nome: 'Fonte de cura', tipo: 'Cura', desc: 'Recupera vida e Fé (a cada 45 s).' });
      if (f.built.boss) out.push({ x: f.built.boss.x, y: f.built.boss.y, icon: '💀', nome: BOSSES[f.def.chefe].nome, tipo: 'Objetivo', desc: 'Chefe da fase. ' + BOSSES[f.def.chefe].ref });
      for (const n of this.npcs) out.push({ x: n.x, y: n.y, icon: '💬', nome: n.nome, tipo: 'Personagens', desc: n.falas[0] });
      return out;
    }
    if (this.scene === 'salao') {
      for (const pt of this.portais) out.push({ x: pt.x, y: pt.y, icon: pt.state === 'feito' ? '✅' : pt.state === 'fechado' ? '🔒' : '⛩️', nome: pt.tag + ': ' + pt.label, tipo: 'Portais', desc: pt.fase ? pt.fase.ref + ' · nível ' + pt.fase.nivel + ' · chefe: ' + BOSSES[pt.fase.chefe].nome : pt.sem.estudo + ' — ' + pt.sem.resumo });
      for (const n of this.npcs) out.push({ x: n.x, y: n.y, icon: '💬', nome: n.nome, tipo: 'Personagens', desc: n.falas[0] });
      if (this.saida) out.push({ x: this.saida.x, y: this.saida.y, icon: '🚪', nome: 'Saída', tipo: 'Portais', desc: this.hub.tipo === 'semana' ? 'Volta ao Salão das Dungeons.' : 'Volta ao mundo.' });
      return out;
    }
    for (const n of WORLD_NPCS) {
      const qs = n.missao && c.data.quests[n.missao];
      const icon = n.loja ? '🛒' : n.minijogo ? '🎮' : n.ranking ? '🏆' : n.missao ? (qs?.st === 'pronta' ? '🎁' : !qs ? '❗' : '📜') : '💬';
      const tipo = n.loja ? 'Lojas' : n.minijogo ? 'Minijogos' : n.missao ? 'Missões' : 'Personagens';
      let desc = n.falas[0];
      if (n.minijogo) desc = 'Minijogo: ' + MJ[n.minijogo] + '. ' + desc;
      if (n.missao) { const q = QUESTS[n.missao]; desc = 'Missão "' + q.titulo + '": ' + q.desc + (qs ? ' — ' + (qs.st === 'feita' ? 'concluída' : qs.st === 'pronta' ? 'pronta para entregar!' : qs.n + '/' + q.qtd) : ' — disponível'); }
      if (n.loja) desc = 'Loja: ' + (n.loja === 'ferreiro' ? 'armas e armaduras.' : 'comida, maná, buffs e pergaminhos.');
      out.push({ x: n.tx * TS + 16, y: n.ty * TS + 16, icon, nome: n.nome, tipo, desc });
    }
    out.push({ x: GATE_XS[0] * TS + 16, y: (GATE_Y + 1) * TS, icon: '⛩️', nome: 'Portão das Dungeons', tipo: 'Portões', desc: 'Leva ao Salão das Dungeons: lá ficam as salas das semanas de estudo (a nova e as passadas), cada uma com 5 fases e um guia.' });
    out.push({ x: 90 * TS + 16, y: 77 * TS, icon: '💧', nome: 'Fonte de Betesda', tipo: 'Cura', desc: 'Recupera toda a vida e a Fé (Jo 5). Na cidade a vida também volta sozinha.' });
    for (const a of this.altares || []) { const on = this.acesas().includes(a.id); out.push({ x: a.x, y: a.y, icon: on ? '🔥' : '🪨', nome: 'Ebenézer · ' + a.nome, tipo: 'Pedras de Ebenézer', desc: on ? 'Acesa. Descanse para curar, encher a botija e viajar entre as pedras acesas.' : 'Apagada. Chegue perto e acenda para poder voltar aqui e viajar.' }); }
    const sac = this.char.data.sacola; if (sac) out.push({ x: sac.x, y: sac.y, icon: '💰', nome: 'Sua sacola (' + sac.v + ' denários)', tipo: 'Importante', desc: 'Os denários que ficaram quando você caiu. Busque antes de cair de novo!' });
    for (const wb of this.worldBosses) { const d = BOSSES[wb.id]; out.push({ x: wb.home.x, y: wb.home.y, icon: '💀', nome: d.nome + ' (nv ' + d.lv + ')', tipo: 'Chefes', desc: d.titulo + '. ' + d.ref + (wb.alive ? '' : ' · volta em breve') + '. Prêmio raro: ' + ITEMS[d.drop].nome + '.' }); }
    return out;
  }

  drawGuide(g) {
    const t = this.guide; if (!t || this.p.dead) return;
    const Z = this.Z, sx = (t.x - this.camL) * Z, sy = (t.y - this.camT) * Z, W = this.W, H = this.H, T0 = this.T;
    const m = 46;
    g.save();
    if (sx > m && sx < W - m && sy > m + 30 && sy < H - m) {
      // alvo visível: marcador pulando em cima
      const y = sy - 58 * Z + Math.sin(T0 * 5) * 5;
      g.fillStyle = '#FFD23F'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(sx, y + 12); g.lineTo(sx - 10, y - 4); g.lineTo(sx + 10, y - 4); g.closePath(); g.stroke(); g.fill();
    } else {
      // seta na borda da tela apontando para o alvo
      const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx);
      const k = Math.min(Math.abs((W / 2 - m) / Math.cos(a)), Math.abs((H / 2 - m) / Math.sin(a)));
      const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k;
      g.translate(ax, ay);
      g.fillStyle = 'rgba(10,6,20,.7)'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
      g.strokeStyle = '#FFD23F'; g.lineWidth = 2; g.stroke();
      g.rotate(a); g.translate(Math.sin(T0 * 6) * 2, 0);
      g.fillStyle = '#FFD23F'; g.beginPath(); g.moveTo(15, 0); g.lineTo(-7, -10); g.lineTo(-2, 0); g.lineTo(-7, 10); g.closePath(); g.fill();
    }
    g.restore();
  }

  /* ================= Render ================= */
  render() {
    const g = this.ctx, p = this.p, m = this.cur.map, Z = this.Z;
    const vw = this.W / Z, vh = this.H / Z;
    let camL = p.x - vw / 2, camT = p.y - 10 - vh / 2;
    if (!config.camCentro) {
      camL = clamp(camL, 0, Math.max(0, m.w * TS - vw)); camT = clamp(camT, 0, Math.max(0, m.h * TS - vh));
      if (m.w * TS < vw) camL = (m.w * TS - vw) / 2;
      if (m.h * TS < vh) camT = (m.h * TS - vh) / 2;
    }
    if (this.shakeA > 0) { camL += rand(-1, 1) * this.shakeA * 0.5; camT += rand(-1, 1) * this.shakeA * 0.5; }
    this.camL = camL; this.camT = camT;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.scene !== 'world' ? m.pal.bg : '#2C78AE'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    const k = this.DPR * Z;
    g.setTransform(k, 0, 0, k, -camL * k, -camT * k);
    g.imageSmoothingEnabled = true;
    m.draw(g, camL, camT, vw, vh);
    const T0 = this.T;
    // portões animados
    if (this.scene === 'world') {
      const gx = GATE_XS[0];
      drawPortal(g, gx * TS + 16, 34 * TS + 4, T0, 'aberto');
      g.fillStyle = '#FFF6E3'; g.font = '900 14px Cinzel, serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)';
      g.strokeText('DUNGEONS', gx * TS + 16, 32 * TS + 18); g.fillText('DUNGEONS', gx * TS + 16, 32 * TS + 18);
      // brilho da fonte
      g.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.2 * Math.sin(T0 * 3)) + ')';
      for (let i = 0; i < 3; i++) { ell(g, 90 * TS + 16 + Math.sin(T0 * 2 + i * 2) * 20, 75 * TS + 22 + Math.cos(T0 * 1.7 + i) * 10, 3, 1.5); g.fill(); }
    } else if (this.scene === 'salao') {
      for (const pt of this.portais) {
        drawPortal(g, pt.x, pt.y - 6, T0 + pt.key, pt.state);
        g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.7)';
        g.font = '900 11px Nunito, sans-serif'; g.fillStyle = pt.tag === 'NOVA' ? '#FFD23F' : '#FFF6E3';
        g.strokeText(pt.tag, pt.x, pt.y - 62); g.fillText(pt.tag, pt.x, pt.y - 62);
        g.font = '800 10px Nunito, sans-serif'; g.fillStyle = '#E6DBFF'; g.strokeText(pt.label, pt.x, pt.y + 50); g.fillText(pt.label, pt.x, pt.y + 50);
        if (pt.state === 'fechado') { g.font = '16px sans-serif'; g.fillText('🔒', pt.x, pt.y); }
      }
      if (this.saida) { g.fillStyle = 'rgba(242,193,78,' + (0.25 + 0.15 * Math.sin(T0 * 3)) + ')'; ell(g, this.saida.x, this.saida.y, 18, 8); g.fill(); }
    } else if (this.fase) {
      for (const h of this.fase.built.heal) { g.fillStyle = 'rgba(160,230,255,' + (0.3 + 0.2 * Math.sin(T0 * 3)) + ')'; ell(g, h.x, h.y - 2, 10, 5); g.fill(); }
      if (this.fase.keys < 3) for (const d of this.fase.built.door) {
        const x = d.tx * TS, y = d.ty * TS;
        g.fillStyle = '#5A3820'; g.fillRect(x, y - 8, TS, TS + 8); g.fillStyle = '#7A4F2E'; g.fillRect(x + 3, y - 5, TS - 6, TS + 2);
        g.fillStyle = '#E9B949'; ell(g, x + (d.tx % 2 ? 6 : TS - 6), y + 12, 2.5, 2.5); g.fill();
      }
    }
    // telegrafias e áreas no chão
    for (const t of this.tele) this.drawTele(g, t);
    for (const h of this.hazards) {
      if (h.delay > 0) continue;
      if (h.ring) { g.strokeStyle = 'rgba(' + h.color + ',.8)'; g.lineWidth = 10; ell(g, h.x, h.y, h.r, h.r * 0.75); g.stroke(); }
      else { const gr = g.createRadialGradient(h.x, h.y, 2, h.x, h.y, h.r); gr.addColorStop(0, 'rgba(' + h.color + ',.55)'); gr.addColorStop(1, 'rgba(' + h.color + ',.15)'); g.fillStyle = gr; ell(g, h.x, h.y, h.r, h.r * 0.8); g.fill(); }
    }
    for (const b of this.enemies) if (b.beams) for (const bm of b.beams) {
      g.save(); g.translate(b.x, b.y); g.rotate(bm.a);
      g.fillStyle = bm.warm ? 'rgba(160,210,230,.25)' : 'rgba(200,240,255,.75)'; g.fillRect(b.r * 0.5, -7, 240, 14); g.restore();
    }
    // pickups
    for (const k of this.pickups) {
      const y = k.y - 4 - Math.abs(Math.sin(k.t * 6)) * 4;
      if (k.kind === 'ouro') { g.fillStyle = '#B8791A'; ell(g, k.x, y, 5.5, 5.5); g.fill(); g.fillStyle = '#FFD23F'; ell(g, k.x - 0.5, y - 0.5, 4, 4); g.fill(); }
      else if (k.kind === 'cura') { g.fillStyle = '#FF5A5F'; g.font = '14px sans-serif'; g.textAlign = 'center'; g.fillText('❤', k.x, y + 4); }
      else { g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText(ITEMS[k.id].icon, k.x, y + 5); }
    }
    // entidades ordenadas por Y
    const list = [];
    for (const n of this.npcs) list.push({ y: n.y, d: () => this.drawNpc(g, n) });
    if (this.scene === 'world') {
      for (const a of this.altares) list.push({ y: a.y, d: () => this.drawAltar(g, a, T0) });
      if (this.char.data.sacola) list.push({ y: this.char.data.sacola.y, d: () => this.drawSacola(g, T0) });
    }
    for (const c of this.chests) list.push({ y: c.y, d: () => drawChest(g, c, T0) });
    for (const e of this.enemies) list.push({ y: e.y, d: () => this.drawEnt(g, e) });
    for (const o of this.others.values()) if (this.scene === 'world') list.push({ y: o.y, d: () => this.drawOther(g, o) });
    if (this.sheep) list.push({ y: this.sheep.y, d: () => drawSheep(g, this.sheep.x, this.sheep.y, T0, !this.sheep.found) });
    if (this.fugidas && this.scene === 'world') for (const o of this.fugidas) list.push({ y: o.y, d: () => { drawSheep(g, o.x, o.y, o.moving ? T0 * 4 : T0, false, o.fx < 0); if (o.cansada > 0) { g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText('💦', o.x + 12, o.y - 14); } } });
    if (this.scene === 'world') {
      const dv = this.npcs.find(n => n.id === 'davi');
      if (dv) for (let i = 0; i < 9; i++) { const sx = dv.x + 40 + Math.cos(i * 2.1) * 70 + Math.sin(T0 * 0.3 + i) * 10, sy = dv.y + Math.sin(i * 1.7) * 50; list.push({ y: sy, d: () => drawSheep(g, sx, sy, T0 + i, false) }); }
    }
    if (this.pecado) list.push({ y: this.pecado.y, d: () => drawBoss(g, { id: 'pecado', x: this.pecado.x, y: this.pecado.y, r: 22, alpha: Math.min(1, this.pecado.t * 0.5), flash: 0 }, T0) });
    if (this.pet && !p.mounted && !p.dead) { const a = this.pet; list.push({ y: a.y, d: () => drawAnimal(g, a.kind, a.x, a.y, { t: T0, fx: a.fx, moving: a.moving, walk: a.walk }) }); }
    if (!p.dead) list.push({ y: p.y, d: () => this.drawPlayer(g) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.d();
    // projéteis e partículas
    for (const q of this.projs) drawProjectile(g, q, T0);
    for (const q of this.parts) {
      const a = Math.max(0, q.life / q.max);
      if (q.txt) { g.globalAlpha = a; g.fillStyle = q.color; g.font = '900 ' + q.size + 'px Nunito'; g.textAlign = 'center'; g.fillText(q.txt, q.x, q.y); g.globalAlpha = 1; continue; }
      g.globalAlpha = a; g.fillStyle = q.color; g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    g.globalAlpha = 1;
    // alvo travado: colchetes dourados girando em volta
    if (this.lock) {
      const e = this.lock, R = e.r + 12 + Math.sin(T0 * 6) * 2;
      g.save(); g.translate(e.x, e.y); g.rotate(T0 * 1.5); g.strokeStyle = '#FFD23F'; g.lineWidth = 3; g.shadowColor = '#FFD23F'; g.shadowBlur = 8;
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.arc(0, 0, R, -0.35, 0.35); g.stroke(); }
      g.restore();
    }
    // bebendo da Botija da Viúva: a botija sobe e a barra enche
    if (this.p.drink > 0 && !this.p.dead) {
      const p = this.p, k2 = 1 - p.drink / 0.9, bx = p.x + 10, by = p.y - 40 - k2 * 6;
      g.lineWidth = 1.4; g.strokeStyle = '#2A1A10'; rr(g, bx - 5, by - 7, 10, 12, 4); g.fillStyle = '#C9A060'; g.fill(); g.stroke();
      g.fillStyle = '#6FC3E8'; g.fillRect(bx - 3, by - 2, 6, 5); g.fillStyle = '#8A5A35'; g.fillRect(bx - 2.5, by - 10, 5, 3);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(p.x - 15, p.y + 16, 30, 4); g.fillStyle = '#9FE6F0'; g.fillRect(p.x - 15, p.y + 16, 30 * k2, 4);
    }
    // golpe carregando: anel que enche em volta do jogador
    if (this.p.charging && !this.p.dead) {
      const p = this.p, k2 = Math.min(1, (p.holdT - CARGA.inicio) / (CARGA.cheia - CARGA.inicio)), cheio = k2 >= 1;
      g.strokeStyle = cheio ? 'rgba(255,227,138,' + (0.7 + 0.3 * Math.sin(T0 * 20)) + ')' : 'rgba(255,227,138,.75)'; g.lineWidth = cheio ? 4 : 3;
      g.beginPath(); g.arc(p.x, p.y - 4, 26, -Math.PI / 2, -Math.PI / 2 + TAU * k2); g.stroke();
    }
    // marcador de interação
    if (this.interactTarget) {
      const o = this.interactTarget.o;
      g.fillStyle = '#FFE38A'; g.font = '900 13px Nunito'; g.textAlign = 'center';
      g.fillText(input.touch ? '▼' : '[E]', o.x, o.y - 46 + Math.sin(T0 * 5) * 3);
    }
    // luz da noite
    if (this.scene === 'world') this.drawNight(g, camL, camT);
    g.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.drawGuide(g);
    g.setTransform(k, 0, 0, k, -camL * k, -camT * k);
    // textos flutuantes por cima de tudo
    g.textAlign = 'center';
    for (const t of this.texts) {
      g.globalAlpha = Math.min(1, t.life / t.max * 2);
      g.font = '900 ' + t.size + 'px Nunito, sans-serif'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,.7)';
      const lines = wrap(g, t.txt, 220);
      lines.forEach((ln, i) => { g.strokeText(ln, t.x, t.y + i * (t.size + 3)); g.fillStyle = t.color; g.fillText(ln, t.x, t.y + i * (t.size + 3)); });
    }
    g.globalAlpha = 1;
  }

  drawTele(g, t) {
    const pr = 1 - t.t / t.max;
    g.save();
    if (t.kind === 'circle') {
      g.fillStyle = 'rgba(' + t.color + ',' + (t.friendly ? 0.12 : 0.16) + ')'; ell(g, t.x, t.y, t.r, t.r * 0.8); g.fill();
      g.fillStyle = 'rgba(' + t.color + ',.35)'; ell(g, t.x, t.y, t.r * pr, t.r * 0.8 * pr); g.fill();
      g.strokeStyle = 'rgba(' + t.color + ',.85)'; g.lineWidth = 2; ell(g, t.x, t.y, t.r, t.r * 0.8); g.stroke();
    } else if (t.kind === 'ring') {
      g.strokeStyle = 'rgba(' + t.color + ',' + (0.3 + 0.5 * pr) + ')'; g.lineWidth = 4; ell(g, t.x, t.y, t.r * (1 - pr * 0.6), t.r * 0.8 * (1 - pr * 0.6)); g.stroke();
    } else if (t.kind === 'line') {
      g.translate(t.x, t.y); g.rotate(t.a);
      g.fillStyle = 'rgba(' + t.color + ',.15)'; g.fillRect(0, -t.w / 2, t.len, t.w);
      g.fillStyle = 'rgba(' + t.color + ',.35)'; g.fillRect(0, -t.w / 2, t.len * pr, t.w);
    }
    g.restore();
  }

  drawNight(g, camL, camT) {
    const dark = this.darkness();
    if (dark <= 0.01) return;
    const lc = this.light, lg = lc.getContext('2d'), s = 0.5 * this.Z;
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, lc.width, lc.height);
    lg.fillStyle = 'rgba(14,12,46,' + dark + ')'; lg.fillRect(0, 0, lc.width, lc.height);
    lg.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      const sx = (x - camL) * s, sy = (y - camT) * s, sr = r * s;
      if (sx < -sr || sy < -sr || sx > lc.width + sr || sy > lc.height + sr) return;
      const gr = lg.createRadialGradient(sx, sy, 0, sx, sy, sr); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    };
    hole(this.p.x, this.p.y, 190, 0.9);
    for (const L of this.cur.lights) hole(L.x, L.y, L.r * (L.gate ? 1 + 0.08 * Math.sin(this.T * 3) : 1), 0.85);
    for (const o of this.others.values()) hole(o.x, o.y, 120, 0.6);
    for (const q of this.projs) if (q.kind === 'luz' || q.kind === 'palavra') hole(q.x, q.y, 60, 0.7);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(lc, 0, 0, this.cv.width, this.cv.height);
  }

  equipLook(eq) {
    const it = id => id && ITEMS[id];
    const body = it(eq.corpo), head = it(eq.cabeca), belt = it(eq.cinto), feet = it(eq.pes), sh = it(eq.escudo);
    const colorOf = x => !x ? null : x.raridade === 'lendario' ? '#F2C14E' : x.raridade === 'epico' ? '#B98AF0' : x.raridade === 'raro' ? '#8FA3B8' : '#A88A5E';
    return { armor: body && body.def >= 6 ? colorOf(body) : null, helmet: head && head.def >= 4 ? colorOf(head) : null, belt: belt ? colorOf(belt) : null, boots: feet ? shade(colorOf(feet), -0.3) : null, shieldColor: sh ? colorOf(sh) : '#8A5A35' };
  }

  drawPlayer(g) {
    const p = this.p, c = this.char, st = this.st, w = st.weapon, T0 = this.T;
    if (p.inv > 0 && Math.floor(T0 * 18) % 2) g.globalAlpha = 0.5;
    if (p.dodgeT > 0) g.globalAlpha = 0.65;
    const legend = st.palavra;
    // aura da Armadura de Deus completa
    if (st.armaduraCompleta) { g.strokeStyle = 'rgba(255,220,120,' + (0.3 + 0.2 * Math.sin(T0 * 3)) + ')'; g.lineWidth = 2; ell(g, p.x, p.y + 10, 20, 7); g.stroke(); }
    if (p.charm) { g.strokeStyle = 'rgba(255,120,170,.8)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.charm.src.x, p.charm.src.y); g.stroke(); g.setLineDash([]); }
    const look = this.equipLook(c.data.eq);
    const behind = p.fy < -0.3;
    const drawW = () => {
      if (p.spin > 0 && w === 'espada') { g.save(); g.translate(p.x, p.y - 6); g.rotate(T0 * 26); drawWeapon(g, 'espada', 44, 16, legend); g.restore(); g.strokeStyle = 'rgba(255,230,150,.5)'; g.lineWidth = 14; ell(g, p.x, p.y - 4, 60, 48); g.stroke(); return; }
      if (p.atkT > 0 && w === 'espada') {
        const pr = 1 - p.atkT / 0.22, dir = p.combo === 2 ? -1 : 1, a0 = p.swingA - 1.3 * dir, ang = a0 + 2.6 * dir * (1 - Math.pow(1 - pr, 3));
        g.save(); g.translate(p.x, p.y - 6); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        g.strokeStyle = 'rgba(255,205,90,' + (0.55 * (1 - pr) + 0.15) + ')'; g.lineWidth = p.combo === 3 ? 22 : 15;
        g.beginPath(); g.arc(0, 0, p.combo === 3 ? 40 : 32, Math.min(a0, ang), Math.max(a0, ang)); g.stroke();
        g.globalCompositeOperation = 'source-over'; g.rotate(ang); drawWeapon(g, 'espada', p.combo === 3 ? 50 : 42, 14, legend); g.restore();
        return;
      }
      const a = p.atkT > 0 ? p.swingA : Math.atan2(p.fy, p.fx) + (p.fx < 0 ? -0.9 : 0.9) * (w === 'espada' ? 1 : 0.4);
      g.save(); g.translate(p.x + p.fx * 8, p.y - 4); g.rotate(p.atkT > 0 ? a : (w === 'espada' ? (p.fx < -0.3 ? -Math.PI + 0.9 : -0.9) : a));
      if (w === 'lanca' && p.atkT > 0) g.translate(16 * (p.atkT / 0.2), 0); // estocada
      drawWeapon(g, w, { cajado: 30, lanca: 40, adaga: 15, chicote: 16 }[w] ?? 26, p.atkT > 0 ? 10 : 0, legend); g.restore();
    };
    const ride = p.mounted && this.pet;
    if (ride) { drawAnimal(g, this.pet.kind, p.x, p.y, { t: T0, fx: p.fx, moving: p.moving, walk: p.walk }); g.save(); g.translate(0, -(RIDE_H[this.pet.kind] || 12)); }
    if (behind) drawW();
    drawPerson(g, p.x, p.y, 1, c.look, { t: T0, fx: p.fx, fy: p.fy, walk: ride ? 0 : p.walk, moving: ride ? false : p.moving, guard: p.guard, guardPerfect: p.guard && p.guardT < PERFEITA, ...look });
    if (!behind) drawW();
    if (ride) g.restore();
    g.globalAlpha = 1;
    this.nameTag(g, p.x, p.y - 40 - (ride ? RIDE_H[this.pet.kind] || 12 : 0), c.name, c.level, '#FFE38A', this.social.clan?.tag);
  }

  drawOther(g, o) {
    const ride = o.pet?.m;
    if (o.pet && !ride) drawAnimal(g, o.pet.k, o.x - (o.fx || 1) * 26, o.y + 2, { t: this.T, fx: o.fx || 1, moving: !!o.mv, walk: o.walk });
    if (ride) { drawAnimal(g, o.pet.k, o.x, o.y, { t: this.T, fx: o.fx, moving: !!o.mv, walk: o.walk }); g.save(); g.translate(0, -(RIDE_H[o.pet.k] || 12)); }
    drawPerson(g, o.x, o.y, 1, o.look || {}, { t: this.T, fx: o.fx, fy: o.fy, walk: o.walk, moving: !!o.mv, ...this.equipLook(o.eq || {}) });
    const kind = CLASSES[o.cls]?.arma || 'espada';
    g.save(); g.translate(o.x + (o.fx || 0) * 8, o.y - 4); g.rotate(Math.atan2(o.fy || 1, o.fx || 0) + (o.atk ? 0 : 0.8)); drawWeapon(g, kind, 26, 0); g.restore();
    if (ride) g.restore();
    // amigos em verde, colegas de clã em dourado
    const mesmoCla = o.cla && o.cla === this.social.clan?.tag;
    this.nameTag(g, o.x, o.y - 40, o.name, o.lvl, this.social.friends.has(o.id) ? '#7CE0A0' : mesmoCla ? '#FFD23F' : '#9FD8FF', o.cla);
  }

  nameTag(g, x, y, name, lvl, col, tag) {
    g.font = '800 11px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)';
    const s = (tag ? '[' + tag + '] ' : '') + name + (lvl ? ' · ' + lvl : '');
    g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
  }

  drawNpc(g, n) {
    const p = this.p, dx = p.x - n.x, dy = p.y - n.y, d = Math.hypot(dx, dy) || 1;
    const near = d < 150;
    drawPerson(g, n.x, n.y, 1, n.look, { t: this.T + n.x, fx: near ? dx / d : 0, fy: near ? dy / d : 1, walk: 0, moving: false });
    const hasQuest = n.missao && (!this.char.data.quests[n.missao] || this.char.data.quests[n.missao].st === 'pronta');
    const icon = hasQuest ? (this.char.data.quests[n.missao]?.st === 'pronta' ? '🎁' : '❗') : n.loja ? '🛒' : n.minijogo ? '🎮' : n.ranking ? '🏆' : null;
    this.nameTag(g, n.x, n.y - 40, n.nome, null, '#FFFFFF');
    if (icon) { g.font = '15px sans-serif'; g.textAlign = 'center'; g.fillText(icon, n.x, n.y - 54 + Math.sin(this.T * 3) * 2); }
  }

  drawEnt(g, e) {
    if (e.kind === 'boss') {
      if (e.clone) drawBoss(g, e, this.T); // cópias idênticas: só golpeando para saber qual é a verdadeira
      else drawBoss(g, e, this.T);
      if (e.stun > 0) { g.fillStyle = '#FFE38A'; g.font = '900 13px Nunito'; g.textAlign = 'center'; g.fillText('★ atordoado ★', e.x, e.y - e.r - 40); }
      if (e.world && !e.engaged) this.nameTag(g, e.x, e.y - e.r - 30, e.d.nome, 'nv ' + e.d.lv, '#FF8A8A');
      return;
    }
    drawEnemy(g, e, e.d, this.T, this.p.x, this.p.y);
    if (e.stun > 0) { g.fillStyle = '#FFE38A'; g.font = '900 10px Nunito'; g.textAlign = 'center'; g.fillText('★', e.x + Math.sin(this.T * 8) * 8, e.y - e.r - 26); }
    const yTop = e.y - e.r - (e.type === 'distracao' || e.type === 'desanimo' ? 30 : 18);
    g.font = '800 9px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.65)';
    const label = e.d.nome + ' ' + e.lv; g.strokeText(label, e.x, yTop); g.fillStyle = e.lv > this.char.level + 2 ? '#FF8A8A' : '#fff'; g.fillText(label, e.x, yTop);
    if (e.hp < e.max) { const w = 30; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(e.x - w / 2, e.y + e.r + 4, w, 4); g.fillStyle = '#FF5A5F'; g.fillRect(e.x - w / 2, e.y + e.r + 4, w * Math.max(0, e.hp / e.max), 4); }
    if (e.pos > 0) { const w = 30; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(e.x - w / 2, e.y + e.r + 9, w, 3); g.fillStyle = '#FFD23F'; g.fillRect(e.x - w / 2, e.y + e.r + 9, w * Math.min(1, e.pos / e.posMax), 3); }
  }
}

function wrap(g, text, max) {
  if (g.measureText(text).width <= max) return [text];
  const words = text.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}

instalarMundoNet(Game);
instalarDescanso(Game);
