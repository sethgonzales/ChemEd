import { useId, useState, type CSSProperties } from 'react';
import BuretteCloseUp from '~/components/burette-close-up';
import { ANALYTE_VOLUME, BURETTE_CAPACITY } from '~/constants/titrations';
import type { Swirl } from '~/utils/titrations';
import { useEscape } from '~/utils/use-escape';
import type { Drop, Flash } from '~/utils/use-drips';

// SVG units
const WIDTH = 200;
const HEIGHT = 334;
const TUBE = { x: 92, width: 16, top: 12, bottom: 172 }; // the burette's glass
const SCALE_STEP = 5; // mL between marks; every other one is labelled
const FLASK_NECK_TOP = 194; // the burette tip reaches just inside the neck
const FLASK_BODY_TOP = 222; // where the cone meets the neck
const FLASK_BOTTOM = 312;
const FLASK_FULL = 110; // mL that would fill the cone to the neck
const TIP_Y = TUBE.bottom + 28; // where titrant leaves the burette
const TIP_X = TUBE.x + TUBE.width / 2;
const BURETTE_HIT = { x: 64, width: 72 }; // the burette and its labels, to click
const LENS_MIN_Y = 64; // keeps the round close-up inside the picture
const VORTEX = { width: 20, depth: 1.5 }; // the dip a stir bar pulls in the surface
const STIRRER = { x: 56, width: 88, height: 14 }; // the plate under the flask
const SWIRL_RX = 14; // the flash where titrant lands
const SWIRL_RY = 7;
const SWIRL_DEPTH = 8; // below the surface

// an Erlenmeyer flask, about as tall as a 250 mL one is for its width: a
// lipped neck, then a straight-sided cone to a base with rounded corners
const FLASK_PATH =
  `M86 ${FLASK_NECK_TOP} Q90 ${FLASK_NECK_TOP} 90 ${FLASK_NECK_TOP + 4} ` +
  `V${FLASK_BODY_TOP - 6} Q90 ${FLASK_BODY_TOP - 3} 88 ${FLASK_BODY_TOP} ` +
  `L62 ${FLASK_BOTTOM - 8} Q60 ${FLASK_BOTTOM} 68 ${FLASK_BOTTOM} H132 ` +
  `Q140 ${FLASK_BOTTOM} 138 ${FLASK_BOTTOM - 8} L112 ${FLASK_BODY_TOP} ` +
  `Q110 ${FLASK_BODY_TOP - 3} 110 ${FLASK_BODY_TOP - 6} V${FLASK_NECK_TOP + 4} ` +
  `Q110 ${FLASK_NECK_TOP} 114 ${FLASK_NECK_TOP}`;

interface Props {
  volume: number; // mL of titrant added
  color: string; // the solution's colour, from the indicator
  colorName: string;
  drops?: Drop[]; // falling now
  pouring?: boolean; // the tap is held open
  flashes?: Flash[]; // colour where drops land, fading as it mixes in
  pourSwirl?: Swirl | null; // colour under the running stream
}

