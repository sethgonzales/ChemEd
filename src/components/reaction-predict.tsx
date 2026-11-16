import { Fragment, useEffect, useMemo, useState } from 'react';
import BeakerParticles from '~/components/beaker-particles';
import Button from '~/components/button';
import Dropdown, { DropdownItem } from '~/components/dropdown';
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

const STATES: { id: State; name: string }[] = [
  { id: 's', name: 'solid' },
  { id: 'l', name: 'liquid' },
  { id: 'g', name: 'gas' },
  { id: 'aq', name: 'aqueous' },
];
const EMPTY: Typed[] = [{ text: '' }, { text: '' }];

const OPENING: Record<Verdict, string> = {
  correct: 'Correct!',
  unbalanced: 'Right products and states, but it isn’t balanced yet.',
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

/** A coefficient box: digits only, blank meaning 1 */
function Coefficient(props: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Coefficient for ${props.label}`}
      placeholder="1"
      value={props.value}
      disabled={props.disabled}
      onChange={(e) =>
        props.onChange(e.target.value.replace(/\D/g, '').slice(0, 2))
      }
      className={cn(FIELD, 'w-10 px-1 text-center placeholder:text-white/40')}
    />
  );
}

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
    balance: string | null;
  } | null>(null);
  // reactants' then products' coefficients
  const [coefficients, setCoefficients] = useState(['', '', '', '']);
  const setCoefficient = (i: number, value: string) =>
    setCoefficients((all) => all.map((c, j) => (j === i ? value : c)));
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
            balance: null,
          }
        : gradeTyped(prediction, answer, coefficients);
    setResult(graded);
    record(graded.verdict === 'correct');
  };
  const next = () => {
    setIndex(dealPredict(index));
    setAnswers(EMPTY);
    setCoefficients(['', '', '', '']);
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
              What do these reactants make? Type each product, pick its state
              and balance the equation, or call No reaction.
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
                {result?.balance && <span>{result.balance}</span>}
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

        {/* products sit on the reactants' line, wrapping only when it won't fit */}
        <div
          role="group"
          aria-label="Equation"
          className="flex flex-wrap items-center justify-center gap-2 text-xl"
        >
          {prediction.reactants.map((reactant, i) => (
            <Fragment key={reactant.formula}>
              {i > 0 && <span>{' + '}</span>}
              <span className="inline-flex items-center gap-1">
                <Coefficient
                  label={formatFormula(reactant.formula)}
                  value={coefficients[i]}
                  disabled={locked}
                  onChange={(v) => setCoefficient(i, v)}
                />
                <span>{shown(reactant)}</span>
              </span>
            </Fragment>
          ))}
          <span>{' → '}</span>
          {answers.map((answer, i) => (
            <Fragment key={i}>
              {i > 0 && <span>{' + '}</span>}
              <span className="inline-flex items-center gap-1">
                <Coefficient
                  label={`product ${i + 1}`}
                  value={coefficients[prediction.reactants.length + i]}
                  disabled={locked}
                  onChange={(v) =>
                    setCoefficient(prediction.reactants.length + i, v)
                  }
                />
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
                  className={cn(FIELD, 'w-28 placeholder:text-white/50')}
                />
                {locked ? (
                  <span>({answer.state})</span>
                ) : (
                  <Dropdown
                    inline
                    ariaLabel={`Product ${i + 1} state: ${answer.state ? `(${answer.state})` : 'not chosen'}`}
                    label={
                      answer.state ? (
                        `(${answer.state})`
                      ) : (
                        <span className="opacity-50">(aq)</span>
                      )
                    }
                    className="text-lg"
                    menuClassName="w-36"
                  >
                    {STATES.map(({ id, name }) => (
                      <DropdownItem
                        key={id}
                        selected={answer.state === id}
                        onSelect={() => change(i, { state: id })}
                      >
                        ({id}) <span className="opacity-70">{name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                )}
              </span>
            </Fragment>
          ))}
        </div>
        {result?.hints.some(Boolean) && (
          <ul className="flex flex-col gap-1 text-sm">
            {result.hints.map(
              (hint, i) =>
                hint && (
                  <li key={i} className="text-red-100 bg-red-500/25 px-2 py-1">
                    Product {i + 1}: {hint}
                  </li>
                ),
            )}
          </ul>
        )}
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
