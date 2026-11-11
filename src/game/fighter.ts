// Luchador: máquina de estados + físicas. No sabe nada de render ni de audio.
import { FighterDef, GRAVITY, MoveData, MoveId } from './data';

export interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  lp: boolean; hp: boolean; lk: boolean; hk: boolean; block: boolean; special: boolean;
}
export const emptyInput = (): Input => ({
  left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, block: false, special: false,
});

export type State =
  | 'idle' | 'walk' | 'crouch' | 'prejump' | 'jump' | 'land' | 'attack' | 'airattack'
  | 'blockstun' | 'hit' | 'stunned' | 'knockdown' | 'down' | 'getup' | 'ko' | 'victory';

export interface GameEvent {
  type: 'hit' | 'block' | 'dust' | 'jump' | 'land' | 'whoosh' | 'ko' | 'special' | 'projectile' | 'guardbreak' | 'fall' | 'clash';
  x: number; y: number; heavy?: boolean; kick?: boolean; who?: number;
}

export interface Rect { l: number; r: number; b: number; t: number }
export const overlap = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b;

export class Fighter {
  x = 0; y = 0; vx = 0; vy = 0; kb = 0;
  facing: 1 | -1 = 1;
  hp = 0; guard = 100; wins = 0;
  state: State = 'idle';
  t = 0;
  move: MoveData | null = null;
  moveDone = false; moveHit = false;
  stun = 0; stunTotal = 1;
  comboHits = 0;
  flash = 0;
  guarding = false; blockLow = false;
  landed = false;
  inp: Input = emptyInput();
  private buf: MoveId | null = null;
  private bufT = 0;
  private clock = 0; private mD = -99; private mDF = -99; private mF = -99;
  private jumpDir = 0;

  constructor(public def: FighterDef, public idx: number) { this.hp = def.maxHp; }

  reset(x: number, facing: 1 | -1) {
    this.x = x; this.y = 0; this.vx = this.vy = this.kb = 0; this.facing = facing;
    this.hp = this.def.maxHp; this.guard = 100; this.state = 'idle'; this.t = 0; this.move = null;
    this.stun = 0; this.comboHits = 0; this.flash = 0; this.guarding = false; this.buf = null; this.landed = false;
    this.inp = emptyInput();
  }

  get grounded() { return this.y <= 0; }
  get actionable() { return this.state === 'idle' || this.state === 'walk' || this.state === 'crouch'; }
  get attacking() { return this.state === 'attack' || this.state === 'airattack'; }
  get isDown() { return this.state === 'knockdown' || this.state === 'down' || this.state === 'getup' || this.state === 'ko'; }
  get crouching() { return this.state === 'crouch' || (this.state === 'blockstun' && this.blockLow); }
  holdingBack() { return this.facing === 1 ? this.inp.left : this.inp.right; }
  canBlock() {
    return this.grounded && (this.actionable || this.state === 'blockstun') && (this.inp.block || this.holdingBack());
  }

  setState(s: State) { if (this.state !== s) { this.state = s; this.t = 0; } }

  hurtbox(): Rect | null {
    if (this.isDown || this.state === 'victory') return null;
    const w = 20;
    if (!this.grounded) return { l: this.x - w, r: this.x + w, b: this.y + 8, t: this.y + 112 };
    const h = this.crouching ? 88 : 138;
    return { l: this.x - w, r: this.x + w, b: 0, t: h };
  }

  hitbox(): Rect | null {
    const m = this.move;
    if (!m || !this.attacking || this.moveDone || m.projectile) return null;
    if (this.t < m.startup || this.t >= m.startup + m.active) return null;
    const hb = m.hitbox;
    const l = this.facing === 1 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { l, r: l + hb.w, b: this.y + hb.y, t: this.y + hb.y + hb.h };
  }

  private startMove(id: MoveId, canSpecial: boolean, ev: GameEvent[]) {
    if (id === 'special' && !canSpecial) id = 'hp';
    this.state = 'attack'; this.t = 0; this.move = this.def.moves[id];
    this.moveDone = false; this.moveHit = false; this.vx = 0; this.buf = null; this.guarding = false;
    ev.push({ type: id === 'special' ? 'special' : 'whoosh', x: this.x, y: 90, heavy: this.move.heavy, who: this.idx });
  }

