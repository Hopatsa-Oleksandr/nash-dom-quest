// Procedural Web Audio API ambient track engine for "Останній рейс S2"
// Synthesizes rhythmic wheels-on-rails rumble + S-Bahn transformer hum + isolation ambience,
// smoothly adapting to quest phase, partner connection, remote power surges, and PTT voice ducking.

export interface AmbientParams {
  active: boolean;
  muted: boolean;
  phase: 'playing' | 'transition' | 'victory';
  sceneMode: 'shared' | 'split';
  hatchOpened: boolean;
  keypadUnlocked: boolean;
  fuseInserted: boolean;
  leversHeld: boolean;
  partnerConnected: boolean;
  isRadioSpeaking: boolean;
  remoteSurgeActive: boolean;
}

class TrainAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private railRumbleGain: GainNode | null = null;
  private railFilter: BiquadFilterNode | null = null;
  private transformerGain: GainNode | null = null;
  private transformerFilter: BiquadFilterNode | null = null;
  private humOscA: OscillatorNode | null = null;
  private humOscB: OscillatorNode | null = null;
  private humOscC: OscillatorNode | null = null;
  private isolationAirGain: GainNode | null = null;
  private isolationFilter: BiquadFilterNode | null = null;

  private clackTimer: number | null = null;
  private currentParams: AmbientParams | null = null;
  private initialized = false;

  private ensureInitialized(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return false;

    const ctx = new AudioContextCtor();
    this.ctx = ctx;

    // Master bus
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // Shared 4-second looping pink/brownish noise buffer for rail rumble & night air
    const bufferLen = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      // Smooth brown-ish noise for deep rolling wheel rumble
      lastOut = (lastOut + 0.035 * white) / 1.035;
      data[i] = lastOut * 3.2;
    }

    // --- LAYER 1: Rolling wheels on rails (continuous bogie rumble) ---
    const railSource = ctx.createBufferSource();
    railSource.buffer = noiseBuffer;
    railSource.loop = true;

    const railFilter = ctx.createBiquadFilter();
    railFilter.type = 'lowpass';
    railFilter.frequency.setValueAtTime(140, ctx.currentTime);
    railFilter.Q.setValueAtTime(1.4, ctx.currentTime);

    const railRumbleGain = ctx.createGain();
    railRumbleGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    railSource.connect(railFilter);
    railFilter.connect(railRumbleGain);
    railRumbleGain.connect(masterGain);
    railSource.start();

    this.railFilter = railFilter;
    this.railRumbleGain = railRumbleGain;

    // --- LAYER 2: S-Bahn Transformer & Inverter Hum (50Hz + 100Hz + 150Hz) ---
    const transformerFilter = ctx.createBiquadFilter();
    transformerFilter.type = 'lowpass';
    transformerFilter.frequency.setValueAtTime(220, ctx.currentTime);
    transformerFilter.Q.setValueAtTime(2.0, ctx.currentTime);

    const transformerGain = ctx.createGain();
    transformerGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const humOscA = ctx.createOscillator();
    humOscA.type = 'sine';
    humOscA.frequency.setValueAtTime(50, ctx.currentTime);

    const humOscB = ctx.createOscillator();
    humOscB.type = 'triangle';
    humOscB.frequency.setValueAtTime(100.3, ctx.currentTime);

    const humOscC = ctx.createOscillator();
    humOscC.type = 'sawtooth';
    humOscC.frequency.setValueAtTime(150.6, ctx.currentTime);

    const gainA = ctx.createGain();
    gainA.gain.value = 0.65;
    const gainB = ctx.createGain();
    gainB.gain.value = 0.28;
    const gainC = ctx.createGain();
    gainC.gain.value = 0.1;

    // Gentle LFO breathing on the transformer filter
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(28, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(transformerFilter.frequency);
    lfo.start();

    humOscA.connect(gainA).connect(transformerFilter);
    humOscB.connect(gainB).connect(transformerFilter);
    humOscC.connect(gainC).connect(transformerFilter);
    transformerFilter.connect(transformerGain);
    transformerGain.connect(masterGain);

    humOscA.start();
    humOscB.start();
    humOscC.start();

    this.humOscA = humOscA;
    this.humOscB = humOscB;
    this.humOscC = humOscC;
    this.transformerFilter = transformerFilter;
    this.transformerGain = transformerGain;

    // --- LAYER 3: Eerie cabin air / isolation hiss ---
    const airSource = ctx.createBufferSource();
    airSource.buffer = noiseBuffer;
    airSource.loop = true;

    const isolationFilter = ctx.createBiquadFilter();
    isolationFilter.type = 'bandpass';
    isolationFilter.frequency.setValueAtTime(520, ctx.currentTime);
    isolationFilter.Q.setValueAtTime(0.9, ctx.currentTime);

    const isolationAirGain = ctx.createGain();
    isolationAirGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    airSource.connect(isolationFilter);
    isolationFilter.connect(isolationAirGain);
    isolationAirGain.connect(masterGain);
    airSource.start();

    this.isolationFilter = isolationFilter;
    this.isolationAirGain = isolationAirGain;

    this.initialized = true;
    return true;
  }

  private playRailJointClack(intensity: number): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master || ctx.state !== 'running') return;
    if (!this.currentParams?.active || this.currentParams.muted) return;

    const now = ctx.currentTime;
    // Double wheel-bogie clack: "tuk-tuk" over rail joints
    [0, 0.145].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 92 : 78, now + offset);
      osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.075);

      const amp = intensity * (idx === 0 ? 0.14 : 0.105);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(amp, now + offset + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + offset + 0.095);
    });
  }

  private scheduleRailClacks(): void {
    if (this.clackTimer !== null) {
      window.clearTimeout(this.clackTimer);
      this.clackTimer = null;
    }

    const params = this.currentParams;
    if (!params || !params.active || params.muted) return;
    // Only play wheel-on-rail clacks while train is in motion (Scene 1)
    if (params.phase !== 'playing' || params.sceneMode !== 'shared') return;

    const intervalMs = params.hatchOpened ? 1750 : 1080;
    const intensity = params.hatchOpened ? 0.55 : 0.92;

    this.clackTimer = window.setTimeout(() => {
      this.playRailJointClack(intensity);
      this.scheduleRailClacks();
    }, intervalMs + Math.floor((Math.random() - 0.5) * 140));
  }

  public unlock(): void {
    if (this.currentParams?.active && !this.currentParams.muted) {
      this.ensureInitialized();
      if (this.currentParams) {
        this.update(this.currentParams);
      }
    }
  }

  public update(params: AmbientParams): void {
    this.currentParams = params;

    if (!params.active || params.muted) {
      if (this.clackTimer !== null) {
        window.clearTimeout(this.clackTimer);
        this.clackTimer = null;
      }
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.25);
      }
      return;
    }

    if (!this.ensureInitialized() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Master volume smoothly ducks when PTT radio is active so voice stays clear
    const targetMaster = params.isRadioSpeaking ? 0.42 : 0.85;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.22);

    // Compute layer targets by quest phase + partner link state
    let railVol = 0.0001;
    let railCutoff = 140;
    let humVol = 0.035;
    let humCutoff = 210;
    let humFreqBase = 50;
    let airVol = 0.02;
    let airFreq = 520;

    if (params.phase === 'victory') {
      // Open Stuttgart night platform: quiet open breeze, distant idle hum
      railVol = 0.0001;
      humVol = 0.014;
      humCutoff = 130;
      airVol = 0.048;
      airFreq = 380;
    } else if (params.phase === 'transition') {
      // Emergency stop & doors slamming
      railVol = 0.09;
      railCutoff = 95;
      humVol = 0.068;
      humCutoff = 260;
      humFreqBase = 46;
      airVol = 0.05;
    } else if (params.sceneMode === 'shared') {
      // Scene 1: moving on tracks -> slowing down after hatch opened
      railVol = params.hatchOpened ? 0.12 : 0.22;
      railCutoff = params.hatchOpened ? 120 : 175;
      humVol = params.hatchOpened ? 0.045 : 0.055;
      humCutoff = params.hatchOpened ? 200 : 240;
      airVol = 0.024;
    } else {
      // Scene 2 (split): stopped train, eerie transformer tension building as systems come online
      railVol = 0.015;
      railCutoff = 75;
      if (params.leversHeld && params.keypadUnlocked && params.fuseInserted) {
        humVol = 0.095;
        humCutoff = 380;
        humFreqBase = 58;
        airVol = 0.04;
      } else if (params.keypadUnlocked && params.fuseInserted) {
        humVol = 0.072;
        humCutoff = 310;
        humFreqBase = 54;
        airVol = 0.03;
      } else if (params.keypadUnlocked || params.fuseInserted) {
        humVol = 0.052;
        humCutoff = 245;
        humFreqBase = 51.5;
        airVol = 0.028;
      } else {
        humVol = 0.036;
        humCutoff = 165;
        humFreqBase = 48.5;
        airVol = 0.032;
      }
    }

    // Isolation modulation when partner connection is lost/waiting
    if (!params.partnerConnected && params.phase !== 'victory') {
      railCutoff *= 0.72;
      humCutoff *= 0.78;
      humFreqBase -= 1.8; // Slight unsettling detune when isolated
      airVol += 0.038;
      airFreq = 780;
    }

    // Power surge remote effect momentarily drops transformer pitch & boosts buzz
    if (params.remoteSurgeActive) {
      humFreqBase -= 6.5;
      humVol = Math.min(0.11, humVol + 0.035);
      humCutoff += 140;
    }

    const ramp = 0.75;
    this.railRumbleGain?.gain.setTargetAtTime(railVol, now, ramp);
    this.railFilter?.frequency.setTargetAtTime(railCutoff, now, ramp);

    this.transformerGain?.gain.setTargetAtTime(humVol, now, ramp);
    this.transformerFilter?.frequency.setTargetAtTime(humCutoff, now, ramp);
    this.humOscA?.frequency.setTargetAtTime(humFreqBase, now, 0.45);
    this.humOscB?.frequency.setTargetAtTime(humFreqBase * 2 + 0.35, now, 0.45);
    this.humOscC?.frequency.setTargetAtTime(humFreqBase * 3 + 0.65, now, 0.45);

    this.isolationAirGain?.gain.setTargetAtTime(airVol, now, ramp);
    this.isolationFilter?.frequency.setTargetAtTime(airFreq, now, ramp);

    // Start/adjust rhythmic rail-joint clacks when moving in Scene 1
    if (params.phase === 'playing' && params.sceneMode === 'shared') {
      if (this.clackTimer === null) {
        this.scheduleRailClacks();
      }
    } else if (this.clackTimer !== null) {
      window.clearTimeout(this.clackTimer);
      this.clackTimer = null;
    }
  }

  public stop(): void {
    if (this.clackTimer !== null) {
      window.clearTimeout(this.clackTimer);
      this.clackTimer = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.2);
    }
  }
}

export const trainAmbientEngine = new TrainAmbientEngine();
