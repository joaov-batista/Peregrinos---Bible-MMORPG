import { INK, TAU, shape, line, oval, gradient, glow, shadow, palette, eyes, mask, claw, jointLimb, coin, chain, ribbon } from './creature-primitives.js';
import { creatureMotion } from './sprite-motion.js';

const TOP={mamom:83,procrastinacao:72,mentira:91,imoralidade:78,satanas:119,behemote:79,golias:100,leviata:98,pecado:91,generico:82};
const ACCENT={mamom:'#E7CA85',procrastinacao:'#A5CDCE',mentira:'#CAB7E3',imoralidade:'#E8A8BC',satanas:'#EE927E',behemote:'#D5BA88',golias:'#E5C58A',leviata:'#96DBE0',pecado:'#EF6981'};
export function bossArtTop(id,r=40){return (TOP[id]||TOP.generico)*r/40+9;}

function crown(g,C){
  shape(g,'M-19-5-24-25-13-18-8-31 0-20 8-31 13-18 24-25 19-5Z',gradient(g,'#DACBA3','#776E50'));
  line(g,'M-16-9 H16 M-17-13-19-21 M17-13 19-21','#F0DFC0',.9);
  for(const x of [-11,0,11])oval(g,x,-11,1.8,2.8,x===0?C.accent:'#758882',INK,.7);
}
function robe(g,C,t,width=1){
  g.save();g.scale(width,1);
  const hem=Math.sin(t*1.6-.6)*2.2;
  shape(g,`M-12-36 Q-27-13-33 17 L${-40+hem} 36 Q${-26+hem} 26 ${-22+hem} 40 Q${-13+hem} 32 ${-8+hem} 43 L0 31 ${9-hem} 43 Q${17-hem} 29 ${24-hem} 39 L${39-hem} 32 Q29 4 25-13 L12-36Z`,gradient(g,C.body,C.deep));
  for(const sd of [-1,1]){g.save();g.scale(sd,1);line(g,'M8-28 Q14-5 10 27 L16 34 M15-24 Q22 4 27 28','#677C89',.9);ribbon(g,21,-6,46,C,t+sd);g.restore();}g.restore();
}
function shoulder(g,C){
  shape(g,'M4-36 Q14-44 24-41 Q36-36 39-28 L34-14 Q24-11 15-13Z',gradient(g,C.bone,'#829595'));
  line(g,'M12-33 Q24-41 33-28 L29-22','#EDF0E1',1);
  shape(g,'M23-34 29-28 22-23 17-28Z',C.deep);oval(g,23,-28,1.6,2.2,C.accent,null);
}
function featherWing(g,t,C,side,scale=1){
  g.save();g.scale(side*scale,scale);g.translate(14,-29);g.rotate(Math.sin(t*1.5)*.085);
  shape(g,'M0 1 Q36-69 105-66 Q83-50 85-35 L93-32 72-20 80-9 58-6 63 8 43 2 40 21 25 8 17 28 4 13Z',gradient(g,'#4C5969',C.deep));
  line(g,'M3-2 Q39-51 96-61','#8F9FAD',1.05);
  for(let k=0;k<6;k++){
    g.save();g.translate(10+k*12,-2-k*7);g.rotate(-.5+k*.04+Math.sin(t*1.5-k*.23)*.06);
    shape(g,'M0-2 Q6-11 12-10 Q7 7 7 22 L3 31 Q3 24 1 18 L-3 25 Q0 7 0-2Z',gradient(g,k%2?'#5A6676':'#71818A',C.deep));
    line(g,'M5-5 3 17','#AAB8B7',.55);g.restore();
  }
  g.restore();
}

