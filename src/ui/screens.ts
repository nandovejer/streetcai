// Pantallas de menú dibujadas en el canvas: título, selección y resultado.
import { DIFFICULTY_NAMES, Difficulty, FIGHTERS, FIGHTER_IDS, FighterId, GROUND_Y, STAGES, STAGE_IDS, StageId, VH, VW } from '../game/data';
import { Renderer } from '../render/renderer';

export interface Settings {
  /** Luchador del J1 y del J2 (el J2 solo se usa en modo 2 jugadores). */
  char: FighterId; char2: FighterId;
  difficulty: Difficulty; twoPlayers: boolean;
  /** En 2 jugadores con ratón/táctil: a quién asigna el siguiente toque en un retrato. */
  pickTurn: 0 | 1;
  /** Escenario elegido, o al azar en cada combate. */
  stage: StageId | 'random';
}
export const STAGE_CHOICES: (StageId | 'random')[] = [...STAGE_IDS, 'random'];
export interface Button { x: number; y: number; w: number; h: number; label: string; action: string; on?: boolean }

const COL_J1 = '#ffd800', COL_J2 = '#3cb8ff';
/** Color de acento por luchador (nombres en título y VS). */
const ACCENT: Record<FighterId, string> = { chapa: '#ffb400', ares: '#3cb8ff', alba: '#e8eef8', martin: '#d8955a' };

export function drawTitle(r: Renderer, touch: boolean) {
  r.time++;
  r.begin();
  r.drawStage(40, 0.35);
  r.drawPetals();
  const t = r.time;
  const XS = [70, 192, 448, 570];
  FIGHTER_IDS.forEach((id, i) => {
    r.drawShadow(XS[i], 44, 7, 0.7);
    r.drawSprite(id, `idle_${Math.floor(t / 7 + i * 2) % 8}`, XS[i], GROUND_Y, i < 2 ? 1 : -1, 1.12);
  });
  const bob = Math.sin(t * 0.05) * 3;
  r.bigText('STREET', VW / 2, 70 + bob, 46);
  r.bigText('CAI', VW / 2, 124 + bob, 58);
  r.text('PLAZA DE LAS FLORES · CADIZ', VW / 2, 166, 8, '#fff');
  r.text('VS', VW / 2, 250, 20, '#ff3b1f');
  if (Math.floor(t / 30) % 2 === 0) r.text(touch ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER PARA EMPEZAR', VW / 2, 300, 10, '#ffd800');
  FIGHTER_IDS.forEach((id, i) => r.text(FIGHTERS[id].name, XS[i], 346, 8, ACCENT[id]));
}

const CARD = 86, CARD_GAP = 16, CARD_Y = 40;
const cardX = (i: number) => (VW - (FIGHTER_IDS.length * CARD + (FIGHTER_IDS.length - 1) * CARD_GAP)) / 2 + i * (CARD + CARD_GAP);

export function selectButtons(s: Settings): Button[] {
  const b: Button[] = [];
  FIGHTER_IDS.forEach((id, i) => b.push({ x: cardX(i), y: CARD_Y, w: CARD, h: CARD, label: '', action: 'char:' + id, on: s.char === id || (s.twoPlayers && s.char2 === id) }));
  DIFFICULTY_NAMES.forEach((n, i) => b.push({ x: 176 + i * 100, y: 206, w: 92, h: 20, label: n, action: 'diff:' + i, on: s.difficulty === i && !s.twoPlayers }));
  b.push({ x: 176, y: 232, w: 142, h: 20, label: '1P ARCADE', action: 'mode:cpu', on: !s.twoPlayers });
  b.push({ x: 326, y: 232, w: 142, h: 20, label: '2 JUGADORES', action: 'mode:2p', on: s.twoPlayers });
  STAGE_CHOICES.forEach((st, i) => b.push({ x: 176 + i * 100, y: 258, w: 92, h: 20, label: st === 'random' ? 'AL AZAR' : STAGES[st].short, action: 'stage:' + st, on: s.stage === st }));
  b.push({ x: 230, y: 286, w: 180, h: 30, label: '¡A LUCHAR!', action: 'fight' });
  return b;
}

function drawButton(r: Renderer, b: Button, size = 8) {
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  c.fillStyle = b.on ? '#ffd800' : '#8a8aa0'; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
  c.fillStyle = b.on ? '#7a1c00' : '#1b1b2e'; c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  if (b.label) r.text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, size, b.on ? '#ffe86b' : '#d8d8e8');
}

