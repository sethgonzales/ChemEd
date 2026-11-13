import {
  ANALYTE_VOLUME,
  ANALYTES,
  BURETTE_CAPACITY,
  INDICATORS,
  KW,
  TITRANT_CONCENTRATION,
  titrantFor,
} from './titrations';

const byId = (id: string) => ANALYTES.find((a) => a.id === id)!;

describe('ANALYTES', () => {
  it('offers strong and weak acids and bases, and phosphoric acid', () => {
    expect(ANALYTES.map((a) => a.formula)).toEqual([
      'HCl',
      'CH₃COOH',
      'H₃PO₄',
      'NaOH',
      'NH₃',
    ]);
  });

  it('uses real pKa values at 25 °C', () => {
    expect(byId('acetic').pKas).toEqual([4.756]);
    expect(byId('phosphoric').pKas).toEqual([2.14, 7.2, 12.37]);
    expect(byId('ammonia').pKas).toEqual([9.24]); // of NH₄⁺
    expect(byId('hcl').pKas).toEqual([]); // strong: fully dissociated
    expect(byId('naoh').pKas).toEqual([]);
  });

  it('lists each weak analyte’s pKa values in ascending order', () => {
    for (const { pKas } of ANALYTES) {
      expect([...pKas].sort((a, b) => a - b)).toEqual(pKas);
    }
  });

  it('gives each acid one proton per pKa, and strong ones a single proton', () => {
    expect(byId('phosphoric').protons).toBe(3);
    expect(byId('hcl').protons).toBe(1);
    expect(byId('ammonia').protons).toBe(1);
  });

  it('titrates acids with NaOH and bases with HCl', () => {
    expect(titrantFor(byId('acetic'))).toBe('NaOH');
    expect(titrantFor(byId('ammonia'))).toBe('HCl');
  });
});

describe('INDICATORS', () => {
  it('uses each indicator’s real transition range', () => {
    const ranges = Object.fromEntries(
      INDICATORS.map((i) => [i.id, [i.low, i.high]]),
    );
    expect(ranges).toEqual({
      'methyl-orange': [3.1, 4.4],
      'bromothymol-blue': [6.0, 7.6],
      phenolphthalein: [8.3, 10.0],
    });
  });
});

it('uses Kw = 1.0 × 10⁻¹⁴ at 25 °C', () => {
  expect(KW).toBe(1e-14);
});

describe('the Lab flask', () => {
  it('holds 0.100 M analyte, but 0.050 M phosphoric acid so its jumps fit the burette', () => {
    for (const a of ANALYTES) {
      expect(a.labConcentration).toBe(a.id === 'phosphoric' ? 0.05 : 0.1);
    }
  });

  it('reaches every visible equivalence point within one 50 mL burette', () => {
    for (const a of ANALYTES) {
      const perProton =
        (a.labConcentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
      const visible = a.id === 'phosphoric' ? 2 : a.protons;
      expect(perProton * visible).toBeLessThan(BURETTE_CAPACITY);
    }
  });
});
