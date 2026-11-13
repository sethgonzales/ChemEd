export interface Substance {
  id: string;
  name: string;
  formula: string;
  meltC: number; // °C at 1 atm
  boilC: number; // °C at 1 atm
  fusionKJ: number; // ΔH of fusion, kJ/mol
  vaporizationKJ: number; // ΔH of vaporisation at the boiling point, kJ/mol
  heatCapacity: { solid: number; liquid: number; gas: number }; // Cp, J/(mol·K)
}

const R = 8.314; // J/(mol·K)

/**
 * Substances to heat and cool. Phase-change values from NIST and Wikipedia's
 * data pages; heat capacities are near each phase change.
 */
export const SUBSTANCES: Substance[] = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H₂O',
    meltC: 0,
    boilC: 100,
    fusionKJ: 6.01,
    vaporizationKJ: 40.68,
    // ice at −2.2 °C, water at 25 °C, steam at 100 °C
    heatCapacity: { solid: 37.84, liquid: 75.28, gas: 36.5 },
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    formula: 'C₂H₅OH',
    meltC: -114.1,
    boilC: 78.4,
    fusionKJ: 4.9,
    vaporizationKJ: 38.56,
    // liquid at 25 °C, vapour at 90 °C. No reliable value for the solid was
    // found, so it borrows the liquid's: an estimate that only tilts the
    // short solid stretch of the heating curve.
    heatCapacity: { solid: 112.4, liquid: 112.4, gas: 78.28 },
  },
  {
    id: 'mercury',
    name: 'Mercury',
    formula: 'Hg',
    meltC: -38.83,
    boilC: 356.73,
    fusionKJ: 2.29,
    vaporizationKJ: 59.11,
    // liquid at 25 °C; the vapour is single atoms, so Cp = 5/2 R. The solid
    // borrows the liquid's value (an estimate, as for ethanol).
    heatCapacity: { solid: 27.98, liquid: 27.98, gas: (5 / 2) * R },
  },
];
