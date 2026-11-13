import { useCallback, useEffect, useRef, useState } from 'react';
import type { Swirl } from '~/utils/titrations';

export const DROP_FALL_MS = 450; // matches the burette-drop animation
const BURST_GAP_MS = 90; // between drops in a burst
const SWIRL_MIN_MS = 500; // a faint flash mixes in quickly…
const SWIRL_EXTRA_MS = 1500; // …and lingers this much longer at full strength

export type Drop = { id: number; delay: number }; // delay in ms
export type Flash = Swirl & { id: number; delay: number; duration: number }; // ms

/**
 * Drops falling from the burette, each cleared once it has landed, and the
 * colour flash (swirl) where the last of them lands, cleared once it fades.
 */
export function useDrips() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      run();
      timers.current.delete(timer);
    }, ms);
    timers.current.add(timer);
  }, []);

  const drip = useCallback(
    (count = 1, swirl: Swirl | null = null) => {
      const fresh = Array.from({ length: count }, (_, i) => ({
        id: nextId.current++,
        delay: i * BURST_GAP_MS,
      }));
      const landed = DROP_FALL_MS + (count - 1) * BURST_GAP_MS;
      setDrops((d) => [...d, ...fresh]);
      later(landed, () => setDrops((d) => d.filter((x) => !fresh.includes(x))));
      if (!swirl) return;
      const flash = {
        ...swirl,
        id: nextId.current++,
        delay: landed,
        duration: SWIRL_MIN_MS + swirl.strength * SWIRL_EXTRA_MS,
      };
      setFlashes((f) => [...f, flash]);
      later(landed + flash.duration, () =>
        setFlashes((f) => f.filter((x) => x !== flash)),
      );
    },
    [later],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return { drops, flashes, drip };
}
