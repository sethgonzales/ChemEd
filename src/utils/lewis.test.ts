import {
  assessStructure,
  bestStructures,
  checkStructure,
  electronCount,
  electronsUsed,
  formalCharge,
  netCharge,
  octetStatus,
  parseFormula,
  sameSkeleton,
  sameStructure,
  totalValenceElectrons,
  validStructures,
  valenceElectrons,
  type LewisStructure,
  type Molecule,
} from './lewis';

/**
 * Builds a structure from a compact description:
 * atoms as [symbol, lonePairs, radicals?], bonds as [a, b, order].
 */
function lewis(
  atoms: [string, number, number?][],
  bonds: [number, number, 1 | 2 | 3][],
): LewisStructure {
  return {
    atoms: atoms.map(([symbol, lonePairs, radicals = 0], id) => ({
      id,
      symbol,
      x: id * 40,
      y: 0,
      lonePairs,
      radicals,
    })),
    bonds: bonds.map(([a, b, order]) => ({ a, b, order })),
  };
}

// Reference structures (atom 0 is the central atom unless noted)
const water = lewis(
  [
    ['O', 2],
    ['H', 0],
    ['H', 0],
  ],
  [
    [0, 1, 1],
    [0, 2, 1],
  ],
);
const carbonDioxide = lewis(
  [
    ['C', 0],
    ['O', 2],
    ['O', 2],
  ],
  [
    [0, 1, 2],
    [0, 2, 2],
  ],
);
// one resonance form: N=O plus two N–O⁻
const nitrate = lewis(
  [
    ['N', 0],
    ['O', 2],
    ['O', 3],
    ['O', 3],
  ],
  [
    [0, 1, 2],
    [0, 2, 1],
    [0, 3, 1],
  ],
);
const ammonium = lewis(
  [
    ['N', 0],
    ['H', 0],
    ['H', 0],
    ['H', 0],
    ['H', 0],
  ],
  [
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 1],
    [0, 4, 1],
  ],
);
const carbonMonoxide = lewis(
  [
    ['C', 1],
    ['O', 1],
  ],
  [[0, 1, 3]],
);
const boronTrifluoride = lewis(
  [
    ['B', 0],
    ['F', 3],
    ['F', 3],
    ['F', 3],
  ],
  [
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 1],
  ],
);
const sulfurHexafluoride = lewis(
  [['S', 0], ...Array.from({ length: 6 }, () => ['F', 3] as [string, number])],
  [1, 2, 3, 4, 5, 6].map((i) => [0, i, 1] as [number, number, 1]),
);
// nitric oxide: an odd-electron molecule, N has one unpaired electron
const nitricOxide = lewis(
  [
    ['N', 1, 1],
    ['O', 2],
  ],
  [[0, 1, 2]],
);

describe('valenceElectrons', () => {
  it.each([
    ['H', 1],
    ['He', 2],
    ['Na', 1],
    ['Be', 2],
    ['B', 3],
    ['C', 4],
    ['N', 5],
    ['O', 6],
    ['F', 7],
    ['Ne', 8],
    ['Al', 3],
    ['P', 5],
    ['S', 6],
    ['Cl', 7],
    ['Xe', 8],
  ])('%s has %i', (symbol, expected) => {
    expect(valenceElectrons(symbol)).toBe(expected);
  });

  it('returns null for transition metals, which are out of scope', () => {
    expect(valenceElectrons('Fe')).toBeNull();
  });

  it('throws for an unknown symbol', () => {
    expect(() => valenceElectrons('Xx')).toThrow('Unknown element: Xx');
  });
});

describe('parseFormula', () => {
  it('counts atoms of each element', () => {
    expect(parseFormula('NO3')).toEqual({ N: 1, O: 3 });
    expect(parseFormula('C2H4')).toEqual({ C: 2, H: 4 });
    expect(parseFormula('XeF4')).toEqual({ Xe: 1, F: 4 });
    expect(parseFormula('CH2O')).toEqual({ C: 1, H: 2, O: 1 });
  });

  it('throws for unknown elements or malformed formulas', () => {
    expect(() => parseFormula('Xx2')).toThrow();
    expect(() => parseFormula('h2o')).toThrow();
    expect(() => parseFormula('')).toThrow();
  });
});

