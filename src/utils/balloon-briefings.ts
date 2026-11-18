import { airAt } from '~/utils/atmosphere';
import { gasInside } from '~/utils/balloon';
import type { FlightPlan } from '~/utils/balloon-flight';
import { balloonFor, startFlight, type GasLeg } from '~/utils/balloon-legs';

// What Mr. G says on a leg. The briefing names the goal but no numbers:
// every value the student needs is read off an instrument.

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Where we're going, what's holding steady, and the one thing to find */
export const briefing = ({ leg }: GasLeg) => [
  `Next stop: ${leg.to.name}, up ahead.`,
  'The heater’s holding the helium at the same temperature, and the tank’s shut, so the temperature and the amount of helium aren’t changing.',
  `As we climb, the air thins and the balloon expands. I’ll tie the envelope off so it stops expanding just as we reach ${leg.to.name}’s height: then we’ll float level with it and drift in.`,
  'Help me find the volume to tie it off at.',
];

export const hint = ({ leg }: GasLeg) =>
  `Boyle’s law: with the temperature and the helium fixed, P₁V₁ = P₂V₂. P₁ and V₁ are ours now, on the balloon gauge and the volume meter. P₂ is the air pressure at ${leg.to.name}: its weather station reads it.`;

/** The calculation from the readings as the instruments show them */
export function worked(g: GasLeg) {
  const p1 = Number((airAt(g.leg.from.height).pressure / 1000).toFixed(1));
  const v1 = Math.round(gasInside(balloonFor(g), startFlight(g)).volume);
  const p2 = Number((airAt(g.leg.to.height).pressure / 1000).toFixed(1));
  return [
    'P₁V₁ = P₂V₂, so V₂ = P₁V₁ ÷ P₂',
    `V₂ = ${fmt(p1, 1)} kPa × ${fmt(v1)} m³ ÷ ${fmt(p2, 1)} kPa`,
    `V₂ = ${fmt((p1 * v1) / p2)} m³`,
  ];
}

export function verdict(plan: FlightPlan, { leg }: GasLeg) {
  if (plan.outcome === 'landed') return `We’re down on ${leg.to.name}!`;
  if (plan.outcome === 'over')
    return `Tied off too big: we kept expanding, climbed too high and sailed right over ${leg.to.name}.`;
  if (plan.stopAt === leg.from.distance)
    return `We’re already bigger than that, so tied off there we couldn’t expand, and without expanding we couldn’t climb. We never left ${leg.from.name}.`;
  return `Tied off too small: we stopped expanding too low and couldn’t clear the climb to ${leg.to.name}.`;
}
