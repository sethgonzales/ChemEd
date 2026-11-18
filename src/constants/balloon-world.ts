import type { Balloon } from '~/utils/balloon';

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

// Level 1's route: up from the launch field, each platform higher than the last
export const ROUTE: Platform[] = [
  { name: 'Launch field', kind: 'field', distance: 0, height: 200 },
  { name: 'Red Mesa', kind: 'mesa', distance: 5000, height: 800 },
  { name: 'Eagle Lookout', kind: 'lookout', distance: 10000, height: 1300 },
  { name: 'Granite Ridge', kind: 'ridge', distance: 15000, height: 1900 },
];
