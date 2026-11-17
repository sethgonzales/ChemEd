import { ReactNode } from 'react';
import Link from 'next/link';
import { IconChevronLeft } from '@tabler/icons-react';
import Sources from '~/components/sources';
import type { SourceId } from '~/constants/sources';
import { cn } from '~/utils/cn';

interface Props {
  children: ReactNode;
  header?: string;
  description?: string; // one line under the header saying what to do
  backHref?: string; // where the back arrow goes
  back?: { label: string; onClick: () => void }; // or what it does instead
  game?: boolean; // a game: its header lines in the stylized font too
  sources?: SourceId[]; // where the page's facts come from, cited at the bottom
  className?: string;
}

export default function Container(props: Props) {
  const {
    children,
    header,
    description,
    backHref,
    back,
    game,
    sources,
    className,
  } = props;
  const arrow =
    '-ml-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-white';

  return (
    <div
      className={cn(
        'pixel-frame [--frame-fill:var(--color-primary-500)] [--frame-outline:var(--color-primary-700)]',
        'flex flex-col px-7 py-5 min-h-78 text-white',
        className,
      )}
    >
      {/* together, so a parent's gap doesn't split the title from its line */}
      {(header || description) && (
        <div className="mb-2 flex items-start gap-1">
          {back ? (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label}
              title={back.label}
              className={arrow}
            >
              <IconChevronLeft size={24} stroke={2.5} aria-hidden="true" />
            </button>
          ) : (
            backHref && (
              <Link
                href={backHref}
                aria-label="Back to simulations"
                className={arrow}
              >
                <IconChevronLeft size={24} stroke={2.5} aria-hidden="true" />
              </Link>
            )
          )}
          <div>
            {header && <h2 className="font-pixel text-3xl">{header}</h2>}
            {description && (
              <p className={cn('text-sm', game && 'font-pixel')}>
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
      {sources && <Sources ids={sources} />}
    </div>
  );
}
