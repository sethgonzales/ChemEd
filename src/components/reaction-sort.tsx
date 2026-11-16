import { useEffect, useMemo, useState } from 'react';
import Button from '~/components/button';
import { useGuide } from '~/components/guide';
import Stage from '~/components/stage';
import { cn } from '~/utils/cn';
import { balancedEquation } from '~/utils/reaction-particles';
import {
  classify,
  deal,
  explain,
  SORT_POOL,
  TYPES,
  type ReactionType,
} from '~/utils/reaction-types';
import { parseEquation, solve } from '~/utils/reactions';

const CHEER_EVERY = 5; // correct answers in a row before Mr. G cheers
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Mr. G deals equations; name the type of each */
export default function ReactionSort() {
  const { say } = useGuide();
  // the first deal waits for the browser, so the static page matches it
  const [current, setCurrent] = useState(SORT_POOL[0]);
  useEffect(() => setCurrent(deal(undefined)), []);
  const [picked, setPicked] = useState<ReactionType | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });

  const { reaction, equation, type } = useMemo(() => {
    const reaction = parseEquation(current.equation);
    return {
      reaction,
      equation: balancedEquation(reaction, solve(reaction)!),
      type: classify(reaction),
    };
  }, [current]);

  const answer = (choice: ReactionType) => {
    setPicked(choice);
    const right = choice === type;
    const streak = right ? score.streak + 1 : 0;
    setScore({
      right: score.right + (right ? 1 : 0),
      total: score.total + 1,
      streak,
    });
    if (right && streak % CHEER_EVERY === 0)
      say(
        `${streak} in a row! You can read a reaction’s pattern at a glance.`,
        'cheer',
      );
  };
  const next = () => {
    setCurrent(deal(current.id));
    setPicked(null);
  };

  const right = picked === type;
  return (
    <div className="flex flex-col gap-4">
      <Stage
        label="Sort"
        header={
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>Which type of reaction is this?</span>
            <span data-testid="sort-score">
              Score: {score.right} of {score.total} · Streak: {score.streak}
            </span>
          </div>
        }
        footer={
          <p
            role="status"
            className={cn(
              'pixel-control px-3 py-2 text-sm min-h-9',
              picked &&
                (right ? 'text-green-300' : 'bg-red-500/25 text-red-100'),
            )}
          >
            {picked &&
              (right
                ? `Correct! ${explain(reaction)}`
                : `Not quite: it’s a ${type}. ${explain(reaction)} The pattern is ${TYPES[type as keyof typeof TYPES].pattern}.`)}
          </p>
        }
      >
        <p className="text-center text-2xl py-6">{equation}</p>
        <div
          role="group"
          aria-label="Reaction type"
          className="flex flex-wrap justify-center gap-2"
        >
          {(Object.keys(TYPES) as ReactionType[]).map((t) => (
            <Button
              key={t}
              disabled={picked !== null}
              pressed={picked === t || undefined}
              onClick={() => answer(t)}
            >
              {capital(t)}
            </Button>
          ))}
        </div>
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button onClick={next}>Next equation</Button>
      </div>
    </div>
  );
}
