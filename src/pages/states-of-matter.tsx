import { useEffect, useRef, useState } from 'react';
import Container from '~/components/container';
import Slider from '~/components/slider';
import { useTheme } from '~/styles/theme-provider';
import {
  BOIL_POINT_C,
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

const RANGE_STEPS = 7; // number of discrete labels on slider

// Rendering
const PHASE_LABEL_FONT = '12px Arial';
const PHASE_LABEL_POS = { x: 10, y: 18 };

function phaseLabel(tempC: number) {
  if (tempC < MELT_POINT_C) return 'Solid';
  if (tempC < BOIL_POINT_C) return 'Liquid';
  return 'Gas';
}

export default function StatesOfMatter() {
  const [temperature, setTemperature] = useState(0);
  const { themeName } = useTheme();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // read by the animation loop, so changing them doesn't restart it
  const temperatureRef = useRef(temperature);
  const colorRef = useRef('#000');
  const simRef = useRef<Simulation | null>(null);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

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
      if (sim) {
        const tempC = temperatureRef.current;
        step(sim, tempC, dt);

        ctx.clearRect(0, 0, sim.w, sim.h);
        ctx.fillStyle = colorRef.current;
        for (const p of sim.particles) {
          ctx.beginPath();
          ctx.arc(p.pos.x, p.pos.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = PHASE_LABEL_FONT;
        ctx.fillText(phaseLabel(tempC), PHASE_LABEL_POS.x, PHASE_LABEL_POS.y);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

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
