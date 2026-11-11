import { ELEMENTS } from './elements';
import { ELECTRONEGATIVITY } from './electronegativity';

describe('ELECTRONEGATIVITY', () => {
  it('uses Pauling values for spot-checked elements', () => {
    expect(ELECTRONEGATIVITY.H).toBe(2.2);
    expect(ELECTRONEGATIVITY.C).toBe(2.55);
    expect(ELECTRONEGATIVITY.N).toBe(3.04);
    expect(ELECTRONEGATIVITY.O).toBe(3.44);
    expect(ELECTRONEGATIVITY.F).toBe(3.98);
    expect(ELECTRONEGATIVITY.S).toBe(2.58);
    expect(ELECTRONEGATIVITY.Cl).toBe(3.16);
  });

  it('only lists real elements', () => {
    const symbols = new Set(ELEMENTS.map((e) => e.symbol));
    for (const symbol of Object.keys(ELECTRONEGATIVITY)) {
      expect(symbols).toContain(symbol);
    }
  });

  it('covers every element in the Lewis molecule library', () => {
    for (const symbol of ['B', 'Be', 'P', 'Xe', 'Br', 'I', 'Si', 'Al']) {
      expect(ELECTRONEGATIVITY[symbol]).toBeGreaterThan(0);
    }
  });

  it('increases across period 2 and decreases down group 17', () => {
    const period2 = ['Li', 'Be', 'B', 'C', 'N', 'O', 'F'];
    for (let i = 1; i < period2.length; i++) {
      expect(ELECTRONEGATIVITY[period2[i]]).toBeGreaterThan(
        ELECTRONEGATIVITY[period2[i - 1]],
      );
    }
    const halogens = ['F', 'Cl', 'Br', 'I'];
    for (let i = 1; i < halogens.length; i++) {
      expect(ELECTRONEGATIVITY[halogens[i]]).toBeLessThan(
        ELECTRONEGATIVITY[halogens[i - 1]],
      );
    }
  });
});
