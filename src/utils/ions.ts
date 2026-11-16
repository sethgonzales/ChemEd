import { findElement } from '~/utils';
import { GROUP_ANION_CHARGES, POLYATOMIC_CHARGES } from '~/constants/ions';
import { elementCategory } from './periodic-table';
import { parseCompound } from './reactions';

export type Ion = { symbol: string; charge: number };

export const elementsIn = (formula: string) =>
  Object.keys(parseCompound(formula));
export const isGroup = (symbol: string) => elementsIn(symbol).length > 1;
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function anionCharge(symbol: string) {
  if (isGroup(symbol)) return POLYATOMIC_CHARGES[symbol];
  return GROUP_ANION_CHARGES[findElement(symbol)?.group ?? 0];
}

/** The ions in a salt, acid or base, or null for an element or a molecule */
export function ionsOf(formula: string) {
  const m = formula.match(/^([A-Z][a-z]?)(\d*)([A-Z(].*)$/);
  if (!m) return null;
  const [, symbol, n, rest] = m;
  const bracketed = rest.match(/^\((.+)\)(\d+)$/);
  const single = rest.match(/^([A-Z][a-z]?)(\d*)$/);
  const anion = bracketed?.[1] ?? single?.[1] ?? rest;
  const anions = Number(bracketed?.[2] ?? single?.[2] ?? 1) || 1;
  const cations = Number(n) || 1;

  const el = findElement(symbol);
  const metal = el !== null && elementCategory(el) === 'metal';
  // an acid's H is H⁺ only beside a polyatomic ion or a halide (not in H₂O)
  const acid =
    symbol === 'H' && (isGroup(anion) || findElement(anion)?.group === 17);
  if (!metal && !acid) return null;

  const charge = anionCharge(anion);
  if (!charge) return null;
  // the cation's charge makes the compound neutral
  const cationCharge = (-charge * anions) / cations;
  if (!Number.isInteger(cationCharge) || cationCharge <= 0) return null;
  return {
    cation: { symbol, charge: cationCharge },
    cations,
    anion: { symbol: anion, charge },
    anions,
  };
}

/** The neutral formula two ions make, by crossing their charges */
export function compound(cation: Ion, anion: Ion) {
  if (cation.symbol === 'H' && anion.symbol === 'OH') return 'H2O';
  const g = gcd(cation.charge, -anion.charge);
  const [nc, na] = [-anion.charge / g, cation.charge / g];
  const anionPart =
    isGroup(anion.symbol) && na > 1
      ? `(${anion.symbol})${na}`
      : `${anion.symbol}${na > 1 ? na : ''}`;
  return `${cation.symbol}${nc > 1 ? nc : ''}${anionPart}`;
}
