// Motor de chefes dirigido por dados: biblioteca de golpes, regras passivas, movimentos e condições.
// Um chefe (data/bestiary.js ou "chefes" de uma semana) só descreve QUAIS golpes usa e com que números;
// o comportamento de cada golpe mora aqui e é reaproveitado por todos.
//
// Cada golpe é chamado a cada quadro enquanto está ativo: (G, b, o, dt, c)
//   G = o jogo, b = o chefe, o = parâmetros do golpe (do arquivo de dados), dt = tempo do quadro,
//   c = { p, dist, ax, ay, al } (jogador, distância e vetor até ele).
// b.step / b.stepT controlam as etapas; o golpe termina chamando G.endAct(b, espera).
import { TAU, rand, pick, angDiff } from '../util.js';
import { sfx } from '../audio.js';
import { FALSAS } from '../data/bestiary.js';

const fala = (G, b, o, dy = 60) => { if (o.fala) G.addText(b.x, b.y - dy, o.fala, o.corFala || '#FFFFFF', 15); };

export const MOVES = {
  // Anel de projéteis em volta do chefe (moedas do Mamom). n, vel, raio, cor, som, aviso
  anel(G, b, o) {
    if (b.step === 0) { b.step = 1; b.talk = true; G.tele.push({ kind: 'circle', x: b.x, y: b.y, r: b.r + 20, t: o.aviso ?? 0.5, max: o.aviso ?? 0.5, color: o.corAviso || '242,193,78' }); }
    if (b.stepT > (o.aviso ?? 0.5)) {
      const n = o.n ?? 12;
      for (let i = 0; i < n; i++) G.proj({ x: b.x, y: b.y, a: i * TAU / n + G.T, spd: o.vel ?? 230, r: o.raio ?? 7, life: 2.2, owner: 'e', kind: 'mal', dmg: b.atk * (o.dano ?? 1), color: o.cor || '#FFD23F', src: b, reflect: true });
      sfx(o.som || 'shoot'); G.endAct(b, o.espera ?? 1.6);
    }
  },

  // Investida em linha reta (avisa com uma faixa). vel, dur, repete (quantas investidas extras seguidas)
  investida(G, b, o, dt, c) {
    const { p } = c, vel = o.vel ?? 520, dur = o.dur ?? 0.7;
    if (b.step === 0) { b.step = 1; b.dashA = Math.atan2(p.y - b.y, p.x - b.x); G.tele.push({ kind: 'line', x: b.x, y: b.y, a: b.dashA, len: vel * dur, w: b.r * 2, t: 0.7, max: 0.7, color: o.corAviso || '255,80,60' }); }
    if (b.step === 1 && b.stepT > 0.7) { b.step = 2; b.dashHit = false; sfx('boss'); }
    if (b.step === 2) {
      const ox = b.x, oy = b.y;
      G.moveEnt(b, Math.cos(b.dashA) * vel * dt, Math.sin(b.dashA) * vel * dt);
      G.puff(b.x, b.y + b.r * 0.8, 2, 'rgba(200,180,140,.6)');
      if (!b.dashHit && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + 6) { b.dashHit = true; G.damagePlayer(b.atk * (o.dano ?? 1.4), b); }
      if (b.stepT > 0.7 + dur || (Math.abs(b.x - ox) + Math.abs(b.y - oy) < 1)) {
        G.shake(6);
        b.repetidas = (b.repetidas || 0) + 1;
        if (b.repetidas <= (o.repete || 0)) { b.step = 0; b.stepT = 0; } // emenda outra investida
        else { b.repetidas = 0; G.endAct(b, o.espera ?? 1.2); }
      }
    }
  },

  // Chama vícios para ajudar. tipos[], n, forca (multiplicador), espalha (px), fala
  invocar(G, b, o) {
    const s = o.espalha ?? 60;
    for (let i = 0; i < (o.n ?? 2); i++) G.enemies.push(G.makeEnemy(pick(o.tipos), b.x + rand(-s, s), b.y + rand(-20, s), o.forca ?? 1.2));
    fala(G, b, o, 70); G.endAct(b, o.espera ?? 2);
  },

  // Dois raios opostos que giram em volta do chefe (ponteiros do relógio). alcance, giro (rad/s), dur
  raios(G, b, o, dt, c) {
    const aquece = o.aquece ?? 0.8, alcance = o.alcance ?? 240;
    if (b.step === 0) { b.step = 1; b.beamA = Math.atan2(c.ay, c.ax) + Math.PI / 2; }
    const warm = b.stepT < aquece, a1 = b.beamA + (warm ? 0 : (b.stepT - aquece) * (o.giro ?? 1.6));
    b.beams = [{ a: a1, warm }, { a: a1 + Math.PI, warm }];
    if (!warm) for (const bm of b.beams) {
      const pa = Math.atan2(c.ay, c.ax);
      if (c.dist < alcance && c.dist > b.r * 0.5 && Math.abs(angDiff(pa, bm.a)) < 0.12) G.damagePlayer(b.atk * (o.dano ?? 1), b, { noKnock: true });
    }
    if (b.stepT > (o.dur ?? 3.6)) { b.beams = null; G.endAct(b, o.espera ?? 1.4); }
  },

  // Cria cópias falsas de 1 de vida (somem num golpe). n, fala
  clones(G, b, o) {
    G.burst(b.x, b.y, 30, b.d.cor, 240); fala(G, b, o);
    for (let i = 0; i < (o.n ?? 3); i++) {
      const k = G.makeBoss(b.id, b.x + rand(-140, 140), b.y + rand(-80, 80));
      k.clone = true; k.hp = 1; k.max = 1; k.engaged = true; k.cd = rand(1, 2);
      if (G.cur.map.collides(k.x, k.y, k.r)) { k.x = b.x; k.y = b.y; }
      G.enemies.push(k);
    }
    G.endAct(b, o.espera ?? 1.2);
  },

  // Troca de lugar com uma das cópias
  trocar(G, b, o) {
    const k = pick(G.enemies.filter(e => e.clone));
    if (k) { const tx = k.x, ty = k.y; k.x = b.x; k.y = b.y; b.x = tx; b.y = ty; G.burst(b.x, b.y, 12, b.d.cor, 120); G.burst(k.x, k.y, 12, b.d.cor, 120); }
    G.endAct(b, o.espera ?? 0.8);
  },

  // Leque de projéteis mirando o jogador. n, abertura (rad entre tiros), vel, rotulo: 'falsas' escreve mentiras no tiro do meio
  leque(G, b, o, dt, c) {
    if (b.step === 0) { b.step = 1; b.talk = true; }
    if (b.stepT > (o.aviso ?? 0.45)) {
      const a = Math.atan2(c.ay, c.ax), meio = Math.floor((o.n ?? 5) / 2);
      for (let i = -meio; i <= meio; i++) G.proj({ x: b.x, y: b.y - 10, a: a + i * (o.abertura ?? 0.22), spd: o.vel ?? 260, r: o.raio ?? 7, life: 2.4, owner: 'e', kind: 'mal', dmg: b.atk * (o.dano ?? 1), color: o.cor || b.d.cor, label: i === 0 && o.rotulo === 'falsas' ? pick(FALSAS).split(' ').slice(0, 2).join(' ') + '…' : null, src: b, reflect: true });
      sfx('shoot'); G.endAct(b, o.espera ?? 1.5);
    }
  },

  // Rajadas seguidas mirando o jogador. vezes, intervalo, angulos[], desvio (imprecisão), vel, raio
  rajada(G, b, o, dt, c) {
    const vezes = o.vezes ?? 3;
    if (b.stepT > (o.intervalo ?? 0.35) * (b.step + 1) && b.step < vezes) {
      b.step++; const a = Math.atan2(c.ay, c.ax);
      for (const da of o.angulos || [0]) G.proj({ x: b.x, y: b.y - 20, a: a + da + (o.desvio ? rand(-o.desvio, o.desvio) : 0), spd: o.vel ?? 300, r: o.raio ?? 9, life: 2.5, owner: 'e', kind: 'mal', dmg: b.atk * (o.dano ?? 1), color: o.cor || b.d.cor, src: b, reflect: true });
      sfx('shoot');
    }
    if (b.step >= vezes) G.endAct(b, o.espera ?? 1.3);
  },

  // Golpes que caem onde o jogador ESTÁ, um de cada vez. vezes, intervalo, raioArea, aviso
  marcados(G, b, o, dt, c) {
    const vezes = o.vezes ?? 3, R = o.raioArea ?? 74;
    if (b.stepT > (o.intervalo ?? 0.5) * b.step && b.step < vezes) {
      b.step++; const x = c.p.x, y = c.p.y;
      G.tele.push({ kind: 'circle', x, y, r: R, t: o.aviso ?? 0.85, max: o.aviso ?? 0.85, color: o.corAviso || '255,60,60', dano: b.atk * (o.dano ?? 1.4), onEnd: () => { G.shake(8); G.burst(x, y, 24, o.cor || '#FF5A3C', 260); if (Math.hypot(G.p.x - x, G.p.y - y) < R + G.p.r) G.damagePlayer(b.atk * (o.dano ?? 1.4), { x, y }); } });
    }
    if (b.stepT > (o.dur ?? 2.4)) G.endAct(b, o.espera ?? 1.2);
  },

  // Chuva de pedras/objetos em volta do jogador, em sequência. n, espalhaX, espalhaY, raioArea
  chuva(G, b, o, dt, c) {
    const R = o.raioArea ?? 48;
    if (b.step === 0) {
      b.step = 1; sfx('boss'); fala(G, b, o, 70);
      for (let i = 0; i < (o.n ?? 5); i++) {
        const x = c.p.x + rand(-(o.espalhaX ?? 140), o.espalhaX ?? 140), y = c.p.y + rand(-(o.espalhaY ?? 110), o.espalhaY ?? 110), t = 0.85 + i * 0.12;
        G.tele.push({ kind: 'circle', x, y, r: R, t, max: t, color: o.corAviso || '255,120,60', dano: b.atk * (o.dano ?? 1.1), onEnd: () => { G.shake(5); G.burst(x, y, 14, o.cor || '#9A8466', 180); if (Math.hypot(G.p.x - x, G.p.y - y) < R + G.p.r) G.damagePlayer(b.atk * (o.dano ?? 1.1), { x, y }); } });
      }
    }
    if (b.stepT > (o.dur ?? 2.2)) G.endAct(b, o.espera ?? 1.1);
  },

  // Pisão: anéis de choque que se espalham a partir do chefe (pule por cima com a esquiva). ondas, vel
  pisao(G, b, o) {
    if (b.step === 0) { b.step = 1; G.tele.push({ kind: 'circle', x: b.x, y: b.y, r: b.r + 30, t: 0.7, max: 0.7, color: o.corAviso || '255,120,60' }); }
    if (b.step === 1 && b.stepT > 0.7) {
      b.step = 2; G.shake(14); sfx('boss');
      for (let k = 0; k < (o.ondas ?? 2); k++) G.hazards.push({ ring: true, x: b.x, y: b.y, r: b.r, spd: o.vel ?? 240, t: 1.6, delay: k * 0.5, dmg: b.atk * (o.dano ?? 1), hit: false, color: o.cor || '255,170,90' });
    }
    if (b.stepT > (o.dur ?? 2.6)) G.endAct(b, o.espera ?? 1.2);
  },

  // Poças/redemoinhos no chão que machucam enquanto o jogador fica dentro. n, espalhaX, espalhaY, raioArea, duracao
  pocas(G, b, o, dt, c) {
    if (b.step === 0) {
      b.step = 1; const R = o.raioArea ?? 56, cor = o.cor || '210,65,110';
      for (let i = 0; i < (o.n ?? 4); i++) {
        const x = c.p.x + rand(-(o.espalhaX ?? 90), o.espalhaX ?? 90), y = c.p.y + rand(-(o.espalhaY ?? 90), o.espalhaY ?? 90);
        G.tele.push({ kind: 'circle', x, y, r: R, t: 0.9, max: 0.9, color: cor, onEnd: () => G.hazards.push({ x, y, r: R, t: o.duracao ?? 3.2, dmg: b.atk * (o.dano ?? 0.5), tick: 0, color: cor }) });
      }
    }
    if (b.stepT > (o.dur ?? 1.2)) G.endAct(b, o.espera ?? 1.6);
  },

  // Encanto: puxa o jogador para perto; só a esquiva quebra (ver regras.fugaVulneravel). alcance, duracao
  encanto(G, b, o, dt, c) {
    const alcance = o.alcance ?? 320;
    if (b.step === 0) { b.step = 1; G.tele.push({ kind: 'ring', x: b.x, y: b.y, r: alcance, t: 0.8, max: 0.8, color: o.corAviso || '255,120,170' }); fala(G, b, o, 70); }
    if (b.step === 1 && b.stepT > 0.8) { b.step = 2; if (c.dist < alcance + 10) { c.p.charm = { src: b, t: o.duracao ?? 2.4 }; G.addText(c.p.x, c.p.y - 44, o.aviso || 'ESQUIVE PARA FUGIR!', '#FFB3D1', 15); } }
    if (b.stepT > (o.dur ?? 3.3)) G.endAct(b, o.espera ?? 1.2);
  },

  // Mergulha (fica invencível) e ressurge perto do jogador numa das âncoras (ver "ancoras" do chefe)
  mergulho(G, b, o, dt, c) {
    if (b.step === 0) { b.step = 1; b.submerged = true; b.inv = true; G.burst(b.x, b.y, 30, o.cor || '#9FE6F0', 200); }
    b.alpha = Math.max(0.15, 1 - b.stepT * 2);
    if (b.step === 1 && b.stepT > 1.2) {
      b.step = 2; const anc = b.anchors || [];
      const near = anc.filter(a => Math.hypot(a.x - c.p.x, a.y - c.p.y) < 300), a = pick(near.length ? near : anc);
      if (a) { b.x = a.x; b.y = a.y; }
      G.tele.push({ kind: 'circle', x: b.x, y: b.y, r: b.r + 30, t: 0.6, max: 0.6, color: o.corAviso || '90,200,230' });
    }
    if (b.step === 2 && b.stepT > 1.8) {
      b.submerged = false; b.inv = false; b.alpha = 1; G.burst(b.x, b.y, 40, o.cor || '#9FE6F0', 260); G.shake(10);
      if (Math.hypot(G.p.x - b.x, G.p.y - b.y) < b.r + 60) G.damagePlayer(b.atk * (o.dano ?? 1.3), b);
      G.endAct(b, o.espera ?? 1);
    }
  },

  // Estocada de lança: mira no jogador, trava a mira um pouco antes e avança golpeando em linha.
  // É um golpe "de frente": dá para aparar com a defesa perfeita (ver regra armadura).
  // aviso (s), alcance, largura, avanco (px que o chefe dá para frente), repete (estocadas extras seguidas)
  estocada(G, b, o, dt, c) {
    const aviso = o.aviso ?? 0.75, alcance = o.alcance ?? 180, w = o.largura ?? 44;
    if (b.step === 0) { b.step = 1; b.talk = true; b.lancaA = Math.atan2(c.ay, c.ax); b.lanca = 'mira'; fala(G, b, o, 90); }
    if (b.step === 1) {
      if (b.stepT < aviso * 0.6) b.lancaA = Math.atan2(c.ay, c.ax); // segue o jogador e depois trava
      else if (!b.travou) { b.travou = true; G.tele.push({ kind: 'line', x: b.x, y: b.y, a: b.lancaA, len: alcance + (o.avanco ?? 50), w, t: aviso * 0.4, max: aviso * 0.4, color: o.corAviso || '255,200,90' }); }
      if (b.stepT >= aviso) {
        b.step = 2; b.travou = false; b.lanca = 'golpe'; sfx('boss');
        G.moveEnt(b, Math.cos(b.lancaA) * (o.avanco ?? 50), Math.sin(b.lancaA) * (o.avanco ?? 50));
        if (G.inLine(G.p, b.x, b.y, b.lancaA, alcance, w)) G.damagePlayer(b.atk * (o.dano ?? 1.3), b);
        G.shake(4);
      }
    }
    if (b.step === 2 && b.stepT > aviso + 0.35) {
      b.repetidas = (b.repetidas || 0) + 1;
      if (b.repetidas <= (o.repete || 0)) { b.step = 0; b.stepT = aviso * 0.35; } // a seguinte vem mais rápido
      else { b.repetidas = 0; b.lanca = null; G.endAct(b, o.espera ?? 1.2); }
    }
  },

  // Onda em faixa reta na direção do jogador. comprimento, largura, repete (true = 2ª onda mirando de novo)
  onda(G, b, o, dt, c) {
    const len = o.comprimento ?? 520, w = o.largura ?? 70, cor = o.corAviso || '90,200,230';
    const solta = (a, t) => G.tele.push({ kind: 'line', x: b.x, y: b.y, a, len, w, t, max: t, color: cor, dano: b.atk * (o.dano ?? 1.5), onEnd: () => {
      G.shake(10);
      for (let i = 0; i < 30; i++) G.parts.push({ x: b.x + Math.cos(a) * i * 17, y: b.y + Math.sin(a) * i * 17, vx: rand(-40, 40), vy: rand(-80, -20), life: 0.8, max: 0.8, size: 6, color: o.cor || '#9FE6F0' });
      if (G.inLine(G.p, b.x, b.y, a, len, w)) G.damagePlayer(b.atk * (o.dano ?? 1.5), b);
    } });
    if (b.step === 0) { b.step = 1; solta(Math.atan2(c.ay, c.ax), 0.9); }
    if (o.repete && b.step === 1 && b.stepT > 1.1) { b.step = 2; solta(Math.atan2(c.p.y - b.y, c.p.x - b.x), 0.75); }
    if (b.stepT > (o.dur ?? 1.4)) G.endAct(b, o.espera ?? 1.1);
  }
};

