// One ink-and-silver icon family. Labels remain text for assistive technology.
import { h } from '../util.js';
import { drawWeapon } from '../game/character-art.js';
import { CLASSES } from '../data/classes.js';

const paths = {
  espada: 'M6 18 18 6l2-4-4 2L4 16m-1-3 8 8M2 22l4-4',
  adaga: 'm5 19 9-13 6-4-2 7-11 12M3 15l6 6M2 22l3-3',
  funda: 'M7 3C3 10 2 19 10 20c8 0 10-9 7-16M7 3l5 11m5-10-5 10m-3 0 3-2 3 2-1 4h-4Z',
  cajado: 'M9 22V7C9 0 20 1 18 7c-1 3-5 3-5 0M7 17h4m-4 2h4',
  lanca: 'm3 22 13-15m-4 0 3-5 6-1-1 6-5 3Z',
  chicote: 'm4 21 3-6m-4 4 4 2m0-6c-7-9 11-18 13-8 2 9-14 10-10 3 2-4 8-2 5 1',
  trombeta: 'M3 13c8 0 11-4 14-9l4 12C12 20 9 15 3 16Zm13-7 3 10M6 12v5',
  shield: 'm12 2 8 3-1 10-7 7-7-7L4 5Zm0 4v12m-5-7h10',
  heart: 'M12 21 3 12C-2 4 9 0 12 7c3-7 14-3 9 5Z',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  check: 'm5 12 4 4L19 6',
  turn: 'M5 8a8 8 0 1 1-1 7M5 3v5H1',
  shuffle: 'M3 6h3l12 12h3M3 18h3L18 6h3m-3-3 3 3-3 3m0 6 3 3-3 3',
  walk: 'M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-1 2-2 6 5 3 2 6m-7-9-3 8m5-14 3 5h5M12 7 7 9l-2 5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  moon: 'M19 16A9 9 0 0 1 8 3a9 9 0 1 0 11 13Z',
  book: 'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16',
  coin: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0Zm-9-5v10m-3-8h5l-4 6h5',
  map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Zm6-3v17m8-14v17',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sound: 'm3 9 5 0 5-5v16l-5-5H3Zm13-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16',
  muted: 'm3 9 5 0 5-5v16l-5-5H3Zm13 0 5 6m0-6-5 6',
  fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  target: 'M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0ZM12 0v6m0 12v6M0 12h6m12 0h6',
  dodge: 'M3 7h9m-7 5h5m-7 5h8m3-13 7 8-7 8m7-8H12',
  flask: 'M9 2h6m-5 0v6L5 17c-2 4 1 5 3 5h8c2 0 5-1 3-5l-5-9V2M7 15h10',
  bread: 'M4 19C-4 8 12-2 20 8c3 4 1 7-1 11Zm4-10 3 4m1-7 3 4',
  fish: 'M4 12s6-10 14 0c-8 10-14 0-14 0Zm14 0 4-5v10Zm-10-1h.1',
  drop: 'M12 2S3 11 5 17c2 7 12 7 14 0 2-6-7-15-7-15Zm-4 13c0 3 2 4 4 4',
  scroll: 'M5 3h14c4 0 4 5 0 5H7M5 3c-4 0-4 5 0 5v13h13V8M5 21c-4 0-4-5 0-5m4-5h6m-6 4h5',
  armor: 'm7 2 5 3 5-3 5 5-4 5v10H6V12L2 7Zm5 3v15m-5-8h10',
  helmet: 'M3 16V10c0-12 18-12 18 0v6l-6 5v-8H9v8ZM3 11h18M12 2v7',
  belt: 'M2 8h20v9H2Zm7-2h6v13H9Zm0 6h5',
  boots: 'M6 2h8v12l6 3v5H4v-9Zm0 6h8m-8 4h8',
  relic: 'm12 2 5 7-5 7-5-7Zm-4 12c-8 9 16 9 8 0',
  pet: 'M6 12c-7-4-4-10-1-7 2 1 3 4 1 7Zm12 0c7-4 4-10 1-7-2 1-3 4-1 7Zm-9-3c-5-8 3-11 3-4 0-7 8-4 3 4m-3 3c-4 0-9 8-5 9l5-1 5 1c4-1-1-9-5-9Z',
  fruit: 'M12 8c-7-6-12 4-8 11 2 4 6 2 8 2s6 2 8-2c4-7-1-17-8-11Zm0 0c0-5 2-7 6-6-1 4-3 5-6 6Z',
  seed: 'M12 22V9c-1-7-9-7-9-7 0 8 5 10 9 7Zm0 7c0-7 9-10 9-10 1 8-4 11-9 10Z',
  bowl: 'M2 12h20c-1 12-19 12-20 0Zm4-9c-3 3 3 3 0 6m6-6c-3 3 3 3 0 6m6-6c-3 3 3 3 0 6',
  plus: 'M12 4v16M4 12h16',
  feather: 'M3 22 16 9M8 17C-1 6 14 0 22 2c0 12-6 19-14 15Zm6-6h6m-9 3h6',
  quest: 'M12 3v12m0 5v1',
  chest: 'M3 10V7c0-7 18-7 18 0v3M2 10h20v11H2Zm7 0v5h6v-5M6 3v7m12-7v7',
  trophy: 'M6 2h12v6c0 10-12 10-12 0Zm0 2H2v4c0 4 5 5 6 5m10-9h4v4c0 4-5 5-6 5m-4 2v6m-5 0h10',
  shop: 'M3 9h18l-2-7H5ZM4 10v12h16V10m-11 12v-8h6v8',
  game: 'M6 6h12l4 12c0 5-5 2-7-1H9c-2 3-7 6-7 1Zm0 4v5m-2-2h4m8-2h1m1 3h1',
  chat: 'M3 3h18v13H9l-6 6Zm4 5h10m-10 4h6',
  users: 'M15 6a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM5 22v-4c0-8 14-8 14 0v4M4 5c-4 0-4 6 0 6m-1 3c-4 0-3 7-3 7M20 5c4 0 4 6 0 6m1 3c4 0 3 7 3 7',
  offline: 'M3 3l18 18M3 9c2-2 5-3 9-3 4 0 7 1 9 3M6 13c2-2 10-2 12 0m-9 4c2-1 4-1 6 0m-3 4h.1',
  key: 'M13 7a5 5 0 1 0-10 0 5 5 0 0 0 10 0Zm-1 4 9 9m-5-3 3-3m-1 5 3-3',
  bag: 'M4 8h16l1 14H3Zm4 0V5c0-5 8-5 8 0v3m-9 4h10v7H7Z',
  settings: 'M4 4h16M4 12h16M4 20h16M8 1v6m8 2v6m-6 2v6',
  help: 'M8 7c0-7 12-5 8 1l-4 4v3m0 4v1'
};

