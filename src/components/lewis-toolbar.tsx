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
    tool: 'curvedArrow',
    label: 'Curved arrow',
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" aria-hidden="true">
        <path
          d="M4 15 Q4 4 15 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
        />
        <polygon points="17,5 12,2.5 12.5,7.5" fill="currentColor" />
      </svg>
    ),
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
  extra?: ReactNode; // controls under the tools, such as More elements
}

// Cursor pictures for each tool, drawn as 24×24 SVGs centred on the click point
const CURSOR_GLYPHS: Partial<Record<Tool, string>> = {
  bond1: '<line x1="5" y1="19" x2="19" y2="5" stroke-width="2"/>',
  bond2:
    '<line x1="3" y1="17" x2="17" y2="3" stroke-width="2"/><line x1="7" y1="21" x2="21" y2="7" stroke-width="2"/>',
  bond3:
    '<line x1="2" y1="16" x2="16" y2="2" stroke-width="2"/><line x1="5" y1="19" x2="19" y2="5" stroke-width="2"/><line x1="8" y1="22" x2="22" y2="8" stroke-width="2"/>',
  lonePair:
    '<circle cx="8" cy="12" r="2.5" stroke="none"/><circle cx="16" cy="12" r="2.5" stroke="none"/>',
  radical: '<circle cx="12" cy="12" r="2.5" stroke="none"/>',
  curvedArrow:
    '<path d="M5 19 Q5 6 17 6" fill="none" stroke-width="2"/><polygon points="21,6 15,3 15,9" stroke="none"/>',
  eraser:
    '<rect x="5" y="8" width="14" height="8" rx="2" transform="rotate(-30 12 12)" fill="white" stroke-width="2"/>',
};

const glyphText = (text: string) =>
  `<text x="12" y="17" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" stroke="white" stroke-width="3" paint-order="stroke">${text}</text>`;

/** A CSS cursor that shows the active tool, so clicking places or applies it */
export function toolCursor(tool: Tool): string {
  if (tool === 'select') return 'default';
  const glyph = tool.startsWith('element:')
    ? glyphText(tool.slice('element:'.length))
    : (CURSOR_GLYPHS[tool] ??
      glyphText(
        { chargePlus: '+', chargeMinus: '−', partial: 'δ', brackets: '[ ]' }[
          tool as 'chargePlus'
        ] ?? '+',
      ));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#111" stroke="#111">${glyph}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
}

/** A ChemDraw-style tool palette: tap a tool to make it active, or drag it onto the drawing. */
export default function LewisToolbar({
  groups,
  active,
  onSelect,
  onPress,
  extra,
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="flex flex-col gap-1 bg-primary-700 rounded-lg p-1 h-fit"
    >
      {groups.map((group, g) => (
        <div
          key={g}
          className={cn(
            // 8 columns fill a phone's width; 2 keep the desktop column short
            'grid grid-cols-8 sm:grid-cols-2 gap-1',
            g > 0 && 'border-t border-primary-500 pt-1',
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
                'relative w-full h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md text-white cursor-pointer',
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
      {extra && <div className="border-t border-primary-500 pt-1">{extra}</div>}
    </div>
  );
}
