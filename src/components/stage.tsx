import type { ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface Props {
  label: string; // names the region for screen readers
  children: ReactNode;
  header?: ReactNode; // readouts or controls above the visual
  footer?: ReactNode; // readouts or controls below it
  className?: string;
}

/** The themed card that holds a simulation's main visual and its readouts */
export default function Stage({
  label,
  children,
  header,
  footer,
  className,
}: Props) {
  return (
    <section
      aria-label={label}
      className={cn(
        'bg-primary-600 rounded-lg p-3 flex flex-col gap-3',
        className,
      )}
    >
      {header}
      {children}
      {footer}
    </section>
  );
}
