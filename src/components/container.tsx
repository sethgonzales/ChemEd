import { ReactNode } from 'react';
import Link from 'next/link';
import { IconChevronLeft } from '@tabler/icons-react';
import { cn } from '~/utils/cn';

interface Props {
  children: ReactNode;
  header?: string;
  description?: string; // one line under the header saying what to do
  backHref?: string; // where the back arrow goes
  className?: string;
}

export default function Container(props: Props) {
  const { children, header, description, backHref, className } = props;

  return (
    <div
      className={cn(
        'flex flex-col px-6 py-4 min-h-78 bg-primary-500 text-white rounded-xl',
        className,
      )}
    >
      {/* together, so a parent's gap doesn't split the title from its line */}
      {(header || description) && (
        <div className="mb-2 flex items-start gap-1">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back to simulations"
              className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-white"
            >
              <IconChevronLeft size={24} stroke={2.5} aria-hidden="true" />
            </Link>
          )}
          <div>
            {header && <h2 className="text-2xl font-bold">{header}</h2>}
            {description && <p className="text-sm">{description}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
