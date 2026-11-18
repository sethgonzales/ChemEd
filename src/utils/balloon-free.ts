import { ROUTE, type AreaKind, type Platform } from '~/constants/balloon-world';
import { flightAt, planFlight, type FlightPlan } from '~/utils/balloon-flight';
import {
  BUILDERS,
  rightAnswer,
  seeded,
  type GasLeg,
  type Law,
} from '~/utils/balloon-legs';
import { createRng } from '~/utils/quest';

// Free flight: a long way out to a far platform, each leg on a law picked at
// random. The route (laws and platforms) comes from one seed and stays put
// through retries; each leg's numbers come from another, fresh on a retry.

export const FREE_LEGS = 5;

const HOP = 5000; // m between platforms
const CLIMB = [650, 750]; // m a climbing leg rises, enough for the laws to show
const CLIMB_STEP = 50; // m
const HIGHEST = 2000; // m: high enough for every law's numbers to still work
// m: Avogadro's cargo leg only floats its heaviest loads in the thick air
// low down
const CARGO_CEILING = 400;

// the stops out, the last the far platform
const STOPS: [string, AreaKind][] = [
  ['Kite Mesa', 'mesa'],
  ['Owl Lookout', 'lookout'],
  ['Pebble Field', 'field'],
  ['Storm Ridge', 'ridge'],
  ['Far Horizon', 'lookout'],
];

const LAWS: Law[] = [
  'boyle',
  'charles',
  'gay-lussac',
  'avogadro',
  'combined',
  'ideal',
];
// Boyle's and the combined law ride the air thinning on a climb
const climbs = (law: Law) => law === 'boyle' || law === 'combined';

function fits(law: Law, height: number) {
  if (climbs(law)) return height + CLIMB[1] <= HIGHEST;
  if (law === 'avogadro') return height <= CARGO_CEILING;
  return true;
}

export interface FreeStop {
  law: Law;
  from: Platform;
  to: Platform;
}

/** The route out to Far Horizon: each leg's law and its platforms */
export function freeRoute(seed: number): FreeStop[] {
  const rng = createRng(seed);
  const stops: FreeStop[] = [];
  let from = ROUTE[0];
  for (let i = 0; i < FREE_LEGS; i++) {
    const options = LAWS.filter(
      (law) => fits(law, from.height) && law !== stops.at(-1)?.law,
    );
    const law = options[Math.floor(rng() * options.length)];
    const rise = climbs(law)
      ? Math.round((CLIMB[0] + rng() * (CLIMB[1] - CLIMB[0])) / CLIMB_STEP) *
        CLIMB_STEP
      : 0;
    const [name, kind] = STOPS[i];
    const to: Platform = {
      name,
      kind,
      distance: from.distance + HOP,
      height: from.height + rise,
    };
    stops.push({ law, from, to });
    from = to;
  }
  return stops;
}

/** A leg of the route, with its numbers from the seed */
export const freeLeg = (
  route: FreeStop[],
  index: number,
  seed: number,
): GasLeg => {
  const { law, from, to } = route[index];
  return BUILDERS[law](from, to, seeded(seed, index));
};

export const COINS_PER_LEG = 3;
const COIN_AT = [0.25, 0.5, 0.75]; // of a right answer's flight, where they hang
const REACH = { distance: 120, height: 50 }; // m: how near the basket must pass
const LOOK_STEP = 0.01; // of the flight, checking where it's been

export interface Coin {
  distance: number; // m along the route
  height: number; // m above sea level
}

/** The leg's coins, hung along the way a right answer flies */
export function coinsOn(g: GasLeg): Coin[] {
  const plan = planFlight(g, rightAnswer(g));
  return COIN_AT.slice(0, COINS_PER_LEG).map((t) => flightAt(g, plan, t));
}

/** Which coins the balloon has passed close enough to collect, t into the flight */
export function takenBy(
  g: GasLeg,
  plan: FlightPlan,
  coins: Coin[],
  t: number,
): boolean[] {
  const path: Coin[] = [];
  for (let s = 0; s <= t + 1e-9; s += LOOK_STEP)
    path.push(flightAt(g, plan, Math.min(s, 1)));
  return coins.map((c) =>
    path.some(
      (p) =>
        Math.abs(p.distance - c.distance) <= REACH.distance &&
        Math.abs(p.height - c.height) <= REACH.height,
    ),
  );
}
