import { SUBSTANCES } from './substances';

const byId = (id: string) => SUBSTANCES.find((s) => s.id === id)!;

describe('SUBSTANCES', () => {
  it('offers water first, then benzene and mercury', () => {
    expect(SUBSTANCES.map((s) => s.name)).toEqual([
      'Water',
      'Benzene',
      'Mercury',
    ]);
  });

  it('uses real melting and boiling points at 1 atm', () => {
    expect(byId('water')).toMatchObject({ meltC: 0, boilC: 100 });
    expect(byId('benzene')).toMatchObject({ meltC: 5.49, boilC: 80.15 });
    expect(byId('mercury')).toMatchObject({ meltC: -38.83, boilC: 356.73 });
  });

  it('uses real enthalpies of fusion and vaporisation in kJ/mol', () => {
    expect(byId('water')).toMatchObject({
      fusionKJ: 6.01,
      vaporizationKJ: 40.68,
    });
    expect(byId('benzene')).toMatchObject({
      fusionKJ: 9.87,
      vaporizationKJ: 30.72,
    });
    expect(byId('mercury')).toMatchObject({
      fusionKJ: 2.29,
      vaporizationKJ: 59.11,
    });
  });

  it('gives monatomic mercury vapour Cp = 5/2 R', () => {
    expect(byId('mercury').heatCapacity.gas).toBeCloseTo((5 / 2) * 8.314, 2);
  });

  it('gives solid mercury its own Cp at the melting point (NIST-JANAF)', () => {
    expect(byId('mercury').heatCapacity.solid).toBeCloseTo(28.485, 3);
  });

  it('gives solid benzene a measured Cp just below its melting point (NIST)', () => {
    expect(byId('benzene').heatCapacity.solid).toBe(118.4);
  });

  it('takes far more energy to boil than to melt, for every substance', () => {
    for (const s of SUBSTANCES) {
      expect(s.vaporizationKJ).toBeGreaterThan(s.fusionKJ);
    }
  });
});
