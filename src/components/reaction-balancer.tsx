import { Fragment, useState } from 'react';
import { IconCheck, IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import Seesaw from '~/components/seesaw';
import Stage from '~/components/stage';
import Button from '~/components/button';
import { cn } from '~/utils/cn';
import { CHEER_DELAY_MS, HINT_PAUSE_MS, balanceMessage } from '~/utils/guide';
import { formatFormula } from '~/utils/lewis';
import {
  elementTally,
  isBalanced,
  isLowestTerms,
  atomTotals,
  type Reaction,
} from '~/utils/reactions';
import { useGuideMessage } from '~/utils/use-guide-message';

interface Props {
  reaction: Reaction;
  answer: number[] | null; // for Show answer
}

const MAX_COEFFICIENT = 99;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function statusMessage(
  r: Reaction,
  coefficients: number[],
  revealed: boolean,
): string {
  if (revealed) {
    return 'Answer shown. Pick another reaction, or Reset to try this one yourself.';
  }
  if (isBalanced(r, coefficients)) {
    return isLowestTerms(coefficients)
      ? 'Balanced! Every element has the same number of atoms on both sides.'
      : `Balanced! Can you use smaller whole numbers? Every coefficient divides by ${coefficients.reduce(gcd)}.`;
  }
  const { reactants, products } = atomTotals(r, coefficients);
  // the same number of atoms isn't enough: each element has to match
  if (coefficients.every((c) => c > 0) && reactants === products) {
    return 'Same number of atoms on each side, but not of each element. Check the atom count.';
  }
  return 'Not balanced yet. Change the coefficients until every element matches.';
}

/** An equation to balance: coefficient steppers, a seesaw and an atom count */
export default function ReactionBalancer({ reaction, answer }: Props) {
  const formulas = [...reaction.reactants, ...reaction.products];
  const ones = formulas.map(() => '1');
  const [values, setValues] = useState(ones);
  const [revealed, setRevealed] = useState(false);
  const [touched, setTouched] = useState(false); // Mr. G waits for the student to start
  const coefficients = values.map((v) => Number(v) || 0);

  const guide =
    touched && !revealed ? balanceMessage(reaction, coefficients) : null;
  useGuideMessage(
    guide,
    guide?.mood === 'cheer' ? CHEER_DELAY_MS : HINT_PAUSE_MS,
  );

  const set = (i: number, value: string) => {
    setTouched(true);
    setRevealed(false);
    setValues((current) => current.map((v, k) => (k === i ? value : v)));
  };
  const step = (i: number, by: number) =>
    set(
      i,
      String(Math.min(MAX_COEFFICIENT, Math.max(1, coefficients[i] + by))),
    );

  return (
    <div className="flex flex-col gap-4">
      <div
        data-testid="equation"
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-lg font-semibold"
      >
        {formulas.map((formula, i) => {
          const shown = formatFormula(formula);
          return (
            <Fragment key={i}>
              {i === reaction.reactants.length ? (
                <span className="px-1"> → </span>
              ) : i > 0 ? (
                <span> + </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex items-center rounded-lg bg-primary-700">
                  <button
                    type="button"
                    aria-label={`Fewer ${shown}`}
                    onClick={() => step(i, -1)}
                    className="p-2 text-white cursor-pointer hover:bg-primary-800 rounded-l-lg"
                  >
                    <IconMinus size={14} aria-hidden="true" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Coefficient for ${shown}`}
                    value={values[i]}
                    onChange={(e) =>
                      set(i, e.target.value.replace(/\D/g, '').slice(0, 2))
                    }
                    onBlur={() => !coefficients[i] && set(i, '1')}
                    className="w-9 py-1 text-center rounded-md bg-white text-gray-900"
                  />
                  <button
                    type="button"
                    aria-label={`More ${shown}`}
                    onClick={() => step(i, 1)}
                    className="p-2 text-white cursor-pointer hover:bg-primary-800 rounded-r-lg"
                  >
                    <IconPlus size={14} aria-hidden="true" />
                  </button>
                </span>
                <span>{shown}</span>
              </span>
            </Fragment>
          );
        })}
      </div>

      {/* one card: the seesaw, with each side's atom counts right under it */}
      <Stage label="Balance">
        <Seesaw reaction={reaction} coefficients={coefficients} />

        <table
          aria-label="Atom count"
          className="w-full max-w-lg mx-auto text-sm"
        >
          <thead>
            <tr className="text-xs text-white/70">
              <th
                scope="col"
                className="w-2/5 pr-4 pb-1 text-right font-medium"
              >
                Reactants
              </th>
              <th scope="col" className="pb-1 text-center font-medium">
                Element
              </th>
              <th scope="col" className="w-2/5 pl-4 pb-1 text-left font-medium">
                Products
              </th>
              <th scope="col" className="sr-only">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {elementTally(reaction, coefficients).map((row) => {
              const ok = row.reactants === row.products;
              return (
                <tr
                  key={row.element}
                  className={cn(
                    'border-t border-primary-400',
                    !ok && 'bg-red-500/25 text-red-100',
                  )}
                >
                  <td className="pr-4 py-1 text-right font-semibold">
                    {row.reactants}
                  </td>
                  <th scope="row" className="py-1 text-center font-bold">
                    <span className="inline-flex items-center gap-1">
                      {row.element}
                      {ok ? (
                        <IconCheck
                          size={14}
                          className="text-green-300"
                          aria-hidden="true"
                        />
                      ) : (
                        <IconX size={14} aria-hidden="true" />
                      )}
                    </span>
                  </th>
                  <td className="pl-4 py-1 text-left font-semibold">
                    {row.products}
                  </td>
                  <td className="sr-only">
                    {ok ? 'Balanced' : 'Not balanced'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Stage>

      <p
        data-testid="balance-status"
        aria-live="polite"
        className="font-semibold"
      >
        {statusMessage(reaction, coefficients, revealed)}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            if (!answer) return;
            setValues(answer.map(String));
            setRevealed(true);
          }}
          disabled={!answer}
        >
          Show answer
        </Button>
        <Button
          onClick={() => {
            setValues(ones);
            setRevealed(false);
            setTouched(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
