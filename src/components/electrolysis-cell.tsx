import type { CSSProperties } from 'react';
import { COUPLES } from '~/constants/electrochemistry';
import {
  ELECTROLYSIS,
  type ElectrolysisSetup,
  type Product,
} from '~/utils/electrochemistry';

// SVG units
const WIDTH = 320;
const HEIGHT = 236;
const SUPPLY = { x: 116, y: 6, width: 88, height: 36 };
const BEAKER = { x: 50, width: 220, top: 96, bottom: 214 };
const LIQUID_TOP = 112;
const ELECTRODE = { width: 12, top: 70, bottom: 200 };
const X = { cathode: 110, anode: 210 }; // electrode centres
const TUBE = { halfWidth: 18, top: 100, bottom: 196 }; // inverted gas tubes
export const TUBE_ML = 100; // a full tube
const PLATE_SCALE = 0.5; // g of metal that fully thins or coats an electrode (drawing scale)
const COAT = 8; // the thickest coat, SVG units
const THIN = 0.6; // the most of its width an anode loses
const BUBBLES = 4; // rising from each gassing electrode

// rough colours, for the drawing only
const COPPER = '#c47a4a';
const INERT = '#6b7280'; // a grey for the inert electrodes
const SODIUM = '#d1d5db';
const CHLORINE = '#d9f99d'; // chlorine is pale yellow-green
const MOLTEN = '#fb923c';
const CU_SOLUTION = COUPLES.find((c) => c.id === 'Cu')!.color;

type Electrode = 'cathode' | 'anode';

interface Props {
  setup: ElectrolysisSetup;
  volts: number;
  current: number; // A
  products: { cathode: Product; anode: Product };
}

const tubeFill = (p: Product) =>
  Math.min(1, ((p.litres ?? 0) * 1000) / TUBE_ML);

