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

/** Sends `input` to the speakers, plus fading echoes */
function withEcho(ctx: AudioContext) {
  const input = ctx.createGain();
  const delay = ctx.createDelay();
  const feedback = ctx.createGain();
  const muffle = ctx.createBiquadFilter();
  delay.delayTime.value = ECHO_DELAY;
  feedback.gain.value = ECHO_FEEDBACK;
  muffle.type = 'lowpass';
  muffle.frequency.value = ECHO_LOWPASS;

  input.connect(ctx.destination);
  input.connect(delay);
  delay.connect(muffle).connect(feedback).connect(delay);
  feedback.connect(ctx.destination);
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
// with the echo built the first time a sound needs it
let audio: { ctx: AudioContext; echo: AudioNode | null } | null = null;
const lastPlayed = new Map<Voice[], number>();

/** Forgets the page's audio, so each test starts afresh */
export function resetSounds() {
  audio = null;
  lastPlayed.clear();
}

/** Plays a random one of these voices, through the dungeon echo or dry */
function play(voices: Voice[], echo: boolean) {
  if (isMuted() || typeof AudioContext === 'undefined') return;
  audio ??= { ctx: new AudioContext(), echo: null };
  const { ctx } = audio;
  // browsers suspend audio until a tap, and phones when they sleep; a click
  // is the moment to wake it
  if (ctx.state === 'suspended') void ctx.resume();
  // timed by the page's clock: a suspended context's clock stands still
  const now = performance.now();
  const last = lastPlayed.get(voices);
  // held keys and fast clicks would otherwise play a burst
  if (last !== undefined && now - last < MIN_GAP) return;
  lastPlayed.set(voices, now);
  const out = echo ? (audio.echo ??= withEcho(ctx)) : ctx.destination;
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
