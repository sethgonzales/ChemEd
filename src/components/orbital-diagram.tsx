import { cn } from '~/utils/cn';
import {
  SUBSHELL_ORDER,
  arrowKey,
  electronsLabel,
  newArrows,
  orbitalDiagram,
  type Diagram,
  type Occupancy,
  type Spin,
} from '~/utils/electron-configurations';

const ARROW = { up: '↑', down: '↓' } as const;

const BOX =
  'pixel-control flex size-7 sm:size-8 items-center justify-center bg-primary-700 text-lg font-bold leading-none text-secondary-500 shadow-[inset_0_0_0_2px_var(--color-primary-300)]';

const describeSpins = (spins: Spin[]) =>
  spins.length ? spins.join(' and ') : 'empty';

/** Every subshell up to the highest filled one, so gaps show (Pd has no 5s) */
function rowsFor(occupancy: Occupancy): Diagram {
  const highest = Math.max(
    0,
    ...occupancy
      .filter((o) => o.electrons > 0)
      .map((o) => SUBSHELL_ORDER.indexOf(o.subshell)),
  );
  return orbitalDiagram(
    SUBSHELL_ORDER.slice(0, highest + 1).map((subshell) => ({
      subshell,
      electrons: occupancy.find((o) => o.subshell === subshell)?.electrons ?? 0,
    })),
  );
}

type Props =
  | {
      occupancy: Occupancy; // shown by Hund's rule
      previous?: Occupancy; // the element stepped from: its new electrons drop in
      diagram?: never;
      onBox?: never;
      flagged?: never;
    }
  | {
      diagram: Diagram; // a student's drawing
      onBox: (subshell: string, box: number) => void;
      flagged?: string[]; // subshells with problems, marked red
      occupancy?: never;
      previous?: never;
    };

/**
 * Boxes for orbitals and arrows for electrons, stacked by energy with the
 * lowest at the bottom, so the filling order reads upwards. With `onBox`, the
 * boxes are buttons for drawing.
 */
export default function OrbitalDiagram(props: Props) {
  const { occupancy, previous, onBox, flagged = [] } = props;
  const arriving = new Set(
    occupancy && previous ? newArrows(previous, occupancy) : [],
  );
  const rows = [...(props.diagram ?? rowsFor(occupancy!))].reverse();

  return (
    <ol aria-label="Orbital diagram" className="flex flex-col gap-1.5">
      {rows.map(({ subshell, boxes }) => {
        const problem = flagged.includes(subshell);
        return (
          <li
            key={subshell}
            data-subshell={subshell}
            data-problem={problem || undefined}
            className={cn(
              'flex items-center gap-2 w-fit pr-1',
              problem && 'bg-red-500/25 text-red-100',
            )}
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
            <span
              aria-hidden={onBox ? undefined : true}
              className="flex flex-wrap gap-0.5"
            >
              {boxes.map((spins, i) => {
                const arrows = spins.map((spin, j) => {
                  const isNew = arriving.has(arrowKey(subshell, i, spin));
                  return (
                    <span
                      key={j}
                      data-new={isNew || undefined}
                      className={isNew ? 'electron-drop' : undefined}
                    >
                      {ARROW[spin]}
                    </span>
                  );
                });
                return onBox ? (
                  <button
                    key={i}
                    type="button"
                    data-box
                    aria-label={`${subshell} box ${i + 1}: ${describeSpins(spins)}`}
                    onClick={() => onBox(subshell, i)}
                    className={cn(
                      BOX,
                      'cursor-pointer hover:bg-primary-800 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_white]',
                    )}
                  >
                    {arrows}
                  </button>
                ) : (
                  <span key={i} data-box className={BOX}>
                    {arrows}
                  </span>
                );
              })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
