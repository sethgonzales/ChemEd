import type { Substance } from '~/constants/substances';
import { heatingCurve, pointOn } from '~/utils/states-of-matter';

// SVG units; the chart scales to its width (capped), so keep it small enough
// that the labels stay readable on a phone
export const CHART = {
  width: 300,
  height: 140,
  pad: { left: 36, right: 10, top: 14, bottom: 26 },
  dotRadius: 5,
  labelGap: 2, // between the dot's edge and a label
  lineClearance: 4, // between the 3-wide line and a label
  ascent: 8, // an 11px label above its baseline (the l), roughly
  descent: 3, // and below it (the g's tail)
  inset: 10, // the curve's lowest point sits this far above the x-axis
  charWidth: 7, // an 11px label's characters, roughly (the arrow is wide)
};

const label = (s: Substance, tempC: number) =>
  `Heating curve for ${s.name}: it warms as a solid, holds at ${s.meltC} °C ` +
  `while it melts, warms as a liquid, holds at ${s.boilC} °C while it boils, ` +
  `then warms as a gas. The dot marks ${tempC} °C.`;

/**
 * Where everything goes. Each label is centred on its plateau, sliding along
 * only when the plateau is too short for it, and keeps clear of the dot,
 * which sits mid-plateau at a phase change.
 */
export function chart(s: Substance, tempC: number) {
  const { width, height, pad, labelGap, dotRadius, charWidth } = CHART;
  const { ascent, descent, inset } = CHART;
  const curve = heatingCurve(s);
  const qMax = curve[curve.length - 1].q;
  const tMin = curve[0].t;
  const tMax = curve[curve.length - 1].t;
  const x = (q: number) =>
    pad.left + (q / qMax) * (width - pad.left - pad.right);
  // lifted off the x-axis, leaving room for s→l under the melting plateau
  const y = (t: number) =>
    height -
    pad.bottom -
    inset -
    ((t - tMin) / (tMax - tMin)) * (height - pad.top - pad.bottom - inset);

  const dot = pointOn(s, tempC);
  const line = curve.map((p) => ({ x: x(p.q), y: y(p.t) }));
  const mid = (i: number) => (line[i].x + line[i + 1].x) / 2;
  const clear = dotRadius + labelGap; // from a plateau to its label
  const halfWidth = (text: string) => (text.length * charWidth) / 2;
  // where the segment from line[i] to line[i + 1] passes height h
  const crossing = (i: number, h: number) => {
    const [a, b] = [line[i], line[i + 1]];
    return a.x + ((b.x - a.x) * (h - a.y)) / (b.y - a.y);
  };

  // s→l hangs under its plateau; on a short one the solid line, climbing in
  // from the lower left, would cut its top corner, so it slides right
  const meltY = y(s.meltC) + clear + ascent;
  const meltX = Math.max(
    mid(1),
    crossing(0, meltY - ascent) + CHART.lineClearance + halfWidth('s→l'),
  );
  // l→g sits over its plateau; the gas line leaves upwards from its right end
  const boilY = y(s.boilC) - clear - descent;
  const boilX = Math.min(
    mid(3),
    crossing(4, boilY + descent) - CHART.lineClearance - halfWidth('l→g'),
  );
  return {
    x,
    y,
    line,
    dot: { x: x(dot.q), y: y(dot.t) },
    labels: [
      // x is each label's centre, y its baseline
      { text: 's→l', x: meltX, y: meltY },
      { text: 'l→g', x: boilX, y: boilY },
    ],
  };
}

/** Temperature against heat added, with a dot where the substance is now */
export default function HeatingCurve({
  substance,
  temperature,
}: {
  substance: Substance;
  temperature: number;
}) {
  const { width, height, pad, dotRadius } = CHART;
  const { y, line, dot, labels } = chart(substance, temperature);

  return (
    <svg
      role="img"
      aria-label={label(substance, temperature)}
      viewBox={`0 0 ${width} ${height}`}
      // the page frames it, so it can sit beside the particles
      className="w-full max-w-md h-auto text-white"
    >
      {/* axes */}
      <path
        d={`M${pad.left} ${pad.top} V${height - pad.bottom} H${width - pad.right}`}
        className="stroke-white/60"
        fill="none"
      />
      <text
        x={(pad.left + width - pad.right) / 2}
        y={height - 8}
        textAnchor="middle"
        className="fill-white/80 text-[12px]"
      >
        Heat added →
      </text>
      <text
        x={12}
        y={(pad.top + height - pad.bottom) / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${(pad.top + height - pad.bottom) / 2})`}
        className="fill-white/80 text-[12px]"
      >
        °C
      </text>

      {/* the melting and boiling temperatures, marked on the axis */}
      {[substance.meltC, substance.boilC].map((t) => (
        <text
          key={t}
          x={pad.left - 4}
          y={y(t) + 4}
          textAnchor="end"
          className="fill-white/80 text-[11px]"
        >
          {Math.round(t)}
        </text>
      ))}
      {labels.map((l) => (
        <text
          key={l.text}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          className="fill-white/80 text-[11px]"
        >
          {l.text}
        </text>
      ))}

      <polyline
        points={line.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        className="stroke-white"
      />
      <circle
        cx={dot.x}
        cy={dot.y}
        r={dotRadius}
        className="fill-secondary-500 stroke-primary-800"
        strokeWidth={2}
      />
    </svg>
  );
}
