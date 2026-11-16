import { useState, type FormEvent } from 'react';
import Button from '~/components/button';
import {
  coupleFor,
  type Cell,
  type PredictionVerdict,
  type Side,
} from '~/utils/electrochemistry';
import { cn } from '~/utils/cn';

export interface Prediction {
  verdict: PredictionVerdict;
  text: string;
}

interface Props {
  cell: Cell;
  result: Prediction | null;
  onCheck: (guess: { anode: Side; volts: number }) => void;
  onNew: () => void;
}

/** Predict mode: the student names the anode and the voltage, then checks */
export default function GalvanicPrediction({
  cell,
  result,
  onCheck,
  onNew,
}: Props) {
  const [anode, setAnode] = useState<Side | null>(null);
  const [volts, setVolts] = useState('');
  const ready = anode && volts.trim() && !Number.isNaN(parseFloat(volts));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) onCheck({ anode, volts: parseFloat(volts) });
  };
  const next = () => {
    setAnode(null);
    setVolts('');
    onNew();
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={submit}
        aria-label="Your prediction"
        className="flex flex-wrap items-end gap-x-4 gap-y-2"
      >
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Which is the anode?</legend>
          <div className="flex gap-4">
            {(['left', 'right'] as const).map((side) => (
              <label key={side} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="anode"
                  checked={anode === side}
                  disabled={!!result}
                  onChange={() => setAnode(side)}
                  className="size-4 accent-secondary-500"
                />
                {coupleFor(cell[side].electrode).metal} ({side})
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          Cell voltage (V)
          <input
            type="text"
            inputMode="decimal"
            value={volts}
            disabled={!!result}
            onChange={(e) => setVolts(e.target.value)}
            className="pixel-control w-28 bg-primary-700 px-3 pt-2 pb-2.5 text-base text-white placeholder:text-white/60 disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]"
            placeholder="e.g. 1.10"
          />
        </label>
        <Button type="submit" pressed disabled={!!result || !ready}>
          Check
        </Button>
        <Button onClick={next}>New challenge</Button>
      </form>
      {result && (
        <p
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
