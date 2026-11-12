import { useEffect, useRef, useState } from 'react';
import Container from '~/components/container';
import { useGuide } from '~/components/guide';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import { useTheme } from '~/styles/theme-provider';
import {
  BOIL_BAND_C,
  BOIL_POINT_C,
  MELT_BAND_C,
  DT_MAX,
  MELT_POINT_C,
  TEMP_MAX_C,
  TEMP_MIN_C,
  clamp,
  createSimulation,
  resizeSimulation,
  step,
  type Simulation,
} from '~/utils/states-of-matter';
import { PHASE_SETTLE_MS, phaseMessage, type Phase } from '~/utils/guide';
import { useMedia } from '~/utils/use-media';

const RANGE_STEPS = 7; // number of discrete labels on slider

const KELVIN_OFFSET = 273.15;

// with reduced motion, steps run before each still picture, so it shows the phase settled
const SETTLE_STEPS = 120;

const PARTICLES: Record<Phase, string> = {
  Solid: 'packed tightly, vibrating in place',
  Liquid: 'close together, sliding past each other',
  Gas: 'spread out, flying around fast',
};

// the picture in words, for screen readers
const describeParticles = (tempC: number) =>
  `${phaseLabel(tempC)} at ${tempC} °C: particles ${PARTICLES[phaseLabel(tempC)]}`;

function phaseLabel(tempC: number): Phase {
  if (tempC < MELT_POINT_C) return 'Solid';
  if (tempC < BOIL_POINT_C) return 'Liquid';
  return 'Gas';
}

// inside a transition band the particles are partway between phases
function phaseHint(tempC: number) {
  if (Math.abs(tempC - MELT_POINT_C) <= MELT_BAND_C) {
    return 'Near the melting point';
  }
  if (Math.abs(tempC - BOIL_POINT_C) <= BOIL_BAND_C) {
    return 'Near the boiling point';
  }
  return null;
}

export default function StatesOfMatter() {
  const [temperature, setTemperature] = useState(0);
  const { themeName } = useTheme();
  const { say } = useGuide();

  // Mr. G names a phase change once the slider settles in the new phase
  const phase = phaseLabel(temperature);
  const announced = useRef(phase);
  useEffect(() => {
    if (phase === announced.current) return;
    const timer = setTimeout(() => {
      say(phaseMessage(announced.current, phase), 'tip', { unprompted: true });
      announced.current = phase;
    }, PHASE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase, say]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // read by the animation loop, so changing them doesn't restart it
  const temperatureRef = useRef(temperature);
  const colorRef = useRef('#000');
  const simRef = useRef<Simulation | null>(null);

  // reduced motion: no animation; redraw a settled picture when something changes
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const reducedRef = useRef(reducedMotion);
  const redrawRef = useRef(true);

  useEffect(() => {
    temperatureRef.current = temperature;
    redrawRef.current = true;
  }, [temperature]);

  useEffect(() => {
    reducedRef.current = reducedMotion;
    redrawRef.current = true;
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const color = getComputedStyle(canvas)
      .getPropertyValue('--color-secondary')
      .trim();
    colorRef.current = color || '#000';
  }, [themeName]);

  // Keep the canvas and simulation sized to the container
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!simRef.current) {
        simRef.current = createSimulation(width, height);
      } else {
        resizeSimulation(simRef.current, width, height, temperatureRef.current);
      }
      redrawRef.current = true;
    });

    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // One animation loop for the lifetime of the page
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    const frame = (tMs: number) => {
      const t = tMs / 1000;
      const dt = clamp(t - (last || t), 0, DT_MAX);
      last = t;

      const sim = simRef.current;
      const still = reducedRef.current;
      if (sim && (!still || redrawRef.current)) {
        const tempC = temperatureRef.current;
        if (still) {
          for (let i = 0; i < SETTLE_STEPS; i++) step(sim, tempC, DT_MAX);
          redrawRef.current = false;
        } else {
          step(sim, tempC, dt);
        }

        ctx.clearRect(0, 0, sim.w, sim.h);
        ctx.fillStyle = colorRef.current;
        for (const p of sim.particles) {
          ctx.beginPath();
          ctx.arc(p.pos.x, p.pos.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Container
      backHref="/"
      header="States of Matter"
      description="Heat or cool the substance and watch how its particles move."
    >
      <Stage
        label="Particle model"
        className="w-full max-w-2xl mx-auto"
        header={
          <div className="flex items-start justify-between gap-4">
            <div
              data-testid="phase"
              className="flex flex-col items-start gap-1"
            >
              <span className="px-3 py-1 pixel-control bg-secondary-500 text-text-secondary font-pixel">
                {phaseLabel(temperature)}
              </span>
              {phaseHint(temperature) && (
                <span className="text-xs">{phaseHint(temperature)}</span>
              )}
            </div>
            <div data-testid="temperature" className="text-right leading-tight">
              <span className="block text-3xl font-bold">{temperature} °C</span>
              <span className="block text-sm text-white/70">
                {Math.round(temperature + KELVIN_OFFSET)} K
              </span>
            </div>
          </div>
        }
        footer={
          <Slider
            label="Temperature"
            value={temperature}
            onChange={setTemperature}
            min={TEMP_MIN_C}
            max={TEMP_MAX_C}
            rangeSteps={RANGE_STEPS}
            // cold to hot
            sliderThumb="bg-linear-to-r from-sky-400 via-amber-300 to-rose-500"
          />
        }
      >
        <div
          ref={wrapRef}
          className="h-64 sm:h-80 w-full pixel-control bg-primary-800 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={describeParticles(temperature)}
            className="block"
          />
        </div>
        {reducedMotion && (
          <p className="text-xs text-white/80">
            Reduced motion is on, so the particles hold still. The picture
            updates when you change the temperature.
          </p>
        )}
      </Stage>
    </Container>
  );
}
