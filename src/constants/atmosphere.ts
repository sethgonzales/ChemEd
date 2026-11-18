import type { SourceId } from '~/constants/sources';

// The U.S. Standard Atmosphere, 1976: the model air the balloon flies through.
// It defines its own gas constant, a hair off CODATA's, so the model's values
// come out exactly as the standard tabulates them.

export const SEA_LEVEL_TEMPERATURE = 288.15; // K
export const SEA_LEVEL_PRESSURE = 101325; // Pa
export const LAPSE_RATE = 0.0065; // K/m, cooling with height up to 11 km
export const TROPOPAUSE = 11000; // m; above it the air holds at 216.65 K
export const STANDARD_GRAVITY = 9.80665; // m/s²
export const AIR_MOLAR_MASS = 0.0289644; // kg/mol, dry air
export const STANDARD_GAS_CONSTANT = 8.31432; // J/(mol·K), the standard's R*

export const ATMOSPHERE_SOURCE: SourceId = 'standardAtmosphere';
