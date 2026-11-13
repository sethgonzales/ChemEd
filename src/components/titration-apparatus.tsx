import { useId } from 'react';
import { ANALYTE_VOLUME, BURETTE_CAPACITY } from '~/constants/titrations';

// SVG units
const WIDTH = 200;
const HEIGHT = 300;
const TUBE = { x: 92, width: 16, top: 12, bottom: 172 }; // the burette's glass
const SCALE_STEP = 5; // mL between marks; every other one is labelled
const FLASK_BOTTOM = 292;
const FLASK_BODY_TOP = 228;
const FLASK_FULL = 100; // mL that would fill the flask's body to the neck

// an Erlenmeyer flask: neck, shoulders, wide base
const FLASK_PATH =
  `M88 ${FLASK_BODY_TOP - 22} V${FLASK_BODY_TOP} L38 ${FLASK_BOTTOM - 4} ` +
  `Q36 ${FLASK_BOTTOM} 42 ${FLASK_BOTTOM} H158 Q164 ${FLASK_BOTTOM} 162 ` +
  `${FLASK_BOTTOM - 4} L112 ${FLASK_BODY_TOP} V${FLASK_BODY_TOP - 22}`;

interface Props {
  volume: number; // mL of titrant added
  color: string; // the solution's colour, from the indicator
  colorName: string;
}

/** The burette over the flask: the burette's level and the flask's colour */
export default function TitrationApparatus({
  volume,
  color,
  colorName,
}: Props) {
  const clipId = useId();
  const tubeHeight = TUBE.bottom - TUBE.top;
  // a burette reads 0 at the top and counts down the tube
  const level = TUBE.top + (volume / BURETTE_CAPACITY) * tubeHeight;
  const flaskLiquid =
    FLASK_BOTTOM -
    ((ANALYTE_VOLUME + volume) / FLASK_FULL) * (FLASK_BOTTOM - FLASK_BODY_TOP);
  const marks = Array.from(
    { length: BURETTE_CAPACITY / SCALE_STEP + 1 },
    (_, i) => i * SCALE_STEP,
  );

  return (
    <svg
      role="img"
      aria-label={`Burette reads ${volume.toFixed(2)} mL; the flask is ${colorName}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-56 h-auto"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={`${FLASK_PATH} Z`} />
        </clipPath>
      </defs>

      {/* burette: titrant below the level, then the scale over the glass */}
      <rect
        x={TUBE.x}
        y={level}
        width={TUBE.width}
        height={Math.max(0, TUBE.bottom - level)}
        className="fill-sky-200/40"
      />
      <rect
        x={TUBE.x}
        y={TUBE.top}
        width={TUBE.width}
        height={tubeHeight}
        fill="none"
        strokeWidth={2}
        className="stroke-white/70"
      />
      {marks.map((mL) => {
        const y = TUBE.top + (mL / BURETTE_CAPACITY) * tubeHeight;
        const labelled = mL % (SCALE_STEP * 2) === 0;
        return (
          <g key={mL}>
            <line
              x1={TUBE.x}
              x2={TUBE.x + (labelled ? 8 : 5)}
              y1={y}
              y2={y}
              className="stroke-white/70"
            />
            {labelled && (
              <text
                x={TUBE.x - 4}
                y={y + 4}
                textAnchor="end"
                className="fill-white/80 text-[11px]"
              >
                {mL}
              </text>
            )}
          </g>
        );
      })}
      {/* a short stem, the stopcock below the scale's last label, then the tip */}
      <rect
        x={TUBE.x + 5}
        y={TUBE.bottom}
        width={TUBE.width - 10}
        height={8}
        className="fill-white/50"
      />
      <rect
        x={TUBE.x - 8}
        y={TUBE.bottom + 8}
        width={TUBE.width + 16}
        height={6}
        className="fill-white/70"
      />
      <path
        d={`M${TUBE.x + 5} ${TUBE.bottom + 14} L${TUBE.x + 7} ${TUBE.bottom + 28} H${TUBE.x + 9} L${TUBE.x + 11} ${TUBE.bottom + 14}`}
        className="fill-white/50"
      />

      {/* flask: water, tinted by the indicator, inside the glass */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={0}
          y={flaskLiquid}
          width={WIDTH}
          height={FLASK_BOTTOM - flaskLiquid}
          className="fill-white/15"
        />
        <rect
          x={0}
          y={flaskLiquid}
          width={WIDTH}
          height={FLASK_BOTTOM - flaskLiquid}
          style={{ fill: color }}
        />
      </g>
      <path
        d={FLASK_PATH}
        fill="none"
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="stroke-white/70"
      />
    </svg>
  );
}
