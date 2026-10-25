// Grupo para as dungeons (até 4 peregrinos): "Melhor é serem dois do que um" (Ec 4:9).
// Convites e avisos andam pelo mesmo canal online do mundo (mensagens "g-…").
// Quando o líder entra numa fase, os outros são chamados para a MESMA fase (mesmo "run").
// Dentro dela, o sistema de anfitrião de mundoNet.js vale para a sala do grupo: vícios e chefe iguais para todos,
// chaves dos baús contam para o grupo e a vitória vale para todos. Quem cai levanta em 15 s (Tg 5:16).
import { uid } from '../util.js';
import { sfx } from '../audio.js';
import { net } from '../net.js';
import { SEMANAS } from '../content/index.js';

export const MAX_GRUPO = 4;
const VOLTA_S = 15;

export function instalarGrupo(Game) { Object.assign(Game.prototype, metodos); }

const metodos = {
  // sala onde o jogador está para o online: o mundo, a fase do grupo ou nenhuma (fase solo, salões, casa)
  salaAtual() {
    if (this.scene === 'world') return 'world';
    if (this.scene === 'fase' && this.fase?.run) return this.fase.run;
    return null;
  },
  grupoAtivo() { return !!this.grupo && this.grupo.membros.length > 1; },
  souLider() { return !!this.grupo && String(this.grupo.lider) === this.meuId(); },
  enviarGrupo(m) { this.net?.ev({ ...m, de: this.meuId() }); },

  // quem dá para chamar: amigos e gente do clã que estão online agora
  async candidatosGrupo() {
    if (!this.net) return [];
    const online = new Set((this.net.online?.() || []).map(String)), out = new Map();
    try { for (const f of await net.social.friends(this.char)) if (f.st === 'amigo') out.set(String(f.id), f.name); } catch { /* sem amigos */ }
    try { const cl = await net.social.myClan(this.char); for (const m of cl?.members || []) out.set(String(m.id), m.name); } catch { /* sem clã */ }
    const ja = new Set((this.grupo?.membros || []).map(m => String(m.id)));
    return [...out].filter(([id]) => id !== this.meuId() && online.has(id) && !ja.has(id)).map(([id, name]) => ({ id, name }));
  },
  convidar(id, nome) {
    if (!this.grupo) this.grupo = { id: uid(), lider: this.meuId(), membros: [{ id: this.meuId(), name: this.char.name }] };
    if (!this.souLider()) return this.ui.toast('Só o líder do grupo pode convidar.');
    if (this.grupo.membros.length >= MAX_GRUPO) return this.ui.toast('O grupo já está cheio (' + MAX_GRUPO + ').');
    this.enviarGrupo({ t: 'g-convite', para: id, gid: this.grupo.id, nome: this.char.name, membros: this.grupo.membros });
    this.ui.toast('Convite enviado para ' + nome + '.');
  },
  sairGrupo() {
    const g = this.grupo; if (!g) return;
    this.enviarGrupo({ t: this.souLider() ? 'g-fim' : 'g-sair', gid: g.id, nome: this.char.name });
    this.grupo = null; this.ui.grupoHud?.(null); this.ui.toast('Você saiu do grupo.');
  },
  avisarGrupo() { if (this.grupo) this.enviarGrupo({ t: 'g-grupo', gid: this.grupo.id, lider: this.grupo.lider, membros: this.grupo.membros }); },

  // mensagens "g-…" (valem em qualquer lugar do jogo)
  onGrupoEv(m) {
    const eu = this.meuId(), g = this.grupo;
    switch (m.t) {
      case 'g-convite': if (String(m.para) !== eu) return;
        if (this.grupoAtivo()) return this.enviarGrupo({ t: 'g-ocupado', para: m.de, nome: this.char.name });
        this.ui.dialog({ nome: '⚔️ Convite para grupo', texto: m.nome + ' chamou você para o grupo das dungeons (' + m.membros.length + '/' + MAX_GRUPO + ').\n\n"Melhor é serem dois do que um… porque, se caírem, um levanta o companheiro" (Ec 4:9-10).',
          acoes: [{ label: 'Aceitar', fn: () => { this.grupo = { id: m.gid, lider: m.de, membros: m.membros }; this.enviarGrupo({ t: 'g-aceito', para: m.de, gid: m.gid, nome: this.char.name }); sfx('right'); } }, { label: 'Agora não' }] });
        break;
      case 'g-ocupado': if (String(m.para) === eu) this.ui.toast(m.nome + ' já está em outro grupo.'); break;
      case 'g-aceito': if (String(m.para) !== eu || !g || g.id !== m.gid || !this.souLider()) return;
        if (g.membros.length >= MAX_GRUPO) return;
        if (!g.membros.some(x => String(x.id) === String(m.de))) g.membros.push({ id: String(m.de), name: m.nome });
        this.ui.toast(m.nome + ' entrou no grupo!'); sfx('key'); this.avisarGrupo();
        break;
      case 'g-grupo': if (!g || g.id !== m.gid) return;
        if (!m.membros.some(x => String(x.id) === eu)) { this.grupo = null; this.ui.grupoHud?.(null); this.ui.toast('Você não está mais no grupo.'); return; }
        this.grupo = { id: m.gid, lider: m.lider, membros: m.membros };
        break;
      case 'g-sair': if (!g || g.id !== m.gid) return;
        g.membros = g.membros.filter(x => String(x.id) !== String(m.de)); this.ui.toast(m.nome + ' saiu do grupo.');
        if (this.souLider()) this.avisarGrupo();
        break;
      case 'g-fim': if (g && g.id === m.gid) { this.grupo = null; this.ui.grupoHud?.(null); this.ui.toast('O líder desfez o grupo.'); } break;
      case 'g-fase': if (!g || g.id !== m.gid || this.souLider()) return;
        if (this.fase?.run === m.run) return;
        { const sem = SEMANAS.find(s => s.id === m.sem), f = sem?.fases[m.n - 1]; if (!f) return;
          this.ui.dialog({ nome: '⚔️ O grupo entrou numa fase', texto: 'Fase ' + m.n + ': ' + f.nome + ' (' + f.ref + ').\n\nEntre agora para lutar junto. Os vícios, as chaves e o chefe são os mesmos para todo o grupo.',
            acoes: [{ label: 'Ir com o grupo', fn: () => { sfx('gate'); this.enterFase(sem, m.n, m.run); } }, { label: 'Ficar aqui' }] }); }
        break;
    }
  },

  // o líder entra e chama os outros para o mesmo "run" da fase
  entrarComGrupo(sem, n) {
    const run = this.grupo.id + ':' + sem.id + ':' + n + ':' + Date.now();
    sfx('gate'); this.enterFase(sem, n, run);
    this.enviarGrupo({ t: 'g-fase', gid: this.grupo.id, sem: sem.id, n, run });
  },

  // baús: a chave conta para todos (chega como mensagem "bau")
  bauGrupo(c, ok) {
    if (!this.fase?.run) return;
    this.netEnviar({ t: 'bau', i: this.chests.indexOf(c), ok: ok ? 1 : 0, bonus: this.fase.keys >= 3 ? 1 : 0 });
  },
  receberBau(m) {
    const f = this.fase, c = this.chests[m.i]; if (!f || !c || c.open) return;
    if (!m.ok) { c.locked = 8; return; }
    c.open = true;
    if (m.bonus || f.keys >= 3) return;
    f.keys++; sfx('key'); this.addText(c.x, c.y - 30, 'CHAVE ' + f.keys + '/3 (grupo)', '#FFD23F', 15); this.burst(c.x, c.y, 24, '#FFD23F', 180);
    if (f.keys === 3) this.openDoor();
  },

  // caiu numa fase em grupo: o grupo continua e você levanta na entrada
  cairEmGrupo() {
    const p = this.p, f = this.fase;
    this.ui.banner('VOCÊ CAIU', 'Seu grupo ora por você', 'Você levanta em ' + VOLTA_S + 's · "Orai uns pelos outros" (Tg 5:16)');
    this.addText(p.x, p.y - 40, '✝', '#FFE38A', 22, 3);
    setTimeout(() => {
      if (this.fase !== f || !p.dead) return;
      p.dead = false; p.hp = this.st.maxHp * 0.5; p.inv = 2; p.x = f.built.start.x; p.y = f.built.start.y;
      sfx('heal'); this.burst(p.x, p.y, 30, '#FFE38A', 200); this.ui.toast('Você se levantou! Volte para a luta.');
    }, VOLTA_S * 1000);
  },

  // cartão do grupo no canto: nome e vida de cada um
  grupoTick() {
    if (!this.grupoAtivo()) return this.ui.grupoHud?.(null);
    const agora = performance.now();
    const lista = this.grupo.membros.map(m => {
      if (String(m.id) === this.meuId()) return { nome: m.name + ' (você)', hp: this.p.hp / this.st.maxHp, lider: String(m.id) === String(this.grupo.lider), junto: true };
      const o = this.others.get(m.id) || this.others.get(String(m.id));
      const junto = !!o && agora - o.seen < 5000 && (o.sala || 'world') === this.salaAtual();
      return { nome: m.name, hp: o?.hp ?? 1, lider: String(m.id) === String(this.grupo.lider), junto };
    });
    this.ui.grupoHud?.(lista);
  }
};