const ART={
  mamom(g,t,C,b){
    // Vault king: segmented coffer abdomen, grasping hands and a suspended crown.
    for(let i=0;i<5;i++){const a=t*.7+i*TAU/5;if(Math.sin(a)<0)coin(g,Math.cos(a)*55,Math.sin(a)*12-7,4,a,C);}
    robe(g,{...C,body:'#37414A'},t,1.18);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.translate(23,-35);g.rotate(Math.sin(t*1.6+sd)*.045);g.translate(-23,35);
      chain(g,[[23,-35],[42,-21],[49,4]],C);
      jointLimb(g,'M25-25 Q44-16 43 11',C.body,8);
      shape(g,'M34-1 49-2 50 7 35 9Z',C.gold);claw(g,42,12,1,C,1.3);
      shoulder(g,{...C,bone:'#B1A27B'});g.restore();}
    shape(g,'M-26-31 Q0-42 26-31 L32 11 Q25 36 0 39 Q-25 36-32 11Z',gradient(g,'#A89C73','#3F4B4D'));
    shape(g,'M-22-22 Q0-30 22-22 L24 12 Q15 27 0 30 Q-15 27-24 12Z',C.deep);
    for(let i=0;i<5;i++){const y=-16+i*9;line(g,`M-23 ${y} Q0 ${y+9} 23 ${y}`,C.gold,2);}
    line(g,'M-17-26 Q-20 9-15 25 M17-26 Q20 9 15 25','#D2C49D',1.1);
    oval(g,0,5,9,12,C.gold);oval(g,0,3,2.6,3.2,INK,null);shape(g,'M-1 5-3 12H3L1 5Z',INK,null);
    mask(g,0,-46,1.15,C,'wide');
    shape(g,'M-8-39 Q0-35 8-39 L5-31-5-31Z',INK);
    for(let k=0;k<3;k++){const y=-34+((t*.5+k/3)%1)*14;oval(g,-4+k*4,y,1.1,2,C.accent,null);}
    g.save();g.translate(0,-55);crown(g,C);g.restore();
    for(let i=0;i<5;i++){const a=t*.7+i*TAU/5;if(Math.sin(a)>=0)coin(g,Math.cos(a)*55,Math.sin(a)*12-7,4,a,C);}
  },
  procrastinacao(g,t,C,b){
    // The snail carries a worn astrolabe, with mineral ribs and moss tendrils.
    shape(g,'M-54 23 Q-45 7-29 11 Q-11 13 12 9 Q39 3 56 26 Q39 37 5 33 L-20 36Z',gradient(g,C.shell,C.deep));
    line(g,'M-42 27 Q-21 22 2 28 T47 29','#718C91',1);
    oval(g,4,-14,39,41,gradient(g,'#879B9A','#324B59'),INK,1.5);
    for(let i=0;i<10;i++){const a=i*TAU/10;g.save();g.translate(4,-14);g.rotate(a);shape(g,'M28-6 38-10 45 0 38 9 29 6Z',gradient(g,C.bone,'#7C918E'));line(g,'M37-5 40 0 37 5','#DCE2D1',.75);g.restore();}
    oval(g,4,-14,31,33,C.gold,INK,1.1);oval(g,4,-14,28,30,gradient(g,'#CDD6C7','#7E9794'));
    for(let i=0;i<12;i++){const a=i*TAU/12;g.save();g.translate(4,-14);g.rotate(a);line(g,'M0-23V-27',C.deep,i%3===0?1.7:.85);g.restore();}
    line(g,'M17-39 11-29 15-19 9-10 14-3 M-16-28-9-23-12-14',C.deep,1);
    g.save();g.translate(4,-14);g.rotate(t*.22);line(g,'M0 0 0-16',C.deep,2.1);g.restore();
    g.save();g.translate(4,-14);g.rotate(t*1.6);line(g,'M0 0 0-23',C.deep,1.1);g.restore();oval(g,4,-14,3,3,C.accent);
    for(const sd of [-1,1]){g.save();g.translate(-35,0);g.scale(sd,1);line(g,'M-4-5 Q-19-29-23-25',C.body,2.2);oval(g,-23,-25,2.8,2,C.bone);g.restore();}
    shape(g,'M-51 5 Q-49-17-35-12 Q-22-11-24 9 L-17 20 Q-32 27-48 20Z',C.body);
    mask(g,-38,3,.9,C,'wide');eyes(g,-38,2,4,1.5,C,true);
    for(let i=0;i<4;i++){g.save();g.translate(18+i*7,-44+i*3);g.rotate(i*.3);line(g,'M0 0 Q5 10 2 15','#8DA58C',1.2);shape(g,'M2 6 Q-7 1-6 8 Q-2 12 2 6 M3 12 Q11 7 10 13 Q6 17 3 12Z','#718F80');g.restore();}
  },
  mentira(g,t,C,b,m){
    // A porcelain marionette: paired floating masks, thin joints, a split face.
    for(const sd of [-1,1]){g.save();g.scale(sd,1);ribbon(g,8,-42,82,C,t+sd);g.restore();}
    robe(g,{...C,body:'#4B4A65'},t,.77);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);const lift=-m.attack*8+Math.sin(t*2+sd)*2;
      g.translate(0,lift);jointLimb(g,'M11-34 Q30-30 30-7 L39-18',C.shell,3);
      oval(g,30,-7,2.8,2.8,C.bone);claw(g,39,-18,1,C,.65);
      line(g,'M39-17 43-41',C.gold,.5);g.save();g.translate(44,-49);g.rotate(sd*.26);mask(g,0,0,.56,C);g.restore();g.restore();}
    shape(g,'M-12-37-19-49-11-52 0-43 11-52 19-49 12-37 0-31Z',C.bone);
    shape(g,'M-12-65 Q0-76 12-65 L10-43 0-34-10-43Z',gradient(g,'#E5E5D8','#A9B5AE'));
    shape(g,'M0-71 Q6-70 12-65 L10-43 0-34Z','#667689',null);
    line(g,'M0-70-2-59 1-52-2-41 0-35',INK,1);
    shape(g,'M-10-58 Q-6-64-3-59 Q-6-56-10-58Z',INK,null);
    shape(g,'M3-59 Q7-63 10-58 L7-55Z',C.bone,null);
    oval(g,-6,-59,1.1,.6,C.accent,null);oval(g,7,-58,1,1,C.accent,null);
    line(g,'M-7-47 Q-3-41 0-47 M2-47 Q5-51 8-47',INK,1);
    g.save();g.translate(0,-70);g.rotate(Math.sin(t*1.7)*.06);
    shape(g,'M-11 4 Q-18-9-27-12 L-20-12 Q-11-16-4-3 L0-13 4-3 Q11-16 20-12 L27-12 Q18-9 11 4Z',C.body);
    line(g,'M-18-12 Q-9-8-7-1 M18-12 Q9-8 7-1',C.gold,.65);g.restore();
    for(let i=0;i<3;i++){oval(g,0,-26+i*10,2.3,3,C.bone);oval(g,0,-26+i*10,.7,1.2,C.deep,null);}
  },
  imoralidade(g,t,C,b,m){
    // A veiled, rose-quartz serpent. The fan opens during its charm wind-up.
    const spread=1+m.attack*.14+Math.sin(t*1.5)*.045;
    for(const sd of [-1,1]){g.save();g.scale(sd*spread,1);
      shape(g,'M4-41 Q20-65 45-56 L42-40 54-34 43-22 48-10 32-11 28 4 12-7 2-22Z',gradient(g,'#8E667A','#2D354B'));
      for(let k=0;k<4;k++){g.save();g.translate(12+k*8,-17-k*7);g.rotate(.4);shape(g,'M0 0 Q-1-15 7-15 Q12-9 0 0Z',k%2?'#B89FAD':'#718697');g.restore();}
      line(g,'M9-18 Q27-34 39-49','#D1B6C0',.65);g.restore();}
    for(let i=0;i<4;i++){
      const y=27-i*12,x=Math.sin(t*1.5+i*.7)*3,w=43-i*5;
      oval(g,x,y,w,12,gradient(g,'#64485D',C.deep));
      g.save();g.translate(x,y);line(g,`M${-w*.7}-4 Q0-14 ${w*.7}-4`,'#AB7D94',1);
      for(let k=-3;k<=3;k++){g.save();g.translate(k*w/4,0);line(g,'M-3 0 0 4 3 0','#A5869B',.55);g.restore();}g.restore();
    }
    shape(g,'M-15 0 Q-27-20-12-43 Q0-57 13-44 Q26-26 10-8 L18 5 4 9Z',gradient(g,C.shell,'#392A42'));
    mask(g,0,-46,.93,C,'beak');
    shape(g,'M-9-54-18-67-7-63 0-76 7-63 18-67 9-54Z',C.bone);
    oval(g,0,-66,2,3.5,C.accent);
    line(g,'M-5-34-4-28 M5-34 4-28',C.bone,1.5);
    line(g,'M0-29 0-22-3-18 M0-22 3-18',C.accent,.9);
  },
  satanas(g,t,C,b){
    // A broken halo and torn pinions frame a narrow, armored silhouette.
    featherWing(g,t,C,-1);featherWing(g,t+.8,C,1);
    g.save();g.translate(0,-57);g.rotate(t*.04);
    line(g,'M-35-13 A38 38 0 0 1 21-32 M36 11 A38 38 0 0 1-22 31','#987C77',1.1);
    for(let k=0;k<7;k++){g.save();g.rotate(k*TAU/7);shape(g,'M-2-39 0-47 2-39Z','#B2A68F');g.restore();}g.restore();
    robe(g,{...C,body:'#453D4C'},t,.9);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);jointLimb(g,'M16-36 30-20 27 3',C.body,5);claw(g,27,3,1,C,.95);shoulder(g,{...C,bone:'#9FA9A5'});g.restore();}
    shape(g,'M-16-39 0-44 16-39 13-15 0 1-13-15Z',gradient(g,'#6F7780',C.deep));
    line(g,'M0-40-4-31 2-24-3-17 1-8',C.accent,1.4);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);line(g,'M4-33 11-29 M3-25 11-21 M3-17 8-14',C.bone,.8);g.restore();}
    mask(g,0,-59,1.05,C,'beak');
    for(const sd of [-1,1]){g.save();g.scale(sd,1);
      shape(g,'M5-67 Q32-78 25-99 Q21-90 13-88 Q22-99 16-109 Q13-89 2-76Z',gradient(g,C.bone,'#6F878A'));
      line(g,'M8-73 Q19-79 21-91','#F1EFDA',.8);g.restore();}
    if(b.talk){oval(g,0,-47,3.5,1+Math.abs(Math.sin(t*10))*2,INK,null);oval(g,0,-47,2,.6,C.accent,null);}
    for(let k=0;k<7;k++){const phase=(t*.22+k/7)%1;g.save();g.globalAlpha*=1-phase;oval(g,Math.sin(k*2.4+t)*27,28-phase*81,.65,1.1,C.accent,null);g.restore();}
  },
  behemote(g,t,C,b,m){
    const stamp=/pisao/.test(b.act||'')?-m.attack*4:0;
    g.save();g.translate(0,stamp);
    const tail=Math.sin(t*1.6-.8)*5;
    jointLimb(g,`M36-6 Q${74+tail}-11 ${66+tail}-39`,C.body,6);
    g.save();g.translate(tail,0);
    shape(g,'M64-37 58-42 64-48 73-42 70-34Z',C.bone);
    g.restore();
    for(const [x,phase] of [[-31,0],[-13,Math.PI],[17,Math.PI],[34,0]]){
      const step=m.phase*5+phase,lift=Math.max(0,Math.cos(step))*m.move*5;
      g.save();g.translate(x,-lift);g.rotate(Math.sin(step)*m.move*.1);
      shape(g,'M-8 3 Q0-1 10 3 Q5 20 8 28 Q14 34 5 35 L-9 34 Q-13 31-8 25Z',gradient(g,C.shell,C.deep));
      shape(g,'M-9 24 Q0 27 8 24 L11 31 Q10 35-1 34 L-11 33Z',C.bone);line(g,'M-4 27-4 32 M2 27 2 32','#778B89',.8);g.restore();}
    shape(g,'M-49-6 Q-47-40-12-42 Q27-47 47-16 Q56 12 28 19 L-27 17Z',gradient(g,'#526464',C.deep));
    for(let i=0;i<5;i++){
      g.save();g.translate(-31+i*16,-25-Math.sin(i/4*Math.PI)*9);g.rotate((i-2)*.16);
      shape(g,'M-12 0-9-17 0-24 10-15 13 3 4 12-7 9Z',gradient(g,C.bone,'#778D88'));
      line(g,'M-7-13 0-19 6-12 M0-18 2 5','#F1EEDB',.85);line(g,'M5-5 1-1 5 6','#536F74',.75);g.restore();}
    g.save();g.translate(-36,-15);g.rotate(Math.sin(t*1.6-.5)*.025-m.attack*.05);g.translate(36,15);
    shape(g,'M-52-30 Q-33-29-32-7 L-40 15-62 17-71 3-64-18Z',gradient(g,'#60757B',C.deep));
    shape(g,'M-64-22-48-28-36-17-42-4-55 1-66-7Z',C.bone);
    for(const sd of [-1,1]){
      g.save();g.translate(-51+sd*9,-18);g.rotate(sd*.25);
      shape(g,'M-4 0 Q-13-24-4-38 Q-8-18 4-7 L4 1Z',gradient(g,C.bone,'#7B918E'));g.restore();
    }
    eyes(g,-52,-12,7,2,C);shape(g,'M-65 2 Q-52-3-39 3 L-43 13-60 13Z',C.deep);
    line(g,'M-61 4-58 10 M-43 4-46 10',C.bone,2);
    g.restore();
    line(g,'M-29-4-18 1-10-2 M9-7 17-1 26-4','#8D9D92',1);
    g.restore();
  },
  golias(g,t,C,b,m){
    const p=b.artPose||goliathPose(b,t),aim=p.angle,behind=Math.sin(aim)<-.25;
    const bronze=gradient(g,'#C5B18C','#5D665F'),darkBronze='#7B7A61';
    const arm=()=>{
      jointLimb(g,`M${p.shoulder.x} ${p.shoulder.y} Q${p.elbow.x} ${p.elbow.y} ${p.hand.x} ${p.hand.y}`,darkBronze,8);
      g.save();g.translate(p.hand.x,p.hand.y);g.rotate(aim);
      jointLimb(g,'M-28 0H88','#78664D',3.3);line(g,'M-25-1H84','#C6B48C',.65);
      shape(g,'M81-4 92-7 113 0 92 7 81 4Z',gradient(g,'#E0E3D1','#789297'));
      line(g,'M86 0H110','#EFF2DD',.8);line(g,'M81-4V4',C.gold,3);
      for(let x=-8;x<7;x+=2.5)line(g,`M${x}-2v4`,'#B3A17A',.8);
      oval(g,0,0,4.8,5.6,darkBronze);line(g,'M-3-2H3 M-3 0H3',C.gold,.65);g.restore();
    };
    if(behind)arm();
    shape(g,'M-16-42 Q-26-20-29 28 L-16 22-8 34 2 24 17 32 28 23 Q26-21 16-42Z',gradient(g,'#555B64',C.deep));
    for(const sd of [-1,1]){g.save();g.scale(sd,1);g.translate(Math.sin(m.phase*5+sd)*m.move,Math.sin(m.phase*5+sd)*m.move*2.5);
      jointLimb(g,'M9-1 Q17 10 13 18 L13 36',C.deep,10);
      shape(g,'M7 9 20 8 19 31 24 37 5 37 7 29Z',bronze);
      line(g,'M9 14 16 14 M10 29 17 29','#D6CBA8',1);g.restore();}
    shape(g,'M-20-41 Q0-51 20-41 L24-12 15 0-15 0-24-12Z',bronze);
    for(let y=-34;y<-5;y+=7){line(g,`M-16 ${y} Q0 ${y+8} 16 ${y}`,C.deep,1);}
    shape(g,'M-20-5H20V2H-20Z',C.deep);shape(g,'M-4-6H4V3H-4Z',C.gold);
    for(let i=-2;i<=2;i++){g.save();g.translate(i*8,1);shape(g,'M-4 0H4L5 15 0 18-5 15Z',bronze);line(g,'M-2 4V12','#D7C8A1',.65);g.restore();}
    for(const sd of [-1,1]){g.save();g.scale(sd,1);shoulder(g,{...C,bone:'#B6A782'});g.restore();}
    jointLimb(g,'M-24-29-34-17-32 1',darkBronze,8);
    // Shield is strapped to the bent forearm, with layered bronze edge and boss.
    g.save();g.translate(-33,-4);
    shape(g,'M-13-18 Q0-23 13-18 L12 10 0 23-12 10Z',bronze);
    shape(g,'M-10-15 Q0-19 10-15 L9 8 0 18-9 8Z',C.deep,C.gold,1.2);
    oval(g,0,-2,6,8,bronze);line(g,'M0-15V-10 M0 7V14 M-8-2H-5 M5-2H8',C.gold,1);g.restore();
    if(b.exposto>0){
      shape(g,'M-10-66 Q0-75 10-66 L9-51 4-45-4-45-9-51Z',gradient(g,'#C9A681','#876F5D'));
      shape(g,'M-10-54-6-50 0-51 6-50 10-54 8-44 0-40-8-44Z',C.deep);
      eyes(g,0,-57,3.8,1.1,{...C,accent:'#D4C3A2'});
      const pulse=.6+.35*Math.sin(t*11);glow(g,0,-65,16,'#FFE1A4',pulse*.35);
      oval(g,0,-65,5+pulse,5+pulse,null,'#FFE3AA',1.1);oval(g,0,-65,1.8,1.8,'#FFF3CA',null);
      // The fallen helmet makes the vulnerability state visible without text.
      g.save();g.translate(31,31);g.rotate(.3);shape(g,'M-10 0 Q-10-16 0-16 Q10-16 10 0Z',bronze);g.restore();
    }else{
      shape(g,'M-13-62 Q-14-78 0-81 Q14-78 13-62 L10-46 5-42 4-58-4-58-5-42-10-46Z',bronze);
      shape(g,'M-10-62-4-64-2-60-9-58Z',INK,null);shape(g,'M10-62 4-64 2-60 9-58Z',INK,null);
      line(g,'M0-77V-52','#DDD0AA',2);line(g,'M-10-69 Q0-75 10-69','#EEE1BB',.85);
      shape(g,'M-2-80 Q-12-85-10-93 L0-89 Q8-94 12-86 L3-80Z',C.deep);
    }
    if(!behind)arm();
  },
  leviata(g,t,C,b){
    // Continuous S-shaped spine, overlapping scales and translucent dorsal fins.
    const waves=Math.sin(t*1.7)*2;
    g.save();g.translate(Math.sin(t*1.7-1)*2,waves);g.rotate(Math.sin(t*1.7-1)*.025);
    shape(g,'M-39 21 Q-65 13-54 0 Q-44-12-27-6 Q-43 0-39 8 Q-29 15-1 8 Q31 1 35 13 Q40 31 8 34 Q-19 38-30 24 Q-16 27 4 24 Q20 22 19 18 Q17 13-4 20Z',gradient(g,'#547F87',C.deep));
    for(let i=0;i<7;i++){g.save();g.translate(-30+i*9,17+Math.sin(i)*4);g.rotate(i*.08);shape(g,'M-5-4 0-9 5-4 0 3Z',gradient(g,C.shell,'#2F5062'));line(g,'M-3-4 0-6 3-4','#A1C5C4',.6);g.restore();}
    g.translate(0,10);g.rotate(Math.sin(t*1.7-.35)*.065);g.translate(0,-10);
    shape(g,'M-13 17 Q-37-7-18-42 Q-2-70 20-58 Q39-44 14-21 Q6-12 13 1Z',gradient(g,'#638994','#152C3C'));
    for(let i=0;i<6;i++){g.save();g.translate(-19+i*4,-8-i*8);g.rotate(.5+i*.13+Math.sin(t*2.2-i*.4)*.09);
      shape(g,'M0 0 Q-21-4-18-22 Q-10-12 1-8Z',gradient(g,'#9EC8C5','#355A6B'));
      line(g,'M-1-2-14-17','#D3E5D4',.6);g.restore();}
    g.translate(5,-43);g.rotate(Math.sin(t*1.7+.35)*.06);g.translate(-5,43);
    shape(g,'M-14-56 Q3-76 26-61 Q30-52 41-46 Q40-36 33-29 L21-25 Q9-25 7-33 Q-7-30-10-35Z',gradient(g,C.shell,C.deep));
    shape(g,'M-9-56 Q4-73 25-61 Q25-53 22-49 Q9-41-6-46Z',C.bone);
    shape(g,'M6-62 4-78 10-88 12-68 19-66 24-83 29-88 26-61Z',gradient(g,C.bone,'#6E999E'));
    line(g,'M-5-48 6-47 14-51',INK,2);oval(g,7,-49,2.2,1.2,C.accent,null);
    shape(g,'M7-37 Q22-43 38-43 L34-29 19-25Z',C.deep);
    for(let i=0;i<5;i++){g.save();g.translate(13+i*4.5,-36-i);shape(g,'M-2-3H2L0 5Z',C.bone);g.restore();}
    line(g,'M20-27 Q12-15 28-10 M24-27 Q22-16 39-17','#B7D5CF',.8);
    g.restore();
    g.save();g.globalAlpha*=b.submerged?.9:.45;
    oval(g,0,34,61,7,null,C.accent,.8);oval(g,0,35,48,3.5,null,'#C0E1DB',.6);g.restore();
  },
  pecado(g,t,C,b){
    // Negative space with a restrained cold rim; the face remains unknown.
    for(const sd of [-1,1]){g.save();g.scale(sd,1);ribbon(g,9,-32,76,{...C,body:'#101A28'},t*.8+sd);g.restore();}
    shape(g,'M0-80 Q-23-65-18-39 L-29-20-18-13-26 28-11 20-6 39 0 22 11 34 14 17 27 27 20-10 28-24 17-40 Q23-65 0-80Z',gradient(g,'#1F3040','#060C15'),INK,1.2);
    line(g,'M-4-76 Q-19-61-15-43 L-21-27 M15-39 Q20-25 18-15','#526A7A',.8);
    shape(g,'M0-66 Q-9-57-8-44 L0-34 8-44 Q9-57 0-66Z','#030811',null);
    eyes(g,0,-50,4.1,1.3,C);
    for(let k=0;k<4;k++){g.save();g.globalAlpha*=.25+.25*Math.sin(t+k);line(g,`M${-9+k*6} 0v${12+k*3}`,'#536C7D',.6);g.restore();}
  },
  generico(g,t,C,b){
    robe(g,C,t,.9);
    for(const sd of [-1,1]){g.save();g.scale(sd,1);shoulder(g,C);jointLimb(g,'M22-24 30-9 24 9',C.body,4);claw(g,24,9,1,C,.8);g.restore();}
    mask(g,0,-47,1.05,C);
    shape(g,'M-8-56-17-76-8-69 0-80 8-69 17-76 8-56Z',C.bone);
    shape(g,'M0-30 7-20 0-8-7-20Z',C.gold);oval(g,0,-20,2,3,C.accent,null);
  }
};

