import { type ReactNode, useRef, useState, useEffect } from 'react';
import Container from '~/components/container';
import { ELEMENTS } from '~/constants/elements';
import { IElementData } from '~/types';
import { cn } from '~/utils/cn';

const BLOCK_COLORS: Record<string, string> = {
  s: 'bg-red-400/60 hover:bg-red-400/80',
  p: 'bg-yellow-400/60 hover:bg-yellow-400/80',
  d: 'bg-blue-400/60 hover:bg-blue-400/80',
  f: 'bg-green-400/60 hover:bg-green-400/80',
};

/**
 * Map each element to its (col, row) in the standard 18-column periodic table.
 * Lanthanides (58-71) go in row 9, Actinides (90-103) go in row 10.
 */
function getGridPosition(el: IElementData): { col: number; row: number } {
  const { atomicNumber, period, group } = el;

  // Lanthanides: Ce(58) through Lu(71) -> row 9, cols 4-17
  if (atomicNumber >= 58 && atomicNumber <= 71) {
    return { col: atomicNumber - 58 + 4, row: 9 };
  }
  // Actinides: Th(90) through Lr(103) -> row 10, cols 4-17
  if (atomicNumber >= 90 && atomicNumber <= 103) {
    return { col: atomicNumber - 90 + 4, row: 10 };
  }

  if (group !== null) {
    return { col: group, row: period };
  }

  // Fallback (shouldn't happen with our data)
  return { col: 1, row: period };
}

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
  onSelect: (el: IElementData) => void;
}) {
  const blockColor = BLOCK_COLORS[element.block ?? ''] ?? 'bg-gray-400/60';
  const nameRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = nameRef.current;
    const btn = btnRef.current;
    if (!el || !btn) return;

    const fit = () => {
      el.style.transform = '';
      const style = getComputedStyle(btn);
      const padding =
        (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) * 3;
      const availW = btn.clientWidth - padding;
      const textW = el.scrollWidth;
      if (textW > availW) {
        el.style.transform = `scaleX(${availW / textW})`;
      }
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [element.name]);

  return (
    <button
      ref={btnRef}
      onClick={() => onSelect(element)}
      className={cn(
        'flex flex-col items-center justify-center py-2 px-1 rounded-sm cursor-pointer transition-colors duration-150',
        'w-full aspect-square text-white',
        blockColor,
        isSelected && 'brightness-150',
      )}
    >
      <span className="text-[1.8cqi] opacity-60 leading-none">
        {element.atomicNumber}
      </span>
      <span className="text-[2.5cqi] font-bold leading-tight">
        {element.symbol}
      </span>
      <span className="opacity-60 leading-none w-full text-center overflow-hidden whitespace-nowrap text-[1cqi]">
        <span ref={nameRef} className="inline-block origin-center">
          {element.name}
        </span>
      </span>
    </button>
  );
}

function ElementDetail({ element }: { element: IElementData }) {
  const blockColor = BLOCK_COLORS[element.block ?? ''] ?? 'bg-gray-400/60';

  const details: { label: string; value: ReactNode }[] = [
    { label: 'Atomic Number', value: String(element.atomicNumber) },
    { label: 'Symbol', value: element.symbol },
    { label: 'Name', value: element.name },
    {
      label: 'Atomic Mass',
      value: element.atomicMass
        ? element.atomicMass.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })
        : 'Unknown',
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
    <div className="bg-primary-600 rounded-xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={cn(
            'w-16 h-16 rounded-lg flex items-center justify-center text-white shrink-0',
            blockColor,
          )}
        >
          <span className="text-3xl font-bold">{element.symbol}</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{element.name}</h2>
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
  ];

  return (
    <div className="flex gap-3 flex-wrap">
      {blocks.map(({ block, label }) => (
        <div key={block} className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-3 h-3 rounded-sm',
              BLOCK_COLORS[block]?.replace('hover:bg-', ''),
            )}
          />
          <span className="text-xs text-white/60">{label}</span>
        </div>
      ))}
    </div>
  );
}

const hydrogen = ELEMENTS[0];

export default function PeriodicTable() {
  const [selected, setSelected] = useState<IElementData>(hydrogen);

  // Build grid lookup: key = "col-row"
  const gridMap = new Map<string, IElementData>();
  for (const el of ELEMENTS) {
    const pos = getGridPosition(el);
    gridMap.set(`${pos.col}-${pos.row}`, el);
  }

  const mainRows = [1, 2, 3, 4, 5, 6, 7];
  const extraRows = [9, 10];
  const cols = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <Container header="Periodic Table" className="gap-4">
      <Legend />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
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
                  const el = gridMap.get(`${col}-${row}`);
                  return el ? (
                    <ElementCell
                      key={el.atomicNumber}
                      element={el}
                      isSelected={selected.atomicNumber === el.atomicNumber}
                      onSelect={setSelected}
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
                  const el = gridMap.get(`${col}-${row}`);
                  if (col < 4 || col > 17) {
                    return <div key={`empty-${col}-${row}`} />;
                  }
                  return el ? (
                    <ElementCell
                      key={el.atomicNumber}
                      element={el}
                      isSelected={selected.atomicNumber === el.atomicNumber}
                      onSelect={setSelected}
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
    </Container>
  );
}
