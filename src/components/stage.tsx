import type { ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface Props {
  label: string; // names the region for screen readers
  children: ReactNode;
  header?: ReactNode; // readouts or controls above the visual
  footer?: ReactNode; // readouts or controls below it
  dark?: boolean; // the Dungeon Quest's unlit chambers, tinted by the theme
  className?: string;
}

/** The themed card that holds a simulation's main visual and its readouts */
export default function Stage({
  label,
  children,
  header,
  footer,
  dark = false,
  className,
}: Props) {
  return (
    <section
      aria-label={label}
      className={cn(
        dark
          ? 'pixel-frame [--frame-fill:color-mix(in_srgb,var(--color-primary-900)_25%,black)] [--frame-outline:black]'
          : 'pixel-frame [--frame-fill:var(--color-primary-600)] [--frame-outline:var(--color-primary-800)]',
        'p-4 flex flex-col gap-3',
        className,
      )}
    >
      {header}
      {children}
      {footer}
    </section>
  );
}
