import { type CSSProperties, useRef } from 'react';
import { IElementData } from '~/types';
import { cn } from '~/utils/cn';
import {
  elementAt,
  elementColor,
  neighbor,
  type ColorMode,
  type Direction,
} from '~/utils/periodic-table';

const DIMMED_OPACITY = 0.25; // elements that don't match a search

const NAME_FIT_CHARS = 8; // names this long or shorter fit a cell at full size

// the name's font size in cqi: smaller for longer names so every name fits
const nameSize = (name: string) => Math.min(1, NAME_FIT_CHARS / name.length);

const ARROWS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

const MAIN_ROWS = [1, 2, 3, 4, 5, 6, 7];
const F_ROWS = [9, 10]; // lanthanides and actinides, drawn apart
const COLS = Array.from({ length: 18 }, (_, i) => i + 1);

export const blockColor = (el: IElementData) => elementColor(el, 'block');

function ElementCell({
  element,
  isSelected,
  tabStop,
  compact,
  color,
  dimmed,
  onSelect,
}: {
  element: IElementData;
  isSelected: boolean;
  tabStop: boolean; // the one cell Tab lands on
  compact: boolean;
  color: string;
  dimmed: boolean;
  onSelect: (el: IElementData, focus?: boolean) => void;
}) {
  return (
    <button
      onClick={() => onSelect(element)}
      onKeyDown={(e) => {
        const next = ARROWS[e.key] && neighbor(element, ARROWS[e.key]);
        if (!next) return;
        e.preventDefault();
        onSelect(next, true);
      }}
      aria-pressed={isSelected}
      // symbols alone don't say much to a screen reader
      aria-label={compact ? element.name : undefined}
      // one Tab stop for the whole table; arrows move between elements
      tabIndex={tabStop ? 0 : -1}
      data-atomic-number={element.atomicNumber}
      style={{ backgroundColor: color, opacity: dimmed ? DIMMED_OPACITY : 1 }}
      className={cn(
        'pixel-control flex flex-col items-center justify-center cursor-pointer',
        'w-full aspect-square text-white hover:brightness-125',
        'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]',
        compact ? 'p-0' : 'py-2 px-1',
        isSelected && 'brightness-125 shadow-[inset_0_0_0_3px_white]',
      )}
    >
      {compact ? (
        <span className="text-[2.4cqi] font-bold leading-none">
          {element.symbol}
        </span>
      ) : (
        <>
          <span className="text-[1.8cqi] opacity-60 leading-none">
            {element.atomicNumber}
          </span>
          <span className="text-[2.5cqi] font-bold leading-tight">
            {element.symbol}
          </span>
          {/* long names get a smaller font so they fit; no measuring needed */}
          <span
            className="opacity-60 leading-none w-full text-center whitespace-nowrap text-[calc(var(--name-size)*1cqi)]"
            style={{ '--name-size': nameSize(element.name) } as CSSProperties}
          >
            {element.name}
          </span>
        </>
      )}
    </button>
  );
}

interface Props {
  selected: IElementData | null; // none yet: Tab lands on hydrogen
  onSelect: (el: IElementData) => void;
  compact?: boolean; // symbols only, for a picker
  minWidth: number; // px; narrower screens scroll the table, not the page
  colorMode?: ColorMode;
  matches?: IElementData[] | null; // a search's results; the rest are dimmed
}

/** All 118 elements in the standard layout, coloured by mode, with arrow keys */
export default function PeriodicGrid({
  selected,
  onSelect,
  compact = false,
  minWidth,
  colorMode = 'block',
  matches = null,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const select = (el: IElementData, focus = false) => {
    onSelect(el);
    if (focus) {
      tableRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-atomic-number="${el.atomicNumber}"]`,
        )
        ?.focus();
    }
  };

  const grid = (rows: number[]) => (
    <div className="overflow-x-auto @container">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', minWidth }}
      >
        {rows.map((row) =>
          COLS.map((col) => {
            const el = elementAt(col, row);
            return el ? (
              <ElementCell
                key={el.atomicNumber}
                element={el}
                isSelected={selected?.atomicNumber === el.atomicNumber}
                tabStop={(selected?.atomicNumber ?? 1) === el.atomicNumber}
                compact={compact}
                color={elementColor(el, colorMode)}
                dimmed={!!matches && !matches.includes(el)}
                onSelect={select}
              />
            ) : (
              <div key={`empty-${col}-${row}`} />
            );
          }),
        )}
      </div>
    </div>
  );

  return (
    <div ref={tableRef} className="flex-1 min-w-0 flex flex-col gap-2">
      {grid(MAIN_ROWS)}
      {grid(F_ROWS)}
    </div>
  );
}
