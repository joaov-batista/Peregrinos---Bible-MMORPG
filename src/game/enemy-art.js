import { INK, TAU, shape, line, oval, gradient, glow, shadow, palette, eyes, mask, claw, jointLimb, coin, ribbon } from './creature-primitives.js';
import { creatureMotion } from './sprite-motion.js';

// Heights are for labels only; gameplay collision radii remain in bestiary.js.
const HEIGHT={preguica:27,distracao:38,desanimo:38,inveja:39,ganancia:33,duvida:42,ira:35,medo:44,orgulho:48,vaidade:42};
const ACCENT={preguica:'#A6C9AD',distracao:'#D8B5DA',desanimo:'#9EB9D0',inveja:'#ACCF8B',ganancia:'#E0C28A',duvida:'#C5B0E4',ira:'#F4A17D',medo:'#A0C7D5',orgulho:'#C5B4E3',vaidade:'#A5DDDA'};
export function enemyArtTop(type,r=16){return (HEIGHT[type]||38)*r/16+7;}

const ART={
  preguica(g,t,C,e,m){
    // A low, weighty shell with overlapping stone scales and a dragging tail.
    const b=Math.sin(t*1.8)*.6;
    shape(g,'M-18 10 Q-31 11-29 5 Q-27-1-18-5 L15-1 Q26 2 26 9 L16 14-18 14Z',C.deep);
    for(const sd of [-1,1]){const step=m.phase*5+(sd<0?Math.PI:0);g.save();g.translate(sd*10+Math.sin(step)*m.move*2.4,7-Math.max(0,Math.cos(step))*m.move*2.1);g.rotate(sd*Math.sin(t*2)*.07);shape(g,'M-4-4 Q0-6 4-4 L5 7 Q0 9-4 7Z',C.body);line(g,'M-2 5 0 7 2 5',C.bone,.6);g.restore();}
    g.save();g.translate(0,b);
    shape(g,'M-20 2 Q-22-19-7-23 Q16-27 20-4 L15 8-13 10Z',gradient(g,C.shell,C.deep));
    for(let k=0;k<4;k++){g.save();g.translate(-13+k*8,-12+Math.abs(k-1.5)*2);g.rotate((k-1.5)*.25);shape(g,'M-6-4 Q0-12 6-4 L5 7 0 10-5 7Z',gradient(g,'#9BAF9E','#465D59'));line(g,'M-4-3 Q0-7 4-3','#D4DECA',.7);g.restore();}
    shape(g,'M-9-6 Q0-11 9-6 L8 7 Q0 14-8 7Z',C.bone);
    eyes(g,0,1,3.6,1.45,C,true);line(g,'M-2 7 Q0 8 2 7',INK,.75);
    line(g,'M-8-7 Q-16-19-12-22 M8-7 Q16-19 12-22',C.shell,2);
    oval(g,-12,-22,2,1,C.bone);oval(g,12,-22,2,1,C.bone);g.restore();
  },
  distracao(g,t,C,e){
    const flap=Math.sin(t*7)*.34;
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.rotate(flap);
      shape(g,'M4-11 Q16-33 30-28 Q33-14 19-5 Q29-1 21 10 Q7 12 3-3Z',gradient(g,'#91A1B5','#35475D'));
      shape(g,'M7-12 Q19-25 26-24 Q22-12 9-6Z','#CFCCCF');
      line(g,'M7-8 23-22 M11-10 20-12 M7-3 18 7','#526579',.75);
      oval(g,21,-19,3.1,4.5,INK);oval(g,21,-19,1.5,2.5,C.accent,null);
      shape(g,'M8-2 18 3 14 8 7 4Z','#928EA5');g.restore();}
    ribbon(g,-2,7,17,C,t);ribbon(g,2,7,15,C,t+1,-1);
    shape(g,'M-4-18 Q0-23 4-18 L5 1 0 12-5 1Z',C.deep);
    mask(g,0,-16,.55,C,'beak');
    line(g,'M-4-23 Q-12-34-17-32 M4-23 Q12-34 17-32',C.shell,1.1);
    oval(g,-17,-32,1.2,1.2,C.accent,null);oval(g,17,-32,1.2,1.2,C.accent,null);
  },
  desanimo(g,t,C,e){
    ribbon(g,-5,-15,34,C,t,-1);ribbon(g,4,-14,32,C,t+1);
    shape(g,'M-8-28 Q0-35 8-28 Q9-10 12-8 L15 12 Q9 8 6 9 L0 16 Q-5 9-6 9 L-16 12 Q-12-1-11-8Z',gradient(g,C.shell,C.deep));
    line(g,'M-5-20 Q-9-4-8 10 M4-20 Q5-2 8 10','#697F8B',.7);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);jointLimb(g,'M9-15 Q16-6 16 8',C.body,3);oval(g,16,9,4,4,gradient(g,C.shell,C.deep));line(g,'M14 7 18 11',C.bone,.6);g.restore();}
    shape(g,'M-9-23 Q-11-36 0-36 Q11-36 9-23 L5-16-5-16Z',C.deep);
    mask(g,0,-25,.63,C);
    for(const sd of [-1,1]){const y=-15+(t*.8%1)*9;oval(g,sd*2.8,y,.6,1.6,C.accent,null);}
  },
  inveja(g,t,C,e,m){
    const poised=-m.attack*5+Math.sin(t*2.4)*1.4;
    for(const sd of [-1,1]){const step=m.phase*7+(sd<0?Math.PI:0),lift=Math.max(0,Math.cos(step))*m.move*3;g.save();g.scale(sd,1);jointLimb(g,`M4 0 Q${12+Math.sin(step)*m.move*2} ${8-lift} 15 ${15-lift}`,C.body,2.8);g.translate(Math.sin(step)*m.move, -lift);shape(g,'M12 12 Q15 12 17 14 L16 17 9 16Z',C.bone);g.restore();}
    shape(g,'M0-24 7-14 5-1 0 8-5-1-7-14Z',gradient(g,C.shell,C.deep));
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.translate(0,poised);
      jointLimb(g,'M5-20 14-15 20-25',C.body,3.1);
      shape(g,'M19-26 Q33-26 29-9 Q27-3 21 0 Q27-15 19-20Z',gradient(g,C.bone,'#8FA79B'));
      line(g,'M21-23 Q29-22 27-11','#EDF0D7',.65);g.restore();}
    mask(g,0,-27,.67,C,'wide');
    shape(g,'M-6-31-11-38-4-34 0-40 4-34 11-38 6-31Z',C.bone);
    line(g,'M0-17 0 1 M-3-11 3-11 M-3-7 3-7',C.accent,.65);
  },
  ganancia(g,t,C,e,m){
    for(const sd of [-1,1])for(let k=0;k<3;k++){
      g.save();g.scale(sd,1);g.translate(0,k*5-4-Math.max(0,Math.cos(m.phase*8+k*2+sd))*m.move*2);g.rotate(Math.sin(m.phase*8+k*2+sd)*(.025+m.move*.14));
      jointLimb(g,'M8-1 17 1 21 8',C.body,2.2);line(g,'M17 1 18 5',C.gold,.6);g.restore();
    }
    shape(g,'M-13-10 Q-21-22-5-29 Q18-30 19-9 L12 8-10 8Z',gradient(g,'#7C785C',C.deep));
    shape(g,'M-12-22 Q3-32 15-20 L10-6 0-2-10-6Z',C.gold);
    line(g,'M0-26 0-4 M-9-19 Q0-14 10-19','#DDD0A2',.8);
    shape(g,'M-11-11 Q0-18 10-10 L8 3-3 9-12 0Z',C.deep);
    mask(g,-3,-8,.64,C,'beak');
    shape(g,'M9-5 Q23-11 22 3 Q24 12 12 13 Q5 8 9-5Z','#645B48');
    line(g,'M10-3 Q15 0 21-3 M10 8 20 7',C.gold,.8);coin(g,15,4,3.4,t,C);
  },
  duvida(g,t,C,e){
    const sway=Math.sin(t*2)*1.2;
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.rotate(sway*.025);
      shape(g,'M4-20 13-17 9-1 16 13 6 9 0 17 1-7Z',gradient(g,C.body,C.deep));
      jointLimb(g,'M8-14 17-4 20-11',C.shell,1.8);claw(g,20,-11,1,C,.55);g.restore();}
    g.save();g.translate(-4+sway,-26);g.rotate(-.2);mask(g,0,0,.68,C);g.restore();
    g.save();g.translate(5-sway,-24);g.rotate(.2);mask(g,0,0,.65,C);g.restore();
    g.save();g.translate(0,-24);g.rotate(t*.3);line(g,'M-19-5 A20 20 0 0 1 12-17 M19 2 A20 20 0 0 1-12 17',C.accent,.65);
    shape(g,'M-14-18-10-22-8-17Z',C.bone);shape(g,'M15 12 20 11 18 17Z',C.shell);g.restore();
  },
  ira(g,t,C,e,m){
    const tilt=m.attack*.13+Math.sin(t*2.7)*.025;
    g.save();g.rotate(tilt);
    for(const sd of [-1,1]){const step=m.phase*6+(sd<0?Math.PI:0),lift=Math.max(0,Math.cos(step))*m.move*3;g.save();g.scale(sd,1);jointLimb(g,`M9-1 Q${14+Math.sin(step)*m.move*3} ${9-lift} 18 ${12-lift}`,C.body,5.3);g.translate(Math.sin(step)*m.move*1.4,-lift);shape(g,'M12 10 19 9 Q24 13 22 15 L11 15Z',C.deep);g.restore();}
    shape(g,'M-17 4 Q-25-14-11-22 Q0-28 15-21 Q24-15 17 6Z',gradient(g,'#6D6663',C.deep));
    for(const sd of [-1,1]){g.save();g.scale(sd,1);
      shape(g,'M7-20 Q22-38 29-26 Q36-11 20-10 Q30-18 25-23 Q21-27 14-15Z',gradient(g,C.bone,'#74888B'));
      line(g,'M15-24 18-20 M20-28 22-24 M26-28 26-24','#5E777E',.7);g.restore();}
    mask(g,0,-12,.9,C,'wide');
    shape(g,'M-7-8-3-10 0-6 3-10 7-8 4 4 0 9-4 4Z',C.deep);
    line(g,'M-2-7 0-2-2 2 1 6 M11-18 15-11 12-6 15 1',C.accent,1.2);
    eyes(g,0,-12,4.5,1.8,C);g.restore();
  },
  medo(g,t,C,e){
    const sway=Math.sin(t*2.4)*2;
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.translate(0,sway*sd*.3);
      jointLimb(g,'M6-24 Q25-13 22 3',C.deep,2.2);claw(g,22,3,1,{...C,bone:C.shell},.7);
      ribbon(g,5,-13,34,C,t+sd);g.restore();}
    shape(g,'M0-41 Q-15-34-10-20 L-6 3-12 16-3 10 0 21 5 9 12 13 7-3 10-20 Q15-34 0-41Z',gradient(g,C.shell,C.deep));
    shape(g,'M0-35 Q-8-29-6-19 L0-12 6-19 Q8-29 0-35Z',INK);
    eyes(g,0,-24,2.8,.95,C);
    line(g,'M-9-27 Q-12-21-7-10 M9-27 Q12-21 7-10','#A8BFC3',.55);
    oval(g,0,-7,1.3,2.3,C.accent,null);
  },
  orgulho(g,t,C,e,m){
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.translate(0,Math.sin(m.phase*5+sd)*m.move*2.5);jointLimb(g,'M7 0 Q12 7 9 11 L13 14',C.deep,4);shape(g,'M5 9 12 9 16 15 5 15Z',C.shell);g.restore();}
    shape(g,'M-12-25 Q0-33 12-25 L19-9 14 9 0 14-14 9-19-9Z',gradient(g,C.shell,C.deep));
    for(const sd of [-1,1]){g.save();g.scale(sd,1);
      shape(g,'M5-23 16-28 22-16 16-9 8-11Z',C.bone);line(g,'M11-23 15-17 19-16',C.gold,.8);
      jointLimb(g,'M16-12 20-2 18 5',C.body,3);claw(g,18,5,1,C,.6);g.restore();}
    shape(g,'M-9-17 0-13 9-17 7 1 0 7-7 1Z',C.bone);
    line(g,'M0-11 0 4 M-5-7 0-4 5-7',C.gold,.8);
    mask(g,0,-29,.69,C);
    shape(g,'M-9-33-12-46-5-40 0-49 5-40 12-46 9-33Z',C.gold);
    shape(g,'M-6-35-7-41 0-38 7-41 6-35Z','#DFD5B8',null);
    oval(g,0,-42,1,1.7,C.accent,null);
  },
  vaidade(g,t,C,e){
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.rotate(Math.sin(t*2.6)*.06);
      shape(g,'M2-17 Q15-38 27-34 Q28-27 25-23 L33-23 Q32-14 25-12 L29-6 Q26-1 20-2 L23 8 Q15 9 9 5 L4 15Z',gradient(g,'#7FABA9','#243D4E'));
      for(let k=0;k<3;k++){g.save();g.translate(11+k*5,-3-k*9);g.rotate(.4);oval(g,0,0,3.4,5.6,C.bone);oval(g,0,0,2,3.5,C.deep);oval(g,0,0,.8,2,C.accent,null);g.restore();}
      line(g,'M4 3 Q10-17 22-29','#B9D3C7',.65);g.restore();}
    ribbon(g,-2,-6,29,C,t,-1);ribbon(g,3,-6,25,C,t+1);
    shape(g,'M0-27 6-17 3 6 0 14-3 6-6-17Z',C.deep);
    mask(g,0,-24,.63,C,'long');
    line(g,'M-7-34 Q0-41 7-34',C.gold,.9);
    oval(g,0,-35,2,2,C.accent,INK,.5);
  }
};

