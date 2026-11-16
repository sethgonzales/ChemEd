import { useEffect, useMemo, useState } from 'react';
import { formatFormula } from '~/utils/lewis';
import {
  between,
  layout,
  regroup,
  type Molecule,
} from '~/utils/reaction-particles';
import { parseCompound, type Reaction } from '~/utils/reactions';
import { useMedia } from '~/utils/use-media';

const WIDTH = 400; // px, the drawing's own units
const HEIGHT = 240;
const DURATION = 2500; // ms for the atoms to regroup
const TICK = 30; // ms between frames

// one theme shade per element, so every theme works; dark text on light shades
const SHADES = [
  { fill: 'fill-secondary-500', text: 'fill-primary-900' },
  { fill: 'fill-secondary-200', text: 'fill-primary-900' },
  { fill: 'fill-secondary-800', text: 'fill-white' },
  { fill: 'fill-secondary-300', text: 'fill-primary-900' },
  { fill: 'fill-secondary-700', text: 'fill-white' },
  { fill: 'fill-secondary-100', text: 'fill-primary-900' },
];

/** "2 H₂ and 1 O₂" */
function describe(list: Molecule[]) {
  const counts = new Map<string, number>();
  for (const m of list) counts.set(m.formula, (counts.get(m.formula) ?? 0) + 1);
  const parts = [...counts].map(([f, n]) => `${n} ${formatFormula(f)}`);
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
    : parts[0];
}

interface Props {
  reaction: Reaction;
  coefficients: number[];
  reacted: boolean; // atoms in the products; false snaps back to reactants
  onDone?: () => void;
}

/** Atoms glide from the reactant molecules into the product molecules */
export default function ReactionParticles({
  reaction,
  coefficients,
  reacted,
  onDone,
}: Props) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [t, setT] = useState(0);
  const { before, after, atoms, from, to, elements, atomCount } =
    useMemo(() => {
      const groups = regroup(reaction, coefficients);
      const size = { width: WIDTH, height: HEIGHT };
      const from = layout(groups.before, size);
      const to = layout(groups.after, size);
      const elements = [...new Set(groups.atoms.map((a) => a.element))];
      // real atoms, counting each atom inside a polyatomic ion
      const atomCount = groups.atoms.reduce(
        (n, a) =>
          n +
          Object.values(parseCompound(a.element)).reduce((x, y) => x + y, 0),
        0,
      );
      return { ...groups, from, to, elements, atomCount };
    }, [reaction, coefficients]);

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

  useEffect(() => {
    if (t === 1) onDone?.();
  }, [t, onDone]);

  const label =
    t === 1
      ? `After the reaction: ${describe(after)}, ${atomCount} atoms`
      : t === 0
        ? `Before the reaction: ${describe(before)}, ${atomCount} atoms`
        : 'Reacting';

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-xl h-auto mx-auto rounded-md bg-primary-700"
    >
      {atoms.map((a, i) => {
        const start = from.positions[a.from.molecule][a.from.slot];
        const end = to.positions[a.to.molecule][a.to.slot];
        const p = between(start, end, t);
        // particles resize mid-flight if the products are drawn smaller
        const radius = start.r + (end.r - start.r) * t;
        // an ion gains or loses its charge halfway, as it changes partner
        const { charge } = (t < 0.5 ? before : after)[
          t < 0.5 ? a.from.molecule : a.to.molecule
        ].shape[t < 0.5 ? a.from.slot : a.to.slot];
        const text = formatFormula(a.element, charge ?? 0);
        // fit the label inside its circle
        const fontSize = Math.min(radius, (1.6 * radius) / (0.6 * text.length));
        const shade = SHADES[elements.indexOf(a.element) % SHADES.length];
        return (
          <g key={i} data-atom={a.element}>
            <circle
              cx={p.x}
              cy={p.y}
              r={radius}
              className={`${shade.fill} stroke-primary-800`}
              strokeWidth={1}
            />
            {fontSize >= 6 && (
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                className={shade.text}
              >
                {text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
