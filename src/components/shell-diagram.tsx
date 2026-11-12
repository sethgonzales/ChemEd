import {
  newShellElectrons,
  ringPositions,
  shellCounts,
  type Occupancy,
} from '~/utils/electron-configurations';

const NUCLEUS_R = 22;
const FIRST_RING_R = 42; // shell 1
const RING_GAP = 17; // between shells
const MIN_SHELLS_SHOWN = 4; // light atoms keep one size, so stepping H to Ar doesn't zoom
const MARGIN = 8;
const ELECTRON_R = 4;

interface Props {
  symbol: string;
  occupancy: Occupancy;
  previous?: Occupancy; // the element stepped from: its new electrons drop in
}

/** The Bohr picture: the nucleus with each shell's electrons on a ring */
export default function ShellDiagram({ symbol, occupancy, previous }: Props) {
  const shells = shellCounts(occupancy);
  const arriving = previous
    ? newShellElectrons(shellCounts(previous), shells)
    : shells.map(() => 0);
  // fit the outermost ring, so heavy and light atoms both fill the space
  const half =
    FIRST_RING_R +
    (Math.max(shells.length, MIN_SHELLS_SHOWN) - 1) * RING_GAP +
    ELECTRON_R +
    MARGIN;
  const label = `Bohr model of ${symbol}: ${shells
    .map((n, i) =>
      i === 0 ? `${n} electrons in shell 1` : `${n} in shell ${i + 1}`,
    )
    .join(', ')}`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-half} ${-half} ${2 * half} ${2 * half}`}
      className="w-full max-w-80 mx-auto"
    >
      {shells.map((count, i) => {
        const r = FIRST_RING_R + i * RING_GAP;
        return (
          <g key={i}>
            <circle
              data-ring
              r={r}
              fill="none"
              strokeWidth={1.5}
              className="stroke-primary-300"
            />
            {ringPositions(count, r).map(({ x, y }, j) => {
              // the last electrons placed on a ring are the ones that arrived
              const isNew = j >= count - arriving[i];
              return (
                <circle
                  key={j}
                  data-electron
                  data-shell={i + 1}
                  data-new={isNew || undefined}
                  cx={x}
                  cy={y}
                  r={ELECTRON_R}
                  className={
                    isNew
                      ? 'fill-secondary-500 electron-drop'
                      : 'fill-secondary-500'
                  }
                />
              );
            })}
          </g>
        );
      })}
      <circle r={NUCLEUS_R} className="fill-primary-700 stroke-primary-300" />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-bold text-base"
      >
        {symbol}
      </text>
    </svg>
  );
}
