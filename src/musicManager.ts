const DEFAULT_PALETTES = {
  derelict: {
    name: "Derelict Choir",
    root: 43,
    mode: [0, 2, 3, 5, 7, 8, 11],
    bpm: 92,
    density: 0.54,
    danger: 0.34,
    drive: 0.42,
    chaos: 0.28,
    brightness: 0.38,
    swing: 0.06,
    bars: 8,
  },
  combat: {
    name: "Hull Breach Onslaught",
    root: 38,
    mode: [0, 1, 3, 5, 6, 8, 10],
    bpm: 154,
    density: 0.92,
    danger: 0.86,
    drive: 0.95,
    chaos: 0.66,
    brightness: 0.72,
    swing: 0.018,
    bars: 8,
  },
  sanctum: {
    name: "Black Sanctum Engine",
    root: 45,
    mode: [0, 2, 3, 6, 7, 9, 10],
    bpm: 112,
    density: 0.68,
    danger: 0.52,
    drive: 0.58,
    chaos: 0.38,
    brightness: 0.46,
    swing: 0.04,
    bars: 8,
  },
  victory: {
    name: "Open Portal Hymn",
    root: 48,
    mode: [0, 2, 4, 7, 9],
    bpm: 106,
    density: 0.58,
    danger: 0.18,
    drive: 0.34,
    chaos: 0.16,
    brightness: 0.78,
    swing: 0.035,
    bars: 4,
  },
};

const STEPS_PER_BAR = 16;
const LOOKAHEAD_SECONDS = 0.16;
const SCHEDULE_INTERVAL_MS = 30;

function createSeededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function weightedPick(items, random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function normalizePalette(palette) {
  return {
    ...palette,
    bpm: clamp(palette.bpm ?? 120, 60, 190),
    density: clamp(palette.density ?? 0.5, 0, 1),
    danger: clamp(palette.danger ?? 0.5, 0, 1),
    drive: clamp(palette.drive ?? palette.density ?? 0.5, 0, 1),
    chaos: clamp(palette.chaos ?? palette.danger * 0.5, 0, 1),
    brightness: clamp(palette.brightness ?? 0.5, 0, 1),
    swing: clamp(palette.swing ?? 0.03, 0, 0.12),
    bars: Math.max(4, Math.min(12, Math.round(palette.bars ?? 8))),
  };
}

function distortionCurve(amount = 0.35) {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount * 80;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export class ProceduralMusicManager {
  context: AudioContext | null;
  seed: number;
  random: () => number;
  masterVolume: number;
  paletteName: string;
  palette: any;
  track: any;
  currentStep: number;
  nextStepTime: number;
  scheduler: number | null;
  started: boolean;
  muted: boolean;
  busses: any;
  noiseBuffer: AudioBuffer | null;

  constructor({
    audioContext = null,
    seed = Date.now(),
    masterVolume = 0.36,
    palette = "derelict",
  } = {}) {
    this.context = audioContext;
    this.seed = seed;
    this.random = createSeededRandom(seed);
    this.masterVolume = masterVolume;
    this.paletteName = palette;
    this.palette = normalizePalette(DEFAULT_PALETTES[palette] ?? DEFAULT_PALETTES.derelict);
    this.track = this.generateTrack(this.palette);
    this.currentStep = 0;
    this.nextStepTime = 0;
    this.scheduler = null;
    this.started = false;
    this.muted = false;
    this.busses = null;
    this.noiseBuffer = null;
  }

  async start(paletteName = null) {
    this.ensureContext();
    if (this.context.state === "suspended") await this.context.resume();
    this.createGraph();
    if (paletteName) this.setPalette(paletteName);
    if (this.started) return;
    this.currentStep = this.currentStep % this.track.totalSteps;
    this.nextStepTime = this.context.currentTime + 0.04;
    this.started = true;
    this.scheduler = window.setInterval(() => this.scheduleAhead(), SCHEDULE_INTERVAL_MS);
    this.scheduleAhead();
  }

  stop({ fadeOut = 0.9 } = {}) {
    if (!this.started || !this.context || !this.busses) return;
    window.clearInterval(this.scheduler);
    this.scheduler = null;
    this.started = false;
    const now = this.context.currentTime;
    this.busses.master.gain.cancelScheduledValues(now);
    this.busses.master.gain.setValueAtTime(this.busses.master.gain.value, now);
    this.busses.master.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
  }

  setSeed(seed) {
    if (this.seed === seed) return;
    this.seed = seed;
    this.random = createSeededRandom(seed);
    this.track = this.generateTrack(this.palette);
    if (this.context) this.noiseBuffer = this.createNoiseBuffer(2);
  }

  setPalette(name, overrides = {}) {
    const base = DEFAULT_PALETTES[name] ?? DEFAULT_PALETTES.derelict;
    this.paletteName = name;
    this.palette = normalizePalette({ ...base, ...overrides });
    this.track = this.generateTrack(this.palette);
    this.currentStep %= this.track.totalSteps;
    this.shapeBusses();
  }

  setIntensity({
    danger,
    density,
    bpm,
    drive,
    chaos,
    brightness,
  }: Partial<Record<"danger" | "density" | "bpm" | "drive" | "chaos" | "brightness", number>> = {}) {
    this.setPalette(this.paletteName, {
      ...this.palette,
      danger: danger ?? this.palette.danger,
      density: density ?? this.palette.density,
      bpm: bpm ?? this.palette.bpm,
      drive: drive ?? this.palette.drive,
      chaos: chaos ?? this.palette.chaos,
      brightness: brightness ?? this.palette.brightness,
    });
  }

  setVolume(value, rampTime = 0.18) {
    this.masterVolume = clamp(value, 0, 1);
    if (!this.busses || !this.context) return;
    const now = this.context.currentTime;
    this.busses.master.gain.cancelScheduledValues(now);
    this.busses.master.gain.setTargetAtTime(this.muted ? 0.0001 : this.masterVolume, now, rampTime);
  }

  setMuted(muted) {
    this.muted = muted;
    this.setVolume(this.masterVolume);
  }

  generateTrack(palette = this.palette) {
    const random = createSeededRandom(
      (this.seed >>> 0)
        + Math.floor(palette.bpm * 17)
        + Math.floor(palette.danger * 1009)
        + Math.floor(palette.density * 1319),
    );
    const totalSteps = STEPS_PER_BAR * palette.bars;
    const progression = this.generateProgression(palette, random);

    return {
      name: palette.name,
      bpm: palette.bpm,
      stepSeconds: 60 / palette.bpm / 4,
      totalSteps,
      progression,
      drums: this.generateDrums(palette, random, totalSteps),
      bass: this.generateBassline(palette, random, progression, totalSteps),
      lead: this.generateLead(palette, random, progression, totalSteps),
      arp: this.generateArp(palette, random, progression, totalSteps),
      stabs: this.generateStabs(palette, random, progression, totalSteps),
      texture: this.generateTexture(palette, random, progression, totalSteps),
      impacts: this.generateImpacts(palette, random, totalSteps),
    };
  }

  ensureContext() {
    if (this.context) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error("Web Audio is not supported in this browser.");
    this.context = new AudioCtor();
  }

  createGraph() {
    if (this.busses) {
      const now = this.context.currentTime;
      this.busses.master.gain.cancelScheduledValues(now);
      this.busses.master.gain.setValueAtTime(this.muted ? 0.0001 : this.masterVolume, now);
      this.shapeBusses();
      return;
    }

    const master = this.context.createGain();
    const music = this.context.createGain();
    const bass = this.context.createGain();
    const percussion = this.context.createGain();
    const fx = this.context.createGain();
    const reverb = this.context.createConvolver();
    const reverbSend = this.context.createGain();
    const delay = this.context.createDelay(0.8);
    const delaySend = this.context.createGain();
    const delayFeedback = this.context.createGain();
    const grit = this.context.createWaveShaper();
    const compressor = this.context.createDynamicsCompressor();

    master.gain.value = this.muted ? 0.0001 : this.masterVolume;
    reverb.buffer = this.createImpulseResponse(2.6, 3.1);
    delay.delayTime.value = 60 / this.palette.bpm / 4 * 3;
    delayFeedback.gain.value = 0.23;
    grit.curve = distortionCurve(this.palette.drive * 0.32);
    grit.oversample = "2x";
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 5.5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.22;

    music.connect(master);
    bass.connect(grit);
    grit.connect(master);
    percussion.connect(master);
    fx.connect(master);
    music.connect(reverbSend);
    fx.connect(reverbSend);
    reverbSend.connect(reverb);
    reverb.connect(master);
    music.connect(delaySend);
    fx.connect(delaySend);
    delaySend.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(master);
    master.connect(compressor);
    compressor.connect(this.context.destination);

    this.busses = {
      master,
      music,
      bass,
      percussion,
      fx,
      reverb,
      reverbSend,
      delay,
      delaySend,
      delayFeedback,
      grit,
      compressor,
    };
    this.noiseBuffer = this.createNoiseBuffer(2);
    this.shapeBusses();
  }

  shapeBusses() {
    if (!this.busses || !this.context) return;
    const now = this.context.currentTime;
    const p = this.palette;
    const setGain = (gain, value, ramp = 0.08) => {
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(value, now, ramp);
    };

    setGain(this.busses.master.gain, this.muted ? 0.0001 : this.masterVolume, 0.16);
    setGain(this.busses.music.gain, 0.64 + p.brightness * 0.2);
    setGain(this.busses.bass.gain, 0.74 + p.drive * 0.26);
    setGain(this.busses.percussion.gain, 0.76 + p.density * 0.25);
    setGain(this.busses.fx.gain, 0.38 + p.chaos * 0.28);
    setGain(this.busses.reverbSend.gain, 0.18 + (1 - p.danger) * 0.2 + p.brightness * 0.08, 0.2);
    setGain(this.busses.delaySend.gain, 0.08 + p.chaos * 0.13, 0.2);
    setGain(this.busses.delayFeedback.gain, 0.16 + p.chaos * 0.16, 0.2);
    this.busses.delay.delayTime.setTargetAtTime(60 / p.bpm / 4 * (p.danger > 0.6 ? 2 : 3), now, 0.2);
    this.busses.grit.curve = distortionCurve(0.14 + p.drive * 0.4);
  }

  scheduleAhead() {
    if (!this.started || !this.context) return;
    while (this.nextStepTime < this.context.currentTime + LOOKAHEAD_SECONDS) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      const swingOffset = this.currentStep % 2 === 1 ? this.track.stepSeconds * this.palette.swing : 0;
      this.nextStepTime += this.track.stepSeconds + swingOffset;
      this.currentStep = (this.currentStep + 1) % this.track.totalSteps;
    }
  }

  scheduleStep(step, time) {
    const index = step % this.track.totalSteps;
    const bar = Math.floor(index / STEPS_PER_BAR) % this.track.progression.length;
    const localStep = index % STEPS_PER_BAR;
    const chord = this.track.progression[bar];

    for (const hit of this.track.drums[index] ?? []) this.playDrum(hit, time);
    if (this.track.bass[index]) this.playBass(this.track.bass[index], time);
    if (this.track.arp[index]) this.playArp(this.track.arp[index], time);
    if (this.track.lead[index]) this.playLead(this.track.lead[index], time);
    if (this.track.stabs[index]) this.playStab(this.track.stabs[index], time);
    if (this.track.texture[index]) this.playTexture(this.track.texture[index], time);
    if (this.track.impacts[index]) this.playImpact(this.track.impacts[index], time);
    if (localStep === 0 || (this.palette.density > 0.7 && localStep === 8)) {
      this.playPad(chord.notes, time, localStep === 0 ? this.stepToSeconds(14) : this.stepToSeconds(6));
    }
  }

  generateProgression(palette, random) {
    const dangerDegrees = [0, 1, 5, 3, 0, 6, 1, 4];
    const hymnDegrees = [0, 4, 2, 5, 3, 6, 4, 1];
    const baseDegrees = palette.danger > 0.58 ? dangerDegrees : hymnDegrees;
    const degrees = [];
    for (let i = 0; i < palette.bars; i += 1) {
      let degree = baseDegrees[i % baseDegrees.length];
      if (random() < palette.chaos * 0.22) degree += random() > 0.5 ? 1 : -1;
      degrees.push((degree + palette.mode.length) % palette.mode.length);
    }

    if (palette.danger > 0.78 && random() > 0.45) degrees.splice(4, 2, 1, 1);

    return degrees.slice(0, palette.bars).map((degree, index) => {
      const chordRoot = palette.root + palette.mode[degree % palette.mode.length];
      const sharp = palette.danger > 0.52 && index % 2 === 1;
      const wide = palette.brightness > 0.65 && index % 3 === 0;
      const shape = sharp ? [0, 3, 6, 10] : wide ? [0, 7, 12, 16] : [0, 3, 7, 10];
      return {
        root: chordRoot - 24,
        notes: shape.map((interval) => chordRoot + interval),
      };
    });
  }

  generateBassline(palette, random, progression, totalSteps) {
    const bass = new Array(totalSteps).fill(null);
    const motifPool = [
      [0, 3, 6, 8, 10, 12, 14],
      [0, 4, 7, 8, 11, 14, 15],
      [0, 2, 4, 8, 9, 12, 15],
      [0, 5, 8, 10, 13, 15],
    ];
    const motif = motifPool[Math.floor(random() * motifPool.length)];

    for (let bar = 0; bar < progression.length; bar += 1) {
      const chord = progression[bar];
      const nextChord = progression[(bar + 1) % progression.length];
      const barStart = bar * STEPS_PER_BAR;
      const fillBar = bar % 4 === 3;
      for (let localStep = 0; localStep < STEPS_PER_BAR; localStep += 1) {
        const step = barStart + localStep;
        const strong = localStep === 0 || localStep === 8;
        const motifHit = motif.includes(localStep) && random() < 0.42 + palette.drive * 0.54;
        const fillHit = fillBar && localStep >= 12 && random() < palette.danger * 0.85;
        if (!strong && !motifHit && !fillHit) continue;

        const passing = fillHit ? (random() > 0.5 ? -1 : 1) : 0;
        const octave = random() < palette.danger * 0.16 ? -12 : 0;
        const targetRoot = fillHit && localStep >= 14 ? nextChord.root : chord.root;
        bass[step] = {
          note: targetRoot + passing + octave,
          duration: this.stepToSeconds(strong ? 3.4 : fillHit ? 0.8 : 1.5),
          accent: strong ? 1.26 : 0.82 + random() * 0.34,
          slide: fillHit || random() < palette.chaos * 0.18 ? random() > 0.5 ? 1.015 : 0.985 : 1,
        };
      }
    }

    return bass;
  }

  generateDrums(palette, random, totalSteps) {
    const drums = Array.from({ length: totalSteps }, () => []);

    for (let step = 0; step < totalSteps; step += 1) {
      const localStep = step % STEPS_PER_BAR;
      const bar = Math.floor(step / STEPS_PER_BAR);
      const fillBar = bar % 4 === 3;
      const finalHalf = fillBar && localStep >= 8;

      if (localStep === 0) drums[step].push({ name: "crash", accent: bar % 4 === 0 ? 1 : 0.6 });
      if (localStep % 8 === 0 || (palette.drive > 0.68 && localStep % 4 === 0)) {
        drums[step].push({ name: "kick", accent: localStep === 0 ? 1.25 : 0.92 });
      }
      if ((localStep === 7 || localStep === 15) && palette.danger > 0.58) {
        drums[step].push({ name: "kick", accent: 0.72 });
      }
      if (finalHalf && random() < palette.danger * 0.55) drums[step].push({ name: "kick", accent: 0.74 });

      if (localStep === 4 || localStep === 12) drums[step].push({ name: palette.danger > 0.54 ? "clap" : "snare", accent: 1.08 });
      if (finalHalf && localStep % 3 === 1 && random() < palette.chaos) drums[step].push({ name: "snare", accent: 0.72 });

      if (localStep % 2 === 0 || random() < palette.density * 0.42) {
        drums[step].push({ name: "hat", accent: localStep % 4 === 0 ? 0.82 : 0.54 + random() * 0.18 });
      }
      if ((localStep === 6 || localStep === 14) && random() < palette.density + palette.danger * 0.22) {
        drums[step].push({ name: "openHat", accent: 0.7 + palette.drive * 0.25 });
      }
      if ((localStep === 3 || localStep === 11 || finalHalf) && random() < palette.chaos * 0.22) {
        drums[step].push({ name: "metal", accent: 0.62 + palette.chaos * 0.34 });
      }
      if (palette.danger > 0.68 && (localStep === 10 || localStep === 14 || (finalHalf && localStep % 2 === 1))) {
        drums[step].push({ name: "tom", accent: 0.64 + random() * 0.36 });
      }
      if (random() < palette.chaos * 0.045) drums[step].push({ name: "static", accent: 0.55 + random() * 0.5 });
    }

    return drums;
  }

  generateLead(palette, random, progression, totalSteps) {
    const lead = new Array(totalSteps).fill(null);
    const weights = palette.mode.map((interval, index) => ({
      value: palette.root + 12 + interval,
      weight: index === 0 || index === 4 ? 2.4 : index === 1 && palette.danger > 0.6 ? 1.8 : 1,
    }));
    const motifLength = random() > 0.45 ? 16 : 8;
    const motif = Array.from({ length: motifLength }, (_, step) => {
      if (step % 4 === 0) return weightedPick(weights, random);
      if (random() > 0.42 + palette.density * 0.42) return null;
      return weightedPick(weights, random) + (random() < palette.brightness * 0.3 ? 12 : 0);
    });

    for (let step = 0; step < totalSteps; step += 1) {
      const localStep = step % STEPS_PER_BAR;
      const bar = Math.floor(step / STEPS_PER_BAR);
      const fillBar = bar % 4 === 3;
      const riffHit = random() < palette.density * (fillBar ? 0.62 : 0.34);
      const anchorHit = localStep === 0 || (palette.danger > 0.68 && localStep === 10);
      if (!anchorHit && !riffHit) continue;

      const motifNote = motif[(step + bar * 3) % motif.length];
      if (!motifNote) continue;
      const chord = progression[bar % progression.length];
      const chordColor = chord.notes[Math.floor(random() * chord.notes.length)] + (random() > 0.5 ? 0 : 12);
      const note = random() < 0.58 ? motifNote : chordColor;
      lead[step] = {
        note,
        duration: this.stepToSeconds(anchorHit ? 2.3 : fillBar ? 0.75 : 1.2),
        accent: anchorHit ? 1.18 : 0.78 + random() * 0.45,
        bend: palette.danger > 0.55 ? 0.982 + random() * 0.038 : 1.002,
        type: palette.danger > 0.62 ? "square" : random() > 0.5 ? "sawtooth" : "triangle",
      };
    }

    return lead;
  }

  generateArp(palette, random, progression, totalSteps) {
    const arp = new Array(totalSteps).fill(null);
    if (palette.density < 0.42) return arp;
    const rate = palette.density > 0.75 ? 1 : 2;

    for (let step = 0; step < totalSteps; step += rate) {
      const localStep = step % STEPS_PER_BAR;
      if (localStep % 4 === 0 && random() < 0.34) continue;
      if (random() > palette.density * 0.82) continue;
      const bar = Math.floor(step / STEPS_PER_BAR);
      const chord = progression[bar % progression.length];
      const note = chord.notes[(localStep + bar) % chord.notes.length] + 12 + (random() < palette.brightness * 0.2 ? 12 : 0);
      arp[step] = {
        note,
        duration: this.stepToSeconds(rate * 0.82),
        accent: localStep % 4 === 2 ? 0.78 : 0.48 + random() * 0.22,
      };
    }

    return arp;
  }

  generateStabs(palette, random, progression, totalSteps) {
    const stabs = new Array(totalSteps).fill(null);
    for (let step = 0; step < totalSteps; step += 1) {
      const localStep = step % STEPS_PER_BAR;
      const bar = Math.floor(step / STEPS_PER_BAR);
      const hit = localStep === 0 || localStep === 6 || localStep === 10 || (bar % 4 === 3 && localStep >= 12);
      if (!hit || random() > palette.danger * 0.52 + palette.drive * 0.16) continue;
      const chord = progression[bar % progression.length];
      stabs[step] = {
        notes: chord.notes.map((note) => note + (random() < 0.35 ? 12 : 0)),
        duration: this.stepToSeconds(localStep === 0 ? 1.4 : 0.7),
        accent: localStep === 0 ? 0.86 : 0.55 + random() * 0.35,
      };
    }
    return stabs;
  }

  generateTexture(palette, random, progression, totalSteps) {
    const texture = new Array(totalSteps).fill(null);
    for (let step = 0; step < totalSteps; step += 1) {
      const localStep = step % STEPS_PER_BAR;
      const bar = Math.floor(step / STEPS_PER_BAR);
      const chord = progression[bar % progression.length];
      if ((localStep === 3 || localStep === 11) && random() < palette.brightness * 0.42 + palette.chaos * 0.14) {
        texture[step] = {
          note: chord.notes[2] + 12,
          type: random() < palette.danger ? "choir" : "bell",
          accent: 0.72 + random() * 0.24,
        };
      }
      if ((localStep === 14 || (bar % 4 === 3 && localStep === 12)) && random() < palette.danger * 0.72) {
        texture[step] = { note: chord.notes[0] + 19, type: "riser", accent: 0.86 };
      }
      if (random() < palette.chaos * 0.018) texture[step] = { note: chord.notes[1] + 24, type: "glitch", accent: 0.5 + random() * 0.4 };
    }
    return texture;
  }

  generateImpacts(palette, random, totalSteps) {
    const impacts = new Array(totalSteps).fill(null);
    for (let step = 0; step < totalSteps; step += STEPS_PER_BAR) {
      const bar = Math.floor(step / STEPS_PER_BAR);
      if (bar % 4 === 0) impacts[step] = { type: "drop", accent: 0.75 + palette.danger * 0.4 };
      if (bar % 4 === 3 && palette.danger > 0.55) impacts[step + 15] = { type: "slam", accent: 0.8 + random() * 0.45 };
    }
    return impacts;
  }

  stepToSeconds(steps) {
    return (60 / this.palette.bpm / 4) * steps;
  }

  playBass(event, time) {
    const frequency = midiToFrequency(event.note);
    this.playVoice({
      frequency,
      endFrequency: frequency * event.slide,
      time,
      duration: event.duration,
      type: "sawtooth",
      volume: 0.12 * event.accent * (0.82 + this.palette.drive * 0.35),
      bus: this.busses.bass,
      attack: 0.004,
      release: 0.12,
      filter: { type: "lowpass", frequency: 520 + this.palette.brightness * 460, endFrequency: 150, q: 1.9 },
    });
    this.playVoice({
      frequency: frequency * 0.5,
      time,
      duration: event.duration * 1.08,
      type: "sine",
      volume: 0.105 * event.accent,
      bus: this.busses.bass,
      attack: 0.003,
      release: 0.18,
    });
    if (event.accent > 1.05) this.playNoiseLayer(time, 0.035, 0.032 * event.accent, 180, this.busses.percussion, "lowpass");
  }

  playLead(event, time) {
    const frequency = midiToFrequency(event.note);
    this.playVoice({
      frequency,
      endFrequency: frequency * event.bend,
      time,
      duration: event.duration,
      type: event.type,
      volume: 0.052 * event.accent * (0.75 + this.palette.brightness * 0.38),
      bus: this.busses.music,
      attack: 0.006,
      release: 0.18,
      detune: (this.random() - 0.5) * (8 + this.palette.chaos * 24),
      vibratoDepth: 3 + this.palette.chaos * 9,
      vibratoRate: 5.5 + this.palette.danger * 3,
      filter: { type: "bandpass", frequency: 1100 + event.note * 18, endFrequency: 680 + this.palette.brightness * 520, q: 2.7 },
    });
  }

  playArp(event, time) {
    const frequency = midiToFrequency(event.note);
    this.playVoice({
      frequency,
      endFrequency: frequency * 1.002,
      time,
      duration: event.duration,
      type: "triangle",
      volume: 0.022 * event.accent,
      bus: this.busses.music,
      attack: 0.003,
      release: 0.1,
      detune: (this.random() - 0.5) * 10,
      filter: { type: "highpass", frequency: 520, q: 0.8 },
    });
  }

  playStab(event, time) {
    event.notes.forEach((note, index) => {
      this.playVoice({
        frequency: midiToFrequency(note),
        endFrequency: midiToFrequency(note) * (index % 2 ? 0.992 : 1.006),
        time: time + index * 0.006,
        duration: event.duration,
        type: this.palette.danger > 0.58 ? "sawtooth" : "triangle",
        volume: 0.026 * event.accent,
        bus: this.busses.music,
        attack: 0.004,
        release: 0.16,
        detune: (index - 1.5) * 7,
        filter: { type: "bandpass", frequency: 760 + index * 210 + this.palette.brightness * 420, q: 1.6 },
      });
    });
  }

  playPad(notes, time, duration) {
    notes.forEach((note, index) => {
      this.playVoice({
        frequency: midiToFrequency(note - 12),
        endFrequency: midiToFrequency(note - 12) * (1 + (index - 1.5) * 0.0015),
        time: time + index * 0.018,
        duration,
        type: "sine",
        volume: 0.028 + this.palette.brightness * 0.012,
        bus: this.busses.music,
        attack: 0.32,
        release: 0.9,
        detune: (index - 1.5) * 9,
        vibratoDepth: 2 + this.palette.chaos * 4,
        vibratoRate: 3.2 + index * 0.4,
        filter: { type: "lowpass", frequency: 720 + this.palette.brightness * 420, endFrequency: 420, q: 0.7 },
      });
    });
    this.playNoiseLayer(time, Math.min(duration, 2.2), 0.014 + this.palette.danger * 0.012, 520, this.busses.fx);
  }

  playTexture(event, time) {
    if (event.type === "bell") this.playBell(event.note, time, event.accent);
    if (event.type === "choir") this.playChoir(event.note, time, event.accent);
    if (event.type === "riser") this.playRiser(event.note, time, event.accent);
    if (event.type === "glitch") this.playGlitch(event.note, time, event.accent);
  }

  playBell(note, time, accent = 1) {
    const frequency = midiToFrequency(note);
    [1, 2.01, 3.87].forEach((ratio, index) => {
      this.playVoice({
        frequency: frequency * ratio,
        time,
        duration: 1.7 - index * 0.25,
        type: "sine",
        volume: (0.035 * accent) / (index + 1),
        bus: this.busses.fx,
        attack: 0.004,
        release: 1.05,
        filter: { type: "highpass", frequency: 260, q: 0.5 },
      });
    });
  }

  playChoir(note, time, accent = 1) {
    [-12, 0, 7, 12].forEach((offset, index) => {
      this.playVoice({
        frequency: midiToFrequency(note + offset),
        endFrequency: midiToFrequency(note + offset) * (1 + (index - 1.5) * 0.003),
        time: time + index * 0.026,
        duration: 2.1 + this.palette.brightness * 0.6,
        type: "triangle",
        volume: 0.02 * accent,
        bus: this.busses.fx,
        attack: 0.18,
        release: 0.72,
        detune: (this.random() - 0.5) * 18,
        vibratoDepth: 4 + this.palette.chaos * 8,
        vibratoRate: 4.4 + index,
        filter: { type: "bandpass", frequency: 720 + index * 120, q: 0.9 },
      });
    });
  }

  playRiser(note, time, accent = 1) {
    this.playVoice({
      frequency: midiToFrequency(note - 12),
      endFrequency: midiToFrequency(note + 7),
      time,
      duration: this.stepToSeconds(2.8),
      type: "sawtooth",
      volume: 0.04 * accent,
      bus: this.busses.fx,
      attack: 0.03,
      release: 0.18,
      filter: { type: "bandpass", frequency: 360, endFrequency: 2400 + this.palette.brightness * 900, q: 3.1 },
    });
    this.playNoiseLayer(time, this.stepToSeconds(2.7), 0.042 * accent, 1900, this.busses.fx, "bandpass", 6800);
  }

  playGlitch(note, time, accent = 1) {
    for (let i = 0; i < 4; i += 1) {
      this.playVoice({
        frequency: midiToFrequency(note + (this.random() > 0.5 ? 12 : -7)),
        endFrequency: midiToFrequency(note + (this.random() > 0.5 ? -12 : 7)),
        time: time + i * 0.025,
        duration: 0.055,
        type: "square",
        volume: 0.018 * accent,
        bus: this.busses.fx,
        attack: 0.002,
        release: 0.035,
        filter: { type: "bandpass", frequency: 1200 + i * 900, q: 5.4 },
      });
    }
  }

  playImpact(event, time) {
    if (event.type === "drop") {
      this.playVoice({
        frequency: 92,
        endFrequency: 34,
        time,
        duration: 0.5,
        type: "sine",
        volume: 0.12 * event.accent,
        bus: this.busses.bass,
        attack: 0.004,
        release: 0.34,
      });
      this.playNoiseLayer(time, 0.28, 0.052 * event.accent, 420, this.busses.fx, "lowpass", 120);
    } else {
      this.playDrum({ name: "kick", accent: 1.35 * event.accent }, time);
      this.playDrum({ name: "crash", accent: 0.9 * event.accent }, time + 0.01);
    }
  }

  playDrum(hit, time) {
    const name = typeof hit === "string" ? hit : hit.name;
    const accent = typeof hit === "string" ? 1 : hit.accent ?? 1;
    if (name === "kick") this.playKick(time, accent);
    if (name === "snare") this.playSnare(time, accent);
    if (name === "clap") this.playClap(time, accent);
    if (name === "hat") this.playHat(time, accent);
    if (name === "openHat") this.playOpenHat(time, accent);
    if (name === "metal") this.playMetal(time, accent);
    if (name === "tom") this.playTom(time, accent);
    if (name === "static") this.playNoiseLayer(time, 0.11, 0.034 * accent, 2600, this.busses.percussion);
    if (name === "crash") this.playCrash(time, accent);
  }

  playKick(time, accent = 1) {
    this.playVoice({
      frequency: 122,
      endFrequency: 38,
      time,
      duration: 0.24,
      type: "sine",
      volume: 0.19 * accent,
      bus: this.busses.percussion,
      attack: 0.002,
      release: 0.18,
    });
    this.playVoice({
      frequency: 58,
      endFrequency: 42,
      time: time + 0.006,
      duration: 0.19,
      type: "triangle",
      volume: 0.055 * accent,
      bus: this.busses.bass,
      attack: 0.002,
      release: 0.12,
    });
    this.playNoiseLayer(time, 0.04, 0.045 * accent, 130, this.busses.percussion, "lowpass");
  }

  playSnare(time, accent = 1) {
    this.playNoiseLayer(time, 0.15, 0.088 * accent, 1900, this.busses.percussion);
    this.playNoiseLayer(time + 0.012, 0.08, 0.048 * accent, 5200, this.busses.percussion, "highpass");
    this.playVoice({
      frequency: 188,
      endFrequency: 146,
      time,
      duration: 0.11,
      type: "triangle",
      volume: 0.052 * accent,
      bus: this.busses.percussion,
    });
  }

  playClap(time, accent = 1) {
    [0, 0.018, 0.036, 0.061].forEach((offset, index) => {
      this.playNoiseLayer(time + offset, 0.06 + index * 0.014, 0.042 * accent, 2300 + index * 380, this.busses.percussion);
    });
  }

  playHat(time, accent = 1) {
    this.playNoiseLayer(time, 0.045, 0.027 * accent, 6400, this.busses.percussion, "highpass");
  }

  playOpenHat(time, accent = 1) {
    this.playNoiseLayer(time, 0.17, 0.038 * accent, 7200, this.busses.percussion, "highpass");
  }

  playMetal(time, accent = 1) {
    [301, 427, 537, 779].forEach((frequency, index) => {
      this.playVoice({
        frequency,
        endFrequency: frequency * (0.91 + index * 0.01),
        time: time + index * 0.005,
        duration: 0.16 + index * 0.02,
        type: "square",
        volume: 0.018 * accent,
        bus: this.busses.percussion,
        filter: { type: "bandpass", frequency: frequency * 2.5, q: 5.2 },
      });
    });
  }

  playTom(time, accent = 1) {
    this.playVoice({
      frequency: 160 + this.random() * 45,
      endFrequency: 72,
      time,
      duration: 0.2,
      type: "sine",
      volume: 0.085 * accent,
      bus: this.busses.percussion,
    });
  }

  playCrash(time, accent = 1) {
    this.playNoiseLayer(time, 0.58, 0.036 * accent, 6800, this.busses.percussion, "highpass");
    this.playMetal(time, 0.45 * accent);
  }

  playVoice({
    frequency,
    endFrequency = frequency,
    time,
    duration,
    type,
    volume,
    bus,
    attack = 0.012,
    release = 0.2,
    detune = 0,
    vibratoDepth = 0,
    vibratoRate = 5,
    filter = null,
  }) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filterNode = filter ? this.context.createBiquadFilter() : null;
    const endTime = time + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), time);
    if (Math.abs(endFrequency - frequency) > 0.001) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), endTime);
    }
    oscillator.detune.value = detune;

    let lfo = null;
    let lfoGain = null;
    if (vibratoDepth > 0) {
      lfo = this.context.createOscillator();
      lfoGain = this.context.createGain();
      lfo.frequency.value = vibratoRate;
      lfoGain.gain.value = vibratoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.detune);
      lfo.start(time);
      lfo.stop(endTime + release + 0.05);
    }

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.max(0.001, attack));
    gain.gain.setTargetAtTime(0.0001, Math.max(time + attack, endTime - release), release * 0.34);

    if (filter && filterNode) {
      filterNode.type = (filter.type ?? "lowpass") as BiquadFilterType;
      filterNode.frequency.setValueAtTime(filter.frequency ?? 900, time);
      filterNode.frequency.exponentialRampToValueAtTime(Math.max(20, filter.endFrequency ?? filter.frequency ?? 900), endTime);
      filterNode.Q.value = filter.q ?? 1;
      oscillator.connect(filterNode);
      filterNode.connect(gain);
    } else {
      oscillator.connect(gain);
    }

    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(endTime + release + 0.05);
  }

  playNoiseLayer(time, duration, volume, frequency, bus, filterType: BiquadFilterType = "bandpass", endFrequency = frequency) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, time);
    if (Math.abs(endFrequency - frequency) > 1) filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    filter.Q.value = filterType === "bandpass" ? 1.8 : 0.68;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  createNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      last = last * 0.72 + (this.random() * 2 - 1) * 0.28;
      data[i] = last;
    }
    return buffer;
  }

  createImpulseResponse(seconds, decay) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const tail = (1 - i / length) ** decay;
        data[i] = (this.random() * 2 - 1) * tail;
      }
    }
    return buffer;
  }
}

export function createProceduralMusicManager(options = {}) {
  return new ProceduralMusicManager(options);
}

export const musicPalettes = DEFAULT_PALETTES;
