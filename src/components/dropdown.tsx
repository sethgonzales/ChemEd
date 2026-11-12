import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { cn } from '~/utils/cn';
import { PIXEL_CONTROL } from '~/utils/pixel';
import { useEscape } from '~/utils/use-escape';

interface Props {
  label?: string;
  children: ReactNode;
  className?: string;
  closeOnClickAway?: boolean;
  ariaLabel?: string; // when the button's text alone doesn't say what it picks
  menuClassName?: string;
}

// lets items close the menu once one is chosen
const CloseMenu = createContext<() => void>(() => {});

/** A menu option; closes the menu when chosen */
export function DropdownItem({
  selected,
  onSelect,
  children,
}: {
  selected?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const close = useContext(CloseMenu);
  return (
    <li>
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={(e) => {
          // menus can sit inside links (the header), so don't follow them
          e.preventDefault();
          onSelect();
          close();
        }}
        className={cn(
          'block w-full text-left px-4 py-2 hover:bg-primary-600 cursor-pointer',
          'focus:ring-2 focus:outline-none',
          selected && 'bg-primary-600',
        )}
      >
        {children}
      </button>
    </li>
  );
}

export default function Dropdown({
  label = 'Dropdown',
  closeOnClickAway = true,
  children,
  className,
  ariaLabel,
  menuClassName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu (not the page) and returns focus to its button
  useEscape(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, isOpen);

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
    <div
      ref={dropdownRef}
      className="relative inline-block text-left w-full sm:w-auto"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          PIXEL_CONTROL,
          'text-white bg-primary-700 hover:bg-primary-800 text-sm px-3 pt-2.5 pb-3',
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
        <div
          className={cn(
            'absolute z-10 mt-2 bg-primary-300 divide-y divide-primary-400 pixel-control shadow w-44 max-h-72 overflow-y-auto',
            menuClassName,
          )}
        >
          <CloseMenu.Provider value={() => setIsOpen(false)}>
            <ul className="py-2 text-sm text-text-primary space-y-0.5">
              {children}
            </ul>
          </CloseMenu.Provider>
        </div>
      )}
    </div>
  );
}