export function icon(name, size = 24, label = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:size,height:size,fill:'none',stroke:'currentColor','stroke-width':1.35,'stroke-linecap':'round','stroke-linejoin':'round',class:'art-icon',focusable:'false'}))svg.setAttribute(k,v);
  if(label){svg.setAttribute('role','img');svg.setAttribute('aria-label',label);}else svg.setAttribute('aria-hidden','true');
  const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.spark);svg.append(p);return svg;
}

export function itemIcon(item, id = '', size = 36) {
  if(item?.slot==='arma') {
    const kind=item.palavra?'espada':CLASSES[item.classe]?.arma||'espada';
    const c=h('canvas',{width:size*2,height:size*2,class:'item-art','aria-hidden':'true'}),g=c.getContext('2d');
    c.style.width=size+'px';c.style.height=size+'px';
    g.scale(size/32,size/32);g.translate(23,43);g.rotate(-Math.PI/4);
    const s=kind==='lanca'||kind==='cajado'?.9:1.15;g.scale(s,s);
    drawWeapon(g,kind,kind==='lanca'?29:28,0,item.raridade==='lendario',id);return c;
  }
  return icon(itemSymbol(item,id),size);
}

function itemSymbol(item,id) {
  const slot={escudo:'shield',corpo:'armor',cabeca:'helmet',cinto:'belt',pes:'boots',reliquia:'relic',pet:'pet'};
  const food=/peixe/.test(id)?'fish':/pao|bolo/.test(id)?'bread':/agua|suco/.test(id)?'drop':/mana/.test(id)?'spark':/pergaminho/.test(id)?'scroll':/oleo|mel|leite/.test(id)?'flask':/guisado/.test(id)?'bowl':'fruit';
  return slot[item?.slot]||(item?.tipo==='semente'?'seed':food);
}

const canvasPaths=new Map();
export function drawIcon(g,name,x,y,size=20,color='#D1D5C0') {
  if(!canvasPaths.has(name))canvasPaths.set(name,new Path2D(paths[name]||paths.spark));
  g.save();g.translate(x-size/2,y-size/2);g.scale(size/24,size/24);g.strokeStyle=color;g.lineWidth=1.6;g.lineJoin='round';g.lineCap='round';g.stroke(canvasPaths.get(name));g.restore();
}
export function drawItemIcon(g,item,id,x,y,size=22) {
  if(item?.slot!=='arma')return drawIcon(g,itemSymbol(item,id),x,y,size);
  const kind=item.palavra?'espada':CLASSES[item.classe]?.arma||'espada';
  g.save();g.translate(x-size*.15,y+size*.2);g.scale(size/38,size/38);g.rotate(-Math.PI/4);drawWeapon(g,kind,24,0,item.raridade==='lendario',id);g.restore();
}
