import { ELEMENTS } from './elements';

const isLanthanideOrActinide = (n: number) =>
  (n >= 58 && n <= 70) || (n >= 90 && n <= 102);

describe('ELEMENTS', () => {
  it('lists all 118 elements in atomic number order', () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((el, i) => expect(el.atomicNumber).toBe(i + 1));
  });

  it('has unique symbols and names', () => {
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => e.name)).size).toBe(118);
  });

  it('gives every element a valid period, block, mass and configuration', () => {
    for (const el of ELEMENTS) {
      expect(el.period).toBeGreaterThanOrEqual(1);
      expect(el.period).toBeLessThanOrEqual(7);
      expect(['s', 'p', 'd', 'f']).toContain(el.block);
      expect(el.atomicMass).toBeGreaterThan(0);
      expect(el.electronConfiguration).toBeTruthy();
    }
  });

  it('has no group only for the f-block series (Ce–Yb, Th–No)', () => {
    for (const el of ELEMENTS) {
      if (isLanthanideOrActinide(el.atomicNumber)) {
        expect(el.group).toBeNull();
      } else {
        expect(el.group).toBeGreaterThanOrEqual(1);
        expect(el.group).toBeLessThanOrEqual(18);
      }
    }
  });

  it('matches known values for spot-checked elements', () => {
    const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.symbol, e]));
    expect(bySymbol.H).toMatchObject({
      atomicNumber: 1,
      name: 'Hydrogen',
      period: 1,
      group: 1,
      block: 's',
      electronConfiguration: '1s1',
    });
    expect(bySymbol.Fe).toMatchObject({ atomicNumber: 26, group: 8 });
    expect(bySymbol.Au).toMatchObject({ atomicNumber: 79, group: 11 });
    expect(bySymbol.Og).toMatchObject({ atomicNumber: 118, group: 18 });
  });

  it('uses the anomalous configurations for Cr and Cu', () => {
    const config = (s: string) =>
      ELEMENTS.find((e) => e.symbol === s)?.electronConfiguration;
    expect(config('Cr')).toBe('[Ar] 3d5 4s1');
    expect(config('Cu')).toBe('[Ar] 3d10 4s1');
  });
});
