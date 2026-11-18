import type { Balloon, Flight } from '~/utils/balloon';

// Balloon Riser's world. Heights are metres above sea level, so each
// platform's weather station reads the standard atmosphere there. The
// balloon's size and load are game values, in the range of real crewed gas
// balloons, not measurements.

export type PlatformKind = 'pad' | 'mesa' | 'ridge' | 'tower';

export interface Platform {
  name: string;
  kind: PlatformKind;
  distance: number; // m along the route
  height: number; // m above sea level, its top
}

export const BALLOON: Balloon = {
  fullVolume: 1000, // m³
  burstOverpressure: 15000, // Pa
  payload: 600, // kg: rider, basket, fabric and ballast
};

// a first look at the sky, before any levels exist
export const PREVIEW_PLATFORMS: Platform[] = [
  { name: 'Launch pad', kind: 'pad', distance: 300, height: 200 },
  { name: 'The mesa', kind: 'mesa', distance: 1600, height: 800 },
  { name: 'The tower', kind: 'tower', distance: 2700, height: 1100 },
  { name: 'The ridge', kind: 'ridge', distance: 3800, height: 1500 },
];

export const PREVIEW_FLIGHT: Flight = {
  moles: 21000,
  gasTemperature: 285,
  height: 200,
  speed: 0,
};
