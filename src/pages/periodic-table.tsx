import { type CSSProperties, type ReactNode, useRef, useState } from 'react';
import Container from '~/components/container';
import Stage from '~/components/stage';
import { BLOCK_COLORS } from '~/constants/blocks';
import { ELEMENTS } from '~/constants/elements';
import { IElementData } from '~/types';
import { formatAtomicMass } from '~/utils';
import { cn } from '~/utils/cn';
import { elementAt, neighbor, type Direction } from '~/utils/periodic-table';

const NAME_FIT_CHARS = 8; // names this long or shorter fit a cell at full size

// the name's font size in cqi: smaller for longer names so every name fits
const nameSize = (name: string) => Math.min(1, NAME_FIT_CHARS / name.length);

const ARROWS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

const blockColor = (el: IElementData) =>
  el.block ? BLOCK_COLORS[el.block] : '#4b5563';

function formatElectronConfig(config: string | null): ReactNode {
  if (!config) return 'Unknown';
  return config.split(/\s+/).map((token, i) => {
    if (token.startsWith('[')) {
      return <span key={i}>{token} </span>;
    }
    const match = token.match(/^(\d+[spdf])(\d+)$/);
    if (match) {
      return (
        <span key={i}>
          {match[1]}
          <sup>{match[2]}</sup>{' '}
        </span>
      );
    }
    return <span key={i}>{token} </span>;
  });
}

function ElementCell({
  element,
  isSelected,
  onSelect,
}: {
  element: IElementData;
  isSelected: boolean;
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
      // one Tab stop for the whole table; arrows move between elements
      tabIndex={isSelected ? 0 : -1}
      data-atomic-number={element.atomicNumber}
      style={{ backgroundColor: blockColor(element) }}
      className={cn(
        'pixel-control flex flex-col items-center justify-center py-2 px-1 cursor-pointer',
        'w-full aspect-square text-white hover:brightness-125',
        'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]',
        isSelected && 'brightness-125 shadow-[inset_0_0_0_3px_white]',
      )}
    >
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
    </button>
  );
}

function ElementDetail({ element }: { element: IElementData }) {
  const details: { label: string; value: ReactNode }[] = [
    { label: 'Atomic Number', value: String(element.atomicNumber) },
    { label: 'Symbol', value: element.symbol },
    { label: 'Name', value: element.name },
    {
      label: 'Atomic Mass',
      value: formatAtomicMass(element.atomicMass, 6, 2),
    },
    { label: 'Period', value: String(element.period) },
    { label: 'Group', value: element.group ? String(element.group) : 'N/A' },
    { label: 'Block', value: element.block ?? 'Unknown' },
    {
      label: 'Electron Configuration',
      value: formatElectronConfig(element.electronConfiguration),
    },
  ];

  return (
    <div className="pixel-control bg-primary-700 p-5">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="pixel-control w-16 h-16 flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: blockColor(element) }}
        >
          <span className="text-3xl font-bold">{element.symbol}</span>
        </div>
        <div>
          <h2 className="font-pixel text-2xl text-white">{element.name}</h2>
          <p className="text-sm text-white/60">
            Element {element.atomicNumber}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {details.map((d) => (
          <div
            key={d.label}
            className="flex justify-between py-1.5 border-b border-white/10"
          >
            <span className="text-white/60 text-sm">{d.label}</span>
            <span className="text-white font-medium text-sm">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const blocks = [
    { block: 's', label: 's-block' },
    { block: 'p', label: 'p-block' },
    { block: 'd', label: 'd-block' },
    { block: 'f', label: 'f-block' },
  ] as const;

  return (
    <div className="flex gap-3 flex-wrap">
      {blocks.map(({ block, label }) => (
        <div key={block} className="flex items-center gap-1.5">
          <div
            className="w-3.5 h-3.5"
            style={{ backgroundColor: BLOCK_COLORS[block] }}
          />
          <span className="text-sm text-white/80">{label}</span>
        </div>
      ))}
    </div>
  );
}

const hydrogen = ELEMENTS[0];

export default function PeriodicTable() {
  const [selected, setSelected] = useState<IElementData>(hydrogen);
  const tableRef = useRef<HTMLDivElement>(null);
  const select = (el: IElementData, focus = false) => {
    setSelected(el);
    if (focus) {
      tableRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-atomic-number="${el.atomicNumber}"]`,
        )
        ?.focus();
    }
  };

  const mainRows = [1, 2, 3, 4, 5, 6, 7];
  const extraRows = [9, 10];
  const cols = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <Container
      backHref="/"
      header="Periodic Table"
      description="Click any element to see its details. The colours show each element’s block."
      className="gap-4"
    >
      <Stage label="Periodic table" header={<Legend />}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Table */}
          <div ref={tableRef} className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Main table */}
            <div className="overflow-x-auto @container">
              <div
                className="grid gap-0.5 min-w-[540px]"
                style={{
                  gridTemplateColumns: 'repeat(18, minmax(0, 1fr))',
                }}
              >
                {mainRows.map((row) =>
                  cols.map((col) => {
                    const el = elementAt(col, row);
                    return el ? (
                      <ElementCell
                        key={el.atomicNumber}
                        element={el}
                        isSelected={selected.atomicNumber === el.atomicNumber}
                        onSelect={select}
                      />
                    ) : (
                      <div key={`empty-${col}-${row}`} />
                    );
                  }),
                )}
              </div>
            </div>

            {/* Lanthanides & Actinides */}
            <div className="overflow-x-auto @container">
              <div
                className="grid gap-0.5 min-w-[540px]"
                style={{
                  gridTemplateColumns: 'repeat(18, minmax(0, 1fr))',
                }}
              >
                {extraRows.map((row) =>
                  cols.map((col) => {
                    const el = elementAt(col, row);
                    if (col < 4 || col > 17) {
                      return <div key={`empty-${col}-${row}`} />;
                    }
                    return el ? (
                      <ElementCell
                        key={el.atomicNumber}
                        element={el}
                        isSelected={selected.atomicNumber === el.atomicNumber}
                        onSelect={select}
                      />
                    ) : (
                      <div key={`empty-${col}-${row}`} />
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:w-72 h-fit shrink-0">
            <ElementDetail element={selected} />
          </div>
        </div>
      </Stage>
    </Container>
  );
}
