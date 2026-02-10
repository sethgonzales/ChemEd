import { ReactNode } from 'react';
import { cn } from '~/utils/cn';

interface Props {
  children: ReactNode;
  header?: string;
  className?: string;
}

export default function Container(props: Props) {
  const { children, header, className } = props;
  return (
    <div
      className={cn(
        'flex flex-col px-6 py-4 min-h-78 bg-primary-500 text-white rounded-xl',
        className,
      )}
    >
      {header && <h2 className="text-xl font-bold mb-2">{header}</h2>}
      {children}
    </div>
  );
}
