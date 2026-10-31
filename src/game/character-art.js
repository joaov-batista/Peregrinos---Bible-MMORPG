// Arte vetorial original: tinta, tecido e luz lunar. A arma usa a mesma
// articulação da mão em TODAS as telas; (0, 0) da arma é o centro da empunhadura.
import { ell, TAU } from '../util.js';

const INK = '#10151F', GOLD = '#BAAA7B', STEEL = '#B9CCD2';
const BODY = {
  medio: [1, 1], magro: [.83, 1.04], forte: [1.14, 1.02],
  robusto: [1.25, .96], baixo: [.95, .86], alto: [.94, 1.13]
};
const LENGTH = { espada: 30, adaga: 18, lanca: 37, cajado: 32, funda: 23, trombeta: 23, chicote: 25 };
const tone = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount).toString(16).padStart(2, '0')).join('');
};
function path(g, points, color, stroke = INK, width = .7) {
  g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.fillStyle = color; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
}
function line(g, points, color, width = .65) {
  g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.strokeStyle = color; g.lineWidth = width; g.stroke();
}
function oval(g, x, y, rx, ry, color, border = INK, width = .6) {
  ell(g, x, y, rx, ry); g.fillStyle = color; g.fill();
  if (border) { g.strokeStyle = border; g.lineWidth = width; g.stroke(); }
}
function cloth(g, points, color) {
  const gr = g.createLinearGradient(-12, -30, 14, 8);
  gr.addColorStop(0, tone(color, .17)); gr.addColorStop(.35, color); gr.addColorStop(1, tone(color, -.4));
  g.beginPath();
  // Small rounded joins give folds a drawn contour, instead of a cut-paper edge.
  points.forEach(([x,y],i)=>{
    const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
    const a=[x+(prev[0]-x)*.22,y+(prev[1]-y)*.22],b=[x+(next[0]-x)*.22,y+(next[1]-y)*.22];
    if(i)g.lineTo(...a);else g.moveTo(...a);g.quadraticCurveTo(x,y,...b);
  });g.closePath();g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=.7;g.stroke();
}

// Public rig data also makes attachment checks possible without a canvas.
export function getPersonPose(look = {}, st = {}) {
  const [width, height] = BODY[look.body] || BODY.medio;
  const fx = st.fx || 0, fy = st.fy ?? 1, back = fy < -.55;
  const side = back ? -1 : fx < -.6 ? -1 : 1;
  const phase=(st.walk||0)*10.5, movement=st.moveBlend??(st.moving?1:0),breath=Math.sin((st.t||0)*1.75);
  const stride = Math.sin(phase)*movement;
  const bob = -(1-Math.cos(phase*2))*.48*movement + breath*.42*(1-movement*.4);
  const lean=fx*movement*.035+stride*.035+breath*.007;
  const w = width * (1 - Math.abs(fx) * .18);
  const attacking = (st.atkT || 0) > 0 || st.attacking;
  const kind = st.weapon;
  let angle = (kind === 'funda' || kind === 'chicote') ? .9 * side : kind === 'trombeta' ? -.45 : -Math.PI / 2 + side * .23;
  if (side < 0 && kind === 'trombeta') angle = -Math.PI + .45;
  if (attacking) {
    const duration={adaga:.14,lanca:.2,funda:.18,cajado:.2,trombeta:.25,chicote:.25}[kind]||.22;
    const progress = Math.max(0, Math.min(1, 1 - (st.atkT ?? .12) / duration));
    const aim = st.swingA ?? Math.atan2(fy, fx);
    const dir = st.combo === 2 ? -1 : 1;
    const eased=progress*progress*(3-2*progress);
    angle = (kind === 'espada' || kind === 'adaga') ? aim + (-1.15 + 2.45 * eased) * dir : aim;
  }
  if (st.spin > 0) angle = (st.t || 0) * 26;
  const shoulder = { x: side * 7.4 * w, y: -28+stride*side*.6 };
  const hand = attacking || st.spin > 0
    ? { x: shoulder.x + Math.cos(angle) * 10, y: -21 + Math.sin(angle) * 9 }
    : { x: side * 12.5 * w + Math.sin(phase-.45)*movement*1.45+breath*.35, y: -13 - stride * 1.7+breath*.4 };
  const elbow = { x: shoulder.x * .45 + hand.x * .55 + side * 1.1, y: (shoulder.y + hand.y) / 2 + 1.8 };
  if(!attacking&&!(st.spin>0))angle+=Math.sin(phase-.7)*movement*.075+breath*.025;
  return { width: w, height, side, back, stride, bob, angle, shoulder, elbow, hand, attacking,phase,movement,lean,breath };
}

