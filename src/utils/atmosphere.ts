import {
  AIR_MOLAR_MASS,
  LAPSE_RATE,
  SEA_LEVEL_PRESSURE,
  SEA_LEVEL_TEMPERATURE,
  STANDARD_GAS_CONSTANT,
  STANDARD_GRAVITY,
  TROPOPAUSE,
} from '~/constants/atmosphere';

export interface Air {
  temperature: number; // K
  pressure: number; // Pa
  density: number; // kg/m³
}

// the exponent in the barometric formula, gM/(R*L)
const EXPONENT =
  (STANDARD_GRAVITY * AIR_MOLAR_MASS) / (STANDARD_GAS_CONSTANT * LAPSE_RATE);
const TROPOPAUSE_TEMPERATURE = SEA_LEVEL_TEMPERATURE - LAPSE_RATE * TROPOPAUSE;
const TROPOPAUSE_PRESSURE =
  SEA_LEVEL_PRESSURE *
  (TROPOPAUSE_TEMPERATURE / SEA_LEVEL_TEMPERATURE) ** EXPONENT;

/**
 * The standard air at a height (m above sea level), from the U.S. Standard
 * Atmosphere 1976. Heights are taken as geopotential: under 0.2% apart from
 * true height this low.
 */
export function airAt(height: number): Air {
  const h = Math.max(0, height);
  let temperature: number, pressure: number;
  if (h <= TROPOPAUSE) {
    // the air cools steadily, and the pressure falls as a power of it
    temperature = SEA_LEVEL_TEMPERATURE - LAPSE_RATE * h;
    pressure =
      SEA_LEVEL_PRESSURE * (temperature / SEA_LEVEL_TEMPERATURE) ** EXPONENT;
  } else {
    // a layer at one temperature: the pressure falls exponentially
    temperature = TROPOPAUSE_TEMPERATURE;
    pressure =
      TROPOPAUSE_PRESSURE *
      Math.exp(
        (-STANDARD_GRAVITY * AIR_MOLAR_MASS * (h - TROPOPAUSE)) /
          (STANDARD_GAS_CONSTANT * temperature),
      );
  }
  // the ideal gas law for the air itself: ρ = PM/RT
  const density =
    (pressure * AIR_MOLAR_MASS) / (STANDARD_GAS_CONSTANT * temperature);
  return { temperature, pressure, density };
}

const CEILING = 30000; // m: higher than any balloon here flies

/**
 * The height (m) where the standard air has this pressure (Pa): airAt turned
 * round, by bisection, since pressure falls steadily with height
 */
export function heightAt(pressure: number): number {
  if (pressure >= SEA_LEVEL_PRESSURE) return 0;
  let low = 0;
  let high = CEILING;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (airAt(mid).pressure > pressure) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
