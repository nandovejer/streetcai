// Motor de combate y gestor de rondas. Simulación pura a 60 Hz (sin DOM), testeable en Node.
import { FighterDef, ROUND_TIME, ROUNDS_TO_WIN, STAGE_W } from './data';
import { Fighter, GameEvent, Input, Rect, overlap } from './fighter';

export interface Projectile { x: number; y: number; vx: number; owner: number; damage: number; t: number; alive: boolean; big: boolean }
export type Phase = 'intro' | 'fight' | 'ko' | 'matchEnd';

interface HitInfo { damage: number; hitstun: number; blockstun: number; push: number; knockdown?: boolean; heavy?: boolean; kick?: boolean; noMeter?: boolean }

const WALL = 30;
const MAX_SEP = 560;
const BODY = 54;

export class Match {
  f: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  events: GameEvent[] = [];
  phase: Phase = 'intro';
  phaseT = 0;
  round = 1;
  timer = ROUND_TIME;
  private tick = 0;
  hitstop = 0;
  /** Congelación dramática al lanzar un súper. */
  superFreeze = 0;
  superWho = 0;
  shake = 0;
  message = '';
  roundWinner = -1;
  matchWinner = -1;
  perfect = false;
  combo: [number, number] = [0, 0];
  comboT: [number, number] = [0, 0];
  frame = 0;

  constructor(a: FighterDef, b: FighterDef) {
    this.f = [new Fighter(a, 0), new Fighter(b, 1)];
    this.startRound();
  }

  private startRound() {
    this.f[0].reset(STAGE_W / 2 - 110, 1);
    this.f[1].reset(STAGE_W / 2 + 110, -1);
    this.projectiles = [];
    this.timer = ROUND_TIME; this.tick = 0; this.phase = 'intro'; this.phaseT = 0;
    this.roundWinner = -1; this.perfect = false; this.hitstop = 0; this.combo = [0, 0];
  }

  private threat(i: number): boolean {
    const me = this.f[i], opp = this.f[1 - i];
    if (opp.attacking && Math.abs(opp.x - me.x) < 175) return true;
    return this.projectiles.some((p) => p.alive && p.owner !== i && Math.abs(p.x - me.x) < 210 && Math.sign(p.vx) === Math.sign(me.x - p.x));
  }

  step(inputs: [Input, Input]) {
    this.frame++;
    this.phaseT++;
    if (this.shake > 0) this.shake *= 0.85;
    for (let i = 0; i < 2; i++) if (this.comboT[i] > 0 && --this.comboT[i] === 0) this.combo[i] = 0;

    if (this.phase === 'intro') {
      this.message = this.phaseT < 75 ? `ROUND ${this.round}` : '¡A PELEAR!';
      if (this.phaseT >= 115) { this.phase = 'fight'; this.phaseT = 0; this.message = ''; }
      const idle = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, block: false, special: false };
      this.f[0].update(idle, this.f[1], this.events, false, false);
      this.f[1].update(idle, this.f[0], this.events, false, false);
      return;
    }
    if (this.phase === 'matchEnd') return;

    if (this.superFreeze > 0) { this.superFreeze--; return; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    // Cámara lenta tras el KO
    if (this.phase === 'ko' && this.phaseT < 50 && this.phaseT % 2 === 0) return;

    const fighting = this.phase === 'fight';
    const none = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, block: false, special: false };
    for (let i = 0; i < 2; i++) {
      const canSpecial = !this.projectiles.some((p) => p.alive && p.owner === i);
      this.f[i].update(fighting ? inputs[i] : none, this.f[1 - i], this.events, this.threat(i), canSpecial);
    }
    this.spawnProjectiles();
    this.resolveBodies();
    this.resolveHits();
    this.updateProjectiles();