/** A power supply driving a reaction in one beaker, with tubes catching any gas */
export default function ElectrolysisCell({
  setup,
  volts,
  current,
  products,
}: Props) {
  const flowing = current > 0;
  const copper = setup === 'copper-plating';
  const molten = setup === 'molten-nacl';
  const metal = copper ? COPPER : INERT;
  const coat = (g: number) => Math.min(1, g / PLATE_SCALE);

  const describe = (side: Electrode) => {
    const p = products[side];
    if (ELECTROLYSIS[setup][side].gas)
      return `${(p.litres! * 1000).toFixed(1)} mL of ${p.product} in the tube over the ${side}`;
    if (copper && side === 'anode')
      return `the copper anode has lost ${p.grams.toFixed(3)} g`;
    return `${p.grams.toFixed(3)} g of ${p.product} on the ${side}`;
  };
  const label =
    `Electrolysis cell: a power supply set to ${volts.toFixed(2)} V, ` +
    `its negative terminal wired to the cathode on the left and its positive terminal to the anode on the right. ` +
    (flowing
      ? `Electrons flow from the anode to the supply and on to the cathode; ${describe('cathode')}, ${describe('anode')}.`
      : 'No current flows.');

  const electrode = (side: Electrode) => {
    const x = X[side];
    const grams = products[side].grams;
    const thinned = copper && side === 'anode';
    const width = ELECTRODE.width * (thinned ? 1 - THIN * coat(grams) : 1);
    const plating = side === 'cathode' && !ELECTROLYSIS[setup].cathode.gas;
    const coatWidth = plating ? COAT * coat(grams) : 0;
    return (
      <g key={side}>
        {coatWidth > 0 && (
          <rect
            x={x - (ELECTRODE.width + coatWidth) / 2}
            y={LIQUID_TOP + 10}
            width={ELECTRODE.width + coatWidth}
            height={ELECTRODE.bottom - LIQUID_TOP - 10}
            rx={2}
            fill={molten ? SODIUM : COPPER}
          />
        )}
        <rect
          x={x - width / 2}
          y={ELECTRODE.top}
          width={width}
          height={ELECTRODE.bottom - ELECTRODE.top}
          fill={metal}
        />
        <text
          x={x}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-white text-[11px]"
        >
          {side === 'cathode' ? 'Cathode (−)' : 'Anode (+)'}
        </text>
      </g>
    );
  };

  const tube = (side: Electrode) => {
    const p = products[side];
    if (!ELECTROLYSIS[setup][side].gas) return null;
    const x = X[side];
    const height = TUBE.bottom - TUBE.top;
    const gas = tubeFill(p) * height;
    return (
      <g key={`${side}-tube`}>
        <rect
          x={x - TUBE.halfWidth}
          y={TUBE.top}
          width={TUBE.halfWidth * 2}
          height={gas}
          fill={p.product === 'Cl₂' ? CHLORINE : 'white'}
          fillOpacity={p.product === 'Cl₂' ? 0.6 : 0.35}
        />
        <path
          d={`M${x - TUBE.halfWidth} ${TUBE.bottom} V${TUBE.top + 6} Q${x - TUBE.halfWidth} ${TUBE.top} ${x - TUBE.halfWidth + 6} ${TUBE.top} H${x + TUBE.halfWidth - 6} Q${x + TUBE.halfWidth} ${TUBE.top} ${x + TUBE.halfWidth} ${TUBE.top + 6} V${TUBE.bottom}`}
          fill="none"
          strokeWidth={2}
          className="stroke-white/70"
        />
        <text
          x={
            x + (side === 'cathode' ? -TUBE.halfWidth - 4 : TUBE.halfWidth + 4)
          }
          y={TUBE.top + 12}
          textAnchor={side === 'cathode' ? 'end' : 'start'}
          className="fill-white text-[11px]"
        >
          {p.product}
        </text>
        {flowing &&
          Array.from({ length: BUBBLES }, (_, i) => (
            <circle
              key={i}
              cx={x + (i % 2 ? 4 : -4) * (1 + (i % 3))}
              cy={ELECTRODE.bottom - 10}
              r={2}
              className="fill-white/80 gas-bubble"
              style={
                {
                  '--rise': `${-(ELECTRODE.bottom - 10 - TUBE.top - gas - 4)}px`,
                  animationDelay: `${(i * 0.9) / BUBBLES}s`,
                } as CSSProperties
              }
            />
          ))}
      </g>
    );
  };

  // wires: anode → supply (+), supply (−) → cathode, so electrons dash along them
  const toSupply = `M${X.anode} ${ELECTRODE.top} V${SUPPLY.y + SUPPLY.height / 2} H${SUPPLY.x + SUPPLY.width}`;
  const fromSupply = `M${SUPPLY.x} ${SUPPLY.y + SUPPLY.height / 2} H${X.cathode} V${ELECTRODE.top}`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-xl h-auto mx-auto"
    >
      <rect
        x={BEAKER.x}
        y={LIQUID_TOP}
        width={BEAKER.width}
        height={BEAKER.bottom - LIQUID_TOP}
        className="fill-sky-200/20"
      />
      {(copper || molten) && (
        <rect
          x={BEAKER.x}
          y={LIQUID_TOP}
          width={BEAKER.width}
          height={BEAKER.bottom - LIQUID_TOP}
          fill={copper ? CU_SOLUTION.slice(0, 7) : MOLTEN}
          fillOpacity={copper ? 0.5 : 0.35}
        />
      )}
      <path
        d={`M${BEAKER.x} ${BEAKER.top} V${BEAKER.bottom} H${BEAKER.x + BEAKER.width} V${BEAKER.top}`}
        fill="none"
        strokeWidth={3}
        className="stroke-white/70"
      />
      {electrode('cathode')}
      {electrode('anode')}
      {tube('cathode')}
      {tube('anode')}

      {[toSupply, fromSupply].map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          strokeWidth={3}
          className="stroke-gray-300"
        />
      ))}
      {flowing &&
        [toSupply, fromSupply].map((d) => (
          <path
            key={`e-${d}`}
            d={d}
            fill="none"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="0.1 12"
            className="stroke-secondary-500 electron-flow"
          />
        ))}

      {/* the power supply, its display and terminals */}
      <rect
        {...SUPPLY}
        rx={4}
        strokeWidth={2}
        className="fill-primary-800 stroke-gray-300"
      />
      <text
        x={SUPPLY.x + SUPPLY.width / 2}
        y={SUPPLY.y + 23}
        textAnchor="middle"
        className="fill-white font-pixel text-[14px]"
      >
        {volts.toFixed(2)} V
      </text>
      <text
        x={SUPPLY.x + 8}
        y={SUPPLY.y + SUPPLY.height - 4}
        className="fill-white text-[11px]"
      >
        −
      </text>
      <text
        x={SUPPLY.x + SUPPLY.width - 8}
        y={SUPPLY.y + SUPPLY.height - 4}
        textAnchor="end"
        className="fill-white text-[11px]"
      >
        +
      </text>
    </svg>
  );
}
