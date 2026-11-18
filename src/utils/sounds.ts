import { useCallback, useEffect, useState } from 'react';

// Low, echoing sounds, so the app sounds like a stone dungeon. Sounds play only
// on clicks and answers, never on hover, and a mute switch silences them all.
// Clicks get a quiet, dry tick or tap; the bigger moments get the echo.

const ECHO_DELAY = 0.22; // s between echoes, like a stone corridor
const ECHO_FEEDBACK = 0.35; // each echo this much quieter than the last
const ECHO_LOWPASS = 900; // Hz; stone swallows the highs
const TREASURE_NOTE = 0.09; // s between arpeggio notes
const MIN_GAP = 40; // ms; a sound repeated sooner than this plays once

const MUTED_KEY = 'chem.sound.muted';
const VOLUME_KEY = 'chem.sound.volume'; // 0 to 1
/** Fired on window when sounds are muted or unmuted, e.g. for the music */
export const MUTE_EVENT = 'chem:muted';
type Voice = (ctx: AudioContext, out: AudioNode, time: number) => void;

/** A decaying tone into `out` */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  {
    type = 'sine',
    from,
    to = from,
    volume,
    length,
  }: {
    type?: OscillatorType;
    from: number; // Hz
    to?: number; // Hz, for a falling pitch
    volume: number;
    length: number; // s
  },
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + length);
}

// a potion bubbling: a soft pitch sweeping up, sometimes twice
const BLOOP_VOICES: Voice[] = [
  (ctx, out, t) =>
    tone(ctx, out, t, { from: 220, to: 660, volume: 0.14, length: 0.12 }),
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 196, to: 523, volume: 0.12, length: 0.1 });
    tone(ctx, out, t + 0.11, { from: 262, to: 784, volume: 0.1, length: 0.1 });
  },
];

// a button or checkbox: a soft, low click
const TICK_VOICES: Voice[] = [
  (ctx, out, t) =>
    tone(ctx, out, t, {
      type: 'triangle',
      from: 300,
      to: 220,
      volume: 0.04,
      length: 0.04,
    }),
];

// picking an element or an orbital box: the same click, a touch brighter
const TAP_VOICES: Voice[] = [
  (ctx, out, t) =>
    tone(ctx, out, t, {
      type: 'triangle',
      from: 520,
      to: 400,
      volume: 0.035,
      length: 0.05,
    }),
];

// a wrong answer: a soft, low thunk, like a stone that won't budge
const THUNK_VOICES: Voice[] = [
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 150, to: 70, volume: 0.18, length: 0.22 });
    tone(ctx, out, t, {
      type: 'triangle',
      from: 110,
      to: 60,
      volume: 0.06,
      length: 0.15,
    });
  },
];

// "treasure found": a square-wave C major arpeggio, like an 8-bit game
const TREASURE_VOICES: Voice[] = [
  (ctx, out, t) =>
    [523, 659, 784, 1047].forEach((hz, i) =>
      tone(ctx, out, t + i * TREASURE_NOTE, {
        type: 'square',
        from: hz,
        volume: 0.05,
        length: i === 3 ? 0.4 : 0.15,
      }),
    ),
];

// a coin: the classic quick ding, a note and the fourth above it, bright and short
const COIN_NOTE = 0.08; // s between the two notes
const COIN_VOICES: Voice[] = [
  (ctx, out, t) =>
    [988, 1319].forEach((hz, i) =>
      tone(ctx, out, t + i * COIN_NOTE, {
        type: 'square',
        from: hz,
        volume: 0.04,
        length: i === 1 ? 0.3 : COIN_NOTE,
      }),
    ),
];

// a chamber's door opens: bells rising through a G major chord, ringing on
const CHIME_NOTE = 0.12; // s between bells
const CHIME_VOICES: Voice[] = [
  (ctx, out, t) =>
    [784, 988, 1175, 1568].forEach((hz, i) =>
      tone(ctx, out, t + i * CHIME_NOTE, {
        type: 'sine',
        from: hz,
        volume: 0.09,
        length: i === 3 ? 1.1 : 0.6,
      }),
    ),
];

