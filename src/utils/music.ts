// The Dungeon Quest's soundtrack: short chiptune loops, written as notes and
// played by Web Audio oscillators (see music-player.ts), so there are no audio
// files to load. The gate and map have one theme; each chamber has its own,
// in the mood of its boss, which quickens into a fight with a drum.

// lead: square; bass: triangle; pluck: short square; bell: ringing sine;
// pad: soft sawtooth, held; kick: a drum
export type Instrument = 'lead' | 'bass' | 'pluck' | 'bell' | 'pad' | 'kick';

export interface Voice {
  instrument: Instrument;
  volume: number; // peak gain, under the sound effects'
  notes: string; // "A3:1 -:0.5 C#4:2": note (or - for a rest) and beats
}

export interface Track {
  bpm: number;
  key: { tonic: string; scale: number[] }; // semitones above the tonic
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
export const trackBeats = (track: Pick<Track, 'voices'>) =>
  track.voices[0].notes
    .trim()
    .split(/\s+/)
    .reduce((sum, token) => sum + Number(token.split(':')[1]), 0);

/**
 * Every note starting in [from, to) beats since the music began, carrying on
 * round the loop
 */
export function eventsBetween(
  track: Pick<Track, 'voices'>,
  from: number,
  to: number,
) {
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
// notes of equal length: "C4 - E4" → "C4:0.5 -:0.5 E4:0.5"
const even = (notes: string, beats = 0.5) =>
  notes
    .split(' ')
    .map((n) => `${n}:${beats}`)
    .join(' ');
const bars = (...b: string[]) => b.join(' ');
// a whole bar of each note
const wholes = (notes: string) => even(notes, 4);

// scales, as semitones above the tonic
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MINOR_LEADING = [...MINOR, 11]; // with the raised 7th at cadences
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN_DOMINANT = [0, 1, 4, 5, 7, 8, 10]; // the sound of the desert

const FIGHT_SPEED = 1.3; // times the theme's tempo
const KICK_VOLUME = 0.1;

/** The theme played faster, with a drum on every beat, for a boss fight */
export function fightVersion(track: Track): Track {
  const beats = trackBeats(track);
  return {
    ...track,
    bpm: Math.round(track.bpm * FIGHT_SPEED),
    voices: [
      ...track.voices.filter((v) => v.instrument !== 'kick'),
      {
        instrument: 'kick',
        volume: KICK_VOLUME,
        notes: repeat(`${track.key.tonic}2:1`, beats),
      },
    ],
  };
}

// the Hydra's heads: one tune, each head coming in a bar after the last
const HYDRA_TUNE = [
  'B4:1 D5:1 F#5:1 D5:1',
  'E5:1 C#5:1 A4:2',
  'B4:1 C#5:1 D5:1 E5:1',
  'F#5:2 F#4:2',
  'G4:1 B4:1 E5:1 G5:1',
  'F#5:1 D5:1 B4:2',
  'C#5:1 A#4:1 F#4:1 A#4:1',
  'B4:2 -:2',
];
const later = (tune: string[], by: number) => [
  ...tune.slice(-by),
  ...tune.slice(0, -by),
];
const octaveDown = (notes: string) =>
  notes.replace(/(\d):/g, (_, o) => `${Number(o) - 1}:`);

export const THEMES: Record<string, Track> = {
  // the gate and map: A minor, slow, a wandering melody over
  // Am – F – G – Em – Am – F – E – E
  dungeon: {
    bpm: 84,
    key: { tonic: 'A', scale: MINOR_LEADING },
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: bars(
          'E4:1 A4:1 C5:1 B4:1',
          'A4:2 F4:1 A4:1',
          'G4:1 B4:1 D5:1 C5:1',
          'B4:3 -:1',
          'C5:1 B4:1 A4:1 E4:1',
          'F4:1 A4:1 C5:1 A4:1',
          'G#4:1 B4:1 E5:1 D5:1',
          'B4:2 G#4:1 E4:1',
        ),
      },
      {
        instrument: 'bass',
        volume: 0.08,
        notes: bars(
          'A2:2 E2:2',
          'F2:2 C3:2',
          'G2:2 D3:2',
          'E2:2 B2:2',
          'A2:2 E2:2',
          'F2:2 C3:2',
          'E2:2 G#2:2',
          'E2:2 -:2',
        ),
      },
    ],
  },