// Como o chefe se move enquanto não está usando um golpe.
export const MOVIMENTOS = {
  perseguir(G, b, m, dt, c) { if (c.dist > b.r + c.p.r + 10) G.moveEnt(b, c.ax / c.al * b.spd * (m.vel ?? 1) * dt, c.ay / c.al * b.spd * (m.vel ?? 1) * dt); },
  // fica a uma distância e anda de lado (bom para quem atira)
  rodear(G, b, m, dt, c) {
    const want = m.dist ?? 200, dir = c.dist > want + 30 ? 1 : c.dist < want - 30 ? -1 : 0, lado = m.lado ?? 0.6;
    G.moveEnt(b, (c.ax / c.al * dir - c.ay / c.al * lado) * b.spd * (m.vel ?? 1) * dt, (c.ay / c.al * dir + c.ax / c.al * lado) * b.spd * (m.vel ?? 1) * dt);
  },
  parado() {}
};

// Regras passivas que valem a luta toda (a "lição" do chefe costuma morar aqui).
export const REGRAS = {
  // aura que deixa o jogador lento. raio, lentidao, falas[], cor
  aura(G, b, r, dt, c) {
    if (c.dist >= (r.raio ?? 190)) return;
    c.p.slow = Math.min(c.p.slow, r.lentidao ?? 0.55);
    if (r.falas && Math.random() < dt * 2) G.addText(c.p.x + rand(-20, 20), c.p.y - 40, pick(r.falas), r.cor || '#9FC7D6', 11);
  },
  // recupera vida se o jogador parar de bater. apos (s), taxa (fração da vida por segundo), texto
  regenera(G, b, r, dt) {
    if (G.T - (b.lastHit || 0) > (r.apos ?? 3.5) && b.hp < b.max) {
      b.hp = Math.min(b.max, b.hp + b.max * (r.taxa ?? 0.025) * dt);
      if (r.texto && Math.random() < dt) G.addText(b.x, b.y - 60, r.texto, '#7CE0A0', 12);
    }
  },
  // batalha de versículos ao chegar em certas porcentagens de vida. marcas: [0.75, 0.5, 0.25]
  acusacoes(G, b, r) {
    const marcas = r.marcas || r;
    if (b.accused < marcas.length && b.hp / b.max <= marcas[b.accused] && !b.act) { b.accused++; G.accusation(b); return true; }
  },
  // armadura: quase todo dano é absorvido; só uma defesa perfeita contra um dos golpes listados expõe o ponto fraco.
  //   reducao (fração absorvida), golpes[] (quais golpes, aparados, expõem), exposto (s), atordoa (s), bonus (dano extra exposto),
  //   bonusArma: { funda: 2 } (multiplicador extra por arma), texto (ao expor), fraqueza (nome do ponto fraco)
  // O tempo exposto corre aqui (a regra roda a cada quadro); o dano e a defesa ficam em modDano e aoDefender.
  armadura(G, b, r, dt) { if (b.exposto > 0) b.exposto -= dt; }
  // fugaVulneravel: N  →  ao quebrar um encanto com a esquiva, o chefe recebe +50% de dano por N segundos (tratado em game.js)
};

