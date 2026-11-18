import { useEffect, useState } from 'react';

const TICK_MS = 16; // about 60 frames a second, so the flight glides

/** Runs a flight's clock from 0 to 1 over duration (ms), then calls onDone */
export function useFlightClock(
  run: string | null,
  duration: number,
  onDone: () => void,
) {
  // the time belongs to one flight: a new one reads 0 from its first frame,
  // not the last one's end until its clock catches up
  const [clock, setClock] = useState({ run, t: 0 });
  useEffect(() => {
    if (!run) return;
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += TICK_MS;
      setClock({ run, t: Math.min(1, elapsed / duration) });
      if (elapsed >= duration) {
        clearInterval(id);
        onDone();
      }
    }, TICK_MS);
    return () => clearInterval(id);
    // onDone changes each render; the clock only restarts with a new flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, duration]);
  return clock.run === run ? clock.t : 0;
}
