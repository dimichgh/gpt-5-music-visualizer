export type Instrument = 'none' | 'drums' | 'bass' | 'guitar';

export class InstrumentClassifier {
  private holdSeconds = 5;
  private current: Instrument = 'none';
  private lastSwitchAt = 0;

  constructor(holdSeconds = 5) {
    this.holdSeconds = holdSeconds;
  }

  update(timeSec: number, rms: number, low: number, mid: number, high: number, beat: boolean): Instrument {
    const proposed = this.classifyInstant(rms, low, mid, high, beat);
    if (proposed !== this.current && timeSec - this.lastSwitchAt >= this.holdSeconds) {
      this.current = proposed;
      this.lastSwitchAt = timeSec;
    }
    return this.current;
  }

  private classifyInstant(rms: number, low: number, mid: number, high: number, beat: boolean): Instrument {
    // Simple heuristics; tune thresholds as needed
    if (beat && high > 0.5 && mid < 0.6) return 'drums';
    if (low > 0.45 && mid < 0.35) return 'bass';
    if (mid > 0.5 && high < 0.5) return 'guitar';
    if (rms < 0.08) return 'none';
    return 'none';
  }
}


