import { useEffect, useRef, useState } from 'react';
import Container from '~/components/container';
import Slider from '~/components/slider';

type Vec = { x: number; y: number };

type Particle = {
  id: number;
  pos: Vec;
  vel: Vec;
  r: number;
  m: number;
  anchor: Vec; // for solid lattice
};

/**
 * Tunables / knobs
 */

// Particles
const PARTICLE_COUNT = 150;
const PARTICLE_RADIUS = 6;
const PARTICLE_MASS = 1;

// Lattice / spawn packing
const LATTICE_SPACING_MULT = 2.4; // spacing = radius * this
const LATTICE_STAGGER_MULT = 0.5; // every other row offset
const RANDOM_INITIAL_VEL = 0.2; // initial random velocity scale

// Thermostat (temperature → motion)
const RANGE_STEPS = 7; // number of discrete labels on slider
const TEMP_MIN_C = -25;
const TEMP_MAX_C = 125;

const THERMOSTAT_BLEND_COLD = 0.02;
const THERMOSTAT_BLEND_HOT = 0.1;

// Phase transition bands
const MELT_POINT_C = 0;
const BOIL_POINT_C = 100;
const MELT_BAND_C = 5;
const BOIL_BAND_C = 5;

// Phase behavior knobs
const COHESION_SOLID_MIN = 0.3;
const COHESION_LIQUID_MAX = 1.0;
const COHESION_MULTIPLIER = 0.3;

const DAMPING_SOLID = 0.35;
const DAMPING_LIQUID = 0.08;
const DAMPING_GAS = 0.02;

const SPRING_K_MAX = 6.0;

const RESTITUTION_SOLID_LIQUID = 0.75;
const RESTITUTION_GAS = 0.95;

const GRAVITY = 900; // px/s^2 (tune)
const FLOOR_RESTITUTION_MULT_LIQUID = 0.35;
const FLOOR_RESTITUTION_MULT_GAS = 0.95;
const FLOOR_FRICTION = 0.985;

const SOLID_JITTER = 200; // px/s random micro-kicks
const SOLID_JITTER_DAMP = 0.85; // makes jitter small and stable

const LIQUID_THERMAL_MOTION_MIN = 400; // px/s thermal kicks near 0°C
const LIQUID_THERMAL_MOTION_MAX = 5000; // px/s thermal kicks near 100°C
const GAS_GRAVITY_SCALE = 0.02; // near-zero gravity in gas phase
const GAS_TARGET_VRMS_MIN = 30; // px/s gas speed at 100°C
const GAS_TARGET_VRMS_MAX = 80; // px/s gas speed at 125°C

// Integration
const DT_MAX = 1 / 30; // seconds

// Rendering
const PHASE_LABEL_FONT = '12px Arial';
const PHASE_LABEL_POS = { x: 10, y: 18 };

/**
 * Math helpers
 */
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mag(v: Vec) {
  return Math.hypot(v.x, v.y);
}

function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(v: Vec, s: number): Vec {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec, b: Vec) {
  return a.x * b.x + a.y * b.y;
}

/**
 * Physics parameters blended by temperature
 */
function getParams(tempC: number) {
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

  // cohesion strongest in liquid, fades out to gas
  const cohesion =
    lerp(COHESION_SOLID_MIN, COHESION_LIQUID_MAX, solidToLiquid) *
    (1 - liquidToGas) *
    COHESION_MULTIPLIER;

  // damping: high in solid, medium in liquid, low in gas
  const dampingSL = lerp(DAMPING_SOLID, DAMPING_LIQUID, solidToLiquid);
  const damping = lerp(dampingSL, DAMPING_GAS, liquidToGas);

  // solid spring strength: high in solid, fades out by liquid
  const springK = (1 - solidToLiquid) * SPRING_K_MAX;

  // collision restitution: solid/liquid slightly inelastic, gas more elastic
  const restitution = lerp(
    RESTITUTION_SOLID_LIQUID,
    RESTITUTION_GAS,
    liquidToGas,
  );

  return {
    solidToLiquid,
    liquidToGas,
    cohesion,
    damping,
    springK,
    restitution,
  };
}

/**
 * Map Celsius to target RMS speed (tunable)
 */
function tempToTargetVrms(tempC: number) {
  if (tempC < 0) return 0.05; // irrelevant; solid path ignores
  if (tempC < 100) {
    const x = tempC / 100; // 0..1
    return lerp(0.6, 4.0, x * x);
  }
  const x = clamp((tempC - 100) / 25, 0, 1); // 100..125 => 0..1
  return lerp(GAS_TARGET_VRMS_MIN, GAS_TARGET_VRMS_MAX, x);
}

