import { BURETTE_CAPACITY, type Indicator } from '~/constants/titrations';
import { indicatorColor } from '~/utils/titrations';

// SVG units; sized so the labels stay readable on a phone
const WIDTH = 300;
const HEIGHT = 230;
const PAD = { left: 30, right: 12, top: 24, bottom: 32 }; // top leaves room for the "pH" title
const PH_MAX = 14;
const VOLUME_TICK = 10; // mL
const PH_TICK = 2;
const DOT_RADIUS = 5;
const BAND_OPACITY = 0.35;

type Point = { volume: number; pH: number };

export interface CurveMarkers {
  equivalences: number[]; // mL, the visible ones
  halves: { volume: number; pKa: number }[];
}

const mL = (v: number) => v.toFixed(2);

function describe(
  current: Point,
  indicator: Indicator,
  markers: CurveMarkers | null,
) {
  const parts = [
    `pH curve: pH ${current.pH.toFixed(2)} after ${mL(current.volume)} mL.`,
    `${indicator.name} changes colour from pH ${indicator.low} to ${indicator.high}.`,
  ];
  if (markers) {
    const eq = markers.equivalences.map(mL);
    if (eq.length === 1) parts.push(`Equivalence point at ${eq[0]} mL.`);
    if (eq.length > 1) {
      parts.push(
        `Equivalence points at ${eq.slice(0, -1).join(', ')} and ${eq[eq.length - 1]} mL.`,
      );
    }
    for (const h of markers.halves) {
      parts.push(`pH = pKa = ${h.pKa.toFixed(2)} at ${mL(h.volume)} mL.`);
    }
  }
  return parts.join(' ');
}

interface Props {
  points: Point[]; // from the start to now
  indicator: Indicator;
  markers: CurveMarkers | null; // null hides them
}

/** pH against volume of titrant, with the indicator's range shaded */
export default function PhCurve({ points, indicator, markers }: Props) {
  const current = points[points.length - 1];
  const x = (volume: number) =>
    PAD.left + (volume / BURETTE_CAPACITY) * (WIDTH - PAD.left - PAD.right);
  const y = (pH: number) =>
    HEIGHT - PAD.bottom - (pH / PH_MAX) * (HEIGHT - PAD.top - PAD.bottom);
  const volumeTicks = Array.from(
    { length: BURETTE_CAPACITY / VOLUME_TICK + 1 },
    (_, i) => i * VOLUME_TICK,
  );
  const phTicks = Array.from(
    { length: PH_MAX / PH_TICK + 1 },
    (_, i) => i * PH_TICK,
  );

  return (
    <svg
      role="img"
      aria-label={describe(current, indicator, markers)}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-md h-auto"
    >
      {/* where the indicator changes colour */}
      <rect
        x={PAD.left}
        y={y(indicator.high)}
        width={WIDTH - PAD.left - PAD.right}
        height={y(indicator.low) - y(indicator.high)}
        style={{
          fill: indicatorColor(indicator, (indicator.low + indicator.high) / 2),
        }}
        fillOpacity={BAND_OPACITY}
      />

      {/* axes and ticks */}
      <path
        d={`M${PAD.left} ${PAD.top} V${HEIGHT - PAD.bottom} H${WIDTH - PAD.right}`}
        fill="none"
        className="stroke-white/60"
      />
      {volumeTicks.map((v) => (
        <text
          key={v}
          x={x(v)}
          y={HEIGHT - PAD.bottom + 14}
          textAnchor="middle"
          className="fill-white/80 text-[11px]"
        >
          {v}
        </text>
      ))}
      {phTicks.map((pH) => (
        <text
          key={pH}
          x={PAD.left - 5}
          y={y(pH) + 4}
          textAnchor="end"
          className="fill-white/80 text-[11px]"
        >
          {pH}
        </text>
      ))}
      <text
        x={(PAD.left + WIDTH - PAD.right) / 2}
        y={HEIGHT - 4}
        textAnchor="middle"
        className="fill-white/80 text-[12px]"
      >
        Titrant added (mL)
      </text>
      <text
        x={PAD.left}
        y={14}
        textAnchor="middle"
        className="fill-white/80 text-[12px]"
      >
        pH
      </text>

      {markers?.equivalences.map((v) => (
        <line
          key={v}
          x1={x(v)}
          x2={x(v)}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
          strokeDasharray="4 3"
          className="stroke-white/60"
        />
      ))}
      {markers?.halves.map((h) => (
        <g key={h.volume}>
          <circle
            cx={x(h.volume)}
            cy={y(h.pKa)}
            r={4}
            fill="none"
            strokeWidth={2}
            className="stroke-white"
          />
          <text
            x={x(h.volume) + 7}
            y={y(h.pKa) + 14}
            className="fill-white/80 text-[10px]"
          >
            pKa
          </text>
        </g>
      ))}

      <polyline
        points={points.map((p) => `${x(p.volume)},${y(p.pH)}`).join(' ')}
        fill="none"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="stroke-white"
      />
      <circle
        cx={x(current.volume)}
        cy={y(current.pH)}
        r={DOT_RADIUS}
        strokeWidth={2}
        className="fill-secondary-500 stroke-primary-800"
      />
    </svg>
  );
}
