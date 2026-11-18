import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import { gasInside, type Balloon, type Flight } from '~/utils/balloon';

export const ENVELOPE_RADIUS = 22; // art px, stretched full

/** What the balloon's instruments read, in the units each reads in */
export interface Readings {
  altitude: number; // m
  airTemperature: number; // °C
  airPressure: number; // kPa
  gasTemperature: number; // °C
  gasPressure: number; // kPa
  volume: number; // m³
  moles: number; // mol
}

export function readings(balloon: Balloon, flight: Flight): Readings {
  const air = airAt(flight.height);
  const gas = gasInside(balloon, flight);
  return {
    altitude: flight.height,
    airTemperature: air.temperature - ZERO_CELSIUS,
    airPressure: air.pressure / 1000,
    gasTemperature: flight.gasTemperature - ZERO_CELSIUS,
    gasPressure: gas.pressure / 1000,
    volume: gas.volume,
    moles: flight.moles,
  };
}

/** The envelope's drawn radius: a sphere's, growing as the cube root of its volume */
export const envelopeRadius = (volume: number, fullVolume: number) =>
  ENVELOPE_RADIUS * Math.cbrt(Math.min(volume, fullVolume) / fullVolume);