function drawStats(r: Renderer, id: FighterId, sx: number, head: string, headColor: string) {
  const c = r.ctx, d = FIGHTERS[id];
  r.text(head, sx, 50, 7, headColor, 'left');
  const rows: [string, number][] = [['FUERZA', d.stats.fuerza], ['VELOC.', d.stats.velocidad], ['TECNICA', d.stats.tecnica], ['AGUANTE', d.stats.aguante]];
  rows.forEach(([n, v], k) => {
    const yy = 68 + k * 20;
    r.text(n, sx, yy, 6, '#fff', 'left');
    for (let j = 0; j < 5; j++) { c.fillStyle = '#000'; c.fillRect(sx + j * 12 - 1, yy + 6, 11, 7); c.fillStyle = j < v ? '#ffb400' : '#33334a'; c.fillRect(sx + j * 12, yy + 7, 9, 5); }
  });
  r.text('ESPECIAL', sx, 152, 6, '#fff', 'left');
  r.text(d.specialName, sx, 164, 7, '#ff7a50', 'left');
}

export function drawSelect(r: Renderer, s: Settings, touch: boolean) {
  r.time++;
  r.begin();
  r.drawStage(40, 0.72);
  const c = r.ctx;
  r.bigText('ELIGE TU LUCHADOR', VW / 2, 20, 16);
  const blink = Math.floor(r.time / 10) % 2 === 0;
  for (const b of selectButtons(s)) {
    if (b.action.startsWith('char:')) {
      const id = b.action.slice(5) as FighterId, d = FIGHTERS[id];
      const p1 = s.char === id, p2 = s.twoPlayers && s.char2 === id;
      const frame = p1 ? (blink ? '#fff' : COL_J1) : p2 ? (blink ? '#fff' : COL_J2) : '#55556a';
      c.fillStyle = '#000'; c.fillRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
      c.fillStyle = frame; c.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
      r.drawPortrait(id, b.x, b.y, b.w);
      if (!p1 && !p2) { c.fillStyle = 'rgba(0,0,20,0.5)'; c.fillRect(b.x, b.y, b.w, b.h); }
      if (p1) r.text(s.twoPlayers ? 'J1' : 'TU', b.x + 12, b.y + 10, 7, COL_J1);
      if (p2) r.text('J2', b.x + b.w - 12, b.y + 10, 7, COL_J2);
      r.text(d.name, b.x + b.w / 2, b.y + b.h + 14, 9, p1 ? COL_J1 : p2 ? COL_J2 : '#fff');
      r.text(d.title, b.x + b.w / 2, b.y + b.h + 28, 5, '#b8c8ff');
    } else drawButton(r, b, b.action === 'fight' ? 12 : 7);
  }
  // paneles laterales: J1 a la izquierda; J2 o la escalera arcade a la derecha
  drawStats(r, s.char, 12, s.twoPlayers ? 'J1' : 'TU', COL_J1);
  const rx = VW - 104;
  if (s.twoPlayers) drawStats(r, s.char2, rx, 'J2', COL_J2);
  else {
    r.text('ARCADE', rx, 50, 7, COL_J2, 'left');
    r.text('RIVALES', rx, 66, 6, '#fff', 'left');
    FIGHTER_IDS.filter((id) => id !== s.char).forEach((id, k) => {
      const yy = 78 + k * 30;
      c.fillStyle = '#000'; c.fillRect(rx - 1, yy - 1, 26, 26);
      r.drawPortrait(id, rx, yy, 24);
      r.text(FIGHTERS[id].name, rx + 30, yy + 12, 6, '#d8d8e8', 'left');
    });
  }
  const mid = s.twoPlayers
    ? `${FIGHTERS[s.char].name}  VS  ${FIGHTERS[s.char2].name}`
    : 'VENCE A LOS OTROS TRES LUCHADORES';
  r.text(mid, VW / 2, 182, 8, s.twoPlayers ? '#fff' : '#ffd800');
  if (s.twoPlayers && touch) r.text(`TOCA UN RETRATO PARA ELEGIR J${s.pickTurn + 1}`, VW / 2, 195, 6, s.pickTurn ? COL_J2 : COL_J1);
  r.text('DIFICULTAD', 168, 216, 6, '#fff', 'right');
  r.text('MODO', 168, 242, 6, '#fff', 'right');
  r.text('ESCENARIO', 168, 268, 6, '#fff', 'right');
  if (!touch) {
    if (s.twoPlayers) {
      r.text('J1: A/D ELEGIR - WASD + F/G (FLOJOS) T/Y (FUERTES) R BLOQUEO H ESPECIAL', VW / 2, 330, 6, COL_J1);
      r.text('J2: FLECHAS ELEGIR - FLECHAS + J/K (FLOJOS) U/I (FUERTES) O BLOQUEO L ESPECIAL', VW / 2, 345, 6, COL_J2);
    } else {
      r.text('WASD/FLECHAS MOVER - F/G GOLPES FLOJOS - T/Y FUERTES - R BLOQUEO - H ESPECIAL', VW / 2, 330, 6, '#ffd800');
      r.text('ATRAS = BLOQUEAR - DOBLE TOQUE = DASH - BARRA LLENA + ESPECIAL = SUPER - ESC PAUSA', VW / 2, 345, 6, '#fff');
    }
  } else r.text('ATRAS = BLOQUEAR - SP = ESPECIAL (SUPER CON BARRA LLENA) - DOBLE TOQUE = DASH', VW / 2, 336, 6, '#ffd800');
}

