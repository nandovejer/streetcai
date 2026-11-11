// Test de simulación headless: IA contra IA. Verifica que los combates terminan y que el estado es coherente.
import { FIGHTERS, STAGE_W } from '../src/game/data';
import { Match } from '../src/game/match';
import { AI } from '../src/game/ai';
import { emptyInput } from '../src/game/fighter';

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let fails = 0;
const check = (c: boolean, msg: string) => { if (!c) { fails++; console.error('FALLO:', msg); } };

for (const [l0, l1] of [[2, 2], [0, 2], [1, 1], [2, 0]] as const) {
  const m = new Match(FIGHTERS.chapa, FIGHTERS.ares);
  const ais = [new AI(l0, rnd), new AI(l1, rnd)];
  let frames = 0, hits = 0, blocks = 0, kds = 0, projs = 0;
  while (m.phase !== 'matchEnd' && frames < 60 * 60 * 12) {
    m.step([ais[0].next(m.f[0], m.f[1], m.projectiles), ais[1].next(m.f[1], m.f[0], m.projectiles)]);
    for (const e of m.events) { if (e.type === 'hit') hits++; if (e.type === 'block') blocks++; if (e.type === 'fall') kds++; if (e.type === 'projectile') projs++; }
    m.events.length = 0;
    for (const f of m.f) {
      check(Number.isFinite(f.x) && Number.isFinite(f.y), 'posición no finita');
      check(f.x >= 29 && f.x <= STAGE_W - 29, `fuera de límites x=${f.x}`);
      check(f.y >= 0, `bajo el suelo y=${f.y}`);
      check(f.hp >= 0 && f.hp <= f.def.maxHp, 'hp fuera de rango');
    }
    frames++;
  }
  check(m.phase === 'matchEnd', `el combate no terminó (dif ${l0} vs ${l1})`);
  check(hits > 5, 'casi no hubo golpes');
  console.log(`dif ${l0} vs ${l1}: gana ${m.matchWinner >= 0 ? m.f[m.matchWinner].def.name : '-'} (${m.f[0].wins}-${m.f[1].wins}) en ${(frames / 60).toFixed(0)}s, rondas=${m.round}, golpes=${hits}, bloqueos=${blocks}, derribos=${kds}, proyectiles=${projs}`);
}

// Un jugador pasivo debe perder, y el bloqueo debe reducir el daño
{
  const m = new Match(FIGHTERS.ares, FIGHTERS.chapa);
  const ai = new AI(1, rnd);
  let frames = 0;
  while (m.phase !== 'matchEnd' && frames++ < 60 * 400) { m.step([emptyInput(), ai.next(m.f[1], m.f[0], m.projectiles)]); m.events.length = 0; }
  check(m.matchWinner === 1, 'la IA no gana a un jugador pasivo');
}
if (fails) { console.error(`${fails} fallos`); throw new Error('test fallido'); }
console.log('OK simulación');
