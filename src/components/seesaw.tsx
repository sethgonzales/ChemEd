import { formatFormula } from '~/utils/lewis';
import {
  atomTotals,
  beamAngle,
  isBalanced,
  type Reaction,
} from '~/utils/reactions';
import { cn } from '~/utils/cn';

interface Props {
  reaction: Reaction;
  coefficients: number[];
}

const MAX_CHIPS = 5; // per pile; taller piles show "+N more" on top

function describe(reactants: number, products: number, angle: number) {
  if (angle === 0 && reactants === products) {
    return `Seesaw is level: ${reactants} atoms on each side`;
  }
  const side = angle > 0 ? 'products' : angle < 0 ? 'reactants' : null;
  const counts = `${reactants} atoms on the reactant side, ${products} on the product side`;
  return side
    ? `Seesaw tips toward the ${side}: ${counts}`
    : `Seesaw is level: ${counts}`;
}

/** One pile per kind of molecule, side by side, each built up from the plank */
function Side({
  formulas,
  coefficients,
}: {
  formulas: string[];
  coefficients: number[];
}) {
  return (
    <div
      data-testid="seesaw-side"
      className="flex-1 flex items-end justify-center gap-2 px-2 min-h-12"
    >
      {formulas.map((formula, i) => {
        const count = coefficients[i] ?? 0;
        const shown = formatFormula(formula);
        return (
          <div
            key={i}
            data-testid="molecule-stack"
            // reversed, so the first molecule sits on the plank and the rest pile on top
            className="flex flex-col-reverse items-center gap-0.5"
          >
            {Array.from({ length: Math.min(count, MAX_CHIPS) }, (_, k) => (
              <span
                key={k}
                data-molecule=""
                className="px-2 py-0.5 rounded-md bg-secondary-500 text-text-secondary text-sm font-semibold shadow"
              >
                {shown}
              </span>
            ))}
            {count > MAX_CHIPS && (
              <span className="text-xs font-semibold text-white/80">
                +{count - MAX_CHIPS} more
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A seesaw with the molecules of each side piled on it. It tips toward the
 * side with more atoms and sits level once every element balances.
 */
export default function Seesaw({ reaction, coefficients }: Props) {
  const { reactants, products } = atomTotals(reaction, coefficients);
  const balanced = isBalanced(reaction, coefficients);
  const angle = balanced ? 0 : beamAngle(reactants, products);
  const split = reaction.reactants.length;

  return (
    <div
      role="img"
      aria-label={describe(reactants, products, angle)}
      // a capped width keeps the tipped ends inside the panel
      // fixed height, tall enough for the biggest pile, so adding molecules
      // never moves anything else on the page; the plank sits at the bottom
      className="w-full max-w-lg mx-auto h-72 pb-12 flex flex-col justify-end"
    >
      <div
        data-testid="plank"
        data-angle={angle}
        className="motion-safe:transition-transform motion-safe:duration-500"
        // tip around the middle of the bar, which sits on the pivot
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'center bottom',
        }}
      >
        <div className="flex items-end">
          <Side
            formulas={reaction.reactants}
            coefficients={coefficients.slice(0, split)}
          />
          <Side
            formulas={reaction.products}
            coefficients={coefficients.slice(split)}
          />
        </div>
        <div
          className={cn(
            'h-2 rounded-full mt-1',
            balanced ? 'bg-green-400' : 'bg-white/80',
          )}
        />
      </div>
      <div
        aria-hidden="true"
        className="mx-auto w-0 h-0 border-x-[18px] border-x-transparent border-b-[28px] border-b-white/50"
      />
    </div>
  );
}
