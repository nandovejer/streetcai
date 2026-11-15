// Pantallas de menú dibujadas en el canvas: título, selección y resultado.
import { DIFFICULTY_NAMES, Difficulty, FIGHTERS, FIGHTER_IDS, FighterId, HOME_STAGE, SECRET, STAGES, StageId, VH, VW } from '../game/data';
import { Renderer } from '../render/renderer';

export interface Settings {
  /** Luchador del J1 y del J2 (el J2 solo se usa en modo 2 jugadores). */
  char: FighterId; char2: FighterId;
  difficulty: Difficulty; twoPlayers: boolean;
  /** En 2 jugadores con ratón/táctil: a quién asigna el siguiente toque en un retrato. */
  pickTurn: 0 | 1;
  /** 'home' = el barrio del rival (como en las recreativas), 'random' = al azar; un StageId lo fuerza (pruebas). */
  stage: StageId | 'home' | 'random';
}
export const STAGE_CHOICES: ('home' | 'random')[] = ['home', 'random'];
export interface Button { x: number; y: number; w: number; h: number; label: string; action: string; on?: boolean; kind?: 'card' | 'home' | 'opt' | 'btn' }

const COL_J1 = '#ffd800', COL_J2 = '#3cb8ff';

// ---- DEMO: rótulo encima del combate de exhibición ----
export function drawDemoOverlay(r: Renderer, touch: boolean) {
  r.begin();
  const t = r.time;
  r.text('DEMO', VW / 2, 58, 10, '#ff5a3c');
  if (Math.floor(t / 30) % 2 === 0) r.text(touch ? 'TOCA PARA JUGAR' : 'PULSA ENTER PARA JUGAR', VW / 2, 300, 10, '#ffd800');
}

// ---- Portada con intro animada (solo la primera vez) ----
export interface TitleHooks { play: (sfx: 'punch' | 'heavy' | 'ko' | 'whoosh' | 'special' | 'start' | 'land' | 'coin') => void; voice: (id: string) => void; music: () => void }
/** Momentos de la intro (en frames a 60 Hz). */
const INTRO = { tiltEnd: 80, letters: 52, letterGap: 7, letterFall: 13, caiStart: 104, caiHit: 116, shine: 128, shineLen: 30, press: 150, end: 160 };
const TITLE_Y = [50, 104];
let introStart = -1, introLast = -1, introSkipped = false, titleShake = 0;
/** Pruebas: congela la intro en un frame (?introAt=N). */
let introFrozen = -1;
export function freezeTitleIntro(n: number) { introFrozen = n; }
interface TitleFx { x: number; y: number; life: number; max: number; kind: 'dust' | 'ring'; letter?: number }
let titleFx: TitleFx[] = [];

/** Frames de intro transcurridos (o el final si ya terminó / se saltó). */
function introFrame(): number {
  if (introSkipped) return INTRO.end + 1;
  if (introFrozen >= 0) return introFrozen;
  if (introStart < 0) introStart = performance.now();
  return (performance.now() - introStart) / (1000 / 60);
}
export function titleIntroPlaying() { return !introSkipped && introFrame() < INTRO.press; }
export function skipTitleIntro(r: Renderer) {
  if (introSkipped) return;
  introSkipped = true; titleFx = []; titleShake = 0;
  r.burstPetals(VW / 2, 80, 40);
}

