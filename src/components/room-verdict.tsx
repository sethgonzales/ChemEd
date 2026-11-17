import { IconCheck, IconX } from '@tabler/icons-react';
import { useEffect } from 'react';
import { cn } from '~/utils/cn';
import { useMissSound } from '~/utils/sounds';

export interface RoomAnswer {
  right: boolean;
  text: string;
  attempt: number; // counts answers, so the same miss twice still shakes
}

/**
 * A room's answer, impossible to miss: a red box that shakes, with a miss
 * sound, for a wrong one; a green one for a right one. Empty until answered.
 */
export default function RoomVerdict({
  verdict,
}: {
  verdict: RoomAnswer | null;
}) {
  const playMiss = useMissSound();
  const attempt = verdict?.attempt;
  const wrong = verdict && !verdict.right;
  useEffect(() => {
    if (wrong) playMiss();
  }, [attempt, wrong, playMiss]);

  return (
    <div role="status" className="min-h-6">
      {verdict && (
        <p
          key={verdict.attempt}
          className={cn(
            'pixel-control flex items-start gap-2 px-3 py-2',
            verdict.right
              ? 'bg-green-400/20 text-green-300'
              : 'quest-shake bg-red-500/25 text-red-100',
          )}
        >
          {verdict.right ? (
            <IconCheck size={20} aria-hidden="true" className="shrink-0" />
          ) : (
            <IconX size={20} aria-hidden="true" className="shrink-0" />
          )}
          <span>
            {!verdict.right && <strong>Not quite! </strong>}
            {verdict.text}
          </span>
        </p>
      )}
    </div>
  );
}
