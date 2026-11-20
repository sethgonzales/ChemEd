import type { ReactNode } from 'react';
import type { Decor } from '~/constants/quest-backdrops';

// The decoration over each chamber's wall. Drawn across the scene's width
// (480 units), hung from the top or stood on the floor, so it keeps its shape
// on a phone and on a wide screen alike.

const W = 480; // units across

// A steady pseudo-random number, so nothing shifts between renders
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Layer({
  decor,
  at,
  height,
  children,
}: {
  decor: string;
  at: 'top' | 'bottom';
  height: number;
  children: ReactNode;
}) {
  return (
    <svg
      data-decor={decor}
      aria-hidden="true"
      viewBox={`0 0 ${W} ${height}`}
      className={`pointer-events-none absolute inset-x-0 w-full h-auto ${at === 'top' ? 'top-0' : 'bottom-0'}`}
    >
      {children}
    </svg>
  );
}

// the Wyrm: icicles of every length along the ceiling
const icicles = (
  <Layer decor="icicles" at="top" height={60}>
    {range(40).map((i) => {
      const x = i * 12 + hash(i) * 4;
      const len = 8 + hash(i + 40) * 44;
      return (
        <g key={i}>
          <polygon
            points={`${x},0 ${x + 7},0 ${x + 3},${len}`}
            fill="#bae6fd"
          />
          <polygon
            points={`${x},0 ${x + 3},0 ${x + 3},${len}`}
            fill="#e0f2fe"
          />
        </g>
      );
    })}
    <rect width={W} height={3} fill="#e0f2fe" />
  </Layer>
);

// the Weaver: webs strung across both top corners
function web(flip: boolean) {
  const R = 110;
  const angles = range(6).map((k) => (k / 5) * (Math.PI / 2));
  const at = (a: number, r: number) => `${Math.cos(a) * r},${Math.sin(a) * r}`;
  return (
    <g transform={flip ? `translate(${W} 0) scale(-1 1)` : undefined}>
      {angles.map((a, k) => (
        <polyline key={k} points={`0,0 ${at(a, R)}`} />
      ))}
      {[30, 55, 80, 105].map((r) => (
        // each ring sags between its threads
        <polyline
          key={r}
          points={angles
            .flatMap((a, k) =>
              k
                ? [at((a + angles[k - 1]) / 2, r * 0.88), at(a, r)]
                : [at(a, r)],
            )
            .join(' ')}
        />
      ))}
    </g>
  );
}
const cobwebs = (
  <Layer decor="cobwebs" at="top" height={120}>
    <g fill="none" stroke="#d1d5db" strokeOpacity={0.45} strokeWidth={0.8}>
      {web(false)}
      {web(true)}
      {/* a thread dropped from the ceiling, its spinner at the end */}
      <line x1={330} y1={0} x2={330} y2={70} />
    </g>
    <ellipse cx={330} cy={74} rx={4} ry={5} fill="#111827" />
    <g stroke="#111827" strokeWidth={1}>
      {[-1, 1].flatMap((side) =>
        [70, 74, 78].map((y) => (
          <line
            key={`${side}${y}`}
            x1={330}
            y1={y}
            x2={330 + side * 8}
            y2={y + 3}
          />
        )),
      )}
    </g>
  </Layer>
);

// the Lich: chains hanging in the crypt
function chain(x: number, links: number) {
  return range(links).map((k) =>
    k % 2 ? (
      <rect key={k} x={x - 1} y={k * 7} width={3} height={9} />
    ) : (
      <rect key={k} x={x - 3} y={k * 7} width={7} height={9} rx={3} />
    ),
  );
}
const chains = (
  <Layer decor="chains" at="top" height={130}>
    <g fill="none" stroke="#6b7280" strokeWidth={1.5}>
      {chain(70, 12)}
      {chain(250, 8)}
      {chain(410, 16)}
    </g>
  </Layer>
);

