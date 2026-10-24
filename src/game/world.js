// Mapas em tiles: o mundo aberto (gerado sempre igual a partir de uma semente) e as fases (mapas ASCII).
import { TAU, hash, noise, fbm, rr, ell, clamp } from '../util.js';
import { WORLD_NPCS } from '../data/npcs.js';
import { shade } from './draw.js';

export const TS = 32;
export const T = {
  GRASS: 0, FOREST: 1, SAND: 2, WATER: 3, SHALLOW: 4, PATH: 5, STONE: 6, WALL: 7, TREE: 8, ROCK: 9, MOUNT: 10,
  FLOWER: 11, DARK: 12, HOUSE: 13, CACTUS: 14, PILLAR: 15, PORTAL: 16, PALM: 17, FOUNTAIN: 18, PLAZA: 19,
  FLOOR: 20, FLOOR2: 21, FWALL: 22, OBST: 23, TABLE: 24, COLUMN: 25, LAMP: 26, DOOR: 27, HEAL: 28
};
const SOLID = new Set([T.WATER, T.WALL, T.TREE, T.ROCK, T.MOUNT, T.HOUSE, T.CACTUS, T.PILLAR, T.PORTAL, T.PALM, T.FOUNTAIN,
  T.FWALL, T.OBST, T.TABLE, T.COLUMN, T.LAMP, T.DOOR, T.HEAL]);
const CH = 16; // tiles por pedaço renderizado

export class GameMap {
  constructor(w, h, pal) {
    this.w = w; this.h = h; this.tiles = new Uint8Array(w * h); this.pal = pal;
    this.buildings = []; this.cache = new Map();
  }
  get(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? T.MOUNT : this.tiles[ty * this.w + tx]; }
  set(tx, ty, v) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.tiles[ty * this.w + tx] = v; }
  solid(tx, ty) { return SOLID.has(this.get(tx, ty)); }
  solidAt(x, y) { return this.solid(Math.floor(x / TS), Math.floor(y / TS)); }
  collides(x, y, r) {
    return this.solidAt(x - r, y - r * 0.4) || this.solidAt(x + r, y - r * 0.4) || this.solidAt(x - r, y + r * 0.7) || this.solidAt(x + r, y + r * 0.7);
  }
  // Linha de visão simples (para projéteis e IA).
  clearLine(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 14);
    for (let i = 1; i < n; i++) { const t = i / n; const tl = this.get(Math.floor((x1 + (x2 - x1) * t) / TS), Math.floor((y1 + (y2 - y1) * t) / TS)); if (tl !== T.WATER && SOLID.has(tl)) return false; }
    return true;
  }
  invalidate() { this.cache.clear(); }
  chunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = CH * TS;
    const g = c.getContext('2d');
    const x0 = cx * CH, y0 = cy * CH;
    for (let ty = y0; ty < y0 + CH; ty++) for (let tx = x0; tx < x0 + CH; tx++) drawGround(g, this, tx, ty, (tx - x0) * TS, (ty - y0) * TS);
    // objetos podem passar do tile (copas de árvore), então desenha vizinhos também
    for (let ty = y0 - 1; ty < y0 + CH + 2; ty++) for (let tx = x0 - 1; tx < x0 + CH + 1; tx++) drawObject(g, this, tx, ty, (tx - x0) * TS, (ty - y0) * TS);
    for (const b of this.buildings) {
      if (b.x + b.w < x0 - 1 || b.x > x0 + CH + 1 || b.y + b.h < y0 - 2 || b.y > y0 + CH + 1) continue;
      drawBuilding(g, b, (b.x - x0) * TS, (b.y - y0) * TS, this.pal);
    }
    if (this.cache.size > 90) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, c);
    return c;
  }
  draw(ctx, camL, camT, vw, vh) {
    const S = CH * TS;
    const cx0 = Math.floor(camL / S), cy0 = Math.floor(camT / S), cx1 = Math.floor((camL + vw) / S), cy1 = Math.floor((camT + vh) / S);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= this.w || cy * CH >= this.h) continue;
      ctx.drawImage(this.chunk(cx, cy), cx * S, cy * S);
    }
  }
}

/* ---------------- Paletas ---------------- */
const WORLD_PAL = {
  grass: ['#7DB356', '#76AC4F', '#82B95B'], forest: ['#4F7F3B', '#4A7836'], sand: ['#E6CC8E', '#DFC384'], water: '#2C78AE', water2: '#3C8DC0',
  shallow: '#62AED4', path: ['#CDAE72', '#C6A669'], stone: ['#D8CCB2', '#CFC2A6'], plaza: ['#E4D8BE', '#D6C8AA'], dark: '#3B3550',
  wall: '#B9A988', wallTop: '#DCCDAA', wallDark: '#8D7E63', roof: ['#B4563D', '#3C6E9E', '#7A5232', '#5E8A3A'], mount: '#857A69', mountTop: '#A79B86',
  tree: '#3C7A34', tree2: '#2F6229', treeHi: '#5FA048', trunk: '#6B4A2F'
};
export const FASE_PAL = {
  agora: { floor: ['#DCC79F', '#D3BC92'], floor2: ['#86AE5C', '#7FA654'], wall: '#E6D5B3', wallTop: '#F2E6CC', wallDark: '#B9A57E', obst: 'tree', bg: '#2A2016', accent: '#C2412D', water: '#3C8DC0' },
  oficina: { floor: ['#B07B4F', '#A87349'], floor2: ['#7E4FA0', '#74479A'], wall: '#8C6448', wallTop: '#A67C5D', wallDark: '#5F412C', obst: 'crate', bg: '#160F0A', accent: '#D2A24C', water: '#3C8DC0' },
  sinagoga: { floor: ['#CFC6B5', '#C6BCA9'], floor2: ['#9E2B2B', '#922626'], wall: '#9C8F7A', wallTop: '#B9AD98', wallDark: '#6E6352', obst: 'column', bg: '#0F0D0B', accent: '#D9A93A', water: '#3C8DC0' },
  casa: { floor: ['#C9A27A', '#C09870'], floor2: ['#6FA85A', '#679F52'], wall: '#D8C6A4', wallTop: '#EADBC0', wallDark: '#A8916C', obst: 'tree', bg: '#1A1410', accent: '#3B4CCA', water: '#3C8DC0' },
  tribunal: { floor: ['#E8E4DA', '#DCD7CB'], floor2: ['#8E1B2E', '#82182A'], wall: '#BDB6A6', wallTop: '#D9D3C4', wallDark: '#8A8374', obst: 'column', bg: '#101014', accent: '#F2C14E', water: '#3C8DC0' },
  salao: { floor: ['#5E5478', '#584E72'], floor2: ['#7A3E8E', '#723886'], wall: '#3E3656', wallTop: '#57507A', wallDark: '#2A243C', obst: 'column', bg: '#0C0914', accent: '#F2C14E', water: '#3C8DC0' }
};

