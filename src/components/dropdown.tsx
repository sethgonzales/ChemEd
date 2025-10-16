import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { cn } from '~/utils/cn';

interface Props {
  label?: string;
  children: ReactNode;
  className?: string;
  closeOnClickAway?: boolean;
}

export default function Dropdown({
  label = 'Dropdown',
  closeOnClickAway = true,
  children,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!closeOnClickAway || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickAway]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:outline-none',
          'focus:ring-primary-300 font-semibold rounded-lg text-sm px-3 py-2.5',
          'inline-flex items-center justify-between gap-2 cursor-pointer truncate',
          className,
        )}
      >
        <span className="truncate">{label}</span>
        <IconChevronDown
          size={16}
          className={cn(
            'transition-transform duration-200',
            isOpen && '-rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 bg-primary-300 divide-y divide-primary-400 rounded-lg shadow w-44">
          <ul className="py-2 text-sm text-text-primary space-y-0.5">
            {children}
          </ul>
        </div>
      )}
    </div>
  );
}
