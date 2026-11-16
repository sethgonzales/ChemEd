import { useEffect, useMemo, useState } from 'react';
import Button from '~/components/button';
import Stage from '~/components/stage';
import { useScore } from '~/components/use-score';
import { cn } from '~/utils/cn';
import { formatFormula } from '~/utils/lewis';
import {
  check,
  compound,
  dealPredict,
  pieces,
  predict,
  PREDICT_POOL,
  type Ion,
  type Product,
  type State,
  type Verdict,
} from '~/utils/predict';

type Slot = { cation?: Ion; anion?: Ion; whole?: string; state?: State };

const STATES: { id: State; name: string }[] = [
  { id: 's', name: 'solid' },
  { id: 'l', name: 'liquid' },
  { id: 'g', name: 'gas' },
  { id: 'aq', name: 'aqueous' },
];
const EMPTY: Slot[] = [{}, {}];

const showIon = (ion: Ion) => formatFormula(ion.symbol, ion.charge);
const formulaOf = (slot: Slot) =>
  slot.whole ??
  (slot.cation && slot.anion ? compound(slot.cation, slot.anion) : null);

const OPENING: Record<Verdict, string> = {
  correct: 'Correct!',
  'wrong-state': 'Right products, but check their states.',
  'wrong-products': 'Not quite.',
  'missed-reaction': 'There is a reaction.',
  'no-reaction': 'Not quite: nothing happens here.',
};

/** Mr. G deals reactants; build the products, or call No reaction */
export default function ReactionPredict() {
  // the first deal waits for the browser, so the static page matches it
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(dealPredict(undefined)), []);
  const reactants = PREDICT_POOL[index];
  const prediction = useMemo(() => predict(reactants), [reactants]);
  const { ions, wholes } = useMemo(() => pieces(reactants), [reactants]);

  const [slots, setSlots] = useState<Slot[]>(EMPTY);
  const [active, setActive] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const { score, record } = useScore(
    (streak) => `${streak} in a row! You’re predicting like a chemist.`,
  );
  const locked = verdict !== null;

  const fill = (change: Partial<Slot>) =>
    setSlots((all) =>
      all.map((slot, i) => {
        if (i !== active) return slot;
        // a whole element replaces any ions, and ions replace a whole element
        const base = change.whole
          ? { state: slot.state }
          : { ...slot, whole: undefined };
        return { ...base, ...change };
      }),
    );
  const setState = (i: number, state: State) =>
    setSlots((all) =>
      all.map((slot, j) => (j === i ? { ...slot, state } : slot)),
    );

  const grade = (answer: Product[] | 'none') => {
    const result = check(prediction, answer).verdict;
    setVerdict(result);
    record(result === 'correct');
  };
  const submit = () =>
    grade(
      slots
        .map((slot) => ({ formula: formulaOf(slot), state: slot.state }))
        .filter((p): p is Product => !!p.formula && !!p.state),
    );
  const next = () => {
    setIndex(dealPredict(index));
    setSlots(EMPTY);
    setActive(0);
    setVerdict(null);
  };

  const shown = (p: Product) => `${formatFormula(p.formula)}(${p.state})`;
  const question = `${prediction.reactants.map(shown).join(' + ')} → ?`;
  const ready = slots.every((s) => formulaOf(s) && s.state);

  return (
    <div className="flex flex-col gap-4">
      <Stage
        label="Predict"
        header={
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              What do these reactants make? Build each product, or call No
              reaction.
            </span>
            <span data-testid="predict-score">
              Score: {score.right} of {score.total} · Streak: {score.streak}
            </span>
          </div>
        }
        footer={
          <div
            role="status"
            className={cn(
              'pixel-control px-3 py-2 text-sm min-h-9 flex flex-col gap-1',
              verdict &&
                (verdict === 'correct'
                  ? 'text-green-300'
                  : 'bg-red-500/25 text-red-100'),
            )}
          >
            {verdict && (
              <>
                <span>
                  {OPENING[verdict]} {prediction.reason}
                </span>
                {prediction.products && (
                  <>
                    <span>Balanced: {prediction.equation}</span>
                    <span>Net ionic: {prediction.netIonic}</span>
                    {prediction.spectators.length > 0 && (
                      <span>
                        Spectators: {prediction.spectators.join(', ')}
                      </span>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        }
      >
        <p className="text-center text-2xl py-4">{question}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {slots.map((slot, i) => {
            const formula = formulaOf(slot);
            const partial = [slot.cation, slot.anion]
              .filter(Boolean)
              .map((ion) => showIon(ion!))
              .join(' + ');
            return (
              <div key={i} className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={active === i}
                  aria-label={`Product ${i + 1}: ${formula ? formatFormula(formula) : partial || 'empty'}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    'pixel-control min-h-12 px-3 py-2 text-xl cursor-pointer bg-primary-700',
                    'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_white]',
                    active === i &&
                      !locked &&
                      'shadow-[inset_0_0_0_3px_var(--color-secondary-500)]',
                  )}
                >
                  {formula
                    ? formatFormula(formula)
                    : partial || `Product ${i + 1}`}
                </button>
                <div
                  role="group"
                  aria-label={`Product ${i + 1} state`}
                  className="flex gap-1"
                >
                  {STATES.map(({ id, name }) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={name}
                      aria-pressed={slot.state === id}
                      disabled={locked}
                      onClick={() => setState(i, id)}
                      className={cn(
                        'pixel-control flex-1 px-2 py-1 text-sm cursor-pointer disabled:cursor-not-allowed',
                        'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]',
                        slot.state === id
                          ? 'bg-secondary-500 text-primary-900'
                          : 'bg-primary-700 hover:bg-primary-800',
                      )}
                    >
                      ({id})
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Pieces"
          className="flex flex-wrap justify-center gap-2"
        >
          {ions.map((ion) => (
            <Button
              key={showIon(ion)}
              disabled={locked}
              onClick={() =>
                fill(ion.charge > 0 ? { cation: ion } : { anion: ion })
              }
            >
              {showIon(ion)}
            </Button>
          ))}
          {wholes.map((whole) => (
            <Button
              key={whole}
              disabled={locked}
              onClick={() => fill({ whole })}
            >
              {formatFormula(whole)}
            </Button>
          ))}
        </div>
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button
          pressed={ready && !locked}
          disabled={locked || !ready}
          onClick={submit}
        >
          Check
        </Button>
        <Button disabled={locked} onClick={() => grade('none')}>
          No reaction
        </Button>
        <Button onClick={next}>Next reactants</Button>
      </div>
    </div>
  );
}
