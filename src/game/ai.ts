// IA por reglas. Decide cada N frames (tiempo de reacción) y solo observa el estado visible del rival,
// nunca sus pulsaciones.
import { Difficulty, MoveId } from './data';
import { Fighter, Input, emptyInput } from './fighter';
import { Projectile } from './match';

const CFG = [
  { react: 26, aggro: 0.3, block: 0.2, combo: 0.1, special: 0.04, antiAir: 0.1 },
  { react: 15, aggro: 0.55, block: 0.5, combo: 0.45, special: 0.1, antiAir: 0.35 },
  { react: 8, aggro: 0.8, block: 0.82, combo: 0.85, special: 0.14, antiAir: 0.7 },
];
const NEXT: Partial<Record<MoveId, MoveId[]>> = { lp: ['lk', 'hp'], lk: ['hp', 'hk'], hp: ['hk', 'special'], hk: ['special'] };

export class AI {
  private cur: Input = emptyInput();
  private hold = 0;
  private pressT = 0;
  constructor(public level: Difficulty, private rnd: () => number = Math.random) {}

  next(me: Fighter, opp: Fighter, projs: Projectile[]): Input {
    if (this.pressT > 0 && --this.pressT === 0) {
      this.cur.lp = this.cur.hp = this.cur.lk = this.cur.hk = this.cur.special = this.cur.up = false;
    }
    if (--this.hold > 0) return this.cur;
    const c = CFG[this.level], r = this.rnd(), r2 = this.rnd();
    const inp = emptyInput();
    const dx = opp.x - me.x, dist = Math.abs(dx);
    const fwd: 'left' | 'right' = dx > 0 ? 'right' : 'left';
    const back: 'left' | 'right' = dx > 0 ? 'left' : 'right';
    let hold = c.react;
    const press = (k: 'lp' | 'hp' | 'lk' | 'hk' | 'special' | 'up') => { inp[k] = true; this.pressT = 3; };
    const projNear = projs.some((p) => p.alive && p.owner !== me.idx && Math.abs(p.x - me.x) < 150 && Math.sign(p.vx) === Math.sign(me.x - p.x));
    const lowHp = me.hp < me.def.maxHp * 0.3;

    if (me.state === 'attack') {
      // Combo sencillo: si el golpe conectó, encadena al siguiente nivel
      if (me.moveHit && me.move && r < c.combo) {
        const opts = NEXT[me.move.id];
        if (opts) press(opts[Math.floor(r2 * opts.length)] as 'hp');
      }
      hold = 4;
    } else if (me.state === 'jump') {
      if (dist < 105 && me.vy < 3 && r < c.aggro + 0.15) press('lk');
      hold = 4;
    } else if (!me.actionable) {
      hold = 4;
    } else if (projNear && r < c.block) {
      if (r2 < 0.3 && dist > 120) { press('up'); inp[fwd] = true; } else inp[back] = true;
      hold = 16;
    } else if (opp.state === 'attack' && dist < 135 && r < c.block) {
      inp[back] = true; hold = 14;
    } else if (opp.state === 'jump' || opp.state === 'airattack') {
      if (dist < 100 && r < c.antiAir) { press(r2 < 0.5 ? 'hk' : 'hp'); hold = 10; }
      else if (dist < 130 && r < c.block) { inp[back] = true; hold = 14; }
      else { inp[fwd] = dist > 150; hold = 8; }
    } else if (opp.isDown) {
      if (dist < 85) inp[back] = true; else if (dist > 140) inp[fwd] = true;
      hold = 10;
    } else if (opp.state === 'stunned' || opp.state === 'hit') {
      if (dist < 82) press(opp.state === 'stunned' ? 'hp' : 'lk'); else inp[fwd] = true;
      hold = 6;
    } else if (lowHp && dist < 120 && r < 0.3) {
      inp[back] = true; hold = 20;
    } else if (dist > 175) {
      if (r < c.special * 2) { press('special'); hold = 30; }
      else if (r < c.special * 2 + 0.08) { press('up'); inp[fwd] = true; hold = 20; }
      else { inp[fwd] = true; hold = 12; }
    } else if (dist > 92) {
      if (r < c.aggro * 0.22) { press('up'); inp[fwd] = true; hold = 20; }
      else if (r < c.aggro * 0.22 + c.special) { press('special'); hold = 30; }
      else if (dist < 108 && r < c.aggro * 0.6) { press('hk'); hold = 12; }
      else if (r > 0.9) { inp[back] = true; hold = 10; }
      else { inp[fwd] = true; hold = 8; }
    } else {
      if (r < c.aggro) {
        press(r2 < 0.35 ? 'lp' : r2 < 0.65 ? 'lk' : r2 < 0.85 ? 'hp' : 'hk'); hold = 8;
      } else if (r < c.aggro + 0.2) { inp[back] = true; hold = 12; }
      else if (r > 0.93) { inp.down = true; hold = 12; }
      else hold = 8;
    }
    this.cur = inp; this.hold = hold;
    return inp;
  }
}
