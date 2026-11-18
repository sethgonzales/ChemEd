import { airAt } from './atmosphere';
import { gasInside } from './balloon';
import { groundAt } from './balloon-camera';
import { MAX_OVERSHOOT, flightAt, planFlight } from './balloon-flight';
import {
  balloonFor,
  boyleLeg,
  startFlight,
  tieOffVolume,
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

  it('swells by Boyle’s law as it climbs, and stops swelling once tied off', () => {
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
