import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  useState,
  type RefObject,
} from 'react';
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
  space?: boolean; // floating in a starry void instead, as the map does
  room?: boolean; // a room in perspective, with a floor for a boss to stand on
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
// A wall torch in 8-bit pixels, one pixel to a wall unit: three frames of
// flame (O outer, Y middle, C core) over an iron cup and bracket (I, i) and a
// wooden handle (H, h)
const FLAMES = [
  [
    '....O....',
    '...OO....',
    '...OYO...',
    '..OYYO...',
    '..OYCYO..',
    '.OYCCYO..',
    '.OYCCCYO.',
    '.OYCCCYO.',
    '..OYYYO..',
  ],
  [
    '....O....',
    '....OO...',
    '...OYO...',
    '...OYYO..',
    '..OYCYO..',
    '..OYCCYO.',
    '.OYCCCYO.',
    '.OYCCCYO.',
    '..OYYYO..',
  ],
  [
    '.........',
    '....O....',
    '...OYO...',
    '..OYYO...',
    '..OYCYO..',
    '.OYCCYO..',
    '.OYCCCYO.',
    '.OYCCCYO.',
    '..OYYYO..',
  ],
];
const STICK = [
  '.IIIIIII.',
  '..iIIIi..',
  '...HHh...',
  '...HHh...',
  '..IIIII..',
  '.iIHHhIi.',
  '...HHh...',
  '...HHh...',
  '...hHh...',
  '....h....',
];
const IRON = { I: '#57534e', i: '#292524', H: '#92400e', h: '#5b2a0b' };

// the art's pixels as rectangles, a run of one colour to each
function pixels(rows: string[], palette: Record<string, string>, top = 0) {
  return rows.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === '.'
        ? []
        : [
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y + top}
              width={1.02} // a hair over, so no seams show between pixels
              height={1.02}
              fill={palette[c]}
            />,
          ],
    ),
  );
}

function Torch({
  side,
  flame,
}: {
  side: 'left' | 'right';
  flame: Backdrop['flame'];
}) {
  const fire = { O: flame.outer, Y: flame.core, C: '#ffffff' };
  const w = FLAMES[0][0].length;
  const h = FLAMES[0].length + STICK.length;
  return (
    <div
      data-decor="torch"
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ top: u(TORCH.inset), [side]: u(TORCH.inset) }}
    >
      {/* the light it casts on the wall around it */}
      <div
        className="quest-flame absolute rounded-full"
        style={{
          left: u(w / 2 - 12),
          top: u(-8),
          width: u(24),
          height: u(24),
          background: `radial-gradient(circle, rgb(${flame.glow} / 0.35), transparent 65%)`,
        }}
      />
      <svg
        viewBox={`0 0 ${w} ${h}`}
        shapeRendering="crispEdges"
        className="relative block"
        style={{ width: u(w), height: u(h) }}
      >
        {FLAMES.map((rows, i) => (
          <g
            key={i}
            data-frame={i}
            className="quest-frame"
            // each frame shows in its turn
            style={{ animationDelay: `${-i * 0.2}s`, opacity: i ? 0 : 1 }}
          >
            {pixels(rows, fire)}
          </g>
        ))}
        {pixels(STICK, IRON, FLAMES[0].length)}
      </svg>
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
    </div>
  );
}

// The room's floor: flagstones laid in staggered courses, drawn in
// perspective from where it meets the wall (the scene's FloorLine, or
// HORIZON % down it) to the front edge, narrowing toward the back
const HORIZON = 54; // % down the scene, until a FloorLine is measured
const COURSES = 9; // courses of flagstones, back to front
const SLABS = 7; // slabs across a course, give or take the stagger
const SPREAD = 1.9; // the front edge's width over the back edge's
const DEPTH = 1.6; // how much deeper the front courses look than the back
const MORTAR = 0.06; // of a slab, the gap around it

// a point on the floor, from u across (0 to 1) and v from back (0) to front (1)
function onFloor(u: number, v: number) {
  const width = 100 * (1 + (SPREAD - 1) * v);
  return {
    x: 50 + (u - 0.5) * width,
    y: 100 * v ** DEPTH,
  };
}
const quad = (u0: number, u1: number, v0: number, v1: number) =>
  [onFloor(u0, v0), onFloor(u1, v0), onFloor(u1, v1), onFloor(u0, v1)]
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

/** Marks where a room's floor meets the wall: where the boss stands */
export const FloorLine = () => <div data-floor-line aria-hidden="true" />;

/**
 * Where the scene's FloorLine sits, in px down from the top of the layer
 * behind its contents, kept up to date as the scene resizes
 */
function useFloorLine(front: RefObject<HTMLDivElement | null>, on: boolean) {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const layer = front.current;
    const mark = layer?.querySelector('[data-floor-line]');
    const box = layer?.parentElement;
    if (!on || !layer || !mark || !box) return;
    const measure = () =>
      setTop(
        Math.round(
          mark.getBoundingClientRect().top - box.getBoundingClientRect().top,
        ),
      );
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(layer);
    return () => watch.disconnect();
  }, [front, on]);
  return top;
}

