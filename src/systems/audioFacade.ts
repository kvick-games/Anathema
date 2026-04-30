import { createProceduralMusicManager } from "../musicManager.js";

interface AudioSnapshot {
  player: {
    hp: number;
    sanity: number;
    goon: number;
    kills: number;
    decay: number;
  };
  wave: number;
  waveHostileCount: number;
  enemiesLength: number;
  portalActive: boolean;
  input: { left: boolean; right: boolean };
  keys: Set<string>;
  levelSeed: number;
}

interface ToneFilter {
  type?: BiquadFilterType;
  frequency?: number;
  endFrequency?: number;
  q?: number;
}

interface ToneOptions {
  frequency?: number;
  endFrequency?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  filter?: ToneFilter | null;
}

interface NoiseOptions {
  duration?: number;
  volume?: number;
  delay?: number;
  filter?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function createAudioFacade() {
  let audioContext: AudioContext | null = null;
  let audioUnlocked = false;
  let musicManager: ReturnType<typeof createProceduralMusicManager> | null = null;
  let musicStateKey = "";

  function deckMusicName(snapshot: AudioSnapshot) {
    if (snapshot.portalActive) return "victory";
    if (snapshot.enemiesLength > 0) {
      return snapshot.player.sanity < 42 || snapshot.enemiesLength > Math.max(4, snapshot.waveHostileCount * 0.45) ? "combat" : "sanctum";
    }
    return snapshot.wave % 3 === 0 ? "sanctum" : "derelict";
  }

  function deckMusicSettings(snapshot: AudioSnapshot) {
    const expectedHostiles = Math.max(5, snapshot.waveHostileCount || 5 + Math.floor(snapshot.wave * 1.8));
    const pressure = clamp(snapshot.enemiesLength / expectedHostiles, 0, 1);
    const lowSanity = clamp((78 - snapshot.player.sanity) / 78, 0, 1);
    const lowHp = clamp((72 - snapshot.player.hp) / 72, 0, 1);
    const deckHeat = clamp(snapshot.wave / 9, 0, 1);
    const actionHeat = snapshot.input.left || snapshot.input.right ? 1 : snapshot.keys.has("ShiftLeft") || snapshot.keys.has("ShiftRight") ? 0.65 : 0;
    const goonHeat = clamp(snapshot.player.goon / 100, 0, 1);
    const seedVariance = (Math.sin(snapshot.levelSeed * 7.31 + snapshot.wave * 1.73) + 1) * 0.5;
    const danger = snapshot.portalActive
      ? 0.16
      : clamp(0.26 + pressure * 0.42 + lowSanity * 0.27 + lowHp * 0.2 + deckHeat * 0.18 + actionHeat * 0.1, 0.18, 0.98);

    return {
      danger,
      density: snapshot.portalActive
        ? 0.6
        : clamp(0.54 + pressure * 0.3 + goonHeat * 0.16 + deckHeat * 0.12 + actionHeat * 0.1, 0.44, 0.98),
      drive: snapshot.portalActive
        ? 0.36
        : clamp(0.48 + pressure * 0.34 + goonHeat * 0.2 + actionHeat * 0.18 + deckHeat * 0.1, 0.38, 1),
      chaos: snapshot.portalActive
        ? 0.18
        : clamp(0.12 + lowSanity * 0.35 + pressure * 0.2 + deckHeat * 0.16 + seedVariance * 0.14, 0.08, 0.86),
      brightness: snapshot.portalActive
        ? 0.82
        : clamp(0.34 + goonHeat * 0.16 + deckHeat * 0.1 + (1 - lowSanity) * 0.12, 0.26, 0.74),
      bpm: Math.round(snapshot.portalActive
        ? 104 + Math.min(18, snapshot.wave * 2)
        : snapshot.enemiesLength > 0
          ? 118 + snapshot.wave * 4 + pressure * 36 + danger * 20 + actionHeat * 10
          : 88 + snapshot.wave * 2.5 + lowSanity * 12),
      bars: snapshot.portalActive ? 4 : 8,
    };
  }

  function deckMusicSeed(snapshot: AudioSnapshot) {
    return Math.floor(snapshot.levelSeed * 1000 + snapshot.wave * 7919 + Math.floor(snapshot.player.kills / 2) * 313 + Math.floor(snapshot.player.decay * 10) * 29);
  }

  function updateMusic(snapshot: AudioSnapshot, force = false) {
    if (!musicManager) return;
    const palette = deckMusicName(snapshot);
    const settings = deckMusicSettings(snapshot);
    const stateKey = [
      palette,
      snapshot.wave,
      Math.floor(snapshot.enemiesLength / 2),
      Math.floor(snapshot.player.kills / 3),
      Math.round(settings.danger * 12),
      Math.round(settings.density * 12),
      Math.round(settings.drive * 12),
      Math.round(settings.chaos * 10),
      Math.round(settings.bpm / 4),
      snapshot.portalActive ? "portal" : "deck",
    ].join(":");
    if (!force && stateKey === musicStateKey) return;
    musicStateKey = stateKey;
    musicManager.setSeed(deckMusicSeed(snapshot));
    musicManager.setPalette(palette, settings);
  }

  function startMusic(snapshot: AudioSnapshot) {
    if (!audioContext) return;
    musicManager ??= createProceduralMusicManager({
      audioContext,
      seed: deckMusicSeed(snapshot),
      masterVolume: 0.34,
      palette: deckMusicName(snapshot),
    });
    updateMusic(snapshot, true);
    if (!musicManager.started) musicManager.start().catch(() => {});
  }

  function unlockAudio(snapshot: AudioSnapshot) {
    if (audioUnlocked) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ??= new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    audioUnlocked = true;
    startMusic(snapshot);
  }

  function stopMusic(options = { fadeOut: 0.9 }) {
    musicManager?.stop(options);
    musicStateKey = "";
  }

  function filterNodeSetup(node: BiquadFilterNode, filter: ToneFilter, now: number, duration: number) {
    node.type = filter.type ?? "lowpass";
    node.frequency.setValueAtTime(filter.frequency ?? 900, now);
    node.frequency.exponentialRampToValueAtTime(Math.max(20, filter.endFrequency ?? filter.frequency ?? 900), now + duration);
    node.Q.value = filter.q ?? 1;
  }

  function playTone({ frequency = 220, endFrequency = frequency, duration = 0.16, type = "sine", volume = 0.14, delay = 0, filter = null }: ToneOptions) {
    if (!audioUnlocked || !audioContext) return;
    const now = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filterNode = filter ? audioContext.createBiquadFilter() : null;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (filter && filterNode) {
      filterNodeSetup(filterNode, filter, now, duration);
      oscillator.connect(filterNode);
      filterNode.connect(gain);
    } else {
      oscillator.connect(gain);
    }

    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function playNoise({ duration = 0.12, volume = 0.12, delay = 0, filter = 1400 }: NoiseOptions = {}) {
    if (!audioUnlocked || !audioContext) return;
    const now = audioContext.currentTime + delay;
    const buffer = audioContext.createBuffer(1, Math.max(1, Math.floor(audioContext.sampleRate * duration)), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const tone = audioContext.createBiquadFilter();
    tone.type = "bandpass";
    tone.frequency.value = filter;
    tone.Q.value = 0.8;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(tone);
    tone.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now);
  }

  function playSfx(name: string, intensity = 1) {
    const volume = clamp(intensity, 0.45, 1.8);
    if (name === "slash") {
      playTone({ frequency: 180, endFrequency: 760, duration: 0.11, type: "sawtooth", volume: 0.075 * volume, filter: { type: "bandpass", frequency: 520, endFrequency: 1600, q: 2.2 } });
      playNoise({ duration: 0.09, volume: 0.045 * volume, filter: 2200 });
    } else if (name === "shot") {
      playTone({ frequency: 90, endFrequency: 42, duration: 0.12, type: "square", volume: 0.08 * volume, filter: { type: "lowpass", frequency: 900, endFrequency: 160, q: 0.8 } });
      playNoise({ duration: 0.07, volume: 0.07 * volume, filter: 1800 });
    } else if (name === "shoulder") {
      playTone({ frequency: 120, endFrequency: 55, duration: 0.24, type: "sawtooth", volume: 0.11 * volume, filter: { type: "lowpass", frequency: 1200, endFrequency: 180, q: 1.1 } });
      playNoise({ duration: 0.18, volume: 0.09 * volume, filter: 900 });
    } else if (name === "enemy") {
      playTone({ frequency: 300, endFrequency: 110, duration: 0.16, type: "triangle", volume: 0.055 * volume, filter: { type: "bandpass", frequency: 760, endFrequency: 240, q: 1.8 } });
    } else if (name === "hit") {
      playTone({ frequency: 72, endFrequency: 38, duration: 0.1, type: "square", volume: 0.05 * volume, filter: { type: "lowpass", frequency: 650, endFrequency: 130, q: 0.7 } });
      playNoise({ duration: 0.08, volume: 0.055 * volume, filter: 1200 });
    } else if (name === "complete") {
      playTone({ frequency: 164, endFrequency: 246, duration: 0.32, type: "sine", volume: 0.09 * volume });
      playTone({ frequency: 246, endFrequency: 370, duration: 0.34, type: "triangle", volume: 0.07 * volume, delay: 0.08 });
      playTone({ frequency: 370, endFrequency: 554, duration: 0.42, type: "sine", volume: 0.075 * volume, delay: 0.18 });
      playNoise({ duration: 0.45, volume: 0.035 * volume, delay: 0.05, filter: 2600 });
    }
  }

  return {
    unlockAudio,
    startMusic,
    updateMusic,
    stopMusic,
    playSfx,
  };
}
