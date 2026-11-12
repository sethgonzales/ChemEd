import { useEffect, useRef } from 'react';

// Escape closes whatever is open (a menu, a dialog, Mr. G's bubble). Each use
// marks the key press as handled, so one Escape closes only one thing.

/** Runs on Escape while active, unless something else already used that press */
export function useEscape(onEscape: () => void, active = true) {
  const latest = useRef(onEscape);
  useEffect(() => {
    latest.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);
}