function v(arr, tx, ty) { return Array.isArray(arr) ? arr[hash(tx, ty, 3) < 0.5 ? 0 : 1] : arr; }

// Ordem das camadas do chão: a camada de cima "invade" a de baixo com bordas arredondadas (grama sobre areia, areia sobre água…).
const LAYER = { [T.WATER]: 0, [T.SHALLOW]: 1, [T.SAND]: 2, [T.CACTUS]: 2, [T.PALM]: 2, [T.MOUNT]: 2.5, [T.PATH]: 3, [T.GRASS]: 4, [T.FLOWER]: 4, [T.ROCK]: 4, [T.FOREST]: 5, [T.TREE]: 5 };
const VERDE = new Set([T.GRASS, T.FLOWER, T.ROCK, T.FOREST, T.TREE]);
const OLW = '#2A1A10'; // contorno dos objetos do mundo

function groundColor(m, id, tx, ty) {
  const P = m.pal;
  switch (id) {
    case T.FOREST: case T.TREE: return P.forest[0];
    case T.SAND: case T.CACTUS: case T.PALM: return P.sand[0];
    case T.WATER: return hash(tx, ty, 9) < 0.5 ? P.water : P.water2;
    case T.SHALLOW: return P.shallow;
    case T.PATH: return P.path[0];
    case T.STONE: case T.HOUSE: case T.FOUNTAIN: return v(P.stone, tx, ty);
    case T.PLAZA: case T.PILLAR: case T.PORTAL: return v(P.plaza, tx, ty);
    case T.DARK: return P.dark;
    case T.MOUNT: return P.mount;
    case T.WALL: return P.wall;
    default: return P.grass[0];
  }
}
const TERRA = new Set([T.SAND, T.CACTUS, T.PALM, T.PATH]);
// manchas grandes de luz e sombra na vegetação (tira o aspecto de tabuleiro)
function tint(tx, ty) {
  const n = fbm(tx * 0.09, ty * 0.09, 21);
  return n > 0.5 ? 'rgba(255,240,150,' + ((n - 0.5) * 0.32).toFixed(3) + ')' : 'rgba(18,48,16,' + ((0.5 - n) * 0.36).toFixed(3) + ')';
}
function paintGround(g, m, id, tx, ty, draw) {
  g.fillStyle = groundColor(m, id, tx, ty); draw(); g.fill();
  if (VERDE.has(id)) { g.fillStyle = tint(tx, ty); draw(); g.fill(); }
  else if (TERRA.has(id)) { const n = fbm(tx * 0.11, ty * 0.11, 23); g.fillStyle = n > 0.5 ? 'rgba(255,245,215,' + ((n - 0.5) * 0.3).toFixed(3) + ')' : 'rgba(110,70,30,' + ((0.5 - n) * 0.22).toFixed(3) + ')'; draw(); g.fill(); }
}

function drawGround(g, m, tx, ty, x, y) {
  const id = m.get(tx, ty), P = m.pal;
  if (m.kind === 'fase') {
    let c = id === T.FLOOR2 ? v(P.floor2, tx, ty) : v(P.floor, tx, ty);
    if (id === T.FWALL) c = P.wall;
    if (id === T.WATER) c = P.water;
    g.fillStyle = c; g.fillRect(x, y, TS, TS);
    if (id === T.FLOOR || id === T.FLOOR2 || id >= T.OBST) {
      // lajotas com rejunte e um leve desgaste
      g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 1, y + 1, TS - 2, 2);
      if (hash(tx, ty, 4) < 0.18) { g.fillStyle = 'rgba(0,0,0,.08)'; ell(g, x + 8 + hash(tx, ty, 5) * 16, y + 10 + hash(tx, ty, 6) * 12, 4, 2.5); g.fill(); }
    }
    if (id === T.WATER) {
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 6 + hash(tx, ty) * 12, y + 10, 8, 2); g.fillRect(x + 4 + hash(ty, tx) * 14, y + 22, 6, 2);
    }
    return;
  }
  paintGround(g, m, id, tx, ty, () => { g.beginPath(); g.rect(x, y, TS, TS); });
  blend(g, m, tx, ty, x, y, id);
  const r = hash(tx, ty, 1);
  if (VERDE.has(id)) {
    // tufos de grama (claros e escuros)
    for (let i = 0; i < 4; i++) {
      const bx = x + 3 + hash(tx, ty, i + 10) * 25, by = y + 6 + hash(tx, ty, i + 20) * 22;
      g.strokeStyle = i % 2 ? 'rgba(25,60,18,.32)' : 'rgba(210,240,150,.28)'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(bx - 2, by - 3); g.lineTo(bx, by); g.lineTo(bx + 2, by - 4); g.stroke();
    }
    if (id === T.FLOWER) {
      const cols = ['#FFFFFF', '#FFD23F', '#FF6B9A', '#B98AF0', '#FF8A5C'];
      for (let i = 0; i < 3; i++) {
        const fx2 = x + 5 + hash(tx, ty, i + 30) * 22, fy2 = y + 5 + hash(tx, ty, i + 33) * 22;
        g.fillStyle = cols[Math.floor(hash(tx, ty, i + 40) * cols.length)];
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5; ell(g, fx2 + Math.cos(a) * 2, fy2 + Math.sin(a) * 2, 1.6, 1.6); g.fill(); }
        g.fillStyle = '#E8A21A'; ell(g, fx2, fy2, 1.1, 1.1); g.fill();
      }
    }
  } else if (id === T.SAND) {
    // ondinhas de areia
    g.strokeStyle = 'rgba(150,110,50,.22)'; g.lineWidth = 1.2;
    if (r < 0.55) { g.beginPath(); g.moveTo(x + 4 + r * 10, y + 10 + r * 8); g.quadraticCurveTo(x + 12 + r * 10, y + 6 + r * 8, x + 20 + r * 10, y + 10 + r * 8); g.stroke(); }
    if (hash(tx, ty, 2) < 0.2) { g.fillStyle = 'rgba(120,90,50,.35)'; ell(g, x + 8 + r * 16, y + 22, 1.6, 1.2); g.fill(); ell(g, x + 12 + r * 16, y + 24, 1.1, 0.9); g.fill(); }
  } else if (id === T.WATER) {
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x + 4 + r * 14, y + 10); g.quadraticCurveTo(x + 8 + r * 14, y + 7, x + 12 + r * 14, y + 10); g.stroke();
    if (hash(tx, ty, 3) < 0.5) { g.beginPath(); g.moveTo(x + 2 + hash(ty, tx) * 16, y + 23); g.quadraticCurveTo(x + 6 + hash(ty, tx) * 16, y + 20, x + 10 + hash(ty, tx) * 16, y + 23); g.stroke(); }
  } else if (id === T.SHALLOW) {
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + 3 + r * 18, y + 12, 10, 2);
    if (r < 0.4) { g.fillStyle = 'rgba(120,110,95,.5)'; ell(g, x + 10 + r * 20, y + 22, 3, 2); g.fill(); } // pedrinhas do ribeiro
  } else if (id === T.STONE || id === T.PLAZA) {
    // pedras assentadas, com rejunte e luz em cima
    g.strokeStyle = 'rgba(90,70,40,.22)'; g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, 16, 16); g.strokeRect(x + 16.5, y + 0.5, 15, 16); g.strokeRect(x + 8.5, y + 16.5, 16, 15); g.strokeRect(x + 0.5, y + 16.5, 8, 15); g.strokeRect(x + 24.5, y + 16.5, 7, 15);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1, y + 1, 15, 2); g.fillRect(x + 17, y + 1, 14, 2); g.fillRect(x + 9, y + 17, 15, 2);
    if (r < 0.15) { g.fillStyle = 'rgba(90,70,40,.12)'; g.fillRect(x + 17, y + 1, 14, 15); }
  } else if (id === T.PATH) {
    g.fillStyle = 'rgba(120,90,50,.22)'; ell(g, x + 6 + r * 20, y + 8 + hash(ty, tx, 2) * 16, 2.5, 1.8); g.fill();
    g.fillStyle = 'rgba(255,240,200,.18)'; ell(g, x + 16 + hash(tx, ty, 7) * 12, y + 20, 2, 1.4); g.fill();
  } else if (id === T.MOUNT) {
    const px = x + 10 + r * 10;
    g.beginPath(); g.moveTo(x - 4, y + TS); g.lineTo(px, y + 2); g.lineTo(x + TS + 4, y + TS); g.closePath();
    g.fillStyle = P.mountTop; g.fill(); g.strokeStyle = 'rgba(42,26,16,.55)'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(px, y + 2); g.lineTo(x + TS + 4, y + TS); g.lineTo(x + 18, y + TS); g.fill();
    if (r < 0.25) { g.fillStyle = '#F4F1EA'; g.beginPath(); g.moveTo(x + 4 + r * 10, y + 9); g.lineTo(px, y + 2); g.lineTo(x + 16 + r * 10, y + 9); g.lineTo(x + 12 + r * 10, y + 7); g.lineTo(x + 8 + r * 10, y + 10); g.fill(); }
  }
}

