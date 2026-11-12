import { useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Button from '~/components/button';
import Container from '~/components/container';
import OrbitalDiagram from '~/components/orbital-diagram';
import PeriodicGrid, { blockColor } from '~/components/periodic-grid';
import Stage from '~/components/stage';
import { ELEMENTS } from '~/constants/elements';
import type { IElementData } from '~/types';
import {
  aufbauConfiguration,
  electronsLabel,
  formatConfiguration,
  groundState,
  isException,
  shellCounts,
  type Occupancy,
} from '~/utils/electron-configurations';

const PICKER_MIN_WIDTH = 280; // px; fits a phone, where Previous and Next help too

const dCount = (occ: Occupancy) =>
  occ.filter((o) => o.subshell.endsWith('d')).map((o) => o.electrons);

/** Why an exception happens, where school chemistry has a reason for it */
function exceptionReason(actual: Occupancy, predicted: Occupancy) {
  const before = dCount(predicted);
  const after = dCount(actual);
  if (after.includes(5) && !before.includes(5))
    return ' A half-filled d subshell is extra stable.';
  if (after.includes(10) && !before.includes(10))
    return ' A full d subshell is extra stable.';
  return '';
}

function Readouts({ element }: { element: IElementData }) {
  const z = element.atomicNumber;
  const occ = groundState(z);
  const shells = shellCounts(occ);
  const outer = shells[shells.length - 1];
  const mainGroup = element.block === 's' || element.block === 'p';
  const predicted = aufbauConfiguration(z);

  const rows = [
    { label: 'Full', value: formatConfiguration(occ) },
    {
      label: 'Shorthand',
      value: formatConfiguration(occ, { shorthand: true }),
    },
    { label: 'Block', value: `${element.block}-block` },
    mainGroup
      ? { label: 'Valence electrons', value: String(outer) }
      : {
          label: `Outer shell (n = ${shells.length})`,
          value: electronsLabel(outer),
        },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="pixel-control flex size-12 shrink-0 items-center justify-center text-2xl font-bold text-white"
          style={{ backgroundColor: blockColor(element) }}
        >
          {element.symbol}
        </div>
        <div>
          <h3 className="font-pixel text-xl">{element.name}</h3>
          <p className="text-sm text-white/60">{electronsLabel(z)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-white/60">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {isException(z) && (
        <p className="pixel-control bg-primary-700 p-3 text-sm">
          {element.name} is an exception: the Aufbau order predicts{' '}
          {formatConfiguration(predicted, { shorthand: true })}, but it’s really{' '}
          {formatConfiguration(occ, { shorthand: true })}.
          {exceptionReason(occ, predicted)}
        </p>
      )}
    </div>
  );
}

export default function ElectronConfigurations() {
  const [element, setElement] = useState<IElementData>(ELEMENTS[0]);
  const step = (by: number) =>
    setElement(ELEMENTS[element.atomicNumber - 1 + by]);

  return (
    <Container
      backHref="/"
      header="Electron Configurations"
      description="See how electrons fill an atom’s orbitals: pick an element, or step through them in order."
      className="gap-4"
    >
      {/* a picker, not the main visual, so it stays small on wide screens */}
      <div className="w-full max-w-2xl">
        <PeriodicGrid
          selected={element}
          onSelect={setElement}
          compact
          minWidth={PICKER_MIN_WIDTH}
        />
      </div>

      <Stage label="Electron configuration">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-80 shrink-0">
            <Readouts element={element} />
          </div>
          <OrbitalDiagram occupancy={groundState(element.atomicNumber)} />
        </div>
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => step(-1)} disabled={element.atomicNumber === 1}>
          <span className="flex items-center gap-1">
            <IconChevronLeft size={18} aria-hidden="true" />
            Previous<span className="sr-only"> element</span>
          </span>
        </Button>
        <Button
          onClick={() => step(1)}
          disabled={element.atomicNumber === ELEMENTS.length}
        >
          <span className="flex items-center gap-1">
            Next<span className="sr-only"> element</span>
            <IconChevronRight size={18} aria-hidden="true" />
          </span>
        </Button>
      </div>
    </Container>
  );
}