    if (fighting) {
      if (++this.tick >= 60) { this.tick = 0; this.timer = Math.max(0, this.timer - 1); }
      const dead = this.f.map((x) => x.hp <= 0);
      if (dead[0] || dead[1]) this.endRound(dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0, 'K.O.');
      else if (this.timer === 0) {
        const r0 = this.f[0].hp / this.f[0].def.maxHp, r1 = this.f[1].hp / this.f[1].def.maxHp;
        this.endRound(r0 === r1 ? -1 : r0 > r1 ? 0 : 1, '¡TIEMPO!');
      }
    } else if (this.phase === 'ko') {
      const w = this.roundWinner;
      if (this.phaseT >= 80 && w >= 0 && this.f[w].actionable) this.f[w].setState('victory');
      if (this.phaseT === 80) this.message = w < 0 ? 'EMPATE' : this.perfect ? '¡PERFECTO!' : `${this.f[w].def.name} GANA`;
      if (this.phaseT >= 230) {
        if (w >= 0 && this.f[w].wins >= ROUNDS_TO_WIN) { this.phase = 'matchEnd'; this.matchWinner = w; this.message = ''; }
        else { if (w >= 0) this.round++; this.startRound(); }
      }
    }
  }

  private endRound(winner: number, msg: string) {
    this.phase = 'ko'; this.phaseT = 0; this.roundWinner = winner; this.message = msg;
    if (winner >= 0) {
      this.f[winner].wins++;
      this.perfect = this.f[winner].hp >= this.f[winner].def.maxHp;
    }
    this.events.push({ type: 'ko', x: 0, y: 0 });
  }

  private spawnProjectiles() {
    for (const e of this.events) {
      if (e.who === undefined || (e as { done?: boolean }).done) continue;
      if (e.type === 'super') { (e as { done?: boolean }).done = true; this.superFreeze = 42; this.superWho = e.who; continue; }
      if (e.type !== 'projectile') continue;
      (e as { done?: boolean }).done = true;
      const o = this.f[e.who], big = !!e.heavy;
      this.projectiles.push({
        x: e.x, y: e.y, vx: o.facing * o.def.proj.speed * (big ? 1.25 : 1), owner: e.who,
        damage: Math.round(o.def.proj.damage * (big ? 2.3 : 1)), t: 0, alive: true, big,
      });
    }
  }

  private resolveBodies() {
    const [a, b] = this.f;
    // Empuje entre cuerpos (solo si ambos están a una altura parecida)
    if (Math.abs(a.y - b.y) < 70 && !a.isDown && !b.isDown) {
      const min = BODY, dx = b.x - a.x;
      if (Math.abs(dx) < min) {
        const push = (min - Math.abs(dx)) / 2, dir = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
        a.x -= dir * push; b.x += dir * push;
      }
    }
    for (const f of this.f) f.x = Math.max(WALL, Math.min(STAGE_W - WALL, f.x));
    if (Math.abs(a.x - b.x) > MAX_SEP) {
      const mid = (a.x + b.x) / 2, s = Math.sign(a.x - b.x);
      a.x = mid + (s * MAX_SEP) / 2; b.x = mid - (s * MAX_SEP) / 2;
    }
    // Segunda pasada contra la pared para que nadie se solape en la esquina
    if (Math.abs(a.y - b.y) < 70 && !a.isDown && !b.isDown && Math.abs(b.x - a.x) < BODY) {
      const left = a.x <= b.x ? a : b, right = left === a ? b : a;
      if (left.x <= WALL + 0.5) right.x = left.x + BODY; else if (right.x >= STAGE_W - WALL - 0.5) left.x = right.x - BODY;
    }
  }

  private resolveHits() {
    const hits: { a: number; m: HitInfo; px: number; py: number }[] = [];
    for (let i = 0; i < 2; i++) {
      const hb = this.f[i].hitbox(), hu = this.f[1 - i].hurtbox();
      if (hb && hu && overlap(hb, hu)) {
        hits.push({ a: i, m: this.f[i].move!, px: (Math.max(hb.l, hu.l) + Math.min(hb.r, hu.r)) / 2, py: (Math.max(hb.b, hu.b) + Math.min(hb.t, hu.t)) / 2 });
      }
    }
    for (const h of hits) {
      const att = this.f[h.a];
      att.moveDone = true;
      this.applyHit(att, this.f[1 - h.a], h.m, h.px, h.py, false);
    }
  }

  private applyHit(att: Fighter, def: Fighter, m: HitInfo, px: number, py: number, isProj: boolean) {
    const dir = def.x === att.x ? att.facing : Math.sign(def.x - att.x);
    const atWall = def.x <= WALL + 1 || def.x >= STAGE_W - WALL - 1;
    if (def.canBlock()) {
      def.blockLow = def.inp.down;
      def.state = 'blockstun'; def.t = 0; def.stun = def.stunTotal = m.blockstun; def.guarding = true;
      def.kb = dir * m.push * 0.9;
      def.guard -= m.damage * 2.4;
      att.meter = Math.min(100, att.meter + 1); def.meter = Math.min(100, def.meter + 1.5);
      if (isProj || m.heavy) def.hp = Math.max(1, def.hp - 1);
      if (def.guard <= 0) {
        def.guard = 100; def.state = 'stunned'; def.t = 0; def.stun = def.stunTotal = 80; def.guarding = false;
        this.events.push({ type: 'guardbreak', x: def.x, y: 120 });
      }
      this.hitstop = 4;
      this.events.push({ type: 'block', x: px, y: py });
    } else {
      const scale = Math.max(0.5, 1 - 0.1 * def.comboHits);
      const dmg = Math.max(1, Math.round(m.damage * att.def.power * scale));
      def.comboHits++;
      def.hp = Math.max(0, def.hp - dmg);
      if (!m.noMeter) att.meter = Math.min(100, att.meter + dmg * 0.75);
      def.meter = Math.min(100, def.meter + dmg * 0.45);
      def.flash = 7; def.guarding = false; def.move = null;
      if (!isProj) att.moveHit = true;
      this.combo[att.idx] = def.comboHits; this.comboT[att.idx] = 80;
      const airborne = !def.grounded;
      if (def.hp <= 0) {
        def.state = 'ko'; def.t = 0; def.landed = false; def.y = Math.max(def.y, 0.01); def.vy = 7.5; def.kb = dir * 5.5; def.vx = 0;
      } else if (m.knockdown || airborne) {
        def.state = 'knockdown'; def.t = 0; def.landed = false; def.y = Math.max(def.y, 0.01); def.vy = 6; def.kb = dir * 4.5; def.vx = 0;
      } else {
        def.state = 'hit'; def.t = 0; def.stun = def.stunTotal = m.hitstun; def.kb = dir * m.push; def.vx = 0;
      }
      this.hitstop = def.hp <= 0 ? 14 : m.heavy ? 8 : 5;
      this.shake = m.heavy ? 6 : 3;
      this.events.push({ type: 'hit', x: px, y: py, heavy: m.heavy, kick: m.kick });
    }
    if (atWall && !isProj && att.grounded) att.kb = -dir * m.push * 0.8;
  }

  private updateProjectiles() {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.x += p.vx; p.t++;
      if (p.x < -30 || p.x > STAGE_W + 30) { p.alive = false; continue; }
      const hw = p.big ? 26 : 15, hh = p.big ? 34 : 20;
      const r: Rect = { l: p.x - hw, r: p.x + hw, b: p.y - hh, t: p.y + hh };
      const def = this.f[1 - p.owner], hu = def.hurtbox();
      if (hu && overlap(r, hu)) {
        p.alive = false;
        this.applyHit(this.f[p.owner], def, { damage: p.damage, hitstun: 19, blockstun: p.big ? 20 : 12, push: p.big ? 9 : 5, heavy: true, knockdown: p.big, noMeter: p.big }, p.x, p.y, true);
      }
    }
    const [p0, p1] = [0, 1].map((o) => this.projectiles.filter((p) => p.alive && p.owner === o));
    for (const a of p0) for (const b of p1) {
      if (Math.abs(a.x - b.x) < 26) { a.alive = !b.big && a.big; b.alive = !a.big && b.big; this.events.push({ type: 'clash', x: (a.x + b.x) / 2, y: a.y }); }
    }
    if (this.projectiles.length > 8) this.projectiles = this.projectiles.filter((p) => p.alive);
  }
}
