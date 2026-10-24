// Mundo compartilhado: no mundo aberto, todos veem os MESMOS vícios e chefes.
// Um jogador é o "anfitrião" (quem está no mundo há mais tempo): só ele simula os inimigos e manda o estado
// para os outros (~7 vezes por segundo). Os outros desenham o que recebem e mandam seus golpes para o anfitrião,
// que aplica o dano. Quando o anfitrião sai, o próximo da fila assume os inimigos como estão.
// Dungeons (fases e salão) continuam individuais. Sem Supabase (offline), tudo é local, como antes.
// Mensagens (evento "ev" do canal): snap, golpe, parry, dano, morte, proj, tele, haz.
import { lerp, rand } from '../util.js';
import { aoDefender } from './bossMoves.js';

const SNAP_S = 0.15;      // intervalo entre os estados enviados pelo anfitrião
const VISTO_MS = 5000;    // jogador sem mandar posição por mais que isso não conta mais
const ALCANCE = 1100;     // só vão no estado os inimigos perto de algum jogador

export function instalarMundoNet(Game) { Object.assign(Game.prototype, metodos); }

const metodos = {
  netAtivo() { return !!this.net && this.scene === 'world'; },
  meuId() { return String(this.char.id); },

  // Anfitrião = quem entrou no mundo primeiro (empate: menor id). Recalcula uma vez por quadro.
  souHost() {
    if (!this.netAtivo()) return true;
    if (this._hostT === this.T) return this._host;
    const agora = performance.now(), w = this.worldSince, id = this.meuId();
    let host = true;
    for (const o of this.others.values()) {
      if (agora - o.seen > VISTO_MS || !o.w) continue;
      if (o.w < w || (o.w === w && String(o.id) < id)) { host = false; break; }
    }
    if (host && this._host === false) this.virouHost();
    this._hostT = this.T; this._host = host;
    return host;
  },

  // Assume a simulação: os pontos de surgimento e os chefes do mundo seguem o que já existe
  virouHost() {
    for (const s of this.spawns) { s.alive = this.enemies.some(e => e.nid === 's' + s.i); if (!s.alive) s.at = this.T + rand(4, 12); }
    for (const wb of this.worldBosses) {
      const b = this.enemies.find(e => e.nid === 'b:' + wb.id);
      wb.alive = !!b; if (b) b.world = wb; else wb.at = this.T + 20;
    }
    for (const e of this.enemies) { e.tx = e.ty = null; e.cd = rand(0.5, 1.5); }
  },

  // Jogadores próximos viram "alvos" para a IA do anfitrião (o dano neles vira mensagem)
  atualizaProxies() {
    const agora = performance.now(), vivos = new Set();
    for (const o of this.others.values()) {
      if (agora - o.seen > 4000 || o.x == null) continue;
      let px = this.proxies.get(o.id);
      if (!px) { px = { remote: true, id: o.id, r: 12, fx: 0, fy: 1, slow: 1, buffs: {}, dead: false }; this.proxies.set(o.id, px); }
      px.x = o.x; px.y = o.y; vivos.add(o.id);
    }
    for (const id of this.proxies.keys()) if (!vivos.has(id)) this.proxies.delete(id);
  },
  alvoDe(e) {
    let best = this.eu, bd = this.eu.dead ? Infinity : Math.hypot(this.eu.x - e.x, this.eu.y - e.y);
    if (this.netAtivo()) for (const px of this.proxies.values()) { const d = Math.hypot(px.x - e.x, px.y - e.y); if (d < bd) { bd = d; best = px; } }
    return best;
  },

  netEnviar(m) { this.net?.ev({ ...m, de: this.meuId() }); },
  porNid(id) { return id && this.enemies.find(e => e.nid === id); },

  // Chamado todo quadro no mundo
  netTick(dt) {
    if (!this.netAtivo()) return;
    this.atualizaProxies();
    if (!this.souHost() || !this.proxies.size) return;
    // áreas de ataque e poças criadas pelos chefes vão para os outros resolverem no próprio aparelho
    for (const t of this.tele) if (!t._net && !t.friendly) {
      t._net = 1;
      this.netEnviar({ t: 'tele', k: t.kind, x: Math.round(t.x), y: Math.round(t.y), r: t.r, a: t.a, len: t.len, w: t.w, d: t.t, c: t.color, dano: t.dano ? Math.round(t.dano) : undefined });
    }
    for (const h of this.hazards) if (!h._net) {
      h._net = 1;
      this.netEnviar({ t: 'haz', h: { x: Math.round(h.x), y: Math.round(h.y), r: h.r, t: h.t, dmg: Math.round(h.dmg), color: h.color, ring: h.ring, spd: h.spd, delay: h.delay } });
    }
    this._snapT = (this._snapT || 0) - dt;
    if (this._snapT > 0) return;
    this._snapT = SNAP_S;
    const players = [this.eu, ...this.proxies.values()], lista = [];
    for (const e of this.enemies) {
      if (!e.nid || e.clone) continue;
      if (!players.some(p => Math.hypot(p.x - e.x, p.y - e.y) < ALCANCE)) continue;
      const s = { i: e.nid, x: Math.round(e.x), y: Math.round(e.y), h: Math.max(0, Math.round(e.hp)), m: e.max };
      if (e.kind === 'boss') s.b = e.id; else { s.t = e.type; if (e.boost && e.boost !== 1) s.f = e.boost; }
      if (e.stun > 0) s.s = 1; if (e.telegraph > 0) s.g = 1; if (e.broken > 0) s.k = 1;
      if (e.pos > 0) { s.p = Math.round(e.pos); s.pm = e.posMax; }
      if (e.exposto > 0) s.ex = 1; if (e.submerged) s.sub = 1; if (e.alpha != null && e.alpha < 1) s.al = +e.alpha.toFixed(2);
      if (e.talk) s.tk = 1; if (e.lanca) { s.ln = e.lanca; s.la = +(e.lancaA || 0).toFixed(2); }
      if (e.engaged) s.en = 1; if (e.dash > 0) s.ds = 1;
      lista.push(s);
    }
    this.net.ev({ t: 'snap', de: this.meuId(), e: lista });
  },

  // Mensagens recebidas pelo canal
  onNetEv(m) {
    if (this.scene !== 'world' || String(m.de) === this.meuId()) return;
    const host = this.souHost();
    switch (m.t) {
      case 'snap': if (!host) this.aplicarSnapshot(m.e); break;
      case 'golpe': if (host) this.receberGolpe(m); break;
      case 'parry': {
        const e = host && this.porNid(m.id); if (!e) break;
        e.stun = e.kind === 'boss' ? 0.8 : 1.4;
        if (e.kind === 'boss') aoDefender(this, e);
        this.postura(e, e.kind === 'boss' ? 34 : 999);
        break;
      }
      case 'dano': if (!host && String(m.para) === this.meuId()) {
        const src = this.porNid(m.id) || { x: m.sx, y: m.sy };
        this.damagePlayer(m.d, src, { unblockable: !!m.ub, noKnock: !!m.nk });
      } break;
      case 'morte': if (!host) {
        const e = this.porNid(m.id); if (!e) break;
        this.enemies.splice(this.enemies.indexOf(e), 1);
        this.burst(e.x, e.y, 26, e.d.cor, 240);
        if (this.lock === e) this.lock = null;
        if ((m.por || []).map(String).includes(this.meuId())) this.recompensa(e);
        else if (this.boss === e) { this.boss = null; this.ui.bossBar(null); }
      } break;
      case 'proj': if (!host) { const o = m.o, src = this.porNid(o.sid) || { x: o.x, y: o.y }; this.proj({ ...o, owner: 'e', src }); } break;
      case 'tele': if (!host) this.teleRede(m); break;
      case 'haz': if (!host) this.hazards.push({ ...m.h, tick: 0, hit: false }); break;
    }
  },

  // Cliente: troca os inimigos locais pelos do anfitrião
  aplicarSnapshot(lista) {
    const vistos = new Set();
    for (const s of lista) {
      vistos.add(s.i);
      let e = this.porNid(s.i);
      if (!e) {
        if (s.b) {
          const wb = this.worldBosses.find(w => 'b:' + w.id === s.i);
          if (wb) { this.spawnWorldBoss(wb); e = this.enemies[this.enemies.length - 1]; }
          else { e = this.makeBoss(s.b, s.x, s.y); this.enemies.push(e); }
        } else { e = this.makeEnemy(s.t, s.x, s.y, s.f || 1); this.enemies.push(e); }
        e.nid = s.i; e.x = s.x; e.y = s.y;
      }
      e.tx = s.x; e.ty = s.y; e.hp = s.h; e.max = s.m;
      e.stun = s.s ? 0.25 : 0; e.telegraph = s.g ? 0.25 : 0; e.broken = s.k ? 0.25 : 0;
      e.pos = s.p || 0; if (s.pm) e.posMax = s.pm; e.exposto = s.ex ? 0.25 : 0;
      e.submerged = !!s.sub; e.inv = !!s.sub; e.alpha = s.al ?? 1; e.talk = !!s.tk;
      e.lanca = s.ln || null; if (s.la != null) e.lancaA = s.la; e.engaged = !!s.en; e.dash = s.ds ? 0.1 : 0;
    }
    for (const e of this.enemies.slice()) if (!vistos.has(e.nid)) { this.enemies.splice(this.enemies.indexOf(e), 1); if (this.lock === e) this.lock = null; }
  },

  // Cliente: só desenha (desliza até a posição recebida) e cuida da barra do chefe
  updateEnemiesCliente(dt) {
    let chefe = null;
    for (const e of this.enemies) {
      e.flash = Math.max(0, (e.flash || 0) - dt);
      if (e.tx != null) { e.x = lerp(e.x, e.tx, Math.min(1, dt * 10)); e.y = lerp(e.y, e.ty, Math.min(1, dt * 10)); }
      if (e.kind === 'boss' && e.engaged && Math.hypot(this.eu.x - e.x, this.eu.y - e.y) < 950) chefe = e;
    }
    if (chefe) {
      if (!chefe._intro) { chefe._intro = true; this.bossIntro(chefe); }
      this.boss = chefe; this.ui.bossBar(chefe.d.nome, chefe.hp / chefe.max, chefe.d.titulo, chefe.pos / chefe.posMax);
    } else if (this.boss) { this.boss = null; this.ui.bossBar(null); }
  },

  // Cliente: golpe num inimigo compartilhado (mostra na hora, o anfitrião aplica o dano)
  netGolpe(e, mult, a, knock, pos, som) {
    const { dmg, crit } = this.dmgCalc(mult, e);
    e.flash = 0.12;
    this.addText(e.x + rand(-8, 8), e.y - e.r - 10, (som ? som + ' ' : crit ? '✦' : '') + dmg, crit ? '#FFD23F' : '#FFFFFF', crit ? 17 : 13);
    this.burst(e.x, e.y, crit ? 10 : 5, crit ? '#FFD23F' : '#FFF6E3', 160);
    this.hitstop = Math.max(this.hitstop, crit || pos >= 40 ? 0.07 : 0.03); this.shake(crit ? 5 : 2);
    this.netEnviar({ t: 'golpe', id: e.nid, d: dmg, a: +a.toFixed(2), k: Math.round(knock), ps: Math.round(pos) });
  },
  // Anfitrião: aplica o golpe de outro jogador
  receberGolpe(m) {
    const e = this.porNid(m.id); if (!e || e.inv || e.hp <= 0) return;
    e.hp -= m.d; e.flash = 0.12; e.lastHit = this.T; e.aggro = true; if (e.kind === 'boss') e.engaged = true;
    const kb = e.kind === 'boss' ? m.k * 0.1 : m.k; e.kx += Math.cos(m.a) * kb; e.ky += Math.sin(m.a) * kb;
    (e.hitBy = e.hitBy || new Set()).add(String(m.de));
    if (e.hp <= 0) this.kill(e); else this.postura(e, m.ps);
  },
  // Anfitrião: um inimigo acertou outro jogador
  netDanoRemoto(px, amount, src, opts = {}) {
    this.netEnviar({ t: 'dano', para: px.id, d: Math.round(amount), sx: Math.round(src?.x ?? px.x), sy: Math.round(src?.y ?? px.y), id: src?.nid, ub: opts.unblockable ? 1 : undefined, nk: opts.noKnock ? 1 : undefined });
    return 'hit';
  },
  // Anfitrião: projétil de inimigo também aparece para os outros
  netProj(o) {
    this.netEnviar({ t: 'proj', o: { x: Math.round(o.x), y: Math.round(o.y), a: +o.a.toFixed(3), spd: o.spd, r: o.r, life: o.life, dmg: Math.round(o.dmg), color: o.color, label: o.label, reflect: o.reflect, kind: o.kind, sid: o.src?.nid } });
  },
  // Cliente: área de ataque do chefe; quando termina, confere se acertou o PRÓPRIO jogador
  teleRede(m) {
    const t = { kind: m.k, x: m.x, y: m.y, r: m.r, a: m.a, len: m.len, w: m.w, t: m.d, max: m.d, color: m.c };
    if (m.dano) t.onEnd = () => {
      const p = this.p, src = { x: m.x, y: m.y };
      const acertou = m.k === 'line' ? this.inLine(p, m.x, m.y, m.a, m.len, m.w) : Math.hypot(p.x - m.x, p.y - m.y) < m.r + p.r;
      this.shake(6);
      if (acertou) this.damagePlayer(m.dano, src);
    };
    this.tele.push(t);
  }
};
