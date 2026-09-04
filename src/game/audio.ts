export class GameAudio {
  enabled = true;
  private context?: AudioContext;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }
  play(kind: string) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    try {
      const ctx = this.context;
      const notes = kind === 'asset' ? [440, 660, 880] : kind === 'stage' ? [523, 659, 784, 1046] : kind === 'loss' ? [160, 100] : [880, 1175];
      notes.forEach((frequency, i) => {
        const start = ctx.currentTime + i * .065;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = kind === 'loss' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.035, start + .008);
        gain.gain.exponentialRampToValueAtTime(.001, start + .12);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(start); oscillator.stop(start + .13);
      });
    } catch { /* An unavailable output must never interrupt a run. */ }
  }
}
