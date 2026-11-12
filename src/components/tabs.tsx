import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '~/utils/cn';
import { PIXEL_CONTROL } from '~/utils/pixel';

export type Tab = { id: string; label: string; content: ReactNode };

interface Props {
  label: string; // names the tab list for screen readers
  tabs: Tab[];
  selected?: string; // pass with onSelect to control the tabs from outside
  onSelect?: (id: string) => void;
}

/**
 * Tabs with their panels. Hidden panels stay mounted, so each keeps its work
 * while another is shown. Arrow keys move between tabs.
 */
export default function Tabs({
  label,
  tabs,
  selected: controlled,
  onSelect,
}: Props) {
  const [own, setOwn] = useState(tabs[0].id);
  const selected = controlled ?? own;
  const setSelected = (id: string) => {
    setOwn(id);
    onSelect?.(id);
  };
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => `${base}-panel-${id}`;

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    setSelected(tabs[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((tab, i) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId(tab.id)}
              // only the selected tab is in the Tab order; arrows reach the rest
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                PIXEL_CONTROL,
                'px-4 pt-2 pb-2.5 text-lg cursor-pointer',
                active
                  ? 'bg-white text-gray-900'
                  : 'bg-primary-700 text-white hover:bg-primary-800',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={panelId(tab.id)}
          role="tabpanel"
          aria-labelledby={tabId(tab.id)}
          hidden={tab.id !== selected}
        >
          {tab.content}
        </div>
      ))}
    </>
  );
}
