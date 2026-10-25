// Casa do jogador: começa como uma tenda ("Pela fé, Abraão habitou em tendas", Hb 11:9) e cresce até a casa
// construída sobre a rocha (Mt 7:24). Áquila, o fazedor de tendas, dá a tenda, faz as reformas e leva às visitas.
// Dentro: cama (descanso com bônus de XP), parede de versículos, troféus, horta em tempo real, cozinha e livro de visitas.
// Visitar a casa de um amigo: dá para ver tudo e assinar o livro; uma vez por dia, a hospitalidade dá +10% de XP (Hb 13:2).
// Casa do clã: os membros doam denários para o tesouro e o líder constrói (tenda de reunião → casa de oração → sinagoga).
// Mapa em texto (como as fases): 1 cama · 2 parede · 3-8 canteiros · 9 troféus · F fogão · V livro de visitas · X saída · P início.
import { buildFase, TS } from './world.js';
import { ell, rr } from '../util.js';
import { sfx } from '../audio.js';
import { ITEMS } from '../data/items.js';
import { BOSSES } from '../data/bestiary.js';
import { WORLD_NPCS } from '../data/npcs.js';
import { addItem, removeItem, count } from './player.js';
import { net, CUSTO_CASA_CLA } from '../net.js';

export const CASAS = [
  null,
  { nome: 'Tenda', tema: 'tenda', canteiros: 2, ref: 'Hebreus 11:9', mapa: [
    '############',
    '#L..2....1L#',
    '#F.........#',
    '#,,3,,,4,,,#',
    '#,,,,,P,,V,#',
    '######X#####'
  ] },
  { nome: 'Casa de Barro', tema: 'casa', canteiros: 3, preco: 1500, nivel: 8, ref: 'Jó 4:19', mapa: [
    '################',
    '#L....2.....9.L#',
    '#1............F#',
    '#..==......==..#',
    '#..............#',
    '#,,3,,,4,,,5,,,#',
    '#,,,,,,,,,,,,,,#',
    '#,,,,,,,P,,V,,,#',
    '########X#######'
  ] },
  { nome: 'Casa sobre a Rocha', tema: 'rocha', canteiros: 6, preco: 5000, nivel: 15, ref: 'Mateus 7:24', mapa: [
    '####################',
    '#L......2.......9.L#',
    '#1................F#',
    '#...==........==...#',
    '#S................S#',
    '#..................#',
    '#,,3,,,4,,,5,,,6,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,7,,,8,,,,,,,,,,,#',
    '#,,,,,,,,,P,,V,,,,,#',
    '##########X#########'
  ] }
];

// Casa do clã (1 mural · 2 altar · 3 cofre · 4 obra)
export const CASAS_CLA = [
  { nome: 'Terreno do clã', tema: 'casa', mapa: [
    '##############',
    '#,,,,,,,,,,,,#',
    '#,,,1,,,,3,,,#',
    '#,,,,,,4,,,,,#',
    '#,,,,,,P,,,,,#',
    '#######X######'
  ] },
  { nome: 'Tenda da Congregação', tema: 'tenda', ref: 'Êxodo 33:7', mapa: [
    '################',
    '#L.....2......L#',
    '#..............#',
    '#1............3#',
    '#......4.......#',
    '#......P.......#',
    '#######X########'
  ] },
  { nome: 'Casa de Oração', tema: 'casa', ref: 'Atos 12:12', mapa: [
    '####################',
    '#L.......2........L#',
    '#S................S#',
    '#1................3#',
    '#..==..........==..#',
    '#S................S#',
    '#.........4........#',
    '#.........P........#',
    '##########X#########'
  ] },
  { nome: 'Sinagoga do Clã', tema: 'sinagoga', ref: 'Salmo 133:1', mapa: [
    '########################',
    '#L..........2.........L#',
    '#S....S..........S....S#',
    '#1....................3#',
    '#..====..........====..#',
    '#S....S..........S....S#',
    '#......................#',
    '#..........4...........#',
    '#L.........P..........L#',
    '###########X############'
  ] }
];