export function drawWeapon(g, kind, len = LENGTH[kind] || 28, glow = 0, legendary = false, material = '') {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const wood = /madeira|pastor/.test(material), bronze = /bronze/.test(material);
  const blade = wood ? '#A27C50' : bronze ? '#C1A06B' : legendary ? '#F1E8C8' : STEEL;
  const dark = tone(blade, -.42);
  if (glow && legendary) { g.shadowColor = '#CDE7ED'; g.shadowBlur = Math.min(10, glow); }
  if (kind === 'espada' || kind === 'adaga') {
    const bw = kind === 'adaga' ? 2.1 : 2.5;
    path(g, [[4,-bw],[len-5,-bw*.72],[len+1,0],[len-5,bw*.72],[4,bw]], blade);
    path(g, [[5,0],[len+1,0],[len-5,bw*.72],[5,bw]], dark, null);
    line(g, [[6,-bw+.5],[len-5,-bw*.72+.4],[len,0]], tone(blade,.65), .55);
    line(g, [[7,0],[len-6,0]], tone(blade,-.16), .5);
    g.shadowBlur = 0;
    path(g, [[3,-5],[5,-4],[5,4],[3,5],[2,4],[3,2],[3,-2],[2,-4]], GOLD);
    path(g, [[-5,-1.4],[3,-1.4],[3,1.4],[-5,1.4]], '#4C3B31');
    for (let x = -4; x < 3; x += 1.6) line(g, [[x,-1.3],[x+.7,1.3]], '#998167', .4);
    oval(g, -5.7, 0, 1.6, 2.1, GOLD);
  } else if (kind === 'lanca' || kind === 'cajado') {
    line(g, [[-19,0],[len-4,0]], INK, 3.3);
    line(g, [[-19,0],[len-4,0]], '#775C40', 2.1);
    line(g, [[-17,-.5],[len-5,-.5]], '#B29770', .55);
    for (let x = -3; x < 4; x += 1.3) line(g, [[x,-1.1],[x,1.1]], '#CCB993', .6);
    if (kind === 'lanca') {
      path(g, [[len-9,0],[len-1,-3.1],[len+9,0],[len-1,3.1]], blade);
      path(g, [[len-8,0],[len+9,0],[len-1,3.1]], dark, null);
      line(g, [[len-9,-1.8],[len-9,1.8]], GOLD, 2);
    } else {
      g.beginPath(); g.moveTo(len-7,0); g.bezierCurveTo(len+6,1,len+7,-10,len-1,-9); g.bezierCurveTo(len-6,-8,len-4,-3,len-1,-3);
      g.strokeStyle = INK; g.lineWidth = 4; g.stroke(); g.strokeStyle = '#A58B60'; g.lineWidth = 2.5; g.stroke();
      oval(g, len-1,-5.3,1.8,2.1, legendary ? '#F4E7B2' : '#A9D1CB');
      line(g, [[len-8,-2],[len-8,2]], GOLD, 1.2);
    }
  } else if (kind === 'funda') {
    g.beginPath(); g.moveTo(-1,-1); g.quadraticCurveTo(len*.55,-7,len,0); g.quadraticCurveTo(len*.55,7,-1,1);
    g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.strokeStyle = '#B8A17A'; g.lineWidth = 1.4; g.stroke();
    oval(g,len-1,0,4.2,2.8,'#654D3B'); oval(g,len-1,-.6,2.5,1.6,'#A9ABA1',null);
    line(g, [[-4,1],[1,-1]], '#BCA57D', 1.4);
  } else if (kind === 'chicote') {
    line(g,[[-5,0],[6,0]],INK,3.5); line(g,[[-5,0],[6,0]],'#785940',2.2);
    for(let x=-4;x<5;x+=1.5) line(g,[[x,-1],[x+.7,1]],GOLD,.4);
    g.beginPath(); g.moveTo(6,0); g.bezierCurveTo(len,-8,len+9,15,len-2,17); g.bezierCurveTo(7,20,6,8,16,8); g.bezierCurveTo(24,8,26,13,22,14);
    g.strokeStyle=INK;g.lineWidth=2.6;g.stroke();g.strokeStyle='#B49870';g.lineWidth=1.3;g.stroke();
  } else if (kind === 'trombeta') {
    g.beginPath();g.moveTo(-4,-1.8);g.bezierCurveTo(7,-2,13,-2,len,-9);g.lineTo(len+3,5);g.bezierCurveTo(11,9,9,3,-4,1.8);g.closePath();
    g.fillStyle='#C7B888';g.fill();g.strokeStyle=INK;g.lineWidth=.8;g.stroke();
    g.beginPath();g.moveTo(0,-.6);g.quadraticCurveTo(13,1,len,-6);g.strokeStyle='#ECE1BB';g.lineWidth=1;g.stroke();
    oval(g,len+1,-2,2.2,7,'#74694F'); line(g,[[4,-1.8],[4,3]],GOLD,1.4);
  }
  g.restore();
}

