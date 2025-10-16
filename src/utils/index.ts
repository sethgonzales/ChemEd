import { ELEMENTS } from '~/constants/elements';
import { IElementData } from '~/types';

/**
 * Finds a single element object by its chemical symbol.
 *
 * @param symbol - The chemical symbol of the element to find (e.g. `"Na"`, `"Cl"`, `"Fe"`).
 * @returns The matching `IElementData` object if found, otherwise `null`.
 *
 * @example
 * const sodium = findElement("Na") → { atomicNumber: 11, symbol: "Na", name: "Sodium", ... }
 */
export const findElement = (
  symbol: IElementData['symbol'],
): IElementData | null => ELEMENTS.find((e) => e.symbol === symbol) ?? null;

/**
 * Finds one or more element objects based on one or more chemical symbols.
 *
 * Accepts either:
 * - a single element symbol (string), returning a single `IElementData` object, or
 * - an array of element symbols, returning an array of `IElementData` objects.
 *
 * @param el - A single element symbol (e.g. `"O"`) or an array of symbols (e.g. `["H", "O", "N"]`).
 * @returns
 * - A single `IElementData` object when given a string.
 * - An array of `IElementData` objects when given an array.
 * - `null` if no valid input or no matching elements were found.
 *
 * @example
 * const oxygen = findElementsBySymbol("O") → { atomicNumber: 8, symbol: "O", name: "Oxygen", ... }
 * const set = findElementsBySymbol(["H", "O", "N"]) → [{ symbol: "H", ... }, { symbol: "O", ... }, { symbol: "N", ... }]
 */
export const findElementsBySymbol = (
  el: IElementData['symbol'] | IElementData['symbol'][] | null,
): IElementData[] | IElementData | null => {
  if (!el) return null;

  if (Array.isArray(el)) {
    if (el.length === 0) return [];
    return el
      .map((symbol) => findElement(symbol))
      .filter(Boolean) as IElementData[];
  }

  return findElement(el);
};
