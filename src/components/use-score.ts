import { useState } from 'react';
import { useGuide } from '~/components/guide';
import { useThunk } from '~/utils/sounds';

const CHEER_EVERY = 5; // right answers in a row before Mr. G cheers

/** A running score and streak; Mr. G cheers each five in a row, and a miss thunks */
export function useScore(cheer: (streak: number) => string) {
  const { say } = useGuide();
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const playThunk = useThunk();
  const record = (right: boolean) => {
    const streak = right ? score.streak + 1 : 0;
    setScore({
      right: score.right + (right ? 1 : 0),
      total: score.total + 1,
      streak,
    });
    if (right && streak % CHEER_EVERY === 0) say(cheer(streak), 'cheer');
    if (!right) playThunk();
  };
  return { score, record };
}
