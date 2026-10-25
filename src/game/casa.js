// Casa do jogador: começa como uma tenda ("Pela fé, Abraão habitou em tendas", Hb 11:9) e cresce até a casa
// construída sobre a rocha (Mt 7:24). Áquila, o fazedor de tendas, dá a tenda e faz as reformas.
// Dentro: cama (descanso com bônus de XP), parede de versículos, troféus dos chefes e horta que cresce em tempo real.
// Mapa em texto (como as fases): 1 cama · 2 parede de versículos · 3-8 canteiros · 9 troféus · X saída · P início.
import { buildFase, TS } from './world.js';
import { ell, rr } from '../util.js';
import { sfx } from '../audio.js';
import { ITEMS } from '../data/items.js';
import { BOSSES } from '../data/bestiary.js';
import { WORLD_NPCS } from '../data/npcs.js';
import { addItem, removeItem, count } from './player.js';

export const CASAS = [
  null,
  { nome: 'Tenda', tema: 'tenda', canteiros: 2, ref: 'Hebreus 11:9', mapa: [
    '############',
    '#L..2....1L#',
    '#..........#',
    '#,,3,,,4,,,#',
    '#,,,,,P,,,,#',
    '######X#####'
  ] },
  { nome: 'Casa de Barro', tema: 'casa', canteiros: 3, preco: 1500, nivel: 8, ref: 'Jó 4:19', mapa: [
    '################',
    '#L....2.....9.L#',
    '#1.............#',
    '#..==......==..#',
    '#..............#',
    '#,,3,,,4,,,5,,,#',
    '#,,,,,,,,,,,,,,#',
    '#,,,,,,,P,,,,,,#',
    '########X#######'
  ] },
  { nome: 'Casa sobre a Rocha', tema: 'rocha', canteiros: 6, preco: 5000, nivel: 15, ref: 'Mateus 7:24', mapa: [
    '####################',
    '#L......2.......9.L#',
    '#1.................#',
    '#...==........==...#',
    '#S................S#',
    '#..................#',
    '#,,3,,,4,,,5,,,6,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,7,,,8,,,,,,,,,,,#',
    '#,,,,,,,,,P,,,,,,,,#',
    '##########X#########'
  ] }
];

// sementes (Lídia vende): o que vira e quanto tempo leva (minutos, tempo real)
export const PLANTAS = {
  semente_trigo: { produto: 'pao', qtd: 3, min: 10, cor: '#E8C46A' },
  semente_uva: { produto: 'uvas', qtd: 3, min: 20, cor: '#8E44AD' },
  semente_tamara: { produto: 'tamaras', qtd: 3, min: 25, cor: '#B8791A' },
  semente_roma: { produto: 'roma', qtd: 2, min: 35, cor: '#C0392B' }
};
const TROFEU = { mamom: '🪙', procrastinacao: '⏳', mentira: '🎭', imoralidade: '💔', satanas: '🔥', behemote: '🦴', leviata: '🐉', golias: '🗡️' };
const REPOUSO_MIN = 20, REPOUSO_XP = 1.15;

export function instalarCasa(Game) { Object.assign(Game.prototype, metodos); }

