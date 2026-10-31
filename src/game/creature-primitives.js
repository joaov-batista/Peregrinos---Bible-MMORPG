// Shared ink, mineral and porcelain rendering. Cached paths stay independent of scale.
export const INK = '#080F19', BONE = '#D8DDD1', TAU = Math.PI * 2;
const paths = new Map();
export function shape(g, d, fill, stroke = INK, width = .85) {
  let p = paths.get(d); if (!p) { if(paths.size>=768)paths.clear();p = new Path2D(d); paths.set(d, p); }
  if (fill) { g.fillStyle = fill; g.fill(p); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(p); }
}
export function line(g, d, color, width = .7) { shape(g, d, null, color, width); }
export function oval(g, x, y, rx, ry, fill, stroke = INK, width = .75) {
  g.beginPath(); g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);
  if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
}
export function gradient(g, light, dark, x = -20, y = -35, x2 = 25, y2 = 30) {
  const a=g.createLinearGradient(x,y,x2,y2);a.addColorStop(0,light);a.addColorStop(1,dark);return a;
}
export function glow(g,x,y,r,color,alpha=.16) {
  const n=parseInt(color.slice(1),16),rgb=`${n>>16&255},${n>>8&255},${n&255}`;
  const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${rgb},${alpha})`);gr.addColorStop(1,`rgba(${rgb},0)`);
  g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);
}
export function shadow(g,rx,ry,y){oval(g,0,y,rx,ry,'rgba(2,7,13,.3)',null);}
export function palette(accent, flash=false) {
  return { accent, bone:flash?'#FFFFFF':BONE, shell:flash?'#C4D7D6':'#566E78', body:flash?'#A2BDC5':'#253B49', deep:flash?'#6F8995':'#101F2C', gold:flash?'#F1EDD3':'#A7996D' };
}
export function eyes(g,x,y,space,size,C,sleepy=false) {
  for(const sd of [-1,1]){
    g.save();g.translate(x+sd*space,y);g.rotate(sd*.13);
    oval(g,0,0,size*1.3,sleepy?size*.36:size*1.7,INK,null);
    oval(g,0,-.15,size*.55,sleepy?size*.17:size*.85,C.accent,null);
    oval(g,-size*.18,-size*.55,size*.16,size*.25,'#F1F5E5',null);g.restore();
  }
}
export function mask(g,x,y,s,C,kind='long') {
  g.save();g.translate(x,y);g.scale(s,s);
  const forms={
    long:'M-10-8 C-11-18 11-18 10-8 L9 3 Q7 12 0 16 Q-7 12-9 3Z',
    wide:'M-13-5 C-14-17 14-17 13-5 Q12 4 5 9 Q0 11-5 9 Q-12 4-13-5Z',
    beak:'M-9-9 C-10-18 10-18 9-9 Q10 0 0 19 Q-10 0-9-9Z'
  };
  shape(g,forms[kind]||forms.long,gradient(g,'#E6E9DB',C.bone,-10,-12,10,15));
  shape(g,'M1-12 Q8-12 10-8 Q10 3 0 15 Q6 3 1-12Z','#9DAFA9',null);
  line(g,'M-7-8 Q-5-11-2-11','#F6F5E6',.7);
  eyes(g,0,-1,4,1.5,C);
  line(g,'M3-10 1-5 3-2 2 3','#526875',.6);
  line(g,'M-2 8 0 9 2 8',INK,.75);g.restore();
}
export function claw(g,x,y,side,C,scale=1) {
  g.save();g.translate(x,y);g.scale(side*scale,scale);
  shape(g,'M-3-4 Q4-6 7-2 L10 7 6 4 4 0 5 9 2 7 0 1-1 8-3 6-4 1Z',C.bone);
  line(g,'M-1-3 3-2 6 3','#728A8E',.55);g.restore();
}
export function jointLimb(g,d,color,width=4) { line(g,d,INK,width+1.8);line(g,d,color,width); }
export function coin(g,x,y,r,t,C) {
  const w=r*(.35+.65*Math.abs(Math.cos(t)));
  oval(g,x,y,w,r,C.gold,INK,.65);oval(g,x,y,w*.66,r*.7,null,'#DED0A1',.5);
  line(g,`M${x} ${y-r*.4}v${r*.8}`,'#F1E1B0',.55);
}
export function chain(g,points,C) {
  for(let k=1;k<points.length;k++) {
    const [x,y]=points[k-1],[xx,yy]=points[k],n=Math.ceil(Math.hypot(xx-x,yy-y)/4);
    for(let i=0;i<n;i++){const a=i/n;oval(g,x+(xx-x)*a,y+(yy-y)*a,i%2?1.1:1.7,2,null,C.gold,.7);}
  }
}
export function ribbon(g,x,y,length,C,t,side=1) {
  g.save();g.translate(x,y);g.scale(side,1);
  g.beginPath();g.moveTo(0,0);g.bezierCurveTo(10,10,2+Math.sin(t)*4,length*.65,14,length);g.quadraticCurveTo(5,length-2,3,length-6);g.bezierCurveTo(-3,length*.6,4,10,-3,0);g.closePath();
  g.fillStyle=C.body;g.fill();g.strokeStyle=INK;g.lineWidth=.8;g.stroke();g.restore();
}
