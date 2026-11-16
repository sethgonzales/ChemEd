import { useEffect, useState } from 'react';
import { useEscape } from '~/utils/use-escape';
import Button from '~/components/button';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import CellLens from '~/components/cell-lens';
import GalvanicCell, { type Zoom } from '~/components/galvanic-cell';
import GalvanicEquations from '~/components/galvanic-equations';
import GalvanicPrediction, {
  type Prediction,
} from '~/components/galvanic-prediction';
import { useGuide } from '~/components/guide';
import Setting from '~/components/setting';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import Tabs from '~/components/tabs';
import ElectrolysisLab from '~/components/electrolysis-lab';
import {
  CIRCUIT_RESISTANCE,
  CONSTANTS_SOURCE,
  COUPLES,
} from '~/constants/electrochemistry';
import { ATOMIC_MASS_SOURCES } from '~/constants/elements';
import {
  analyzeCell,
  checkPrediction,
  newChallenge,
  cellReaction,
  coupleFor,
  electrodeWear,
  formatElapsed,
  halfCellState,
  metalChange,
  molarMass,
  runCell,
  type Cell,
  type CellReading,
  type HalfCell,
  type Side,
} from '~/utils/electrochemistry';

const CONCENTRATIONS = [0.001, 0.01, 0.1, 1]; // M, a step of ten for each slider notch
const TICK_MS = 100;
const RATE = 3600; // simulated s per real s: a Daniell cell runs flat in about a minute
const FAST_RATE = 36000;

const SIDES: Side[] = ['left', 'right'];
const DANIELL: Cell = {
  left: { electrode: 'Zn', solution: 'Zn', concentration: 1 },
  right: { electrode: 'Cu', solution: 'Cu', concentration: 1 },
  saltBridge: true,
};

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const metalName = (id: string) => coupleFor(id).metal.toLowerCase();

// why the cell does or doesn't drive a current, in a sentence
function explain(cell: Cell, reading: CellReading, connected: boolean) {
  const reacting = SIDES.find((s) => halfCellState(cell[s]) === 'reacts');
  if (reacting) {
    const { electrode, solution } = cell[reacting];
    return `${capital(metalName(electrode))} reacts with the ${coupleFor(solution).ion} in its own beaker: ${metalName(solution)} plates straight onto the ${metalName(electrode)}, so no electrons go through the wire.`;
  }
  const odd = SIDES.find((s) => halfCellState(cell[s]) === 'no-own-ions');
  if (odd) {
    const { electrode, solution } = cell[odd];
    return `${capital(metalName(electrode))} can’t reduce the ${coupleFor(solution).ion} around it, so nothing sets its potential and E° doesn’t apply. Put each metal in a solution of its own ions.`;
  }
  if (!connected) return 'Open circuit: press Connect to close it.';
  switch (reading.status) {
    case 'no-salt-bridge':
      return 'No salt bridge: ions can’t move between the beakers to balance the charge, so no current flows.';
    case 'no-difference':
      return 'Both half-cells are the same, so there’s no difference in potential to push electrons.';
    case 'flat': {
      const ion = coupleFor(cell[reading.cathode!].electrode).ion;
      return `The cell is flat: the ${ion} at the cathode is used up.`;
    }
    default: {
      const anode = cell[reading.anode!].electrode;
      const cathode = coupleFor(cell[reading.cathode!].electrode).ion;
      return `${capital(metalName(anode))} is oxidised at the anode (−) and ${cathode} is reduced at the cathode (+).`;
    }
  }
}

function HalfCellControls({
  side,
  halfCell,
  onChange,
}: {
  side: Side;
  halfCell: HalfCell;
  onChange: (patch: Partial<HalfCell>) => void;
}) {
  const name = capital(side);
  const electrode = coupleFor(halfCell.electrode);
  return (
    <fieldset className="flex flex-col gap-2 min-w-0">
      <legend className="mb-1 text-sm font-semibold">{name} half-cell</legend>
      <Dropdown
        label={`${name} electrode: ${electrode.metal} (${electrode.id})`}
        className="w-full"
        menuClassName="w-56"
      >
        {COUPLES.map((c) => (
          <DropdownItem
            key={c.id}
            selected={c.id === halfCell.electrode}
            onSelect={() => onChange({ electrode: c.id })}
          >
            {c.metal} ({c.id})
          </DropdownItem>
        ))}
      </Dropdown>
      <Dropdown
        label={`${name} solution: ${coupleFor(halfCell.solution).solution}`}
        className="w-full"
        menuClassName="w-56"
      >
        {COUPLES.map((c) => (
          <DropdownItem
            key={c.id}
            selected={c.id === halfCell.solution}
            onSelect={() => onChange({ solution: c.id })}
          >
            {c.solution} ({c.ion})
          </DropdownItem>
        ))}
      </Dropdown>
      <Slider
        label={`${name} concentration: ${halfCell.concentration} M`}
        value={CONCENTRATIONS.indexOf(halfCell.concentration)}
        min={0}
        max={CONCENTRATIONS.length - 1}
        rangeSteps={0}
        onChange={(i) => onChange({ concentration: CONCENTRATIONS[i] })}
        className="text-sm"
      />
    </fieldset>
  );
}

