import { REACTIONS } from '~/constants/reactions';
import { COURSES, createRng, type Course } from '~/utils/quest';
import { elementTally, isBalanced, parseEquation } from '~/utils/reactions';
import {
  BALANCING_LEVELS,
  balancingQuestion,
  balancingRooms,
  blankQuestion,
  countQuestion,
  whichOptions,
  whichQuestion,
  writeEquation,
} from './quest-balancing';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const reaction = (id: string) => REACTIONS.find((r) => r.id === id)!;
const methane = reaction('methane'); // CH4 + 2 O2 -> CO2 + 2 H2O

describe('writeEquation', () => {
  it('writes coefficients, leaving out 1s, with subscripts and an arrow', () => {
    expect(writeEquation(parseEquation(methane.equation), [1, 2, 1, 2])).toBe(
      'CH₄ + 2 O₂ → CO₂ + 2 H₂O',
    );
  });

  it('shows a blank as a gap to fill', () => {
    expect(
      writeEquation(parseEquation(methane.equation), [1, null, 1, 2]),
    ).toBe('CH₄ + __ O₂ → CO₂ + 2 H₂O');
  });
});

describe('both courses', () => {
  it.each(Object.keys(COURSES) as Course[])(
    'has reactions at every level of the %s course',
    (course) => {
      const [easiest, hardest] = BALANCING_LEVELS[course];
      for (let level = easiest; level <= hardest; level++)
        expect(REACTIONS.some((r) => r.level === level)).toBe(true);
    },
  );
});

describe('rooms', () => {
  it.each(Object.keys(COURSES) as Course[])(
    'go from the %s course’s easiest level to its hardest, with different reactions',
    (course) => {
      const [easiest, hardest] = BALANCING_LEVELS[course];
      for (const seed of SEEDS) {
        const rooms = balancingRooms(createRng(seed), course, 2);
        expect(rooms.map((r) => r.level)).toEqual([easiest, hardest]);
        expect(rooms[0].id).not.toBe(rooms[1].id);
      }
    },
  );
});

// the shared rules for every question
function checkChoices(q: { choices: string[]; answer: number }) {
  expect(q.choices.length).toBeGreaterThanOrEqual(3);
  expect(new Set(q.choices).size).toBe(q.choices.length);
  expect(q.answer).toBeGreaterThanOrEqual(0);
  expect(q.answer).toBeLessThan(q.choices.length);
}

describe('a fill-the-blank question', () => {
  it('has one coefficient that balances the equation; every other choice leaves it unbalanced', () => {
    for (const r of REACTIONS)
      for (const seed of SEEDS.slice(0, 5)) {
        const q = blankQuestion(r, createRng(seed));
        checkChoices(q);
        expect(q.shown).toContain('__');
        const eq = parseEquation(r.equation);
        q.choices.forEach((choice, i) => {
          const coefficients = r.answer.map((c, k) =>
            k === q.blank ? Number(choice) : c,
          );
          expect(isBalanced(eq, coefficients)).toBe(i === q.answer);
        });
      }
  });
});

describe('a which-is-balanced question', () => {
  it('offers exactly one balanced equation, the right one', () => {
    for (const r of REACTIONS)
      for (const seed of SEEDS.slice(0, 5)) {
        const eq = parseEquation(r.equation);
        const options = whichOptions(r, createRng(seed));
        const balanced = options.filter((o) => isBalanced(eq, o));
        expect(balanced).toEqual([r.answer]);
        expect(options.length).toBeGreaterThanOrEqual(3);
      }
  });

  it('shows the right equation as the answer', () => {
    const q = whichQuestion(methane, createRng(3));
    checkChoices(q);
    expect(q.choices[q.answer]).toBe('CH₄ + 2 O₂ → CO₂ + 2 H₂O');
  });
});

describe('a counting question', () => {
  it('asks for the atoms of one element on each side of the balanced equation', () => {
    for (const r of REACTIONS)
      for (const seed of SEEDS.slice(0, 5)) {
        const q = countQuestion(r, createRng(seed));
        checkChoices(q);
        const row = elementTally(parseEquation(r.equation), r.answer).find(
          (t) => t.element === q.element,
        )!;
        expect(q.choices[q.answer]).toBe(String(row.reactants));
        expect(q.prompt).toContain(q.element);
      }
  });
});

describe('balancingQuestion', () => {
  it.each([1, 2, 3, 4])(
    'asks about a level %i reaction, and explains its answer',
    (level) => {
      for (const seed of SEEDS) {
        const q = balancingQuestion(createRng(seed), level);
        checkChoices(q);
        expect(REACTIONS.find((r) => r.name === q.about)?.level).toBe(level);
        expect(q.explain).not.toBe('');
      }
    },
  );

  it('mixes the kinds of question', () => {
    const prompts = new Set(
      SEEDS.map(
        (seed) => balancingQuestion(createRng(seed), 2).prompt.split(' ')[0],
      ),
    );
    expect(prompts.size).toBeGreaterThanOrEqual(3);
  });

  it('gives the same question for the same seed, and others for others', () => {
    expect(balancingQuestion(createRng(5), 1)).toEqual(
      balancingQuestion(createRng(5), 1),
    );
    const all = SEEDS.map((s) =>
      JSON.stringify(balancingQuestion(createRng(s), 1)),
    );
    expect(new Set(all).size).toBeGreaterThan(10);
  });
});
