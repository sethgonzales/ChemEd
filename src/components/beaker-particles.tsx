import { useEffect, useMemo, useState } from 'react';
import { SHADES } from '~/components/reaction-particles';
import { BEAKER_BOX, type BeakerParticle, type Spot } from '~/utils/beaker';
import { formatFormula } from '~/utils/lewis';
import { between } from '~/utils/reaction-particles';
import { useMedia } from '~/utils/use-media';

const DURATION = 2500; // ms for the particles to move
const TICK = 30; // ms between frames
const SPECTATOR_OPACITY = 0.45; // spectators fade back once the rest has moved
const { width: W, height: H, radius: R, surface, floor } = BEAKER_BOX;

/** "Mg (solid), Al³⁺ and 6 NO₃⁻" */
function describe(spots: Spot[]) {
  const counts = new Map<string, number>();
  for (const s of spots.filter((s) => !s.hidden)) {
    const where = s.y >= floor ? ' (solid)' : s.y < surface ? ' (gas)' : '';
    const name = formatFormula(s.label, s.charge) + where;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const parts = [...counts].map(([n, k]) => (k > 1 ? `${k} ${n}` : n));
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
    : parts[0];
}

interface Props {
  particles: BeakerParticle[];
  reacted: boolean; // move to the products; false shows the reactants
}

/** The beaker's particles, gliding from reactants to products */
export default function BeakerParticles({ particles, reacted }: Props) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!reacted) return setT(0);
    if (reducedMotion) return setT(1);
    const start = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(1, (Date.now() - start) / DURATION);
      setT(next);
      if (next === 1) clearInterval(timer);
    }, TICK);
    return () => clearInterval(timer);
  }, [reacted, reducedMotion]);

  const elements = useMemo(
    () => [...new Set(particles.map((p) => p.before.label))],
    [particles],
  );
  const label =
    t === 1
      ? `The beaker after: ${describe(particles.map((p) => p.after))} in water`
      : t === 0
        ? `The beaker before: ${describe(particles.map((p) => p.before))} in water`
        : 'The beaker, reacting';

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-2 0 ${W + 4} ${H + 2}`}
      className="w-full max-w-md h-auto mx-auto"
    >
      <rect
        x={0}
        y={surface}
        width={W}
        height={H - surface}
        className="fill-sky-200/20"
      />
      <path
        d={`M0 2 V${H} H${W} V2`}
        fill="none"
        strokeWidth={1}
        className="stroke-white/70"
      />
      {particles.map((p, i) => {
        const at = between(p.before, p.after, t);
        // a particle takes its new name (and charge) halfway along
        const spot = t < 0.5 ? p.before : p.after;
        const text = formatFormula(spot.label, spot.charge);
        const opacity = p.after.hidden
          ? 1 - t
          : p.spectator
            ? 1 - (1 - SPECTATOR_OPACITY) * t
            : 1;
        const shade = SHADES[elements.indexOf(p.before.label) % SHADES.length];
        const fontSize = Math.min(R, (1.7 * R) / (0.6 * text.length));
        return (
          <g
            key={i}
            opacity={opacity}
            data-spectator={p.spectator || undefined}
          >
            <circle
              cx={at.x}
              cy={at.y}
              r={R}
              strokeWidth={0.3}
              className={`${shade.fill} stroke-primary-800`}
            />
            <text
              x={at.x}
              y={at.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              className={shade.text}
            >
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