function resolveCircleCollision(a: Particle, b: Particle, restitution: number) {
  const n = sub(b.pos, a.pos);
  const dist = mag(n);
  const minDist = a.r + b.r;

  if (dist === 0 || dist >= minDist) return;

  const normal = mul(n, 1 / dist);

  // positional correction (separate overlap)
  const penetration = minDist - dist;
  const totalMass = a.m + b.m;
  const correction = mul(normal, penetration / totalMass);
  a.pos = sub(a.pos, mul(correction, b.m));
  b.pos = add(b.pos, mul(correction, a.m));

  // relative velocity along normal
  const rv = sub(b.vel, a.vel);
  const velAlongNormal = dot(rv, normal);

  // if separating, skip
  if (velAlongNormal > 0) return;

  // impulse scalar
  const j = (-(1 + restitution) * velAlongNormal) / (1 / a.m + 1 / b.m);
  const impulse = mul(normal, j);

  a.vel = sub(a.vel, mul(impulse, 1 / a.m));
  b.vel = add(b.vel, mul(impulse, 1 / b.m));
}

function bounceOffWalls(
  p: Particle,
  w: number,
  h: number,
  restitution: number,
  floorRestitutionMult: number,
) {
  // left/right
  if (p.pos.x - p.r < 0) {
    p.pos.x = p.r;
    p.vel.x = Math.abs(p.vel.x) * restitution;
  } else if (p.pos.x + p.r > w) {
    p.pos.x = w - p.r;
    p.vel.x = -Math.abs(p.vel.x) * restitution;
  }

  // top
  if (p.pos.y - p.r < 0) {
    p.pos.y = p.r;
    p.vel.y = Math.abs(p.vel.y) * restitution;
  }

  // bottom (floor)
  if (p.pos.y + p.r > h) {
    p.pos.y = h - p.r;
    p.vel.y = -Math.abs(p.vel.y) * restitution * floorRestitutionMult;
    p.vel.x *= FLOOR_FRICTION;
  }
}