  // the Sphinx: E Phrygian dominant, a slow desert riddle over a drone
  periodic: {
    bpm: 76,
    key: { tonic: 'E', scale: PHRYGIAN_DOMINANT },
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: bars(
          'E4:1 F4:1 G#4:1 A4:1',
          'B4:2 A4:1 G#4:1',
          'F4:1 G#4:1 F4:1 E4:1',
          'E4:3 -:1',
          'B4:1 C5:1 D5:1 C5:1',
          'B4:1 A4:1 G#4:2',
          'A4:1 G#4:1 F4:1 G#4:1',
          'E4:4',
        ),
      },
      {
        instrument: 'bass',
        volume: 0.08,
        notes: bars(
          repeat('E2:2 B2:2', 4),
          'F2:2 C3:2',
          'E2:2 B2:2',
          'F2:2 C3:2',
          'E2:4',
        ),
      },
      { instrument: 'bell', volume: 0.03, notes: repeat('B5:1 -:7', 4) },
    ],
  },

  // the Lich: D minor, a slow, ghostly hymn on bells over an organ
  electrons: {
    bpm: 72,
    key: { tonic: 'D', scale: MINOR_LEADING },
    voices: [
      {
        instrument: 'bell',
        volume: 0.05,
        notes: bars(
          'D5:2 F5:1 A5:1',
          'C#5:3 -:1',
          'A#4:2 A4:1 G4:1',
          'A4:4',
          'F5:2 E5:1 D5:1',
          'C#5:2 E5:2',
          'D5:1 A4:1 F4:1 A4:1',
          'D4:3 -:1',
        ),
      },
      {
        instrument: 'pad',
        volume: 0.02,
        notes: wholes('D3 A2 A#2 A2 D3 A2 D3 D3'),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: wholes('D2 A1 A#1 A1 D2 A1 D2 D2'),
      },
    ],
  },

  // the Weaver: C minor, a creeping figure, plucked like a web's threads
  lewis: {
    bpm: 100,
    key: { tonic: 'C', scale: MINOR_LEADING },
    voices: [
      {
        instrument: 'pluck',
        volume: 0.045,
        notes: bars(
          even('C4 D#4 G4 D#4 C4 D#4 G4 G#4'),
          even('G4 D#4 C4 D#4 G4 D#4 C4 B3'),
          even('C4 F4 G#4 F4 C4 F4 G#4 A#4'),
          even('G#4 F4 C4 F4 G4 F4 D4 B3'),
          even('C4 D#4 G4 D#4 C4 D#4 G4 G#4'),
          even('G4 D#4 C4 D#4 G4 D#4 C4 B3'),
          even('G#3 C4 D#4 G#4 G4 D#4 D4 B3'),
          even('C4 G3 C4 D#4 C4 - - -'),
        ),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: bars(
          'C2:2 G1:2',
          'C2:2 G1:2',
          'F1:2 C2:2',
          'F1:2 G1:2',
          'C2:2 G1:2',
          'C2:2 G1:2',
          'G#1:2 G1:2',
          'C2:4',
        ),
      },
    ],
  },

  // the Wyrm: F♯ minor, slow and cold, bells like falling ice
  states: {
    bpm: 66,
    key: { tonic: 'F#', scale: MINOR },
    voices: [
      {
        instrument: 'bell',
        volume: 0.05,
        notes: bars(
          'F#5:1 C#5:1 A4:1 C#5:1',
          'F#5:2 E5:2',
          'D5:1 A4:1 F#4:1 A4:1',
          'C#5:4',
          'B4:1 D5:1 F#5:1 D5:1',
          'C#5:2 A4:2',
          'B4:1 A4:1 G#4:1 E4:1',
          'F#4:4',
        ),
      },
      { instrument: 'bell', volume: 0.02, notes: repeat('C#6:0.5 -:3.5', 8) },
      {
        instrument: 'pad',
        volume: 0.02,
        notes: wholes('F#2 F#2 D2 C#2 B1 F#2 E2 F#2'),
      },
    ],
  },

  // the Golem: D minor, a heavy stomp in the bass under a brassy tune
  balancing: {
    bpm: 90,
    key: { tonic: 'D', scale: MINOR },
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: bars(
          'D4:2 F4:1 A4:1',
          'D5:3 -:1',
          'C5:2 A4:1 F4:1',
          'E4:3 -:1',
          'D4:2 F4:1 A4:1',
          'A#4:2 A4:1 G4:1',
          'F4:1 E4:1 D4:1 C4:1',
          'D4:3 -:1',
        ),
      },
      {
        instrument: 'bass',
        volume: 0.09,
        notes: bars(
          'D2:1 D2:1 -:1 D2:1',
          'D2:1 D2:1 -:1 F2:1',
          'C2:1 C2:1 -:1 C2:1',
          'A1:1 A1:1 C2:1 D2:1',
          'D2:1 D2:1 -:1 D2:1',
          'D2:1 D2:1 -:1 F2:1',
          'A#1:1 A#1:1 -:1 A#1:1',
          'A1:2 A1:1 C2:1',
        ),
      },
      // its footsteps
      { instrument: 'kick', volume: 0.08, notes: repeat('D2:2', 16) },
    ],
  },

  // the Slime: G Dorian, bouncy and bubbling, over an octave-jumping bass
  reactions: {
    bpm: 116,
    key: { tonic: 'G', scale: DORIAN },
    voices: [
      {
        instrument: 'pluck',
        volume: 0.045,
        notes: bars(
          'G4:0.5 -:0.5 A#4:0.5 -:0.5 D5:0.5 C5:0.5 A#4:1',
          'A4:0.5 -:0.5 F4:0.5 -:0.5 A4:1 -:1',
          'G4:0.5 -:0.5 A#4:0.5 -:0.5 D5:0.5 E5:0.5 F5:1',
          'E5:0.5 D5:0.5 C5:0.5 A4:0.5 D5:2',
          'G5:0.5 F5:0.5 D5:0.5 A#4:0.5 C5:1 A4:1',
          'A#4:0.5 A4:0.5 G4:0.5 F4:0.5 A4:2',
          'G4:0.5 A#4:0.5 D5:0.5 G5:0.5 F5:0.5 E5:0.5 C5:1',
          'D5:0.5 -:0.5 A4:0.5 -:0.5 G4:2',
        ),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: ['G', 'F', 'G', 'D', 'G', 'F', 'C', 'D']
          .map((n) => repeat(`${n}2:0.5 ${n}3:0.5`, 4))
          .join(' '),
      },
    ],
  },

  // the Hydra: B minor, one serpentine tune sung by three heads in turn
  titrations: {
    bpm: 96,
    key: { tonic: 'B', scale: MINOR_LEADING },
    voices: [
      { instrument: 'lead', volume: 0.03, notes: bars(...HYDRA_TUNE) },
      {
        instrument: 'pluck',
        volume: 0.035,
        notes: octaveDown(bars(...later(HYDRA_TUNE, 1))),
      },
      {
        instrument: 'bell',
        volume: 0.025,
        notes: bars(...later(HYDRA_TUNE, 2)),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: wholes('B1 A1 B1 F#1 E2 B1 F#1 B1'),
      },
    ],
  },

  // the Wraith: C♯ minor, fast, crackling arpeggios like a current
  electrochemistry: {
    bpm: 132,
    key: { tonic: 'C#', scale: MINOR_LEADING },
    voices: [
      {
        instrument: 'pluck',
        volume: 0.04,
        notes: bars(
          even('C#4 E4 G#4 C#5 G#4 E4 C#4 E4'),
          even('A3 C#4 E4 A4 E4 C#4 A3 C#4'),
          even('E4 G#4 B4 E5 B4 G#4 E4 G#4'),
          even('B3 D#4 F#4 B4 F#4 D#4 B3 D#4'),
          even('C#4 E4 G#4 C#5 G#4 E4 C#4 E4'),
          even('A3 C#4 E4 A4 E4 C#4 A3 C#4'),
          even('F#3 A3 C#4 F#4 C#4 A3 F#3 A3'),
          even('G#3 C4 D#4 G#4 D#4 C4 G#3 C4'),
        ),
      },
      {
        instrument: 'lead',
        volume: 0.025,
        notes: bars(
          'G#4:4',
          'A4:4',
          'B4:4',
          'F#4:4',
          'G#4:2 E4:2',
          'C#5:4',
          'A4:2 C#5:2',
          'C5:2 D#5:2',
        ),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: wholes('C#2 A1 E2 B1 C#2 A1 F#1 G#1'),
      },
    ],
  },

  // the Alchemist: G minor, grand and dark: a tune over an organ, with bells
  alchemist: {
    bpm: 92,
    key: { tonic: 'G', scale: MINOR_LEADING },
    voices: [
      {
        instrument: 'lead',
        volume: 0.035,
        notes: bars(
          'G4:1 A#4:1 D5:1 G5:1',
          'F#5:2 D5:2',
          'D#5:1 D5:1 C5:1 A#4:1',
          'A4:3 -:1',
          'A#4:1 C5:1 D5:1 D#5:1',
          'F#5:1 G5:1 A5:2',
          'G5:1 D5:1 A#4:1 F#4:1',
          'G4:4',
        ),
      },
      {
        instrument: 'pad',
        volume: 0.02,
        notes: wholes('G2 D2 D#2 D2 A#1 C2 D2 G2'),
      },
      {
        instrument: 'bass',
        volume: 0.07,
        notes: wholes('G1 D2 D#1 D2 A#1 C2 D2 G1'),
      },
      { instrument: 'bell', volume: 0.025, notes: repeat('D6:0.5 -:3.5', 8) },
    ],
  },
};

/** A place's theme: a chamber's, or the dungeon's for the gate and map */
export const themeFor = (id: string) => THEMES[id] ?? THEMES.dungeon;
