import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import { gasInside } from '~/utils/balloon';
import type { FlightPlan } from '~/utils/balloon-flight';
import {
  balloonFor,
  startFlight,
  tiesOff,
  type GasLeg,
  type Law,
} from '~/utils/balloon-legs';
import type { GasUnit } from '~/utils/gas-laws';

// What Mr. G says on a leg. The briefing names the goal and at most the one
// target the balloon needs: every other value is read off an instrument.

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** The readings as the instruments show them, rounded the same way */
function shown(g: GasLeg) {
  const gas = gasInside(balloonFor(g), startFlight(g));
  const celsius = Number((g.gasTemperature - ZERO_CELSIUS).toFixed(1));
  return {
    v1: Math.round(gas.volume), // volume meter, m³
    p1: Number((gas.pressure / 1000).toFixed(1)), // balloon gauge, kPa
    celsius, // helium thermometer
    kelvin: celsius + ZERO_CELSIUS,
    n1: g.moles, // helium counter
  };
}

const kPa = (pa: number) => fmt(pa / 1000, 1);

export interface Ask {
  label: string; // the calculation pad's
  units: GasUnit[];
  action: string; // the button that flies it
  flying: string; // what Mr. G says as it goes
}

const ASKS: Record<Law, Ask> = {
  boyle: {
    label: 'Volume to tie off at',
    units: ['m³', 'L'],
    action: 'Tie off and fly',
    flying: 'Tied off. Here we go…',
  },
  combined: {
    label: 'Volume to tie off at',
    units: ['m³', 'L'],
    action: 'Tie off and fly',
    flying: 'Tied off, and the heater’s turned down. Up we go…',
  },
  charles: {
    label: 'Heater temperature',
    units: ['K', '°C'],
    action: 'Heat and fly',
    flying: 'Heater’s on. Here we go…',
  },
  'gay-lussac': {
    label: 'Temperature to vent at',
    units: ['K', '°C'],
    action: 'Set the vent and fly',
    flying: 'Vent’s set. Out into the sun…',
  },
  avogadro: {
    label: 'Helium to have',
    units: ['mol'],
    action: 'Fill or vent and fly',
    flying: 'Helium’s set. Here we go…',
  },
};

/** What the calculation pad asks for on this leg */
export const ask = (g: GasLeg) => ASKS[g.law];

/** What Mr. G shouts the moment the fabric tears */
export const POPPED =
  'Pop! The fabric’s torn and the helium’s pouring out. Hold on, we’re coming down!';

/** Where we're going, what's holding steady, and the one thing to find */
export function briefing(g: GasLeg): string[] {
  const to = g.leg.to.name;
  switch (g.law) {
    case 'boyle':
      return [
        `Next stop: ${to}, up ahead.`,
        'The heater’s holding the helium at the same temperature, and the tank’s shut, so the temperature and the amount of helium aren’t changing.',
        `As we climb, the air thins and the balloon expands. I’ll tie the envelope off so it stops expanding just as we reach ${to}’s height: then we’ll float level with it and drift in.`,
        'Help me find the volume to tie it off at.',
      ];
    case 'combined':
      return [
        `Next stop: ${to}, high up ahead.`,
        'The tank’s shut, so the amount of helium isn’t changing. Everything else is: as we climb, the air thins and the balloon expands.',
        `It’s colder up there, so I’ll turn the heater down to ${fmt(g.said - ZERO_CELSIUS, 1)} °C on the way, and the helium will cool and shrink a little as we go.`,
        `I’ll tie the envelope off so it stops expanding just as we reach ${to}’s height. Help me find the volume to tie it off at.`,
      ];
    case 'charles':
      return [
        `Next stop: ${to}, across at the same height.`,
        'The tank’s shut and we’re staying at this height, so the amount of helium and the air pressure aren’t changing.',
        `The helium’s cooled while we rested, and we’re too small to lift off. To float across to ${to} we need to fill out to ${fmt(g.said)} m³: then the air we push aside weighs as much as we do.`,
        'Help me find the temperature to set the heater to.',
      ];
    case 'gay-lussac':
      return [
        `Next stop: ${to}, across the sunny valley at the same height.`,
        'We’re loaded with supplies, so we’re stretched full just to float: the volume can’t change, and the tank’s shut.',
        `The sun out there will bake the helium, and its pressure will climb. The balloon gauge’s red line is ${kPa(g.said)} kPa: past that, the fabric bursts.`,
        'Help me find the temperature that puts us right on the red line. I’ll vent helium if we get any hotter: too early and we lose helium we need, too late and we pop.',
      ];
    case 'avogadro':
      return [
        `Next stop: ${to}, across at the same height.`,
        g.cargo === 'picked up'
          ? 'We’ve picked up supply crates here, so we’re heavier and need to be bigger to float.'
          : 'We’ve dropped off our supply crates here, so we’re lighter and need to be smaller, or we’ll float away.',
        'The heater’s holding the temperature and we’re staying at this height, so the temperature and the air pressure aren’t changing.',
        `To float across now, we need to be ${fmt(g.said)} m³. Help me find how many moles of helium to have: I’ll top up from the tank or vent the extra.`,
      ];
  }
}

