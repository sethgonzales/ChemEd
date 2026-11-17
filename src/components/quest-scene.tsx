import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import SceneDecor from '~/components/scene-decor';
import Stage from '~/components/stage';
import { backdropFor, type Backdrop } from '~/constants/quest-backdrops';
import { cn } from '~/utils/cn';
import {
  SHADES,
  TORCH,
  WALL_HEIGHT,
  WALL_WIDTH,
  stoneWall,
  wallScale,
  type Stone,
} from '~/utils/stone-wall';

interface Props {
  label: string; // names the chamber for screen readers
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  backdrop?: string; // the chamber whose scenery to use; the plain dungeon without
}

const WALL_SEED = 11; // one wall for every chamber, so it never shifts
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
function StoneWall({ look }: { look: Backdrop }) {
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
      <rect width={WALL_WIDTH} height={WALL_HEIGHT} fill={look.mortar} />
      {stones.map((s, i) => (
        <g key={i}>
          <rect
            data-stone
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill={look.stones[s.shade % SHADES]}
          />
          {/* a lighter top edge, as if lit from above */}
          <rect x={s.x} y={s.y} width={s.w} height={1} fill={look.edge} />
          {s.moss > 0 && (
            <g data-moss fill={look.growth[i % look.growth.length]}>
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
// sizes in wall units, drawn at the wall's scale (--u: px per unit), so a
// torch keeps its size beside the stones on any screen
const u = (n: number) => `calc(var(--u, 4px) * ${n})`;

// A torch on the wall: a flickering flame with its glow, on a handle
function Torch({
  side,
  low = false,
  flame,
}: {
  side: 'left' | 'right';
  low?: boolean; // halfway down the wall, where there's room (not on phones)
  flame: Backdrop['flame'];
}) {
  return (
    <div
      data-decor="torch"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute flex flex-col items-center',
        low && 'hidden sm:flex',
      )}
      style={{ top: low ? '50%' : u(TORCH.inset), [side]: u(TORCH.inset) }}
    >
      <div
        className="quest-flame rounded-t-full"
        style={{
          width: u(TORCH.flame.w),
          height: u(TORCH.flame.h),
          background: `radial-gradient(circle at 50% 70%, ${flame.core}, ${flame.outer} 60%, transparent 75%)`,
          boxShadow: `0 0 ${u(12)} ${u(5)} rgb(${flame.glow} / 0.25)`,
        }}
      />
      <div
        className="bg-stone-600"
        style={{ width: u(TORCH.handle.w), height: u(TORCH.handle.h) }}
      />
    </div>
  );
}

/** The torches, measuring the scene so they match its stones */
function Torches({ flame }: { flame: Backdrop['flame'] }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = layer.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      el.style.setProperty('--u', `${wallScale(width, height)}px`);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={layer} className="pointer-events-none absolute inset-0">
      <Torch side="left" flame={flame} />
      <Torch side="right" flame={flame} />
      <Torch side="left" low flame={flame} />
      <Torch side="right" low flame={flame} />
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
      data-panel
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
  backdrop,
}: Props) {
  const look = backdropFor(backdrop);
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
      // the pixel font, which follows the app's stylized-text setting
      className={cn('relative overflow-hidden font-pixel', className)}
    >
      <StoneWall look={look} />
      {look.decor && <SceneDecor decor={look.decor} />}
      {/* darkness at the edges, and the torches' light in the middle */}
      <div
        data-decor
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, rgb(${look.light} / 0.14), transparent 55%), radial-gradient(ellipse at 50% 50%, transparent 40%, rgb(0 0 0 / 0.65))`,
        }}
      />
      <Torches flame={look.flame} />
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
