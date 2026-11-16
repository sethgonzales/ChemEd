import type { SourceId } from './sources';

export const ION_CHARGE_SOURCE: SourceId = 'openstaxIons';

// OpenStax Chemistry 2e, Table 2.5
export const POLYATOMIC_CHARGES: Record<string, number> = {
  NO3: -1,
  SO4: -2,
  PO4: -3,
  OH: -1,
  ClO3: -1,
  CO3: -2,
};

// OpenStax Chemistry 2e, Figure 2.29: group 17 atoms gain one electron, group 16 two
export const GROUP_ANION_CHARGES: Record<number, number> = { 16: -2, 17: -1 };
