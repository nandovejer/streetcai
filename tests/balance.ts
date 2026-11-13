// Estadística de equilibrio (todos contra todos): npx tsx tests/balance.ts [partidas por cruce]
import { FIGHTER_IDS, FIGHTERS, FighterId } from '../src/game/data';
import { Match } from '../src/game/match';
import { AI } from '../src/game/ai';

const argv = (globalThis as unknown as { process?: { argv: string[] } }).process?.argv ?? [];
const N = Number(argv[2] || 30);
for (const lvl of [1, 2] as const) {
  const wins: Record<string, number> = {}, games: Record<string, number> = {};
  const cross: string[] = [];
  for (let i = 0; i < FIGHTER_IDS.length; i++) for (let j = i + 1; j < FIGHTER_IDS.length; j++) {
    const a: FighterId = FIGHTER_IDS[i], b: FighterId = FIGHTER_IDS[j];
    let aw = 0;
    for (let g = 0; g < N; g++) {
      const swap = g % 2 === 1;
      const m = new Match(FIGHTERS[swap ? b : a], FIGHTERS[swap ? a : b]);
      const ai = [new AI(lvl), new AI(lvl)];
      let f = 0;
      while (m.phase !== 'matchEnd' && f++ < 60 * 600) { m.step([ai[0].next(m.f[0], m.f[1], m.projectiles), ai[1].next(m.f[1], m.f[0], m.projectiles)]); m.events.length = 0; }
      if (m.matchWinner >= 0 && m.f[m.matchWinner].def.id === a) aw++;
    }
    wins[a] = (wins[a] || 0) + aw; wins[b] = (wins[b] || 0) + N - aw;
    games[a] = (games[a] || 0) + N; games[b] = (games[b] || 0) + N;
    cross.push(`${a}-${b} ${aw}/${N}`);
  }
  const tot = FIGHTER_IDS.map((id) => `${id} ${Math.round((100 * wins[id]) / games[id])}%`).join('  ');
  console.log(`nivel ${lvl}: ${tot}\n   ${cross.join('  ')}`);
}
