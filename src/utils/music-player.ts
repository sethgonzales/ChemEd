import { useEffect, useState } from 'react';
import {
  TRACKS,
  eventsBetween,
  noteHz,
  type Instrument,
  type Track,
} from '~/utils/music';
import { MUTE_EVENT, audioContext, isMuted } from '~/utils/sounds';

// Plays the soundtrack by scheduling each note a moment ahead on the audio
// clock, which keeps time even when the page is busy. One track at a time;
// it follows the sounds' mute switch, and the quest's own Music setting.

const TICK_MS = 100; // how often the scheduler looks ahead
const LOOKAHEAD = 0.3; // s of notes scheduled in advance
const START_DELAY = 0.05; // s, so the first note isn't scheduled in the past
const MUSIC_KEY = 'chem.quest.music';

export type TrackId = keyof typeof TRACKS;

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
    osc.type = instrument === 'lead' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(hz, t);
  }
  gain.gain.setValueAtTime(volume, t);
  // a little gap at the end, so repeated notes are heard apart
  gain.gain.exponentialRampToValueAtTime(0.001, t + length * 0.9);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + length);
}

interface Playing {
  id: TrackId;
  timer: ReturnType<typeof setInterval>;
  out: GainNode;
}

let wanted: TrackId | null = null; // what should be playing, muted or not
let playing: Playing | null = null;

function start(id: TrackId) {
  const ctx = audioContext();
  if (!ctx) return;
  const track: Track = TRACKS[id];
  const beat = 60 / track.bpm; // s
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const t0 = ctx.currentTime + START_DELAY;
  let scheduled = 0; // beats scheduled so far
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
  playing = { id, timer: setInterval(schedule, TICK_MS), out };
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
  if (playing?.id === wanted) return;
  halt();
  start(wanted);
}

let listening = false;

/** Plays a track (carrying on if it's already playing), or stops with null */
export function playMusic(id: TrackId | null) {
  wanted = id;
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener(MUTE_EVENT, sync);
    listening = true;
  }
  sync();
}

export const stopMusic = () => playMusic(null);

/** Forgets everything, so each test starts afresh */
export function resetMusic() {
  halt();
  wanted = null;
}

/** Plays a track while the component is shown (null for silence) */
export function useMusic(id: TrackId | null) {
  useEffect(() => playMusic(id), [id]);
  useEffect(() => stopMusic, []);
}

function musicOn() {
  try {
    return localStorage.getItem(MUSIC_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** The quest's Music setting: [on, toggle], remembered in this browser */
export function useMusicSetting() {
  const [on, setOn] = useState(true);
  // read after mount, so the server render and first client render match
  useEffect(() => setOn(musicOn()), []);
  const toggle = () => {
    try {
      localStorage.setItem(MUSIC_KEY, String(!on));
    } catch {
      // storage can be blocked; the setting just won't be remembered
    }
    setOn(!on);
  };
  return [on, toggle] as const;
}
