import { useEffect, useRef, useState } from 'react';
import Button from '~/components/button';
import type { Balloon, Flight } from '~/utils/balloon';
import { readings, type Readings } from '~/utils/balloon-view';
import { cn } from '~/utils/cn';
import { PIXEL_CONTROL } from '~/utils/pixel';
import { useEscape } from '~/utils/use-escape';

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

interface Instrument {
  name: string;
  read: (r: Readings) => string;
  measures: string; // what it tells you, for the close-up
}

// Each reads in its own everyday unit; converting is the student's job
const INSTRUMENTS: Instrument[] = [
  {
    name: 'Altimeter',
    read: (r) => `${fmt(r.altitude)} m`,
    measures: 'How high the basket is, in metres above sea level.',
  },
  {
    name: 'Outside thermometer',
    read: (r) => `${fmt(r.airTemperature, 1)} °C`,
    measures: 'The temperature of the air around the balloon.',
  },
  {
    name: 'Barometer',
    read: (r) => `${fmt(r.airPressure, 1)} kPa`,
    measures: 'The air pressure outside the balloon.',
  },
  {
    name: 'Helium thermometer',
    read: (r) => `${fmt(r.gasTemperature, 1)} °C`,
    measures: 'The temperature of the helium inside the balloon.',
  },
  {
    name: 'Balloon gauge',
    read: (r) => `${fmt(r.gasPressure, 1)} kPa`,
    measures:
      'The pressure of the helium inside. While the balloon is slack it matches the air outside; once it’s stretched full it can climb higher.',
  },
  {
    name: 'Volume',
    read: (r) => `${fmt(r.volume)} m³`,
    measures: 'How much space the helium fills: the size of the balloon.',
  },
  {
    name: 'Tank meter',
    read: (r) => `${fmt(r.moles)} mol`,
    measures: 'How many moles of helium are in the balloon.',
  },
];

function CloseUp({
  instrument,
  reading,
  onClose,
}: {
  instrument: Instrument;
  reading: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  // focus starts on its Close button
  useEffect(() => dialog.current?.querySelector('button')?.focus(), []);
  useEscape(onClose);
  const titleId = `close-up-${instrument.name.replace(/\W/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close close-up"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pixel-frame relative w-72 max-w-full space-y-3 p-5 text-white [--frame-fill:var(--color-primary-600)] [--frame-outline:var(--color-primary-800)]"
      >
        <h3 id={titleId} className="font-pixel text-lg">
          {instrument.name}
        </h3>
        <p className="font-sans text-4xl font-semibold tabular-nums">
          {reading}
        </p>
        <p className="font-sans text-sm text-white/80">{instrument.measures}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

interface Props {
  balloon: Balloon;
  flight: Flight;
}

/** The basket's instruments; tap one for a close-up of its reading */
export default function BalloonInstruments({ balloon, flight }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const r = readings(balloon, flight);
  const shown = INSTRUMENTS.find((i) => i.name === open);

  const closeUp = () => {
    const name = open;
    setOpen(null);
    if (name) buttons.current[name]?.focus();
  };

  return (
    <>
      <ul
        aria-label="Instruments"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
      >
        {INSTRUMENTS.map((i) => (
          <li key={i.name}>
            <button
              type="button"
              ref={(el) => void (buttons.current[i.name] = el)}
              onClick={() => setOpen(i.name)}
              className={cn(
                PIXEL_CONTROL,
                'flex w-full cursor-pointer flex-col items-start bg-primary-700 px-3 pt-2 pb-2.5 text-left text-white hover:bg-primary-800',
              )}
            >
              <span className="text-xs text-white/70">{i.name}</span>
              <span className="font-sans text-base font-semibold tabular-nums">
                {i.read(r)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown && (
        <CloseUp instrument={shown} reading={shown.read(r)} onClose={closeUp} />
      )}
    </>
  );
}
