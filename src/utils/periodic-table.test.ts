import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import {
  BLOCK_COLORS,
  CATEGORY_COLORS,
  NO_DATA_COLOR,
} from '~/constants/blocks';
import { ELEMENTS } from '~/constants/elements';
import {
  elementCategory,
  elementColor,
  gridPosition,
  neighbor,
  searchElements,
  trendColor,
  type ColorMode,
} from './periodic-table';
import { findElement } from './index';

extend([a11yPlugin]);

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

describe('elementCategory', () => {
  const category = (symbol: string) => elementCategory(at(symbol));

  it('names the metalloids along the staircase', () => {
    for (const s of ['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'At']) {
      expect(category(s)).toBe('metalloid');
    }
  });

  it('names the 17 nonmetals, H and the noble gases included', () => {
    const nonmetals = ELEMENTS.filter((e) => elementCategory(e) === 'nonmetal');
    expect(nonmetals.map((e) => e.symbol)).toEqual(
      // prettier-ignore
      ['H', 'He', 'C', 'N', 'O', 'F', 'Ne', 'P', 'S', 'Cl', 'Ar', 'Se', 'Br',
        'Kr', 'I', 'Xe', 'Rn'],
    );
  });

  it('calls everything else up to Hs a metal', () => {
    for (const s of ['Li', 'Fe', 'Al', 'Sn', 'Po', 'U', 'Hs']) {
      expect(category(s)).toBe('metal');
    }
  });

  it('leaves Mt to Og unknown: too few atoms to test their chemistry', () => {
    const unknown = ELEMENTS.filter((e) => elementCategory(e) === 'unknown');
    expect(unknown.map((e) => e.atomicNumber)).toEqual([
      109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
    ]);
  });
});

describe('searchElements', () => {
  const search = (q: string) => searchElements(q).map((e) => e.symbol);

  it('finds an element by symbol, name or atomic number', () => {
    expect(search('26')).toEqual(['Fe']);
    expect(search('iron')).toEqual(['Fe']);
    expect(search('Fe')[0]).toBe('Fe');
  });

  it('puts an exact symbol first, then names that start with the search', () => {
    expect(search('fe')).toEqual(['Fe', 'Fm']); // Fermium
    expect(search('  CL ')[0]).toBe('Cl');
    expect(search('c')).toEqual(
      expect.arrayContaining(['C', 'Ca', 'Cl', 'Cr', 'Co', 'Cu']),
    );
    expect(search('c')[0]).toBe('C');
  });

  it('finds nothing for an empty or unknown search', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
    expect(search('xyz')).toEqual([]);
    expect(search('200')).toEqual([]);
  });
});

describe('elementColor', () => {
  const color = (symbol: string, mode: ColorMode) =>
    elementColor(at(symbol), mode);

  it('colours by block or by metal/nonmetal', () => {
    expect(color('Fe', 'block')).toBe(BLOCK_COLORS.d);
    expect(color('Fe', 'category')).toBe(CATEGORY_COLORS.metal);
    expect(color('Si', 'category')).toBe(CATEGORY_COLORS.metalloid);
    expect(color('O', 'category')).toBe(CATEGORY_COLORS.nonmetal);
  });

  it('runs the trend scale from the lowest value to the highest', () => {
    expect(color('Cs', 'electronegativity')).toBe(trendColor(0));
    expect(color('F', 'electronegativity')).toBe(trendColor(1));
    expect(color('Fr', 'radius')).toBe(trendColor(1));
    expect(color('He', 'radius')).toBe(trendColor(0));
    expect(color('C', 'electronegativity')).not.toBe(trendColor(0));
  });

  it('greys out elements with no value', () => {
    expect(color('Ne', 'electronegativity')).toBe(NO_DATA_COLOR);
    expect(color('Og', 'radius')).toBe(NO_DATA_COLOR);
    expect(color('Og', 'category')).toBe(NO_DATA_COLOR);
  });
});

describe('trendColor', () => {
  it('blends between distinct ends', () => {
    expect(trendColor(0)).not.toBe(trendColor(1));
    expect(trendColor(0.5)).not.toBe(trendColor(0));
    expect(trendColor(-1)).toBe(trendColor(0)); // clamped
  });

  it('keeps white text readable all along the scale', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(colord('#ffffff').contrast(trendColor(t))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});
