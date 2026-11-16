import {
  GROUP_ANION_CHARGES,
  ION_CHARGE_SOURCE,
  POLYATOMIC_CHARGES,
} from './ions';
import { SOURCES } from './sources';

describe('ion charges', () => {
  it('gives the common polyatomic ions their charges', () => {
    expect(POLYATOMIC_CHARGES).toEqual({
      NO3: -1,
      SO4: -2,
      PO4: -3,
      OH: -1,
      ClO3: -1,
      CO3: -2,
    });
  });

  it('gives halides 1− and group 16 anions 2−', () => {
    expect(GROUP_ANION_CHARGES).toEqual({ 16: -2, 17: -1 });
  });

  it('cites a real source', () => {
    expect(SOURCES[ION_CHARGE_SOURCE]).toBeDefined();
  });
});
