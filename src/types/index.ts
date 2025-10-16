export interface IElementData {
  atomicNumber: number; // number of protons
  symbol: string; // e.g. "H", "He"
  name: string; // e.g. "Hydrogen"
  atomicMass: number | null; // average atomic mass (may be null or approximate)
  period: number; // row in periodic table (1 through 7, etc.)
  group: number | null; // group number (1 through 18), or null if not well defined
  block: 's' | 'p' | 'd' | 'f' | null;
  electronConfiguration: string | null;
}
