import { valenceElectrons } from '~/utils/lewis';
import { ELECTRONEGATIVITY } from './electronegativity';
import { COMMON_ELEMENTS, DRAWABLE_ELEMENTS } from './lewis-elements';

describe('Lewis element palettes', () => {
  it('offers the common ChemDraw elements first', () => {
    expect(COMMON_ELEMENTS).toEqual([
      'H',
      'C',
      'N',
      'O',
      'F',
      'P',
      'S',
      'Cl',
      'Br',
      'I',
    ]);
  });

  it('can draw the main-group elements of periods 1–5 with an electronegativity', () => {
    // prettier-ignore
    expect(DRAWABLE_ELEMENTS.map((e) => e.symbol)).toEqual([
      'H',
      'Li', 'Be', 'B', 'C', 'N', 'O', 'F',
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl',
      'K', 'Ca', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
      'Rb', 'Sr', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
    ]);
    for (const { symbol } of DRAWABLE_ELEMENTS) {
      expect(ELECTRONEGATIVITY[symbol]).toBeGreaterThan(0);
      expect(valenceElectrons(symbol)).not.toBeNull();
    }
  });

  it('lists drawable elements in atomic number order', () => {
    const numbers = DRAWABLE_ELEMENTS.map((e) => e.atomicNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it('includes every common element', () => {
    const drawable = DRAWABLE_ELEMENTS.map((e) => e.symbol);
    for (const symbol of COMMON_ELEMENTS) expect(drawable).toContain(symbol);
  });
});
