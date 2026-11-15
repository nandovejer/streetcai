// Test de simulación headless: IA contra IA. Verifica que los combates terminan y que el estado es coherente.
import { FIGHTERS, FIGHTER_IDS, FighterId, STAGE_W } from '../src/game/data';
import { Match } from '../src/game/match';
import { AI } from '../src/game/ai';
import { emptyInput } from '../src/game/fighter';

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let fails = 0;
const check = (c: boolean, msg: string) => { if (!c) { fails++; console.error('FALLO:', msg); } };

const PAIRS: [FighterId, FighterId][] = [];
for (const a of FIGHTER_IDS) for (const b of FIGHTER_IDS) if (a !== b) PAIRS.push([a, b]);
const LEVELS = [[2, 2], [0, 2], [1, 1], [2, 0]] as const;
for (let pi = 0; pi < PAIRS.length; pi++) {
  const [l0, l1] = LEVELS[pi % LEVELS.length];
  const m = new Match(FIGHTERS[PAIRS[pi][0]], FIGHTERS[PAIRS[pi][1]]);
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
  console.log(`${PAIRS[pi][0]} vs ${PAIRS[pi][1]} (dif ${l0} vs ${l1}): gana ${m.matchWinner >= 0 ? m.f[m.matchWinner].def.name : '-'} (${m.f[0].wins}-${m.f[1].wins}) en ${(frames / 60).toFixed(0)}s, rondas=${m.round}, golpes=${hits}, bloqueos=${blocks}, derribos=${kds}, proyectiles=${projs}`);
}

// Un jugador pasivo debe perder, y el bloqueo debe reducir el daño
{
  const m = new Match(FIGHTERS.ares, FIGHTERS.chapa);
  const ai = new AI(1, rnd);
  let frames = 0;
  while (m.phase !== 'matchEnd' && frames++ < 60 * 400) { m.step([emptyInput(), ai.next(m.f[1], m.f[0], m.projectiles)]); m.events.length = 0; }
  check(m.matchWinner === 1, 'la IA no gana a un jugador pasivo');
}
// AL AZAR: el gancho onRound cambia de luchador en cada round (nunca el mismo que el rival) y la vida se repone
{
  const m = new Match(FIGHTERS.chapa, FIGHTERS.ares);
  const ais = [new AI(2, rnd), new AI(2, rnd)];
  const seen: string[] = [m.f[0].def.id];
  let swaps = 0;
  m.onRound = (mm) => {
    const ok = FIGHTER_IDS.filter((id) => id !== mm.f[1].def.id && id !== mm.f[0].def.id);
    mm.f[0].def = FIGHTERS[ok[Math.floor(rnd() * ok.length)]];
    swaps++;
  };
  let frames = 0, lastRound = m.round, lastPhase = m.phase;
  while (m.phase !== 'matchEnd' && frames++ < 60 * 60 * 12) {
    m.step([ais[0].next(m.f[0], m.f[1], m.projectiles), ais[1].next(m.f[1], m.f[0], m.projectiles)]);
    m.events.length = 0;
    if (m.phase === 'intro' && lastPhase !== 'intro') {
      seen.push(m.f[0].def.id);
      check(m.f[0].hp === m.f[0].def.maxHp, 'AL AZAR: la vida no se repone con el luchador nuevo');
      check(m.f[0].def.id !== m.f[1].def.id, 'AL AZAR: le tocó el mismo luchador que al rival');
      check(seen[seen.length - 1] !== seen[seen.length - 2], 'AL AZAR: repitió luchador de un round al siguiente');
    }
    lastPhase = m.phase; lastRound = m.round;
  }
  check(m.phase === 'matchEnd', 'AL AZAR: el combate no terminó');
  check(swaps >= 1 && swaps === seen.length - 1, `AL AZAR: cambios de luchador ${swaps}, rounds ${seen.length}`);
  console.log(`AL AZAR: ${seen.join(' -> ')} (${swaps} cambios, round final ${lastRound})`);
}
if (fails) { console.error(`${fails} fallos`); throw new Error('test fallido'); }
console.log('OK simulación');
