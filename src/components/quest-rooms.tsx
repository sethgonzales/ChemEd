// Each chamber's room puzzles: a real piece of its simulation, set up from the
// play's seed and course. A room calls onSolve once it's done.

import { useMemo, useState, type ReactNode } from 'react';
import Button from '~/components/button';
import { useCheckSlot } from '~/components/check-slot';
import ConfigurationBuilder from '~/components/configuration-builder';
import type { Settings } from '~/components/lewis-builder';
import LewisChallenge from '~/components/lewis-challenge';
import PeriodicGrid from '~/components/periodic-grid';
import PotentialTable from '~/components/potential-table';
import { ScenePanel } from '~/components/quest-scene';
import RoomVerdict, { type RoomAnswer } from '~/components/room-verdict';
import GalvanicPrediction, {
  type Prediction,
} from '~/components/galvanic-prediction';
import HeatingCurve from '~/components/heating-curve';
import ReactionBalancer from '~/components/reaction-balancer';
import ReactionPredict from '~/components/reaction-predict';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import PhCurve from '~/components/ph-curve';
import {
  ANALYTE_VOLUME,
  INDICATORS,
  TITRANT_CONCENTRATION,
  titrantFor,
} from '~/constants/titrations';
import {
  curveMarkers,
  curvePoints,
  newUnknown,
  unknownFeedback,
} from '~/utils/titrations';
import type { IElementData } from '~/types';
import {
  checkPrediction,
  newChallenge,
  type Side,
} from '~/utils/electrochemistry';
import { PREDICT_POOL } from '~/utils/predict';
import { createRng, pick, type Course, type Rng } from '~/utils/quest';
import { balancingRooms } from '~/utils/quest-balancing';
import type { Verdict } from '~/utils/lewis';
import { configurationRooms } from '~/utils/quest-electrons';
import { lewisRooms } from '~/utils/quest-lewis';
import { elementRiddle } from '~/utils/quest-periodic';
import { reactionRooms } from '~/utils/quest-reactions';
import { titrationPool } from '~/utils/quest-titrations';
import {
  goalMet,
  statesRooms,
  type StatesRoom as StatesRoomData,
} from '~/utils/quest-states';
import { phaseOf, temperatureRange } from '~/utils/states-of-matter';
import { parseEquation } from '~/utils/reactions';

export interface RoomProps {
  seed: number;
  course: Course;
  room: number;
  rooms: number;
  onSolve: () => void;
  onMiss?: () => void; // a wrong answer, so the door can shake
}

const RANGE_STEPS = 7; // labels along the thermometer, as on the simulation
const GRID_MIN_WIDTH = 480; // px; narrower screens scroll the table, not the page
// (the room's table is capped at max-w-2xl, 672 px, to keep its answer in view)

/** A generator for one room, so each room of a play gets its own puzzle */
export const roomRng = (seed: number, room: number): Rng =>
  createRng((seed + Math.imul(room, 0x9e3779b1)) >>> 0);

function BalancingRoom({ seed, course, room, rooms, onSolve }: RoomProps) {
  // chosen together, so the two rooms never share a reaction
  const reactions = useMemo(
    () => balancingRooms(createRng(seed), course, rooms),
    [seed, course, rooms],
  );
  const r = reactions[room];
  return (
    <ReactionBalancer
      key={r.id}
      reaction={parseEquation(r.equation)}
      answer={null}
      canReveal={false}
      onSolve={onSolve}
    />
  );
}

/** The Sphinx's riddle: pick the element it describes */
function PeriodicRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  const riddle = useMemo(
    () => elementRiddle(roomRng(seed, room), course, room),
    [seed, course, room],
  );
  const [picked, setPicked] = useState<IElementData | null>(null);
  const [verdict, setVerdict] = useState<RoomAnswer | null>(null);
  const [tried, setTried] = useState<IElementData[]>([]); // wrong picks

  const check = () => {
    if (!picked) return;
    const right = riddle.fits(picked);
    setVerdict((v) => ({
      right,
      text: right ? `It’s ${picked.name}!` : riddle.hint(picked),
      attempt: (v?.attempt ?? 0) + 1,
    }));
    if (right) onSolve();
    else {
      setTried((t) => [...t, picked]);
      onMiss?.();
    }
  };
  const slotted = useCheckSlot({
    label: 'That’s my answer',
    disabled: !picked,
    run: check,
  });

  // the riddle, a compact table, and the answer right beneath it
  return (
    <ScenePanel className="flex flex-col gap-3">
      <p className="text-lg">{riddle.prompt}</p>
      {/* capped, so the answer stays in view on a wide screen */}
      <div className="w-full max-w-2xl">
        <PeriodicGrid
          selected={picked}
          onSelect={setPicked}
          compact
          crossed={tried}
          minWidth={GRID_MIN_WIDTH}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!slotted && (
          <Button pressed disabled={!picked} onClick={check}>
            That’s my answer
          </Button>
        )}
        <span className="text-sm">
          {picked ? `Your pick: ${picked.name}` : 'Pick an element.'}
        </span>
      </div>
      <RoomVerdict verdict={verdict} />
    </ScenePanel>
  );
}

