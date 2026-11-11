// Controles táctiles: joystick virtual de 8 direcciones + 6 botones. Escribe en el Input compartido.
import { Input } from '../game/fighter';

const BUTTONS: { k: keyof Input; label: string; cls: string }[] = [
  { k: 'hp', label: 'PF', cls: 'heavy' }, { k: 'hk', label: 'KF', cls: 'heavy' }, { k: 'special', label: 'SP', cls: 'sp' },
  { k: 'lp', label: 'P', cls: 'light' }, { k: 'lk', label: 'K', cls: 'light' }, { k: 'block', label: 'BLQ', cls: 'blk' },
];

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function setupTouch(root: HTMLElement, state: Input) {
  root.innerHTML = '<div id="stick"><div id="knob"></div></div><div id="btns"></div>';
  const stick = root.querySelector<HTMLElement>('#stick')!, knob = root.querySelector<HTMLElement>('#knob')!;
  const btns = root.querySelector<HTMLElement>('#btns')!;

  let stickId: number | null = null;
  const setDir = (dx: number, dy: number) => {
    const dead = 0.28;
    state.left = dx < -dead; state.right = dx > dead; state.up = dy < -0.5; state.down = dy > 0.42;
  };
  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect(), rad = r.width / 2;
    let dx = (e.clientX - (r.left + rad)) / rad, dy = (e.clientY - (r.top + rad)) / rad;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    knob.style.transform = `translate(${dx * rad * 0.55}px, ${dy * rad * 0.55}px)`;
    setDir(dx, dy);
  };
  const endStick = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = null; knob.style.transform = ''; setDir(0, 0);
  };
  stick.addEventListener('pointerdown', (e) => { e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  for (const b of BUTTONS) {
    const el = document.createElement('button');
    el.className = 'tb ' + b.cls; el.textContent = b.label;
    const set = (v: boolean) => (e: PointerEvent) => {
      e.preventDefault(); state[b.k] = v; el.classList.toggle('down', v);
      if (v) { try { el.setPointerCapture(e.pointerId); } catch { /* noop */ } if (navigator.vibrate) navigator.vibrate(8); }
    };
    el.addEventListener('pointerdown', set(true));
    el.addEventListener('pointerup', set(false));
    el.addEventListener('pointercancel', set(false));
    btns.appendChild(el);
  }
  root.addEventListener('contextmenu', (e) => e.preventDefault());
}