// the Sphinx: a painted band of glyphs
function glyph(kind: number, x: number) {
  const y = 22;
  switch (kind % 4) {
    case 0: // an eye
      return (
        <g key={x}>
          <ellipse
            cx={x}
            cy={y}
            rx={9}
            ry={4}
            fill="none"
            stroke="#1e3a5f"
            strokeWidth={1.5}
          />
          <circle cx={x} cy={y} r={2.5} fill="#1e3a5f" />
        </g>
      );
    case 1: // an ankh
      return (
        <g key={x} fill="none" stroke="#7c2d12" strokeWidth={2}>
          <ellipse cx={x} cy={y - 7} rx={3} ry={4} />
          <line x1={x - 6} y1={y - 2} x2={x + 6} y2={y - 2} />
          <line x1={x} y1={y - 3} x2={x} y2={y + 10} />
        </g>
      );
    case 2: // water
      return (
        <polyline
          key={x}
          points={range(7)
            .map((k) => `${x - 9 + k * 3},${y + (k % 2 ? -3 : 3)}`)
            .join(' ')}
          fill="none"
          stroke="#0f766e"
          strokeWidth={1.5}
        />
      );
    default: // a bird
      return (
        <g key={x} fill="#1e3a5f">
          <ellipse cx={x} cy={y} rx={5} ry={4} />
          <circle cx={x + 5} cy={y - 5} r={2.5} />
          <rect x={x - 3} y={y + 3} width={2} height={7} />
        </g>
      );
  }
}
const glyphs = (
  <Layer decor="glyphs" at="top" height={50}>
    <rect y={6} width={W} height={34} fill="#c19a62" />
    <rect y={6} width={W} height={3} fill="#7c2d12" />
    <rect y={37} width={W} height={3} fill="#7c2d12" />
    {range(16).map((i) => glyph(i, 16 + i * 30))}
  </Layer>
);

// the Golem: the wall split by its blows, rubble at its foot
const cracks = (
  <>
    <Layer decor="cracks" at="top" height={160}>
      <g fill="none" stroke="#0f0d0c" strokeWidth={2}>
        <polyline points="60,0 72,30 64,52 80,90 74,120" />
        <polyline points="72,30 92,44" />
        <polyline points="400,0 388,24 402,60 390,96" />
        <polyline points="402,60 426,74 434,100" />
        <polyline points="240,0 246,18 236,34" />
      </g>
    </Layer>
    <Layer decor="rubble" at="bottom" height={30}>
      {range(22).map((i) => {
        const x = i * 22 + hash(i) * 10;
        const r = 4 + hash(i + 9) * 7;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={30 - r * 0.6}
            rx={r}
            ry={r * 0.7}
            fill={i % 2 ? '#3a3836' : '#4d4945'}
          />
        );
      })}
    </Layer>
  </>
);

// the Slime: ooze along the ceiling, dripping down
const drips = (
  <Layer decor="drips" at="top" height={90}>
    <g fill="#84cc16" fillOpacity={0.85}>
      <rect width={W} height={6} />
      {range(18).map((i) => {
        const x = 10 + i * 27 + hash(i) * 8;
        const len = 6 + hash(i + 3) * 60;
        return (
          <g key={i}>
            <rect x={x} y={0} width={4} height={len} />
            <circle cx={x + 2} cy={len + 2} r={4} />
          </g>
        );
      })}
    </g>
  </Layer>
);

// the Hydra: dark water and reeds along the floor
const reeds = (
  <Layer decor="reeds" at="bottom" height={70}>
    <rect y={52} width={W} height={18} fill="#134e4a" fillOpacity={0.9} />
    <g stroke="#2dd4bf" strokeOpacity={0.4} strokeWidth={1}>
      {range(10).map((i) => (
        <line
          key={i}
          x1={i * 50 + 10}
          y1={60 + (i % 3) * 3}
          x2={i * 50 + 34}
          y2={60 + (i % 3) * 3}
        />
      ))}
    </g>
    {range(14).map((i) => {
      const x = 8 + i * 35 + hash(i) * 14;
      const top = 8 + hash(i + 5) * 26;
      return (
        <g key={i}>
          <line
            x1={x}
            y1={top}
            x2={x}
            y2={58}
            stroke="#4d7c0f"
            strokeWidth={1.5}
          />
          <rect x={x - 2} y={top} width={4} height={9} rx={2} fill="#78350f" />
        </g>
      );
    })}
  </Layer>
);

