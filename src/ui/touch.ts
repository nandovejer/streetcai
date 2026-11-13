// Controles táctiles: joystick virtual de 8 direcciones + 6 botones. Escribe en el Input compartido.
// En vertical el panel se ve también en los menús, con los botones rotulados para navegar (ver main.ts).
import { Input } from '../game/fighter';

/** label = en combate; menu = en los menús. */
const BUTTONS: { k: keyof Input; label: string; menu: string; cls: string }[] = [
  { k: 'hp', label: 'PF', menu: '1P/2P', cls: 'heavy' }, { k: 'hk', label: 'KF', menu: 'BARRIO', cls: 'heavy' }, { k: 'special', label: 'SP', menu: 'NIVEL', cls: 'sp' },
  { k: 'lp', label: 'P', menu: 'OK', cls: 'light' }, { k: 'lk', label: 'K', menu: 'ATRAS', cls: 'light' }, { k: 'block', label: 'BLQ', menu: 'CREDITO', cls: 'blk' },
];

/**
 * Móvil o tablet: el puntero principal es el dedo (pointer: coarse) o el navegador se anuncia como móvil.
 * Un portátil con pantalla táctil tiene ratón como puntero principal y se queda con teclado.
 */
export function isTouchDevice() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1); // iPadOS se anuncia como Mac
  return coarse || uaMobile;
}

export function setupTouch(root: HTMLElement, state: Input) {
  root.innerHTML = '<div id="panel-hint"></div><div id="pad"><div id="stick"><div id="knob"></div></div><div id="btns"></div></div>';
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
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault(); stickId = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch { /* puntero ya liberado */ }
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  for (const b of BUTTONS) {
    const el = document.createElement('button');
    el.className = 'tb ' + b.cls;
    el.innerHTML = `<span class="lf">${b.label}</span><span class="lm">${b.menu}</span>`;
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