/** Dibuja una palabra letra a letra con el estilo de bigText (contorno en dos pasadas para que no se pisen). */
function drawWord(r: Renderer, word: string, cx: number, y: number, size: number, letter: (i: number) => { dy: number; scale: number; alpha: number }) {
  const c = r.ctx;
  c.font = `${size}px "Press Start 2P", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const total = c.measureText(word).width, x0 = cx - total / 2;
  const ls = [...word].map((ch, i) => ({ ch, x: x0 + c.measureText(word.slice(0, i)).width + c.measureText(ch).width / 2, ...letter(i) }));
  for (let pass = 0; pass < 3; pass++) {
    for (const l of ls) {
      if (l.alpha <= 0) continue;
      c.save(); c.globalAlpha = Math.min(1, l.alpha);
      c.translate(l.x, y + l.dy); c.scale(l.scale, l.scale);
      if (pass === 0) { c.lineWidth = size / 3; c.strokeStyle = '#1a0500'; c.strokeText(l.ch, 0, 2); }
      else if (pass === 1) { c.lineWidth = size / 6; c.strokeStyle = '#fff'; c.strokeText(l.ch, 0, 0); }
      else {
        const g = c.createLinearGradient(0, -size / 2, 0, size / 2);
        g.addColorStop(0, '#fff36b'); g.addColorStop(0.5, '#ffb400'); g.addColorStop(1, '#e02a10');
        c.fillStyle = g; c.fillText(l.ch, 0, 0);
      }
      c.restore();
    }
  }
  return ls;
}

const easeOut = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
function bounce(k: number) {
  k = Math.min(1, Math.max(0, k));
  if (k < 0.6) return (k / 0.6) ** 2;              // caída
  const b = (k - 0.6) / 0.4;                        // rebote corto
  return 1 - Math.sin(b * Math.PI) * 0.12 * (1 - b);
}

export function drawTitle(r: Renderer, touch: boolean, hooks?: TitleHooks) {
  r.time++;
  const t = r.time, f = introFrame(), prev = introLast;
  introLast = f;
  const crossed = (at: number) => prev < at && f >= at;
  const c = r.ctx;
  titleShake *= 0.86;
  r.begin(titleShake);

  // fondo: la cámara baja desde el cielo hasta encuadrar Puerta de Tierra
  const tilt = easeOut(f / INTRO.tiltEnd);
  const zoom = 2.1 - 1.1 * tilt;
  const dw = VW * zoom, dh = VH * zoom;
  c.save(); c.imageSmoothingEnabled = true;
  c.drawImage(r.assets.title, (VW - dw) / 2, 0, dw, dh); // anclado arriba: empieza mirando al cielo y la bandera
  c.restore();
  if (crossed(1)) hooks?.play('whoosh');
  r.drawPetals();

  // STREET: letras que caen una a una
  const bobAmp = Math.min(1, Math.max(0, (f - INTRO.press) / 30)) * 3;
  const bob = Math.sin(t * 0.05) * bobAmp;
  const lettersStart = INTRO.letters;
  'STREET'.split('').forEach((_, i) => {
    const at = lettersStart + i * INTRO.letterGap + INTRO.letterFall;
    if (crossed(at)) {
      hooks?.play('punch'); titleShake = Math.max(titleShake, 3);
      titleFx.push({ x: 0, y: 0, life: 14, max: 14, kind: 'dust', letter: i });
    }
  });
  const street = drawWord(r, 'STREET', VW / 2, TITLE_Y[0] + bob, 46, (i) => {
    const k = (f - lettersStart - i * INTRO.letterGap) / INTRO.letterFall;
    if (k <= 0) return { dy: 0, scale: 1, alpha: 0 };
    return { dy: -(1 - bounce(k)) * (TITLE_Y[0] + 60), scale: 1, alpha: 1 };
  });

  // CAI: se estampa desde muy grande
  if (crossed(INTRO.caiStart)) hooks?.play('whoosh');
  if (crossed(INTRO.caiHit)) {
    hooks?.play('heavy'); hooks?.play('ko'); hooks?.voice('title');
    titleShake = 12;
    titleFx.push({ x: VW / 2, y: TITLE_Y[1], life: 22, max: 22, kind: 'ring' });
    r.burstPetals(VW / 2, TITLE_Y[1], 70);
  }
  const kc = (f - INTRO.caiStart) / (INTRO.caiHit - INTRO.caiStart);
  const caiScale = kc >= 1 ? 1 : 1 + 5 * Math.pow(1 - Math.max(0, kc), 2.2);
  drawWord(r, 'CAI', VW / 2, TITLE_Y[1] + bob, 58, () => ({ dy: 0, scale: caiScale, alpha: kc <= 0 ? 0 : Math.min(1, kc * 2.5) }));

  // polvo bajo cada letra que aterriza y onda expansiva del golpe
  for (const fx of titleFx) {
    const k = 1 - fx.life / fx.max;
    if (fx.kind === 'dust') {
      const l = street[fx.letter ?? 0]; if (!l) continue;
      c.fillStyle = `rgba(255,240,210,${0.5 * (1 - k)})`;
      for (const side of [-1, 1]) { c.beginPath(); c.arc(l.x + side * (8 + k * 14), TITLE_Y[0] + 20 - k * 4, 3 + k * 5, 0, Math.PI * 2); c.fill(); }
    } else {
      c.strokeStyle = `rgba(255,230,140,${1 - k})`; c.lineWidth = 4 * (1 - k) + 1;
      c.beginPath(); c.ellipse(fx.x, fx.y, 40 + k * 260, 14 + k * 90, 0, 0, Math.PI * 2); c.stroke();
    }
    fx.life--;
  }
  if (titleFx.length) titleFx = titleFx.filter((fx) => fx.life > 0);

  // destello blanco del impacto
  const flash = f >= INTRO.caiHit ? 1 - (f - INTRO.caiHit) / 14 : 0;
  if (flash > 0 && !introSkipped) { c.fillStyle = `rgba(255,255,255,${0.85 * flash})`; c.fillRect(-20, -20, VW + 40, VH + 40); }

  // brillo metálico que recorre el título (en la intro y luego cada pocos segundos)
  // brillo: en la intro y después cada 7 s aprox.
  const sh = f < INTRO.shine + INTRO.shineLen ? (f - INTRO.shine) / INTRO.shineLen : (t % 420) / INTRO.shineLen;
  if (sh > 0 && sh < 1 && (f >= INTRO.shine)) {
    const bx = -120 + sh * (VW + 240);
    for (const [word, y, size] of [['STREET', TITLE_Y[0] + bob, 46], ['CAI', TITLE_Y[1] + bob, 58]] as const) {
      c.save();
      c.font = `${size}px "Press Start 2P", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const g = c.createLinearGradient(bx - 40, y - 30, bx + 40, y + 30);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillText(word, VW / 2, y);
      c.restore();
    }
    if (crossed(INTRO.shine)) hooks?.play('special');
  }

  // fundido desde negro al principio
  if (f < 30 && !introSkipped) { c.fillStyle = `rgba(0,0,0,${1 - f / 30})`; c.fillRect(-20, -20, VW + 40, VH + 40); }

  // invitación a empezar
  if (f >= INTRO.press) {
    if (crossed(INTRO.press)) { hooks?.play('start'); hooks?.music(); }
    c.globalAlpha = Math.min(1, (f - INTRO.press) / 15);
    if (Math.floor(t / 30) % 2 === 0) r.text(touch ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER PARA EMPEZAR', VW / 2, 322, 10, '#ffd800');
    c.globalAlpha = 1;
  }
}

