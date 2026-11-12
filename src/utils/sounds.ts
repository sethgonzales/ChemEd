import { useCallback, useEffect, useRef, useState } from 'react';

// Low, echoing sounds, so the app sounds like a stone dungeon. Sounds play only
// on clicks and successes, never on hover, and a mute switch silences them all.

const ECHO_DELAY = 0.22; // s between echoes, like a stone corridor
const ECHO_FEEDBACK = 0.35; // each echo this much quieter than the last
const ECHO_LOWPASS = 900; // Hz; stone swallows the highs
const TREASURE_NOTE = 0.09; // s between arpeggio notes

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

/** Plays a random one of these voices through the dungeon echo */
function useSound(voices: Voice[]) {
  // one context and one echo, reused for every play
  const audio = useRef<{ ctx: AudioContext; echo: AudioNode } | null>(null);

  // stable, so callers can list it as an effect or callback dependency
  return useCallback(() => {
    if (isMuted() || typeof AudioContext === 'undefined') return;
    if (!audio.current) {
      const ctx = new AudioContext();
      audio.current = { ctx, echo: withEcho(ctx) };
    }
    const { ctx, echo } = audio.current;
    const voice = voices[Math.floor(Math.random() * voices.length)];
    voice(ctx, echo, ctx.currentTime);
  }, [voices]);
}

/** Clicking a header tile */
export const useBloop = () => useSound(BLOOP_VOICES);

/** Opening a simulation's door */
export const useDoorSound = () => useSound(DOOR_VOICES);

/** A success: balanced, a correct structure */
export const useTreasureSound = () => useSound(TREASURE_VOICES);
