import { SUBSTANCES } from './substances';

const byId = (id: string) => SUBSTANCES.find((s) => s.id === id)!;

describe('SUBSTANCES', () => {
  it('offers water first, then ethanol and mercury', () => {
    expect(SUBSTANCES.map((s) => s.name)).toEqual([
      'Water',
      'Ethanol',
      'Mercury',
    ]);
  });

  it('uses real melting and boiling points at 1 atm', () => {
    expect(byId('water')).toMatchObject({ meltC: 0, boilC: 100 });
    expect(byId('ethanol')).toMatchObject({ meltC: -114.1, boilC: 78.4 });
    expect(byId('mercury')).toMatchObject({ meltC: -38.83, boilC: 356.73 });
  });

  it('uses real enthalpies of fusion and vaporisation in kJ/mol', () => {
    expect(byId('water')).toMatchObject({
      fusionKJ: 6.01,
      vaporizationKJ: 40.68,
    });
    expect(byId('ethanol').vaporizationKJ).toBe(38.56);
    expect(byId('mercury')).toMatchObject({
      fusionKJ: 2.29,
      vaporizationKJ: 59.11,
    });
  });

  it('gives monatomic mercury vapour Cp = 5/2 R', () => {
    expect(byId('mercury').heatCapacity.gas).toBeCloseTo((5 / 2) * 8.314, 2);
  });

  it('takes far more energy to boil than to melt, for every substance', () => {
    for (const s of SUBSTANCES) {
      expect(s.vaporizationKJ).toBeGreaterThan(s.fusionKJ);
    }
  });
});
