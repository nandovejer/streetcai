// Render del combate: escenario, luchadores, efectos y HUD. Solo lee el estado del Match.
import { Assets } from '../engine/assets';
import { GROUND_Y, ROUNDS_TO_WIN, SPRITE_SCALE, STAGE_W, VH, VW } from '../game/data';
import { Fighter, GameEvent } from '../game/fighter';
import { Match } from '../game/match';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: 'spark' | 'dust' | 'flash' | 'ring'; color: string; size: number }
interface Petal { x: number; y: number; vx: number; vy: number; ph: number; color: string }

export const FONT = '"Press Start 2P", monospace';
export const SCALE = 2;

export class Renderer {
  ctx: CanvasRenderingContext2D;
  private parts: Particle[] = [];
  private petals: Petal[] = [];
  private tint: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private shownHp = [1, 1];
  private camX = (STAGE_W - VW) / 2;
  time = 0;

  constructor(public canvas: HTMLCanvasElement, public assets: Assets) {
    canvas.width = VW * SCALE; canvas.height = VH * SCALE;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.tint = document.createElement('canvas'); this.tint.width = 256; this.tint.height = 256;
    this.tctx = this.tint.getContext('2d')!;
    const cols = ['#ff7aa8', '#ffd1e0', '#ffe27a', '#c58bff', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      this.petals.push({ x: Math.random() * VW, y: Math.random() * VH, vx: -0.25 - Math.random() * 0.4, vy: 0.15 + Math.random() * 0.3, ph: Math.random() * 6, color: cols[i % cols.length] });
    }
  }