// sementes (Lídia vende): o que vira e quanto tempo leva (minutos, tempo real)
export const PLANTAS = {
  semente_trigo: { produto: 'pao', qtd: 3, min: 10, cor: '#E8C46A' },
  semente_uva: { produto: 'uvas', qtd: 3, min: 20, cor: '#8E44AD' },
  semente_tamara: { produto: 'tamaras', qtd: 3, min: 25, cor: '#B8791A' },
  semente_roma: { produto: 'roma', qtd: 2, min: 35, cor: '#C0392B' }
};
// receitas da cozinha: ingredientes → prato
export const RECEITAS = [
  { prato: 'guisado_jaco', ing: { pao: 2, peixe: 1 } },
  { prato: 'bolo_passas', ing: { uvas: 2, pao: 1 } },
  { prato: 'pao_mel', ing: { pao: 1, mel: 1 } },
  { prato: 'peixe_brasa', ing: { peixe: 1, pao: 1 } },
  { prato: 'suco_roma', ing: { roma: 2 } },
  { prato: 'tamaras_mel', ing: { tamaras: 2, mel: 1 } }
];
const TROFEU = { mamom: '🪙', procrastinacao: '⏳', mentira: '🎭', imoralidade: '💔', satanas: '🔥', behemote: '🦴', leviata: '🐉', golias: '🗡️' };
const REPOUSO_MIN = 20, REPOUSO_XP = 1.15, HOSPEDE_MIN = 15, HOSPEDE_XP = 1.1, BENCA_MIN = 30, BENCA_OURO = 1.15;
const hoje = () => new Date().toISOString().slice(0, 10);

export function instalarCasa(Game) { Object.assign(Game.prototype, metodos); }