function Galvanic() {
  const [start, setStart] = useState<Cell>(DANIELL); // as filled
  const [cell, setCell] = useState<Cell>(DANIELL); // as it is now
  const [time, setTime] = useState(0); // simulated s
  const [connected, setConnected] = useState(false);
  const [saltBridge, setSaltBridge] = useState(true);
  const [showEquations, setShowEquations] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [fast, setFast] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const { say } = useGuide();
  const [zoomed, setZoomed] = useState<Zoom | null>(null);
  useEscape(() => setZoomed(null), zoomed !== null);

  const now = { ...cell, saltBridge };
  const reading = analyzeCell(now);
  const flowing = connected && reading.status === 'working';
  const reaction = flowing ? cellReaction(now) : null;
  const masses = metalChange(start, cell);

  useEffect(() => {
    if (!connected) return;
    const dt = ((fast ? FAST_RATE : RATE) * TICK_MS) / 1000;
    const timer = setInterval(() => {
      setCell((c) => runCell({ ...c, saltBridge }, dt));
      setTime((t) => t + dt);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [connected, fast, saltBridge]);

  const refill = (next: Cell) => {
    setStart(next);
    setCell(next);
    setTime(0);
    setConnected(false);
    setPrediction(null);
  };

  // Predict mode: a fresh pair, named by Mr. G, to call before connecting
  const challenge = () => {
    const next = newChallenge();
    refill(next);
    setSaltBridge(true);
    const [left, right] = [next.left, next.right].map((h) =>
      metalName(h.electrode),
    );
    say(
      `${capital(left)} on the left, ${right} on the right. Which is the anode, and what will the voltmeter read?`,
      'tip',
    );
  };
  const predict = (on: boolean) => {
    setPredicting(on);
    if (on) challenge();
    else setPrediction(null);
  };
  const check = (guess: { anode: Side; volts: number }) => {
    const result = checkPrediction(now, guess);
    setPrediction(result);
    setConnected(true); // the meter shows how it went
    if (result.verdict === 'correct') say(result.text, 'cheer');
    else
      say(
        result.verdict === 'wrong-volts'
          ? 'E°cell = E°cathode − E°anode, using the reduction potentials straight from the table.'
          : 'An Ox, Red Cat: oxidation happens at the anode, the metal with the lower E°.',
        'hint',
      );
  };
  const locked = predicting && !prediction; // the answer stays hidden till checked
  const change = (side: Side) => (patch: Partial<HalfCell>) =>
    refill({ ...start, [side]: { ...start[side], ...patch } });

  const massReadout = (side: Side) => {
    const id = cell[side].electrode;
    const grams = masses[side] * molarMass(id);
    const sign = grams > 0 ? '+' : grams < 0 ? '−' : '';
    return (
      <span data-testid={`${side}-mass`}>
        {capital(metalName(id))} electrode: {sign}
        {Math.abs(grams).toFixed(3)} g
      </span>
    );
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {SIDES.map((side) => (
          <HalfCellControls
            key={side}
            side={side}
            halfCell={start[side]}
            onChange={change(side)}
          />
        ))}
      </div>

      <Stage
        label="Galvanic cell"
        header={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span data-testid="voltage" className="font-pixel text-3xl">
              {(connected ? reading.voltage : 0).toFixed(2)} V
            </span>
            <span className="text-sm">
              Current:{' '}
              {((flowing ? reading.voltage : 0) / CIRCUIT_RESISTANCE).toFixed(
                3,
              )}{' '}
              A
            </span>
            <span className="text-sm">
              Time: <span data-testid="time">{formatElapsed(time)}</span>
            </span>
          </div>
        }
        footer={
          <div className="flex flex-col gap-3">
            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {SIDES.map((side) => (
                <div key={side} className="flex flex-col">
                  <span>
                    [{coupleFor(cell[side].solution).ion}]:{' '}
                    {cell[side].concentration.toFixed(3)} M
                  </span>
                  {massReadout(side)}
                </div>
              ))}
            </div>
            <p role="status" className="text-sm">
              {explain(now, reading, connected)}
            </p>
            {showEquations && reaction && !locked && (
              <GalvanicEquations
                reaction={reaction}
                eCathode={coupleFor(now[reading.cathode!].electrode).eStandard}
                eAnode={coupleFor(now[reading.anode!].electrode).eStandard}
              />
            )}
            {showTable && <PotentialTable inUse={now} />}
          </div>
        }
      >
        <GalvanicCell
          start={start}
          cell={now}
          reading={reading}
          flowing={flowing}
          zoomed={zoomed}
          onZoom={setZoomed}
        />
        {zoomed && (
          <Lens
            zoomed={zoomed}
            start={start}
            cell={now}
            reading={reading}
            flowing={flowing}
          />
        )}
      </Stage>

      {predicting &&
        (reading.status === 'working' || prediction ? (
          <GalvanicPrediction
            cell={now}
            result={prediction}
            onCheck={check}
            onNew={challenge}
          />
        ) : (
          <p className="text-sm">
            Set up two working half-cells, each metal in its own ions, to make a
            prediction.
          </p>
        ))}

      <div className="flex flex-wrap gap-2">
        <Button
          pressed={connected}
          disabled={locked}
          onClick={() => setConnected((c) => !c)}
        >
          Connect
        </Button>
        <Button onClick={() => refill(start)}>Reset</Button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-2">
        <Setting checked={saltBridge} onChange={setSaltBridge}>
          Salt bridge
        </Setting>
        <Setting checked={showEquations} onChange={setShowEquations}>
          Show half-equations
        </Setting>
        <Setting checked={showTable} onChange={setShowTable}>
          Show E° table
        </Setting>
        <Setting checked={fast} onChange={setFast}>
          Run faster
        </Setting>
        <Setting checked={predicting} onChange={predict}>
          Predict before connecting
        </Setting>
      </div>
    </>
  );
}

export default function Electrochemistry() {
  return (
    <Container
      backHref="/"
      header="Electrochemistry"
      sources={[
        'electrodePotentials',
        CONSTANTS_SOURCE,
        ...ATOMIC_MASS_SOURCES,
      ]}
      description="Build a cell from two half-cells and watch the electrons flow, or drive a reaction with a power supply."
      className="gap-4"
    >
      <Tabs
        label="Kind of cell"
        panelClassName="flex flex-col gap-4"
        tabs={[
          { id: 'galvanic', label: 'Galvanic', content: <Galvanic /> },
          {
            id: 'electrolytic',
            label: 'Electrolytic',
            content: <ElectrolysisLab />,
          },
        ]}
      />
    </Container>
  );
}

/** The close-up on one spot, at its electrode's role and the cell's current */
function Lens({
  zoomed,
  start,
  cell,
  reading,
  flowing,
}: {
  zoomed: Zoom;
  start: Cell;
  cell: Cell;
  reading: CellReading;
  flowing: boolean;
}) {
  const bridge = zoomed === 'bridge';
  const side: Side = bridge ? 'left' : zoomed;
  // before any current, the side that would be the anode still shows as one
  const spot = bridge ? 'bridge' : reading.anode === side ? 'anode' : 'cathode';
  return (
    <CellLens
      // a fresh close-up for each spot and metal
      key={`${zoomed}-${cell[side].electrode}`}
      spot={spot}
      metal={cell[side].electrode}
      concentration={cell[side].concentration}
      current={flowing ? reading.voltage / CIRCUIT_RESISTANCE : 0}
      cathodeSide={reading.cathode ?? 'right'}
      wear={electrodeWear(start, cell)[side]}
    />
  );
}

/** Standard reduction potentials, the cell's two metals marked */
function PotentialTable({ inUse }: { inUse: Cell }) {
  const used = new Set([inUse.left.electrode, inUse.right.electrode]);
  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="text-left font-semibold">
        Standard reduction potentials (25 °C, 1 M)
      </caption>
      <thead>
        <tr className="text-left text-white/70">
          <th scope="col" className="font-normal">
            Half-reaction
          </th>
          <th scope="col" className="font-normal text-right">
            E° (V)
          </th>
        </tr>
      </thead>
      <tbody>
        {[...COUPLES].reverse().map((c) => (
          <tr key={c.id} className={used.has(c.id) ? 'text-secondary' : ''}>
            <td>
              {c.ion} + {c.charge === 1 ? '' : c.charge}e⁻ → {c.id}
            </td>
            <td className="text-right tabular-nums">
              {c.eStandard < 0 ? '−' : '+'}
              {Math.abs(c.eStandard).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
