import type { ReactNode } from 'react';
import Stage from '~/components/stage';
import { cn } from '~/utils/cn';

interface Props {
  label: string; // names the chamber for screen readers
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// A torch on the wall: a bracket and a flickering flame with its glow
function Torch({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      data-decor
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-6 flex flex-col items-center',
        side === 'left' ? 'left-5' : 'right-5',
      )}
    >
      <div className="quest-flame h-4 w-3 rounded-t-full bg-[radial-gradient(circle_at_50%_70%,#fde68a,#f97316_60%,transparent_75%)] shadow-[0_0_40px_18px_rgb(251_146_60/0.22)]" />
      <div className="h-3 w-1 bg-stone-600" />
    </div>
  );
}

/**
 * A dark dungeon chamber: the Stage, nearly black in every theme, lit by
 * torches and a warm pool of lamplight, with fog along the floor
 */
export default function QuestScene({
  label,
  children,
  footer,
  className,
}: Props) {
  return (
    <Stage
      label={label}
      dark
      footer={footer}
      className={cn('relative overflow-hidden', className)}
    >
      <div
        data-decor
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_75%,rgb(255_196_110/0.16),transparent_60%)]"
      />
      <Torch side="left" />
      <Torch side="right" />
      <div
        data-decor
        aria-hidden="true"
        className="quest-fog pointer-events-none absolute inset-x-[-40%] bottom-0 h-1/4 bg-[radial-gradient(ellipse_at_30%_100%,rgb(148_163_184/0.18),transparent_60%),radial-gradient(ellipse_at_75%_100%,rgb(148_163_184/0.14),transparent_55%)]"
      />
      <div className="relative">{children}</div>
    </Stage>
  );
}