describe('totalValenceElectrons', () => {
  it.each([
    ['H2O', 0, 8],
    ['CO2', 0, 16],
    ['NO3', -1, 24],
    ['NH4', 1, 8],
    ['SO4', -2, 32],
    ['XeF4', 0, 36],
    ['NO', 0, 11],
  ])('%s with charge %i has %i', (formula, charge, expected) => {
    expect(totalValenceElectrons(formula, charge)).toBe(expected);
  });
});

describe('electron counting', () => {
  it('counts every electron placed in the structure', () => {
    expect(electronsUsed(water)).toBe(8);
    expect(electronsUsed(carbonDioxide)).toBe(16);
    expect(electronsUsed(nitrate)).toBe(24);
    expect(electronsUsed(nitricOxide)).toBe(11);
  });

  it('counts the electrons around each atom (bonds count fully for both atoms)', () => {
    expect(electronCount(water, 0)).toBe(8);
    expect(electronCount(water, 1)).toBe(2);
    expect(electronCount(boronTrifluoride, 0)).toBe(6);
    expect(electronCount(sulfurHexafluoride, 0)).toBe(12);
    expect(electronCount(nitricOxide, 0)).toBe(7);
  });
});

describe('formalCharge', () => {
  it('is zero for every atom in neutral molecules with ideal structures', () => {
    for (const s of [water, carbonDioxide, boronTrifluoride]) {
      s.atoms.forEach((a) => expect(formalCharge(s, a.id)).toBe(0));
    }
  });

  it('matches textbook values for ions and CO', () => {
    expect(formalCharge(nitrate, 0)).toBe(1);
    expect(formalCharge(nitrate, 1)).toBe(0);
    expect(formalCharge(nitrate, 2)).toBe(-1);
    expect(formalCharge(ammonium, 0)).toBe(1);
    expect(formalCharge(carbonMonoxide, 0)).toBe(-1);
    expect(formalCharge(carbonMonoxide, 1)).toBe(1);
  });

  it('adds up to the overall charge', () => {
    expect(netCharge(nitrate)).toBe(-1);
    expect(netCharge(ammonium)).toBe(1);
    expect(netCharge(carbonMonoxide)).toBe(0);
  });
});

describe('octetStatus', () => {
  it('treats hydrogen as complete with two electrons (a duet)', () => {
    expect(octetStatus(water, 1)).toMatchObject({
      electrons: 2,
      target: 2,
      status: 'complete',
      ok: true,
    });
  });

  it('is complete with eight electrons', () => {
    expect(octetStatus(water, 0)).toMatchObject({
      status: 'complete',
      ok: true,
    });
  });

  it('allows boron an incomplete octet', () => {
    expect(octetStatus(boronTrifluoride, 0)).toMatchObject({
      electrons: 6,
      status: 'incomplete',
      ok: true,
    });
  });

  it('does not allow carbon an incomplete octet', () => {
    const methyl = lewis(
      [
        ['C', 0],
        ['H', 0],
        ['H', 0],
        ['H', 0],
      ],
      [
        [0, 1, 1],
        [0, 2, 1],
        [0, 3, 1],
      ],
    );
    expect(octetStatus(methyl, 0)).toMatchObject({
      status: 'incomplete',
      ok: false,
    });
  });

  it('allows an expanded octet from period 3 down', () => {
    expect(octetStatus(sulfurHexafluoride, 0)).toMatchObject({
      electrons: 12,
      status: 'expanded',
      ok: true,
    });
  });

  it('does not allow a period 2 atom more than eight electrons', () => {
    const fiveBondCarbon = lewis(
      [
        ['C', 0],
        ...Array.from({ length: 5 }, () => ['H', 0] as [string, number]),
      ],
      [1, 2, 3, 4, 5].map((i) => [0, i, 1] as [number, number, 1]),
    );
    expect(octetStatus(fiveBondCarbon, 0)).toMatchObject({
      electrons: 10,
      status: 'expanded',
      ok: false,
    });
  });

  it('allows an atom with an unpaired electron to fall short (radicals)', () => {
    expect(octetStatus(nitricOxide, 0)).toMatchObject({
      electrons: 7,
      status: 'incomplete',
      ok: true,
    });
  });
});

