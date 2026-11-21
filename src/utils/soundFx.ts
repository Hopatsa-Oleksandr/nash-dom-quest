// Pure Web Audio API synthesized sound effects for atmospheric escape-room feedback

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playRadioWhiteNoise(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Randomized short white-noise radio fragment (130ms - 260ms)
  const duration = 0.13 + Math.random() * 0.13;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  // Pure white noise with subtle random signal dropouts & static bursts
  let dropoutSamples = 0;
  for (let i = 0; i < bufferSize; i++) {
    if (dropoutSamples > 0) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
      dropoutSamples--;
    } else {
      if (Math.random() < 0.004) {
        dropoutSamples = Math.floor(ctx.sampleRate * (0.008 + Math.random() * 0.018));
      }
      data[i] = Math.random() * 2 - 1;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 500 + Math.random() * 450;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1400 + Math.random() * 1400;
  bandpass.Q.value = 0.8 + Math.random() * 1.4;

  const gain = ctx.createGain();
  const peak = 0.075 + Math.random() * 0.045;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.012);
  gain.gain.setValueAtTime(peak * (0.7 + Math.random() * 0.25), now + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
}

export function playRadioCrackle(mode: 'short' | 'burst' = 'short'): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const duration =
    mode === 'burst'
      ? 0.08 + Math.random() * 0.14
      : 0.03 + Math.random() * 0.065;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  // Build gritty sparse impulse crackles + low-level radio static hiss
  for (let i = 0; i < bufferSize; i++) {
    const spike = Math.random() < (mode === 'burst' ? 0.045 : 0.025) ? (Math.random() * 2 - 1) * 1.15 : 0;
    const hiss = (Math.random() * 2 - 1) * (mode === 'burst' ? 0.24 : 0.14);
    const envelope = Math.sin((i / bufferSize) * Math.PI);
    data[i] = Math.max(-1, Math.min(1, (spike + hiss) * (0.4 + 0.6 * envelope)));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1100 + Math.random() * 1700;
  bandpass.Q.value = 1.1 + Math.random() * 2.2;

  const gain = ctx.createGain();
  const peakGain = mode === 'burst' ? 0.085 + Math.random() * 0.045 : 0.045 + Math.random() * 0.035;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);

  // Occasional secondary micro-pop 30-90ms later to feel like faulty reception
  if (mode === 'burst' && Math.random() < 0.7) {
    const popDelay = 0.035 + Math.random() * 0.07;
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'square';
    popOsc.frequency.setValueAtTime(420 + Math.random() * 900, now + popDelay);
    popGain.gain.setValueAtTime(0.03, now + popDelay);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + popDelay + 0.018);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now + popDelay);
    popOsc.stop(now + popDelay + 0.02);
  }
}

export function playRadioClick(start: boolean): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Short crisp walkie-talkie beep + randomized frequency jitter
  const jitter = (Math.random() - 0.5) * 60;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime((start ? 1180 : 760) + jitter, now);
  osc.frequency.exponentialRampToValueAtTime((start ? 1560 : 520) + jitter, now + 0.055);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);

  // Subtle squelch hiss
  const bufferSize = Math.floor(ctx.sampleRate * 0.06);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.28;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1650 + Math.random() * 550;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.065, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // Layer a short randomized crackle right after the squelch
  window.setTimeout(() => {
    playRadioCrackle('short');
  }, 40 + Math.floor(Math.random() * 75));
}

export function playItemPickup(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    gain.gain.setValueAtTime(0.08, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.24);
  });
}

export function playKeypadTone(digit: string): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const base = 440 + (parseInt(digit, 10) || 0) * 48;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base, now);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playErrorBuzz(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(165, now);
  osc.frequency.setValueAtTime(135, now + 0.12);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.28);
}

export function playSuccessUnlock(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.075);
    gain.gain.setValueAtTime(0.09, now + idx * 0.075);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.075);
    osc.stop(now + idx * 0.075 + 0.32);
  });
}

export function playDoorSlam(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Low heavy pneumatic thud
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(34, now + 0.42);
  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.55);

  // Metallic rattle burst
  const bufferSize = Math.floor(ctx.sampleRate * 0.25);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 650;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.22, now);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(ctx.destination);
  noise.start(now);
}

export function playDoorReleaseVictory(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Pneumatic air hiss
  const bufferSize = Math.floor(ctx.sampleRate * 0.55);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1400;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.11, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(ctx.destination);
  noise.start(now);

  // Warm victorious chord
  const chord = [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + 0.25 + i * 0.08);
    gain.gain.setValueAtTime(0.085, now + 0.25 + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + 0.25 + i * 0.08);
    osc.stop(now + 1.25);
  });
}

export function playTransferWhoosh(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

export function playRemoteEffectSfx(kind: 'light' | 'alarm' | 'surge' | 'ping'): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (kind === 'light') {
    // Fluorescent relay clicks & electric hum
    [0, 0.14, 0.36, 0.58].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120 + Math.random() * 45, now + offset);
      gain.gain.setValueAtTime(0.055, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
    return;
  }

  if (kind === 'alarm') {
    // Twin S-Bahn cabin warning pulse
    [0, 0.26].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now + offset);
      osc.frequency.setValueAtTime(510, now + offset + 0.1);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.21);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
    return;
  }

  if (kind === 'surge') {
    // Power dip & electrical arc recovery
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.55);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.62);
    return;
  }

  // 'ping' — classic German railway two-tone diagnostic chime
  [659.25, 880].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.14);
    gain.gain.setValueAtTime(0.08, now + idx * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.34);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.14);
    osc.stop(now + idx * 0.14 + 0.36);
  });
}

export function playEmergencySiren(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const cycles = 3;
  const cycleDur = 1.05;
  const totalDur = cycles * cycleDur;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, now);
  masterGain.gain.linearRampToValueAtTime(0.14, now + 0.08);
  masterGain.gain.setValueAtTime(0.14, now + totalDur - 0.35);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + totalDur);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1850;
  filter.Q.value = 1.8;

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  const oscMain = ctx.createOscillator();
  const oscSub = ctx.createOscillator();
  oscMain.type = 'sawtooth';
  oscSub.type = 'triangle';

  const subGain = ctx.createGain();
  subGain.gain.value = 0.55;

  oscMain.connect(filter);
  oscSub.connect(subGain);
  subGain.connect(filter);

  // Schedule 3 urgent rising-and-falling European emergency siren sweeps
  for (let i = 0; i < cycles; i++) {
    const t0 = now + i * cycleDur;
    const tPeak = t0 + cycleDur * 0.52;
    const tEnd = t0 + cycleDur;
    oscMain.frequency.setValueAtTime(520, t0);
    oscMain.frequency.exponentialRampToValueAtTime(980, tPeak);
    oscMain.frequency.exponentialRampToValueAtTime(510, tEnd);

    oscSub.frequency.setValueAtTime(260, t0);
    oscSub.frequency.exponentialRampToValueAtTime(490, tPeak);
    oscSub.frequency.exponentialRampToValueAtTime(255, tEnd);
  }

  oscMain.start(now);
  oscSub.start(now);
  oscMain.stop(now + totalDur + 0.05);
  oscSub.stop(now + totalDur + 0.05);
}
