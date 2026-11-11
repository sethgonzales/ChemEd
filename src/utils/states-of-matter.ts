export type Vec = { x: number; y: number };

export type Particle = {
  id: number;
  pos: Vec;
  vel: Vec;
  r: number;
  m: number;
  anchor: Vec; // lattice site while solid
};

export type Simulation = {
  particles: Particle[];
  w: number;
  h: number;
  latticeValid: boolean; // false once fully melted; rebuilt on refreeze
};

/**
 * Tunables / knobs
 */

// Particles
export const PARTICLE_COUNT = 150;
const PARTICLE_RADIUS = 6;
const PARTICLE_MASS = 1;

// Lattice packing
const LATTICE_SPACING_MULT = 2.4; // spacing = radius * this
const LATTICE_STAGGER_MULT = 0.5; // every other row offset
const LATTICE_ROW_MULT = Math.sqrt(3) / 2; // row spacing for hexagonal packing

// Temperature range
export const TEMP_MIN_C = -25;
export const TEMP_MAX_C = 125;

// Phase transition bands
export const MELT_POINT_C = 0;
export const BOIL_POINT_C = 100;
const MELT_BAND_C = 5;
const BOIL_BAND_C = 5;

// Thermal speed: one curve for every phase, so hotter always means faster
const SPEED_AT_MIN_C = 15; // px/s rms at TEMP_MIN_C
const SPEED_AT_MAX_C = 110; // px/s rms at TEMP_MAX_C

// Thermostat (Langevin): how quickly particles relax toward the target speed
const THERMOSTAT_SOLID = 8; // 1/s
const THERMOSTAT_LIQUID = 4; // 1/s
const THERMOSTAT_GAS = 0.5; // 1/s — low so gas moves in straight lines

// Solid lattice springs
const SPRING_K = 200; // 1/s^2
const SPRING_MAX_ACCEL = 4000; // px/s^2 — caps the pull when refreezing from far away

// Attraction and gravity scale with thermal energy (vrms² / 2), so the liquid
// keeps the same loose, flowing structure from 0–100°C and only its speed
// changes. Fixed values would jam a cold liquid into a crystal.
const COHESION_PER_ENERGY = 0.31; // 1/px — attraction at contact = this × energy
const COHESION_RANGE_MULT = 1.8; // cutoff = diameter * this
const GRAVITY_PER_ENERGY = 0.0156; // 1/px — just enough to settle the liquid
const GAS_GRAVITY_SCALE = 0.02; // nearly off in gas so it fills the container

// Collisions
const RESTITUTION_SOLID_LIQUID = 0.9;
const RESTITUTION_GAS = 0.95;
const FLOOR_RESTITUTION_MULT_LIQUID = 0.35;
const FLOOR_RESTITUTION_MULT_GAS = 0.95;
const FLOOR_FRICTION = 0.985;
const OVERLAP_PASSES = 2; // extra passes so stacked liquid doesn't squash

// Integration
export const DT_MAX = 1 / 30; // seconds

/**
 * Math helpers
 */
