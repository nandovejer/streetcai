// Arranque, bucle principal a paso fijo (60 Hz) y navegación entre pantallas.
import '@fontsource/press-start-2p';
import './style.css';
import { loadAssets } from './engine/assets';
import { AudioManager } from './engine/audio';
import { InputManager } from './engine/input';
import { AI } from './game/ai';
import { Difficulty, FIGHTERS, FIGHTER_IDS, FighterId, HOME_STAGE, STAGE_IDS, StageId, VH, VW } from './game/data';
import { Match } from './game/match';
import { Renderer } from './render/renderer';
import { CONTINUE_FROM, CONTINUE_SECOND, STAGE_CHOICES, Settings, VERSUS_FRAMES, continueButtons, drawContinue, drawDemoOverlay, drawPause, drawResult, drawSelect, drawTitle, drawVersus, freezeTitleIntro, skipTitleIntro, titleIntroPlaying, hitButton, pauseButtons, resultButtons, selectButtons } from './ui/screens';
import { isTouchDevice, setupTouch } from './ui/touch';
import { addCredit, getCredits, useCredits } from './ui/credits';

type Screen = 'title' | 'select' | 'versus' | 'fight' | 'result' | 'continue';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const touchRoot = document.getElementById('touch')!;
  const loading = document.getElementById('loading')!;
  const params = new URLSearchParams(location.search);
  const touch = isTouchDevice() || params.has('touch');

  const [assets] = await Promise.all([
    loadAssets([...FIGHTER_IDS]),
    document.fonts.load('10px "Press Start 2P"').catch(() => undefined),
  ]);
  loading.remove();

  const r = new Renderer(canvas, assets);
  // frases del locutor (MP3 generados con Piper TTS)
  const voiceIds = ['round1', 'round2', 'round3', 'round4', 'round5', 'fight', 'ko', 'time', 'perfect', 'draw', 'title', 'gameover', 'select', 'continue', 'champion'];
  for (const a of FIGHTER_IDS) { voiceIds.push(`win_${a}`, `super_${a}`); for (const b of FIGHTER_IDS) if (a !== b) voiceIds.push(`vs_${a}_${b}`); }
  const input = new InputManager();
  const audio = new AudioManager();
  audio.loadVoices(voiceIds);
  const settings: Settings = { char: 'chapa', char2: 'ares', difficulty: 1, twoPlayers: false, pickTurn: 0, stage: 'home' };
  let fightStage: StageId = 'plaza';
  const pickStage = () => {
    fightStage = settings.stage === 'random' ? STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)]
      : settings.stage === 'home' ? HOME_STAGE[rivalId()] : settings.stage;
  };
  // Modo arcade (1P): rivales en orden aleatorio y combate actual.
  let ladder: FighterId[] = [];
  let stage = 0;
  let vsT = 0;
  let vsFrozen = false;
  const newLadder = () => {
    ladder = FIGHTER_IDS.filter((id) => id !== settings.char);
    for (let i = ladder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ladder[i], ladder[j]] = [ladder[j], ladder[i]]; }
    stage = 0;
  };
  const rivalId = (): FighterId => (settings.twoPlayers ? settings.char2 : ladder[stage]);
  let screen: Screen = 'title';
  let match: Match | null = null;
  let ai: AI | null = null;
  let demoAi: AI | null = null;
  // Modo exhibición: combate CPU contra CPU tras un rato sin tocar nada en la portada.
  let demoMode = false;
  let titleIdle = 0;
  const DEMO_AFTER = 60 * 20, DEMO_MAX = 60 * 45;
  let paused = false;
  let endT = 0;
  // CONTINUE?: contT = frames de cuenta atrás; overT = frames de GAME OVER (-1 mientras cuenta)
  let contT = 0, overT = -1;

  if (touch) { setupTouch(touchRoot, input.touch); document.body.classList.add('touch'); }
  const setScreen = (s: Screen) => {
    screen = s;
    document.body.dataset.screen = s;
    titleIdle = 0;
    audio.startMusic();
  };

  /** Presentación VS y después el combate. */
  const goVersus = () => {
    if (!settings.twoPlayers && ladder.length === 0) newLadder();
    pickStage();
    vsT = 0;
    setScreen('versus');
    audio.play('start');
    audio.voice(`vs_${settings.char}_${rivalId()}`);
  };
  const startFight = () => {
    match = new Match(FIGHTERS[settings.char], FIGHTERS[rivalId()]);
    ai = settings.twoPlayers ? null : new AI(settings.difficulty);
    paused = false; endT = 0;
    r.resetFight();
    audio.play('start');
    setScreen('fight');
  };

  const startDemo = () => {
    const ids = [...FIGHTER_IDS].sort(() => Math.random() - 0.5);
    match = new Match(FIGHTERS[ids[0]], FIGHTERS[ids[1]]);
    fightStage = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];
    demoAi = new AI(2); ai = new AI(2);
    demoMode = true; paused = false; endT = 0;
    r.resetFight();
    setScreen('fight');
    document.body.dataset.screen = 'demo'; // sin mandos táctiles ni botón de pausa
  };
  const endDemo = () => {
    demoMode = false; demoAi = null; match = null;
    setScreen('title');
  };

  /** Elegir luchador. En 2 jugadores no se permite el mismo para ambos: si coinciden, se intercambian. */
  const pick = (id: FighterId, who: 0 | 1 = settings.twoPlayers ? settings.pickTurn : 0) => {
    if (!settings.twoPlayers) { settings.char = id; return; }
    if (who === 0) { if (id === settings.char2) settings.char2 = settings.char; settings.char = id; }
    else { if (id === settings.char) settings.char = settings.char2; settings.char2 = id; }
    settings.pickTurn = who === 0 ? 1 : 0;
  };
  /** Mover el cursor de un jugador por la fila de retratos (salta el del otro jugador). */
  const moveCursor = (who: 0 | 1, dir: number) => {
    const cur = who === 0 ? settings.char : settings.char2, other = who === 0 ? settings.char2 : settings.char;
    let i = FIGHTER_IDS.indexOf(cur);
    do i = (i + dir + FIGHTER_IDS.length) % FIGHTER_IDS.length; while (settings.twoPlayers && FIGHTER_IDS[i] === other);
    if (who === 0) settings.char = FIGHTER_IDS[i]; else settings.char2 = FIGHTER_IDS[i];
    audio.play('select');
  };

  const act = (a: string | null) => {
    if (!a) return;
    audio.init();
    if (a.startsWith('char:')) { pick(a.slice(5) as FighterId); audio.play('select'); }
    else if (a.startsWith('diff:')) { settings.difficulty = Number(a.slice(5)) as Difficulty; settings.twoPlayers = false; audio.play('select'); }
    else if (a.startsWith('stage:')) { settings.stage = a.slice(6) as Settings['stage']; audio.play('select'); }
    else if (a === 'mode:cpu') { settings.twoPlayers = false; audio.play('select'); }
    else if (a === 'mode:2p') { settings.twoPlayers = true; audio.play('select'); }
    else if (a === 'fight') { if (!useCredits(settings.twoPlayers ? 2 : 1)) { audio.play('block'); return; } ladder = []; goVersus(); }
    else if (a === 'arcade:next') { if (stage < ladder.length - 1) { stage++; goVersus(); } }
    else if (a === 'arcade:again') { if (!useCredits(1)) { audio.play('block'); return; } ladder = []; goVersus(); }
    else if (a === 'skip') { if (screen === 'versus' && vsT > 20) startFight(); }
    else if (a === 'menu') { paused = false; audio.play('select'); setScreen('select'); }
    else if (a === 'resume') paused = false;
    else if (a === 'pause') { if (screen === 'fight' && match && match.phase !== 'matchEnd') paused = !paused; }
    else if (a === 'title') { if (getCredits() > 0) { audio.play('start'); audio.voice('select'); setScreen('select'); } else { useCredits(1); audio.play('block'); } }
    else if (a === 'continue:yes') { if (overT < 0 && contT > 20) { if (useCredits(1)) goVersus(); else audio.play('block'); } }
    else if (a === 'coin') { if (addCredit()) audio.play('coin'); if (demoMode) endDemo(); else if (screen === 'title' && titleIntroPlaying()) skipTitleIntro(r); }
    else if (a === 'continue:no') { if (overT < 0) gameOver(); else if (overT > 60) setScreen('title'); }
  };

  // Puntero sobre el canvas (menús)
  canvas.addEventListener('pointerdown', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * VW, y = ((e.clientY - b.top) / b.height) * VH;
    titleIdle = 0;
    if (demoMode) endDemo();
    else if (screen === 'title') { if (titleIntroPlaying()) skipTitleIntro(r); else act('title'); }
    else if (screen === 'select') act(hitButton(selectButtons(settings), x, y));
    else if (screen === 'result') act(hitButton(resultButtons(stage >= ladder.length - 1), x, y));
    else if (screen === 'versus') act('skip');
    else if (screen === 'fight' && paused) act(hitButton(pauseButtons(), x, y));
    else if (screen === 'continue') act(overT >= 0 ? 'continue:no' : touch ? hitButton(continueButtons(), x, y) : 'continue:yes');
    else audio.init();
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    audio.init();
    const k = e.code;
    if (k === 'KeyM' && screen !== 'fight') { toggleSound(); return; }
    if (k === 'F2') { r.debug = !r.debug; e.preventDefault(); return; }
    titleIdle = 0;
    if (k === 'Digit5' || k === 'Numpad5') { act('coin'); return; }
    if (demoMode) { endDemo(); return; }
    if (screen === 'title') { if (k === 'Enter' || k === 'Space') { if (titleIntroPlaying()) skipTitleIntro(r); else act('title'); } }
    else if (screen === 'select') {
      const two = settings.twoPlayers;
      if (k === 'KeyA' || (!two && k === 'ArrowLeft')) moveCursor(0, -1);
      else if (k === 'KeyD' || (!two && k === 'ArrowRight')) moveCursor(0, 1);
      else if (two && k === 'ArrowLeft') moveCursor(1, -1);
      else if (two && k === 'ArrowRight') moveCursor(1, 1);
      else if (!two && (k === 'ArrowUp' || k === 'KeyW')) act('diff:' + Math.max(0, settings.difficulty - 1));
      else if (!two && (k === 'ArrowDown' || k === 'KeyS')) act('diff:' + Math.min(2, settings.difficulty + 1));
      else if (k === 'KeyE') act('stage:' + STAGE_CHOICES[(STAGE_CHOICES.indexOf(settings.stage as 'home') + 1) % STAGE_CHOICES.length]);
      else if (k === 'Digit2') act('mode:2p');
      else if (k === 'Digit1') act('mode:cpu');
      else if (k === 'Enter' || k === 'Space') act('fight');
      else if (k === 'Escape') setScreen('title');
    } else if (screen === 'versus') {
      if (k === 'Enter' || k === 'Space' || k === 'Escape') act('skip');
    } else if (screen === 'fight') {
      if (k === 'Escape' || k === 'KeyP') act('pause');
      else if (paused && k === 'Enter') act('resume');
      else if (paused && k === 'KeyQ') act('menu');
    } else if (screen === 'continue') {
      if (k === 'Escape') act('continue:no');
      else if (k === 'Enter' || k === 'Space') act(overT >= 0 ? 'continue:no' : 'continue:yes');
    } else if (screen === 'result') {
      if (k === 'Enter' || k === 'Space') act(stage >= ladder.length - 1 ? 'arcade:again' : 'arcade:next');
      else if (k === 'Escape') act('menu');
    }
  });

  document.getElementById('btn-pause')!.addEventListener('click', () => act('pause'));
  document.getElementById('btn-coin')!.addEventListener('click', () => { titleIdle = 0; act('coin'); });
  const btnMute = document.getElementById('btn-mute')!;
  const syncMute = () => {
    btnMute.classList.toggle('off', audio.muted);
    const label = audio.muted ? 'Poner sonido' : 'Quitar sonido';
    btnMute.setAttribute('aria-label', label); btnMute.title = label;
  };
  syncMute();
  function toggleSound() {
    audio.init();
    audio.toggleMute();
    syncMute();
  }
  btnMute.addEventListener('click', toggleSound);
  // Primer gesto en cualquier parte de la página: arranca el audio (y la música).
  window.addEventListener('pointerdown', () => audio.init(), { once: true, capture: true });
  const btnFull = document.getElementById('btn-full')!;
  type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void>; webkitFullscreenEnabled?: boolean };
  type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const fsDoc = document as FsDoc, fsRoot = document.documentElement as FsEl;
  const isFull = () => !!(fsDoc.fullscreenElement || fsDoc.webkitFullscreenElement);
  // iPhone no soporta la API de pantalla completa: ocultamos el botón.
  if (!(fsDoc.fullscreenEnabled || fsDoc.webkitFullscreenEnabled)) btnFull.classList.add('hidden');
  const syncFull = () => {
    const on = isFull();
    btnFull.classList.toggle('on', on);
    btnFull.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
    btnFull.title = btnFull.getAttribute('aria-label')!;
  };
  document.addEventListener('fullscreenchange', syncFull);
  document.addEventListener('webkitfullscreenchange', syncFull);
  btnFull.addEventListener('click', async () => {
    try {
      if (isFull()) await (fsDoc.exitFullscreen ? fsDoc.exitFullscreen() : fsDoc.webkitExitFullscreen?.());
      else {
        await (fsRoot.requestFullscreen ? fsRoot.requestFullscreen() : fsRoot.webkitRequestFullscreen?.());
        const so = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (so && so.lock) await so.lock('landscape').catch(() => undefined);
      }
    } catch { /* no soportado (iOS) */ }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'fight' && !demoMode) paused = true; });

  const SFX: Record<string, Parameters<AudioManager['play']>[0]> = {
    block: 'block', jump: 'jump', land: 'land', whoosh: 'whoosh', ko: 'ko', special: 'special', fall: 'fall', guardbreak: 'guardbreak', clash: 'heavy',
  };

  function startContinue() {
    contT = 0; overT = -1;
    setScreen('continue');
    audio.voice('continue');
    audio.stopMusic();
    audio.play('tick');
  }
  function gameOver() {
    overT = 0;
    audio.play('gameover');
    audio.voice('gameover');
  }
  const stepContinue = () => {
    if (overT >= 0) { if (++overT > 240) setScreen('title'); return; }
    const before = Math.floor(contT / CONTINUE_SECOND);
    contT++;
    const now = Math.floor(contT / CONTINUE_SECOND);
    if (now !== before) { if (now > CONTINUE_FROM) gameOver(); else audio.play('tick'); }
  };

  const stepFight = () => {
    const m = match!;
    if (m.phase === 'matchEnd') {
      if (++endT === 1) audio.play('win');
      if (demoMode) { if (endT > 120) endDemo(); return; }
      if (endT > 50) {
        // Si pierde un humano (contra la CPU, o cualquiera en 2 jugadores): ¿CONTINUE?
        if (settings.twoPlayers || m.matchWinner === 1) startContinue();
        else { setScreen('result'); if (stage >= ladder.length - 1) audio.voice('champion'); }
      }
      return;
    }
    const p1 = demoAi ? demoAi.next(m.f[0], m.f[1], m.projectiles) : input.get(0, settings.twoPlayers);
    const p2 = ai ? ai.next(m.f[1], m.f[0], m.projectiles) : input.get(1, true);
    const wasIntro = m.phase === 'intro';
    m.step([p1, p2]);
    if (wasIntro && m.phase === 'fight') audio.play('start');
    if (!demoMode && m.phase === 'intro' && m.phaseT === 5) audio.voice(`round${Math.min(5, m.round)}`);
    if (!demoMode && m.phase === 'intro' && m.phaseT === 78) audio.voice('fight');
    if (m.phase === 'ko' && m.phaseT === 82) audio.voice(m.roundWinner < 0 ? 'draw' : m.perfect ? 'perfect' : `win_${m.f[m.roundWinner].def.id}`);
    for (const e of m.events) {
      if (e.type === 'ko') audio.voice(m.message === 'K.O.' ? 'ko' : 'time');
      if (e.type === 'super' && e.who !== undefined) { audio.play('guardbreak'); audio.voice(`super_${m.f[e.who].def.id}`); }
      if (e.type === 'hit') audio.play(e.heavy ? 'heavy' : e.kick ? 'kick' : 'punch');
      else if (SFX[e.type]) audio.play(SFX[e.type]);
    }
    r.consume(m.events);
    m.events.length = 0;
  };

  const titleHooks = { play: (s: Parameters<AudioManager['play']>[0]) => audio.play(s), voice: (id: string) => audio.voice(id), music: () => audio.setMusicHold(false) };
  const draw = () => {
    r.stage = screen === 'versus' || screen === 'fight' || screen === 'result' ? fightStage : 'plaza';
    if (screen === 'title') drawTitle(r, touch, titleHooks);
    else if (screen === 'select') drawSelect(r, settings, touch);
    else if (screen === 'fight' && match) {
      const you = demoMode ? 'CPU' : settings.twoPlayers ? 'J1' : 'TU', other = settings.twoPlayers && !demoMode ? 'J2' : 'CPU';
      r.drawFight(match, [you, other]);
      if (demoMode) drawDemoOverlay(r, touch);
      else if (paused) drawPause(r);
    } else if (screen === 'continue' && match) {
      drawContinue(r, match.f[1 - match.matchWinner].def.id, contT, overT, touch);
    } else if (screen === 'versus') {
      const sub = settings.twoPlayers ? 'J1  VS  J2' : `RIVAL ${stage + 1} DE ${ladder.length}`;
      const help = touch ? ['JOYSTICK MOVER - P/K FLOJOS - PF/KF FUERTES - SP ESPECIAL', 'ATRAS = BLOQUEAR - DOBLE TOQUE = DASH - BARRA LLENA + SP = SUPER']
        : settings.twoPlayers ? ['1P: WASD + F/G FLOJOS - T/Y FUERTES - R BLOQUEO - H ESPECIAL', '2P: FLECHAS + J/K FLOJOS - U/I FUERTES - O BLOQUEO - L ESPECIAL']
        : ['WASD/FLECHAS MOVER - F/G FLOJOS - T/Y FUERTES - R BLOQUEO - H ESPECIAL', 'ATRAS = BLOQUEAR - DOBLE TOQUE = DASH - BARRA LLENA + ESPECIAL = SUPER - ESC PAUSA'];
      drawVersus(r, settings.char, rivalId(), vsT, sub, fightStage, help);
    } else if (screen === 'result' && match) {
      const w = match.matchWinner, win = match.f[w].def.id, lose = match.f[1 - w].def.id;
      const final = stage >= ladder.length - 1;
      const head = settings.twoPlayers ? `GANA J${w + 1}` : final ? '¡CAMPEON!' : '¡HAS GANADO!';
      const score = final ? `${ladder.length} DE ${ladder.length} RIVALES VENCIDOS` : `${match.f[0].wins} - ${match.f[1].wins}   ·   RIVAL ${stage + 1} DE ${ladder.length}`;
      drawResult(r, win, lose, head, score, final);
    }
  };

  const sp = params.get('stage') as StageId;
  if (STAGE_IDS.includes(sp)) settings.stage = sp;
  // Modo demo para pruebas automáticas: ?demo=1 lanza IA contra IA; ?ff=N avanza N frames.
  if (params.has('demo')) {
    settings.difficulty = 2;
    const dc = params.get('demo') as FighterId;
    if (FIGHTER_IDS.includes(dc)) settings.char = dc;
    newLadder();
    const vs = params.get('vs') as FighterId;
    if (FIGHTER_IDS.includes(vs) && vs !== settings.char) ladder = [vs];
    pickStage(); startFight(); demoAi = new AI(2);
    const ff = Number(params.get('ff') || 0);
    for (let i = 0; i < ff; i++) {
      stepFight(); if (i % 2 === 0) draw();
      if (params.has('untilSuper') && match!.superFreeze > 0 && match!.superFreeze < 30) { paused = true; break; }
    }
  } else if (params.get('screen') === 'continue') {
    // Pruebas: ?screen=continue&lose=<luchador> abre directamente la cuenta atrás.
    const lp = params.get('lose') as FighterId;
    const lose: FighterId = FIGHTER_IDS.includes(lp) ? lp : 'chapa';
    settings.char = lose;
    newLadder();
    match = new Match(FIGHTERS[lose], FIGHTERS[ladder[0]]);
    match.matchWinner = 1;
    startContinue();
  } else if (params.get('screen') === 'versus') {
    // Pruebas: ?screen=versus[&vst=60] (vst congela la animación en ese frame)
    if (params.has('2p')) settings.twoPlayers = true;
    newLadder(); goVersus();
    if (params.has('vst')) { vsT = Number(params.get('vst')); vsFrozen = true; }
  } else if (params.get('screen') === 'result') {
    // Pruebas: ?screen=result[&final=1]
    newLadder(); if (params.has('final')) stage = ladder.length - 1;
    match = new Match(FIGHTERS[settings.char], FIGHTERS[ladder[stage]]);
    match.matchWinner = 0; match.f[0].wins = 2;
    setScreen('result');
  } else if (params.get('screen') === 'demo') {
    startDemo();
  } else if (params.has('screen')) { if (params.has('2p')) settings.twoPlayers = true; setScreen(params.get('screen') as Screen); }
  else setScreen('title');
  if (params.has('debug')) r.debug = true;
  if (params.has('introAt')) freezeTitleIntro(Number(params.get('introAt')));

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sc = { get match() { return match; }, get screen() { return screen; }, get paused() { return paused; } };
  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  const loop = (now: number) => {
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= STEP && n++ < 5) {
      acc -= STEP;
      if (screen === 'fight' && !paused) { stepFight(); if (demoMode && match && match.frame > DEMO_MAX) endDemo(); }
      else if (screen === 'title' && !titleIntroPlaying() && ++titleIdle > DEMO_AFTER) startDemo();
      else if (screen === 'continue') stepContinue();
      else if (screen === 'versus' && !vsFrozen && ++vsT >= VERSUS_FRAMES) startFight();
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
