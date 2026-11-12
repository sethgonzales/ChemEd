import Link from 'next/link';
import { useMemo, useState } from 'react';

import { findElementsBySymbol, formatAtomicMass } from '~/utils';
import { ThemeSelect } from '~/components/theme-select';
import MuteButton from '~/components/mute-button';
import { useBloop } from '~/utils/sounds';

import { IElementData } from '~/types';

const COLORS = ['#36b6c2', '#ff4733', '#efb814', '#70b858', '#1aabb9'];
const HEADER_ELEMENTS = ['C', 'He', 'Mn', 'Eu', 'Db'];

const getColorByElement = (atomicNumber: number) =>
  COLORS[atomicNumber % COLORS.length];

function ElementCard({ element }: { element: IElementData }) {
  const [color, setColor] = useState(getColorByElement(element.atomicNumber));

  // a new colour on the way in and out; silent, since sounds are for clicks
  const shuffle = () =>
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const hideSecondLetter = ['Mn', 'Eu', 'Db'].includes(element.symbol);

  return (
    <div
      className="w-14 h-20 sm:w-16 sm:h-21 flex flex-col gap-0.5 items-center justify-center font-pixel text-xs truncate text-center text-white pixel-control hover:translate-y-1.5 transition-transform duration-200"
      style={{ backgroundColor: color }}
      onMouseEnter={shuffle}
      onMouseLeave={shuffle}
    >
      <h5 className="opacity-50">{element.atomicNumber}</h5>
      <h1 className="text-2xl leading-6">
        {hideSecondLetter ? (
          <>
            <span>{element.symbol[0]}</span>
            <span className="opacity-30">{element.symbol[1]}</span>
          </>
        ) : (
          element.symbol
        )}
      </h1>
      <h5 className="opacity-50 truncate w-full">{element.name}</h5>
      <h5 className="opacity-50">{formatAtomicMass(element.atomicMass, 2)}</h5>
    </div>
  );
}

export default function Header() {
  const elements = useMemo<IElementData[]>(() => {
    return findElementsBySymbol(HEADER_ELEMENTS) as IElementData[];
  }, []);
  const playBloop = useBloop();

  return (
    <header className="flex flex-col sm:flex-row gap-4 justify-between items-center sm:items-end w-full py-4 px-6 bg-primary-500 text-secondary-500 sticky top-0 z-999">
      <Link
        href="/"
        aria-label="ChemEd home"
        onClick={playBloop}
        className="flex flex-row gap-1"
      >
        {elements?.map((e) => (
          <ElementCard key={e.atomicNumber} element={e} />
        ))}
      </Link>
      <div className="flex gap-2 w-full sm:w-auto">
        <ThemeSelect />
        <MuteButton />
      </div>
      <div
        aria-hidden="true"
        className="ooze-drips absolute inset-x-0 top-full"
      />
    </header>
  );
}
