// Créditos y agradecimientos al estilo de las recreativas: rodillo de texto sobre negro y desfile de
// luchadores abajo. Se abren con el botón junto a pantalla completa y pasan solos al ganar el arcade.
import { FIGHTERS, FIGHTER_IDS, GROUND_Y, STAGES, STAGE_IDS, VH, VW } from '../game/data';
import { Renderer } from '../render/renderer';

type Line = { kind: 'logo' | 'head' | 'name' | 'small' | 'gap' | 'cast'; text?: string; sub?: string; id?: string };

/** Créditos editables. */
const LINES: Line[] = [
  { kind: 'logo' },
  { kind: 'small', text: '© 2026 · HECHO EN CADIZ' },
  { kind: 'gap' },
  { kind: 'head', text: 'IDEA Y DIRECCION' }, { kind: 'name', text: 'NANDOVEJER' },
  { kind: 'gap' },
  { kind: 'head', text: 'PROGRAMACION' }, { kind: 'name', text: 'CLAUDE (ANTHROPIC)' },
  { kind: 'small', text: 'CON LA DIRECCION DE NANDOVEJER' },
  { kind: 'gap' },
  { kind: 'head', text: 'REPARTO' },
  ...FIGHTER_IDS.map((id): Line => ({ kind: 'cast', id, text: FIGHTERS[id].name, sub: FIGHTERS[id].title })),
  { kind: 'gap' },
  { kind: 'head', text: 'ESCENARIOS' },
  ...STAGE_IDS.map((id): Line => ({ kind: 'name', text: STAGES[id].name })),
  { kind: 'name', text: 'PUERTA DE TIERRA' },
  { kind: 'small', text: 'Y EL MAPA DE CADIZ' },
  { kind: 'gap' },
  { kind: 'head', text: 'ARTE PIXEL' }, { kind: 'name', text: 'EQUIPO DE STREET CAI' },
  { kind: 'small', text: 'ILUSTRACIONES CREADAS CON IA A PARTIR' }, { kind: 'small', text: 'DE FOTOS Y REFERENCIAS DE CADIZ' },
  { kind: 'gap' },
  { kind: 'head', text: 'VOZ DEL LOCUTOR' }, { kind: 'name', text: 'PIPER TTS' },
  { kind: 'small', text: 'OPEN HOME FOUNDATION · CODIGO ABIERTO' },
  { kind: 'small', text: 'VOZ ES_ES SHARVARD · CORPUS SHARVARD' },
  { kind: 'small', text: 'AUBANEL, GARCIA LECUMBERRI, COOKE,' }, { kind: 'small', text: 'CUTUGNO, BORSKY Y WOLTERS · CC BY 3.0' },
  { kind: 'small', text: 'ACENTO GADITANO "A MANO"' },
  { kind: 'gap' },
  { kind: 'head', text: 'MUSICA Y EFECTOS' }, { kind: 'name', text: 'SINTETIZADOS EN VIVO' },
  { kind: 'small', text: 'WEB AUDIO · CADENCIA ANDALUZA' },
  { kind: 'gap' },
  { kind: 'head', text: 'TIPOGRAFIA' }, { kind: 'name', text: 'PRESS START 2P' }, { kind: 'small', text: 'CODEMAN38 · SIL OPEN FONT LICENSE 1.1' },
  { kind: 'gap' },
  { kind: 'head', text: 'HERRAMIENTAS' },
  { kind: 'small', text: 'TYPESCRIPT · VITE · PYTHON · PILLOW' }, { kind: 'small', text: 'NUMPY · SCIPY · OPENCV · FFMPEG' },
  { kind: 'gap' },
  { kind: 'head', text: 'AGRADECIMIENTOS' },
  { kind: 'name', text: 'A LA GENTE DE CADIZ' },
  { kind: 'name', text: 'A LOS BARES CON MAQUINITAS' },
  { kind: 'name', text: 'A ' + FIGHTER_IDS.map((id) => FIGHTERS[id].name).join(', ').replace(/, ([^,]*)$/, ' Y $1') },
  { kind: 'small', text: 'POR PRESTAR SU CARA' },
  { kind: 'name', text: 'A LOS CLASICOS DE LOS 90' },
  { kind: 'small', text: 'QUE NOS QUITARON LAS MONEDAS' },
  { kind: 'gap' }, { kind: 'gap' },
  { kind: 'head', text: 'GRACIAS POR JUGAR' },
  { kind: 'small', text: 'CADIZ · 2026' },
];
const H: Record<Line['kind'], number> = { logo: 70, head: 22, name: 15, small: 11, gap: 20, cast: 30 };
const SPEED = 0.55;
/** El rodillo empieza con el logo ya a la vista y se para con "GRACIAS POR JUGAR" en el centro. */
const ROLL_H = VH - 64, Y0 = 40;
const lastHead = LINES.findIndex((l) => l.text === 'GRACIAS POR JUGAR');
const STOP_AT = LINES.slice(0, lastHead).reduce((a, l) => a + H[l.kind], 0) + H.head / 2;
const T_STOP = (Y0 + STOP_AT - ROLL_H / 2) / SPEED;
/** Frames que dura: rodillo + unos segundos quieto al final. */
export const STAFF_FRAMES = Math.ceil(T_STOP) + 60 * 5;

