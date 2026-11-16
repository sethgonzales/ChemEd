import type { SourceId } from '~/constants/sources';

export interface Substance {
  id: string;
  name: string;
  formula: string;
  meltC: number; // °C at 1 atm
  boilC: number; // °C at 1 atm
  fusionKJ: number; // ΔH of fusion, kJ/mol
  vaporizationKJ: number; // ΔH of vaporisation at the boiling point, kJ/mol
  heatCapacity: { solid: number; liquid: number; gas: number }; // Cp, J/(mol·K)
  sources: SourceId[]; // where these values come from
}

const R = 8.314; // J/(mol·K)

/**
 * Substances to heat and cool, each citing its sources. Heat capacities are
 * near each phase change.
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
    sources: ['waterData'],
  },
  {
    id: 'benzene',
    name: 'Benzene',
    formula: 'C₆H₆',
    meltC: 5.49, // 278.64 K
    boilC: 80.15, // 353.3 K
    fusionKJ: 9.87,
    vaporizationKJ: 30.72,
    // solid at 273 K, just below melting; liquid at 25 °C; vapour at 95 °C
    heatCapacity: { solid: 118.4, liquid: 135.69, gas: 103.98 },
    sources: ['benzeneWebBook'],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    formula: 'Hg',
    meltC: -38.83,
    boilC: 356.73,
    fusionKJ: 2.29,
    vaporizationKJ: 59.11,
    // solid at its melting point, 234.29 K (NIST-JANAF); liquid at 25 °C; the
    // vapour is single atoms, so Cp = 5/2 R
    heatCapacity: { solid: 28.485, liquid: 27.98, gas: (5 / 2) * R },
    sources: ['mercury', 'janafMercury'],
  },
];