// ---- Selección de luchador: mapa de Cádiz al estilo de las recreativas ----
/** Mapa (public/assets/ui/map-cadiz.webp) dibujado en pantalla; coordenadas del original 1536×1024. */
const MAP_X = 120, MAP_Y = -4, MAP_W = 400, MAP_H = MAP_W * 1024 / 1536;
const mapPt = (x: number, y: number): [number, number] => [MAP_X + (x * MAP_W) / 1536, MAP_Y + (y * MAP_H) / 1024];
/** Barrio de cada luchador en el mapa. */
export const HOMES: Record<FighterId, { x: number; y: number; place: string }> = {
  chapa: { x: 698, y: 172, place: 'LA CANDELARIA' },
  ares: { x: 1030, y: 786, place: 'SANTA MARIA DEL MAR' },
  alba: { x: 342, y: 600, place: 'LA CALETA' },
  martin: { x: 592, y: 346, place: 'TEATRO FALLA' },
  selu: { x: 742, y: 478, place: 'PLAZA DE LAS FLORES' },
  // fuera de Cádiz: llega por mar (arriba a la izquierda, en mar abierto)
  canijo: { x: 128, y: 150, place: 'EN ALTA MAR' },
  // fuera de Cádiz: en el mar de abajo a la derecha, pasado el faro de Santa María
  bizcocho: { x: 1450, y: 930, place: 'EN ALTA MAR' },
  // secreto: en un punto de Cádiz al azar en cada partida (se elige al cargar)
  // (puntos en calles del casco antiguo, lejos de los rótulos y de los barrios de los demás)
  heredero: { ...[
    { x: 800, y: 400 }, { x: 1000, y: 470 }, { x: 1130, y: 560 }, { x: 760, y: 250 }, { x: 1080, y: 330 }, { x: 880, y: 520 },
  ][Math.floor(Math.random() * 6)], place: '???' },
};
/** Nombre y apodo como se muestran antes del combate (los secretos, ocultos). */
export const shownName = (id: FighterId) => (SECRET.has(id) ? '???' : FIGHTERS[id].name);
const shownTitle = (id: FighterId) => (SECRET.has(id) ? 'LUCHADOR MISTERIOSO' : FIGHTERS[id].title);
/**
 * Caras en dos filas en el mar bajo la isla, entre La Caleta y el rótulo de Santa María (x 176-370). Al añadir
 * luchadores las filas ganan columnas (3 con 6, 4 con 7-8...) y las caras se encogen para caber.
 */
const CARD_GAP = 6, GRID_Y = 238, GRID_AREA_X = 176, GRID_AREA_W = 194;
const CARD_COLS = Math.max(3, Math.ceil(FIGHTER_IDS.length / 2));
const CARD = Math.min(50, Math.floor((GRID_AREA_W - (CARD_COLS - 1) * CARD_GAP) / CARD_COLS));
const GRID_X = GRID_AREA_X + Math.floor((GRID_AREA_W - (CARD_COLS * CARD + (CARD_COLS - 1) * CARD_GAP)) / 2);
const GRID_W = CARD_COLS * CARD + (CARD_COLS - 1) * CARD_GAP, GRID_CX = GRID_X + GRID_W / 2;
const cardX = (i: number) => GRID_X + (i % CARD_COLS) * (CARD + CARD_GAP);
const cardY = (i: number) => GRID_Y + Math.floor(i / CARD_COLS) * (CARD + CARD_GAP);
/** Opciones (modo, dificultad, escenario) en la columna derecha, bajo los botones del sistema. */
const OPT_W = 108, OPT_X = VW - 6 - OPT_W, OPT_Y = 24;
/** Posición animada de los cursores sobre el mapa (se deslizan de un barrio a otro). */
const mapCursor: [number, number][] = [[0, 0], [0, 0]];
let mapCursorInit = false;

export function selectButtons(s: Settings): Button[] {
  const b: Button[] = [];
  FIGHTER_IDS.forEach((id, i) => {
    b.push({ x: cardX(i), y: cardY(i), w: CARD, h: CARD, label: '', action: 'char:' + id, kind: 'card', on: s.char === id || (s.twoPlayers && s.char2 === id) });
    const [hx, hy] = mapPt(HOMES[id].x, HOMES[id].y);
    b.push({ x: hx - 12, y: hy - 12, w: 24, h: 24, label: '', action: 'char:' + id, kind: 'home' });
  });
  let y = OPT_Y + 14;
  const opt = (label: string, action: string, on: boolean) => { b.push({ x: OPT_X, y, w: OPT_W, h: 13, label, action, on, kind: 'opt' }); y += 15; };
  opt('1P ARCADE', 'mode:cpu', !s.twoPlayers);
  opt('2 JUGADORES', 'mode:2p', s.twoPlayers);
  y += 13;
  DIFFICULTY_NAMES.forEach((n, i) => opt(n, 'diff:' + i, s.difficulty === i && !s.twoPlayers));
  y += 13;
  STAGE_CHOICES.forEach((st) => opt(st === 'random' ? 'AL AZAR' : 'BARRIO RIVAL', 'stage:' + st, s.stage === st));
  // ¡A LUCHAR!: botón rectangular a la derecha de las caras, centrado en altura con el bloque
  const rows = Math.ceil(FIGHTER_IDS.length / CARD_COLS), gridH = rows * (CARD + CARD_GAP) - CARD_GAP;
  b.push({ x: GRID_X + GRID_W + 12, y: GRID_Y + gridH / 2 - 18, w: 106, h: 34, label: '¡A LUCHAR!', action: 'fight', kind: 'btn', on: true });
  return b;
}