// Multiplicador de dano que as regras do chefe aplicam aos golpes do jogador.
export function modDano(G, b) {
  const r = b.d?.regras?.armadura; if (!r) return 1;
  if (b.exposto > 0) return (r.bonus ?? 1.5) * (r.bonusArma?.[G.st.weapon] ?? 1);
  if (G.T - (b.tinc || 0) > 1.2) { b.tinc = G.T; G.addText(b.x, b.y - b.r - 50, 'A armadura protege! Apare a ' + (r.nomeGolpe || 'lança') + '.', '#D9C7A0', 12); sfx('block'); }
  return 1 - (r.reducao ?? 0.85);
}

// O jogador aparou (defesa perfeita) um golpe do chefe.
export function aoDefender(G, b) {
  const r = b.d?.regras?.armadura;
  if (!r || (r.golpes && !r.golpes.includes(b.act))) return;
  b.exposto = r.exposto ?? 3.5; b.stun = r.atordoa ?? 1.5;
  G.addText(b.x, b.y - b.r - 70, r.texto || 'O PONTO FRACO ESTÁ EXPOSTO!', '#FFE38A', 17, 2);
  G.burst(b.x, b.y - b.r, 30, '#FFE38A', 260); G.shake(10); sfx('crit');
}

// Condições para escolher uma fase além da vida (campo "quando").
export const CONDICOES = {
  temClones: G => G.enemies.some(e => e.clone)
};

