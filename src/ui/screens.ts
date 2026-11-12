// Pantallas de menú dibujadas en el canvas: título, selección y resultado.
import { DIFFICULTY_NAMES, Difficulty, FIGHTERS, GROUND_Y, VH, VW } from '../game/data';
import { Renderer } from '../render/renderer';

export interface Settings { char: 'chapa' | 'ares'; difficulty: Difficulty; twoPlayers: boolean }
export interface Button { x: number; y: number; w: number; h: number; label: string; action: string; on?: boolean }

const IDS = ['chapa', 'ares'] as const;

export function drawTitle(r: Renderer, touch: boolean) {
  r.time++;
  r.begin();
  r.drawStage(40, 0.35);
  r.drawPetals();
  const t = r.time;
  r.drawShadow(190, 50, 8, 0.7);
  r.drawShadow(450, 50, 8, 0.7);
  r.drawSprite('chapa', `idle_${Math.floor(t / 7) % 8}`, 190, GROUND_Y, 1, 1.25);
  r.drawSprite('ares', `idle_${Math.floor(t / 7) % 8}`, 450, GROUND_Y, -1, 1.25);
  const bob = Math.sin(t * 0.05) * 3;
  r.bigText('STREET', VW / 2, 70 + bob, 46);
  r.bigText('CAI', VW / 2, 124 + bob, 58);
  r.text('PLAZA DE LAS FLORES · CADIZ', VW / 2, 166, 8, '#fff');
  r.text('VS', VW / 2, 250, 20, '#ff3b1f');
  if (Math.floor(t / 30) % 2 === 0) r.text(touch ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER PARA EMPEZAR', VW / 2, 300, 10, '#ffd800');
  r.text('CHAPA', 190, 346, 8, '#ffb400');
  r.text('ARES', 450, 346, 8, '#3cb8ff');
}

export function selectButtons(s: Settings): Button[] {
  const b: Button[] = [];
  IDS.forEach((id, i) => b.push({ x: 150 + i * 220, y: 44, w: 120, h: 120, label: '', action: 'char:' + id, on: s.char === id }));
  DIFFICULTY_NAMES.forEach((n, i) => b.push({ x: 176 + i * 100, y: 218, w: 92, h: 22, label: n, action: 'diff:' + i, on: s.difficulty === i && !s.twoPlayers }));
  b.push({ x: 176, y: 248, w: 142, h: 22, label: '1P VS CPU', action: 'mode:cpu', on: !s.twoPlayers });
  b.push({ x: 326, y: 248, w: 142, h: 22, label: '2 JUGADORES', action: 'mode:2p', on: s.twoPlayers });
  b.push({ x: 230, y: 282, w: 180, h: 32, label: '¡A LUCHAR!', action: 'fight' });
  return b;
}

function drawButton(r: Renderer, b: Button, size = 8) {
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  c.fillStyle = b.on ? '#ffd800' : '#8a8aa0'; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
  c.fillStyle = b.on ? '#7a1c00' : '#1b1b2e'; c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  if (b.label) r.text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, size, b.on ? '#ffe86b' : '#d8d8e8');
}

