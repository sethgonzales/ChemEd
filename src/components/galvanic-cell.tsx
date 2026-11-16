import type { Cell, CellReading, Side } from '~/utils/electrochemistry';
import {
  coupleFor,
  electrodeWear,
  metalChange,
} from '~/utils/electrochemistry';

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
const THIN = 0.7; // the most of its width an anode loses
const COAT = 10; // the thickest a cathode's coat grows
const HIT_HALF_WIDTH = 22; // tap target either side of an electrode
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
  zoomed: Zoom | null; // which spot's close-up is open
  onZoom: (spot: Zoom | null) => void;
}

export type Zoom = Side | 'bridge';

/** Two beakers joined by a wire through a bulb, and a salt bridge */
export default function GalvanicCell({
  start,
  cell,
  reading,
  flowing,
  zoomed,
  onZoom,
}: Props) {
  const change = metalChange(start, cell);
  const wear = electrodeWear(start, cell);
  const describe = (side: Side) =>
    `a ${lower(coupleFor(cell[side].electrode).metal)} electrode in ${coupleFor(cell[side].solution).solution} on the ${side}`;
  const anode = reading.anode!;
  const cathode = reading.cathode!;
  const label =
    `Voltaic cell: ${describe('left')} and ${describe('right')}` +
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
    const moved = wear[side];
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
          data-testid={`${side}-electrode`}
          x={ex - width / 2}
          y={ELECTRODE.top}
          width={width}
          height={ELECTRODE.bottom - ELECTRODE.top}
          fill={metalColor(electrode.id)}
        />
        {/* beside the electrode, on the beaker's outer side and clear of its
            thickest coat: on the metal it would spill onto the background as
            the anode thins */}
        <text
          x={
            side === 'left'
              ? ex - (ELECTRODE.width + COAT) / 2 - 3
              : ex + (ELECTRODE.width + COAT) / 2 + 3
          }
          y={BEAKER.top + 12}
          textAnchor={side === 'left' ? 'end' : 'start'}
          className="fill-white text-[11px] font-bold"
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

  const picture = (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto"
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

  // what each zoom button covers, as percentages of the picture
  const box = (x: number, y: number, w: number, h: number) => ({
    left: `${(x / WIDTH) * 100}%`,
    top: `${(y / HEIGHT) * 100}%`,
    width: `${(w / WIDTH) * 100}%`,
    height: `${(h / HEIGHT) * 100}%`,
  });
  const targets: { spot: Zoom; name: string; style: object }[] = [
    ...(['left', 'right'] as const).map((side) => ({
      spot: side,
      name: `Zoom in on the ${side} electrode (${lower(coupleFor(cell[side].electrode).metal)})`,
      style: box(
        centre(side) - HIT_HALF_WIDTH,
        ELECTRODE.top,
        HIT_HALF_WIDTH * 2,
        ELECTRODE.bottom - ELECTRODE.top,
      ),
    })),
    ...(cell.saltBridge
      ? [
          {
            spot: 'bridge' as const,
            name: 'Zoom in on the salt bridge',
            style: box(
              BEAKER_X.left + BEAKER.width - BRIDGE.inset - BRIDGE.width,
              BRIDGE.top - BRIDGE.width,
              BEAKER_X.right -
                BEAKER_X.left -
                BEAKER.width +
                2 * (BRIDGE.inset + BRIDGE.width),
              BRIDGE.width * 2,
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {picture}
      {targets.map(({ spot, name, style }) => (
        <button
          key={spot}
          type="button"
          aria-label={name}
          aria-expanded={zoomed === spot}
          onClick={() => onZoom(zoomed === spot ? null : spot)}
          className="absolute cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-secondary-500"
          style={style}
        />
      ))}
    </div>
  );
}
