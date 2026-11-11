// Estadística de equilibrio: npx tsx tests/balance.ts
import { FIGHTERS } from '../src/game/data';
import { Match } from '../src/game/match';
import { AI } from '../src/game/ai';

for (const lvl of [1, 2] as const) {
  let chapa = 0, supers = 0, secs = 0; const N = 60;
  for (let i = 0; i < N; i++) {
    const swap = i % 2 === 1;
    const m = new Match(swap ? FIGHTERS.ares : FIGHTERS.chapa, swap ? FIGHTERS.chapa : FIGHTERS.ares);
    const a = [new AI(lvl), new AI(lvl)];
    let f = 0;
    while (m.phase !== 'matchEnd' && f++ < 60 * 600) {
      m.step([a[0].next(m.f[0], m.f[1], m.projectiles), a[1].next(m.f[1], m.f[0], m.projectiles)]);
      for (const e of m.events) if (e.type === 'super') supers++;
      m.events.length = 0;
    }
    if (m.matchWinner >= 0 && m.f[m.matchWinner].def.id === 'chapa') chapa++;
    secs += f / 60;
  }
  console.log(`nivel ${lvl}: Chapa gana ${chapa}/${N}, súpers/combate ${(supers / N).toFixed(1)}, duración media ${(secs / N).toFixed(0)}s`);
}
