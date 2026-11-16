import { useEffect, useRef, useState } from 'react';
import { coupleFor, halfEquations, type Side } from '~/utils/electrochemistry';
import {
  createLens,
  stepLens,
  type Lens,
  type LensParticle,
  type LensSpot,
  LATTICE,
  metalEdge,
} from '~/utils/electrochemistry-lens';
import { useMedia } from '~/utils/use-media';

const SIZE = 200; // SVG units across
const TICK_MS = 33; // ~30 frames a second
const RADIUS = { atom: 9, cation: 8, anion: 6, electron: 3 };

interface Props {
  spot: LensSpot;
  metal: string; // the electrode's metal (unused for the salt bridge)
  concentration: number; // M of its ions
  current: number; // A through the cell, 0 when open
  cathodeSide: Side;
  wear: number; // 0 to 1, how far the cell has worn this electrode
}

const lower = (s: string) => s.toLowerCase();
const otherSide = (s: Side): Side => (s === 'left' ? 'right' : 'left');

function describe({ spot, metal, current, cathodeSide }: Props) {
  if (spot === 'bridge') {
    const head = 'Close-up of the KNO₃ salt bridge:';
    if (!current)
      return `${head} no current, so the K⁺ and NO₃⁻ ions just jiggle about.`;
    return `${head} K⁺ ions drift ${cathodeSide}, towards the cathode, and NO₃⁻ ions drift ${otherSide(cathodeSide)}, towards the anode, keeping both beakers neutral.`;
  }
  const c = coupleFor(metal);
  const name = lower(c.metal);
  const electrons = `${c.charge} electron${c.charge === 1 ? '' : 's'} each`;
  if (!current)
    return `Close-up of the ${name} electrode: no current, so nothing reacts; ${c.ion} and NO₃⁻ ions jiggle about in the solution.`;
  return spot === 'anode'
    ? `Close-up of the ${name} anode: ${name} atoms lose ${electrons} and leave the metal as ${c.ion} ions; the electrons flow away through the metal into the wire.`
    : `Close-up of the ${name} cathode: ${c.ion} ions gain ${electrons}, arriving through the wire, and join the metal as ${name} atoms.`;
}

/** A round close-up of one spot in the cell, with its particles moving */
export default function CellLens(props: Props) {
  const { spot, metal, concentration, current, cathodeSide, wear } = props;
  const [lens, setLens] = useState<Lens>(() =>
    createLens(spot, { metal, concentration, cathodeSide, wear }),
  );
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  // read by the timer, so the cell's every tick doesn't restart it
  const input = useRef({ current, concentration, wear });
  input.current = { current, concentration, wear };

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(
      () =>
        setLens((l) => stepLens(l, { dt: TICK_MS / 1000, ...input.current })),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [reducedMotion]);

  // reduced motion: no animation; redraw the electrode settled at its wear
  const settled = Math.round(wear * 100);
  useEffect(() => {
    if (!reducedMotion) return;
    const { concentration, wear } = input.current;
    setLens(createLens(spot, { metal, concentration, cathodeSide, wear }));
  }, [reducedMotion, settled, spot, metal, cathodeSide]);

  // the half-equation, so the electrons can be counted against the charge
  const equation =
    spot === 'bridge'
      ? null
      : halfEquations(metal)[spot === 'anode' ? 'oxidation' : 'reduction'];

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="size-56 max-w-full overflow-hidden rounded-full border-2 border-white/80 bg-primary-800 shadow-lg">
        <svg
          role="img"
          aria-label={describe(props)}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-full"
        >
          {spot === 'bridge' ? (
            <rect width={SIZE} height={SIZE} className="fill-white/10" />
          ) : (
            <>
              <rect width={SIZE} height={SIZE} className="fill-sky-200/10" />
              {/* each atom brings its own patch of metal, so the electrode
                  changes an atom at a time */}
              {lens.particles
                .filter((p) => p.kind === 'atom')
                .map((p) => (
                  <rect
                    key={p.id}
                    x={(p.x - LATTICE.column / 2) * SIZE}
                    y={(p.y - LATTICE.row / 2) * SIZE}
                    width={LATTICE.column * SIZE}
                    height={LATTICE.row * SIZE}
                    className="fill-white/15"
                  />
                ))}
            </>
          )}
          {lens.particles.map((p) => (
            <Particle key={p.id} p={p} />
          ))}
          {reducedMotion && current > 0 && (
            <FlowArrows {...props} edge={metalEdge(lens)} />
          )}
        </svg>
      </div>
      {equation && <figcaption className="text-sm">{equation}</figcaption>}
    </figure>
  );
}

function Particle({ p }: { p: LensParticle }) {
  const [x, y] = [p.x * SIZE, p.y * SIZE];
  const r = RADIUS[p.kind];
  if (p.kind === 'electron')
    return <circle cx={x} cy={y} r={r} className="fill-secondary-500" />;
  // matter in the accent colour; anions hollow so the two charges read apart
  const filled = p.kind !== 'anion';
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        strokeWidth={1.5}
        className={
          p.kind === 'atom'
            ? 'fill-gray-300 stroke-gray-400'
            : filled
              ? 'fill-secondary-500 stroke-secondary-500'
              : 'fill-primary-800 stroke-secondary-500'
        }
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        aria-hidden="true"
        className={
          p.kind === 'atom'
            ? 'fill-gray-900 text-[7px]'
            : filled
              ? 'fill-text-secondary text-[7px]'
              : 'fill-white text-[6px]'
        }
      >
        {p.label}
      </text>
    </g>
  );
}

// with reduced motion the particles stand still, so arrows show the flow
function FlowArrows({ spot, cathodeSide, edge }: Props & { edge: number }) {
  const arrow = (x1: number, x2: number, y: number, label: string) => {
    const tip = x2 > x1 ? -6 : 6;
    return (
      <g className="stroke-white" strokeWidth={2} fill="none">
        <path
          d={`M${x1} ${y} H${x2} M${x2 + tip} ${y - 5} L${x2} ${y} L${x2 + tip} ${y + 5}`}
        />
        <text
          x={(x1 + x2) / 2}
          y={y - 6}
          textAnchor="middle"
          stroke="none"
          className="fill-white text-[10px]"
        >
          {label}
        </text>
      </g>
    );
  };
  const metalX = edge * SIZE;
  if (spot === 'bridge') {
    const right = cathodeSide === 'right';
    return (
      <>
        {arrow(right ? 50 : 150, right ? 150 : 50, 30, 'K⁺')}
        {arrow(right ? 150 : 50, right ? 50 : 150, 175, 'NO₃⁻')}
      </>
    );
  }
  return spot === 'anode' ? (
    <>
      {arrow(metalX - 10, metalX + 50, 20, 'ions')}
      {arrow(metalX - 10, 10, 185, 'e⁻')}
    </>
  ) : (
    <>
      {arrow(metalX + 50, metalX + 4, 20, 'ions')}
      {arrow(10, metalX - 10, 185, 'e⁻')}
    </>
  );
}
