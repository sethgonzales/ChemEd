import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';

const TICK_MS = 20; // how often a held button acts

const isHoldKey = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter';

/**
 * Runs `onTick(seconds)` over and over while a button is held: by pointer
 * (mouse, finger or pen) or by Space or Enter. Spread `events` on the button.
 */
export function useHold(onTick: (seconds: number) => void) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  }, [onTick]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timer.current) return;
    timer.current = setInterval(() => tick.current(TICK_MS / 1000), TICK_MS);
    setHolding(true);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    holding,
    stop,
    events: {
      onPointerDown: start,
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onBlur: stop,
      // a long press on a phone would open the context menu instead
      onContextMenu: (e: SyntheticEvent) => e.preventDefault(),
      onKeyDown: (e: KeyboardEvent) => {
        if (!isHoldKey(e)) return;
        e.preventDefault();
        if (!e.repeat) start();
      },
      onKeyUp: (e: KeyboardEvent) => {
        if (isHoldKey(e)) stop();
      },
    },
  };
}