/** Botón ¡A LUCHAR!: marco dorado con relieve pixelado, cuerpo rojo, texto con el degradado del título y brillo que late. */
function drawFightButton(r: Renderer, b: Button, touch: boolean) {
  const c = r.ctx, glow = 0.5 + Math.sin(r.time * 0.1) * 0.5;
  // resplandor dorado en capas (más barato que una sombra difuminada)
  c.fillStyle = '#ffb000';
  for (let i = 4; i >= 1; i--) { c.globalAlpha = (0.05 + glow * 0.07) * (5 - i) / 2; c.fillRect(b.x - 3 - i * 2, b.y - 3 - i * 2, b.w + 6 + i * 4, b.h + 6 + i * 4); }
  c.globalAlpha = 1;
  c.fillStyle = '#000'; c.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
  // marco dorado con luz arriba-izquierda y sombra abajo-derecha
  c.fillStyle = '#ffe27a'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  c.fillStyle = '#b07800'; c.fillRect(b.x, b.y + b.h, b.w + 2, 2); c.fillRect(b.x + b.w, b.y, 2, b.h + 2);
  c.fillStyle = '#000'; c.fillRect(b.x, b.y, b.w, b.h);
  const g = c.createLinearGradient(0, b.y + 1, 0, b.y + b.h - 1);
  g.addColorStop(0, '#ff6a2a'); g.addColorStop(0.5, '#d01e0e'); g.addColorStop(1, '#6a0a04');
  c.fillStyle = g; c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  c.fillStyle = 'rgba(255,220,180,.55)'; c.fillRect(b.x + 3, b.y + 3, b.w - 6, 2);   // brillo superior
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(b.x + 3, b.y + b.h - 5, b.w - 6, 2);    // sombra inferior
  // texto en una línea con el degradado del título
  gradText(r, '¡A LUCHAR!', b.x + b.w / 2 + 1, b.y + b.h / 2, 9, '#fff6b0', '#ffb000', 'center');
  r.text(touch ? 'TOCA AQUI' : 'PULSA ENTER', b.x + b.w / 2, b.y + b.h + 11, 5, Math.floor(r.time / 30) % 2 ? '#9ab0ff' : '#ffd800');
}

function drawButton(r: Renderer, b: Button, size = 8) {
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  c.fillStyle = b.on ? '#ffd800' : '#8a8aa0'; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
  c.fillStyle = b.on ? '#7a1c00' : '#1b1b2e'; c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  if (b.label) {
    const lines = b.label.split('\n'), lh = size * 1.6;
    lines.forEach((ln, i) => r.text(ln, b.x + b.w / 2, b.y + b.h / 2 + 1 + (i - (lines.length - 1) / 2) * lh, size, b.on ? '#ffe86b' : '#d8d8e8'));
  }
}

function drawStats(r: Renderer, id: FighterId, sx: number, y0: number, head: string, headColor: string) {
  const c = r.ctx, d = FIGHTERS[id], secret = SECRET.has(id);
  r.text(secret ? '???' : head, sx, y0, 7, headColor, 'left');
  if (secret) {
    ['FUERZA', 'VELOC.', 'TECNICA', 'AGUANTE'].forEach((n, k) => { r.text(n, sx, y0 + 16 + k * 19, 6, '#fff', 'left'); r.text('? ? ? ? ?', sx, y0 + 26 + k * 19, 6, '#b040ff', 'left'); });
    r.text('ESPECIAL', sx, y0 + 96, 6, '#fff', 'left');
    r.text('???', sx, y0 + 108, 7, '#ff7a50', 'left');
    return;
  }
  const rows: [string, number][] = [['FUERZA', d.stats.fuerza], ['VELOC.', d.stats.velocidad], ['TECNICA', d.stats.tecnica], ['AGUANTE', d.stats.aguante]];
  rows.forEach(([n, v], k) => {
    const yy = y0 + 16 + k * 19;
    r.text(n, sx, yy, 6, '#fff', 'left');
    for (let j = 0; j < 5; j++) { c.fillStyle = '#000'; c.fillRect(sx + j * 12 - 1, yy + 6, 11, 7); c.fillStyle = j < v ? '#ffb400' : '#33334a'; c.fillRect(sx + j * 12, yy + 7, 9, 5); }
  });
  r.text('ESPECIAL', sx, y0 + 96, 6, '#fff', 'left');
  r.text(d.specialName, sx, y0 + 108, 7, '#ff7a50', 'left');
}

/** Retrato grande sin marco, apoyado en el borde inferior (como en la selección de las recreativas). */
function drawBigPortrait(r: Renderer, id: FighterId, side: 0 | 1, label: string, col: string) {
  const c = r.ctx, img = r.assets.portrait[id];
  const h = 132, w = img ? (img.width * h) / img.height : 140;
  if (SECRET.has(id)) r.drawSilhouette(id, side === 0 ? -4 : VW + 4 - w, VH - h, w, h, side === 1);
  else if (img) {
    c.save(); c.imageSmoothingEnabled = true;
    if (side === 0) c.drawImage(img, -4, VH - h, w, h);
    else { c.translate(VW + 4, VH - h); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); }
    c.restore();
  }
  const tx = side === 0 ? 8 : VW - 8, al = side === 0 ? 'left' : 'right';
  r.text(label, tx, VH - h - 34, 9, col, al);
  gradText(r, shownName(id), tx, VH - h - 18, 15, '#ffd060', '#ff5a00', al);
  r.text(HOMES[id].place, tx, VH - h - 4, 6, '#fff', al);
}

function drawCorners(r: Renderer, x: number, y: number, w: number, h: number, col: string, len = 5) {
  const c = r.ctx;
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    c.fillStyle = '#000';
    c.fillRect(cx - (dx < 0 ? len + 1 : 1), cy - (dy < 0 ? 3 : 1), len + 2, 4);
    c.fillRect(cx - (dx < 0 ? 3 : 1), cy - (dy < 0 ? len + 1 : 1), 4, len + 2);
    c.fillStyle = col;
    c.fillRect(cx - (dx < 0 ? len : 0), cy - (dy < 0 ? 2 : 0), len, 2);
    c.fillRect(cx - (dx < 0 ? 2 : 0), cy - (dy < 0 ? len : 0), 2, len);
  }
}