export function drawEnemy(g,e,d,T=0,px=e.x,py=e.y) {
  const r=e.r||d?.r||16,t=T+(e.ph||0),C=palette(ACCENT[e.type]||d?.cor||'#B8CFCE',e.flash>0);
  const m=e.artMotion||creatureMotion(e,T);
  g.save();g.translate(e.x,e.y);g.scale(r/16,r/16);g.lineCap='round';g.lineJoin='round';
  shadow(g,17,4,15);
  if(e.telegraph>0){
    const pulse=.55+.2*Math.sin(T*24);g.save();g.globalAlpha*=pulse;
    oval(g,0,12,19,5,null,'#F1BE8E',1.3);
    shape(g,'M-3 20 0 17 3 20 M-3-9 0-6 3-9',null,'#F1BE8E',1.1);g.restore();
  }
  const bob=e.stun>0?0:e.type==='distracao'?-3-Math.sin(t*3)*2.8:Math.sin(t*1.9)*.9-Math.sin(m.phase*7)**2*m.move;
  g.translate(Math.sin(t*1.35)*.35,bob+10);g.rotate(Math.sin(m.phase*5)*m.move*.035+Math.sin(t*1.3)*.012);g.translate(0,-10);
  const breath=e.stun>0?0:Math.sin(t*2);g.scale(1+breath*.012,1-breath*.009);
  if(e.type==='medo')g.globalAlpha*=.68+.2*Math.sin(t*2);
  (ART[e.type]||ART.medo)(g,t,C,e,m);
  g.restore();
}