  text(s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', outline: string | null = '#000') {
    const c = this.ctx;
    c.font = `${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (outline) { c.lineWidth = Math.max(2, size / 3.5); c.strokeStyle = outline; c.strokeText(s, x, y); }
    c.fillStyle = color; c.fillText(s, x, y);
  }

  bigText(s: string, x: number, y: number, size: number) {
    const c = this.ctx;
    c.font = `${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = size / 3; c.strokeStyle = '#1a0500'; c.strokeText(s, x, y + 2);
    c.lineWidth = size / 6; c.strokeStyle = '#fff'; c.strokeText(s, x, y);
    const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#fff36b'); g.addColorStop(0.5, '#ffb400'); g.addColorStop(1, '#e02a10');
    c.fillStyle = g; c.fillText(s, x, y);
  }

  begin(shake = 0) {
    const c = this.ctx;
    const sx = shake > 0.3 ? (Math.random() - 0.5) * shake : 0, sy = shake > 0.3 ? (Math.random() - 0.5) * shake : 0;
    c.setTransform(SCALE, 0, 0, SCALE, Math.round(sx * SCALE), Math.round(sy * SCALE));
  }

  drawStage(camX: number, dim = 0) {
    const c = this.ctx, bg = this.assets.bg;
    const s = STAGE_W / bg.width, h = bg.height * s;
    c.imageSmoothingEnabled = true;
    c.drawImage(bg, -camX - 4, VH - h, STAGE_W + 8, h + 4);
    c.imageSmoothingEnabled = false;
    if (dim > 0) { c.fillStyle = `rgba(6,8,24,${dim})`; c.fillRect(-10, -10, VW + 20, VH + 20); }
  }

  drawPetals() {
    const c = this.ctx;
    for (const p of this.petals) {
      p.ph += 0.04; p.x += p.vx + Math.sin(p.ph) * 0.3; p.y += p.vy;
      if (p.y > GROUND_Y + 8 || p.x < -5) { p.x = Math.random() * (VW + 100); p.y = -5; }
      c.fillStyle = p.color; c.globalAlpha = 0.85;
      c.fillRect(Math.round(p.x), Math.round(p.y), 2, Math.sin(p.ph * 2) > 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
  }

  /** Dibuja un frame del atlas con los pies en (sx, sy). */
  drawSprite(id: string, frame: string, sx: number, sy: number, facing: number, scale = SPRITE_SCALE, flash = 0) {
    const a = this.assets.atlas[id], fr = a.frames[frame] || a.frames['idle_0'];
    const s = fr.s * scale, dw = fr.w * s, dh = fr.h * s;
    const c = this.ctx;
    c.save();
    c.translate(Math.round(sx), Math.round(sy));
    c.scale(facing, 1);
    c.drawImage(a.img, fr.x, fr.y, fr.w, fr.h, -fr.ax * s, -dh, dw, dh);
    if (flash > 0) {
      const t = this.tctx;
      t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 256, 256);
      t.drawImage(a.img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
      t.globalCompositeOperation = 'source-atop'; t.fillStyle = '#fff'; t.fillRect(0, 0, fr.w, fr.h);
      c.globalAlpha = Math.min(0.85, flash);
      c.drawImage(this.tint, 0, 0, fr.w, fr.h, -fr.ax * s, -dh, dw, dh);
      c.globalAlpha = 1;
    }
    c.restore();
  }

  private drawFighter(f: Fighter, m: Match) {
    const c = this.ctx;
    const sx = f.x - this.camX, sy = GROUND_Y - f.y;
    const sh = Math.max(0.45, 1 - f.y / 220), lying = f.isDown && f.landed;
    c.fillStyle = 'rgba(0,0,0,0.38)';
    c.beginPath(); c.ellipse(sx, GROUND_Y + 2, (lying ? 52 : 30) * sh, 6 * sh, 0, 0, Math.PI * 2); c.fill();
    const jitter = m.hitstop > 0 && (f.state === 'hit' || f.state === 'knockdown' || f.state === 'ko') ? (m.frame % 2 ? 2 : -2) : 0;
    if (f.state === 'victory' || (f.state === 'attack' && f.move?.projectile && f.t < f.move.startup)) {
      // aura de carga del especial
      if (f.state === 'attack') {
        c.globalAlpha = 0.35 + 0.25 * Math.sin(this.time * 0.8);
        c.fillStyle = f.def.proj.glow;
        c.beginPath(); c.ellipse(sx + f.facing * 30, sy - 100, 16 + f.t, 16 + f.t, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
    }
    this.drawSprite(f.def.id, f.frame(), sx + jitter, sy, f.facing, SPRITE_SCALE, f.flash / 7);
    if (f.state === 'stunned') {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 0.15 + i * 2.1;
        this.star(sx + Math.cos(a) * 20, sy - 150 + Math.sin(a) * 5, 4, '#ffe14a');
      }
    }
  }

  private star(x: number, y: number, r: number, color: string) {
    const c = this.ctx; c.fillStyle = color;
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.3, y - r * 0.3); c.lineTo(x + r, y); c.lineTo(x + r * 0.3, y + r * 0.3);
    c.lineTo(x, y + r); c.lineTo(x - r * 0.3, y + r * 0.3); c.lineTo(x - r, y); c.lineTo(x - r * 0.3, y - r * 0.3); c.closePath(); c.fill();
  }

  /** Convierte los eventos de la simulación en partículas. */
  consume(events: GameEvent[]) {
    for (const e of events) {
      const y = GROUND_Y - e.y;
      const add = (kind: Particle['kind'], n: number, color: string, size: number, speed: number, life: number, up = 0) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
          this.parts.push({ x: e.x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, life, max: life, kind, color, size });
        }
      };
      if (e.type === 'hit') {
        add('flash', 1, e.heavy ? '#fff2a8' : '#ffffff', e.heavy ? 26 : 17, 0, 9);
        add('spark', e.heavy ? 14 : 8, e.heavy ? '#ffb020' : '#ffe680', 3, e.heavy ? 5 : 3.5, 16);
        if (e.heavy) add('ring', 1, '#ffd060', 10, 0, 12);
      } else if (e.type === 'block') {
        add('flash', 1, '#a8e4ff', 13, 0, 7); add('spark', 6, '#7fd0ff', 2, 3, 12);
      } else if (e.type === 'land' || e.type === 'jump') add('dust', 5, '#d9cdb4', 5, 1.2, 18, 0.3);
      else if (e.type === 'fall') add('dust', 10, '#d9cdb4', 7, 2.2, 24, 0.5);
      else if (e.type === 'clash') { add('flash', 1, '#fff', 24, 0, 10); add('spark', 14, '#fff', 3, 5, 16); }
      else if (e.type === 'guardbreak') { add('ring', 1, '#ff5050', 14, 0, 16); add('spark', 16, '#ff7a50', 3, 5, 20); }
    }
  }

  private drawParticles() {
    const c = this.ctx;
    for (const p of this.parts) {
      const k = p.life / p.max, x = p.x - this.camX;
      if (p.kind === 'flash') { this.star(x, p.y, p.size * (0.5 + k), p.color); this.star(x, p.y, p.size * 0.45 * k, '#fff'); }
      else if (p.kind === 'ring') {
        c.strokeStyle = p.color; c.globalAlpha = k; c.lineWidth = 3 * k + 1;
        c.beginPath(); c.arc(x, p.y, p.size + (1 - k) * 34, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      } else if (p.kind === 'spark') {
        c.strokeStyle = p.color; c.lineWidth = p.size * k + 0.5;
        c.beginPath(); c.moveTo(x, p.y); c.lineTo(x - p.vx * 2.5, p.y - p.vy * 2.5); c.stroke();
      } else {
        c.globalAlpha = k * 0.6; c.fillStyle = p.color;
        c.beginPath(); c.arc(x, p.y, p.size * (1.4 - k * 0.6), 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      }
    }
  }

  private stepParticles() {
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.kind === 'spark') { p.vy += 0.25; p.vx *= 0.92; }
      if (p.kind === 'dust') { p.vx *= 0.9; p.vy *= 0.9; }
    }
    if (this.parts.length) this.parts = this.parts.filter((p) => p.life > 0);
  }

  private drawProjectiles(m: Match) {
    const c = this.ctx;
    for (const p of m.projectiles) {
      if (!p.alive) continue;
      const d = m.f[p.owner].def.proj, x = p.x - this.camX, y = GROUND_Y - p.y, dir = Math.sign(p.vx);
      const pulse = 1 + Math.sin(p.t * 0.7) * 0.15;
      for (let i = 4; i >= 1; i--) {
        c.globalAlpha = 0.14 * (5 - i); c.fillStyle = d.glow;
        c.beginPath(); c.ellipse(x - dir * i * 9, y + Math.sin(p.t * 0.5 + i) * 3, d.size * (1 - i * 0.14), d.size * (0.8 - i * 0.12), 0, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 0.9; c.fillStyle = d.glow;
      c.beginPath(); c.ellipse(x, y, d.size * pulse * 1.15, d.size * pulse * 0.9, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1; c.fillStyle = d.core;
      c.beginPath(); c.ellipse(x + dir * 3, y, d.size * 0.6 * pulse, d.size * 0.45 * pulse, 0, 0, Math.PI * 2); c.fill();
      this.star(x + dir * 4, y, d.size * 0.9 * pulse, 'rgba(255,255,255,0.75)');
    }
  }

  drawPortrait(id: string, x: number, y: number, size: number, flip = false) {
    const c = this.ctx, img = this.assets.portrait[id];
    const s = Math.min(img.width, img.height), ox = (img.width - s) / 2;
    c.save(); c.imageSmoothingEnabled = true;
    if (flip) { c.translate(x + size, y); c.scale(-1, 1); c.drawImage(img, ox, 0, s, s, 0, 0, size, size); }
    else c.drawImage(img, ox, 0, s, s, x, y, size, size);
    c.imageSmoothingEnabled = false; c.restore();
  }

  private drawHud(m: Match, labels: [string, string]) {
    const c = this.ctx;
    const barW = 226, barH = 12, y = 20;
    for (let i = 0; i < 2; i++) {
      const f = m.f[i], ratio = f.hp / f.def.maxHp;
      this.shownHp[i] += (ratio - this.shownHp[i]) * (ratio < this.shownHp[i] ? 0.06 : 1);
      const inner = i === 0 ? VW / 2 - 28 : VW / 2 + 28; // extremo junto al reloj
      const x0 = i === 0 ? inner - barW : inner;
      c.fillStyle = '#000'; c.fillRect(x0 - 3, y - 3, barW + 6, barH + 6);
      c.fillStyle = '#f4f4f4'; c.fillRect(x0 - 2, y - 2, barW + 4, barH + 4);
      c.fillStyle = '#5a0c0c'; c.fillRect(x0, y, barW, barH);
      const wLag = barW * this.shownHp[i], w = barW * ratio;
      c.fillStyle = '#ff3b1f'; c.fillRect(i === 0 ? inner - wLag : inner, y, wLag, barH);
      const g = c.createLinearGradient(0, y, 0, y + barH);
      const low = ratio < 0.25 && Math.floor(this.time / 8) % 2 === 0;
      g.addColorStop(0, low ? '#ffb090' : '#fff9a0'); g.addColorStop(0.5, low ? '#ff7a30' : '#ffd800'); g.addColorStop(1, low ? '#c84010' : '#e09a00');
      c.fillStyle = g; c.fillRect(i === 0 ? inner - w : inner, y, w, barH);
      // guardia
      const gw = 90 * (f.guard / 100), gx = i === 0 ? inner - 90 : inner;
      c.fillStyle = '#000'; c.fillRect(gx - 1, y + barH + 4, 92, 5);
      c.fillStyle = f.guard < 35 ? '#ff5a3c' : '#4ad0ff'; c.fillRect(i === 0 ? inner - gw : inner, y + barH + 5, gw, 3);
      // retrato y nombre
      const px = i === 0 ? x0 - 40 : x0 + barW + 8;
      c.fillStyle = '#000'; c.fillRect(px - 2, y - 8, 36, 36);
      c.fillStyle = i === 0 ? '#ffb400' : '#3cb8ff'; c.fillRect(px - 1, y - 7, 34, 34);
      this.drawPortrait(f.def.id, px, y - 6, 32, i === 1);
      this.text(f.def.name, i === 0 ? x0 : x0 + barW, y + barH + 20, 8, '#fff', i === 0 ? 'left' : 'right');
      this.text(labels[i], i === 0 ? x0 + 62 : x0 + barW - 62, y + barH + 20, 6, i === 0 ? '#ffb400' : '#3cb8ff', i === 0 ? 'left' : 'right');
      // victorias
      for (let k = 0; k < ROUNDS_TO_WIN; k++) {
        const wx = i === 0 ? inner - 100 - k * 12 : inner + 100 + k * 12;
        c.fillStyle = '#000'; c.fillRect(wx - 5, y + barH + 2, 10, 10);
        c.fillStyle = k < f.wins ? '#ffd800' : '#3a3a4a'; c.fillRect(wx - 4, y + barH + 3, 8, 8);
        if (k < f.wins) this.text('V', wx + 0.5, y + barH + 7.5, 6, '#a02000', 'center', null);
      }
      // combo
      if (m.combo[i] >= 2) {
        const cx = i === 0 ? 70 : VW - 70;
        this.bigText(`${m.combo[i]} HITS`, cx, 110, 14);
      }
    }
    // reloj
    c.fillStyle = '#000'; c.fillRect(VW / 2 - 24, y - 8, 48, 32);
    c.fillStyle = '#1b1b2e'; c.fillRect(VW / 2 - 22, y - 6, 44, 28);
    const urgent = m.timer <= 10 && Math.floor(this.time / 15) % 2 === 0;
    this.text(String(m.timer).padStart(2, '0'), VW / 2 + 1, y + 9, 18, urgent ? '#ff3b1f' : '#ffd800');
    this.text(`ROUND ${m.round}`, VW / 2, y + 36, 6, '#fff');

    if (m.message) {
      const t = m.phaseT, big = m.message === 'K.O.' ? 44 : m.message.length > 10 ? 22 : 30;
      const pop = Math.min(1, ((m.phase === 'intro' && t >= 75 ? t - 75 : m.phase === 'ko' && t >= 80 ? t - 80 : t) + 2) / 8);
      c.save(); c.translate(VW / 2, 150); c.scale(2 - pop, 2 - pop); c.globalAlpha = pop;
      this.bigText(m.message, 0, 0, big);
      c.restore(); c.globalAlpha = 1;
    }
  }

  drawFight(m: Match, labels: [string, string]) {
    this.time++;
    const target = Math.max(0, Math.min(STAGE_W - VW, (m.f[0].x + m.f[1].x) / 2 - VW / 2));
    this.camX += (target - this.camX) * 0.15;
    this.begin(m.shake);
    this.ctx.save();
    this.drawStage(this.camX);
    this.drawPetals();
    // el que ataca se dibuja encima
    const order = m.f[0].attacking && !m.f[1].attacking ? [1, 0] : [0, 1];
    for (const i of order) this.drawFighter(m.f[i], m);
    this.drawProjectiles(m);
    this.stepParticles();
    this.drawParticles();
    if (m.phase === 'ko' && m.phaseT < 6) { this.ctx.fillStyle = `rgba(255,255,255,${0.7 - m.phaseT * 0.1})`; this.ctx.fillRect(-10, -10, VW + 20, VH + 20); }
    this.ctx.restore();
    this.begin(0);
    this.drawHud(m, labels);
  }

  resetFight() { this.parts = []; this.shownHp = [1, 1]; this.camX = (STAGE_W - VW) / 2; }
}