// the Wraith: a copper pipe along the ceiling, cables sagging, sparks
const wires = (
  <Layer decor="wires" at="top" height={80}>
    <rect y={6} width={W} height={7} fill="#b87333" />
    <rect y={6} width={W} height={2} fill="#e0a370" />
    {range(6).map((i) => (
      <rect
        key={i}
        x={i * 90 + 20}
        y={4}
        width={8}
        height={11}
        fill="#8a5528"
      />
    ))}
    <g fill="none" stroke="#0b0d12" strokeWidth={2}>
      <path d="M 24 13 Q 80 70 140 13" />
      <path d="M 200 13 Q 250 50 300 13" />
      <path d="M 340 13 Q 390 76 460 13" />
    </g>
    <g className="quest-flame" fill="none" stroke="#67e8f9" strokeWidth={1.5}>
      <polyline points="82,40 88,48 84,50 92,60" />
      <polyline points="392,44 398,52 393,54 400,64" />
    </g>
  </Layer>
);

// the Djinn: a steel gas line along the ceiling, with pressure gauges hung
// from it and vapour hissing from its joints
const GAUGES = [70, 240, 410]; // x of each gauge
const gauges = (
  <Layer decor="gauges" at="top" height={80}>
    <rect y={6} width={W} height={7} fill="#64748b" />
    <rect y={6} width={W} height={2} fill="#94a3b8" />
    {GAUGES.map((x, i) => (
      <g key={x}>
        <rect x={x - 2} y={13} width={4} height={12} fill="#475569" />
        <circle cx={x} cy={38} r={14} fill="#334155" />
        <circle cx={x} cy={38} r={11} fill="#e2e8f0" />
        {/* the red line, top right of each dial */}
        <path
          d={`M ${x + 6} ${30} A 10 10 0 0 1 ${x + 10} ${36}`}
          fill="none"
          stroke="#dc2626"
          strokeWidth={3}
        />
        <line
          x1={x}
          y1={38}
          x2={x + 8 * Math.cos(-2.4 + i * 0.9)}
          y2={38 + 8 * Math.sin(-2.4 + i * 0.9)}
          stroke="#0f172a"
          strokeWidth={2}
        />
      </g>
    ))}
    <g className="quest-flame" fill="#ddd6fe" opacity={0.6}>
      <circle cx={150} cy={18} r={4} />
      <circle cx={156} cy={24} r={5} />
      <circle cx={330} cy={18} r={4} />
      <circle cx={325} cy={25} r={5} />
    </g>
  </Layer>
);

// the Alchemist: shelves of flasks on either side
const FLASK_COLOURS = ['#f472b6', '#22d3ee', '#facc15', '#a3e635', '#c084fc'];
function shelf(x: number, y: number) {
  return (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width={100} height={4} fill="#5b3a1e" />
      {range(5).map((k) => {
        const cx = x + 12 + k * 19;
        const fill = FLASK_COLOURS[(k + y) % FLASK_COLOURS.length];
        return k % 2 ? (
          <g key={k}>
            <rect x={cx - 2} y={y - 16} width={4} height={6} fill="#cbd5e1" />
            <circle cx={cx} cy={y - 6} r={6} fill={fill} />
          </g>
        ) : (
          <rect
            key={k}
            x={cx - 4}
            y={y - 14}
            width={8}
            height={14}
            fill={fill}
          />
        );
      })}
    </g>
  );
}
const shelves = (
  <Layer decor="shelves" at="top" height={110}>
    {shelf(6, 50)}
    {shelf(6, 96)}
    {shelf(374, 50)}
    {shelf(374, 96)}
  </Layer>
);

const DECOR: Record<Decor, ReactNode> = {
  icicles,
  cobwebs,
  chains,
  glyphs,
  cracks,
  drips,
  reeds,
  wires,
  gauges,
  shelves,
};

/** The decoration for a chamber's backdrop */
export default function SceneDecor({ decor }: { decor: Decor }) {
  return <>{DECOR[decor]}</>;
}