// game over: the classic slow chromatic slide down, then a low cadence
// that rings out, played once
const GAME_OVER_NOTES = [
  { hz: 392, at: 0, length: 0.3 }, // G4
  { hz: 370, at: 0.32, length: 0.3 }, // F#4
  { hz: 349, at: 0.64, length: 0.3 }, // F4
  { hz: 330, at: 0.96, length: 0.5 }, // E4
  { hz: 262, at: 1.5, length: 0.25 }, // C4
  { hz: 196, at: 1.78, length: 0.25 }, // G3
  { hz: 131, at: 2.06, length: 1.0 }, // C3
];
const GAME_OVER_VOICES: Voice[] = [
  (ctx, out, t) =>
    GAME_OVER_NOTES.forEach(({ hz, at, length }) =>
      tone(ctx, out, t + at, {
        type: 'square',
        from: hz,
        volume: 0.05,
        length,
      }),
    ),
];

// a hit on the boss: a bright strike ringing upwards, over a thump
const HIT_VOICES: Voice[] = [
  (ctx, out, t) => {
    tone(ctx, out, t, {
      type: 'square',
      from: 660,
      to: 1320,
      volume: 0.1,
      length: 0.08,
    });
    tone(ctx, out, t, {
      type: 'triangle',
      from: 180,
      to: 90,
      volume: 0.25,
      length: 0.15,
    });
    tone(ctx, out, t + 0.07, {
      type: 'square',
      from: 990,
      volume: 0.06,
      length: 0.2,
    });
  },
  (ctx, out, t) => {
    tone(ctx, out, t, {
      type: 'square',
      from: 587,
      to: 1175,
      volume: 0.1,
      length: 0.08,
    });
    tone(ctx, out, t, {
      type: 'triangle',
      from: 160,
      to: 80,
      volume: 0.25,
      length: 0.15,
    });
    tone(ctx, out, t + 0.07, {
      type: 'square',
      from: 880,
      volume: 0.06,
      length: 0.2,
    });
  },
];

// a miss: a soft whoosh through empty air
const MISS_VOICES: Voice[] = [
  (ctx, out, t) =>
    tone(ctx, out, t, {
      type: 'triangle',
      from: 520,
      to: 140,
      volume: 0.07,
      length: 0.28,
    }),
];

// the boss strikes: a low, harsh crunch, then a second jolt
const DAMAGE_VOICES: Voice[] = [
  (ctx, out, t) => {
    tone(ctx, out, t, {
      type: 'sawtooth',
      from: 160,
      to: 55,
      volume: 0.16,
      length: 0.3,
    });
    tone(ctx, out, t, {
      type: 'square',
      from: 110,
      to: 70,
      volume: 0.08,
      length: 0.12,
    });
    tone(ctx, out, t + 0.12, {
      type: 'square',
      from: 90,
      to: 50,
      volume: 0.07,
      length: 0.15,
    });
  },
];

/** Sends `input` to `out`, plus fading echoes */
function withEcho(ctx: AudioContext, out: AudioNode) {
  const input = ctx.createGain();
  const delay = ctx.createDelay();
  const feedback = ctx.createGain();
  const muffle = ctx.createBiquadFilter();
  delay.delayTime.value = ECHO_DELAY;
  feedback.gain.value = ECHO_FEEDBACK;
  muffle.type = 'lowpass';
  muffle.frequency.value = ECHO_LOWPASS;

  input.connect(out);
  input.connect(delay);
  delay.connect(muffle).connect(feedback).connect(delay);
  feedback.connect(out);
  return input;
}

// a heavy door thuds shut behind you, and the chamber rings
const DOOR_VOICES: Voice[] = [
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 70, to: 40, volume: 0.35, length: 0.6 });
    tone(ctx, out, t + 0.05, { from: 98, volume: 0.16, length: 1.6 });
  },
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 60, to: 38, volume: 0.35, length: 0.6 });
    tone(ctx, out, t + 0.05, { from: 110, volume: 0.1, length: 1.2 });
    tone(ctx, out, t + 0.05, { from: 131, volume: 0.08, length: 1.2 });
  },
];

/** Whether the student has turned sounds off in this browser */
export function isMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, String(muted));
  } catch {
    // storage can be blocked; the setting just won't be remembered
  }
  window.dispatchEvent(new Event(MUTE_EVENT));
}

/** The volume the student chose in this browser, from 0 to 1 */
export function getVolume() {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    const volume = stored === null ? NaN : Number(stored);
    return Number.isFinite(volume) ? clamp(volume) : 1;
  } catch {
    return 1;
  }
}

const clamp = (volume: number) => Math.min(1, Math.max(0, volume));

