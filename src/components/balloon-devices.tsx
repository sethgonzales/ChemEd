import type { ReactNode } from 'react';
import { BALLOON, type Platform } from '~/constants/balloon-world';
import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import type { Balloon, Flight } from '~/utils/balloon';
import { readings } from '~/utils/balloon-view';

// The instruments in the game: what each one looks like and reads

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// Dials sweep 270°, from bottom left round to bottom right, like real gauges
const SWEEP = 270; // degrees
const START = 135; // degrees clockwise from east, where the scale begins

// rounded, as the server's and browser's trig can differ in the last digit
const round = (v: number) => Math.round(v * 100) / 100;

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: round(24 + r * Math.cos(a)), y: round(24 + r * Math.sin(a)) };
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

export interface Device {
  name: string;
  reading: string;
  measures: string; // what it tells you, shown when it's expanded
  picture: ReactNode;
}

/** The balloon's own instruments: the helium inside it */
export function balloonDevices(balloon: Balloon, flight: Flight): Device[] {
  const r = readings(balloon, flight);
  const burstAt = r.airPressure + balloon.burstOverpressure / 1000;
  return [
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
      // against the whole envelope, even when it's tied off smaller
      picture: <VolumeSensor fraction={r.volume / BALLOON.fullVolume} />,
    },
    {
      name: 'Helium counter',
      reading: `${fmt(r.moles)} mol`,
      measures:
        'How many moles of helium are in the balloon, counted as they flow in from the cylinder or out through the vent.',
      picture: <Cylinder />,
    },
  ];
}

/** The basket's instruments for the sky around it */
export function airDevices(balloon: Balloon, flight: Flight): Device[] {
  const r = readings(balloon, flight);
  return [
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
  ];
}

/** A place's weather station: the air where it stands */
export function stationDevices(place: Platform): Device[] {
  const air = airAt(place.height);
  const where = `at ${place.name}, ${fmt(place.height)} m up, from its weather station`;
  return [
    {
      name: 'Barometer',
      reading: `${fmt(air.pressure / 1000, 1)} kPa`,
      measures: `The air pressure ${where}.`,
      picture: (
        <Dial value={air.pressure / 1000} min={60} max={110} unit="kPa" />
      ),
    },
    {
      name: 'Thermometer',
      reading: `${fmt(air.temperature - ZERO_CELSIUS, 1)} °C`,
      measures: `The air temperature ${where}.`,
      picture: <Thermometer celsius={air.temperature - ZERO_CELSIUS} />,
    },
  ];
}
