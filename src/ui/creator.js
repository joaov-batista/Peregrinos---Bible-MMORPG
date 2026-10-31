import { personMotion } from '../game/sprite-motion.js';
import { h, pick } from '../util.js';
import { CLASSES, CLASS_ATTIRE, LOOK_OPTIONS, defaultLook } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { drawPerson } from '../game/character-art.js';
import { newCharData } from '../game/player.js';
import { net } from '../net.js';
import { sfx } from '../audio.js';
import { desligarCeu } from './ceu.js';
import { icon, itemIcon } from './icons.js';

const ROLES = { guerreiro:'Combate próximo · resistência', pastor:'À distância · precisão', profeta:'Luz · poder espiritual', levita:'Louvor · proteção', zelote:'Agilidade · golpes rápidos', valente:'Alcance · firmeza', juiz:'Controle · versatilidade' };
const SHORT = { guerreiro:'Guerreiro da Fé', pastor:'Pastor', profeta:'Profeta', levita:'Levita', zelote:'Zelote', valente:'Valente de Davi', juiz:'Juiz' };
const COLOR_NAMES = {
  skin:['Clara','Dourada','Bronze','Castanha','Escura'],
  hair:['Ébano','Castanho escuro','Castanho','Cobre dourado','Louro','Prateado','Ruivo escuro','Ruivo'],
  tunic:['Azul de ardósia','Vinho','Sálvia','Ametista','Areia','Noite','Linho','Petróleo'],
  cape:['Azul noturno','Bronze','Bordô','Violeta','Musgo','Pérola','Sem capa']
};

// Quiet ruined sanctuary, drawn as vector scenery so it stays sharp at any DPR.
function sanctuary(g, t) {
  const bg=g.createLinearGradient(0,0,0,440);bg.addColorStop(0,'#101A28');bg.addColorStop(.58,'#263C4A');bg.addColorStop(1,'#101C27');
  g.fillStyle=bg;g.fillRect(0,0,360,440);
  const light=g.createRadialGradient(180,110,4,180,175,190);light.addColorStop(0,'rgba(166,210,216,.2)');light.addColorStop(1,'rgba(121,184,203,0)');g.fillStyle=light;g.fillRect(0,0,360,440);
  // Receding pointed arches, not a photograph pasted behind the sprite.
  for(let i=0;i<3;i++) {
    const left=27+i*24, right=333-i*24, top=17+i*23;
    g.beginPath();g.moveTo(left,365);g.lineTo(left,145+i*8);g.bezierCurveTo(left,85,125,top+29,180,top);g.bezierCurveTo(235,top+29,right,85,right,145+i*8);g.lineTo(right,365);
    g.strokeStyle=i===0?'#0B1420':i===1?'#344B55':'#304A58';g.lineWidth=i===0?14:3;g.stroke();
  }
  for(const x of [29,55,305,331]){g.fillStyle='#152630';g.fillRect(x-3,148,6,211);g.fillStyle='#52616A';g.fillRect(x-4,151,8,2);}
  g.strokeStyle='rgba(159,184,186,.12)';g.lineWidth=1;
  for(let y=193;y<360;y+=44){g.beginPath();g.moveTo(25,y);g.lineTo(59,y);g.moveTo(301,y);g.lineTo(335,y);g.stroke();}
  g.beginPath();g.arc(180,104,24,0,Math.PI*2);g.strokeStyle='rgba(205,223,209,.24)';g.stroke();
  g.beginPath();g.moveTo(180,88);g.lineTo(180,121);g.moveTo(171,100);g.lineTo(189,100);g.strokeStyle='#AEBDB4';g.lineWidth=1.3;g.stroke();
  // Low fog and an engraved stone dais establish contact with the ground.
  const fog=g.createRadialGradient(180,355,0,180,355,180);fog.addColorStop(0,'rgba(134,183,194,.12)');fog.addColorStop(1,'rgba(134,183,194,0)');g.fillStyle=fog;g.fillRect(0,260,360,160);
  g.beginPath();g.ellipse(180,375,117,23,0,0,Math.PI*2);g.fillStyle='#0D1721';g.fill();
  g.beginPath();g.ellipse(180,366,117,23,0,0,Math.PI*2);g.fillStyle='#263941';g.fill();g.strokeStyle='#66756F';g.lineWidth=.8;g.stroke();
  g.beginPath();g.ellipse(180,366,106,18,0,0,Math.PI*2);g.strokeStyle='#425655';g.stroke();
  for(let i=0;i<16;i++){const a=i*Math.PI/8;g.beginPath();g.moveTo(180+Math.cos(a)*108,366+Math.sin(a)*18);g.lineTo(180+Math.cos(a)*113,366+Math.sin(a)*20);g.stroke();}
  for(let i=0;i<15;i++) {
    const k=(t*.035+i/15)%1,x=38+(i*71%285)+Math.sin(t*.25+i)*7,y=365-k*290;
    g.globalAlpha=Math.sin(k*Math.PI)*.5;g.fillStyle='#B7D7D3';g.beginPath();g.ellipse(x,y,i%3===0?1.3:.65,.65,0,0,Math.PI*2);g.fill();
  }g.globalAlpha=1;
  const shade=g.createLinearGradient(0,350,0,440);shade.addColorStop(0,'rgba(9,17,25,0)');shade.addColorStop(1,'#0D1721');g.fillStyle=shade;g.fillRect(0,350,360,90);
}