export function hint(g: GasLeg): string {
  switch (g.law) {
    case 'boyle':
      return `Boyle’s law: with the temperature and the helium fixed, P₁V₁ = P₂V₂. P₁ and V₁ are ours now, on the balloon gauge and the volume meter. P₂ is the air pressure at ${g.leg.to.name}: its weather station reads it.`;
    case 'combined':
      return `The combined gas law: with the helium fixed, P₁V₁/T₁ = P₂V₂/T₂, with T in kelvin. P₁, V₁ and T₁ are ours now, on the balloon gauge, the volume meter and the helium thermometer. P₂ is the air pressure at ${g.leg.to.name}: its weather station reads it. T₂ is the heater’s new setting.`;
    case 'charles':
      return 'Charles’s law: with the pressure and the helium fixed, V₁/T₁ = V₂/T₂, with T in kelvin. V₁ is on the volume meter and T₁ on the helium thermometer. V₂ is the volume I need.';
    case 'gay-lussac':
      return 'Gay-Lussac’s law: with the volume and the helium fixed, P₁/T₁ = P₂/T₂, with T in kelvin. P₁ is on the balloon gauge and T₁ on the helium thermometer. P₂ is the red line.';
    case 'avogadro':
      return 'Avogadro’s law: with the temperature and the pressure fixed, V₁/n₁ = V₂/n₂. V₁ is on the volume meter and n₁ on the helium counter. V₂ is the volume I need.';
  }
}

/** The calculation from the readings as the instruments show them */
export function worked(g: GasLeg): string[] {
  const r = shown(g);
  const inKelvin = `T₁ = ${fmt(r.celsius, 1)} °C + 273.15 = ${fmt(r.kelvin, 2)} K`;
  const temperature = (t: number) =>
    `T₂ = ${fmt(t, 1)} K (${fmt(t - ZERO_CELSIUS, 1)} °C)`;
  const p2 = Number((airAt(g.leg.to.height).pressure / 1000).toFixed(1));
  switch (g.law) {
    case 'combined': {
      const t2 = g.said; // K: he says a whole or half °C, so this is exact
      return [
        'P₁V₁/T₁ = P₂V₂/T₂, so V₂ = P₁V₁T₂ ÷ (P₂T₁)',
        inKelvin,
        `T₂ = ${fmt(g.said - ZERO_CELSIUS, 1)} °C + 273.15 = ${fmt(t2, 2)} K`,
        `V₂ = ${fmt(r.p1, 1)} kPa × ${fmt(r.v1)} m³ × ${fmt(t2, 2)} K ÷ (${fmt(p2, 1)} kPa × ${fmt(r.kelvin, 2)} K)`,
        `V₂ = ${fmt((r.p1 * r.v1 * t2) / (p2 * r.kelvin))} m³`,
      ];
    }
    case 'boyle': {
      return [
        'P₁V₁ = P₂V₂, so V₂ = P₁V₁ ÷ P₂',
        `V₂ = ${fmt(r.p1, 1)} kPa × ${fmt(r.v1)} m³ ÷ ${fmt(p2, 1)} kPa`,
        `V₂ = ${fmt((r.p1 * r.v1) / p2)} m³`,
      ];
    }
    case 'charles':
      return [
        'V₁/T₁ = V₂/T₂, so T₂ = T₁ × V₂ ÷ V₁',
        inKelvin,
        `T₂ = ${fmt(r.kelvin, 2)} K × ${fmt(g.said)} m³ ÷ ${fmt(r.v1)} m³`,
        temperature((r.kelvin * g.said) / r.v1),
      ];
    case 'gay-lussac':
      return [
        'P₁/T₁ = P₂/T₂, so T₂ = T₁ × P₂ ÷ P₁',
        inKelvin,
        `T₂ = ${fmt(r.kelvin, 2)} K × ${kPa(g.said)} kPa ÷ ${fmt(r.p1, 1)} kPa`,
        temperature((r.kelvin * g.said) / 1000 / r.p1),
      ];
    case 'avogadro':
      return [
        'V₁/n₁ = V₂/n₂, so n₂ = n₁ × V₂ ÷ V₁',
        `n₂ = ${fmt(r.n1)} mol × ${fmt(g.said)} m³ ÷ ${fmt(r.v1)} m³`,
        `n₂ = ${fmt((r.n1 * g.said) / r.v1)} mol`,
      ];
  }
}

// how each miss went, by law and outcome; {to} and {from} are the platforms
const MISSES: Record<Law, Partial<Record<FlightPlan['outcome'], string>>> = {
  boyle: {
    over: 'Tied off too big: we kept expanding, climbed too high and sailed right over {to}.',
    short:
      'Tied off too small: we stopped expanding too low and couldn’t clear the climb to {to}.',
  },
  combined: {
    over: 'Tied off too big: we kept expanding, climbed too high and sailed right over {to}.',
    short:
      'Tied off too small: we stopped expanding too low and couldn’t clear the climb to {to}.',
  },
  charles: {
    over: 'Too hot: we grew bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too cool: we didn’t grow big enough to lift us, so we never left {from}.',
  },
  avogadro: {
    over: 'Too much helium: we were bigger than we needed, had lift to spare, and climbed right over {to}.',
    short:
      'Too little helium: we weren’t big enough to lift us, so we never left {from}.',
  },
  'gay-lussac': {
    burst:
      'Too hot: the pressure went past the red line before I vented, and the fabric burst. We came down short of {to}.',
    short:
      'Too cool: I vented helium we needed, and when we cooled down over the far side we were too small to float. We came down short of {to}.',
  },
};

export function verdict(plan: FlightPlan, g: GasLeg): string {
  const { from, to } = g.leg;
  if (plan.outcome === 'landed') return `We’re down on ${to.name}!`;
  if (tiesOff(g) && plan.outcome === 'short' && plan.stopAt === from.distance)
    return `We’re already bigger than that, so tied off there we couldn’t expand, and without expanding we couldn’t climb. We never left ${from.name}.`;
  return (MISSES[g.law][plan.outcome] ?? '')
    .replace('{to}', to.name)
    .replace('{from}', from.name);
}
