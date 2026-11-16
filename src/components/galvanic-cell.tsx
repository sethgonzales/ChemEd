import type { Cell, CellReading, Side } from '~/utils/electrochemistry';
import { coupleFor, metalChange } from '~/utils/electrochemistry';

// SVG units
const WIDTH = 320;
const HEIGHT = 220;
const BEAKER = { width: 110, top: 80, bottom: 206 };
const BEAKER_X: Record<Side, number> = { left: 20, right: 190 };
const LIQUID_TOP = 104;
const ELECTRODE = { width: 14, top: 52, bottom: 190 };
const WIRE_Y = 22;
const BULB_R = 10;
const BRIDGE = { inset: 30, top: 66, bottom: 150, width: 14 }; // the KNO₃ tube
const ELECTRODE_SCALE = 0.1; // mol of metal that fully thins or coats an electrode (drawing scale)
const THIN = 0.7; // the most of its width an anode loses
const COAT = 10; // the thickest a cathode's coat grows
const MAX_GLOW_VOLTS = 3.2; // about Mg | Ag, the biggest cell on the list (V)

// rough metal colours, for the drawing only
const METAL_COLOR: Record<string, string> = { Cu: '#c47a4a' };
const DEFAULT_METAL = '#b8bcc4';
const metalColor = (id: string) => METAL_COLOR[id] ?? DEFAULT_METAL;

const centre = (side: Side) => BEAKER_X[side] + BEAKER.width / 2;
const lower = (s: string) => s.toLowerCase();

interface Props {
  start: Cell; // as filled, before it ran
  cell: Cell;
  reading: CellReading;
  flowing: boolean; // connected and driving a current
}

