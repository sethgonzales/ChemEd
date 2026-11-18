import { SUBSTANCES } from '~/constants/substances';
import { createRng } from './quest';
import {
  heatQuestion,
  phaseQuestion,
  pointQuestion,
  statesQuestion,
  statesRooms,
} from './quest-states';
import { QUESTION_SOURCES } from './quest-sources';
import { phaseOf } from './states-of-matter';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const substance = (about: string) => SUBSTANCES.find((s) => s.name === about)!;

describe('States of Matter questions', () => {
  it('ask for the phase at a temperature well away from either change', () => {
    const phases = new Set<string>();
    for (const level of [1, 2])
      for (const seed of SEEDS) {
        const q = phaseQuestion(createRng(seed), level);
        const s = substance(q.about);
        if (level === 1) expect(s.id).toBe('water');
        const t = Number(
          /at (−?-?\d+) °C/.exec(q.prompt)![1].replace('−', '-'),
        );
        expect(Math.abs(t - s.meltC)).toBeGreaterThanOrEqual(3);
        expect(Math.abs(t - s.boilC)).toBeGreaterThanOrEqual(3);
        expect(q.choices[q.answer]).toBe(phaseOf(s, t));
        phases.add(phaseOf(s, t));
      }
    expect(phases.size).toBe(3);
  });

  it('ask for a melting or boiling point', () => {
    for (const seed of SEEDS) {
      const q = pointQuestion(createRng(seed), 2);
      const s = substance(q.about);
      const point = q.prompt.includes('boil') ? s.boilC : s.meltC;
      expect(q.choices[q.answer]).toBe(`${String(point).replace('-', '−')} °C`);
    }
  });

  it('work out the heat to melt or boil some moles at the change', () => {
    for (const seed of SEEDS) {
      const q = heatQuestion(createRng(seed), 3);
      const s = substance(q.about);
      const moles = Number(
        /melt|boil/.test(q.prompt) && /([\d.]+) mol/.exec(q.prompt)![1],
      );
      const perMole = q.prompt.includes('melt') ? s.fusionKJ : s.vaporizationKJ;
      expect(q.choices[q.answer]).toBe(`${(moles * perMole).toFixed(2)} kJ`);
    }
  });

  it('only asks about water at level 1', () => {
    for (const seed of SEEDS)
      expect(statesQuestion(createRng(seed), 1).about).toBe('Water');
  });
});

describe('the Wyrm’s rooms', () => {
  const rooms = (course: 'general' | 'ap') =>
    SEEDS.map((seed) => statesRooms(createRng(seed), course));
  const right = (q: { choices: string[]; answer: number }) =>
    q.choices[q.answer];

  it.each(['general', 'ap'] as const)(
    'give %s three rooms: the particles, the heating curve, then how the states differ',
    (course) => {
      for (const set of rooms(course)) {
        expect(set.map((r) => r.kind)).toEqual([
          'particles',
          'curve',
          'concept',
        ]);
      }
    },
  );

  it('show particles in a state well clear of a change, and ask which it is', () => {
    const seen = new Set<string>();
    for (const [room] of rooms('general')) {
      if (room.kind !== 'particles') throw new Error('particles first');
      const { substance, tempC, question } = room;
      expect(Math.abs(tempC - substance.meltC)).toBeGreaterThanOrEqual(5);
      expect(Math.abs(tempC - substance.boilC)).toBeGreaterThanOrEqual(5);
      expect(right(question)).toBe(phaseOf(substance, tempC));
      expect([...question.choices].sort()).toEqual(['Gas', 'Liquid', 'Solid']);
      // the prompt mustn't give the state away
      expect(question.prompt).not.toMatch(/°C|solid|liquid|gas/i);
      seen.add(right(question));
    }
    expect(seen.size).toBe(3);
  });

  it('ask for the curve’s segments by letter: A solid, B melting, C liquid, D boiling, E gas', () => {
    const SEGMENT: Record<string, string> = {
      'warming as a solid': 'A',
      melting: 'B',
      'warming as a liquid': 'C',
      boiling: 'D',
      'warming as a gas': 'E',
    };
    let asked = 0;
    for (const [, room] of rooms('general')) {
      const what = Object.keys(SEGMENT).find((k) =>
        room.question.prompt.endsWith(`shows it ${k}?`),
      );
      if (!what) continue;
      asked++;
      expect(right(room.question)).toBe(SEGMENT[what]);
      expect(room.question.choices).toEqual(['A', 'B', 'C', 'D', 'E']);
    }
    expect(asked).toBeGreaterThan(5);
  });

  it('ask for a temperature read off the curve', () => {
    let asked = 0;
    for (const [, room] of rooms('general')) {
      if (room.kind !== 'curve') continue;
      const m = room.question.prompt.match(/does it (melt|boil)\?$/);
      if (!m) continue;
      asked++;
      const t = m[1] === 'melt' ? room.substance.meltC : room.substance.boilC;
      expect(right(room.question)).toBe(
        `${Math.round(t)} °C`.replace('-', '−'),
      );
    }
    expect(asked).toBeGreaterThan(3);
  });

  it('ask AP why the flat segments are flat, and why boiling’s is longer', () => {
    const prompts = rooms('ap').map(([, room]) => room.question);
    const flat = prompts.find((q) => /stay the same/.test(q.prompt))!;
    expect(right(flat)).toMatch(/changing the state, not into raising/);
    const longer = prompts.find((q) => /longer than/.test(q.prompt))!;
    expect(right(longer)).toBe('Boiling takes more heat per mole than melting');
    // and never General Chemistry
    for (const [, room] of rooms('general')) {
      expect(room.question.prompt).not.toMatch(/stay the same|longer than/);
    }
  });

  it('only say boiling’s plateau is longer where its data says so', () => {
    for (const s of SUBSTANCES)
      expect(s.vaporizationKJ).toBeGreaterThan(s.fusionKJ);
  });

  it('ask how the states differ, from the cited descriptions', () => {
    const FACTS: [RegExp, string][] = [
      [/definite shape and a definite volume/, 'Solid'],
      [/keeps its volume but takes the shape/, 'Liquid'],
      [/expands to fill/, 'Gas'],
      [/farthest apart/, 'Gas'],
      [/can the particles only vibrate/, 'Solid'],
      [/close together but able to move past/, 'Liquid'],
      [/easily compressed/, 'Gas'],
      [/intermolecular forces have the least effect/, 'Gas'],
    ];
    const seen = new Set<string>();
    for (const course of ['general', 'ap'] as const) {
      for (const [, , room] of rooms(course)) {
        if (room.kind !== 'concept') throw new Error('concept last');
        seen.add(room.question.prompt);
        const fact = FACTS.find(([re]) => re.test(room.question.prompt));
        if (fact) expect(right(room.question)).toBe(fact[1]);
        expect(room.question.explain.length).toBeGreaterThan(0);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('keep the deeper “why” questions for AP', () => {
    for (const [, , room] of rooms('general')) {
      expect(room.question.prompt).not.toMatch(/intermolecular|Why|What lets/);
    }
    expect(
      rooms('ap').some(([, , room]) =>
        /intermolecular|Why|What lets/.test(room.question.prompt),
      ),
    ).toBe(true);
  });

  it('cite the descriptions of the states and of latent heat', () => {
    const cited = QUESTION_SOURCES['/states-of-matter'].sources;
    expect(cited).toEqual(
      expect.arrayContaining(['stateOfMatter', 'latentHeat']),
    );
  });
});
