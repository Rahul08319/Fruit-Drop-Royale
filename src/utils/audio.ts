class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicInterval: any = null;
  private beatCount: number = 0;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.effectsGain = this.ctx.createGain();

      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.effectsGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

      this.masterGain.connect(this.ctx.destination);
      this.musicGain.connect(this.masterGain);
      this.effectsGain.connect(this.masterGain);
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.45, this.ctx.currentTime);
    }
  }

  toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  getMute() {
    return this.isMuted;
  }

  playDropSound() {
    this.init();
    if (this.isMuted || !this.ctx || !this.effectsGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startTime = this.ctx.currentTime;
    
    // Bubble sweep down sound
    osc.frequency.setValueAtTime(450, startTime);
    osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.12);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.connect(gain);
    gain.connect(this.effectsGain);

    osc.start(startTime);
    osc.stop(startTime + 0.16);
  }

  playMergeSound(fruitId: number, combo: number = 0) {
    this.init();
    if (this.isMuted || !this.ctx || !this.effectsGain) return;

    const startTime = this.ctx.currentTime;
    
    // High combo count increases pitch
    const pitchMultiplier = 1.0 + Math.min(combo * 0.12, 1.2);
    // Bigger fruits have lower base frequencies for weight
    const baseFreq = Math.max(380 - fruitId * 22, 140) * pitchMultiplier;

    // 1. Core pop frequency (oscillator 1 - triangle)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, startTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, startTime + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, startTime + 0.22);

    gain1.gain.setValueAtTime(0, startTime);
    gain1.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    // 2. Dynamic Noise/Juicy splat (with bandpass filter sweep)
    const bufferSize = this.ctx.sampleRate * 0.15; // 150ms buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, startTime);
    filter.frequency.exponentialRampToValueAtTime(160 + fruitId * 50, startTime + 0.12);
    filter.Q.setValueAtTime(8, startTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.effectsGain);
    
    osc1.connect(gain1);
    gain1.connect(this.effectsGain);

    osc1.start(startTime);
    osc1.stop(startTime + 0.26);

    noiseNode.start(startTime);
    noiseNode.stop(startTime + 0.16);

    // If combo > 0, play an extra sparkly high-pitched chime
    if (combo >= 2) {
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      
      const chimeFreq = baseFreq * 2 * (1 + (combo - 1) * 0.15);
      chime.frequency.setValueAtTime(chimeFreq, startTime);
      chime.frequency.linearRampToValueAtTime(chimeFreq * 1.2, startTime + 0.18);

      chimeGain.gain.setValueAtTime(0, startTime);
      chimeGain.gain.linearRampToValueAtTime(0.2, startTime + 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      chime.connect(chimeGain);
      chimeGain.connect(this.effectsGain);

      chime.start(startTime);
      chime.stop(startTime + 0.32);
    }
  }

  playDangerTick() {
    this.init();
    if (this.isMuted || !this.ctx || !this.effectsGain) return;

    const startTime = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, startTime);

    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    osc.connect(gain);
    gain.connect(this.effectsGain);

    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }

  playGameOverSound() {
    this.init();
    if (this.isMuted || !this.ctx || !this.effectsGain) return;

    const startTime = this.ctx.currentTime;
    
    // Sad falling chords
    const notes = [261.63, 246.94, 220.00, 196.00]; // C4, B3, A3, G3
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);
      osc.frequency.linearRampToValueAtTime(freq * 0.8, startTime + idx * 0.12 + 0.18);

      gain.gain.setValueAtTime(0, startTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, startTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.12 + 0.22);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, startTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.effectsGain!);

      osc.start(startTime + idx * 0.12);
      osc.stop(startTime + idx * 0.12 + 0.25);
    });
  }

  playVictorySound() {
    this.init();
    if (this.isMuted || !this.ctx || !this.effectsGain) return;

    const startTime = this.ctx.currentTime;
    
    // Happy major chord arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C Major scale arpeggio
    const duration = 0.1;
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

      gain.gain.setValueAtTime(0, startTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.28, startTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.4);
    });

    // Final triumphant chord
    setTimeout(() => {
      if (!this.ctx || !this.effectsGain) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach(f => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc.connect(gain);
        gain.connect(this.effectsGain!);
        osc.start(t);
        osc.stop(t + 0.85);
      });
    }, 450);
  }

  startMusic() {
    this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    
    // Play a friendly bouncy synthetic baseline loop
    // C Major, Am, F, G style progressions
    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ];

    const melodyNotes = [
      [523.25, 587.33, 659.25, 783.99], // C, D, E, G
      [440.00, 523.25, 587.33, 659.25], // A, C, D, E
      [349.23, 440.00, 523.25, 587.33], // F, A, C, D
      [392.00, 493.88, 587.33, 659.25], // G, B, D, E
    ];

    const playStep = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      const progressionIdx = Math.floor(this.beatCount / 16) % chords.length;
      const stepInMeasure = this.beatCount % 16;

      // Bass note on beat 1, 5, 9, 13
      if (stepInMeasure % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        const bassFreq = chords[progressionIdx][0] / 2; // Bass octave
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassGain.gain.setValueAtTime(0, t);
        bassGain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(t);
        bassOsc.stop(t + 0.5);
      }

      // Simple, charming bubbly melody on beats
      if (stepInMeasure % 2 === 0 && Math.random() > 0.3) {
        const melodyOsc = this.ctx.createOscillator();
        const melodyGain = this.ctx.createGain();
        melodyOsc.type = 'sine';

        const possibleNotes = melodyNotes[progressionIdx];
        const noteFreq = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
        
        // Sometimes play octave higher
        const freq = Math.random() > 0.85 ? noteFreq * 2 : noteFreq;
        melodyOsc.frequency.setValueAtTime(freq, t);

        melodyGain.gain.setValueAtTime(0, t);
        melodyGain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        melodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        melodyOsc.connect(melodyGain);
        melodyGain.connect(this.musicGain);
        melodyOsc.start(t);
        melodyOsc.stop(t + 0.28);
      }

      this.beatCount++;
    };

    // Keep tempo at 120bpm (60s / 120 beats/min = 0.5s per beat, 0.25s per 1/8 note block)
    this.musicInterval = setInterval(playStep, 250);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const synths = new SoundSynthesizer();
