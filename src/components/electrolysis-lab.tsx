import { useEffect, useState } from 'react';
import Button from '~/components/button';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import ElectrolysisCell, { TUBE_ML } from '~/components/electrolysis-cell';
import Setting from '~/components/setting';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import { FARADAY } from '~/constants/electrochemistry';
import {
  ELECTROLYSIS,
  electrolysis,
  electrolysisCurrent,
  formatElapsed,
  minimumVoltage,
  type ElectrolysisSetup,
  type Product,
} from '~/utils/electrochemistry';

const TICK_MS = 100;
const RATE = 60; // simulated s per real s
const FAST_RATE = 600;
const MAX_TENTHS = 60; // the supply goes to 6.0 V, in 0.1 V steps
const START_TENTHS = 30;

const SETUPS: { id: ElectrolysisSetup; name: string; detail: string }[] = [
  {
    id: 'water',
    name: 'Electrolysis of water',
    detail: 'dilute H₂SO₄, inert electrodes',
  },
  {
    id: 'copper-plating',
    name: 'Copper plating',
    detail: 'CuSO₄, copper electrodes',
  },
  {
    id: 'molten-nacl',
    name: 'Molten sodium chloride',
    detail: 'inert electrodes',
  },
];

const WORKING: Record<ElectrolysisSetup, string> = {
  water: 'Hydrogen bubbles off at the cathode (−) and oxygen at the anode (+).',
  'copper-plating':
    'Copper plates onto the cathode (−) as the copper anode (+) dissolves.',
  'molten-nacl':
    'Sodium metal forms at the cathode (−) and chlorine gas bubbles off at the anode (+).',
};

const MINIMUM_NOTE: Record<ElectrolysisSetup, string> = {
  water:
    'the gap between the E° of O₂/H₂O and H⁺/H₂. Real cells need more, because of overpotential.',
  'copper-plating':
    'copper dissolves from one electrode and plates onto the other, so any voltage drives a current.',
  'molten-nacl':
    'the gap between the E° of Cl₂/Cl⁻ and Na⁺/Na, estimated from 25 °C values; in the hot melt they differ, and real cells need more.',
};

const sig = (x: number) => String(Number(x.toPrecision(3)));
const gasFull = (p: Product) => (p.litres ?? 0) * 1000 >= TUBE_ML;

