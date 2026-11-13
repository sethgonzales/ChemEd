import { ELEMENTS } from './elements';

// the f rows under the table, as most textbooks draw them: Ce–Lu and Th–Lr
const isLanthanideOrActinide = (n: number) =>
  (n >= 58 && n <= 71) || (n >= 90 && n <= 103);

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

  it('has no group only for the f-block series (Ce–Lu, Th–Lr)', () => {
    for (const el of ELEMENTS) {
      if (isLanthanideOrActinide(el.atomicNumber)) {
        expect(el.group).toBeNull();
      } else {
        expect(el.group).toBeGreaterThanOrEqual(1);
        expect(el.group).toBeLessThanOrEqual(18);
      }
    }
  });

  it('colours each element by the row it sits in: La and Ac in group 3, Lu and Lr in the f rows', () => {
    const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.symbol, e]));
    expect(bySymbol.La).toMatchObject({ group: 3, block: 'd' });
    expect(bySymbol.Ac).toMatchObject({ group: 3, block: 'd' });
    expect(bySymbol.Lu).toMatchObject({ group: null, block: 'f' });
    expect(bySymbol.Lr).toMatchObject({ group: null, block: 'f' });
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

  const mass = (s: string) => ELEMENTS.find((e) => e.symbol === s)?.atomicMass;

  it('uses IUPAC’s current abridged standard atomic weights', () => {
    expect(mass('H')).toBe(1.008);
    expect(mass('He')).toBe(4.0026);
    expect(mass('Na')).toBe(22.99);
    expect(mass('Ar')).toBe(39.95); // an interval since 2017; this is its abridged value
    expect(mass('Zr')).toBe(91.222); // revised in 2024 from 91.224
    expect(mass('U')).toBe(238.03);
  });

  it('gives the mass number of the most stable isotope where IUPAC gives no weight', () => {
    expect(mass('Tc')).toBe(97);
    expect(mass('Sg')).toBe(267);
    expect(mass('Hs')).toBe(271);
    expect(mass('Og')).toBe(294);
  });

  it('uses the anomalous configurations for Cr and Cu', () => {
    const config = (s: string) =>
      ELEMENTS.find((e) => e.symbol === s)?.electronConfiguration;
    expect(config('Cr')).toBe('[Ar] 3d5 4s1');
    expect(config('Cu')).toBe('[Ar] 3d10 4s1');
  });

  it('keeps 7s² for Ds and Rg, as relativistic predictions do (unlike Pt and Au)', () => {
    const config = (s: string) =>
      ELEMENTS.find((e) => e.symbol === s)?.electronConfiguration;
    expect(config('Ds')).toBe('[Rn] 5f14 6d8 7s2');
    expect(config('Rg')).toBe('[Rn] 5f14 6d9 7s2');
  });
});
