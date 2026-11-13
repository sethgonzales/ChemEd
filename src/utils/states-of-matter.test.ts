import { SUBSTANCES } from '~/constants/substances';
import {
  createSimulation,
  getParams,
  heatAt,
  heatingCurve,
  phaseHint,
  phaseOf,
  resizeSimulation,
  step,
  temperatureRange,
  toModelTemp,
  type Simulation,
} from './states-of-matter';

const W = 400;
const H = 400;
const DT = 1 / 60;

// Seeded PRNG so the random thermal motion is repeatable
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => {
  jest.spyOn(Math, 'random').mockImplementation(mulberry32(42));
});

afterEach(() => {
  jest.restoreAllMocks();
});

function run(sim: Simulation, tempC: number, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) step(sim, tempC, DT);
}

function vrms(sim: Simulation) {
  const sum = sim.particles.reduce(
    (s, p) => s + p.vel.x ** 2 + p.vel.y ** 2,
    0,
  );
  return Math.sqrt(sum / sim.particles.length);
}

// Average speed over a window, since a single frame is noisy
function averageVrms(sim: Simulation, tempC: number, seconds: number) {
  let total = 0;
  const frames = seconds * 60;
  for (let i = 0; i < frames; i++) {
    step(sim, tempC, DT);
    total += vrms(sim);
  }
  return total / frames;
}

function meanLatticeOffset(sim: Simulation) {
  const sum = sim.particles.reduce(
    (s, p) => s + Math.hypot(p.pos.x - p.anchor.x, p.pos.y - p.anchor.y),
    0,
  );
  return sum / sim.particles.length;
}

function heights(sim: Simulation) {
  return sim.particles.map((p) => sim.h - p.pos.y);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// Ids of each particle's touching (or nearly touching) neighbours
function neighbourSets(sim: Simulation) {
  return sim.particles.map(
    (p) =>
      new Set(
        sim.particles
          .filter(
            (q) =>
              q !== p &&
              Math.hypot(q.pos.x - p.pos.x, q.pos.y - p.pos.y) < p.r * 2 * 1.3,
          )
          .map((q) => q.id),
      ),
  );
}

// How far particles wander and how many swap out most of their neighbours
function measureFlow(sim: Simulation, tempC: number, seconds: number) {
  const start = sim.particles.map((p) => ({ ...p.pos }));
  const before = neighbourSets(sim);
  run(sim, tempC, seconds);
  const after = neighbourSets(sim);

  const displacement = median(
    sim.particles.map((p, i) =>
      Math.hypot(p.pos.x - start[i].x, p.pos.y - start[i].y),
    ),
  );
  const rearranged =
    before.filter((set, i) => {
      if (set.size === 0) return true;
      const kept = [...set].filter((id) => after[i].has(id)).length;
      return kept / set.size < 0.5;
    }).length / sim.particles.length;

  return { displacement, rearranged };
}

describe('getParams', () => {
  it('is fully solid well below the melting point', () => {
    const p = getParams(-20);
    expect(p.solidToLiquid).toBe(0);
    expect(p.springK).toBeGreaterThan(0);
    expect(p.cohesion).toBe(0);
  });

  it('is fully gas well above the boiling point', () => {
    const p = getParams(120);
    expect(p.liquidToGas).toBe(1);
    expect(p.springK).toBe(0);
    expect(p.cohesion).toBe(0);
  });

  it('blends gradually through the melting point', () => {
    const p = getParams(0);
    expect(p.solidToLiquid).toBeGreaterThan(0);
    expect(p.solidToLiquid).toBeLessThan(1);
    expect(p.springK).toBeGreaterThan(0);
    expect(p.cohesion).toBeGreaterThan(0);
  });

  it('raises the target speed with temperature in every phase', () => {
    for (let t = -25; t < 125; t += 5) {
      expect(getParams(t + 5).targetVrms).toBeGreaterThan(
        getParams(t).targetVrms,
      );
    }
  });
});

describe('simulation', () => {
  it('keeps a solid on its lattice', () => {
    const sim = createSimulation(W, H);
    run(sim, -25, 3);
    expect(meanLatticeOffset(sim)).toBeLessThan(2);
  });

  it('pools a liquid at the bottom of the container', () => {
    const sim = createSimulation(W, H);
    run(sim, 50, 4);
    // a few particles may escape the surface (evaporation), but most stay low
    const sorted = heights(sim).sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length * 0.95)]).toBeLessThan(H / 3);
  });

  it('spreads a gas through the container', () => {
    const sim = createSimulation(W, H);
    run(sim, 125, 4);
    const hs = heights(sim);
    expect(Math.max(...hs)).toBeGreaterThan(H * 0.75);
    expect(hs.reduce((s, h) => s + h, 0) / hs.length).toBeGreaterThan(H * 0.25);
  });

  it.each([10, 50, 90])(
    'lets liquid particles flow past each other at %i°C',
    (tempC) => {
      const sim = createSimulation(W, H);
      run(sim, tempC, 3);
      const diameter = sim.particles[0].r * 2;
      const { displacement, rearranged } = measureFlow(sim, tempC, 5);
      expect(displacement).toBeGreaterThan(diameter);
      expect(rearranged).toBeGreaterThan(0.5);
    },
  );

  it('flows faster as a liquid heats up', () => {
    const cold = createSimulation(W, H);
    run(cold, 10, 3);
    const hot = createSimulation(W, H);
    run(hot, 90, 3);
    expect(measureFlow(hot, 90, 5).displacement).toBeGreaterThan(
      measureFlow(cold, 10, 5).displacement * 1.3,
    );
  });

  it('keeps solid particles locked in place', () => {
    const sim = createSimulation(W, H);
    run(sim, -10, 2);
    const diameter = sim.particles[0].r * 2;
    const { displacement, rearranged } = measureFlow(sim, -10, 5);
    expect(displacement).toBeLessThan(diameter * 0.5);
    expect(rearranged).toBeLessThan(0.1);
  });

  it('moves faster as a liquid heats up', () => {
    const sim = createSimulation(W, H);
    run(sim, 10, 3);
    const cool = averageVrms(sim, 10, 2);
    run(sim, 90, 3);
    const hot = averageVrms(sim, 90, 2);
    expect(hot).toBeGreaterThan(cool * 1.2);
  });

  it('refreezes into a new lattice instead of snapping back to the original one', () => {
    const sim = createSimulation(W, H);
    run(sim, 125, 3);
    run(sim, -25, 3);
    expect(meanLatticeOffset(sim)).toBeLessThan(3);
    expect(Math.max(...heights(sim))).toBeLessThan(H * 0.25);
  });

  it('rebuilds the lattice inside a resized container', () => {
    const sim = createSimulation(W, H);
    run(sim, -25, 1);
    resizeSimulation(sim, 300, 200, -25);
    run(sim, -25, 2);
    for (const p of sim.particles) {
      expect(p.anchor.x).toBeGreaterThanOrEqual(p.r);
      expect(p.anchor.x).toBeLessThanOrEqual(300 - p.r);
      expect(p.anchor.y).toBeLessThanOrEqual(200 - p.r);
    }
    expect(meanLatticeOffset(sim)).toBeLessThan(3);
  });
});

