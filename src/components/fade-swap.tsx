import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '~/utils/cn';

export const FADE_OUT_MS = 250; // matches the fade-out utility

interface Leaving {
  id: number;
  children: ReactNode;
}

/**
 * Swaps one step for the next without a snap: the new step fades in at once,
 * while the old one stays drawn over the same spot, fading out, out of reach
 * of screen readers and clicks.
 */
export default function FadeSwap({
  step,
  children,
  className,
}: {
  step: string;
  children: ReactNode;
  className?: string;
}) {
  const last = useRef({ step, children });
  const ids = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [leaving, setLeaving] = useState<Leaving[]>([]);

  // before the browser paints, so there's never a frame without the old step
  useLayoutEffect(() => {
    const before = last.current;
    last.current = { step, children };
    if (before.step === step || !before.children) return;
    const id = ++ids.current;
    setLeaving((l) => [...l, { id, children: before.children }]);
    timers.current.push(
      setTimeout(
        () => setLeaving((l) => l.filter((x) => x.id !== id)),
        FADE_OUT_MS,
      ),
    );
  }, [step, children]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className={cn('grid', className)}>
      {leaving.map((l) => (
        <div
          key={l.id}
          inert
          aria-hidden="true"
          className="pointer-events-none fade-out [grid-area:1/1]"
        >
          {l.children}
        </div>
      ))}
      <div key={step} className="fade-in [grid-area:1/1]">
        {children}
      </div>
    </div>
  );
}
