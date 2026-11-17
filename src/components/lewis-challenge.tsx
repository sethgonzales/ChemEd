import LewisBuilder, { type Settings } from '~/components/lewis-builder';
import type { ToolItem } from '~/components/lewis-toolbar';
import { cn } from '~/utils/cn';
import {
  electronsUsed,
  formatFormula,
  parseFormula,
  totalValenceElectrons,
  type LewisStructure,
  type Molecule,
  type Verdict,
} from '~/utils/lewis';
import { assessResonance } from '~/utils/lewis-arrows';
import { emptyEditor, skeletonEditor } from '~/utils/lewis-editor';

const HOW_TO_DRAW = [
  'Pick a tool and your cursor becomes it. Click the drawing to place atoms or apply the tool, as many times as you like.',
  'Bonds are connectors: click empty space or an atom to add one, then drop an element onto each open end.',
  'You can also drag a tool from the toolbar onto an atom or bond.',
  'With Select, drag atoms to move them, and lone pairs from one atom to another.',
  'Curved arrows go from a lone pair or bond to an atom or bond. Add resonance forms to show where the electrons move.',
  'Undo and redo with Ctrl/⌘+Z and Ctrl/⌘+Shift+Z.',
];

/** The full instructions, folded away until wanted */
export function HowToDraw() {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold w-fit">
        How to draw
      </summary>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        {HOW_TO_DRAW.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

export const elementIcon = (symbol: string) => (
  <span className="text-sm font-bold">{symbol}</span>
);

interface Props {
  molecule: Molecule;
  start: 'given' | 'empty'; // its skeleton drawn already, or a blank canvas
  active?: boolean; // the visible builder, which answers keyboard shortcuts
  settings: Settings;
  onSettings: (change: Partial<Settings>) => void;
  onCheck?: (verdict: Verdict) => void;
}

/** Draw a given molecule and get it graded (Quiz mode, and a Dungeon Quest room) */
export default function LewisChallenge({
  molecule,
  start,
  active = true,
  settings,
  onSettings,
  onCheck,
}: Props) {
  const total = totalValenceElectrons(molecule.formula, molecule.charge);
  const needed = parseFormula(molecule.formula);

  // the formula's atoms, with how many it has as a guide (not a limit;
  // checking points out extras)
  const shown = formatFormula(molecule.formula, molecule.charge);
  const elementTools = (): ToolItem[] =>
    Object.keys(needed).map((symbol) => ({
      tool: `element:${symbol}`,
      label: `Add ${symbol} (${needed[symbol]} in ${shown})`,
      icon: elementIcon(symbol),
      draggable: true,
    }));

  const counter = (s: LewisStructure) => {
    const used = electronsUsed(s);
    return (
      <>
        <div className="h-2 rounded-full bg-primary-700 overflow-hidden mb-1">
          <div
            className={cn(
              'h-full transition-all',
              used > total ? 'bg-red-500' : 'bg-secondary-500',
            )}
            style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
          />
        </div>
        {used} of {total} valence electrons placed
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">
        {molecule.name}, {shown}
      </h3>
      <HowToDraw />
      <LewisBuilder
        initial={start === 'given' ? skeletonEditor(molecule) : emptyEditor()}
        initialTool={
          start === 'given' ? 'lonePair' : `element:${Object.keys(needed)[0]}`
        }
        active={active}
        elementTools={elementTools}
        assess={(forms) => assessResonance(forms, molecule)}
        counter={counter}
        chargesReady={(s) => electronsUsed(s) === total}
        settings={settings}
        onSettings={onSettings}
        onCheck={onCheck}
      />
    </div>
  );
}