function head(g, look, st, back, fx) {
  const skin = look.skin || '#C68B59', hair = look.hair || '#302B29', style = look.style || 'curto';
  const hy = -39, hx = fx * 1.3, covered = style === 'veu' || style === 'turbante';
  g.save(); g.translate(hx,hy);g.rotate(st.headTilt||0);
  if (['longo','trancas','rabo','veu'].includes(style)) {
    cloth(g,[[-5,-3],[-5.8,7],[-3.7,11],[0,7],[4.8,10],[5.6,-3]],covered ? '#A8B8BC' : hair);
    if(style==='trancas') for(const sd of [-1,1]) for(let k=0;k<5;k++) oval(g,sd*4.6,2+k*1.6,1.1,1.2,tone(hair,k%2?.12:0));
    if(style==='rabo') cloth(g,[[3,-3],[7,-1],[6,10],[3,6],[4,0]],hair);
  }
  // Jaw and small eye sockets keep the face readable at world scale.
  oval(g,-4.6,0,1,1.8,skin);oval(g,4.6,0,1,1.8,skin);
  g.beginPath();g.moveTo(-4.4,-3.3);g.bezierCurveTo(-4.7,-7,4.6,-7,4.5,-3.4);g.lineTo(4.1,1.7);g.quadraticCurveTo(3.5,4.7,.3,5.7);g.quadraticCurveTo(-3.3,5,-4.1,2);g.closePath();
  g.fillStyle=back&&style!=='careca'?hair:skin;g.fill();g.strokeStyle=INK;g.lineWidth=.7;g.stroke();
  if(!back) {
    path(g,[[1,-3],[3.8,-2],[3.6,2],[1.2,4],[0,2]],tone(skin,-.18),null);
    const eyeY = .2, blink = ((st.t||0)+1.3)%5.1 < .1;
    for(const sd of [-1,1]) {
      if(Math.abs(fx)>.8 && sd===-Math.sign(fx)) continue;
      const ex=sd*2.05+fx*.65;
      line(g,[[ex-1,-1],[ex+.9,-1.1]],tone(hair,-.3),.65);
      oval(g,ex,eyeY,.8,blink?.16:.64,INK,null);
      if(!blink) oval(g,ex-.2,eyeY-.18,.18,.18,'#EDEBD9',null);
    }
    line(g,[[fx*.6,.3],[.7+fx*.7,2],[fx*.7,2.3]],tone(skin,-.32),.45);
    line(g,[[-1.1,3.6],[1,3.6]],tone(skin,-.43),.45);
    if(look.beard) {
      cloth(g,[[-4,1],[-2.7,3],[-1,2.7],[0,3.1],[1.5,2.6],[3.8,1],[3.3,5.2],[0,7.4],[-3.3,5]],hair);
      line(g,[[-1.1,3.5],[1.1,3.5]],tone(skin,.05),.45);
      for(const x of [-2,0,2]) line(g,[[x,4.5],[x*.7,6]],tone(hair,.15),.35);
    }
  }
  if(style!=='careca') {
    if(style==='turbante' || style==='veu') {
      cloth(g,[[-5.1,1],[-5.8,-4],[-3.5,-7],[2.2,-7.4],[5.4,-4.4],[5,3],[3.8,-2],[-1,-3.5],[-4.4,-2]],'#A9B9B9');
      line(g,[[-4.3,-4.4],[1,-5.6],[4.3,-4]],'#E1E3D4',.7);
      if(style==='turbante') {line(g,[[-4.6,-2.6],[4.4,-5]],'#6C8388',.7);oval(g,2.5,-3.7,.8,1,GOLD);}
    } else if(!back) {
      let points=[[-4.8,1],[-5,-4],[-3,-6.8],[1.8,-7],[4.8,-4.6],[4.7,.4],[3.3,-2.8],[1,-3.6],[-2.8,-2.5],[-3.9,-1]];
      if(style==='franja') points=[[-4.7,1],[-5,-4],[-2,-7],[3,-6],[5,-3],[4,1],[1,-1],[2,-3],[-2,0],[-3,-1]];
      if(style==='espetado') points=[[-5,0],[-5,-4],[-6,-6],[-3,-5],[-2,-9],[0,-6],[3,-8],[3.4,-5],[5,-6],[4.7,1],[3,-3],[-3,-3]];
      cloth(g,points,hair);
      line(g,[[-3.8,-4],[0,-5.5],[2.5,-5]],tone(hair,.25),.55);
    }
    if(style==='cacheado' || style==='black') {
      for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;oval(g,Math.cos(a)*4.2,-2.5+Math.sin(a)*(style==='black'?5.4:3.3),style==='black'?2.1:1.4,style==='black'?2.1:1.4,tone(hair,i%3*.05));}
    }
    if(style==='coque') oval(g,back?1:0,-7.5,2.3,2.4,hair);
  }
  if(st.helmet) {
    cloth(g,[[-5,0],[-5,-4],[-3,-6.8],[2,-7],[5,-4.3],[5,0],[3,-2.4],[-3,-2.4]],st.helmet);
    line(g,[[-4.5,-2.5],[4.5,-2.5]],GOLD,.8);line(g,[[0,-6.8],[0,-2.5]],tone(st.helmet,.4),1);
  }
  g.restore();
}

