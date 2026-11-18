import type { Balloon, Flight } from '~/utils/balloon';

// Balloon Riser's world, one leg at a time: the platform you're on, the next
// one, and the country between. Heights are metres above sea level, so each
// weather station reads the standard atmosphere there. The balloon's size and
// load, and the places themselves, are game values, not measurements.

export type AreaKind = 'field' | 'mesa' | 'lookout' | 'ridge';

export interface Platform {
  name: string;
  kind: AreaKind;
  distance: number; // m along the route
  height: number; // m above sea level, where the balloon lands
}

export interface Leg {
  from: Platform;
  to: Platform;
  valley: number; // m above sea level, the lowest ground between
}

export const BALLOON: Balloon = {
  fullVolume: 1000, // m³
  burstOverpressure: 15000, // Pa
  payload: 600, // kg: rider, basket, fabric and ballast
};

// a first look at a leg, before any levels exist
export const PREVIEW_LEG: Leg = {
  from: { name: 'Launch field', kind: 'field', distance: 0, height: 200 },
  to: { name: 'Red Mesa', kind: 'mesa', distance: 5000, height: 800 },
  valley: 150,
};

export const PREVIEW_FLIGHT: Flight = {
  moles: 21000,
  gasTemperature: 285,
  height: 200,
  speed: 0,
};