// we hear loudness roughly logarithmically, so a slider's gain follows its
// square: halfway then sounds about half as loud, not barely quieter
const gainFor = (volume: number) => volume * volume;

export function setVolume(volume: number) {
  volume = clamp(volume);
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // storage can be blocked; the setting just won't be remembered
  }
  if (audio) audio.volume.gain.value = gainFor(volume);
}

/** The volume slider: [volume, setVolume] */
export function useVolume() {
  const [volume, setState] = useState(1);
  // read after mount, so the server render and first client render match
  useEffect(() => setState(getVolume()), []);
  const set = (next: number) => {
    setVolume(next);
    setState(getVolume());
  };
  return [volume, set] as const;
}

/** The mute switch: [muted, toggle] */
export function useMuted() {
  const [muted, setState] = useState(false);
  // read after mount, so the server render and first client render match
  useEffect(() => setState(isMuted()), []);
  const toggle = () => {
    setMuted(!muted);
    setState(!muted);
  };
  return [muted, toggle] as const;
}

// One AudioContext for the whole page (browsers cap how many there can be),
// and one volume control that every sound and the music pass through, with
// the echo built the first time a sound needs it
let audio: {
  ctx: AudioContext;
  volume: GainNode;
  echo: AudioNode | null;
} | null = null;
const lastPlayed = new Map<Voice[], number>();

/** Forgets the page's audio, so each test starts afresh */
export function resetSounds() {
  audio = null;
  lastPlayed.clear();
}

/** The page's AudioContext, made on first use and woken if it's asleep */
export function audioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!audio) {
    const ctx = new AudioContext();
    const volume = ctx.createGain();
    volume.gain.value = gainFor(getVolume());
    volume.connect(ctx.destination);
    audio = { ctx, volume, echo: null };
  }
  // browsers suspend audio until a tap, and phones when they sleep; a click
  // is the moment to wake it
  if (audio.ctx.state === 'suspended') void audio.ctx.resume();
  return audio.ctx;
}

/** Where sounds and music go to be heard: the volume control */
export function speakers(): AudioNode | null {
  return audioContext() && audio!.volume;
}

/** Plays a random one of these voices, through the dungeon echo or dry */
function play(voices: Voice[], echo: boolean) {
  if (isMuted()) return;
  const ctx = audioContext();
  if (!ctx || !audio) return;
  // timed by the page's clock: a suspended context's clock stands still
  const now = performance.now();
  const last = lastPlayed.get(voices);
  // held keys and fast clicks would otherwise play a burst
  if (last !== undefined && now - last < MIN_GAP) return;
  lastPlayed.set(voices, now);
  const out = echo
    ? (audio.echo ??= withEcho(ctx, audio.volume))
    : audio.volume;
  const voice = voices[Math.floor(Math.random() * voices.length)];
  voice(ctx, out, ctx.currentTime);
}

// stable, so callers can list it as an effect or callback dependency
const useSound = (voices: Voice[], echo = true) =>
  useCallback(() => play(voices, echo), [voices, echo]);

/** Clicking a header tile */
export const useBloop = () => useSound(BLOOP_VOICES);

/** Opening a simulation's door */
export const useDoorSound = () => useSound(DOOR_VOICES);

/** A success: balanced, a correct structure */
export const useTreasureSound = () => useSound(TREASURE_VOICES);

/** A wrong answer */
export const useThunk = () => useSound(THUNK_VOICES);

/** Any button or checkbox */
export const useTick = () => useSound(TICK_VOICES, false);

/** Picking an element, an orbital box or the like */
export const useTap = () => useSound(TAP_VOICES, false);

/** Plays a click's sound outside React (see ClickSounds) */
export const playClick = (kind: 'tick' | 'tap') =>
  play(kind === 'tap' ? TAP_VOICES : TICK_VOICES, false);

/** Your answer lands on the boss */
export const useHitSound = () => useSound(HIT_VOICES);

/** Your answer misses */
export const useMissSound = () => useSound(MISS_VOICES);

/** The boss strikes you and a heart is lost */
export const useDamageSound = () => useSound(DAMAGE_VOICES);

/** A coin collected on the way */
export const useCoinSound = () => useSound(COIN_VOICES);

/** A door on the map opens: a chime before the chamber's music */
export const useChimeSound = () => useSound(CHIME_VOICES);

/** Game over: a falling tune, played once */
export const useGameOverSound = () => useSound(GAME_OVER_VOICES);