export default function StatesOfMatter() {
  const [temperature, setTemperature] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);

  const initParticles = (w: number, h: number) => {
    const r = PARTICLE_RADIUS;
    const spacing = r * LATTICE_SPACING_MULT;

    const cols = Math.floor((w - 2 * r) / spacing);

    const pts: Particle[] = [];
    let id = 0;

    // how many rows are actually needed
    const neededRows = Math.ceil(PARTICLE_COUNT / cols);

    // start stacking from the bottom
    const startY = h - r - (neededRows - 1) * spacing;

    for (let j = 0; j < neededRows && pts.length < PARTICLE_COUNT; j++) {
      for (let i = 0; i < cols && pts.length < PARTICLE_COUNT; i++) {
        const x =
          r + i * spacing + (j % 2 ? spacing * LATTICE_STAGGER_MULT : 0);
        const y = startY + j * spacing;

        pts.push({
          id: id++,
          pos: { x, y },
          vel: {
            x: (Math.random() - 0.5) * RANDOM_INITIAL_VEL,
            y: (Math.random() - 0.5) * RANDOM_INITIAL_VEL,
          },
          r,
          m: PARTICLE_MASS,
          anchor: { x, y },
        });
      }
    }

    while (pts.length < PARTICLE_COUNT) {
      pts.push({
        id: id++,
        pos: {
          x: r + Math.random() * (w - 2 * r),
          y: r + Math.random() * (h - 2 * r),
        },
        vel: {
          x: (Math.random() - 0.5) * RANDOM_INITIAL_VEL,
          y: (Math.random() - 0.5) * RANDOM_INITIAL_VEL,
        },
        r,
        m: PARTICLE_MASS,
        anchor: {
          x: r + Math.random() * (w - 2 * r),
          y: r + Math.random() * (h - 2 * r),
        },
      });
    }

    particlesRef.current = pts;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (particlesRef.current.length === 0) {
      initParticles(rect.width, rect.height);
    }
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const step = (tMs: number) => {
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const t = tMs / 1000;
      const last = lastTRef.current || t;
      const dt = clamp(t - last, 0, DT_MAX);
      lastTRef.current = t;

      const params = getParams(temperature);
      const particles = particlesRef.current;

      const isSolid = temperature < 0;
      const isGas = temperature >= 100;

      // choose floor behavior by phase
      const floorMult = isGas
        ? FLOOR_RESTITUTION_MULT_GAS
        : FLOOR_RESTITUTION_MULT_LIQUID;

      // thermostat target only really matters for liquid/gas
      const targetVrms = tempToTargetVrms(temperature);

      // compute current vrms
      let sumV2 = 0;
      for (const p of particles) sumV2 += p.vel.x * p.vel.x + p.vel.y * p.vel.y;
      const vrms = Math.sqrt(sumV2 / Math.max(1, particles.length));

      // temperature normalized 0..1 for thermostat blend
      const x =
        (clamp(temperature, TEMP_MIN_C, TEMP_MAX_C) - TEMP_MIN_C) /
        (TEMP_MAX_C - TEMP_MIN_C);

      const thermoBlend = lerp(THERMOSTAT_BLEND_COLD, THERMOSTAT_BLEND_HOT, x);

      // For solid, DO NOT thermostat-scale hard; it injects too much motion.
      // For liquid/gas, we do.
      const scale =
        !isSolid && vrms > 0 ? lerp(1, targetVrms / vrms, thermoBlend) : 1;

      for (const p of particles) {
        // --- SOLID: lattice lock + tiny jitter
        if (isSolid) {
          const toAnchor = sub(p.anchor, p.pos);
          const springF = mul(toAnchor, SPRING_K_MAX); // strong lock
          p.vel = add(p.vel, mul(springF, dt));

          // tiny shaking around anchor (Brownian-ish)
          p.vel.x += (Math.random() - 0.5) * SOLID_JITTER * dt;
          p.vel.y += (Math.random() - 0.5) * SOLID_JITTER * dt;

          // heavy damping so it doesn't drift
          p.vel = mul(p.vel, Math.pow(SOLID_JITTER_DAMP, dt * 60));

          // integrate
          p.pos = add(p.pos, mul(p.vel, dt));
          continue;
        }

        // --- LIQUID + GAS: gravity (reduced for gas so particles can spread)
        const gravScale = isGas ? GAS_GRAVITY_SCALE : 1;
        p.vel.y += GRAVITY * gravScale * dt;

        // --- LIQUID: cohesion keeps it together (gas fades cohesion out via params.cohesion)
        if (params.cohesion > 0) {
          // cheap cohesion: pull toward center-of-mass-ish using container center
          const centerPull = sub({ x: w / 2, y: h / 2 }, p.pos);
          p.vel = add(p.vel, mul(centerPull, params.cohesion * 0.001)); // small!
        }

        if (isGas) {
          // gas: straight-line motion, only change direction on collision
          // if too slow, launch in a random direction at target speed
          const speed = mag(p.vel);
          if (speed < targetVrms) {
            const angle = Math.random() * Math.PI * 2;
            p.vel = {
              x: Math.cos(angle) * targetVrms,
              y: Math.sin(angle) * targetVrms,
            };
          }
        } else {
          // liquid: thermal jitter + damping (scales with temperature)
          const liquidT = clamp(temperature / BOIL_POINT_C, 0, 1);
          const liquidThermal = lerp(
            LIQUID_THERMAL_MOTION_MIN,
            LIQUID_THERMAL_MOTION_MAX,
            liquidT,
          );
          p.vel.x += (Math.random() - 0.5) * liquidThermal * dt;
          p.vel.y += (Math.random() - 0.5) * liquidThermal * dt;
          p.vel = mul(p.vel, 1 - params.damping * dt);
          p.vel = mul(p.vel, scale);
        }

        // integrate (NO huge scale factor; make dt real)
        p.pos = add(p.pos, mul(p.vel, dt));
      }

      // Collisions
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          resolveCircleCollision(
            particles[i],
            particles[j],
            params.restitution,
          );
        }
      }

      // Walls
      for (const p of particles) {
        bounceOffWalls(p, w, h, params.restitution, floorMult);
      }

      // Render
      ctx.clearRect(0, 0, w, h);

      const styles = getComputedStyle(canvas);
      const secondary = styles.getPropertyValue('--color-secondary').trim();

      ctx.fillStyle = secondary || '#000';
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = PHASE_LABEL_FONT;
      ctx.fillText(
        temperature < MELT_POINT_C
          ? 'Solid'
          : temperature < BOIL_POINT_C
            ? 'Liquid'
            : 'Gas',
        PHASE_LABEL_POS.x,
        PHASE_LABEL_POS.y,
      );

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTRef.current = 0;
    };
  }, [temperature]);

  return (
    <Container header="States of Matter">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-12">
        <div
          ref={wrapRef}
          className="bg-white h-50 w-full sm:h-100 sm:w-100 rounded-lg overflow-hidden"
        >
          <canvas ref={canvasRef} className="block" />
        </div>

        <Slider
          label={`Temperature: ${temperature}°C`}
          value={temperature}
          onChange={setTemperature}
          min={TEMP_MIN_C}
          max={TEMP_MAX_C}
          rangeSteps={RANGE_STEPS}
          className="w-full sm:w-64"
        />
      </div>
    </Container>
  );
}
