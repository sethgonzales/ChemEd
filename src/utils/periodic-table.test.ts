import { gridPosition, neighbor } from './periodic-table';
import { findElement } from './index';

const at = (symbol: string) => findElement(symbol)!;
const step = (symbol: string, direction: Parameters<typeof neighbor>[1]) =>
  neighbor(at(symbol), direction)?.symbol ?? null;

describe('gridPosition', () => {
  it('puts main-table elements by group and period', () => {
    expect(gridPosition(at('Fe'))).toEqual({ col: 8, row: 4 });
    expect(gridPosition(at('La'))).toEqual({ col: 3, row: 6 });
  });

  it('puts the f rows (Ce–Lu, Th–Lr) below the table', () => {
    expect(gridPosition(at('Ce'))).toEqual({ col: 4, row: 9 });
    expect(gridPosition(at('Lr'))).toEqual({ col: 17, row: 10 });
  });
});

describe('neighbor', () => {
  it('moves along a row, skipping gaps', () => {
    expect(step('Fe', 'right')).toBe('Co');
    expect(step('H', 'right')).toBe('He');
    expect(step('He', 'left')).toBe('H');
    expect(step('Be', 'right')).toBe('B');
  });

  it('moves up and down a column', () => {
    expect(step('Fe', 'down')).toBe('Ru');
    expect(step('Ru', 'up')).toBe('Fe');
    expect(step('H', 'down')).toBe('Li');
  });

  it('crosses between the main table and the f rows', () => {
    expect(step('Rf', 'down')).toBe('Ce');
    expect(step('Ce', 'up')).toBe('Rf');
  });

  it('stays put at an edge', () => {
    expect(step('H', 'left')).toBeNull();
    expect(step('Og', 'right')).toBeNull();
    expect(step('Fr', 'down')).toBeNull();
    expect(step('H', 'up')).toBeNull();
  });
});
