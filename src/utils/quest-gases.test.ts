import { solveGas, toSI, type Gas } from '~/utils/gas-laws';
import { createRng } from '~/utils/quest';
import {
  GAS_LEVELS,
  format,
  gasProblem,
  gasQuestion,
  isRight,
  problemText,
  roomProblem,
  scaleBy,
  solveQuestion,
  whichLawQuestion,
  whichWayQuestion,
  type GasProblem,
} from './quest-gases';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const SIMPLE = ['boyle', 'charles', 'gay-lussac', 'avogadro'] as const;
const FRIENDLY = ['atm', 'kPa', 'L', 'K', 'mol'];

/** The answer worked from the givens alone, in SI */
function solveFromGivens(p: GasProblem) {
  const state = (n: '₁' | '₂' | '') =>
    Object.fromEntries(
      p.givens
        .filter((g) => g.symbol.endsWith(n === '' ? '' : n))
        .filter((g) => n !== '' || !/[₁₂]$/.test(g.symbol))
        .map((g) => [g.quantity, toSI(g.value, g.unit)]),
    ) as Partial<Gas>;
  if (p.law === 'ideal') return solveGas(state(''))[p.find.quantity];
  // the quantities held fixed cancel, so any equal values stand in for them
  const before = { p: 1, v: 1, n: 1, t: 1, ...state('₁') };
  const after: Partial<Gas> = { ...before, ...state('₂') };
  delete after[p.find.quantity];
  return solveGas(before, after)[p.find.quantity];
}

describe('gas law problems', () => {
  it.each(['general', 'ap'] as const)(
    'have answers that follow from the numbers shown (%s)',
    (course) => {
      for (const law of [...SIMPLE, 'combined', 'ideal'] as const)
        for (const seed of SEEDS.slice(0, 40)) {
          const p = gasProblem(createRng(seed), law, course);
          expect(p.answer / solveFromGivens(p)).toBeCloseTo(1, 9);
          expect(p.answer).toBeGreaterThan(0);
        }
    },
  );

  it('keep to friendly units for General Chemistry, the same unit for a quantity throughout', () => {
    for (const seed of SEEDS) {
      const p = roomProblem(createRng(seed), 'general', seed % 2);
      const units = [...p.givens.map((g) => g.unit), p.find.unit];
      for (const u of units) expect(FRIENDLY).toContain(u);
      const pressures = new Set(
        p.givens.filter((g) => g.quantity === 'p').map((g) => g.unit),
      );
      expect(pressures.size).toBeLessThanOrEqual(1);
    }
  });

  it('mix the units for AP, so converting is part of the problem', () => {
    const units = new Set(
      SEEDS.flatMap((seed) => {
        const p = roomProblem(createRng(seed), 'ap', seed % 2);
        return [...p.givens.map((g) => g.unit), p.find.unit];
      }),
    );
    for (const u of ['°C', 'mmHg', 'mL', 'kPa', 'atm'])
      expect(units).toContain(u);
  });

  it('give volumes in millilitres only at glassware sizes, under a litre', () => {
    for (const seed of SEEDS) {
      const p = roomProblem(createRng(seed), 'ap', seed % 2);
      for (const g of p.givens)
        if (g.unit === 'mL') expect(g.value).toBeLessThan(1000);
    }
  });

  it('give one law in the first room, and the combined or ideal law in the second', () => {
    const first = new Set(
      SEEDS.map((s) => roomProblem(createRng(s), 'general', 0).law),
    );
    const second = new Set(
      SEEDS.map((s) => roomProblem(createRng(s), 'general', 1).law),
    );
    expect([...first].sort()).toEqual([...SIMPLE].sort());
    expect([...second].sort()).toEqual(['combined', 'ideal']);
  });

  it('accept an answer within 2%, in any unit, and nothing further off', () => {
    const p = gasProblem(createRng(3), 'boyle', 'general');
    expect(isRight(p, p.answer)).toBe(true);
    expect(isRight(p, p.answer * 1.015)).toBe(true);
    expect(isRight(p, p.answer * 1.05)).toBe(false);
    expect(isRight(p, p.answer * 0.95)).toBe(false);
  });

  it('say what is held fixed, show every given, and ask for one value', () => {
    const p = gasProblem(createRng(8), 'charles', 'general');
    const text = problemText(p);
    expect(text).toMatch(/pressure/i);
    for (const g of p.givens) expect(text).toContain(g.symbol);
    expect(text).toContain(`Find ${p.find.symbol}`);
  });

  it('are worked through to the answer', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const p = roomProblem(createRng(seed), 'ap', seed % 2);
      expect(p.worked.length).toBeGreaterThan(1);
      expect(p.worked.join(' ')).toContain(p.find.symbol);
    }
  });
});