  update(inp: Input, opp: Fighter, ev: GameEvent[], threat: boolean, canSpecial: boolean) {
    const prev = this.inp;
    this.inp = inp;
    this.clock++;
    if (this.actionable) this.facing = opp.x >= this.x ? 1 : -1;
    const fwd = this.facing === 1 ? inp.right : inp.left;
    const back = this.facing === 1 ? inp.left : inp.right;

    // Detección de cuarto de luna (abajo, abajo-adelante, adelante)
    if (inp.down && !fwd && !back) this.mD = this.clock;
    else if (inp.down && fwd && this.clock - this.mD < 14) this.mDF = this.clock;
    else if (fwd && !inp.down && this.clock - this.mDF < 14) { this.mF = this.clock; this.mDF = -99; }

    // Buffer de entrada
    let want: MoveId | null = null;
    if (inp.special && !prev.special) want = 'special';
    else if (inp.hk && !prev.hk) want = 'hk';
    else if (inp.hp && !prev.hp) want = 'hp';
    else if (inp.lk && !prev.lk) want = 'lk';
    else if (inp.lp && !prev.lp) want = 'lp';
    if ((want === 'lp' || want === 'hp') && this.clock - this.mF < 12) want = 'special';
    if (want) { this.buf = want; this.bufT = 9; } else if (this.bufT > 0 && --this.bufT === 0) this.buf = null;

    if (this.flash > 0) this.flash--;
    if (this.state !== 'blockstun' && this.state !== 'stunned') this.guard = Math.min(100, this.guard + 0.12);
    this.t++;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': {
        this.comboHits = 0;
        this.guarding = inp.block || (back && threat);
        if (this.buf) this.startMove(this.buf, canSpecial, ev);
        else if (this.guarding) { this.vx = 0; this.setState(inp.down ? 'crouch' : 'idle'); }
        else if (inp.up) { this.setState('prejump'); this.vx = 0; this.jumpDir = inp.right ? 1 : inp.left ? -1 : 0; }
        else if (inp.down) { this.setState('crouch'); this.vx = 0; }
        else if (inp.left !== inp.right) {
          this.setState('walk');
          this.vx = (inp.right ? 1 : -1) * this.def.walk * (back ? 0.8 : 1);
        } else { this.setState('idle'); this.vx = 0; }
        break;
      }
      case 'prejump':
        if (this.t >= 3) {
          this.setState('jump'); this.vy = this.def.jumpV; this.vx = this.jumpDir * this.def.jumpVx; this.y = 0.01;
          ev.push({ type: 'jump', x: this.x, y: 0 });
        }
        break;
      case 'jump':
        if (this.buf && this.buf !== 'special') {
          this.state = 'airattack'; this.t = 0; this.move = this.def.moves.jk; this.moveDone = false; this.moveHit = false; this.buf = null;
          ev.push({ type: 'whoosh', x: this.x, y: this.y + 40, heavy: true });
        }
        this.air(ev);
        break;
      case 'airattack':
        this.air(ev);
        break;
      case 'land':
        if (this.t >= 3) this.setState('idle');
        break;
      case 'attack': {
        const m = this.move!;
        this.vx = this.t < m.startup && m.lunge ? this.facing * m.lunge : 0;
        if (m.projectile && this.t === m.startup) ev.push({ type: 'projectile', x: this.x + this.facing * 46, y: 96, who: this.idx });
        if (this.moveHit && this.buf && this.t >= m.startup && this.def.moves[this.buf].level > m.level && this.buf !== 'jk') {
          if (this.buf !== 'special' || canSpecial) { this.startMove(this.buf, canSpecial, ev); break; }
        }
        if (this.t >= m.startup + m.active + m.recovery) { this.setState('idle'); this.move = null; }
        break;
      }
      case 'blockstun': case 'hit': case 'stunned':
        this.vx = 0;
        if (--this.stun <= 0) { this.setState('idle'); this.guarding = false; }
        break;
      case 'knockdown': case 'ko':
        if (!this.landed) {
          this.y += this.vy; this.vy -= GRAVITY;
          if (this.y <= 0 && this.vy < 0) {
            this.y = 0; this.vy = 0; this.landed = true; this.t = 0; this.kb *= 0.4;
            ev.push({ type: 'fall', x: this.x, y: 0 });
            if (this.state === 'knockdown') this.setState('down');
          }
        }
        break;
      case 'down':
        if (this.t >= 32) this.setState('getup');
        break;
      case 'getup':
        if (this.t >= 18) { this.setState('idle'); this.landed = false; }
        break;
      case 'victory':
        this.vx = 0;
        break;
    }

    this.x += this.vx + this.kb;
    this.kb *= 0.82;
    if (Math.abs(this.kb) < 0.05) this.kb = 0;
  }

  private air(ev: GameEvent[]) {
    this.y += this.vy; this.vy -= GRAVITY;
    if (this.y <= 0 && this.vy < 0) {
      this.y = 0; this.vy = 0; this.vx = 0; this.move = null; this.setState('land');
      ev.push({ type: 'land', x: this.x, y: 0 });
    }
  }

  /** Nombre del frame del atlas que corresponde al estado actual. */
  frame(): string {
    const pick = (anim: string, arr: number[], p: number) => `${anim}_${arr[Math.min(arr.length - 1, Math.max(0, Math.floor(p * arr.length)))]}`;
    switch (this.state) {
      case 'idle': case 'victory':
        if (this.guarding && this.state === 'idle') return 'punch_0';
        return `idle_${Math.floor(this.t / 7) % 8}`;
      case 'walk': {
        const i = Math.floor(this.t / 5) % 8;
        return `walk_${this.vx * this.facing < 0 ? 7 - i : i}`;
      }
      case 'crouch': return this.guarding ? 'jump_1' : 'jump_0';
      case 'prejump': return 'jump_1';
      case 'jump': return this.vy > 3.5 ? 'jump_2' : this.vy > -3.5 ? 'jump_3' : 'jump_4';
      case 'land': return 'jump_5';
      case 'attack': case 'airattack': {
        const m = this.move;
        if (!m) return 'idle_0';
        if (this.t < m.startup) return pick(m.anim, m.timeline.s, this.t / m.startup);
        if (this.t < m.startup + m.active) return pick(m.anim, m.timeline.a, (this.t - m.startup) / m.active);
        return pick(m.anim, m.timeline.r, (this.t - m.startup - m.active) / m.recovery);
      }
      case 'blockstun': return this.blockLow ? 'jump_1' : 'punch_0';
      case 'hit': return pick('hit', [0, 1, 2, 4, 5], 1 - this.stun / this.stunTotal);
      case 'stunned': return `hit_${Math.floor(this.t / 10) % 2 ? 4 : 5}`;
      case 'knockdown': case 'ko':
        if (!this.landed) return this.vy > 0 ? 'ko_0' : 'ko_1';
        return this.t < 6 ? 'ko_2' : this.t < 14 ? 'ko_3' : 'ko_4';
      case 'down': return this.t < 6 ? 'ko_2' : this.t < 14 ? 'ko_3' : 'ko_4';
      case 'getup': return this.t < 9 ? 'ko_3' : 'jump_0';
    }
  }
}
