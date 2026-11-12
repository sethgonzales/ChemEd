import { type ReactNode, useState } from 'react';
import Container from '~/components/container';
import PeriodicGrid, { blockColor } from '~/components/periodic-grid';
import Stage from '~/components/stage';
import { BLOCK_COLORS } from '~/constants/blocks';
import { ELEMENTS } from '~/constants/elements';
import { IElementData } from '~/types';
import { formatAtomicMass } from '~/utils';

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

  return (
    <Container
      backHref="/"
      header="Periodic Table"
      description="Click any element to see its details. The colours show each element’s block."
      className="gap-4"
    >
      <Stage label="Periodic table" header={<Legend />}>
        <div className="flex flex-col lg:flex-row gap-4">
          <PeriodicGrid
            selected={selected}
            onSelect={setSelected}
            minWidth={540}
          />

          {/* Detail panel */}
          <div className="lg:w-72 h-fit shrink-0">
            <ElementDetail element={selected} />
          </div>
        </div>
      </Stage>
    </Container>
  );
}
