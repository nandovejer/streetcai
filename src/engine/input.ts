// Gestor de entrada: teclado (2 mapas), táctil (lo escribe ui/touch.ts) y mando (Gamepad API).
import { Input, emptyInput } from '../game/fighter';

type Key = keyof Input;
const MAP_P1: Record<string, Key> = {
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  KeyF: 'lp', KeyG: 'lk', KeyT: 'hp', KeyY: 'hk', KeyR: 'block', KeyH: 'special',
};
/** Alternativa con flechas para un solo jugador. */
const MAP_SOLO: Record<string, Key> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyZ: 'lp', KeyX: 'lk', KeyC: 'hp', KeyV: 'hk', Space: 'block', KeyB: 'special',
};
const MAP_P2: Record<string, Key> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyJ: 'lp', KeyK: 'lk', KeyU: 'hp', KeyI: 'hk', KeyO: 'block', KeyL: 'special',
};

export class InputManager {
  private keys = new Set<string>();
  /** Estado táctil compartido; lo actualiza la capa de controles en pantalla. */
  touch: Input = emptyInput();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.touch = Object.assign(this.touch, emptyInput()); });
  }

  private fromMap(map: Record<string, Key>, out: Input) {
    for (const code in map) if (this.keys.has(code)) out[map[code]] = true;
  }

  private fromPad(index: number, out: Input) {
    const pad = navigator.getGamepads ? navigator.getGamepads()[index] : null;
    if (!pad) return;
    const b = (i: number) => !!pad.buttons[i] && pad.buttons[i].pressed;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (ax < -0.45 || b(14)) out.left = true;
    if (ax > 0.45 || b(15)) out.right = true;
    if (ay < -0.55 || b(12)) out.up = true;
    if (ay > 0.55 || b(13)) out.down = true;
    if (b(2)) out.lp = true;
    if (b(0)) out.lk = true;
    if (b(3)) out.hp = true;
    if (b(1)) out.hk = true;
    if (b(4) || b(6)) out.block = true;
    if (b(5) || b(7)) out.special = true;
  }

  /** player 0 o 1; twoPlayers decide si las flechas son del J1 o del J2. */
  get(player: number, twoPlayers: boolean): Input {
    const out = emptyInput();
    if (player === 0) {
      this.fromMap(MAP_P1, out);
      if (!twoPlayers) this.fromMap(MAP_SOLO, out);
      (Object.keys(out) as Key[]).forEach((k) => { if (this.touch[k]) out[k] = true; });
      this.fromPad(0, out);
    } else {
      this.fromMap(MAP_P2, out);
      this.fromPad(1, out);
    }
    if (out.left && out.right) out.left = out.right = false;
    return out;
  }
}
