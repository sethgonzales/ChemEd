import { Fragment, useEffect, useMemo, useState } from 'react';
import BeakerParticles from '~/components/beaker-particles';
import Button from '~/components/button';
import Stage from '~/components/stage';
import { useScore } from '~/components/use-score';
import { beaker } from '~/utils/beaker';
import { cn } from '~/utils/cn';
import { formatFormula } from '~/utils/lewis';
import {
  dealPredict,
  predict,
  PREDICT_POOL,
  type IonicTerm,
  type Product,
  type State,
  type Verdict,
} from '~/utils/predict';
import { gradeTyped, type Typed } from '~/utils/predict-input';

const STATES: State[] = ['s', 'l', 'g', 'aq'];
const EMPTY: Typed[] = [{ text: '' }, { text: '' }];

const OPENING: Record<Verdict, string> = {
  correct: 'Correct!',
  'wrong-state': 'Right products, but check their states.',
  'wrong-products': 'Not quite.',
  'missed-reaction': 'There is a reaction.',
  'no-reaction': 'Not quite: nothing happens here.',
};

const FIELD = cn(
  'pixel-control bg-primary-700 px-3 py-2 text-lg text-white',
  'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_white]',
  'disabled:opacity-60',
);

// what a student types shows with subscripts as they go
const subscripted = (text: string) =>
  text.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);

/** One side of the complete ionic equation, spectators struck through */
function Terms({ terms }: { terms: IonicTerm[] }) {
  return terms.map((term, i) => (
    <Fragment key={i}>
      {i > 0 && ' + '}
      {term.spectator ? (
        <span>
          <span className="line-through opacity-60">{term.text}</span>
          <span className="sr-only"> (spectator)</span>
        </span>
      ) : (
        term.text
      )}
    </Fragment>
  ));
}

/** Mr. G deals reactants; type the products and their states, or call No reaction */
export default function ReactionPredict() {
  // the first deal waits for the browser, so the static page matches it
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(dealPredict(undefined)), []);
  const reactants = PREDICT_POOL[index];
  const prediction = useMemo(() => predict(reactants), [reactants]);
  const particles = useMemo(() => beaker(prediction), [prediction]);

  const [answers, setAnswers] = useState<Typed[]>(EMPTY);
  const [result, setResult] = useState<{
    verdict: Verdict;
    hints: (string | null)[];
  } | null>(null);
  const { score, record } = useScore(
    (streak) => `${streak} in a row! You’re predicting like a chemist.`,
  );
  const locked = result !== null;

  const change = (i: number, part: Partial<Typed>) =>
    setAnswers((all) => all.map((a, j) => (j === i ? { ...a, ...part } : a)));
  const grade = (answer: Typed[] | 'none') => {
    const graded =
      answer === 'none'
        ? {
            verdict: (prediction.products
              ? 'missed-reaction'
              : 'correct') as Verdict,
            hints: [],
          }
        : gradeTyped(prediction, answer);
    setResult(graded);
    record(graded.verdict === 'correct');
  };
  const next = () => {
    setIndex(dealPredict(index));
    setAnswers(EMPTY);
    setResult(null);
  };

  const shown = (p: Product) => `${formatFormula(p.formula)}(${p.state})`;
  const ready = answers.every((a) => a.text.trim() && a.state);
  const verdict = result?.verdict;

  return (
    <div className="flex flex-col gap-4">
      <Stage
        label="Predict"
        header={
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>
              What do these reactants make? Type each product and pick its
              state, or call No reaction.
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
                    <span>
                      Ionic: <Terms terms={prediction.ionic.left} /> →{' '}
                      <Terms terms={prediction.ionic.right} />
                    </span>
                    <span>Net ionic: {prediction.netIonic}</span>
                  </>
                )}
              </>
            )}
          </div>
        }
      >
        <BeakerParticles
          particles={particles}
          reacted={locked && prediction.products !== null}
        />

        <p className="text-center text-xl">
          {prediction.reactants.map(shown).join(' + ')} →
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start justify-center gap-2">
          {answers.map((answer, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="text-xl text-center sm:pt-2"
                >
                  +
                </span>
              )}
              <div className="flex flex-col gap-1 sm:w-56">
                <div className="flex gap-1">
                  <input
                    type="text"
                    aria-label={`Product ${i + 1}`}
                    placeholder="formula"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={answer.text}
                    disabled={locked}
                    onChange={(e) =>
                      change(i, { text: subscripted(e.target.value) })
                    }
                    className={cn(
                      FIELD,
                      'min-w-0 flex-1 placeholder:text-white/50',
                    )}
                  />
                  <select
                    aria-label={`Product ${i + 1} state`}
                    value={answer.state ?? ''}
                    disabled={locked}
                    onChange={(e) =>
                      change(i, { state: e.target.value as State })
                    }
                    className={cn(FIELD, 'cursor-pointer')}
                  >
                    <option value="" disabled>
                      state
                    </option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        ({s})
                      </option>
                    ))}
                  </select>
                </div>
                {result?.hints[i] && (
                  <p className="text-sm text-red-100 bg-red-500/25 px-2 py-1">
                    {result.hints[i]}
                  </p>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button
          pressed={!!ready && !locked}
          disabled={locked || !ready}
          onClick={() => grade(answers)}
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
