// High quality procedural Web Audio API sound synthesizer
// Zero external asset loading, instant playback, works in all modern browsers

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazily initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('cabo_muted', muted ? 'true' : 'false');
    } catch {}
  }

  public getMuted(): boolean {
    try {
      return localStorage.getItem('cabo_muted') === 'true';
    } catch {
      return false;
    }
  }

  // Card Flip / Deal: crisp snappy noise burst
  public playCardFlip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Card Draw / Whoosh
  public playCardDraw() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Card Snap / Table placement
  public playCardSnap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Peek Power: mystical sparkling chimes
  public playPeek() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  // Spy Power: radar sweep / sonar ping
  public playSpy() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.41);
  }

  // Swap Power: arcane warp swirl
  public playSwap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(400, t);
    osc1.frequency.linearRampToValueAtTime(800, t + 0.15);
    osc1.frequency.linearRampToValueAtTime(300, t + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(600, t);
    osc2.frequency.linearRampToValueAtTime(300, t + 0.15);
    osc2.frequency.linearRampToValueAtTime(700, t + 0.3);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.36);
    osc2.stop(t + 0.36);
  }

  // CABO Alert: dramatic deep gong and brass horn
  public playCaboAlert() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Deep bell / gong
    const gong = this.ctx.createOscillator();
    const gongGain = this.ctx.createGain();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(130, t);
    gong.frequency.exponentialRampToValueAtTime(80, t + 1.2);
    gongGain.gain.setValueAtTime(0.4, t);
    gongGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    gong.connect(gongGain);
    gongGain.connect(this.ctx.destination);
    gong.start(t);
    gong.stop(t + 1.25);

    // Urgent horn fanfare
    const notes = [330, 440, 554, 659];
    notes.forEach((freq, idx) => {
      const nt = t + 0.15 + idx * 0.1;
      const horn = this.ctx!.createOscillator();
      const hGain = this.ctx!.createGain();
      horn.type = 'sawtooth';
      horn.frequency.setValueAtTime(freq, nt);
      hGain.gain.setValueAtTime(0.18, nt);
      hGain.gain.exponentialRampToValueAtTime(0.001, nt + 0.3);
      horn.connect(hGain);
      hGain.connect(this.ctx!.destination);
      horn.start(nt);
      horn.stop(nt + 0.31);
    });
  }

  // Match Success Fanfare
  public playMatchSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, idx) => {
      const nt = t + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, nt);
      gain.gain.setValueAtTime(0.22, nt);
      gain.gain.exponentialRampToValueAtTime(0.001, nt + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(nt);
      osc.stop(nt + 0.42);
    });
  }

  // Match Fail Buzzer
  public playMatchFail() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  // Turn start notification chime
  public playTurnStart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Turn passes to the rival: a short, soft descending cue
  public playTurnPass() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [493.88, 369.99].forEach((freq, index) => {
      const noteTime = t + index * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.09, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.21);
    });
  }

  // Gentle reminder when the active player has been idle for a while
  public playTurnReminder() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [659.25, 783.99].forEach((freq, index) => {
      const noteTime = t + index * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.08, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.29);
    });
  }

  // Hand reveal: low table hit followed by a restrained shimmer
  public playRoundReveal() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const impact = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impact.type = 'sine';
    impact.frequency.setValueAtTime(105, t);
    impact.frequency.exponentialRampToValueAtTime(52, t + 0.42);
    impactGain.gain.setValueAtTime(0.22, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    impact.connect(impactGain);
    impactGain.connect(this.ctx.destination);
    impact.start(t);
    impact.stop(t + 0.46);

    [392, 523.25, 659.25].forEach((freq, index) => {
      const noteTime = t + 0.2 + index * 0.1;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.09, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.42);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.43);
    });
  }

  // Victory Fanfare
  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12 }, // C
      { f: 659.25, d: 0.12 }, // E
      { f: 783.99, d: 0.12 }, // G
      { f: 1046.5, d: 0.35 }, // C
    ];

    let offset = 0;
    melody.forEach((note) => {
      const nt = t + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, nt);
      gain.gain.setValueAtTime(0.25, nt);
      gain.gain.exponentialRampToValueAtTime(0.001, nt + note.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(nt);
      osc.stop(nt + note.d + 0.05);

      offset += note.d * 0.85;
    });
  }

  // Play by event name from server or UI
  public playEffect(name: string) {
    switch (name) {
      case 'card_draw':
        this.playCardDraw();
        break;
      case 'card_snap':
        this.playCardSnap();
        break;
      case 'card_flip':
        this.playCardFlip();
        break;
      case 'peek':
      case 'power_activate':
        this.playPeek();
        break;
      case 'spy':
        this.playSpy();
        break;
      case 'swap':
        this.playSwap();
        break;
      case 'cabo_alert':
        this.playCaboAlert();
        break;
      case 'match_success':
        this.playMatchSuccess();
        break;
      case 'match_fail':
        this.playMatchFail();
        break;
      case 'turn_start':
        this.playTurnStart();
        break;
      case 'turn_pass':
        this.playTurnPass();
        break;
      case 'turn_reminder':
        this.playTurnReminder();
        break;
      case 'round_reveal':
        this.playRoundReveal();
        break;
      case 'game_start':
        this.playCardDraw();
        break;
      case 'victory':
        this.playVictory();
        break;
      default:
        this.playCardFlip();
    }
  }
}

export const sound = new SoundEngine();
