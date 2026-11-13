import { useEffect, useRef, useState } from 'react';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import { useGuide } from '~/components/guide';
import HeatingCurve from '~/components/heating-curve';
import Setting from '~/components/setting';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import { SUBSTANCES, type Substance } from '~/constants/substances';
import { useTheme } from '~/styles/theme-provider';
import {
  DT_MAX,
  clamp,
  createSimulation,
  phaseHint,
  phaseOf,
  resizeSimulation,
  step,
  temperatureRange,
  toModelTemp,
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
const describeParticles = (s: Substance, tempC: number) =>
  `${s.name}: ${phaseOf(s, tempC)} at ${tempC} °C: particles ${PARTICLES[phaseOf(s, tempC)]}`;

export default function StatesOfMatter() {
  const [substance, setSubstance] = useState(SUBSTANCES[0]);
  const [temperature, setTemperature] = useState(0);
  const [showCurve, setShowCurve] = useState(true);
  const { themeName } = useTheme();
  const { say } = useGuide();
  const range = temperatureRange(substance);

  // the thermometer keeps its reading, pulled into the new substance's range
  const chooseSubstance = (s: Substance) => {
    const { min, max } = temperatureRange(s);
    setSubstance(s);
    setTemperature((t) => clamp(t, min, max));
  };

  // Mr. G names a phase change once the slider settles in the new phase
  const phase = phaseOf(substance, temperature);
  const hint = phaseHint(substance, temperature);
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

  // read by the animation loop, so changing them doesn't restart it.
  // The physics runs on the water scale it was tuned on.
  const modelTemp = toModelTemp(substance, temperature);
  const temperatureRef = useRef(modelTemp);
  const colorRef = useRef('#000');
  const simRef = useRef<Simulation | null>(null);

  // reduced motion: no animation; redraw a settled picture when something changes
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const reducedRef = useRef(reducedMotion);
  const redrawRef = useRef(true);

  useEffect(() => {
    temperatureRef.current = modelTemp;
    redrawRef.current = true;
  }, [modelTemp]);

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
      className="gap-4"
    >
      <div className="w-full max-w-2xl mx-auto">
        <Dropdown
          label={`Substance: ${substance.name} (${substance.formula})`}
          className="w-full sm:w-64"
          menuClassName="w-64"
        >
          {SUBSTANCES.map((s) => (
            <DropdownItem
              key={s.id}
              selected={s.id === substance.id}
              onSelect={() => chooseSubstance(s)}
            >
              {s.name} ({s.formula})
            </DropdownItem>
          ))}
        </Dropdown>
      </div>
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
                {phase}
              </span>
              {hint && <span className="text-xs">{hint}</span>}
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
            min={range.min}
            max={range.max}
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
            aria-label={describeParticles(substance, temperature)}
            className="block"
          />
        </div>
        {reducedMotion && (
          <p className="text-xs text-white/80">
            Reduced motion is on, so the particles hold still. The picture
            updates when you change the temperature.
          </p>
        )}
        {showCurve && (
          <HeatingCurve substance={substance} temperature={temperature} />
        )}
      </Stage>
      <div className="w-full max-w-2xl mx-auto">
        <Setting checked={showCurve} onChange={setShowCurve}>
          Show heating curve
        </Setting>
      </div>
    </Container>
  );
}