// Bordas orgânicas: o terreno vizinho de camada mais alta entra neste tile em "bolhas" arredondadas.
// Na água, a borda ganha uma faixa de espuma antes da terra.
function blend(g, m, tx, ty, x, y, id) {
  const L0 = LAYER[id]; if (L0 == null) return;
  g.save(); g.beginPath(); g.rect(x, y, TS, TS); g.clip();
  const lay = (a, b) => LAYER[m.get(a, b)] ?? -1;
  const bolhas = (dx, dy, extra, cor) => {
    const nx = tx + dx, ny = ty + dy, nid = m.get(nx, ny);
    for (let k = 0; k < 3; k++) {
      const along = 5 + k * 11 + (hash(tx * 2 + dx, ty * 2 + dy, 60 + k) - 0.5) * 4, rad = 6 + hash(tx + dx * 7, ty + dy * 7, 70 + k) * 4 + extra;
      const cx = dx ? (dx > 0 ? x + TS : x) : x + along, cy = dy ? (dy > 0 ? y + TS : y) : y + along;
      if (cor) { g.fillStyle = cor; ell(g, cx, cy, rad, rad); g.fill(); } else paintGround(g, m, nid, nx, ny, () => ell(g, cx, cy, rad, rad));
    }
  };
  const canto = (dx, dy, extra, cor) => {
    const nx = tx + dx, ny = ty + dy, nid = m.get(nx, ny), cx = dx > 0 ? x + TS : x, cy = dy > 0 ? y + TS : y;
    if (cor) { g.fillStyle = cor; ell(g, cx, cy, 7 + extra, 7 + extra); g.fill(); } else paintGround(g, m, nid, nx, ny, () => ell(g, cx, cy, 7 + extra, 7 + extra));
  };
  const lados = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => lay(tx + dx, ty + dy) > L0);
  const cantos = [[1, 1], [1, -1], [-1, 1], [-1, -1]].filter(([dx, dy]) => lay(tx + dx, ty + dy) > L0 && lay(tx + dx, ty) <= L0 && lay(tx, ty + dy) <= L0);
  if (L0 <= 1) {
    // espuma e água rasa na margem
    for (const [dx, dy] of lados) if (lay(tx + dx, ty + dy) >= 2) bolhas(dx, dy, 5, 'rgba(160,215,235,.55)');
    for (const [dx, dy] of cantos) if (lay(tx + dx, ty + dy) >= 2) canto(dx, dy, 5, 'rgba(160,215,235,.55)');
    for (const [dx, dy] of lados) if (lay(tx + dx, ty + dy) >= 2) bolhas(dx, dy, 2.2, 'rgba(255,255,255,.75)');
    for (const [dx, dy] of cantos) if (lay(tx + dx, ty + dy) >= 2) canto(dx, dy, 2.2, 'rgba(255,255,255,.75)');
  }
  for (const [dx, dy] of lados) bolhas(dx, dy, 0);
  for (const [dx, dy] of cantos) canto(dx, dy, 0);
  g.restore();
}

// Árvore com copa em bolhas e contorno; na Floresta do Líbano, metade são cedros (1Rs 5:6).
function drawTree(g, x, y, tx, ty, P, cedro) {
  const r = hash(tx, ty, 5), s = 0.86 + hash(tx, ty, 8) * 0.3, cx = x + 16 + (r - 0.5) * 8, base = y + 28;
  g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, cx + 3, base, 15 * s, 5 * s); g.fill();
  g.lineJoin = 'round';
  rr(g, cx - 3 * s, base - 15 * s, 6 * s, 15 * s, 2); g.fillStyle = P.trunk; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OLW; g.stroke();
  if (cedro) {
    // cedro: camadas de galhos em degraus
    const cor = ['#2E5F3A', '#3A7448', '#4F8C5A'];
    for (let i = 0; i < 3; i++) {
      const wy = base - 12 * s - i * 9 * s, ww = (18 - i * 4.5) * s;
      g.beginPath(); g.moveTo(cx - ww, wy); g.quadraticCurveTo(cx, wy - 14 * s, cx + ww, wy); g.quadraticCurveTo(cx, wy + 4 * s, cx - ww, wy); g.closePath();
      g.fillStyle = cor[i]; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#173020'; g.stroke();
    }
    return;
  }
  const blobs = [[0, -16, 15], [-9, -11, 10], [9, -10, 10], [-5, -22, 10], [6, -21, 10]].map(([bx, by, br]) => [cx + bx * s, base + by * s - 2, br * s]);
  g.fillStyle = '#1E3A18'; for (const [bx, by, br] of blobs) { ell(g, bx, by, br + 1.6, br + 1.6); g.fill(); }
  g.fillStyle = P.tree2; for (const [bx, by, br] of blobs) { ell(g, bx, by, br, br); g.fill(); }
  g.fillStyle = P.tree; for (const [bx, by, br] of blobs) { ell(g, bx - br * 0.2, by - br * 0.25, br * 0.72, br * 0.68); g.fill(); }
  g.fillStyle = P.treeHi; ell(g, cx - 6 * s, base - 26 * s, 4.5 * s, 3 * s); g.fill(); ell(g, cx + 4 * s, base - 22 * s, 3 * s, 2 * s); g.fill();
  if (hash(tx, ty, 9) < 0.18) { g.fillStyle = '#D9443A'; for (let k = 0; k < 3; k++) { ell(g, cx - 6 * s + k * 6 * s, base - 14 * s - (k % 2) * 6 * s, 1.8, 1.8); g.fill(); } } // frutinhas
}