export function drawPerson(g, x, y, scale = 1, look = {}, st = {}) {
  const p = st.pose||getPersonPose(look,st), {width:w,height,side,back,stride,bob,phase,movement,lean,breath} = p;
  const t=st.t||0, tunic=look.tunic||'#526C78', cape=look.cape&&look.cape!=='none'?look.cape:null;
  const skin=look.skin||'#C68B59', leather='#51463C', boots=st.boots||'#343D42';
  const sway=Math.sin(t*1.6)*1.2+Math.sin(phase-.9)*movement*3.4-(st.fx||0)*movement*1.8, robe=st.cls==='profeta'||st.cls==='levita';
  g.save();g.translate(x,y);g.scale(scale,scale);g.lineJoin='round';g.lineCap='round';
  if(!st.noShadow) oval(g,0,12,14*w,3.1,'rgba(3,8,15,.35)',null);
  g.translate(0,12*(1-height));g.scale(1,height);
  if(look.anjo) {
    for(const sd of [-1,1]) for(let j=0;j<8;j++) {
      const reach=29-j*2.2;cloth(g,[[sd*5,-27],[sd*(reach+Math.sin(t)*2),-47+j*3],[sd*(reach-2),-30+j*3],[sd*6,-12]],j%2?'#AEBEC8':'#D7DDD5');
    }
  }
  // Cape is behind the limbs; its hem follows the walk, never hides the hand.
  const drawCape=()=>{
    if(!cape)return;
    const end=st.cls==='zelote'?-4:4;
    const grad=g.createLinearGradient(-12,-25,14,8);grad.addColorStop(0,tone(cape,.22));grad.addColorStop(.4,cape);grad.addColorStop(1,tone(cape,-.38));
    g.beginPath();g.moveTo(-6*w,-30);g.quadraticCurveTo(-11*w,-22,-10*w,-12);g.bezierCurveTo(-10*w,-6,-15*w+sway,end,-16*w+sway,end+2);g.quadraticCurveTo(-11*w+sway,end-1,-8*w+sway,end+1);g.quadraticCurveTo(-3+sway,end+5,0,end+2);g.quadraticCurveTo(8*w+sway,end+6,14*w+sway,end+1);g.bezierCurveTo(10*w,-9,12*w,-22,6*w,-30);g.closePath();g.fillStyle=grad;g.fill();g.strokeStyle=INK;g.lineWidth=.85;g.stroke();
    for(const k of [-1,-.45,.4,1]){g.beginPath();g.moveTo(k*5*w,-26);g.bezierCurveTo(k*9*w,-17,k*5*w+sway,-5,k*12*w+sway,end+1);g.strokeStyle=tone(cape,k<0?.2:-.3);g.lineWidth=.55;g.stroke();}
    g.beginPath();g.moveTo(-14*w+sway,end+1);g.quadraticCurveTo(-9*w,end-1,-5*w+sway,end+2);g.quadraticCurveTo(0,end+4,2,end+1);g.quadraticCurveTo(8*w,end+4,12*w+sway,end+1);g.strokeStyle=tone(cape,.33);g.lineWidth=.55;g.stroke();
  };
  if(!back) drawCape();
  for(const sd of [-1,1]) {
    const step=stride*sd, hip=sd*3.5*w, lift=Math.max(0,Math.cos(phase+(sd<0?Math.PI:0)))*movement*3.7;
    const foot=hip+step*(2.5+Math.abs(st.fx||0)*1.2),knee=1-lift*.45,footY=11-lift;
    const kx=hip+step*2.7;
    line(g,[[hip,-7],[kx,knee],[foot,footY-1]],INK,5.6);
    line(g,[[hip,-7],[kx,knee],[foot,footY-1]],'#687077',4.2);
    line(g,[[kx,knee+1],[foot,footY]],boots,4.8);
    g.save();g.translate(foot,footY);g.rotate(step*.12);
    path(g,[[-2,-1],[2,-1],[3+(st.fx||0),1],[-2.2,1]],boots);
    line(g,[[-1.5,-4],[1.6,-4]],'#938B76',.55);g.restore();
  }
  g.translate(stride*.4,bob-14);g.rotate(lean);g.scale(1+breath*.009,1+breath*.005);g.translate(0,14);
  const arm=(weaponArm)=>{
    const sd=weaponArm?side:-side;
    const shoulder=weaponArm?p.shoulder:{x:sd*7.4*w,y:-28};
    const hand=weaponArm?p.hand:{x:sd*11*w-stride*1.3,y:st.guard?-20:-12+stride*2};
    const elbow=weaponArm?p.elbow:{x:sd*10.5*w,y:-20};
    line(g,[[shoulder.x,shoulder.y],[elbow.x,elbow.y],[hand.x,hand.y]],INK,5.5);
    line(g,[[shoulder.x,shoulder.y],[elbow.x,elbow.y]],tone(tunic,sd<0?.12:-.16),4.3);
    line(g,[[elbow.x,elbow.y],[hand.x,hand.y]],skin,3.4);
    line(g,[[elbow.x*.35+hand.x*.65,elbow.y*.35+hand.y*.65],[hand.x,hand.y]],leather,4.2);
    if(weaponArm&&st.weapon) {
      g.save();g.translate(hand.x,hand.y);g.rotate(p.angle);
      drawWeapon(g,st.weapon,LENGTH[st.weapon],p.attacking?5:0,st.legendary,st.weaponId);
      // Knuckles overlay the actual grip. No independent world-space weapon.
      oval(g,0,0,1.65,2,skin);line(g,[[-.8,-.8],[.7,-.8]],tone(skin,-.25),.4);
      g.restore();
    } else oval(g,hand.x,hand.y,1.8,2.1,skin);
  };
  if(back)arm(true);else arm(false);
  const hem=robe?6:-5;
  cloth(g,[[-7.3*w,-30],[-8*w,-20],[-6*w,-14],[-9*w,hem],[-2*w,hem+1],[0,hem-3],[2*w,hem+1],[9*w,hem],[6*w,-14],[8*w,-20],[7.3*w,-30]],tunic);
  for(const sd of [-1,1])line(g,[[sd*3*w,-22],[sd*3.6*w,-13],[sd*5.5*w,hem-1]],tone(tunic,sd<0?.28:-.32),.6);
  path(g,[[-2,-33],[2,-33],[2.7,-29],[0,-26],[-2.7,-29]],skin);
  path(g,[[-6*w,-30],[-2.5,-30],[0,-26],[2.5,-30],[6*w,-30],[5,-27],[0,-23],[-5,-27]],tone(tunic,.3));
  if(st.armor || st.cls==='guerreiro' || st.cls==='valente') {
    const armor=st.armor||'#535E61';
    cloth(g,[[-6.6*w,-27],[-2,-25],[2,-25],[6.6*w,-27],[6*w,-16],[0,-13],[-6*w,-16]],armor);
    line(g,[[0,-24],[0,-15]],tone(armor,.45),.7);
    for(const sd of [-1,1]){
      cloth(g,[[sd*5*w,-29],[sd*9*w,-29],[sd*10.5*w,-25],[sd*6*w,-24]],armor);
      line(g,[[sd*6*w,-28],[sd*8.6*w,-28],[sd*9.4*w,-26]],tone(armor,.45),.65);
    }
  }
  // Belt and diagonal baldric articulate the waist and chest.
  path(g,[[-6.2*w,-14],[6.2*w,-14],[6.5*w,-11.5],[-6.5*w,-11.5]],leather);
  if(!back) {
    line(g,[[-5.6*w,-29],[5*w,-14]],INK,3);line(g,[[-5.6*w,-29],[5*w,-14]],'#796650',2.1);
    path(g,[[-1.4,-14.1],[1.4,-14.1],[1.4,-11.2],[-1.4,-11.2]],GOLD);path(g,[[-.7,-13.4],[.7,-13.4],[.7,-11.9],[-.7,-11.9]],leather,null);
    cloth(g,[[-7*w,-13],[-3.5*w,-12],[-3.8*w,-6],[-7.4*w,-6]],'#77664E');
    line(g,[[-7*w,-11],[-4*w,-10]],GOLD,.5);
    if(st.cls==='pastor') {
      cloth(g,[[-8*w,-18],[-3*w,-17],[-3.3*w,-9],[-8.5*w,-8]],'#7E6B51');
      line(g,[[-8*w,-16],[-5.5*w,-14],[-3.3*w,-15]],'#CAB184',.6);
    }
    if(st.cls==='levita') {
      for(const sd of [-1,1]){cloth(g,[[sd*2.6,-29],[sd*4.6,-29],[sd*4.3,-3],[sd*2.3,-2]],'#B8BBA8');line(g,[[sd*2.5,-5],[sd*4.2,-5]],GOLD,.8);}
    }
    if(st.cls==='juiz') {
      g.beginPath();g.moveTo(-5,-13);g.quadraticCurveTo(10,-3,6,-12);g.strokeStyle='#AC9A78';g.lineWidth=.9;g.stroke();
    }
  }
  if(back) {drawCape();arm(false);} else arm(true);
  if(cape) {
    cloth(g,[[-7.5*w,-31],[-3,-31],[0,-28],[3,-31],[7.5*w,-31],[6*w,-27],[2,-27],[0,-25],[-3,-27],[-6*w,-27]],tone(cape,.15));
    if(!back)oval(g,2.5,-28,.9,1.1,GOLD);
  }
  head(g,look,{...st,headTilt:-lean*.55},back,st.fx||0);
  if(st.shield || st.guard) {
    const sx=-side*(st.guard?7:11)*w-stride*1.3, sy=st.guard?-20:-11+stride*2, color=st.shieldColor||'#625644';
    g.save();g.translate(sx,sy);g.rotate(-stride*.07);
    path(g,[[-6,-7],[0,-8],[6,-7],[5,3],[0,7],[-5,3]],color,INK,1);
    path(g,[[-4.7,-5.9],[0,-6.7],[4.7,-5.9],[3.8,2.4],[0,5.4],[-3.8,2.4]],tone(color,-.12),GOLD,.65);
    line(g,[[0,-5],[0,4]],GOLD,.7);line(g,[[-3,-1],[3,-1]],GOLD,.7);oval(g,0,-1,1.3,1.3,STEEL);
    if(st.guardPerfect){g.strokeStyle='#DDEEEB';g.lineWidth=1.2;ell(g,0,-1,10,12);g.stroke();}
    g.restore();
  }
  if(look.anjo){g.strokeStyle='#E7D9A9';g.lineWidth=.8;ell(g,0,-49,7,1.6);g.stroke();}
  g.restore();
}