const metodos = {
  casa() { const d = this.char.data; return (d.casa = d.casa || { nivel: 0, horta: [] }); },
  repousando() { return (this.char.data.repousoAte || 0) > Date.now(); },

  // botões no diálogo do Áquila
  acoesCasa() {
    const c = this.char, casa = this.casa(), prox = CASAS[casa.nivel + 1], acoes = [];
    if (!casa.nivel) acoes.push({ label: '⛺ Ganhar uma tenda', fn: () => {
      casa.nivel = 1; sfx('level'); this.save();
      this.ui.dialog({ nome: 'Áquila', texto: 'Aqui está a sua tenda! Abraão também morou em tendas, porque esperava a cidade que tem fundamentos, da qual Deus é o arquiteto (Hb 11:9-10).\n\nLá dentro tem cama, uma parede para os versículos que você aprender e um cantinho de horta. Quando quiser, é só falar comigo para ir até lá.', acoes: [{ label: '🏠 Ir para a tenda', fn: () => this.enterCasa() }, { label: 'Depois' }] });
    } });
    else acoes.push({ label: '🏠 Ir para ' + (casa.nivel === 1 ? 'a minha tenda' : 'a minha casa'), fn: () => this.enterCasa() });
    if (casa.nivel && prox) acoes.push({ label: '🔨 ' + prox.nome + ' (🪙 ' + prox.preco + ', nv ' + prox.nivel + ')', fn: () => {
      if (c.level < prox.nivel) return this.ui.toast('Você precisa do nível ' + prox.nivel + ' para essa reforma.');
      if (c.data.gold < prox.preco) return this.ui.toast('Faltam ' + (prox.preco - c.data.gold) + ' denários para essa reforma.');
      c.data.gold -= prox.preco; casa.nivel++; sfx('level'); this.save();
      this.ui.dialog({ nome: 'Áquila', texto: casa.nivel === 3
        ? '"Todo aquele que ouve estas minhas palavras e as pratica será comparado a um homem prudente, que edificou a sua casa sobre a rocha" (Mt 7:24). Sua casa está pronta, firme como a Palavra!'
        : 'Pronto! Uma casa de barro, com mais espaço, uma estante de troféus e mais canteiros na horta.', acoes: [{ label: '🏠 Ver a casa', fn: () => this.enterCasa() }, { label: 'Obrigado!' }] });
    } });
    return acoes;
  },

  enterCasa() {
    const casa = this.casa(), def = CASAS[casa.nivel]; if (!def) return;
    while (casa.horta.length < def.canteiros) casa.horta.push(null);
    const built = buildFase({ mapa: def.mapa, tema: def.tema });
    this.enterHub({
      tipo: 'casa', nome: def.nome,
      portal: k => {
        if (k === 1) return { tag: '🛏', label: 'Descansar', fn: () => this.dormir(), casa: 'cama' };
        if (k === 2) return { tag: '🖼', label: 'Parede de versículos', dyn: () => 'Parede de versículos (' + this.char.data.verses.length + ')', fn: () => this.verParede(), casa: 'parede' };
        if (k === 9) return { tag: '🏆', label: 'Troféus', dyn: () => 'Troféus (' + Object.keys(this.char.data.stats.bosses).length + ')', fn: () => this.verTrofeus(), casa: 'trofeus' };
        const i = k - 3; if (i < 0 || i >= def.canteiros) return {};
        return { tag: '🌱', label: 'Canteiro', dyn: () => this.rotuloCanteiro(i), fn: () => this.canteiro(i), casa: 'canteiro', i };
      }
    }, built);
    this.ui.banner(casa.nivel === 1 ? 'SUA TENDA' : 'SUA CASA', def.nome, def.ref);
  },
  sairCasa() {
    const a = WORLD_NPCS.find(n => n.id === 'aquila');
    this.enterWorld(false, { x: a.tx * TS + 16, y: (a.ty + 1.5) * TS });
  },
  // rótulos que mudam (planta crescendo, versículos novos)
  tickCasa() { for (const pt of this.portais) if (pt.dyn) pt.label = pt.dyn(); },

  dormir() {
    const p = this.p, b = this.botija();
    p.hp = this.st.maxHp; p.fe = this.st.maxFe; p.sta = 100; b.n = b.max;
    this.char.data.repousoAte = Date.now() + REPOUSO_MIN * 60000;
    sfx('heal'); this.save();
    this.ui.dialog({ nome: 'Descanso', texto: '"Em paz me deito e logo pego no sono, porque só tu, Senhor, me fazes repousar seguro" (Sl 4:8).\n\nVida, Fé e botija restauradas. Bem descansado, você ganha +' + Math.round((REPOUSO_XP - 1) * 100) + '% de XP pelos próximos ' + REPOUSO_MIN + ' minutos.', acoes: [{ label: 'Amém!' }] });
  },
  verParede() {
    const v = this.char.data.verses;
    this.ui.dialog({ nome: 'Parede de versículos', texto: v.length
      ? 'Cada quadro é um versículo que você conquistou:\n\n' + v.map(r => '🖼 ' + r).join('\n') + '\n\n"Escondi a tua palavra no meu coração" (Sl 119:11).'
      : 'A parede ainda está vazia. Complete fases e vença o Acusador com a Palavra para pendurar os primeiros quadros!', acoes: [{ label: 'Fechar' }] });
  },
  verTrofeus() {
    const b = this.char.data.stats.bosses, ids = Object.keys(b);
    this.ui.dialog({ nome: 'Troféus', texto: ids.length
      ? ids.map(id => (TROFEU[id] || '🏅') + ' ' + (BOSSES[id]?.nome || id) + ' · vencido ' + b[id] + 'x').join('\n') + '\n\n"Graças a Deus, que nos dá a vitória por nosso Senhor Jesus Cristo" (1Co 15:57).'
      : 'Nenhum troféu ainda. Vença chefes nas fases e no mundo para enfeitar a estante!', acoes: [{ label: 'Fechar' }] });
  },

  // ---------- Horta ----------
  rotuloCanteiro(i) {
    const s = this.casa().horta[i]; if (!s) return 'Canteiro vazio: plantar';
    const pl = PLANTAS[s.semente], falta = s.plantou + pl.min * 60000 - Date.now();
    return falta <= 0 ? 'Colher ' + ITEMS[pl.produto].icon + ' ' + ITEMS[pl.produto].nome : ITEMS[s.semente].icon + ' crescendo · ' + Math.ceil(falta / 60000) + ' min';
  },
  canteiro(i) {
    const c = this.char, horta = this.casa().horta, s = horta[i];
    if (s) {
      const pl = PLANTAS[s.semente], falta = s.plantou + pl.min * 60000 - Date.now();
      if (falta > 0) return this.ui.toast(ITEMS[s.semente].nome + ': faltam ' + Math.ceil(falta / 60000) + ' minutos. "Um planta, outro rega, mas Deus dá o crescimento" (1Co 3:6).', 4500);
      addItem(c, pl.produto, pl.qtd); horta[i] = null; sfx('coin'); this.save();
      this.addText(this.p.x, this.p.y - 40, '+' + pl.qtd + ' ' + ITEMS[pl.produto].icon, '#9BD98A', 16);
      return this.ui.toast('Colheu ' + pl.qtd + ' ' + ITEMS[pl.produto].icon + ' ' + ITEMS[pl.produto].nome + '!');
    }
    const tenho = Object.keys(PLANTAS).filter(id => count(c, id) > 0);
    if (!tenho.length) return this.ui.toast('Você não tem sementes. Lídia vende na Tenda de provisões, na cidade.', 4000);
    this.ui.dialog({ nome: 'Canteiro', texto: '"A que caiu em boa terra são os que ouvem a palavra, a recebem e frutificam" (Mc 4:20). O que vai plantar?', acoes: [
      ...tenho.map(id => ({ label: ITEMS[id].icon + ' ' + ITEMS[id].nome + ' (x' + count(c, id) + ') · ' + PLANTAS[id].min + ' min', fn: () => {
        if (!removeItem(c, id)) return;
        horta[i] = { semente: id, plantou: Date.now() }; sfx('click'); this.save();
        this.ui.toast('Plantou ' + ITEMS[id].nome + '. Volte em ' + PLANTAS[id].min + ' minutos para colher.');
      } })), { label: 'Agora não' }] });
  },

  // ---------- Desenho dos móveis ----------
  drawCasa(g, T) {
    const look = this.char.look;
    for (const pt of this.portais) {
      const x = pt.x, y = pt.y;
      g.lineJoin = 'round'; g.lineWidth = 1.5; g.strokeStyle = '#2A1A10';
      if (pt.casa === 'cama') {
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 18, y + 14, 38, 6);
        rr(g, x - 18, y - 22, 36, 40, 5); g.fillStyle = '#8A5A35'; g.fill(); g.stroke();
        rr(g, x - 15, y - 18, 30, 12, 4); g.fillStyle = '#F1E6D0'; g.fill(); g.stroke();
        rr(g, x - 15, y - 6, 30, 20, 4); g.fillStyle = look?.tunic || '#3B4CCA'; g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 13, y - 4, 26, 3);
        if (this.repousando()) { g.fillStyle = '#FFE38A'; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('z z', x + 12 + Math.sin(T * 2) * 2, y - 28); }
      } else if (pt.casa === 'parede') {
        // quadros na parede, um por versículo (até 7 à mostra)
        const v = this.char.data.verses.slice(-7), n = Math.max(1, v.length);
        for (let k = 0; k < n; k++) {
          const fx = x + (k - (n - 1) / 2) * 26, fy = y - 28;
          rr(g, fx - 10, fy - 9, 20, 16, 2); g.fillStyle = v[k] ? '#C9973C' : 'rgba(201,151,60,.35)'; g.fill(); g.stroke();
          rr(g, fx - 7, fy - 6, 14, 10, 1); g.fillStyle = v[k] ? '#F1E2BF' : 'rgba(241,226,191,.25)'; g.fill();
          if (v[k]) { g.fillStyle = '#5A3820'; g.fillRect(fx - 5, fy - 3, 10, 1.2); g.fillRect(fx - 5, fy, 7, 1.2); }
        }
      } else if (pt.casa === 'trofeus') {
        const ids = Object.keys(this.char.data.stats.bosses).slice(0, 6);
        rr(g, x - 30, y - 26, 60, 34, 3); g.fillStyle = '#6B4A2B'; g.fill(); g.stroke();
        g.fillStyle = '#4A3220'; g.fillRect(x - 28, y - 9, 56, 3);
        g.font = '13px sans-serif'; g.textAlign = 'center';
        ids.forEach((id, k) => g.fillText(TROFEU[id] || '🏅', x - 20 + (k % 3) * 20, y - 12 + Math.floor(k / 3) * 16));
      } else if (pt.casa === 'canteiro') {
        const s = this.casa().horta[pt.i];
        rr(g, x - 20, y - 12, 40, 26, 5); g.fillStyle = '#6B4426'; g.fill(); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x - 16, y + k * 6); g.lineTo(x + 16, y + k * 6); g.stroke(); }
        if (s) {
          const pl = PLANTAS[s.semente], prog = Math.min(1, (Date.now() - s.plantou) / (pl.min * 60000));
          for (let k = -1; k <= 1; k++) {
            const px = x + k * 11, h = 4 + prog * 12;
            g.strokeStyle = '#3E7F36'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y + 6); g.lineTo(px, y + 6 - h); g.stroke();
            g.fillStyle = '#5DAE45'; ell(g, px - 3, y + 6 - h * 0.6, 3 * (0.5 + prog), 1.6); g.fill(); ell(g, px + 3, y + 6 - h * 0.8, 3 * (0.5 + prog), 1.6); g.fill();
            if (prog >= 1) { g.fillStyle = pl.cor; ell(g, px, y + 6 - h - 2, 3.4, 3.4); g.fill(); g.lineWidth = 1; g.strokeStyle = '#2A1A10'; g.stroke(); }
          }
          if (prog >= 1) { g.fillStyle = 'rgba(255,240,170,' + (0.5 + 0.5 * Math.sin(T * 5)) + ')'; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('✦', x + 18, y - 16); }
        }
      }
    }
  }
};