function drawObject(g, m, tx, ty, x, y) {
  const id = m.get(tx, ty), P = m.pal, r = hash(tx, ty, 5);
  if (m.kind === 'fase') return drawFaseObject(g, m, id, tx, ty, x, y);
  g.lineJoin = 'round';
  switch (id) {
    case T.TREE: drawTree(g, x, y, tx, ty, P, tx < 64 && hash(tx, ty, 13) < 0.5); break;
    case T.PALM: {
      const cx = x + 16;
      g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, cx + 6, y + 28, 12, 4); g.fill();
      g.lineCap = 'round';
      g.strokeStyle = OLW; g.lineWidth = 7.5; g.beginPath(); g.moveTo(cx, y + 28); g.quadraticCurveTo(cx + 6, y + 12, cx + 2, y - 4); g.stroke();
      g.strokeStyle = '#9A7A44'; g.lineWidth = 5; g.stroke();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.7;
        g.beginPath(); g.ellipse(cx + 2 + Math.cos(a) * 10, y - 4 + Math.sin(a) * 6 + 4, 12, 4, a, 0, Math.PI * 2);
        g.fillStyle = i % 2 ? '#4F9A3A' : '#5DAE45'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#1E3A18'; g.stroke();
      }
      g.fillStyle = '#7A5232'; ell(g, cx, y, 2.5, 2.5); g.fill(); ell(g, cx + 4, y + 1, 2.5, 2.5); g.fill();
      break;
    }
    case T.ROCK: {
      g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, x + 17, y + 27, 13, 4); g.fill();
      g.beginPath(); g.moveTo(x + 5, y + 26); g.lineTo(x + 4, y + 16); g.lineTo(x + 10 + r * 4, y + 8); g.lineTo(x + 22, y + 7); g.lineTo(x + 28, y + 15); g.lineTo(x + 27, y + 26); g.closePath();
      g.fillStyle = '#8F8C86'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OLW; g.stroke();
      g.fillStyle = '#B4B0A8'; g.beginPath(); g.moveTo(x + 6, y + 16); g.lineTo(x + 11 + r * 4, y + 9); g.lineTo(x + 21, y + 8.5); g.lineTo(x + 17, y + 16); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(x + 17, y + 16); g.lineTo(x + 27, y + 16); g.lineTo(x + 26, y + 25); g.lineTo(x + 16, y + 25); g.closePath(); g.fill();
      if (r < 0.4) { g.fillStyle = '#6E9A4A'; ell(g, x + 9, y + 24, 3, 1.6); g.fill(); } // musgo
      break;
    }
    case T.CACTUS: {
      g.fillStyle = 'rgba(0,0,0,.18)'; ell(g, x + 17, y + 28, 10, 3.5); g.fill();
      for (const [ax, ay, aw, ah] of [[4, 10, 6, 10], [22, 6, 6, 10], [12, 2, 8, 26]]) { rr(g, x + ax, y + ay, aw, ah, 3); g.fillStyle = '#3F8A43'; g.fill(); g.lineWidth = 1.3; g.strokeStyle = '#173020'; g.stroke(); }
      g.fillStyle = '#6BBA6A'; g.fillRect(x + 14, y + 5, 2, 20);
      if (r < 0.3) { g.fillStyle = '#FF6B9A'; ell(g, x + 16, y + 2, 2.5, 2); g.fill(); }
      break;
    }
    case T.WALL: {
      g.fillStyle = P.wallDark; g.fillRect(x, y + 18, TS, 14);
      g.fillStyle = P.wall; g.fillRect(x, y - 8, TS, 26);
      g.fillStyle = P.wallTop; g.fillRect(x, y - 12, TS, 6);
      if ((tx + ty) % 2 === 0) { g.fillStyle = P.wallTop; g.fillRect(x + 4, y - 18, 10, 7); g.strokeStyle = 'rgba(42,26,16,.5)'; g.lineWidth = 1; g.strokeRect(x + 4.5, y - 17.5, 9, 6); }
      g.strokeStyle = 'rgba(80,60,40,.3)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 6.5, 16, 10); g.strokeRect(x + 16.5, y + 3.5, 15, 10); g.strokeRect(x + 0.5, y + 3.5, 16, 10);
      g.fillStyle = 'rgba(42,26,16,.45)'; g.fillRect(x, y - 13, TS, 1.2);
      break;
    }
    case T.FOUNTAIN: {
      if (m.get(tx - 1, ty) === T.FOUNTAIN || m.get(tx, ty - 1) === T.FOUNTAIN) break;
      // canto superior-esquerdo da fonte 3x3
      const X = x, Y = y;
      g.fillStyle = 'rgba(0,0,0,.2)'; ell(g, X + 50, Y + 56, 50, 36); g.fill();
      ell(g, X + 48, Y + 50, 50, 40); g.fillStyle = '#A99C80'; g.fill(); g.lineWidth = 2; g.strokeStyle = OLW; g.stroke();
      ell(g, X + 48, Y + 46, 46, 36); g.fillStyle = '#D9CEB4'; g.fill();
      ell(g, X + 48, Y + 46, 38, 28); g.fillStyle = '#3C8DC0'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(42,26,16,.6)'; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; ell(g, X + 48, Y + 50, 22, 12); g.stroke();
      rr(g, X + 42, Y + 18, 12, 30, 4); g.fillStyle = '#D9CEB4'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = OLW; g.stroke();
      ell(g, X + 48, Y + 18, 9, 4); g.fillStyle = '#E8DFC8'; g.fill(); g.stroke();
      break;
    }
    case T.PILLAR: {
      g.fillStyle = '#9E978A'; g.fillRect(x + 2, y - 6, 28, TS + 6);
      g.fillStyle = '#C9C2B2'; g.fillRect(x + 4, y - 6, 8, TS + 6);
      g.fillStyle = '#E2DCCC'; g.fillRect(x, y - 10, TS, 6);
      g.strokeStyle = 'rgba(42,26,16,.55)'; g.lineWidth = 1.2; g.strokeRect(x + 2.5, y - 5.5, 27, TS + 5); g.strokeRect(x + 0.5, y - 9.5, TS - 1, 5);
      break;
    }
    case T.PORTAL: {
      g.fillStyle = '#1B1430'; g.fillRect(x, y, TS, TS);
      break;
    }
  }
}

