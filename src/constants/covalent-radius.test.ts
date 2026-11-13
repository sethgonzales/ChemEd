import { COVALENT_RADIUS } from './covalent-radius';
import { ELEMENTS } from './elements';

describe('COVALENT_RADIUS', () => {
  it('uses Cordero et al. (2008) single-bond radii in pm', () => {
    expect(COVALENT_RADIUS.H).toBe(31);
    expect(COVALENT_RADIUS.C).toBe(76); // sp3
    expect(COVALENT_RADIUS.Fe).toBe(132); // low spin
    expect(COVALENT_RADIUS.Cs).toBe(244);
    expect(COVALENT_RADIUS.Cm).toBe(169);
  });

  it('covers H to Cm, the elements Cordero measured', () => {
    for (const { symbol, atomicNumber } of ELEMENTS) {
      if (atomicNumber <= 96) {
        expect(COVALENT_RADIUS[symbol]).toBeGreaterThan(0);
      } else {
        expect(COVALENT_RADIUS[symbol]).toBeUndefined();
      }
    }
  });

  it('shrinks across period 2 and grows down group 1', () => {
    const period2 = ['Li', 'Be', 'B', 'C', 'N', 'O', 'F'];
    for (let i = 1; i < period2.length; i++) {
      expect(COVALENT_RADIUS[period2[i]]).toBeLessThan(
        COVALENT_RADIUS[period2[i - 1]],
      );
    }
    const group1 = ['H', 'Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'];
    for (let i = 1; i < group1.length; i++) {
      expect(COVALENT_RADIUS[group1[i]]).toBeGreaterThan(
        COVALENT_RADIUS[group1[i - 1]],
      );
    }
  });
});