const metodos = {
  casa() { const d = this.char.data; return (d.casa = d.casa || { nivel: 0, horta: [] }); },
  repousando() { return (this.char.data.repousoAte || 0) > Date.now(); },
  // multiplicadores vindos da casa: XP (cama e hospitalidade) e denários (bênção do clã)
  bonusXp() { const d = this.char.data, t = Date.now(); return (d.repousoAte > t ? REPOUSO_XP : 1) * (d.hospedeAte > t ? HOSPEDE_XP : 1); },
  bonusOuro() { return (this.char.data.bencaAte || 0) > Date.now() ? BENCA_OURO : 1; },
  // de quem é a casa que está aberta: a minha ou a de quem estou visitando
  dono() {
    const v = this.visita;
    if (v) return { nome: v.name, look: v.look, casa: v.casa || { nivel: 1, horta: [] }, verses: v.verses || [], bosses: v.bosses || {}, minha: false };
    return { nome: this.char.name, look: this.char.look, casa: this.casa(), verses: this.char.data.verses, bosses: this.char.data.stats.bosses, minha: true };
  },

  // botões no diálogo do Áquila
  acoesCasa() {
    const c = this.char, casa = this.casa(), prox = CASAS[casa.nivel + 1], acoes = [];
    if (!casa.nivel) acoes.push({ label: '⛺ Ganhar uma tenda', fn: () => {
      casa.nivel = 1; sfx('level'); this.save();
      this.ui.dialog({ nome: 'Áquila', texto: 'Aqui está a sua tenda! Abraão também morou em tendas, porque esperava a cidade que tem fundamentos, da qual Deus é o arquiteto (Hb 11:9-10).\n\nLá dentro tem cama, um fogão, uma parede para os versículos que você aprender, livro de visitas e um cantinho de horta.', acoes: [{ label: '🏠 Ir para a tenda', fn: () => this.enterCasa() }, { label: 'Depois' }] });
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
    acoes.push({ label: '👥 Visitar a casa de um amigo', fn: () => this.escolherVisita() });
    if (this.social?.clan) acoes.push({ label: '🛡 Casa do clã [' + this.social.clan.tag + ']', fn: () => this.enterCasaCla() });
    return acoes;
  },

  enterCasa(visita = null) {
    this.visita = visita; this.casaCla = null;
    const dono = this.dono(), def = CASAS[dono.casa.nivel]; if (!def) return;
    if (dono.minha) while (dono.casa.horta.length < def.canteiros) dono.casa.horta.push(null);
    const built = buildFase({ mapa: def.mapa, tema: def.tema });
    this.marcarExtras(built, def.mapa);
    this.enterHub({
      tipo: 'casa', nome: def.nome,
      portal: k => {
        if (k === 'F') return dono.minha ? { tag: '🍳', label: 'Cozinhar', fn: () => this.cozinhar(), casa: 'forno' } : { tag: '🍳', label: 'Fogão', fn: () => this.ui.toast('Esse fogão é de ' + dono.nome + '.'), casa: 'forno' };
        if (k === 'V') return { tag: '📖', label: 'Livro de visitas', fn: () => this.livroVisitas(), casa: 'livro' };
        if (k === 1) return { tag: '🛏', label: dono.minha ? 'Descansar' : 'Cama de ' + dono.nome, fn: () => dono.minha ? this.dormir() : this.ui.toast('"Não vos esqueçais da hospitalidade" (Hb 13:2). A cama é de ' + dono.nome + '.'), casa: 'cama' };
        if (k === 2) return { tag: '🖼', label: 'Parede de versículos', dyn: () => 'Parede de versículos (' + this.dono().verses.length + ')', fn: () => this.verParede(), casa: 'parede' };
        if (k === 9) return { tag: '🏆', label: 'Troféus', dyn: () => 'Troféus (' + Object.keys(this.dono().bosses).length + ')', fn: () => this.verTrofeus(), casa: 'trofeus' };
        const i = k - 3; if (i < 0 || i >= def.canteiros) return {};
        return { tag: '🌱', label: 'Canteiro', dyn: () => this.rotuloCanteiro(i), fn: () => dono.minha ? this.canteiro(i) : this.ui.toast('Essa é a horta de ' + dono.nome + '.'), casa: 'canteiro', i };
      }
    }, built);
    this.ui.banner(dono.minha ? (dono.casa.nivel === 1 ? 'SUA TENDA' : 'SUA CASA') : 'CASA DE ' + dono.nome.toUpperCase(), def.nome, def.ref);
    if (!dono.minha) this.hospitalidade(visita);
  },
  // F (fogão) e V (livro) viram objetos de interação, como os portais numerados
  marcarExtras(built, mapa) {
    mapa.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'F' || ch === 'V') built.portals.push({ key: ch, x: x * TS + 16, y: y * TS + 16 }); }));
  },
  sairCasa() {
    this.visita = null; this.casaCla = null;
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
    const d = this.dono(), v = d.verses;
    this.ui.dialog({ nome: 'Parede de versículos' + (d.minha ? '' : ' de ' + d.nome), texto: v.length
      ? 'Cada quadro é um versículo conquistado:\n\n' + v.map(r => '🖼 ' + r).join('\n') + '\n\n"Escondi a tua palavra no meu coração" (Sl 119:11).'
      : (d.minha ? 'A parede ainda está vazia. Complete fases e vença o Acusador com a Palavra para pendurar os primeiros quadros!' : 'A parede de ' + d.nome + ' ainda está vazia.'), acoes: [{ label: 'Fechar' }] });
  },
  verTrofeus() {
    const d = this.dono(), b = d.bosses, ids = Object.keys(b);
    this.ui.dialog({ nome: 'Troféus' + (d.minha ? '' : ' de ' + d.nome), texto: ids.length
      ? ids.map(id => (TROFEU[id] || '🏅') + ' ' + (BOSSES[id]?.nome || id) + ' · vencido ' + b[id] + 'x').join('\n') + '\n\n"Graças a Deus, que nos dá a vitória por nosso Senhor Jesus Cristo" (1Co 15:57).'
      : 'Nenhum troféu ainda. Vença chefes nas fases e no mundo para enfeitar a estante!', acoes: [{ label: 'Fechar' }] });
  },

  // ---------- Horta ----------
  rotuloCanteiro(i) {
    const s = this.dono().casa.horta?.[i]; if (!s) return this.visita ? 'Canteiro vazio' : 'Canteiro vazio: plantar';
    const pl = PLANTAS[s.semente], falta = s.plantou + pl.min * 60000 - Date.now();
    return falta <= 0 ? (this.visita ? ITEMS[pl.produto].icon + ' pronto para colher' : 'Colher ' + ITEMS[pl.produto].icon + ' ' + ITEMS[pl.produto].nome) : ITEMS[s.semente].icon + ' crescendo · ' + Math.ceil(falta / 60000) + ' min';
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

  // ---------- Cozinha ----------
  cozinhar() {
    const c = this.char, tem = r => Object.entries(r.ing).every(([id, q]) => count(c, id) >= q);
    const linha = r => Object.entries(r.ing).map(([id, q]) => q + ' ' + ITEMS[id].icon).join(' + ');
    this.ui.dialog({ nome: 'Cozinha', texto: 'Junte o que você colheu e comprou para fazer pratos que curam mais e dão força por um tempo.\n\n' +
      RECEITAS.map(r => (tem(r) ? '✅ ' : '▫️ ') + ITEMS[r.prato].icon + ' ' + ITEMS[r.prato].nome + ' = ' + linha(r)).join('\n'),
    acoes: [...RECEITAS.filter(tem).map(r => ({ label: '🍳 ' + ITEMS[r.prato].icon + ' ' + ITEMS[r.prato].nome, fn: () => {
      if (!tem(r)) return;
      for (const [id, q] of Object.entries(r.ing)) removeItem(c, id, q);
      addItem(c, r.prato); sfx('magic'); this.save();
      this.addText(this.p.x, this.p.y - 40, ITEMS[r.prato].icon + ' ' + ITEMS[r.prato].nome, '#FFE38A', 14, 2);
      this.ui.toast('Você preparou ' + ITEMS[r.prato].icon + ' ' + ITEMS[r.prato].nome + '! ' + ITEMS[r.prato].desc, 5000);
    } })), { label: RECEITAS.some(tem) ? 'Agora não' : 'Faltam ingredientes' }] });
  },

  // ---------- Visitas ----------
  async escolherVisita() {
    let lista = [];
    try { lista = (await net.social.friends(this.char)).filter(f => f.st === 'amigo'); } catch (e) { return this.ui.toast(e.message); }
    if (!lista.length) return this.ui.toast('Você ainda não tem amigos. Abra o menu ☰ › Social para adicionar.', 4500);
    this.ui.dialog({ nome: 'Visitar um amigo', texto: '"Não vos esqueçais da hospitalidade, pois alguns, praticando-a, sem o saber acolheram anjos" (Hb 13:2).\n\nDe quem você quer visitar a casa?',
      acoes: [...lista.map(f => ({ label: '🏠 ' + f.name, fn: () => this.visitar(f.id) })), { label: 'Agora não' }] });
  },
  async visitar(id) {
    try {
      const v = await net.casa.de(id);
      if (!v || !v.casa?.nivel) return this.ui.toast((v?.name || 'Esse amigo') + ' ainda não tem casa. Conte para ele do Áquila!', 4000);
      this.enterCasa(v);
    } catch (e) { this.ui.toast('Não foi possível abrir a casa: ' + e.message); }
  },
  // uma vez por dia em cada casa: +10% de XP por 15 minutos
  hospitalidade(v) {
    const d = this.char.data, h = (d.visitou = d.visitou || {});
    if (h[v.id] === hoje()) return;
    h[v.id] = hoje(); d.hospedeAte = Date.now() + HOSPEDE_MIN * 60000; this.save();
    setTimeout(() => this.ui.toast('🤝 Hospitalidade: +' + Math.round((HOSPEDE_XP - 1) * 100) + '% de XP por ' + HOSPEDE_MIN + ' minutos. Deixe um recado no livro de visitas!', 5000), 1200);
  },
  async livroVisitas() {
    const d = this.dono(), id = d.minha ? this.char.id : this.visita.id;
    let msgs = [];
    try { msgs = await net.casa.livro(id); } catch (e) { return this.ui.toast(e.message); }
    const texto = (msgs.length ? msgs.map(m => '✍️ ' + m.nome + ': "' + m.msg + '"').join('\n') : 'Ninguém assinou ainda.') +
      (d.minha ? '\n\nQuando seus amigos visitarem sua casa, os recados aparecem aqui.' : '');
    this.ui.dialog({ nome: 'Livro de visitas' + (d.minha ? '' : ' de ' + d.nome), texto,
      acoes: d.minha ? [{ label: 'Fechar' }] : [{ label: '✍️ Assinar', fn: () => this.assinarLivro() }, { label: 'Fechar' }] });
  },
  async assinarLivro() {
    const msg = await this.ui.pergunta('Assinar o livro de visitas', 'Deixe um recado para ' + this.visita.name + ':', 'Que a paz de Cristo esteja nesta casa!');
    if (!msg) return;
    try { await net.casa.assinar(this.char, this.visita.id, msg); sfx('right'); this.ui.toast('Recado deixado no livro de ' + this.visita.name + '!'); }
    catch (e) { this.ui.toast(e.message); }
  },

  // ---------- Casa do clã ----------
  async enterCasaCla() {
    let dados = null;
    try { dados = await net.social.myClan(this.char); } catch (e) { return this.ui.toast(e.message); }
    if (!dados) return this.ui.toast('Você não está num clã. Abra o menu ☰ › Social.');
    this.visita = null; this.casaCla = dados;
    const n = dados.clan.casa_nivel || 0, def = CASAS_CLA[n];
    const built = buildFase({ mapa: def.mapa, tema: def.tema });
    this.enterHub({
      tipo: 'casa', nome: def.nome,
      portal: k => {
        if (k === 1) return { tag: '📜', label: 'Mural do clã', fn: () => this.muralCla(), casa: 'mural' };
        if (k === 2) return { tag: '🙏', label: 'Orar juntos', fn: () => this.orarCla(), casa: 'altar' };
        if (k === 3) return { tag: '💰', label: 'Tesouro do clã', dyn: () => 'Tesouro do clã (' + (this.casaCla?.clan.tesouro || 0) + ')', fn: () => this.doarCla(), casa: 'cofre' };
        if (k === 4 && n < CUSTO_CASA_CLA.length) return { tag: '🔨', label: 'Construir: ' + CASAS_CLA[n + 1].nome + ' (' + CUSTO_CASA_CLA[n] + ')', fn: () => this.construirCla(), casa: 'obra' };
        return {};
      }
    }, built);
    this.ui.banner('CASA DO CLÃ [' + dados.clan.tag + ']', def.nome, def.ref || '"Oh! Quão bom e quão suave é que os irmãos vivam em união!" (Sl 133:1)');
  },
  muralCla() {
    const { clan, members } = this.casaCla, n = clan.casa_nivel || 0;
    const ord = members.slice().sort((a, b) => (b.doado || 0) - (a.doado || 0));
    this.ui.dialog({ nome: '[' + clan.tag + '] ' + clan.name, texto: (clan.lema ? '"' + clan.lema + '"\n\n' : '') +
      '🏛 ' + CASAS_CLA[n].nome + (n < CUSTO_CASA_CLA.length ? ' · próxima: ' + CASAS_CLA[n + 1].nome + ' (' + CUSTO_CASA_CLA[n] + ' denários)' : ' · completa!') +
      '\n💰 Tesouro: ' + (clan.tesouro || 0) + ' denários\n\nQuem mais ajudou a construir:\n' + ord.map((m, i) => (i < 3 ? ['🥇', '🥈', '🥉'][i] : '•') + ' ' + m.name + (m.role === 'lider' ? ' 👑' : '') + ' · ' + (m.doado || 0)).join('\n'),
    acoes: [{ label: 'Fechar' }] });
  },
  orarCla() {
    const d = this.char.data;
    if (!(this.casaCla.clan.casa_nivel > 0)) return this.ui.toast('Construam a primeira casa do clã para poder orar juntos aqui.');
    if (d.bencaDia === hoje()) return this.ui.toast('Você já orou hoje. A bênção volta amanhã!');
    d.bencaDia = hoje(); d.bencaAte = Date.now() + BENCA_MIN * 60000; sfx('heal'); this.save();
    this.ui.dialog({ nome: 'Oração do clã', texto: '"Onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles" (Mt 18:20).\n\nBênção do clã: +' + Math.round((BENCA_OURO - 1) * 100) + '% de denários pelos próximos ' + BENCA_MIN + ' minutos.', acoes: [{ label: 'Amém!' }] });
  },
  doarCla() {
    const c = this.char, ouro = c.data.gold;
    const valores = [100, 500, 1000, 5000].filter(v => v <= ouro);
    if (!valores.length) return this.ui.toast('Você precisa de pelo menos 100 denários para doar.');
    this.ui.dialog({ nome: 'Tesouro do clã', texto: 'Tesouro: ' + (this.casaCla.clan.tesouro || 0) + ' denários. Você tem ' + ouro + '.\n\n"Cada um contribua segundo propôs no seu coração… Deus ama a quem dá com alegria" (2Co 9:7).',
      acoes: [...valores.map(v => ({ label: '💰 Doar ' + v, fn: async () => {
        if (c.data.gold < v) return;
        try {
          const t = await net.casa.doar(c, this.casaCla.clan, v);
          c.data.gold -= v; this.casaCla.clan.tesouro = t; const eu = this.casaCla.members.find(m => m.id === c.id); if (eu) eu.doado = (eu.doado || 0) + v;
          sfx('coin'); this.save(); this.ui.toast('Você doou ' + v + ' denários. Tesouro do clã: ' + t + '.');
        } catch (e) { this.ui.toast(e.message); }
      } })), { label: 'Agora não' }] });
  },
  async construirCla() {
    const { clan } = this.casaCla, n = clan.casa_nivel || 0;
    if (clan.owner !== this.char.id) return this.ui.toast('Só o líder do clã pode mandar construir. Tesouro: ' + (clan.tesouro || 0) + '/' + CUSTO_CASA_CLA[n] + '.', 4500);
    try {
      await net.casa.subir(this.char, clan); sfx('level');
      this.ui.toast('Construído: ' + CASAS_CLA[n + 1].nome + '! "Se o Senhor não edificar a casa, em vão trabalham os que a edificam" (Sl 127:1)', 6000);
      this.enterCasaCla();
    } catch (e) { this.ui.toast(e.message, 4500); }
  },

  // ---------- Desenho dos móveis ----------
  drawCasa(g, T) {
    const dono = this.dono(), look = dono.look;
    for (const pt of this.portais) {
      const x = pt.x, y = pt.y;
      g.lineJoin = 'round'; g.lineWidth = 1.5; g.strokeStyle = '#2A1A10';
      if (pt.casa === 'cama') {
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 18, y + 14, 38, 6);
        rr(g, x - 18, y - 22, 36, 40, 5); g.fillStyle = '#8A5A35'; g.fill(); g.stroke();
        rr(g, x - 15, y - 18, 30, 12, 4); g.fillStyle = '#F1E6D0'; g.fill(); g.stroke();
        rr(g, x - 15, y - 6, 30, 20, 4); g.fillStyle = look?.tunic || '#3B4CCA'; g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 13, y - 4, 26, 3);
        if (dono.minha && this.repousando()) { g.fillStyle = '#FFE38A'; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('z z', x + 12 + Math.sin(T * 2) * 2, y - 28); }
      } else if (pt.casa === 'parede') {
        // quadros na parede, um por versículo (até 7 à mostra)
        const v = dono.verses.slice(-7), n = Math.max(1, v.length);
        for (let k = 0; k < n; k++) {
          const fx = x + (k - (n - 1) / 2) * 26, fy = y - 28;
          rr(g, fx - 10, fy - 9, 20, 16, 2); g.fillStyle = v[k] ? '#C9973C' : 'rgba(201,151,60,.35)'; g.fill(); g.stroke();
          rr(g, fx - 7, fy - 6, 14, 10, 1); g.fillStyle = v[k] ? '#F1E2BF' : 'rgba(241,226,191,.25)'; g.fill();
          if (v[k]) { g.fillStyle = '#5A3820'; g.fillRect(fx - 5, fy - 3, 10, 1.2); g.fillRect(fx - 5, fy, 7, 1.2); }
        }
      } else if (pt.casa === 'trofeus') {
        const ids = Object.keys(dono.bosses).slice(0, 6);
        rr(g, x - 30, y - 26, 60, 34, 3); g.fillStyle = '#6B4A2B'; g.fill(); g.stroke();
        g.fillStyle = '#4A3220'; g.fillRect(x - 28, y - 9, 56, 3);
        g.font = '13px sans-serif'; g.textAlign = 'center';
        ids.forEach((id, k) => g.fillText(TROFEU[id] || '🏅', x - 20 + (k % 3) * 20, y - 12 + Math.floor(k / 3) * 16));
      } else if (pt.casa === 'canteiro') {
        const s = dono.casa.horta?.[pt.i];
        rr(g, x - 20, y - 12, 40, 26, 5); g.fillStyle = '#6B4426'; g.fill(); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x - 16, y + k * 6); g.lineTo(x + 16, y + k * 6); g.stroke(); }
        if (s && PLANTAS[s.semente]) {
          const pl = PLANTAS[s.semente], prog = Math.min(1, (Date.now() - s.plantou) / (pl.min * 60000));
          for (let k = -1; k <= 1; k++) {
            const px = x + k * 11, h = 4 + prog * 12;
            g.strokeStyle = '#3E7F36'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y + 6); g.lineTo(px, y + 6 - h); g.stroke();
            g.fillStyle = '#5DAE45'; ell(g, px - 3, y + 6 - h * 0.6, 3 * (0.5 + prog), 1.6); g.fill(); ell(g, px + 3, y + 6 - h * 0.8, 3 * (0.5 + prog), 1.6); g.fill();
            if (prog >= 1) { g.fillStyle = pl.cor; ell(g, px, y + 6 - h - 2, 3.4, 3.4); g.fill(); g.lineWidth = 1; g.strokeStyle = '#2A1A10'; g.stroke(); }
          }
          if (prog >= 1) { g.fillStyle = 'rgba(255,240,170,' + (0.5 + 0.5 * Math.sin(T * 5)) + ')'; g.font = '900 11px Nunito'; g.textAlign = 'center'; g.fillText('✦', x + 18, y - 16); }
        }
      } else if (pt.casa === 'forno') {
        // fogão de barro com fogo
        rr(g, x - 16, y - 18, 32, 30, 8); g.fillStyle = '#A0673E'; g.fill(); g.stroke();
        rr(g, x - 9, y - 6, 18, 12, 5); g.fillStyle = '#2A1A10'; g.fill();
        const f = Math.sin(T * 10) * 1.5; g.fillStyle = '#FF9A3C'; g.beginPath(); g.moveTo(x - 6, y + 5); g.quadraticCurveTo(x - 2, y - 6 + f, x, y - 3); g.quadraticCurveTo(x + 2, y - 7 - f, x + 6, y + 5); g.closePath(); g.fill();
        g.fillStyle = '#7A7A7A'; rr(g, x - 12, y - 24, 24, 6, 3); g.fill(); g.stroke();
        g.fillStyle = 'rgba(230,230,230,' + (0.25 + 0.15 * Math.sin(T * 2)) + ')'; ell(g, x + Math.sin(T) * 3, y - 34, 6, 4); g.fill();
      } else if (pt.casa === 'livro') {
        // estante com o livro de visitas aberto
        g.fillStyle = '#6B4426'; g.fillRect(x - 3, y - 6, 6, 18); g.strokeRect(x - 3, y - 6, 6, 18);
        g.beginPath(); g.moveTo(x - 14, y - 10); g.lineTo(x, y - 14); g.lineTo(x + 14, y - 10); g.lineTo(x + 14, y - 2); g.lineTo(x, y - 6); g.lineTo(x - 14, y - 2); g.closePath();
        g.fillStyle = '#F1E2BF'; g.fill(); g.stroke();
        g.strokeStyle = 'rgba(90,56,32,.6)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 11, y - 9 + k * 2); g.lineTo(x - 3, y - 11 + k * 2); g.stroke(); }
      } else if (pt.casa === 'mural') {
        rr(g, x - 22, y - 30, 44, 32, 3); g.fillStyle = '#8A5A35'; g.fill(); g.stroke();
        rr(g, x - 18, y - 26, 36, 24, 2); g.fillStyle = '#F1E2BF'; g.fill();
        g.fillStyle = '#6B4412'; g.font = '700 10px Cinzel, serif'; g.textAlign = 'center'; g.fillText(this.casaCla?.clan.tag || '', x, y - 11);
        g.fillStyle = '#5A3820'; g.fillRect(x - 3, y + 2, 6, 10);
      } else if (pt.casa === 'altar') {
        rr(g, x - 18, y - 8, 36, 20, 4); g.fillStyle = '#C2BEB5'; g.fill(); g.stroke();
        rr(g, x - 22, y - 12, 44, 6, 2); g.fillStyle = '#D8D2C4'; g.fill(); g.stroke();
        const f = Math.sin(T * 9) * 1.5; g.fillStyle = '#FFD86B'; g.beginPath(); g.moveTo(x - 4, y - 12); g.quadraticCurveTo(x - 4, y - 22 + f, x, y - 28 + f); g.quadraticCurveTo(x + 4, y - 22 - f, x + 4, y - 12); g.closePath(); g.fill();
        if ((this.char.data.bencaAte || 0) > Date.now()) { g.strokeStyle = 'rgba(255,227,138,.6)'; g.lineWidth = 2; ell(g, x, y, 30 + Math.sin(T * 3) * 3, 14); g.stroke(); }
      } else if (pt.casa === 'cofre') {
        rr(g, x - 16, y - 12, 32, 22, 4); g.fillStyle = '#7A5232'; g.fill(); g.stroke();
        g.fillStyle = '#C9973C'; g.fillRect(x - 16, y - 4, 32, 3); rr(g, x - 3, y - 6, 6, 7, 1); g.fill();
        g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText('🪙', x, y - 16 + Math.sin(T * 3) * 2);
      } else if (pt.casa === 'obra') {
        g.fillStyle = '#6B4426'; g.fillRect(x - 2, y - 20, 4, 30); g.strokeRect(x - 2, y - 20, 4, 30);
        rr(g, x - 22, y - 32, 44, 16, 3); g.fillStyle = '#C9973C'; g.fill(); g.stroke();
        g.fillStyle = '#2A1A10'; g.font = '800 9px Nunito'; g.textAlign = 'center'; g.fillText('OBRA', x, y - 21);
      }
    }
  }
};