export function drawSelect(r: Renderer, s: Settings, touch: boolean) {
  r.time++;
  r.begin();
  r.drawStage(40, 0.72);
  const c = r.ctx;
  r.bigText('ELIGE TU LUCHADOR', VW / 2, 22, 16);
  for (const b of selectButtons(s)) {
    if (b.action.startsWith('char:')) {
      const id = b.action.slice(5) as 'chapa' | 'ares', d = FIGHTERS[id];
      const blink = b.on && Math.floor(r.time / 10) % 2 === 0;
      c.fillStyle = '#000'; c.fillRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
      c.fillStyle = b.on ? (blink ? '#fff' : '#ffd800') : '#55556a'; c.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
      r.drawPortrait(id, b.x, b.y, b.w, id === 'ares');
      if (!b.on) { c.fillStyle = 'rgba(0,0,20,0.5)'; c.fillRect(b.x, b.y, b.w, b.h); }
      else r.text(s.twoPlayers ? 'J1' : 'TU', b.x + 16, b.y + 12, 8, '#ffd800');
      r.text(d.name, b.x + b.w / 2, b.y + b.h + 16, 12, b.on ? '#ffd800' : '#fff');
      r.text(d.title, b.x + b.w / 2, b.y + b.h + 31, 6, '#b8c8ff');
      // estadísticas
      const sx = id === 'chapa' ? 14 : VW - 126;
      const rows: [string, number][] = [['FUERZA', d.stats.fuerza], ['VELOC.', d.stats.velocidad], ['TECNICA', d.stats.tecnica], ['AGUANTE', d.stats.aguante]];
      rows.forEach(([n, v], k) => {
        const yy = 62 + k * 22;
        r.text(n, sx, yy, 6, '#fff', 'left');
        for (let j = 0; j < 5; j++) { c.fillStyle = '#000'; c.fillRect(sx + j * 12 - 1, yy + 6, 11, 7); c.fillStyle = j < v ? '#ffb400' : '#33334a'; c.fillRect(sx + j * 12, yy + 7, 9, 5); }
      });
      r.text('ESPECIAL', sx, 152, 6, '#fff', 'left');
      r.text(d.specialName, sx, 164, 7, '#ff7a50', 'left');
    } else drawButton(r, b, b.action === 'fight' ? 12 : 7);
  }
  r.text('DIFICULTAD', 168, 229, 6, '#fff', 'right');
  r.text('MODO', 168, 259, 6, '#fff', 'right');
  if (!touch) {
    if (s.twoPlayers) {
      r.text('J1: WASD + F/G (FLOJOS) T/Y (FUERTES) R BLOQUEO H ESPECIAL', VW / 2, 330, 6, '#ffd800');
      r.text('J2: FLECHAS + J/K (FLOJOS) U/I (FUERTES) O BLOQUEO L ESPECIAL', VW / 2, 345, 6, '#3cb8ff');
    } else {
      r.text('WASD/FLECHAS MOVER - F/G GOLPES FLOJOS - T/Y FUERTES - R BLOQUEO - H ESPECIAL', VW / 2, 330, 6, '#ffd800');
      r.text('ATRAS = BLOQUEAR - DOBLE TOQUE = DASH - BARRA LLENA + ESPECIAL = SUPER - ESC PAUSA', VW / 2, 345, 6, '#fff');
    }
  } else r.text('ATRAS = BLOQUEAR - SP = ESPECIAL (SUPER CON BARRA LLENA) - DOBLE TOQUE = DASH', VW / 2, 336, 6, '#ffd800');
}

export function resultButtons(): Button[] {
  return [
    { x: 150, y: 290, w: 160, h: 30, label: 'REVANCHA', action: 'rematch', on: true },
    { x: 330, y: 290, w: 160, h: 30, label: 'MENU', action: 'menu' },
  ];
}

export function drawResult(r: Renderer, winnerId: 'chapa' | 'ares', loserId: 'chapa' | 'ares', headline: string, score: string) {
  r.time++;
  r.begin();
  r.drawStage(40, 0.75);
  const c = r.ctx, d = FIGHTERS[winnerId];
  r.bigText(headline, VW / 2, 36, 26);
  c.fillStyle = '#000'; c.fillRect(VW / 2 - 75, 66, 150, 150);
  c.fillStyle = '#ffd800'; c.fillRect(VW / 2 - 73, 68, 146, 146);
  r.drawPortrait(winnerId, VW / 2 - 70, 71, 140);
  r.drawSprite(winnerId, `idle_${Math.floor(r.time / 7) % 8}`, 130, 262, 1, 1.2);
  r.drawSprite(loserId, 'ko_4', 520, 262, -1, 1.2);
  r.text(`${d.name} GANA`, VW / 2, 236, 14, '#ffd800');
  r.text(score, VW / 2, 262, 12, '#fff');
  for (const b of resultButtons()) drawButton(r, b, 10);
}

// ---- CONTINUE? (cuando pierde un jugador humano) ----
export const CONTINUE_FROM = 9;
export const CONTINUE_SECOND = 60; // frames por número

/** Dígitos de bombillas, 6×8, al estilo de las recreativas. */
const BULB_DIGITS: Record<string, string[]> = {
  '0': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  '1': ['..##..', '.###..', '####..', '..##..', '..##..', '..##..', '..##..', '######'],
  '2': ['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '##....', '######'],
  '3': ['.####.', '##..##', '....##', '..###.', '....##', '....##', '##..##', '.####.'],
  '4': ['...##.', '..###.', '.####.', '##.##.', '##.##.', '######', '...##.', '...##.'],
  '5': ['######', '##....', '##....', '#####.', '....##', '....##', '##..##', '.####.'],
  '6': ['.####.', '##..##', '##....', '#####.', '##..##', '##..##', '##..##', '.####.'],
  '7': ['######', '##..##', '....##', '...##.', '..##..', '..##..', '..##..', '..##..'],
  '8': ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '##..##', '.####.'],
  '9': ['.####.', '##..##', '##..##', '##..##', '.#####', '....##', '##..##', '.####.'],
};