describe('checkStructure', () => {
  const kinds = (s: LewisStructure, formula: string, charge = 0) =>
    checkStructure(s, { formula, charge }).map((f) => f.kind);

  it('finds no problems with correct structures', () => {
    expect(checkStructure(water, { formula: 'H2O', charge: 0 })).toEqual([]);
    expect(checkStructure(nitrate, { formula: 'NO3', charge: -1 })).toEqual([]);
    expect(
      checkStructure(sulfurHexafluoride, { formula: 'SF6', charge: 0 }),
    ).toEqual([]);
    expect(checkStructure(nitricOxide, { formula: 'NO', charge: 0 })).toEqual(
      [],
    );
  });

  it('reports the wrong number of electrons with the counts', () => {
    const short = lewis(
      [
        ['O', 1],
        ['H', 0],
        ['H', 0],
      ],
      [
        [0, 1, 1],
        [0, 2, 1],
      ],
    );
    const feedback = checkStructure(short, { formula: 'H2O', charge: 0 });
    const total = feedback.find((f) => f.kind === 'electron-total');
    expect(total?.message).toMatch(/6 of 8/);
    expect(feedback.find((f) => f.kind === 'octet')?.atom).toBe(0);
  });

  it('reports a skeleton whose atoms do not match the formula', () => {
    expect(kinds(water, 'H2S')).toContain('atoms');
  });

  it('reports atoms that are not connected to the rest', () => {
    const loose = lewis(
      [
        ['O', 2],
        ['H', 0],
        ['H', 1],
      ],
      [[0, 1, 1]],
    );
    expect(kinds(loose, 'H2O')).toContain('disconnected');
  });

  it('reports a period 2 atom with an expanded octet', () => {
    const overloaded = lewis(
      [
        ['C', 0],
        ['O', 2],
        ['O', 0],
      ],
      [
        [0, 1, 2],
        [0, 2, 3],
      ],
    );
    const octet = checkStructure(overloaded, {
      formula: 'CO2',
      charge: 0,
    }).filter((f) => f.kind === 'octet');
    expect(octet.map((f) => f.atom)).toContain(0);
  });

  it('tells students hydrogen can only hold two electrons', () => {
    const doubleBondedH = lewis(
      [
        ['O', 2],
        ['H', 0],
        ['H', 0],
      ],
      [
        [0, 1, 2],
        [0, 2, 1],
      ],
    );
    const octet = checkStructure(doubleBondedH, {
      formula: 'H2O',
      charge: 0,
    }).find((f) => f.kind === 'octet' && f.atom === 1);
    expect(octet?.message).toBe('H has 4 electrons. It can only hold 2.');
  });

  it('gives every problem a short message for students', () => {
    const empty = lewis(
      [
        ['O', 0],
        ['H', 0],
        ['H', 0],
      ],
      [],
    );
    const feedback = checkStructure(empty, { formula: 'H2O', charge: 0 });
    expect(feedback.length).toBeGreaterThan(0);
    for (const f of feedback) {
      expect(f.message.length).toBeGreaterThan(0);
      expect(f.message.length).toBeLessThan(140);
    }
  });
});

describe('sameStructure', () => {
  it('ignores where atoms are drawn and how they are numbered', () => {
    const reordered = lewis(
      [
        ['H', 0],
        ['O', 2],
        ['H', 0],
      ],
      [
        [1, 0, 1],
        [2, 1, 1],
      ],
    );
    reordered.atoms[0].x = 300;
    expect(sameStructure(water, reordered)).toBe(true);
  });

  it('treats equivalent resonance forms as the same structure', () => {
    const otherForm = lewis(
      [
        ['N', 0],
        ['O', 3],
        ['O', 2],
        ['O', 3],
      ],
      [
        [0, 1, 1],
        [0, 2, 2],
        [0, 3, 1],
      ],
    );
    // same shape, double bond on a different (but equivalent) oxygen
    expect(sameStructure(nitrate, otherForm)).toBe(true);
  });

  it('notices different lone pairs, bond orders or atoms', () => {
    const fewerPairs = lewis(
      [
        ['O', 1],
        ['H', 0],
        ['H', 0],
      ],
      [
        [0, 1, 1],
        [0, 2, 1],
      ],
    );
    expect(sameStructure(water, fewerPairs)).toBe(false);
    expect(sameStructure(water, carbonDioxide)).toBe(false);
  });
});

