// Teclado + mouse no PC, joystick virtual + botões na tela no celular.
const KEYMAP = {
  KeyJ: 'attack', KeyK: 'skill', Space: 'dodge', ShiftLeft: 'defend', ShiftRight: 'defend', KeyL: 'defend',
  KeyQ: 'item1', Digit1: 'item1', Numpad1: 'item1', Digit2: 'item2', Numpad2: 'item2', KeyR: 'mount', KeyE: 'interact', KeyF: 'interact', KeyI: 'menu', Tab: 'menu', KeyM: 'map', KeyT: 'lock', KeyH: 'botija', Enter: 'chat', Escape: 'escape'
};
const MOVE = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

export const input = {
  keys: new Set(), pressed: new Set(), held: new Set(),
  mx: 0, my: 0, mouseAim: false, touch: false,
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0 },
  enabled: true,
  consume(a) { if (this.pressed.has(a)) { this.pressed.delete(a); return true; } return false; },
  isHeld(a) { return this.held.has(a); },
  move() {
    let x = 0, y = 0;
    for (const k of this.keys) if (MOVE[k]) { x += MOVE[k][0]; y += MOVE[k][1]; }
    if (this.stick.id != null) { x = this.stick.x; y = this.stick.y; }
    if (this.pad) { x = this.pad.x; y = this.pad.y; } // analógico do controle (gamepad.js)
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  clear() { this.pressed.clear(); this.held.clear(); this.keys.clear(); this.stick.id = null; this.stick.x = this.stick.y = 0; }
};

function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }

export function initInput(canvas) {
  addEventListener('keydown', e => {
    if (typing(e) || !document.body.classList.contains('playing')) return;
    const a = KEYMAP[e.code];
    if (MOVE[e.code]) { input.keys.add(e.code); input.mouseAim = false; e.preventDefault(); }
    if (a) { if (!e.repeat) input.pressed.add(a); input.held.add(a); e.preventDefault(); }
  });
  addEventListener('keyup', e => {
    input.keys.delete(e.code);
    const a = KEYMAP[e.code]; if (a) input.held.delete(a);
  });
  addEventListener('blur', () => input.clear());
  canvas.addEventListener('mousemove', e => { input.mx = e.clientX; input.my = e.clientY; input.mouseAim = true; });
  canvas.addEventListener('mousedown', e => {
    input.mx = e.clientX; input.my = e.clientY; input.mouseAim = true;
    if (e.button === 0) { input.pressed.add('attack'); input.held.add('attack'); }
    if (e.button === 2) input.pressed.add('skill');
    if (e.button === 1) { e.preventDefault(); input.pressed.add('lock'); }
  });
  addEventListener('mouseup', e => { if (e.button === 0) input.held.delete('attack'); });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // joystick: qualquer toque na metade esquerda da tela
  const stickEl = document.getElementById('stick'), knob = document.getElementById('knob');
  const R = 52;
  const place = () => {
    stickEl.style.left = input.stick.ox + 'px'; stickEl.style.top = input.stick.oy + 'px';
    knob.style.transform = `translate(${input.stick.x * R}px, ${input.stick.y * R}px)`;
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    input.touch = true; document.body.classList.add('touch');
    if (e.clientX < innerWidth * 0.5 && input.stick.id == null) {
      input.stick.id = e.pointerId; input.stick.ox = e.clientX; input.stick.oy = e.clientY; input.stick.x = input.stick.y = 0;
      stickEl.classList.add('on'); place();
    }
  });
  addEventListener('pointermove', e => {
    if (e.pointerId !== input.stick.id) return;
    let dx = e.clientX - input.stick.ox, dy = e.clientY - input.stick.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) { input.stick.ox += dx - dx / l * R; input.stick.oy += dy - dy / l * R; dx = dx / l * R; dy = dy / l * R; }
    input.stick.x = dx / R; input.stick.y = dy / R;
    if (Math.hypot(input.stick.x, input.stick.y) < 0.15) input.stick.x = input.stick.y = 0;
    place();
  });
  const end = e => { if (e.pointerId === input.stick.id) { input.stick.id = null; input.stick.x = input.stick.y = 0; stickEl.classList.remove('on'); } };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  // botões de ação na tela
  document.querySelectorAll('[data-act]').forEach(b => {
    const a = b.dataset.act;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); input.touch = true; input.mouseAim = false; input.pressed.add(a); input.held.add(a); b.classList.add('down'); b.setPointerCapture?.(e.pointerId); });
    const up = () => { input.held.delete(a); b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  if (matchMedia('(pointer: coarse)').matches) { input.touch = true; document.body.classList.add('touch'); }
}
