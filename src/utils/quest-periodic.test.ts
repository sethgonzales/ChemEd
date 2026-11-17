import { ELEMENTS } from '~/constants/elements';
import { ELECTRONEGATIVITY } from '~/constants/electronegativity';
import { formatConfiguration, groundState } from './electron-configurations';
import { createRng } from './quest';
import {
  blockQuestion,
  elementRiddle,
  electronegativityQuestion,
  locateQuestion,
  numberQuestion,
  periodicPool,
} from './quest-periodic';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const byName = (name: string) => ELEMENTS.find((e) => e.name === name)!;

describe('Periodic Table questions', () => {
  it('start with the first 20 elements and widen with each level', () => {
    expect(periodicPool(1).map((e) => e.atomicNumber)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(periodicPool(2)).toHaveLength(36);
    expect(periodicPool(3).length).toBeGreaterThan(36);
    expect(periodicPool(3).every((e) => e.group !== null)).toBe(true);
  });

  it('locate the one element at a group and period', () => {
    for (const seed of SEEDS) {
      const q = locateQuestion(createRng(seed), 2);
      const [, group, period] = /group (\d+), period (\d+)/.exec(q.prompt)!;
      q.choices.forEach((name, i) => {
        const e = byName(name);
        const there = e.group === +group && e.period === +period;
        expect(there).toBe(i === q.answer);
      });
    }
  });

  it('ask for an atomic number', () => {
    for (const seed of SEEDS) {
      const q = numberQuestion(createRng(seed), 1);
      const e = byName(/number of (\w+)\?/.exec(q.prompt)![1]);
      expect(q.choices[q.answer]).toBe(String(e.atomicNumber));
    }
  });

  it('ask for a block', () => {
    for (const seed of SEEDS) {
      const q = blockQuestion(createRng(seed), 3);
      const e = byName(/Which block is (\w+) in\?/.exec(q.prompt)![1]);
      expect(q.choices[q.answer]).toBe(`${e.block}-block`);
    }
  });

  it('ask which element is most electronegative, never close enough to tie', () => {
    for (const seed of SEEDS) {
      const q = electronegativityQuestion(createRng(seed), 3);
      const values = q.choices.map(
        (name) => ELECTRONEGATIVITY[byName(name).symbol],
      );
      const best = Math.max(...values);
      expect(values[q.answer]).toBe(best);
      for (const [i, v] of values.entries())
        if (i !== q.answer) expect(best - v).toBeGreaterThanOrEqual(0.1);
    }
  });
});

describe('the Sphinx’s riddles', () => {
  const fits = (r: ReturnType<typeof elementRiddle>) =>
    ELEMENTS.filter((e) => r.fits(e));

  it.each(['general', 'ap'] as const)(
    'each fit exactly one element, in the %s course',
    (course) => {
      for (const room of [0, 1])
        for (const seed of SEEDS) {
          const r = elementRiddle(createRng(seed), course, room);
          expect(fits(r)).toEqual([r.answer]);
          expect(r.prompt).not.toBe('');
        }
    },
  );

  it('finds an element by its place for General Chemistry, by its configuration for AP', () => {
    const general = elementRiddle(createRng(1), 'general', 0);
    expect(general.prompt).toMatch(/group \d+, period \d+/);
    const ap = elementRiddle(createRng(1), 'ap', 0);
    expect(ap.prompt).toMatch(/configuration ends in/);
    expect(formatConfiguration(groundState(ap.answer.atomicNumber))).toMatch(
      new RegExp(`${/ends in (\S+)\./.exec(ap.prompt)![1]}$`),
    );
  });

  it('asks for the most electronegative element of a period in the second room', () => {
    for (const seed of SEEDS) {
      const r = elementRiddle(createRng(seed), 'ap', 1);
      const period = Number(/period (\d)/.exec(r.prompt)![1]);
      const row = ELEMENTS.filter(
        (e) =>
          e.period === period &&
          e.group !== 18 &&
          e.symbol in ELECTRONEGATIVITY,
      );
      const best = Math.max(...row.map((e) => ELECTRONEGATIVITY[e.symbol]));
      expect(ELECTRONEGATIVITY[r.answer.symbol]).toBe(best);
    }
  });

  it('tells a wrong pick what it is instead', () => {
    const r = elementRiddle(createRng(1), 'general', 0);
    const wrong = ELEMENTS.find((e) => e !== r.answer && e.atomicNumber < 30)!;
    expect(r.hint(wrong)).toContain(wrong.name);
    expect(r.hint(wrong)).not.toBe('');
  });
});
