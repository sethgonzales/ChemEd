import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

// A puzzle's check button can be handed to whatever holds the puzzle: in a
// Dungeon Quest room it goes on the door. Outside a slot, a component keeps
// drawing its own button, so the simulations are unchanged.

export interface SlotCheck {
  label: string;
  disabled?: boolean;
  run: () => void;
}

const Slot = createContext<((check: SlotCheck | null) => void) | null>(null);

/** Collects the check of the component inside it */
export function CheckSlot({
  onChange,
  children,
}: {
  onChange: (check: SlotCheck | null) => void;
  children: ReactNode;
}) {
  return <Slot.Provider value={onChange}>{children}</Slot.Provider>;
}

/**
 * Hands this check to the slot the component sits in, if any; true if it
 * did, so the component leaves out its own button
 */
export function useCheckSlot({ label, disabled = false, run }: SlotCheck) {
  const give = useContext(Slot);
  // always the latest, so the slot checks the answer as it is now
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    if (!give) return;
    give({ label, disabled, run: () => latest.current() });
  }, [give, label, disabled]);
  useEffect(() => (give ? () => give(null) : undefined), [give]);
  return !!give;
}
