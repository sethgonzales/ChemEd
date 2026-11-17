import { useEffect, useState } from 'react';
import { cn } from '~/utils/cn';
import { typedLines } from '~/utils/typed-text';
import { useMedia } from '~/utils/use-media';

const LETTERS_PER_SECOND = 45; // a quick reader's pace
const TICK_MS = 40;

interface Props {
  lines: string[];
  className?: string;
}

/**
 * Story text typed out a letter at a time, in the app's pixel font (plain when
 * the readable font is on). The untyped letters are there but see-through, so
 * the story holds its full size from the start and nothing around it moves.
 * Tapping it shows the rest; reduced motion shows it all at once.
 */
export default function TypedStory({ lines, className }: Props) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const total = lines.join('').length;
  const [typed, setTyped] = useState(0);
  const done = reducedMotion || typed >= total;

  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setTyped((n) => n + (LETTERS_PER_SECOND * TICK_MS) / 1000),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [done]);

  const shown = typedLines(lines, done ? total : Math.floor(typed));

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 font-pixel text-lg',
        className,
      )}
    >
      {lines.map((line, i) => (
        <p key={line}>
          <span data-typed>{shown[i]}</span>
          <span className="opacity-0">{line.slice(shown[i].length)}</span>
        </p>
      ))}
      {!done && (
        <button
          type="button"
          aria-label="Show the whole story"
          className="absolute inset-0 cursor-pointer"
          onClick={() => setTyped(total)}
        />
      )}
    </div>
  );
}