function grad(r: Renderer, s: string, y: number, size: number, top: string, bottom: string) {
  const c = r.ctx;
  c.font = `${size}px "Press Start 2P", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = size / 3.5; c.strokeStyle = '#000'; c.strokeText(s, VW / 2, y + 1);
  const g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  c.fillStyle = g; c.fillText(s, VW / 2, y);
}

export function drawStaffRoll(r: Renderer, t: number, touch: boolean) {
  r.time++;
  r.begin();
  const c = r.ctx;
  c.fillStyle = '#000'; c.fillRect(-10, -10, VW + 20, VH + 20);
  // estrellas de fondo (siguen moviéndose aunque el rodillo se pare)
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % VW, y = (i * 53 + t * (0.2 + (i % 3) * 0.15)) % (VH - 60);
    c.fillStyle = i % 5 ? '#3a3a5a' : '#8a8ac0'; c.fillRect(x, VH - 60 - y, 1, 1);
  }
  // rodillo (zona superior; abajo va el desfile)
  c.save(); c.beginPath(); c.rect(0, 0, VW, ROLL_H); c.clip();
  let y = Y0 - Math.min(t, T_STOP) * SPEED;
  for (const l of LINES) {
    const h = H[l.kind], cy = y + h / 2;
    if (cy > -40 && cy < VH) {
      if (l.kind === 'logo') { r.bigText('STREET', VW / 2, cy - 16, 26); r.bigText('CAI', VW / 2, cy + 16, 32); }
      else if (l.kind === 'head') grad(r, l.text!, cy, 10, '#ffd060', '#ff5a00');
      else if (l.kind === 'name') r.text(l.text!, VW / 2, cy, 8, '#fff');
      else if (l.kind === 'small') r.text(l.text!, VW / 2, cy, 6, '#9ab0ff');
      else if (l.kind === 'cast') {
        c.fillStyle = '#ffd800'; c.fillRect(VW / 2 - 92, cy - 13, 26, 26);
        r.drawPortrait(l.id!, VW / 2 - 91, cy - 12, 24);
        r.text(l.text!, VW / 2 - 56, cy - 5, 9, '#fff', 'left');
        r.text(l.sub!, VW / 2 - 56, cy + 8, 6, '#9ab0ff', 'left');
      }
    }
    y += h;
  }
  c.restore();
  // fundidos arriba y abajo del rodillo
  const top = c.createLinearGradient(0, 0, 0, 30); top.addColorStop(0, '#000'); top.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = top; c.fillRect(0, 0, VW, 30);
  const bot = c.createLinearGradient(0, VH - 94, 0, VH - 64); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, '#000');
  c.fillStyle = bot; c.fillRect(0, VH - 94, VW, 30);
  // desfile de luchadores caminando
  c.fillStyle = '#14142a'; c.fillRect(0, VH - 64, VW, 64);
  c.fillStyle = '#2a2a4a'; c.fillRect(0, VH - 64, VW, 2);
  const n = FIGHTER_IDS.length, gap = (VW + 160) / n;
  FIGHTER_IDS.forEach((id, i) => {
    const x = ((t * 0.7 + i * gap) % (VW + 160)) - 80;
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.ellipse(x, GROUND_Y + 23, 14, 2.5, 0, 0, Math.PI * 2); c.fill();
    r.drawSprite(id, `walk_${Math.floor(t / 6 + i) % 8}`, x, GROUND_Y + 24, 1, 0.42);
  });
  if (Math.floor(t / 40) % 2 === 0) r.text(touch ? 'TOCA PARA SALIR' : 'ENTER O ESC PARA SALIR', 8, 10, 5, '#5a5a8a', 'left');
}
