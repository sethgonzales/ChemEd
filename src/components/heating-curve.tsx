import type { Substance } from '~/constants/substances';
import { heatAt, heatingCurve } from '~/utils/states-of-matter';

// SVG units; the chart scales to its width (capped), so keep it small enough
// that the labels stay readable on a phone
const WIDTH = 300;
const HEIGHT = 140;
const PAD = { left: 36, right: 10, top: 14, bottom: 26 };
const DOT_RADIUS = 5;
const LABEL_GAP = 6; // between a plateau and its label

const label = (s: Substance, tempC: number) =>
  `Heating curve for ${s.name}: it warms as a solid, holds at ${s.meltC} °C ` +
  `while it melts, warms as a liquid, holds at ${s.boilC} °C while it boils, ` +
  `then warms as a gas. The dot marks ${tempC} °C.`;

/** Temperature against heat added, with a dot where the substance is now */
export default function HeatingCurve({
  substance,
  temperature,
}: {
  substance: Substance;
  temperature: number;
}) {
  const curve = heatingCurve(substance);
  const qMax = curve[curve.length - 1].q;
  const tMin = curve[0].t;
  const tMax = curve[curve.length - 1].t;

  const x = (q: number) =>
    PAD.left + (q / qMax) * (WIDTH - PAD.left - PAD.right);
  const y = (t: number) =>
    HEIGHT -
    PAD.bottom -
    ((t - tMin) / (tMax - tMin)) * (HEIGHT - PAD.top - PAD.bottom);

  // "melts" sits below its plateau, where the rising line can't cross it
  const plateaus = [
    {
      t: substance.meltC,
      q: (curve[1].q + curve[2].q) / 2,
      name: 'melts',
      dy: LABEL_GAP + 10,
    },
    {
      t: substance.boilC,
      q: (curve[3].q + curve[4].q) / 2,
      name: 'boils',
      dy: -LABEL_GAP,
    },
  ];

  return (
    <svg
      role="img"
      aria-label={label(substance, temperature)}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-md mx-auto h-auto pixel-control bg-primary-800 text-white"
    >
      {/* axes */}
      <path
        d={`M${PAD.left} ${PAD.top} V${HEIGHT - PAD.bottom} H${WIDTH - PAD.right}`}
        className="stroke-white/60"
        fill="none"
      />
      <text
        x={(PAD.left + WIDTH - PAD.right) / 2}
        y={HEIGHT - 8}
        textAnchor="middle"
        className="fill-white/80 text-[12px]"
      >
        Heat added →
      </text>
      <text
        x={12}
        y={(PAD.top + HEIGHT - PAD.bottom) / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${(PAD.top + HEIGHT - PAD.bottom) / 2})`}
        className="fill-white/80 text-[12px]"
      >
        °C
      </text>

      {/* the melting and boiling temperatures, marked on the axis */}
      {plateaus.map((p) => (
        <g key={p.name}>
          <text
            x={PAD.left - 4}
            y={y(p.t) + 4}
            textAnchor="end"
            className="fill-white/80 text-[11px]"
          >
            {Math.round(p.t)}
          </text>
          <text
            x={x(p.q)}
            y={y(p.t) + p.dy}
            textAnchor="start"
            className="fill-white/80 text-[11px]"
          >
            {p.name}
          </text>
        </g>
      ))}

      <polyline
        points={curve.map((p) => `${x(p.q)},${y(p.t)}`).join(' ')}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        className="stroke-white"
      />
      <circle
        cx={x(heatAt(substance, temperature))}
        cy={y(temperature)}
        r={DOT_RADIUS}
        className="fill-secondary-500 stroke-primary-800"
        strokeWidth={2}
      />
    </svg>
  );
}