function drawFaseObject(g, m, id, tx, ty, x, y) {
  const P = m.pal;
  if (id === T.FWALL) {
    const below = m.get(tx, ty + 1);
    g.fillStyle = P.wall; g.fillRect(x, y, TS, TS);
    g.fillStyle = P.wallTop; g.fillRect(x, y, TS, 5);
    if (below !== T.FWALL) { g.fillStyle = P.wallDark; g.fillRect(x, y + TS - 12, TS, 12); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y + TS, TS, 6); }
    g.strokeStyle = 'rgba(0,0,0,.1)'; g.strokeRect(x + 0.5, y + 5.5, 15, 9); g.strokeRect(x + 16.5, y + 14.5, 15, 9);
  } else if (id === T.OBST) {
    const k = P.obst;
    if (k === 'tree') drawTree(g, x, y, tx, ty, { trunk: '#6B4A2F', tree: '#3C7A34', tree2: '#2F6229', treeHi: '#5FA048' }, false); else if (k === 'crate') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 4, y + 26, 26, 5);
      g.fillStyle = '#8A5A35'; rr(g, x + 3, y + 3, 26, 25, 3); g.fill();
      g.strokeStyle = '#5A3820'; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, 22, 21); g.beginPath(); g.moveTo(x + 5, y + 5); g.lineTo(x + 27, y + 26); g.stroke();
    } else {
      g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, x + 18, y + 28, 13, 5); g.fill();
      g.fillStyle = '#E9E3D6'; g.fillRect(x + 8, y - 14, 16, 42);
      g.fillStyle = '#C1B9A8'; g.fillRect(x + 18, y - 14, 6, 42);
      g.fillStyle = '#F6F2EA'; g.fillRect(x + 5, y - 18, 22, 6); g.fillRect(x + 5, y + 24, 22, 5);
    }
  } else if (id === T.COLUMN) {
    g.fillStyle = 'rgba(0,0,0,.22)'; ell(g, x + 18, y + 28, 13, 5); g.fill();
    g.fillStyle = '#E9E3D6'; g.fillRect(x + 8, y - 22, 16, 50);
    g.fillStyle = '#C1B9A8'; g.fillRect(x + 18, y - 22, 6, 50);
    g.fillStyle = '#F6F2EA'; g.fillRect(x + 5, y - 26, 22, 6); g.fillRect(x + 5, y + 24, 22, 5);
  } else if (id === T.TABLE) {
    const left = m.get(tx - 1, ty) === T.TABLE;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, y + 24, TS, 6);
    g.fillStyle = '#7A4F2E'; g.fillRect(x, y + 6, TS, 18);
    g.fillStyle = '#9A6A42'; g.fillRect(x, y + 4, TS, 6);
    if (!left) { g.fillStyle = P.accent; rr(g, x + 6, y - 2, 14, 10, 3); g.fill(); }
  } else if (id === T.LAMP) {
    g.fillStyle = '#5A4A3A'; g.fillRect(x + 14, y + 4, 4, 24);
    g.fillStyle = '#D9A93A'; ell(g, x + 16, y + 4, 7, 5); g.fill();
  } else if (id === T.HEAL) {
    g.fillStyle = '#A99C80'; ell(g, x + 16, y + 18, 16, 12); g.fill();
    g.fillStyle = '#5BB8E0'; ell(g, x + 16, y + 17, 12, 8); g.fill();
  }
}

function drawBuilding(g, b, x, y, P) {
  const w = b.w * TS, hgt = b.h * TS;
  if (b.kind === 'arca') {
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, x + w / 2, y + hgt, w / 2, 10); g.fill();
    g.fillStyle = '#6B4A2F'; g.beginPath(); g.moveTo(x - 8, y + 34); g.lineTo(x + w + 8, y + 34); g.lineTo(x + w - 18, y + hgt); g.lineTo(x + 18, y + hgt); g.closePath(); g.fill();
    g.strokeStyle = '#4A3220'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x, y + 44 + i * 18); g.lineTo(x + w, y + 44 + i * 18); g.stroke(); }
    g.fillStyle = '#8A5A35'; g.fillRect(x + 30, y - 6, w - 60, 42);
    g.fillStyle = '#5A3820'; g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + w / 2, y - 30); g.lineTo(x + w - 20, y); g.closePath(); g.fill();
    g.fillStyle = '#2A1A10'; g.fillRect(x + w / 2 - 14, y + 8, 28, 26);
    return;
  }
  const roof = P.roof[b.roof || 0], OL = '#2A1A10', wallY = y + hgt * 0.42;
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 6, y + hgt, w, 8);
  // parede de reboco com algumas pedras aparecendo
  g.fillStyle = '#E6D5B3'; g.fillRect(x, wallY, w, hgt * 0.58);
  g.fillStyle = 'rgba(150,120,80,.25)'; for (let i = 0; i < w / 22; i++) { const hx = hash(b.x + i, b.y, 31); rr(g, x + 6 + i * 22 + hx * 8, wallY + 14 + hash(b.x, b.y + i, 32) * (hgt * 0.3), 9, 5, 2); g.fill(); }
  g.fillStyle = '#C9B48C'; g.fillRect(x, y + hgt - 6, w, 6);
  g.strokeStyle = OL; g.lineWidth = 1.6; g.strokeRect(x + 0.5, wallY, w - 1, hgt * 0.58);
  // telhado com fileiras de telhas, contorno e luz na cumeeira
  g.beginPath(); g.moveTo(x - 8, y + hgt * 0.48); g.lineTo(x + 10, y - 10); g.lineTo(x + w - 10, y - 10); g.lineTo(x + w + 8, y + hgt * 0.48); g.closePath();
  g.fillStyle = roof; g.fill();
  g.save(); g.clip();
  g.strokeStyle = shade(roof, -0.3); g.lineWidth = 1.3;
  for (let ry = y - 2; ry < y + hgt * 0.48; ry += 8) { g.beginPath(); for (let rx = x - 8; rx < x + w + 8; rx += 10) { g.moveTo(rx, ry); g.quadraticCurveTo(rx + 5, ry + 4, rx + 10, ry); } g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - 8, y + hgt * 0.36, w + 16, 20);
  g.restore();
  g.beginPath(); g.moveTo(x - 8, y + hgt * 0.48); g.lineTo(x + 10, y - 10); g.lineTo(x + w - 10, y - 10); g.lineTo(x + w + 8, y + hgt * 0.48); g.closePath();
  g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
  g.fillStyle = shade(roof, 0.25); g.fillRect(x + 10, y - 11, w - 20, 4); g.strokeRect(x + 10, y - 11, w - 20, 4);
  // porta com moldura e degrau; janelas com venezianas
  g.fillStyle = '#A99C80'; rr(g, x + w / 2 - 15, y + hgt - 4, 30, 6, 2); g.fill(); g.lineWidth = 1.2; g.stroke();
  rr(g, x + w / 2 - 13, y + hgt - 33, 26, 32, 10); g.fillStyle = '#C9B48C'; g.fill(); g.stroke();
  rr(g, x + w / 2 - 10, y + hgt - 30, 20, 29, 8); g.fillStyle = '#6B4426'; g.fill(); g.stroke();
  g.strokeStyle = 'rgba(42,26,16,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w / 2, y + hgt - 29); g.lineTo(x + w / 2, y + hgt - 2); g.stroke();
  g.fillStyle = '#E9B949'; ell(g, x + w / 2 + 5, y + hgt - 15, 1.6, 1.6); g.fill();
  if (w > 120) for (const wx of [x + 14, x + w - 34]) {
    g.fillStyle = '#3A2A1E'; g.fillRect(wx, y + hgt - 30, 20, 14);
    g.fillStyle = 'rgba(255,214,120,.35)'; g.fillRect(wx + 2, y + hgt - 28, 16, 5);
    g.strokeStyle = '#7A5232'; g.lineWidth = 2; g.strokeRect(wx, y + hgt - 30, 20, 14); g.beginPath(); g.moveTo(wx + 10, y + hgt - 30); g.lineTo(wx + 10, y + hgt - 16); g.stroke();
    g.fillStyle = shade(roof, -0.1); g.fillRect(wx - 6, y + hgt - 31, 5, 16); g.fillRect(wx + 21, y + hgt - 31, 5, 16);
    g.strokeStyle = OL; g.lineWidth = 1; g.strokeRect(wx - 6, y + hgt - 31, 5, 16); g.strokeRect(wx + 21, y + hgt - 31, 5, 16);
  }
  if (b.sign) {
    // placa de madeira pendurada
    g.strokeStyle = OL; g.lineWidth = 1.4;
    rr(g, x + w / 2 - 36, wallY - 7, 72, 20, 4); g.fillStyle = '#7A4F2E'; g.fill(); g.stroke();
    rr(g, x + w / 2 - 33, wallY - 4, 66, 14, 3); g.strokeStyle = 'rgba(242,193,78,.6)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#FFF0C8'; g.font = '700 11px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.sign, x + w / 2, wallY + 3.5);
  }
}