export function drawSelect(r: Renderer, s: Settings, touch: boolean) {
  r.time++;
  r.begin();
  const c = r.ctx, t = r.time;
  // mar de fondo y mapa
  c.fillStyle = '#00034a'; c.fillRect(-10, -10, VW + 20, VH + 20);
  c.save(); c.imageSmoothingEnabled = true;
  if (r.assets.map) c.drawImage(r.assets.map, MAP_X, MAP_Y, MAP_W, MAP_H);
  c.restore();
  const blink = Math.floor(t / 10) % 2 === 0;
  const players: [FighterId, string, string][] = [[s.char, s.twoPlayers ? '1P' : 'TU', COL_J1]];
  if (s.twoPlayers) players.push([s.char2, '2P', COL_J2]);

  // barrios: punto en cada uno y cursores deslizándose por el mapa
  for (const id of FIGHTER_IDS) {
    const [hx, hy] = mapPt(HOMES[id].x, HOMES[id].y);
    if (SECRET.has(id)) { r.text('?', hx + 0.5, hy + 0.5, 9, Math.floor(t / 20) % 2 ? '#ffd800' : '#ff7aff', 'center', '#000'); continue; }
    c.fillStyle = '#000'; c.beginPath(); c.arc(hx, hy, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = Math.floor(t / 20) % 2 ? '#fff' : '#ffe27a'; c.beginPath(); c.arc(hx, hy, 2.2, 0, Math.PI * 2); c.fill();
  }
  if (!mapCursorInit) { players.forEach(([id], i) => { mapCursor[i] = mapPt(HOMES[id].x, HOMES[id].y); }); mapCursorInit = true; }
  players.forEach(([id, label, col], i) => {
    const [tx, ty] = mapPt(HOMES[id].x, HOMES[id].y), mc = mapCursor[i];
    mc[0] += (tx - mc[0]) * 0.22; mc[1] += (ty - mc[1]) * 0.22;
    const sz = 20 + (blink ? 2 : 0), off = s.twoPlayers && s.char === s.char2 ? (i ? 4 : -4) : 0;
    drawCorners(r, mc[0] - sz / 2 + off, mc[1] - sz / 2, sz, sz, blink ? '#fff' : col);
    r.text(label, mc[0] + off, mc[1] - sz / 2 - 8 - (blink ? 1 : 0), 8, col);
  });

  // opciones (mar de la esquina superior izquierda)
  // columna derecha: opciones
  r.text('MODO', OPT_X, OPT_Y + 7, 6, '#9ab0ff', 'left');
  r.text('DIFICULTAD', OPT_X, OPT_Y + 51, 6, '#9ab0ff', 'left');
  r.text('ESCENARIO', OPT_X, OPT_Y + 109, 6, '#9ab0ff', 'left');
  const bs = selectButtons(s);
  for (const b of bs) if (b.kind === 'opt') drawButton(r, b, 6);
  // escenario del próximo combate cuando es el barrio del rival
  if (s.stage === 'home') {
    const rival = s.twoPlayers ? s.char2 : null;
    const st = rival ? (SECRET.has(rival) ? '???' : STAGES[HOME_STAGE[rival]].name) : 'EL DE CADA RIVAL';
    r.text(st, OPT_X, OPT_Y + 158, st.length > 21 ? 4 : 5, '#ffd800', 'left');
  }
  // (en 2 jugadores ahí va el nombre del 2P)
  if (!touch && !s.twoPlayers) {
    r.text('A/D: ELEGIR LUCHADOR', OPT_X, OPT_Y + 172, 5, '#9ab0ff', 'left');
    r.text('E: CAMBIAR ESCENARIO', OPT_X, OPT_Y + 182, 5, '#9ab0ff', 'left');
  }

  // columna izquierda: estadísticas del J1, encima de su retrato grande
  drawStats(r, s.char, 8, 34, FIGHTERS[s.char].title, COL_J1);

  // retratos grandes
  drawBigPortrait(r, s.char, 0, s.twoPlayers ? '1P' : 'TU', COL_J1);
  if (s.twoPlayers) drawBigPortrait(r, s.char2, 1, '2P', COL_J2);

  // fila de caras
  const head = s.twoPlayers && touch ? `TOCA UN RETRATO PARA ELEGIR ${s.pickTurn ? '2P' : '1P'}` : 'ELIGE TU LUCHADOR';
  r.text(head, GRID_CX, GRID_Y - 8, 6, s.twoPlayers && touch ? (s.pickTurn ? COL_J2 : COL_J1) : '#fff', 'center', '#000');
  for (const b of bs) {
    if (b.kind !== 'card') continue;
    const id = b.action.slice(5) as FighterId;
    const p1 = s.char === id, p2 = s.twoPlayers && s.char2 === id;
    c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    if (SECRET.has(id)) r.drawSecret(b.x, b.y, b.w); else r.drawPortrait(id, b.x, b.y, b.w);
    if (!p1 && !p2) { c.fillStyle = 'rgba(0,0,30,0.45)'; c.fillRect(b.x, b.y, b.w, b.h); }
    if (p1) { drawCorners(r, b.x - 3, b.y - 3, b.w + 6, b.h + 6, blink ? '#fff' : COL_J1, 9); r.text(s.twoPlayers ? '1P' : 'TU', b.x + 9, b.y + 7, 6, COL_J1); }
    if (p2) { drawCorners(r, b.x - 1, b.y - 1, b.w + 2, b.h + 2, blink ? '#fff' : COL_J2, 7); r.text('2P', b.x + b.w - 9, b.y + 7, 6, COL_J2); }
  }
  for (const b of bs) if (b.kind === 'btn') drawFightButton(r, b, touch);
}

// ---- VS: presentación del combate ----
export const VERSUS_FRAMES = 150;

export function drawVersus(r: Renderer, left: FighterId, right: FighterId, t: number, sub: string, stage: StageId, help: string[] = []) {
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
    if (SECRET.has(id)) r.drawSecret(x, y, size); else r.drawPortrait(id, x, y, size, flip);
  }
  if (t > 12) {
    r.text(shownName(left), 60 + size / 2, y + size + 22, 14, COL_J1);
    r.text(shownTitle(left), 60 + size / 2, y + size + 40, 6, '#fff');
    r.text(shownName(right), VW - 60 - size / 2, y + size + 22, 14, COL_J2);
    r.text(shownTitle(right), VW - 60 - size / 2, y + size + 40, 6, '#fff');
  }
  if (t > 16) {
    const pop = Math.min(1, (t - 16) / 8);
    c.save(); c.translate(VW / 2, y + size / 2); c.scale(2.6 - 1.6 * pop, 2.6 - 1.6 * pop); c.globalAlpha = pop;
    r.bigText('VS', 0, 0, 44);
    c.restore();
  }
  r.bigText('STREET CAI', VW / 2, 28, 18);
  if (t > 12 && help.length) help.forEach((h, i) => r.text(h, VW / 2, 296 + i * 11, 5, i ? '#fff' : '#ffd800'));
  if (sub) r.text(sub, VW / 2, 322, 9, '#ffd800');
  const city = STAGES[stage].city ?? 'CADIZ';
  r.text(STAGES[stage].name + (city ? ' · ' + city : ''), VW / 2, 342, 7, '#fff');
}