function drawBulbs(r: Renderer, digit: string, x0: number, y0: number, pitch: number, glow: number) {
  const c = r.ctx, rows = BULB_DIGITS[digit] || BULB_DIGITS['0'], rad = pitch * 0.46;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) {
    const x = x0 + i * pitch + pitch / 2, y = y0 + j * pitch + pitch / 2, lit = rows[j][i] === '#';
    if (lit) {
      const halo = c.createRadialGradient(x, y, 0, x, y, rad * 1.7);
      halo.addColorStop(0, `rgba(255,170,40,${0.55 * glow})`); halo.addColorStop(1, 'rgba(255,90,0,0)');
      c.fillStyle = halo; c.beginPath(); c.arc(x, y, rad * 1.7, 0, Math.PI * 2); c.fill();
      const g = c.createRadialGradient(x - rad * 0.2, y - rad * 0.2, 0, x, y, rad);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#fff2b8'); g.addColorStop(0.85, '#ffb040'); g.addColorStop(1, '#c85a10');
      c.fillStyle = g;
    } else {
      const g = c.createRadialGradient(x - rad * 0.35, y - rad * 0.35, 0, x, y, rad);
      g.addColorStop(0, '#d0603a'); g.addColorStop(0.35, '#8a2410'); g.addColorStop(1, '#3a0a04');
      c.fillStyle = g;
    }
    c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
  }
}

function gradText(r: Renderer, s: string, x: number, y: number, size: number, top: string, bottom: string, align: CanvasTextAlign = 'left') {
  const c = r.ctx;
  c.font = `${size}px "Press Start 2P", monospace`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = size / 3.5; c.strokeStyle = '#000'; c.strokeText(s, x, y + 2);
  const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  c.fillStyle = g; c.fillText(s, x, y);
}

export function continueButtons(): Button[] {
  return [
    { x: 70, y: 316, w: 120, h: 28, label: 'SI', action: 'continue:yes', on: true },
    { x: 210, y: 316, w: 120, h: 28, label: 'NO', action: 'continue:no' },
  ];
}

/** t = frames desde que empezó la cuenta; overT >= 0 cuando ya es GAME OVER. */
export function drawContinue(r: Renderer, loserId: 'chapa' | 'ares', t: number, overT: number, touch: boolean) {
  r.time++;
  r.begin();
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(-10, -10, VW + 20, VH + 20);
  const count = Math.max(0, CONTINUE_FROM - Math.floor(t / CONTINUE_SECOND));
  const inSec = (t % CONTINUE_SECOND) / CONTINUE_SECOND;

  // retrato del derrotado (se apaga a gris al llegar a GAME OVER)
  const img = r.assets.defeated[loserId];
  const pw = 270, ph = img.height * (pw / img.width), px = 44, py = 312 - ph;
  const grey = overT >= 0 ? Math.min(1, overT / 40) : 0;
  c.save();
  c.imageSmoothingEnabled = true;
  if (grey > 0) c.filter = `grayscale(${grey}) brightness(${1 - grey * 0.45})`;
  c.drawImage(img, px, py, pw, ph);
  c.restore();

  if (overT < 0) {
    gradText(r, 'CONTINUE?', 40, 34, 22, '#ffd060', '#ff6a00');
    gradText(r, String(count), 262, 34, 22, '#ffffff', '#9a9aa8');
    gradText(r, 'FREE PLAY', 492, 34, 14, '#d8dcff', '#5a6cff', 'center');
    // bombillas: el número "late" al principio de cada segundo
    const glow = 1 - inSec * 0.45;
    drawBulbs(r, String(count), 396, 72, 32, glow);
    const blink = Math.floor(r.time / 20) % 2 === 0;
    if (touch) for (const b of continueButtons()) drawButton(r, b, 9);
    else if (blink) r.text('ENTER = SEGUIR   ESC = ABANDONAR', 186, 334, 6, '#ffd800');
  } else {
    const a = Math.min(1, overT / 30);
    c.globalAlpha = a;
    r.bigText('GAME OVER', VW / 2, VH / 2 - 10, 40);
    c.globalAlpha = 1;
  }
}

export function drawPause(r: Renderer): Button[] {
  r.begin();
  const c = r.ctx;
  c.fillStyle = 'rgba(0,0,20,0.65)'; c.fillRect(0, 0, VW, VH);
  r.bigText('PAUSA', VW / 2, 120, 34);
  const bs = pauseButtons();
  for (const b of bs) drawButton(r, b, 10);
  return bs;
}
export function pauseButtons(): Button[] {
  return [
    { x: 150, y: 180, w: 160, h: 30, label: 'SEGUIR', action: 'resume', on: true },
    { x: 330, y: 180, w: 160, h: 30, label: 'SALIR', action: 'menu' },
  ];
}

export function hitButton(buttons: Button[], x: number, y: number): string | null {
  for (const b of buttons) if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) return b.action;
  return null;
}