/** The Lich's rooms: draw an atom's (or ion's) orbital diagram and notation */
function ElectronRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  // chosen together, from one generator, like the balancing rooms
  const target = useMemo(
    () => configurationRooms(createRng(seed), course)[room],
    [seed, course, room],
  );
  return (
    <div className="flex flex-col gap-4">
      <ConfigurationBuilder
        key={`${target.element.symbol}${target.charge}`}
        target={target}
        onCorrect={onSolve}
        onMiss={onMiss}
      />
    </div>
  );
}

/** A Lewis room opens for the best structure, or one AP accepts */
export const lewisOpens = (verdict: Verdict) =>
  verdict === 'best' || verdict === 'accepted';

/** The Weaver's rooms: draw a molecule's whole Lewis structure, from a blank page */
function LewisRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  const molecule = useMemo(
    () => lewisRooms(createRng(seed), course)[room],
    [seed, course, room],
  );
  const [settings, setSettings] = useState<Settings>({
    snap: true,
    bars: false,
    hints: false,
  });
  return (
    <LewisChallenge
      key={molecule.id}
      molecule={molecule}
      start="empty"
      settings={settings}
      onSettings={(change) => setSettings((now) => ({ ...now, ...change }))}
      onCheck={(verdict) => (lewisOpens(verdict) ? onSolve() : onMiss?.())}
    />
  );
}

/** What the Wyrm asks for, in words */
function goalText({ substance, goal }: StatesRoomData) {
  const name = substance.name.toLowerCase();
  return goal.kind === 'phase'
    ? `Bring ${name} to a ${goal.phase.toLowerCase()}.`
    : `Set ${name} to its ${goal.point} point.`;
}

/** The Wyrm's rooms: read the heating curve and set the thermometer */
function StatesRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  const target = useMemo(
    () => statesRooms(createRng(seed), course)[room],
    [seed, course, room],
  );
  const [temperature, setTemperature] = useState(target.start);
  const [verdict, setVerdict] = useState<RoomAnswer | null>(null);
  const { min, max } = temperatureRange(target.substance);

  const check = () => {
    const right = goalMet(target, temperature);
    setVerdict((v) => ({
      right,
      text: right
        ? 'The ice gives way.'
        : `At ${temperature} °C it’s a ${phaseOf(target.substance, temperature).toLowerCase()}. Read the curve again.`,
      attempt: (v?.attempt ?? 0) + 1,
    }));
    if (right) onSolve();
    else onMiss?.();
  };
  const slotted = useCheckSlot({ label: 'That’s my answer', run: check });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{goalText(target)}</p>
      <Stage
        label="Thermometer"
        header={<span className="text-3xl font-bold">{temperature} °C</span>}
        footer={
          <Slider
            label="Temperature"
            value={temperature}
            onChange={setTemperature}
            min={min}
            max={max}
            rangeSteps={RANGE_STEPS}
            sliderThumb="bg-linear-to-r from-sky-400 via-amber-300 to-rose-500"
          />
        }
      >
        <div className="flex justify-center pixel-control bg-primary-800">
          <HeatingCurve
            substance={target.substance}
            temperature={temperature}
          />
        </div>
      </Stage>
      {!slotted && (
        <div>
          <Button pressed onClick={check}>
            That’s my answer
          </Button>
        </div>
      )}
      <RoomVerdict verdict={verdict} />
    </div>
  );
}