/** A dungeon's flagstone floor, under the wall behind */
function Floor({ look, top }: { look: Backdrop; top: number | null }) {
  const slabs = Array.from({ length: COURSES }, (_, row) => {
    const v0 = row / COURSES;
    const v1 = (row + 1) / COURSES;
    // each course shifted by its own amount, so the joints never line up
    const shift = (0.25 + hash(row + 70) * 0.5) / SLABS;
    const joints = [0];
    for (
      let u = shift;
      u < 1;
      u += (0.8 + hash(row * 13 + u * 97) * 0.4) / SLABS
    )
      joints.push(u);
    joints.push(1);
    return joints.slice(0, -1).map((u0, k) => {
      const u1 = joints[k + 1];
      const gapU = (MORTAR * (u1 - u0)) / 2;
      const gapV = (MORTAR * (v1 - v0)) / 2;
      const n = row * 31 + k;
      return {
        row,
        u0,
        shade: look.stones[Math.floor(hash(n + 400) * look.stones.length)],
        body: quad(u0 + gapU, u1 - gapU, v0 + gapV, v1 - gapV),
        // its worn, lit front edge
        lip: quad(
          u0 + gapU,
          u1 - gapU,
          v1 - gapV - (v1 - v0) * 0.12,
          v1 - gapV,
        ),
        crack: hash(n + 900) > 0.86,
        moss: hash(n + 600) > 0.8,
        mid: onFloor((u0 + u1) / 2, (v0 + v1) / 2),
        back: onFloor(u0 + (u1 - u0) * 0.3, v0 + gapV),
        front: onFloor(u0 + (u1 - u0) * 0.6, v1 - gapV),
        corner: onFloor(u0 + gapU, v1 - gapV),
        width: onFloor(u1, v1).x - onFloor(u0, v1).x,
      };
    });
  });

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
      style={{
        top: top === null ? `${HORIZON}%` : top,
        height: top === null ? `${100 - HORIZON}%` : `calc(100% - ${top}px)`,
      }}
    >
      <g data-room="floor">
        {/* the mortar, showing between the stones */}
        <polygon points={quad(0, 1, 0, 1)} fill={look.mortar} />
        {slabs.flat().map((s, i) => (
          <g key={i}>
            <polygon
              data-flagstone
              data-course={s.row}
              data-u={s.u0}
              points={s.body}
              fill={s.shade}
            />
            <polygon points={s.lip} fill={look.edge} fillOpacity={0.35} />
            {s.crack && (
              <polyline
                points={`${s.back.x},${s.back.y} ${s.mid.x + 1},${s.mid.y} ${s.front.x},${s.front.y}`}
                fill="none"
                stroke={look.mortar}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {s.moss && (
              <ellipse
                cx={s.corner.x + s.width * 0.12}
                cy={s.corner.y - 0.3}
                rx={s.width * 0.14}
                ry={0.8 + s.corner.y * 0.03}
                fill={look.growth[i % look.growth.length]}
                fillOpacity={0.8}
              />
            )}
          </g>
        ))}
        {/* dark at the back, where it meets the wall, and a shadow line there */}
        <polygon points={quad(0, 1, 0, 0.45)} fill="#000" fillOpacity={0.35} />
        <polygon points={quad(0, 1, 0, 0.08)} fill="#000" fillOpacity={0.45} />
      </g>
    </svg>
  );
}

const STARS = 140;
const SKY = 200; // units square, sliced to fill the scene

/** A starry void, with a faint nebula, for the map to float in */
function Starfield() {
  return (
    <div
      data-decor="stars"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse at 25% 30%, rgb(124 58 237 / 0.22), transparent 45%), radial-gradient(ellipse at 75% 70%, rgb(14 165 233 / 0.16), transparent 50%), #05060f',
      }}
    >
      <svg
        viewBox={`0 0 ${SKY} ${SKY}`}
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        className="h-full w-full"
      >
        {Array.from({ length: STARS }, (_, i) => {
          const size = hash(i + 500) > 0.9 ? 1.2 : 0.6;
          return (
            <rect
              key={i}
              x={hash(i) * SKY}
              y={hash(i + 1000) * SKY}
              width={size}
              height={size}
              fill={hash(i + 2000) > 0.8 ? '#fde68a' : '#e2e8f0'}
              opacity={0.4 + hash(i + 3000) * 0.6}
              // some twinkle, each in its own time
              className={i % 5 ? undefined : 'quest-twinkle'}
              style={{ animationDelay: `${hash(i + 4000) * 3}s` }}
            />
          );
        })}
      </svg>
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
  space = false,
  room = false,
}: Props) {
  const look = backdropFor(backdrop);
  const front = useRef<HTMLDivElement>(null);
  const horizon = useFloorLine(front, room);
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
      {space ? (
        <Starfield />
      ) : (
        <>
          <StoneWall look={look} />
          {look.decor && <SceneDecor decor={look.decor} />}
          {room && <Floor look={look} top={horizon} />}
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
        </>
      )}
      <div ref={front} data-layer="front" className="relative">
        {children}
      </div>
    </Stage>
  );
}
