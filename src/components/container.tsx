import { ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface Props {
  children: ReactNode;
  header?: string;
  description?: string; // one line under the header saying what to do
  className?: string;
}

export default function Container(props: Props) {
  const { children, header, description, className } = props;
  return (
    <div
      className={cn(
        'flex flex-col px-6 py-4 min-h-78 bg-primary-500 text-white rounded-xl',
        className,
      )}
    >
      {/* together, so a parent's gap doesn't split the title from its line */}
      {(header || description) && (
        <div className="mb-2">
          {header && <h2 className="text-xl font-bold">{header}</h2>}
          {description && <p className="text-sm mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
