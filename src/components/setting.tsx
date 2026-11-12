import type { ReactNode } from 'react';
import { IconCheck } from '@tabler/icons-react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode; // the label
}

/** A labelled on/off setting, styled to match the app's controls */
export default function Setting({ checked, onChange, children }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      {/* a real checkbox, restyled, so keyboards and screen readers just work */}
      <span className="relative grid place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer pixel-control size-5 appearance-none bg-primary-700 shadow-[inset_0_0_0_2px_var(--color-primary-300)] cursor-pointer hover:bg-primary-800 checked:bg-secondary-500 checked:shadow-none focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_white]"
        />
        <IconCheck
          size={14}
          stroke={3}
          aria-hidden="true"
          className="pointer-events-none absolute hidden text-text-secondary peer-checked:block"
        />
      </span>
      {children}
    </label>
  );
}
