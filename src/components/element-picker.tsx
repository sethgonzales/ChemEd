import { useEffect, useRef } from 'react';
import type { IElementData } from '~/types';

interface Props {
  elements: IElementData[];
  onPick: (symbol: string) => void;
  onClose: () => void;
}

/** A dialog of elements laid out in periodic-table groups */
export default function ElementPicker({ elements, onPick, onClose }: Props) {
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // main-group elements only, so groups 1–2 and 13–18 make eight columns
  const column = (group: number | null) =>
    group === null ? 1 : group <= 2 ? group : group - 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* clicking outside closes; Escape does too */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close element picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an element"
        className="relative bg-primary-600 rounded-xl p-4 max-w-full overflow-x-auto"
      >
        <div className="flex items-center justify-between mb-3 gap-4">
          <h3 className="font-semibold text-white">Choose an element</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white underline cursor-pointer"
          >
            Close
          </button>
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: 'repeat(8, minmax(2.5rem, 1fr))' }}
        >
          {elements.map((el, i) => (
            <button
              key={el.symbol}
              ref={i === 0 ? first : undefined}
              type="button"
              aria-label={`${el.name} (${el.symbol})`}
              onClick={() => onPick(el.symbol)}
              style={{ gridColumn: column(el.group), gridRow: el.period }}
              className="h-10 rounded-md bg-primary-700 hover:bg-primary-800 text-white font-semibold cursor-pointer"
            >
              {el.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
