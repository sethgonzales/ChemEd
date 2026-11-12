import {
  SUBSHELL_ORDER,
  electronsLabel,
  orbitalDiagram,
  type Occupancy,
} from '~/utils/electron-configurations';

const ARROW = { up: '↑', down: '↓' } as const;

interface Props {
  occupancy: Occupancy;
}

/**
 * Boxes for orbitals and arrows for electrons, stacked by energy with the
 * lowest at the bottom, so the filling order reads upwards.
 */
export default function OrbitalDiagram({ occupancy }: Props) {
  const highest = Math.max(
    0,
    ...occupancy
      .filter((o) => o.electrons > 0)
      .map((o) => SUBSHELL_ORDER.indexOf(o.subshell)),
  );
  // every subshell up to the highest filled one, so gaps show (Pd has no 5s)
  const rows = orbitalDiagram(
    SUBSHELL_ORDER.slice(0, highest + 1).map((subshell) => ({
      subshell,
      electrons: occupancy.find((o) => o.subshell === subshell)?.electrons ?? 0,
    })),
  ).reverse();

  return (
    <ol aria-label="Orbital diagram" className="flex flex-col gap-1.5">
      {rows.map(({ subshell, boxes }) => (
        <li
          key={subshell}
          data-subshell={subshell}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="w-7 shrink-0 text-right text-sm font-bold"
          >
            {subshell}
          </span>
          <span className="sr-only">
            {subshell}: {electronsLabel(boxes.flat().length)}
          </span>
          <span aria-hidden="true" className="flex flex-wrap gap-0.5">
            {boxes.map((spins, i) => (
              <span
                key={i}
                data-box
                className="pixel-control flex size-7 sm:size-8 items-center justify-center bg-primary-700 text-lg font-bold leading-none text-secondary-500 shadow-[inset_0_0_0_2px_var(--color-primary-300)]"
              >
                {spins.map((spin, j) => (
                  <span key={j}>{ARROW[spin]}</span>
                ))}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
