import { airAt } from './atmosphere';
import { gasInside, liftOff, type Flight } from './balloon';
import {
  BOYLE_LEGS,
  LEGS_PER_LEVEL,
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
const legs = Array.from({ length: BOYLE_LEGS }, (_, i) => boyleLeg(i, 42));

describe('Boyle’s law legs', () => {
  it('flies platform to platform, each leg starting where the last one landed', () => {
    for (let i = 1; i < legs.length; i++)
      expect(legs[i].leg.from).toEqual(legs[i - 1].leg.to);
  });

  it('climbs every leg, so the air thins and the balloon expands', () => {
    for (const { leg } of legs)
      expect(leg.to.height).toBeGreaterThan(leg.from.height);
  });

  it('starts slack on its platform, the helium at the air’s pressure', () => {
    for (const g of legs) {
      const start = startFlight(g);
      expect(start.height).toBe(g.leg.from.height);
      const gas = gasInside(balloonFor(g), start);
      expect(gas.taut).toBe(false);
      expect(gas.pressure).toBeCloseTo(airAt(g.leg.from.height).pressure, 6);
    }
  });

  it('ties off at the volume Boyle’s law gives from the instruments', () => {
    for (const g of legs) {
      const p1 = airAt(g.leg.from.height).pressure; // barometer, or balloon gauge
      const v1 = gasInside(balloonFor(g), startFlight(g)).volume; // volume meter
      const p2 = airAt(g.leg.to.height).pressure; // the next stop's station
      expect(tieOffVolume(g) / ((p1 * v1) / p2)).toBeCloseTo(1, 9);
    }
  });

  it('asks for a volume bigger than now that still fits in the envelope', () => {
    for (const g of legs) {
      const now = gasInside(balloonFor(g), startFlight(g)).volume;
      expect(tieOffVolume(g)).toBeGreaterThan(now);
      expect(tieOffVolume(g)).toBeLessThan(g.envelope);
    }
  });

  it('gives fresh numbers on a retry, and the same ones for the same seed', () => {
    expect(boyleLeg(0, 42)).toEqual(boyleLeg(0, 42));
    expect(boyleLeg(0, 43).moles).not.toBe(boyleLeg(0, 42).moles);
  });

  it('reads helium in whole hundreds of moles, like the counter shows', () => {
    for (const g of legs) expect(g.moles % 100).toBe(0);
  });
});

const LAWS = {
  charles: charlesLeg,
  'gay-lussac': gayLussacLeg,
  avogadro: avogadroLeg,
};

describe.each(Object.entries(LAWS))('%s legs', (_, make) => {
  const these = Array.from({ length: LEGS_PER_LEVEL }, (_, i) => make(i, 42));

  it('hop platform to platform at the same height, so the air pressure holds', () => {
    expect(these).toHaveLength(3);
    for (let i = 1; i < these.length; i++)
      expect(these[i].leg.from).toEqual(these[i - 1].leg.to);
    for (const { leg } of these) expect(leg.to.height).toBe(leg.from.height);
  });

  it('gives fresh numbers on a retry, and the same ones for the same seed', () => {
    expect(make(0, 42)).toEqual(make(0, 42));
    expect(make(0, 43)).not.toEqual(make(0, 42));
  });

  it('reads helium in whole hundreds of moles, like the counter shows', () => {
    for (const g of these) expect(g.moles % 100).toBe(0);
  });
});

// a little either side of the right answer
const withGas = (g: GasLeg, change: Partial<Flight>) => ({
  ...startFlight(g),
  ...change,
});

describe('Charles’s law legs', () => {
  const these = Array.from({ length: LEGS_PER_LEVEL }, (_, i) =>
    charlesLeg(i, 42),
  );

  it('start slack and too small to lift off', () => {
    for (const g of these) {
      expect(gasInside(balloonFor(g), startFlight(g)).taut).toBe(false);
      expect(liftOff(balloonFor(g), startFlight(g))).toBe(false);
    }
  });

  it('ask for the heater temperature Charles’s law gives from the readings', () => {
    for (const g of these) {
      const v1 = gasInside(balloonFor(g), startFlight(g)).volume;
      const t1 = g.gasTemperature;
      expect(rightAnswer(g) / ((t1 * g.said) / v1)).toBeCloseTo(1, 9);
      expect(rightAnswer(g)).toBeGreaterThan(t1);
    }
  });

  it('need the volume that floats there: a little hotter lifts, a little cooler doesn’t', () => {
    for (const g of these) {
      const t = rightAnswer(g);
      expect(
        liftOff(balloonFor(g), withGas(g, { gasTemperature: t * 1.01 })),
      ).toBe(true);
      expect(
        liftOff(balloonFor(g), withGas(g, { gasTemperature: t * 0.99 })),
      ).toBe(false);
      expect(g.said).toBeLessThan(g.envelope);
    }
  });
});

describe('Avogadro’s law legs', () => {
  const these = Array.from({ length: LEGS_PER_LEVEL }, (_, i) =>
    avogadroLeg(i, 42),
  );

  it('change the load at each platform, so the volume that floats changes', () => {
    for (const g of these) {
      const v1 = gasInside(balloonFor(g), startFlight(g)).volume;
      expect(Math.abs(g.said / v1 - 1)).toBeGreaterThan(0.05);
    }
  });

  it('ask for the moles Avogadro’s law gives from the readings', () => {
    for (const g of these) {
      const v1 = gasInside(balloonFor(g), startFlight(g)).volume;
      expect(rightAnswer(g) / ((g.moles * g.said) / v1)).toBeCloseTo(1, 9);
    }
  });

  it('need the volume that floats there: a little more helium lifts, a little less doesn’t', () => {
    for (const g of these) {
      const n = rightAnswer(g);
      expect(liftOff(balloonFor(g), withGas(g, { moles: n * 1.01 }))).toBe(
        true,
      );
      expect(liftOff(balloonFor(g), withGas(g, { moles: n * 0.99 }))).toBe(
        false,
      );
    }
  });
});

describe('Gay-Lussac’s law legs', () => {
  const these = Array.from({ length: LEGS_PER_LEVEL }, (_, i) =>
    gayLussacLeg(i, 42),
  );

  it('start stretched full, below the red line', () => {
    for (const g of these) {
      const gas = gasInside(balloonFor(g), startFlight(g));
      expect(gas.taut).toBe(true);
      expect(gas.burst).toBe(false);
      expect(gas.pressure).toBeLessThan(g.said);
    }
  });

  it('give the red line: the air’s pressure plus what the fabric holds', () => {
    for (const g of these)
      expect(g.said).toBeCloseTo(
        airAt(g.leg.from.height).pressure + balloonFor(g).burstOverpressure,
        -2,
      );
  });

  it('ask for the temperature Gay-Lussac’s law gives at the red line', () => {
    for (const g of these) {
      const { pressure } = gasInside(balloonFor(g), startFlight(g));
      expect(
        rightAnswer(g) / ((g.gasTemperature * g.said) / pressure),
      ).toBeCloseTo(1, 9);
    }
  });

  it('burst a little hotter than the answer, and hold a little cooler', () => {
    for (const g of these) {
      const t = rightAnswer(g);
      expect(
        gasInside(balloonFor(g), withGas(g, { gasTemperature: t * 1.02 }))
          .burst,
      ).toBe(true);
      expect(
        gasInside(balloonFor(g), withGas(g, { gasTemperature: t * 0.98 }))
          .burst,
      ).toBe(false);
    }
  });

  it('carry a load that floats there when stretched full', () => {
    for (const g of these) {
      const full = balloonFor(g);
      expect(
        liftOff({ ...full, payload: full.payload * 0.98 }, startFlight(g)),
      ).toBe(true);
      expect(
        liftOff({ ...full, payload: full.payload * 1.02 }, startFlight(g)),
      ).toBe(false);
    }
  });
});
