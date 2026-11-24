let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.08,
  delay = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export const soundFx = {
  tap(enabled: boolean) {
    if (!enabled) return;
    playTone(580, 0.075, 'triangle', 0.065);
  },

  locked(enabled: boolean) {
    if (!enabled) return;
    playTone(210, 0.11, 'sine', 0.06);
    playTone(175, 0.12, 'sine', 0.05, 0.07);
  },

  /**
   * Realistic flowing liquid pouring sound effect:
   * combines a sweeping resonant bandpass liquid-stream texture with rising glassy water droplets.
   */
  pouring(enabled: boolean, durationMs = 320, units = 1) {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    const durSec = Math.max(0.18, Math.min(0.65, durationMs / 1000));
    const bubbleCount = Math.max(2, Math.min(5, units + 2));
    const now = ctx.currentTime;

    try {
      // 1. Continuous soft flowing liquid stream (filtered noise with rising pitch as jar fills)
      const bufferSize = Math.floor(ctx.sampleRate * durSec);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        output[i] = (b0 + b1 + b2 + white * 0.14) * 0.9;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(3.2, now);
      bandpass.frequency.setValueAtTime(680, now);
      bandpass.frequency.exponentialRampToValueAtTime(1480, now + durSec);

      const streamGain = ctx.createGain();
      streamGain.gain.setValueAtTime(0.0001, now);
      streamGain.gain.exponentialRampToValueAtTime(0.085, now + 0.04);
      streamGain.gain.setValueAtTime(0.075, now + durSec * 0.72);
      streamGain.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

      noise.connect(bandpass);
      bandpass.connect(streamGain);
      streamGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + durSec + 0.02);

      // 2. Rising bubbly glug droplets synchronized with the stream
      const step = durSec / bubbleCount;
      for (let i = 0; i < bubbleCount; i++) {
        const start = now + i * step * 0.85;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = 340 + i * 92 + units * 20;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, start);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.56, start + 0.095);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.068, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.105);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.115);
      }
    } catch {
      playTone(440, 0.12, 'sine', 0.07);
      playTone(587.33, 0.14, 'triangle', 0.06, 0.06);
    }
  },

  pour(enabled: boolean, units = 1) {
    this.pouring(enabled, 300, units);
  },

  jarComplete(enabled: boolean) {
    if (!enabled) return;
    playTone(587.33, 0.12, 'triangle', 0.075, 0);
    playTone(783.99, 0.14, 'triangle', 0.08, 0.06);
    playTone(1174.66, 0.24, 'sine', 0.085, 0.12);
  },

  reward(enabled: boolean) {
    if (!enabled) return;
    playTone(523.25, 0.14, 'triangle', 0.08, 0);
    playTone(659.25, 0.16, 'triangle', 0.08, 0.09);
    playTone(783.99, 0.22, 'triangle', 0.09, 0.18);
    playTone(1046.5, 0.32, 'sine', 0.08, 0.27);
  },

  victory(enabled: boolean) {
    if (!enabled) return;
    const notes = [587.33, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => playTone(n, 0.16, 'triangle', 0.085, idx * 0.048));
  },
};
