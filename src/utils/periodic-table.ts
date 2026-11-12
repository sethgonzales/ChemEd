import { ELEMENTS } from '~/constants/elements';
import type { IElementData } from '~/types';

export type Direction = 'left' | 'right' | 'up' | 'down';

// main table periods, then the two f rows drawn below it (row 8 is the gap)
const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10];
const COLS = 18;

/**
 * An element's (col, row) in the standard 18-column table. The f rows,
 * Ce–Lu and Th–Lr, sit in rows 9 and 10 under groups 4–17.
 */
export function gridPosition(el: IElementData): { col: number; row: number } {
  const { atomicNumber, period, group } = el;
  if (atomicNumber >= 58 && atomicNumber <= 71) {
    return { col: atomicNumber - 58 + 4, row: 9 };
  }
  if (atomicNumber >= 90 && atomicNumber <= 103) {
    return { col: atomicNumber - 90 + 4, row: 10 };
  }
  return { col: group ?? 1, row: period };
}

const byPosition = new Map(
  ELEMENTS.map((el) => {
    const { col, row } = gridPosition(el);
    return [`${col}-${row}`, el];
  }),
);

/** The element at a grid position, if any */
export const elementAt = (col: number, row: number) =>
  byPosition.get(`${col}-${row}`) ?? null;

/** The next element from `el` in a direction, skipping gaps; null at an edge */
export function neighbor(el: IElementData, direction: Direction) {
  const { col, row } = gridPosition(el);
  if (direction === 'left' || direction === 'right') {
    const dx = direction === 'right' ? 1 : -1;
    for (let c = col + dx; c >= 1 && c <= COLS; c += dx) {
      const found = elementAt(c, row);
      if (found) return found;
    }
    return null;
  }
  const dy = direction === 'down' ? 1 : -1;
  for (let i = ROWS.indexOf(row) + dy; i >= 0 && i < ROWS.length; i += dy) {
    const found = elementAt(col, ROWS[i]);
    if (found) return found;
  }
  return null;
}
