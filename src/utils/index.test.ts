import { findElement, findElementsBySymbol, formatAtomicMass } from './index';

describe('findElement', () => {
  it('finds an element by symbol', () => {
    expect(findElement('Na')).toMatchObject({
      atomicNumber: 11,
      name: 'Sodium',
    });
  });

  it('is case-sensitive and returns null for unknown symbols', () => {
    expect(findElement('na')).toBeNull();
    expect(findElement('Xx')).toBeNull();
  });
});

describe('findElementsBySymbol', () => {
  it('returns a single element for a single symbol', () => {
    expect(findElementsBySymbol('O')).toMatchObject({ atomicNumber: 8 });
  });

  it('returns elements in the order requested, skipping unknown symbols', () => {
    const result = findElementsBySymbol(['N', 'Xx', 'H']);
    expect(Array.isArray(result) && result.map((e) => e.symbol)).toEqual([
      'N',
      'H',
    ]);
  });

  it('returns an empty array for an empty list and null for no input', () => {
    expect(findElementsBySymbol([])).toEqual([]);
    expect(findElementsBySymbol(null)).toBeNull();
    expect(findElementsBySymbol('')).toBeNull();
  });
});

describe('formatAtomicMass', () => {
  it('rounds a standard atomic weight', () => {
    expect(formatAtomicMass(55.845, 2)).toBe('55.85');
  });

  it('shows the mass number of the most stable isotope in brackets for elements with no stable isotopes', () => {
    expect(formatAtomicMass(266, 2)).toBe('[266]');
    expect(formatAtomicMass(98, 2)).toBe('[98]');
  });

  it('says when the mass is unknown', () => {
    expect(formatAtomicMass(null, 2)).toBe('Unknown');
  });
});
