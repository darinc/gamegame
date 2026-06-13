// AudioSynth — all game audio synthesized at runtime with the WebAudio API.
//
// The rest of the game generates its textures in code; the sound follows the
// same philosophy. No asset files, no loading — just oscillators and envelopes.
// A single shared AudioContext lives for the life of the page so music keeps
// playing across Phaser scene transitions.
//
// Browser autoplay policy: an AudioContext starts "suspended" until a user
// gesture. We attach one-time listeners that resume it on the first key / click /
// touch / gamepad press, which always happens before gameplay (menu → start).

type WaveType = OscillatorType;

interface BlipOptions {
  type?: WaveType;
  freq: number;
  freqEnd?: number;       // glide target
  duration: number;       // seconds
  gain?: number;
  attack?: number;
  release?: number;
  delay?: number;         // schedule offset (seconds from now)
}

class AudioSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private muted = false;
  private unlocked = false;

  // Music sequencer state
  private musicOn = false;
  private nextNoteTime = 0;
  private step = 0;
  private schedulerTimer: number | null = null;
  private currentSong: Song | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const prev = window.localStorage?.getItem('gg_muted');
      this.muted = prev === '1';
    }
  }

  // ---- lifecycle -----------------------------------------------------------

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.32;
      this.musicBus.connect(this.master);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  // Call once early (e.g. game boot). Wires gesture listeners to satisfy the
  // browser autoplay policy and resume the context the moment the player acts.
  install(): void {
    if (this.unlocked || typeof window === 'undefined') return;
    this.unlocked = true;
    const unlock = () => {
      const ctx = this.ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
    window.localStorage?.setItem('gg_muted', this.muted ? '1' : '0');
    return this.muted;
  }

  // ---- low-level synthesis -------------------------------------------------

  private blip(o: BlipOptions): void {
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus || this.muted) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd && o.freqEnd !== o.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + o.duration);
    }
    const peak = o.gain ?? 0.25;
    const attack = o.attack ?? 0.005;
    const release = o.release ?? 0.06;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration + release);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.duration + release + 0.02);
  }

  // Percussive noise burst (brick break, ground-pound thud).
  private noise(duration: number, opts: { gain?: number; filter?: number; sweep?: number; delay?: number } = {}): void {
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.filter ?? 1800, t0);
    if (opts.sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(80, opts.sweep), t0 + duration);
    const g = ctx.createGain();
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  // ---- game SFX ------------------------------------------------------------

  jump(big = false): void {
    this.blip({ type: 'square', freq: big ? 320 : 380, freqEnd: big ? 720 : 820, duration: 0.16, gain: 0.22, release: 0.05 });
  }

  coin(): void {
    this.blip({ type: 'square', freq: 988, duration: 0.06, gain: 0.18 });
    this.blip({ type: 'square', freq: 1319, duration: 0.12, gain: 0.18, delay: 0.06 });
  }

  // Rising arpeggio when a coin score popup lands (every Nth coin) — small reward.
  ding(): void {
    this.blip({ type: 'triangle', freq: 1319, duration: 0.08, gain: 0.2 });
    this.blip({ type: 'triangle', freq: 1760, duration: 0.1, gain: 0.2, delay: 0.07 });
  }

  stomp(): void {
    this.blip({ type: 'square', freq: 240, freqEnd: 90, duration: 0.12, gain: 0.28 });
    this.noise(0.08, { gain: 0.12, filter: 1200, sweep: 300 });
  }

  brick(): void {
    this.noise(0.18, { gain: 0.3, filter: 2400, sweep: 400 });
    this.blip({ type: 'square', freq: 180, freqEnd: 70, duration: 0.1, gain: 0.12 });
  }

  thud(): void {
    this.noise(0.22, { gain: 0.45, filter: 900, sweep: 120 });
    this.blip({ type: 'sine', freq: 140, freqEnd: 50, duration: 0.18, gain: 0.3 });
  }

  powerUp(): void {
    // Classic ascending sparkle run.
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => this.blip({ type: 'square', freq: f, duration: 0.09, gain: 0.18, delay: i * 0.07 }));
  }

  powerDown(): void {
    const notes = [784, 587, 440, 330];
    notes.forEach((f, i) => this.blip({ type: 'sawtooth', freq: f, duration: 0.1, gain: 0.18, delay: i * 0.08 }));
  }

  hurt(): void {
    this.blip({ type: 'sawtooth', freq: 400, freqEnd: 120, duration: 0.22, gain: 0.25 });
  }

  die(): void {
    const notes = [392, 370, 330, 294, 247, 196];
    notes.forEach((f, i) => this.blip({ type: 'square', freq: f, duration: 0.14, gain: 0.22, delay: i * 0.12 }));
  }

  bubble(): void {
    this.blip({ type: 'sine', freq: 300, freqEnd: 900, duration: 0.2, gain: 0.16, release: 0.1 });
  }

  pop(): void {
    this.blip({ type: 'sine', freq: 900, freqEnd: 300, duration: 0.1, gain: 0.18 });
  }

  charge(): void {
    this.blip({ type: 'sawtooth', freq: 110, freqEnd: 220, duration: 0.5, gain: 0.14 });
  }

  select(): void {
    this.blip({ type: 'square', freq: 660, duration: 0.05, gain: 0.16 });
  }

  start(): void {
    const notes = [523, 784, 1047];
    notes.forEach((f, i) => this.blip({ type: 'square', freq: f, duration: 0.1, gain: 0.2, delay: i * 0.08 }));
  }

  oneUp(): void {
    const notes = [659, 784, 988, 1319];
    notes.forEach((f, i) => this.blip({ type: 'triangle', freq: f, duration: 0.12, gain: 0.2, delay: i * 0.09 }));
  }

  // Level-complete fanfare.
  fanfare(): void {
    const seq: Array<[number, number]> = [
      [523, 0], [659, 0.12], [784, 0.24], [1047, 0.36],
      [784, 0.5], [1047, 0.62], [1319, 0.78],
    ];
    seq.forEach(([f, d]) => this.blip({ type: 'square', freq: f, duration: 0.16, gain: 0.22, delay: d }));
  }

  gameOver(): void {
    const seq: Array<[number, number]> = [
      [392, 0], [330, 0.18], [262, 0.36], [196, 0.6],
    ];
    seq.forEach(([f, d]) => this.blip({ type: 'triangle', freq: f, duration: 0.3, gain: 0.22, delay: d }));
  }

  // ---- background music ----------------------------------------------------

  startMusic(song: Song = DEFAULT_SONG): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (this.musicOn && this.currentSong === song) return;
    this.stopMusic();
    this.currentSong = song;
    this.musicOn = true;
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.scheduleMusic();
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleMusic = (): void => {
    const ctx = this.ctx;
    const song = this.currentSong;
    if (!ctx || !song || !this.musicOn) return;

    const secondsPerStep = 60 / song.bpm / song.stepsPerBeat;
    // Look ahead ~120ms and queue any notes due in that window.
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      const i = this.step % song.lead.length;
      const lead = song.lead[i];
      if (lead > 0) this.musicNote(lead, this.nextNoteTime, secondsPerStep * 0.9, 'square', 0.18);
      const bass = song.bass[i % song.bass.length];
      if (bass > 0) this.musicNote(bass, this.nextNoteTime, secondsPerStep * 1.6, 'triangle', 0.3);
      this.nextNoteTime += secondsPerStep;
      this.step++;
    }
    this.schedulerTimer = window.setTimeout(this.scheduleMusic, 25);
  };

  private musicNote(freq: number, t0: number, dur: number, type: WaveType, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

interface Song {
  bpm: number;
  stepsPerBeat: number;
  lead: number[];   // 0 = rest
  bass: number[];
}

// Note frequencies
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
};

// A bouncy, upbeat 16-step loop (x2 bars) — cheerful, unobtrusive.
const DEFAULT_SONG: Song = {
  bpm: 132,
  stepsPerBeat: 2,
  lead: [
    N.C5, N.E5, N.G5, N.E5, N.C5, N.E5, N.G5, N.A5,
    N.G5, N.E5, N.C5, N.E5, N.D5, N.F5, N.E5, 0,
    N.C5, N.E5, N.G5, N.E5, N.A4, N.C5, N.E5, N.D5,
    N.C5, N.G4, N.E4, N.G4, N.C5, 0, N.G4, 0,
  ],
  bass: [
    N.C3, 0, N.G3, 0, N.C3, 0, N.G3, 0,
    N.A3, 0, N.E3, 0, N.F3, 0, N.G3, 0,
    N.C3, 0, N.G3, 0, N.A3, 0, N.E3, 0,
    N.F3, 0, N.G3, 0, N.C3, 0, N.G3, 0,
  ],
};

// Shared singleton across the whole game.
export const audio = new AudioSynth();
