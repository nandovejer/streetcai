// Pantallas de menú dibujadas en el canvas: título, selección y resultado.
import { DIFFICULTY_NAMES, Difficulty, FIGHTERS, FIGHTER_IDS, FighterId, HOME_STAGE, STAGES, StageId, VH, VW } from '../game/data';
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
export interface TitleHooks { play: (sfx: 'punch' | 'heavy' | 'ko' | 'whoosh' | 'special' | 'start' | 'land' | 'coin') => void; say: (text: string) => void; music: () => void }
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

// ---- Botón INSERT COIN de la portada ----
/** Frames desde que se echó la moneda (-1 = esperando). */
let coinT = -1;
const COIN_IN = 14, COIN_DONE = 46;
/** Echar la moneda (devuelve false si ya estaba echada). */
export function insertTitleCoin() { if (coinT >= 0) return false; coinT = 0; return true; }
export function titleCoinDone() { return coinT >= COIN_DONE; }
export function resetTitleCoin() { coinT = -1; }

function drawCoinButton(r: Renderer, t: number, alpha: number, touch: boolean, hooks?: TitleHooks) {
  const c = r.ctx;
  if (coinT >= 0) { coinT++; if (coinT === COIN_IN) hooks?.play('coin'); }
  const pw = 46, ph = 58, px = Math.round(VW / 2 - pw / 2 + 6), py = 238;
  const RED = '#ff1a10', lit = coinT >= COIN_IN && Math.floor(coinT / 4) % 2 === 0;
  c.save(); c.globalAlpha = alpha;
  // todo el botón un 35 % más grande, centrado
  const ccx = VW / 2, ccy = py + ph / 2;
  c.translate(ccx, ccy); c.scale(1.35, 1.35); c.translate(-ccx, -ccy);
  // sombra y marco rojo
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(px - 9, py + 3, pw + 12, ph + 2);
  c.fillStyle = RED; c.fillRect(px - 10, py, pw + 10, ph);
  // ranura vertical a la izquierda
  c.fillStyle = '#000'; c.fillRect(px - 6, py + 4, 5, ph - 8);
  // panel negro
  c.fillStyle = lit ? '#3a0400' : '#000'; c.fillRect(px + 2, py + 3, pw - 5, ph - 6);
  c.fillStyle = RED;
  c.fillRect(px + 6, py + 8, pw - 13, 2); c.fillRect(px + 6, py + 12, pw - 13, 2);
  c.fillRect(px + 6, py + 36, pw - 13, 2); c.fillRect(px + 6, py + 40, pw - 13, 2);
  r.text('25¢', px + 2 + (pw - 5) / 2, py + 25, 9, lit ? '#ffd0a0' : RED, 'center', null);
  r.text('PUSH TO', px + 2 + (pw - 5) / 2, py + 47, 4, RED, 'center', null);
  r.text('START', px + 2 + (pw - 5) / 2, py + 52, 4, RED, 'center', null);
  // moneda: asoma por la izquierda y, al echarla, se mete en la ranura
  const k = coinT < 0 ? 0 : Math.min(1, coinT / COIN_IN);
  const cx = px - 12 + (coinT < 0 ? Math.round(Math.sin(t * 0.12)) : k * k * 10), cy = py + ph / 2;
  if (k < 1) {
    c.save();
    c.beginPath(); c.rect(px - 40, py - 10, 36, ph + 20); c.clip(); // desaparece tras la ranura
    const w = 14, h = 24, x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    c.fillStyle = '#000'; c.fillRect(x - 1, y + 2, w + 2, h - 4); c.fillRect(x + 1, y, w - 2, h);
    c.fillStyle = '#e8a000'; c.fillRect(x, y + 3, w, h - 6); c.fillRect(x + 2, y + 1, w - 4, h - 2);
    c.fillStyle = '#ffd400'; c.fillRect(x + 1, y + 3, w - 4, h - 6); c.fillRect(x + 3, y + 1, w - 7, h - 3);
    c.fillStyle = '#fff6a0'; c.fillRect(x + 2, y + 4, 2, h - 9);
    c.fillStyle = '#b07000'; c.fillRect(x + 7, y + 5, 2, h - 10); c.fillRect(x + 9, y + 4, 1, h - 8);
    c.restore();
  }
  c.restore();
  // texto
  if (coinT < 0) {
    if (Math.floor(t / 30) % 2 === 0) { c.globalAlpha = alpha; r.text('INSERT COIN', VW / 2, 330, 12, '#fff', 'center', '#000'); c.globalAlpha = 1; }
    if (alpha >= 1) r.text(touch ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER', VW / 2, 347, 6, '#ffd800');
  } else if (coinT >= COIN_IN) {
    r.text('CREDIT 1', VW / 2, 330, 12, Math.floor(coinT / 4) % 2 ? '#ffd800' : '#fff', 'center', '#000');
  }
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
    hooks?.play('heavy'); hooks?.play('ko'); hooks?.say('¡Street Cai!');
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

  // botón INSERT COIN
  if (f >= INTRO.press) {
    if (crossed(INTRO.press)) { hooks?.play('start'); hooks?.music(); }
    drawCoinButton(r, t, Math.min(1, (f - INTRO.press) / 15), touch, hooks);
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
};
const CARD = 56, CARD_GAP = 6, CARD_Y = 270;
const cardX = (i: number) => (VW - (FIGHTER_IDS.length * CARD + (FIGHTER_IDS.length - 1) * CARD_GAP)) / 2 + i * (CARD + CARD_GAP);
const OPT_X = 6, OPT_W = 108;
/** Posición animada de los cursores sobre el mapa (se deslizan de un barrio a otro). */
const mapCursor: [number, number][] = [[0, 0], [0, 0]];
let mapCursorInit = false;

export function selectButtons(s: Settings): Button[] {
  const b: Button[] = [];
  FIGHTER_IDS.forEach((id, i) => {
    b.push({ x: cardX(i), y: CARD_Y, w: CARD, h: CARD, label: '', action: 'char:' + id, kind: 'card', on: s.char === id || (s.twoPlayers && s.char2 === id) });
    const [hx, hy] = mapPt(HOMES[id].x, HOMES[id].y);
    b.push({ x: hx - 12, y: hy - 12, w: 24, h: 24, label: '', action: 'char:' + id, kind: 'home' });
  });
  let y = 14;
  const opt = (label: string, action: string, on: boolean) => { b.push({ x: OPT_X, y, w: OPT_W, h: 13, label, action, on, kind: 'opt' }); y += 15; };
  opt('1P ARCADE', 'mode:cpu', !s.twoPlayers);
  opt('2 JUGADORES', 'mode:2p', s.twoPlayers);
  y += 13;
  DIFFICULTY_NAMES.forEach((n, i) => opt(n, 'diff:' + i, s.difficulty === i && !s.twoPlayers));
  y += 13;
  STAGE_CHOICES.forEach((st) => opt(st === 'random' ? 'AL AZAR' : 'BARRIO RIVAL', 'stage:' + st, s.stage === st));
  b.push({ x: VW / 2 - 70, y: 336, w: 140, h: 20, label: '¡A LUCHAR!', action: 'fight', kind: 'btn' });
  return b;
}

function drawButton(r: Renderer, b: Button, size = 8) {
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  c.fillStyle = b.on ? '#ffd800' : '#8a8aa0'; c.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
  c.fillStyle = b.on ? '#7a1c00' : '#1b1b2e'; c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  if (b.label) r.text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, size, b.on ? '#ffe86b' : '#d8d8e8');
}

function drawStats(r: Renderer, id: FighterId, sx: number, y0: number, head: string, headColor: string) {
  const c = r.ctx, d = FIGHTERS[id];
  r.text(head, sx, y0, 7, headColor, 'left');
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
  const h = 132, w = (img.width * h) / img.height;
  c.save(); c.imageSmoothingEnabled = true;
  if (side === 0) c.drawImage(img, -4, VH - h, w, h);
  else { c.translate(VW + 4, VH - h); c.scale(-1, 1); c.drawImage(img, 0, 0, w, h); }
  c.restore();
  const tx = side === 0 ? 8 : VW - 8, al = side === 0 ? 'left' : 'right';
  r.text(label, tx, VH - h - 34, 9, col, al);
  gradText(r, FIGHTERS[id].name, tx, VH - h - 18, 15, '#ffd060', '#ff5a00', al);
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
  c.drawImage(r.assets.map, MAP_X, MAP_Y, MAP_W, MAP_H);
  c.restore();
  const blink = Math.floor(t / 10) % 2 === 0;
  const players: [FighterId, string, string][] = [[s.char, s.twoPlayers ? '1P' : 'TU', COL_J1]];
  if (s.twoPlayers) players.push([s.char2, '2P', COL_J2]);

  // barrios: punto en cada uno y cursores deslizándose por el mapa
  for (const id of FIGHTER_IDS) {
    const [hx, hy] = mapPt(HOMES[id].x, HOMES[id].y);
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
  r.text('MODO', OPT_X, 7, 6, '#9ab0ff', 'left');
  r.text('DIFICULTAD', OPT_X, 51, 6, '#9ab0ff', 'left');
  r.text('ESCENARIO', OPT_X, 109, 6, '#9ab0ff', 'left');
  const bs = selectButtons(s);
  for (const b of bs) if (b.kind === 'opt') drawButton(r, b, 6);
  // escenario del próximo combate cuando es el barrio del rival
  if (s.stage === 'home') {
    const rival = s.twoPlayers ? s.char2 : null;
    r.text(rival ? STAGES[HOME_STAGE[rival]].name : 'EL DE CADA RIVAL', OPT_X, 158, 5, '#ffd800', 'left');
  }
  if (!touch) r.text('A/D ELEGIR - E ESCENARIO', OPT_X, 170, 5, '#9ab0ff', 'left');

  // columna derecha: estadísticas del J1
  const rx = VW - 106;
  drawStats(r, s.char, rx, 48, s.twoPlayers ? '1P' : 'TU', COL_J1);

  // retratos grandes y rivales
  drawBigPortrait(r, s.char, 0, s.twoPlayers ? '1P' : 'TU', COL_J1);
  if (s.twoPlayers) drawBigPortrait(r, s.char2, 1, '2P', COL_J2);
  else {
    r.text('RIVALES', VW - 8, 236, 7, COL_J2, 'right');
    FIGHTER_IDS.filter((id) => id !== s.char).forEach((id, k) => {
      const yy = 248 + k * 26;
      c.fillStyle = '#000'; c.fillRect(VW - 33, yy - 1, 26, 26);
      r.drawPortrait(id, VW - 32, yy, 24);
      r.text(FIGHTERS[id].name, VW - 38, yy + 12, 6, '#d8d8e8', 'right');
    });
  }

  // fila de caras
  const head = s.twoPlayers && touch ? `TOCA UN RETRATO PARA ELEGIR ${s.pickTurn ? '2P' : '1P'}` : 'ELIGE TU LUCHADOR';
  r.text(head, VW / 2, 261, 6, s.twoPlayers && touch ? (s.pickTurn ? COL_J2 : COL_J1) : '#fff');
  for (const b of bs) {
    if (b.kind !== 'card') continue;
    const id = b.action.slice(5) as FighterId;
    const p1 = s.char === id, p2 = s.twoPlayers && s.char2 === id;
    c.fillStyle = '#000'; c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    r.drawPortrait(id, b.x, b.y, b.w);
    if (!p1 && !p2) { c.fillStyle = 'rgba(0,0,30,0.45)'; c.fillRect(b.x, b.y, b.w, b.h); }
    if (p1) { drawCorners(r, b.x - 3, b.y - 3, b.w + 6, b.h + 6, blink ? '#fff' : COL_J1, 9); r.text(s.twoPlayers ? '1P' : 'TU', b.x + 9, b.y + 7, 6, COL_J1); }
    if (p2) { drawCorners(r, b.x - 1, b.y - 1, b.w + 2, b.h + 2, blink ? '#fff' : COL_J2, 7); r.text('2P', b.x + b.w - 9, b.y + 7, 6, COL_J2); }
  }
  for (const b of bs) if (b.kind === 'btn') drawButton(r, b, 9);
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
  if (t > 12 && help.length) help.forEach((h, i) => r.text(h, VW / 2, 296 + i * 11, 5, i ? '#fff' : '#ffd800'));
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
