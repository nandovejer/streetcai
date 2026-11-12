// Audio 100% sintetizado con Web Audio (sin ficheros): efectos y música arcade con cadencia andaluza.
export type Sfx = 'punch' | 'kick' | 'heavy' | 'block' | 'jump' | 'land' | 'whoosh' | 'ko' | 'special' | 'select' | 'start' | 'win' | 'fall' | 'guardbreak';

const N = (semi: number) => 440 * Math.pow(2, semi / 12); // semitonos respecto a La4

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  private nextT = 0;
  muted = false;

  /** Debe llamarse desde un gesto del usuario. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.6; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic(); // la música suena por defecto desde el primer gesto
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.value = this.muted ? 0 : 0.6;
    return this.muted;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t0 = 0, dest?: AudioNode) {
    const c = this.ctx!; const t = (t0 || c.currentTime);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  private burst(freq: number, dur: number, vol: number, type: BiquadFilterType = 'lowpass', t0 = 0, dest?: AudioNode) {
    const c = this.ctx!; const t = (t0 || c.currentTime);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + 0.02);
  }

  play(name: Sfx) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'punch': this.burst(1400, 0.09, 0.8); this.tone('square', 180, 70, 0.08, 0.3); break;
      case 'kick': this.burst(900, 0.12, 0.9); this.tone('sine', 150, 50, 0.12, 0.5); break;
      case 'heavy': this.burst(700, 0.2, 1); this.tone('sawtooth', 140, 35, 0.22, 0.45); this.burst(3000, 0.05, 0.4, 'highpass'); break;
      case 'block': this.burst(2600, 0.06, 0.5, 'bandpass'); this.tone('square', 520, 380, 0.05, 0.15); break;
      case 'jump': this.tone('square', 220, 520, 0.12, 0.12); break;
      case 'land': this.burst(300, 0.08, 0.5); break;
      case 'fall': this.burst(220, 0.25, 1); this.tone('sine', 90, 40, 0.25, 0.6); break;
      case 'whoosh': this.burst(1800, 0.08, 0.16, 'bandpass'); break;
      case 'special': this.tone('sawtooth', 200, 900, 0.3, 0.22); this.burst(2400, 0.3, 0.25, 'bandpass'); break;
      case 'guardbreak': this.tone('square', 900, 120, 0.35, 0.3); this.burst(4000, 0.2, 0.4, 'highpass'); break;
      case 'ko': this.tone('sawtooth', 500, 50, 0.9, 0.4); this.burst(500, 0.6, 0.8); break;
      case 'select': this.tone('square', 660, 880, 0.07, 0.15); break;
      case 'start': [0, 4, 7, 12].forEach((s, i) => this.tone('square', N(s), N(s), 0.12, 0.18, this.ctx!.currentTime + i * 0.08)); break;
      case 'win': [0, 4, 7, 12, 16].forEach((s, i) => this.tone('square', N(s - 5), N(s - 5), 0.2, 0.18, this.ctx!.currentTime + i * 0.13)); break;
    }
  }

  /** Locutor con la síntesis de voz del navegador (si existe). */
  say(text: string) {
    if (this.muted || !this.ctx || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES'; u.rate = 1.15; u.pitch = 0.5; u.volume = 0.9;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch { /* sin voz */ }
  }

  // Música: cadencia andaluza (Lam - Sol - Fa - Mi) a 16 pasos por compás.
  private static ROOTS = [-12, -14, -16, -17];
  private static THIRD = [3, 4, 4, 4];
  private static LEAD = [
    [12, -1, 12, 15, 19, -1, 15, 12, 19, -1, 15, 12, 10, 12, 15, -1],
    [10, -1, 10, 14, 17, -1, 14, 10, 17, -1, 14, 10, 8, 10, 14, -1],
    [8, -1, 8, 12, 15, -1, 12, 8, 15, -1, 17, 15, 12, 8, 12, -1],
    [7, -1, 11, 14, 19, -1, 17, 16, 14, 11, 8, 11, 7, -1, 7, 8],
  ];

  startMusic() {
    if (!this.ctx || this.timer !== null) return;
    this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 40);
  }
  stopMusic() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }

  private schedule() {
    const c = this.ctx!; const dt = 60 / 148 / 4;
    while (this.nextT < c.currentTime + 0.15) {
      const bar = Math.floor(this.step / 16) % 4, s = this.step % 16, t = this.nextT;
      const root = AudioManager.ROOTS[bar];
      if (s % 2 === 0) this.tone('triangle', N(root + (s % 8 === 6 ? 7 : 0)), N(root + (s % 8 === 6 ? 7 : 0)), dt * 1.8, 0.5, t, this.musicGain);
      if (s % 4 === 2) { // rasgueo
        [0, AudioManager.THIRD[bar], 7].forEach((iv) => this.tone('square', N(root + 12 + iv), N(root + 12 + iv), dt * 0.9, 0.07, t, this.musicGain));
      }
      const lead = AudioManager.LEAD[bar][s];
      if (lead >= 0) this.tone('square', N(lead - 12), N(lead - 12), dt * 0.95, 0.13, t, this.musicGain);
      if (s % 4 === 0) this.tone('sine', 130, 40, 0.1, 0.7, t, this.musicGain);
      if (s % 8 === 4) this.burst(1800, 0.09, 0.35, 'bandpass', t, this.musicGain);
      if (s % 2 === 1) this.burst(7000, 0.03, 0.12, 'highpass', t, this.musicGain);
      this.nextT += dt; this.step++;
    }
  }
}