export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian() {
  // Box–Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Physics parameters blended by temperature, so phase changes are gradual
 */
export function getParams(tempC: number) {
  // 0..1 where 0=solid, 1=liquid (through melt band)
  const solidToLiquid = smoothstep(
    MELT_POINT_C - MELT_BAND_C,
    MELT_POINT_C + MELT_BAND_C,
    tempC,
  );

  // 0..1 where 0=liquid, 1=gas (through boil band)
  const liquidToGas = smoothstep(
    BOIL_POINT_C - BOIL_BAND_C,
    BOIL_POINT_C + BOIL_BAND_C,
    tempC,
  );

  const x =
    (clamp(tempC, TEMP_MIN_C, TEMP_MAX_C) - TEMP_MIN_C) /
    (TEMP_MAX_C - TEMP_MIN_C);

  const targetVrms = lerp(SPEED_AT_MIN_C, SPEED_AT_MAX_C, x);
  const energy = (targetVrms * targetVrms) / 2;

  return {
    solidToLiquid,
    liquidToGas,
    targetVrms,
    springK: (1 - solidToLiquid) * SPRING_K,
    // the lattice holds a solid together; attraction takes over as it melts
    cohesion: solidToLiquid * (1 - liquidToGas) * COHESION_PER_ENERGY * energy,
    thermostat: lerp(
      lerp(THERMOSTAT_SOLID, THERMOSTAT_LIQUID, solidToLiquid),
      THERMOSTAT_GAS,
      liquidToGas,
    ),
    // the lattice holds a solid up, so gravity only acts once it melts
    gravity:
      GRAVITY_PER_ENERGY *
      energy *
      solidToLiquid *
      lerp(1, GAS_GRAVITY_SCALE, liquidToGas),
    restitution: lerp(RESTITUTION_SOLID_LIQUID, RESTITUTION_GAS, liquidToGas),
    floorRestitutionMult: lerp(
      FLOOR_RESTITUTION_MULT_LIQUID,
      FLOOR_RESTITUTION_MULT_GAS,
      liquidToGas,
    ),
  };
}

/**
 * Lattice sites stacked from the floor up, centred horizontally
 */
function latticeSites(w: number, h: number, count: number): Vec[] {
  const r = PARTICLE_RADIUS;
  const spacing = r * LATTICE_SPACING_MULT;
  const stagger = spacing * LATTICE_STAGGER_MULT;
  const rowSpacing = spacing * LATTICE_ROW_MULT;
  const cols = Math.max(1, Math.floor((w - 2 * r - stagger) / spacing) + 1);
  const rowWidth = (cols - 1) * spacing + stagger;
  const left = Math.max(r, (w - rowWidth) / 2);

  const sites: Vec[] = [];
  for (let j = 0; sites.length < count; j++) {
    for (let i = 0; i < cols && sites.length < count; i++) {
      sites.push({
        x: left + i * spacing + (j % 2 ? stagger : 0),
        y: h - r - j * rowSpacing,
      });
    }
  }
  return sites;
}

/**
 * Give every particle a lattice site near where it is now: the lowest
 * particles take the bottom row, sorted left to right, and so on upward.
 */
export function buildLattice(sim: Simulation) {
  const { particles, w, h } = sim;
  const sites = latticeSites(w, h, particles.length);
  const byHeight = [...particles].sort((a, b) => b.pos.y - a.pos.y);

  let i = 0;
  while (i < sites.length) {
    const rowY = sites[i].y;
    let end = i;
    while (end < sites.length && sites[end].y === rowY) end++;

    const rowParticles = byHeight
      .slice(i, end)
      .sort((a, b) => a.pos.x - b.pos.x);
    rowParticles.forEach((p, k) => {
      p.anchor = { ...sites[i + k] };
    });
    i = end;
  }
  sim.latticeValid = true;
}

export function createSimulation(w: number, h: number): Simulation {
  const particles = latticeSites(w, h, PARTICLE_COUNT).map((site, id) => ({
    id,
    pos: { ...site },
    vel: { x: 0, y: 0 },
    r: PARTICLE_RADIUS,
    m: PARTICLE_MASS,
    anchor: { ...site },
  }));
  return { particles, w, h, latticeValid: true };
}

export function resizeSimulation(
  sim: Simulation,
  w: number,
  h: number,
  tempC: number,
) {
  sim.w = w;
  sim.h = h;
  for (const p of sim.particles) {
    p.pos.x = clamp(p.pos.x, p.r, w - p.r);
    p.pos.y = clamp(p.pos.y, p.r, h - p.r);
  }
  sim.latticeValid = false;

  // a resize isn't physical, so a solid jumps straight to its new lattice
  // rather than jamming its way there
  if (getParams(tempC).springK > 0) {
    buildLattice(sim);
    for (const p of sim.particles) p.pos = { ...p.anchor };
  }
}

function separate(
  a: Particle,
  b: Particle,
  ux: number,
  uy: number,
  overlap: number,
) {
  const correction = overlap / (a.m + b.m);
  a.pos.x -= ux * correction * b.m;
  a.pos.y -= uy * correction * b.m;
  b.pos.x += ux * correction * a.m;
  b.pos.y += uy * correction * a.m;
}

function separateOverlap(a: Particle, b: Particle) {
  const nx = b.pos.x - a.pos.x;
  const ny = b.pos.y - a.pos.y;
  const minDist = a.r + b.r;
  const d2 = nx * nx + ny * ny;
  if (d2 >= minDist * minDist || d2 === 0) return;

  const dist = Math.sqrt(d2);
  separate(a, b, nx / dist, ny / dist, minDist - dist);
}

/**
 * Pairwise forces: hard-sphere collisions plus short-range attraction
 */
function interact(
  a: Particle,
  b: Particle,
  restitution: number,
  cohesion: number,
  dt: number,
) {
  const nx = b.pos.x - a.pos.x;
  const ny = b.pos.y - a.pos.y;
  const minDist = a.r + b.r;
  const range = minDist * COHESION_RANGE_MULT;
  const d2 = nx * nx + ny * ny;
  if (d2 >= range * range || d2 === 0) return;

  const dist = Math.sqrt(d2);
  const ux = nx / dist;
  const uy = ny / dist;

  if (dist >= minDist) {
    // attraction fades linearly to zero at the cutoff
    if (cohesion <= 0) return;
    const accel = cohesion * (1 - (dist - minDist) / (range - minDist)) * dt;
    a.vel.x += ux * accel;
    a.vel.y += uy * accel;
    b.vel.x -= ux * accel;
    b.vel.y -= uy * accel;
    return;
  }

  separate(a, b, ux, uy, minDist - dist);

  // impulse along the normal, if approaching
  const velAlongNormal = (b.vel.x - a.vel.x) * ux + (b.vel.y - a.vel.y) * uy;
  if (velAlongNormal > 0) return;

  const j = (-(1 + restitution) * velAlongNormal) / (1 / a.m + 1 / b.m);
  a.vel.x -= (ux * j) / a.m;
  a.vel.y -= (uy * j) / a.m;
  b.vel.x += (ux * j) / b.m;
  b.vel.y += (uy * j) / b.m;
}

function bounceOffWalls(
  p: Particle,
  w: number,
  h: number,
  restitution: number,
  floorRestitutionMult: number,
) {
  if (p.pos.x - p.r < 0) {
    p.pos.x = p.r;
    p.vel.x = Math.abs(p.vel.x) * restitution;
  } else if (p.pos.x + p.r > w) {
    p.pos.x = w - p.r;
    p.vel.x = -Math.abs(p.vel.x) * restitution;
  }

  if (p.pos.y - p.r < 0) {
    p.pos.y = p.r;
    p.vel.y = Math.abs(p.vel.y) * restitution;
  }

  if (p.pos.y + p.r > h) {
    p.pos.y = h - p.r;
    p.vel.y = -Math.abs(p.vel.y) * restitution * floorRestitutionMult;
    p.vel.x *= FLOOR_FRICTION;
  }
}

export function step(sim: Simulation, tempC: number, dt: number) {
  const params = getParams(tempC);
  const { particles, w, h } = sim;

  // fully melted: the old lattice no longer means anything
  if (params.solidToLiquid >= 1) sim.latticeValid = false;
  // (re)freezing: build a fresh lattice from where the particles are now
  if (params.springK > 0 && !sim.latticeValid) buildLattice(sim);

  // Langevin thermostat: per-axis std of the target speed is vrms / √2
  const sigma = params.targetVrms / Math.SQRT2;
  const decay = Math.exp(-params.thermostat * dt);
  const kick = sigma * Math.sqrt(1 - decay * decay);

  for (const p of particles) {
    // lattice spring
    if (params.springK > 0) {
      let ax = (p.anchor.x - p.pos.x) * params.springK;
      let ay = (p.anchor.y - p.pos.y) * params.springK;
      const a = Math.hypot(ax, ay);
      if (a > SPRING_MAX_ACCEL) {
        ax *= SPRING_MAX_ACCEL / a;
        ay *= SPRING_MAX_ACCEL / a;
      }
      p.vel.x += ax * dt;
      p.vel.y += ay * dt;
    }

    p.vel.y += params.gravity * dt;

    p.vel.x = p.vel.x * decay + kick * gaussian();
    p.vel.y = p.vel.y * decay + kick * gaussian();
  }

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      interact(
        particles[i],
        particles[j],
        params.restitution,
        params.cohesion,
        dt,
      );
    }
  }

  for (let pass = 0; pass < OVERLAP_PASSES; pass++) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        separateOverlap(particles[i], particles[j]);
      }
    }
  }

  for (const p of particles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    bounceOffWalls(p, w, h, params.restitution, params.floorRestitutionMult);
  }
}