/* ---------------- Mundo aberto ---------------- */
export const WORLD_W = 180, WORLD_H = 130;
export const CITY = { x0: 72, y0: 62, x1: 108, y1: 88 };
// Vale de Elá (1Sm 17): vale fechado por encostas ao sul dos campos, arena do Golias
export const ELA = { x: 78, y: 117, rx: 13, ry: 7 };
const elaD = (x, y) => ((x - ELA.x) / ELA.rx) ** 2 + ((y - ELA.y) / ELA.ry) ** 2;
// um só portão no mundo: o das Dungeons (as semanas e fases ficam lá dentro)
export const GATE_XS = [90];
export const GATE_Y = 36; // linha onde o jogador fica para entrar

function seaEdge(y) { return 134 + (noise(y * 0.12, 0, 3) - 0.5) * 12; }
function inSea(x, y) { return y < 64 && x > seaEdge(y) + (y > 50 ? (y - 50) * 1.6 : 0); }
function lakeD(x, y) { const n = (noise(x * 0.2, y * 0.2, 8) - 0.5) * 0.35; return ((x - 40) / 13) ** 2 + ((y - 108) / 8) ** 2 + n; }

export function zoneAt(tx, ty) {
  if (tx >= CITY.x0 && tx <= CITY.x1 && ty >= CITY.y0 && ty <= CITY.y1) return 'cidade';
  if (ty < 46 && tx < 126) return 'portoes';
  if (tx > 118 && ty < 66) return 'costa';
  if (elaD(tx, ty) < 1.35) return 'ela';
  if (lakeD(tx, ty) < 2.2) return 'lago';
  if (tx < 66) return 'floresta';
  if (tx > 112 && ty >= 50) return 'deserto';
  if (ty > 92) return 'campos';
  return 'colinas';
}
// Onde escrever o nome de cada região no mapa (em tiles)
export const ZONE_LABELS = [
  ['cidade', 90, 70], ['portoes', 90, 42], ['colinas', 82, 54], ['campos', 104, 116], ['floresta', 30, 66],
  ['lago', 40, 108], ['ela', 78, 112], ['deserto', 146, 82], ['costa', 132, 62]
];
export const ZONES = {
  cidade: { nome: 'Cidade de Refúgio', ref: 'Números 35', seguro: true },
  portoes: { nome: 'Caminho dos Portões', ref: 'Salmo 24:7', seguro: true },
  colinas: { nome: 'Colinas de Efraim', inimigos: ['preguica', 'distracao'] },
  campos: { nome: 'Campos de Belém', inimigos: ['preguica', 'distracao', 'desanimo'] },
  floresta: { nome: 'Floresta do Líbano', inimigos: ['desanimo', 'inveja', 'duvida'] },
  lago: { nome: 'Lago de Genesaré', inimigos: ['distracao', 'desanimo'] },
  deserto: { nome: 'Deserto de Sim', inimigos: ['ganancia', 'ira', 'orgulho'] },
  costa: { nome: 'Costa de Jope', inimigos: ['medo', 'duvida', 'vaidade'] },
  ela: { nome: 'Vale de Elá', ref: '1 Samuel 17:2' } // sem vícios: é a arena do Golias
};

