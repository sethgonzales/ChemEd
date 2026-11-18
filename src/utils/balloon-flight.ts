import { heightAt } from '~/utils/atmosphere';
import { gasInside } from '~/utils/balloon';
import { SKY_ROOM, groundAt } from '~/utils/balloon-camera';
import { solveGas } from '~/utils/gas-laws';
import {
  balloonFor,
  startFlight,
  tieOffVolume,
  type GasLeg,
} from '~/utils/balloon-legs';

// A leg flown on the student's answer. The balloon climbs slack, swelling as
// the air thins, until it reaches the volume Mr. G tied it off at; it stops
// swelling there, and he holds it at that height while the wind carries it.

export type Outcome = 'landed' | 'over' | 'short';

export const TOLERANCE = 0.02; // an answer within 2% lands: rounding the readings is fine
const CLIMB = 0.4; // of the flight spent climbing
const SINK = 0.25; // of a short flight spent sinking back down
const OVERSHOOT = 600; // m past the platform a balloon that's too high drifts
const CLEARANCE = 20; // m the basket needs above the ground
// m above the platform: below the top of the scene's sky
export const MAX_OVERSHOOT = SKY_ROOM - 200;
const SCAN_STEP = 10; // m

export interface FlightPlan {
  tiedAt: number; // m³, what the student answered
  outcome: Outcome;
  cruise: number; // m: the height it holds
  stopAt: number; // m along the route, where the flight ends
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the balloon stops swelling: the height whose air pressure is nRT/V */
function tiedHeight(g: GasLeg, tiedAt: number) {
  const now = gasInside(balloonFor(g), startFlight(g)).volume;
  if (tiedAt <= now) return g.leg.from.height; // already that big: no lift to climb
  const p = solveGas({ v: tiedAt, n: g.moles, t: g.gasTemperature }).p;
  return Math.max(g.leg.from.height, heightAt(p));
}

export function planFlight(g: GasLeg, answer: number): FlightPlan {
  const { from, to } = g.leg;
  const tiedAt = Math.min(answer, g.envelope);
  const error = tiedAt / tieOffVolume(g) - 1;
  if (Math.abs(error) <= TOLERANCE)
    // Mr. G trims the last few metres, as a pilot does with ballast
    return {
      tiedAt,
      outcome: 'landed',
      cruise: to.height,
      stopAt: to.distance,
    };
  const tied = tiedHeight(g, tiedAt);
  // too big, it would climb out of sight: Mr. G vents to stay near the
  // platform, but it's still too high to land
  const cruise = Math.min(tied, to.height + MAX_OVERSHOOT);
  if (error > 0)
    return {
      tiedAt,
      outcome: 'over',
      cruise,
      stopAt: to.distance + OVERSHOOT,
    };
  if (cruise === from.height)
    return { tiedAt, outcome: 'short', cruise, stopAt: from.distance };
  // too low to clear the land rising to the platform: it stops at the slope
  let d = (from.distance + to.distance) / 2;
  while (d < to.distance && groundAt(g.leg, d) + CLEARANCE < cruise)
    d += SCAN_STEP;
  return { tiedAt, outcome: 'short', cruise, stopAt: d - 4 * SCAN_STEP };
}

/** Where the balloon is at a point through the flight, t from 0 to 1 */
export function flightAt(g: GasLeg, plan: FlightPlan, t: number) {
  const { from } = g.leg;
  if (plan.stopAt === from.distance)
    return { distance: from.distance, height: from.height };
  const travel = plan.outcome === 'short' ? 1 - SINK : 1;
  const along = Math.min(1, t / travel);
  const distance = lerp(from.distance, plan.stopAt, along);
  const climbed = lerp(
    from.height,
    plan.cruise,
    smooth(Math.min(1, t / CLIMB)),
  );
  if (t <= travel) return { distance, height: climbed };
  // out of lift against the slope, Mr. G vents and it sinks to the ground
  const sunk = smooth((t - travel) / SINK);
  return {
    distance,
    height: lerp(plan.cruise, groundAt(g.leg, distance), sunk),
  };
}
