import { COUPLES, ELECTROLYSIS_POTENTIALS } from '~/constants/electrochemistry';
import {
  SOLUBILITY_RULES,
  SOLUBLE_CATIONS,
  STRONG_ACIDS,
  STRONG_BASES,
} from '~/constants/solubility';
import type { SourceId } from '~/constants/sources';

export { SOLUBILITY_SOURCE, STRONG_SOURCE } from '~/constants/solubility';
// the activity series is read off the cited standard reduction potentials
export const ACTIVITY_SOURCE: SourceId = 'electrodePotentials';

export type Cation = { symbol: string; charge: number };

const key = ({ symbol, charge }: Cation) =>
  `${symbol}${charge === 1 ? '' : charge}+`;

/** Whether a compound of these ions dissolves in water, or null if no rule covers it */
export function isSoluble(cation: Cation, anion: string): boolean | null {
  if (SOLUBLE_CATIONS.includes(key(cation))) return true;
  const rule = SOLUBILITY_RULES.find((r) => r.anions.includes(anion));
  if (!rule) return null;
  return rule.except.includes(key(cation)) ? !rule.soluble : rule.soluble;
}

export const isStrongAcid = (formula: string) => STRONG_ACIDS.includes(formula);
export const isStrongBase = (formula: string) => STRONG_BASES.includes(formula);

// E° of each metal's ion, and of H⁺/H₂
const potentials = () => [
  ...COUPLES.map((c) => ({ symbol: c.id, e: c.eStandard })),
  { symbol: 'H', e: ELECTROLYSIS_POTENTIALS.hydrogen.eStandard },
];

/**
 * Most active first. A lower E° means the metal gives up electrons more
 * readily, so it is oxidised by the ions of any metal below it.
 */
export const activitySeries = () =>
  potentials()
    .sort((a, b) => a.e - b.e)
    .map((p) => p.symbol);

/** Whether `metal` displaces the ions of `other` (H for an acid) from solution */
export function displaces(metal: string, other: string) {
  const series = activitySeries();
  return series.indexOf(metal) < series.indexOf(other);
}