describe('substances', () => {
  const water = SUBSTANCES.find((s) => s.id === 'water')!;
  const ethanol = SUBSTANCES.find((s) => s.id === 'ethanol')!;
  const mercury = SUBSTANCES.find((s) => s.id === 'mercury')!;

  it('keeps water on the −25 to 125 °C range the model was tuned on', () => {
    expect(temperatureRange(water)).toEqual({ min: -25, max: 125 });
    expect(toModelTemp(water, 37)).toBe(37);
  });

  it('gives each substance a range around its own melting and boiling points', () => {
    for (const s of SUBSTANCES) {
      const { min, max } = temperatureRange(s);
      expect(min).toBeLessThan(s.meltC);
      expect(max).toBeGreaterThan(s.boilC);
      expect(min).toBeGreaterThan(-273.15); // nothing below absolute zero
    }
  });

  it('melts and boils each substance at its own temperatures', () => {
    expect(toModelTemp(ethanol, ethanol.meltC)).toBeCloseTo(0);
    expect(toModelTemp(ethanol, ethanol.boilC)).toBeCloseTo(100);
    expect(phaseOf(ethanol, 20)).toBe('Liquid');
    expect(phaseOf(ethanol, 90)).toBe('Gas');
    expect(phaseOf(water, 90)).toBe('Liquid');
    expect(phaseOf(mercury, -50)).toBe('Solid');
    expect(phaseOf(mercury, 20)).toBe('Liquid');
  });

  it('notes when a temperature is near a phase change', () => {
    expect(phaseHint(water, 98)).toBe('Near the boiling point');
    expect(phaseHint(water, 50)).toBeNull();
    expect(phaseHint(mercury, -35)).toBe('Near the melting point');
    expect(phaseHint(mercury, 340)).toBe('Near the boiling point');
  });

  it('turns mercury at room temperature into a flowing liquid, not a solid', () => {
    const sim = createSimulation(W, H);
    run(sim, toModelTemp(mercury, 20), 4);
    // a liquid has left its lattice sites far behind
    expect(meanLatticeOffset(sim)).toBeGreaterThan(10);
  });
});

describe('heatingCurve', () => {
  const water = SUBSTANCES.find((s) => s.id === 'water')!;

  it('holds the temperature flat while it melts and while it boils', () => {
    for (const s of SUBSTANCES) {
      const curve = heatingCurve(s);
      const flats = curve
        .slice(1)
        .map((p, i) => [curve[i], p])
        .filter(([a, b]) => a.t === b.t);
      expect(flats.map(([a]) => a.t)).toEqual([s.meltC, s.boilC]);
      // each plateau is as long as the energy the phase change needs
      expect(flats[0][1].q - flats[0][0].q).toBeCloseTo(s.fusionKJ);
      expect(flats[1][1].q - flats[1][0].q).toBeCloseTo(s.vaporizationKJ);
    }
  });

  it('only ever climbs as heat is added', () => {
    const curve = heatingCurve(water);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].q).toBeGreaterThanOrEqual(curve[i - 1].q);
      expect(curve[i].t).toBeGreaterThanOrEqual(curve[i - 1].t);
    }
    expect(curve[0]).toEqual({ q: 0, t: -25 });
    expect(curve[curve.length - 1].t).toBe(125);
  });

  it('places a temperature on the curve, mid-plateau at the phase change itself', () => {
    const curve = heatingCurve(water);
    expect(heatAt(water, -25)).toBe(0);
    expect(heatAt(water, 50)).toBeGreaterThan(heatAt(water, 0));
    expect(heatAt(water, 100)).toBeCloseTo((curve[3].q + curve[4].q) / 2);
    expect(heatAt(water, 125)).toBeCloseTo(curve[curve.length - 1].q);
  });
});