describe('sameSkeleton', () => {
  it('compares only which atoms are bonded', () => {
    const hcn = lewis(
      [
        ['C', 0],
        ['H', 0],
        ['N', 1],
      ],
      [
        [0, 1, 1],
        [0, 2, 3],
      ],
    );
    const hcnWrongElectrons = lewis(
      [
        ['C', 1],
        ['H', 0],
        ['N', 2],
      ],
      [
        [0, 1, 1],
        [0, 2, 1],
      ],
    );
    const hnc = lewis(
      [
        ['N', 0],
        ['H', 0],
        ['C', 1],
      ],
      [
        [0, 1, 1],
        [0, 2, 3],
      ],
    );
    expect(sameSkeleton(hcn, hcnWrongElectrons)).toBe(true);
    expect(sameSkeleton(hcn, hnc)).toBe(false);
  });
});

const skeletonOf = (
  formula: string,
  atoms: string[],
  bonds: [number, number][],
) => ({
  formula,
  skeleton: { atoms: atoms.map((symbol) => ({ symbol })), bonds },
});

describe('validStructures', () => {
  it('finds every structure that obeys the electron total and octet rules', () => {
    const { skeleton } = skeletonOf(
      'CO2',
      ['C', 'O', 'O'],
      [
        [0, 1],
        [0, 2],
      ],
    );
    const found = validStructures(skeleton, { formula: 'CO2', charge: 0 });
    // O=C=O plus the two O≡C–O forms
    expect(found).toHaveLength(3);
    for (const s of found) {
      expect(checkStructure(s, { formula: 'CO2', charge: 0 })).toEqual([]);
    }
    expect(found.some((s) => sameStructure(s, carbonDioxide))).toBe(true);
  });

  it('places one unpaired electron for odd-electron molecules', () => {
    const { skeleton } = skeletonOf('NO', ['N', 'O'], [[0, 1]]);
    const found = validStructures(skeleton, { formula: 'NO', charge: 0 });
    expect(found.some((s) => sameStructure(s, nitricOxide))).toBe(true);
    for (const s of found) {
      expect(s.atoms.reduce((n, a) => n + a.radicals, 0)).toBe(1);
    }
  });
});

