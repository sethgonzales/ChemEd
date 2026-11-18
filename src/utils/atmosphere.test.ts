import { airAt } from './atmosphere';

describe('airAt (the U.S. Standard Atmosphere, 1976)', () => {
  it('gives the standard sea-level air', () => {
    const air = airAt(0);
    expect(air.temperature).toBeCloseTo(288.15, 2); // K
    expect(air.pressure).toBeCloseTo(101325, 0); // Pa
    // ρ = PM/RT, the ideal gas law for the air itself
    expect(air.density).toBeCloseTo(1.225, 3); // kg/m³
  });

  it('gets colder, thinner and lighter as you climb', () => {
    const heights = [0, 500, 1000, 2000, 4000, 8000];
    const airs = heights.map(airAt);
    for (let i = 1; i < airs.length; i++) {
      expect(airs[i].temperature).toBeLessThan(airs[i - 1].temperature);
      expect(airs[i].pressure).toBeLessThan(airs[i - 1].pressure);
      expect(airs[i].density).toBeLessThan(airs[i - 1].density);
    }
  });

  it('cools by 6.5 K for every kilometre in the troposphere', () => {
    expect(airAt(0).temperature - airAt(1000).temperature).toBeCloseTo(6.5, 6);
  });

  it('reaches the standard tropopause: 216.65 K and about 22.6 kPa at 11 km', () => {
    const air = airAt(11000);
    expect(air.temperature).toBeCloseTo(216.65, 2);
    expect(air.pressure / 22632).toBeCloseTo(1, 3);
  });

  it('holds its temperature above the tropopause while the pressure keeps falling', () => {
    expect(airAt(15000).temperature).toBeCloseTo(216.65, 2);
    expect(airAt(15000).pressure).toBeLessThan(airAt(11000).pressure);
  });

  it('treats a height below the ground as the ground', () => {
    expect(airAt(-50)).toEqual(airAt(0));
  });
});
