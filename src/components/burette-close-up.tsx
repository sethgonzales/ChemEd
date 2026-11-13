import { closeUpWindow, scaleMarks } from '~/utils/burette';

// SVG units
const SIZE = 120;
const WALL = { left: 30, right: 90 }; // the burette's glass, magnified
const MENISCUS_RISE = 5; // how far water creeps up the glass at the walls
const MARK_LENGTH = { mL: 30, half: 20, tenth: 12 };

/**
 * The burette scale magnified around the level, as through a lens: marks every
 * 0.1 mL, so students estimate the next digit from the bottom of the meniscus.
 */
export default function BuretteCloseUp({ volume }: { volume: number }) {
  const { from, to } = closeUpWindow(volume);
  const y = (mL: number) => ((mL - from) / (to - from)) * SIZE;
  const level = y(volume);

  return (
    <svg
      role="img"
      aria-label={`Close-up of the burette from ${from.toFixed(2)} to ${to.toFixed(2)} mL. Read the bottom of the meniscus.`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-full"
    >
      {/* water's meniscus curves down in the middle: the reading is its bottom */}
      <path
        d={
          `M${WALL.left} ${level - MENISCUS_RISE} ` +
          `Q${SIZE / 2} ${level + MENISCUS_RISE} ${WALL.right} ${level - MENISCUS_RISE} ` +
          `V${SIZE} H${WALL.left} Z`
        }
        className="fill-sky-200/40"
      />
      <path
        d={`M${WALL.left} ${level - MENISCUS_RISE} Q${SIZE / 2} ${level + MENISCUS_RISE} ${WALL.right} ${level - MENISCUS_RISE}`}
        fill="none"
        strokeWidth={1.5}
        className="stroke-sky-100"
      />
      {scaleMarks(from, to).map(({ volume: mL, size }) => (
        <g key={mL}>
          <line
            x1={WALL.left}
            x2={WALL.left + MARK_LENGTH[size]}
            y1={y(mL)}
            y2={y(mL)}
            strokeWidth={size === 'tenth' ? 1 : 1.5}
            className="stroke-white/80"
          />
          {size === 'mL' && (
            <text
              x={WALL.left + MARK_LENGTH.mL + 4}
              y={y(mL) + 4}
              className="fill-white text-[12px]"
            >
              {mL}
            </text>
          )}
        </g>
      ))}
      {[WALL.left, WALL.right].map((x) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={0}
          y2={SIZE}
          strokeWidth={2}
          className="stroke-white/70"
        />
      ))}
    </svg>
  );
}
