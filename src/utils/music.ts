// The Dungeon Quest's soundtrack: short chiptune loops, written as notes and
// played by Web Audio oscillators (see music-player.ts), so there are no audio
// files to load. Both are in a minor key, with the raised 7th (G♯, D♯) at the
// cadences for a dark, pulling sound.

export type Instrument = 'lead' | 'bass' | 'kick';

export interface Voice {
  instrument: Instrument;
  volume: number; // peak gain, under the sound effects'
  notes: string; // "A3:1 -:0.5 C#4:2": note (or - for a rest) and beats
}

export interface Track {
  bpm: number;
  voices: Voice[];
}

export interface NoteEvent {
  note: string;
  beat: number; // from the start of the loop
  beats: number;
}

const A4 = 440; // Hz, concert pitch
const SEMITONES: Record<string, number> = {
  C: -9,
  D: -7,
  E: -5,
  F: -4,
  G: -2,
  A: 0,
  B: 2,
};

/** A note name such as A4 or G#3 as a frequency, in equal temperament */
export function noteHz(note: string) {
  const [, letter, sharp, octave] = note.match(/^([A-G])(#?)(-?\d)$/)!;
  const fromA4 =
    SEMITONES[letter] + (sharp ? 1 : 0) + (Number(octave) - 4) * 12;
  return A4 * 2 ** (fromA4 / 12);
}

/** A voice's notes, each with the beat it starts on; rests are left out */
export function parseVoice(notes: string): NoteEvent[] {
  let beat = 0;
  return notes
    .trim()
    .split(/\s+/)
    .flatMap((token) => {
      const [note, length] = token.split(':');
      const event = { note, beat, beats: Number(length) };
      beat += event.beats;
      return note === '-' ? [] : [event];
    });
}

/** How many beats before the loop comes round */
export const trackBeats = (track: Track) =>
  track.voices[0].notes
    .trim()
    .split(/\s+/)
    .reduce((sum, token) => sum + Number(token.split(':')[1]), 0);

/**
 * Every note starting in [from, to) beats since the music began, carrying on
 * round the loop
 */
export function eventsBetween(track: Track, from: number, to: number) {
  const length = trackBeats(track);
  const out: (NoteEvent & { voice: Voice })[] = [];
  for (const voice of track.voices) {
    const notes = parseVoice(voice.notes);
    for (let loop = Math.floor(from / length); loop * length < to; loop++)
      for (const n of notes) {
        const beat = loop * length + n.beat;
        if (beat >= from && beat < to) out.push({ ...n, beat, voice });
      }
  }
  return out.sort((a, b) => a.beat - b.beat);
}

const repeat = (token: string, times: number) =>
  Array(times).fill(token).join(' ');

export const TRACKS: Record<'dungeon' | 'boss', Track> = {
  // A minor, slow: a wandering melody over Am – F – G – Em – Am – F – E – E
  dungeon: {
    bpm: 84,
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: [
          'E4:1 A4:1 C5:1 B4:1',
          'A4:2 F4:1 A4:1',
          'G4:1 B4:1 D5:1 C5:1',
          'B4:3 -:1',
          'C5:1 B4:1 A4:1 E4:1',
          'F4:1 A4:1 C5:1 A4:1',
          'G#4:1 B4:1 E5:1 D5:1',
          'B4:2 G#4:1 E4:1',
        ].join(' '),
      },
      {
        instrument: 'bass',
        volume: 0.08,
        notes: [
          'A2:2 E2:2',
          'F2:2 C3:2',
          'G2:2 D3:2',
          'E2:2 B2:2',
          'A2:2 E2:2',
          'F2:2 C3:2',
          'E2:2 G#2:2',
          'E2:2 -:2',
        ].join(' '),
      },
    ],
  },
  // E minor, fast: a driving bass in eighths under a climbing lead, with a
  // kick on every beat
  boss: {
    bpm: 140,
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: [
          'E4:0.5 G4:0.5 B4:0.5 E5:0.5 D5:1 B4:1',
          'C5:1 B4:0.5 A4:0.5 G4:1 F#4:1',
          'E4:0.5 G4:0.5 C5:0.5 E5:0.5 D5:1 C5:1',
          'D5:1.5 C5:0.5 B4:1 A4:1',
          'B4:0.5 E5:0.5 B4:0.5 G4:0.5 E4:1 G4:1',
          'F#4:1 G4:0.5 A4:0.5 B4:2',
          'C5:0.5 E5:0.5 G5:0.5 E5:0.5 C5:1 E5:1',
          'D#5:2 B4:2',
        ].join(' '),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: [
          repeat('E2:0.5', 16),
          repeat('C2:0.5', 8),
          repeat('D2:0.5', 8),
          repeat('E2:0.5', 16),
          repeat('C2:0.5', 8),
          repeat('B1:0.5', 8),
        ].join(' '),
      },
      { instrument: 'kick', volume: 0.1, notes: repeat('E2:1', 32) },
    ],
  },
};
