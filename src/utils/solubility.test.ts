import { SOURCES } from '~/constants/sources';
import {
  ACTIVITY_SOURCE,
  activitySeries,
  displaces,
  isSoluble,
  isStrongAcid,
  isStrongBase,
  SOLUBILITY_SOURCE,
  STRONG_SOURCE,
} from './solubility';

const ion = (symbol: string, charge: number) => ({ symbol, charge });

describe('isSoluble: OpenStax Table 4.1', () => {
  it.each([
    [ion('Na', 1), 'Cl', true],
    [ion('Ag', 1), 'Cl', false],
    [ion('Pb', 2), 'I', false],
    [ion('Ba', 2), 'SO4', false],
    [ion('Na', 1), 'SO4', true],
    [ion('Cu', 2), 'SO4', true],
    [ion('Ag', 1), 'SO4', false],
    [ion('Ca', 2), 'F', false], // group 2 fluorides
    [ion('Fe', 3), 'F', false],
    [ion('Na', 1), 'PO4', true], // group 1 is the exception
    [ion('Ca', 2), 'PO4', false],
    [ion('Ba', 2), 'OH', true],
    [ion('Mg', 2), 'OH', false],
    [ion('K', 1), 'NO3', true],
    [ion('Ag', 1), 'NO3', true],
    [ion('NH4', 1), 'Cl', true],
    [ion('NH4', 1), 'CO3', true],
    [ion('Pb', 2), 'CO3', false],
  ])('%j with %s: soluble %s', (cation, anion, soluble) => {
    expect(isSoluble(cation, anion)).toBe(soluble);
  });

  it('admits when no rule covers an ion', () => {
    // group 1 and NH₄⁺ compounds are always soluble, so pick another cation
    expect(isSoluble(ion('Ca', 2), 'MnO4')).toBeNull();
  });

  it('cites its source', () => {
    expect(SOURCES[SOLUBILITY_SOURCE]).toBeDefined();
  });
});

describe('strong acids and bases: OpenStax Table 4.2 and Figure 14.6', () => {
  it('knows the six strong acids', () => {
    for (const acid of ['HClO4', 'HCl', 'HBr', 'HI', 'HNO3', 'H2SO4'])
      expect(isStrongAcid(acid)).toBe(true);
    expect(isStrongAcid('H3PO4')).toBe(false);
  });

  it('knows the six strong bases', () => {
    for (const base of ['LiOH', 'NaOH', 'KOH', 'Ca(OH)2', 'Sr(OH)2', 'Ba(OH)2'])
      expect(isStrongBase(base)).toBe(true);
    expect(isStrongBase('Mg(OH)2')).toBe(false);
  });

  it('cites its source', () => {
    expect(SOURCES[STRONG_SOURCE]).toBeDefined();
  });
});

describe('the activity series, from standard reduction potentials', () => {
  it('orders the metals from most to least active, with hydrogen in place', () => {
    expect(activitySeries()).toEqual([
      'Mg',
      'Al',
      'Zn',
      'Fe',
      'Ni',
      'Pb',
      'H',
      'Cu',
      'Ag',
    ]);
  });

  it('lets a metal displace the ions of any metal below it', () => {
    expect(displaces('Zn', 'Cu')).toBe(true);
    expect(displaces('Cu', 'Zn')).toBe(false);
    expect(displaces('Cu', 'Ag')).toBe(true);
  });

  it('lets metals above hydrogen displace it from acids', () => {
    expect(displaces('Zn', 'H')).toBe(true);
    expect(displaces('Cu', 'H')).toBe(false);
  });

  it('cites the potentials it comes from', () => {
    expect(SOURCES[ACTIVITY_SOURCE]).toBeDefined();
  });
});
