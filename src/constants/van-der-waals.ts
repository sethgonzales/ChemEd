import type { SourceId } from '~/constants/sources';

// Van der Waals constants: a for the molecules' pull on each other, b for the
// room they take up. Tabled as 0.0346 L²·bar/mol² and 0.0238 L/mol; here in SI
// (1 L²·bar/mol² = 0.1 Pa·m⁶/mol², 1 L/mol = 0.001 m³/mol).
export const VAN_DER_WAALS_SOURCE: SourceId = 'vanDerWaals';

export interface VanDerWaals {
  a: number; // Pa·m⁶/mol²
  b: number; // m³/mol
}

export const HELIUM_VAN_DER_WAALS: VanDerWaals = { a: 0.00346, b: 0.0000238 };