/** The Electrolytic tab: a power supply drives a reaction that wouldn't go on its own */
export default function ElectrolysisLab() {
  const [setup, setSetup] = useState<ElectrolysisSetup>('water');
  const [tenths, setTenths] = useState(START_TENTHS);
  const [powered, setPowered] = useState(false);
  const [time, setTime] = useState(0); // simulated s
  const [full, setFull] = useState(false);
  const [fast, setFast] = useState(false);

  const volts = tenths / 10;
  const minimum = minimumVoltage(setup);
  const current = powered ? electrolysisCurrent(setup, volts) : 0;
  const run = electrolysis(setup, current, time);
  const { cathode, anode } = ELECTROLYSIS[setup];
  const chosen = SETUPS.find((s) => s.id === setup)!;

  useEffect(() => {
    if (!current) return;
    const dt = ((fast ? FAST_RATE : RATE) * TICK_MS) / 1000;
    // seconds until a gas tube fills, at this current
    const perSecond = electrolysis(setup, current, 1);
    const fills = Math.min(
      ...[perSecond.cathode, perSecond.anode]
        .filter((p) => p.litres)
        .map((p) => TUBE_ML / 1000 / p.litres!),
    );
    const timer = setInterval(() => {
      setTime((t) => {
        if (t + dt < fills) return t + dt;
        setPowered(false);
        setFull(true);
        return fills;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [current, fast, setup]);

  // a fresh run, so Q = I·t holds for the whole of it
  const restart = () => {
    setTime(0);
    setFull(false);
  };
  const chooseSetup = (id: ElectrolysisSetup) => {
    setSetup(id);
    setPowered(false);
    restart();
  };

  const fullTube = [run.cathode, run.anode].find(gasFull);
  const status = full
    ? `The ${fullTube?.product ?? 'gas'} tube is full: press Reset to start again.`
    : !powered
      ? 'Power off: press Power on to switch the supply on.'
      : current > 0
        ? WORKING[setup]
        : volts === 0
          ? 'The supply is at 0 V, so no current flows.'
          : `${volts.toFixed(2)} V is below the minimum of ${minimum.toFixed(2)} V, so no current flows.`;

  const amount = (side: 'cathode' | 'anode') => {
    const p = run[side];
    const verb =
      side === 'anode' && setup === 'copper-plating'
        ? 'dissolved'
        : ELECTROLYSIS[setup][side].gas
          ? 'collected'
          : 'formed';
    const product = p.product === 'Cu²⁺' ? 'Cu' : p.product;
    const size =
      p.litres !== undefined
        ? `${(p.litres * 1000).toFixed(1)} mL (25 °C, 1 atm)`
        : `${p.grams.toFixed(4)} g`;
    return `${side === 'cathode' ? 'Cathode' : 'Anode'}: ${product} ${verb}, ${sig(p.moles)} mol, ${size}`;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:items-end">
        <Dropdown
          label={`Setup: ${chosen.name} (${chosen.detail})`}
          className="w-full sm:w-96"
          menuClassName="w-80"
        >
          {SETUPS.map((s) => (
            <DropdownItem
              key={s.id}
              selected={s.id === setup}
              onSelect={() => chooseSetup(s.id)}
            >
              {s.name} ({s.detail})
            </DropdownItem>
          ))}
        </Dropdown>
        <Slider
          label={`Supply voltage: ${volts.toFixed(2)} V`}
          value={tenths}
          min={0}
          max={MAX_TENTHS}
          rangeSteps={0}
          onChange={(t) => {
            setTenths(t);
            restart();
          }}
          className="w-full sm:w-64 text-sm"
        />
      </div>

      <Stage
        label="Electrolysis cell"
        header={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span data-testid="supply-current" className="font-pixel text-3xl">
              {current.toFixed(3)} A
            </span>
            <span className="text-sm">
              Time:{' '}
              <span data-testid="electrolysis-time">{formatElapsed(time)}</span>
            </span>
          </div>
        }
        footer={
          <div className="flex flex-col gap-3 text-sm">
            <p role="status">{status}</p>
            <p className="text-white/80">
              Minimum voltage: {minimum.toFixed(2)} V, {MINIMUM_NOTE[setup]}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-white/70">Cathode (reduction)</dt>
              <dd>{cathode.equation}</dd>
              <dt className="text-white/70">Anode (oxidation)</dt>
              <dd>{anode.equation}</dd>
            </dl>
            <div data-testid="faraday" className="flex flex-col gap-1">
              <p>
                Q = I·t = {current.toFixed(3)} A × {Math.round(time)} s ={' '}
                {sig(current * time)} C
              </p>
              <p>n(e⁻) = Q / F = {sig(run.electrons)} mol</p>
              <p className="text-white/70">F = {FARADAY} C/mol</p>
            </div>
            <div className="flex flex-col gap-1">
              <span data-testid="cathode-amount">{amount('cathode')}</span>
              <span data-testid="anode-amount">{amount('anode')}</span>
            </div>
          </div>
        }
      >
        <ElectrolysisCell
          setup={setup}
          volts={volts}
          current={current}
          products={run}
        />
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button
          pressed={powered}
          disabled={full}
          onClick={() => setPowered((p) => !p)}
        >
          Power on
        </Button>
        <Button
          onClick={() => {
            setPowered(false);
            restart();
          }}
        >
          Reset
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-2">
        <Setting checked={fast} onChange={setFast}>
          Run faster
        </Setting>
      </div>
    </>
  );
}
