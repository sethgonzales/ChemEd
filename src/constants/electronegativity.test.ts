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

describe('ELECTRONEGATIVITY across the whole table', () => {
  it('covers the transition metals and f-block, for the colour mode', () => {
    expect(ELECTRONEGATIVITY.Fe).toBe(1.83);
    expect(ELECTRONEGATIVITY.Au).toBe(2.54);
    expect(ELECTRONEGATIVITY.W).toBe(2.36);
    expect(ELECTRONEGATIVITY.Tb).toBe(1.21);
    expect(ELECTRONEGATIVITY.U).toBe(1.38);
    expect(ELECTRONEGATIVITY.Lr).toBe(1.3);
  });

  it('has a value for every element up to Lr except those with none measured', () => {
    // no Pauling value: light noble gases, Rn, a few lanthanides, and Fr
    // (only a lower bound, > 0.79)
    const none = ['He', 'Ne', 'Ar', 'Pm', 'Eu', 'Yb', 'Rn', 'Fr'];
    for (const { symbol, atomicNumber } of ELEMENTS) {
      if (atomicNumber > 103 || none.includes(symbol)) {
        expect(ELECTRONEGATIVITY[symbol]).toBeUndefined();
      } else {
        expect(ELECTRONEGATIVITY[symbol]).toBeGreaterThan(0);
      }
    }
  });
});
