import { useRef } from 'react';

// Low, echoing sounds, so the app sounds like a stone dungeon: tones for
// hovering the header's element tiles, and a heavy door for opening a simulation.

const ECHO_DELAY = 0.22; // s between echoes, like a stone corridor
const ECHO_FEEDBACK = 0.35; // each echo this much quieter than the last
const ECHO_LOWPASS = 900; // Hz; stone swallows the highs

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

const HOVER_VOICES: Voice[] = [
  // stone gong
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 98, volume: 0.22, length: 1.4 });
    tone(ctx, out, t, { from: 147, volume: 0.08, length: 1 });
  },
  // deep bell
  (ctx, out, t) => {
    tone(ctx, out, t, {
      type: 'triangle',
      from: 131,
      volume: 0.16,
      length: 1.1,
    });
    tone(ctx, out, t, { from: 196, to: 190, volume: 0.06, length: 0.8 });
  },
  // a drip somewhere in the dark
  (ctx, out, t) =>
    tone(ctx, out, t, { from: 392, to: 196, volume: 0.12, length: 0.15 }),
  // low minor chord
  (ctx, out, t) => {
    tone(ctx, out, t, { from: 110, volume: 0.12, length: 0.9 });
    tone(ctx, out, t, { from: 131, volume: 0.1, length: 0.9 });
  },
  // rumbling thud
  (ctx, out, t) =>
    tone(ctx, out, t, { from: 70, to: 45, volume: 0.3, length: 0.5 }),
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

/** Plays a random one of these voices through the dungeon echo */
function useSound(voices: Voice[]) {
  // one context and one echo, reused for every play
  const audio = useRef<{ ctx: AudioContext; echo: AudioNode } | null>(null);

  return () => {
    if (!audio.current) {
      const ctx = new AudioContext();
      audio.current = { ctx, echo: withEcho(ctx) };
    }
    const { ctx, echo } = audio.current;
    const voice = voices[Math.floor(Math.random() * voices.length)];
    voice(ctx, echo, ctx.currentTime);
  };
}

/** Hovering a header tile */
export const useChime = () => useSound(HOVER_VOICES);

/** Opening a simulation's door */
export const useDoorSound = () => useSound(DOOR_VOICES);
