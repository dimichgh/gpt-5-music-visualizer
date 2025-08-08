export type AudioFeaturesFrame = {
  time: number;
  rms: number;
  bands: { low: number; mid: number; high: number };
  beat: boolean;
};

type FrameCallback = (frame: AudioFeaturesFrame) => void;
type VoidCallback = () => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private testOscillator: OscillatorNode | null = null;
  private testGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private freqData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private rafId: number | null = null;
  private callbacks: Set<FrameCallback> = new Set();
  private onEndedCallbacks: Set<VoidCallback> = new Set();
  private startTimeSec = 0;
  private pendingFile: File | null = null;
  private energyHistory: number[] = [];
  private maxEnergyHistory = 43; // ~0.7s at ~60fps
  private lastBeatAt = 0;
  private beatSensitivity = 0.6; // 0..1, higher = more sensitive
  private liveStream: MediaStream | null = null;
  private liveSource: MediaStreamAudioSourceNode | null = null;

  async loadFile(file: File): Promise<void> {
    // Only remember the file; defer heavy decode to start()
    this.stop();
    this.pendingFile = file;
  }

  async start(): Promise<void> {
    const context = (this.audioContext ||= new AudioContext());
    if (!this.analyser) this.createAnalyser(context);

    // If there is a pending file and no source set up, decode now
    if (!this.sourceNode && this.pendingFile) {
      try {
        const arrayBuffer = await this.pendingFile.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.analyser!);
        this.sourceNode = source;
        source.onended = () => {
          for (const cb of this.onEndedCallbacks) cb();
        };
        this.pendingFile = null;
      } catch (err) {
        console.error('Audio decode/start failed', err);
        return;
      }
    }
    if (!this.audioContext || !this.sourceNode || !this.analyser) return;
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }
    this.startTimeSec = this.audioContext.currentTime;
    this.sourceNode.start();
    this.startTick();
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {}
    }
    if (this.liveStream) {
      try {
        for (const tr of this.liveStream.getTracks()) tr.stop();
      } catch {}
    }
    if (this.testOscillator) {
      try {
        this.testOscillator.stop();
      } catch {}
    }
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.sourceNode = null;
    if (this.liveSource) {
      try { this.liveSource.disconnect(); } catch {}
    }
    this.liveStream = null;
    this.liveSource = null;
    this.testOscillator = null;
  }

  onFrame(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  onEnded(callback: VoidCallback): () => void {
    this.onEndedCallbacks.add(callback);
    return () => this.onEndedCallbacks.delete(callback);
  }

  dispose(): void {
    this.stop();
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.testOscillator) {
      try {
        this.testOscillator.disconnect();
      } catch {}
      this.testOscillator = null;
    }
    if (this.testGain) {
      try {
        this.testGain.disconnect();
      } catch {}
      this.testGain = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }
    // Keep AudioContext for reuse to avoid permission prompts
  }

  async startTestTone(frequency = 220): Promise<void> {
    const context = (this.audioContext ||= new AudioContext());
    const analyser = this.createAnalyser(context);
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = 0.05; // quiet
    osc.connect(gain);
    gain.connect(analyser);

    this.testOscillator = osc;
    this.testGain = gain;
    if (context.state !== 'running') await context.resume();
    osc.start();
    this.startTick();
  }

  stopTestTone(): void {
    if (this.testOscillator) {
      try {
        this.testOscillator.stop();
      } catch {}
      try {
        this.testOscillator.disconnect();
      } catch {}
    }
    if (this.testGain) {
      try {
        this.testGain.disconnect();
      } catch {}
    }
    this.testOscillator = null;
    this.testGain = null;
  }

  setTestToneFrequency(frequency: number): void {
    if (this.testOscillator) {
      this.testOscillator.frequency.value = frequency;
    }
  }

  async startFromMediaStream(stream: MediaStream): Promise<void> {
    const context = (this.audioContext ||= new AudioContext());
    if (!this.analyser) this.createAnalyser(context);
    this.stop();
    this.liveStream = stream;
    this.liveSource = context.createMediaStreamSource(stream);
    this.liveSource.connect(this.analyser!);
    if (context.state !== 'running') await context.resume();
    this.startTick();
  }

  private createAnalyser(context: AudioContext): AnalyserNode {
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024; // lighter for dev stability
    analyser.smoothingTimeConstant = 0.85;
    this.analyser = analyser;
    this.freqData = new Uint8Array(analyser.frequencyBinCount);
    this.timeData = new Uint8Array(analyser.fftSize);
    // Ensure output chain to speakers
    if (!this.outputGain) {
      this.outputGain = context.createGain();
      this.outputGain.gain.value = 0.8;
      try {
        this.outputGain.connect(context.destination);
      } catch {}
    }
    try {
      analyser.connect(this.outputGain);
    } catch {}
    return analyser;
  }

  setVolume(volume: number): void {
    if (!this.audioContext) return;
    const clamped = Math.max(0, Math.min(1, volume));
    if (!this.outputGain) {
      this.outputGain = this.audioContext.createGain();
      try {
        this.outputGain.connect(this.audioContext.destination);
      } catch {}
    }
    this.outputGain.gain.value = clamped;
  }

  private startTick() {
    if (this.rafId == null) this.tick();
  }

  private tick = () => {
    if (!this.analyser || !this.freqData || !this.timeData || !this.audioContext) return;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);
    const { low, mid, high } = computeBands(this.freqData);
    const rms = computeRmsFromFreq(this.freqData);
    const time = this.audioContext.currentTime - this.startTimeSec;
    const energy = computeInstantEnergy(this.timeData);
    const { isBeat } = this.detectBeat(energy, this.audioContext.currentTime);

    const frame: AudioFeaturesFrame = { time, rms, bands: { low, mid, high }, beat: isBeat };
    for (const cb of this.callbacks) cb(frame);

    this.rafId = requestAnimationFrame(this.tick);
  };

  setBeatSensitivity(s: number) {
    this.beatSensitivity = Math.max(0, Math.min(1, s));
  }

  private detectBeat(energy: number, nowSec: number): { isBeat: boolean } {
    // Maintain rolling statistics
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.maxEnergyHistory) this.energyHistory.shift();
    if (this.energyHistory.length < 8) return { isBeat: false };

    const mean = averageArray(this.energyHistory);
    let variance = 0;
    for (const e of this.energyHistory) {
      const d = e - mean;
      variance += d * d;
    }
    variance /= this.energyHistory.length;
    const std = Math.sqrt(Math.max(variance, 1e-8));

    // Sensitivity mapping: higher sensitivity → lower threshold multiplier
    const k = 2.0 - 1.5 * this.beatSensitivity; // 0.5..2.0
    const threshold = mean + k * std;
    const minInterval = 0.12; // seconds
    const canTrigger = nowSec - this.lastBeatAt > minInterval;
    const isBeat = canTrigger && energy > threshold;
    if (isBeat) this.lastBeatAt = nowSec;
    return { isBeat };
  }
}

export function computeRmsFromFreq(freq: Uint8Array): number {
  // Normalize 0..255 to 0..1 and compute RMS proxy
  let sumSquares = 0;
  const n = freq.length;
  for (let i = 0; i < n; i++) {
    const v = freq[i] / 255;
    sumSquares += v * v;
  }
  const rms = Math.sqrt(sumSquares / n);
  return rms;
}

export function computeBands(freq: Uint8Array): { low: number; mid: number; high: number } {
  // Split bins into thirds as a simple heuristic
  const n = freq.length;
  const oneThird = Math.floor(n / 3);
  const low = average(freq, 0, oneThird);
  const mid = average(freq, oneThird, 2 * oneThird);
  const high = average(freq, 2 * oneThird, n);
  return { low, mid, high };
}

function average(arr: Uint8Array, from: number, to: number): number {
  const len = Math.max(1, to - from);
  let sum = 0;
  for (let i = from; i < to; i++) sum += arr[i];
  return sum / len / 255; // normalize 0..1
}

export function computeInstantEnergy(timeData: Uint8Array): number {
  // Convert 0..255 centered around ~128 to -1..1
  const n = timeData.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = (timeData[i] - 128) / 128;
    sum += s * s;
  }
  return sum / n;
}

function averageArray(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}