export function generateWorld() {
  const m = new GameMap(WORLD_W, WORLD_H, WORLD_PAL); m.kind = 'world';
  const W = WORLD_W, H = WORLD_H;
  // terreno base
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let t = T.GRASS;
    const n = fbm(x * 0.09, y * 0.09, 1);
    const desert = x > 112 + (noise(y * 0.1, x * 0.02, 4) - 0.5) * 8 && y >= 50;
    if (x < 64 + (noise(y * 0.1, 0, 5) - 0.5) * 8) t = n > 0.5 ? T.TREE : (hash(x, y, 2) < 0.06 ? T.TREE : T.FOREST);
    else if (desert) t = hash(x, y, 6) < 0.012 ? T.CACTUS : hash(x, y, 7) < 0.012 ? T.ROCK : hash(x, y, 8) < 0.006 ? T.PALM : T.SAND;
    else if (y > 92) t = hash(x, y, 9) < 0.18 ? T.FLOWER : (n > 0.66 ? T.TREE : T.GRASS);
    else t = n > 0.68 ? T.TREE : hash(x, y, 9) < 0.03 ? T.ROCK : hash(x, y, 10) < 0.05 ? T.FLOWER : T.GRASS;
    const ld = lakeD(x, y);
    if (ld < 1) t = T.WATER; else if (ld < 1.18) t = T.SAND;
    if (inSea(x, y)) t = T.WATER; else if (inSea(x + 2, y) || inSea(x, y - 2)) t = T.SAND;
    if (y < 34 && !inSea(x, y)) t = T.MOUNT;
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) t = inSea(x, y) ? T.WATER : T.MOUNT;
    m.tiles[y * W + x] = t;
  }
  // caminhos
  const road = (pts, wdt = 1, tile = T.PATH) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      for (let s = 0; s <= n; s++) {
        const x = Math.round(x1 + (x2 - x1) * s / n), y = Math.round(y1 + (y2 - y1) * s / n);
        for (let dy = -wdt; dy <= wdt; dy++) for (let dx = -wdt; dx <= wdt; dx++) if (m.get(x + dx, y + dy) !== T.WATER) m.set(x + dx, y + dy, tile);
      }
    }
  };
  road([[90, 61], [90, 40]]);
  road([[58, 38], [124, 38]], 2, T.PLAZA);
  road([[124, 38], [128, 46], [127, 58]]);
  road([[109, 75], [124, 76], [132, 86], [150, 98]]);
  road([[71, 75], [60, 76], [58, 86], [50, 100]]);
  road([[90, 89], [90, 104], [104, 106], [117, 107]]);
  // Vale de Elá: chão aberto, o ribeiro onde Davi escolheu as cinco pedras lisas (1Sm 17:40) e encostas em volta
  for (let y = ELA.y - 9; y <= ELA.y + 9; y++) for (let x = ELA.x - 16; x <= ELA.x + 16; x++) {
    const d = elaD(x, y);
    if (d < 1) m.set(x, y, Math.abs(x - ELA.x - 6 - Math.sin(y * 0.7) * 1.5) < 1 ? T.SHALLOW : hash(x, y, 11) < 0.07 ? T.FLOWER : T.GRASS);
    else if (d < 1.35) m.set(x, y, hash(x, y, 12) < 0.45 ? T.ROCK : T.MOUNT);
  }
  road([[90, 104], [84, 107], [ELA.x, ELA.y - ELA.ry + 2]]);
  // portões
  GATE_XS.forEach(gx => {
    for (let y = 32; y <= 35; y++) { m.set(gx - 2, y, T.PILLAR); m.set(gx + 2, y, T.PILLAR); }
    for (let x = gx - 1; x <= gx + 1; x++) { m.set(x, 32, T.PILLAR); for (let y = 33; y <= 35; y++) m.set(x, y, T.PORTAL); }
  });
  // cidade
  for (let y = CITY.y0; y <= CITY.y1; y++) for (let x = CITY.x0; x <= CITY.x1; x++) {
    const edge = x === CITY.x0 || x === CITY.x1 || y === CITY.y0 || y === CITY.y1;
    m.set(x, y, edge ? T.WALL : T.STONE);
  }
  for (let d = -1; d <= 1; d++) { m.set(90 + d, CITY.y0, T.PATH); m.set(90 + d, CITY.y1, T.PATH); m.set(CITY.x0, 75 + d, T.PATH); m.set(CITY.x1, 75 + d, T.PATH); }
  for (let y = 72; y <= 78; y++) for (let x = 86; x <= 94; x++) m.set(x, y, T.PLAZA);
  for (let y = 74; y <= 76; y++) for (let x = 89; x <= 91; x++) m.set(x, y, T.FOUNTAIN);
  const house = (x, y, w, h, o = {}) => { m.buildings.push({ x, y, w, h, ...o }); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m.set(i, j, T.HOUSE); };
  house(75, 64, 8, 4, { roof: 0, sign: 'FERREIRO' });
  house(98, 64, 8, 4, { roof: 1, sign: 'PROVISÕES' });
  house(74, 70, 5, 3, { roof: 2 });
  house(103, 71, 4, 3, { roof: 3 });
  house(79, 84, 7, 3, { roof: 1, sign: 'ESCRIBA' });
  house(95, 84, 7, 3, { roof: 0 });
  house(103, 79, 4, 3, { roof: 2 });
  house(74, 79, 4, 3, { roof: 3 });
  // arca de Noé
  m.buildings.push({ x: 50, y: 78, w: 7, h: 5, kind: 'arca' });
  for (let j = 78; j < 83; j++) for (let i = 50; i < 57; i++) m.set(i, j, T.HOUSE);
  // espaço livre ao redor dos NPCs
  for (const n of WORLD_NPCS) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const t = m.get(n.tx + dx, n.ty + dy);
    if (t === T.TREE || t === T.ROCK || t === T.CACTUS || t === T.PALM || t === T.WATER) m.set(n.tx + dx, n.ty + dy, zoneAt(n.tx, n.ty) === 'deserto' || zoneAt(n.tx, n.ty) === 'costa' ? T.SAND : T.GRASS);
  }
  // só valem lugares que dá para alcançar andando a partir da cidade (sem ilhas cercadas de árvores)
  const reach = reachable(m, 90, 78);
  // pontos de surgimento dos inimigos
  const spawns = [], porZona = {};
  for (let i = 0; spawns.length < 190 && i < 12000; i++) {
    const x = 5 + Math.floor(hash(i, 1, 77) * (W - 10)), y = 36 + Math.floor(hash(i, 2, 77) * (H - 40));
    if (m.solid(x, y) || m.get(x, y) === T.SHALLOW || !reach[y * W + x] || !clareira(m, x, y)) continue;
    const z = zoneAt(x, y); if (!ZONES[z].inimigos) continue;
    // regiões grandes (deserto) não podem engolir os pontos das pequenas (costa)
    if ((porZona[z] || 0) >= 32) continue;
    if (Math.abs(x - 90) < 22 && Math.abs(y - 75) < 18) continue;
    if (WORLD_NPCS.some(n => Math.abs(n.tx - x) < 7 && Math.abs(n.ty - y) < 7)) continue;
    // mais longe da cidade = mais difícil
    const depth = clamp(Math.hypot(x - 90, y - 75) / 70, 0, 1);
    const list = ZONES[z].inimigos;
    // metade dos pontos reveza os vícios da região (senão os primeiros da lista nunca aparecem longe da cidade)
    const k = porZona[z] = (porZona[z] || 0) + 1;
    const idx = k % 2 ? Math.floor(k / 2) % list.length
      : Math.min(list.length - 1, Math.floor((depth * 0.8 + hash(i, 3, 77) * 0.5) * list.length));
    spawns.push({ tx: x, ty: y, type: list[idx] });
  }
  // luzes noturnas
  const lights = [];
  for (const [x, y] of [[86, 72], [94, 72], [86, 78], [94, 78], [90, 64], [90, 86], [74, 75], [106, 75]]) lights.push({ x: x * TS + 16, y: y * TS + 16, r: 150 });
  GATE_XS.forEach(gx => lights.push({ x: gx * TS + 16, y: 34 * TS, r: 170, gate: true }));
  // lugares onde a ovelha perdida pode se esconder
  const sheepSpots = [];
  // só nas regiões calmas (campos, colinas, lago e floresta), a até ~45 tiles do Davi — nada de deserto ou costa
  for (let i = 0; sheepSpots.length < 40 && i < 8000; i++) {
    const x = 6 + Math.floor(hash(i, 5, 99) * (W - 12)), y = 40 + Math.floor(hash(i, 6, 99) * (H - 46));
    const dDavi = Math.hypot(x - 117, y - 106);
    if (m.solid(x, y) || !reach[y * W + x] || !clareira(m, x, y) || !['campos', 'colinas', 'lago', 'floresta'].includes(zoneAt(x, y)) || dDavi < 14 || dDavi > 45) continue;
    // nada de esconder a ovelha embaixo da copa de uma árvore (não daria para ver)
    if (m.get(x, y - 1) === T.TREE || m.get(x, y + 1) === T.TREE) continue;
    sheepSpots.push({ x: x * TS + 16, y: y * TS + 16 });
  }
  return { map: m, spawns, lights, sheepSpots, minimap: makeMinimap(m), reach };
}

