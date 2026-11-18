import { useEffect, useRef, useState, type ReactNode } from 'react';
import Button from '~/components/button';
import type { Platform } from '~/constants/balloon-world';
import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import type { Balloon, Flight } from '~/utils/balloon';
import { readings } from '~/utils/balloon-view';
import { cn } from '~/utils/cn';
import { PIXEL_CONTROL } from '~/utils/pixel';
import { useEscape } from '~/utils/use-escape';

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// Dials sweep 270°, from bottom left round to bottom right, like real gauges
const SWEEP = 270; // degrees
const START = 135; // degrees clockwise from east, where the scale begins

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: 24 + r * Math.cos(a), y: 24 + r * Math.sin(a) };
};

/** A round needle gauge: brass bezel, cream face, ticks and an optional red zone */
function Dial({
  value,
  min,
  max,
  unit,
  redFrom,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  redFrom?: number; // where the danger zone starts
}) {
  const angle = (v: number) =>
    START + (SWEEP * (Math.min(Math.max(v, min), max) - min)) / (max - min);
  const needle = point(angle(value), 15);
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <circle cx={24} cy={24} r={23} fill="#8a6a3a" />
      <circle cx={24} cy={24} r={21} fill="#c9a25f" />
      <circle cx={24} cy={24} r={18.5} fill="#f6f0dd" />
      {redFrom !== undefined &&
        Array.from({ length: 12 }, (_, i) => {
          const v = redFrom + ((max - redFrom) * i) / 11;
          const a = point(angle(v), 17);
          const b = point(angle(v), 14);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#dc2626"
              strokeWidth={2}
            />
          );
        })}
      {Array.from({ length: 11 }, (_, i) => {
        const deg = START + (SWEEP * i) / 10;
        const a = point(deg, 17.5);
        const b = point(deg, i % 5 ? 15.5 : 14);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#334155"
            strokeWidth={i % 5 ? 0.8 : 1.4}
          />
        );
      })}
      <text
        x={24}
        y={33}
        textAnchor="middle"
        fontSize={5}
        fill="#475569"
        fontFamily="sans-serif"
      >
        {unit}
      </text>
      <line
        x1={24}
        y1={24}
        x2={needle.x}
        y2={needle.y}
        stroke="#b91c1c"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <circle cx={24} cy={24} r={2.2} fill="#334155" />
    </svg>
  );
}

/** A glass thermometer on a wooden board, its red column at the temperature */
function Thermometer({ celsius }: { celsius: number }) {
  const low = -30;
  const high = 50;
  const top = 6;
  const bottom = 36;
  const level =
    bottom -
    ((Math.min(Math.max(celsius, low), high) - low) / (high - low)) *
      (bottom - top);
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <rect x={14} y={1} width={20} height={46} rx={3} fill="#b07a45" />
      <rect x={15} y={2} width={18} height={44} rx={2} fill="#c98f55" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = bottom - (i * (bottom - top)) / 8;
        return (
          <rect
            key={i}
            x={i % 2 ? 27 : 26}
            y={y}
            width={i % 2 ? 2 : 3}
            height={0.8}
            fill="#3f2a17"
          />
        );
      })}
      <rect
        x={21.5}
        y={top - 2}
        width={5}
        height={bottom - top + 6}
        rx={2.5}
        fill="#e0f2fe"
      />
      <rect
        x={22.75}
        y={level}
        width={2.5}
        height={bottom - level + 4}
        fill="#dc2626"
      />
      <circle cx={24} cy={41} r={4.5} fill="#e0f2fe" />
      <circle cx={24} cy={41} r={3.3} fill="#dc2626" />
    </svg>
  );
}

/** The helium cylinder, with its valve and a counter for what's gone in */
function Cylinder() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <rect x={16} y={12} width={16} height={34} rx={5} fill="#8d6e63" />
      <rect x={18} y={14} width={3} height={30} rx={1.5} fill="#a1887f" />
      <rect x={16} y={18} width={16} height={3} fill="#f5f5f4" />
      <rect x={21} y={6} width={6} height={7} fill="#57534e" />
      <rect x={19} y={4} width={10} height={3} fill="#3f3f46" />
      <rect x={27} y={8} width={6} height={2} fill="#3f3f46" />
    </svg>
  );
}

/** The envelope's volume sensor: a little balloon with a scale beside it */
function VolumeSensor({ fraction }: { fraction: number }) {
  const r = 6 + 12 * Math.cbrt(Math.min(1, fraction));
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <rect x={2} y={2} width={44} height={44} rx={4} fill="#1e293b" />
      <circle cx={22} cy={22} r={r} fill="#e4572e" />
      <circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        stroke="#f4d35e"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <rect x={20} y={22 + r - 1} width={4} height={6} fill="#c08a4a" />
      <rect x={40} y={6} width={2} height={36} fill="#475569" />
      <rect
        x={38}
        y={42 - 36 * Math.min(1, fraction)}
        width={6}
        height={2}
        fill="#86efac"
      />
    </svg>
  );
}

interface Device {
  name: string;
  reading: string;
  measures: string;
  picture: ReactNode;
}

/** One instrument: its picture, then an LCD-style readout */
function DeviceButton({
  device,
  onOpen,
  buttonRef,
}: {
  device: Device;
  onOpen: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      aria-label={`${device.name}: ${device.reading}`}
      onClick={onOpen}
      className={cn(
        PIXEL_CONTROL,
        'flex h-full w-full cursor-pointer flex-col items-center gap-1 bg-primary-700 p-2 text-white hover:bg-primary-800',
      )}
    >
      <span className="block size-14 sm:size-16">{device.picture}</span>
      {/* the name takes the slack, so every readout lines up along the bottom */}
      <span className="flex flex-1 items-center text-center text-[11px] leading-tight text-white/75">
        {device.name}
      </span>
      <span className="w-full whitespace-nowrap rounded-sm bg-[#10261a] px-1 py-0.5 text-center font-mono text-xs font-semibold tabular-nums text-[#86efac] sm:text-sm">
        {device.reading}
      </span>
    </button>
  );
}

