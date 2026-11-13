import { useEffect, useState, type FormEvent } from 'react';
import Button from '~/components/button';
import TitrationBench, {
  IndicatorDropdown,
} from '~/components/titration-bench';
import {
  ANALYTE_VOLUME,
  TITRANT_CONCENTRATION,
  titrantFor,
  type Indicator,
} from '~/constants/titrations';
import { cn } from '~/utils/cn';
import {
  concentrationFrom,
  curveMarkers,
  newUnknown,
  unknownFeedback,
} from '~/utils/titrations';

// mL shown past the equivalence point when the curve is revealed
const REVEAL_PAST = 5;

type Round = ReturnType<typeof newUnknown>;
type Result = { verdict: ReturnType<typeof unknownFeedback>; text: string };

const M = (c: number) => `${c.toFixed(4)} M`;
const mL = (v: number) => `${v.toFixed(2)} mL`;

function feedback(answer: number, volume: number, round: Round): Result {
  const { concentration } = round;
  const verdict = unknownFeedback(answer, volume, concentration);
  const equivalence = (concentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
  const actual = `The concentration is ${M(concentration)}.`;
  const text = {
    correct: `Correct! ${actual}`,
    early: `Not quite. Your maths fits your reading of ${mL(volume)}, but that endpoint came too early: the equivalence point was at ${mL(equivalence)}. ${actual}`,
    late: `Not quite. Your maths fits your reading of ${mL(volume)}, but that endpoint came too late: the equivalence point was at ${mL(equivalence)}. ${actual}`,
    calculation: `Not quite: check your calculation. From your reading, ${TITRANT_CONCENTRATION.toFixed(3)} M × ${mL(volume)} ÷ ${mL(ANALYTE_VOLUME)} = ${M(concentrationFrom(volume))}. ${actual}`,
  }[verdict];
  return { verdict, text };
}

/** Titrate an analyte of hidden concentration, then work it out */
export default function TitrationUnknown({
  indicator,
  onIndicator,
}: {
  indicator: Indicator;
  onIndicator: (i: Indicator) => void;
}) {
  // rolled after mount: a random first round would differ between the static
  // HTML and the browser
  const [round, setRound] = useState<Round | null>(null);
  const [volume, setVolume] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => setRound(newUnknown()), []);

  if (!round) return null;
  const { analyte, concentration } = round;

  const check = (e: FormEvent) => {
    e.preventDefault();
    setResult(feedback(parseFloat(answer), volume, round));
  };
  const next = () => {
    setRound(newUnknown());
    setVolume(0);
    setAnswer('');
    setResult(null);
  };
  const markers = curveMarkers(analyte, concentration);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <IndicatorDropdown indicator={indicator} onSelect={onIndicator} />
        <p className="text-sm">
          Flask: {mL(ANALYTE_VOLUME)} of {analyte.name.toLowerCase()} (
          {analyte.formula}), concentration unknown. Titrant:{' '}
          {TITRANT_CONCENTRATION.toFixed(3)} M {titrantFor(analyte)}.
        </p>
      </div>

      <TitrationBench
        analyte={analyte}
        concentration={concentration}
        indicator={indicator}
        volume={volume}
        setVolume={setVolume}
        showPH={!!result}
        curve={
          result
            ? { markers, upTo: markers.equivalences[0] + REVEAL_PAST }
            : null
        }
        locked={!!result}
        pourAccent={false}
      />

      <form
        onSubmit={check}
        className="flex flex-wrap items-end gap-2"
        aria-label="Your answer"
      >
        <label className="flex flex-col gap-1 text-sm">
          Concentration (M)
          <input
            type="text"
            inputMode="decimal"
            value={answer}
            disabled={!!result}
            onChange={(e) => setAnswer(e.target.value)}
            className="pixel-control w-36 bg-primary-700 px-3 pt-2 pb-2.5 text-base text-white placeholder:text-white/60 disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]"
            placeholder="e.g. 0.0950"
          />
        </label>
        <Button type="submit" pressed disabled={!!result || !answer.trim()}>
          Check
        </Button>
        <Button onClick={next}>New unknown</Button>
      </form>

      {result && (
        <p
          role="status"
          className={cn(
            'pixel-control px-3 py-2 text-sm',
            result.verdict === 'correct'
              ? 'text-green-300'
              : 'bg-red-500/25 text-red-100',
          )}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
