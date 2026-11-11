import {
  atomTotals,
  beamAngle,
  elementTally,
  isBalanced,
  isLowestTerms,
  parseCompound,
  parseEquation,
  solve,
  type Reaction,
} from './reactions';

const reaction = (equation: string): Reaction => parseEquation(equation);

describe('parseCompound', () => {
  it.each([
    ['H2O', { H: 2, O: 1 }],
    ['NaCl', { Na: 1, Cl: 1 }],
    ['C2H5OH', { C: 2, H: 6, O: 1 }],
    ['Ca3(PO4)2', { Ca: 3, P: 2, O: 8 }],
    ['(NH4)2SO4', { N: 2, H: 8, S: 1, O: 4 }],
    ['Fe2(SO4)3', { Fe: 2, S: 3, O: 12 }],
    ['Mg(Al(OH)4)2', { Mg: 1, Al: 2, O: 8, H: 8 }],
    ['K4[Fe(CN)6]', { K: 4, Fe: 1, C: 6, N: 6 }],
  ])('counts the atoms in %s', (formula, counts) => {
    expect(parseCompound(formula)).toEqual(counts);
  });

  it.each(['', 'h2o', 'Xx2', 'Ca3(PO4', 'H2O)', '2H2O'])(
    'rejects %p',
    (formula) => {
      expect(() => parseCompound(formula)).toThrow();
    },
  );
});

describe('parseEquation', () => {
  it('reads reactants and products, with any arrow', () => {
    for (const arrow of ['->', '→', '=']) {
      expect(parseEquation(`CH4 + O2 ${arrow} CO2 + H2O`)).toEqual({
        reactants: ['CH4', 'O2'],
        products: ['CO2', 'H2O'],
      });
    }
  });

  it('ignores coefficients and extra spaces', () => {
    expect(parseEquation('  2H2 +O2->2 H2O ')).toEqual({
      reactants: ['H2', 'O2'],
      products: ['H2O'],
    });
  });

  it('rejects equations without two sides or with bad formulas', () => {
    expect(() => parseEquation('H2 + O2')).toThrow('Use an arrow');
    expect(() => parseEquation('-> H2O')).toThrow();
    expect(() => parseEquation('H2 + Xx -> H2Xx')).toThrow('Xx');
  });
});

describe('elementTally', () => {
  it('counts each element on both sides, in order of first appearance', () => {
    expect(
      elementTally(reaction('CH4 + O2 -> CO2 + H2O'), [1, 2, 1, 2]),
    ).toEqual([
      { element: 'C', reactants: 1, products: 1 },
      { element: 'H', reactants: 4, products: 4 },
      { element: 'O', reactants: 4, products: 4 },
    ]);
  });
});

describe('atomTotals', () => {
  it('counts every atom on each side', () => {
    // 1 H₂ + 1 O₂ (4 atoms) against 1 H₂O (3 atoms)
    expect(atomTotals(reaction('H2 + O2 -> H2O'), [1, 1, 1])).toEqual({
      reactants: 4,
      products: 3,
    });
    expect(atomTotals(reaction('CH4 + O2 -> CO2 + H2O'), [1, 2, 1, 2])).toEqual(
      { reactants: 9, products: 9 },
    );
  });
});

describe('isBalanced', () => {
  const water = reaction('H2 + O2 -> H2O');

  it('needs every element to match', () => {
    expect(isBalanced(water, [2, 1, 2])).toBe(true);
    expect(isBalanced(water, [4, 2, 4])).toBe(true);
    expect(isBalanced(water, [1, 1, 1])).toBe(false);
  });

  it('needs positive whole-number coefficients', () => {
    expect(isBalanced(water, [0, 0, 0])).toBe(false);
    expect(isBalanced(water, [1, 0.5, 1])).toBe(false);
  });
});

describe('isLowestTerms', () => {
  it('is false when every coefficient shares a factor', () => {
    expect(isLowestTerms([2, 1, 2])).toBe(true);
    expect(isLowestTerms([4, 2, 4])).toBe(false);
    expect(isLowestTerms([3, 9, 6])).toBe(false);
  });
});

describe('solve', () => {
  it.each([
    ['H2 + O2 -> H2O', [2, 1, 2]],
    ['CH4 + O2 -> CO2 + H2O', [1, 2, 1, 2]],
    ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
    ['Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', [3, 2, 1, 6]],
    ['Cu + HNO3 -> Cu(NO3)2 + NO + H2O', [3, 8, 3, 2, 4]],
    ['KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O', [2, 16, 2, 2, 5, 8]],
  ])('balances %s', (equation, coefficients) => {
    expect(solve(reaction(equation))).toEqual(coefficients);
  });

  it('returns null when an equation can’t be balanced', () => {
    expect(solve(reaction('H2 -> O2'))).toBeNull();
  });

  it('returns null when there is more than one independent answer', () => {
    expect(solve(reaction('H2 + O2 -> H2O + H2O2'))).toBeNull();
  });
});

describe('beamAngle', () => {
  it('is level when the sides weigh the same', () => {
    expect(beamAngle(36, 36)).toBe(0);
  });

  it('tips toward the heavier side, products to the right', () => {
    expect(beamAngle(10, 20)).toBeGreaterThan(0);
    expect(beamAngle(20, 10)).toBeLessThan(0);
  });

  it('never tips past 12°', () => {
    expect(beamAngle(1, 1000)).toBe(12);
    expect(beamAngle(1000, 1)).toBe(-12);
  });

  it('tips further for bigger differences', () => {
    expect(beamAngle(30, 40)).toBeGreaterThan(beamAngle(30, 32));
  });
});
