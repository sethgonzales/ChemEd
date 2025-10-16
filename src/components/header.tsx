import Link from 'next/link';
import { useMemo, useState } from 'react';

import { findElementsBySymbol } from '~/utils';
import { ThemeSelect } from '~/components/theme-select';

import { IElementData } from '~/types';

const COLORS = ['#36b6c2', '#ff4733', '#efb814', '#70b858', '#1aabb9'];
const HEADER_ELEMENTS = ['C', 'He', 'Mn', 'Eu', 'Db'];

const getColorByElement = (atomicNumber: number) =>
  COLORS[atomicNumber % COLORS.length];

function ElementCard({ element }: { element: IElementData }) {
  const [color, setColor] = useState(getColorByElement(element.atomicNumber));

  const handleHover = () =>
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const handleHoverOut = () =>
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const hideSecondLetter = ['Mn', 'Eu', 'Db'].includes(element.symbol);

  return (
    <div
      className="w-14 h-20 sm:w-16 sm:h-21 flex flex-col gap-0.5 items-center justify-center text-xs truncate text-center text-white rounded-sm hover:translate-y-1.5 transition-transform duration-200"
      style={{ backgroundColor: color }}
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverOut}
    >
      <h5 className="opacity-50">{element.atomicNumber}</h5>
      <h1 className="font-semibold text-xl">
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
      <h5 className="opacity-50">
        {element.atomicMass?.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </h5>
    </div>
  );
}

export default function Header() {
  const elements = useMemo<IElementData[]>(() => {
    return findElementsBySymbol(HEADER_ELEMENTS) as IElementData[];
  }, []);

  return (
    <Link href="/">
      <header className="flex flex-col sm:flex-row gap-4 justify-between items-center sm:items-end w-full py-4 px-6 bg-primary-500 text-secondary-500 sticky top-0 z-999 cursor-pointer">
        <div className="flex flex-row gap-1">
          {elements?.map((e) => (
            <ElementCard key={e.atomicNumber} element={e} />
          ))}
        </div>
        <ThemeSelect />
      </header>
    </Link>
  );
}
