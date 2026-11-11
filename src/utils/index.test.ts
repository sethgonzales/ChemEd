import { findElement, findElementsBySymbol } from './index';

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