// The spear, gauntlet and arm share this anchor throughout aim and thrust.
export function getGoliathPose(b={}) {
  const angle=Number.isFinite(b.lancaA)?b.lancaA:-Math.PI/2+.22;
  const extension=b.lanca==='mira'?-4:b.lanca==='golpe'?21:0;
  const side=Math.cos(angle)<-.15?-1:1;
  const shoulder={x:side*26,y:-30};
  const hand={x:side*37+Math.cos(angle)*extension,y:-8+Math.sin(angle)*extension};
  const elbow={x:(shoulder.x+hand.x)*.5+side*5,y:(shoulder.y+hand.y)*.5+5};
  return {angle,shoulder,elbow,hand};
}

const spearPoses=new WeakMap();
function goliathPose(b,t){
  const target=getGoliathPose(b),prev=spearPoses.get(b);
  if(!prev){spearPoses.set(b,{...target,t});return target;}
  const dt=Math.max(0,Math.min(.06,t-prev.t)),blend=1-Math.exp(-(b.lanca==='golpe'?30:15)*dt);
  const hand={x:prev.hand.x+(target.hand.x-prev.hand.x)*blend,y:prev.hand.y+(target.hand.y-prev.hand.y)*blend};
  const angle=prev.angle+Math.atan2(Math.sin(target.angle-prev.angle),Math.cos(target.angle-prev.angle))*blend;
  const elbow={x:(target.shoulder.x+hand.x)*.5+(hand.x<0?-5:5),y:(target.shoulder.y+hand.y)*.5+5};
  const pose={...target,hand,elbow,angle,t};spearPoses.set(b,pose);return pose;
}

