// Dados persistentes do personagem: atributos, inventário, equipamentos e progresso.
import { CLASSES } from '../data/classes.js';
import { ITEMS, SLOTS } from '../data/items.js';

export const MAX_LEVEL = 40;

export function newCharData(cls) {
  return {
    xp: 0, gold: 40, hp: null, fe: null,
    inv: { pao: 4, mana: 2, pergaminho: 1 },
    eq: { arma: CLASSES[cls].armaInicial, escudo: 'escudo_madeira' },
    fases: {}, quests: {}, verses: [], kills: {}, licoes: [], secrets: [], mini: {},
    stats: { kills: 0, quizOk: 0, quizErr: 0, deaths: 0, bosses: {}, playtime: 0 },
    pos: null
  };
}

export function xpNeed(lv) { return Math.floor(40 * Math.pow(lv, 1.55)); }

export function computeStats(c) {
  const C = CLASSES[c.cls], lv = c.level - 1;
  const s = {
    maxHp: Math.round(C.base.hp + C.grow.hp * lv), maxFe: Math.round(C.base.fe + C.grow.fe * lv),
    atk: C.base.atk + C.grow.atk * lv, def: C.base.def + C.grow.def * lv, spd: C.base.spd,
    block: 0.5, weapon: C.arma, palavra: false, reviver: false, esquiva: 1, ouro: 1, legendary: 0
  };
  for (const slot of SLOTS) {
    const id = c.data.eq[slot]; if (!id) continue;
    const it = ITEMS[id]; if (!it) continue;
    s.atk += it.atk || 0; s.def += it.def || 0; s.maxHp += it.hp || 0; s.maxFe += it.fe || 0; s.spd += it.spd || 0;
    if (it.block) s.block = it.block;
    if (it.palavra) { s.palavra = true; s.weapon = 'espada'; }
    if (it.reviver) s.reviver = true;
    if (it.esquiva) s.esquiva = it.esquiva;
    if (it.ouro) s.ouro += it.ouro;
    if (it.pet) { s.pet = it.pet; s.montaria = it.montaria || 0; }
    if (it.raridade === 'lendario') s.legendary++;
  }
  // bônus de conjunto: Armadura de Deus completa
  if (s.legendary >= 6) { s.atk *= 1.15; s.def *= 1.15; s.maxHp = Math.round(s.maxHp * 1.15); s.armaduraCompleta = true; }
  s.atk = Math.round(s.atk); s.def = Math.round(s.def);
  return s;
}

export const count = (c, id) => c.data.inv[id] || 0;
// Arma de outra classe não pode ser carregada: fica guardada com Samuel (volta se você trocar para essa classe)
export function daOutraClasse(c, id) { const it = ITEMS[id]; return !!(it && it.slot === 'arma' && it.classe && it.classe !== 'todas' && it.classe !== c.cls); }
export function addItem(c, id, q = 1) {
  if (daOutraClasse(c, id)) { const g = c.data.guardadas = c.data.guardadas || {}; g[id] = (g[id] || 0) + q; return; }
  c.data.inv[id] = (c.data.inv[id] || 0) + q;
}
// arruma o inventário depois de trocar de classe (ou em saves antigos): leva e traz armas da guarda
export function arrumarArmas(c) {
  const g = c.data.guardadas = c.data.guardadas || {}, foram = [], voltaram = [];
  for (const id of Object.keys(c.data.inv)) if (daOutraClasse(c, id)) { g[id] = (g[id] || 0) + c.data.inv[id]; delete c.data.inv[id]; foram.push(id); }
  for (const id of Object.keys(g)) if (!daOutraClasse(c, id)) { c.data.inv[id] = (c.data.inv[id] || 0) + g[id]; delete g[id]; voltaram.push(id); }
  return { foram, voltaram };
}
export function removeItem(c, id, q = 1) {
  if (!c.data.inv[id]) return false;
  c.data.inv[id] -= q; if (c.data.inv[id] <= 0) delete c.data.inv[id];
  return true;
}
export function canEquip(c, id) {
  const it = ITEMS[id];
  if (!it || !it.slot) return 'Este item não pode ser equipado.';
  if (it.classe && it.classe !== 'todas' && it.classe !== c.cls) return 'Só a classe ' + CLASSES[it.classe].nome + ' usa e carrega isso.';
  if (it.nivel && c.level < it.nivel) return 'Precisa do nível ' + it.nivel + '.';
  return null;
}
export function equip(c, id) {
  const err = canEquip(c, id); if (err) return err;
  const slot = ITEMS[id].slot, old = c.data.eq[slot];
  if (!removeItem(c, id)) return 'Você não tem esse item.';
  if (old) addItem(c, old);
  c.data.eq[slot] = id;
  return null;
}
export function unequip(c, slot) {
  const id = c.data.eq[slot]; if (!id) return;
  if (slot === 'arma') return 'Você precisa de uma arma.';
  delete c.data.eq[slot]; addItem(c, id);
  return null;
}
export function faseProg(c, semanaId) { return (c.data.fases[semanaId] = c.data.fases[semanaId] || {}); }
