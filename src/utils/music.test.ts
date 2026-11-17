import { TRACKS, eventsBetween, noteHz, parseVoice, trackBeats } from './music';

// pitch classes, C = 0
const PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const pitchClass = (note: string) =>
  (PC[note[0]] + (note[1] === '#' ? 1 : 0) + 12) % 12;
// a minor key: its natural 7th, and the raised 7th that pulls home at cadences
const minorKey = (tonic: number) =>
  new Set([0, 2, 3, 5, 7, 8, 10, 11].map((i) => (tonic + i) % 12));

describe('notes', () => {
  it('turns note names into frequencies, A4 at 440 Hz', () => {
    expect(noteHz('A4')).toBeCloseTo(440);
    expect(noteHz('A3')).toBeCloseTo(220);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
    expect(noteHz('G#4')).toBeCloseTo(415.3, 1);
  });

  it('reads a voice of notes and rests, each with its length in beats', () => {
    expect(parseVoice('A3:1 -:0.5 C#4:2')).toEqual([
      { note: 'A3', beat: 0, beats: 1 },
      { note: 'C#4', beat: 1.5, beats: 2 },
    ]);
  });
});

describe('the soundtrack', () => {
  it.each(Object.entries(TRACKS))(
    '%s: every voice loops in step with the others',
    (_, track) => {
      const lengths = track.voices.map((v) =>
        parseVoice(v.notes).reduce(
          (end, n) => Math.max(end, n.beat + n.beats),
          0,
        ),
      );
      // a voice may end on a rest, so compare against the written length
      for (const v of track.voices) {
        const written = v.notes
          .split(/\s+/)
          .reduce((sum, n) => sum + Number(n.split(':')[1]), 0);
        expect(written).toBe(trackBeats(track));
      }
      for (const l of lengths) expect(l).toBeLessThanOrEqual(trackBeats(track));
    },
  );

  it.each([
    ['dungeon', 'A'],
    ['boss', 'E'],
  ] as const)('%s stays in %s minor', (id, tonic) => {
    const scale = minorKey(PC[tonic]);
    for (const v of TRACKS[id].voices)
      for (const { note } of parseVoice(v.notes))
        expect(scale.has(pitchClass(note))).toBe(true);
  });

  it('quickens for the boss', () => {
    expect(TRACKS.boss.bpm).toBeGreaterThan(TRACKS.dungeon.bpm * 1.4);
  });

  it('stays quieter than the sound effects, so they cut through', () => {
    for (const track of Object.values(TRACKS))
      for (const v of track.voices) expect(v.volume).toBeLessThanOrEqual(0.1);
  });
});

describe('eventsBetween', () => {
  const track = {
    bpm: 60,
    voices: [
      { instrument: 'lead' as const, volume: 0.05, notes: 'A3:1 B3:1 C4:2' },
    ],
  };

  it('lists the notes starting in a window of beats', () => {
    expect(eventsBetween(track, 0, 2).map((e) => [e.note, e.beat])).toEqual([
      ['A3', 0],
      ['B3', 1],
    ]);
  });

  it('carries on round the loop', () => {
    expect(eventsBetween(track, 3, 6).map((e) => [e.note, e.beat])).toEqual([
      ['A3', 4],
      ['B3', 5],
    ]);
  });
});
