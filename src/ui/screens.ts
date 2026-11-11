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
      r.text('ATRAS = BLOQUEAR - ABAJO, ADELANTE + F = ESPECIAL - ESC PAUSA', VW / 2, 345, 6, '#fff');
    }
  } else r.text('ATRAS = BLOQUEAR - SP = ESPECIAL - ENCADENA FLOJO > FUERTE', VW / 2, 336, 6, '#ffd800');
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
