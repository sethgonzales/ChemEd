import { CHAMBER_IDS } from '~/constants/quest-chambers';
import { ALCHEMIST_ID } from '~/constants/quest-final';
import {
  THEMES,
  eventsBetween,
  fightVersion,
  noteHz,
  parseVoice,
  themeFor,
  trackBeats,
  type Track,
} from './music';

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
const written = (notes: string) =>
  notes
    .trim()
    .split(/\s+/)
    .reduce((sum, n) => sum + Number(n.split(':')[1]), 0);
const tune = (t: Track) =>
  t.voices
    .filter((v) => v.instrument !== 'kick')
    .map((v) => v.notes)
    .join('|');

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
  it('has a theme for the gate and map, and one for every chamber and the Alchemist', () => {
    for (const id of ['dungeon', ...CHAMBER_IDS, ALCHEMIST_ID])
      expect(THEMES[id]).toBeDefined();
  });

  it('gives every place a tune of its own', () => {
    const tunes = Object.values(THEMES).map(tune);
    expect(new Set(tunes).size).toBe(tunes.length);
  });

  it('keeps the gate and map theme in the background: slow, soft, carried by the bass', () => {
    const gate = THEMES.dungeon;
    expect(gate.bpm).toBeLessThanOrEqual(72);
    // no buzzy square lead over the top
    expect(gate.voices.some((v) => v.instrument === 'lead')).toBe(false);
    const loudest = gate.voices.reduce((a, b) => (b.volume > a.volume ? b : a));
    expect(loudest.instrument).toBe('bass');
    // and quieter overall than a chamber's theme
    const total = (t: Track) => t.voices.reduce((sum, v) => sum + v.volume, 0);
    for (const id of CHAMBER_IDS)
      expect(total(gate)).toBeLessThan(total(THEMES[id]));
  });

  it('falls back to the dungeon theme for a place without one', () => {
    expect(themeFor('nowhere')).toBe(THEMES.dungeon);
    expect(themeFor('states')).toBe(THEMES.states);
  });

  describe.each(Object.entries(THEMES))('%s', (_, track) => {
    it('loops with every voice in step', () => {
      for (const v of track.voices)
        expect(written(v.notes)).toBe(trackBeats(track));
    });

    it('stays in its key', () => {
      const scale = new Set(
        track.key.scale.map((i) => (pitchClass(track.key.tonic) + i) % 12),
      );
      for (const v of track.voices)
        for (const { note } of parseVoice(v.notes))
          expect(scale.has(pitchClass(note))).toBe(true);
    });

    it('stays quieter than the sound effects, so they cut through', () => {
      for (const v of track.voices) expect(v.volume).toBeLessThanOrEqual(0.1);
    });

    it('quickens into a fight, with a drum on every beat, keeping its tune', () => {
      const fight = fightVersion(track);
      expect(fight.bpm).toBeGreaterThanOrEqual(track.bpm * 1.25);
      expect(tune(fight)).toBe(tune(track));
      const kicks = fight.voices.filter((v) => v.instrument === 'kick');
      expect(kicks).toHaveLength(1);
      expect(parseVoice(kicks[0].notes)).toHaveLength(trackBeats(track));
      for (const v of fight.voices)
        expect(written(v.notes)).toBe(trackBeats(track));
    });
  });
});

describe('eventsBetween', () => {
  const track = {
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