export function resultButtons(): Button[] {
  return [
    { x: 150, y: 296, w: 160, h: 30, label: 'SIGUIENTE', action: 'arcade:next', on: true },
    { x: 330, y: 296, w: 160, h: 30, label: 'MENU', action: 'menu' },
  ];
}

export function drawResult(r: Renderer, winnerId: FighterId, loserId: FighterId, headline: string, score: string) {
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

// ---- CAMPEON: tras ganar a todos los rivales del arcade (sin botones; después pasan los créditos) ----
/** Duración de la pantalla de campeón antes de los créditos (frames). */
export const CHAMPION_FRAMES = 60 * 8;
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; rocket?: boolean; tgt?: number; flash?: boolean }
interface Bit { x: number; y: number; vx: number; vy: number; ph: number; col: string; w: number }
const FW_COLS = ['#ffd800', '#ff5a3c', '#7fe0ff', '#ff7aa8', '#9dff6a', '#c58bff', '#ffffff'];
let sparks: Spark[] = [], confetti: Bit[] = [], champLast = -1;

function addConfetti(n: number, x?: number, y?: number) {
  for (let i = 0; i < n; i++) {
    const burst = x !== undefined, a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5;
    confetti.push({
      x: burst ? x! : Math.random() * VW, y: burst ? y! : -10 - Math.random() * 200,
      vx: burst ? Math.cos(a) * sp : (Math.random() - 0.5) * 0.6, vy: burst ? Math.sin(a) * sp - 3 : 0.6 + Math.random() * 0.9,
      ph: Math.random() * 6, col: FW_COLS[(Math.random() * FW_COLS.length) | 0], w: 2 + ((Math.random() * 3) | 0),
    });
  }
}
function explode(x: number, y: number) {
  const col = FW_COLS[(Math.random() * FW_COLS.length) | 0], col2 = FW_COLS[(Math.random() * FW_COLS.length) | 0];
  const n = 60 + ((Math.random() * 30) | 0);
  sparks.push({ x, y, vx: 0, vy: 0, life: 0, max: 12, col, size: 60, flash: true });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.1, sp = 1.8 + Math.random() * 2.8;
    sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 55 + Math.random() * 35, col: i % 3 ? col : col2, size: 3 });
  }
}

/**
 * Pantalla de campeón: gran cartel, foto del ganador en el centro con rayos de luz, el ganador y el último
 * rival a los lados, fuegos artificiales y confeti. t = frames desde que empezó. Devuelve cuántos fuegos
 * han estallado en este frame (para el sonido).
 */