export function mountCreator(root, onCreated, onBack) {
  desligarCeu(); root.replaceChildren();root.hidden=false;root.classList.add('creating');
  const look=defaultLook(),motionActor={};
  let cls='guerreiro',step=0,appearance='rosto',face=0,motion='idle',time=0,last=0,raf=0,busy=false,attackStart=-9,customCloth=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const faces=[[0,1],[1,0],[0,-1],[-1,0]], names=['Frente','Direita','Costas','Esquerda'];
  const cv=h('canvas',{width:720,height:880,class:'pilgrim-canvas',role:'img','aria-label':'Prévia do peregrino de corpo inteiro'}),g=cv.getContext('2d');
  const previewName=h('h2',{},CLASSES[cls].nome),previewRole=h('p',{},ROLES[cls]),faceLabel=h('span',{class:'face-label','aria-live':'polite'},names[0]);
  const msg=h('p',{class:'creator-message',role:'status','aria-live':'polite'});
  const name=h('input',{id:'pilgrim-name',maxlength:16,placeholder:'Como você será chamado?',autocomplete:'off','aria-describedby':'name-help','aria-label':'Nome do peregrino'});
  const body=h('div',{class:'creation-body',id:'creation-content'}),nav=h('nav',{class:'creation-steps','aria-label':'Etapas da criação'});
  const back=h('button',{class:'quiet-button',type:'button',onclick:()=>{
    if(busy)return;
    if(step>0){step--;render();}else{cancelAnimationFrame(raf);root.classList.remove('creating');onBack();}
  }});
  const next=h('button',{class:'forge-primary',type:'submit'});
  const updatePreview=()=>{previewName.textContent=name.value.trim()||CLASSES[cls].nome;previewRole.textContent=ROLES[cls];cv.setAttribute('aria-label',`${CLASSES[cls].nome}, ${names[face].toLowerCase()}, com ${ITEMS[CLASSES[cls].armaInicial].nome}`);};
  name.addEventListener('input',()=>{name.removeAttribute('aria-invalid');msg.textContent='';updatePreview();});
  const rotate=d=>{face=(face+d+4)%4;faceLabel.textContent=names[face];updatePreview();};
  const modeButtons=h('div',{class:'preview-modes','aria-label':'Animação da prévia'});
  for(const [key,title,art] of [['idle','Repouso','eye'],['walk','Caminhar','walk'],['attack','Atacar','espada']]){
    modeButtons.append(h('button',{type:'button',class:key==='idle'?'on':'','aria-pressed':String(key==='idle'),onclick:e=>{
      motion=key;if(key==='attack')attackStart=time;
      modeButtons.querySelectorAll('button').forEach(b=>{const on=b===e.currentTarget;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    }},icon(art,15),title));
  }
  const preview=h('aside',{class:'pilgrim-preview','aria-label':'Seu peregrino'},
    h('div',{class:'preview-kicker'},h('span',{class:'tiny-diamond'}),'SEU PEREGRINO'),cv,
    h('div',{class:'preview-caption'},previewName,previewRole),
    h('div',{class:'preview-turn'},h('button',{type:'button','aria-label':'Girar para a esquerda',onclick:()=>rotate(-1)},icon('back',17)),faceLabel,h('button',{type:'button','aria-label':'Girar para a direita',onclick:()=>rotate(1)},icon('arrow',17))),modeButtons);
  const field=(label,node)=>h('fieldset',{class:'appearance-field'},h('legend',{},label),node);
  const swatches=key=>h('div',{class:'ink-swatches'},LOOK_OPTIONS[key].map((color,i)=>h('button',{
    type:'button',class:'ink-swatch'+(look[key]===color?' on':''),style:`--swatch:${color==='none'?'transparent':color}`,
    'aria-label':COLOR_NAMES[key][i],title:COLOR_NAMES[key][i],'aria-pressed':String(look[key]===color),
    onclick:e=>{look[key]=color;if(key==='tunic'||key==='cape')customCloth=true;e.currentTarget.parentElement.querySelectorAll('button').forEach(b=>{const on=b===e.currentTarget;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});}
  },color==='none'?'∅':icon('check',14))));
  const choices=key=>h('div',{class:'ink-choices'},LOOK_OPTIONS[key].map(o=>h('button',{
    type:'button',class:look[key]===o.id?'on':'','aria-pressed':String(look[key]===o.id),
    onclick:e=>{look[key]=o.id;e.currentTarget.parentElement.querySelectorAll('button').forEach(b=>{const on=b===e.currentTarget;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});}
  },o.nome)));
  function classDetails(){
    const C=CLASSES[cls];
    return h('div',{class:'vocation-detail','aria-live':'polite'},
      h('div',{class:'vocation-detail-top'},h('h3',{},C.nome),h('span',{},C.ref)),
      h('p',{},C.desc),h('div',{class:'vocation-skill'},icon('spark',16),h('span',{},C.skill.nome),h('small',{},C.skill.custo+' Fé · '+C.skill.cd+'s')));
  }
  function render(focus=false){
    updatePreview();nav.replaceChildren();body.replaceChildren();msg.textContent='';
    for(const [i,title] of ['Vocação','Aparência','Nome'].entries())nav.append(h('button',{
      type:'button',class:'creation-step'+(step===i?' active':'')+(step>i?' complete':''),'aria-current':step===i?'step':null,
      onclick:()=>{if(!busy){step=i;render(true);}}
    },h('span',{class:'step-number'},step>i?icon('check',14):'0'+(i+1)),title));
    if(step===0){
      body.append(h('div',{class:'section-heading'},h('span',{class:'overline'},'01 / O CHAMADO'),h('h2',{tabindex:-1},'Escolha sua vocação'),h('p',{},'Sete caminhos. Uma mesma fé.')));
      const grid=h('div',{class:'vocation-grid','aria-label':'Vocações'});
      for(const [key,C] of Object.entries(CLASSES))grid.append(h('button',{
        type:'button',class:'vocation'+(cls===key?' selected':''),'aria-pressed':String(cls===key),onclick:()=>{cls=key;if(!customCloth)Object.assign(look,CLASS_ATTIRE[key]);sfx('click');render();body.querySelectorAll('.vocation')[Object.keys(CLASSES).indexOf(key)]?.focus({preventScroll:true});}
      },h('span',{class:'vocation-emblem'},icon(C.arma,27)),h('span',{class:'vocation-label'},h('b',{},SHORT[key]),h('small',{},ROLES[key])),h('span',{class:'selection-mark'},cls===key?icon('check',13):'')));
      body.append(grid,classDetails());
    }else if(step===1){
      body.append(h('div',{class:'section-heading'},h('span',{class:'overline'},'02 / A PRESENÇA'),h('h2',{tabindex:-1},'Dê forma ao seu peregrino'),h('p',{},'Cada detalhe conta uma parte da sua história.')));
      const tabs=h('div',{class:'appearance-tabs','aria-label':'Grupos de aparência'});
      for(const [key,title] of [['rosto','Rosto e cabelo'],['vestes','Corpo e vestes']])tabs.append(h('button',{type:'button',class:appearance===key?'on':'','aria-pressed':String(appearance===key),onclick:()=>{appearance=key;render();}},title));
      body.append(tabs);
      const options=h('div',{class:'appearance-fields'});
      if(appearance==='rosto')options.append(field('Tom de pele',swatches('skin')),field('Cor do cabelo',swatches('hair')),field('Cabelo e cobertura',choices('style')),field('Barba',choices('beard')));
      else options.append(field('Constituição',choices('body')),field('Cor da túnica',swatches('tunic')),field('Cor da capa',swatches('cape')));
      body.append(options,h('button',{type:'button',class:'random-look',onclick:()=>{
        customCloth=true;for(const key of ['skin','hair','tunic','cape'])look[key]=pick(LOOK_OPTIONS[key]);
        for(const key of ['style','body','beard'])look[key]=pick(LOOK_OPTIONS[key]).id;render();
      }},icon('shuffle',16),'Sortear aparência'));
    }else{
      const C=CLASSES[cls];
      body.append(h('div',{class:'section-heading'},h('span',{class:'overline'},'03 / A JORNADA'),h('h2',{tabindex:-1},'Um nome para sua história'),h('p',{},'Sua jornada começa na Cidade de Refúgio.')),
        h('label',{class:'name-field',for:'pilgrim-name'},'Nome do peregrino',name),h('p',{id:'name-help',class:'name-help'},'De 3 a 16 letras ou números. Espaços, hífen e sublinhado são aceitos.'),
        h('div',{class:'journey-summary'},h('span',{class:'overline'},'SEU CHAMADO'),h('h3',{},icon(C.arma,23),C.nome),h('p',{},ROLES[cls]),
          h('div',{class:'starting-stats'},[['heart','Vida',C.base.hp],['spark','Fé',C.base.fe],['shield','Defesa',C.base.def+(ITEMS.escudo_madeira.def||0)]].map(([art,title,v])=>h('div',{},icon(art,17),h('span',{},title),h('b',{},v)))),
          h('div',{class:'starting-gear'},itemIcon(ITEMS[C.armaInicial],C.armaInicial,33),h('span',{},h('small',{},'EQUIPAMENTO INICIAL'),h('b',{},ITEMS[C.armaInicial].nome+' + escudo')))),
        h('p',{class:'journey-note'},icon('book',17),'“Andamos por fé, e não pelo que vemos.”',h('span',{},'2 Coríntios 5:7')));
    }
    back.replaceChildren(icon('back',16),step===0?'Voltar':'Anterior');
    next.replaceChildren(step===2?'Começar a jornada':'Continuar',icon('arrow',17));
    if(focus)body.querySelector('h2')?.focus({preventScroll:true});
  }
  const form=h('form',{class:'character-forge',novalidate:true,onsubmit:async e=>{
    e.preventDefault();if(busy)return;
    if(step<2){step++;render(true);return;}
    const n=name.value.trim();
    if(!/^[\p{L}0-9 _-]{3,16}$/u.test(n)){msg.textContent='Use de 3 a 16 letras ou números para o nome.';name.setAttribute('aria-invalid','true');name.focus();return;}
    busy=true;next.disabled=true;back.disabled=true;nav.querySelectorAll('button').forEach(b=>b.disabled=true);msg.textContent='Preparando sua jornada…';
    try{
      const c=await net.createChar({name:n,cls,look:{...look},data:newCharData(cls)});
      cancelAnimationFrame(raf);root.classList.remove('creating');sfx('level');onCreated(c);
    }catch(err){busy=false;next.disabled=false;back.disabled=false;nav.querySelectorAll('button').forEach(b=>b.disabled=false);msg.textContent=err.message;}
  }},preview,h('section',{class:'creation-panel'},nav,body,h('footer',{class:'creation-footer'},msg,h('div',{class:'creation-actions'},back,next))));
  const content=h('div',{class:'screen forge-screen'},
    h('header',{class:'forge-header'},h('div',{class:'forge-brand'},icon('feather',27),h('span',{},'PEREGRINOS')),h('span',{class:'forge-header-meta'},'CRIAÇÃO DE PERSONAGEM')),
    h('div',{class:'forge-title'},h('span',{class:'overline'},'ENTRE A SOMBRA E A LUZ'),h('h1',{},'O início de uma jornada.'),h('p',{},'Escolha seu caminho. Leve a luz com você.')),
    form,h('div',{class:'forge-footnote'},h('span',{},'UMA JORNADA DE FÉ E CORAGEM'),h('span',{},'CIDADE DE REFÚGIO')));
  root.append(content);render();
  function draw(now){
    if(!cv.isConnected||root.hidden)return;
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;time+=dt;
    const T=reduced?0:time;g.setTransform(2,0,0,2,0,0);sanctuary(g,T);
    const since=time-attackStart,attack=motion==='attack'&&since<.66;
    if(motion==='attack'&&!attack){motion='idle';modeButtons.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('on',i===0);b.setAttribute('aria-pressed',String(i===0));});}
    drawPerson(g,180,310,4.05,look,personMotion(motionActor,look,{t:T,fx:faces[face][0],fy:faces[face][1],moving:motion==='walk'&&!reduced,walk:time*.55,cls,weapon:CLASSES[cls].arma,weaponId:CLASSES[cls].armaInicial,shield:true,
      atkT:attack?.22-(since%.22):0,swingA:face===3?Math.PI:face===2?-Math.PI/2:0,combo:Math.floor(since/.22)+1}));
    raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
}
