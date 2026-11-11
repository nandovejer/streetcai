// Arranque, bucle principal a paso fijo (60 Hz) y navegación entre pantallas.
import '@fontsource/press-start-2p';
import './style.css';
import { loadAssets } from './engine/assets';
import { AudioManager } from './engine/audio';
import { InputManager } from './engine/input';
import { AI } from './game/ai';
import { Difficulty, FIGHTERS, VH, VW } from './game/data';
import { Match } from './game/match';
import { Renderer } from './render/renderer';
import { Settings, drawPause, drawResult, drawSelect, drawTitle, hitButton, pauseButtons, resultButtons, selectButtons } from './ui/screens';
import { isTouchDevice, setupTouch } from './ui/touch';

type Screen = 'title' | 'select' | 'fight' | 'result';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const touchRoot = document.getElementById('touch')!;
  const loading = document.getElementById('loading')!;
  const params = new URLSearchParams(location.search);
  const touch = isTouchDevice() || params.has('touch');

  const [assets] = await Promise.all([
    loadAssets(['chapa', 'ares']),
    document.fonts.load('10px "Press Start 2P"').catch(() => undefined),
  ]);
  loading.remove();

  const r = new Renderer(canvas, assets);
  const input = new InputManager();
  const audio = new AudioManager();
  const settings: Settings = { char: 'chapa', difficulty: 1, twoPlayers: false };
  let screen: Screen = 'title';
  let match: Match | null = null;
  let ai: AI | null = null;
  let demoAi: AI | null = null;
  let paused = false;
  let endT = 0;

  if (touch) { setupTouch(touchRoot, input.touch); document.body.classList.add('touch'); }
  const setScreen = (s: Screen) => {
    screen = s;
    document.body.dataset.screen = s;
    audio.startMusic();
  };

  const startFight = () => {
    const other = settings.char === 'chapa' ? 'ares' : 'chapa';
    match = new Match(FIGHTERS[settings.char], FIGHTERS[other]);
    ai = settings.twoPlayers ? null : new AI(settings.difficulty);
    paused = false; endT = 0;
    r.resetFight();
    audio.play('start');
    setScreen('fight');
  };

  const act = (a: string | null) => {
    if (!a) return;
    audio.init();
    if (a.startsWith('char:')) { settings.char = a.slice(5) as Settings['char']; audio.play('select'); }
    else if (a.startsWith('diff:')) { settings.difficulty = Number(a.slice(5)) as Difficulty; settings.twoPlayers = false; audio.play('select'); }
    else if (a === 'mode:cpu') { settings.twoPlayers = false; audio.play('select'); }
    else if (a === 'mode:2p') { settings.twoPlayers = true; audio.play('select'); }
    else if (a === 'fight' || a === 'rematch') startFight();
    else if (a === 'menu') { paused = false; audio.play('select'); setScreen('select'); }
    else if (a === 'resume') paused = false;
    else if (a === 'pause') { if (screen === 'fight' && match && match.phase !== 'matchEnd') paused = !paused; }
    else if (a === 'title') { audio.play('start'); setScreen('select'); }
  };

  // Puntero sobre el canvas (menús)
  canvas.addEventListener('pointerdown', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * VW, y = ((e.clientY - b.top) / b.height) * VH;
    if (screen === 'title') act('title');
    else if (screen === 'select') act(hitButton(selectButtons(settings), x, y));
    else if (screen === 'result') act(hitButton(resultButtons(), x, y));
    else if (screen === 'fight' && paused) act(hitButton(pauseButtons(), x, y));
    else audio.init();
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    audio.init();
    const k = e.code;
    if (k === 'KeyM' && screen !== 'fight') { audio.toggleMute(); return; }
    if (k === 'F2') { r.debug = !r.debug; e.preventDefault(); return; }
    if (screen === 'title') { if (k === 'Enter' || k === 'Space') act('title'); }
    else if (screen === 'select') {
      if (k === 'ArrowLeft' || k === 'KeyA') act('char:chapa');
      else if (k === 'ArrowRight' || k === 'KeyD') act('char:ares');
      else if (k === 'ArrowUp' || k === 'KeyW') act('diff:' + Math.max(0, settings.difficulty - 1));
      else if (k === 'ArrowDown' || k === 'KeyS') act('diff:' + Math.min(2, settings.difficulty + 1));
      else if (k === 'Digit2') act('mode:2p');
      else if (k === 'Digit1') act('mode:cpu');
      else if (k === 'Enter' || k === 'Space') act('fight');
      else if (k === 'Escape') setScreen('title');
    } else if (screen === 'fight') {
      if (k === 'Escape' || k === 'KeyP') act('pause');
      else if (paused && k === 'Enter') act('resume');
      else if (paused && k === 'KeyQ') act('menu');
    } else if (screen === 'result') {
      if (k === 'Enter' || k === 'Space') act('rematch');
      else if (k === 'Escape') act('menu');
    }
  });

  document.getElementById('btn-pause')!.addEventListener('click', () => act('pause'));
  document.getElementById('btn-mute')!.addEventListener('click', (e) => {
    audio.init();
    (e.currentTarget as HTMLElement).classList.toggle('off', audio.toggleMute());
  });
  document.getElementById('btn-full')!.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        const so = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (so && so.lock) await so.lock('landscape').catch(() => undefined);
      }
    } catch { /* no soportado (iOS) */ }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'fight') paused = true; });

  const SFX: Record<string, Parameters<AudioManager['play']>[0]> = {
    block: 'block', jump: 'jump', land: 'land', whoosh: 'whoosh', ko: 'ko', special: 'special', fall: 'fall', guardbreak: 'guardbreak', clash: 'heavy',
  };

  const stepFight = () => {
    const m = match!;
    if (m.phase === 'matchEnd') {
      if (++endT === 1) audio.play('win');
      if (endT > 50) setScreen('result');
      return;
    }
    const p1 = demoAi ? demoAi.next(m.f[0], m.f[1], m.projectiles) : input.get(0, settings.twoPlayers);
    const p2 = ai ? ai.next(m.f[1], m.f[0], m.projectiles) : input.get(1, true);
    const wasIntro = m.phase === 'intro';
    m.step([p1, p2]);
    if (wasIntro && m.phase === 'fight') audio.play('start');
    if (m.phase === 'intro' && m.phaseT === 5) audio.say(`Ronda ${['uno', 'dos', 'tres', 'cuatro', 'cinco'][m.round - 1] || m.round}`);
    if (m.phase === 'intro' && m.phaseT === 78) audio.say('¡A pelear!');
    if (m.phase === 'ko' && m.phaseT === 82 && m.roundWinner >= 0) audio.say(m.perfect ? '¡Perfecto!' : `${m.f[m.roundWinner].def.name.toLowerCase()} gana`);
    for (const e of m.events) {
      if (e.type === 'ko') audio.say(m.message === 'K.O.' ? 'Kei ou' : 'Tiempo');
      if (e.type === 'super' && e.who !== undefined) { audio.play('guardbreak'); audio.say(m.f[e.who].def.specialName.toLowerCase()); }
      if (e.type === 'hit') audio.play(e.heavy ? 'heavy' : e.kick ? 'kick' : 'punch');
      else if (SFX[e.type]) audio.play(SFX[e.type]);
    }
    r.consume(m.events);
    m.events.length = 0;
  };

  const draw = () => {
    if (screen === 'title') drawTitle(r, touch);
    else if (screen === 'select') drawSelect(r, settings, touch);
    else if (screen === 'fight' && match) {
      const you = settings.twoPlayers ? 'J1' : 'TU', other = settings.twoPlayers ? 'J2' : 'CPU';
      r.drawFight(match, [you, other]);
      if (paused) drawPause(r);
    } else if (screen === 'result' && match) {
      const w = match.matchWinner, win = match.f[w].def.id, lose = match.f[1 - w].def.id;
      const head = settings.twoPlayers ? `GANA J${w + 1}` : w === 0 ? '¡HAS GANADO!' : 'HAS PERDIDO';
      drawResult(r, win, lose, head, `${match.f[0].wins} - ${match.f[1].wins}`);
    }
  };

  // Modo demo para pruebas automáticas: ?demo=1 lanza IA contra IA; ?ff=N avanza N frames.
  if (params.has('demo')) {
    settings.difficulty = 2; if (params.get('demo') === 'ares') settings.char = 'ares';
    startFight(); demoAi = new AI(2);
    const ff = Number(params.get('ff') || 0);
    for (let i = 0; i < ff; i++) {
      stepFight(); if (i % 2 === 0) draw();
      if (params.has('untilSuper') && match!.superFreeze > 0 && match!.superFreeze < 30) { paused = true; break; }
    }
  } else if (params.has('screen')) setScreen(params.get('screen') as Screen);
  else setScreen('title');
  if (params.has('debug')) r.debug = true;

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sc = { get match() { return match; }, get screen() { return screen; }, get paused() { return paused; } };
  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  const loop = (now: number) => {
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= STEP && n++ < 5) {
      acc -= STEP;
      if (screen === 'fight' && !paused) stepFight();
    }
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  const l = document.getElementById('loading');
  if (l) l.textContent = 'Error cargando el juego: ' + (e as Error).message;
  console.error(e);
});
