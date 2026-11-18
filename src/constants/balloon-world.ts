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

const HOP = 5000; // m between platforms

/** A route of platforms all at one height, so the air pressure holds */
const level = (height: number, stops: [string, AreaKind][]): Platform[] =>
  stops.map(([name, kind], i) => ({ name, kind, distance: i * HOP, height }));

// the heater: across the mesa country
export const CHARLES_ROUTE = level(800, [
  ['Red Mesa', 'mesa'],
  ['Lone Tower', 'lookout'],
  ['Table Mesa', 'mesa'],
  ['Hawk Ridge', 'ridge'],
]);

// the burst line: high over a sunny valley
export const GAY_LUSSAC_ROUTE = level(1300, [
  ['Eagle Lookout', 'lookout'],
  ['Dry Lake Tower', 'lookout'],
  ['White Ridge', 'ridge'],
  ['Sun Mesa', 'mesa'],
]);

// the tank and the vent: low over the farms, picking up and dropping off
export const AVOGADRO_ROUTE = level(400, [
  ['Mill Field', 'field'],
  ['Clay Mesa', 'mesa'],
  ['Pine Lookout', 'lookout'],
  ['Long Field', 'field'],
]);

// everything at once: a long climb into the cold, high country
export const COMBINED_ROUTE: Platform[] = [
  { name: 'Foothill Field', kind: 'field', distance: 0, height: 600 },
  { name: 'Cedar Mesa', kind: 'mesa', distance: HOP, height: 1300 },
  { name: 'Windy Lookout', kind: 'lookout', distance: 2 * HOP, height: 2000 },
  { name: 'Snowcap Ridge', kind: 'ridge', distance: 3 * HOP, height: 2700 },
];