export function drawChampion(r: Renderer, winnerId: FighterId, loserId: FighterId, rivals: number, t: number): number {
  r.time++;
  r.begin();
  const c = r.ctx, d = FIGHTERS[winnerId];
  if (t < champLast || champLast < 0) { sparks = []; confetti = []; addConfetti(90); }
  const steps = Math.max(0, Math.min(5, t - champLast));
  champLast = t;
  r.drawStage(40, 0.75);
  c.fillStyle = 'rgba(4,4,20,0.55)'; c.fillRect(0, 0, VW, VH);

  // fuegos artificiales: cohetes que suben desde abajo y estallan
  let booms = 0;
  for (let k = 0; k < steps; k++) {
    const tk = t - steps + k + 1;
    // salva inicial cuando se estampa el cartel, y después un cohete cada ~1/3 s
    if (tk === 14) { explode(110, 70); explode(VW - 110, 60); booms += 2; }
    if (tk > 10 && tk % 18 === 0) {
      const x = 50 + Math.random() * (VW - 100);
      sparks.push({ x, y: VH + 4, vx: (Math.random() - 0.5) * 0.8, vy: -6.6 - Math.random() * 1.4, life: 0, max: 999, col: '#fff6c0', size: 3, rocket: true, tgt: 30 + Math.random() * 100 });
    }
    if (tk % 40 === 0) addConfetti(18);
    for (const s of sparks) {
      s.life++;
      if (s.rocket) { s.x += s.vx; s.y += s.vy; s.vy += 0.07; if (s.y <= s.tgt! || s.vy >= -0.5) { s.life = s.max; explode(s.x, s.y); booms++; } }
      else { s.x += s.vx; s.y += s.vy; s.vx *= 0.975; s.vy = s.vy * 0.975 + 0.045; }
    }
    sparks = sparks.filter((s) => s.life < s.max);
    for (const p of confetti) {
      p.ph += 0.15; p.vx *= 0.985; p.vy = Math.min(1.6, p.vy + 0.05); p.x += p.vx + Math.sin(p.ph * 0.5) * 0.35; p.y += p.vy;
    }
    confetti = confetti.filter((p) => p.y < VH + 10);
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const s of sparks) {
    const a = s.rocket ? 1 : Math.max(0, 1 - s.life / s.max);
    if (s.flash) {
      const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
      g.addColorStop(0, s.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a * 0.7; c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y, s.size, 0, Math.PI * 2); c.fill();
      continue;
    }
    c.fillStyle = s.col;
    if (s.rocket) {
      c.globalAlpha = 1; c.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
      c.globalAlpha = 0.45; c.fillStyle = '#ffb040'; c.fillRect(Math.round(s.x), Math.round(s.y) + 2, 1, 9);
      continue;
    }
    // estela: tres puntos hacia atrás que se apagan
    for (let j = 2; j >= 0; j--) {
      c.globalAlpha = a * (j ? 0.25 / j : 1);
      const sz = j ? 2 : s.size;
      c.fillRect(Math.round(s.x - s.vx * j * 2.2), Math.round(s.y - s.vy * j * 2.2), sz, sz);
    }
  }
  c.restore();

  // rayos de luz giratorios detrás de la foto
  const cx = VW / 2, cy = 150, pop = Math.min(1, t / 18);
  c.save(); c.translate(cx, cy); c.rotate(t * 0.006); c.globalAlpha = 0.22 * pop; c.fillStyle = '#ffe27a';
  for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 340, (i / 16) * Math.PI * 2, (i / 16) * Math.PI * 2 + 0.17); c.fill(); }
  c.restore();

  // ganador y último rival a los lados (como en la pantalla de resultado)
  r.drawSprite(winnerId, `idle_${Math.floor(t / 7) % 8}`, 110, 300 - Math.abs(Math.sin(t * 0.09)) * 10, 1, 1.25);
  r.drawSprite(loserId, 'ko_4', 540, 300, -1, 1.2);

  // foto del ganador en el centro: entra con zoom y rebote
  const size = 150 * (pop < 1 ? 0.6 + 0.4 * pop + Math.sin(pop * Math.PI) * 0.12 : 1 + Math.sin(t * 0.06) * 0.015);
  c.fillStyle = '#ffd800';
  for (let i = 4; i >= 1; i--) { c.globalAlpha = 0.07 * (5 - i); c.fillRect(cx - size / 2 - 5 - i * 3, cy - size / 2 - 5 - i * 3, size + 10 + i * 6, size + 10 + i * 6); }
  c.globalAlpha = 1;
  c.fillStyle = '#000'; c.fillRect(cx - size / 2 - 5, cy - size / 2 - 5, size + 10, size + 10);
  c.fillStyle = '#ffd800'; c.fillRect(cx - size / 2 - 3, cy - size / 2 - 3, size + 6, size + 6);
  r.drawPortrait(winnerId, cx - size / 2, cy - size / 2, size);

  // cartel grande: se estampa al principio y luego late
  const s0 = t < 14 ? 3 - (2 * t) / 14 : 1 + Math.sin(t * 0.08) * 0.04;
  c.save(); c.translate(cx, 38); c.scale(s0, s0); c.globalAlpha = Math.min(1, t / 8);
  r.bigText('¡CAMPEON!', 0, 0, 36);
  c.restore();
  if (t >= 14 && t - steps < 14) addConfetti(90, cx, 40);

  if (t > 20) {
    r.text(d.name, cx, 246, 16, '#ffd800');
    r.text('CAMPEON DE CADIZ', cx, 268, 9, '#fff');
    r.text(`${rivals} DE ${rivals} RIVALES VENCIDOS`, cx, 284, 7, '#9ab0ff');
  }

  // confeti por delante de todo
  for (const p of confetti) {
    c.fillStyle = p.col;
    c.fillRect(Math.round(p.x), Math.round(p.y), p.w, Math.sin(p.ph) > 0 ? p.w : 1);
  }
  return booms;
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