/** Two beakers joined by a wire through a bulb, and a salt bridge */
export default function GalvanicCell({ start, cell, reading, flowing }: Props) {
  const change = metalChange(start, cell);
  const describe = (side: Side) =>
    `a ${lower(coupleFor(cell[side].electrode).metal)} electrode in ${coupleFor(cell[side].solution).solution} on the ${side}`;
  const anode = reading.anode!;
  const cathode = reading.cathode!;
  const label =
    `Galvanic cell: ${describe('left')} and ${describe('right')}` +
    (cell.saltBridge
      ? ', joined by a salt bridge. '
      : ', with no salt bridge. ') +
    (flowing
      ? `Electrons flow through the wire from the ${lower(coupleFor(cell[anode].electrode).metal)} on the ${anode} to the ${lower(coupleFor(cell[cathode].electrode).metal)} on the ${cathode}, and the bulb glows.`
      : 'No current flows.');

  // the wire runs from the anode to the cathode, so electrons dash along it
  const wire = (from: Side, to: Side) =>
    `M${centre(from)} ${ELECTRODE.top} V${WIRE_Y} H${centre(to)} V${ELECTRODE.top}`;
  const glow = flowing ? Math.min(1, reading.voltage / MAX_GLOW_VOLTS) : 0;
  const arrowX = (centre('left') + WIDTH / 2) / 2;
  const toRight = flowing && cathode === 'right';

  const beaker = (side: Side) => {
    const x = BEAKER_X[side];
    const h = cell[side];
    const solution = coupleFor(h.solution);
    // ions used up fade the colour; tinted solutions are about this strong at 1 M
    const [rgb, alpha] = [solution.color.slice(0, 7), solution.color.slice(7)];
    const opacity = (parseInt(alpha, 16) / 255) * Math.min(1, h.concentration);
    const moved = Math.min(1, Math.abs(change[side]) / ELECTRODE_SCALE);
    const gained = change[side] > 0;
    const width = ELECTRODE.width * (gained ? 1 : 1 - THIN * moved);
    const coat = gained ? COAT * moved : 0;
    const electrode = coupleFor(h.electrode);
    const ex = centre(side);

    return (
      <g key={side}>
        <rect
          x={x}
          y={LIQUID_TOP}
          width={BEAKER.width}
          height={BEAKER.bottom - LIQUID_TOP}
          className="fill-sky-200/20"
        />
        <rect
          x={x}
          y={LIQUID_TOP}
          width={BEAKER.width}
          height={BEAKER.bottom - LIQUID_TOP}
          fill={rgb}
          fillOpacity={opacity}
        />
        <path
          d={`M${x} ${BEAKER.top} V${BEAKER.bottom} H${x + BEAKER.width} V${BEAKER.top}`}
          fill="none"
          strokeWidth={3}
          className="stroke-white/70"
        />
        {coat > 0 && (
          <rect
            x={ex - (ELECTRODE.width + coat) / 2}
            y={LIQUID_TOP}
            width={ELECTRODE.width + coat}
            height={ELECTRODE.bottom - LIQUID_TOP}
            fill={metalColor(electrode.id)}
            rx={2}
          />
        )}
        <rect
          x={ex - width / 2}
          y={ELECTRODE.top}
          width={width}
          height={ELECTRODE.bottom - ELECTRODE.top}
          fill={metalColor(electrode.id)}
        />
        <text
          x={ex}
          y={ELECTRODE.top + 18}
          textAnchor="middle"
          className="fill-gray-900 text-[11px] font-bold"
        >
          {electrode.id}
        </text>
        <text
          x={x + BEAKER.width / 2 + (side === 'left' ? -30 : 30)}
          y={BEAKER.bottom - 12}
          textAnchor="middle"
          className="fill-white text-[11px]"
        >
          {solution.ion}
        </text>
        {flowing && (
          <text
            x={ex}
            y={HEIGHT - 2}
            textAnchor="middle"
            className="fill-white text-[11px]"
          >
            {side === anode ? 'Anode (−)' : 'Cathode (+)'}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-xl h-auto mx-auto"
    >
      {cell.saltBridge && (
        <g>
          <path
            d={`M${BEAKER_X.left + BEAKER.width - BRIDGE.inset} ${BRIDGE.bottom} V${BRIDGE.top} H${BEAKER_X.right + BRIDGE.inset} V${BRIDGE.bottom}`}
            fill="none"
            strokeWidth={BRIDGE.width}
            strokeLinejoin="round"
            className="stroke-white/30"
          />
          <text
            x={WIDTH / 2}
            y={BRIDGE.top + 4}
            textAnchor="middle"
            className="fill-white text-[10px]"
          >
            KNO₃
          </text>
        </g>
      )}
      {beaker('left')}
      {beaker('right')}

      <path
        d={wire('left', 'right')}
        fill="none"
        strokeWidth={3}
        className="stroke-gray-300"
      />
      {flowing && (
        <>
          {/* electrons, dashing from anode to cathode; still under reduced motion */}
          <path
            d={wire(anode, cathode)}
            fill="none"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="0.1 12"
            className="stroke-secondary-500 electron-flow"
          />
          <path
            d={
              toRight
                ? `M${arrowX - 5} ${WIRE_Y - 6} L${arrowX + 5} ${WIRE_Y} L${arrowX - 5} ${WIRE_Y + 6}`
                : `M${arrowX + 5} ${WIRE_Y - 6} L${arrowX - 5} ${WIRE_Y} L${arrowX + 5} ${WIRE_Y + 6}`
            }
            fill="none"
            strokeWidth={2.5}
            className="stroke-secondary-500"
          />
          <text
            x={arrowX}
            y={WIRE_Y - 9}
            textAnchor="middle"
            className="fill-white text-[10px]"
          >
            e⁻
          </text>
        </>
      )}

      {/* the bulb: brighter the bigger the voltage */}
      <circle
        cx={WIDTH / 2}
        cy={WIRE_Y}
        r={BULB_R * 2}
        className="fill-yellow-200"
        opacity={glow * 0.5}
      />
      <circle
        cx={WIDTH / 2}
        cy={WIRE_Y}
        r={BULB_R}
        strokeWidth={2}
        className="stroke-gray-300 fill-primary-700"
      />
      <circle
        cx={WIDTH / 2}
        cy={WIRE_Y}
        r={BULB_R - 2}
        className="fill-yellow-200"
        opacity={glow}
      />
    </svg>
  );
}