// ---- VS: presentación del combate ----
export const VERSUS_FRAMES = 150;

export function drawVersus(r: Renderer, left: FighterId, right: FighterId, t: number, sub: string, stage: StageId) {
  r.time++;
  r.begin();
  const c = r.ctx;
  r.drawStage(40, 0.82);
  const slide = Math.min(1, t / 18), e = 1 - Math.pow(1 - slide, 3);
  const size = 168, y = 70;
  // franjas diagonales de color de cada jugador
  c.save();
  c.globalAlpha = 0.85;
  c.fillStyle = '#5a1a00'; c.beginPath(); c.moveTo(0, 50); c.lineTo(VW / 2 + 20, 50); c.lineTo(VW / 2 - 20, 270); c.lineTo(0, 270); c.fill();
  c.fillStyle = '#0a2a5a'; c.beginPath(); c.moveTo(VW, 50); c.lineTo(VW / 2 + 22, 50); c.lineTo(VW / 2 - 18, 270); c.lineTo(VW, 270); c.fill();
  c.restore();
  const lx = -size + (60 + size) * e, rxp = VW - (60 + size) * e;
  for (const [id, x, flip, col] of [[left, lx, false, COL_J1], [right, rxp, true, COL_J2]] as const) {
    c.fillStyle = '#000'; c.fillRect(x - 4, y - 4, size + 8, size + 8);
    c.fillStyle = col; c.fillRect(x - 2, y - 2, size + 4, size + 4);
    r.drawPortrait(id, x, y, size, flip);
  }
  if (t > 12) {
    r.text(FIGHTERS[left].name, 60 + size / 2, y + size + 22, 14, COL_J1);
    r.text(FIGHTERS[left].title, 60 + size / 2, y + size + 40, 6, '#fff');
    r.text(FIGHTERS[right].name, VW - 60 - size / 2, y + size + 22, 14, COL_J2);
    r.text(FIGHTERS[right].title, VW - 60 - size / 2, y + size + 40, 6, '#fff');
  }
  if (t > 16) {
    const pop = Math.min(1, (t - 16) / 8);
    c.save(); c.translate(VW / 2, y + size / 2); c.scale(2.6 - 1.6 * pop, 2.6 - 1.6 * pop); c.globalAlpha = pop;
    r.bigText('VS', 0, 0, 44);
    c.restore();
  }
  r.bigText('STREET CAI', VW / 2, 28, 18);
  if (sub) r.text(sub, VW / 2, 322, 9, '#ffd800');
  r.text(STAGES[stage].name + ' · CADIZ', VW / 2, 342, 7, '#fff');
}

/** final = ya ha ganado a todos los rivales del arcade. */
export function resultButtons(final = false): Button[] {
  return [
    { x: 150, y: 296, w: 160, h: 30, label: final ? 'OTRA VEZ' : 'SIGUIENTE', action: final ? 'arcade:again' : 'arcade:next', on: true },
    { x: 330, y: 296, w: 160, h: 30, label: 'MENU', action: 'menu' },
  ];
}

export function drawResult(r: Renderer, winnerId: FighterId, loserId: FighterId, headline: string, score: string, final = false) {
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
  r.text(score, VW / 2, 262, final ? 9 : 12, final ? '#ffd800' : '#fff');
  if (final) r.text('CAMPEON DE LA PLAZA DE LAS FLORES', VW / 2, 280, 7, '#fff');
  for (const b of resultButtons(final)) drawButton(r, b, 10);
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
export function drawContinue(r: Renderer, loserId: FighterId, t: number, overT: number, touch: boolean) {
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
