import type { ReactNode } from 'react';
import { cn } from '~/utils/cn';

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
        'px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer',
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
