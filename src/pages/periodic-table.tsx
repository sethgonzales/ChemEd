import { type ReactNode, useState } from 'react';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import PeriodicGrid from '~/components/periodic-grid';
import Stage from '~/components/stage';
import {
  BLOCK_COLORS,
  CATEGORY_COLORS,
  NO_DATA_COLOR,
  TREND_STOPS,
} from '~/constants/blocks';
import { COVALENT_RADIUS } from '~/constants/covalent-radius';
import { ELECTRONEGATIVITY } from '~/constants/electronegativity';
import { ELEMENTS } from '~/constants/elements';
import { IElementData } from '~/types';
import { formatAtomicMass } from '~/utils';
import {
  elementCategory,
  elementColor,
  searchElements,
  trendRange,
  type ColorMode,
} from '~/utils/periodic-table';

const COLOR_MODES: Record<ColorMode, string> = {
  block: 'Block',
  category: 'Metals and nonmetals',
  electronegativity: 'Electronegativity',
  radius: 'Atomic radius',
};

const CATEGORY_LABELS = {
  metal: 'Metal',
  metalloid: 'Metalloid',
  nonmetal: 'Nonmetal',
  unknown: 'Unknown',
};

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

function ElementDetail({
  element,
  colorMode,
}: {
  element: IElementData;
  colorMode: ColorMode;
}) {
  const electronegativity = ELECTRONEGATIVITY[element.symbol];
  const radius = COVALENT_RADIUS[element.symbol];
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
    { label: 'Type', value: CATEGORY_LABELS[elementCategory(element)] },
    {
      label: 'Electronegativity',
      value: electronegativity?.toFixed(2) ?? 'Unknown',
    },
    {
      label: 'Covalent Radius',
      value: radius ? `${radius} pm` : 'Unknown',
    },
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
          style={{ backgroundColor: elementColor(element, colorMode) }}
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
            className="flex justify-between gap-3 py-1.5 border-b border-white/10"
          >
            <span className="text-white/60 text-sm">{d.label}</span>
            <span className="text-white font-medium text-sm text-right">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-3.5" style={{ backgroundColor: color }} />
      <span className="text-sm text-white/80">{label}</span>
    </div>
  );
}

// trend modes: the scale's ends, with units
const TREND_LEGEND = {
  electronegativity: { title: 'Pauling scale', format: (v: number) => `${v}` },
  radius: { title: 'Covalent radius', format: (v: number) => `${v} pm` },
};

function Legend({ colorMode }: { colorMode: ColorMode }) {
  let swatches: { color: string; label: string }[];
  if (colorMode === 'block') {
    swatches = Object.entries(BLOCK_COLORS).map(([block, color]) => ({
      color,
      label: `${block}-block`,
    }));
  } else if (colorMode === 'category') {
    swatches = [
      ...Object.entries(CATEGORY_COLORS).map(([category, color]) => ({
        color,
        label: CATEGORY_LABELS[category as keyof typeof CATEGORY_COLORS],
      })),
      { color: NO_DATA_COLOR, label: CATEGORY_LABELS.unknown },
    ];
  } else {
    const { min, max } = trendRange(colorMode);
    const { title, format } = TREND_LEGEND[colorMode];
    return (
      <div
        data-testid="legend"
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        <span className="text-sm text-white/80">{title}</span>
        <div className="flex items-center gap-1.5 text-sm text-white/80">
          <span>{format(min)}</span>
          <div
            className="w-24 h-3.5"
            style={{
              backgroundImage: `linear-gradient(to right, ${TREND_STOPS.join(', ')})`,
            }}
          />
          <span>{format(max)}</span>
        </div>
        <Swatch color={NO_DATA_COLOR} label="No data" />
      </div>
    );
  }

  return (
    <div data-testid="legend" className="flex gap-3 flex-wrap">
      {swatches.map(({ color, label }) => (
        <Swatch key={label} color={color} label={label} />
      ))}
    </div>
  );
}

function matchCount(count: number) {
  if (count === 0) return 'No matches';
  return count === 1 ? '1 match' : `${count} matches`;
}

const hydrogen = ELEMENTS[0];

export default function PeriodicTable() {
  const [selected, setSelected] = useState<IElementData>(hydrogen);
  const [colorMode, setColorMode] = useState<ColorMode>('block');
  const [query, setQuery] = useState('');
  const matches = query.trim() ? searchElements(query) : null;

  return (
    <Container
      backHref="/"
      header="Periodic Table"
      description="Click any element to see its details, or search for one. Colour the table to see its patterns."
      className="gap-4"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Dropdown
          label={`Colour: ${COLOR_MODES[colorMode]}`}
          className="w-full sm:w-64"
          menuClassName="w-64"
        >
          {Object.entries(COLOR_MODES).map(([mode, label]) => (
            <DropdownItem
              key={mode}
              selected={mode === colorMode}
              onSelect={() => setColorMode(mode as ColorMode)}
            >
              {label}
            </DropdownItem>
          ))}
        </Dropdown>
        <input
          type="search"
          aria-label="Search elements"
          placeholder="Name, symbol or number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches?.length) setSelected(matches[0]);
          }}
          className="pixel-control w-full sm:w-64 bg-primary-700 px-3 pt-2 pb-2.5 text-sm text-white placeholder:text-white/60 hover:bg-primary-800 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]"
        />
        <span role="status" className="text-sm">
          {matches && matchCount(matches.length)}
        </span>
      </div>

      <Stage label="Periodic table" header={<Legend colorMode={colorMode} />}>
        <div className="flex flex-col lg:flex-row gap-4">
          <PeriodicGrid
            selected={selected}
            onSelect={setSelected}
            minWidth={540}
            colorMode={colorMode}
            matches={matches}
          />

          {/* Detail panel */}
          <div className="lg:w-72 h-fit shrink-0">
            <ElementDetail element={selected} colorMode={colorMode} />
          </div>
        </div>
      </Stage>
    </Container>
  );
}
