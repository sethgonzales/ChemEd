import type { ReactNode } from 'react';
import { cn } from '~/utils/cn';
import { PIXEL_CONTROL } from '~/utils/pixel';

interface Props {
  onClick?: () => void;
  type?: 'button' | 'submit'; // submit for buttons that send a form
  children: ReactNode;
  pressed?: boolean; // highlighted, and announced as a toggle when set
  disabled?: boolean;
}

export default function Button({
  onClick,
  children,
  pressed,
  disabled,
  type = 'button',
}: Props) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        PIXEL_CONTROL,
        'px-3 pt-2 pb-2.5 text-base cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        pressed
          ? 'bg-secondary-500 text-text-secondary'
          : 'bg-primary-700 hover:bg-primary-800 text-white',
      )}
    >
      {children}
    </button>
  );
}
