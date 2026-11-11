import type { PointerEvent, ReactNode } from 'react';
import { IconEraser, IconPointer } from '@tabler/icons-react';
import type { Tool } from '~/utils/lewis-tools';
import { cn } from '~/utils/cn';

export type ToolItem = {
  tool: Tool;
  label: string; // accessible name and tooltip
  icon: ReactNode;
  disabled?: boolean;
  draggable?: boolean; // can be dragged onto the drawing
};

// Small line-art icons for tools tabler doesn't have
const bondIcon = (lines: number) => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => {
      const offset = (i - (lines - 1) / 2) * 4;
      return (
        <line
          key={i}
          x1={3 + offset}
          y1={17 + offset}
          x2={17 + offset}
          y2={3 + offset}
          stroke="currentColor"
          strokeWidth={1.6}
        />
      );
    })}
  </svg>
);

const dotsIcon = (dots: number) => (
  <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
    {Array.from({ length: dots }, (_, i) => (
      <circle
        key={i}
        cx={10 + (i - (dots - 1) / 2) * 6}
        cy={10}
        r={2.5}
        fill="currentColor"
      />
    ))}
  </svg>
);

export const DRAWING_TOOLS: ToolItem[] = [
  {
    tool: 'select',
    label: 'Select',
    icon: <IconPointer size={20} aria-hidden="true" />,
  },
  { tool: 'bond1', label: 'Single bond', icon: bondIcon(1), draggable: true },
  { tool: 'bond2', label: 'Double bond', icon: bondIcon(2), draggable: true },
  { tool: 'bond3', label: 'Triple bond', icon: bondIcon(3), draggable: true },
  { tool: 'lonePair', label: 'Lone pair', icon: dotsIcon(2), draggable: true },
  {
    tool: 'radical',
    label: 'Unpaired electron',
    icon: dotsIcon(1),
    draggable: true,
  },
  {
    tool: 'eraser',
    label: 'Eraser',
    icon: <IconEraser size={20} aria-hidden="true" />,
  },
];

const textIcon = (text: string) => (
  <span aria-hidden="true" className="text-base font-bold leading-none">
    {text}
  </span>
);

export const MARK_TOOLS: ToolItem[] = [
  {
    tool: 'chargePlus',
    label: 'Positive charge',
    icon: textIcon('+'),
    draggable: true,
  },
  {
    tool: 'chargeMinus',
    label: 'Negative charge',
    icon: textIcon('−'),
    draggable: true,
  },
  {
    tool: 'partial',
    label: 'Partial charge (δ+/δ−)',
    icon: textIcon('δ'),
    draggable: true,
  },
  {
    tool: 'brackets',
    label: 'Ion brackets',
    icon: textIcon('[ ]'),
    draggable: true,
  },
];

interface Props {
  groups: ToolItem[][];
  active: Tool;
  onSelect: (tool: Tool) => void;
  onPress: (tool: Tool, e: PointerEvent) => void; // may start a drag
}

/** A ChemDraw-style tool palette: tap a tool to make it active, or drag it onto the drawing. */
export default function LewisToolbar({
  groups,
  active,
  onSelect,
  onPress,
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="flex sm:flex-col flex-wrap gap-1 bg-primary-700 rounded-lg p-1 h-fit"
    >
      {groups.map((group, g) => (
        <div
          key={g}
          className={cn(
            'flex sm:flex-col flex-wrap gap-1',
            g > 0 && 'w-full sm:w-auto border-t border-primary-500 pt-1',
          )}
        >
          {group.map(({ tool, label, icon, disabled, draggable }) => (
            <button
              key={tool}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={active === tool}
              disabled={disabled}
              onClick={() => onSelect(tool)}
              onPointerDown={(e) => draggable && !disabled && onPress(tool, e)}
              className={cn(
                'relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md text-white cursor-pointer',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                draggable && 'touch-none',
                active === tool
                  ? 'bg-secondary-500 text-text-secondary'
                  : 'hover:bg-primary-800',
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