// Tiles alcançáveis a pé a partir de (sx, sy), andando nas 4 direções — só por caminhos com 2+ tiles de largura
// (frestas de 1 tile entre árvores ficam escondidas pelas copas e parecem fechadas)
function largo(m, x, y) {
  if (m.solid(x, y)) return false;
  for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) if (!m.solid(x + ox, y + oy) && !m.solid(x + ox + 1, y + oy) && !m.solid(x + ox, y + oy + 1) && !m.solid(x + ox + 1, y + oy + 1)) return true;
  return false;
}
// em volta do ponto há no máximo 1 tile bloqueado (o vício/ovelha fica à vista, não enfiado no mato)
function clareira(m, x, y) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.solid(x + dx, y + dy)) n++; return n <= 1; }
function reachable(m, sx, sy) {
  const seen = new Uint8Array(m.w * m.h), q = [sy * m.w + sx]; seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % m.w, y = (i - x) / m.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * m.w + nx;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[j] || !largo(m, nx, ny)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}

export function makeMinimap(m) {
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
  const g = c.getContext('2d'), img = g.createImageData(m.w, m.h);
  const COL = {
    [T.GRASS]: [125, 179, 86], [T.FLOWER]: [140, 185, 95], [T.FOREST]: [79, 127, 59], [T.TREE]: [47, 98, 41], [T.SAND]: [230, 204, 142],
    [T.CACTUS]: [200, 180, 120], [T.PALM]: [190, 180, 110], [T.WATER]: [44, 120, 174], [T.SHALLOW]: [98, 174, 212], [T.PATH]: [205, 174, 114],
    [T.STONE]: [216, 204, 178], [T.PLAZA]: [228, 216, 190], [T.WALL]: [120, 105, 80], [T.HOUSE]: [180, 86, 61], [T.ROCK]: [143, 140, 134],
    [T.MOUNT]: [110, 100, 88], [T.PILLAR]: [240, 220, 160], [T.PORTAL]: [242, 193, 78], [T.FOUNTAIN]: [60, 141, 192],
    [T.FLOOR]: [214, 200, 170], [T.FLOOR2]: [190, 150, 110], [T.FWALL]: [70, 58, 48], [T.OBST]: [120, 100, 80], [T.TABLE]: [140, 95, 60],
    [T.COLUMN]: [200, 195, 185], [T.LAMP]: [217, 169, 58], [T.DOOR]: [120, 80, 40], [T.HEAL]: [91, 184, 224]
  };
  for (let i = 0; i < m.tiles.length; i++) { const c3 = COL[m.tiles[i]] || [100, 100, 100]; img.data.set([c3[0], c3[1], c3[2], 255], i * 4); }
  g.putImageData(img, 0, 0);
  return c;
}

/* ---------------- Fases (mapas ASCII) ---------------- */
export function buildFase(fase) {
  const rows = fase.mapa, H = rows.length, W = Math.max(...rows.map(r => r.length));
  const m = new GameMap(W, H, FASE_PAL[fase.tema] || FASE_PAL.agora); m.kind = 'fase';
  const out = { map: m, chests: [], npcs: [], enemies: [], door: [], boss: null, start: null, heal: [], lights: [], portals: [], exit: null };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x] || '#', px = x * TS + 16, py = y * TS + 16;
    let t = T.FLOOR;
    switch (ch) {
      case '#': t = T.FWALL; break;
      case ',': t = T.FLOOR2; break;
      case 'W': t = T.WATER; break;
      case 'T': t = T.OBST; break;
      case 'S': t = T.COLUMN; break;
      case '=': t = T.TABLE; break;
      case 'L': t = T.LAMP; out.lights.push({ x: px, y: py, r: 140 }); break;
      case 'H': t = T.HEAL; out.heal.push({ x: px, y: py }); break;
      case 'D': t = T.DOOR; out.door.push({ tx: x, ty: y }); break;
      case 'C': out.chests.push({ x: px, y: py }); break;
      case 'E': out.enemies.push({ x: px, y: py }); break;
      case 'B': out.boss = { x: px, y: py }; break;
      case 'P': out.start = { x: px, y: py }; break;
      case 'X': out.exit = { x: px, y: py }; break;
      case 'G': out.guia = { x: px, y: py }; break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9': out.portals.push({ key: +ch, x: px, y: py }); break;
      default: if (/[A-Z]/.test(ch) && fase.npcs && fase.npcs[ch]) out.npcs.push({ key: ch, x: px, y: py });
    }
    m.tiles[y * W + x] = t;
  }
  return out;
}

/* ---------- Salão das Dungeons e salas das semanas ----------
   1-9 = portais (semanas no salão, fases na sala da semana)  X = saída  G = guia */
export function buildSalao(qtd) {
  const n = Math.min(9, qtd), W = Math.max(19, n * 5 + 6);
  const linha = c => '#' + c.padEnd(W - 2, '.').slice(0, W - 2) + '#';
  const centro = (txt) => { const a = Array(W - 2).fill('.'); const i = Math.floor((W - 2 - txt.length) / 2); for (let k = 0; k < txt.length; k++) a[i + k] = txt[k]; return '#' + a.join('') + '#'; };
  const port = Array(W - 2).fill('.');
  const passo = (W - 2) / (n + 1);
  for (let i = 0; i < n; i++) port[Math.round(passo * (i + 1)) - 1] = String(i + 1);
  port[0] = 'L'; port[W - 3] = 'L';
  const rows = ['#'.repeat(W), linha(''), '#' + port.join('') + '#', linha(''), linha(''), centro('S' + '.'.repeat(W - 8) + 'S'), linha(''), centro('G'), linha(''), centro('S' + '.'.repeat(W - 8) + 'S'), centro('P'), '#'.repeat(Math.floor((W - 1) / 2)) + 'X' + '#'.repeat(W - 1 - Math.floor((W - 1) / 2))];
  return buildFase({ mapa: rows, tema: 'salao' });
}
export function buildSemanaSala(tema) {
  return buildFase({ tema: FASE_PAL[tema] ? tema : 'salao', mapa: [
    '#######################',
    '#L...................L#',
    '#..1...2...3...4...5..#',
    '#.....................#',
    '#S...................S#',
    '#.....................#',
    '#..........G..........#',
    '#S...................S#',
    '#..........P..........#',
    '###########X###########'
  ] });
}
