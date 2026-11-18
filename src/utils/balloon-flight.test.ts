import { airAt } from './atmosphere';
import { gasInside } from './balloon';
import { groundAt } from './balloon-camera';
import {
  MAX_OVERSHOOT,
  flightAt,
  flightState,
  planFlight,
} from './balloon-flight';
import {
  avogadroLeg,
  balloonFor,
  boyleLeg,
  charlesLeg,
  gayLussacLeg,
  rightAnswer,
  startFlight,
  tieOffVolume,
  type GasLeg,
} from './balloon-legs';
const g = boyleLeg(0, 7);
const right = tieOffVolume(g);
const end = (tiedAt: number) => flightAt(g, planFlight(g, tiedAt), 1);

describe('flying a Boyle’s law leg', () => {
  it('lands on the next platform with the right answer', () => {
    expect(planFlight(g, right).outcome).toBe('landed');
    expect(end(right)).toEqual({
      distance: g.leg.to.distance,
      height: g.leg.to.height,
    });
  });

  it('still lands with an answer rounded from the instruments', () => {
    expect(planFlight(g, right * 1.015).outcome).toBe('landed');
    expect(planFlight(g, right * 0.985).outcome).toBe('landed');
  });

  it('sails over the platform when tied off 10% too big', () => {
    expect(planFlight(g, right * 1.1).outcome).toBe('over');
    const there = end(right * 1.1);
    expect(there.distance).toBeGreaterThan(g.leg.to.distance);
    expect(there.height).toBeGreaterThan(g.leg.to.height);
  });

  it('climbs, then sinks short of the platform when tied off a little small', () => {
    // it starts at about 93% of the answer, so 96% lets it climb some way
    const small = right * 0.96;
    const plan = planFlight(g, small);
    expect(plan.outcome).toBe('short');
    expect(plan.cruise).toBeGreaterThan(g.leg.from.height);
    expect(plan.cruise).toBeLessThan(g.leg.to.height);
    const there = end(small);
    expect(there.distance).toBeGreaterThan(g.leg.from.distance);
    expect(there.distance).toBeLessThan(g.leg.to.distance);
    expect(there.height).toBeCloseTo(groundAt(g.leg, there.distance), 6);
  });

  it('expands by Boyle’s law as it climbs, and stops expanding once tied off', () => {
    const tiedAt = right * 1.1;
    const plan = planFlight(g, tiedAt);
    const balloon = balloonFor(g, tiedAt);
    const p1v1 =
      airAt(g.leg.from.height).pressure *
      gasInside(balloonFor(g), startFlight(g)).volume;
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const { height } = flightAt(g, plan, t);
      const gas = gasInside(balloon, { ...startFlight(g), height });
      expect(gas.volume).toBeGreaterThanOrEqual(last - 1e-9);
      expect(gas.volume).toBeLessThanOrEqual(tiedAt + 1e-9);
      if (!gas.taut)
        expect((gas.pressure * gas.volume) / p1v1).toBeCloseTo(1, 9);
      last = gas.volume;
    }
    expect(last).toBeCloseTo(tiedAt, 0);
  });

  it('can’t climb at all if tied off smaller than it already is', () => {
    const plan = planFlight(g, 100);
    expect(plan.outcome).toBe('short');
    expect(end(100)).toEqual({
      distance: g.leg.from.distance,
      height: g.leg.from.height,
    });
  });
});

describe('a wild answer', () => {
  it('sails over, but Mr. G vents before it climbs out of sight', () => {
    const plan = planFlight(g, 5000);
    expect(plan.outcome).toBe('over');
    expect(plan.cruise).toBeLessThanOrEqual(g.leg.to.height + MAX_OVERSHOOT);
    expect(plan.cruise).toBeGreaterThan(g.leg.to.height);
  });
});

const flat = {
  charles: charlesLeg(0, 7),
  avogadro: avogadroLeg(0, 7),
  'gay-lussac': gayLussacLeg(0, 7),
};
const endOf = (leg: GasLeg, answer: number) =>
  flightAt(leg, planFlight(leg, answer), 1);

describe.each(Object.entries(flat))('flying a %s leg', (_, leg) => {
  const answer = rightAnswer(leg);

  it('lands on the next platform with the right answer, or one rounded from the readings', () => {
    for (const a of [answer, answer * 1.015, answer * 0.985])
      expect(planFlight(leg, a).outcome).toBe('landed');
    expect(endOf(leg, answer)).toEqual({
      distance: leg.leg.to.distance,
      height: leg.leg.to.height,
    });
  });

  it('shows the answer on the instruments as it flies', () => {
    const plan = planFlight(leg, answer);
    const { flight } = flightState(leg, plan, 1);
    if (leg.law === 'avogadro') expect(flight.moles).toBeCloseTo(answer, 6);
    else expect(flight.gasTemperature).toBeCloseTo(answer, 0);
  });
});

describe.each([
  ['charles', flat.charles],
  ['avogadro', flat.avogadro],
])('too much or too little on a %s leg', (_, leg) => {
  const answer = rightAnswer(leg);

  it('climbs and sails over when the balloon’s too big', () => {
    const plan = planFlight(leg, answer * 1.1);
    expect(plan.outcome).toBe('over');
    const there = endOf(leg, answer * 1.1);
    expect(there.distance).toBeGreaterThan(leg.leg.to.distance);
    expect(there.height).toBeGreaterThan(leg.leg.to.height);
    expect(there.height).toBeLessThanOrEqual(leg.leg.to.height + MAX_OVERSHOOT);
  });

  it('never leaves the platform when it’s too small to lift', () => {
    expect(planFlight(leg, answer * 0.9).outcome).toBe('short');
    expect(endOf(leg, answer * 0.9)).toEqual({
      distance: leg.leg.from.distance,
      height: leg.leg.from.height,
    });
  });
});

describe('the burst line on a Gay-Lussac’s law leg', () => {
  const leg = flat['gay-lussac'];
  const answer = rightAnswer(leg);
  const downShort = (a: number) => {
    const there = endOf(leg, a);
    expect(there.distance).toBeGreaterThan(leg.leg.from.distance);
    expect(there.distance).toBeLessThan(leg.leg.to.distance);
    expect(there.height).toBeCloseTo(groundAt(leg.leg, there.distance), 6);
  };

  it('bursts and comes down short when the vent’s set too hot', () => {
    const plan = planFlight(leg, answer * 1.05);
    expect(plan.outcome).toBe('burst');
    expect(
      gasInside(balloonFor(leg), flightState(leg, plan, 0.5).flight).burst,
    ).toBe(true);
    downShort(answer * 1.05);
  });

  it('vents helium it needed and comes down short when set too cool', () => {
    const plan = planFlight(leg, answer * 0.95);
    expect(plan.outcome).toBe('short');
    expect(flightState(leg, plan, 1).flight.moles).toBeLessThan(leg.moles);
    downShort(answer * 0.95);
  });

  it('holds right at the red line with the right answer', () => {
    const plan = planFlight(leg, answer);
    for (let t = 0; t <= 1; t += 0.1)
      expect(
        gasInside(balloonFor(leg), flightState(leg, plan, t).flight).burst,
      ).toBe(false);
  });
});