// Fase atual: a ÚLTIMA da lista cuja vida (≤) e condição batem. Fases sem "vida" valem desde o começo.
export function faseAtual(G, b) {
  const fs = b.d.fases, ratio = b.hp / b.max;
  let i = 0;
  fs.forEach((f, k) => { if (ratio <= (f.vida ?? 1) && (!f.quando || CONDICOES[f.quando]?.(G, b))) i = k; });
  return i;
}

// Confere os dados de um chefe e avisa no console o que estiver errado (ajuda quem cria semanas novas).
export function validarChefe(id, d) {
  const err = [];
  if (!d.fases?.length) err.push('sem "fases"');
  for (const [k, g] of Object.entries(d.golpes || {})) if (!MOVES[g.tipo]) err.push('golpe "' + k + '" tem tipo desconhecido "' + g.tipo + '"');
  for (const f of d.fases || []) {
    for (const k of f.golpes || []) if (!d.golpes?.[k]) err.push('fase usa golpe inexistente "' + k + '"');
    if (f.mover && !MOVIMENTOS[f.mover.tipo]) err.push('movimento desconhecido "' + f.mover.tipo + '"');
    if (f.quando && !CONDICOES[f.quando]) err.push('condição desconhecida "' + f.quando + '"');
  }
  for (const k of Object.keys(d.regras || {})) if (!REGRAS[k] && k !== 'fugaVulneravel') err.push('regra desconhecida "' + k + '"');
  if (err.length) console.warn('[chefe ' + id + ']', err.join('; '));
  return err;
}
