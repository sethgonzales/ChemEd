import { useEffect } from 'react';
import {
  eventsBetween,
  fightVersion,
  finaleVersion,
  noteHz,
  themeFor,
  type Instrument,
} from '~/utils/music';
import { MUTE_EVENT, audioContext, isMuted, speakers } from '~/utils/sounds';

// Plays the soundtrack by scheduling each note a moment ahead on the audio
// clock, which keeps time even when the page is busy. One theme at a time,
// a place's or its fight version; it follows the sounds' mute switch in the
// header.

const TICK_MS = 100; // how often the scheduler looks ahead
const LOOKAHEAD = 0.3; // s of notes scheduled in advance
const START_DELAY = 0.05; // s, so the first note isn't scheduled in the past
const PLUCK = 0.12; // s a plucked note rings
const BELL = 1.2; // s a bell rings, over the notes after it
const SLAP = 0.22; // s a slapped note thumps
const SLIDE = 0.06; // s a slap or blip slides into its note

const WAVES: Record<Exclude<Instrument, 'kick'>, OscillatorType> = {
  lead: 'square',
  bass: 'triangle',
  slap: 'triangle',
  blip: 'sine',
  pluck: 'square',
  bell: 'sine',
  pad: 'sawtooth',
};

/** One note on an instrument, into `out` */
function sound(
  ctx: AudioContext,
  out: AudioNode,
  instrument: Instrument,
  hz: number,
  volume: number,
  t: number,
  length: number, // s
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  if (instrument === 'kick') {
    // a drum: a sine dropping fast in pitch
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    length = 0.15;
  } else {
    osc.type = WAVES[instrument];
    osc.frequency.setValueAtTime(hz, t);
    if (instrument === 'pluck') length = Math.min(length, PLUCK);
    if (instrument === 'bell') length = Math.max(length, BELL);
    if (instrument === 'slap') {
      // struck sharp, an octave up, and dropping wetly into the note
      osc.frequency.setValueAtTime(hz * 2, t);
      osc.frequency.exponentialRampToValueAtTime(hz, t + SLIDE);
      length = Math.min(length, SLAP);
    }
    if (instrument === 'blip') {
      // a bubble: rising fast as it pops
      osc.frequency.setValueAtTime(hz * 0.6, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 1.5, t + SLIDE);
      length = Math.min(length, PLUCK);
    }
  }
  gain.gain.setValueAtTime(volume, t);
  // a little gap at the end, so repeated notes are heard apart
  gain.gain.exponentialRampToValueAtTime(0.001, t + length * 0.9);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + length);
}

interface Playing {
  id: string; // the place, then :fight in a fight, or :finale near its end
  timer: ReturnType<typeof setInterval>;
  out: GainNode;
  beat: () => number; // how far into the tune it's got
}

let wanted: string | null = null; // what should be playing, muted or not
let playing: Playing | null = null;
// a theme waiting out a pause before it starts
let pending: ReturnType<typeof setTimeout> | null = null;

const TRACKS = { fight: fightVersion, finale: finaleVersion };

/** Plays a theme, from the top or from a beat part-way through it */
function start(id: string, from = 0) {
  const ctx = audioContext();
  if (!ctx) return;
  const [place, mode] = id.split(':') as [string, (keyof typeof TRACKS)?];
  const theme = themeFor(place);
  const track = mode ? TRACKS[mode](theme) : theme;
  const beat = 60 / track.bpm; // s
  const out = ctx.createGain();
  out.connect(speakers()!);
  const t0 = ctx.currentTime + START_DELAY - from * beat;
  let scheduled = from; // beats scheduled so far
  const schedule = () => {
    const until = (ctx.currentTime - t0 + LOOKAHEAD) / beat;
    for (const e of eventsBetween(track, scheduled, until))
      sound(
        ctx,
        out,
        e.voice.instrument,
        noteHz(e.note),
        e.voice.volume,
        t0 + e.beat * beat,
        e.beats * beat,
      );
    scheduled = Math.max(scheduled, until);
  };
  schedule();
  playing = {
    id,
    timer: setInterval(schedule, TICK_MS),
    out,
    beat: () => Math.max(0, (ctx.currentTime - t0) / beat),
  };
}

function halt() {
  if (!playing) return;
  clearInterval(playing.timer);
  // silence notes already scheduled
  playing.out.gain.setValueAtTime(0, audioContext()?.currentTime ?? 0);
  playing = null;
}

function sync() {
  if (!wanted || isMuted()) return halt();
  if (pending) return; // still in the pause
  if (playing?.id === wanted) return;
  // fight to finale, or back: the same tune, carried on at the new tempo
  const [place, mode] = wanted.split(':');
  const was = playing?.id.split(':');
  const from = was && was[0] === place && was[1] && mode ? playing!.beat() : 0;
  halt();
  start(wanted, from);
}

let listening = false;

// the fight's music: none, the fight, or its finale as the boss is nearly beaten
export type Fight = boolean | 'finale';

/**
 * Plays a place's theme, or its fight version (carrying on if it's already
 * playing), or stops with null. With a pause, a new theme waits that long
 * (ms) in silence first, e.g. for a chime between them.
 */
export function playMusic(
  place: string | null,
  fight: Fight = false,
  pause = 0,
) {
  const id =
    place &&
    (fight ? `${place}:${fight === 'finale' ? 'finale' : 'fight'}` : place);
  if (pending) clearTimeout(pending);
  pending = null;
  wanted = id;
  if (pause > 0 && id && playing?.id !== id) {
    halt();
    pending = setTimeout(() => {
      pending = null;
      sync();
    }, pause);
  }
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener(MUTE_EVENT, sync);
    listening = true;
  }
  sync();
}

export const stopMusic = () => playMusic(null);

/** Forgets everything, so each test starts afresh */
export function resetMusic() {
  if (pending) clearTimeout(pending);
  pending = null;
  halt();
  wanted = null;
}

/**
 * Plays a place's theme while the component is shown (null for silence),
 * after a pause (ms) when it changes, if one is given
 */
export function useMusic(
  place: string | null,
  fight: Fight = false,
  pause = 0,
) {
  useEffect(() => playMusic(place, fight, pause), [place, fight, pause]);
  useEffect(() => stopMusic, []);
}
