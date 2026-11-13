// Créditos de recreativa: se añaden con la tecla 5 (o el botón de moneda en móvil) y se gastan al
// empezar una partida (1 en 1P, 2 en 2 jugadores) o al continuar. No se guardan entre recargas.
import { VH, VW } from '../game/data';
import { Renderer } from '../render/renderer';

export const MAX_CREDITS = 9;
/** Se empieza con 1 crédito de regalo al cargar. */
let credits = 1;
/** Frames de destello al añadir un crédito o al intentar jugar sin créditos. */
let addedT = 0, deniedT = 0;

export const getCredits = () => credits;
export function addCredit(): boolean {
  if (credits >= MAX_CREDITS) return false;
  credits++; addedT = 40;
  return true;
}
/** Gasta n créditos si los hay. Si no, marca el aviso de "faltan créditos" y devuelve false. */
export function useCredits(n = 1): boolean {
  if (credits < n) { deniedT = 50; return false; }
  credits -= n;
  return true;
}
export const creditDenied = () => deniedT > 0;

/** "CREDIT N" en la esquina inferior derecha, con destello al cambiar. */
export function drawCredits(r: Renderer, x = VW - 8, y = VH - 9) {
  if (addedT > 0) addedT--;
  if (deniedT > 0) deniedT--;
  const flash = (addedT > 0 && Math.floor(addedT / 4) % 2 === 0) || (deniedT > 0 && Math.floor(deniedT / 5) % 2 === 0);
  r.text(`CREDIT ${credits}`, x, y, 8, flash ? (deniedT > 0 ? '#ff3b1f' : '#ffd800') : '#fff', 'right');
}
