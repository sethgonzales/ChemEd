import Link from 'next/link';
import { useMemo, useState } from 'react';

import { findElementsBySymbol, formatAtomicMass } from '~/utils';
import { cn } from '~/utils/cn';
import { useCompactHeader } from '~/utils/compact-header';
import { ThemeSelect } from '~/components/theme-select';
import FontButton from '~/components/font-button';
import VolumeButton from '~/components/volume-button';
import { useBloop } from '~/utils/sounds';

import { IElementData } from '~/types';

const COLORS = ['#36b6c2', '#ff4733', '#efb814', '#70b858', '#1aabb9'];
const HEADER_ELEMENTS = ['C', 'He', 'Mn', 'Eu', 'Db'];

const getColorByElement = (atomicNumber: number) =>
  COLORS[atomicNumber % COLORS.length];

function ElementCard({
  element,
  compact,
}: {
  element: IElementData;
  compact: boolean; // just the symbol, scrolled down the page
}) {
  const [color, setColor] = useState(getColorByElement(element.atomicNumber));

  // a new colour on the way in and out; silent, since sounds are for clicks
  const shuffle = () =>
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const hideSecondLetter = ['Mn', 'Eu', 'Db'].includes(element.symbol);

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 items-center justify-center font-pixel text-xs truncate text-center text-white pixel-control transition-all duration-200',
        compact
          ? 'w-7 h-9 sm:w-9 hover:translate-y-0.5'
          : 'w-14 h-20 sm:w-16 sm:h-21 hover:translate-y-1.5',
      )}
      style={{ backgroundColor: color }}
      onMouseEnter={shuffle}
      onMouseLeave={shuffle}
    >
      {!compact && <h5 className="opacity-50">{element.atomicNumber}</h5>}
      <h1 className={compact ? 'text-base leading-none' : 'text-2xl leading-6'}>
        {hideSecondLetter ? (
          <>
            <span>{element.symbol[0]}</span>
            <span className="opacity-30">{element.symbol[1]}</span>
          </>
        ) : (
          element.symbol
        )}
      </h1>
      {!compact && (
        <>
          <h5 className="opacity-50 truncate w-full">{element.name}</h5>
          <h5 className="opacity-50">
            {formatAtomicMass(element.atomicMass, 2)}
          </h5>
        </>
      )}
    </div>
  );
}

export default function Header({ page }: { page: string }) {
  const elements = useMemo<IElementData[]>(() => {
    return findElementsBySymbol(HEADER_ELEMENTS) as IElementData[];
  }, []);
  const playBloop = useBloop();
  // one slim row inside a simulation, and on the home page once it scrolls,
  // giving the page back
  const [scrolled, ref] = useCompactHeader();
  const compact = scrolled || page !== '/';

  return (
    <header
      ref={ref}
      className={cn(
        'flex justify-between items-center w-full bg-primary-500 text-secondary-500 sticky top-0 z-999 transition-[padding] duration-200',
        compact
          ? 'flex-row gap-2 sm:gap-4 py-2 px-4 sm:px-6'
          : 'flex-col sm:flex-row sm:items-end gap-4 py-4 px-6',
      )}
    >
      <Link
        href="/"
        aria-label="ChemEd home"
        onClick={playBloop}
        className="flex flex-row gap-1 shrink-0"
      >
        {elements?.map((e) => (
          <ElementCard key={e.atomicNumber} element={e} compact={compact} />
        ))}
      </Link>
      <div
        className={cn(
          'flex gap-2',
          compact
            ? 'flex-1 min-w-0 justify-end sm:flex-none'
            : 'w-full sm:w-auto',
        )}
      >
        {/* the picker gives way, truncating, so the tiles keep their room */}
        <div className="flex-1 min-w-0 sm:flex-none">
          <ThemeSelect />
        </div>
        <FontButton />
        <VolumeButton />
      </div>
      <div
        aria-hidden="true"
        className="ooze-drips absolute inset-x-0 top-full"
      />
    </header>
  );
}
