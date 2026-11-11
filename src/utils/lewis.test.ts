import {
  checkStructure,
  electronCount,
  electronsUsed,
  formalCharge,
  netCharge,
  octetStatus,
  parseFormula,
  totalValenceElectrons,
  valenceElectrons,
  type LewisStructure,
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