/** The Slime's rooms: predict what a pair of reactants makes, or that nothing happens */
function ReactionRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  const first = useMemo(
    () => reactionRooms(createRng(seed))[room],
    [seed, room],
  );
  // after a miss the answer has been shown, so a fresh pair comes next
  const rng = useMemo(() => roomRng(seed, room), [seed, room]);
  const deal = (previous: number) =>
    pick(
      rng,
      PREDICT_POOL.map((_, i) => i).filter((i) => i !== previous),
    );
  return (
    <ReactionPredict
      key={first}
      first={first}
      deal={deal}
      balance={course === 'ap'}
      onCorrect={onSolve}
      onMiss={onMiss}
    />
  );
}

const REVEAL_PAST = 8; // mL of curve past the equivalence point

/**
 * The Hydra's rooms: an unknown already titrated, as its data and finished pH
 * curve; work out its concentration from the equivalence point
 */
function TitrationRoom({ seed, course, room, onSolve, onMiss }: RoomProps) {
  const { analyte, concentration } = useMemo(
    () => newUnknown(roomRng(seed, room), titrationPool(course)),
    [seed, course, room],
  );
  const markers = curveMarkers(analyte, concentration);
  const equivalence = markers.equivalences[0];
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<RoomAnswer | null>(null);

  const check = () => {
    const right =
      unknownFeedback(parseFloat(answer), equivalence, concentration) ===
      'correct';
    setVerdict((v) => ({
      right,
      text: right
        ? `Right: ${concentration.toFixed(4)} M.`
        : `Moles of titrant = ${TITRANT_CONCENTRATION.toFixed(3)} M × the volume at the equivalence point, in L; at 1:1 that’s the moles in the flask, so divide by ${(ANALYTE_VOLUME / 1000).toFixed(5)} L.`,
      attempt: (v?.attempt ?? 0) + 1,
    }));
    if (right) onSolve();
    else onMiss?.();
  };
  const slotted = useCheckSlot({
    label: 'Check',
    disabled: !answer.trim(),
    run: check,
  });

  return (
    <ScenePanel className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          Flask: {ANALYTE_VOLUME.toFixed(2)} mL of {analyte.name.toLowerCase()}{' '}
          ({analyte.formula}), concentration unknown.
        </li>
        <li>
          Titrant: {TITRANT_CONCENTRATION.toFixed(3)} M {titrantFor(analyte)}.
        </li>
        <li>Equivalence point: {equivalence.toFixed(2)} mL of titrant.</li>
      </ul>
      <div className="flex justify-center pixel-control bg-primary-800 p-3">
        <PhCurve
          points={curvePoints(
            analyte,
            concentration,
            equivalence + REVEAL_PAST,
          )}
          indicator={INDICATORS.find((i) => i.id === 'phenolphthalein')!}
          markers={{ equivalences: markers.equivalences, halves: [] }}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Concentration (M)
        <input
          type="text"
          inputMode="decimal"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="pixel-control w-36 bg-primary-700 px-3 pt-2 pb-2.5 text-base text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]"
          placeholder="e.g. 0.0950"
        />
      </label>
      {!slotted && (
        <div>
          <Button pressed disabled={!answer.trim()} onClick={check}>
            Check
          </Button>
        </div>
      )}
      <RoomVerdict verdict={verdict} />
    </ScenePanel>
  );
}

/** The Wraith's rooms: name a cell's anode and predict its voltage */
function VoltaicRoom({ seed, room, onSolve, onMiss }: RoomProps) {
  const random = useMemo(() => roomRng(seed, room), [seed, room]);
  const [cell, setCell] = useState(() => newChallenge(random));
  const [result, setResult] = useState<Prediction | null>(null);

  const check = (guess: { anode: Side; volts: number }) => {
    const graded = checkPrediction(cell, guess);
    setResult(graded);
    if (graded.verdict === 'correct') onSolve();
    else onMiss?.();
  };
  // the answer's been shown, so a miss brings a fresh pair of metals
  const next = () => {
    setCell(newChallenge(random));
    setResult(null);
  };

  return (
    // the question and the table to answer it from; the cell's drawing is
    // left to the simulation
    <ScenePanel className="flex flex-col gap-4">
      <GalvanicPrediction
        cell={cell}
        result={result}
        onCheck={check}
        onNew={next}
      />
      <PotentialTable inUse={cell} />
    </ScenePanel>
  );
}

export const ROOMS: Record<string, (props: RoomProps) => ReactNode> = {
  balancing: BalancingRoom,
  periodic: PeriodicRoom,
  electrons: ElectronRoom,
  lewis: LewisRoom,
  states: StatesRoom,
  reactions: ReactionRoom,
  titrations: TitrationRoom,
  electrochemistry: VoltaicRoom,
};
