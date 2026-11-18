import { useEffect, useRef } from 'react';
import { useTheme } from '~/styles/theme-provider';
import { cn } from '~/utils/cn';
import {
  DT_MAX,
  clamp,
  createSimulation,
  resizeSimulation,
  step,
  type Simulation,
} from '~/utils/states-of-matter';
import { useMedia } from '~/utils/use-media';

// with reduced motion, steps run before each still picture, so it shows the phase settled
const SETTLE_STEPS = 120;

interface Props {
  modelTemp: number; // °C on the water scale the physics runs on (toModelTemp)
  label: string; // the picture in words, for screen readers
  className?: string; // its size; it fills the box
}

/** The States of Matter particles, animated at a temperature */
export default function ParticleBox({ modelTemp, label, className }: Props) {
  const { themeName } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // read by the animation loop, so changing them doesn't restart it
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
    if (!canvas || !wrap || typeof ResizeObserver === 'undefined') return;

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

  // One animation loop for the box's lifetime
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
    <div
      ref={wrapRef}
      className={cn('pixel-control bg-primary-800 overflow-hidden', className)}
    >
      <canvas ref={canvasRef} role="img" aria-label={label} className="block" />
    </div>
  );
}