describe('bestStructures', () => {
  it('prefers the smallest formal charges', () => {
    const { skeleton } = skeletonOf(
      'CO2',
      ['C', 'O', 'O'],
      [
        [0, 1],
        [0, 2],
      ],
    );
    const best = bestStructures(
      validStructures(skeleton, { formula: 'CO2', charge: 0 }),
    );
    expect(best).toHaveLength(1);
    expect(sameStructure(best[0], carbonDioxide)).toBe(true);
  });

  it('keeps every resonance form', () => {
    const { skeleton } = skeletonOf(
      'NO3',
      ['N', 'O', 'O', 'O'],
      [
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    );
    const best = bestStructures(
      validStructures(skeleton, { formula: 'NO3', charge: -1 }),
    );
    expect(best).toHaveLength(3);
  });

  it('does not expand an octet when that doesn’t lower formal charges', () => {
    // Cl≡Cl with two lone pairs each also has zero formal charges, but
    // nothing justifies giving chlorine 10 electrons
    const { skeleton } = skeletonOf('Cl2', ['Cl', 'Cl'], [[0, 1]]);
    const best = bestStructures(
      validStructures(skeleton, { formula: 'Cl2', charge: 0 }),
    );
    expect(best).toHaveLength(1);
    expect(best[0].bonds[0].order).toBe(1);
  });

  it('breaks ties by putting negative charge on the more electronegative atom', () => {
    // sulfate: two S=O (O⁻ ×2), three S=O (S⁻, O⁻) and four S=O (S²⁻) all
    // have total |formal charge| 2; oxygen is more electronegative than sulfur
    const { skeleton } = skeletonOf(
      'SO4',
      ['S', 'O', 'O', 'O', 'O'],
      [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
    );
    const best = bestStructures(
      validStructures(skeleton, { formula: 'SO4', charge: -2 }),
    );
    expect(best).toHaveLength(6);
    for (const s of best) expect(formalCharge(s, 0)).toBe(0);
  });
});

describe('assessStructure', () => {
  const nitrateMolecule: Molecule = {
    id: 'nitrate',
    name: 'Nitrate ion',
    formula: 'NO3',
    charge: -1,
    level: 4,
    skeleton: {
      atoms: [
        { symbol: 'N' },
        { symbol: 'O' },
        { symbol: 'O' },
        { symbol: 'O' },
      ],
      bonds: [
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    answers: [
      { lonePairs: [0, 2, 3, 3], orders: [2, 1, 1] },
      { lonePairs: [0, 3, 2, 3], orders: [1, 2, 1] },
      { lonePairs: [0, 3, 3, 2], orders: [1, 1, 2] },
    ],
  };

  const sulfurDioxide: Molecule = {
    id: 'sulfur-dioxide',
    name: 'Sulfur dioxide',
    formula: 'SO2',
    charge: 0,
    level: 4,
    skeleton: {
      atoms: [{ symbol: 'S' }, { symbol: 'O' }, { symbol: 'O' }],
      bonds: [
        [0, 1],
        [0, 2],
      ],
    },
    answers: [{ lonePairs: [1, 2, 2], orders: [2, 2] }],
    alsoAccepted: [
      { lonePairs: [1, 2, 3], orders: [2, 1] },
      { lonePairs: [1, 3, 2], orders: [1, 2] },
    ],
    note: 'Expanding sulfur’s octet gives smaller formal charges.',
  };

  it('marks a best answer correct and mentions resonance', () => {
    const result = assessStructure(nitrate, nitrateMolecule);
    expect(result.verdict).toBe('best');
    expect(result.feedback.map((f) => f.message).join(' ')).toMatch(
      /one of 3 resonance structures/,
    );
  });

  it('accepts octet-rule answers with the molecule’s note', () => {
    const octetForm = lewis(
      [
        ['S', 1],
        ['O', 2],
        ['O', 3],
      ],
      [
        [0, 1, 2],
        [0, 2, 1],
      ],
    );
    const result = assessStructure(octetForm, sulfurDioxide);
    expect(result.verdict).toBe('accepted');
    expect(result.feedback[0].message).toBe(sulfurDioxide.note);
  });

  it('passes on checkStructure problems as invalid', () => {
    const result = assessStructure(water, nitrateMolecule);
    expect(result.verdict).toBe('invalid');
    expect(result.feedback.map((f) => f.kind)).toContain('atoms');
  });

  it('flags a valid structure on the wrong skeleton', () => {
    // N–O–O–O chain: right atoms, wrong connections
    const chain = lewis(
      [
        ['N', 2],
        ['O', 2],
        ['O', 2],
        ['O', 3],
      ],
      [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
      ],
    );
    const result = assessStructure(chain, nitrateMolecule);
    expect(result.feedback.map((f) => f.kind)).toContain('skeleton');
    expect(result.verdict).not.toBe('best');
  });

  it('says when an octet was expanded for no reason', () => {
    const chlorine: Molecule = {
      id: 'chlorine',
      name: 'Chlorine',
      formula: 'Cl2',
      charge: 0,
      level: 1,
      skeleton: {
        atoms: [{ symbol: 'Cl' }, { symbol: 'Cl' }],
        bonds: [[0, 1]],
      },
      answers: [{ lonePairs: [3, 3], orders: [1] }],
    };
    const triple = lewis(
      [
        ['Cl', 2],
        ['Cl', 2],
      ],
      [[0, 1, 3]],
    );
    const result = assessStructure(triple, chlorine);
    expect(result.verdict).toBe('valid');
    expect(result.feedback).toEqual([
      {
        kind: 'unneeded-expansion',
        message:
          'This works, but an atom has more electrons than it needs. Expand an octet only when it lowers formal charges.',
      },
    ]);
  });

  it('says when formal charges could be smaller', () => {
    // nitrate with every N–O single and N carrying a lone pair is invalid
    // (too many electrons), so use CO2's O≡C–O form against a CO2 molecule
    const co2: Molecule = {
      id: 'carbon-dioxide',
      name: 'Carbon dioxide',
      formula: 'CO2',
      charge: 0,
      level: 2,
      skeleton: {
        atoms: [{ symbol: 'C' }, { symbol: 'O' }, { symbol: 'O' }],
        bonds: [
          [0, 1],
          [0, 2],
        ],
      },
      answers: [{ lonePairs: [0, 2, 2], orders: [2, 2] }],
    };
    const tripleForm = lewis(
      [
        ['C', 0],
        ['O', 1],
        ['O', 3],
      ],
      [
        [0, 1, 3],
        [0, 2, 1],
      ],
    );
    const result = assessStructure(tripleForm, co2);
    expect(result.verdict).toBe('valid');
    expect(result.feedback.map((f) => f.kind)).toContain('formal-charge');
  });
});