describe('the Djinn’s questions', () => {
  it('ask General Chemistry levels 1–2 and AP levels 2–3', () => {
    expect(GAS_LEVELS).toEqual({ general: [1, 2], ap: [2, 3] });
  });

  it('name the law that a scenario follows', () => {
    for (const seed of SEEDS) {
      const q = whichLawQuestion(createRng(seed));
      expect(q.choices[q.answer]).toMatch(/law/);
      expect(q.explain).toContain(q.choices[q.answer]);
      // shown over the question, so it mustn't name the answer
      expect(q.about).not.toContain(q.choices[q.answer]);
    }
  });

  it('say which way a quantity goes, as the gas laws have it', () => {
    // inversely for Boyle's law, directly for the others
    expect(scaleBy('boyle', { p: 2 }, 'v')).toBeCloseTo(1 / 2);
    expect(scaleBy('charles', { t: 3 }, 'v')).toBeCloseTo(3);
    expect(scaleBy('gay-lussac', { p: 1 / 2 }, 't')).toBeCloseTo(1 / 2);
    expect(scaleBy('avogadro', { v: 4 }, 'n')).toBeCloseTo(4);
    expect(scaleBy('combined', { p: 2, t: 2 }, 'v')).toBeCloseTo(1);
    const words = {
      'It quadruples': 4,
      'It triples': 3,
      'It doubles': 2,
      'It stays the same': 1,
      'It is halved': 1 / 2,
      'It falls to a third': 1 / 3,
      'It falls to a quarter': 1 / 4,
    };
    for (const seed of SEEDS) {
      const q = whichWayQuestion(createRng(seed));
      expect(Object.keys(words)).toContain(q.choices[q.answer]);
    }
  });

  it('offer the real slips as wrong answers: the ratio flipped, or °C left unconverted', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const { problem, question } = solveQuestion(
        createRng(seed),
        'boyle',
        'general',
      );
      const [x1, ratio1, ratio2] = ['₁', '₁', '₂'].map(
        (n, i) =>
          problem.givens.find(
            (g) =>
              g.symbol.endsWith(n) &&
              (i === 0) === (g.quantity === problem.find.quantity),
          )!.value,
      );
      // flipped: V₂ = V₁ × P₂ ÷ P₁ rather than × P₁ ÷ P₂
      const flipped = format(x1 * (ratio2 / ratio1), problem.find.unit);
      expect(question.choices).toContain(flipped);
      expect(question.choices[question.answer]).not.toBe(flipped);
    }
    const celsius = SEEDS.map(
      (s) => solveQuestion(createRng(s), 'charles', 'ap').problem,
    ).find((p) => p.givens.some((g) => g.unit === '°C'));
    expect(celsius).toBeDefined();
    expect(celsius!.worked.join(' ')).toContain('+ 273.15');
  });

  it('only ask the combined and ideal laws, in mixed units, at level 3', () => {
    const laws = new Set(SEEDS.map((s) => gasQuestion(createRng(s), 3).about));
    expect(laws).toContain('The combined gas law');
    expect(laws).toContain('The ideal gas law');
  });
});