export function drawBoss(g,b,T=0){
  const id=b.d?.desenho||b.id||'generico',s=(b.r||40)/40;
  const C=palette(ACCENT[id]||b.d?.cor||'#BCCED2',b.flash>0);
  const m=b.artMotion||creatureMotion(b,T);
  g.save();g.translate(b.x||0,b.y||0);g.scale(s,s);g.lineCap='round';g.lineJoin='round';
  if(b.alpha!=null)g.globalAlpha*=Math.max(0,Math.min(1,b.alpha));
  if(b.submerged)g.globalAlpha*=.4;
  // Clones deliberately use identical shadows and artwork to the real boss.
  shadow(g,id==='behemote'||id==='leviata'?57:39,7,37);
  if(b.act&&b.step===1){g.save();g.globalAlpha*=.3+.12*Math.sin(T*16);oval(g,0,33,42,9,null,C.accent,1.1);g.restore();}
  const bob=b.stun>0?0:Math.sin(T*(id==='procrastinacao'?1.2:1.7))*(id==='golias'?.3:1.2);
  g.translate(0,bob+12);g.rotate(Math.sin(m.phase*4)*m.move*.018);g.translate(0,-12);
  const breath=b.stun>0?0:Math.sin(T*1.6);g.scale(1+breath*.006,1-breath*.006);
  (ART[id]||ART.generico)(g,T,C,b,m);
  g.restore();
}
