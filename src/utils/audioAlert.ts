// Web Audio API emergency alert sound generator

class AudioAlertManager {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private sirenInterval: any = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
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
    if (muted && this.isPlaying) {
      this.stopAlert();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playCriticalSiren() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.isPlaying) return;

    try {
      this.isPlaying = true;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.oscillator = osc;
      this.gainNode = gain;

      // European/Civic warning wail: alternating between 480Hz and 880Hz
      let high = false;
      this.sirenInterval = setInterval(() => {
        if (!this.ctx || !this.oscillator || !this.isPlaying) return;
        const now = this.ctx.currentTime;
        const targetFreq = high ? 440 : 880;
        this.oscillator.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.35);
        high = !high;
      }, 450);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  public playWarningBeep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  }

  public stopAlert() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch {
        // ignore
      }
      this.oscillator = null;
    }
    this.isPlaying = false;
  }
}

export const alertAudio = new AudioAlertManager();