function paintBulbs(c: CanvasRenderingContext2D, digit: string, x0: number, y0: number, pitch: number, glow: number) {
  const rows = BULB_DIGITS[digit] || BULB_DIGITS['0'], rad = pitch * 0.46;
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

/** Cada dígito se pinta una vez por nivel de brillo (con ~100 degradados) y después solo se copia. */
const bulbCache = new Map<string, HTMLCanvasElement>();
function drawBulbs(r: Renderer, digit: string, x0: number, y0: number, pitch: number, glow: number) {
  const lvl = Math.round(glow * 6) / 6, k = r.scale, key = `${digit}|${pitch}|${lvl}|${k}`, m = pitch * 2;
  let cv = bulbCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = Math.ceil((6 * pitch + m * 2) * k); cv.height = Math.ceil((8 * pitch + m * 2) * k);
    const k2 = cv.getContext('2d')!; k2.scale(k, k);
    paintBulbs(k2, digit, m, m, pitch, lvl);
    bulbCache.set(key, cv);
  }
  r.ctx.drawImage(cv, x0 - m, y0 - m, cv.width / k, cv.height / k);
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

/** Frases del ganador en la pantalla de CONTINUE (mayúsculas sin tilde: la fuente pixel no las tiene). */
export const WIN_QUOTES: Record<FighterId, string[]> = {
  chapa: [
    'EN LA CANDELARIA SE APRENDE A PELEAR ANTES QUE A ANDAR, PICHA.',
    'ESE GOLPE TE LO DEBIA DESDE EL CARNAVAL PASADO.',
    'VUELVE CUANDO TENGAS MAS FUERZA QUE ARTE... O AL REVES.',
  ],
  ares: [
    'HE DADO LA VUELTA AL MUNDO Y COMO EL LEVANTE DE CAI NO HAY NADA.',
    'TE HE VISTO VENIR DESDE LA PLAYA DE SANTA MARIA.',
    'TRANQUILO, EL LEVANTE TAMBIEN SE LLEVA LAS SOMBRILLAS.',
  ],
  alba: [
    'LA MAREA SUBE Y TU TE HUNDES. ASI ES LA CALETA.',
    'APRENDE A NADAR ANTES DE VOLVER A MI ORILLA.',
    'HE VISTO OLAS MAS PELIGROSAS QUE TU UN DIA DE PONIENTE.',
  ],
  martin: [
    'TENGO MAS AÑOS EN EL FALLA QUE TU EN EL MUNDO, CHIQUILLO.',
    'QUITATE EL SOMBRERO ANTE LA EXPERIENCIA.',
    'EL CONCURSO SE GANA CON TABLAS, NO CON PRISAS.',
  ],
  heredero: [
    'EL LEVANTE SE HEREDA, QUILLO. Y TU NI LO HUELES.',
    'TE HE CANTADO LAS CUARENTA CON COPLA AFILA.',
    'NO SABIAS QUIEN ERA, ¿VERDAD? AHORA YA NO SE TE OLVIDA.',
  ],
  bizcocho: [
    'EN MI BARCO SE PELEA A COMPAS. TU HAS IDO A CONTRATIEMPO.',
    'ESTE QUEJIO NO TE LO QUITA NI EL LEVANTE, PICHA.',
    'ARTE NO SE COMPRA, QUILLO. Y TU NO TRAIAS NI SUELTO.',
  ],
  canijo: [
    'VENGO DE UN PANTANO QUE NO SALE EN TU MAPA, QUILLO.',
    '¿TANTO NADAR HASTA CAI PARA ESTO? ME ESPERABA MAS.',
    'CANIJO ME LLAMAN. Y TU AHORA, ¿COMO TE LLAMAS? ¿SUELO?',
  ],
  selu: [
    'SOMOS DOS Y TU NI UNO ENTERO, QUILLO.',
    'YA TE HEMOS SACADO UN CUPLE: SE LLAMA "EL QUE CAYO".',
    'EN LA PLAZA DE LAS FLORES SE CANTA... Y SE PEGA.',
  ],
};
export const randomQuote = (id: FighterId) => WIN_QUOTES[id][Math.floor(Math.random() * WIN_QUOTES[id].length)];

function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of s.split(' ')) {
    if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  return out;
}

/** Imagen encajada (cover) en un recuadro con marco, al estilo de las caras de la pantalla de CONTINUE. */
function framedImage(r: Renderer, img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, grey: number) {
  const c = r.ctx;
  c.fillStyle = '#ffd800'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
  c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, w + 2, h + 2);
  if (!img) return; // aún descargando
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  c.save();
  c.imageSmoothingEnabled = true;
  if (grey > 0) c.filter = `grayscale(${grey}) brightness(${1 - grey * 0.45})`;
  c.drawImage(img, (img.width - sw) / 2, Math.min(img.height - sh, img.height * 0.03), sw, sh, x, y, w, h);
  c.restore();
}

/**
 * CONTINUE? al estilo de las recreativas: el ganador a la izquierda, el derrotado (machacado) a la derecha y la
 * frase del ganador escribiéndose abajo. t = frames desde que empezó la cuenta; overT >= 0 cuando ya es GAME OVER.
 */
export function drawContinue(r: Renderer, winnerId: FighterId, loserId: FighterId, quote: string, t: number, overT: number, touch: boolean) {
  r.time++;
  r.begin();
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(-10, -10, VW + 20, VH + 20);
  const count = Math.max(0, CONTINUE_FROM - Math.floor(t / CONTINUE_SECOND));
  const inSec = (t % CONTINUE_SECOND) / CONTINUE_SECOND;
  const grey = overT >= 0 ? Math.min(1, overT / 40) : 0;

  // caras: entran deslizándose desde los lados
  const slide = Math.max(0, 1 - Math.min(t, overT >= 0 ? 99 : t) / 14) ** 2;
  const bw = 232, bh = 172, by = 66;
  framedImage(r, r.assets.portrait[winnerId], 56 - slide * 320, by, bw, bh, grey * 0.6);
  framedImage(r, r.assets.defeated[loserId], VW - 56 - bw + slide * 320, by, bw, bh, grey);
  if (slide === 0) {
    r.text(FIGHTERS[winnerId].name, 56 + bw / 2, by + bh + 14, 9, '#ffd800');
    r.text(FIGHTERS[loserId].name, VW - 56 - bw / 2, by + bh + 14, 9, '#8a8fa8');
  }

  // frase del ganador, letra a letra
  const shown = Math.max(0, Math.floor((t - 16) / 2));
  let left = shown;
  wrap(quote, 44).forEach((ln, i) => {
    if (left <= 0) return;
    gradText(r, ln.slice(0, left), 70, 276 + i * 18, 11, '#e8ecff', '#5a78ff');
    left -= ln.length + 1;
  });

  if (overT < 0) {
    gradText(r, 'CONTINUE?', 330, 40, 18, '#ffd060', '#ff6a00');
    drawBulbs(r, String(count), 508, 22, 5, 1 - inSec * 0.45);
    const blink = Math.floor(r.time / 20) % 2 === 0;
    if (touch) for (const b of continueButtons()) drawButton(r, b, 9);
    else if (blink) r.text('ENTER = SEGUIR   ESC = ABANDONAR', VW / 2, 336, 7, '#ffd800');
  } else {
    c.fillStyle = `rgba(0,0,0,${Math.min(0.55, overT / 60)})`; c.fillRect(0, 0, VW, VH);
    c.globalAlpha = Math.min(1, overT / 30);
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