function CloseUp({ device, onClose }: { device: Device; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  // focus starts on its Close button
  useEffect(() => dialog.current?.querySelector('button')?.focus(), []);
  useEscape(onClose);
  const titleId = `close-up-${device.name.replace(/\W/g, '')}`;

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
        className="pixel-frame relative flex w-80 max-w-full flex-col items-center gap-3 p-5 text-white [--frame-fill:var(--color-primary-600)] [--frame-outline:var(--color-primary-800)]"
      >
        <h3 id={titleId} className="self-start font-pixel text-lg">
          {device.name}
        </h3>
        <span className="block size-40">{device.picture}</span>
        <p className="rounded-sm bg-[#10261a] px-3 py-1 font-mono text-3xl font-semibold tabular-nums text-[#86efac]">
          {device.reading}
        </p>
        <p className="font-sans text-sm text-white/80">{device.measures}</p>
        <div className="self-start">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  balloon: Balloon;
  flight: Flight;
  station: Platform; // the next stop, whose weather station radios its readings
}

/** The basket's instruments, and the next stop's weather station by radio */
export default function BalloonInstruments({
  balloon,
  flight,
  station,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const r = readings(balloon, flight);
  const there = airAt(station.height);
  const stationName = `${station.name} weather station`;
  const burstAt = r.airPressure + balloon.burstOverpressure / 1000;

  const basket: Device[] = [
    {
      name: 'Altimeter',
      reading: `${fmt(r.altitude)} m`,
      measures: 'How high the basket is, in metres above sea level.',
      picture: <Dial value={r.altitude} min={0} max={3000} unit="m" />,
    },
    {
      name: 'Outside thermometer',
      reading: `${fmt(r.airTemperature, 1)} °C`,
      measures: 'The temperature of the air around the balloon.',
      picture: <Thermometer celsius={r.airTemperature} />,
    },
    {
      name: 'Barometer',
      reading: `${fmt(r.airPressure, 1)} kPa`,
      measures: 'The air pressure outside the balloon.',
      picture: <Dial value={r.airPressure} min={60} max={110} unit="kPa" />,
    },
    {
      name: 'Helium thermometer',
      reading: `${fmt(r.gasTemperature, 1)} °C`,
      measures: 'The temperature of the helium inside the balloon.',
      picture: <Thermometer celsius={r.gasTemperature} />,
    },
    {
      name: 'Balloon gauge',
      reading: `${fmt(r.gasPressure, 1)} kPa`,
      measures:
        'The pressure of the helium inside. While the balloon is slack it matches the air outside; once it’s stretched full it can climb, and past the red line it bursts.',
      picture: (
        <Dial
          value={r.gasPressure}
          min={60}
          max={130}
          unit="kPa"
          redFrom={Math.min(burstAt, 130)}
        />
      ),
    },
    {
      name: 'Volume meter',
      reading: `${fmt(r.volume)} m³`,
      measures: 'How much space the helium fills: the size of the balloon.',
      picture: <VolumeSensor fraction={r.volume / balloon.fullVolume} />,
    },
    {
      name: 'Helium counter',
      reading: `${fmt(r.moles)} mol`,
      measures:
        'How many moles of helium are in the balloon, counted as they flow in from the cylinder or out through the vent.',
      picture: <Cylinder />,
    },
  ];

  const weather: Device[] = [
    {
      name: 'Barometer',
      reading: `${fmt(there.pressure / 1000, 1)} kPa`,
      measures: `The air pressure at ${station.name}, ${fmt(station.height)} m up, radioed from its weather station.`,
      picture: (
        <Dial value={there.pressure / 1000} min={60} max={110} unit="kPa" />
      ),
    },
    {
      name: 'Thermometer',
      reading: `${fmt(there.temperature - ZERO_CELSIUS, 1)} °C`,
      measures: `The air temperature at ${station.name}, ${fmt(station.height)} m up, radioed from its weather station.`,
      picture: <Thermometer celsius={there.temperature - ZERO_CELSIUS} />,
    },
  ];

  const key = (group: string, d: Device) => `${group}/${d.name}`;
  const shown = [
    ...basket.map((d) => [key('basket', d), d] as const),
    ...weather.map((d) => [key('station', d), d] as const),
  ].find(([k]) => k === open)?.[1];

  const closeUp = () => {
    const was = open;
    setOpen(null);
    if (was) buttons.current[was]?.focus();
  };

  const group = (
    label: string,
    id: string,
    devices: Device[],
    className: string,
  ) => (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-col gap-2', className)}
    >
      <h3 className="text-sm text-white/80">{label}</h3>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {devices.map((d) => (
          <li key={d.name}>
            <DeviceButton
              device={d}
              onOpen={() => setOpen(key(id, d))}
              buttonRef={(el) => void (buttons.current[key(id, d)] = el)}
            />
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {group('In the basket', 'basket', basket, 'lg:flex-[7]')}
      {group(
        stationName,
        'station',
        weather,
        'lg:flex-[2] [&_ul]:lg:grid-cols-2',
      )}
      {shown && <CloseUp device={shown} onClose={closeUp} />}
    </div>
  );
}
