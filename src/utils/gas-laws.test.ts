import { HELIUM_VAN_DER_WAALS } from '~/constants/van-der-waals';
import {
  fromSI,
  solveGas,
  toSI,
  vanDerWaalsMoles,
  vanDerWaalsPressure,
} from './gas-laws';

// SI throughout: Pa, m³, mol, K
const before = { p: 100000, v: 2, n: 80, t: 300 };

describe('solveGas', () => {
  it("Boyle's law: double the pressure, half the volume", () => {
    expect(solveGas(before, { p: 200000, n: 80, t: 300 }).v).toBeCloseTo(1, 9);
  });

  it("Charles's law: double the kelvin temperature, double the volume", () => {
    expect(solveGas(before, { p: 100000, n: 80, t: 600 }).v).toBeCloseTo(4, 9);
  });

  it("Gay-Lussac's law: heat a fixed volume and the pressure rises in step", () => {
    expect(solveGas(before, { v: 2, n: 80, t: 330 }).p).toBeCloseTo(110000, 6);
  });

  it("Avogadro's law: half the gas, half the volume", () => {
    expect(solveGas(before, { p: 100000, n: 40, t: 300 }).v).toBeCloseTo(1, 9);
  });

  it('the combined gas law: everything changing at once', () => {
    // P₂ = P₁V₁T₂/(V₂T₁) = 100 kPa × 2 × 270 / (3 × 300)
    expect(solveGas(before, { v: 3, n: 80, t: 270 }).p).toBeCloseTo(60000, 6);
  });

  it('the ideal gas law: 1 mol at 0 °C and 1 atm fills about 22.41 L', () => {
    const { v } = solveGas({ p: 101325, n: 1, t: 273.15 });
    expect(v * 1000).toBeCloseTo(22.414, 3);
  });

  it('finds whichever one is missing', () => {
    const gas = solveGas({ p: 101325, v: 0.022414, t: 273.15 });
    expect(gas.n).toBeCloseTo(1, 4);
    expect(gas).toEqual({ ...gas, p: 101325, v: 0.022414, t: 273.15 });
  });

  it('needs exactly one unknown', () => {
    expect(() => solveGas({ p: 101325, n: 1 })).toThrow();
    expect(() => solveGas({ p: 101325, v: 1, n: 1, t: 300 })).toThrow();
  });
});

describe('units', () => {
  it('converts the units students use to SI and back', () => {
    expect(toSI(25, '°C')).toBeCloseTo(298.15, 9);
    expect(toSI(1, 'atm')).toBe(101325);
    expect(toSI(101.325, 'kPa')).toBeCloseTo(101325, 9);
    expect(toSI(760, 'mmHg')).toBeCloseTo(101325, 9);
    expect(toSI(1000, 'L')).toBeCloseTo(1, 12);
    expect(toSI(500, 'mL')).toBeCloseTo(0.0005, 12);
    expect(fromSI(373.15, '°C')).toBeCloseTo(100, 9);
    expect(fromSI(101325, 'atm')).toBe(1);
    expect(fromSI(2, 'L')).toBe(2000);
  });
});

describe('van der Waals helium', () => {
  const he = HELIUM_VAN_DER_WAALS;
  const ideal = (n: number, v: number, t: number) => (n * 8.314462618 * t) / v;

  it('is near ideal when thin, as in a balloon', () => {
    const p = vanDerWaalsPressure(he, 40000, 1000, 288);
    expect(p / ideal(40000, 1000, 288)).toBeCloseTo(1, 2);
  });

  it('pushes harder than ideal packed into a cylinder: its atoms’ own size outweighs their pull', () => {
    const p = vanDerWaalsPressure(he, 25000, 3, 288);
    expect(p / ideal(25000, 3, 288)).toBeGreaterThan(1.1);
  });

  it('gives back the moles from the pressure', () => {
    const p = vanDerWaalsPressure(he, 25000, 3, 288);
    expect(vanDerWaalsMoles(he, p, 3, 288)).toBeCloseTo(25000, 3);
  });

  it('answers in bar too: 1 bar is 100 kPa', () => {
    expect(toSI(200, 'bar')).toBe(20000000);
  });
});
