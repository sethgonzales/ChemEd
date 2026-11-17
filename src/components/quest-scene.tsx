import { useMemo, type ReactNode } from 'react';
import Stage from '~/components/stage';
import { cn } from '~/utils/cn';
import {
  SHADES,
  WALL_HEIGHT,
  WALL_WIDTH,
  stoneWall,
  type Stone,
} from '~/utils/stone-wall';

interface Props {
  label: string; // names the chamber for screen readers
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const WALL_SEED = 11; // one wall for every chamber, so it never shifts
// dark stone, lit from the torches by the lamplight on top
const STONE_COLOURS = ['#2b2623', '#332d29', '#26221f', '#3a332e'];
const MORTAR_COLOUR = '#0f0d0c';
const MOSS_COLOURS = ['#365314', '#3f6212'];
const MOSS_CLUMP = 2; // wall units wide
const MORTAR_REACH = 1; // wall units it creeps down over the mortar

// A steady pseudo-random number, so the moss doesn't change between renders
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Ragged clumps of moss along a stone's damp lower edge: [x, height] */
function mossClumps(s: Stone, i: number): [number, number][] {
  const out: [number, number][] = [];
  const reach = s.w * s.moss; // how far along the stone it has spread
  for (let x = 0; x + MOSS_CLUMP <= reach; x += MOSS_CLUMP) {
    const h = Math.round(1 + hash(i * 97 + x) * s.h * s.moss * 0.6);
    out.push([s.x + x, h]);
  }
  return out;
}

/** The back wall: staggered stones with moss creeping up from the floor */
function StoneWall() {
  const { stones } = useMemo(() => stoneWall(WALL_SEED), []);
  return (
    <svg
      data-decor="wall"
      aria-hidden="true"
      viewBox={`0 0 ${WALL_WIDTH} ${WALL_HEIGHT}`}
      preserveAspectRatio="xMidYMax slice" // stood on the floor, where the moss is
      shapeRendering="crispEdges"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <rect width={WALL_WIDTH} height={WALL_HEIGHT} fill={MORTAR_COLOUR} />
      {stones.map((s, i) => (
        <g key={i}>
          <rect
            data-stone
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill={STONE_COLOURS[s.shade % SHADES]}
          />
          {/* a lighter top edge, as if lit from above */}
          <rect x={s.x} y={s.y} width={s.w} height={1} fill="#4a423c" />
          {s.moss > 0 && (
            <g data-moss fill={MOSS_COLOURS[i % MOSS_COLOURS.length]}>
              {mossClumps(s, i).map(([x, h], k) => (
                <rect
                  key={k}
                  x={x}
                  y={s.y + s.h - h}
                  width={MOSS_CLUMP}
                  height={h + MORTAR_REACH}
                />
              ))}
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

// A torch on the wall: a bracket and a flickering flame with its glow
function Torch({ className }: { className: string }) {
  return (
    <div
      data-decor="torch"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute flex flex-col items-center',
        className,
      )}
    >
      <div className="quest-flame h-4 w-3 rounded-t-full bg-[radial-gradient(circle_at_50%_70%,#fde68a,#f97316_60%,transparent_75%)] shadow-[0_0_48px_22px_rgb(251_146_60/0.25)]" />
      <div className="h-3 w-1 bg-stone-600" />
    </div>
  );
}

/** A dark panel standing in front of the wall, holding the scene's words */
export function ScenePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-sm border-2 border-stone-700 bg-stone-950/85 p-4 text-stone-100 shadow-[0_6px_24px_rgb(0_0_0/0.7)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A dark dungeon chamber: the Stage, nearly black in every theme, with a
 * mossy stone wall lit by torches and a warm pool of lamplight, and fog along
 * the floor
 */
export default function QuestScene({
  label,
  children,
  footer,
  className,
}: Props) {
  return (
    <Stage
      label={label}
      dark
      // positioned, so it paints in front of the wall rather than under it
      footer={
        footer && (
          <div data-layer="front" className="relative">
            {footer}
          </div>
        )
      }
      className={cn('relative overflow-hidden', className)}
    >
      <StoneWall />
      {/* darkness at the edges, and warm light in the middle */}
      <div
        data-decor
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgb(255_196_110/0.14),transparent_55%),radial-gradient(ellipse_at_50%_50%,transparent_40%,rgb(0_0_0/0.65))]"
      />
      <Torch className="top-6 left-5" />
      <Torch className="top-6 right-5" />
      {/* two more down the walls, where there's room for them */}
      <Torch className="top-1/2 left-5 hidden sm:flex" />
      <Torch className="top-1/2 right-5 hidden sm:flex" />
      <div
        data-decor
        aria-hidden="true"
        className="quest-fog pointer-events-none absolute inset-x-[-40%] bottom-0 h-1/4 bg-[radial-gradient(ellipse_at_30%_100%,rgb(148_163_184/0.18),transparent_60%),radial-gradient(ellipse_at_75%_100%,rgb(148_163_184/0.14),transparent_55%)]"
      />
      <div data-layer="front" className="relative">
        {children}
      </div>
    </Stage>
  );
}