/** The burette over the flask: the burette's level and the flask's colour */
export default function TitrationApparatus({
  volume,
  color,
  colorName,
  drops = [],
  pouring = false,
  flashes = [],
  pourSwirl = null,
}: Props) {
  const [zoomed, setZoomed] = useState(false);
  useEscape(() => setZoomed(false), zoomed);
  const clipId = useId();
  const blurId = useId();
  const tubeHeight = TUBE.bottom - TUBE.top;
  // a burette reads 0 at the top and counts down the tube
  const level = TUBE.top + (volume / BURETTE_CAPACITY) * tubeHeight;
  const flaskLiquid =
    FLASK_BOTTOM -
    ((ANALYTE_VOLUME + volume) / FLASK_FULL) * (FLASK_BOTTOM - FLASK_BODY_TOP);
  // a stirred liquid's surface dips in the middle
  const liquidPath =
    `M0 ${flaskLiquid} H${TIP_X - VORTEX.width} ` +
    `Q${TIP_X} ${flaskLiquid + VORTEX.depth * 2} ${TIP_X + VORTEX.width} ${flaskLiquid} ` +
    `H${WIDTH} V${FLASK_BOTTOM} H0 Z`;
  const marks = Array.from(
    { length: BURETTE_CAPACITY / SCALE_STEP + 1 },
    (_, i) => i * SCALE_STEP,
  );

  return (
    <div className="relative w-full max-w-56">
      <svg
        role="img"
        aria-label={`Burette reads ${volume.toFixed(2)} mL; the flask is ${colorName}, stirred by a stir bar`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={`${FLASK_PATH} Z`} />
          </clipPath>
          {/* soft edges, so a swirl reads as colour spreading */}
          <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3} />
          </filter>
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

        {/* titrant on its way down: a stream while pouring, else drops */}
        {pouring && (
          <line
            data-testid="stream"
            x1={TIP_X}
            x2={TIP_X}
            y1={TIP_Y}
            y2={flaskLiquid}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            className="stroke-sky-200/80 burette-stream"
          />
        )}
        {drops.map((drop) => (
          <ellipse
            key={drop.id}
            data-testid="drop"
            cx={TIP_X}
            cy={TIP_Y + 3}
            rx={2.5}
            ry={3.5}
            className="fill-sky-200/80 burette-drop"
            style={
              {
                '--fall': `${flaskLiquid - TIP_Y - 3}px`,
                animationDelay: `${drop.delay}ms`,
              } as CSSProperties
            }
          />
        ))}

        {/* flask: a pale solution like the titrant, tinted by the indicator
          (the tint fades between colours), with swirls where titrant lands */}
        <g clipPath={`url(#${clipId})`}>
          <path d={liquidPath} className="fill-sky-200/40" />
          <path
            d={liquidPath}
            className="motion-safe:transition-colors motion-safe:duration-700"
            style={{ fill: color }}
          />
          {flashes.map((flash) => (
            <ellipse
              key={flash.id}
              data-testid="swirl"
              filter={`url(#${blurId})`}
              cx={TIP_X}
              cy={flaskLiquid + SWIRL_DEPTH}
              rx={SWIRL_RX}
              ry={SWIRL_RY}
              className="burette-swirl"
              style={
                {
                  fill: flash.color,
                  '--strength': flash.strength,
                  '--duration': `${flash.duration}ms`,
                  animationDelay: `${flash.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
          {pouring && pourSwirl && (
            <ellipse
              data-testid="swirl"
              filter={`url(#${blurId})`}
              cx={TIP_X}
              cy={flaskLiquid + SWIRL_DEPTH}
              rx={SWIRL_RX * 1.4}
              ry={SWIRL_RY * 1.4}
              className="burette-swirl-pour"
              style={{ fill: pourSwirl.color, opacity: pourSwirl.strength }}
            />
          )}
          {/* the liquid circling, and the stir bar spinning on the bottom */}
          <ellipse
            cx={TIP_X}
            cy={(flaskLiquid + FLASK_BOTTOM) / 2 + 2}
            rx={24}
            ry={4}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="10 14"
            className="stroke-white/25 stir-flow"
          />
          <rect
            data-testid="stir-bar"
            x={TIP_X - 11}
            y={FLASK_BOTTOM - 6}
            width={22}
            height={5}
            rx={2.5}
            className="fill-white/90 stir-bar"
          />
        </g>
        {/* the magnetic stirrer the flask stands on */}
        <rect
          x={STIRRER.x}
          y={FLASK_BOTTOM + 2}
          width={STIRRER.width}
          height={STIRRER.height}
          rx={3}
          className="fill-white/25"
        />
        <circle
          cx={STIRRER.x + STIRRER.width - 10}
          cy={FLASK_BOTTOM + 2 + STIRRER.height / 2}
          r={2.5}
          className="fill-green-400"
        />
        <path
          d={FLASK_PATH}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          className="stroke-white/70"
        />
      </svg>
      {/* the burette is a button: it opens a lens on the level (and the lens
          lets clicks through, so clicking again closes it) */}
      <button
        type="button"
        aria-label="Zoom in on the burette"
        aria-expanded={zoomed}
        onClick={() => setZoomed((z) => !z)}
        className="absolute cursor-zoom-in focus-visible:outline-2 focus-visible:outline-secondary-500"
        style={{
          left: `${(BURETTE_HIT.x / WIDTH) * 100}%`,
          width: `${(BURETTE_HIT.width / WIDTH) * 100}%`,
          top: 0,
          height: `${(TIP_Y / HEIGHT) * 100}%`,
        }}
      />
      {zoomed && (
        <div
          className="absolute left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-hidden rounded-full border-2 border-white/80 bg-primary-800 shadow-lg"
          style={{
            top: `${(Math.max(level, LENS_MIN_Y) / HEIGHT) * 100}%`,
          }}
        >
          <BuretteCloseUp volume={volume} />
        </div>
      )}
    </div>
  );
}
