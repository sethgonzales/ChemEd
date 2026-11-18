import { gasInside, liftOff } from './balloon';
import { planFlight } from './balloon-flight';
import {
  COINS_PER_LEG,
  FREE_LEGS,
  coinsOn,
  freeLeg,
  freeRoute,
  takenBy,
} from './balloon-free';
import {
  balloonFor,
  rightAnswer,
  startFlight,
  tiesOff,
  type GasLeg,
} from './balloon-legs';

const routes = Array.from({ length: 300 }, (_, s) => freeRoute(s));
const CLIMBS = ['boyle', 'combined'];

describe('a free flight’s route', () => {
  it('runs leg to leg from the launch field out to Far Horizon, each starting where the last landed', () => {
    for (const route of routes) {
      expect(route).toHaveLength(FREE_LEGS);
      expect(route[0].from.name).toBe('Launch field');
      expect(route.at(-1)!.to.name).toBe('Far Horizon');
      for (let i = 1; i < route.length; i++)
        expect(route[i].from).toEqual(route[i - 1].to);
    }
  });

  it('climbs on the laws that climb, and holds its height on the rest', () => {
    for (const route of routes)
      for (const { law, from, to } of route)
        if (CLIMBS.includes(law))
          expect(to.height).toBeGreaterThan(from.height);
        else expect(to.height).toBe(from.height);
  });

  it('mixes every law in, never the same one twice running', () => {
    const seen = new Set(routes.flat().map((s) => s.law));
    expect(seen.size).toBe(6);
    for (const route of routes)
      for (let i = 1; i < route.length; i++)
        expect(route[i].law).not.toBe(route[i - 1].law);
  });

  it('stays where every law’s numbers work: not too high, and the cargo hops on low ground', () => {
    for (const route of routes)
      for (const { law, from, to } of route) {
        expect(to.height).toBeLessThanOrEqual(2000);
        if (law === 'avogadro') expect(from.height).toBeLessThanOrEqual(400);
      }
  });

  it('is the same for the same seed', () => {
    expect(freeRoute(9)).toEqual(freeRoute(9));
  });
});

describe('a free flight’s legs', () => {
  const legs: GasLeg[] = routes.flatMap((route, s) =>
    route.map((_, i) => freeLeg(route, i, s * 7 + 1)),
  );

  it('fly each stop’s law between its platforms', () => {
    const route = routes[3];
    route.forEach((stop, i) => {
      const g = freeLeg(route, i, 5);
      expect(g.law).toBe(stop.law);
      expect(g.leg.from).toEqual(stop.from);
      expect(g.leg.to).toEqual(stop.to);
    });
  });

  it('keep the law and platforms on a retry, with fresh numbers', () => {
    const route = routes[3];
    const a = freeLeg(route, 1, 5);
    const b = freeLeg(route, 1, 6);
    expect(b.law).toBe(a.law);
    expect(b.leg).toEqual(a.leg);
    expect(b).not.toEqual(a);
  });

  it('always have numbers that work: the right answer lands, and fits the envelope', () => {
    for (const g of legs) {
      expect(planFlight(g, rightAnswer(g)).outcome).toBe('landed');
      if (tiesOff(g)) {
        const now = gasInside(balloonFor(g), startFlight(g)).volume;
        expect(rightAnswer(g)).toBeGreaterThan(now * 1.02);
        expect(rightAnswer(g)).toBeLessThan(g.envelope);
      } else if (g.law !== 'gay-lussac') {
        expect(g.said).toBeLessThan(g.envelope);
      }
    }
  });

  it('need the right amount of helium where the amount is the answer: a little more lifts, a little less doesn’t', () => {
    for (const g of legs.filter((l) => ['avogadro', 'ideal'].includes(l.law))) {
      const n = rightAnswer(g);
      const at = (moles: number) => ({ ...startFlight(g), moles });
      expect(liftOff(balloonFor(g), at(n * 1.01))).toBe(true);
      expect(liftOff(balloonFor(g), at(n * 0.99))).toBe(false);
    }
  });
});

describe('the coins on a leg', () => {
  const legs: GasLeg[] = routes
    .slice(0, 60)
    .flatMap((route, s) => route.map((_, i) => freeLeg(route, i, s + 1)));
  const taken = (g: GasLeg, by: number, t = 1) =>
    takenBy(g, planFlight(g, rightAnswer(g) * by), coinsOn(g), t).filter(
      Boolean,
    ).length;

  it('hangs three between the platforms, along the way a right answer flies', () => {
    for (const g of legs) {
      const coins = coinsOn(g);
      expect(coins).toHaveLength(COINS_PER_LEG);
      for (const c of coins) {
        expect(c.distance).toBeGreaterThan(g.leg.from.distance);
        expect(c.distance).toBeLessThan(g.leg.to.distance);
      }
    }
  });

  it('collects every coin with the right answer, but none before setting off', () => {
    for (const g of legs) {
      expect(taken(g, 1, 0)).toBe(0);
      expect(taken(g, 1)).toBe(COINS_PER_LEG);
    }
  });

  it('collects them as it passes, one after another', () => {
    const g = legs[0];
    const counts = [0.2, 0.4, 0.6, 0.8, 1].map((t) => taken(g, 1, t));
    for (let i = 1; i < counts.length; i++)
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(counts[0]).toBeLessThan(COINS_PER_LEG);
  });

  it('never collects them all on a miss', () => {
    for (const g of legs) {
      expect(taken(g, 1.1)).toBeLessThan(COINS_PER_LEG);
      expect(taken(g, 0.9)).toBeLessThan(COINS_PER_LEG);
    }
  });
});
